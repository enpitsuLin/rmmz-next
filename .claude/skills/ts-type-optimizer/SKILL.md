---
name: ts-type-optimizer
description: >
  Performs exhaustive TypeScript type optimization on class files in this
  rmmz-vite project. Use this whenever the user says "优化类型", "类型优化",
  "极致的类型确认", "improve types", "add strict types", "type optimization",
  or asks to strengthen TypeScript annotations on a file. The workflow
  traces the full type hierarchy chain, adds explicit return types to all
  methods, converts to `import type` where applicable, and defines
  domain-specific literal union types.
---

# TypeScript Type Optimizer (rmmz-vite)

## Workflow

### Step 1: Read the target file

Read the entire target file. Note:
- Which base class it extends
- All imports (value and type)
- Which methods are missing explicit return types
- Which parameters use generic `number` but could be narrowed

### Step 2: Trace the type hierarchy

For each imported class/type in the file, **read its source** and catalog:
- Namespace types it exposes (e.g., `Game_CharacterBase.CharacterDirection`)
- Return types of methods that the target file calls or overrides
- Any literal union types or domain-specific type aliases

Key hierarchy to explore for character objects:
```
Game_CharacterBase → Game_Character → Game_Vehicle / Game_Player / Game_Event / Game_Follower
```

For battle objects:
```
Game_BattlerBase → Game_Battler → Game_Actor / Game_Enemy
```

### Step 3: Identify improvements

Go through every method and ask:

| Check | Action |
|-------|--------|
| Missing return type | Add `: void`, `: boolean`, `: number`, or the specific class type |
| `number` param that is a direction | Use `Game_CharacterBase.CharacterDirection \| 0` |
| `number` param that is a priority | Use `Game_CharacterBase.CharacterPriorityType` |
| `number[]` param that is trigger IDs | Define `EventTrigger = 0 \| 1 \| 2` in namespace |
| Import only used in type position | Convert to `import type { X }` |
| Class exported with trailing `export { X }` | Use `export class X` directly (consistent with `Game_Vehicle` etc.) |
| Method return type is an instance that could be `null` | Annotate as `ClassName \| null` |

### Step 4: Apply changes

Make all improvements in a single file write. Follow these rules:

**Return types** — add to every method, even trivial ones:
```typescript
// Before
isInBoat() { return this._vehicleType === 'boat' }

// After
isInBoat(): boolean { return this._vehicleType === 'boat' }
```

**Precise direction type** — when `Input.dir4` or a method returns a direction:
```typescript
getInputDirection(): Game_CharacterBase.CharacterDirection | 0 {
  return Input.dir4 as Game_CharacterBase.CharacterDirection | 0
}
```

**Namespace types** — define domain enumerations in a companion namespace:
```typescript
namespace Game_Player {
  /** Event trigger types (0=Action Button, 1=Player Touch, 2=Event Touch) */
  export type EventTrigger = 0 | 1 | 2
}
```

**import type** — convert if the import is only used in type annotations:
```typescript
// Before
import { Game_Vehicle } from './Game_Vehicle'

// After
import type { Game_Vehicle } from './Game_Vehicle'
```

### Step 5: Fix import order

This project uses `@antfu/eslint-config` (perfectionist sort-imports). The rule
requires **all `import type` blocks before all value `import` blocks**, grouped
by path depth. The canonical order for object files:

```typescript
// 1. type — external packages
import type { MZ } from 'rmmz-next/database-types'

// 2. type — parent directory (../)
import type { VehicleType } from '../types'

// 3. type — sibling directory (./)
import type { Game_CharacterBase } from './Game_CharacterBase'
import type { Game_Vehicle } from './Game_Vehicle'

// 4. value — parent directory (../)
import { AudioManager } from '../managers'

// 5. value — sibling directory (./)
import { Game_Character } from './Game_Character'
```

### Step 6: Verify

Check diagnostics (`mcp__ide__getDiagnostics`) after writing. Fix any ESLint
import-order or unused-import errors before finishing.

---

## RMMZ type reference

| Type | Value | Source |
|------|-------|--------|
| `Game_CharacterBase.CharacterDirection` | `2 \| 4 \| 6 \| 8` | `Game_CharacterBase` namespace |
| `Game_CharacterBase.CharacterPriorityType` | `0 \| 1 \| 2` | `Game_CharacterBase` namespace |
| `VehicleType` | `'boat' \| 'ship' \| 'airship' \| 'walk' \| ''` | `packages/rmmz-next/src/core/types/index.ts` |
| `MZ.Map.EncounterList` | `{ troopId, weight, regionSet }` | `rmmz-next/database-types` |
| `Game_Vehicle \| null` | nullable vehicle | `$gameMap.vehicle(type)` return |

## Non-null assertions

Use `vehicle()!` only inside branches that are logically guarded (e.g., after
`isInVehicle()` check). Do not scatter `!` without reasoning.

## What not to change

- Do not alter business logic or method bodies (only add/fix types)
- Do not add comments unless logic is non-obvious
- Do not add error handling or defensive checks not already present
- Do not rename any methods or fields
