import { readFile, stat } from "node:fs/promises";

const filename = "hearthpane.js";
const bundle = await readFile(filename, "utf8");
const { size } = await stat(filename);
const failures = [];

if (/\b(?:import|export)\s+(?:[^()]*?\s+from\s+)?["']/.test(bundle)) failures.push("contains a runtime module import/export");
if (/https?:\/\/(?!github\.com\/twangen\/hearthpane)/i.test(bundle)) failures.push("contains a runtime network URL");
if (/wall[-_ ]?clock/i.test(bundle)) failures.push("contains a Wall Clock reference");
if (size > 350_000) failures.push(`is ${size} bytes; expected no more than 350000`);
if (!bundle.includes("customElements.define") || !bundle.includes("hearthpane-card")) failures.push("does not register custom:hearthpane-card");

if (failures.length) throw new Error(`${filename} ${failures.join("; ")}`);
console.log(`${filename}: ${size} bytes, self-contained runtime verified`);
