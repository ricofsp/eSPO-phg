require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./src/config/database');

async function seed() {
  try {
    // Ambil hospital & divisi ID
    const [[phta]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PHTA' LIMIT 1");
    const [[phbb]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PHBB' LIMIT 1");
    const [[pevh]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='PEVH' LIMIT 1");
    const [[corp]] = await pool.query("SELECT id FROM hospitals WHERE singkatan='CORP' LIMIT 1");

    const [[dIGD]] = await pool.query("SELECT id FROM divisions WHERE kode='IGD' LIMIT 1");
    const [[dNUR]] = await pool.query("SELECT id FROM divisions WHERE kode='NUR' LIMIT 1");
    const [[dIT]]  = await pool.query("SELECT id FROM divisions WHERE kode='IT'  LIMIT 1");
    const [[dGAD]] = await pool.query("SELECT id FROM divisions WHERE kode='GAD' LIMIT 1");
    const [[dICU]] = await pool.query("SELECT id FROM divisions WHERE kode='ICU' LIMIT 1");

    const pw = (pass) => bcrypt.hash(pass, 10);

    const users = [
      // ─── RS Tangerang (PHTA) ─────────────────────────────────────────────
      {
        username: 'rs.phta.igd',
        nama:     'Budi Santoso (PHTA — IGD)',
        email:    'rs.phta.igd@primayahospital.com',
        password: await pw('password123'),
        role:     'user',
        hospital_id: phta.id,
        divisi_id:   String(dIGD.id),
        note:     'RS user PHTA, departemen IGD — bertugas upload pengajuan formulir',
      },
      {
        username: 'mutu.phta',
        nama:     'Sari Dewi (Mutu RS PHTA)',
        email:    'mutu.phta@primayahospital.com',
        password: await pw('password123'),
        role:     'mutu_rs',
        hospital_id: phta.id,
        divisi_id:   null,
        note:     'Mutu RS PHTA — mereview pengajuan dari semua divisi PHTA',
      },
      {
        username: 'kadiv.phta.igd',
        nama:     'Dr. Hendra (Kadiv IGD PHTA)',
        email:    'kadiv.phta.igd@primayahospital.com',
        password: await pw('password123'),
        role:     'kadiv',
        hospital_id: phta.id,
        divisi_id:   String(dIGD.id),
        note:     'Kadiv IGD PHTA — penerima notif saat formulir dirilis',
      },

      // ─── RS Bekasi Barat (PHBB) ───────────────────────────────────────────
      {
        username: 'rs.phbb.nur',
        nama:     'Ratna Wulandari (PHBB — Nursing)',
        email:    'rs.phbb.nur@primayahospital.com',
        password: await pw('password123'),
        role:     'user',
        hospital_id: phbb.id,
        divisi_id:   String(dNUR.id),
        note:     'RS user PHBB, departemen Nursing',
      },
      {
        username: 'mutu.phbb',
        nama:     'Agus Prasetyo (Mutu RS PHBB)',
        email:    'mutu.phbb@primayahospital.com',
        password: await pw('password123'),
        role:     'mutu_rs',
        hospital_id: phbb.id,
        divisi_id:   null,
        note:     'Mutu RS PHBB',
      },
      {
        username: 'kadiv.phbb.nur',
        nama:     'Ns. Fitri (Kadiv Nursing PHBB)',
        email:    'kadiv.phbb.nur@primayahospital.com',
        password: await pw('password123'),
        role:     'kadiv',
        hospital_id: phbb.id,
        divisi_id:   String(dNUR.id),
        note:     'Kadiv Nursing PHBB',
      },

      // ─── RS Khusus Evasari (PEVH) — RS dengan logo khusus ────────────────
      {
        username: 'rs.pevh.it',
        nama:     'Dian Kusuma (PEVH — IT)',
        email:    'rs.pevh.it@primayahospital.com',
        password: await pw('password123'),
        role:     'user',
        hospital_id: pevh.id,
        divisi_id:   String(dIT.id),
        note:     'RS user PEVH (RS logo khusus), departemen IT',
      },
      {
        username: 'mutu.pevh',
        nama:     'Lina Marlina (Mutu RS PEVH)',
        email:    'mutu.pevh@primayahospital.com',
        password: await pw('password123'),
        role:     'mutu_rs',
        hospital_id: pevh.id,
        divisi_id:   null,
        note:     'Mutu RS PEVH',
      },
      {
        username: 'kadiv.pevh.it',
        nama:     'Rizky Aditya (Kadiv IT PEVH)',
        email:    'kadiv.pevh.it@primayahospital.com',
        password: await pw('password123'),
        role:     'kadiv',
        hospital_id: pevh.id,
        divisi_id:   String(dIT.id),
        note:     'Kadiv IT PEVH',
      },

      // ─── Corporate ────────────────────────────────────────────────────────
      {
        username: 'mutu.corp',
        nama:     'Indah Permata (Mutu Corp)',
        email:    'mutu.corp@primayahospital.com',
        password: await pw('password123'),
        role:     'mutu_corp',
        hospital_id: corp.id,
        divisi_id:   null,
        note:     'Mutu Corp — mereview dari Mutu RS, approve ke Design',
      },
      {
        username: 'design.corp',
        nama:     'Wahyu Graphic (Design Corp)',
        email:    'design.corp@primayahospital.com',
        password: await pw('password123'),
        role:     'design_corp',
        hospital_id: corp.id,
        divisi_id:   null,
        note:     'Design Corp — upload 7 file final (PHG + 6 khusus)',
      },
      {
        username: 'monitor.corp',
        nama:     'Direktur Corp (Monitor)',
        email:    'monitor.corp@primayahospital.com',
        password: await pw('password123'),
        role:     'corp_monitor',
        hospital_id: corp.id,
        divisi_id:   null,
        note:     'Corp Monitor — view only semua formulir',
      },
    ];

    for (const u of users) {
      await pool.query(
        `INSERT INTO users (username, nama, email, password, role, hospital_id, divisi_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           nama=VALUES(nama), password=VALUES(password),
           role=VALUES(role), hospital_id=VALUES(hospital_id), divisi_id=VALUES(divisi_id)`,
        [u.username, u.nama, u.email, u.password, u.role, u.hospital_id || null, u.divisi_id || null]
      );
      console.log(`✓ ${u.role.padEnd(12)} | ${u.username.padEnd(20)} | ${u.note}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  DAFTAR AKUN FORMULIR');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Semua password: password123');
    console.log('');
    console.log('  RS TANGERANG (PHTA)');
    console.log('  - rs.phta.igd@primayahospital.com   → RS User (upload pengajuan)');
    console.log('  - mutu.phta@primayahospital.com     → Mutu RS (review step 1)');
    console.log('  - kadiv.phta.igd@primayahospital.com→ Kadiv IGD (penerima notif)');
    console.log('');
    console.log('  RS BEKASI BARAT (PHBB)');
    console.log('  - rs.phbb.nur@primayahospital.com   → RS User Nursing');
    console.log('  - mutu.phbb@primayahospital.com     → Mutu RS');
    console.log('  - kadiv.phbb.nur@primayahospital.com→ Kadiv Nursing');
    console.log('');
    console.log('  RS EVASARI / LOGO KHUSUS (PEVH)');
    console.log('  - rs.pevh.it@primayahospital.com    → RS User IT');
    console.log('  - mutu.pevh@primayahospital.com     → Mutu RS');
    console.log('  - kadiv.pevh.it@primayahospital.com → Kadiv IT');
    console.log('');
    console.log('  CORPORATE');
    console.log('  - mutu.corp@primayahospital.com     → Mutu Corp (review step 2)');
    console.log('  - design.corp@primayahospital.com   → Design Corp (upload 7 file)');
    console.log('  - monitor.corp@primayahospital.com  → Corp Monitor (view all)');
    console.log('═══════════════════════════════════════════════════════');

  } catch (err) {
    console.error('❌ Gagal:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
