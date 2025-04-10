const { chromium } = require('playwright');

async function takeScreenshots(retryCount = 0) {
  const MAX_RETRIES = 3;
  console.log('Starting browser...');
  
  let browser;
  try {
    // Launch a new browser instance with system proxy
    browser = await chromium.launch({
      proxy: { server: 'system' }
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    
    const page = await context.newPage();
    
    // Add timeout handling
    page.setDefaultTimeout(120000); // 2 minutes timeout
    
    console.log(`Navigating to jiemian.com... (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    // Try to navigate to the website
    await page.goto('https://www.jiemian.com/', {
      waitUntil: 'domcontentloaded', // Less strict waiting condition
      timeout: 120000 // 2 minutes timeout
    });
    
    // Wait for some content to load
    console.log('Waiting for page content to load...');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(e => {
      console.log('Network did not fully idle, but continuing...');
    });
    
    console.log('Page loaded, finding elements with class "columns-lists"...');
    
    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(5000);
    
    // Find all elements with class "columns-lists"
    const elements = await page.locator('.columns-lists').all();
    console.log(`Found ${elements.length} elements with class "columns-lists"`);
    
    if (elements.length === 0) {
      console.log('No elements found with class "columns-lists", trying to get page content...');
      
      // Save the entire page for debugging
      await page.screenshot({ path: 'full-page.png' });
      console.log('Saved full page screenshot as full-page.png for debugging');
      
      // Get page HTML for debugging
      const html = await page.content();
      console.log('Page HTML structure sample:');
      console.log(html.substring(0, 500) + '...'); // Show first 500 chars
      
      return;
    }
    
    // Take screenshot of each element
    for (let i = 0; i < elements.length; i++) {
      console.log(`Taking screenshot of element ${i + 1}...`);
      
      // Take screenshot of the element
      await elements[i].screenshot({
        path: `screenshot-${i + 1}.png`,
        type: 'png'
      });
      
      console.log(`Saved screenshot-${i + 1}.png`);
    }
    
    console.log('All screenshots taken successfully!');
  } catch (error) {
    console.error(`Error on attempt ${retryCount + 1}:`, error);
    
    // Close the browser if it was created
    if (browser) {
      await browser.close();
      console.log('Browser closed after error.');
    }
    
    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
      return takeScreenshots(retryCount + 1);
    } else {
      console.log('Maximum retry attempts reached. Giving up.');
    }
    return;
  } finally {
    // Close the browser if it was created and not already closed
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

// Run the function
takeScreenshots();
