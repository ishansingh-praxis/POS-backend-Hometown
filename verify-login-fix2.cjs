const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  // Manager demo: username 700438
  await page.locator('div.mt-7 button', { hasText: '700438' }).first().click();
  console.log('username field value:', await page.locator('input[autocomplete="username"]').inputValue());
  console.log('password field value:', await page.locator('input[autocomplete="current-password"]').inputValue());
  await page.getByRole('button', { name: /Sign in as/i }).click();
  await page.waitForTimeout(1500);
  console.log('Manager -> URL:', page.url());
  const errText = await page.locator('.text-destructive').allTextContents();
  console.log('Error banner:', JSON.stringify(errText));

  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
