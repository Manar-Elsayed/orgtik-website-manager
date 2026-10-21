// Versioned examples for the Website Manager workflows. Existing edits always win.
const { blankContent } = require('../defaults');
const clone = value => JSON.parse(JSON.stringify(value));
const IDEA_CLASSIFICATION = {
  'workspace-guide': ['product_idea', ['Onboarding', 'SaaS products']],
  'request-view': ['service_improvement', ['Support', 'Client portal']],
  'accessible-review': ['service_improvement', ['Accessibility', 'Quality assurance']],
  'project-summary': ['new_project', ['Projects', 'Collaboration']],
  'continuity-view': ['hosting_support', ['Hosting', 'Business continuity']],
  'consent-view': ['service_improvement', ['Website', 'Privacy']],
  'delivery-checks': ['service_improvement', ['Accessibility', 'Delivery']],
  'sample-dark-mode': ['product_idea', ['SaaS products', 'Workspace', 'Accessibility']],
  'sample-invoice-export': ['product_idea', ['SaaS products', 'Finance', 'Integrations']],
  'sample-setup-duplicate': ['product_idea', ['Onboarding', 'SaaS products']],
};
const CLOSED_IDEAS = {
  idea_demo_declined: ['A separate login for every tool', 'One suite account already opens the assigned tools.', 'declined', 'A single suite account keeps access easier to manage.'],
  idea_demo_hidden: ['Internal release notes with customer details', 'This sample moderation outcome demonstrates keeping private information off the public board.', 'hidden', 'Customer details must be removed before this idea can be public.'],
  idea_demo_merged: ['A checklist for the first week', 'A sample duplicate of the workspace setup guide.', 'merged', null],
};

function ideaExamples(ideas, now) {
  const at = now();
  for (const [id, [category, tags]] of Object.entries(IDEA_CLASSIFICATION)) {
    const idea = ideas.get(id);
    if (!idea?.sample || idea.version !== 1) continue;
    idea.category ??= category;
    idea.tags ??= [...tags];
  }
  for (const [id, [title, body, status, reason]] of Object.entries(CLOSED_IDEAS)) {
    const idea = ideas.get(id);
    if (!idea?.sample || idea.version !== 1) continue;
    // Only replace the original generic placeholder, never a person's edited sample.
    if (idea.title === 'Sample ' + status + ' idea') Object.assign(idea, {title, body});
    idea.category ??= 'product_idea';
    idea.tags ??= ['Onboarding', 'Moderation'];
    // The old closed examples accidentally inherited another idea's comments.
    if (!idea.discussion && idea.commentPreview) {
      idea.comments = 0;
      delete idea.commentPreview;
    }
    if (reason && idea.reason === 'Sample moderation outcome') idea.reason = reason;
  }
  const rows = [
    ['workspace-guide', 'setup-approved', 'Lina Zaki', 'approved', 'A sample visitor comment: a checklist with the first three tasks would help our team get started.'],
    ['workspace-guide', 'setup-pending', 'Adam Weber', 'pending', 'A sample visitor comment awaiting review: please include the permissions needed for each setup step.'],
    ['workspace-guide', 'setup-hidden', 'Maya Rossi', 'hidden', 'A sample comment that was declined because it included a private support reference.', 'Contains a private support reference.'],
    ['continuity-view', 'hosting-pending', 'Nora Keller', 'pending', 'A sample visitor comment awaiting review: show the most recent recovery test beside the backup status.'],
  ];
  for (const [ideaId] of rows) {
    const idea = ideas.get(ideaId);
    if (!idea?.sample || idea.version !== 1 || idea.discussion !== undefined) continue;
    // Install an entire discussion once; later moderation, removal and additions are retained.
    idea.discussion = rows.filter(row => row[0] === ideaId).map(([, key, author, status, body, reason]) => ({
      id: 'comment_demo_' + key, author: author + ' (sample visitor)', email: key + '@wm-demo.example.test',
      body, status, version: 1, submittedAt: at, privacyVersion: 'mock-workflow-v1', sample: true,
      ...(status !== 'pending' ? {moderatedAt: at, moderatedBy: 'manager'} : {}),
      ...(status === 'hidden' ? {reason} : {}),
    }));
  }
}

const CASE_WORDS = {
  en: ['Project card only', 'Full story with sample results', 'Full story with approved results', 'Private workflow example. This fictional record contains no client results and is kept off the website.'],
  ar: ['بطاقة المشروع فقط', 'قصة كاملة بنتائج تجريبية', 'قصة كاملة بنتائج معتمدة', 'مثال خاص لسير العمل. هذا السجل خيالي ولا يحتوي على نتائج عملاء ولا يظهر على الموقع.'],
  de: ['Nur Projektkarte', 'Vollständige Geschichte mit Beispielergebnissen', 'Vollständige Geschichte mit freigegebenen Ergebnissen', 'Privates Ablaufbeispiel. Dieser fiktive Datensatz enthält keine Kundenergebnisse und bleibt außerhalb der Website.'],
  fr: ['Fiche du projet uniquement', 'Récit complet avec résultats d’exemple', 'Récit complet avec résultats approuvés', 'Exemple de fonctionnement privé. Cette fiche fictive ne contient aucun résultat client et reste hors du site.'],
  it: ['Solo scheda del progetto', 'Storia completa con risultati di esempio', 'Storia completa con risultati approvati', 'Esempio di flusso privato. Questa scheda fittizia non contiene risultati dei clienti e resta fuori dal sito.'],
};

function caseStudyExamples({entries, audit, now}) {
  const at = now();
  for (const [index, mode] of ['card', 'sample', 'approved'].entries()) {
    const id = 'cs_demo_display_' + mode;
    if (entries.has(id)) continue;
    const content = blankContent('caseStudy', 'design', at);
    Object.assign(content, {
      narrativePublished: mode === 'approved', sampleNarrativePublished: mode === 'sample',
      provenance: {figures: mode === 'approved' ? 'approved' : 'sample', sampleLabel: {en: 'Fictional workflow example · no client results'}},
      slug: {en: 'mock-display-' + mode},
      seo: {en: {title: 'Mock display example', description: CASE_WORDS.en[3], robots: 'noindex', inSitemap: false}},
    });
    const english = clone(content.locales.en);
    for (const [locale, words] of Object.entries(CASE_WORDS)) content.locales[locale] = {...clone(english), name: 'Mock · ' + words[index], summary: words[3]};
    const row = {
      id, type: 'caseStudy', siteId: 'orgtik', department: 'design', format: 'Design journal', demoState: true,
      order: Math.max(0, ...[...entries.values()].filter(row => row.type === 'caseStudy').map(row => row.order || 0)) + 1,
      marks: {}, live: null, draft: content, translators: {},
      workflow: {state: 'draft', visibility: 'not_on_site', version: 1, updatedAt: at, updatedBy: 'admin', lastEditor: 'admin', publishedAt: null},
      translation: Object.fromEntries(Object.keys(CASE_WORDS).map(locale => [locale, 'in_progress'])),
      versions: [{version: 1, state: 'draft', at, by: 'admin', note: 'Private synthetic display example, with no customer results or publication.', content: clone(content)}],
    };
    entries.set(id, row);
    audit.unshift({at, by: 'admin', action: 'sample_revision', entry: id, type: 'caseStudy', version: 1, targetName: content.locales.en.name, sample: true});
  }
}

function contentExamples(context) {
  ideaExamples(context.ideas, context.now);
  caseStudyExamples(context);
}

const MEDIA_WORDS = {
  en: ['OrgTik business cards on a dark desk.', 'Brand identity artwork for the OrgTik sample project.'],
  ar: ['بطاقات أعمال أورجتيك على مكتب داكن.', 'تصميم الهوية البصرية لمشروع أورجتيك التجريبي.'],
  de: ['OrgTik-Visitenkarten auf einem dunklen Schreibtisch.', 'Markengestaltung für das OrgTik-Beispielprojekt.'],
  fr: ['Cartes de visite OrgTik sur un bureau sombre.', 'Identité visuelle du projet de démonstration OrgTik.'],
  it: ['Biglietti da visita OrgTik su una scrivania scura.', 'Identità visiva per il progetto di esempio OrgTik.'],
};
function mediaExamples(media) {
  const card = media.get('md_01');
  // A saved description/replacement/rights decision must never be replaced by new examples.
  if (card?.source === 'website' && card.version === 1 && !card.updatedBy && !card.caption && !card.tags?.length && card.rights?.status === 'unknown' && !card.rights.holder && (card.altSuggested || !Object.keys(card.alt ?? {}).length)) {
    card.caption = Object.fromEntries(Object.entries(MEDIA_WORDS).map(([locale, words]) => [locale, words[1]]));
    card.alt = Object.fromEntries(Object.entries(MEDIA_WORDS).map(([locale, words]) => [locale, words[0]]));
    card.tags = ['Brand identity', 'Print', 'Sample project'];
    card.altSuggested = false;
    card.rights = {status: 'owned', holder: 'OrgTik mock artwork', expires: null, note: 'Fictional library example; no external rights claim.'};
  }
}

module.exports = {contentExamples, mediaExamples, IDEA_CLASSIFICATION};
