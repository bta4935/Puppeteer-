const { extractElementsFromPage, extractJSRenderedPage, executeExtractionFunction } = require('../services/puppeteerService');
const { normalizeUrl } = require('../services/urlUtils');
const { discoverSitemapUrls } = require('../services/sitemapService');
const { convertTextToMarkdown } = require('../services/groqService');

// Handler for /crawler/selector endpoint
async function selectorExtraction(req, res) {
    const url = req.query.url;
    const selectors = req.query.selectors ? req.query.selectors.split(',') : [];
    if (!url || !selectors.length) {
        return res.status(400).json({ error: 'Missing url or selectors parameter' });
    }
    let status = 200;
    let elements = [];
    try {
        elements = await extractElementsFromPage(url, selectors);
    } catch (err) {
        status = 500;
        return res.status(500).json({ error: 'Failed to crawl or extract', details: err.message });
    }
    res.status(200).json({
        url,
        status,
        timestamp: Date.now(),
        elements
    });
}

// Handler for /crawler/js endpoint
async function jsExtraction(req, res) {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }
    let status = 200;
    let html = '', text = '';
    try {
        const result = await extractJSRenderedPage(url);
        html = result.html;
        text = result.text;
    } catch (err) {
        status = 500;
        return res.status(500).json({ error: 'Failed to crawl or extract', details: err.message });
    }
    res.status(200).json({
        url,
        status,
        timestamp: Date.now(),
        html,
        text
    });
}

// Handler for /crawler/execute endpoint
async function executeExtraction(req, res) {
    const url = req.query.url;
    const { fnName, args = [] } = req.body || {};
    const allowedFns = ['extractTitle', 'extractMeta'];
    if (!url || !fnName) {
        return res.status(400).json({ error: 'Missing url or fnName parameter' });
    }
    if (!allowedFns.includes(fnName)) {
        return res.status(400).json({ error: 'Unsupported function name. Allowed: extractTitle, extractMeta' });
    }
    let status = 200;
    let result;
    try {
        result = await executeExtractionFunction(url, fnName, args);
    } catch (err) {
        status = 500;
        return res.status(500).json({ error: 'Failed to execute extraction', details: err.message });
    }
    res.status(200).json({
        url,
        status,
        timestamp: Date.now(),
        result
    });
}

// Handler for /crawler/markdown endpoint
async function jsToMarkdownExtraction(req, res) {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }
    let status = 200;
    let markdown = '';
    try {
        const result = await extractJSRenderedPage(url);
        markdown = await convertTextToMarkdown(result.text);
    } catch (err) {
        status = 500;
        return res.status(500).json({ error: 'Failed to crawl, extract, or convert to markdown', details: err.message });
    }
    res.status(200).json({
        url,
        status,
        timestamp: Date.now(),
        markdown
    });
}

// Handler for /crawler/sitemap endpoint
async function getSitemapUrls(req, res) {
  try {
    const rawUrl = req.query.url;
    const filters = req.query.filter?.split(',').filter(Boolean) || [];

    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const baseUrl = normalizeUrl(rawUrl);
    const urls = await discoverSitemapUrls(baseUrl);

    // Build response structure
    const responsePayload = { 
      baseUrl,
      status: 200,
      timestamp: Date.now()
    };

    if (filters.length > 0) {
      const groupedUrls = {};
      const matchedUrls = new Set();
      
      // Add filtered groups
      filters.forEach(filter => {
        groupedUrls[filter] = urls.filter(url => {
          const matches = new URL(url).pathname.toLowerCase().includes(`/${filter.toLowerCase()}/`);
          if (matches) matchedUrls.add(url);
          return matches;
        });
      });
      
      // Add 'other' group
      groupedUrls.other = urls.filter(url => !matchedUrls.has(url));
      
      // Nest under 'urls' key
      responsePayload.urls = groupedUrls;
    } else {
      // No filters - return all URLs under 'urls' key
      responsePayload.urls = urls;
    }

    res.json(responsePayload);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to discover sitemap',
      details: err.message
    });
  }
}

module.exports = {
  selectorExtraction,
  jsExtraction,
  executeExtraction,
  jsToMarkdownExtraction,
  getSitemapUrls
};
