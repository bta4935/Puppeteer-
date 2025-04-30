Okay, I understand. You want the response structure to change *only when filters are applied*.

*   **If filters ARE provided:** The response keys should be the filter names themselves, plus a key (let's call it `other` instead of `url` to avoid confusion with the base URL metadata) containing URLs that didn't match any filter.
*   **If filters ARE NOT provided:** The response should contain a single key (e.g., `allUrls`) holding the flat array of all unique URLs.

We need to adjust the `discoverSitemapUrls` return value and how the `crawlerController` formats the final response.

**1. `sitemapService.js` Update**

We'll create a new function `filterAndGroupUrls` specifically for the desired structure and modify `discoverSitemapUrls` to call it.

```javascript
// sitemapService.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { parseString } = require('xml2js');

// --- New: Function for the specific requested structure ---
/**
 * Filters URLs based on keywords and groups them, putting non-matching URLs into 'other'.
 * @param {string[]} urls - Array of URLs to filter and group.
 * @param {string[]} filters - Array of filter keywords.
 * @returns {object} - Object with keys for each filter and an 'other' key.
 */
function filterAndGroupUrls(urls, filters) {
  console.log(`[Sitemap] Grouping ${urls.length} URLs by filters: [${filters.join(', ')}]`);
  const result = {};
  const matchedUrlSet = new Set(); // Keep track of URLs that matched any filter

  // Initialize result keys for each filter
  filters.forEach(filter => {
    result[filter] = [];
  });

  // First pass: Populate filtered arrays and track matched URLs
  filters.forEach(filter => {
    const lowerFilter = filter.toLowerCase();
    const pattern = `/${lowerFilter}/`; // Or a more complex regex if needed

    urls.forEach(url => {
      // Only process if this URL hasn't already been matched by a *previous* filter in this run
      // (Optional: depends if you want a URL in multiple categories if it matches multiple filters)
      // If you want exclusivity, uncomment the check below. If a URL can be in multiple lists, keep it commented.
      // if (matchedUrlSet.has(url)) {
      //    return;
      // }

      try {
        const urlObj = new URL(url);
        if (urlObj.pathname.toLowerCase().includes(pattern)) {
          result[filter].push(url);
          matchedUrlSet.add(url); // Mark this URL as matched
        }
      } catch (urlParseError) {
        console.warn(`[Sitemap] Skipping invalid URL during grouping: ${url}. Error: ${urlParseError.message}`);
      }
    });
    console.log(`[Sitemap] Group '${filter}': Added ${result[filter].length} URLs.`);
  });

  // Second pass: Populate the 'other' array with non-matched URLs
  result.other = urls.filter(url => !matchedUrlSet.has(url));
  console.log(`[Sitemap] Group 'other': Added ${result.other.length} URLs.`);

  return result;
}
// --- End New ---


/**
 * Discovers sitemap URLs and returns them either as a flat list or grouped by filters.
 * @param {string} baseUrl - Normalized base URL.
 * @param {string[]} filters - Array of filter keywords (can be empty).
 * @returns {Promise<string[]|object>} - Array of URLs or the filter-grouped object.
 */
async function discoverSitemapUrls(baseUrl, filters = []) {
  console.log(`[Sitemap] Starting discovery for: ${baseUrl}${filters.length > 0 ? ` with filters: [${filters.join(', ')}]` : ''}`);
  let allFoundUrls = [];

  try {
    // --- Steps 1 & 2: Find URLs (robots.txt, common paths) ---
    // ...(Keep the existing logic using parseSitemap, parseSitemapIndex, parseUrlset helpers)...
    // ...(Ensure allFoundUrls is populated correctly)...

    // --- Step 3: Deduplicate URLs ---
    const uniqueUrls = [...new Set(allFoundUrls)];
    console.log(`[Sitemap] Total unique URLs found: ${uniqueUrls.length}`);

    // --- Step 4: Return based on filters ---
    if (filters.length > 0) {
      // Call the new grouping function if filters exist
      return filterAndGroupUrls(uniqueUrls, filters);
    } else {
      // Return the flat, unique array if no filters
      return uniqueUrls;
    }

  } catch (err) {
    console.error(`[Sitemap] Discovery failed for ${baseUrl}:`, err);
    throw new Error(`Sitemap discovery failed: ${err.message}`);
  }
}

// --- parseSitemap, parseUrlset, parseSitemapIndex helpers remain the same ---
// (Make sure they correctly return arrays of URL strings)

module.exports = { discoverSitemapUrls };
```

**Key Changes in Service:**

*   **`filterAndGroupUrls`:** This new function implements the exact logic you requested: create keys for filters, populate them, track matches, and put everything else in `other`.
*   **`discoverSitemapUrls`:** Now calls `filterAndGroupUrls` when `filters` are present. Otherwise, it returns the flat `uniqueUrls` array.

**2. `crawlerController.js` Update**

The controller needs to construct the final JSON differently based on whether filters were applied.

```javascript
// crawlerController.js
const { normalizeUrl } = require('../utils/urlUtils'); // Adjust path
const { discoverSitemapUrls } = require('../services/sitemapService'); // Adjust path

async function getSitemapUrls(req, res) {
  const rawUrl = req.query.url;
  const filterQuery = req.query.filter || '';
  const filters = filterQuery.split(',').map(f => f.trim()).filter(Boolean);

  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  console.log(`[Controller] Received URL: ${rawUrl}, Filters: [${filters.join(', ')}]`);

  try {
    const baseUrl = normalizeUrl(rawUrl);
    console.log(`[Controller] Normalized Base URL: ${baseUrl}`);

    // Get data from the service (will be array OR the grouped object)
    const sitemapData = await discoverSitemapUrls(baseUrl, filters);

    // --- Construct the final response ---
    let responsePayload = {
      // Add metadata common to both responses
      baseUrl: baseUrl, // Add the normalized base URL as metadata
      status: 200,
      timestamp: Date.now(),
    };

    if (filters.length > 0) {
      // If filters were used, sitemapData is the grouped object {api:[], docs:[], other:[]}
      // Merge this object directly into the response payload
      responsePayload = { ...responsePayload, ...sitemapData };
      console.log(`[Controller] Sending grouped response for ${baseUrl}`);
    } else {
      // If no filters, sitemapData is a flat array [...]
      // Add it under a specific key, e.g., 'allUrls'
      responsePayload.allUrls = sitemapData;
      console.log(`[Controller] Sending flat list response for ${baseUrl}`);
    }
    // --- End Response Construction ---

    res.json(responsePayload);

  } catch (err) {
    console.error(`[Controller] Error processing request: ${err.message}`, err.stack);
    res.status(500).json({
      error: 'Failed to process sitemap request',
      details: err.message
    });
  }
}

module.exports = { getSitemapUrls };
```

**Key Changes in Controller:**

*   It now checks `filters.length` *after* getting the `sitemapData`.
*   **If filters were applied:** It spreads (`...`) the `sitemapData` object (which contains keys like `api`, `docs`, `other`) into the `responsePayload`.
*   **If no filters were applied:** It adds the `sitemapData` array under the key `allUrls` in the `responsePayload`.
*   It consistently includes `baseUrl`, `status`, and `timestamp` metadata in both response types.

**Example Responses:**

*   **`.../sitemap?url=https://pptr.dev&filter=api,docs`**
    ```json
    {
        "baseUrl": "https://pptr.dev",
        "status": 200,
        "timestamp": 1678886400000,
        "api": [
            "https://pptr.dev/api/puppeteer.browser.close",
            "https://pptr.dev/api/puppeteer.page.click"
            // ... other URLs containing /api/
        ],
        "docs": [
            "https://pptr.dev/docs/installation",
            "https://pptr.dev/docs/configuration"
            // ... other URLs containing /docs/
        ],
        "other": [
            "https://pptr.dev/",
            "https://pptr.dev/changelog",
            "https://pptr.dev/community"
            // ... other URLs not matching /api/ or /docs/
        ]
    }
    ```
*   **`.../sitemap?url=https://pptr.dev`** (No filter)
    ```json
    {
        "baseUrl": "https://pptr.dev",
        "status": 200,
        "timestamp": 1678886405000,
        "allUrls": [
            "https://pptr.dev/",
            "https://pptr.dev/api/puppeteer.browser.close",
            "https://pptr.dev/docs/installation",
            "https://pptr.dev/changelog",
            "https://pptr.dev/community",
            "https://pptr.dev/api/puppeteer.page.click",
            "https://pptr.dev/docs/configuration"
            // ... all other unique URLs found
        ]
    }
    ```

This structure now precisely matches your requirement.