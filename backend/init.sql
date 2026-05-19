CREATE DATABASE IF NOT EXISTS formulir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE formulir;

-- ============================================================
-- HOSPITALS
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  kode         VARCHAR(20)  NOT NULL UNIQUE,
  nama         VARCHAR(200) NOT NULL,
  direktur     VARCHAR(100),
  direktur_email VARCHAR(100),
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by   INT,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT,
  deleted_at   TIMESTAMP    NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DIVISIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS divisions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  kode         VARCHAR(20)  NOT NULL UNIQUE,
  nama         VARCHAR(100) NOT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by   INT,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT,
  deleted_at   TIMESTAMP    NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- USERS
-- divisi_id: comma-separated division IDs, e.g. "1,2,3"
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  nama         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('admin','user') NOT NULL DEFAULT 'user',
  hospital_id  INT,
  divisi_id   TEXT,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by   INT,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   INT,
  deleted_at   TIMESTAMP    NULL,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DOCUMENTS (SPO)
-- divisi_id: comma-separated division IDs, e.g. "1,2,3"
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  judul          VARCHAR(255) NOT NULL,
  nomor_dokumen  VARCHAR(50)  NOT NULL UNIQUE,
  pemilik        VARCHAR(100),
  divisi_id     TEXT,
  url_dokumen    VARCHAR(500),
  nama_dokumen   VARCHAR(255),
  keterangan     TEXT,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by     INT,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by     INT,
  deleted_at     TIMESTAMP    NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED: Hospitals
-- ============================================================
INSERT INTO hospitals (kode, nama, direktur, direktur_email) VALUES
('RSU-001', 'RS Umum Pusat Nasional',      'Dr. Budi Santoso, Sp.PD',   'budi.santoso@rsupn.co.id'),
('RSU-002', 'RS Umum Daerah Kota',          'Dr. Siti Rahayu, Sp.OG',    'siti.rahayu@rsud-kota.go.id'),
('RSK-001', 'RS Khusus Jantung dan Paru',   'Dr. Ahmad Fauzi, Sp.JP',    'ahmad.fauzi@rskjp.co.id');

-- ============================================================
-- SEED: Divisions
-- ============================================================
INSERT INTO divisions (kode, nama) VALUES
('DIV-IGD',  'Instalasi Gawat Darurat'),
('DIV-ICU',  'Intensive Care Unit'),
('DIV-OK',   'Instalasi Kamar Operasi'),
('DIV-LAB',  'Laboratorium'),
('DIV-RAD',  'Radiologi'),
('DIV-FAR',  'Farmasi'),
('DIV-GIZ',  'Gizi'),
('DIV-KEU',  'Keuangan'),
('DIV-SDM',  'Sumber Daya Manusia'),
('DIV-IT',   'Teknologi Informasi');

-- ============================================================
-- SEED: Users  (password di-hash via seed.js)
-- ============================================================
-- Lihat backend/seed.js untuk insert user dengan password hashed
