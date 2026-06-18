# 프로젝트 맵

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

다음 AI 세션이 전체 파일을 다시 훑지 않고도 빠르게 시작하기 위한 코드베이스 지도입니다. 파일별 세부 역할은 [FILE_ROLE_MAP.md](./FILE_ROLE_MAP.md), 런타임 관계는 [ARCHITECTURE.md](./ARCHITECTURE.md), 테스트 범위는 [TEST_MAP.md](./TEST_MAP.md), 밸런스 수치는 [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)를 먼저 함께 보세요.

## 프로젝트 목적과 현재 게임 개요

Gradium은 Phaser 3 + TypeScript + Vite 기반의 2D 공장 자동화/타워 디펜스 게임입니다. 현재 빌드는 기본 FPS target 60을 기준으로 하며, UI objective/defense 패널과 웨이브 타이머 DOM 갱신은 dirty/throttle 기반 작업으로 처리합니다.

핵심 플레이는 `Signal Packet -> Labeled Data -> Weight Update -> Tactical Data` 데이터 생산 라인을 만들고, Research Lab/Neural Trainer/Data Center가 쌓는 3종 research data로 전역 연구를 진행하며, 침입 포트에서 들어오는 적을 방어하는 흐름입니다. Research Operations Center(`RESEARCH_OPERATIONS_CENTER`)는 전역 research throughput을 높이고 인접 GPU Cluster로 더 강화됩니다. 전력망은 네트워크 만족도 기반 `powerEfficiency`로 건물 작업 속도를 낮추며, 연구는 `Material/Tactical/System Data`와 throughput을 소비합니다. 데스크톱 기준 연구 pacing 목표는 첫 material research 약 4~6분, tactical chain 이후 tactical entry 약 7~10분, DataCenter 이후 system entry 약 10~14분입니다. 현재 빌드는 난이도 선택, 건물 역할 중심 튜토리얼, 일반 캠페인과 분리된 작은 건물 학습용 튜토리얼 arena 맵, 큰 유한 캠페인 맵 bounds, 자원/지형 생성, 건물 배치/철거/회전, 거리/장애물 제한이 있는 케이블/AP/Repeater 물류, 전력망, 웨이브, 저장/불러오기, 한국어/영어 UI, 데스크톱/모바일 조작을 포함합니다.

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
| `src/main.ts` | 렌더 해상도 프리셋 기반 Phaser 게임 인스턴스 생성, 전역 테스트 훅 노출, Preact HUD root 마운트 |
| `src/scenes/` | 메뉴와 실제 게임 Scene |
| `src/managers/` | 건물, 전력, 웨이브, 저장, UI, 맵, 아이템, 케이블 등 런타임 하위 시스템 |
| `src/buildings/` | 건물 기반 클래스와 건물별 동작 |
| `src/enemies/` | 적 런타임 객체와 이동/공격/특수 효과 |
| `src/controllers/` | 입력과 오버레이 그리기 로직 분리 |
| `src/visuals/` | 캔버스 그래픽 패치용 팔레트와 의미 색상 |
| `src/utils/` | 순수 로직/시뮬레이션/요약/마이그레이션/게이트 함수 |
| `src/styles/` | 얇은 전역 CSS, legacy DOM fallback/mobile compatibility CSS, Preact UI 디자인 토큰 |
| `src/ui/` | Preact DOM HUD overlay와 legacy DOM compat helpers. 현재 실제 표면은 MainMenu, TopBar(settings/research), RightRail, BuildConsole, SettingsModal, ResearchPanel(active/queue/data balances), GameOverScreen, WaveResultCard, ActivityLog, Tooltip, TutorialPanel, MobileActionBar/MobileBuildSummary입니다. `signals/bridge.ts`가 EventBus snapshots를 signals로 연결하고, `TopHudController`/`TacticalPanelController`/`BuildConsoleController`/`SettingsController`/`ResearchPanelController`/`MobileActionController`/`NotificationController`/`GameOverController`가 request와 snapshot 발행을 소유합니다. Legacy helpers는 hidden fallback DOM과 mobile compact compatibility만 유지합니다. |
| `public/assets/buildings/` | Preact BuildConsole에서 사용할 수 있는 건물 텍스처 PNG와 legacy variant 보관 |
| `tests/e2e/` | Playwright smoke 및 조작 테스트 |
| `docs/` | 설계, QA, 로드맵, 코드베이스 지도 문서 |

`src/ui/UIManager.ts`는 legacy DOM 보장과 DOM UI controller 조립을 소유하며, 이전 `src/managers/UIManager.ts` re-export stub은 제거되었습니다.
`src/ui/BuildConsoleController.ts`는 BuildConsole category/tool/hotkey/refresh request를 소유하고, legacy console render/selection mirror와 `BUILD_CONSOLE_UPDATED` snapshot 발행을 조정합니다. BuildConsole preview는 표시용 config 메타만 다루며, 실제 건설/배치는 계속 Phaser scene/input 경로가 처리합니다.
`src/ui/HudShellController.ts`는 `HUD_SHELL_SYNC_REQUESTED`, `GAME_SPEED_CHANGED`, build hotkeys, ESC close를 받아 legacy shell shadow/speed/modal fallback과 canvas focus를 조정합니다. `src/ui/HudLocalizationController.ts`는 initial/static DOM translation과 `languagechange` refresh를 소유하고 build/tactical/mobile relocalize request를 발행합니다.
`src/ui/SettingsController.ts`는 Settings request/open/current-state ownership을 담당하며, legacy `src/managers/SettingsUI.ts` re-export stub은 제거되었습니다. EventBus owner도 `SettingsController`입니다.
`src/ui/ResearchPanelController.ts`는 Research Panel open/select/start request와 `ResearchManager` snapshot 발행을 담당합니다.

## 핵심 실행 흐름

1. `src/main.ts`가 `gradium_render_resolution`을 읽어 `Auto/1920x1080/2560x1440/3840x2160` 내부 렌더 해상도를 정하고, `FIT` scale mode로 `MainMenuScene`, `MainScene`을 Phaser 게임에 등록합니다. `Auto`는 window resize를 따라가고 fixed preset은 선택한 내부 canvas size를 유지합니다.
2. `MainMenuScene`이 난이도 선택 또는 저장 슬롯 이어하기 요청 후 `MainScene`을 시작합니다.
3. `MainScene.create()`가 `MainSceneBootstrap`으로 매니저/controller 생성, 튜토리얼 arena 또는 캠페인 랜덤 맵 생성, Core와 시작 Storage 배치를 실행한 뒤 UI/입력을 초기화합니다. `MainSceneRuntimeEvents`는 BUILDING/POWER/WAVE EventBus 연결과 wave result summary, shutdown owner cleanup을 맡습니다. `loadSave` 시작 플래그가 있으면 초기화 후 기존 `SaveManager.loadGame()`으로 캠페인 저장을 복원합니다.
4. 매 프레임 `MainScene.update()`가 커서, 그리드, 틱, 웨이브, 저장, UI refresh request, 카메라, 케이블, 이펙트, 오버레이를 갱신합니다.
5. `TickSystem`은 고정 틱으로 전력망, AP/케이블 데이터 전송, 건물 `onTick()` 생산/가공을 처리합니다.
6. `WaveManager`는 프레임 delta 기반으로 웨이브 카운트다운, 적 스폰, 적 업데이트, 웨이브 종료를 처리합니다.
7. `index.html`은 Phaser mount, `#preact-hud`, 앱 script만 제공하고 legacy shell은 정적으로 두지 않습니다. `main.ts`는 Playwright용 `window.__GRADIUM_EVENT_BUS__` request hook을 노출합니다. `HudApp`은 MainMenu/TopBar/RightRail/BuildConsole/WaveResult/ActivityLog/TutorialPanel/Mobile HUD와 SettingsModal/ResearchPanel/GameOver/Tooltip을 배치하고, `signals/bridge.ts`는 각 controller snapshot을 Preact signals로 연결합니다. TopBar shortcuts는 Settings와 Research만 발행하고, Research Operations Center click도 Research Panel open request로 들어갑니다.
   `src/ui/NotificationController.ts`는 wave start/end feedback, wave-result/activity/tooltip request를 받아 snapshot과 legacy hidden fallback mirror를 발행하고, rolling activity history를 관리합니다.
   `src/ui/TopHudController.ts`는 resource/power/wave/frame refresh 이벤트를 받아 `HUD_STATE_UPDATED` snapshot과 legacy top HUD mirror를 동기화합니다.
   `src/ui/TacticalPanelController.ts`는 tactical/RightRail 이벤트를 받아 `TACTICAL_PANELS_UPDATED` snapshot과 legacy mission/threat/systems mirror를 동기화합니다.
   `src/ui/BuildConsoleController.ts`는 BuildConsole refresh/category/tool/hotkey 이벤트를 받아 `BUILD_CONSOLE_UPDATED` snapshot과 legacy build console/selected-tool mirror를 동기화합니다.
   `src/ui/HudShellController.ts`는 shell sync/speed/keyboard 이벤트를 받아 legacy HUD shell shadow와 modal fallback close를 동기화합니다.

튜토리얼 흐름은 `CORE -> RESOURCE -> POWER -> MINER -> STORAGE -> DOWNLOADER -> PROCESSOR_PLACE -> CABLE_START -> CABLE_CONNECT -> PROCESSOR -> TRAINER -> DEFENSE -> FIRST_WAVE -> RESEARCH_CENTER`입니다. 고정 튜토리얼 맵의 실제 Silicon 패치를 먼저 보여주고, PowerNode로 그 패치에 전력을 연결한 뒤 Miner 생산을 확인합니다. 각 단계는 추천 빌드 도구를 가질 수 있고, `BuildConsoleController`가 튜토리얼 중 해당 카테고리/도구를 자동 선택해 Phaser scene 선택 상태까지 동기화합니다. 케이블 학습은 Processor 배치, DataDownloader 시작점 클릭, Processor 끝점 클릭으로 나뉘며 지정된 `128,-32 -> 160,-32` Basic Cable 연결만 완료 처리합니다. 각 단계는 배치만이 아니라 Silicon/RAW_DATA/LABELED_DATA/WEIGHT_UPDATE 생산, 전력 온라인, 케이블 시작/연결, 웨이브 종료, Research Operations Center(`RESEARCH_OPERATIONS_CENTER`) 배치 같은 상태 변화로 완료됩니다. 완료 또는 스킵 시 바로 캠페인으로 넘어가지 않고 완료 패널을 표시하며, 플레이어가 “캠페인 시작”을 누르면 튜토리얼 공장을 이어받지 않는 새 캠페인 랜덤 맵으로 전환합니다. 튜토리얼 실행 중에는 일반 캠페인 저장 슬롯을 자동 저장하지 않습니다.

## 주요 엔트리포인트

- 앱 시작: `src/main.ts`
- 메뉴/난이도: `src/scenes/MainMenuScene.ts`
- 게임 런타임 조립: `src/scenes/MainScene.ts`, `src/scenes/MainSceneBootstrap.ts`, `src/scenes/MainSceneRuntimeEvents.ts`
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
npm run typecheck
npm test
npm run test:e2e          # desktop 기본
npm run test:e2e:desktop
npm run test:e2e:mobile   # 모바일 명시 실행
npm run test:e2e -- --workers=1
```

Playwright는 `playwright.config.ts`가 자동으로 `npm run dev -- --host 127.0.0.1 --port 5174`를 띄웁니다. 로컬 안정 기준은 `--workers=1`입니다. `npm run test:e2e`는 desktop-only 기본값이며, 모바일은 개발 재개 시 `test:e2e:mobile`로 명시 실행합니다.

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
| `src/config.ts` | 건물/적/연구 축/research data/난이도/레시피 수치와 해금 조건의 중심 |
| `src/visuals/visualTheme.ts` | 인게임 그래픽 톤, 건물 카테고리/아이템/적/오버레이 색의 단일 팔레트 |
| `src/scenes/MainScene.ts` | Scene lifecycle, public runtime state, frame update, 입력/cursor proxy 추가 지점 |
| `src/scenes/MainSceneBootstrap.ts` | 매니저/controller 생성 순서, 맵/Core/초기 Storage bootstrap 추가 지점 |
| `src/scenes/MainSceneRuntimeEvents.ts` | EventBus runtime wiring, wave result summary, shutdown owner cleanup 추가 지점 |
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
- `src/scenes/MainScene.ts` + `src/scenes/MainSceneBootstrap.ts` + `src/scenes/MainSceneRuntimeEvents.ts`: 매니저 초기화 순서와 EventBus owner cleanup에 암묵 의존성이 있습니다. 특히 `CableManager`, `ResearchManager`, `UIManager`, `TutorialManager` 생성 시점과 이벤트 해제(owner)가 중요합니다.
- `src/managers/EventBus.ts`: owner 기반 cleanup이 Scene shutdown과 테스트 안정성에 연결됩니다.
- `src/managers/SaveManager.ts` + `src/utils/saveMigration.ts` + `src/types.ts`: 저장 포맷 변경은 마이그레이션과 테스트를 같이 갱신해야 합니다.
- `src/managers/PowerManager.ts`: 전력망은 건물 `hasPower`를 직접 바꾸므로 생산/케이블/방어 전체에 영향이 큽니다.
- `src/managers/ResearchManager.ts`: 단일 활성 연구, queue, research data store, throughput, 연구 효과 facade를 소유하므로 config/schema/UI/save와 함께 변경해야 합니다.
- `src/managers/CableManager.ts`: 케이블 큐, 거리 비용, 최대 길이, BLOCKER 충돌, Repeater 경유, AP 자동 릴레이, 연구 보너스, 저장 큐 복원과 연결됩니다.
- `src/enemies/BaseEnemy.ts`: 이동/건물 공격/코어 피해/특수 적 효과가 한 파일에 모여 있어 밸런스 변경의 파급이 큽니다. 경로 계산은 `src/utils/gridPath.ts`, target/범위 중심은 `src/utils/geometry.ts` 테스트로 먼저 고정하세요.
- `index.html`, `src/styles/main.css`, `src/styles/legacy-ui.css`: Playwright가 DOM id와 텍스트 일부에 의존합니다. id 변경 시 E2E를 같이 수정하세요.

## 현재 문서화 기준의 불확실성

- 현재 worktree에는 이미 수정된 파일이 많습니다. 이 문서는 작업 시점의 로컬 파일 내용을 기준으로 작성했습니다.
- 밸런스 평가는 플레이 로그나 장시간 실측이 아니라 코드와 테스트에서 추론한 것입니다. [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)의 “추정” 표시를 확인하세요.


