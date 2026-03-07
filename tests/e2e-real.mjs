import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { cwd, env } from 'node:process';
import { chromium } from 'playwright';

const root = cwd();
const port = 4174;

const email = env.E2E_LOGIN_EMAIL;
const password = env.E2E_LOGIN_PASSWORD;
const expectedRole = env.E2E_EXPECT_ROLE || 'dm';
const runtimeConfig = loadEnvConfig();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function loadEnvConfig() {
  const envFile = readFileSync('.env', 'utf8');
  const get = (key) => {
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  };

  return {
    url: env.SUPABASE_URL || get('SUPABASE_URL'),
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || get('SUPABASE_PUBLISHABLE_KEY')
  };
}

function resolvePath(urlPath) {
  const candidate = normalize(join(root, urlPath === '/' ? 'index.html' : urlPath.slice(1)));
  if (!candidate.startsWith(root)) {
    return null;
  }
  return candidate;
}

async function createAppServer() {
  return await new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${port}`);
        const filePath = resolvePath(url.pathname);
        if (!filePath) {
          res.writeHead(404).end('not found');
          return;
        }

        let content = await readFile(filePath);
        const extension = extname(filePath);
        const headers = { 'content-type': mimeTypes[extension] || 'application/octet-stream' };

        if (extension === '.html') {
          content = Buffer.from(
            String(content)
              .replaceAll('__SUPABASE_URL__', runtimeConfig.url)
              .replaceAll('__SUPABASE_PUBLISHABLE_KEY__', runtimeConfig.publishableKey)
          );
        }

        res.writeHead(200, headers);
        res.end(content);
      } catch (error) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(String(error?.stack || error));
      }
    });

    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

let server;
let browser;

test.before(async () => {
  assert.ok(runtimeConfig.url, 'Missing SUPABASE_URL in env or .env');
  assert.ok(runtimeConfig.publishableKey, 'Missing SUPABASE_PUBLISHABLE_KEY in env or .env');
  assert.ok(email, 'Missing E2E_LOGIN_EMAIL');
  assert.ok(password, 'Missing E2E_LOGIN_PASSWORD');

  server = await createAppServer();
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await new Promise((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
});

test('real DM account can log in and switch workspaces without crashing', { skip: expectedRole !== 'dm' }, async () => {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const badResponses = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/login.html`);
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', password);
  await page.click('#loginForm button[type="submit"]');

  await page.waitForURL(`http://127.0.0.1:${port}/index.html`, { timeout: 30000 });
  await page.waitForSelector('#statusTag');
  await page.waitForTimeout(2500);

  await page.click('#switchCampaignsBtn');
  await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Campanhas'));
  await page.waitForTimeout(2000);

  if (await page.locator('#openDmScreenBtn').count()) {
    await page.click('#openDmScreenBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Tela do Mestre'));
    await page.click('#backToCampaignBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Campanhas'));
  }

  if (await page.locator('#openMapsViewBtn').count()) {
    await page.click('#openMapsViewBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Mapas'));
    await page.click('#backToCampaignMapsBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Campanhas'));
  }

  await page.click('#switchSheetsBtn');
  await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Fichas'));
  await page.waitForTimeout(1500);

  const fatalConsoleErrors = consoleErrors.filter((text) => !text.includes('favicon'));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(fatalConsoleErrors, [], `Console errors: ${fatalConsoleErrors.join(' | ')} | Bad responses: ${badResponses.join(' | ')}`);

  await page.close();
});

test('real player account can log in and only see player-safe navigation', { skip: expectedRole !== 'player' }, async () => {
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const badResponses = [];

  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/login.html`);
  await page.fill('#loginEmail', email);
  await page.fill('#loginPassword', password);
  await page.click('#loginForm button[type="submit"]');

  await page.waitForURL(`http://127.0.0.1:${port}/index.html`, { timeout: 30000 });
  await page.waitForSelector('#statusTag');
  await page.waitForTimeout(2500);

  assert.match(await page.textContent('#statusTag'), /Perfil Player/);
  await page.click('#switchCampaignsBtn');
  await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Campanhas'));
  await page.waitForTimeout(2000);

  assert.equal(await page.locator('#openDmScreenBtn').count(), 0);
  if (await page.locator('#openMapsViewBtn').count()) {
    await page.click('#openMapsViewBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Mapas'));
    await page.click('#backToCampaignMapsBtn');
    await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Campanhas'));
  }

  await page.click('#switchSheetsBtn');
  await page.waitForFunction(() => document.querySelector('#statusTag')?.textContent?.includes('Fichas'));

  const fatalConsoleErrors = consoleErrors.filter((text) => !text.includes('favicon'));
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(fatalConsoleErrors, [], `Console errors: ${fatalConsoleErrors.join(' | ')} | Bad responses: ${badResponses.join(' | ')}`);

  await page.close();
});
