const IDEA_CATEGORIES = ['new_project', 'product_idea', 'service_improvement', 'hosting_support'];
const CATEGORY_LABELS = { new_project: 'A new project', product_idea: 'A product idea', service_improvement: 'A service improvement', hosting_support: 'Hosting and support' };
const LEGACY_CATEGORIES = new Map(Object.entries({
  new_project: ['A new project', 'مشروع جديد', 'Ein neues Projekt', 'Un nouveau projet', 'Un nuovo progetto'],
  product_idea: ['A product idea', 'فكرة منتج', 'Eine Produktidee', 'Une idée de produit', 'Un’idea di prodotto'],
  service_improvement: ['A service improvement', 'تحسين خدمة', 'Eine Serviceverbesserung', 'Une amélioration de service', 'Un miglioramento del servizio'],
  hosting_support: ['Hosting and support', 'الاستضافة والدعم', 'Hosting und Support', 'Hébergement et assistance', 'Hosting e assistenza'],
}).flatMap(([category, labels]) => labels.map(label => [label.toLowerCase(), category])));
const ideaCategory = idea => Object.hasOwn(idea, 'category') ? idea.category : LEGACY_CATEGORIES.get(String(idea.theme ?? '').toLowerCase()) ?? null;
const ideaTags = idea => Array.isArray(idea.tags) ? idea.tags : typeof idea.theme === 'string' && idea.theme && !LEGACY_CATEGORIES.get(idea.theme.toLowerCase()) ? [idea.theme] : [];
function tagsError(tags) {
  return !Array.isArray(tags) || tags.length > 10 || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 100);
}
const cleanTags = tags => [...new Map(tags.map(tag => [tag.trim().toLowerCase(), tag.trim()])).values()];
function classificationErrors(patch) {
  const errors = {};
  if ('tags' in patch && tagsError(patch.tags)) errors.tags = 'invalid';
  if ('category' in patch && patch.category !== null && !IDEA_CATEGORIES.includes(patch.category)) errors.category = 'invalid';
  return errors;
}
const publicTheme = idea => ideaTags(idea)[0] ?? CATEGORY_LABELS[ideaCategory(idea)] ?? '';

module.exports = { IDEA_CATEGORIES, ideaCategory, ideaTags, classificationErrors, cleanTags, publicTheme };
