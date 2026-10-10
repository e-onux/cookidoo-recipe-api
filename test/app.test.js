import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const id = '01KK476KW06TCW8VBKEBWTFESS';
const calls = [];
const service = {
  login: async () => ({ loggedIn: true }),
  list: async () => [{ id, title: 'Çorba' }],
  read: async recipeId => ({ id: recipeId, title: 'Çorba' }),
  create: async recipe => { calls.push(['create', recipe]); return { id, ...recipe }; },
  update: async (recipeId, patch) => { calls.push(['update', recipeId, patch]); return { id: recipeId, ...patch }; },
  delete: async recipeId => { calls.push(['delete', recipeId]); return { id: recipeId, deleted: true }; },
  uploadImage: async (recipeId, image) => ({ id: recipeId, ...image }),
};

let server;
let base;
before(async () => {
  server = createApp(service, { token: 'test-token' }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

async function request(method, path, body, token = 'test-token') {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test('yerel API anahtarını doğrular', async () => {
  const response = await request('GET', '/recipes', undefined, 'wrong');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'UNAUTHORIZED');
});

test('beş tarif işlemi doğru isteği servise iletir', async () => {
  assert.equal((await request('POST', '/auth/login')).body.loggedIn, true);
  assert.equal((await request('GET', '/recipes')).body.recipes[0].id, id);
  assert.equal((await request('GET', `/recipes/${id}`)).body.title, 'Çorba');
  const created = await request('POST', '/recipes', {
    title: 'Yeni Çorba', ingredients: ['1 l su'],
    steps: [{
      text: '5 dk/100°C/hız 1 pişirin.',
      operations: [{ anchor: '5 dk/100°C/hız 1', timeSeconds: 300, temperature: 100, speed: '1' }],
    }],
    servings: 4,
  });
  assert.equal(created.status, 201);
  assert.deepEqual(calls[0], ['create', {
    title: 'Yeni Çorba', ingredients: ['1 l su'],
    steps: [{
      text: '5 dk/100°C/hız 1 pişirin.',
      operations: [{ anchor: '5 dk/100°C/hız 1', timeSeconds: 300, temperature: 100, speed: '1' }],
    }],
    servings: 4,
  }]);
  const updated = await request('PATCH', `/recipes/${id}`, { title: 'Yeni ad' });
  assert.equal(updated.body.title, 'Yeni ad');
  assert.deepEqual(calls[1], ['update', id, { title: 'Yeni ad' }]);
  const deleted = await request('DELETE', `/recipes/${id}`);
  assert.deepEqual(deleted.body, { id, deleted: true });
  assert.deepEqual(calls[2], ['delete', id]);
});

test('geçersiz tarifleri Cookidoo işleminden önce reddeder', async () => {
  const count = calls.length;
  assert.equal((await request('GET', '/recipes/not-an-id')).status, 400);
  assert.equal((await request('PATCH', `/recipes/${id}`, {})).status, 400);
  assert.equal((await request('POST', '/recipes', { title: '' })).status, 400);
  assert.equal((await request('POST', '/recipes', { title: 'A', servings: 1.1 })).status, 400);
  assert.equal((await request('POST', '/recipes', {
    title: 'A', steps: [{ text: 'Karıştır.', operations: [{ anchor: 'Karıştır.' }] }],
  })).status, 400);
  assert.equal(calls.length, count);
});

test('resim uç noktası kimlik, tür, beyan ve kimlik doğrulamayı denetler', async () => {
  const input = { imageBase64: 'aGVsbG8=', mimeType: 'image/png', imageOwnedByUser: true };
  const result = await request('POST', `/recipes/${id}/image`, input);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { id, ...input });
  assert.equal((await request('POST', '/recipes/invalid/image', input)).status, 400);
  assert.equal((await request('POST', `/recipes/${id}/image`, { ...input, mimeType: 'text/plain' })).status, 400);
  assert.equal((await request('POST', `/recipes/${id}/image`, input, 'wrong')).status, 401);
  assert.equal((await request('POST', `/recipes/${id}/image`, { ...input, path: '/etc/passwd' })).status, 400);
});
