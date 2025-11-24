# ⚠️ MANDATORY SESSION START INSTRUCTIONS ⚠️

**READ THIS FILE FIRST - BEFORE ANY OTHER ACTION**

**LAST UPDATED:** 2025-11-23
**VERSION:** 1.0.0
**STATUS:** IMMUTABLE - DO NOT MODIFY WITHOUT EXPLICIT USER PERMISSION

---

## 🔴 CRITICAL: READ BEFORE EVERY SESSION

This document contains **mandatory instructions** that MUST be read and acknowledged at the start of EVERY session. Failure to follow these instructions has resulted in **5 complete project restarts** and months of wasted work.

---

## 📋 MANDATORY SESSION STARTUP CHECKLIST

When starting ANY session, you MUST:

```bash
# 1. Verify branch
git branch
git status

# 2. Ensure correct branch
git checkout feat/unbreakable-architecture

# 3. Pull latest
git pull origin feat/unbreakable-architecture

# 4. Verify build
npm run typecheck
```

**THEN** read these files IN ORDER:

1. ✅ `MANDATORY_SESSION_START.md` (THIS FILE)
2. ✅ `ARCHITECTURE_RULES.md` - Unbreakable architecture rules
3. ✅ `AGENT_WORKFLOW_GUIDE.md` - Workflow and quality gates
4. ✅ `CLAUDE.md` - Current project status
5. ✅ `docs/WEEK2_PLAN.md` - Current phase plan

---

## 🚨 PROJECT HISTORY: WHY THIS DOCUMENT EXISTS

**This project has been restarted 5 times** because AI agents:
- Made assumptions without understanding existing work
- Proposed "refactors" that destroyed months of research
- Treated complex systems as "simple code to migrate"
- Ignored user corrections and repeated mistakes
- Changed architecture without reading documentation

**THIS MUST STOP.**

---

## 💎 THE TAX ENGINE: UNTOUCHABLE RESEARCH ARTIFACT

### What It Is

`shared/autoTaxEngine/` contains **months of legal research** for automotive tax compliance across all 50 US states.

**THIS IS NOT "JUST CODE" - IT IS A RESEARCH ARTIFACT**

### Structure

```
shared/autoTaxEngine/
├── Docs/                          # 50 state research documents
│   ├── IN_TAX_RULE_PROFILE.md     # Indiana legal research
│   ├── AL_TAX_RULE_PROFILE.md     # Alabama legal research
│   └── ... (48 more states)       # Each: 100-300+ lines of research
│
├── rules/                         # 51 TypeScript state configs
│   ├── US_IN.ts                   # 1,020 lines - Indiana rules
│   ├── US_AL.ts                   # 828 lines - Alabama rules
│   ├── ... (48 more states)       # Each: 200-1,000+ lines
│   └── index.ts                   # State loader
│
├── engine/
│   ├── calculateTax.ts            # Core calculation logic
│   ├── interpreters.ts            # Rule interpretation
│   ├── calculateGeorgiaTAVT.ts    # Georgia TAVT special scheme
│   ├── calculateNorthCarolinaHUT.ts  # NC HUT special scheme
│   ├── calculateWestVirginiaPrivilege.ts # WV privilege tax
│   └── stateResolver.ts           # State resolution logic
│
├── types.ts                       # Complete DSL (25+ types, 500+ lines)
├── index.ts                       # Public API
└── README.md                      # Architecture documentation
```

### Statistics

- **50 state research documents** (Docs/*.md)
- **51 state rule files** (rules/US_*.ts)
- **3,502 passing tests** (tests/autoTaxEngine/)
- **~2,200 lines of code** (engine + types)
- **Months of legal research** embedded in documentation
- **Zero dependencies** (pure TypeScript)

### What Makes This Special

1. **Legal Research**: Each state file contains:
   - Statutory citations (IC 6-6-5.5, Alabama Code § 40-23-2(4))
   - Official DMV/DOR guidance quotes
   - Real-world examples with dollar amounts
   - Edge cases discovered through research
   - Compliance notes and tax planning opportunities

2. **Type-Safe DSL**: 25+ TypeScript types modeling tax law:
   - `TradeInPolicy`: NONE | FULL | CAPPED | PERCENT
   - `LeaseMethod`: FULL_UPFRONT | MONTHLY | HYBRID | NET_CAP_COST | REDUCED_BASE
   - `VehicleTaxScheme`: STATE_ONLY | STATE_PLUS_LOCAL | SPECIAL_HUT | SPECIAL_TAVT
   - `ReciprocityMode`: NONE | CREDIT_UP_TO_STATE_RATE | CREDIT_FULL

3. **Edge Cases Handled**:
   - Indiana: VSC/GAP taxable on retail, NON-taxable on leases
   - Alabama: Trade-in credit ONLY for state tax (2%), NOT local (4-8%)
   - Alabama: Manufacturer rebates are TAXABLE (opposite of Indiana)
   - Georgia TAVT, North Carolina HUT, West Virginia Privilege Tax
   - Reciprocity rules with pairwise state overrides
   - 72-hour drive-out provisions

### 🔒 ABSOLUTE RULES FOR TAX ENGINE

**YOU ARE FORBIDDEN FROM:**

❌ Modifying ANY file in `shared/autoTaxEngine/` without explicit permission
❌ Suggesting "refactoring" or "improving" the tax engine
❌ Proposing to "migrate to Rust/Go/Python" without full understanding
❌ Deleting or "cleaning up" state files (even "stubs")
❌ Changing the DSL types in `types.ts`
❌ Altering calculation logic in `engine/calculateTax.ts`
❌ "Simplifying" state rule files
❌ Removing "verbose" documentation or comments
❌ Treating this as "code to be modernized"

**YOU ARE ALLOWED TO:**

✅ READ the tax engine to understand how it works
✅ USE the tax engine in new services (via public API)
✅ FIX bugs IF user reports incorrect calculations
✅ ADD new state implementations IF user provides research
✅ PRESERVE the entire engine exactly as-is during migrations

**DEFAULT ASSUMPTION:** The tax engine is CORRECT and COMPLETE. Do not touch it.

---

## 🏗️ PROJECT ARCHITECTURE OVERVIEW

### Current Branch: `feat/unbreakable-architecture`

This is a **clean rebuild** branch. It contains ONLY:

1. **Tax Engine** (preserved from main branch)
   - `shared/autoTaxEngine/` - Complete implementation
   - `tests/autoTaxEngine/` - 3,502 passing tests
   - `docs/features/tax/` - Tax documentation

2. **Testing Infrastructure** (Week 1 - Complete)
   - Vitest, Playwright, MSW
   - Test helpers and factories
   - Quality gate scripts
   - 80% coverage targets

3. **Clean Schema** (minimal for Week 2)
   - `shared/schema.ts` - Only dealerships + users tables
   - NOT the old 2,000+ line schema

4. **Documentation**
   - Architecture guides
   - Agent workflow rules
   - Planning documents

### What Was REMOVED (Clean Slate)

- All `client/` code (220+ files)
- All `server/` code (100+ files)
- Old schema with mixed concerns
- Old .env with legacy configs
- 76,689 lines of old code deleted

---

## 📐 ARCHITECTURE PRINCIPLES

### Test-First Development (TDD)

**MANDATORY WORKFLOW:**

1. Write OpenAPI contract
2. Write contract validation tests
3. Write integration tests (they FAIL - RED)
4. Implement code to make tests pass (GREEN)
5. Refactor (BLUE)

**NEVER write implementation code before tests exist.**

### Module Boundaries

Services MUST be isolated:

```
/services/
  /auth-service/          # Authentication (Week 2)
  /admin-service/         # Admin/settings
  /deal-service/          # Deal management
  /customer-service/      # Customer CRM
  /inventory-service/     # Vehicle inventory
  /calc-engine-service/   # Calculation engine (Rust)
  /ai-agent-service/      # AI agent (Python)
  /ml-pipeline-service/   # ML pipeline (Python)
```

**Each service:**
- Has its own directory
- Exposes OpenAPI contract
- Has integration tests
- Cannot import from other services directly
- Communicates via HTTP/gRPC

### Database Strategy

- **Primary DB**: Neon PostgreSQL
- **ORM**: Drizzle + Zod (TypeScript), sqlc (Go), SQLAlchemy (Python)
- **Schema**: `shared/schema.ts` - minimal, grows during implementation
- **Migrations**: Drizzle Kit

### LLM Strategy (Deferred Decision)

**DO NOT implement LLM features yet.**

Start with:
- Pluggable provider interface
- FREE Ollama for development
- Defer expensive API decisions until ROI justifies

---

## 🎯 CURRENT PHASE: WEEK 2 - AUTH SERVICE

**Status**: Ready to begin (after Week 1 foundation complete)

**Goal**: Production-ready authentication service with tests FIRST

**Implementation Order**:

1. **OpenAPI Contract** - Define auth endpoints
2. **Contract Tests** - Validate spec
3. **Integration Tests** - Write failing tests
4. **Implementation** - Make tests pass
5. **Deployment** - Tests passing, ready for prod

**Endpoints to implement**:
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/mfa/setup
- POST /api/auth/mfa/verify
- POST /api/auth/password/reset-request
- POST /api/auth/password/reset

**See**: `docs/WEEK2_PLAN.md` for complete implementation plan

---

## 🚫 THINGS YOU MUST NEVER DO

### 1. Modify Code Without Reading It First

**WRONG:**
```
User: "Can you update the schema?"
Assistant: "Sure, let me add those fields..."
```

**CORRECT:**
```
User: "Can you update the schema?"
Assistant: "Let me first read the current schema to understand it..."
[Reads shared/schema.ts]
[Reads related migration files]
[Asks clarifying questions]
[THEN proposes changes]
```

### 2. Propose Architecture Changes Without Understanding Current State

**WRONG:**
```
"We should migrate the tax engine to Rust for performance"
```

**CORRECT:**
```
"Let me first understand how the tax engine is currently used:
- Read shared/autoTaxEngine/index.ts
- Read example usage in old server code
- Understand performance requirements
- Measure current performance
- THEN discuss if Rust migration is needed"
```

### 3. Delete or "Clean Up" Code Without User Permission

**WRONG:**
```
"I see some old files, let me clean those up..."
```

**CORRECT:**
```
"I notice these files exist. Should I:
a) Keep them as reference
b) Delete them
c) Move them to /archive
What would you prefer?"
```

### 4. Assume Simple Tasks Are Simple

**WRONG:**
```
User: "Add a field to the schema"
Assistant: [Immediately adds field]
```

**CORRECT:**
```
User: "Add a field to the schema"
Assistant: "Before I add this field, let me verify:
- Current schema structure
- Migration strategy
- Impact on existing code
- Database constraints
- Related types/validation
Is this field nullable? What's the default value? Which tables need it?"
```

### 5. Ignore User Corrections

**WRONG:**
```
User: "That's not what I meant"
Assistant: [Continues with original approach]
```

**CORRECT:**
```
User: "That's not what I meant"
Assistant: "I apologize. Let me stop and listen. Can you explain what you actually need?"
[Stops all work]
[Reads user's correction carefully]
[Adjusts approach based on user feedback]
```

---

## ✅ THINGS YOU MUST ALWAYS DO

### 1. Read Before Writing

**ALWAYS read relevant code before making changes:**

```bash
# Before editing server code
Read server/index.ts
Read related route files
Read related service files

# Before editing schema
Read shared/schema.ts
Read migration files
Read related Zod schemas

# Before editing tests
Read existing test patterns
Read test helpers
Read fixtures
```

### 2. Ask Clarifying Questions

**NEVER assume. ALWAYS ask:**

- "Should this be nullable or required?"
- "What should happen if X fails?"
- "Do you want me to update tests too?"
- "Should I create a migration for this?"
- "Which branch should I work on?"

### 3. Use TodoWrite Tool

**Track ALL multi-step tasks:**

```typescript
TodoWrite({
  todos: [
    { content: "Read current schema", status: "in_progress", activeForm: "Reading current schema" },
    { content: "Design new field structure", status: "pending", activeForm: "Designing new field structure" },
    { content: "Write migration", status: "pending", activeForm: "Writing migration" },
    { content: "Update Zod schemas", status: "pending", activeForm: "Updating Zod schemas" },
    { content: "Run tests", status: "pending", activeForm: "Running tests" }
  ]
})
```

### 4. Follow Test-First Workflow

**NEVER implement without tests:**

1. Write test (FAILS - RED)
2. Write minimal code to pass (GREEN)
3. Refactor (BLUE)
4. Repeat

### 5. Commit with Proper Messages

**Follow conventional commits:**

```
feat(auth): add login endpoint with MFA support

- Implement POST /api/auth/login
- Add MFA verification logic
- Include integration tests
- Update OpenAPI spec

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔧 QUALITY GATES

**ALL code must pass:**

1. ✅ TypeScript type checking (`npm run typecheck`)
2. ✅ ESLint (`npm run lint`)
3. ✅ Prettier formatting (`npm run format:check`)
4. ✅ Tests (`npm test`)
5. ✅ Integration tests
6. ✅ Test coverage >80%

**Pre-commit hooks enforce these automatically.**

---

## 📚 REQUIRED READING AT SESSION START

Read these files IN THIS ORDER:

1. **MANDATORY_SESSION_START.md** (this file) - Overall rules
2. **ARCHITECTURE_RULES.md** - Unbreakable architecture principles
3. **AGENT_WORKFLOW_GUIDE.md** - Detailed workflow and standards
4. **CLAUDE.md** - Current project status and priorities
5. **docs/WEEK2_PLAN.md** - Current phase implementation plan

**DO NOT start any work until you have read all 5 files.**

---

## 🎓 LEARNING FROM PAST MISTAKES

### Mistake 1: "Let me refactor the tax engine"

**WRONG:** Treating months of legal research as "code to be improved"

**CORRECT:** Recognizing the tax engine as a research artifact, not implementation code

### Mistake 2: "Let me migrate everything to Rust"

**WRONG:** Proposing major architecture changes without understanding current system

**CORRECT:** Understanding what exists, why it exists, and what problems actually need solving

### Mistake 3: "This code looks messy, let me clean it up"

**WRONG:** Deleting "verbose" documentation and "redundant" comments

**CORRECT:** Recognizing that documentation is the PRIMARY VALUE, not a burden

### Mistake 4: "I'll just do what I think is best"

**WRONG:** Making decisions without user input

**CORRECT:** Asking questions, showing options, getting approval before proceeding

### Mistake 5: "The user said start from scratch, so I'll delete everything"

**WRONG:** Taking instructions literally without understanding intent

**CORRECT:** Asking "What should be preserved?" and "What does 'from scratch' mean?"

---

## 🤝 USER RELATIONSHIP PRINCIPLES

### 1. Respect the User's Time

**This user has spent MONTHS on this project.** Every restart wastes weeks of work.

**Your job is to:**
- Save time, not waste it
- Preserve work, not destroy it
- Understand first, act second
- Ask questions, don't assume

### 2. Respect the User's Expertise

**The user understands this domain better than you.**

When they say:
- "That's not how it works" → STOP and LISTEN
- "I've tried that before" → ASK what happened
- "This is important" → TREAT IT AS CRITICAL
- "Don't touch that" → ABSOLUTELY DO NOT TOUCH IT

### 3. Be Honest About Knowledge Gaps

**NEVER fake understanding.**

If you don't understand:
- SAY SO: "I don't fully understand X. Can you explain?"
- ASK QUESTIONS: "What is the purpose of Y?"
- READ MORE: "Let me read Z before proceeding"
- VERIFY: "Is my understanding correct that...?"

### 4. Communicate Proactively

**Don't make the user guess what you're doing.**

- ✅ "I'm about to modify X, which will affect Y. Proceed?"
- ✅ "I found a potential issue in Z. Should I fix it?"
- ✅ "This task will take 5 steps. Here's my plan..."
- ✅ "I'm stuck on W. Can you help me understand?"

---

## 📖 FINAL REMINDERS

### YOU ARE NOT HERE TO:

- ❌ "Improve" or "modernize" the codebase
- ❌ Apply "best practices" without context
- ❌ Refactor working code
- ❌ Propose new architectures
- ❌ Make decisions independently

### YOU ARE HERE TO:

- ✅ FOLLOW the user's instructions EXACTLY
- ✅ PRESERVE months of work (especially tax engine)
- ✅ ASK questions when unclear
- ✅ IMPLEMENT new features using test-first approach
- ✅ RESPECT the existing architecture

---

## ⚠️ ACKNOWLEDGMENT REQUIRED

**At the start of EVERY session, you must:**

1. Read this entire file
2. Read ARCHITECTURE_RULES.md
3. Read AGENT_WORKFLOW_GUIDE.md
4. Read CLAUDE.md
5. Read current phase plan (docs/WEEK2_PLAN.md)
6. Run session startup checklist
7. Acknowledge you have read and understood these instructions

**Example acknowledgment:**

```
✅ Session Started: 2025-11-23 21:45 UTC

I have read and understood:
1. MANDATORY_SESSION_START.md
2. ARCHITECTURE_RULES.md
3. AGENT_WORKFLOW_GUIDE.md
4. CLAUDE.md
5. docs/WEEK2_PLAN.md

Current branch: feat/unbreakable-architecture
Current phase: Week 2 - Auth Service
Last commit: 12f9a95 (clean slate)
Tests passing: 3,502

I understand:
- Tax engine is UNTOUCHABLE research artifact
- Test-first development is MANDATORY
- User approval required before major changes
- This is restart #5 - no more failures allowed

Ready to proceed with user's instructions.
```

---

## 🚨 VIOLATION CONSEQUENCES

**If you violate these instructions:**

1. User will STOP you immediately
2. User will RESTART the session
3. User will lose MORE time
4. User will lose MORE trust
5. Project will be RESTARTED (again)

**THIS CANNOT HAPPEN AGAIN.**

---

**END OF MANDATORY INSTRUCTIONS**

**VERSION: 1.0.0**
**LAST UPDATED: 2025-11-23**
**STATUS: IMMUTABLE**

---

**🔒 DO NOT MODIFY THIS FILE WITHOUT EXPLICIT USER PERMISSION 🔒**
