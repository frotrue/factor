# 프로젝트 맵

다음 AI 세션이 전체 파일을 다시 훑지 않고도 빠르게 시작하기 위한 코드베이스 지도입니다. 파일별 세부 역할은 [FILE_ROLE_MAP.md](./FILE_ROLE_MAP.md), 런타임 관계는 [ARCHITECTURE.md](./ARCHITECTURE.md), 테스트 범위는 [TEST_MAP.md](./TEST_MAP.md), 밸런스 수치는 [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)를 먼저 함께 보세요. 전역 자동 학습 설계안은 [AUTO_TRAINING_PLANNER_DESIGN.md](./AUTO_TRAINING_PLANNER_DESIGN.md)에 있습니다.

## 프로젝트 목적과 현재 게임 개요

Gradium은 Phaser 3 + TypeScript + Vite 기반의 2D 공장 자동화/타워 디펜스 게임입니다. 대형 공장 성능 개선 구현 범위와 진행 상황은 [PERFORMANCE_IMPLEMENTATION_REPORT.md](./PERFORMANCE_IMPLEMENTATION_REPORT.md)에 정리되어 있습니다. 현재 1차 구현으로 기본 FPS target은 60으로 낮아졌고, UI objective/defense 패널과 웨이브 타이머 DOM 갱신은 매 프레임 작업에서 dirty/throttle 기반 작업으로 전환되었습니다.

핵심 플레이는 `Signal Packet -> Labeled Data -> Weight Update` 데이터 생산 라인을 만들고, 침입 포트에서 들어오는 적을 방어하며, Neural Operations Lab 작업으로 공장을 성장시키는 흐름입니다. Lab은 RAW_DATA/LABELED_DATA/WEIGHT_UPDATE를 각각 1/3/5 진행도로 소비해 방어 모델과 시스템 프로토콜 작업을 진행합니다. 방어 모델은 학습 시간을 거쳐 플레이어가 선택한 모드에 따라 정확도 또는 공격력 보너스를 올리며, 정확도 100% 이후에는 GPU Cluster를 Lab 옆에 붙여 학습 시간을 크게 줄일 수 있습니다. 현재 빌드는 난이도 선택, 건물 역할 중심 튜토리얼, 일반 캠페인과 분리된 작은 건물 학습용 튜토리얼 arena 맵, 큰 유한 캠페인 맵 bounds, 자원/지형 생성, 건물 배치/철거/회전, 컨베이어와 거리/장애물 제한이 있는 케이블/AP/Repeater 물류, 전력망, 웨이브, 저장/불러오기, 한국어/영어 UI, 데스크톱/모바일 조작을 포함합니다.

## 주요 기술 스택

- 런타임: Phaser 3, DOM HUD overlay용 Preact
- 언어: TypeScript, 일부 DOM HTML/CSS
- 번들러: Vite
- 유닛 테스트: Vitest
- E2E 테스트: Playwright
- 저장소 상태: `dist/`, `test-results/`, `node_modules/`가 로컬에 존재하지만 핵심 소스는 `src/`, E2E는 `tests/e2e/`, 문서는 `docs/`입니다.

## 폴더 구조 요약

| 경로 | 역할 |
|---|---|
| `src/main.ts` | Phaser 게임 인스턴스 생성, 전역 테스트 훅 노출, Preact HUD root 마운트 |
| `src/scenes/` | 메뉴와 실제 게임 Scene |
| `src/managers/` | 건물, 전력, 웨이브, 저장, UI, 맵, 아이템, 케이블 등 런타임 하위 시스템 |
| `src/buildings/` | 건물 기반 클래스와 건물별 동작 |
| `src/enemies/` | 적 런타임 객체와 이동/공격/특수 효과 |
| `src/controllers/` | 입력과 오버레이 그리기 로직 분리 |
| `src/visuals/` | 캔버스 그래픽 패치용 팔레트와 의미 색상 |
| `src/utils/` | 순수 로직/시뮬레이션/요약/마이그레이션/게이트 함수 |
| `src/styles/` | 얇은 전역 CSS, legacy DOM fallback/mobile compatibility CSS, Preact UI 디자인 토큰 |
| `src/ui/` | 점진 이전 중인 Preact DOM HUD overlay와 legacy DOM compat helpers. 현재는 signals bridge, MainMenu overlay with snapshot-localized aria label, root title/subtitle/status/key-hint described linkage, i18n tutorial/save status strip with polite live updates, described labeled difficulty group, keyboard shortcuts, stable test IDs, focusable start/continue/difficulty controls and `aria-pressed` difficulty state, 상단 TopBar with snapshot-localized labels, keyboard-focusable settings/research/Lab shortcuts and StatCard list/item label-value contract plus data-scan value feedback, 우측 RightRail with snapshot-localized labels, keyboard-focusable collapsible labeled tactical regions, stable panel/body/toggle test IDs and WaveBriefing threat progressbar/routes, interactive BuildConsole with snapshot-localized labels, available building PNG icons, swatch fallback, config-derived live tool preview with described tool buttons, keyboard-focusable category/tool controls, tab-to-tool-panel linkage, stable Preact test IDs, command strip and scroll hint, SettingsModal with snapshot-localized labels, title/note-linked accessible dialog surface, ModalOverlay shell IDs, keyboard-focusable tab/action controls, tab-to-panel linkage, labelled setting groups, grouped segmented controls with pressed state, labeled audio range and muted/bloom/save/load/tutorial action context, animated/ESC-aware ModalOverlay shell and tutorial reset request, TrainingLabModal non-modal dialog side panel with snapshot-localized labels, title/overview/planner/duration linkage, keyboard-focusable auto/tab controls with pressed/selected state, planner status region, tablist/tab-to-panel semantics, labelled grouped reward controls with pressed state, row title/detail/tone linkage, row-labeled data/work progressbar semantics, progress row tones, job/reward requests and close request, GameOverScreen mirror with snapshot-localized labels, title/failure described modal dialog semantics, integrity/model progressbar value text, stat card list semantics and grouped keyboard-focusable actions, WaveResultCard mirror with snapshot-localized labels, atomic title/integrity described status linkage, integrity label/value progressbar linkage, labelled/described stat chips, described recent result timeline list semantics and focusable close linked to the visible card, ActivityLog mirror with snapshot-localized labels, title-linked region, grouped keyboard-focusable alert/history filters with pressed/expanded state, live role log region and article entries, viewport-clamped Tooltip mirror with title/body linkage, body line list semantics and snapshot-localized close/test IDs, TutorialPanel mirror with snapshot-localized labels, title/detail/current linkage, role progressbar value text, role list/listitem step semantics, current step `aria-current`, stable test IDs, current objective focus and detail typewriter, MobileActionBar/MobileBuildSummary mirror with snapshot-localized labels, labeled action region, focusable actions, action label/icon linkage, aria-pressed/expanded/haspopup cable state, menuitemradio cable options with selected state, stable test IDs, larger touch targets and labeled/described atomic live bottom-sheet summary, shared GlassPanel tactical bevel/scanline shell, Button/StatCard/ProgressBar가 기존 DOM HUD와 공존. `mainMenuDisplay.ts`는 menu aria/title/difficulty/tutorial/save/key-hint labels를 Preact snapshot으로 변환을, `MainMenuScene`은 invisible Phaser menu hit-target fallback을, `topHudDisplay.ts`는 TopBar labels, resource/power/wave top HUD 표시 payload와 resource/power/wave-start/wave-timer 공통 display payload/snapshot helper를, `TacticalPanelController.ts`는 tactical/RightRail 이벤트 처리, render throttle, snapshot/legacy mirror coordination을, `buildConsoleSnapshot.ts`는 BuildConsole labels, item/selected-tool view-model과 selected-tool legacy panel/Preact snapshot 공통 display payload 조립을, `tacticalPanelDisplay.ts`는 RightRail labels, objective/WaveBriefing/timer/power/defense status 표시 payload와 common display payload/snapshot 변환을, `settingsDisplay.ts`는 SettingsController current state와 localized labels를 legacy settings input/open state와 Preact snapshot 공통 display payload로 변환하고 FPS/volume UI 입력값 정규화를, `trainingLabDisplay.ts`는 Training Lab localized labels, overview/planner/duration, Defense/System row view-model 조립과 legacy shell/Preact snapshot 공통 display payload 변환을, `tutorialPanelDisplay.ts`는 Tutorial active step/progress와 localized labels를 legacy panel 입력과 Preact snapshot 공통 display payload로 변환을, `mobileActionDisplay.ts`는 selected tool/action/cable-menu state, aria/menu labels를 legacy active/summary와 Preact MobileAction snapshot 공통 display payload로 변환을, `waveResultDisplay.ts`는 WaveResult labels/snapshot/card/log 공통 display payload 변환을, `gameOverDisplay.ts`는 GameOver labels/snapshot/stat line 공통 display payload 변환을, `GameOverController.ts`는 GAME_OVER/request 처리와 run summary/snapshot/legacy game-over mirror coordination을, `NotificationController.ts`는 tooltip/activity request 처리와 rolling activity state/snapshot 발행을, `notificationDisplay.ts`는 tooltip open/close/activity snapshot, tooltip close label, desktop/mobile tooltip legacy mirror input, tooltip close hidden marker, activity log localized labels/legacy entry와 표시 문구 조립을, `legacyHudDom.ts`는 static HTML에서 제거된 compatibility roots를 런타임 생성하고 shell shadow/modal/speed button fallback sync를, `legacyTopHud.ts`는 `#hud-score`/`#hud-power`/`#hud-wave`/`#hud-wave-timer`/`#hud-packets`/`#hud-silicon` fallback mirror를, `legacyTacticalPanels.ts`는 mission/threat/systems fallback refs/update를, `legacyBuildConsole.ts`는 `#ui-tabs`/`#ui-overlay`/selected tool fallback render와 build button active state sync를, `legacySettings.ts`는 `#settings-modal` refs/guard/open shadow/input active sync를, `legacyTrainingLab.ts`는 `#training-lab-modal` 생성/open shadow/shell/row render/control disabled sync를, `legacyTutorialPanel.ts`는 `#tutorial-panel` 생성/render/typewriter/skip/shadow/control disabled sync를, `legacyMobileControls.ts`는 `#mobile-action-*`/`#mobile-cable-menu`/`#mobile-build-summary` fallback 생성, active/shadow/menu/summary sync를, `legacyGameOver.ts`는 `#game-over-screen`/`#btn-restart`/`#game-over-stats` hidden shadow fallback lifecycle/control disabled sync를, `legacyNotifications.ts`는 wave/log/tooltip hidden shadow fallback lifecycle을, `domEnvironment.ts`는 mobile layout/short-landscape/canvas focus DOM environment helper를 담당한다. E2E smoke now clicks/checks selected Preact surfaces directly while preserving legacy DOM fallback selectors |
| `public/assets/buildings/` | Preact BuildConsole에서 사용할 수 있는 건물 텍스처 PNG와 legacy variant 보관 |
| `tests/e2e/` | Playwright smoke 및 조작 테스트 |
| `docs/` | 설계, QA, 로드맵, 코드베이스 지도 문서 |

`src/ui/UIManager.ts`는 legacy DOM 보장과 DOM UI controller 조립을 소유하며, 이전 `src/managers/UIManager.ts` re-export stub은 제거되었습니다.
`src/ui/BuildConsoleController.ts`는 BuildConsole category/tool/hotkey/refresh request를 소유하고, legacy console render/selection mirror와 `BUILD_CONSOLE_UPDATED` snapshot 발행을 조정합니다. BuildConsole preview는 표시용 config 메타만 다루며, 실제 건설/배치는 계속 Phaser scene/input 경로가 처리합니다.
`src/ui/HudShellController.ts`는 `HUD_SHELL_SYNC_REQUESTED`, `GAME_SPEED_CHANGED`, build hotkeys, ESC close를 받아 legacy shell shadow/speed/modal fallback과 canvas focus를 조정합니다. `src/ui/HudLocalizationController.ts`는 initial/static DOM translation과 `languagechange` refresh를 소유하고 build/tactical/mobile relocalize request를 발행합니다.
`src/ui/SettingsController.ts`는 Settings request/open/current-state ownership을 담당하며, legacy `src/managers/SettingsUI.ts` re-export stub은 제거되었습니다. EventBus owner도 `SettingsController`입니다.
`src/ui/TrainingLabController.ts`는 Training Lab request/open/current Lab state ownership을 담당하며, legacy `src/managers/TrainingLabUI.ts` re-export stub은 제거되었습니다. EventBus owner도 `TrainingLabController`입니다.

## 핵심 실행 흐름

1. `src/main.ts`가 `MainMenuScene`, `MainScene`을 Phaser 게임에 등록합니다.
2. `MainMenuScene`이 난이도 선택 또는 저장 슬롯 이어하기 요청 후 `MainScene`을 시작합니다.
3. `MainScene.create()`가 매니저를 생성하고, Scene 시작 데이터의 `mode`에 따라 작은 튜토리얼 arena 맵 또는 캠페인 랜덤 맵을 생성한 뒤 Core와 시작 Storage 배치, UI/입력/이벤트를 초기화합니다. `loadSave` 시작 플래그가 있으면 초기화 후 기존 `SaveManager.loadGame()`으로 캠페인 저장을 복원합니다.
4. 매 프레임 `MainScene.update()`가 커서, 그리드, 틱, 웨이브, 저장, UI refresh request, 카메라, 케이블, 이펙트, 오버레이를 갱신합니다.
5. `TickSystem`은 고정 틱으로 전력망, AP/케이블 데이터 전송, 건물 `onTick()` 생산/가공을 처리합니다.
6. `WaveManager`는 프레임 delta 기반으로 웨이브 카운트다운, 적 스폰, 적 업데이트, 웨이브 종료를 처리합니다.
7. `index.html`은 Phaser mount, `#preact-hud`, 앱 script만 제공하고 legacy shell은 정적으로 두지 않습니다. `main.ts`는 Phaser Game과 함께 Playwright용 `window.__GRADIUM_EVENT_BUS__` request hook을 노출해 E2E가 UIManager private mutator 대신 앱 이벤트를 발행하게 합니다. `src/ui/UIManager.ts` 초기화는 `src/ui/legacyHudDom.ts`의 `ensureLegacyHudDom()`을 호출해 `#game-hud-shell`을 필요 시 생성하고, 그 아래에 호환용 상단 상태바, 우측 정보 레일, 하단 빌드 콘솔 DOM IDs를 런타임 생성하며, settings/game-over/tooltip/activity/notification fallback roots도 생성합니다. Legacy `src/managers/UIManager.ts`, `src/managers/SettingsUI.ts`, `src/managers/TrainingLabUI.ts`, `src/managers/MobileUIManager.ts` re-export stub은 제거되었습니다. 하위 `SettingsController`, `TrainingLabController`, `MobileActionController`가 나머지 fallback UI를 관리합니다. 별도 레거시 research modal/stub은 제거되었고 research shortcut은 Training Lab SYSTEM 탭 request로 연결됩니다. `#preact-hud`는 Phaser canvas 및 기존 DOM HUD와 공존하는 새 Preact overlay root이며, `mountHud`는 re-mount 전 기존 overlay/bridge를 정리하고 Phaser Game `destroy` 때 unmount합니다. `MainMenuScene`/`UIManager`/`SettingsController`/`TrainingLabController`/`TutorialManager`/`MobileActionController`/`GameOverController`/`TopHudController`/`TacticalPanelController`/`BuildConsoleController`/`HudShellController`/`HudLocalizationController`가 발행하는 menu/HUD/tactical/build/settings/lab/game-over/wave-result/activity-log/tooltip/tutorial/mobile-action snapshot과 EventBus 데이터를 signals bridge가 받아 MainMenu overlay, TopBar, RightRail, BuildConsole, SettingsModal, TrainingLabModal side panel, GameOverScreen, WaveResultCard, ActivityLog, Tooltip, TutorialPanel, MobileActionBar/MobileBuildSummary를 갱신합니다. Signals bridge는 재연결 전 이전 EventBus owner listener, window language listener, wave-result timer를 teardown하고, 주요 HUD controller들도 Scene shutdown에서 자기 owner listener를 정리합니다. 데스크톱에서는 legacy `#top-hud`, `#hud-right-rail`, `#bottom-ui-container`, `#build-console`이 hidden shadow fallback이고 Preact TopBar/RightRail/BuildConsole이 실제 표면입니다. Mobile portrait에서도 Preact BuildConsole과 MobileActionBar/MobileBuildSummary가 실제 표면이며 legacy bottom/action DOM은 shadow fallback입니다. Short landscape에서는 세로 공간 때문에 legacy compact fallback이 계속 보입니다. TopBar shortcuts, SettingsModal controls, TrainingLabModal auto/job/reward controls, TutorialPanel skip은 기존 manager 경로로 request만 보냅니다. SettingsModal tutorial reset도 legacy tutorial restart 동작을 재사용하며, legacy `#settings-modal`, `#training-lab-modal`, `#game-over-screen`, `#game-over-stats`, `.wave-result-card`, `.log-entry`, `#tooltip`, `#mobile-info-sheet`, `#tutorial-panel`은 open 중 hidden shadow fallback으로 sync됩니다. Settings/Training Lab/Tutorial/GameOver legacy controls are disabled with `tabindex="-1"` while their Preact surfaces are open shadows. Legacy shell shadow/modal/speed button sync는 `src/ui/HudShellController.ts`와 `src/ui/legacyHudDom.ts`, static DOM translation/language refresh는 `src/ui/HudLocalizationController.ts`, Top HUD event/request handling and snapshot emission은 `src/ui/TopHudController.ts`, Top HUD display payload 변환은 `src/ui/topHudDisplay.ts`, Top HUD legacy stat mirror는 `src/ui/legacyTopHud.ts`, RightRail/tactical event handling and snapshot emission은 `src/ui/TacticalPanelController.ts`, RightRail labels/tactical legacy/Preact display payload 변환은 `src/ui/tacticalPanelDisplay.ts`, BuildConsole event/request handling, dependent mobile/HUD refresh request, and snapshot emission은 `src/ui/BuildConsoleController.ts`, settings request handling and snapshot emission은 `src/ui/SettingsController.ts`, settings legacy refs/guard/open/input sync는 `src/ui/legacySettings.ts`, BuildConsole labels/selected tool legacy/Preact display payload 변환은 `src/ui/buildConsoleSnapshot.ts`, Settings labels/input legacy/Preact display payload 변환은 `src/ui/settingsDisplay.ts`, Training Lab legacy modal shell/row render/control disabled sync는 `src/ui/legacyTrainingLab.ts`, Training Lab snapshot 변환은 `src/ui/trainingLabDisplay.ts`, Tutorial labels/panel legacy/Preact display payload 변환은 `src/ui/tutorialPanelDisplay.ts`, Tutorial legacy panel render/skip/control disabled sync는 `src/ui/legacyTutorialPanel.ts`, mobile action/build summary request handling and cable-menu state는 `src/ui/MobileActionController.ts`, mobile legacy action/cable/build-summary sync는 `src/ui/legacyMobileControls.ts`, mobile action labels/snapshot 변환은 `src/ui/mobileActionDisplay.ts`, mobile layout/short-landscape/canvas focus environment는 `src/ui/domEnvironment.ts`, game-over event/request 처리와 run summary 계산은 `src/ui/GameOverController.ts`, game-over 표시 payload 변환은 `src/ui/gameOverDisplay.ts`, legacy DOM open/restart/stats/control disabled 반영은 `src/ui/legacyGameOver.ts`가 담당합니다. RightRail collapse는 Preact local UI state이며 threat meter/routes는 existing `WaveBriefing` 메타를 표시합니다. BuildConsole preview는 config 메타를 표시할 뿐 실제 선택은 `BuildConsoleController` request 경로가, 실제 건설 상태는 기존 scene/input 경로가 처리합니다.
   `src/ui/NotificationController.ts`는 wave start/end feedback, wave-result/activity/tooltip request를 받아 snapshot과 legacy hidden fallback mirror를 발행하고, rolling activity history를 관리합니다.
   `src/ui/TopHudController.ts`는 resource/power/wave/frame refresh 이벤트를 받아 `HUD_STATE_UPDATED` snapshot과 legacy top HUD mirror를 동기화합니다.
   `src/ui/TacticalPanelController.ts`는 tactical/RightRail 이벤트를 받아 `TACTICAL_PANELS_UPDATED` snapshot과 legacy mission/threat/systems mirror를 동기화합니다.
   `src/ui/BuildConsoleController.ts`는 BuildConsole refresh/category/tool/hotkey 이벤트를 받아 `BUILD_CONSOLE_UPDATED` snapshot과 legacy build console/selected-tool mirror를 동기화합니다.
   `src/ui/HudShellController.ts`는 shell sync/speed/keyboard 이벤트를 받아 legacy HUD shell shadow와 modal fallback close를 동기화합니다.

튜토리얼 흐름은 `CORE -> RESOURCE -> POWER -> MINER -> STORAGE -> DOWNLOADER -> CABLE -> PROCESSOR -> TRAINER -> DEFENSE -> FIRST_WAVE -> MODEL_LAB`입니다. 고정 튜토리얼 맵의 실제 Silicon 패치를 먼저 보여주고, PowerNode로 그 패치에 전력을 연결한 뒤 Miner 생산을 확인합니다. 각 단계는 배치만이 아니라 Silicon/RAW_DATA/LABELED_DATA/WEIGHT_UPDATE 생산, 전력 온라인, 웨이브 종료, 모델 대상 선택 같은 상태 변화로 완료됩니다. 완료 또는 스킵 시 튜토리얼 진행 상태만 완료로 저장하고, 튜토리얼 공장을 이어받지 않는 새 캠페인 랜덤 맵으로 전환합니다. 튜토리얼 실행 중에는 일반 캠페인 저장 슬롯을 자동 저장하지 않습니다.

## 주요 엔트리포인트

- 앱 시작: `src/main.ts`
- 메뉴/난이도: `src/scenes/MainMenuScene.ts`
- 게임 런타임 조립: `src/scenes/MainScene.ts`
- 밸런스/설정 단일 원천: `src/config.ts`
- 타입 계약: `src/types.ts`
- DOM 뼈대: `index.html`
- 전역 스타일: `src/styles/main.css`, legacy fallback 스타일: `src/styles/legacy-ui.css`

## 중요한 설정 파일

| 파일 | 용도 |
|---|---|
| `package.json` | npm 스크립트와 Phaser/Vite/Vitest/Playwright 의존성 |
| `vite.config.ts` | Phaser 청크 분리와 빌드 경고 한도 |
| `vitest.config.ts` | `src/**/*.test.ts`만 Vitest 대상으로 지정 |
| `playwright.config.ts` | `tests/e2e`, 포트 `5174`, desktop/mobile 프로젝트 |
| `tsconfig.json` | ES2020, strict, bundler resolution, `src/**/*.ts/js` 포함 |
| `AGENTS.md` | UTF-8/Korean 출력 주의, 프로젝트 로컬 작업 규칙 |

## 빌드/테스트/실행 명령어

```powershell
npm install
npm run dev
npm run build
npm test
npm run test:e2e
npm run test:e2e -- --workers=1
```

Playwright는 `playwright.config.ts`가 자동으로 `npm run dev -- --host 127.0.0.1 --port 5174`를 띄웁니다. 로컬 안정 기준은 `--workers=1`입니다.

## AI가 먼저 읽어야 할 파일 목록

1. `docs/PROJECT_MAP.md`
2. `docs/ARCHITECTURE.md`
3. `docs/FILE_ROLE_MAP.md`
4. `docs/GAME_BALANCE_MAP.md`
5. `docs/TEST_MAP.md`
6. `src/config.ts`
7. `src/scenes/MainScene.ts`
8. `src/managers/TickSystem.ts`
9. `src/managers/WaveManager.ts`
10. `src/buildings/BuildingFactory.ts`
11. `src/types.ts`

## 자주 수정되는 파일과 이유

| 파일 | 자주 바뀌는 이유 |
|---|---|
| `src/config.ts` | 건물/적/연구/난이도/레시피 수치와 해금 조건의 중심 |
| `src/visuals/visualTheme.ts` | 인게임 그래픽 톤, 건물 카테고리/아이템/적/오버레이 색의 단일 팔레트 |
| `src/scenes/MainScene.ts` | 매니저 조립, 이벤트 연결, 런타임 상태 추가 지점 |
| `src/ui/UIManager.ts` | legacy DOM shell 보장, HUD 하위 controller/UI manager 조립 중심. 이전 managers 경로 re-export stub은 제거됨 |
| `src/styles/main.css` | body/canvas 기본 전역 스타일 |
| `src/styles/legacy-ui.css` | PC 인게임 legacy HUD shell, 모달/튜토리얼/모바일 회귀 레이아웃과 시각 상태 |
| `src/managers/WaveManager.ts` + `src/utils/waveSimulation.ts` + `src/utils/waveBriefingKey.ts` | 웨이브 압박, 브리핑, 난이도 조정 |
| `src/buildings/*` | 새 건물/건물별 생산/방어/물류 동작 |
| `src/managers/GridRenderer.ts`, `src/buildings/BaseBuilding.ts`, `src/enemies/BaseEnemy.ts` | 월드 그리드, 건물 프레임, 적 실루엣의 핵심 캔버스 그래픽. `GridRenderer`는 보이는 타일을 매 프레임 직접 재그리지 않고 청크 텍스처 캐시를 우선 사용하며, `BaseBuilding`은 공통 정적 바디를 타입/크기/색상별 텍스처로 재사용 |
| `src/utils/*` | 테스트 가능한 순수 로직 분리 지점. 적 경로는 `gridPath`, 멀티타일 중심/범위는 `geometry`, 건물 lifecycle 이벤트는 `buildingLifecycle`, 저장 적 HP 복원은 `enemyRestore`를 우선 확인 |
| `tests/e2e/app-smoke.spec.ts` | 실제 캔버스+DOM 흐름 회귀 검증 |

## 건드리면 위험한 파일 또는 주의 영역

- `src/config.ts`: 타입, UI 텍스트, 건물 팩토리, 연구 해금, 테스트가 모두 기대합니다. 새 건물은 `CONFIG.BUILDINGS`, `BuildingType`, `BuildingFactory`, i18n, UI 카테고리, 테스트를 함께 봐야 합니다.
- `src/scenes/MainScene.ts`: 매니저 초기화 순서에 암묵 의존성이 있습니다. 특히 `CableManager`, `ResearchManager`, `UIManager`, `TutorialManager` 생성 시점과 이벤트 해제(owner)가 중요합니다.
- `src/managers/EventBus.ts`: owner 기반 cleanup이 Scene shutdown과 테스트 안정성에 연결됩니다.
- `src/managers/SaveManager.ts` + `src/utils/saveMigration.ts` + `src/types.ts`: 저장 포맷 변경은 마이그레이션과 테스트를 같이 갱신해야 합니다.
- `src/managers/PowerManager.ts`: 전력망은 건물 `hasPower`를 직접 바꾸므로 생산/케이블/방어 전체에 영향이 큽니다.
- `src/managers/CableManager.ts`: 케이블 큐, 거리 비용, 최대 길이, BLOCKER 충돌, Repeater 경유, AP 자동 릴레이, 연구 보너스, 저장 큐 복원과 연결됩니다.
- `src/enemies/BaseEnemy.ts`: 이동/건물 공격/코어 피해/특수 적 효과가 한 파일에 모여 있어 밸런스 변경의 파급이 큽니다. 경로 계산은 `src/utils/gridPath.ts`, target/범위 중심은 `src/utils/geometry.ts` 테스트로 먼저 고정하세요.
- `index.html`, `src/styles/main.css`, `src/styles/legacy-ui.css`: Playwright가 DOM id와 텍스트 일부에 의존합니다. id 변경 시 E2E를 같이 수정하세요.

## 현재 문서화 기준의 불확실성

- 현재 worktree에는 이미 수정된 파일이 많습니다. 이 문서는 작업 시점의 로컬 파일 내용을 기준으로 작성했습니다.
- 밸런스 평가는 플레이 로그나 장시간 실측이 아니라 코드와 테스트에서 추론한 것입니다. [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)의 “추정” 표시를 확인하세요.


