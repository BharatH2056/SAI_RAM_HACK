import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../');

/**
 * Recursively scans directory for all JS/JSX files
 */
function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'tests') {
        results = results.concat(getFiles(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Browser Code Safety: No bare process references in src', () => {
  it('ensures no client-loaded file in src contains unguarded process references', () => {
    const files = getFiles(srcDir);
    const violations = [];

    // Allowed exceptions:
    // 1. src/config/env.js (which explicitly guards typeof process !== 'undefined')
    // 2. src/main.jsx (which sets up window.process polyfill safely guarded with typeof window !== 'undefined')
    const allowed = ['src\\config\\env.js', 'src/config/env.js', 'src\\main.jsx', 'src/main.jsx'];

    for (const file of files) {
      const relPath = path.relative(path.resolve(srcDir, '../'), file);
      if (allowed.some((a) => relPath.replace(/\\/g, '/').endsWith(a.replace(/\\/g, '/')))) {
        continue;
      }

      const content = fs.readFileSync(file, 'utf8');
      // Look for bare process.env, process.exit, process.on, process.argv, etc.
      const match = content.match(/\bprocess\.(env|exit|on|argv|nextTick|stdout|platform)\b/);
      if (match) {
        violations.push(`${relPath}: found bare reference "${match[0]}"`);
      }
    }

    expect(violations).toEqual([]);
  });
});
