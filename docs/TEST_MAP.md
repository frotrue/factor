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
| E2E/smoke | `tests/e2e/app-smoke.spec.ts` | `playwright.config.ts` | 실제 브라우저 조작, DOM UI, PC HUD shell, 모바일/데스크톱 smoke |
| 빌드 | 전체 소스 | `vite.config.ts`, `tsconfig.json` | 번들/타입/에셋 참조 검증 |

## 테스트 파일 위치와 검증 대상

| 테스트 파일 | 검증 기능 |
|---|---|
| `src/config.test.ts` | config 참조, 건물 텍스처, Core footprint, 건물 HP, BLOCKER 지형 |
| `src/i18n.test.ts` | 기본 언어, 번역 fallback/key 동작 |
| `src/buildings/BaseBuilding.test.ts` | 공통 건물 상태와 기본 동작 |
| `src/managers/EventBus.test.ts` | owner/callback 기반 이벤트 제거 |
| `src/managers/EffectsManager.test.ts` | 경고 마커 등 이펙트 manager 안정성 |
| `src/managers/MapManager.test.ts` | 지형 blocker, safe zone, 생성 규칙 |
| `src/utils/apRelay.test.ts` | AP 자동 릴레이 source/target 선택 |
| `src/utils/enemyBuildingInteraction.test.ts` | 적의 건물 공격 우선순위 |
| `src/utils/powerPreview.test.ts` | 전력 범위 helper |
| `src/utils/productionSimulation.test.ts` | 장기 생산 라인 시뮬레이션 |
| `src/utils/saveMigration.test.ts` | 저장 데이터 기본값, HP/terrain/settings/buffer 보정 |
| `src/utils/tutorialFlow.test.ts` | 튜토리얼 단계/진행 |
| `src/utils/waveSimulation.test.ts` | 웨이브 수량, 난이도, DDoS/boss, 경로, 브리핑 |
| `src/utils/waveResultSummary.test.ts` | 웨이브 결과 요약 계산/문구 |
| `src/utils/progressionGates.test.ts` | 초반 목표 순서, 고급 시스템 gating |
| `src/utils/modelTrainingSummary.test.ts` | 모델 훈련 입력 효과/요약 |
| `src/utils/runResultSummary.test.ts` | 게임오버/런 결과 요약 |
| `tests/e2e/app-smoke.spec.ts` | 시작, 카메라, 설정/연구/언어, 배치/케이블/철거, save, 모바일 조작 |

## 변경 유형별 추천 테스트

| 변경 영역 | 먼저 실행할 테스트 |
|---|---|
| `src/config.ts` 밸런스/ID | `npm test -- src/config.test.ts`, 관련 utils 테스트 |
| 건물 생산/버퍼 | `src/utils/productionSimulation.test.ts`, 관련 건물 테스트, E2E placement |
| 케이블/AP | `src/utils/apRelay.test.ts`, `tests/e2e/app-smoke.spec.ts` cable tests |
| 전력망/오버레이 | `src/utils/powerPreview.test.ts`, E2E hotkeys/overlays |
| 웨이브/적/난이도 | `src/utils/waveSimulation.test.ts`, `enemyBuildingInteraction.test.ts`, E2E threat panel |
| 저장/로드 | `src/utils/saveMigration.test.ts`, E2E save smoke |
| UI 텍스트/언어 | `src/i18n.test.ts`, E2E language smoke |
| 모바일 조작/CSS | E2E `mobile-*` projects. PC HUD shell 변경 시 모바일 터치 지점이 HUD/빌드 콘솔에 가로막히지 않는지 확인 |
| 튜토리얼/목표 패널 | `tutorialFlow.test.ts`, `progressionGates.test.ts`, E2E startup panels. 튜토리얼은 우측 정보 레일에 도킹됨 |
| 게임오버/결과 요약 | `runResultSummary.test.ts`, `waveResultSummary.test.ts`, E2E wave summary |
| 캔버스 그래픽/팔레트 | `npm run build`, `npm test`, `npx playwright test --workers=1`, 데스크톱 스크린샷. `visualTheme`, `GridRenderer`, `BaseBuilding`, `BaseEnemy`, `CableManager`, `OverlayController`를 함께 확인 |

## 새 기능 추가 시 테스트 추가 기준

- 순수 계산으로 분리 가능한 규칙은 먼저 `src/utils/*.test.ts`를 추가합니다.
- 새 config 항목은 `src/config.test.ts`에 최소 계약을 추가합니다.
- 새 저장 필드는 `saveMigration.test.ts`에 구버전/누락 필드 복원 케이스를 추가합니다.
- 새 DOM UI나 실제 조작은 `tests/e2e/app-smoke.spec.ts`에 desktop/mobile 중 필요한 프로젝트만 추가합니다.
- PC 인게임 UI shell 변경은 `#top-hud`, `#mission-panel`, `#threat-panel`, `#bottom-ui-container`, `#tutorial-panel`, 빌드 카테고리 전환, 설정 모달 회귀를 함께 확인합니다.
- 캔버스 그래픽 패치는 테스트가 픽셀 아트를 직접 판정하지 않으므로 1280x720 스크린샷과 DOM 박스 좌표를 증거로 남깁니다.
- 새 건물은 최소한 생성, 비용/해금, 버퍼/생산, 저장 복원 중 위험한 축을 테스트합니다.
- 새 적/웨이브는 `waveSimulation.test.ts`로 수량/HP/경로를 먼저 고정하고, 필요하면 실제 E2E smoke를 보강합니다.

## 테스트 실패 시 먼저 확인할 부분

- Playwright startup 실패: `playwright.config.ts`의 포트 `5174`, 기존 Vite 서버, 브라우저 설치 여부
- DOM 셀렉터 실패: `index.html`, `UIManager`, `main.css`의 id/class/text 변경 여부
- Canvas 클릭 실패: viewport별 좌표, camera zoom/centering, `getScreenPointForTile()` 계산 영향
- Config 테스트 실패: `CONFIG.BUILDINGS` ID와 `BuildingFactory`, `types.ts`, texture 파일 누락
- Save migration 실패: `SaveData` 타입과 `migrateSaveData()` 기본값 불일치
- Wave 테스트 실패: `CONFIG.DIFFICULTY`, `CONFIG.ENEMIES`, `waveSimulation.ts` 계산식 변경 영향
- 언어 테스트 실패: ko/en 키 중 한쪽만 추가했는지 확인

## CI/빌드 검증 흐름

현재 저장소 안에서 별도 CI 설정 파일은 확인하지 못했습니다. 로컬 기준 검증 순서는 다음이 안전합니다.

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

문서만 수정한 경우에는 테스트 실행이 필수는 아니지만, 링크/경로 검증과 git diff 확인은 필요합니다.
