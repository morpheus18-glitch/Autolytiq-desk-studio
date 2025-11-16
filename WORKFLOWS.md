# Replit Workflows & Scripts Guide

This document explains all available workflows and npm scripts for easier development and deployment.

## 📋 Available Workflows

Workflows can be run from the Replit interface by clicking the "Run" button dropdown and selecting the workflow.

### Development Workflows

#### **Project** (Default)
- **What it does**: Starts the development server with hot reload
- **When to use**: Daily development, testing features
- **Runs**: `npm run dev`
- **Waits for**: Port 5000 to be ready

#### **Restart Server**
- **What it does**: Kills all running processes and restarts dev server
- **When to use**: When the app is stuck or needs a clean restart
- **Runs**: `pkill -9 -f 'node|tsx' && sleep 2 && npm run dev`

### Testing Workflows

#### **Run Tests**
- **What it does**: Runs all unit tests once
- **When to use**: Before committing code
- **Runs**: `npm run test`

#### **Test Coverage**
- **What it does**: Runs tests and generates coverage report
- **When to use**: To check test coverage metrics
- **Runs**: `npm run test:coverage`

### Code Quality Workflows

#### **Type Check**
- **What it does**: Runs TypeScript type checking without building
- **When to use**: To verify type safety
- **Runs**: `npm run check`

#### **Full CI Check**
- **What it does**: Runs type check → tests → build (sequential)
- **When to use**: Before pushing to production or creating a PR
- **Runs**: Type check, tests, and production build in order

### Build & Deployment Workflows

#### **Build Production**
- **What it does**: Creates optimized production build
- **When to use**: Before deploying or testing production build
- **Runs**: `npm run build`
- **Output**: Creates `dist/` folder with compiled code

### Database Workflows

#### **Database Push**
- **What it does**: Pushes schema changes to the database
- **When to use**: After modifying `shared/schema.ts`
- **Runs**: `npm run db:push`
- **⚠️  Warning**: This modifies the production database!

#### **Database Backup**
- **What it does**: Creates a SQL backup of the current database
- **When to use**: Before major schema changes or migrations
- **Runs**: `pg_dump $DATABASE_URL > backup-[timestamp].sql`
- **Output**: Creates timestamped backup file

### Git Workflows

#### **Git Status**
- **What it does**: Shows current git status and recent commits
- **When to use**: To check what changes are uncommitted
- **Runs**: `git status && git log --oneline -5`

### Maintenance Workflows

#### **Clean Build**
- **What it does**: Removes build artifacts and cache
- **When to use**: When build seems corrupted or to free space
- **Runs**: `rm -rf dist node_modules/.vite`

---

## 🛠️ NPM Scripts

Run these from the terminal with `npm run [script-name]`

### Development Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server with hot reload |
| `restart` | `npm run restart` | Kill and restart development server |
| `logs` | `npm run logs` | Tail server logs in real-time |

### Build Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `npm run build` | Build production bundle (frontend + backend) |
| `start` | `npm run start` | Start production server (requires build first) |
| `clean` | `npm run clean` | Remove build artifacts and cache |
| `fresh` | `npm run fresh` | Clean, reinstall deps, and build |

### Testing Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `test` | `npm run test` | Run all tests once |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:ui` | `npm run test:ui` | Open Vitest UI interface |
| `test:coverage` | `npm run test:coverage` | Generate test coverage report |

### Code Quality Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `check` | `npm run check` | TypeScript type checking |
| `lint` | `npm run lint` | Run TypeScript linter |
| `ci` | `npm run ci` | Run all CI checks (type, test, build) |

### Database Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `db:push` | `npm run db:push` | Push schema changes to database |
| `db:generate` | `npm run db:generate` | Generate SQL migration files |
| `db:studio` | `npm run db:studio` | Open Drizzle Studio (database GUI) |

---

## 🚀 Common Development Tasks

### Starting Fresh
```bash
npm run fresh
npm run dev
```

### Before Committing Code
```bash
npm run ci  # Runs type check, tests, and build
git add .
git commit -m "Your message"
git push
```

### After Schema Changes
```bash
# 1. Make changes to shared/schema.ts
# 2. Push to database
npm run db:push
# 3. Test the changes
npm run dev
```

### Troubleshooting Server Issues
```bash
# If server is stuck or crashed
npm run restart

# If build seems corrupted
npm run clean
npm run build
npm run dev
```

### Checking Database
```bash
# Open Drizzle Studio to browse database
npm run db:studio

# Create backup before major changes
# Use "Database Backup" workflow from Replit UI
```

### Testing Before Deploy
```bash
# 1. Run full CI check
npm run ci

# 2. Test production build locally
npm run build
npm run start

# 3. If all good, deploy via Replit UI
```

---

## 📊 Workflow Diagram

```
Development Flow:
┌─────────────┐
│  npm run dev │
└──────┬──────┘
       │
       ├─→ Make changes
       │
       ├─→ npm run test (run tests)
       │
       ├─→ npm run check (type check)
       │
       └─→ git commit & push

Production Deploy Flow:
┌──────────────┐
│ npm run ci   │ (Full check)
└──────┬───────┘
       │
       ├─→ npm run build
       │
       ├─→ git push
       │
       └─→ Deploy via Replit UI

Database Changes Flow:
┌────────────────────┐
│ Edit schema.ts     │
└──────┬─────────────┘
       │
       ├─→ Database Backup workflow (optional)
       │
       ├─→ npm run db:push
       │
       └─→ npm run dev (test changes)
```

---

## 🎯 Best Practices

1. **Always run tests before committing**
   ```bash
   npm run ci
   ```

2. **Backup database before schema changes**
   - Use "Database Backup" workflow

3. **Use workflows for repetitive tasks**
   - Faster than typing commands
   - Consistent across team

4. **Check logs when debugging**
   ```bash
   npm run logs
   ```

5. **Clean rebuild when things break**
   ```bash
   npm run fresh
   ```

6. **Use Drizzle Studio for database inspection**
   ```bash
   npm run db:studio
   ```

---

## 🔧 Customizing Workflows

To add new workflows, edit `.replit` file:

```toml
[[workflows.workflow]]
name = "Your Workflow Name"
author = "agent"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "your command here"
```

For sequential tasks (one after another):
```toml
mode = "sequential"
```

For parallel tasks (run simultaneously):
```toml
mode = "parallel"
```

---

## 📚 Additional Resources

- **Replit Workflows Documentation**: https://docs.replit.com/programming-ide/workspace-features/workflows
- **Drizzle ORM**: https://orm.drizzle.team/
- **Vitest Testing**: https://vitest.dev/

---

**Last Updated**: 2025-11-16
**Maintained by**: Development Team
