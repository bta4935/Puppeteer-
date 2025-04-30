const { normalizeUrl } = require('./urlUtils');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { parseString } = require('xml2js');

/**
 * Discovers sitemap URLs for a given domain
 * @param {string} baseUrl - Normalized base URL (https://domain.tld)
 * @returns {Promise<string[]>} Array of discovered URLs
 */
async function discoverSitemapUrls(baseUrl) {
  console.log(`[Sitemap] Starting discovery for: ${baseUrl}`);
  try {
    // 1. Check robots.txt
    const robotsUrl = `${baseUrl}/robots.txt`;
    console.log(`[Sitemap] Checking robots.txt at: ${robotsUrl}`);
    
    let robotsContent = '';
    try {
      const response = await fetch(robotsUrl);
      if (response.ok) {
        robotsContent = await response.text(); // Get the actual text content
        console.log(`[Sitemap] Successfully fetched robots.txt`);
      }
    } catch (err) {
      console.log(`[Sitemap] Could not fetch robots.txt: ${err.message}`);
    }

    const allFoundUrls = [];

    if (robotsContent) { // Only try to split if we have content
      const sitemapLine = robotsContent.split('\n')
        .find(line => line.toLowerCase().startsWith('sitemap:'));
      
      if (sitemapLine) {
        const sitemapPath = sitemapLine.split(':').slice(1).join(':').trim();
        console.log(`[Sitemap] Found sitemap reference: ${sitemapPath}`);
        
        try {
          const sitemapUrl = new URL(sitemapPath, baseUrl).href;
          console.log(`[Sitemap] Constructed sitemap URL: ${sitemapUrl}`);
          const urls = await parseSitemap(sitemapUrl);
          allFoundUrls.push(...urls);
        } catch (err) {
          console.error(`[Sitemap] Failed to construct URL from: ${sitemapPath}`, err);
        }
      }
    }
    
    // 2. Try common paths
    const commonPaths = ['/sitemap.xml', '/sitemap_index.xml'];
    for (const path of commonPaths) {
      const sitemapUrl = `${baseUrl}${path}`;
      console.log(`[Sitemap] Trying common path: ${sitemapUrl}`);
      
      try {
        const res = await fetch(sitemapUrl);
        if (res.ok) {
          const content = await res.text(); // Get text content
          const urls = await parseSitemap(sitemapUrl);
          allFoundUrls.push(...urls);
        }
      } catch (err) {
        console.log(`[Sitemap] Failed to fetch ${sitemapUrl}: ${err.message}`);
      }
    }
    
    if (allFoundUrls.length === 0) {
      throw new Error('No sitemap found');
    }
    
    // Return all unique URLs (deduplicated)
    return [...new Set(allFoundUrls)];
  } catch (err) {
    console.error(`[Sitemap] Discovery failed for ${baseUrl}:`, err);
    throw new Error(`Sitemap discovery failed: ${err.message}`);
  }
}

async function parseSitemap(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    const content = await res.text(); // Get text content
    
    if (url.endsWith('.xml')) {
      return new Promise((resolve, reject) => {
        parseString(content, (err, result) => {
          if (err) reject(err);
          const urls = result?.urlset?.url?.map(u => u.loc[0]) || [];
          resolve(urls);
        });
      });
    } 
    
    // TXT sitemap
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line);
  } catch (err) {
    throw new Error(`Failed to parse sitemap: ${err.message}`);
  }
}

module.exports = { discoverSitemapUrls };
