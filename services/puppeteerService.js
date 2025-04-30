const puppeteer = require('puppeteer');

// Extract elements for given selectors from a page
async function extractElementsFromPage(url, selectors) {
    let browser;
    let elements = [];
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
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        for (let selector of selectors) {
            let results = [];
            try {
                results = await page.$$eval(selector, (els) => {
                    return els.map(el => {
                        const rect = el.getBoundingClientRect();
                        const attrs = Array.from(el.attributes).map(attr => ({ name: attr.name, value: attr.value }));
                        return {
                            text: el.innerText || '',
                            html: el.outerHTML || '',
                            attributes: attrs,
                            top: rect.top,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height
                        };
                    });
                });
            } catch (err) {
                results = [];
            }
            elements.push({ selector, results });
        }
        await browser.close();
        return elements;
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
}

// Extract full HTML and text after JS execution
async function extractJSRenderedPage(url) {
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
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 }); // Wait for JS to finish
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        const text = await page.evaluate(() => document.body.innerText);
        await browser.close();
        return { html, text };
    } catch (err) {
        if (browser) await browser.close();
        throw err;
    }
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

module.exports = { extractElementsFromPage, extractJSRenderedPage, executeExtractionFunction };
