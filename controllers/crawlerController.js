const { withBrowser } = require('../services/browserService');
const { 
  extractElementsFromPage,
  extractJSRenderedPage,
  executeExtractionFunction,
  extractTextFromSelectors
} = require('../services/puppeteerService');
const { normalizeUrl } = require('../services/urlUtils');
const { discoverSitemapUrls } = require('../services/sitemapService');
const { convertTextToMarkdown } = require('../services/groqService');

// Unified error handler
const handleError = (res, error, context = '') => {
  console.error(`[Controller] Error${context}:`, error);
  const status = error.message.includes('Missing') ? 400 : 500;
  res.status(status).json({
    error: `Failed${context}`,
    details: error.message
  });
};

// Handler for /crawler/selector endpoint
async function selectorExtraction(req, res) {
  try {
    const { url, selectors = '' } = req.query;
    if (!url || !selectors) throw new Error('Missing url or selectors');
    
    const elements = await extractElementsFromPage(url, selectors.split(','));
    res.json({ 
      url,
      status: 200,
      timestamp: Date.now(),
      elements 
    });
  } catch (error) {
    handleError(res, error, ' during selector extraction');
  }
}

// Handler for /crawler/js endpoint
async function jsExtraction(req, res) {
  try {
    const { url } = req.query;
    if (!url) throw new Error('Missing url');
    
    const { html, text } = await extractJSRenderedPage(url);
    res.json({ 
      url,
      status: 200,
      timestamp: Date.now(),
      html,
      text 
    });
  } catch (error) {
    handleError(res, error, ' during JS extraction');
  }
}

// Handler for /crawler/execute endpoint
async function executeExtraction(req, res) {
  try {
    const url = req.query.url;
    const { fnName, args = [] } = req.body || {};
    const allowedFns = ['extractTitle', 'extractMeta'];
    if (!url || !fnName) throw new Error('Missing url or fnName');
    if (!allowedFns.includes(fnName)) throw new Error('Unsupported function name. Allowed: extractTitle, extractMeta');
    
    const result = await executeExtractionFunction(url, fnName, args);
    res.json({ 
      url,
      status: 200,
      timestamp: Date.now(),
      result 
    });
  } catch (error) {
    handleError(res, error, ' during execution');
  }
}

// Handler for /crawler/markdown endpoint
async function jsToMarkdownExtraction(req, res) {
  try {
    const url = req.query.url;
    const method = req.query.method;
    const selectors = req.query.selectors;

    if (!url) throw new Error('Missing url');
    if (!method || !['js', 'selector'].includes(method)) throw new Error("Invalid method - use 'js' or 'selector'");
    if (method === 'selector' && !selectors) throw new Error("Missing selectors parameter when method is 'selector'");

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
  } catch (error) {
    handleError(res, error, ' during markdown extraction');
  }
}

// Handler for /crawler/sitemap endpoint
async function getSitemapUrls(req, res) {
  try {
    const rawUrl = req.query.url;
    const filters = req.query.filter?.split(',').filter(Boolean) || [];

    if (!rawUrl) throw new Error('Missing url');

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
  } catch (error) {
    handleError(res, error, ' during sitemap discovery');
  }
}

module.exports = {
  selectorExtraction,
  jsExtraction,
  executeExtraction,
  jsToMarkdownExtraction,
  getSitemapUrls
};
