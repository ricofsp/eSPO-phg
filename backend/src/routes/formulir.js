const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/formulirController');
const { auth } = require('../middleware/auth');

const makeStorage = (dest) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, `../../public/uploads/formulir/${dest}`)),
  filename:    (_req, file, cb)  => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`),
});

const draftFilter = (_req, file, cb) => {
  const ok = ['.pdf','.doc','.docx'].includes(path.extname(file.originalname).toLowerCase());
  cb(ok ? null : new Error('Hanya PDF/DOC/DOCX'), ok);
};

const uploadDraft = multer({ storage: makeStorage('drafts'), limits: { fileSize: 10*1024*1024 }, fileFilter: draftFilter });
const uploadFinals = multer({ storage: makeStorage('finals'), limits: { fileSize: 10*1024*1024 } });

// Public (authed)
router.get('/',                auth, ctrl.getAll);
router.get('/check-unique',    auth, ctrl.checkUnique);
router.get('/for-review',      auth, ctrl.getForReview);
router.get('/my-submissions',  auth, ctrl.getMySubmissions);
router.get('/kadiv-list',      auth, ctrl.getKadivList);
router.get('/:id',             auth, ctrl.getOne);
router.get('/:id/files',       auth, ctrl.getFiles);

// Mutations
router.post('/',                auth, uploadDraft.single('file'),    ctrl.create);
router.post('/:id/approve',     auth,                                ctrl.approve);
router.post('/:id/reject',      auth,                                ctrl.reject);
router.post('/:id/resubmit',    auth, uploadDraft.single('file'),    ctrl.resubmit);
router.post('/:id/replace-draft', auth, uploadDraft.single('file'),  ctrl.replaceDraft);
router.post('/:id/submit-design', auth,
  uploadFinals.fields(
    ['PHG','PEVH','PHBP','PHBW','PHPC','PHRA','PHSW'].map(c => ({ name: `file_${c}`, maxCount: 1 }))
  ),
  ctrl.submitDesign
);

module.exports = router;
