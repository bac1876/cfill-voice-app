// Simple icon generator using canvas
// Run this in a browser console or use a tool to create proper PNG icons

const fs = require('fs');
const path = require('path');

// Create simple placeholder icons as base64 SVGs converted to data URIs
// For production, replace with actual PNG icons

const svg192 = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="24" fill="#1a365d"/>
  <circle cx="96" cy="80" r="30" fill="#fff"/>
  <rect x="66" y="115" width="60" height="8" rx="4" fill="#fff"/>
  <rect x="76" y="128" width="40" height="6" rx="3" fill="#fff" opacity="0.7"/>
  <path d="M96 50 L106 70 L96 65 L86 70 Z" fill="#22c55e"/>
</svg>`;

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#1a365d"/>
  <circle cx="256" cy="210" r="80" fill="#fff"/>
  <rect x="176" y="305" width="160" height="20" rx="10" fill="#fff"/>
  <rect x="196" y="340" width="120" height="16" rx="8" fill="#fff" opacity="0.7"/>
  <path d="M256 130 L280 180 L256 165 L232 180 Z" fill="#22c55e"/>
</svg>`;

// Write SVG files (browsers will accept SVG for favicons)
const iconsDir = path.join(__dirname, 'public', 'icons');

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg192);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svg512);

console.log('SVG icons created!');
console.log('For better PWA support, convert these to PNG using:');
console.log('  - https://cloudconvert.com/svg-to-png');
console.log('  - Or use: npx svg2png-cli');
