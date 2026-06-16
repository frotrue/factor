# 테스트 맵

이 문서는 변경 종류별로 먼저 볼 테스트를 고르는 짧은 지도입니다.

## 기본 검증

| 범위 | 명령 |
|---|---|
| 타입 | `npx tsc --noEmit` |
| 타입 npm script | `npm run typecheck` |
| 유닛/통합 | `npm test` |
| 번들 | `npm run build` |
| 브라우저 smoke desktop 기본 | `npm run test:e2e` |
| 브라우저 smoke 명시 실행 | `npm run test:e2e:desktop`, `npm run test:e2e:mobile` |

## UI 테스트

| 변경 영역 | 우선 테스트 |
|---|---|
| Preact HUD mount/bridge | `src/ui/HudApp.test.ts`, `src/ui/mountHud.test.ts`, `src/ui/signals/bridge.test.ts`, E2E startup |
| 상단 HUD | `src/ui/TopHudController.test.ts`, E2E settings/language startup |
| 빌드 콘솔 | `src/ui/BuildConsoleController.test.ts`, E2E build/placement/cable |
| 우측 전술 패널 | `src/ui/TacticalPanelController.test.ts`, E2E startup/threat panel |
| Settings | `src/ui/SettingsController.test.ts`, E2E settings/language |
| 렌더 해상도/HUD 배치 | `src/ui/renderResolution.test.ts`, `tests/e2e/hud-layout.spec.ts`, `npm run test:e2e:desktop` |
| Research Panel / ROC | `src/ui/ResearchPanelController.test.ts`, `src/managers/ResearchManager.test.ts`, E2E Research Panel/`RESEARCH_OPERATIONS_CENTER` smoke |
| Mobile UI | `src/ui/MobileActionController.test.ts`, E2E `mobile-*` projects |
| Notifications/GameOver/Wave result | `src/ui/NotificationController.test.ts`, `src/ui/GameOverController.test.ts`, E2E wave/game-over/activity |
| HUD shell/localization | `src/ui/HudShellController.test.ts`, `src/ui/HudLocalizationController.test.ts`, E2E startup/language |

## Runtime 테스트

| 변경 영역 | 우선 테스트 |
|---|---|
| 설정/config | `src/config.test.ts`, `npm run build` |
| 맵/자원 광맥 생성 | `src/managers/MapManager.test.ts`, `src/buildings/Miner.test.ts`, `src/config.test.ts` |
| 저장/로드 | `src/managers/SaveManager.test.ts`, `src/utils/saveMigration.test.ts`, E2E save smoke |
| 전력 효율 | `src/managers/PowerManager.test.ts`, `src/utils/powerPreview.test.ts`, 생산/케이블 관련 테스트 |
| 케이블 물류 | `src/utils/apRelay.test.ts`, E2E build/placement/cable |
| 독립 연구 | `src/managers/ResearchManager.test.ts`, `src/config.test.ts`, E2E research panel smoke |
| 튜토리얼 | `src/utils/tutorialFlow.test.ts`, `tests/e2e/tutorial-guidance.spec.ts` |
| 웨이브/적/경로 | `src/managers/WaveManager.test.ts`, `src/utils/waveSimulation.test.ts`, `src/utils/gridPath.test.ts`, `src/utils/geometry.test.ts`, E2E threat panel |
| MainScene 초기화 순서 | `src/managers/SaveManager.test.ts`, `src/managers/WaveManager.test.ts`, E2E startup/save/tutorial smoke |
| ROC/GPU 연구 처리량 | `src/managers/ResearchManager.test.ts`, `src/config.test.ts`, E2E `RESEARCH_OPERATIONS_CENTER` throughput smoke |
| 성능/대형 공장 | `npm test`, `npm run build`, `tests/e2e/performance.spec.ts` |

## 주의

- Phaser는 game world 렌더링을 유지하고, Preact는 DOM overlay만 담당합니다.
- DOM ID를 바꾸면 같은 단계에서 E2E selector도 같이 바꿉니다.
- 모바일은 일부 legacy compact HUD fallback을 호환 표면으로 유지합니다.
- `npm run test:e2e`는 desktop-only 기본값입니다. 모바일은 개발 재개 시 `npm run test:e2e:mobile`로 명시 실행합니다.
- 연구 economy sanity는 `src/config.test.ts`가 우선 고정합니다: `DATA_OUTPUT` material/tactical/system 1/1/1, `CORE_BASIC_RESEARCH` 300 material, first tactical entries 100 tactical, first system entries 1440 system과 desktop 10~14분 공급 window.
