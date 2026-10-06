/* index.html is authored as an Artifact page fragment (the platform supplies
   the doctype/head skeleton). Vercel serves a plain static host, so wrap the
   same source into a complete document. One source of truth, two hosts. */
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const fragment = await readFile("index.html", "utf8");
await mkdir("dist", { recursive: true });

const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Six specialist AI managers briefed on AUB's enrollment and affordability situation, chaired into one executive brief.">
<style>
:root{color-scheme:light dark;padding-top:env(safe-area-inset-top,0px);
padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,sans-serif;background:#efedea}
img{max-width:100%}[hidden]{display:none!important}
</style>
${fragment}
</body>
</html>
`;

await writeFile("dist/index.html", doc);
await copyFile("roster.js", "dist/roster.js");
console.log(`dist/index.html  ${doc.length} bytes`);
console.log("dist/roster.js   copied");
