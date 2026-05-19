const bcrypt   = require('bcryptjs');
const pool     = require('../config/database');

const getAll = async (req, res) => {
  try {
    const { search = '', role = '', page = 1, limit = 10 } = req.query;
    const params = [];
    let where = "WHERE u.deleted_at IS NULL";

    if (search) {
      where += ' AND (u.username LIKE ? OR u.nama LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM users u ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nama, u.email, u.role, u.hospital_id,
              u.divisi_id, u.is_active, u.created_at,
              h.nama AS hospital_nama
       FROM users u
       LEFT JOIN hospitals h ON h.id = u.hospital_id
       ${where} ORDER BY u.nama LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT u.id, u.username, u.nama, u.email, u.role, u.hospital_id,
              u.divisi_id, u.is_active, u.created_at,
              h.nama AS hospital_nama
       FROM users u
       LEFT JOIN hospitals h ON h.id = u.hospital_id
       WHERE u.id = ? AND u.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { username, nama, email, password, role, hospital_id, divisi_id, is_active } = req.body;
    if (!username || !nama || !email || !password)
      return res.status(400).json({ message: 'Username, nama, email, dan password wajib diisi' });

    const hashed    = await bcrypt.hash(password, 10);
    const divisiStr = Array.isArray(divisi_id) ? divisi_id.join(',') : (divisi_id || null);

    const [result] = await pool.query(
      'INSERT INTO users (username, nama, email, password, role, hospital_id, divisi_id, is_active, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [username.trim(), nama.trim(), email.trim().toLowerCase(), hashed, role || 'user', hospital_id || null, divisiStr, is_active ?? 1, req.user.id]
    );
    const [[row]] = await pool.query(
      'SELECT id, username, nama, email, role, hospital_id, divisi_id, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = err.message.includes('username') ? 'Username sudah digunakan' : 'Email sudah digunakan';
      return res.status(409).json({ message: msg });
    }
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { username, nama, email, password, role, hospital_id, divisi_id, is_active } = req.body;
    const [[check]] = await pool.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'User tidak ditemukan' });

    const divisiStr = Array.isArray(divisi_id) ? divisi_id.join(',') : (divisi_id || null);

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET username=?, nama=?, email=?, password=?, role=?, hospital_id=?, divisi_id=?, is_active=?, updated_by=? WHERE id=?',
        [username.trim(), nama.trim(), email.trim().toLowerCase(), hashed, role || 'user', hospital_id || null, divisiStr, is_active ?? 1, req.user.id, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET username=?, nama=?, email=?, role=?, hospital_id=?, divisi_id=?, is_active=?, updated_by=? WHERE id=?',
        [username.trim(), nama.trim(), email.trim().toLowerCase(), role || 'user', hospital_id || null, divisiStr, is_active ?? 1, req.user.id, req.params.id]
      );
    }

    const [[row]] = await pool.query(
      'SELECT id, username, nama, email, role, hospital_id, divisi_id, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = err.message.includes('username') ? 'Username sudah digunakan' : 'Email sudah digunakan';
      return res.status(409).json({ message: msg });
    }
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ message: 'Tidak dapat menghapus akun sendiri' });

    const [[check]] = await pool.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'User tidak ditemukan' });
    await pool.query('UPDATE users SET deleted_at = NOW(), updated_by = ? WHERE id = ?', [req.user.id, req.params.id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
