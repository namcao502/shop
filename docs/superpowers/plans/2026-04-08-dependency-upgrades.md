# Dependency Upgrades Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all outdated packages to their latest versions: React 18→19, Tailwind 3→4, TypeScript 5→6, ESLint 8→10, plus minor bumps for postcss, @types/node, and eslint-config-next.

**Architecture:** Five sequential migration tasks ordered by risk (low→high). Each task ends with a passing `npm run build` before proceeding. No test framework — build is the verification gate. Tasks are independent once their predecessor passes build.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, ESLint 10

**Note:** No test framework is configured. Skip TDD steps. Verification = `npm run build` passing clean.

---

## File Structure

Files touched across all tasks:

| File | Task | Change |
|---|---|---|
| `package.json` | All | Version bumps |
| `src/app/globals.css` | 5 | `@tailwind` → `@import "tailwindcss"` |
| `postcss.config.mjs` | 5 | `tailwindcss` → `@tailwindcss/postcss` |
| `tailwind.config.ts` | 5 | Delete — content moves into CSS |
| `.eslintrc.json` | 4 | Delete — replaced by flat config |
| `eslint.config.mjs` | 4 | Create — ESLint 10 flat config |

All other changes are `npm install` + fixing TypeScript/lint errors surfaced by the build.

---

## Task 1: Low-risk package bumps

**Files:** `package.json`

No breaking changes. These just align versions.

- [ ] **Step 1: Update package.json**

```json
"devDependencies": {
  "@types/node": "^25",
  "eslint-config-next": "^16.2.2",
  "postcss": "^8.5.9"
}
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump @types/node, eslint-config-next, postcss to latest"
```

---

## Task 2: React 18 → 19

**Files:** `package.json`

React 19 removes `ReactDOM.render()` (not used — App Router uses `createRoot` internally). `forwardRef` is deprecated but still works. `@types/react` 19 is stricter on some prop types.

- [ ] **Step 1: Update package.json**

```json
"dependencies": {
  "react": "^19",
  "react-dom": "^19"
},
"devDependencies": {
  "@types/react": "^19",
  "@types/react-dom": "^19"
}
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Run build and note all TypeScript errors**

```bash
npm run build 2>&1 | head -80
```

- [ ] **Step 4: Fix any type errors**

Common React 19 type errors:
- `children` no longer implicit on FC — add `children?: React.ReactNode` to props if needed
- `ref` callback type changed — update `ref={(el) => ...}` signatures if flagged
- Any use of removed APIs like `defaultProps` on function components

Fix each error, re-run `npm run build` until clean.

- [ ] **Step 5: Verify build clean**

```bash
npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade React 18 → 19 and @types/react"
```

---

## Task 3: TypeScript 5 → 6

**Files:** `package.json`, potentially scattered `.tsx`/`.ts` files

TypeScript 6 tightens inference on generics and some `any`-widening patterns. `target: "ES2017"` and `moduleResolution: "bundler"` are still valid.

- [ ] **Step 1: Update package.json**

```json
"devDependencies": {
  "typescript": "^6"
}
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Run build and note all TypeScript errors**

```bash
npm run build 2>&1 | head -80
```

- [ ] **Step 4: Fix any type errors**

Common TS 6 issues:
- Stricter generic inference — add explicit type parameters where inference widens to `unknown`
- `declare module` augmentation changes — unlikely in this codebase
- Fix each error until build is clean

- [ ] **Step 5: Verify build clean**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: upgrade TypeScript 5 → 6"
```

---

## Task 4: ESLint 8 → 10 (flat config migration)

**Files:**
- Delete: `.eslintrc.json`
- Create: `eslint.config.mjs`
- Modify: `package.json`

ESLint 10 requires flat config format. The `next/core-web-vitals` and `next/typescript` presets are migrated via `FlatCompat` from `@eslint/eslintrc`.

- [ ] **Step 1: Update package.json**

```json
"devDependencies": {
  "eslint": "^10",
  "@eslint/eslintrc": "^3"
}
```

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Delete `.eslintrc.json`**

```bash
rm .eslintrc.json
```

- [ ] **Step 4: Create `eslint.config.mjs`**

```js
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Fix any errors before proceeding.

- [ ] **Step 6: Run build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json eslint.config.mjs
git rm .eslintrc.json
git commit -m "chore: migrate ESLint 8 → 10 with flat config"
```

---

## Task 5: Tailwind CSS 3 → 4

**Files:**
- Modify: `package.json`
- Modify: `postcss.config.mjs`
- Modify: `src/app/globals.css`
- Delete: `tailwind.config.ts`

Tailwind 4 ships a new CSS-first config system. The PostCSS plugin is now `@tailwindcss/postcss`. Content scanning is automatic. The `tailwind.config.ts` is replaced by `@theme` blocks in CSS. Our config is minimal (two CSS vars + no custom plugins), so migration is straightforward.

- [ ] **Step 1: Update package.json**

```json
"devDependencies": {
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4"
}
```

Remove `autoprefixer` if present (Tailwind 4 includes it).

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Update `postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 4: Update `src/app/globals.css`**

Replace the old directives and move theme variables into `@theme`:

```css
@import "tailwindcss";

/* Tailwind 4: @theme is top-level only — defines color utilities bg-background, text-foreground, etc. */
@theme {
  --color-background: #ffffff;
  --color-foreground: #171717;
}

/* Backward-compat aliases — keep these so any component using var(--background) directly still works */
:root {
  --background: var(--color-background);
  --foreground: var(--color-foreground);
}

/* Dark mode: override the CSS vars on :root, NOT inside @theme (which is top-level only) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0a0a0a;
    --color-foreground: #ededed;
  }
}

body {
  color: var(--color-foreground);
  background: var(--color-background);
  font-family: Arial, Helvetica, sans-serif;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 5: Verify CSS var usages compile correctly**

```bash
grep -r "var(--background)\|var(--foreground)\|bg-background\|text-foreground" src/
```

Both `var(--background)` (via aliases) and `bg-background` / `text-foreground` utility classes (via `@theme`) should resolve correctly. No further action needed unless grep reveals a different custom var pattern.

- [ ] **Step 6: Delete `tailwind.config.ts`**

```bash
rm tailwind.config.ts
```

- [ ] **Step 7: Run build**

```bash
npm run build
```

Fix any errors. Common Tailwind 4 issues:
- Utilities renamed (e.g. `shadow-sm` → check Tailwind 4 changelog for any removals)
- `@layer components` blocks in CSS may need to move to `@utility` blocks if they use Tailwind internals
- The `text-balance` utility is now built into Tailwind 4 natively — the `@layer utilities` block is harmless but redundant

- [ ] **Step 8: Visually verify in browser**

```bash
npm run dev
```

Check: home page, product list, cart, checkout, admin dashboard. Confirm layout and colors look correct.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json postcss.config.mjs src/app/globals.css
git rm tailwind.config.ts
git commit -m "chore: upgrade Tailwind CSS 3 → 4 with CSS-first config"
```

---

## Final verification

- [ ] Run `npm run build` one last time on the fully upgraded codebase
- [ ] Run `npm run lint` — should be clean
- [ ] Start `npm run dev` and smoke-test: home → product → cart → checkout flow, admin dashboard
- [ ] Push to remote
