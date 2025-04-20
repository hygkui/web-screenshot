const URL = 'https://www.jiemian.com/';
// const SELECTOR = '.columns-lists';
const SELECTOR = '.iframe-container';
const { takeScreenshotsWithPlaywright } = require('./scraper.js');
const { createPdfFromImages } = require('./create-pdf.js');

const main = async () => {
  await takeScreenshotsWithPlaywright(URL, SELECTOR);
  await createPdfFromImages('out/screenshots');
};

main();