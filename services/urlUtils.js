const { URL } = require('url');

/**
 * Normalizes URLs to standard format (https://domain.tld)
 * @param {string} inputUrl - Raw URL input (e.g. 'n8n.io/path')
 * @returns {string} Normalized URL (e.g. 'https://n8n.io')
 * @throws {Error} For invalid URLs
 */
function normalizeUrl(inputUrl) {
  try {
    // Ensure string input
    if (typeof inputUrl !== 'string') throw new Error('URL must be a string');
    
    // Trim and add protocol if missing
    inputUrl = inputUrl.trim();
    if (!/^https?:\/\//i.test(inputUrl)) {
      inputUrl = inputUrl.startsWith('www.') 
        ? `https://${inputUrl}` 
        : `https://www.${inputUrl}`;
    }
    
    const urlObj = new URL(inputUrl);
    return `${urlObj.protocol}//${urlObj.hostname.replace(/^www\./i, '')}`;
  } catch (err) {
    throw new Error(`Invalid URL: ${inputUrl}. Reason: ${err.message}`);
  }
}

module.exports = { normalizeUrl };
