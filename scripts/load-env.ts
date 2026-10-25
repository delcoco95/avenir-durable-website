import fs from "node:fs";
import path from "node:path";

/**
 * Charge le fichier .env pour les scripts en ligne de commande
 * (Next.js le fait déjà lui-même pour l'application).
 * Les variables déjà définies dans l'environnement ne sont jamais écrasées.
 */
export function loadEnv(file = ".env") {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
