# Guides and Quick References

**Last Updated:** 2025-11-22

This directory contains practical guides, quick references, and how-to documentation for developers working on Autolytiq.

## Quick Start Guides

### 🚀 [Quick Start Modules](./QUICK_START_MODULES.md)
Get started with the modular architecture quickly. Learn how to use each module's public API.

**Use when:** You're new to the project or need to integrate with a module.

---

## Development Patterns

### 🎨 [Frontend Pattern Guide](./FRONTEND_PATTERN_GUIDE.md)
Comprehensive guide to frontend patterns, component structure, and UI consistency.

**Covers:**
- PageHeader/PageContent layout pattern
- Design token usage
- Form patterns with react-hook-form + Zod
- State management patterns
- Component organization

**Use when:** Building or refactoring UI components.

---

### 🎨 [Design Guidelines](./DESIGN_GUIDELINES.md)
UI/UX design standards, visual consistency, and branding guidelines.

**Covers:**
- Color schemes and design tokens
- Typography standards
- Spacing and layout
- Component styling
- Accessibility requirements

**Use when:** Creating new UI components or updating designs.

---

### 📐 [UI Pattern Quick Reference](./UI_PATTERN_QUICK_REFERENCE.md)
Quick reference for common UI patterns and component usage.

**Use when:** You need a quick reminder of the correct pattern to use.

---

## Quality and Standards

### ✅ [Quality Quick Reference](./QUALITY_QUICK_REFERENCE.md)
Code quality standards, linting rules, and best practices.

**Covers:**
- TypeScript strict mode requirements
- ESLint rules and architectural enforcement
- Testing requirements
- Code review checklist
- Commit message standards

**Use when:** Ensuring code meets quality standards before commit.

---

## Agent and Workflow Guides

### 🤖 [Agent Orchestration Ruleset](./AGENT_ORCHESTRATION_RULESET.md)
Rules and patterns for AI agent collaboration on this project.

**Covers:**
- Agent responsibilities and capabilities
- Coordination patterns
- Task assignment rules
- Quality gates and validation
- Communication protocols

**Use when:** Working with AI agents or coordinating complex multi-agent tasks.

---

### 🧠 [Intelligence README](./INTELLIGENCE_README.md)
Overview of intelligent features and AI integration.

**Use when:** Understanding AI/ML capabilities in the system.

---

### 🤖 [ML Agent README](./ML_AGENT_README.md)
Machine learning agent documentation and usage guide.

**Use when:** Working with ML features or predictive capabilities.

---

## Common Development Tasks

### Starting a New Feature

1. Review [Quick Start Modules](./QUICK_START_MODULES.md)
2. Check [Frontend Pattern Guide](./FRONTEND_PATTERN_GUIDE.md) for UI patterns
3. Follow [Quality Quick Reference](./QUALITY_QUICK_REFERENCE.md) for standards
4. Use module public APIs from [Module Documentation](../modules/README.md)

### Refactoring Existing Code

1. Review [Frontend Pattern Guide](./FRONTEND_PATTERN_GUIDE.md) for target patterns
2. Check [Module Documentation](../modules/README.md) for service integration
3. Follow [Quality Quick Reference](./QUALITY_QUICK_REFERENCE.md) for standards
4. Run tests and validation before committing

### Fixing a Bug

1. Review [Testing Checklist](../testing/TESTING_CHECKLIST.md)
2. Add a failing test that reproduces the bug
3. Fix the bug following quality standards
4. Ensure all tests pass
5. Document the fix if it's a common issue

### Adding a New Module

1. Review existing module structure in [Module Documentation](../modules/README.md)
2. Follow the module development workflow
3. Create Zod schemas for validation
4. Implement service with storage service integration
5. Write integration tests
6. Document the module's public API

---

## Pattern Examples

### Correct Module Import
```typescript
// ✅ CORRECT: Import from module public API
import { CustomerService } from '@/modules/customer'
import { DealService } from '@/modules/deal'

// ❌ WRONG: Don't import from internal files
import { CustomerService } from '@/modules/customer/customer.service'
```

### Correct Form Pattern
```typescript
// ✅ CORRECT: Use react-hook-form + Zod
const schema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Invalid email'),
})

const form = useForm({
  resolver: zodResolver(schema),
})

// ❌ WRONG: Don't use manual state management
const [name, setName] = useState('')
const [email, setEmail] = useState('')
```

### Correct Design Token Usage
```typescript
// ✅ CORRECT: Use design tokens
<div className="bg-surface-default text-content-primary p-spacing-md">

// ❌ WRONG: Don't use hardcoded values
<div className="bg-white text-black p-4">
```

### Correct Database Access
```typescript
// ✅ CORRECT: Use storage service through module
const customer = await CustomerService.getById(id, tenantId)

// ❌ WRONG: Don't use direct database calls
const customer = await db.customers.findUnique({ where: { id } })
```

---

## Cheat Sheets

### Common Module Operations

```typescript
// Customer Operations
await CustomerService.create(data, tenantId)
await CustomerService.getById(id, tenantId)
await CustomerService.update(id, data, tenantId)
await CustomerService.search(query, tenantId)

// Deal Operations
await DealService.create(data, tenantId)
await DealService.calculatePricing(dealId, tenantId)
await DealService.finalize(dealId, tenantId)

// Email Operations
await EmailService.send(emailData, tenantId)
await EmailService.getThread(threadId, tenantId)

// Tax Operations
await TaxService.calculateTax(dealId, tenantId)
await TaxService.getLocalTaxRates(zipCode)

// Vehicle Operations
await VehicleService.lookupVIN(vin)
await VehicleService.getPricing(vehicleId, tenantId)
```

### Design Tokens

```typescript
// Colors
bg-surface-default, bg-surface-subtle, bg-surface-prominent
text-content-primary, text-content-secondary, text-content-tertiary
border-border-default, border-border-subtle

// Spacing
p-spacing-xs, p-spacing-sm, p-spacing-md, p-spacing-lg, p-spacing-xl
gap-spacing-sm, gap-spacing-md

// Typography
text-text-xs, text-text-sm, text-text-base, text-text-lg
font-semibold, font-medium
```

### Form Validation

```typescript
// Common Zod patterns
z.string().min(1, 'Required')
z.string().email('Invalid email')
z.number().positive('Must be positive')
z.string().regex(/^\d{5}$/, 'Invalid ZIP code')
z.enum(['option1', 'option2'])
z.array(z.string()).min(1, 'At least one required')
z.object({ nested: z.string() })
```

---

## Additional Resources

- [Module Documentation](../modules/README.md) - Module-specific guides
- [Testing Documentation](../testing/README.md) - Testing strategies and examples
- [Architecture Documentation](../architecture/README.md) - System design and patterns
- [Security Documentation](../security/SECURITY_QUICK_REFERENCE.md) - Security best practices

---

**Back to:** [Documentation Index](../README.md)
