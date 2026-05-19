const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { adminOnly } = require('../middleware/auth');

router.get('/',      adminOnly, ctrl.getAll);
router.get('/:id',   adminOnly, ctrl.getOne);
router.post('/',     adminOnly, ctrl.create);
router.put('/:id',   adminOnly, ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);

module.exports = router;
