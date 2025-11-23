#!/bin/bash
# Check for .md files at root (except allowed ones)
# This script is run as part of pre-commit hooks

set -e

ALLOWED_FILES="README.md SECURITY.md LICENSE.md CONTRIBUTING.md CHANGELOG.md CLAUDE.md"
EXIT_CODE=0

# Find all .md files at root level (maxdepth 1)
MD_FILES=$(find . -maxdepth 1 -name "*.md" -type f 2>/dev/null || true)

if [ -z "$MD_FILES" ]; then
  # No .md files at root, all good
  exit 0
fi

echo ""
echo "🔍 Checking for documentation files at project root..."
echo ""

for file in $MD_FILES; do
  filename=$(basename "$file")

  # Check if file is in allowed list
  if echo "$ALLOWED_FILES" | grep -q "$filename"; then
    continue
  fi

  # Check if it's a symlink (CLAUDE.md symlink is allowed)
  if [ -L "$file" ]; then
    continue
  fi

  # File is not allowed at root
  echo "❌ Documentation file found at root: $filename"
  echo "   📁 Move to /docs/ folder instead"
  echo ""
  EXIT_CODE=1
done

if [ $EXIT_CODE -eq 1 ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ COMMIT BLOCKED: Documentation files at project root"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Only these files are allowed at root:"
  echo "  • README.md"
  echo "  • SECURITY.md"
  echo "  • LICENSE.md"
  echo "  • CONTRIBUTING.md"
  echo "  • CHANGELOG.md"
  echo ""
  echo "All other documentation must go in /docs/ folder:"
  echo ""
  echo "  Architecture docs    → /docs/architecture/"
  echo "  Migration docs       → /docs/migrations/"
  echo "  Module docs          → /docs/modules/<module>/"
  echo "  Guides               → /docs/guides/"
  echo "  Testing docs         → /docs/testing/"
  echo "  Security docs        → /docs/security/"
  echo "  Deployment docs      → /docs/deployment/"
  echo "  CI/CD docs           → /docs/ci-cd/"
  echo "  Historical/archived  → /docs/historical/"
  echo ""
  echo "See /docs/README.md for full documentation structure."
  echo ""
  exit 1
fi

echo "✅ No unauthorized documentation files at root"
exit 0
