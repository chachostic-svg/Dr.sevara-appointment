import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTranslate } from "../shared/i18n.js";

const dir = dirname(fileURLToPath(import.meta.url));

function load(name) {
  return JSON.parse(readFileSync(join(dir, `../data/i18n/${name}.json`), "utf8"));
}

export const translate = createTranslate({
  ru: load("ru"),
  uz: load("uz"),
  en: load("en"),
});
