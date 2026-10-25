/**
 * Contenus initiaux du site (première version présentable).
 *
 * Tous les textes reprennent ou reformulent les informations publiées sur
 * avenirdurable.fr (voir docs/RESEARCH.md). Les éléments non confirmés sont
 * marqués « à valider » dans l'administration (needsReview / isPlaceholder) :
 * aucun chiffre, témoignage, partenariat ou projet réel n'est inventé.
 *
 * Usage : npm run db:seed            (n'écrase rien si des pages existent déjà)
 *         npm run db:seed -- --force (réinitialise TOUS les contenus — attention)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "./load-env";

loadEnv();

const FORCE = process.argv.includes("--force");

async function main() {
  const { getDb, closeDb, schema } = await import("../src/db");
  const { processImage } = await import("../src/lib/media");
  const { saveSettingsSection } = await import("../src/lib/settings");
  const { DEFAULT_SETTINGS } = await import("../src/lib/settings-schema");
  const { sectionsSchema, newSectionId } = await import("../src/lib/sections");
  const db = getDb();

  const existing = await db.select({ id: schema.pages.id }).from(schema.pages).limit(1);
  if (existing.length && !FORCE) {
    console.log("ℹ Des contenus existent déjà : rien n'a été modifié (utilisez --force pour réinitialiser).");
    await closeDb();
    return;
  }
  if (FORCE) {
    for (const t of [schema.projects, schema.domains, schema.faqItems, schema.partners, schema.pages, schema.media, schema.settings]) {
      await db.delete(t);
    }
  }

  /* ── Médias ── */
  async function addMedia(file: string, meta: { alt: string; title: string; description?: string; credit?: string }) {
    const buf = await fs.readFile(path.join("database/seed-assets", file));
    const img = await processImage(buf);
    const [row] = await db
      .insert(schema.media)
      .values({ ...img, originalName: file, alt: meta.alt, title: meta.title, description: meta.description ?? "", credit: meta.credit ?? "" })
      .returning();
    return row!.id;
  }
  const logoId = await addMedia("logo-avenir-durable.webp", {
    alt: "Avenir Durable",
    title: "Logo Avenir Durable",
    description: "Logo officiel récupéré sur avenirdurable.fr (version 389 × 179 px). Demander une version vectorielle (SVG) à l'association.",
  });
  const gardenId = await addMedia("atelier-jardin-enfants.webp", {
    alt: "Deux enfants jardinent dans un potager, entre des planches de bois et des herbes hautes.",
    title: "Enfants au potager",
    description: "Photo publiée sur avenirdurable.fr. Droit à l'image et contexte (lieu, date) à confirmer par l'association.",
    credit: "L'Avenir Durable",
  });

  /* ── Paramètres ── */
  await saveSettingsSection("identity", { ...DEFAULT_SETTINGS.identity, logoId });
  await saveSettingsSection("seo", { ...DEFAULT_SETTINGS.seo, ogImageId: gardenId });

  /* ── Domaines d'intervention (formats confirmés ; contenus détaillés à valider) ── */
  const domainData = [
    {
      slug: "ateliers-de-sensibilisation",
      title: "Ateliers de sensibilisation",
      icon: "seed",
      summary: "Des temps d'échange et de pratique pour comprendre les enjeux environnementaux et de développement durable.",
      body:
        "Les ateliers sont au cœur du programme de L'Avenir Durable. Ils permettent de **comprendre** les grands enjeux environnementaux à partir de situations concrètes, d'**échanger** et de repartir avec des idées applicables tout de suite.\n\n*Formats, durées et publics : à préciser avec l'association.*",
    },
    {
      slug: "activites-de-decouverte",
      title: "Activités de découverte",
      icon: "leaf",
      summary: "Observer, manipuler, expérimenter : des activités pour apprendre en faisant.",
      body:
        "Parce qu'on retient mieux ce que l'on a vécu, le projet propose des activités pour **explorer** le vivant et les ressources qui nous entourent, en extérieur comme en intérieur.\n\n*Exemples d'activités à compléter par l'association.*",
    },
    {
      slug: "actions-concretes",
      title: "Actions concrètes",
      icon: "hands",
      summary: "Passer de l'intention à l'action, ensemble, sur le terrain.",
      body:
        "Au-delà de la sensibilisation, L'Avenir Durable mène des **actions concrètes** : chacun peut y contribuer et en mesurer directement les effets autour de soi.\n\n*Liste des actions réellement menées à compléter.*",
    },
    {
      slug: "ecogestes-au-quotidien",
      title: "Écogestes au quotidien",
      icon: "home",
      summary: "Faire des comportements écoresponsables de vraies habitudes, à la maison comme ailleurs.",
      body:
        "L'objectif du projet est de **favoriser l'adoption de comportements écoresponsables dans la vie quotidienne**. Des gestes simples, accessibles à tous, qui une fois partagés deviennent des réflexes.\n\n*Thématiques précises à valider avec l'association.*",
    },
  ];
  const domainIds: Record<string, number> = {};
  for (const [i, d] of domainData.entries()) {
    const [row] = await db
      .insert(schema.domains)
      .values({ ...d, status: "published", sortOrder: (i + 1) * 10, needsReview: true })
      .returning({ id: schema.domains.id });
    domainIds[d.slug] = row!.id;
  }

  /* ── Projets : exemples de démonstration, clairement identifiés ── */
  const projectData = [
    {
      slug: "atelier-potager-avec-les-enfants",
      title: "Atelier potager avec les enfants",
      summary: "Mettre les mains dans la terre pour comprendre le vivant : un exemple d'atelier au jardin.",
      body:
        "Cet exemple s'appuie sur la photo publiée par l'association : des enfants qui jardinent dans un potager.\n\n## Ce que l'atelier permet\n- découvrir comment poussent les plantes ;\n- comprendre le rôle du sol et de l'eau ;\n- apprendre à prendre soin d'un espace partagé.\n\n*Contenu de démonstration : lieu, dates, partenaires et déroulé réels à fournir par l'association.*",
      coverId: gardenId,
      domainId: domainIds["actions-concretes"],
      featured: true,
      audience: "Enfants",
    },
    {
      slug: "de-la-graine-au-chene",
      title: "De la graine au chêne",
      summary: "Récolter, observer et planter des glands pour suivre la croissance d'un arbre au fil des saisons.",
      body:
        "Inspiré de la vidéo de présentation de L'Avenir Durable, consacrée aux glands de chêne, ce projet fait du temps long de l'arbre un support d'observation.\n\n*Contenu de démonstration à remplacer par un projet réel.*",
      coverId: null,
      domainId: domainIds["activites-de-decouverte"],
      featured: true,
      audience: "",
    },
    {
      slug: "defi-ecogestes",
      title: "Défi écogestes",
      summary: "Choisir quelques gestes simples, les tester pendant un mois et partager ce qui a changé.",
      body: "Un format pour ancrer de nouvelles habitudes dans la durée.\n\n*Contenu de démonstration à remplacer par un projet réel.*",
      coverId: null,
      domainId: domainIds["ecogestes-au-quotidien"],
      featured: true,
      audience: "",
    },
  ];
  for (const [i, p] of projectData.entries()) {
    await db.insert(schema.projects).values({ ...p, status: "published", isPlaceholder: true, sortOrder: (i + 1) * 10, publishedAt: new Date() });
  }

  /* ── FAQ ── */
  const faq = [
    {
      category: "Le projet",
      question: "Qu'est-ce que L'Avenir Durable ?",
      answer:
        "L'Avenir Durable est un projet qui vise à sensibiliser et à mobiliser le public aux enjeux environnementaux et de développement durable. Il propose un programme complet d'ateliers, d'activités et d'actions concrètes pour favoriser l'adoption de comportements écoresponsables dans la vie quotidienne.",
      needsReview: false,
    },
    {
      category: "Le projet",
      question: "Quelles thématiques abordez-vous ?",
      answer: "Les thématiques couvrent un large éventail de sujets liés à la préservation de la planète et au développement durable, toujours reliés à des gestes concrets du quotidien.",
      needsReview: true,
    },
    {
      category: "Participer",
      question: "Comment participer à un atelier ?",
      answer: "Le plus simple est de nous écrire via le [formulaire de contact](/contact) en choisissant l'objet « Participer à un atelier ». Nous vous indiquerons les prochaines dates et les modalités.",
      needsReview: true,
    },
    {
      category: "Participer",
      question: "Pouvez-vous intervenir dans notre structure (école, association, entreprise, collectivité) ?",
      answer: "Présentez-nous votre projet et votre public via le [formulaire de contact](/contact) : nous étudierons ensemble le format le plus adapté.",
      needsReview: true,
    },
    {
      category: "Participer",
      question: "Comment devenir bénévole ou proposer un partenariat ?",
      answer: "Écrivez-nous en précisant vos envies et vos disponibilités ou la nature du partenariat envisagé. Chaque proposition reçoit une réponse.",
      needsReview: true,
    },
    {
      category: "Contact et données",
      question: "Comment vous contacter ?",
      answer: "Par e-mail à [avenirdurable@ecomail.fr](mailto:avenirdurable@ecomail.fr) ou grâce au [formulaire de contact](/contact).",
      needsReview: false,
    },
    {
      category: "Contact et données",
      question: "Que deviennent les informations envoyées via le formulaire ?",
      answer:
        "Elles servent uniquement à répondre à votre demande. Elles ne sont accessibles qu'aux membres habilités de l'association et sont supprimées au bout de 12 mois. Le détail figure dans la [politique de confidentialité](/politique-de-confidentialite).",
      needsReview: false,
    },
  ];
  for (const [i, f] of faq.entries()) await db.insert(schema.faqItems).values({ ...f, status: "published", sortOrder: (i + 1) * 10 });

  /* ── Pages ── */
  const L = (label: string, href: string) => ({ label, href });
  const none = L("", "");
  const sid = () => newSectionId();

  type PageSeed = {
    slug: string;
    title: string;
    seoTitle?: string;
    seoDescription: string;
    nav?: { label: string; order: number };
    footer?: boolean;
    system?: boolean;
    publish?: boolean;
    needsReview?: boolean;
    sections: unknown[];
  };

  const pagesSeed: PageSeed[] = [
    {
      slug: "accueil",
      title: "Accueil",
      seoTitle: "Avenir Durable — Sensibiliser et agir pour un quotidien écoresponsable",
      seoDescription:
        "Ateliers, activités et actions concrètes pour comprendre les enjeux environnementaux et adopter des gestes écoresponsables au quotidien.",
      footer: true,
      system: true,
      nav: { label: "Accueil", order: 0 },
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "home",
          eyebrow: "",
          title: "Semer aujourd'hui\nles gestes de demain",
          text: "L'Avenir Durable sensibilise et mobilise le public aux enjeux environnementaux et de développement durable, avec des ateliers, des activités et des actions concrètes pour adopter des gestes écoresponsables au quotidien.",
          primaryCta: L("Découvrir nos actions", "/nos-actions"),
          secondaryCta: L("Nous contacter", "/contact"),
          imageId: gardenId,
        },
        {
          id: sid(),
          type: "statement",
          eyebrow: "Le projet",
          title: "Les grands enjeux environnementaux se jouent aussi dans les petits gestes de tous les jours.",
          text: "Notre programme relie la compréhension et la pratique : on découvre un enjeu, on l'expérimente lors d'un atelier, puis on agit, ensemble, jusqu'à ce que le geste devienne une habitude.",
          link: L("Découvrir le projet", "/a-propos"),
        },
        {
          id: sid(),
          type: "cycle",
          eyebrow: "Notre démarche",
          title: "Du déclic à l'habitude",
          intro: "Quatre temps qui se répondent, comme un cycle naturel.",
          steps: [
            { title: "Sensibiliser", text: "Comprendre les enjeux environnementaux et de développement durable, simplement." },
            { title: "Expérimenter", text: "Essayer en pratique lors d'ateliers et d'activités." },
            { title: "Agir", text: "Mener des actions concrètes, à plusieurs." },
            { title: "Ancrer", text: "Faire des comportements écoresponsables des réflexes du quotidien." },
          ],
        },
        {
          id: sid(),
          type: "domains",
          eyebrow: "Nos actions",
          title: "Nos domaines d'intervention",
          intro: "Des formats complémentaires pour passer de la prise de conscience à l'action.",
          layout: "list",
        },
        {
          id: sid(),
          type: "projects",
          eyebrow: "Sur le terrain",
          title: "Projets et initiatives",
          intro: "",
          mode: "featured",
          limit: 3,
          link: L("Voir tous les projets", "/projets"),
        },
        { id: sid(), type: "partners", eyebrow: "Ensemble", title: "Ils agissent avec nous", intro: "" },
        {
          id: sid(),
          type: "faq",
          eyebrow: "Questions fréquentes",
          title: "Vous vous demandez peut-être…",
          intro: "",
          category: "",
          limit: 3,
          link: L("Toutes les questions", "/faq"),
        },
        {
          id: sid(),
          type: "cta",
          title: "Envie de participer ou d'organiser un atelier ?",
          text: "Écrivez-nous : nous construirons ensemble le format le plus adapté.",
          button: L("Nous contacter", "/contact"),
          tone: "forest",
        },
      ],
    },
    {
      slug: "a-propos",
      title: "À propos",
      seoDescription: "Découvrez L'Avenir Durable, un projet de sensibilisation et de mobilisation aux enjeux environnementaux et au développement durable.",
      nav: { label: "À propos", order: 10 },
      footer: true,
      needsReview: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "À propos",
          title: "Apprendre à vivre durablement, ensemble",
          text: "L'Avenir Durable est un projet qui sensibilise et mobilise le public aux enjeux environnementaux et de développement durable.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        {
          id: sid(),
          type: "imageText",
          eyebrow: "Notre mission",
          title: "Rendre l'écologie concrète",
          body:
            "Le projet prend la forme d'un **programme complet** qui propose :\n\n- des **ateliers** pour comprendre les enjeux ;\n- des **activités** pour les expérimenter ;\n- des **actions concrètes** pour agir.\n\nSon but : favoriser l'adoption de **comportements écoresponsables dans la vie quotidienne**. Les thématiques abordées couvrent un large éventail de sujets cruciaux pour notre planète.",
          imageId: gardenId,
          imageSide: "left",
          link: none,
        },
        {
          id: sid(),
          type: "values",
          eyebrow: "Ce qui nous guide",
          title: "Nos valeurs",
          intro: "Des principes de travail à valider avec l'association.",
          items: [
            { title: "Le concret", text: "Partir de situations réelles et de gestes applicables tout de suite." },
            { title: "L'accessibilité", text: "S'adresser à tous, sans prérequis ni jargon." },
            { title: "Le collectif", text: "Apprendre et agir à plusieurs, chacun à son rythme." },
            { title: "Le temps long", text: "Viser des habitudes durables plutôt que des actions ponctuelles." },
          ],
        },
        {
          id: sid(),
          type: "cta",
          title: "Une question sur le projet ?",
          text: "Nous serons heureux d'échanger avec vous.",
          button: L("Nous contacter", "/contact"),
          tone: "soft",
        },
      ],
    },
    {
      slug: "nos-actions",
      title: "Nos actions",
      seoDescription: "Ateliers de sensibilisation, activités de découverte, actions concrètes et écogestes : les domaines d'intervention de L'Avenir Durable.",
      nav: { label: "Nos actions", order: 20 },
      footer: true,
      system: true,
      needsReview: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "Nos actions",
          title: "Comprendre, essayer, agir",
          text: "Ateliers, activités et actions concrètes : découvrez comment L'Avenir Durable accompagne le passage à l'action.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        { id: sid(), type: "domains", eyebrow: "", title: "Nos domaines d'intervention", intro: "", layout: "list" },
        {
          id: sid(),
          type: "cycle",
          eyebrow: "Notre démarche",
          title: "Du déclic à l'habitude",
          intro: "Chaque format s'inscrit dans un même cycle.",
          steps: [
            { title: "Sensibiliser", text: "Comprendre les enjeux, simplement." },
            { title: "Expérimenter", text: "Essayer lors d'ateliers et d'activités." },
            { title: "Agir", text: "Mener des actions concrètes, à plusieurs." },
            { title: "Ancrer", text: "Transformer les gestes en habitudes." },
          ],
        },
        {
          id: sid(),
          type: "cta",
          title: "Vous souhaitez accueillir un atelier ?",
          text: "Présentez-nous votre public et votre projet.",
          button: L("Nous contacter", "/contact"),
          tone: "forest",
        },
      ],
    },
    {
      slug: "projets",
      title: "Projets et initiatives",
      seoDescription: "Les projets et initiatives menés par L'Avenir Durable pour sensibiliser et agir en faveur de l'environnement.",
      nav: { label: "Projets", order: 30 },
      footer: true,
      system: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "Sur le terrain",
          title: "Projets et initiatives",
          text: "Ateliers, activités et actions concrètes : un aperçu de ce que nous faisons, ensemble.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        { id: sid(), type: "projects", eyebrow: "", title: "", intro: "", mode: "all", limit: 24, link: none },
        {
          id: sid(),
          type: "cta",
          title: "Une idée de projet ?",
          text: "Construisons-le ensemble.",
          button: L("Nous contacter", "/contact"),
          tone: "forest",
        },
      ],
    },
    {
      slug: "partenaires",
      title: "Partenaires",
      seoDescription: "Les partenaires qui agissent aux côtés de L'Avenir Durable.",
      nav: { label: "Partenaires", order: 40 },
      publish: false,
      needsReview: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "Ensemble",
          title: "Nos partenaires",
          text: "Ils agissent à nos côtés.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        { id: sid(), type: "partners", eyebrow: "", title: "", intro: "" },
        {
          id: sid(),
          type: "cta",
          title: "Devenir partenaire",
          text: "Votre structure partage nos objectifs ? Parlons-en.",
          button: L("Proposer un partenariat", "/contact"),
          tone: "soft",
        },
      ],
    },
    {
      slug: "faq",
      title: "Questions fréquentes",
      seoDescription: "Réponses aux questions fréquentes sur L'Avenir Durable : le projet, la participation aux ateliers, le contact et vos données.",
      nav: { label: "FAQ", order: 50 },
      footer: true,
      system: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "FAQ",
          title: "Questions fréquentes",
          text: "Vous ne trouvez pas votre réponse ? Écrivez-nous.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        { id: sid(), type: "faq", eyebrow: "", title: "", intro: "", category: "", limit: 0, link: none },
        {
          id: sid(),
          type: "cta",
          title: "Une autre question ?",
          text: "Nous vous répondons rapidement.",
          button: L("Poser ma question", "/contact"),
          tone: "soft",
        },
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      seoDescription: "Contactez L'Avenir Durable : participer à un atelier, proposer un partenariat, devenir bénévole ou poser une question.",
      nav: { label: "Contact", order: 60 },
      footer: true,
      system: true,
      sections: [
        {
          id: sid(),
          type: "hero",
          variant: "page",
          eyebrow: "Contact",
          title: "Parlons de votre projet",
          text: "Une question, une idée d'atelier, une envie de vous engager ? Écrivez-nous.",
          primaryCta: none,
          secondaryCta: none,
          imageId: null,
        },
        { id: sid(), type: "contact", title: "Nos coordonnées", intro: "Nous lisons chaque message et vous répondons dans les meilleurs délais." },
      ],
    },
    {
      slug: "mentions-legales",
      title: "Mentions légales",
      seoDescription: "Mentions légales du site de L'Avenir Durable.",
      system: true,
      needsReview: true,
      sections: [{ id: sid(), type: "legal", kind: "mentions", extra: "" }],
    },
    {
      slug: "politique-de-confidentialite",
      title: "Politique de confidentialité",
      seoDescription: "Comment L'Avenir Durable traite vos données personnelles et comment exercer vos droits.",
      system: true,
      needsReview: true,
      sections: [{ id: sid(), type: "legal", kind: "confidentialite", extra: "" }],
    },
    {
      slug: "gestion-des-cookies",
      title: "Gestion des cookies",
      seoDescription: "Les cookies utilisés sur le site de L'Avenir Durable et la gestion de vos préférences.",
      system: true,
      sections: [{ id: sid(), type: "legal", kind: "cookies", extra: "" }],
    },
  ];

  for (const p of pagesSeed) {
    const sections = sectionsSchema.parse(p.sections);
    const content = { title: p.title, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription, ogImageId: null, sections };
    const publish = p.publish !== false;
    await db.insert(schema.pages).values({
      slug: p.slug,
      isSystem: Boolean(p.system),
      draft: content,
      published: publish ? content : null,
      hasUnpublishedChanges: !publish,
      showInNav: Boolean(p.nav),
      navLabel: p.nav?.label ?? "",
      navOrder: p.nav?.order ?? 100,
      showInFooter: Boolean(p.footer),
      needsReview: Boolean(p.needsReview),
      publishedAt: publish ? new Date() : null,
    });
  }

  console.log(`✔ Contenus initiaux créés : ${pagesSeed.length} pages, ${domainData.length} domaines, ${projectData.length} projets (exemples), ${faq.length} questions.`);
  await closeDb();
}

main().catch(async (err) => {
  console.error("✖ Échec de l'initialisation :", err);
  process.exit(1);
});
