const express = require('express');
const router = express.Router();
const crawlerController = require('../controllers/crawlerController');

// GET /crawler/selector
router.get('/selector', crawlerController.selectorExtraction);

// GET /crawler/js
router.get('/js', crawlerController.jsExtraction);

// POST /crawler/execute
router.post('/execute', crawlerController.executeExtraction);

// GET /crawler/markdown
router.get('/markdown', crawlerController.jsToMarkdownExtraction);

// GET /crawler/sitemap
router.get('/sitemap', crawlerController.getSitemapUrls);

module.exports = router;
