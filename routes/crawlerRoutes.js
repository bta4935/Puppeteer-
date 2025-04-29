const express = require('express');
const router = express.Router();
const { selectorExtraction, jsExtraction, executeExtraction } = require('../controllers/crawlerController');

// GET /crawler/selector
router.get('/selector', selectorExtraction);

// GET /crawler/js
router.get('/js', jsExtraction);

// POST /crawler/execute
router.post('/execute', executeExtraction);

module.exports = router;
