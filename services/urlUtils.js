const { URL } = require('url');

/**
 * Normalizes URLs to standard format (https://domain.tld)
 * @param {string} inputUrl - Raw URL input (e.g. 'n8n.io/path')
 * @returns {string} Normalized URL (e.g. 'https://n8n.io')
 * @throws {Error} For invalid URLs
 */
function normalizeUrl(inputUrl) {
  try {
    // Add https:// if missing
    if (!inputUrl.startsWith('http')) {
      inputUrl = inputUrl.startsWith('www.') 
        ? `https://${inputUrl}` 
        : `https://www.${inputUrl}`;
    }
    
    const urlObj = new URL(inputUrl);
    
    // Remove www. if present (optional - comment out if you prefer to keep it)
    let hostname = urlObj.hostname.replace(/^www\./i, '');
    
    return `${urlObj.protocol}//${hostname}`;
  } catch (err) {
    throw new Error(`Invalid URL: ${inputUrl}`);
  }
}

module.exports = { normalizeUrl };
