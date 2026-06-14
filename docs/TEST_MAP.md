# 테스트 맵

이 문서는 변경 종류별로 먼저 볼 테스트를 고르는 짧은 지도입니다.

## 기본 검증

| 범위 | 명령 |
|---|---|
| 타입 | `npx tsc --noEmit` |
| 유닛/통합 | `npm test` |
| 번들 | `npm run build` |
| 브라우저 smoke | `npm run test:e2e` |

## UI 테스트

| 변경 영역 | 우선 테스트 |
|---|---|
| Preact HUD mount/bridge | `src/ui/HudApp.test.ts`, `src/ui/mountHud.test.ts`, `src/ui/signals/bridge.test.ts`, E2E startup |
| 상단 HUD | `src/ui/TopHudController.test.ts`, E2E settings/language startup |
| 빌드 콘솔 | `src/ui/BuildConsoleController.test.ts`, E2E build/placement/cable |
| 우측 전술 패널 | `src/ui/TacticalPanelController.test.ts`, E2E startup/threat panel |
| Settings | `src/ui/SettingsController.test.ts`, E2E settings/language |
| Training Lab | `src/ui/TrainingLabController.test.ts`, E2E training lab |
| Mobile UI | `src/ui/MobileActionController.test.ts`, E2E `mobile-*` projects |
| Notifications/GameOver/Wave result | `src/ui/NotificationController.test.ts`, `src/ui/GameOverController.test.ts`, E2E wave/game-over/activity |
| HUD shell/localization | `src/ui/HudShellController.test.ts`, `src/ui/HudLocalizationController.test.ts`, E2E startup/language |

## Runtime 테스트

| 변경 영역 | 우선 테스트 |
|---|---|
| 설정/config | `src/config.test.ts`, `npm run build` |
| 저장/로드 | `src/utils/saveMigration.test.ts`, E2E save smoke |
| 튜토리얼 | `src/utils/tutorialFlow.test.ts`, `tests/e2e/tutorial-guidance.spec.ts` |
| 웨이브/적/경로 | `src/utils/waveSimulation.test.ts`, `src/utils/gridPath.test.ts`, `src/utils/geometry.test.ts`, E2E threat panel |
| 모델 훈련/GPU | `src/managers/TrainingPlannerManager.test.ts`, `src/utils/modelTrainingProgress.test.ts`, `src/utils/modelTrainingSummary.test.ts`, E2E Training Lab |
| 성능/대형 공장 | `npm test`, `npm run build`, `tests/e2e/performance.spec.ts` |

## 주의

- Phaser는 game world 렌더링을 유지하고, Preact는 DOM overlay만 담당합니다.
- DOM ID를 바꾸면 같은 단계에서 E2E selector도 같이 바꿉니다.
- 모바일은 일부 legacy compact HUD fallback을 호환 표면으로 유지합니다.
