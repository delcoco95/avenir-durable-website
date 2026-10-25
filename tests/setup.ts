import { loadEnv } from "../scripts/load-env";

loadEnv();
// Les tests d'intégration utilisent une base dédiée, jamais la base principale.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else process.env.DATABASE_URL = "";
process.env.SESSION_SECRET ??= "secret-de-test-uniquement-0123456789";
