#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Invalid import patterns that should be blocked
 */
const invalidPatterns = [
  {
    pattern: /@\/core\/utils/,
    message: 'Use @/lib/ for utilities, not @/core/utils',
  },
  {
    pattern: /\.\.\/\.\.\/\.\.\/src\//,
    message: 'Use path aliases (@/) instead of deep relative imports from src/',
  },
  {
    pattern: /\.\.\/\.\.\/\.\.\/\.\.\/src\//,
    message: 'Use path aliases (@/) instead of very deep relative imports from src/',
  },
  {
    pattern: /from ['"]server\/(?!index)/,
    message: 'Server imports should use relative paths or be in modules',
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/modules\/\w+\/(?!index)/,
    message: 'Import from module public API (index.ts) only, not internal files',
  },
  {
    pattern: /from ['"]src\/modules\/\w+\/(?!index)/,
    message: 'Import from module public API (index.ts) only, not internal files',
  },
];

/**
 * Patterns that are OK for specific file types
 */
const allowedExceptions = [
  {
    filePattern: /\.test\.(ts|tsx)$/,
    importPattern: /.*/,
    reason: 'Tests can import anything',
  },
  {
    filePattern: /\.spec\.(ts|tsx)$/,
    importPattern: /.*/,
    reason: 'Specs can import anything',
  },
];

/**
 * Check if a file should be excluded from import validation
 */
function isExcludedFile(filePath) {
  const excluded = ['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'migrations'];
  return excluded.some((pattern) => filePath.includes(pattern));
}

/**
 * Check if an import is allowed as an exception
 */
function isAllowedException(filePath, importLine) {
  return allowedExceptions.some(
    (exception) => exception.filePattern.test(filePath) && exception.importPattern.test(importLine),
  );
}

/**
 * Extract import statements from file content
 */
function extractImports(content) {
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      full: match[0],
      path: match[1],
    });
  }

  return imports;
}

/**
 * Check a single file for invalid imports
 */
function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports = extractImports(content);
    const errors = [];

    imports.forEach(({ full, path }) => {
      invalidPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(full) && !isAllowedException(filePath, full)) {
          const relPath = relative(rootDir, filePath);
          errors.push({
            file: relPath,
            import: full,
            message,
          });
        }
      });
    });

    return errors;
  } catch (error) {
    // Ignore files that can't be read
    return [];
  }
}

/**
 * Recursively walk directory tree
 */
function walkDir(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    files.forEach((file) => {
      const filePath = join(dir, file);

      if (isExcludedFile(filePath)) {
        return;
      }

      try {
        if (statSync(filePath).isDirectory()) {
          walkDir(filePath, fileList);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          fileList.push(filePath);
        }
      } catch (error) {
        // Skip files we can't access
      }
    });
  } catch (error) {
    // Skip directories we can't access
  }
  return fileList;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const filesIndex = args.indexOf('--files');

  if (filesIndex !== -1 && args[filesIndex + 1]) {
    // Files passed as argument (newline-separated string from bash)
    const filesArg = args[filesIndex + 1];
    return filesArg.split('\n').filter((f) => f.trim().length > 0);
  }

  return null;
}

/**
 * Main validation
 */
function main() {
  console.log('🔍 Scanning for invalid import patterns...\n');

  const specificFiles = parseArgs();
  let allFiles = [];

  if (specificFiles) {
    // Check only specific files (pre-commit hook mode)
    console.log(`📁 Checking ${specificFiles.length} specified file(s)...\n`);
    allFiles = specificFiles.map((f) => join(rootDir, f));
  } else {
    // Check all files (full scan mode)
    const directories = [
      join(rootDir, 'src'),
      join(rootDir, 'client/src'),
      join(rootDir, 'server'),
      join(rootDir, 'shared'),
    ].filter((dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    });

    directories.forEach((dir) => {
      allFiles = allFiles.concat(walkDir(dir));
    });

    console.log(`📁 Checking ${allFiles.length} TypeScript files...\n`);
  }

  const allErrors = allFiles.flatMap(checkFile);

  if (allErrors.length === 0) {
    console.log('✅ All import paths are valid!\n');
    return 0;
  }

  console.log(`❌ Found ${allErrors.length} invalid import(s):\n`);

  // Group errors by type
  const errorsByType = {};
  allErrors.forEach((error) => {
    if (!errorsByType[error.message]) {
      errorsByType[error.message] = [];
    }
    errorsByType[error.message].push(error);
  });

  // Display grouped errors
  Object.entries(errorsByType).forEach(([message, errors]) => {
    console.log(`\n🚫 ${message}`);
    console.log(`   Found in ${errors.length} location(s):\n`);
    errors.slice(0, 5).forEach((error) => {
      console.log(`   ${error.file}`);
      console.log(`     ${error.import}\n`);
    });
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more\n`);
    }
  });

  console.log('\n💡 How to fix:');
  console.log('   1. Use path aliases (@/) instead of relative imports');
  console.log('   2. Import from module public APIs (index.ts) only');
  console.log('   3. Avoid deep directory traversal (../../..)');
  console.log('   4. Keep imports within architectural boundaries\n');

  return 1;
}

// Run validation
process.exit(main());
