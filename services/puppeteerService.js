const puppeteer = require('puppeteer');
const { withBrowser } = require('./browserService');

// Extract elements for given selectors from a page
async function extractElementsFromPage(url, selectors) {
  return await withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const elements = [];
    for (const selector of selectors) {
      try {
        const results = await page.$$eval(selector, els => 
          els.map(el => ({
            text: el.innerText?.trim() || '',
            html: el.outerHTML || ''
          }))
        );
        elements.push({ selector, results });
      } catch (error) {
        elements.push({ selector, results: [], error: error.message });
      }
    }
    return elements;
  });
}

// Extract full HTML and text after JS execution
async function extractJSRenderedPage(url) {
  return await withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText);
    
    return { html, text };
  });
}

// Execute a predefined extraction function on the page
async function executeExtractionFunction(url, fnName, args = []) {
    let browser;
    try {
        browser = await puppeteer.launch({
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // '--disable-dev-shm-usage', // Uncomment if you encounter memory issues
        // '--single-process'         // Uncomment if you encounter process issues
    ]
});
        const page = (await browser.pages())[0] || await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
        let result;
        if (fnName === 'extractTitle') {
            result = await page.evaluate(() => document.title);
        } else if (fnName === 'extractMeta') {
            result = await page.evaluate(() => Array.from(document.querySelectorAll('meta')).map(m => m.getAttribute('content')).filter(Boolean));
        } else {
            throw new Error('Unsupported function name');
        }
        await browser.close();
        return result;
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
}

async function extractTextFromSelectors(url, selectorsArray) {
  if (!selectorsArray?.length) throw new Error('No selectors provided');
  
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    return await page.$$eval(selectorsArray.join(', '), elements => 
      elements.map(el => el.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n\n')
    );
  } finally {
    await browser.close();
  }
}

module.exports = {
  extractElementsFromPage,
  extractJSRenderedPage,
  executeExtractionFunction,
  extractTextFromSelectors
};
