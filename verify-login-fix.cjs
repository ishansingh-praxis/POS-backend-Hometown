const { chromium } = require('playwright');

const cases = [
  { label: 'admin', btn: /Head Office Admin punit\.singh/i, expectUrl: /\/admin$/ },
  { label: 'manager', btn: /Store Manager/i, expectUrl: /\/manager$/ },
  { label: 'cashier', btn: /^Cashier/i, expectUrl: /\/pos$/ },
];

(async () => {
  const browser = await chromium.launch();

  for (const c of cases) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoButtons = page.locator('div.mt-7 button');
    const match = page.locator('div.mt-7 button', { hasText: c.label === 'admin' ? 'punit.singh' : (c.label === 'manager' ? '700438' : '500066') });
    await match.first().click();
    await page.getByRole('button', { name: /Sign in as/i }).click();
    await page.waitForTimeout(1500);
    console.log(c.label, '-> URL:', page.url(), '| errors:', JSON.stringify(errors));
    await page.close();
  }

  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
