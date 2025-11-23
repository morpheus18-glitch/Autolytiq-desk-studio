# Autolytiq Desk Studio - Documentation Index

**Last Updated:** 2025-11-22
**Project Status:** [PROJECT_STATUS.md](./PROJECT_STATUS.md)

## Overview

This directory contains all project documentation, organized by category for easy navigation and maintenance.

## Documentation Structure

### 📐 [Architecture](./architecture/)
System design, modular architecture, code quality standards, and architectural patterns.

**Key Documents:**
- [Modular Architecture Implementation](./architecture/MODULAR_ARCHITECTURE_IMPLEMENTATION.md)
- [Code Quality Fortress](./architecture/CODE_QUALITY_FORTRESS.md)
- [Module Service Refactoring Plan](./architecture/MODULE_SERVICE_REFACTORING_PLAN.md)
- [Workflows](./architecture/WORKFLOWS.md)
- [Boundary Rules Quick Reference](./architecture/BOUNDARY_RULES_QUICK_REF.md)

### 🔄 [Migrations](./migrations/)
Migration plans, status reports, and execution documentation.

**Key Documents:**
- [Complete Migration Plan](./migrations/COMPLETE_MIGRATION_PLAN.md)
- [File Migration Inventory](./migrations/FILE_MIGRATION_INVENTORY.md)
- [Migration Executive Summary](./migrations/MIGRATION_EXECUTIVE_SUMMARY.md)
- [Stabilization Plan](./migrations/STABILIZATION_PLAN.md)
- [Current Status](./migrations/CURRENT_STATUS.md)

### 📚 [Modules](./modules/)
Module-specific documentation for each domain module.

- **[Customer Module](./modules/customer/)** - Customer management, CRM, credit applications
- **[Deal Module](./modules/deal/)** - Deal creation, calculations, lifecycle
- **[Email Module](./modules/email/)** - Email integration, threading, security
- **[Tax Module](./modules/tax/)** - Tax engine, calculations, local tax
- **[Vehicle Module](./modules/vehicle/)** - Vehicle inventory, VIN lookup, pricing
- **[Reporting Module](./modules/reporting/)** - Analytics and reporting

### 📖 [Guides](./guides/)
How-to guides, quick references, and pattern documentation.

**Key Documents:**
- [Quick Start Modules](./guides/QUICK_START_MODULES.md)
- [Frontend Pattern Guide](./guides/FRONTEND_PATTERN_GUIDE.md)
- [Agent Orchestration Ruleset](./guides/AGENT_ORCHESTRATION_RULESET.md)
- [Quality Quick Reference](./guides/QUALITY_QUICK_REFERENCE.md)
- [Design Guidelines](./guides/DESIGN_GUIDELINES.md)

### 🧪 [Testing](./testing/)
Testing strategies, test summaries, and quality assurance documentation.

**Key Documents:**
- [Testing README](./testing/TESTING_README.md)
- [Testing Summary](./testing/TESTING_SUMMARY.md)
- [Integration Tests Summary](./testing/INTEGRATION_TESTS_SUMMARY.md)
- [Testing Checklist](./testing/TESTING_CHECKLIST.md)

### 🔒 [Security](./security/)
Security documentation, PII handling, and security architecture.

**Key Documents:**
- [Security Quick Reference](./security/SECURITY_QUICK_REFERENCE.md)
- [Security PII Handling](./security/SECURITY_PII_HANDLING.md)
- [Email Security Architecture](./security/EMAIL_SECURITY_ARCHITECTURE.md)

**Note:** Main security policy is at [/SECURITY.md](../SECURITY.md) (project root)

### 🚀 [Deployment](./deployment/)
Deployment guides, production fixes, and deployment safety.

**Key Documents:**
- [Deployment Safety](./deployment/DEPLOYMENT_SAFETY.md)
- [Replit Deployment Guide](./deployment/REPLIT_DEPLOYMENT_GUIDE.md)
- [Production Fix Guide](./deployment/PRODUCTION_FIX_GUIDE.md)

### ⚙️ [CI/CD](./ci-cd/)
Continuous integration and deployment pipeline documentation.

**Key Documents:**
- [CI/CD Setup](./ci-cd/CI_CD_SETUP.md)
- [CI Pipeline Summary](./ci-cd/CI_PIPELINE_SUMMARY.md)
- [CI Activation Checklist](./ci-cd/CI_ACTIVATION_CHECKLIST.md)

### 🔌 [API](./api/)
API documentation and reference materials.

*(Currently empty - API docs will be added as modules are documented)*

### 📦 [Historical](./historical/)
Archived documentation, old fix reports, and deprecated materials.

Contains historical fixes, breaking point documentation, and legacy reports. Useful for understanding past issues and their resolutions.

---

## Quick Links

### For Developers
- [Quick Start](./guides/QUICK_START_MODULES.md)
- [Frontend Patterns](./guides/FRONTEND_PATTERN_GUIDE.md)
- [Quality Standards](./guides/QUALITY_QUICK_REFERENCE.md)
- [Testing Checklist](./testing/TESTING_CHECKLIST.md)

### For Architects
- [Modular Architecture](./architecture/MODULAR_ARCHITECTURE_IMPLEMENTATION.md)
- [Module Refactoring Plan](./architecture/MODULE_SERVICE_REFACTORING_PLAN.md)
- [Migration Plan](./migrations/COMPLETE_MIGRATION_PLAN.md)

### For DevOps
- [Deployment Safety](./deployment/DEPLOYMENT_SAFETY.md)
- [CI/CD Setup](./ci-cd/CI_CD_SETUP.md)
- [Production Fix Guide](./deployment/PRODUCTION_FIX_GUIDE.md)

### For Security
- [Security Overview](../SECURITY.md)
- [Security Quick Reference](./security/SECURITY_QUICK_REFERENCE.md)
- [PII Handling](./security/SECURITY_PII_HANDLING.md)

---

## Documentation Standards

### File Naming
- Use SCREAMING_SNAKE_CASE for documentation files
- Use descriptive names that indicate content
- Group related documents with prefixes (e.g., `EMAIL_*`, `TAX_*`)

### Organization
- Keep module-specific docs in `/modules/<module-name>/`
- Keep cross-cutting concerns in appropriate category folders
- Archive old/deprecated docs to `/historical/`

### Maintenance
- Update this index when adding new documentation
- Add "Last Updated" dates to major documentation
- Review and archive outdated documentation quarterly

---

## Contributing

When adding new documentation:

1. Determine the appropriate category
2. Place file in the correct subfolder
3. Update the relevant index file (this file or subfolder README)
4. Use consistent formatting and naming conventions
5. Add "Last Updated" and "Status" metadata at the top

---

**Project Status:** [docs/PROJECT_STATUS.md](./PROJECT_STATUS.md)
**Security Policy:** [/SECURITY.md](../SECURITY.md)
