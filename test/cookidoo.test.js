import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CookidooService } from '../src/cookidoo.js';

const id = '01KK476KW06TCW8VBKEBWTFESS';

function fakeBrowser(responses) {
  const calls = [];
  const request = {
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      const response = responses.shift();
      return {
        status: () => response.status ?? 200,
        ok: () => (response.status ?? 200) >= 200 && (response.status ?? 200) < 300,
        json: async () => response.body,
        text: async () => JSON.stringify(response.body),
      };
    },
  };
  const page = { context: () => ({ request }) };
  return {
    browser: {
      baseUrl: 'https://cookidoo.de',
      locale: 'de-DE',
      run: async action => action(page),
    },
    calls,
  };
}

test('cihaz işlemlerini TTS açıklaması olarak ayrı PATCH isteğinde gönderir', async () => {
  const recipe = {
    recipeId: id,
    recipeContent: {
      name: 'Çorba', ingredients: [{ type: 'INGREDIENT', text: '500 g domates' }],
      instructions: [], prepTime: 600, totalTime: 'PT30M', yield: { value: 4, unitText: 'portion' },
    },
  };
  const { browser, calls } = fakeBrowser([
    { body: { recipeId: id } },
    { body: recipe },
    { body: recipe },
    { body: recipe },
  ]);
  const service = new CookidooService(browser);
  const result = await service.create({
    title: 'Çorba', ingredients: ['500 g domates'], prepMinutes: 10, totalMinutes: 30,
    servings: 4,
    steps: [{
      text: 'Domatesi 5 dk/100°C/hız 1 pişirin.',
      operations: [{ anchor: '5 dk/100°C/hız 1', timeSeconds: 300, temperature: 100, speed: '1' }],
      ingredientLinks: [{ anchor: 'Domatesi', ingredient: '500 g domates' }],
    }],
  });

  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(calls[1].data, {
    ingredients: [{ type: 'INGREDIENT', text: '500 g domates' }],
    prepTime: 600,
    totalTime: 1800,
    yield: { value: 4, unitText: 'portion' },
  });
  const instruction = calls[2].data.instructions[0];
  assert.equal(instruction.annotations[0].type, 'INGREDIENT');
  assert.deepEqual(instruction.annotations[1], {
    type: 'TTS',
    data: { time: 300, speed: '1', temperature: { value: '100', unit: 'C' } },
    position: { offset: 9, length: 16 },
  });
  assert.equal(result.prepMinutes, 10);
  assert.equal(result.totalMinutes, 30);
});

test('bulunmayan açıklama işaretini tarif oluşturmadan reddeder', async () => {
  const { browser, calls } = fakeBrowser([]);
  const service = new CookidooService(browser);
  await assert.rejects(() => service.create({
    title: 'Test',
    ingredients: [],
    steps: [{ text: 'Karıştır.', operations: [{ anchor: '5 dk', timeSeconds: 300 }] }],
  }), error => error.code === 'ANNOTATION_ANCHOR_NOT_FOUND');
  assert.equal(calls.length, 0);
});
