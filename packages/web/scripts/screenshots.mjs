// Screenshots of the running app in each theme and key UI state, for visual review.
import { chromium } from '@playwright/test';

const URL = 'http://localhost:4173/';
const OUT = process.argv[2];
const BROKEN = `{
  "tickets": [
    { "id": 4812, "customer": "Acme Corp", "priority": "high" },
    { "id": 4813, "customer": "Globex", "priority": "low"
      "status": "closed" }
  ]
}`;

const browser = await chromium.launch({ channel: 'msedge' });

async function page(theme, viewport = { width: 1440, height: 860 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((t) => localStorage.setItem('bracer-theme', t), theme);
  const p = await context.newPage();
  await p.goto(URL);
  await p.locator('.monaco-editor').first().waitFor();
  // Wait for the exact tokenizer so the chip shows real counts
  await p.waitForFunction(() => !document.querySelector('[data-testid="token-chip"]')?.textContent?.includes('~'));
  await p.waitForTimeout(800);
  return p;
}

for (const theme of ['indigo', 'amber', 'paper']) {
  const p = await page(theme);
  await p.screenshot({ path: `${OUT}/app-${theme}.png` });
  await p.context().close();
}

{
  const p = await page('indigo');
  await p.getByRole('tab', { name: 'Text' }).click();
  await p.getByLabel('Input text').fill(BROKEN);
  await p.getByRole('tab', { name: 'Code' }).first().click();
  await p.locator('[data-testid="input-error"]').waitFor();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/app-error.png` });

  await p.getByRole('button', { name: 'Repair' }).last().click();
  await p.getByRole('tab', { name: 'Tree' }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/app-tree.png` });

  await p.getByRole('tab', { name: 'Code' }).first().click();
  await p.getByRole('button', { name: /^Output:/ }).click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}/app-picker.png` });
  await p.context().close();
}

{
  const p = await page('indigo', { width: 390, height: 844 });
  await p.screenshot({ path: `${OUT}/app-mobile.png` });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('mobile horizontal overflow px:', overflow);
  await p.context().close();
}

await browser.close();
console.log('done');
