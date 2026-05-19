const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/database');

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email dan password wajib diisi.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL AND is_active = 1',
      [email.trim().toLowerCase(), email.trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Email atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, nama: user.nama, email: user.email, role: user.role, hospital_id: user.hospital_id, divisi_id: user.divisi_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, nama: user.nama, email: user.email, role: user.role, hospital_id: user.hospital_id, divisi_id: user.divisi_id },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const me = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, nama, email, role, hospital_id, divisi_id, is_active, created_at FROM users WHERE id = ? AND deleted_at IS NULL',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User tidak ditemukan.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, me };
