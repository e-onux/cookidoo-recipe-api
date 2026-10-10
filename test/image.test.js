import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeImage, MAX_IMAGE_BYTES, uploadRecipeImage } from '../src/image.js';
import { CookidooService } from '../src/cookidoo.js';

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
test('PNG ve JPEG başlıklarını doğrular ve doğru dosya türünü kullanır', () => {
  assert.deepEqual(decodeImage({ imageBase64: png.toString('base64'), mimeType: 'image/png' }).buffer, png);
  assert.equal(decodeImage({ imageBase64: Buffer.from([255, 216, 255, 224]).toString('base64'), mimeType: 'image/jpeg' }).name, 'recipe.jpg');
});
test('bozuk base64, yanlış tür, boş içerik ve büyük dosyayı reddeder', () => {
  for (const imageBase64 of ['!!!', '', Buffer.from('not an image').toString('base64'), png.toString('base64')]) {
    assert.throws(() => decodeImage({ imageBase64, mimeType: 'image/jpeg' }), error => error.status === 400);
  }
  assert.throws(() => decodeImage({ imageBase64: Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64'), mimeType: 'image/png' }), error => error.code === 'INVALID_IMAGE_SIZE');
});
test('geçersiz görsel tarayıcı açılmadan reddedilir', async () => {
  let opened = false;
  const service = new CookidooService({ run: async () => { opened = true; } });
  await assert.rejects(() => service.uploadImage('01KK476KW06TCW8VBKEBWTFESS', {
    imageBase64: 'bad', mimeType: 'image/png',
  }), error => error.code === 'INVALID_IMAGE');
  assert.equal(opened, false);
});

function uploadPage({ status = 200, publicRecipe = false } = {}) {
  const calls = [];
  let resolveSaved;
  const saved = new Promise(resolve => { resolveSaved = resolve; });
  const response = { ok: () => status < 400, status: () => status };
  const page = {
    goto: async url => { calls.push(['goto', url]); },
    waitForFunction: async () => {},
    waitForResponse: () => saved,
    locator: selector => ({
      click: async () => {
        calls.push(['click', selector]);
        if (selector.includes('confirmation')) resolveSaved(response);
      },
      waitFor: () => publicRecipe ? Promise.resolve() : new Promise(() => {}),
    }),
    frameLocator: () => ({
      locator: () => ({ setInputFiles: async file => { calls.push(['file', file]); } }),
      getByRole: () => ({ click: async () => { if (!publicRecipe) resolveSaved(response); } }),
    }),
  };
  return { page, calls };
}

test('özel tarifte ayrı onay penceresi olmadan yüklemeyi tamamlar', async () => {
  const { page, calls } = uploadPage();
  await uploadRecipeImage(page, 'https://cookidoo.de/edit', '/recipe', { buffer: png }, false);
  assert.equal(calls.filter(call => call[0] === 'file').length, 1);
  assert.equal(calls.some(call => String(call[1]).includes('confirmation')), false);
});

test('paylaşılan tarifte görsel beyanını arar ve onayı kaydeder', async () => {
  const first = uploadPage({ publicRecipe: true });
  await assert.rejects(() => uploadRecipeImage(first.page, 'https://cookidoo.de/edit', '/recipe', {}, false),
    error => error.code === 'IMAGE_OWNERSHIP_REQUIRED');
  const second = uploadPage({ publicRecipe: true });
  await uploadRecipeImage(second.page, 'https://cookidoo.de/edit', '/recipe', {}, true);
  assert.equal(second.calls.some(call => String(call[1]).includes('confirmation')), true);
});

test('Cookidoo başarısız kayıt yanıtını başarı olarak döndürmez', async () => {
  const { page } = uploadPage({ status: 400 });
  await assert.rejects(() => uploadRecipeImage(page, 'https://cookidoo.de/edit', '/recipe', {}, false),
    error => error.code === 'IMAGE_UPLOAD_FAILED');
});
