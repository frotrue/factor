# 파일 역할 맵

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

다음 세션이 소유 경계를 빠르게 잡기 위한 요약입니다. 세부 구현은 코드와 인접 테스트를 우선 확인하세요.

## App/Scene

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/main.ts` | 저장된 렌더 해상도 프리셋으로 Phaser Game 생성, Preact HUD mount, 디버그 전역 노출 | Phaser 생성 뒤 render resolution sync와 `mountHud()` 호출 유지 |
| `src/scenes/MainMenuScene.ts` | Phaser 메뉴 배경/입력 fallback, Preact menu snapshot/request 처리 | 보이는 메뉴 UI는 Preact가 담당 |
| `src/scenes/MainScene.ts` | 게임 Scene lifecycle, public runtime state, frame update, 입력/cursor proxy | simulation 변경과 DOM UI 변경을 섞지 않음 |
| `src/scenes/MainSceneBootstrap.ts` | manager/controller 생성, 맵/Core/초기 Storage 배치, tutorial/save bootstrap | 기존 초기화 순서 보존 |
| `src/scenes/MainSceneRuntimeEvents.ts` | BUILDING/POWER/WAVE EventBus wiring, wave result summary, shutdown owner cleanup | EventBus 이벤트 이름과 owner cleanup 계약 유지 |

## Core Runtime

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/managers/BuildingManager.ts` | 건물 배치/생산/runtime 상태 | UI 표시 목적 변경 금지 |
| `src/managers/WaveManager.ts` | 웨이브 진행/브리핑/적 스폰 | 캠페인 첫 웨이브는 45초, 튜토리얼은 30초 시작 대기를 유지. HUD는 EventBus snapshot으로만 연결 |
| `src/managers/CableManager.ts` | 케이블 연결/큐 전송, 전력과 분리된 buffered item 이동, Repeater/AP 릴레이 | UI overlay와 직접 결합 금지 |
| `src/managers/EventBus.ts` | Scene/UI 간 이벤트 경계 | owner cleanup 유지 |
| `src/managers/PowerManager.ts` | 네트워크 전력 생산/소비, satisfaction, 건물 powerEfficiency 주입 | 저전력은 효율 저하로 처리 |
| `src/managers/MapManager.ts` | preset/seed 기반 지형과 자원 광맥 생성, resource lookup | 자원 종류 추가 시 `CONFIG.RESOURCE_PATCHES`, `GridRenderer`, 관련 맵 테스트와 함께 갱신 |
| `src/managers/GridRenderer.ts` | 청크 기반 그리드/지형/자원 광맥 렌더링 | 자원 광맥 색은 `CONFIG.RESOURCE_PATCHES`와 동기화 |
| `src/managers/ResearchManager.ts` | 단일 활성 연구, queue, 3종 research data store, throughput, 완료 효과 facade | `RESEARCH_OPERATIONS_CENTER`/GPU throughput과 save schema 영향 큼 |
| `src/controllers/InputController.ts` | canvas/world 입력, DOM pointer guard, 케이블 시작점/배치 실패 피드백 이벤트 | DOM 조작 대신 request 이벤트 사용 |

## UI Shell

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/ui/UIManager.ts` | legacy DOM 보장, HUD controller 조립 shell | 세부 DOM 로직을 다시 키우지 않음 |
| `src/ui/mountHud.tsx` | Preact HUD root mount/unmount, signal bridge 연결 | remount/destroy cleanup 유지 |
| `src/ui/HudApp.tsx` | Phaser canvas rect에 맞춘 HUD stage와 Preact overlay surface 조합 | main menu open 중 gameplay HUD 숨김 유지 |
| `src/ui/renderResolution.ts` | `Auto/1920/2560/3840` 렌더 해상도 프리셋 정규화, Phaser scale 적용, HUD stage rect 계산 | 저장은 `localStorage`; campaign save에 넣지 않음 |
| `src/ui/signals/*` | EventBus snapshot -> Preact signals bridge | simulation 직접 읽기 금지 |
| `src/ui/domEnvironment.ts` | mobile layout, focus, pointer guard helper | E2E/mobile selector 영향 큼 |

## UI Controllers

| 파일 | 역할 |
|---|---|
| `src/ui/TopHudController.ts` | resource/power/wave HUD 이벤트와 snapshot 발행 |
| `src/ui/TacticalPanelController.ts` | objective/wave/power/right rail snapshot 발행 |
| `src/ui/BuildConsoleController.ts` | build category/tool/hotkey/refresh request 처리, 튜토리얼 추천 도구 자동 선택 |
| `src/ui/SettingsController.ts` | settings modal request, legacy mirror, snapshot 발행 |
| `src/ui/ResearchPanelController.ts` | Research Panel open/select/start request, active/queue/data snapshot 발행 |
| `src/ui/MobileActionController.ts` | mobile actions, cable menu, build summary 처리 |
| `src/ui/NotificationController.ts` | tooltip, activity log, wave result 표시 처리 |
| `src/ui/GameOverController.ts` | game-over event/action request 처리 |
| `src/ui/HudShellController.ts` | legacy shadow, ESC, speed mirror, build hotkey shell |
| `src/ui/HudLocalizationController.ts` | static DOM translation, language refresh fanout |

## UI Display/Legacy Helpers

| 범위 | 역할 |
|---|---|
| `src/ui/*Display.ts`, `src/ui/buildConsoleSnapshot.ts` | controller 입력을 legacy payload와 Preact snapshot으로 변환. `tutorialPanelDisplay.ts`는 step/complete 모드와 캠페인 시작 버튼 라벨 계약을 만든다 |
| `src/ui/legacy*.ts` | 기존 DOM ID 호환 fallback 생성/동기화 |
| `src/ui/components/*` | 실제 Preact DOM overlay surface. BuildConsole은 preview 내용 변화에도 tool grid 좌표가 흔들리지 않도록 고정 도크 높이를 사용하고, ResearchPanel은 큰 내부 맵 캔버스를 스크롤해 노드 겹침 없이 표시 |
| `src/ui/shared/*` | GlassPanel, buttons, stat/progress 같은 공통 UI |

## Styles/Docs

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/styles/main.css` | reset과 Phaser mount 기본 스타일 | UI 세부 스타일 추가 금지 |
| `src/styles/tokens.css` | Preact/legacy 공용 디자인 토큰, `#preact-hud` root | `pointer-events: none` root 유지 |
| `src/styles/legacy-ui.css` | legacy fallback과 모바일 compact layout | DOM ID/E2E selector 영향 큼 |
| `docs/ARCHITECTURE.md` | 구조/flow 설명 | 큰 구조 변경 때만 갱신 |
| `docs/PROJECT_MAP.md` | 프로젝트 구성 요약 | 새 subsystem 추가 때 갱신 |
| `docs/TEST_MAP.md` | 변경별 테스트 선택 지도 | 테스트 파일 추가/삭제 때 갱신 |
| `docs/GAME_BALANCE_MAP.md` | 밸런스/수치 영향 지도 | 밸런스 변경 때 갱신 |
