---
name: ts-type-optimizer
description: >
  Optimize TypeScript types in a codebase: eliminate `any`, remove `@ts-expect-error`/`@ts-ignore`,
  add missing parameter/return types, and declare property types. Use this skill whenever the user asks
  to improve, fix, optimize, or tighten TypeScript types in a file, directory, or module — even if they
  don't say "type optimization" explicitly. Also trigger when the user asks to reduce type errors,
  make code stricter, or migrate toward strict TypeScript.
---

# TypeScript Type Optimizer

A systematic workflow for improving TypeScript type safety in a codebase. This skill handles
the full lifecycle: audit → plan → implement → verify.

## When This Skill Applies

- User asks to "optimize types", "fix type errors", "add types", "remove any" in TS files
- User wants to reduce `@ts-expect-error` or `@ts-ignore` directives
- User asks to make TypeScript code "stricter" or "more type-safe"
- User provides a directory/module and asks for type improvements

## Workflow Overview

```
1. Audit    → Quantify current type issues (tsc errors, any, @ts-expect-error, missing types)
2. Plan     → Prioritize files, identify dependencies, design type changes
3. Implement → Apply changes file by file in dependency order
4. Verify   → Run tsc + eslint, confirm no regressions
```

## Phase 1: Audit

Before making any changes, establish a baseline of the target scope.

### Quantitative scan

Run these commands to get metrics for the target directory:

```bash
# Count tsc errors in target scope
npx tsc --noEmit 2>&1 | grep -c "error TS"

# Count `any` usage (excluding comments and type-only files)
rg '\bany\b' --type ts <target-dir> -c

# Count @ts-expect-error / @ts-ignore
rg '@ts-expect-error|@ts-ignore' --type ts <target-dir> -c

# Count missing parameter types (untyped function params)
rg '\([^)]*\b\w+\s*[,)]' --type ts <target-dir> -c
```

### Qualitative scan

Read each file in scope. For each file, note:
- **Properties without type annotations** (especially class static/instance properties)
- **Methods missing parameter types** (count them)
- **Methods missing return types** (especially exported/public ones)
- **`any` usage** (distinguish necessary vs unnecessary)
- **`@ts-expect-error`** (understand why each exists — can it be eliminated?)
- **Implicit type casts or unsafe operations**

Record findings per file in a structured format before proceeding.

## Phase 2: Plan

### Dependency analysis

Some type changes require prerequisite work. Common patterns:

1. **Type definition files** (`.d.ts`, `types/index.ts`) often need updates first — e.g., adding
   missing interface methods so that downstream code can use proper types instead of `any`.
2. **Shared types** (interfaces, type aliases) used across files should be defined before the files
   that reference them.
3. **Base classes** should be typed before derived classes.

### Prioritize files

Order files from simplest to most complex:
1. Files with only missing parameter/return types (mechanical additions)
2. Files needing `any` → `unknown` or specific type replacements
3. Files needing `@ts-expect-error` elimination (requires understanding the root cause)
4. Files with complex dynamic patterns (dynamic property access, eval, runtime reflection)

### Change design per file

For each file, list the specific changes:
- Properties to add type annotations to
- Method parameters to type
- Return types to add
- `any` instances to replace (with what type)
- `@ts-expect-error` directives to eliminate (how)

## Phase 3: Implement

### Type replacement patterns

These patterns come up repeatedly. Apply the right one for each situation:

#### `any` → specific type

```typescript
// Before
static _cache: any = {}
// After
static _cache: Record<string, SomeType> = {}

// Before
function process(data: any) { ... }
// After — use `unknown` when the concrete type isn't known
function process(data: unknown) { ... }
```

Only keep `any` when genuinely unavoidable (e.g., `Record<string, any>` for truly dynamic
object manipulation like `JSON.parse` results that get assigned to arbitrary properties).

#### Eliminating `@ts-expect-error` for window/global access

A common pattern: accessing dynamic properties on `window` or global objects.

```typescript
// Before (with @ts-expect-error)
// @ts-expect-error
window[name] = value

// After — extract a typed helper
private static _setWindowData(name: string, value: unknown): void {
  ;(window as unknown as Record<string, unknown>)[name] = value
}
```

#### Eliminating `@ts-expect-error` for DOM event handlers

```typescript
// Before
// @ts-expect-error
script.onerror = this.onError.bind(this)

// After — use addEventListener
script.addEventListener('error', this.onError.bind(this))
```

#### Eliminating `@ts-expect-error` for platform-specific APIs

Some `@ts-expect-error` directives are legitimate — they guard access to APIs that only exist
in specific runtimes (NW.js, Electron, etc.). These can often be kept, but document why:

```typescript
// @ts-expect-error process.mainModule is NW.js-specific deprecated API
const base = path.dirname(process.mainModule.filename)
```

#### Class hierarchy type narrowing

When a method expects a subclass type but receives a base class:

```typescript
// Before — type error because Game_Battler doesn't have isBattleMember()
battler.isBattleMember()

// After — narrow with assertion when context guarantees the subtype
;(battler as Game_Actor | Game_Enemy).isBattleMember()
```

#### Adding property type declarations

For classes that initialize properties in an `init` method rather than at declaration:

```typescript
// Before — properties implicitly typed from assignment in initMembers()
class BattleManager {
  static initMembers() {
    this._phase = ''
    this._actor = null
  }
}

// After — explicit declarations with types
class BattleManager {
  static _phase: BattlePhase = ''
  static _actor: Game_Actor | null = null

  static initMembers(): void {
    this._phase = ''
    this._actor = null
  }
}
```

#### Non-null assertions

Use `!` only when the code logic guarantees non-null but TypeScript can't prove it:

```typescript
// OK — _logWindow is always set before updatePhase is called
this._logWindow!.startTurn()

// Better — use optional chaining if null is actually possible
this._logWindow?.startTurn()
```

#### Generic function return types

Always add explicit return types to exported/public methods:

```typescript
// Before
static load(filename) { ... }

// After
static load(filename: string): EffekseerEffect | null { ... }
```

### Implementation order

1. **Prerequisites**: Update type definition files, shared types, `.d.ts` shims
2. **Simple files**: Files needing only parameter/return type additions
3. **Medium files**: Files needing `any` replacements or `@ts-expect-error` elimination
4. **Complex files**: Files with many imports, class hierarchies, or dynamic patterns
5. **Largest files**: Save the most complex for last, when patterns are established

### Import conventions

Use `import type` for type-only imports (interfaces, type aliases used only in annotations).
This ensures they are erased at compile time and avoids circular dependency issues:

```typescript
import type { Game_Actor } from '../objects/Game_Actor'
import { Game_Action } from '../objects/Game_Action'  // value import — used at runtime
```

## Phase 4: Verify

After implementing all changes, run verification in this order:

### 1. TypeScript compiler check

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any new errors introduced by the changes. Common post-implementation issues:
- **Type mismatch in callers**: Other files may pass `any` to functions you just typed — update callers
- **Null assignment**: Setting `null` where the new type doesn't allow it — use `null!` or widen the type
- **Generic constraints**: Type parameters may need bounds after narrowing
- **Import errors**: Circular imports when adding `import type` — restructure or use interfaces

### 2. ESLint check

```bash
npx eslint <target-dir> 2>&1 | head -80
```

Common ESLint issues after type optimization:
- **Import ordering**: New imports may violate sorting rules — auto-fix with `npx eslint --fix`
- **Missing return types**: ESLint may require explicit return types that tsc doesn't
- **Unused imports**: Old `any`-typed imports may become unnecessary

### 3. Regression count

Compare before/after metrics:

| Metric | Before | After |
|--------|--------|-------|
| tsc errors (target) | X | Y |
| tsc errors (total) | X | Y |
| `any` count | X | Y |
| `@ts-expect-error` count | X | Y |
| ESLint errors | X | Y |

Report improvements and any remaining items that couldn't be addressed (with reasons).

## Things to Avoid

- **Don't over-assert**: Prefer type guards and narrowing over `as` casts. Use `as` only when
  TypeScript genuinely can't infer the type and you're confident about it.
- **Don't break runtime behavior**: Type changes should be compile-time only. If changing a type
  requires changing runtime logic, flag it to the user.
- **Don't add unnecessary generics**: Simple concrete types are better than over-abstracted generics.
- **Don't type internal/private helpers**: Focus on public API surface and property declarations.
  Internal lambda/arrow functions can rely on inference.
- **Don't fight the type system**: If a type assertion chain gets longer than 2 levels deep
  (`as unknown as Record<...>`), consider whether the underlying design needs rethinking.
  But if it's a one-off compatibility shim (e.g., NW.js globals), the chain is acceptable.
