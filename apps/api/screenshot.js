const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.setViewport({ width: 414, height: 896 });
  
  console.log('Navigating to http://localhost:8083');
  await page.goto('http://localhost:8083', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait a bit for React to render
  await new Promise(r => setTimeout(r, 5000));
  
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  if (currentUrl.includes('/auth')) {
    console.log('Logging in...');
    await page.type('input[placeholder="Email"]', 'tranhaduy204@gmail.com');
    await page.type('input[placeholder="Mật khẩu"]', 'password123');
    await page.click('div[role="button"]:has-text("Đăng nhập")');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  console.log('Final URL:', page.url());
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to screenshot.png');
  
  await browser.close();
}
run();
