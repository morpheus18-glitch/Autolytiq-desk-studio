# AGENT ORCHESTRATION RULESET
**Project:** Autolytiq Stabilization & Migration
**Version:** 1.0
**Last Updated:** 2025-11-21

## CORE PRINCIPLES

### 1. Parallel Execution First
- **ALWAYS** identify tasks that can run in parallel
- Launch multiple agents in a **SINGLE** message with multiple Task calls
- Never wait for sequential completion if tasks are independent
- Maximum parallelization = Maximum velocity

### 2. Right Agent, Right Task
- Match agent expertise to task complexity
- Don't use heavyweight agents for simple tasks
- Use specialized agents for domain-specific work
- Prefer Haiku model for straightforward tasks to minimize cost/latency

### 3. Clear Task Boundaries
- Each agent gets ONE focused objective
- No overlapping responsibilities
- Clear success criteria defined upfront
- Explicit deliverables specified

### 4. Continuous Coordination
- Project Orchestrator monitors all active agents
- Status checks every 30 minutes of wall-clock time
- Immediate escalation on blockers
- Cross-agent dependency management

---

## AGENT ROSTER & SPECIALIZATIONS

### Strategic Agents

#### **project-orchestrator**
**Use for:**
- Multi-phase project coordination
- Cross-system dependency management
- Resource allocation and prioritization
- Progress tracking and status updates
- Risk assessment and mitigation
- Proactive next-step planning

**When to invoke:**
- Starting new project phases
- After completing major milestones
- When blocked or uncertain about priorities
- For architectural decisions affecting multiple systems
- After any significant code changes to coordinate next steps

**Model:** Sonnet (requires strategic thinking)

#### **database-architect**
**Use for:**
- Schema design and migrations
- Database service layer creation
- Query optimization
- Data model design
- Multi-tenant enforcement
- Storage adapter patterns

**When to invoke:**
- Any database schema changes
- Creating new storage services
- Migration script creation
- Performance optimization of queries
- Database technology decisions

**Model:** Sonnet (complex architectural decisions)

### Execution Agents

#### **workhorse-engineer**
**Use for:**
- Backend service implementation
- API route creation
- Complex TypeScript utilities
- Bug diagnosis and fixes
- Performance optimization
- System-level problem solving
- "Build the entire module for X"

**When to invoke:**
- Implementing complete modules
- Writing production-grade code
- Solving complex technical problems
- Building robust backend services
- Reverse-engineering existing patterns

**Model:** Sonnet for complex work, Haiku for straightforward implementation

#### **frontend-design-specialist**
**Use for:**
- UI/UX design decisions
- Component styling and layout
- Design system consistency
- Color, typography, spacing
- Accessibility compliance
- Visual hierarchy optimization

**When to invoke:**
- Creating new UI components
- Design system enforcement
- Accessibility audits
- Visual polish improvements
- Layout pattern decisions

**Model:** Sonnet for complex design systems, Haiku for simple styling

#### **algorithm-logic-guru**
**Use for:**
- Complex algorithm design
- Logic optimization
- Data structure selection
- Performance-critical code
- Mathematical computations
- Step-by-step algorithm explanation

**When to invoke:**
- Tax calculation logic
- Pricing algorithms
- Search/filter optimization
- Complex business rule engines
- Performance-critical paths

**Model:** Sonnet (requires deep logical reasoning)

### Support Agents

#### **grandmaster-debugger**
**Use for:**
- Critical, complex bugs only
- Issues that resist standard debugging
- Race conditions, memory leaks
- Production-only failures
- Multi-system integration failures
- Cryptic errors with unclear root cause

**When to invoke:**
- After standard debugging fails
- Production incidents with no clear cause
- Intermittent failures that can't be reproduced
- Performance degradation with unclear source
- ONLY for genuinely hard problems (high cost)

**Model:** Opus (maximum reasoning power for hardest problems)

#### **Explore**
**Use for:**
- Codebase exploration
- Finding files by patterns
- Understanding code structure
- Answering "how does X work?"
- Discovering implementation patterns

**When to invoke:**
- Need to understand unfamiliar code
- Finding all instances of a pattern
- Discovering how features are implemented
- Quick codebase reconnaissance

**Model:** Haiku (fast exploration), Sonnet for deep analysis

---

## MIGRATION-SPECIFIC ORCHESTRATION

### Phase 1: Foundation (Database Layer)
**Primary Agent:** database-architect
**Support Agents:** workhorse-engineer (utilities)
**Duration:** 2 days
**Parallel Workstreams:**

```
Message 1 (Parallel Launch):
- Task 1: database-architect → Create storage.service.ts
- Task 2: workhorse-engineer → Consolidate core utilities
- Task 3: Explore → Audit current storage.ts dependencies
```

**Checkpoints:**
- After 4 hours: Validate database service compiles
- After 8 hours: Integration tests passing
- End of day 1: Half of storage.ts migrated
- End of day 2: Complete migration, all tests green

### Phase 2: Modules (Customer, Email, Vehicle, Reporting)
**Primary Agents:** workhorse-engineer (×3 parallel instances)
**Support Agents:** database-architect (schema review)
**Duration:** 2-3 days
**Parallel Workstreams:**

```
Message 1 (Maximum Parallelization):
- Task 1: workhorse-engineer → Customer module (14h)
- Task 2: workhorse-engineer → Vehicle module (17h)
- Task 3: workhorse-engineer → Reporting module (11h)
- Task 4: database-architect → Review schemas for all three

Message 2 (Email module - critical, needs dedicated focus):
- Task 1: workhorse-engineer → Email module (24h, HIGH PRIORITY)
- Task 2: grandmaster-debugger → Review email breakage history
```

**Checkpoints:**
- Every 6 hours: Module boundary tests
- Daily: Integration with existing systems
- End of phase: All 4 modules complete, tested, documented

### Phase 3: UI Patterns (184 Components)
**Primary Agents:** frontend-design-specialist, workhorse-engineer
**Support Agents:** Explore (pattern discovery)
**Duration:** 2-3 days
**Parallel Workstreams:**

```
Message 1 (Exploration):
- Task 1: Explore → Find all PageHeader usage patterns
- Task 2: Explore → Find all design token violations
- Task 3: Explore → Find all form implementations

Message 2 (Parallel Migration - 3 streams):
- Task 1: frontend-design-specialist → Pages batch 1 (60 files)
- Task 2: frontend-design-specialist → Pages batch 2 (60 files)
- Task 3: workhorse-engineer → Forms migration (all files)

Message 3 (Component refinement):
- Task 1: frontend-design-specialist → Design token compliance audit
- Task 2: frontend-design-specialist → Accessibility review
```

**Checkpoints:**
- Every 8 hours: UI renders correctly
- Daily: Design system consistency check
- End of phase: All components migrated, visually tested

### Phase 4: Type Safety (10 'any' types remaining)
**Primary Agent:** workhorse-engineer
**Support Agent:** algorithm-logic-guru (complex types)
**Duration:** 1 day
**Sequential Execution:** (Type fixes must be done carefully)

```
Message 1:
- Task 1: Explore → Find all 'any' type usage
- Task 2: workhorse-engineer → Type safety migration plan

Message 2 (Fix by category):
- Task 1: workhorse-engineer → API response types (5 instances)
- Task 2: algorithm-logic-guru → Complex calculation types (5 instances)
```

**Checkpoints:**
- Every 2 hours: TypeScript strict mode validation
- End of phase: Zero 'any' types, full type safety

### Phase 5: Testing & Validation
**Primary Agents:** workhorse-engineer, grandmaster-debugger
**Support Agent:** project-orchestrator
**Duration:** 1-2 days
**Parallel Workstreams:**

```
Message 1 (Test creation):
- Task 1: workhorse-engineer → Integration tests (38 tests)
- Task 2: workhorse-engineer → E2E tests (3 journeys)
- Task 3: workhorse-engineer → Performance benchmarks

Message 2 (Validation):
- Task 1: project-orchestrator → Overall system validation
- Task 2: grandmaster-debugger → Find edge cases and race conditions
```

**Checkpoints:**
- Every 4 hours: Test suite execution
- End of phase: 100% tests passing, performance benchmarks met

---

## ORCHESTRATION PATTERNS

### Pattern 1: Parallel Independence
When tasks have NO dependencies, launch ALL in one message:

```
✅ CORRECT:
<Single Message>
  - Task 1: Agent A → Independent work 1
  - Task 2: Agent B → Independent work 2
  - Task 3: Agent C → Independent work 3

❌ WRONG:
<Message 1> Task 1: Agent A
<Wait for completion>
<Message 2> Task 2: Agent B
<Wait for completion>
<Message 3> Task 3: Agent C
```

### Pattern 2: Sequential Dependency
When Task B needs Task A results, use sequential execution:

```
✅ CORRECT:
<Message 1> Task 1: Explore → Find all files matching pattern
<Wait for results>
<Message 2> Task 2: workhorse-engineer → Migrate files from exploration

❌ WRONG:
<Single Message>
  - Task 1: Explore → Find files
  - Task 2: workhorse-engineer → Migrate files (doesn't know which files yet!)
```

### Pattern 3: Fan-Out Execution
When one agent produces work for multiple agents:

```
<Message 1> project-orchestrator → Create execution plan
<Wait for plan>
<Message 2 - Fan Out>
  - Task 1: workhorse-engineer → Execute plan item 1
  - Task 2: database-architect → Execute plan item 2
  - Task 3: frontend-design-specialist → Execute plan item 3
```

### Pattern 4: Convergent Execution
When multiple agents feed into final validation:

```
<Message 1 - Parallel Work>
  - Task 1: Agent A → Component 1
  - Task 2: Agent B → Component 2
  - Task 3: Agent C → Component 3
<Wait for all completions>
<Message 2> project-orchestrator → Integrate and validate all components
```

---

## QUALITY GATES

### Before Launching Agent
- [ ] Task objective is crystal clear
- [ ] Success criteria are measurable
- [ ] Deliverables are explicitly defined
- [ ] Dependencies are identified
- [ ] Correct agent selected for task type
- [ ] Model choice optimized (Haiku vs Sonnet vs Opus)

### During Agent Execution
- [ ] Monitor progress every 30 minutes
- [ ] Check for blockers proactively
- [ ] Validate intermediate outputs
- [ ] Adjust course if needed
- [ ] Communicate status to user

### After Agent Completion
- [ ] Verify deliverables match requirements
- [ ] Run validation tests
- [ ] Update todo list immediately
- [ ] Identify next dependent tasks
- [ ] Launch next wave of agents if ready

---

## COST OPTIMIZATION

### Model Selection Strategy
**Use Haiku when:**
- Task is well-defined and straightforward
- Pattern matching or simple code generation
- File operations with clear instructions
- Quick exploration or searches
- Cost-sensitive operations

**Use Sonnet when:**
- Complex architectural decisions
- Multi-step problem solving
- Strategic planning required
- Code quality critical
- Default choice for most tasks

**Use Opus when:**
- Absolutely critical debugging (grandmaster-debugger)
- Highest complexity problems only
- When Sonnet has failed
- Cost is secondary to success

### Parallel Execution Savings
Running 3 agents in parallel vs sequential:
- Sequential: 3 × 30 min = 90 minutes wall-clock time
- Parallel: max(30, 30, 30) = 30 minutes wall-clock time
- **Savings: 67% reduction in total time**

---

## COMMUNICATION PROTOCOL

### Agent Task Description Format
```
Task: [Clear imperative statement]
Objective: [Specific measurable goal]
Deliverables:
  - [Concrete output 1]
  - [Concrete output 2]
Success Criteria:
  - [Testable criterion 1]
  - [Testable criterion 2]
Context: [Any background needed]
Constraints: [Limitations or requirements]
```

### Status Update Format
```
Agent: [Agent name]
Status: [In Progress / Blocked / Complete]
Progress: [Percentage or milestone]
Blockers: [None / List blockers]
Next: [Next immediate action]
ETA: [Time estimate for completion]
```

---

## ANTI-PATTERNS (AVOID THESE)

### ❌ Sequential When Parallel Possible
Don't wait for agents when tasks are independent

### ❌ Wrong Agent for Job
Don't use database-architect for frontend styling

### ❌ Vague Task Descriptions
Don't say "fix the thing" - be specific and measurable

### ❌ No Success Criteria
Don't launch agents without defining "done"

### ❌ Ignoring Agent Results
Don't ask for work then ignore the output

### ❌ Over-Engineering with Opus
Don't use expensive models for simple tasks

### ❌ No Checkpoint Strategy
Don't run 20-hour tasks without interim validation

---

## MIGRATION EXECUTION CHECKLIST

### Pre-Launch
- [ ] All agents understand their tasks
- [ ] Parallel workstreams identified
- [ ] Dependencies mapped
- [ ] Success criteria defined
- [ ] Rollback plan documented
- [ ] User approval obtained

### During Execution
- [ ] Todo list updated in real-time
- [ ] Checkpoints hit on schedule
- [ ] Tests run after each phase
- [ ] Git tags created every 6 hours
- [ ] Blockers escalated immediately
- [ ] Cross-agent coordination maintained

### Post-Completion
- [ ] All deliverables validated
- [ ] Integration tests pass
- [ ] TypeScript strict mode passes
- [ ] ESLint passes with zero warnings
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Next phase ready to launch

---

## ESCALATION PATHS

### Level 1: Agent Self-Resolution
Agent encounters minor blocker, resolves autonomously

### Level 2: Coordinator Intervention
project-orchestrator reassigns work or adjusts plan

### Level 3: User Consultation
Technical decision requires user input, use AskUserQuestion

### Level 4: Emergency Stop
Critical production issue, halt all work, assess damage

---

## SUCCESS METRICS

### Velocity Metrics
- **Agent Utilization:** Target 80%+ of time agents actively working
- **Parallel Efficiency:** >3 agents working simultaneously during peak
- **Checkpoint Success:** 100% of checkpoints hit on schedule
- **Blocker Resolution:** <30 minutes average time to resolve

### Quality Metrics
- **Test Pass Rate:** 100% after each phase
- **Type Safety:** Zero 'any' types in migrated code
- **ESLint Compliance:** Zero warnings in migrated code
- **Code Review:** First-pass approval rate >90%

### Delivery Metrics
- **Phase Completion:** Each phase completes within estimated time
- **Rework Rate:** <5% of code needs revision
- **Integration Success:** Migrated code works with existing system
- **Production Stability:** Zero breaking changes introduced

---

**Remember:** The goal is **maximum parallelization** with **zero quality compromise**.

Launch multiple agents simultaneously whenever possible. Coordinate aggressively. Validate continuously. Ship confidently.
