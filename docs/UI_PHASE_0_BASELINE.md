# UI Phase 0 Baseline

작성일: 2026-06-04

## Scope

Phase 0은 UI 재개편 전 기준선 확보 단계입니다. 앱 UI, Phaser 월드, DOM ID, Playwright 셀렉터는 변경하지 않았습니다.

추가된 기준선 캡처 도구:

```powershell
node scripts\capture-ui-baseline.cjs
```

스크린샷 출력 위치:

```text
output/ui-baseline/2026-06-04-phase-0/
```

캡처 파일:

| 파일 | 목적 |
|---|---|
| `desktop-menu-1280x720.png` | Phaser 메인 메뉴 기준선 |
| `desktop-game-1280x720.png` | 데스크톱 인게임 HUD/우측 레일/빌드 콘솔 기준선 |
| `desktop-settings-1280x720.png` | 설정 모달 기준선 |
| `mobile-portrait-game-390x844.png` | 모바일 세로 HUD/action bar 기준선 |
| `mobile-landscape-game-844x390.png` | 모바일 가로 HUD/action bar 기준선 |

## Validation Results

| 명령 | 결과 | 메모 |
|---|---|---|
| `npm run build` | PASS | Vite production build 성공 |
| `npm test` | PASS | 28 files, 108 tests passed |
| `npm run test:e2e -- --workers=1` | PASS | 19 passed, 17 skipped. npm이 `--workers`를 config 경고로 처리해 실제 출력은 8 workers |
| `npx playwright test --workers=1` | PASS | 19 passed, 17 skipped. 실제 1 worker 기준선 |

## Guardrails For Next Phase

- `tests/e2e/app-smoke.spec.ts`의 `startGame()`은 현재 Phaser Text 메뉴와 좌표 클릭에 의존한다. DOM 메뉴 전환 전까지 유지한다.
- `#top-hud`, `#bottom-ui-container`, `#mission-panel`, `#threat-panel`, `#settings-modal`, `#mobile-action-*` ID는 다음 phase에서도 보존한다.
- Phase 1은 design tokens/CSS structure만 다루고, UIManager 분해나 메인 메뉴 DOM 전환은 진행하지 않는다.
