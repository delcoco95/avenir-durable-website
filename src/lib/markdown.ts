import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Convertit le texte saisi dans l'administration (Markdown simple) en HTML
 * sûr : seules quelques balises de mise en forme sont conservées, les liens
 * dangereux (javascript:, data:…) et tout script sont supprimés.
 */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return "";
  const raw = marked.parse(source, { async: false, gfm: true, breaks: true }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ["p", "br", "strong", "em", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "hr", "code"],
    allowedAttributes: { a: ["href", "title", "rel", "target"] },
    allowedSchemes: ["https", "mailto", "tel"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, input) => {
        const href = input.href ?? "";
        const external = /^https:\/\//i.test(href);
        const attribs: Record<string, string> = external ? { href, rel: "noopener noreferrer", target: "_blank" } : { href };
        return { tagName, attribs };
      },
      // Les titres de niveau 1 sont réservés au titre de la page.
      h1: "h2",
    },
  });
}

/** Version texte brut (meta description, extraits). */
export function plainText(source: string, max = 160) {
  const text = source
    .replace(/[#>*_`~\-[\]()!]/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}
