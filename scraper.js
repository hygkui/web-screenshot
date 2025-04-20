const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const URL = 'http://localhost:3000';
// const SELECTOR = '.columns-lists';
const SELECTOR = '.iframe-container';

// Function to take screenshots using Playwright
async function takeScreenshotsWithPlaywright(url, selector) {
  console.log('Attempting to use Playwright for screenshots...');

  let browser;
  try {
    // Launch browser without proxy
    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }, // Higher resolution viewport
      deviceScaleFactor: 2 // Set device scale factor to 2 for high-DPI screenshots
    });

    const page = await context.newPage();
    page.setDefaultTimeout(60000); // 1 minute timeout

    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for some content to load
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('Network did not fully idle, but continuing...');
    });

    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(5000);

    console.log(`Looking for elements with class "${selector}"...`);
    const elements = await page.locator(selector).all();
    console.log(`Found ${elements.length} elements with class "${selector}"`);

    if (elements.length === 0) {
      console.log('No elements found with Playwright, saving full page for debugging');
      await page.screenshot({
        path: 'out/screenshots/full-page.png',
        scale: 'css' // Use CSS pixels for accurate rendering
      });
      console.log('Full page screenshot saved as out/screenshots/full-page.png for debugging');
      return false;
    }

    const screenshotDir = 'out/screenshots';
    if (fs.existsSync(screenshotDir)) {
      fs.rmSync(screenshotDir, { recursive: true, force: true });
    }
    fs.mkdirSync(screenshotDir, { recursive: true });

    // Take screenshot of each element
    for (let i = 0; i < elements.length; i++) {
      console.log(`Taking screenshot of element ${i + 1}...`);

      // Get the bounding box of the element
      const boundingBox = await elements[i].boundingBox();

      // Ensure the element is visible in viewport
      await elements[i].scrollIntoViewIfNeeded();

      // Wait a bit for any animations or rendering to complete
      await page.waitForTimeout(500);

      // Take a screenshot with higher quality settings
      await elements[i].screenshot({
        path: `${screenshotDir}/screenshot-${i + 1}.png`,
        type: 'png',
        scale: 'device', // Use device pixels for higher resolution
        omitBackground: false // Include background for better quality
      });

      console.log(`Saved ${screenshotDir}/screenshot-${i + 1}.png (Size: ${boundingBox ? Math.round(boundingBox.width) + 'x' + Math.round(boundingBox.height) : 'unknown'})`);
    }

    console.log('All screenshots taken successfully with Playwright!');
    return true;
  } catch (error) {
    console.error('Error with Playwright approach:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

// Function to fetch and parse HTML using Axios and Cheerio
async function fetchAndParseWithAxios(url, selector) {
  console.log('Attempting to use Axios and Cheerio for HTML parsing...');

  try {
    // Set headers to mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    console.log(`Fetching HTML from ${url}...`);
    const response = await axios.get(url, {
      headers,
      timeout: 30000, // 30 seconds timeout
      proxy: false // Explicitly disable proxy
    });

    if (response.status !== 200) {
      console.log(`Failed to fetch HTML: Status code ${response.status}`);
      return false;
    }

    console.log(`HTML fetched successfully, parsing with Cheerio...`);
    const $ = cheerio.load(response.data);

    // Find elements with class "columns-lists"
    const columnsLists = $(selector);
    console.log(`Found ${columnsLists.length} elements with class "${selector}"`);

    if (columnsLists.length === 0) {
      console.log(`No elements found with class "${selector}"`);

      // Save the HTML for debugging
      fs.writeFileSync('page.html', response.data);
      console.log('Saved HTML to page.html for debugging');
      return false;
    }

    // Create a browser instance to render the HTML and take screenshots
    const browser = await chromium.launch();
    const context = await browser.newContext({
      deviceScaleFactor: 2, // Set device scale factor to 2 for high-DPI screenshots
      viewport: { width: 1920, height: 1080 } // Higher resolution viewport
    });
    const page = await context.newPage();

    try {
      // For each element, create a simple HTML page and take a screenshot
      for (let i = 0; i < columnsLists.length; i++) {
        const elementHtml = $(columnsLists[i]).html();
        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Element ${i + 1}</title>
            <style>
              body { margin: 0; padding: 0; }
              .columns-lists { padding: 10px; }
              /* Ensure text is rendered crisply */
              * {
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
              }
            </style>
          </head>
          <body>
            <div class="columns-lists">${elementHtml}</div>
          </body>
          </html>
        `;

        // Save the HTML to a temporary file
        const tempFile = path.join(__dirname, `temp-${i + 1}.html`);
        fs.writeFileSync(tempFile, fullHtml);

        // Navigate to the file and take a screenshot
        await page.goto(`file://${tempFile}`);

        // Wait for any fonts or resources to load
        await page.waitForTimeout(500);

        await page.screenshot({
          path: `out/screenshots/screenshot-${i + 1}.png`,
          type: 'png',
          scale: 'device' // Use device pixels for higher resolution
        });
        console.log(`Saved out/screenshots/screenshot-${i + 1}.png`);

        // Clean up the temporary file
        fs.unlinkSync(tempFile);
      }

      console.log('All screenshots taken successfully with Axios/Cheerio approach!');
      return true;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error with Axios/Cheerio approach:', error);
    return false;
  }
}

module.exports = { takeScreenshotsWithPlaywright, fetchAndParseWithAxios };
