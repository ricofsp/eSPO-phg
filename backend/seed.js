require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./src/config/database');

async function seed() {
  try {
    // Hospitals
    await pool.query(`
      INSERT IGNORE INTO hospitals (kode, nama, direktur, direktur_email) VALUES
      ('RSU-001', 'RS Umum Pusat Nasional',    'Dr. Budi Santoso, Sp.PD',  'budi.santoso@rsupn.co.id'),
      ('RSU-002', 'RS Umum Daerah Kota',        'Dr. Siti Rahayu, Sp.OG',   'siti.rahayu@rsud-kota.go.id'),
      ('RSK-001', 'RS Khusus Jantung dan Paru', 'Dr. Ahmad Fauzi, Sp.JP',   'ahmad.fauzi@rskjp.co.id')
    `);
    console.log('✓ Hospitals seeded');

    // Divisions (data dari sistem lama)
    await pool.query(`
      INSERT IGNORE INTO divisions (kode, nama, is_active) VALUES
      ('ACC','Accounting',1),('ADM','Administration, Registration, Cashier',1),
      ('ANG','Angiography',1),('BAD','Bank Darah',1),('BBD','Blood Bank',1),
      ('BUS','Business Development',1),('CAS','Casemix',1),('CCD','Customer Care',1),
      ('CHE','Chemotherapy',1),('CMG','Case Manager',1),('CMX','Case Mix',1),
      ('COC','Contact Center',1),('CSS','Central Sterile Supply Department',1),
      ('DEN','Dental',1),('EDK','Endoskopi',1),('ELM','Maintenance Medis',1),
      ('END','Endoscopy',1),('ERD','Emergency Room',1),('ESW','ESWL',1),
      ('EYE','Eye Center',0),('EYQ','EyeQu LASIK and Eye Center',1),
      ('FA','Finance and Accounting',1),('FAC','Finance & Accounting',1),
      ('FAR','Farmasi',1),('FIN','Finance',1),('GA','Umum',1),
      ('GAD','General Affairs',1),('GG','Poli Gigi',1),('GMD','General Maintenance',1),
      ('GZ','Gizi',1),('HD','Hemodialisa',1),('HDN','HD Nursing',1),
      ('HEM','Hemodialysis',1),('HRD','Human Resources',1),
      ('IA','Internal Audit',1),('IAD','Internal Audit',1),
      ('ICU','Intensive Care Unit, High Care Unit',1),('IGD','Instalasi Gawat Darurat',1),
      ('IPD','Inpatient',1),('IT','Information Technology',1),
      ('ITE','Information Technology',1),('IVF','In Vitro Fertilization',1),
      ('KBY','Kamar Bayi',1),('KPI','Komite PPI',1),('LAB','Laboratory',1),
      ('LGL','Legal',1),('LOG','Logistic',1),('MAR','Marketing',1),
      ('MCD','Marketing Communication',1),('MCU','Medical Check-Up',1),
      ('MD','Medis',1),('MED','Medics',1),('MKT','Marketing',1),
      ('MMD','Medical Maintenance',1),('MRE','Medical Record',1),
      ('MSD','Medical Services',1),('NIC','Neonatal Intensive Care Unit, Pediatric ICU',1),
      ('NUR','Nursing',1),('NURS','Keperawatan',1),('NUT','Nutrition',1),
      ('ODC','One Day Care',1),('OK','Kamar Operasi',1),('OPD','Outpatient',1),
      ('OTD','Operating Theatre',1),('PC','Procurement',1),
      ('PCD','Primaya Care (Service Excellence)',1),('PHA','Pharmacy',1),
      ('PHY','Physiotherapy',1),('POL','Poliklinik',1),('PPI','PPI',1),
      ('PRO','Procurement',1),('PS','Patient Safety',1),('QA','Mutu',1),
      ('QUA','Quality',1),('RAD','Radiology',1),('RH','Rehab Medis',1),
      ('RM','Rekam Medis',1),('RTD','Radiotherapy',1),
      ('SDM','Sumber Daya Manusia',1),('SOD','Supervisor on Duty',1),
      ('TAX','Taxation',1),('THA','Thalassemia',1),('VK','Kamar Bersalin',1),
      ('VKD','Delivery Room (VK)',1),('WBD','Well Baby',1),('WST','Westerindo',1)
    `);
    console.log('✓ Divisions seeded (86 divisi)');

    // Get hospital id
    const [[hospital]] = await pool.query("SELECT id FROM hospitals WHERE kode = 'RSU-001' LIMIT 1");
    const hospitalId   = hospital?.id || null;

    const adminPass = await bcrypt.hash('admin123', 10);
    const userPass  = await bcrypt.hash('user123', 10);

    await pool.query(
      `INSERT INTO users (username, nama, email, password, role, hospital_id, divisi_id, is_active)
       VALUES (?, ?, ?, ?, 'admin', ?, NULL, 1), (?, ?, ?, ?, 'user', ?, '1,2,3', 1)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [
        'admin',    'Administrator', 'admin@spo.id', adminPass, hospitalId,
        'user.igd', 'Petugas IGD',   'user@spo.id',  userPass,  hospitalId,
      ]
    );
    console.log('✓ Users seeded');
    console.log('');
    console.log('  Login admin : admin@spo.id   / admin123');
    console.log('  Login user  : user@spo.id    / user123');
  } catch (err) {
    console.error('❌ Seed gagal:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
