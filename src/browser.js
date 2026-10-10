import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { AppError } from './errors.js';

export class CookidooBrowser {
  constructor({
    baseUrl,
    locale,
    loginTimeoutMs = 300000,
    profileDir = path.resolve('.local/browser-profile'),
    headless = false,
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.locale = locale;
    this.loginTimeoutMs = loginTimeoutMs;
    this.profileDir = profileDir;
    this.headless = headless;
    this.context = null;
    this.page = null;
    this.queue = Promise.resolve();
  }

  get listUrl() {
    return `${this.baseUrl}/created-recipes/${this.locale}`;
  }

  async open() {
    if (this.context && this.page && !this.page.isClosed()) return this.page;
    if (this.context) await this.context.close().catch(() => {});
    this.context = null;
    this.page = null;
    await mkdir(this.profileDir, { recursive: true, mode: 0o700 });
    this.context = await chromium.launchPersistentContext(this.profileDir, {
      headless: this.headless,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: false,
    });
    this.page = this.context.pages()[0] ?? await this.context.newPage();
    this.page.setDefaultTimeout(10000);
    return this.page;
  }

  async ensureAuthenticated(page) {
    await page.goto(this.listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const listHeading = page.getByRole('heading', { name: /Meine Kreationen|Created recipes/i });
    if (await listHeading.isVisible().catch(() => false)) return;

    console.log('Cookidoo oturumu gerekli. Açılan tarayıcıda giriş yapın; API işlemi sonra devam edecek.');
    const deadline = Date.now() + this.loginTimeoutMs;
    while (Date.now() < deadline) {
      if (await listHeading.isVisible().catch(() => false)) return;
      // A login may return to the homepage rather than the requested list.
      if (!page.url().startsWith(this.listUrl) &&
          await page.locator('a[href="/profile/logout"]').count().catch(() => 0)) {
        await page.goto(this.listUrl, { waitUntil: 'domcontentloaded' });
      }
      await page.waitForTimeout(1000);
    }
    throw new AppError(401, 'LOGIN_REQUIRED',
      'Cookidoo girişi tamamlanmadı. Açık tarayıcıda giriş yapıp isteği tekrar deneyin.');
  }

  async run(action) {
    const previous = this.queue;
    let release;
    this.queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      const page = await this.open();
      await this.ensureAuthenticated(page);
      return await action(page);
    } finally {
      release();
    }
  }

  async close() {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }
}
