/**
 * One-time script: apply PageLoader to all pages with loading states.
 * Run: node scripts/apply-page-loader.js
 */
const fs = require('fs');
const path = require('path');

const PAGES_ROOT = path.join(__dirname, '../src/pages');

function walk(dir, files = []) {
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

function ensureImport(content, filePath) {
  if (content.includes('PageLoader') && content.includes("from '") && content.includes('components/PageLoader')) {
    return content;
  }
  const importLine = `import PageLoader, { TableDataLoader, InlineDataLoader } from '${relImport(filePath)}';\n`;
  const reactMatch = content.match(/^import React[^\n]*\n/m);
  if (reactMatch) {
    const idx = content.indexOf(reactMatch[0]) + reactMatch[0].length;
    return content.slice(0, idx) + importLine + content.slice(idx);
  }
  return importLine + content;
}

function patch(content, filePath) {
  let c = content;
  const base = path.basename(filePath);

  // Full-page: if (loading) return <div...> one liner
  c = c.replace(
    /if \(loading\) return <div[^>]*>[\s\S]*?<\/div>;\s*\n\s*if \(!user\)/g,
    "if (loading) return <PageLoader message={t.loading || 'Loading...'} />;\n\n  if (!user)"
  );

  // if (loading || !user) simple div
  c = c.replace(
    /if \(loading \|\| !user\) \{\s*return \(\s*<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'(?:, backgroundColor: '[^']*')? \}\}>\s*Loading\.\.\.\s*<\/div>\s*\);\s*\}/g,
    "if (loading || !user) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  // if (loadingOrNoUser)
  c = c.replace(
    /if \(loadingOrNoUser\) \{\s*return \(\s*<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa' \}\}>\s*Loading\.\.\.\s*<\/div>\s*\);\s*\}/g,
    "if (loadingOrNoUser) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  // dashboard-loading class
  c = c.replace(
    /if \(loading\) \{\s*return \(\s*<div className="dashboard-loading">\s*Loading dashboard\.\.\.\s*<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loadingDashboard || t.loading || 'Loading dashboard...'} />;\n  }"
  );

  // admin reports special
  c = c.replace(
    /if \(loading\) \{\s*return \(\s*<div className="dashboard-container">\s*<div className="main-content">\s*<div className="dashboard-content">\s*<p>\{t\.loading \|\| 'Loading'\}\.\.\.<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loading || 'Loading...'} />;\n  }"
  );

  // Generic multiline if (loading) with flex div - capture t.loading or Loading...
  c = c.replace(
    /if \(loading(?: && spareParts\.length === 0)?\) \{\s*return \(\s*<div[\s\S]*?minHeight: '100vh'[\s\S]*?>\s*(\{t\.[^}]+\}|Loading[^<]*)\s*<\/div>\s*\);\s*\}/g,
    (match, msg) => {
      const message = msg && msg.includes('t.') ? msg.trim() : `'Loading...'`;
      return `if (loading${match.includes('spareParts') ? ' && spareParts.length === 0' : ''}) {\n    return <PageLoader message={${message.includes('t.') ? message.replace(/^\{|\}$/g, '') : message}} />;\n  }`;
    }
  );

  // Simpler if (loading) with t.loading only
  c = c.replace(
    /if \(loading\) \{\s*return \(\s*<div style=\{\{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' \}\}>\s*\{t\.loading\}\s*<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loading} />;\n  }"
  );

  // cashier reports - t.loadingReports
  c = c.replace(
    /if \(loading\) \{\s*return \(\s*<div[\s\S]*?>\s*\{t\.loadingReports\}\s*<\/div>\s*\);\s*\}/g,
    "if (loading) {\n    return <PageLoader message={t.loadingReports || t.loading} />;\n  }"
  );

  // manager-reports-loading div
  c = c.replace(
    /<div className="manager-reports-loading">\s*\{t\.loadingReportData\}\s*<\/div>/g,
    '<InlineDataLoader message={t.loadingReportData} />'
  );

  // loading-cell in tables
  c = c.replace(
    /<tr>\s*<td colSpan="(\d+)" className="no-data loading-cell">\s*\{t\.loadingReportData\}\s*<\/td>\s*<\/tr>/g,
    '<TableDataLoader message={t.loadingReportData} colSpan={$1} />'
  );
  c = c.replace(
    /<tr>\s*<td colSpan="(\d+)" className="no-data loading-cell">\s*\{t\.loadingSpareParts\}\s*<\/td>\s*<\/tr>/g,
    '<TableDataLoader message={t.loadingSpareParts} colSpan={$1} />'
  );
  c = c.replace(
    /<tr>\s*<td colSpan="(\d+)" className="no-data loading-cell">\s*\{t\.loading[^}]+\}\s*<\/td>\s*<\/tr>/g,
    '<TableDataLoader message={t.loadingReportData || t.loading} colSpan={$1} />'
  );

  // loadingData inline sections - generateSales pattern
  c = c.replace(
    /\{loadingData \? \(\s*<div[^>]*>[\s\S]*?Loading[\s\S]*?<\/div>\s*\) :/g,
    '{loadingData ? (\n                  <InlineDataLoader message={t.loadingCustomersParts || t.loading} />\n                ) :'
  );

  if (c !== content) {
    c = ensureImport(c, filePath);
  }
  return c;
}

const files = walk(PAGES_ROOT);
let updated = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes('loading') && !raw.includes('Loading')) continue;
  const next = patch(raw, file);
  if (next !== raw) {
    fs.writeFileSync(file, next);
    updated++;
    console.log('Updated:', path.relative(PAGES_ROOT, file));
  }
}
console.log(`Done. ${updated} files updated.`);
