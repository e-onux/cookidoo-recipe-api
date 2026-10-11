import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modeSchema } from '../src/modes.js';

test('editörde gözlenen yedi mod kendi parametreleriyle doğrulanır', () => {
  const modes = [
    { name: 'DOUGH', timeSeconds: 180 },
    { name: 'BLEND', timeSeconds: 30, speed: '8' },
    { name: 'TURBO', timeSeconds: 0.5 },
    { name: 'WARM_UP', temperature: 70, speed: 'soft' },
    { name: 'RICE_COOKER' },
    { name: 'STEAMING', timeSeconds: 1200, speed: '1', direction: 'CW', accessory: 'Varoma' },
    { name: 'BROWNING', timeSeconds: 600, temperature: 160, power: 'Gentle' },
  ];
  for (const mode of modes) assert.deepEqual(modeSchema.parse({ anchor: 'ayar', ...mode }), { anchor: 'ayar', ...mode });
  for (const mode of [
    { name: 'BLEND', timeSeconds: 30, speed: '10' },
    { name: 'RICE_COOKER', timeSeconds: 30 },
    { name: 'BROWNING', timeSeconds: 600, temperature: 200, power: 'Gentle' },
  ]) assert.equal(modeSchema.safeParse({ anchor: 'ayar', ...mode }).success, false);
});
