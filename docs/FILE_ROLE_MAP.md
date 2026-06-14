# 파일 역할 맵

다음 세션이 소유 경계를 빠르게 잡기 위한 요약입니다. 세부 구현은 코드와 인접 테스트를 우선 확인하세요.

## App/Scene

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/main.ts` | Phaser Game 생성, Preact HUD mount, 디버그 전역 노출 | Phaser 생성 뒤 `mountHud()` 호출 유지 |
| `src/scenes/MainMenuScene.ts` | Phaser 메뉴 배경/입력 fallback, Preact menu snapshot/request 처리 | 보이는 메뉴 UI는 Preact가 담당 |
| `src/scenes/MainScene.ts` | 게임 runtime 조립, manager/controller 생성, scene lifecycle | simulation 변경과 DOM UI 변경을 섞지 않음 |

## Core Runtime

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/managers/BuildingManager.ts` | 건물 배치/생산/runtime 상태 | UI 표시 목적 변경 금지 |
| `src/managers/WaveManager.ts` | 웨이브 진행/브리핑/적 스폰 | HUD는 EventBus snapshot으로만 연결 |
| `src/managers/CableManager.ts` | 케이블 연결/큐 전송, 전력과 분리된 buffered item 이동, Repeater/AP 릴레이 | UI overlay와 직접 결합 금지 |
| `src/managers/EventBus.ts` | Scene/UI 간 이벤트 경계 | owner cleanup 유지 |
| `src/managers/PowerManager.ts` | 네트워크 전력 생산/소비, satisfaction, 건물 powerEfficiency 주입 | 저전력은 효율 저하로 처리 |
| `src/managers/ResearchManager.ts` | 독립 연구 슬롯, Insight buffer, throughput, 완료 효과 facade | Training Lab 시스템 연구와 분리 |
| `src/controllers/InputController.ts` | canvas/world 입력, DOM pointer guard | DOM 조작 대신 request 이벤트 사용 |
| `src/managers/TrainingPlannerManager.ts` | 모델 훈련 planner 상태 | Training Lab UI는 controller 경유 |

## UI Shell

| 파일 | 역할 | 주의 |
|---|---|---|
| `src/ui/UIManager.ts` | legacy DOM 보장, HUD controller 조립 shell | 세부 DOM 로직을 다시 키우지 않음 |
| `src/ui/mountHud.tsx` | Preact HUD root mount/unmount, signal bridge 연결 | remount/destroy cleanup 유지 |
| `src/ui/HudApp.tsx` | Preact overlay surface 조합 | main menu open 중 gameplay HUD 숨김 유지 |
| `src/ui/signals/*` | EventBus snapshot -> Preact signals bridge | simulation 직접 읽기 금지 |
| `src/ui/domEnvironment.ts` | mobile layout, focus, pointer guard helper | E2E/mobile selector 영향 큼 |

## UI Controllers

| 파일 | 역할 |
|---|---|
| `src/ui/TopHudController.ts` | resource/power/wave HUD 이벤트와 snapshot 발행 |
| `src/ui/TacticalPanelController.ts` | objective/wave/power/right rail snapshot 발행 |
| `src/ui/BuildConsoleController.ts` | build category/tool/hotkey/refresh request 처리 |
| `src/ui/SettingsController.ts` | settings modal request, legacy mirror, snapshot 발행 |
| `src/ui/TrainingLabController.ts` | Training Lab open/tab/job/reward request 처리 |
| `src/ui/ResearchPanelController.ts` | Research Panel open/select/start request 처리 |
| `src/ui/MobileActionController.ts` | mobile actions, cable menu, build summary 처리 |
| `src/ui/NotificationController.ts` | tooltip, activity log, wave result 표시 처리 |
| `src/ui/GameOverController.ts` | game-over event/action request 처리 |
| `src/ui/HudShellController.ts` | legacy shadow, ESC, speed mirror, build hotkey shell |
| `src/ui/HudLocalizationController.ts` | static DOM translation, language refresh fanout |

## UI Display/Legacy Helpers

| 범위 | 역할 |
|---|---|
| `src/ui/*Display.ts`, `src/ui/buildConsoleSnapshot.ts` | controller 입력을 legacy payload와 Preact snapshot으로 변환 |
| `src/ui/legacy*.ts` | 기존 DOM ID 호환 fallback 생성/동기화 |
| `src/ui/components/*` | 실제 Preact DOM overlay surface. ResearchPanel은 큰 내부 맵 캔버스를 스크롤해 노드 겹침 없이 표시 |
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
