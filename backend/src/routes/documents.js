const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const ctrl     = require('../controllers/documentController');

const { adminOnly } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../public/uploads/documents')),
  filename:    (_req, file, cb)  => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Hanya file PDF, DOC, atau DOCX yang diizinkan'));
  },
});

router.get('/',             ctrl.getAll);
router.get('/stats',        ctrl.getStats);
router.get('/pemilik-list', ctrl.getPemilikList);
router.get('/:id',          ctrl.getOne);
router.post('/',      adminOnly, upload.single('file'), ctrl.create);
router.put('/:id',    adminOnly, upload.single('file'), ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);

module.exports = router;
