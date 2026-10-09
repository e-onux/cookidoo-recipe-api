import express from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errors.js';
import { validateRecipeId } from './cookidoo.js';

const text = (max) => z.string().trim().min(1).max(max);
const quarterServing = z.number().min(0.25).max(9999)
  .refine(value => Number.isInteger(value * 4), 'Porsiyon 0,25 katlarıyla girilmeli.');
const anchorFields = {
  anchor: text(500),
  occurrence: z.number().int().min(1).max(100).optional(),
};
const operationSchema = z.object({
  ...anchorFields,
  timeSeconds: z.number().int().min(0).max(604800).optional(),
  temperature: z.number().min(0).max(300).optional(),
  temperatureUnit: z.enum(['C', 'F']).optional(),
  speed: z.string().trim().min(1).max(20).optional(),
  direction: z.enum(['CW', 'CCW']).optional(),
}).strict().refine(value =>
  value.timeSeconds !== undefined || value.temperature !== undefined || value.speed !== undefined,
'Bir cihaz işlemi süre, sıcaklık veya hız içermeli.');
const ingredientLinkSchema = z.object({
  ...anchorFields,
  ingredient: text(500),
  notes: z.array(text(250)).max(20).optional(),
  missed: z.boolean().optional(),
}).strict();
const stepSchema = z.union([
  text(5000),
  z.object({
    text: text(5000),
    operations: z.array(operationSchema).max(20).optional(),
    ingredientLinks: z.array(ingredientLinkSchema).max(50).optional(),
  }).strict(),
]);
const recipeFields = {
  title: text(120),
  ingredients: z.array(text(500)).max(100),
  steps: z.array(stepSchema).max(100),
  prepMinutes: z.number().int().min(0).max(599940),
  totalMinutes: z.number().int().min(0).max(1440000),
  servings: quarterServing,
  servingUnit: text(50),
};
const createSchema = z.object(recipeFields).partial().extend({
  title: recipeFields.title,
  ingredients: recipeFields.ingredients.default([]),
  steps: recipeFields.steps.default([]),
}).strict().refine(value => value.servingUnit === undefined || value.servings !== undefined,
  'servingUnit ile servings birlikte gönderilmeli.');
const patchSchema = z.object(recipeFields).partial().strict()
  .refine(value => Object.keys(value).length > 0, 'En az bir alan gerekli.')
  .refine(value => value.servingUnit === undefined || value.servings !== undefined,
    'servingUnit ile servings birlikte gönderilmeli.');

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createApp(service, { token } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  if (token) {
    app.use((req, res, next) => {
      const supplied = req.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (supplied !== token) return next(new AppError(401, 'UNAUTHORIZED', 'Geçerli API anahtarı gerekli.'));
      next();
    });
  }

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.post('/auth/login', asyncRoute(async (_req, res) => {
    res.json(await service.login());
  }));
  app.get('/recipes', asyncRoute(async (_req, res) => {
    res.json({ recipes: await service.list() });
  }));
  app.post('/recipes', asyncRoute(async (req, res) => {
    const recipe = createSchema.parse(req.body);
    res.status(201).json(await service.create(recipe));
  }));
  app.get('/recipes/:id', asyncRoute(async (req, res) => {
    res.json(await service.read(validateRecipeId(req.params.id)));
  }));
  app.patch('/recipes/:id', asyncRoute(async (req, res) => {
    const id = validateRecipeId(req.params.id);
    const patch = patchSchema.parse(req.body);
    res.json(await service.update(id, patch));
  }));
  app.delete('/recipes/:id', asyncRoute(async (req, res) => {
    res.json(await service.delete(validateRecipeId(req.params.id)));
  }));

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({ error: 'INVALID_JSON', message: 'Geçerli JSON gönderin.' });
    }
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', issues: error.issues });
    }
    if (error instanceof AppError) {
      return res.status(error.status).json({ error: error.code, message: error.message, details: error.details });
    }
    console.error('Cookidoo işlemi başarısız:', error);
    res.status(502).json({
      error: 'COOKIDOO_OPERATION_FAILED',
      message: 'Cookidoo işlemi tamamlanamadı. Tarayıcıdaki oturumu kontrol edin.',
    });
  });
  return app;
}
