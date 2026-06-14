# Korean English Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Korean-first language selector that can switch the game UI between Korean and English.

**Architecture:** Add a small local i18n module with typed language ids, translation dictionaries, and helpers for config labels. Store the selected language in localStorage and save data settings, then refresh DOM and Phaser UI surfaces when it changes.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, Playwright.

---

### Task 1: I18n Core

**Files:**
- Create: `src/i18n.ts`
- Test: `src/i18n.test.ts`

- [ ] Write failing Vitest coverage for default Korean, English switching, fallback behavior, and dictionary key parity.
- [ ] Implement `Language`, `DEFAULT_LANGUAGE`, `getLanguage`, `setLanguage`, `t`, and `getTranslatedConfigName`.
- [ ] Run `npm test -- src/i18n.test.ts` and confirm it passes.

### Task 2: Save Data

**Files:**
- Modify: `src/types.ts`
- Modify: `src/utils/saveMigration.ts`
- Modify: `src/utils/saveMigration.test.ts`
- Modify: `src/managers/SaveManager.ts`

- [ ] Add `language?: Language` to saved settings.
- [ ] Add failing migration coverage showing empty and old saves default to Korean and existing English is preserved.
- [ ] Save and load the selected language through `SaveManager`.
- [ ] Run `npm test -- src/utils/saveMigration.test.ts`.

### Task 3: UI Integration

**Files:**
- Modify: `index.html`
- Modify: `src/scenes/MainMenuScene.ts`
- Modify: `src/managers/SettingsUI.ts`
- Modify: `src/managers/UIManager.ts`
- Modify: `src/managers/MobileUIManager.ts`
- Modify: `src/managers/ResearchUI.ts`
- Modify: `src/utils/tutorialFlow.ts`
- Modify: `src/utils/tutorialFlow.test.ts`

- [ ] Mark static DOM labels with `data-i18n`.
- [ ] Add settings language buttons for Korean and English.
- [ ] Use `t()` for menu, HUD, settings, research, mobile controls, tutorial, build categories, and common log/status messages.
- [ ] Refresh visible UI after language changes.
- [ ] Update Playwright selectors to stable ids where language text changes.

### Task 4: Verification

**Files:**
- Modify: `tests/e2e/app-smoke.spec.ts`

- [ ] Add an E2E smoke check that default UI is Korean.
- [ ] Switch to English in settings and verify HUD/tutorial/settings labels update.
- [ ] Run `npm test`, `npm run test:e2e`, and `npm run build`.
