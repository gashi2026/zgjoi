/**
 * Finds user-facing Albanian text left hard-coded in components and pages
 * (everything visible should come from lib/i18n/messages). Used by i18n.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const ALB_WORDS = new Set(
  "dhe një për të në nuk ju juaj tuaj është janë me ose nga kjo ky si po jo u e i së ka keni kemi do mund pas para deri tani sot nëse kur ku cili cila çdo asnjë shumë pak më mbi nën pa veç edhe por sepse prej tek te".split(" "),
);
const CLASSY = /^[a-z0-9\-:[\]/.%#!()_,&>+*~='"]+$/;
/** Words that look like capitalised Albanian but are names/tech terms. */
const NAMES = new Set(["Zgjoi", "React", "Next", "GET", "POST", "PUT", "DELETE", "Europe", "EUR", "Stripe", "Google", "Facebook", "Instagram", "LinkedIn", "WhatsApp", "TikTok", "Content", "Bearer", "Prisma", "Resend", "Viber", "Twitter", "Gmail", "Email", "OK", "Visa", "Mastercard", "Apple", "Android", "Supabase", "Vercel", "Arrita", "English", "Shqip", "Mobile", "Desktop", "Admin", "Beta", "Kosovo", "Prishtina", "Enter", "Escape", "Tab"]);

export function looksAlbanian(raw: string, jsxText = false): boolean {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || !/[A-Za-zËëÇç]/.test(text)) return false;
  if (/^(https?:|mailto:|tel:)/.test(text) || (/^[/#]/.test(text) && !/\s/.test(text))) return false;
  if (/^(use client|use server|server-only)$/.test(text)) return false;
  const tokens = text.split(" ");
  if (tokens.length > 1 && tokens.every((t) => CLASSY.test(t)) && !tokens.some((t) => ALB_WORDS.has(t))) return false;
  if (/[ëçËÇ]/.test(text)) return true;
  if (jsxText) return !NAMES.has(text) && !/^[\d\W]+$/.test(text) && /[a-z]{2}/.test(text) && !/^[A-Z][a-zA-Z]+$/.test(text) || tokens.some((t) => ALB_WORDS.has(t.toLowerCase()));
  if (tokens.length === 1) {
    if (NAMES.has(text.replace(/[.:!?]$/, ""))) return false;
    return /^[A-ZËÇ][a-zëç]{2,}[.:!?]?$/.test(text);
  }
  if (tokens.some((t) => ALB_WORDS.has(t.toLowerCase().replace(/[.,:;!?()]/g, "")))) return true;
  return /^[A-ZËÇ][a-zëç]+ [a-zëç]+/.test(text) || /^[A-ZËÇ][a-zëç]+ \/ [A-ZËÇ][a-zëç]+$/.test(text);
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : files(path);
    return /\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Calls whose string arguments are not shown to users. */
const SILENT_CALLS = new Set(["msgKey", "t", "tx", "any", "require", "fetch", "console.error", "console.log", "console.warn"]);

/** Files under app/ plus every component they import (transitively); unused components are skipped. */
export function reachableFiles(): Set<string> {
  const seen = new Set<string>();
  const resolve = (from: string, spec: string): string | null => {
    let base: string;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) base = join(from, "..", spec);
    else return null;
    for (const candidate of [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
      try { if (statSync(candidate).isFile()) return candidate; } catch { /* next */ }
    }
    return null;
  };
  const queue = files("app");
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const target = resolve(file, m[1]);
      if (target && /^(app|components)\//.test(target) && !seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

export type Leftover = { file: string; line: number; text: string };

export function scanLeftovers(roots = ["app", "components"]): Leftover[] {
  const out: Leftover[] = [];
  const used = reachableFiles();
  for (const file of roots.flatMap(files)) {
    if (file.startsWith("app/api/") || file.includes("/i18n/") || !used.has(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
      if (ts.isJsxAttribute(node) && ["className", "href", "src", "id", "key", "type", "name", "autoComplete", "data-testid", "rel", "target", "method", "action"].includes(node.name.getText())) return;
      // Developer-facing errors (caught and replaced with a translated message).
      if (ts.isNewExpression(node) && node.expression.getText() === "Error") return;
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText();
        if (SILENT_CALLS.has(callee) || SILENT_CALLS.has(callee.split(".").pop() ?? "")) return;
      }
      let text: string | null = null;
      let jsx = false;
      if (ts.isJsxText(node)) { text = node.getText(); jsx = true; }
      else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) text = null;
        else text = node.text;
      } else if (ts.isTemplateExpression(node)) {
        // Check the whole template and each literal piece (e.g. `Rezervimi · ${title}`).
        const pieces = [node.head.text, ...node.templateSpans.map((s) => s.literal.text)];
        const whole = pieces.join(" ");
        const piece = pieces.map((p) => p.replace(/^[\s·:—–\-(),./?=&#]+|[\s·:—–\-(),./?=&#]+$/g, "")).find((p) => p && looksAlbanian(p));
        text = looksAlbanian(whole) ? whole : piece ? whole : null;
      }
      if (text && (ts.isTemplateExpression(node) || looksAlbanian(text, jsx))) {
        out.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: text.replace(/\s+/g, " ").trim() });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return out;
}

if (process.argv[1]?.endsWith("i18n-scan.ts")) {
  for (const l of scanLeftovers()) console.log(`${l.file}:${l.line}\t${l.text}`);
  const used = reachableFiles();
  console.log("unused (not scanned):", files("components").filter((f) => !used.has(f)).join(" "));
}
