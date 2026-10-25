import { describe, expect, it } from "vitest";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "@/lib/auth/password";
import { generatePassword, hmac, safeEqual, sha256 } from "@/lib/security/crypto";
import { renderMarkdown } from "@/lib/markdown";

describe("mots de passe", () => {
  it("hache avec Argon2id et vérifie correctement", async () => {
    const h = await hashPassword("Une phrase de passe solide !");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Une phrase de passe solide !")).toBe(true);
    expect(await verifyPassword(h, "une phrase de passe solide !")).toBe(false);
  });

  it("ne lève pas d'erreur sur une empreinte corrompue", async () => {
    expect(await verifyPassword("pas-une-empreinte", "x")).toBe(false);
  });

  it("applique la politique de mot de passe", () => {
    expect(checkPasswordPolicy("court").ok).toBe(false);
    expect(checkPasswordPolicy("toutenminuscule").ok).toBe(false); // 15 car., 1 type
    expect(checkPasswordPolicy("Azerty123456!").ok).toBe(false); // suite courante
    expect(checkPasswordPolicy("jeanne.martin2026!", { email: "jeanne.martin@exemple.fr" }).ok).toBe(false);
    expect(checkPasswordPolicy("Gland-Chene-2026").ok).toBe(true);
    expect(checkPasswordPolicy("quatre mots sans aucun rapport").ok).toBe(true);
  });

  it("génère des mots de passe temporaires aléatoires", () => {
    const a = generatePassword(20);
    const b = generatePassword(20);
    expect(a).toHaveLength(20);
    expect(a).not.toEqual(b);
  });
});

describe("primitives cryptographiques", () => {
  it("produit des empreintes stables et non réversibles", () => {
    expect(sha256("abc")).toHaveLength(64);
    expect(hmac("192.0.2.1")).toEqual(hmac("192.0.2.1"));
    expect(hmac("192.0.2.1")).not.toContain("192");
  });
  it("compare en temps constant", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("Markdown sécurisé (protection XSS)", () => {
  it("supprime scripts, gestionnaires d'événements et liens dangereux", () => {
    const html = renderMarkdown('Texte <script>alert(1)</script> <img src=x onerror="alert(1)"> [lien](javascript:alert(1)) <a href="data:text/html,x">d</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:");
    expect(html).not.toContain("<img");
  });
  it("conserve la mise en forme autorisée et sécurise les liens externes", () => {
    const html = renderMarkdown("**gras** et [site](https://exemple.fr) et [contact](/contact)");
    expect(html).toContain("<strong>gras</strong>");
    expect(html).toContain('href="https://exemple.fr" rel="noopener noreferrer" target="_blank"');
    expect(html).toContain('href="/contact"');
  });
  it("rétrograde les titres de niveau 1", () => {
    expect(renderMarkdown("# Titre")).toContain("<h2>");
  });
});
