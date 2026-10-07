import { test, expect, type Page } from '@playwright/test';

const BROKEN_JSON = `{
  "tickets": [
    { "id": 4812, "customer": "Acme Corp" },
    { "id": 4813, "customer": "Globex"
      "status": "closed" }
  ]
}`;

/** Visible text of a Monaco editor (0 = input, 1 = output). */
async function editorText(page: Page, index: number): Promise<string> {
  const lines = page.locator('.monaco-editor .view-lines').nth(index);
  await expect(lines).toBeVisible();
  return (await lines.innerText()).replace(/ /g, ' ');
}

/** Replaces the input through the plain-text view, then returns to the code view. */
async function setInput(page: Page, text: string) {
  await page.getByRole('tab', { name: 'Text' }).click();
  await page.getByLabel('Input text').fill(text);
  await page.getByRole('tab', { name: 'Code' }).first().click();
}

async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
}

test.describe('workspace', () => {
  test('loads the sample and shows exact token counts', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('input-status')).toHaveText('Valid JSON');
    await expect(page.getByTestId('output-badge')).toHaveText('TOON');
    // Counts start as estimates (~) and settle once the o200k_base table loads
    await expect(page.getByTestId('token-chip')).toHaveText('JSON 146TOON 69−53%');
    await expect(page.getByTestId('output-tokens')).toHaveText('69 tokens · o200k_base');
    expect(await editorText(page, 1)).toContain('tickets[3]{id,customer,priority,status,summary}:');
  });

  test('shows the error inline and repairs it', async ({ page }) => {
    await open(page);
    await setInput(page, BROKEN_JSON);

    const error = page.getByTestId('input-error');
    await expect(error).toContainText("Expected ',' or '}' after property value");
    await expect(error).toContainText('line 5, col 7');
    await expect(page.getByTestId('input-status')).toHaveText('Invalid JSON');
    await expect(page.getByTestId('output-stale')).toContainText('last valid result');

    await error.getByRole('button', { name: 'Repair' }).click();
    await expect(page.getByTestId('input-status')).toHaveText('Valid JSON');
    await expect(page.getByTestId('input-error')).toHaveCount(0);
    await expect(page.getByText('Repaired JSON')).toBeVisible();
    expect(await editorText(page, 1)).toContain('status: closed');
  });

  test('switches output through the picker, with per-format token counts', async ({ page }) => {
    await open(page);
    await expect(page.getByTestId('output-tokens')).toContainText('o200k_base');
    await page.getByRole('button', { name: /^Output:/ }).click();

    const menu = page.getByRole('menu', { name: 'Output' });
    await expect(menu.getByRole('menuitemradio', { name: /TOON/ })).toContainText('fewest');
    await expect(menu.getByRole('menuitemradio', { name: /XML/ })).toContainText('185');

    await menu.getByRole('menuitemradio', { name: 'TypeScript types' }).click();
    await expect(page.getByTestId('output-badge')).toHaveText('TS');
    expect(await editorText(page, 1)).toContain('export interface');
  });

  test('opens a YAML file and converts it', async ({ page }) => {
    await open(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'team.yaml',
      mimeType: 'application/yaml',
      buffer: Buffer.from('team:\n  - name: Ada\n    role: lead\n  - name: Lin\n    role: dev\n'),
    });
    await expect(page.getByLabel('Input format')).toHaveValue('yaml');
    await expect(page.getByTestId('input-status')).toHaveText('Valid YAML');
    expect(await editorText(page, 1)).toContain('team[2]{name,role}:');
    // JSON-only actions are disabled for other formats
    await expect(page.getByRole('button', { name: 'Format' })).toBeDisabled();
  });

  test('preview shows the records as a table', async ({ page }) => {
    await open(page);
    await page.getByRole('tab', { name: 'Preview' }).click();
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader')).toHaveText(['id', 'customer', 'priority', 'status', 'summary']);
    await expect(table.getByRole('row')).toHaveCount(4);
  });
});

test.describe('tree view', () => {
  test('renames a key, and undo restores it', async ({ page }) => {
    await open(page);
    await page.getByRole('tab', { name: 'Tree' }).click();

    const row = page.locator('.group', { hasText: 'customer' }).first();
    await row.hover();
    await row.getByRole('button', { name: 'Rename key' }).click();
    const keyInput = page.getByLabel('Key name');
    await keyInput.fill('client');
    await keyInput.press('Enter');

    await page.getByRole('tab', { name: 'Text' }).click();
    await expect(page.getByLabel('Input text')).toHaveValue(/"client": "Acme Corp"/);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByLabel('Input text')).toHaveValue(/"customer": "Acme Corp"/);
  });

  test('offers to convert non-JSON input', async ({ page }) => {
    await open(page);
    await page.getByLabel('Input format').selectOption('yaml');
    await setInput(page, 'name: Ada\nskills: [math, poetry]\n');
    await page.getByRole('tab', { name: 'Tree' }).click();

    await expect(page.getByText('Tree and form views edit JSON')).toBeVisible();
    await page.getByRole('button', { name: 'Convert to JSON' }).click();
    await expect(page.getByLabel('Input format')).toHaveValue('json');
    await expect(page.getByLabel('Filter keys and values')).toBeVisible();
  });
});

test.describe('output actions', () => {
  test('copies the output to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await page.getByRole('button', { name: 'Copy output' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.startsWith('tickets[3]{id,customer,priority,status,summary}:')).toBe(true);
  });

  test('downloads with the extension of the output format', async ({ page }) => {
    await open(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download output' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('output.toon');
  });
});

test.describe('themes', () => {
  test('cycles Indigo → Amber → Paper and remembers the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await open(page);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'indigo');

    await page.getByRole('button', { name: /^Theme: Indigo/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'amber');
    await page.getByRole('button', { name: /^Theme: Amber/ }).click();
    await expect(html).toHaveAttribute('data-theme', 'paper');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'paper');
  });

  test('follows a light system preference on first visit', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'paper');
  });
});

test.describe('privacy', () => {
  test('makes no requests to any other origin', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const external: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.protocol.startsWith('http') && url.origin !== origin) external.push(req.url());
    });

    await open(page);
    await expect(page.getByTestId('output-tokens')).toContainText('o200k_base');
    // Exercise the lazy-loaded parts too: every view, diff editor and generators
    await page.getByRole('tab', { name: 'Diff' }).click();
    await expect(page.locator('.monaco-diff-editor')).toBeVisible();
    await page.getByRole('tab', { name: 'Tree' }).click();
    await page.getByRole('button', { name: /^Output:/ }).click();
    await page.getByRole('menuitemradio', { name: 'Zod schema' }).click();

    expect(external).toEqual([]);
  });
});

test.describe('stability', () => {
  test('every view, output and theme runs without console errors', async ({ page }) => {
    const errors: string[] = [];
    let step = 'load';
    page.on('pageerror', (err) => errors.push(`[${step}] ${err.stack ?? err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[${step}] ${msg.text()}`);
    });

    await open(page);
    await expect(page.getByTestId('output-tokens')).toContainText('o200k_base');

    for (const tab of ['Tree', 'Form', 'Text', 'Code']) {
      step = `input ${tab}`;
      await page.getByRole('tab', { name: tab }).first().click();
    }
    for (const tab of ['Preview', 'Diff', 'Code']) {
      step = `output ${tab}`;
      await page.getByRole('tab', { name: tab }).last().click();
    }

    const outputs = ['JSON', 'TOON', 'YAML', 'XML', 'CSV', 'TOML', 'TypeScript types', 'Zod schema', 'JSON Schema', 'Markdown table'];
    for (const name of outputs) {
      step = `to ${name}`;
      await page.getByRole('button', { name: /^Output:/ }).click();
      // Format items also carry a token count ("JSON 146", "TOON fewest 69"); match the name exactly
      await page.getByRole('menuitemradio', { name: new RegExp(`^${name}( fewest)?( [\\d,]+)?$`) }).click();
      await expect(page.getByTestId('output-badge')).not.toBeEmpty();
      expect(await editorText(page, 1)).not.toBe('');
    }

    for (let i = 0; i < 3; i++) {
      step = `theme ${i}`;
      await page.getByRole('button', { name: /^Theme:/ }).click();
    }

    expect(errors).toEqual([]);
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('fits a phone screen without horizontal scrolling', async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
    await expect(page.getByRole('button', { name: 'Copy output' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download output' })).toBeVisible();
  });
});
