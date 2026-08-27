/**
 * Copies the app logo from src/images/logo.png to public/ for use as
 * favicon and PWA install icons (desktop/mobile).
 * Run before build so the installed app uses the same logo as the UI.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcLogo = path.join(projectRoot, 'src', 'images', 'logo.png');
const publicDir = path.join(projectRoot, 'public');

const targets = ['favicon.png', 'logo192.png', 'logo512.png'];

if (!fs.existsSync(srcLogo)) {
  console.warn('copy-icons: src/images/logo.png not found. Add your app logo there so it can be used as the desktop/install icon.');
  process.exit(0);
}

if (!fs.existsSync(publicDir)) {
  console.warn('copy-icons: public/ folder not found.');
  process.exit(1);
}

targets.forEach((name) => {
  const dest = path.join(publicDir, name);
  fs.copyFileSync(srcLogo, dest);
  console.log('copy-icons: copied logo to public/' + name);
});

console.log('copy-icons: done. Logo will be used as favicon and install icon.');
