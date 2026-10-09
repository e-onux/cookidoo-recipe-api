import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CookidooBrowser } from './browser.js';
import { CookidooService } from './cookidoo.js';
import { createApp } from './app.js';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8787);
const baseUrl = process.env.COOKIDOO_BASE_URL || 'https://cookidoo.de';
const locale = process.env.COOKIDOO_LOCALE || 'de-DE';
const headless = /^(1|true|yes)$/i.test(process.env.COOKIDOO_HEADLESS || '');

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT geçersiz.');
if (new URL(baseUrl).protocol !== 'https:') throw new Error('Cookidoo adresi HTTPS olmalı.');

const browser = new CookidooBrowser({
  baseUrl,
  locale,
  loginTimeoutMs: Number(process.env.LOGIN_TIMEOUT_MS || 300000),
  profileDir: path.join(projectDir, '.local/browser-profile'),
  headless,
});
const app = createApp(new CookidooService(browser), { token: process.env.API_TOKEN });
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Cookidoo API: http://127.0.0.1:${port}`);
  console.log('İlk tarif isteği veya POST /auth/login, gerektiğinde giriş tarayıcısını açar.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    server.close();
    await browser.close();
    process.exit(0);
  });
}
