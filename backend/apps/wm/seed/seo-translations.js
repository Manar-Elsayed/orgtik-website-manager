// Seed data: search titles and descriptions in the site's other languages, so SEO health and SEO
// missing have something to show per language. Coverage is deliberately uneven (as on a real site
// part-way through translation): the main pages are mostly done, deeper content less so, and a few
// pages carry a focus keyphrase and keywords. Existing language blocks are never overwritten.

// [title, description]; a missing description is left for the team to write.
const PAGES = {
  pg_home: {
    ar: ["استوديو رقمي وبرمجيات أعمال | OrgTik", "نصمم ونطوّر المواقع والعلامات التجارية والبرمجيات التي تربط عملاءك وفريقك وأدواتك في مكان واحد."],
    de: ["Digitalstudio und Business-Software | OrgTik", "Wir gestalten Websites, Marken und Software, die Kundschaft, Team und Werkzeuge an einem Ort verbinden."],
    fr: ["Studio digital et logiciels de gestion | OrgTik", "Nous concevons des sites, des marques et des logiciels qui relient vos clients, votre équipe et vos outils."],
    it: ["Studio digitale e software gestionale | OrgTik", "Progettiamo siti, brand e software che collegano clienti, team e strumenti in un unico posto."],
  },
  pg_services: {
    ar: ["الخدمات | OrgTik", "التصميم والتطوير والتسويق والدعم التقني والاستضافة، كخدمات مترابطة يقودها فريق واحد."],
    de: ["Leistungen | OrgTik", "Design, Entwicklung, Marketing, IT-Support und Hosting als verbundene Leistungen aus einer Hand."],
    fr: ["Services | OrgTik", "Design, développement, marketing, support informatique et hébergement, réunis dans une seule équipe."],
    it: ["Servizi | OrgTik"],
  },
  pg_software: {
    ar: ["البرمجيات | OrgTik", "وحدات للموارد البشرية وإدارة العملاء والملفات والمهام والتسويق والموقع، تعمل معًا في مساحة عمل واحدة."],
    de: ["Software | OrgTik", "Module für HR, CRM, Dateien, Aufgaben, Marketing und Website, die in einem Arbeitsbereich zusammenspielen."],
    fr: ["Logiciels | OrgTik", "Des modules RH, CRM, fichiers, tâches, marketing et site web qui fonctionnent ensemble dans un seul espace."],
    it: ["Software | OrgTik", "Moduli per HR, CRM, file, attività, marketing e sito web che lavorano insieme in un unico spazio."],
  },
  pg_work: {
    ar: ["أعمالنا | OrgTik", "مشاريع مختارة في الهوية والمنصات الرقمية والحملات والدعم المستمر."],
    de: ["Projekte | OrgTik", "Ausgewählte Projekte zu Identität, digitalen Plattformen, Kampagnen und laufender Betreuung."],
    fr: ["Réalisations | OrgTik"],
    it: ["Progetti | OrgTik", "Progetti selezionati su identità, piattaforme digitali, campagne e assistenza continua."],
  },
  pg_about: {
    ar: ["من نحن | OrgTik"],
    de: ["Über uns | OrgTik", "Ein Team aus Design, Technik und Betreuung, das digitale Arbeit verständlich und verlässlich macht."],
    fr: ["À propos | OrgTik", "Une équipe de design, de technique et d’accompagnement qui rend le travail numérique clair et fiable."],
    it: ["Chi siamo | OrgTik"],
  },
  pg_insights: {
    ar: ["مقالات | OrgTik", "أفكار عملية حول المواقع والعلامات التجارية والحملات والأنظمة التي تقف خلفها."],
    de: ["Einblicke | OrgTik", "Praktische Gedanken zu Websites, Marken, Kampagnen und den Systemen dahinter."],
    fr: ["Articles | OrgTik", "Des réflexions pratiques sur les sites, les marques, les campagnes et les systèmes qui les soutiennent."],
  },
  pg_contact: {
    ar: ["تواصل معنا | OrgTik", "أخبرنا بما تحتاجه، وسيرد عليك شخص من فريقنا خلال يوم عمل واحد."],
    de: ["Kontakt | OrgTik", "Erzählen Sie uns, was Sie brauchen. Jemand aus dem Team meldet sich innerhalb eines Arbeitstages."],
    fr: ["Contact | OrgTik", "Dites-nous ce dont vous avez besoin : une personne de l’équipe vous répond sous un jour ouvré."],
    it: ["Contatti | OrgTik", "Raccontaci di cosa hai bisogno: una persona del team ti risponde entro un giorno lavorativo."],
  },
  pg_roadmap: {
    de: ["Roadmap | OrgTik", "Woran wir arbeiten, was als Nächstes kommt und welche Ideen die Community vorschlägt."],
    fr: ["Feuille de route | OrgTik"],
  },
  pg_legal: {
    ar: ["المعلومات القانونية | OrgTik"],
    de: ["Rechtliches | OrgTik", "Impressum, Datenschutz und Kaufbedingungen von OrgTik an einem Ort."],
    fr: ["Mentions légales | OrgTik", "Informations sur la société, la confidentialité et les conditions d’achat d’OrgTik."],
    it: ["Note legali | OrgTik", "Dati aziendali, privacy e condizioni d’acquisto di OrgTik in un unico posto."],
  },
  pg_plans: {
    ar: ["الباقات والأسعار | OrgTik"],
    de: ["Pakete und Preise | OrgTik", "Stellen Sie Leistungen und Softwaremodule zu einem Paket zusammen und sehen Sie den Preis sofort."],
    fr: ["Offres et tarifs | OrgTik", "Composez une offre de services et de modules logiciels et voyez le prix immédiatement."],
    it: ["Pacchetti e prezzi | OrgTik"],
  },
  pg_partners: {
    de: ["Partner | OrgTik", "Unternehmen, mit denen wir zusammenarbeiten, um Projekte vollständig zu betreuen."],
    fr: ["Partenaires | OrgTik"],
  },
};

// Deeper content: which languages have a title (from the English name) and which also a description.
const COVERAGE = {
  serviceFamily: { de: "full", fr: "full", ar: "title" },
  service: { de: "full", fr: "title" },
  softwareModule: { de: "full", fr: "full", ar: "title", it: "title" },
  legalDocument: { de: "full", fr: "full", it: "full", ar: "title" },
  caseStudy: { de: "full" },
  article: { fr: "full", de: "title" },
};
const SUFFIX = { ar: "(بالعربية)", de: "(Deutsch)", fr: "(français)", it: "(italiano)" };
const NOTE = {
  ar: "نسخة عربية من هذه الصفحة على OrgTik، تشرح الخدمة أو المحتوى ولمن صُمّم بلغة واضحة.",
  de: "Die deutsche Fassung dieser OrgTik-Seite erklärt das Angebot oder den Inhalt und für wen er gedacht ist.",
  fr: "La version française de cette page OrgTik présente l’offre ou le contenu et à qui il s’adresse.",
  it: "La versione italiana di questa pagina OrgTik presenta l’offerta o il contenuto e a chi si rivolge.",
};

// A few main pages that already have their keyword work done, in every language.
const KEYWORDS = {
  pg_home: { en: ["digital studio", ["web design", "business software", "Switzerland"]], ar: ["استوديو رقمي", ["تصميم المواقع", "برمجيات الأعمال"]], de: ["Digitalstudio", ["Webdesign", "Business-Software", "Schweiz"]], fr: ["studio digital", ["création de sites", "logiciel de gestion"]], it: ["studio digitale", ["web design", "software gestionale"]] },
  pg_services: { en: ["digital services", ["web design", "development", "IT support"]], de: ["digitale Leistungen", ["Webdesign", "Entwicklung", "IT-Support"]], fr: ["services numériques", ["design web", "développement"]] },
  pg_software: { en: ["business software", ["HR software", "CRM", "task management"]], de: ["Business-Software", ["HR-Software", "CRM"]] },
  // Deliberately the same phrase as Software: SEO missing flags the clash and the editor warns about it.
  pg_plans: { en: ["business software", ["pricing", "bundles"]] },
};

// One record's content, as it is seeded.
function fillSeo(id, type, content) {
  const en = content?.seo?.en;
  if (!en || !("title" in en)) return;
  const name = String(en.title || id).replace(/\s*\|\s*OrgTik$/, "");
  const blocks = PAGES[id] ?? Object.fromEntries(Object.entries(COVERAGE[type] ?? {}).map(([locale, depth]) => [locale, depth === "full" ? [`${name} ${SUFFIX[locale]}`, NOTE[locale]] : [`${name} ${SUFFIX[locale]}`]]));
  for (const [locale, [title, description]] of Object.entries(blocks)) {
    if (content.seo[locale]) continue;
    content.seo[locale] = { title, description: description ?? "", robots: en.robots ?? "noindex", inSitemap: en.inSitemap ?? true };
  }
  for (const [locale, [focus, keywords]] of Object.entries(KEYWORDS[id] ?? {})) {
    const seo = content.seo[locale];
    if (seo && !seo.focus && !seo.keywords?.length) Object.assign(seo, { focus, keywords });
  }
}

// Saved data from before these blocks existed: fill only what is still empty, keep every edit.
function seoTranslations(entries) {
  // Only records imported from the website seed; demo and staff-created records keep their own SEO.
  for (const entry of entries.values()) if (entry.versions?.some((v) => v.by === "seed")) for (const content of [entry.live, entry.draft]) fillSeo(entry.id, entry.type, content);
}

module.exports = { fillSeo, seoTranslations };
