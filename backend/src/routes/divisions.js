const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/divisionController');
const { adminOnly } = require('../middleware/auth');

router.get('/',      ctrl.getAll);
router.get('/:id',   ctrl.getOne);
router.post('/',     adminOnly, ctrl.create);
router.put('/:id',   adminOnly, ctrl.update);
router.delete('/:id', adminOnly, ctrl.remove);

module.exports = router;
