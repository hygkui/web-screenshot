const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const sizeOf = require('image-size');

async function createPdfFromImages() {
  console.log('Starting PDF creation process...');
  
  try {
    // Get all PNG files in the screenshots directory
    const screenshotsDir = path.join(__dirname, 'out', 'screenshots');
    const files = fs.readdirSync(screenshotsDir)
      .filter(file => file.startsWith('screenshot-') && file.endsWith('.png'))
      .sort((a, b) => {
        // Sort by number in the filename (screenshot-1.png, screenshot-2.png, etc.)
        const numA = parseInt(a.replace('screenshot-', '').replace('.png', ''));
        const numB = parseInt(b.replace('screenshot-', '').replace('.png', ''));
        return numA - numB;
      });
    
    if (files.length === 0) {
      console.log('No screenshot images found in the directory.');
      return;
    }
    
    console.log(`Found ${files.length} screenshot images to include in the PDF.`);
    
    // Create a new PDF document
    const pdfDir = path.join(__dirname, 'out', 'pdfs');
    const pdfPath = path.join(pdfDir, 'screenshots.pdf');
    const doc = new PDFDocument({ autoFirstPage: false });
    
    // Pipe the PDF output to a file
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Add each image as a separate page
    for (const file of files) {
      const imagePath = path.join(screenshotsDir, file);
      console.log(`Adding ${file} to PDF...`);
      
      // Get image dimensions
      const dimensions = sizeOf(imagePath);
      
      // Add a new page with the size of the image
      doc.addPage({ size: [dimensions.width, dimensions.height] });
      
      // Add the image to fill the page
      doc.image(imagePath, 0, 0, {
        width: dimensions.width,
        height: dimensions.height
      });
    }
    
    // Finalize the PDF
    doc.end();
    
    // Wait for the stream to finish
    stream.on('finish', () => {
      console.log(`PDF created successfully: ${pdfPath}`);
    });
    
    stream.on('error', (err) => {
      console.error('Error writing PDF:', err);
    });
  } catch (error) {
    console.error('Error creating PDF:', error);
  }
}

// Run the function
createPdfFromImages();
