const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const ctrl     = require('../controllers/spoApprovalController');
const { auth } = require('../middleware/auth');

// Ensure upload dirs exist
const filesDir     = path.join(__dirname, '../../public/uploads/spo/files');
const templatesDir = path.join(__dirname, '../../public/uploads/spo/templates');
if (!fs.existsSync(filesDir))     fs.mkdirSync(filesDir, { recursive: true });
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });

const makeStorage = (dest) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename:    (_req, file, cb)  => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
  else cb(new Error('Hanya PDF, DOC, DOCX'));
};

const uploadFile     = multer({ storage: makeStorage(filesDir),     fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadTemplate = multer({ storage: makeStorage(templatesDir), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Templates (must be before /:id)
router.get('/templates/list',   auth, ctrl.getTemplates);
router.post('/templates',       auth, uploadTemplate.single('file'), ctrl.createTemplate);
router.put('/templates/:id',    auth, ctrl.updateTemplate);
router.delete('/templates/:id', auth, ctrl.deleteTemplate);

// SPO approval (specific paths before /:id)
router.get('/',                 auth, ctrl.getAll);
router.get('/my',               auth, ctrl.getMySubmissions);
router.get('/for-review',       auth, ctrl.getForReview);
router.get('/release-queue',    auth, ctrl.getReleaseQueue);
router.get('/pending-count',    auth, ctrl.getPendingCount);
router.get('/kadiv-rs',         auth, ctrl.getKadivRsCandidates);
router.get('/:id',              auth, ctrl.getOne);
router.post('/',                auth, uploadFile.single('file'), ctrl.create);
router.post('/:id/approve',     auth, ctrl.approve);
router.post('/:id/reject',      auth, ctrl.reject);
router.post('/:id/resubmit',    auth, uploadFile.single('file'), ctrl.resubmit);
router.post('/:id/replace',     auth, uploadFile.single('file'), ctrl.replaceFile);
router.post('/:id/release',     auth, ctrl.release);

module.exports = router;
