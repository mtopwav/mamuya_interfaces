/**
 * Ensure PageLoader + translated messages in admin, sales, finance sections.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../src/pages');
const DIRS = ['admin', 'sales', path.join('finance', 'cashier'), path.join('finance', 'accountant')];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.js')) files.push(p);
  }
  return files;
}

function relImport(filePath) {
  const from = path.dirname(filePath);
  const to = path.join(__dirname, '../src/components/PageLoader.js');
  let rel = path.relative(from, to).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.js$/, '');
}

function ensurePageLoaderImport(content, filePath) {
  if (content.includes("from '") && content.includes('components/PageLoader')) return content;
  const line = `import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '${relImport(filePath)}';\n`;
  const m = content.match(/^import React[^\n]*\n/m);
  if (m) {
    const idx = content.indexOf(m[0]) + m[0].length;
    return content.slice(0, idx) + line + content.slice(idx);
  }
  return line + content;
}

function ensureUseTranslation(content, depth) {
  const importPath = depth === 2 ? '../../utils/useTranslation' : '../../../utils/useTranslation';
  if (content.includes('useTranslation')) return content;
  const line = `import { useTranslation } from '${importPath}';\n`;
  const m = content.match(/^import React[^\n]*\n/m);
  if (m) {
    const idx = content.indexOf(m[0]) + m[0].length;
    content = content.slice(0, idx) + line + content.slice(idx);
  }
  const fnMatch = content.match(/function \w+\([^)]*\) \{\s*\n/);
  if (fnMatch && !content.includes('const { t } = useTranslation()')) {
    const idx = content.indexOf(fnMatch[0]) + fnMatch[0].length;
    content = content.slice(0, idx) + '  const { t } = useTranslation();\n' + content.slice(idx);
  }
  return content;
}

function patchFile(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  const orig = c;
  const depth = filePath.includes('finance') ? 3 : 2;

  if (!c.includes('PageLoader') && (c.includes('loading') || c.includes('Loading'))) {
    c = ensurePageLoaderImport(c, filePath);
  }

  if (filePath.includes('finance' + path.sep + 'accountant') && !c.includes('useTranslation')) {
    c = ensureUseTranslation(c, depth);
  }

  c = c.replace(/import PageLoader, \{ TableDataLoader, InlineDataLoader \}/g,
    'import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader }');

  c = c.replace(/message=\{'Loading\.\.\.'\}/g, 'message={t.loading}');
  c = c.replace(/message="Loading\.\.\."/g, 'message={t.loading}');
  c = c.replace(/message="Loading dashboard\.\.\."/g, 'message={t.loadingDashboard || t.loading}');

  c = c.replace(
    /\{loadingData \? 'Loading\.\.\.' : 'Generate Sales'\}/g,
    "{loadingData ? <MiniLoader label={t.loading} /> : 'Generate Sales'}"
  );

  if (c !== orig) {
    fs.writeFileSync(filePath, c);
    return true;
  }
  return false;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
let n = 0;
for (const f of files) {
  if (patchFile(f)) {
    n++;
    console.log('Updated:', path.relative(ROOT, f));
  }
}
console.log(`Done. ${n} files updated.`);
