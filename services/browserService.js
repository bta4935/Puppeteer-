const puppeteer = require('puppeteer');

class BrowserError extends Error {
  constructor(message, originalError) {
    super(message);
    this.originalError = originalError;
    this.name = 'BrowserError';
  }
}

const defaultLaunchOptions = {
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
    (process.platform === 'win32' 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      : '/usr/bin/google-chrome-stable'),
  headless: "new",
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ],
  timeout: 30000
};

async function launchBrowser() {
  try {
    console.log('[BrowserService] Launching browser');
    return await puppeteer.launch(defaultLaunchOptions);
  } catch (error) {
    throw new BrowserError('Browser launch failed', error);
  }
}

async function withBrowser(fn, retries = 2) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const browser = await launchBrowser();
    try {
      return await fn(browser);
    } catch (error) {
      lastError = error;
      console.error(`[BrowserService] Attempt ${attempt} failed:`, error.message);
    } finally {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[BrowserService] Browser close error:', closeError);
      }
    }
  }
  
  throw new BrowserError(`All ${retries} retries failed`, lastError);
}

module.exports = {
  launchBrowser,
  withBrowser,
  BrowserError
};
