/**
 * Seed users untuk simulasi alur SPO Approval lengkap:
 * Submit RS → Kadiv RS → Dir RS → Kadiv Corp → Mutu Corp → CEO → Release
 *
 * Role yang diperlukan (tambahan dari seed-formulir-users.js):
 *   direktur_rs  — step Dir RS (per RS)
 *   kadiv_corp   — step Kadiv Corp parallel (per divisi kelompok, corp-level)
 *   ceo          — step CEO
 *
 * Role yang sudah ada:
 *   user / mutu_rs  → rs.phta.igd, rs.phbb.nur, rs.pevh.it  (pengaju)
 *   kadiv           → kadiv.phta.igd (div 38), kadiv.phbb.nur (div 58), kadiv.pevh.it (div 40)
 *   mutu_corp       → mutu.corp
 *   admin           → admin
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./src/config/database');

async function seed() {
  try {
    // ── Ambil hospital IDs ─────────────────────────────────────────────────────
    const [[phta]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PHTA' LIMIT 1");
    const [[phbb]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PHBB' LIMIT 1");
    const [[pevh]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PEVH' LIMIT 1");
    const [[corp]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='CORP' LIMIT 1");

    if (!phta || !phbb || !pevh || !corp) {
      throw new Error('Beberapa hospital tidak ditemukan. Pastikan tabel hospitals sudah terisi.');
    }

    // ── Ambil divisi IDs ────────────────────────────────────────────────────────
    const [[dIGD]] = await pool.query("SELECT id FROM divisions WHERE kode='IGD' LIMIT 1");  // id=38
    const [[dNUR]] = await pool.query("SELECT id FROM divisions WHERE kode='NUR' LIMIT 1");  // id=58
    const [[dIT]]  = await pool.query("SELECT id FROM divisions WHERE kode='IT'  LIMIT 1");  // id=40
    const [[dICU]] = await pool.query("SELECT id FROM divisions WHERE kode='ICU' LIMIT 1");  // id=37
    const [[dGAD]] = await pool.query("SELECT id FROM divisions WHERE kode='GAD' LIMIT 1");  // id=27
    const [[dFAR]] = await pool.query("SELECT id FROM divisions WHERE kode='FAR' LIMIT 1");  // id=24
    const [[dOPD]] = await pool.query("SELECT id FROM divisions WHERE kode='OPD' LIMIT 1");  // id=63

    const pw = (pass) => bcrypt.hash(pass, 10);

    const users = [

      // ══════════════════════════════════════════════════════════════════════════
      //  DIREKTUR RS — step Dir RS setelah semua Kadiv RS approve
      // ══════════════════════════════════════════════════════════════════════════
      {
        username:   'dir.phta',
        nama:       'dr. Antonius K., SpB (Direktur PHTA)',
        email:      'dir.phta@primayahospital.com',
        password:   await pw('password123'),
        role:       'direktur_rs',
        hospital_id: phta.id,
        divisi_id:  null,
        note:       'Direktur RS PHTA — approve di step Dir RS setelah Kadiv RS',
      },
      {
        username:   'dir.phbb',
        nama:       'dr. Marlena S., SpPD (Direktur PHBB)',
        email:      'dir.phbb@primayahospital.com',
        password:   await pw('password123'),
        role:       'direktur_rs',
        hospital_id: phbb.id,
        divisi_id:  null,
        note:       'Direktur RS PHBB',
      },
      {
        username:   'dir.pevh',
        nama:       'dr. Haris F., SpOG (Direktur PEVH)',
        email:      'dir.pevh@primayahospital.com',
        password:   await pw('password123'),
        role:       'direktur_rs',
        hospital_id: pevh.id,
        divisi_id:  null,
        note:       'Direktur RS PEVH',
      },

      // ══════════════════════════════════════════════════════════════════════════
      //  KADIV CORP — step Kadiv Corp (parallel, auto-assign berdasarkan divisi)
      //  Kadiv Corp dikelompokkan per cluster divisi agar auto-assign bekerja:
      //    • Cluster Klinis : IGD + ICU + OPD + FAR
      //    • Cluster Penunjang: IT + GAD
      //    • Cluster Perawatan: NUR
      // ══════════════════════════════════════════════════════════════════════════
      {
        username:   'kadiv.corp.klinis',
        nama:       'dr. Benny W. (Kadiv Corp — Klinis)',
        email:      'kadiv.corp.klinis@primayahospital.com',
        password:   await pw('password123'),
        role:       'kadiv_corp',
        hospital_id: corp.id,
        divisi_id:  [dIGD?.id, dICU?.id, dOPD?.id, dFAR?.id].filter(Boolean).join(','),
        note:       'Kadiv Corp klinis — cover IGD, ICU, OPD, FAR (auto-assign saat Kadiv RS dari divisi ini dipilih)',
      },
      {
        username:   'kadiv.corp.penunjang',
        nama:       'Ir. Cahyo T. (Kadiv Corp — Penunjang)',
        email:      'kadiv.corp.penunjang@primayahospital.com',
        password:   await pw('password123'),
        role:       'kadiv_corp',
        hospital_id: corp.id,
        divisi_id:  [dIT?.id, dGAD?.id].filter(Boolean).join(','),
        note:       'Kadiv Corp penunjang — cover IT, GAD (auto-assign saat Kadiv RS dari divisi ini dipilih)',
      },
      {
        username:   'kadiv.corp.perawatan',
        nama:       'Ns. Dewi K., S.Kep (Kadiv Corp — Perawatan)',
        email:      'kadiv.corp.perawatan@primayahospital.com',
        password:   await pw('password123'),
        role:       'kadiv_corp',
        hospital_id: corp.id,
        divisi_id:  [dNUR?.id].filter(Boolean).join(','),
        note:       'Kadiv Corp perawatan — cover NUR (auto-assign saat Kadiv RS Nursing dipilih)',
      },

      // ══════════════════════════════════════════════════════════════════════════
      //  CEO — step CEO (persetujuan akhir sebelum release)
      // ══════════════════════════════════════════════════════════════════════════
      {
        username:   'ceo.corp',
        nama:       'Ranieri F. (CEO Primaya Group)',
        email:      'ceo.corp@primayahospital.com',
        password:   await pw('password123'),
        role:       'ceo',
        hospital_id: corp.id,
        divisi_id:  null,
        note:       'CEO — approve di step CEO setelah Mutu Corp. Jika reject → kembali ke Mutu Corp.',
      },
    ];

    console.log('\n  Menyimpan users...\n');
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, nama, email, password, role, hospital_id, divisi_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           nama=VALUES(nama), password=VALUES(password),
           role=VALUES(role), hospital_id=VALUES(hospital_id), divisi_id=VALUES(divisi_id)`,
        [u.username, u.nama, u.email, u.password, u.role, u.hospital_id ?? null, u.divisi_id ?? null]
      );
      console.log(`  ✓ ${u.role.padEnd(15)} | ${u.username.padEnd(28)} | ${u.note}`);
    }

    console.log(`
══════════════════════════════════════════════════════════════════════
  AKUN SPO APPROVAL — SIMULASI LENGKAP
  Semua password: password123
══════════════════════════════════════════════════════════════════════

  STEP 1 — SUBMIT RS
  ┌─ rs.phta.igd@primayahospital.com       role: user
  ├─ rs.phbb.nur@primayahospital.com       role: user
  └─ rs.pevh.it@primayahospital.com        role: user

  STEP 2 — KADIV RS (parallel, pilih saat submit)
  ┌─ kadiv.phta.igd@primayahospital.com    role: kadiv    divisi: IGD
  ├─ kadiv.phbb.nur@primayahospital.com    role: kadiv    divisi: Nursing
  └─ kadiv.pevh.it@primayahospital.com     role: kadiv    divisi: IT

  STEP 3 — DIREKTUR RS
  ┌─ dir.phta@primayahospital.com          role: direktur_rs
  ├─ dir.phbb@primayahospital.com          role: direktur_rs
  └─ dir.pevh@primayahospital.com          role: direktur_rs

  STEP 4 — KADIV CORP (parallel, auto-assign berdasarkan divisi Kadiv RS)
  ┌─ kadiv.corp.klinis@primayahospital.com     role: kadiv_corp  divisi: IGD,ICU,OPD,FAR
  ├─ kadiv.corp.penunjang@primayahospital.com  role: kadiv_corp  divisi: IT,GAD
  └─ kadiv.corp.perawatan@primayahospital.com  role: kadiv_corp  divisi: Nursing

  STEP 5 — MUTU CORP
  └─ mutu.corp@primayahospital.com         role: mutu_corp
     (sudah ada dari seed-formulir-users.js)

  STEP 6 — CEO
  └─ ceo.corp@primayahospital.com          role: ceo

  STEP 7 — RELEASE (dilakukan oleh Mutu Corp)
  └─ mutu.corp@primayahospital.com

══════════════════════════════════════════════════════════════════════
  CATATAN SIMULASI:
  • Submit dari rs.phta.igd → pilih kadiv.phta.igd sebagai Kadiv RS reviewer
  • Kadiv Corp auto-assigned: kadiv.corp.klinis (karena divisi IGD cocok)
  • Setelah Dir RS approve → kedua Kadiv Corp di-queue secara parallel
  • CEO reject → kembali ke Mutu Corp (bukan ke RS)
══════════════════════════════════════════════════════════════════════
`);
  } catch (err) {
    console.error('\n  ❌ Gagal:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
