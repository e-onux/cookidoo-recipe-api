import { AppError } from './errors.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function decodeImage({ imageBase64, mimeType }) {
  if (imageBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(imageBase64) ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(imageBase64)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Görsel geçerli base64 biçiminde olmalı.');
  }
  const buffer = Buffer.from(imageBase64, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new AppError(400, 'INVALID_IMAGE_SIZE', 'Görsel en fazla 10 MiB olabilir.');
  }
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (!(mimeType === 'image/png' ? png : mimeType === 'image/jpeg' && jpeg)) {
    throw new AppError(400, 'INVALID_IMAGE', 'Dosya içeriği belirtilen PNG veya JPEG türüyle eşleşmiyor.');
  }
  return { name: mimeType === 'image/png' ? 'recipe.png' : 'recipe.jpg', mimeType, buffer };
}

export async function uploadRecipeImage(page, editUrl, recipePath, file, imageOwnedByUser) {
  await page.goto(editUrl, { waitUntil: 'load', timeout: 60000 });
  // The page loads the widget asynchronously; wait for its registration.
  await page.waitForFunction(() => customElements.get('cr-upload-modal'), null, { timeout: 30000 });
  await page.locator('.cr-manage-image__trigger').click();
  const widget = page.frameLocator('iframe[data-test="uw-iframe"]');
  await widget.locator('input[type=file]').setInputFiles(file);
  const saved = page.waitForResponse(response =>
    new URL(response.url()).pathname === recipePath && response.request().method() === 'PATCH',
  { timeout: 120000 });
  // Attach rejection handling immediately while the widget finishes uploading.
  saved.catch(() => {});
  await widget.getByRole('button', { name: /^(Zuschneiden|Crop)$/ }).click({ timeout: 30000 });
  const confirm = page.locator('.cr-upload-modal__confirmation-save');
  const needsConfirmation = confirm.waitFor({ state: 'visible', timeout: 120000 })
    .then(() => true).catch(() => false);
  const result = await Promise.race([saved, needsConfirmation]);
  if (result === true) {
    if (!imageOwnedByUser) {
      throw new AppError(400, 'IMAGE_OWNERSHIP_REQUIRED',
        'Paylaşılan tarif görseli için imageOwnedByUser: true beyanı gerekli.');
    }
    await confirm.click();
  }
  const response = result && result !== true ? result : await saved;
  if (!response.ok()) {
    throw new AppError(502, 'IMAGE_UPLOAD_FAILED', `Görsel kaydedilemedi (${response.status()}).`);
  }
}
