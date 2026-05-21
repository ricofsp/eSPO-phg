const pool  = require('../config/database');
const path  = require('path');
const fs    = require('fs');
const email = require('../services/emailService');

const SPECIAL_RS = ['PEVH', 'PHBP', 'PHBW', 'PHPC', 'PHRA', 'PHSW'];
const RS_CODES   = ['PHG', 'PEVH', 'PHBP', 'PHBW', 'PHPC', 'PHRA', 'PHSW'];

// ─── helpers ────────────────────────────────────────────────────────────────

async function getUserEmails(where) {
  const [rows] = await pool.query(`SELECT email FROM users WHERE ${where} AND is_active=1 AND deleted_at IS NULL`);
  return rows.map(r => r.email).filter(Boolean);
}

async function logHistory(formulir_id, step, action, actor_user_id, comment = null) {
  await pool.query(
    'INSERT INTO formulir_approval_history (id, formulir_id, step, action, actor_user_id, comment) VALUES (UUID(),?,?,?,?,?)',
    [formulir_id, step, action, actor_user_id, comment]
  );
}

// ─── getAll ──────────────────────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { search='', status='', departemen_id='', rs_id='', page=1, limit=10 } = req.query;
    const u = req.user;
    const params = [];
    // Daftar Formulir selalu hanya tampilkan Released
    let where = 'WHERE f.status = "Released"';

    // Semua RS bisa lihat semua formulir Released — filter rs hanya untuk Corp (manual filter)
    if (search)        { where += ' AND f.nama_formulir LIKE ?'; params.push(`%${search}%`); }
    if (departemen_id) { where += ' AND f.departemen_id = ?';    params.push(departemen_id); }
    if (rs_id)         { where += ' AND f.rs_pengaju_id = ?';    params.push(rs_id); }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) total FROM formulir f ${where}`, params
    );
    // Tentukan rs_code file yang relevan untuk user ini
    const userHosp = u.hospital_id
      ? (await pool.query('SELECT singkatan FROM hospitals WHERE id=?', [u.hospital_id]))[0][0]
      : null;
    const userRsCode = userHosp && SPECIAL_RS.includes(userHosp.singkatan) ? userHosp.singkatan : 'PHG';

    const [rows] = await pool.query(
      `SELECT f.*, d.nama AS departemen_nama, h.nama AS rs_nama, h.singkatan AS rs_singkatan,
              uc.nama AS created_by_nama,
              ff.file_pdf_path, ff.file_pdf_name, ff.file_docx_path, ff.file_docx_name
       FROM formulir f
       LEFT JOIN divisions d ON d.id = f.departemen_id
       LEFT JOIN hospitals h ON h.id = f.rs_pengaju_id
       LEFT JOIN users uc ON uc.id = f.created_by
       LEFT JOIN formulir_files ff ON ff.formulir_id = f.id AND ff.rs_code = ?
       ${where} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [userRsCode, ...params, parseInt(limit), offset]
    );
    res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── getOne ──────────────────────────────────────────────────────────────────
const getOne = async (req, res) => {
  try {
    const [[f]] = await pool.query(
      `SELECT f.*, d.nama AS departemen_nama, h.nama AS rs_nama, h.singkatan AS rs_singkatan,
              uc.nama AS created_by_nama, uk.nama AS kadiv_nama, uk.email AS kadiv_email
       FROM formulir f
       LEFT JOIN divisions d ON d.id = f.departemen_id
       LEFT JOIN hospitals h ON h.id = f.rs_pengaju_id
       LEFT JOIN users uc ON uc.id = f.created_by
       LEFT JOIN users uk ON uk.id = f.kadiv_notif_user_id
       WHERE f.id = ?`, [req.params.id]
    );
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });

    const [drafts] = await pool.query(
      `SELECT fdv.*, u.nama AS uploader_nama FROM formulir_draft_versions fdv
       LEFT JOIN users u ON u.id = fdv.uploaded_by
       WHERE fdv.formulir_id = ? ORDER BY fdv.version DESC`, [req.params.id]
    );
    const [files] = await pool.query(
      `SELECT ff.*, u.nama AS uploader_nama FROM formulir_files ff
       LEFT JOIN users u ON u.id = ff.uploaded_by
       WHERE ff.formulir_id = ?`, [req.params.id]
    );
    const [history] = await pool.query(
      `SELECT fah.*, u.nama AS actor_nama FROM formulir_approval_history fah
       LEFT JOIN users u ON u.id = fah.actor_user_id
       WHERE fah.formulir_id = ? ORDER BY fah.created_at ASC`, [req.params.id]
    );
    res.json({ ...f, drafts, files, history });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── create (RS submit pengajuan baru) ───────────────────────────────────────
const create = async (req, res) => {
  try {
    const { nama_formulir } = req.body;
    if (!nama_formulir)
      return res.status(400).json({ message: 'Nama formulir wajib diisi' });
    if (!req.file)
      return res.status(400).json({ message: 'File draft wajib diupload' });

    // Ambil departemen pertama dari divisi_id user
    const departemen_id = req.user.divisi_id
      ? String(req.user.divisi_id).split(',').map(s => s.trim()).filter(Boolean)[0]
      : null;
    if (!departemen_id)
      return res.status(400).json({ message: 'User tidak memiliki departemen. Hubungi Admin.' });

    // Cek uniqueness (skip yang Rejected)
    const [[dup]] = await pool.query(
      `SELECT id FROM formulir
       WHERE LOWER(TRIM(nama_formulir)) = LOWER(TRIM(?)) AND departemen_id = ?
         AND status NOT IN ('Rejected_By_Mutu_RS','Rejected_By_Mutu_Corp')`,
      [nama_formulir, departemen_id]
    );
    if (dup) {
      fs.unlink(req.file.path, () => {});
      return res.status(409).json({ message: 'Formulir dengan nama dan departemen ini sudah ada atau sedang diajukan.' });
    }

    const rs_id = req.user.hospital_id;
    if (!rs_id) return res.status(400).json({ message: 'User tidak terhubung ke RS' });

    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const filePath = `/uploads/formulir/drafts/${req.file.filename}`;

    const [[{ newId }]] = await pool.query('SELECT UUID() newId');
    await pool.query(
      `INSERT INTO formulir (id, nama_formulir, departemen_id, rs_pengaju_id, status, current_step, created_by)
       VALUES (?,?,?,?,'Submitted','Mutu_RS',?)`,
      [newId, nama_formulir.trim(), departemen_id, rs_id, req.user.id]
    );
    await pool.query(
      `INSERT INTO formulir_draft_versions (id, formulir_id, version, file_path, file_name, file_type, uploaded_by, uploaded_role)
       VALUES (UUID(),?,1,?,?,?,?,'RS')`,
      [newId, filePath, req.file.originalname, ext === 'pdf' ? 'pdf' : 'docx', req.user.id]
    );
    await logHistory(newId, 'RS', 'Submit', req.user.id);

    // Email ke Mutu RS
    const [[div]] = await pool.query('SELECT nama FROM divisions WHERE id=?', [departemen_id]);
    const [[hosp]] = await pool.query('SELECT nama FROM hospitals WHERE id=?', [rs_id]);
    const mutuRsEmails = await getUserEmails(`role='mutu_rs' AND hospital_id=${rs_id}`);
    if (mutuRsEmails.length)
      email.notifMutuRS({ emails: mutuRsEmails, formulirNama: nama_formulir, departemen: div?.nama, rsPengaju: hosp?.nama });

    const [[row]] = await pool.query('SELECT * FROM formulir WHERE id=?', [newId]);
    res.status(201).json(row);
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
};

// ─── checkUnique ─────────────────────────────────────────────────────────────
const checkUnique = async (req, res) => {
  try {
    const { nama_formulir, departemen_id, exclude_id } = req.query;
    let q = `SELECT id FROM formulir WHERE LOWER(TRIM(nama_formulir))=LOWER(TRIM(?)) AND departemen_id=?
             AND status NOT IN ('Rejected_By_Mutu_RS','Rejected_By_Mutu_Corp')`;
    const p = [nama_formulir, departemen_id];
    if (exclude_id) { q += ' AND id != ?'; p.push(exclude_id); }
    const [[row]] = await pool.query(q, p);
    res.json({ exists: !!row });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── approve ─────────────────────────────────────────────────────────────────
const approve = async (req, res) => {
  try {
    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });

    const u = req.user;
    let newStatus, newStep, histStep;

    if (u.role === 'mutu_rs' && f.current_step === 'Mutu_RS') {
      newStatus = 'Pending_Mutu_Corp'; newStep = 'Mutu_Corp'; histStep = 'Mutu_RS';
      // notif Mutu Corp
      const emails = await getUserEmails(`role='mutu_corp'`);
      const [[div]] = await pool.query('SELECT nama FROM divisions WHERE id=?', [f.departemen_id]);
      if (emails.length) email.notifMutuCorp({ emails, formulirNama: f.nama_formulir, departemen: div?.nama, action: 'approve' });
    } else if (u.role === 'mutu_corp' && f.current_step === 'Mutu_Corp') {
      newStatus = 'In_Design'; newStep = 'Design_Corp'; histStep = 'Mutu_Corp';
      // notif Design Corp
      const emails = await getUserEmails(`role='design_corp'`);
      const [[div]] = await pool.query('SELECT nama FROM divisions WHERE id=?', [f.departemen_id]);
      if (emails.length) email.notifDesignCorp({ emails, formulirNama: f.nama_formulir, departemen: div?.nama });
    } else {
      return res.status(403).json({ message: 'Tidak berhak melakukan approve di step ini' });
    }

    await pool.query('UPDATE formulir SET status=?, current_step=?, updated_at=NOW() WHERE id=?', [newStatus, newStep, f.id]);
    await logHistory(f.id, histStep, 'Approve', u.id, req.body.comment || null);
    res.json({ message: 'Berhasil di-approve' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── reject ──────────────────────────────────────────────────────────────────
const reject = async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || comment.trim().length < 10)
      return res.status(400).json({ message: 'Komentar minimal 10 karakter' });

    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });

    const u = req.user;
    let newStatus, histStep, rejectedBy;

    if (u.role === 'mutu_rs' && f.current_step === 'Mutu_RS') {
      newStatus = 'Rejected_By_Mutu_RS'; histStep = 'Mutu_RS'; rejectedBy = 'Mutu RS';
    } else if (u.role === 'mutu_corp' && f.current_step === 'Mutu_Corp') {
      newStatus = 'Rejected_By_Mutu_Corp'; histStep = 'Mutu_Corp'; rejectedBy = 'Mutu Corp';
    } else {
      return res.status(403).json({ message: 'Tidak berhak melakukan reject di step ini' });
    }

    await pool.query('UPDATE formulir SET status=?, current_step="RS", updated_at=NOW() WHERE id=?', [newStatus, f.id]);
    await logHistory(f.id, histStep, 'Reject', u.id, comment);

    // notif RS pengaju
    const [rsUsers] = await pool.query(
      'SELECT email FROM users WHERE hospital_id=? AND is_active=1 AND deleted_at IS NULL', [f.rs_pengaju_id]
    );
    const emails = rsUsers.map(r => r.email).filter(Boolean);
    if (emails.length) email.notifReject({ emails, formulirNama: f.nama_formulir, rejectedBy, comment });

    res.json({ message: 'Berhasil di-reject' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── resubmit (RS upload ulang setelah reject) ───────────────────────────────
const resubmit = async (req, res) => {
  try {
    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });
    if (!['Rejected_By_Mutu_RS','Rejected_By_Mutu_Corp'].includes(f.status))
      return res.status(400).json({ message: 'Formulir tidak dalam status rejected' });
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });

    const [[{ maxVer }]] = await pool.query(
      'SELECT MAX(version) maxVer FROM formulir_draft_versions WHERE formulir_id=?', [f.id]
    );
    const newVer = (maxVer || 0) + 1;
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const filePath = `/uploads/formulir/drafts/${req.file.filename}`;

    await pool.query(
      'INSERT INTO formulir_draft_versions (id,formulir_id,version,file_path,file_name,file_type,uploaded_by,uploaded_role) VALUES(UUID(),?,?,?,?,?,"RS",?,"")',
      [f.id, newVer, filePath, req.file.originalname, ext === 'pdf' ? 'pdf' : 'docx', req.user.id]
    );
    await pool.query(
      "UPDATE formulir SET status='Submitted', current_step='Mutu_RS', updated_at=NOW() WHERE id=?", [f.id]
    );
    await logHistory(f.id, 'RS', 'Submit', req.user.id, req.body.note || null);

    // notif Mutu RS
    const [[div]] = await pool.query('SELECT nama FROM divisions WHERE id=?', [f.departemen_id]);
    const [[hosp]] = await pool.query('SELECT nama FROM hospitals WHERE id=?', [f.rs_pengaju_id]);
    const mutuRsEmails = await getUserEmails(`role='mutu_rs' AND hospital_id=${f.rs_pengaju_id}`);
    if (mutuRsEmails.length)
      email.notifMutuRS({ emails: mutuRsEmails, formulirNama: f.nama_formulir, departemen: div?.nama, rsPengaju: hosp?.nama });

    res.json({ message: 'Berhasil diajukan ulang' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
};

// ─── replaceDraft (Mutu Corp replace file) ───────────────────────────────────
const replaceDraft = async (req, res) => {
  try {
    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });
    if (f.current_step !== 'Mutu_Corp') return res.status(400).json({ message: 'Bukan step Mutu Corp' });
    if (!req.file) return res.status(400).json({ message: 'File wajib diupload' });

    const [[{ maxVer }]] = await pool.query(
      'SELECT MAX(version) maxVer FROM formulir_draft_versions WHERE formulir_id=?', [f.id]
    );
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const filePath = `/uploads/formulir/drafts/${req.file.filename}`;
    await pool.query(
      'INSERT INTO formulir_draft_versions (id,formulir_id,version,file_path,file_name,file_type,uploaded_by,uploaded_role,note) VALUES(UUID(),?,?,?,?,?,?,"Mutu_Corp",?)',
      [f.id, (maxVer||0)+1, filePath, req.file.originalname, ext==='pdf'?'pdf':'docx', req.user.id, req.body.note||null]
    );
    await logHistory(f.id, 'Mutu_Corp', 'Replace_File', req.user.id, req.body.note||null);
    res.json({ message: 'File berhasil diganti' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: err.message });
  }
};

// ─── submitDesign (Design Corp upload 7 file) ────────────────────────────────
const submitDesign = async (req, res) => {
  try {
    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=?', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan' });
    if (f.current_step !== 'Design_Corp') return res.status(400).json({ message: 'Bukan step Design Corp' });

    const { kadiv_user_id } = req.body;
    if (!kadiv_user_id) return res.status(400).json({ message: 'Kadiv harus dipilih' });

    const fileMap = {};
    Object.entries(req.files || {}).forEach(([field, arr]) => { fileMap[field] = arr[0]; });

    // Validasi semua 7 file ada
    for (const code of RS_CODES) {
      if (!fileMap[`file_${code}`])
        return res.status(400).json({ message: `File untuk ${code} belum diupload` });
    }

    for (const code of RS_CODES) {
      const uploaded = fileMap[`file_${code}`];
      const filePath = `/uploads/formulir/finals/${uploaded.filename}`;
      const ext      = path.extname(uploaded.originalname).slice(1).toLowerCase();
      const isPdf    = ext === 'pdf';

      await pool.query(
        `INSERT INTO formulir_files (id,formulir_id,rs_code,file_pdf_path,file_pdf_name,file_docx_path,file_docx_name,uploaded_by)
         VALUES (UUID(),?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           file_pdf_path  = VALUES(file_pdf_path),  file_pdf_name  = VALUES(file_pdf_name),
           file_docx_path = VALUES(file_docx_path), file_docx_name = VALUES(file_docx_name),
           uploaded_by = VALUES(uploaded_by), uploaded_at = NOW()`,
        [
          f.id, code,
          isPdf ? filePath : null, isPdf ? uploaded.originalname : null,
          !isPdf ? filePath : null, !isPdf ? uploaded.originalname : null,
          req.user.id,
        ]
      );
    }

    await pool.query(
      "UPDATE formulir SET status='Released', current_step='Done', kadiv_notif_user_id=?, released_at=NOW(), updated_at=NOW() WHERE id=?",
      [kadiv_user_id, f.id]
    );
    await logHistory(f.id, 'Design_Corp', 'Submit_Design', req.user.id);
    await logHistory(f.id, 'Mutu_Corp', 'Release', req.user.id);

    // Email notif
    const [[div]] = await pool.query('SELECT nama FROM divisions WHERE id=?', [f.departemen_id]);
    const [[kadiv]] = await pool.query('SELECT email FROM users WHERE id=?', [kadiv_user_id]);
    const [rsUsers] = await pool.query('SELECT email FROM users WHERE hospital_id=? AND is_active=1', [f.rs_pengaju_id]);
    email.notifReleased({
      toKadiv: kadiv?.email ? [kadiv.email] : [],
      toRS: rsUsers.map(r => r.email).filter(Boolean),
      formulirNama: f.nama_formulir,
      departemen: div?.nama,
    });

    res.json({ message: 'Design submitted, formulir released' });
  } catch (err) {
    (req.files||[]).forEach(f => fs.unlink(f.path, ()=>{}));
    res.status(500).json({ message: err.message });
  }
};

// ─── getForReview (list formulir yang perlu diaction sesuai role) ─────────────
const getForReview = async (req, res) => {
  try {
    const u = req.user;
    let stepFilter = '';
    if (u.role === 'mutu_rs')      stepFilter = `AND f.current_step='Mutu_RS' AND f.rs_pengaju_id=${u.hospital_id||0}`;
    else if (u.role === 'mutu_corp') stepFilter = `AND f.current_step IN ('Mutu_Corp')`;
    else if (u.role === 'design_corp') stepFilter = `AND f.current_step='Design_Corp'`;
    else return res.status(403).json({ message: 'Tidak berhak' });

    const [rows] = await pool.query(
      `SELECT f.*, d.nama AS departemen_nama, h.nama AS rs_nama, h.singkatan AS rs_singkatan
       FROM formulir f
       LEFT JOIN divisions d ON d.id = f.departemen_id
       LEFT JOIN hospitals h ON h.id = f.rs_pengaju_id
       WHERE 1=1 ${stepFilter}
       ORDER BY f.created_at ASC`
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── getMySumbissions (RS: pengajuan saya) ───────────────────────────────────
const getMySubmissions = async (req, res) => {
  try {
    const u = req.user;
    const [rows] = await pool.query(
      `SELECT f.*, d.nama AS departemen_nama, h.nama AS rs_nama
       FROM formulir f
       LEFT JOIN divisions d ON d.id = f.departemen_id
       LEFT JOIN hospitals h ON h.id = f.rs_pengaju_id
       WHERE f.created_by = ? OR f.rs_pengaju_id = ?
       ORDER BY f.created_at DESC`,
      [u.id, u.hospital_id || 0]
    );
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── getKadivList ─────────────────────────────────────────────────────────────
const getKadivList = async (req, res) => {
  try {
    const { departemen_id, rs_id } = req.query;
    const [rows] = await pool.query(
      `SELECT id, nama, email FROM users
       WHERE role='kadiv' AND is_active=1 AND deleted_at IS NULL
         AND (FIND_IN_SET(?, IFNULL(divisi_id,'')) OR divisi_id IS NULL)
         AND (hospital_id=? OR hospital_id IS NULL)`,
      [departemen_id || '', rs_id || 0]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ─── getFiles (ambil file final sesuai RS user) ───────────────────────────────
const getFiles = async (req, res) => {
  try {
    const [[f]] = await pool.query('SELECT * FROM formulir WHERE id=? AND status="Released"', [req.params.id]);
    if (!f) return res.status(404).json({ message: 'Formulir tidak ditemukan atau belum released' });

    const u = req.user;
    let rsCodeFilter = null;
    if (!['admin','mutu_corp','design_corp','corp_monitor'].includes(u.role) && u.hospital_id) {
      const [[hosp]] = await pool.query('SELECT singkatan FROM hospitals WHERE id=?', [u.hospital_id]);
      rsCodeFilter = SPECIAL_RS.includes(hosp?.singkatan) ? hosp.singkatan : 'PHG';
    }

    let q = 'SELECT * FROM formulir_files WHERE formulir_id=?';
    const p = [f.id];
    if (rsCodeFilter) { q += ' AND rs_code=?'; p.push(rsCodeFilter); }

    const [files] = await pool.query(q, p);
    res.json(files);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getAll, getOne, create, checkUnique, approve, reject, resubmit, replaceDraft, submitDesign, getForReview, getMySubmissions, getKadivList, getFiles };
