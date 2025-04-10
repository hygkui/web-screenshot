const { chromium } = require('playwright');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Function to take screenshots using Playwright
async function takeScreenshotsWithPlaywright() {
  console.log('Attempting to use Playwright for screenshots...');
  
  let browser;
  try {
    // Launch browser without proxy
    browser = await chromium.launch({
      headless: true
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    page.setDefaultTimeout(60000); // 1 minute timeout
    
    console.log('Navigating to jiemian.com...');
    await page.goto('https://www.jiemian.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // Wait for some content to load
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('Network did not fully idle, but continuing...');
    });
    
    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(5000);
    
    console.log('Looking for elements with class "columns-lists"...');
    const elements = await page.locator('.columns-lists').all();
    console.log(`Found ${elements.length} elements with class "columns-lists"`);
    
    if (elements.length === 0) {
      console.log('No elements found with Playwright, saving full page for debugging');
      await page.screenshot({ path: 'out/screenshots/full-page.png' });
      console.log('Full page screenshot saved as out/screenshots/full-page.png for debugging');
      return false;
    }
    
    // Take screenshot of each element
    for (let i = 0; i < elements.length; i++) {
      console.log(`Taking screenshot of element ${i + 1}...`);
      await elements[i].screenshot({
        path: `out/screenshots/screenshot-${i + 1}.png`,
        type: 'png'
      });
      console.log(`Saved out/screenshots/screenshot-${i + 1}.png`);
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
async function fetchAndParseWithAxios() {
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
    
    console.log('Fetching HTML from jiemian.com...');
    const response = await axios.get('https://www.jiemian.com/', {
      headers,
      timeout: 30000, // 30 seconds timeout
      proxy: false // Explicitly disable proxy
    });
    
    if (response.status !== 200) {
      console.log(`Failed to fetch HTML: Status code ${response.status}`);
      return false;
    }
    
    console.log('HTML fetched successfully, parsing with Cheerio...');
    const $ = cheerio.load(response.data);
    
    // Find elements with class "columns-lists"
    const columnsLists = $('.columns-lists');
    console.log(`Found ${columnsLists.length} elements with class "columns-lists"`);
    
    if (columnsLists.length === 0) {
      console.log('No elements found with class "columns-lists"');
      
      // Save the HTML for debugging
      fs.writeFileSync('page.html', response.data);
      console.log('Saved HTML to page.html for debugging');
      return false;
    }
    
    // Create a browser instance to render the HTML and take screenshots
    const browser = await chromium.launch();
    const context = await browser.newContext();
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
            <title>Element ${i + 1}</title>
            <style>
              body { margin: 0; padding: 0; }
              .columns-lists { padding: 10px; }
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
        await page.screenshot({ path: `out/screenshots/screenshot-${i + 1}.png`, type: 'png' });
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

// Main function to try both approaches
async function main() {
  try {
    // First try with Playwright
    const playwrightSuccess = await takeScreenshotsWithPlaywright();
    
    // If Playwright fails, try with Axios/Cheerio
    if (!playwrightSuccess) {
      console.log('Playwright approach failed, trying Axios/Cheerio approach...');
      const axiosSuccess = await fetchAndParseWithAxios();
      
      if (!axiosSuccess) {
        console.log('Both approaches failed. Unable to take screenshots.');
      }
    }
    
    console.log('Script execution completed.');
  } catch (error) {
    console.error('Unexpected error in main function:', error);
  }
}

// Run the main function
main();
