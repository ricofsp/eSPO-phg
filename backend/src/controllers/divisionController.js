const pool = require('../config/database');

const getAll = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10, all = '' } = req.query;
    const params = [];
    let where = "WHERE deleted_at IS NULL";

    if (search) {
      where += ' AND (kode LIKE ? OR nama LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (all === '1') {
      const [rows] = await pool.query(`SELECT * FROM divisions ${where} ORDER BY nama`, params);
      return res.json({ data: rows });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM divisions ${where}`, params);
    const [rows] = await pool.query(
      `SELECT * FROM divisions ${where} ORDER BY nama LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT * FROM divisions WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!row) return res.status(404).json({ message: 'Divisi tidak ditemukan' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { kode, nama, is_active } = req.body;
    if (!kode || !nama) return res.status(400).json({ message: 'Kode dan nama wajib diisi' });

    const [result] = await pool.query(
      'INSERT INTO divisions (kode, nama, is_active, created_by) VALUES (?, ?, ?, ?)',
      [kode.trim().toUpperCase(), nama.trim(), is_active ?? 1, req.user.id]
    );
    const [[row]] = await pool.query('SELECT * FROM divisions WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Kode sudah digunakan' });
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { kode, nama, is_active } = req.body;
    const [[check]] = await pool.query('SELECT id FROM divisions WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'Divisi tidak ditemukan' });

    await pool.query(
      'UPDATE divisions SET kode=?, nama=?, is_active=?, updated_by=? WHERE id=?',
      [kode.trim().toUpperCase(), nama.trim(), is_active ?? 1, req.user.id, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM divisions WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Kode sudah digunakan' });
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const [[check]] = await pool.query('SELECT id FROM divisions WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'Divisi tidak ditemukan' });
    await pool.query('UPDATE divisions SET deleted_at = NOW(), updated_by = ? WHERE id = ?', [req.user.id, req.params.id]);
    res.json({ message: 'Divisi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
