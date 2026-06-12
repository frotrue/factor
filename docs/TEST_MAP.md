# 테스트 맵

자세한 실행 팁은 기존 [AUTOMATED_TESTING_GUIDE.md](./AUTOMATED_TESTING_GUIDE.md)도 함께 참고하세요. 이 문서는 다음 AI 세션이 “어떤 변경에 어떤 테스트를 봐야 하는지” 빠르게 고르기 위한 지도입니다.

## 현재 테스트 도구

- Vitest: 순수 함수, config 계약, manager/building 일부 단위 테스트
- Playwright: 실제 브라우저에서 Phaser canvas + DOM UI smoke 테스트
- Vite build: 타입/번들 검증 성격

## 테스트 실행 명령어

```powershell
npm test
npm run build
npm run test:e2e
npx playwright test --workers=1
node scripts\capture-ui-baseline.cjs
```

로컬 안정 기준은 `npx playwright test --workers=1`입니다. Playwright 브라우저가 없으면 `npx playwright install chromium`을 실행합니다.
UI 재개편 전 기준선 스크린샷과 Phase 0 검증 결과는 [UI_PHASE_0_BASELINE.md](./UI_PHASE_0_BASELINE.md)에 기록합니다.

## 테스트 구분

| 구분 | 위치 | 설정 | 용도 |
|---|---|---|---|
| 유닛/순수 로직 | `src/**/*.test.ts` | `vitest.config.ts` | config, i18n, utils, 일부 manager/building 검증 |
| E2E/smoke | `tests/e2e/*.spec.ts` | `playwright.config.ts` | 실제 브라우저 조작, DOM UI, PC HUD shell, 모바일/데스크톱 smoke, 튜토리얼 완료 흐름 |
| 빌드 | 전체 소스 | `vite.config.ts`, `tsconfig.json` | 번들/타입/에셋 참조 검증 |

## 테스트 파일 위치와 검증 대상

| 테스트 파일 | 검증 기능 |
|---|---|
| `src/config.test.ts` | config 참조, 건물 텍스처, Core footprint, 건물 HP, BLOCKER 지형 |
| `src/i18n.test.ts` | 기본 언어, 번역 fallback/key 동작 |
| `src/buildings/BaseBuilding.test.ts` | 공통 건물 상태와 기본 동작, 기본 그래픽 fallback, 정적 바디 텍스처 캐시 재사용 |
| `src/managers/EventBus.test.ts` | owner/callback 기반 이벤트 제거 |
| `src/managers/CableManager.test.ts` | 케이블 거리 비용, 최대 길이, 연구 길이 보너스, BLOCKER 충돌, `costPaid` 저장 |
| `src/managers/EffectsManager.test.ts` | 경고 마커 등 이펙트 manager 안정성 |
| `src/managers/GridRenderer.test.ts` | 그리드 청크 텍스처 캐시 재사용, forced redraw 시 stale 청크/텍스처 정리 |
| `src/managers/MapManager.test.ts` | 지형 blocker, seed 기반 캠페인 맵 재현, standard enemy route 경로 보장과 reserved lane 무장애물 검증, 불규칙 outer boundary terrain density, 긴 직선형 blocker 억제, 작은 blocker cluster cleanup, organic resource edge, starter 자원 보장, 캠페인 RESOURCE_RINGS 중반 자원 집중, 작은 튜토리얼 arena 맵, 튜토리얼/캠페인 wrapper 경로 분리. Tutorial/campaign 분리 검증은 random flake를 피하려고 fixed seed standard map을 사용 |
| `src/managers/PowerManager.test.ts` | dirty 상태에서만 전력망 rebuild가 실행되고 안정 tick에서는 skip되는지 검증 |
| `src/managers/ResearchManager.test.ts` | Lab 기반 시스템 프로토콜 진행도, 완료, 선행조건, 저장 복원 |
| `src/managers/TrainingPlannerManager.test.ts` | 자동 학습 planner의 90% hold, high-pressure 방어 정확도 선택, low-threat 시스템 프로토콜 선택, Lab/GPU power 변환 |
| `src/utils/apRelay.test.ts` | AP 자동 릴레이 source/target 선택 |
| `src/utils/cablePath.test.ts` | 자유각 케이블 거리 계산과 선분 tile 샘플링 |
| `src/utils/buildingLifecycle.test.ts` | 수동 제거와 전투 파괴 이벤트 의미 분리 |
| `src/utils/enemyBuildingInteraction.test.ts` | 적의 건물 공격 우선순위 |
| `src/utils/geometry.test.ts` | 멀티타일 건물 중심 좌표와 중심 기반 범위 tile 계산 |
| `src/utils/gridPath.test.ts` | 적 A* 경로 계산, blocker no-path, 선택적 8방향/strict diagonal corner rule, 초기 blocker 지형에서 Core center 도달 |
| `src/utils/powerPreview.test.ts` | 전력 범위 helper |
| `src/utils/productionSimulation.test.ts` | 장기 생산 라인 시뮬레이션 |
| `src/utils/saveMigration.test.ts` | 저장 데이터 기본값, HP/terrain/settings/buffer/mapType 보정, 적 HP 복원 clamp |
| `src/utils/tutorialFlow.test.ts` | 건물 역할 튜토리얼 단계/진행, 완료 메타, 시각 힌트 데이터, FIRST_WAVE/모델 학습 최종 단계 |
| `src/utils/waveSimulation.test.ts` | 웨이브 수량, 난이도, DDoS/boss, 경로, 브리핑 |
| `src/utils/waveBriefingKey.test.ts` | WaveManager briefing 중복 발행 방지 key |
| `src/utils/waveResultSummary.test.ts` | 웨이브 결과 요약 계산/문구 |
| `src/utils/progressionGates.test.ts` | 초반 목표 순서, 고급 시스템 gating |
| `src/utils/modelTrainingSummary.test.ts` | 모델 훈련 정확도/공격력/데이터/진행 요약 |
| `src/utils/modelTrainingProgress.test.ts` | 학습 데이터 가치, 요구량 1.3배 스케일, 소모 데이터량 기반 학습 시간, 선택된 정확도/공격력 보상, GPU 가속 계산 |
| `src/utils/runResultSummary.test.ts` | 게임오버/런 결과 요약 |
| `tests/e2e/app-smoke.spec.ts` | 시작, 카메라, 설정/언어, 레거시 연구 UI 제거, 배치/케이블/철거, save, 모바일 조작, Preact TopBar/RightRail/BuildConsole/TutorialPanel/Settings/WaveResult/MobileActionBar smoke. 배치 좌표는 시작 Core/Storage footprint와 겹치지 않는 smoke용 타일을 사용 |
| `tests/e2e/tutorial-guidance.spec.ts` | 튜토리얼 힌트 좌표, Preact tutorial startup smoke, 리소스 타일 정합성, 생산/케이블/전력/웨이브/모델 대상 기반 전체 튜토리얼 완료 후 새 캠페인 전환. 전환 후 튜토리얼 전용 건물이 남지 않았는지 별도 좌표 집합으로 확인 |
| `tests/e2e/performance.spec.ts` | Preact main menu start fallback과 topbar startup을 거친 뒤 desktop Chromium에서 100/500/1000 건물 fixture를 만들고 `PerformanceStats` summary와 1000 건물 autosave chunk 저장을 검증한 뒤, 성능 샘플을 리셋해 저장 후 p95 frame bound 회복을 별도로 검증 |

## 변경 유형별 추천 테스트

| 변경 영역 | 먼저 실행할 테스트 |
|---|---|
| `src/config.ts` 밸런스/ID | `npm test -- src/config.test.ts`, 관련 utils 테스트 |
| 건물 생산/버퍼 | `src/utils/productionSimulation.test.ts`, 관련 건물 테스트, E2E placement |
| 케이블/AP/Repeater | `src/managers/CableManager.test.ts`, `src/utils/cablePath.test.ts`, `src/utils/apRelay.test.ts`, `tests/e2e/app-smoke.spec.ts` cable tests |
| 전력망/오버레이 | `src/managers/PowerManager.test.ts`, `src/utils/powerPreview.test.ts`, `src/utils/geometry.test.ts`, E2E hotkeys/overlays |
| 웨이브/적/난이도 | `src/utils/waveSimulation.test.ts`, `gridPath.test.ts`, `geometry.test.ts`, `enemyBuildingInteraction.test.ts`, E2E threat panel. 적 이동 변경은 `CONFIG.DIRECTIONS`의 맵 검증 계약과 `BaseEnemy.findPath()`의 적 전용 방향을 분리해서 확인 |
| 저장/로드 | `src/utils/saveMigration.test.ts`, E2E save smoke |
| UI 텍스트/언어 | `src/i18n.test.ts`, E2E language smoke |
| Preact 상단 HUD/shortcuts | E2E startup/settings/modal/language smoke. Desktop app smoke verifies visible `preact-top-bar`, `preact-right-rail`, `preact-build-console` and legacy `#top-hud`/`#hud-right-rail`/`#bottom-ui-container`/`#build-console` hidden shadow state; mobile projects keep legacy compact fallback visible. Legacy HUD/settings/game-over/tooltip/activity/notification roots are runtime-created by `UIManager`, so selector smoke should wait for scene startup rather than assume static `index.html` markup. Language smoke verifies Preact TopBar labels/aria labels switch through the existing `languagechange` path while legacy HUD text remains attached for compatibility. TopBar labels and resource/power/wave-start/wave-timer HUD values should come from `src/ui/topHudDisplay.ts` common display payloads/snapshot helpers so legacy mirrors and Preact snapshots stay aligned, including direct bridge handling of `CORE_DATA_RECEIVED`/`POWER_UPDATED`/`WAVE_STARTED`/`WAVE_UPDATE`. `#preact-topbar-settings`는 기존 SettingsUI open path를, `#preact-topbar-research`/`#preact-topbar-lab`는 existing TrainingLabUI open path를 request로 호출하며 기존 `#btn-settings`, `#settings-modal`, `#training-lab-modal` DOM fallback을 유지하는지 확인. Settings open/close/language/speed/save smoke now uses Preact settings controls directly while asserting legacy `#settings-modal` stays attached, hidden, and synced as a shadow fallback. Training Lab smoke does the same for legacy `#training-lab-modal`. Preact shortcut buttons는 keyboard focusable하고 i18n-labeled HUD section 안에 있어야 함. StatCard는 `preact-topbar-stats` list와 stable `preact-stat-card/label/value-*` test IDs, label/value aria linkage를 유지해야 하며 data-scan animation은 표시 전용 local state이고 reduced motion에서 비활성 |
| Preact design shell | `npm run build`, E2E startup/perf smoke. Shared `GlassPanel` bevel/scanline/alert pulse는 DOM overlay CSS 전용이며 canvas render나 manager 로직을 건드리지 않는지 확인. Motion-sensitive animation은 `prefers-reduced-motion`에서 비활성 |
| Preact modal shell | E2E settings/focus/language/tutorial reset smoke, `npm run build`. `ModalOverlay` overlay click/ESC close는 close request만 발행하고 기존 `#settings-modal` 및 canvas focus restore 경로가 유지되는지 확인. `preact-modal-overlay`/`preact-modal-panel` expose the shell contract, and startup smoke verifies ESC close. `preact-settings-modal` is the visible accessible `role=dialog` surface linked to `preact-settings-title` and `preact-settings-note`; `preact-settings-close` is used by smoke/focus tests; legacy `#settings-modal` remains attached with `data-preact-shadow`/`aria-hidden` while open, keeps language text synced, and is hidden on close. Settings tabs and shared-button actions should be keyboard-focusable, settings tabs should expose tablist/tab semantics, active settings tabs should link to the visible `tabpanel`, segmented speed/language/FPS controls should expose grouped labels plus `aria-pressed` selected state, audio controls should expose a labeled master volume range plus muted `aria-pressed` state, and the bloom toggle should expose `aria-pressed`. Settings labels/open/input values should come from `src/ui/settingsDisplay.ts` common display payload so legacy shadow inputs and Preact snapshot stay aligned; open-only bridge events should use the settings display open-state helper. SettingsModal tutorial reset request는 legacy reset 버튼과 같은 tutorial restart path만 호출하는지 확인. Dim/blur/slide animation은 DOM overlay CSS 전용이며 reduced motion에서 비활성 |
| Preact 우측 레일 | E2E startup/threat panel/perf smoke, `npm run build`. Collapse 버튼은 Preact local state이며 keyboard focusable, `aria-expanded`/`aria-controls`, `preact-right-rail-toggle-*` test IDs를 유지하고 기존 `mission-panel`/`threat-panel`/`systems-panel` DOM fallback을 삭제하지 않는지 확인. Startup smoke verifies each visible panel is a labeled `role=region`, collapse removes/restores the body without touching legacy fallback, threat routes expose list semantics, and the threat/power shared ProgressBar surfaces expose localized `role=progressbar` contracts including `preact-right-rail-power-load`. RightRail labels/snapshot은 `tacticalPanelDisplay.ts` common display payload에서 나오며 legacy panel text를 다시 읽지 않아야 한다. Threat meter/routes는 `WaveBriefing` snapshot만 표시하므로 waveSimulation 계산 회귀와 분리 |
| Preact 빌드 콘솔 | E2E startup/interaction/mobile smoke, `npm run build`. PNG icon은 `public/assets/buildings/`에 있는 항목만 snapshot `iconSrc`로 노출하고 없는 build/cable/remove 항목은 swatch fallback을 확인. Preact category/tool controls는 keyboard focusable하고 stable click targets plus `preact-build-category-*`/`preact-build-tool-*` test IDs를 제공하며 active category tabs should link to the visible tool `tabpanel`; desktop and mobile portrait placement/cable/remove smoke now selects tools through these Preact controls. 실제 선택은 기존 `UIManager` request 경로가 처리해야 하며 short landscape에서는 Preact BuildConsole이 숨겨지므로 legacy fallback을 사용한다. Selected tool legacy panel과 Preact BuildConsole labels/snapshot은 `buildConsoleSnapshot.ts` common display payload에서 같이 나와야 한다. Tool buttons should keep `aria-describedby="preact-build-console-preview"`, and the preview should expose stable test IDs, `role=status`, polite atomic updates, and list semantics for stat chips. Hover/focus preview와 command strip은 `CONFIG.BUILDINGS`/`CONFIG.CABLES` 및 기존 hotkey 계약 표시만 하므로 build selection/hotkey/canvas placement 회귀를 함께 확인 |
| 메인 메뉴/난이도 | E2E startup/main-menu smoke. Preact MainMenu overlay가 보이는 메뉴를 담당하며 `#preact-main-menu-start` 우선 클릭, 저장 슬롯이 있을 때 `#preact-main-menu-continue`, i18n aria/tutorial/save status strip with polite live updates, described difficulty group label, stable `preact-main-menu-*` test IDs, and key-hint snapshot 표시, Arrow/Enter/C keyboard shortcuts가 기존 EventBus request만 발행하는지, 기존 Phaser text 객체/coordinate fallback, difficulty/loadSave 전달, tutorial/campaign mode 분기가 유지되는지 확인. MainMenu legacy fallback difficulty IDs/selected state and Preact snapshot should come from `src/ui/mainMenuDisplay.ts` common display payload |
| 모바일 조작/CSS | E2E `mobile-*` projects. PC HUD shell 변경 시 모바일 터치 지점이 HUD/빌드 콘솔에 가로막히지 않는지 확인. Preact MobileActionBar/MobileBuildSummary/BuildConsole 변경 시 keyboard/touch focusable controls, `aria-pressed`, cable action `aria-controls`/`aria-expanded`/`aria-haspopup`, cable menu `role=menu`, cable option `role=menuitemradio` plus `aria-checked`, MobileBuildSummary `aria-labelledby`/`aria-describedby` live status, `preact-mobile-action-*`, `preact-mobile-cable-*`, `preact-mobile-build-summary*`, `preact-build-category-*`, `preact-build-tool-*` test IDs, 44px 이상 touch target, icon+label text fit, 기존 `#mobile-action-*`, `#mobile-build-summary`, `#mobile-cable-menu`, `#bottom-ui-container`, `#build-console` 셀렉터와 터치 흐름 유지, short landscape 숨김을 확인. Mobile action/build smoke clicks Preact controls directly when visible and verifies legacy controls are hidden shadow fallbacks; short landscape falls back to legacy controls where the Preact surface is intentionally hidden, and still checks legacy active classes for compatibility. Legacy active state/build summary and Preact mobile labels/snapshot should come from `mobileActionDisplay.ts` common display payload |
| 툴팁/모바일 정보 시트 | E2E placement/hover smoke. Preact Tooltip 변경 시 기존 `#tooltip`, `#mobile-info-sheet`, `InputController` UI guard와 canvas pointer/touch 흐름이 유지되는지 확인. Desktop tooltip smoke hovers the Core through the real `InputController` path, verifies visible `preact-tooltip`, title/body linkage, and legacy `#tooltip` hidden shadow state. Desktop Preact tooltip 위치 보정과 close label은 snapshot 표시 전용이며 source pointer/world state를 바꾸지 않아야 함. Desktop/mobile legacy mirror input and Preact snapshot should come from `notificationDisplay.ts` tooltip display payloads. Preact close는 keyboard focusable `preact-tooltip-close`로 기존 `hideTooltip()` 경로만 호출해야 함 |
| 모델 훈련/GPU | `src/managers/TrainingPlannerManager.test.ts`, `src/utils/modelTrainingProgress.test.ts`, `src/utils/modelTrainingSummary.test.ts`, `src/utils/saveMigration.test.ts`, E2E Training Lab smoke. Preact TrainingLabModal 변경 시 기존 `TrainingLabUI` tab/job/auto/reward DOM fallback과 snapshot bridge가 유지되는지 확인. App smoke opens the Lab through `preact-topbar-lab`, verifies row title/detail linkage plus row data/work `role=progressbar` meters, clicks `preact-training-lab-auto`, verifies its `aria-pressed` state, clicks `preact-training-lab-reward-*`, `preact-training-lab-row-*`, `preact-training-lab-tab-*`, and close, then verifies `TrainingPlannerManager`, defense reward preference, legacy `#training-lab-modal` hidden shadow state, and canvas focus. Preact request는 기존 `TrainingLabUI` helper와 `ModelTrainingLab`/planner 경로를 재사용해야 하며, side panel이 실제 조작 표면이다. Training Lab side panel should expose a non-modal dialog role with title linkage, keyboard-focusable auto/tab controls, tablist/tab-to-panel semantics, row-labeled data/work progressbars with value text, and reward controls grouped with `aria-pressed` selected state while keeping `preact-training-lab-modal` stable. Legacy shell display and Preact snapshot labels/state should come from `trainingLabDisplay.ts` common display payload, and open-only bridge events should use the Training Lab display open-state helper. Row tone은 snapshot text/progress 표시 전용이라 training planner 계산을 직접 수행하지 않아야 함 |
| 튜토리얼/목표 패널 | `tutorialFlow.test.ts`, `progressionGates.test.ts`, `tests/e2e/tutorial-guidance.spec.ts`, E2E startup panels. 튜토리얼은 우측 정보 레일에 도킹되며 캔버스 고스트/흐름 힌트는 `tutorialFlow.visualHints`, `tutorialFlow.completion`, `TutorialManager` 완료 검사기를 함께 확인. Preact TutorialPanel labels/progress/current objective/typewriter UI는 snapshot 표시 전용이며 legacy `#tutorial-panel`은 hidden shadow fallback으로 sync된다. Preact skip button exposes `preact-tutorial-skip` and emits `TUTORIAL_SKIP_REQUESTED`, which must reuse the existing `completeAll({ transitionToCampaign: true })` path. Preact panel exposes `preact-tutorial-*` test IDs, role progressbar value text, and role list/listitem step semantics with exactly one `aria-current="step"` item without driving tutorial completion; desktop expects it visible, mobile expects it attached because CSS hides the desktop tutorial mirror below the responsive breakpoint |
| 게임오버/결과 요약 | `runResultSummary.test.ts`, `waveResultSummary.test.ts`, E2E wave/game-over/activity summary. Preact GameOverScreen/WaveResultCard/ActivityLog 변경 시 legacy `#game-over-screen`/`#btn-restart`, `.wave-result-card`, `#activity-log`와 reload/notification/log fallback 경로 유지 확인. Game-over smoke emits the existing `GAME_OVER` event, verifies the visible `preact-game-over-screen` modal dialog, localized integrity label, restart/main-menu action controls, integrity/model role progressbars with value text, stat card list semantics, legacy `#game-over-screen` hidden shadow state, and synced `#game-over-stats`. Wave summary smoke verifies visible `preact-wave-result-card`, title/integrity `aria-labelledby`/`aria-describedby` linkage, localized integrity label, role progressbar value/value text, stat/history list semantics with visible history label linkage, legacy `.wave-result-card` hidden shadow state, and synced summary text. Activity log smoke calls `UIManager.logMessage()`, verifies visible `preact-activity-log`, alert filter control with `aria-controls`/`aria-pressed`, and legacy `.log-entry` hidden shadow state; Preact labels/snapshot and legacy entry should come from `notificationDisplay.ts` common display payload. Tooltip open/close smoke should keep legacy `#tooltip`/`#mobile-info-sheet` hide state and Preact closed snapshot aligned through `notificationDisplay.ts`. Preact GameOver labels/stat cards/integrity/model meters와 WaveResult labels/integrity bar/stat chips/recent timeline은 snapshot 표시 전용이며 GameOver actions는 keyboard focusable `preact-game-over-*` controls로 기존 reload 경로만 호출해야 함. WaveResult close는 keyboard focusable `preact-wave-result-close`로 Preact signal만 닫되 `waveResultDisplay.ts` open-state helper를 사용해야 함. ActivityLog labels/alert/history controls는 snapshot 표시 전용이고 keyboard focusable `preact-activity-log-*` test IDs, alert pressed state, history expanded state, live role log region, and article entries를 제공하지만 기존 log append/remove lifecycle을 바꾸지 않음 |
| 캔버스 그래픽/팔레트 | `src/managers/GridRenderer.test.ts`, `npm run build`, `npm test`, `npx playwright test --workers=1`, 데스크톱 스크린샷. `visualTheme`, `GridRenderer`, `BaseBuilding`, `BaseEnemy`, `CableManager`, `OverlayController`를 함께 확인 |
| 성능/대형 공장 | `npm test`, `npm run build`, `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1` |

## 새 기능 추가 시 테스트 추가 기준

- 순수 계산으로 분리 가능한 규칙은 먼저 `src/utils/*.test.ts`를 추가합니다.
- 새 config 항목은 `src/config.test.ts`에 최소 계약을 추가합니다.
- 새 저장 필드는 `saveMigration.test.ts`에 구버전/누락 필드 복원 케이스를 추가합니다.
- 새 DOM UI나 실제 조작은 `tests/e2e/app-smoke.spec.ts`에 desktop/mobile 중 필요한 프로젝트만 추가합니다.
- PC 인게임 UI shell 변경은 `#top-hud`, `#mission-panel`, `#threat-panel`, `#bottom-ui-container`, `#tutorial-panel`, 빌드 카테고리 전환, 설정 모달 회귀를 함께 확인합니다.
- 캔버스 그래픽 패치는 테스트가 픽셀 아트를 직접 판정하지 않으므로 1280x720 스크린샷과 DOM 박스 좌표를 증거로 남깁니다.
- 새 건물은 최소한 생성, 비용/해금, 버퍼/생산, 저장 복원 중 위험한 축을 테스트합니다.
- 새 적/웨이브는 `waveSimulation.test.ts`로 수량/HP/브리핑을, `gridPath.test.ts`와 `geometry.test.ts`로 이동 경로/target 중심/blocked fallback을 먼저 고정하고, 필요하면 실제 E2E smoke를 보강합니다.

## 테스트 실패 시 먼저 확인할 부분

- Playwright startup 실패: `playwright.config.ts`의 포트 `5174`, 기존 Vite 서버, 브라우저 설치 여부
- DOM 셀렉터 실패: `index.html`, `UIManager`, `main.css`의 id/class/text 변경 여부
- Canvas 클릭 실패: viewport별 좌표, camera zoom/centering, `getScreenPointForTile()` 계산 영향
- Config 테스트 실패: `CONFIG.BUILDINGS` ID와 `BuildingFactory`, `types.ts`, texture 파일 누락
- Save migration 실패: `SaveData` 타입과 `migrateSaveData()` 기본값 불일치
- Wave 테스트 실패: `CONFIG.DIFFICULTY`, `CONFIG.ENEMIES`, `waveSimulation.ts`, `gridPath.ts`, `geometry.ts`, `waveBriefingKey.ts` 계산식 변경 영향
- 언어 테스트 실패: ko/en 키 중 한쪽만 추가했는지 확인

## CI/빌드 검증 흐름

현재 저장소 안에서 별도 CI 설정 파일은 확인하지 못했습니다. 로컬 기준 검증 순서는 다음이 안전합니다.

```powershell
npm test
npm run build
npx playwright test --workers=1
```

문서만 수정한 경우에는 테스트 실행이 필수는 아니지만, 링크/경로 검증과 git diff 확인은 필요합니다.
