const express = require('express');
const router = express.Router();
const { 
  selectorExtraction, 
  jsExtraction, 
  executeExtraction,
  jsToMarkdownExtraction,
  getSitemapUrls
} = require('../controllers/crawlerController');

// GET /crawler/selector
router.get('/selector', selectorExtraction);

// GET /crawler/js
router.get('/js', jsExtraction);

// POST /crawler/execute
router.post('/execute', executeExtraction);

// GET /crawler/markdown
router.get('/markdown', jsToMarkdownExtraction);

// GET /crawler/sitemap
router.get('/sitemap', getSitemapUrls);

module.exports = router;
