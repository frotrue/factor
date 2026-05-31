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
npm run test:e2e -- --workers=1
```

로컬 안정 기준은 `npm run test:e2e -- --workers=1`입니다. Playwright 브라우저가 없으면 `npx playwright install chromium`을 실행합니다.

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
| `src/managers/MapManager.test.ts` | 지형 blocker, seed 기반 캠페인 맵 재현, standard enemy route 경로 보장과 reserved lane 무장애물 검증, 불규칙 outer boundary terrain density, 긴 직선형 blocker 억제, 작은 blocker cluster cleanup, organic resource edge, starter 자원 보장, 캠페인 RESOURCE_RINGS 중반 자원 집중, 작은 튜토리얼 arena 맵, 튜토리얼/캠페인 wrapper 경로 분리 |
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
| `tests/e2e/app-smoke.spec.ts` | 시작, 카메라, 설정/언어, 레거시 연구 UI 제거, 배치/케이블/철거, save, 모바일 조작 |
| `tests/e2e/tutorial-guidance.spec.ts` | 튜토리얼 힌트 좌표, 리소스 타일 정합성, 생산/케이블/전력/웨이브/모델 대상 기반 전체 튜토리얼 완료 후 새 캠페인 전환 |

## 변경 유형별 추천 테스트

| 변경 영역 | 먼저 실행할 테스트 |
|---|---|
| `src/config.ts` 밸런스/ID | `npm test -- src/config.test.ts`, 관련 utils 테스트 |
| 건물 생산/버퍼 | `src/utils/productionSimulation.test.ts`, 관련 건물 테스트, E2E placement |
| 케이블/AP/Repeater | `src/managers/CableManager.test.ts`, `src/utils/cablePath.test.ts`, `src/utils/apRelay.test.ts`, `tests/e2e/app-smoke.spec.ts` cable tests |
| 전력망/오버레이 | `src/utils/powerPreview.test.ts`, `src/utils/geometry.test.ts`, E2E hotkeys/overlays |
| 웨이브/적/난이도 | `src/utils/waveSimulation.test.ts`, `gridPath.test.ts`, `geometry.test.ts`, `enemyBuildingInteraction.test.ts`, E2E threat panel. 적 이동 변경은 `CONFIG.DIRECTIONS`의 맵 검증 계약과 `BaseEnemy.findPath()`의 적 전용 방향을 분리해서 확인 |
| 저장/로드 | `src/utils/saveMigration.test.ts`, E2E save smoke |
| UI 텍스트/언어 | `src/i18n.test.ts`, E2E language smoke |
| 모바일 조작/CSS | E2E `mobile-*` projects. PC HUD shell 변경 시 모바일 터치 지점이 HUD/빌드 콘솔에 가로막히지 않는지 확인 |
| 모델 훈련/GPU | `src/managers/TrainingPlannerManager.test.ts`, `src/utils/modelTrainingProgress.test.ts`, `src/utils/modelTrainingSummary.test.ts`, `src/utils/saveMigration.test.ts`, 필요 시 E2E build menu/modal smoke |
| 튜토리얼/목표 패널 | `tutorialFlow.test.ts`, `progressionGates.test.ts`, `tests/e2e/tutorial-guidance.spec.ts`, E2E startup panels. 튜토리얼은 우측 정보 레일에 도킹되며 캔버스 고스트/흐름 힌트는 `tutorialFlow.visualHints`, `tutorialFlow.completion`, `TutorialManager` 완료 검사기를 함께 확인 |
| 게임오버/결과 요약 | `runResultSummary.test.ts`, `waveResultSummary.test.ts`, E2E wave summary |
| 캔버스 그래픽/팔레트 | `src/managers/GridRenderer.test.ts`, `npm run build`, `npm test`, `npx playwright test --workers=1`, 데스크톱 스크린샷. `visualTheme`, `GridRenderer`, `BaseBuilding`, `BaseEnemy`, `CableManager`, `OverlayController`를 함께 확인 |

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
npm run test:e2e -- --workers=1
```

문서만 수정한 경우에는 테스트 실행이 필수는 아니지만, 링크/경로 검증과 git diff 확인은 필요합니다.
