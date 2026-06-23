const { chromium } = require('playwright');
const log = (...a) => console.log(...a);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const context = page.context();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  let checkoutResp = null;
  page.on('response', async (res) => {
    if (res.url().includes('/pos-checkout/checkout')) {
      checkoutResp = { status: res.status(), body: await res.json().catch(() => null) };
    }
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.locator('input').first().fill('500066');
  await page.locator('input[type="password"]').fill('cashier@123');
  await page.getByRole('button', { name: /Sign in as/i }).click();
  await page.waitForURL('**/pos', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/pw-verify3/01-pos-loaded.png', fullPage: true });

  const enabledCount = await page.locator('button:not([disabled])').filter({ hasText: '₹' }).count();
  const disabledCount = await page.locator('button[disabled]').filter({ hasText: '₹' }).count();
  log('enabled product cards:', enabledCount, '| disabled:', disabledCount);

  const enabledBtn = page.locator('button:not([disabled])').filter({ hasText: '₹' }).first();
  const name = await enabledBtn.textContent();
  await enabledBtn.click();
  log('clicked product:', name?.slice(0, 60));
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/pw-verify3/02-cart.png', fullPage: true });

  await page.locator('input[placeholder="Enter mobile number"]').fill('9999999999');
  await page.locator('button:has-text("UPI")').last().click();
  await page.getByRole('button', { name: /Generate UPI QR/i }).click();
  await page.waitForTimeout(800);

  const amountCollectedRow = page.locator('text=Amount collected').locator('xpath=..');
  await amountCollectedRow.getByRole('button', { name: 'Full', exact: true }).click();
  await page.waitForTimeout(300);
  const paidVal = await amountCollectedRow.locator('input[type="number"]').inputValue();
  log('paid value after Full click:', paidVal);

  const [popup] = await Promise.all([
    context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
    page.getByRole('button', { name: /Collect.*Print Invoice/i }).click(),
  ]);
  await page.waitForTimeout(2000);
  log('checkout response:', JSON.stringify(checkoutResp)?.slice(0, 400));
  await page.screenshot({ path: '/tmp/pw-verify3/03-after-checkout.png', fullPage: true });
  if (popup) {
    await popup.waitForLoadState('load').catch(() => {});
    await popup.screenshot({ path: '/tmp/pw-verify3/04-invoice-popup.png', fullPage: true }).catch(() => {});
    log('popup title:', await popup.title().catch(() => ''));
  }
  log('popup opened:', !!popup);
  log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));

  await browser.close();
})().catch((e) => { console.error('SCRIPT_FAILED', e); process.exit(1); });
