/**
 * Post-build script: replaces `require("@veil/shared")` with correct relative paths
 * in compiled JS files under packages/main/dist/.
 *
 * Problem: npm workspace symlinks don't exist in packaged asar.
 * Solution: Replace @veil/shared with relative paths to packages/shared/dist/.
 *
 * Run after `tsc -b`, before `electron-builder`.
 */

const fs = require('fs');
const path = require('path');

const mainDist = path.join(__dirname, '..', 'packages', 'main', 'dist');
const sharedDist = path.join(__dirname, '..', 'packages', 'shared', 'dist');

function getRelativePath(fromFile) {
  const fromDir = path.dirname(fromFile);
  const relDir = path.relative(fromDir, sharedDist);
  // Normalize to forward slashes for require()
  return relDir.split(path.sep).join('/');
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('@veil/shared')) return false;

  const relPath = getRelativePath(filePath);
  const newContent = content.replace(
    /require\(["']@veil\/shared["']\)/g,
    `require("${relPath}")`
  );

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += walkDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      if (processFile(fullPath)) {
        count++;
      }
    }
  }
  return count;
}

console.log('[fix-shared-paths] Replacing @veil/shared in:', mainDist);
const replaced = walkDir(mainDist);
console.log(`[fix-shared-paths] Updated ${replaced} files`);
