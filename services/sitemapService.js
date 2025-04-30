const { normalizeUrl } = require('./urlUtils');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { parseString } = require('xml2js');

/**
 * Discovers sitemap URLs for a given domain
 * @param {string} baseUrl - Normalized base URL (https://domain.tld)
 * @returns {Promise<string[]>} Array of discovered URLs
 */
async function discoverSitemapUrls(baseUrl) {
  try {
    // 1. Check robots.txt first
    const robotsTxt = await fetch(`${baseUrl}/robots.txt`).then(res => res.text());
    const sitemapFromRobots = robotsTxt
      .split('\n')
      .find(line => line.toLowerCase().startsWith('sitemap:'));
    
    if (sitemapFromRobots) {
      const sitemapUrl = sitemapFromRobots.split(':')[1].trim();
      return await parseSitemap(sitemapUrl);
    }

    // 2. Try common sitemap paths
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml'];
    for (const path of commonPaths) {
      try {
        const res = await fetch(`${baseUrl}${path}`);
        if (res.ok) return await parseSitemap(`${baseUrl}${path}`);
      } catch {} // Ignore failed attempts
    }

    throw new Error('No sitemap found');
  } catch (err) {
    throw new Error(`Sitemap discovery failed: ${err.message}`);
  }
}

async function parseSitemap(url) {
  const res = await fetch(url);
  const content = await res.text();
  
  // XML Sitemap
  if (url.endsWith('.xml')) {
    return new Promise((resolve, reject) => {
      parseString(content, (err, result) => {
        if (err) reject(err);
        const urls = result?.urlset?.url?.map(u => u.loc[0]) || [];
        resolve(urls);
      });
    });
  }
  
  // TXT Sitemap (one URL per line)
  return content.split('\n').filter(line => line.trim());
}

module.exports = { discoverSitemapUrls };
