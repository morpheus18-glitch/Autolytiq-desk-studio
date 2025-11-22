#!/usr/bin/env node
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Module boundary rules
 */
const boundaryRules = {
  'src/modules': {
    canImportFrom: ['src/core', 'shared', 'same-module'],
    cannotImportFrom: ['other-modules', 'server', 'client'],
    description: 'Modules can only import from core, shared, or their own files',
  },
  'src/core': {
    canImportFrom: ['src/core', 'shared'],
    cannotImportFrom: ['src/modules', 'server', 'client'],
    description: 'Core can only import from core and shared',
  },
  server: {
    canImportFrom: ['server', 'shared', 'src/modules/*/index.ts'],
    cannotImportFrom: ['client', 'src/modules/*/!(index)'],
    description: 'Server can import from server, shared, and module public APIs',
  },
  client: {
    canImportFrom: ['client', 'shared', 'src/modules/*/index.ts'],
    cannotImportFrom: ['server', 'src/modules/*/!(index)'],
    description: 'Client can import from client, shared, and module public APIs',
  },
  shared: {
    canImportFrom: ['shared'],
    cannotImportFrom: ['server', 'client', 'src/modules', 'src/core'],
    description: 'Shared can only import from shared (must be pure)',
  },
};

/**
 * Get the module name from a file path
 */
function getModuleName(filePath) {
  const match = filePath.match(/src\/modules\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Get the boundary zone for a file
 */
function getBoundaryZone(filePath) {
  if (filePath.startsWith('src/modules/')) {
    return 'src/modules';
  } else if (filePath.startsWith('src/core/')) {
    return 'src/core';
  } else if (filePath.startsWith('server/')) {
    return 'server';
  } else if (filePath.startsWith('client/')) {
    return 'client';
  } else if (filePath.startsWith('shared/')) {
    return 'shared';
  }
  return null;
}

/**
 * Check if an import is a cross-module import
 */
function isCrossModuleImport(fromFile, importPath) {
  const fromModule = getModuleName(fromFile);
  const toModule = getModuleName(importPath);

  if (fromModule && toModule && fromModule !== toModule) {
    // Cross-module import detected
    // Check if it's to the public API (index.ts)
    return !importPath.endsWith('/index.ts') && !importPath.match(/\/index$/);
  }

  return false;
}

/**
 * Resolve import path to actual file path
 */
function resolveImportPath(fromFile, importPath) {
  // Handle path aliases
  if (importPath.startsWith('@/')) {
    return importPath.replace('@/', 'client/src/');
  }
  if (importPath.startsWith('@shared/')) {
    return importPath.replace('@shared/', 'shared/');
  }
  if (importPath.startsWith('@server/')) {
    return importPath.replace('@server/', 'server/');
  }
  if (importPath.startsWith('@modules/')) {
    return importPath.replace('@modules/', 'src/modules/');
  }

  // Handle relative imports
  if (importPath.startsWith('.')) {
    const dir = dirname(fromFile);
    return relative(rootDir, join(rootDir, dir, importPath));
  }

  // Handle absolute imports
  if (
    importPath.startsWith('src/') ||
    importPath.startsWith('server/') ||
    importPath.startsWith('client/') ||
    importPath.startsWith('shared/')
  ) {
    return importPath;
  }

  // External package or unknown
  return null;
}

/**
 * Extract imports from file
 */
function extractImports(content) {
  const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
  const imports = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * Check if import violates boundary rules
 */
function checkBoundaryViolation(fromFile, importPath) {
  const resolvedPath = resolveImportPath(fromFile, importPath);

  // Skip external packages
  if (!resolvedPath) {
    return null;
  }

  const fromZone = getBoundaryZone(fromFile);
  const toZone = getBoundaryZone(resolvedPath);

  // Skip if we can't determine zones
  if (!fromZone || !toZone) {
    return null;
  }

  // Check cross-module imports
  if (isCrossModuleImport(fromFile, resolvedPath)) {
    return {
      type: 'cross-module-internal',
      from: fromFile,
      to: resolvedPath,
      message: 'Cross-module imports must use public API (index.ts)',
    };
  }

  // Check if zones can import from each other
  const rules = boundaryRules[fromZone];
  if (!rules) {
    return null;
  }

  // Same zone is always allowed
  if (fromZone === toZone) {
    // But check module isolation
    if (fromZone === 'src/modules') {
      const fromModule = getModuleName(fromFile);
      const toModule = getModuleName(resolvedPath);
      if (fromModule !== toModule) {
        return {
          type: 'cross-module',
          from: fromFile,
          to: resolvedPath,
          message: `Module '${fromModule}' cannot directly import from module '${toModule}'`,
        };
      }
    }
    return null;
  }

  // Check explicit rules
  const canImport = rules.canImportFrom.some((allowed) => {
    if (allowed === 'same-module') {
      return false; // Already checked above
    }
    return toZone.startsWith(allowed) || resolvedPath.startsWith(allowed);
  });

  if (!canImport) {
    return {
      type: 'boundary-violation',
      from: fromFile,
      to: resolvedPath,
      message: `'${fromZone}' cannot import from '${toZone}'. ${rules.description}`,
    };
  }

  return null;
}

/**
 * Check a single file
 */
function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const imports = extractImports(content);
    const violations = [];

    imports.forEach((importPath) => {
      const violation = checkBoundaryViolation(filePath, importPath);
      if (violation) {
        violations.push(violation);
      }
    });

    return violations;
  } catch (error) {
    return [];
  }
}

/**
 * Walk directory
 */
function walkDir(dir, fileList = []) {
  try {
    const files = readdirSync(dir);
    files.forEach((file) => {
      const filePath = join(dir, file);

      if (
        filePath.includes('node_modules') ||
        filePath.includes('dist') ||
        filePath.includes('build')
      ) {
        return;
      }

      try {
        if (statSync(filePath).isDirectory()) {
          walkDir(filePath, fileList);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          fileList.push(relative(rootDir, filePath));
        }
      } catch (error) {
        // Skip
      }
    });
  } catch (error) {
    // Skip
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
  console.log('🏗️  Validating module boundaries...\n');

  const specificFiles = parseArgs();
  let allFiles = [];

  if (specificFiles) {
    // Check only specific files (pre-commit hook mode)
    console.log(`📁 Checking ${specificFiles.length} specified file(s)...\n`);
    allFiles = specificFiles;
  } else {
    // Check all files (full scan mode)
    const directories = [
      join(rootDir, 'src'),
      join(rootDir, 'server'),
      join(rootDir, 'client'),
      join(rootDir, 'shared'),
    ].filter((dir) => existsSync(dir));

    directories.forEach((dir) => {
      allFiles = allFiles.concat(walkDir(dir));
    });

    console.log(`📁 Checking ${allFiles.length} files...\n`);
  }

  const allViolations = allFiles.flatMap(checkFile);

  if (allViolations.length === 0) {
    console.log('✅ All module boundaries respected!\n');
    return 0;
  }

  console.log(`❌ Found ${allViolations.length} boundary violation(s):\n`);

  // Group by type
  const byType = {};
  allViolations.forEach((v) => {
    if (!byType[v.type]) {
      byType[v.type] = [];
    }
    byType[v.type].push(v);
  });

  Object.entries(byType).forEach(([type, violations]) => {
    console.log(`\n🚫 ${type} (${violations.length} violations)`);
    console.log('─'.repeat(60));
    violations.slice(0, 5).forEach((v) => {
      console.log(`\n   ${v.from}`);
      console.log(`   → ${v.to}`);
      console.log(`   ⚠️  ${v.message}`);
    });
    if (violations.length > 5) {
      console.log(`\n   ... and ${violations.length - 5} more`);
    }
  });

  console.log('\n\n💡 How to fix:');
  console.log('   1. Import from module public APIs (index.ts) only');
  console.log('   2. Move shared code to /shared or /src/core');
  console.log('   3. Respect architectural layers (client/server/shared)');
  console.log('   4. Use dependency injection for cross-module dependencies\n');

  return 1;
}

// Run validation
process.exit(main());
