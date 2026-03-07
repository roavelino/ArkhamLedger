import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { cwd } from 'node:process';
import { chromium } from 'playwright';

const root = cwd();
const port = 4173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const mockSupabaseSdk = `
globalThis.supabase = {
  createClient() {
    return {
      auth: {
        async getSession() {
          return { data: { session: null } };
        },
        async signInWithPassword() {
          return { error: { message: 'Invalid login credentials' } };
        },
        async signUp() {
          return { data: { session: null, user: null }, error: null };
        },
        async signOut() {
          return { error: null };
        }
      },
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          in() { return this; },
          is() { return this; },
          order() { return Promise.resolve({ data: [], error: null }); },
          upsert() { return { select() { return { single: async () => ({ data: {}, error: null }) }; } }; },
          update() { return { eq() { return { select() { return { single: async () => ({ data: {}, error: null }) }; } }; } }; },
          delete() { return { eq: async () => ({ error: null }) }; }
        };
      },
      storage: {
        from() {
          return {
            async createSignedUrl() { return { data: { signedUrl: 'http://127.0.0.1/mock-asset' }, error: null }; },
            async upload() { return { error: null }; }
          };
        }
      }
    };
  }
};
`;

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
        if (url.pathname === '/src/vendor/supabase.umd.js') {
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
          res.end(mockSupabaseSdk);
          return;
        }

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
              .replaceAll('__SUPABASE_URL__', 'https://example.supabase.co')
              .replaceAll('__SUPABASE_PUBLISHABLE_KEY__', 'public-anon-key')
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
  server = await createAppServer();
  browser = await chromium.launch({ headless: true });
});

test.after(async () => {
  await browser?.close();
  await new Promise((resolve, reject) => server?.close((error) => (error ? reject(error) : resolve())));
});

test('login page loads and signup tab toggles', async () => {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/login.html`);

  await page.waitForSelector('h1');
  assert.equal(await page.textContent('h1'), 'Arkham Ledger');

  await page.click('#signupTab');
  await page.waitForSelector('#signupForm:not(.hidden)');
  const submitText = await page.textContent('#signupForm button[type="submit"]');
  assert.equal(submitText, 'Criar conta');

  await page.close();
});

test('index page redirects unauthenticated users to login', async () => {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForURL(`http://127.0.0.1:${port}/login.html`);
  assert.match(page.url(), /\/login\.html$/);
  await page.close();
});
