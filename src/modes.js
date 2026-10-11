import { z } from 'zod';

// Observed in Cookidoo's customer-recipes editor, 2026-10-11.
// Device availability must also be checked by the recipe author.
const anchor = {
  anchor: z.string().trim().min(1).max(500),
  occurrence: z.number().int().min(1).max(100).optional(),
};
const seconds = max => z.number().int().min(1).max(max);
const temperatureUnit = z.literal('C').optional();
const temperature = values => z.union(values.map(value => z.literal(value)));

export const modeSchema = z.discriminatedUnion('name', [
  z.object({ ...anchor, name: z.literal('DOUGH'), timeSeconds: seconds(1200) }).strict(),
  z.object({ ...anchor, name: z.literal('BLEND'), timeSeconds: z.number().int().min(10).max(300),
    speed: z.enum(['6', '6.5', '7', '7.5', '8']) }).strict(),
  z.object({ ...anchor, name: z.literal('TURBO'), timeSeconds: z.union([z.literal(0.5), z.literal(1), z.literal(2)]) }).strict(),
  z.object({ ...anchor, name: z.literal('WARM_UP'),
    temperature: temperature([37, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]), temperatureUnit,
    speed: z.enum(['soft', '1', '2']) }).strict(),
  z.object({ ...anchor, name: z.literal('RICE_COOKER') }).strict(),
  z.object({ ...anchor, name: z.literal('STEAMING'), timeSeconds: seconds(5940),
    speed: z.enum(['soft', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5']),
    direction: z.enum(['CW', 'CCW']), accessory: z.literal('Varoma') }).strict(),
  z.object({ ...anchor, name: z.literal('BROWNING'), timeSeconds: seconds(1800),
    temperature: temperature([140, 145, 150, 155, 160]), temperatureUnit,
    power: z.literal('Gentle') }).strict(),
]);
