const pool   = require('../config/database');
const path   = require('path');
const { v4: uuid } = require('uuid');

const STEPS = ['Submit','Kadiv_RS','Dir_RS','Kadiv_Corp','Mutu_Corp','CEO','Release'];

async function logHistory(spo_id, step, action, actor_user_id, comment = null) {
  await pool.query(
    'INSERT INTO spo_approval_history (id, spo_id, step, action, actor_user_id, comment) VALUES (UUID(),?,?,?,?,?)',
    [spo_id, step, action, actor_user_id, comment]
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getSpo(id) {
  const [[spo]] = await pool.query(
    `SELECT d.*, h.nama AS rs_nama, h.singkatan AS rs_singkatan,
            d.pemilik AS departemen_nama, u.nama AS created_by_nama
     FROM documents d
     LEFT JOIN hospitals h  ON h.id = d.rs_pengaju_id
     LEFT JOIN users u      ON u.id  = d.created_by
     WHERE d.id = ?`, [id]
  );
  if (!spo) return null;

  const [reviewers]  = await pool.query(
    `SELECT sr.*, u.nama AS user_nama, u.email, dv.nama AS divisi_nama
     FROM spo_reviewers sr
     LEFT JOIN users u     ON u.id  = sr.user_id
     LEFT JOIN divisions dv ON dv.id = sr.divisi_id
     WHERE sr.spo_id = ?`, [id]
  );
  const [versions] = await pool.query(
    `SELECT sfv.*, u.nama AS uploader_nama
     FROM spo_file_versions sfv
     LEFT JOIN users u ON u.id = sfv.uploaded_by
     WHERE sfv.spo_id = ? ORDER BY sfv.version DESC`, [id]
  );
  const [history] = await pool.query(
    `SELECT sah.*, u.nama AS actor_nama, u.role AS actor_role
     FROM spo_approval_history sah
     LEFT JOIN users u ON u.id = sah.actor_user_id
     WHERE sah.spo_id = ? ORDER BY sah.created_at ASC`, [id]
  );
  const [scope] = await pool.query(
    `SELECT srs.*, h.nama AS rs_nama, h.singkatan
     FROM spo_release_scope srs
     LEFT JOIN hospitals h ON h.id = srs.rs_id
     WHERE srs.spo_id = ?`, [id]
  );

  return { ...spo, reviewers, versions, history, scope };
}

// ── GET list ──────────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 10 } = req.query;
    const u = req.user;
    const params = [];
    let where = 'WHERE d.workflow_status IS NOT NULL';

    if (search)  { where += ' AND d.judul LIKE ?';             params.push(`%${search}%`); }
    if (status)  { where += ' AND d.workflow_status = ?';      params.push(status); }

    // RS user: hanya milik RS-nya
    if (!['admin','mutu_corp','ceo','corp_monitor'].includes(u.role)) {
      where += ' AND d.rs_pengaju_id = ?';
      params.push(u.hospital_id);
    }

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM documents d ${where}`, params);
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [rows] = await pool.query(
      `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step,
              d.created_at, d.submitted_at,
              h.nama AS rs_nama, h.singkatan AS rs_singkatan,
              d.pemilik AS departemen_nama
       FROM documents d
       LEFT JOIN hospitals h  ON h.id = d.rs_pengaju_id
       ${where} ORDER BY d.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET one ───────────────────────────────────────────────────────────────────
const getOne = async (req, res) => {
  try {
    const spo = await getSpo(req.params.id);
    if (!spo) return res.status(404).json({ message: 'SPO tidak ditemukan' });
    res.json(spo);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET pending count (untuk badge sidebar) ───────────────────────────────────
const getPendingCount = async (req, res) => {
  try {
    const u = req.user;
    let count = 0;

    if (u.role === 'kadiv' && u.hospital_id) {
      // Kadiv RS: SPO di step Kadiv_RS dari RS-nya yang belum di-action
      const [[r]] = await pool.query(
        `SELECT COUNT(*) c FROM spo_reviewers sr
         JOIN documents d ON d.id = sr.spo_id
         WHERE sr.user_id = ? AND sr.status = 'Pending' AND d.current_step = 'Kadiv_RS'`,
        [u.id]
      );
      count = r.c;
    } else if (u.role === 'direktur_rs' && u.hospital_id) {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) c FROM documents WHERE current_step = 'Dir_RS' AND rs_pengaju_id = ? AND workflow_status = 'Pending_Dir_RS'`,
        [u.hospital_id]
      );
      count = r.c;
    } else if (u.role === 'kadiv_corp') {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) c FROM spo_reviewers sr
         JOIN documents d ON d.id = sr.spo_id
         WHERE sr.user_id = ? AND sr.status = 'Pending' AND d.current_step = 'Kadiv_Corp'`,
        [u.id]
      );
      count = r.c;
    } else if (u.role === 'mutu_corp') {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) c FROM documents WHERE current_step IN ('Mutu_Corp','CEO') AND workflow_status IN ('Pending_Mutu_Corp','Pending_CEO')`,
      );
      count = r.c;
    } else if (u.role === 'ceo') {
      const [[r]] = await pool.query(
        `SELECT COUNT(*) c FROM documents WHERE current_step = 'CEO' AND workflow_status = 'Pending_CEO'`
      );
      count = r.c;
    }

    res.json({ count });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET for review (dashboard) ────────────────────────────────────────────────
const getForReview = async (req, res) => {
  try {
    const u = req.user;
    let rows = [];

    if (u.role === 'kadiv' || u.role === 'kadiv_corp') {
      const reviewerRole = u.role === 'kadiv' ? 'Kadiv_RS' : 'Kadiv_Corp';
      const stepFilter   = u.role === 'kadiv' ? 'Kadiv_RS' : 'Kadiv_Corp';
      [rows] = await pool.query(
        `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step, d.submitted_at,
                h.nama AS rs_nama, h.singkatan AS rs_singkatan, d.pemilik AS departemen_nama,
                sr.status AS my_status
         FROM spo_reviewers sr
         JOIN documents d ON d.id = sr.spo_id
         LEFT JOIN hospitals h  ON h.id = d.rs_pengaju_id
         WHERE sr.user_id = ? AND sr.reviewer_role = ? AND d.current_step = ?
         ORDER BY d.submitted_at DESC`,
        [u.id, reviewerRole, stepFilter]
      );
    } else if (u.role === 'direktur_rs') {
      [rows] = await pool.query(
        `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step, d.submitted_at,
                h.nama AS rs_nama, d.pemilik AS departemen_nama
         FROM documents d
         LEFT JOIN hospitals h ON h.id = d.rs_pengaju_id
         WHERE d.current_step = 'Dir_RS' AND d.rs_pengaju_id = ?
         ORDER BY d.submitted_at DESC`,
        [u.hospital_id]
      );
    } else if (u.role === 'mutu_corp') {
      [rows] = await pool.query(
        `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step, d.submitted_at,
                h.nama AS rs_nama, d.pemilik AS departemen_nama
         FROM documents d
         LEFT JOIN hospitals h ON h.id = d.rs_pengaju_id
         WHERE d.current_step = 'Mutu_Corp'
         ORDER BY d.submitted_at DESC`
      );
    } else if (u.role === 'ceo') {
      [rows] = await pool.query(
        `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step, d.submitted_at,
                h.nama AS rs_nama, d.pemilik AS departemen_nama
         FROM documents d
         LEFT JOIN hospitals h ON h.id = d.rs_pengaju_id
         WHERE d.current_step = 'CEO'
         ORDER BY d.submitted_at DESC`
      );
    }

    res.json({ data: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET release queue (Mutu Corp) ─────────────────────────────────────────────
const getReleaseQueue = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step, d.submitted_at,
              h.nama AS rs_nama, d.pemilik AS departemen_nama
       FROM documents d
       LEFT JOIN hospitals h ON h.id = d.rs_pengaju_id
       WHERE d.workflow_status = 'Approved_CEO'
       ORDER BY d.submitted_at DESC`
    );
    res.json({ data: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET my submissions ────────────────────────────────────────────────────────
const getMySubmissions = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.judul, d.nomor_dokumen, d.workflow_status, d.current_step,
              d.created_at, d.submitted_at,
              d.pemilik AS departemen_nama
       FROM documents d
       WHERE d.created_by = ? AND d.workflow_status IS NOT NULL
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json({ data: rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── GET Kadiv RS candidates ───────────────────────────────────────────────────
const getKadivRsCandidates = async (req, res) => {
  try {
    const { rs_id } = req.query;
    const [rows] = await pool.query(
      `SELECT u.id, u.nama, u.email,
              d.id AS divisi_id_num, d.nama AS divisi_nama, d.kode AS divisi_kode
       FROM users u
       JOIN divisions d ON FIND_IN_SET(d.id, u.divisi_id)
       WHERE u.role = 'kadiv' AND u.hospital_id = ? AND u.is_active = 1
       ORDER BY d.nama, u.nama`,
      [rs_id || req.user.hospital_id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── CREATE (submit pengajuan baru) ────────────────────────────────────────────
const create = async (req, res) => {
  try {
    const {
      judul, nomor_dokumen, pemilik, keterangan,
      hak_akses,          // comma-separated kode strings, e.g. "IGD,NUR"
      kadiv_reviewer_ids,
    } = req.body;

    if (!judul?.trim())               return res.status(400).json({ message: 'Judul wajib diisi' });
    if (!req.file)                    return res.status(400).json({ message: 'File wajib diupload' });
    if (!kadiv_reviewer_ids?.length)  return res.status(400).json({ message: 'Minimal 1 Kadiv RS reviewer wajib dipilih' });

    const reviewerIds = Array.isArray(kadiv_reviewer_ids) ? kadiv_reviewer_ids : [kadiv_reviewer_ids];
    const filePath    = `/uploads/spo/files/${req.file.filename}`;

    // Nomor dokumen: gunakan yang dikirim atau auto-generate
    let nomor = nomor_dokumen?.trim();
    if (!nomor) {
      const [[{ cnt }]] = await pool.query('SELECT COUNT(*)+1 AS cnt FROM documents WHERE workflow_status IS NOT NULL');
      nomor = `SPO-DRAFT-${String(cnt).padStart(4,'0')}`;
    }

    // hak_akses sebagai divisi_id (comma-separated kodes, seperti DocumentForm)
    const divisiIdStr = Array.isArray(hak_akses)
      ? hak_akses.join(',')
      : (hak_akses || '');

    const [result] = await pool.query(
      `INSERT INTO documents
         (judul, nomor_dokumen, pemilik, keterangan, divisi_id,
          url_dokumen, nama_dokumen, rs_pengaju_id,
          workflow_status, current_step, submitted_at, created_by, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending_Kadiv_RS', 'Kadiv_RS', NOW(), ?, 1)`,
      [judul.trim(), nomor, pemilik?.trim() || '', keterangan?.trim() || '',
       divisiIdStr, filePath, req.file.originalname,
       req.user.hospital_id, req.user.id]
    );
    const spoId = result.insertId;

    // Simpan file version v1
    await pool.query(
      `INSERT INTO spo_file_versions (id,spo_id,version,file_path,file_name,uploaded_by,uploaded_role)
       VALUES (UUID(),?,1,?,?,?,'RS')`,
      [spoId, filePath, req.file.originalname, req.user.id]
    );

    // Simpan Kadiv RS reviewers
    for (const uid of reviewerIds) {
      const [[uRow]] = await pool.query('SELECT divisi_id FROM users WHERE id = ?', [uid]);
      const divId = uRow?.divisi_id ? String(uRow.divisi_id).split(',')[0] : divisi_id;
      await pool.query(
        `INSERT INTO spo_reviewers (id,spo_id,user_id,reviewer_role,divisi_id) VALUES (UUID(),?,?,?,?)`,
        [spoId, uid, 'Kadiv_RS', divId]
      );
    }

    // Auto-resolve Kadiv Corp reviewers berdasarkan divisi Kadiv RS
    const [[...kadivRsUsers]] = await pool.query(
      `SELECT DISTINCT u.divisi_id FROM users u WHERE u.id IN (${reviewerIds.map(()=>'?').join(',')})`,
      reviewerIds
    );
    const divisiIds = [...new Set(kadivRsUsers.flatMap(u => String(u.divisi_id||'').split(',').map(s=>s.trim()).filter(Boolean)))];

    if (divisiIds.length) {
      const [kadivCorpUsers] = await pool.query(
        `SELECT u.id, u.divisi_id FROM users u
         WHERE u.role = 'kadiv_corp' AND u.is_active = 1
         AND (${divisiIds.map(()=>'FIND_IN_SET(?,u.divisi_id)').join(' OR ')})`,
        divisiIds
      );
      for (const ku of kadivCorpUsers) {
        const divId = String(ku.divisi_id||'').split(',')[0];
        await pool.query(
          `INSERT IGNORE INTO spo_reviewers (id,spo_id,user_id,reviewer_role,divisi_id) VALUES (UUID(),?,?,?,?)`,
          [spoId, ku.id, 'Kadiv_Corp', divId]
        );
      }
    }

    await logHistory(spoId, 'Submit', 'Submit', req.user.id);
    res.status(201).json({ id: spoId, message: 'Pengajuan berhasil dikirim' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── APPROVE ───────────────────────────────────────────────────────────────────
const approve = async (req, res) => {
  try {
    const { id } = req.params;
    const u = req.user;
    const spo = await getSpo(id);
    if (!spo) return res.status(404).json({ message: 'SPO tidak ditemukan' });

    const step = spo.current_step;

    // Parallel steps
    if (step === 'Kadiv_RS' || step === 'Kadiv_Corp') {
      const reviewerRole = step === 'Kadiv_RS' ? 'Kadiv_RS' : 'Kadiv_Corp';
      const [[myReview]] = await pool.query(
        `SELECT * FROM spo_reviewers WHERE spo_id=? AND user_id=? AND reviewer_role=? AND status='Pending'`,
        [id, u.id, reviewerRole]
      );
      if (!myReview) return res.status(403).json({ message: 'Anda bukan reviewer untuk step ini' });

      await pool.query(`UPDATE spo_reviewers SET status='Approved', action_at=NOW() WHERE id=?`, [myReview.id]);
      await logHistory(id, step, 'Approve', u.id, req.body.comment || null);

      // Cek apakah semua reviewer sudah approve
      const [[{ pending }]] = await pool.query(
        `SELECT COUNT(*) pending FROM spo_reviewers WHERE spo_id=? AND reviewer_role=? AND status='Pending'`,
        [id, reviewerRole]
      );

      if (pending === 0) {
        // Semua approve — lanjut ke step berikutnya
        const nextStep = step === 'Kadiv_RS' ? 'Dir_RS' : 'Mutu_Corp';
        const nextStatus = step === 'Kadiv_RS' ? 'Pending_Dir_RS' : 'Pending_Mutu_Corp';
        await pool.query(`UPDATE documents SET current_step=?, workflow_status=? WHERE id=?`, [nextStep, nextStatus, id]);
      }
    } else if (step === 'Dir_RS') {
      if (u.role !== 'direktur_rs' || u.hospital_id !== spo.rs_pengaju_id) return res.status(403).json({ message: 'Bukan Direktur RS yang berwenang' });
      await pool.query(`UPDATE documents SET current_step='Kadiv_Corp', workflow_status='Pending_Kadiv_Corp' WHERE id=?`, [id]);
      await logHistory(id, 'Dir_RS', 'Approve', u.id, req.body.comment || null);
    } else if (step === 'Mutu_Corp') {
      if (u.role !== 'mutu_corp') return res.status(403).json({ message: 'Bukan Mutu Corp' });
      await pool.query(`UPDATE documents SET current_step='CEO', workflow_status='Pending_CEO' WHERE id=?`, [id]);
      await logHistory(id, 'Mutu_Corp', 'Approve', u.id, req.body.comment || null);
    } else if (step === 'CEO') {
      if (u.role !== 'ceo') return res.status(403).json({ message: 'Bukan CEO' });
      await pool.query(`UPDATE documents SET current_step='Release', workflow_status='Approved_CEO' WHERE id=?`, [id]);
      await logHistory(id, 'CEO', 'Approve', u.id, req.body.comment || null);
    } else {
      return res.status(400).json({ message: 'Step tidak valid untuk approve' });
    }

    res.json({ message: 'Berhasil di-approve' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── REJECT ────────────────────────────────────────────────────────────────────
const reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment?.trim() || comment.trim().length < 10) return res.status(400).json({ message: 'Komentar minimal 10 karakter' });

    const u = req.user;
    const spo = await getSpo(id);
    if (!spo) return res.status(404).json({ message: 'SPO tidak ditemukan' });

    const step = spo.current_step;
    let rejectStatus = '';

    if (step === 'Kadiv_RS') {
      const [[myReview]] = await pool.query(
        `SELECT * FROM spo_reviewers WHERE spo_id=? AND user_id=? AND reviewer_role='Kadiv_RS' AND status='Pending'`,
        [id, u.id]
      );
      if (!myReview) return res.status(403).json({ message: 'Bukan reviewer' });
      // Reject semua reviewer lain juga
      await pool.query(`UPDATE spo_reviewers SET status='Rejected', action_at=NOW(), comment=? WHERE id=?`, [comment, myReview.id]);
      rejectStatus = 'Rejected_By_Kadiv_RS';
    } else if (step === 'Dir_RS') {
      rejectStatus = 'Rejected_By_Dir_RS';
    } else if (step === 'Kadiv_Corp') {
      const [[myReview]] = await pool.query(
        `SELECT * FROM spo_reviewers WHERE spo_id=? AND user_id=? AND reviewer_role='Kadiv_Corp' AND status='Pending'`,
        [id, u.id]
      );
      if (!myReview) return res.status(403).json({ message: 'Bukan reviewer' });
      await pool.query(`UPDATE spo_reviewers SET status='Rejected', action_at=NOW(), comment=? WHERE id=?`, [comment, myReview.id]);
      rejectStatus = 'Rejected_By_Kadiv_Corp';
    } else if (step === 'Mutu_Corp') {
      rejectStatus = 'Rejected_By_Mutu_Corp';
    } else if (step === 'CEO') {
      // CEO reject → balik ke Mutu Corp (bukan ke RS)
      await pool.query(`UPDATE documents SET current_step='Mutu_Corp', workflow_status='Rejected_By_CEO' WHERE id=?`, [id]);
      await logHistory(id, 'CEO', 'Reject', u.id, comment);
      return res.json({ message: 'Berhasil di-reject, dikembalikan ke Mutu Corp' });
    } else {
      return res.status(400).json({ message: 'Step tidak valid untuk reject' });
    }

    await pool.query(`UPDATE documents SET current_step='RS', workflow_status=? WHERE id=?`, [rejectStatus, id]);
    // Reset reviewer yang masih pending
    await pool.query(`UPDATE spo_reviewers SET status='Rejected' WHERE spo_id=? AND status='Pending'`, [id]);
    await logHistory(id, step, 'Reject', u.id, comment);
    res.json({ message: 'Berhasil di-reject' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── RESUBMIT (RS setelah reject) ──────────────────────────────────────────────
const resubmit = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });

    const [[spo]] = await pool.query('SELECT * FROM documents WHERE id=?', [id]);
    if (!spo) return res.status(404).json({ message: 'SPO tidak ditemukan' });
    if (!spo.workflow_status?.startsWith('Rejected')) return res.status(400).json({ message: 'SPO tidak dalam status reject' });

    const filePath = `/uploads/spo/files/${req.file.filename}`;
    const [[{ maxV }]] = await pool.query('SELECT MAX(version) maxV FROM spo_file_versions WHERE spo_id=?', [id]);
    const newVersion = (maxV || 0) + 1;

    await pool.query(
      `INSERT INTO spo_file_versions (id,spo_id,version,file_path,file_name,uploaded_by,uploaded_role,note)
       VALUES (UUID(),?,?,?,?,?,'RS',?)`,
      [id, newVersion, filePath, req.file.originalname, req.user.id, req.body.note || null]
    );

    // Update file utama
    await pool.query(`UPDATE documents SET url_dokumen=?, nama_dokumen=?, workflow_status='Pending_Kadiv_RS', current_step='Kadiv_RS', submitted_at=NOW() WHERE id=?`,
      [filePath, req.file.originalname, id]);

    // Reset semua reviewer ke Pending
    await pool.query(`UPDATE spo_reviewers SET status='Pending', action_at=NULL, comment=NULL WHERE spo_id=?`, [id]);
    await logHistory(id, 'Submit', 'Submit', req.user.id, req.body.note || null);

    res.json({ message: 'Pengajuan ulang berhasil' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── REPLACE FILE (Mutu Corp) ──────────────────────────────────────────────────
const replaceFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });
    if (req.user.role !== 'mutu_corp') return res.status(403).json({ message: 'Hanya Mutu Corp' });

    const filePath = `/uploads/spo/files/${req.file.filename}`;
    const [[{ maxV }]] = await pool.query('SELECT MAX(version) maxV FROM spo_file_versions WHERE spo_id=?', [id]);
    const newVersion = (maxV || 0) + 1;

    await pool.query(
      `INSERT INTO spo_file_versions (id,spo_id,version,file_path,file_name,uploaded_by,uploaded_role,note)
       VALUES (UUID(),?,?,?,?,?,'Mutu_Corp',?)`,
      [id, newVersion, filePath, req.file.originalname, req.user.id, req.body.note || null]
    );
    await pool.query(`UPDATE documents SET url_dokumen=?, nama_dokumen=? WHERE id=?`, [filePath, req.file.originalname, id]);
    await logHistory(id, 'Mutu_Corp', 'Replace_File', req.user.id, req.body.note || null);

    // Jika status CEO-rejected, kirim ulang ke CEO
    const [[spo]] = await pool.query('SELECT workflow_status FROM documents WHERE id=?', [id]);
    if (spo.workflow_status === 'Rejected_By_CEO') {
      await pool.query(`UPDATE documents SET current_step='CEO', workflow_status='Pending_CEO' WHERE id=?`, [id]);
    }
    res.json({ message: 'File berhasil diganti' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── RELEASE ───────────────────────────────────────────────────────────────────
const release = async (req, res) => {
  try {
    const { id } = req.params;
    const { rs_ids } = req.body; // array of hospital IDs
    if (!rs_ids?.length) return res.status(400).json({ message: 'Minimal 1 RS wajib dipilih' });
    if (req.user.role !== 'mutu_corp') return res.status(403).json({ message: 'Hanya Mutu Corp' });

    const [[spo]] = await pool.query('SELECT * FROM documents WHERE id=?', [id]);
    if (!spo || spo.workflow_status !== 'Approved_CEO') return res.status(400).json({ message: 'SPO belum di-approve CEO' });

    for (const rsId of rs_ids) {
      await pool.query(
        `INSERT IGNORE INTO spo_release_scope (id,spo_id,rs_id,released_by) VALUES (UUID(),?,?,?)`,
        [id, rsId, req.user.id]
      );
    }

    await pool.query(`UPDATE documents SET workflow_status='Released', current_step='Release', released_at=NOW() WHERE id=?`, [id]);
    await logHistory(id, 'Release', 'Release', req.user.id);
    res.json({ message: 'SPO berhasil di-release' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

// ── TEMPLATE CRUD ─────────────────────────────────────────────────────────────
const getTemplates = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.nama AS uploader_nama, d.nama AS departemen_nama
       FROM spo_template t
       LEFT JOIN users u     ON u.id = t.uploaded_by
       LEFT JOIN divisions d ON d.id = t.departemen_id
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
};

const createTemplate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });
    const { nama_template, deskripsi, departemen_id } = req.body;
    if (!nama_template) return res.status(400).json({ message: 'Nama template wajib' });

    const filePath = `/uploads/spo/templates/${req.file.filename}`;
    await pool.query(
      `INSERT INTO spo_template (id,nama_template,deskripsi,departemen_id,file_path,file_name,uploaded_by)
       VALUES (UUID(),?,?,?,?,?,?)`,
      [nama_template, deskripsi || null, departemen_id || null, filePath, req.file.originalname, req.user.id]
    );
    res.status(201).json({ message: 'Template berhasil ditambahkan' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

const updateTemplate = async (req, res) => {
  try {
    const { nama_template, deskripsi, departemen_id, is_active } = req.body;
    await pool.query(
      `UPDATE spo_template SET nama_template=?, deskripsi=?, departemen_id=?, is_active=? WHERE id=?`,
      [nama_template, deskripsi || null, departemen_id || null, is_active ?? 1, req.params.id]
    );
    res.json({ message: 'Template diperbarui' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

const deleteTemplate = async (req, res) => {
  try {
    await pool.query('DELETE FROM spo_template WHERE id=?', [req.params.id]);
    res.json({ message: 'Template dihapus' });
  } catch(e) { res.status(500).json({ message: e.message }); }
};

module.exports = {
  getAll, getOne, getPendingCount, getForReview, getReleaseQueue, getMySubmissions,
  getKadivRsCandidates, create, approve, reject, resubmit, replaceFile, release,
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
};
