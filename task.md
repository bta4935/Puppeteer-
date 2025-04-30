Okay, I understand. You want the structure for the *filtered* response to nest the `api`, `docs`, `other`, etc., arrays inside a parent `urls` key, like this:

```json
// TARGET STRUCTURE (When filters=api,docs is applied)
{
    "baseUrl": "https://pptr.dev",
    "status": 200,
    "timestamp": 1678886400000,
    "urls": { // <--- NESTED HERE
        "api": [ /* URLs */ ],
        "docs": [ /* URLs */ ],
        "other": [ /* URLs */ ]
    }
}

// Structure when NO filters applied (remains the same)
{
    "baseUrl": "https://pptr.dev",
    "status": 200,
    "timestamp": 1678886405000,
    "allUrls": [ /* URLs */ ]
}
```

This requires a small adjustment in the `crawlerController.js` within the `getSitemapUrls` function where the response is assembled.

Here's the updated `getSitemapUrls` function in `crawlerController.js`:

```javascript
// controllers/crawlerController.js
const { normalizeUrl } = require('../services/urlUtils'); // Adjust path if needed
const { discoverSitemapUrls } = require('../services/sitemapService'); // Adjust path if needed
// ... other required services

// ... (other controller functions: selectorExtraction, jsExtraction, etc.)

// Handler for /crawler/sitemap endpoint
async function getSitemapUrls(req, res) {
  console.log(`[Controller] /sitemap request received. Query:`, req.query);
  try {
    const rawUrl = req.query.url;
    // Refined filter parsing: split, trim, remove empty, lowercase
    const filters = (req.query.filter || '')
                        .split(',')
                        .map(f => f.trim().toLowerCase())
                        .filter(Boolean);

    if (!rawUrl) {
      console.log('[Controller] Missing url parameter');
      return res.status(400).json({ error: 'Missing url parameter' });
    }
    console.log(`[Controller] URL: ${rawUrl}, Filters: [${filters.join(', ')}]`);

    const baseUrl = normalizeUrl(rawUrl);
    console.log(`[Controller] Normalized Base URL: ${baseUrl}`);

    // Service returns a flat array of unique URLs
    const urls = await discoverSitemapUrls(baseUrl);
    console.log(`[Controller] Discovered ${urls.length} unique URLs from service.`);

    // --- Assemble the final response payload ---
    const responsePayload = {
      baseUrl,
      status: 200,
      timestamp: Date.now()
    };

    if (filters.length > 0) {
      console.log('[Controller] Applying filters and grouping...');
      const matchedUrlSet = new Set();
      const groupedUrls = {}; // <--- Create an object to hold the filtered groups

      // Populate groups within groupedUrls
      filters.forEach(filter => {
        const pattern = `/${filter}/`;
        groupedUrls[filter] = urls.filter(url => { // Assign to groupedUrls[filter]
          try {
            const shouldInclude = new URL(url).pathname.toLowerCase().includes(pattern);
            if (shouldInclude) {
              matchedUrlSet.add(url);
            }
            return shouldInclude;
          } catch (e) { return false; }
        });
        console.log(`[Controller] Filter '${filter}': ${groupedUrls[filter].length} URLs matched.`);
      });

      // Add 'other' group to groupedUrls
      groupedUrls.other = urls.filter(url => !matchedUrlSet.has(url)); // Assign to groupedUrls.other
      console.log(`[Controller] Filter 'other': ${groupedUrls.other.length} URLs.`);

      // *** Add the entire groupedUrls object under the 'urls' key in the final response ***
      responsePayload.urls = groupedUrls;

    } else {
      // No filters - assign the flat array to 'allUrls'
      console.log('[Controller] No filters applied. Returning all URLs.');
      responsePayload.allUrls = urls;
    }
    // --- End response assembly ---

    res.json(responsePayload); // Send the final constructed payload

  } catch (err) {
    console.error(`[Controller] Error in getSitemapUrls: ${err.message}`, err.stack);
    res.status(500).json({
      error: 'Failed to discover/process sitemap',
      details: err.message
    });
  }
}

module.exports = {
  // ... other exports
  getSitemapUrls
};
```

**Change Explanation:**

1.  Inside the `if (filters.length > 0)` block:
    *   We still create the `groupedUrls` object.
    *   We populate `groupedUrls[filter]` and `groupedUrls.other` as before.
    *   **The Key Change:** Instead of adding keys directly to `responsePayload`, we now assign the entire `groupedUrls` object to `responsePayload.urls`.

Now, when filters are present, the final JSON sent by `res.json(responsePayload)` will have the desired nested structure with the filtered arrays inside the `urls` key. The case without filters remains unchanged.