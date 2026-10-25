import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  varchar,
} from "drizzle-orm/pg-core";

/* ───────────── Comptes, sessions, sécurité ───────────── */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("editor"), // admin | editor
    active: boolean("active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** Empreinte SHA-256 du jeton : le jeton brut n'est jamais stocké. */
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: varchar("user_agent", { length: 300 }),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    /** Identifiant tenté (e-mail en minuscules) */
    identifier: varchar("identifier", { length: 254 }).notNull(),
    /** Empreinte HMAC de l'adresse IP (pas d'IP en clair) */
    ipHash: varchar("ip_hash", { length: 64 }).notNull(),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_identifier_idx").on(t.identifier, t.createdAt), index("login_attempts_ip_idx").on(t.ipHash, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    userLabel: varchar("user_label", { length: 254 }),
    action: varchar("action", { length: 60 }).notNull(),
    entity: varchar("entity", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 60 }),
    summary: varchar("summary", { length: 300 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

/* ───────────── Paramètres globaux ───────────── */

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────── Médiathèque ───────────── */

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  /** Clé de stockage aléatoire (nom de fichier sur disque, sans extension) */
  storageKey: varchar("storage_key", { length: 64 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mime: varchar("mime", { length: 40 }).notNull(),
  size: integer("size").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: varchar("alt", { length: 300 }).notNull().default(""),
  title: varchar("title", { length: 200 }).notNull().default(""),
  description: text("description").notNull().default(""),
  credit: varchar("credit", { length: 200 }).notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────── Pages (contenu en sections) ───────────── */

export type PageContent = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogImageId: number | null;
  sections: unknown[];
};

export const pages = pgTable(
  "pages",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    /** Page système : ne peut être supprimée et son adresse est fixe */
    isSystem: boolean("is_system").notNull().default(false),
    /** Version en cours d'édition (brouillon) */
    draft: jsonb("draft").$type<PageContent>().notNull(),
    /** Version publiée ; null = page non publiée */
    published: jsonb("published").$type<PageContent | null>(),
    hasUnpublishedChanges: boolean("has_unpublished_changes").notNull().default(true),
    showInNav: boolean("show_in_nav").notNull().default(false),
    navLabel: varchar("nav_label", { length: 60 }).notNull().default(""),
    navOrder: integer("nav_order").notNull().default(100),
    showInFooter: boolean("show_in_footer").notNull().default(false),
    needsReview: boolean("needs_review").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("pages_slug_idx").on(t.slug)],
);

/* ───────────── Contenus structurés ───────────── */

export const domains = pgTable(
  "domains",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    summary: varchar("summary", { length: 400 }).notNull().default(""),
    body: text("body").notNull().default(""),
    icon: varchar("icon", { length: 30 }).notNull().default("leaf"),
    imageId: integer("image_id").references(() => media.id, { onDelete: "set null" }),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | published
    sortOrder: integer("sort_order").notNull().default(100),
    needsReview: boolean("needs_review").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("domains_slug_idx").on(t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    summary: varchar("summary", { length: 400 }).notNull().default(""),
    body: text("body").notNull().default(""),
    coverId: integer("cover_id").references(() => media.id, { onDelete: "set null" }),
    domainId: integer("domain_id").references(() => domains.id, { onDelete: "set null" }),
    location: varchar("location", { length: 160 }).notNull().default(""),
    period: varchar("period", { length: 120 }).notNull().default(""),
    audience: varchar("audience", { length: 160 }).notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    /** Contenu de démonstration à remplacer par un projet réel */
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(100),
    seoDescription: varchar("seo_description", { length: 300 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("projects_slug_idx").on(t.slug)],
);

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  url: varchar("url", { length: 300 }).notNull().default(""),
  description: varchar("description", { length: 400 }).notNull().default(""),
  logoId: integer("logo_id").references(() => media.id, { onDelete: "set null" }),
  /** Partenariat confirmé par l'association : seuls ceux-ci sont affichés */
  verified: boolean("verified").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 80 }).notNull().default("Général"),
  question: varchar("question", { length: 300 }).notNull(),
  answer: text("answer").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(100),
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────── Demandes de contact ───────────── */

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(),
    organisation: varchar("organisation", { length: 160 }).notNull().default(""),
    topic: varchar("topic", { length: 80 }).notNull().default(""),
    message: text("message").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("new"), // new | handled | archived
    emailSent: boolean("email_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
  },
  (t) => [index("contact_created_idx").on(t.createdAt)],
);

/** Limitation de débit générique (formulaire de contact…) */
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: serial("id").primaryKey(),
    bucket: varchar("bucket", { length: 40 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limits_idx").on(t.bucket, t.keyHash, t.createdAt)],
);

/** Preuve de consentement (anonyme), utile dès qu'un service facultatif est activé */
export const consentLogs = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  consentId: varchar("consent_id", { length: 40 }).notNull(),
  choices: jsonb("choices").notNull(),
  policyVersion: varchar("policy_version", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
