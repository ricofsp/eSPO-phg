require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const path          = require('path');
const fs            = require('fs');
const errorHandler  = require('./src/middleware/errorHandler');
const { auth }      = require('./src/middleware/auth');
const authRoutes    = require('./src/routes/auth');
const documentRoutes= require('./src/routes/documents');
const hospitalRoutes= require('./src/routes/hospitals');
const divisionRoutes= require('./src/routes/divisions');
const userRoutes    = require('./src/routes/users');
const formulirRoutes   = require('./src/routes/formulir');
const spoApprovalRoutes= require('./src/routes/spoApproval');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads/documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Static: serve uploaded PDFs
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Ensure formulir upload dirs
['formulir/drafts','formulir/finals'].forEach(d => {
  const p = path.join(__dirname, 'public/uploads', d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Public
app.use('/api/auth',      authRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Protected
app.use('/api/documents', auth, documentRoutes);
app.use('/api/hospitals', auth, hospitalRoutes);
app.use('/api/divisions', auth, divisionRoutes);
app.use('/api/users',     auth, userRoutes);
app.use('/api/formulir',     auth, formulirRoutes);
app.use('/api/spo-approval', auth, spoApprovalRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
