const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  // For Render.com deployment
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
    '/usr/bin/google-chrome-stable'
};
