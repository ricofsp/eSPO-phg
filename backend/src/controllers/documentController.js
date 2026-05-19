const pool = require('../config/database');
const path = require('path');
const fs   = require('fs');

const getAll = async (req, res) => {
  try {
    const { search = '', divisi_id = '', pemilik = '', page = 1, limit = 10 } = req.query;
    const params = [];
    let where = req.user.role === 'admin'
      ? "WHERE 1=1"
      : "WHERE d.deleted_at IS NULL AND d.is_active = 1";

    // Non-admin: batasi ke divisi yang dimiliki user (user.divisi_id = angka, dokumen.divisi_id = kode)
    if (req.user.role !== 'admin' && req.user.divisi_id) {
      const userDivNumIds = req.user.divisi_id.split(',').map(s => s.trim()).filter(Boolean);
      if (userDivNumIds.length) {
        const [divRows] = await pool.query(
          `SELECT kode FROM divisions WHERE id IN (${userDivNumIds.map(() => '?').join(',')})`,
          userDivNumIds
        );
        const kodes = divRows.map(r => r.kode).filter(Boolean);
        if (kodes.length) {
          const orClauses = kodes.map(() => 'FIND_IN_SET(?, d.divisi_id)').join(' OR ');
          where += ` AND (${orClauses})`;
          params.push(...kodes);
        }
      }
    }

    if (search) {
      where += ' AND (d.nomor_dokumen LIKE ? OR d.judul LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (pemilik) {
      where += ' AND d.pemilik = ?';
      params.push(pemilik);
    }
    if (divisi_id) {
      // divisi_id dari query = numeric ID, dokumen menyimpan kode
      const [[divRow]] = await pool.query('SELECT kode FROM divisions WHERE id = ? LIMIT 1', [divisi_id]);
      if (divRow?.kode) {
        where += ' AND FIND_IN_SET(?, d.divisi_id)';
        params.push(divRow.kode);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM documents d ${where}`, params);
    const [rows] = await pool.query(
      `SELECT d.*,
        uc.nama AS created_by_nama,
        uu.nama AS updated_by_nama
       FROM documents d
       LEFT JOIN users uc ON uc.id = d.created_by
       LEFT JOIN users uu ON uu.id = d.updated_by
       ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
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
      `SELECT d.*, u.nama AS created_by_nama FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.id = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { judul, nomor_dokumen, pemilik, divisi_id, keterangan, is_active } = req.body;
    if (!judul || !nomor_dokumen) return res.status(400).json({ message: 'Judul dan nomor dokumen wajib diisi' });

    const divisiStr   = Array.isArray(divisi_id) ? divisi_id.join(',') : (divisi_id || null);
    let url_dokumen   = null;
    let nama_dokumen  = null;

    if (req.file) {
      url_dokumen  = `/uploads/documents/${req.file.filename}`;
      nama_dokumen = req.file.originalname;
    }

    const [result] = await pool.query(
      'INSERT INTO documents (judul, nomor_dokumen, pemilik, divisi_id, url_dokumen, nama_dokumen, keterangan, is_active, created_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [judul.trim(), nomor_dokumen.trim(), pemilik || null, divisiStr, url_dokumen, nama_dokumen, keterangan || null, is_active ?? 1, req.user.id]
    );
    const [[row]] = await pool.query('SELECT * FROM documents WHERE id = ?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Nomor dokumen sudah ada' });
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { judul, nomor_dokumen, pemilik, divisi_id, keterangan, is_active } = req.body;
    const [[check]] = await pool.query('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    const divisiStr = Array.isArray(divisi_id) ? divisi_id.join(',') : (divisi_id || null);
    let url_dokumen  = check.url_dokumen;
    let nama_dokumen = check.nama_dokumen;

    if (req.file) {
      if (check.url_dokumen) {
        const oldPath = path.join(__dirname, '../../public', check.url_dokumen);
        fs.unlink(oldPath, () => {});
      }
      url_dokumen  = `/uploads/documents/${req.file.filename}`;
      nama_dokumen = req.file.originalname;
    }

    await pool.query(
      'UPDATE documents SET judul=?, nomor_dokumen=?, pemilik=?, divisi_id=?, url_dokumen=?, nama_dokumen=?, keterangan=?, is_active=?, updated_by=? WHERE id=?',
      [judul.trim(), nomor_dokumen.trim(), pemilik || null, divisiStr, url_dokumen, nama_dokumen, keterangan || null, is_active ?? 1, req.user.id, req.params.id]
    );
    const [[row]] = await pool.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Nomor dokumen sudah ada' });
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const [[check]] = await pool.query('SELECT id FROM documents WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!check) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    await pool.query('UPDATE documents SET deleted_at = NOW(), updated_by = ? WHERE id = ?', [req.user.id, req.params.id]);
    res.json({ message: 'Dokumen berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const [[{ total }]]    = await pool.query("SELECT COUNT(*) total FROM documents");
    const [[{ aktif }]]    = await pool.query("SELECT COUNT(*) aktif FROM documents WHERE is_active=1 AND deleted_at IS NULL");
    const [[{ nonaktif }]] = await pool.query("SELECT COUNT(*) nonaktif FROM documents WHERE is_active=0 OR deleted_at IS NOT NULL");
    const [[{ ada_file }]] = await pool.query("SELECT COUNT(*) ada_file FROM documents WHERE url_dokumen IS NOT NULL AND deleted_at IS NULL AND is_active=1");

    const [perPemilik] = await pool.query(
      `SELECT pemilik AS name, COUNT(*) AS total
       FROM documents WHERE pemilik IS NOT NULL AND pemilik != '' AND deleted_at IS NULL AND is_active=1
       GROUP BY pemilik ORDER BY total DESC LIMIT 10`
    );

    const [recent] = await pool.query(
      `SELECT d.id, d.judul, d.nomor_dokumen, d.pemilik, d.created_at, u.nama AS created_by_nama
       FROM documents d
       LEFT JOIN users u ON u.id = d.created_by
       WHERE d.deleted_at IS NULL AND d.is_active = 1
       ORDER BY d.created_at DESC LIMIT 8`
    );

    res.json({ total, aktif, nonaktif, ada_file, perPemilik, recent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPemilikList = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT pemilik FROM documents WHERE pemilik IS NOT NULL AND pemilik != '' AND deleted_at IS NULL ORDER BY pemilik ASC`
    );
    res.json(rows.map(r => r.pemilik));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, getPemilikList, getStats };
