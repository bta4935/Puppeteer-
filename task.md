Okay, that's a great addition! Making the markdown endpoint more flexible by allowing selector-based extraction is a good idea. Using a `method` query parameter to switch between the two approaches ('js' for full page, 'selector' for specific elements) is a clean way to handle this.

Here's the plan and the necessary code changes:

**Plan:**

1.  **Modify Route:** The route `GET /crawler/markdown` remains the same.
2.  **Update Controller (`jsToMarkdownExtraction`):**
    *   Add query parameters: `method` (required, either 'js' or 'selector') and `selectors` (required *only* if `method=selector`).
    *   Perform input validation based on the `method`.
    *   Conditionally call the appropriate service function to get the source text:
        *   If `method=js`: Call `extractJSRenderedPage(url)` to get full page text.
        *   If `method=selector`: Call a *new* Puppeteer service function (e.g., `extractTextFromSelectors`) to get combined text from selected elements.
    *   Pass the extracted text to `convertTextToMarkdown`.
    *   Return the resulting markdown.
3.  **Update Puppeteer Service (`puppeteerService.js`):**
    *   Create the new function `extractTextFromSelectors(url, selectorsArray)`:
        *   Launches Puppeteer.
        *   Navigates to the URL.
        *   Uses `page.$$eval()` to select elements matching the provided selectors.
        *   Extracts the `textContent` from each matched element.
        *   Joins the text content (e.g., with double newlines `\n\n`) into a single string.
        *   Returns the combined string.
4.  **Groq Service (`groqService.js`):** No changes needed, `convertTextToMarkdown` stays the same.

**Code Implementation:**

**1. `puppeteerService.js` (Add new function)**

```javascript
// services/puppeteerService.js
const puppeteer = require('puppeteer-core'); // Or 'puppeteer' if installed locally

// --- Reusable Browser Launch Logic (Example - Adapt to your setup) ---
// Consider centralizing browser launch/close if used in multiple functions
async function getBrowser() {
  // Options suitable for Render/Docker deployment
  const launchOptions = {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable', // Render path or local fallback
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Crucial for Render/limited memory environments
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      // '--single-process', // Uncomment if memory issues persist, but can cause instability
      '--disable-gpu'
    ]
  };
  console.log('[Puppeteer] Launching browser with options:', launchOptions.args);
  return await puppeteer.launch(launchOptions);
}
// --- End Reusable Logic ---


// Existing function (ensure it returns { html, text })
async function extractJSRenderedPage(url) {
  let browser = null;
  try {
    console.log(`[Puppeteer] Extracting JS-rendered page for: ${url}`);
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Wait for network activity to cease

    // Option 1: Get rendered HTML and extract text from body
    const html = await page.content(); // Full HTML after JS execution
    const text = await page.evaluate(() => document.body.innerText); // Text content of the body

    console.log(`[Puppeteer] Successfully extracted JS-rendered page for: ${url}`);
    return { html, text };

  } catch (error) {
    console.error(`[Puppeteer] Error extracting JS-rendered page for ${url}:`, error);
    throw new Error(`Puppeteer failed to extract JS-rendered page: ${error.message}`);
  } finally {
    if (browser) {
      console.log('[Puppeteer] Closing browser.');
      await browser.close();
    }
  }
}

// Existing function (ensure it returns structured element data)
async function extractElementsFromPage(url, selectors) {
   // ... (keep your existing implementation) ...
   // Should return something like: [{ selector: 'h1', text: '...', html: '...' }, ...]
}

// Existing function
async function executeExtractionFunction(url, fnName, args) {
    // ... (keep your existing implementation) ...
}


// *** NEW FUNCTION ***
/**
 * Extracts and combines text content from elements matching specified selectors.
 * @param {string} url - The URL to crawl.
 * @param {string[]} selectorsArray - An array of CSS selectors.
 * @returns {Promise<string>} - A promise resolving to the combined text content.
 */
async function extractTextFromSelectors(url, selectorsArray) {
  if (!selectorsArray || selectorsArray.length === 0) {
      throw new Error("No selectors provided for extraction.");
  }

  let browser = null;
  try {
    const selectorString = selectorsArray.join(', '); // Combine selectors for $$eval
    console.log(`[Puppeteer] Extracting text from selectors [${selectorString}] for: ${url}`);
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Use page.$$eval to select all elements matching ANY selector and extract text
    const combinedText = await page.$$eval(selectorString, (elements) => {
        // This code runs in the browser context
        // Map each found element to its text content, trim whitespace,
        // and join with double newlines for better markdown paragraph separation.
        return elements.map(el => el.textContent?.trim() || '') // Use textContent, trim, handle null
                       .filter(text => text) // Remove empty strings
                       .join('\n\n'); // Join with double newline
    });

    console.log(`[Puppeteer] Successfully extracted text from selectors for: ${url}. Length: ${combinedText.length}`);
    return combinedText;

  } catch (error) {
    console.error(`[Puppeteer] Error extracting text from selectors for ${url}:`, error);
    throw new Error(`Puppeteer failed to extract text from selectors: ${error.message}`);
  } finally {
    if (browser) {
      console.log('[Puppeteer] Closing browser.');
      await browser.close();
    }
  }
}
// *** END NEW FUNCTION ***


module.exports = {
  extractElementsFromPage,
  extractJSRenderedPage,
  executeExtractionFunction,
  extractTextFromSelectors // <-- Export the new function
};
```

**2. `crawlerController.js` (Update `jsToMarkdownExtraction`)**

```javascript
// controllers/crawlerController.js
const { normalizeUrl } = require('../services/urlUtils');
const { discoverSitemapUrls } = require('../services/sitemapService');
const { convertTextToMarkdown } = require('../services/groqService');
// Import the new function from puppeteerService
const {
    extractElementsFromPage,
    extractJSRenderedPage,
    executeExtractionFunction,
    extractTextFromSelectors // <-- Import new function
} = require('../services/puppeteerService');


// ... (selectorExtraction, jsExtraction, executeExtraction remain the same) ...


// *** UPDATED FUNCTION ***
// Handler for /crawler/markdown endpoint
async function jsToMarkdownExtraction(req, res) {
    const url = req.query.url;
    const method = req.query.method; // 'js' or 'selector'
    const selectorsQuery = req.query.selectors; // Comma-separated string

    console.log(`[Controller] /markdown request. URL: ${url}, Method: ${method}, Selectors: ${selectorsQuery}`);

    // --- Input Validation ---
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }
    if (!method || (method !== 'js' && method !== 'selector')) {
        return res.status(400).json({ error: "Missing or invalid 'method' parameter. Use 'js' or 'selector'." });
    }

    let selectorsArray = [];
    if (method === 'selector') {
        if (!selectorsQuery) {
            return res.status(400).json({ error: "Missing 'selectors' parameter when method is 'selector'." });
        }
        selectorsArray = selectorsQuery.split(',')
                                       .map(s => s.trim())
                                       .filter(Boolean);
        if (selectorsArray.length === 0) {
             return res.status(400).json({ error: "Parameter 'selectors' cannot be empty when method is 'selector'." });
        }
        console.log(`[Controller] Parsed selectors:`, selectorsArray);
    }
    // --- End Validation ---

    let sourceText = '';
    let markdown = '';
    try {
        // --- Conditional Text Extraction ---
        if (method === 'js') {
            console.log(`[Controller] Using 'js' method. Extracting full page text...`);
            const result = await extractJSRenderedPage(url);
            sourceText = result.text; // Get text from the result object
            console.log(`[Controller] Extracted full page text. Length: ${sourceText.length}`);
        } else { // method === 'selector'
            console.log(`[Controller] Using 'selector' method. Extracting text from selectors...`);
            sourceText = await extractTextFromSelectors(url, selectorsArray);
            console.log(`[Controller] Extracted text from selectors. Length: ${sourceText.length}`);
        }
        // --- End Text Extraction ---

        // --- Markdown Conversion ---
        if (sourceText && sourceText.trim()) { // Only convert if there's actual text
            console.log(`[Controller] Converting extracted text to markdown...`);
            markdown = await convertTextToMarkdown(sourceText);
            console.log(`[Controller] Markdown conversion complete.`);
        } else {
            console.log(`[Controller] No source text extracted, skipping markdown conversion.`);
            markdown = ""; // Return empty markdown if no text was found
        }
        // --- End Conversion ---

    } catch (err) {
        console.error(`[Controller] Error in markdown endpoint processing: ${err.message}`, err.stack);
        // Distinguish between extraction and conversion errors if needed, otherwise generic
        return res.status(500).json({
            error: `Failed during markdown generation (method: ${method})`,
            details: err.message
        });
    }

    // --- Send Response ---
    res.status(200).json({
        url,
        methodUsed: method, // Include method used in response for clarity
        ...(selectorsArray.length > 0 && { selectorsUsed: selectorsArray }), // Conditionally include selectors
        status: 200,
        timestamp: Date.now(),
        markdown // Send the generated markdown (or empty string)
    });
}
// *** END UPDATED FUNCTION ***


// Handler for /crawler/sitemap endpoint
// ... (getSitemapUrls function remains the same as the last version) ...

module.exports = {
  selectorExtraction,
  jsExtraction,
  executeExtraction,
  jsToMarkdownExtraction, // Keep using the updated function name
  getSitemapUrls
};
```

**3. `crawlerRoutes.js` (No changes needed)**

The route definition stays the same:

```javascript
// crawlerRoutes.js
const express = require('express');
const router = express.Router();
const crawlerController = require('../controllers/crawlerController');

// ... other routes ...

// GET /crawler/markdown?url=...&method=...[&selectors=...]
router.get('/markdown', crawlerController.jsToMarkdownExtraction);

// ... sitemap route ...

module.exports = router;
```

**How to Use:**

*   **Full Page Text to Markdown:**
    `GET /crawler/markdown?url=https://example.com&method=js`
*   **Selector Text to Markdown:**
    `GET /crawler/markdown?url=https://example.com&method=selector&selectors=h1,p.important,.article-content`

This implementation provides the flexibility you requested, allowing users to choose their preferred text extraction method before converting to Markdown. Remember to handle potential errors from Puppeteer (page load failures, timeouts, elements not found) and the Groq API (rate limits, errors).