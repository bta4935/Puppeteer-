const { 
  extractElementsFromPage,
  extractJSRenderedPage,
  executeExtractionFunction,
  extractTextFromSelectors
} = require('../services/puppeteerService');
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
  const method = req.query.method;
  const selectors = req.query.selectors;

  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  if (!method || !['js', 'selector'].includes(method)) {
    return res.status(400).json({ error: "Invalid method - use 'js' or 'selector'" });
  }
  if (method === 'selector' && !selectors) {
    return res.status(400).json({ error: "Missing selectors parameter when method is 'selector'" });
  }

  try {
    let sourceText = '';
    if (method === 'js') {
      const result = await extractJSRenderedPage(url);
      sourceText = result.text;
    } else {
      const selectorsArray = selectors.split(',').map(s => s.trim()).filter(Boolean);
      sourceText = await extractTextFromSelectors(url, selectorsArray);
    }

    const markdown = await convertTextToMarkdown(sourceText);
    
    res.json({
      url,
      method,
      status: 200,
      timestamp: Date.now(),
      markdown
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to generate markdown',
      details: err.message
    });
  }
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
      const matchedUrls = new Set();
      const urlGroups = [];
      
      // Create filtered groups
      filters.forEach(filter => {
        const filteredUrls = urls.filter(url => {
          const matches = new URL(url).pathname.toLowerCase().includes(`/${filter.toLowerCase()}/`);
          if (matches) matchedUrls.add(url);
          return matches;
        });
        
        urlGroups.push({
          page: filter,
          value: filteredUrls
        });
      });
      
      // Add 'other' group
      const otherUrls = urls.filter(url => !matchedUrls.has(url));
      urlGroups.push({
        page: 'other',
        value: otherUrls
      });
      
      responsePayload.urls = urlGroups;
    } else {
      // No filters - return all URLs
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
