import { AppError, notFound } from './errors.js';

const ID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const FULL_RECIPE = 'application/vnd.vorwerk.customer-recipe.full+json';

export function validateRecipeId(id) {
  if (!ID_PATTERN.test(id)) {
    throw new AppError(400, 'INVALID_RECIPE_ID', 'Geçersiz tarif kimliği.');
  }
  return id;
}

function minutes(value) {
  if (typeof value === 'number') return Math.round(value / 60);
  if (typeof value !== 'string') return null;
  const match = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i.exec(value);
  if (!match) return null;
  return Math.round(Number(match[1] || 0) * 60 + Number(match[2] || 0) + Number(match[3] || 0) / 60);
}

function nthIndex(text, anchor, occurrence = 1) {
  let from = 0;
  let found = -1;
  for (let count = 0; count < occurrence; count++) {
    found = text.indexOf(anchor, from);
    if (found < 0) return -1;
    from = found + anchor.length;
  }
  return found;
}

function positionFor(text, item, stepIndex) {
  const offset = nthIndex(text, item.anchor, item.occurrence ?? 1);
  if (offset < 0) {
    throw new AppError(400, 'ANNOTATION_ANCHOR_NOT_FOUND',
      `${stepIndex + 1}. adımdaki işaret metinde bulunamadı: ${item.anchor}`);
  }
  return { offset, length: item.anchor.length };
}

function buildInstructions(steps) {
  return steps.map((input, stepIndex) => {
    if (typeof input === 'string') return { type: 'STEP', text: input };
    const annotations = [];
    for (const operation of input.operations ?? []) {
      const data = {};
      if (operation.timeSeconds !== undefined) data.time = operation.timeSeconds;
      if (operation.speed !== undefined) data.speed = operation.speed;
      if (operation.temperature !== undefined) {
        data.temperature = { value: String(operation.temperature), unit: operation.temperatureUnit ?? 'C' };
      }
      if (operation.direction === 'CCW') data.direction = 'CCW';
      annotations.push({
        type: 'TTS',
        data,
        position: positionFor(input.text, operation, stepIndex),
      });
    }
    for (const link of input.ingredientLinks ?? []) {
      annotations.push({
        type: link.missed ? 'MISSED_INGREDIENT' : 'INGREDIENT',
        data: { description: link.ingredient, notes: link.notes ?? [] },
        position: positionFor(input.text, link, stepIndex),
      });
    }
    const step = { type: 'STEP', text: input.text };
    if (annotations.length) {
      step.annotations = annotations.sort((a, b) => a.position.offset - b.position.offset);
    }
    return step;
  });
}

function stepDetails(instructions = []) {
  return instructions.map(step => ({
    text: step.text ?? '',
    operations: (step.annotations ?? []).filter(item => item.type === 'TTS').map(item => ({
      anchor: (step.text ?? '').slice(item.position?.offset ?? 0,
        (item.position?.offset ?? 0) + (item.position?.length ?? 0)),
      timeSeconds: item.data?.time,
      temperature: item.data?.temperature?.value,
      temperatureUnit: item.data?.temperature?.unit,
      speed: item.data?.speed,
      direction: item.data?.direction ?? 'CW',
    })),
    ingredientLinks: (step.annotations ?? [])
      .filter(item => item.type === 'INGREDIENT' || item.type === 'MISSED_INGREDIENT')
      .map(item => ({
        anchor: (step.text ?? '').slice(item.position?.offset ?? 0,
          (item.position?.offset ?? 0) + (item.position?.length ?? 0)),
        ingredient: typeof item.data?.description === 'string'
          ? item.data.description
          : item.data?.description?.text,
        notes: item.data?.notes ?? [],
        missed: item.type === 'MISSED_INGREDIENT',
      })),
  }));
}

function mapRecipe(recipe, baseUrl, locale) {
  const content = recipe.recipeContent ?? {};
  const details = stepDetails(content.instructions);
  return {
    id: recipe.recipeId,
    url: `${baseUrl}/created-recipes/${locale}/${recipe.recipeId}`,
    title: content.name ?? '',
    ingredients: (content.ingredients ?? []).map(item => item.text ?? '').filter(Boolean),
    steps: details.map(step => step.text),
    stepDetails: details,
    prepMinutes: minutes(content.prepTime),
    totalMinutes: minutes(content.totalTime),
    servings: content.yield?.value ?? null,
    servingUnit: content.yield?.unitText ?? null,
    modifiedAt: recipe.modifiedAt,
    createdAt: recipe.createdAt,
  };
}

export class CookidooService {
  constructor(browser) {
    this.browser = browser;
  }

  get rootPath() {
    return `/created-recipes/${this.browser.locale}`;
  }

  recipePath(id) {
    return `${this.rootPath}/${validateRecipeId(id)}`;
  }

  async request(page, method, path, data, accept = FULL_RECIPE) {
    const url = `${this.browser.baseUrl}${path}`;
    let status;
    let ok;
    let body;
    if (typeof page.evaluate === 'function') {
      ({ status, ok, body } = await page.evaluate(async ({ requestUrl, requestMethod, requestAccept, requestData }) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        try {
          const response = await fetch(requestUrl, {
            method: requestMethod,
            headers: {
              Accept: requestAccept,
              ...(requestData === undefined ? {} : { 'Content-Type': 'application/json' }),
            },
            body: requestData === undefined ? undefined : JSON.stringify(requestData),
            credentials: 'include',
            signal: controller.signal,
          });
          return { status: response.status, ok: response.ok, body: await response.text() };
        } finally {
          clearTimeout(timeout);
        }
      }, {
        requestUrl: url,
        requestMethod: method,
        requestAccept: accept,
        requestData: data,
      }));
    } else {
      const response = await page.context().request.fetch(url, {
        method,
        headers: { Accept: accept },
        data,
        timeout: 120000,
      });
      status = response.status();
      ok = response.ok();
      body = await response.text();
    }
    if (status === 401 || status === 403) {
      throw new AppError(401, 'LOGIN_REQUIRED',
        'Cookidoo oturumu sona erdi. Açılan tarayıcıda giriş yapıp isteği yeniden deneyin.');
    }
    if (status === 404) {
      throw notFound(path.split('/').at(-1));
    }
    if (status === 429) {
      throw new AppError(429, 'COOKIDOO_RATE_LIMIT', 'Cookidoo çok fazla istek aldı; daha sonra tekrar deneyin.');
    }
    if (!ok) {
      throw new AppError(502, 'COOKIDOO_API_FAILED',
        `Cookidoo isteği başarısız oldu (${status}).`, { method, path, body: body.slice(0, 500) });
    }
    if (status === 204) return null;
    return JSON.parse(body);
  }

  async login() {
    return this.browser.run(async () => ({ loggedIn: true, locale: this.browser.locale }));
  }

  async list() {
    return this.browser.run(async page => {
      const result = await this.request(page, 'GET', this.rootPath, undefined, 'application/json');
      const items = Array.isArray(result) ? result : result.items ?? result.data ?? [];
      return items.map(item => ({
        id: item.recipeId,
        title: item.recipeContent?.name ?? item.name ?? '',
        url: `${this.browser.baseUrl}${this.rootPath}/${item.recipeId}`,
        modifiedAt: item.modifiedAt,
        createdAt: item.createdAt,
      }));
    });
  }

  async read(id) {
    return this.browser.run(async page => {
      const recipe = await this.request(page, 'GET', this.recipePath(id));
      return mapRecipe(recipe, this.browser.baseUrl, this.browser.locale);
    });
  }

  async create(recipe) {
    const instructions = buildInstructions(recipe.steps);
    return this.browser.run(async page => {
      const created = await this.request(page, 'POST', this.rootPath,
        { recipeName: recipe.title }, 'application/json');
      const id = created.recipeId;
      if (!id) throw new AppError(502, 'CREATE_NOT_VERIFIED', 'Cookidoo tarif kimliği döndürmedi.');
      try {
        const meta = this.metaPatch(recipe, false);
        if (Object.keys(meta).length) await this.request(page, 'PATCH', this.recipePath(id), meta);
        if (instructions.length) await this.request(page, 'PATCH', this.recipePath(id), { instructions });
        const saved = await this.request(page, 'GET', this.recipePath(id));
        return mapRecipe(saved, this.browser.baseUrl, this.browser.locale);
      } catch (error) {
        throw new AppError(502, 'PARTIAL_CREATE',
          `Tarif oluşturuldu, ancak alanların tamamı kaydedilemedi. Tarif kimliği: ${id}`,
          { id, cause: error.message });
      }
    });
  }

  metaPatch(recipe, includeName = true) {
    const patch = {};
    if (includeName && recipe.title !== undefined) patch.name = recipe.title;
    if (recipe.ingredients !== undefined) {
      patch.ingredients = recipe.ingredients.map(item => ({ type: 'INGREDIENT', text: item }));
    }
    if (recipe.prepMinutes !== undefined) patch.prepTime = recipe.prepMinutes * 60;
    if (recipe.totalMinutes !== undefined) patch.totalTime = recipe.totalMinutes * 60;
    if (recipe.servings !== undefined) {
      patch.yield = { value: recipe.servings, unitText: recipe.servingUnit ?? 'portion' };
    }
    return patch;
  }

  async update(id, patch) {
    const instructions = patch.steps === undefined ? null : buildInstructions(patch.steps);
    return this.browser.run(async page => {
      const meta = this.metaPatch(patch);
      if (Object.keys(meta).length) await this.request(page, 'PATCH', this.recipePath(id), meta);
      if (instructions !== null) await this.request(page, 'PATCH', this.recipePath(id), { instructions });
      const saved = await this.request(page, 'GET', this.recipePath(id));
      return mapRecipe(saved, this.browser.baseUrl, this.browser.locale);
    });
  }

  async delete(id) {
    return this.browser.run(async page => {
      await this.request(page, 'DELETE', this.recipePath(id));
      return { id, deleted: true };
    });
  }
}
