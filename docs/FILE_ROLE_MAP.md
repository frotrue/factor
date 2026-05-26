# 파일 역할 맵

프로젝트 이해와 구현에 중요한 파일만 압축 정리했습니다. 전체 구조는 [PROJECT_MAP.md](./PROJECT_MAP.md), 런타임 흐름은 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

| 파일 | 역할 | 관련 흐름 | 수정 시 주의점 | 관련 테스트 |
|---|---|---|---|---|
| `src/main.ts` | Phaser 게임 생성, `window.__GRADIUM_GAME__` 노출 | 앱 시작, Playwright 상태 조회 | Scene 배열 순서가 메뉴->게임 흐름을 결정 | `tests/e2e/app-smoke.spec.ts` |
| `src/scenes/MainMenuScene.ts` | 난이도 선택 메뉴 | 메뉴 UI, 난이도 전달 | 시작 버튼 좌표/텍스트는 E2E가 기다림 | `tests/e2e/app-smoke.spec.ts` |
| `src/scenes/MainScene.ts` | 게임 런타임 조립, 매니저 초기화, 프레임 update, 이벤트 연결 | 거의 모든 게임 흐름의 중심 | 매니저 초기화 순서, EventBus owner cleanup, 모바일 layout 상태 주의 | E2E 전반 |
| `src/config.ts` | 건물/아이템/레시피/적/연구/난이도/타이밍 설정 | 밸런스, UI, 팩토리, 테스트의 단일 원천 | 새 ID 추가 시 `types.ts`, `BuildingFactory`, i18n, 테스트 동시 갱신 | `src/config.test.ts`, 다수 utils 테스트 |
| `src/types.ts` | 핵심 타입, 저장 포맷, Scene 인터페이스 | 타입 계약, SaveData, manager 접근 | SaveData 변경 시 `SaveManager`와 migration 필수 | `src/utils/saveMigration.test.ts` |
| `src/i18n.ts` | 한국어/영어 번역과 언어 저장 | 메뉴, HUD, 툴팁, 테스트 텍스트 | 새 UI 키 추가 시 ko/en 모두 추가 | `src/i18n.test.ts`, E2E language smoke |
| `src/styles/main.css` | DOM UI와 모바일 레이아웃 | PC HUD shell, 우측 정보 레일, 하단 빌드 콘솔, 모달, 모바일 액션바 | DOM id/class와 Playwright 셀렉터 영향. 모바일에서는 HUD가 터치 배치를 가로막지 않게 pointer-events 주의 | `tests/e2e/app-smoke.spec.ts` |
| `src/visuals/visualTheme.ts` | 캔버스 그래픽 패치 팔레트 | 월드, 건물 카테고리, 아이템, 적, 케이블, 오버레이 색상 | 색상만 바꿔도 UI swatch와 캔버스 의미 색이 어긋날 수 있어 `config.ts`와 함께 확인 | build, E2E visual smoke |
| `src/managers/BuildingManager.ts` | 건물 배치/철거/조회, 비용 차감, 멀티타일 등록, 제거/파괴 이벤트 분리 | 입력 배치, 저장 복원, 적 공격, 인벤토리 | 멀티타일 건물은 모든 타일 key에 같은 객체 등록. 수동 철거는 `BUILDING_REMOVED`, 전투 파괴는 `BUILDING_DESTROYED`로 유지 | E2E placement, `src/utils/buildingLifecycle.test.ts` |
| `src/buildings/BuildingFactory.ts` | 건물 ID -> 클래스 매핑 | 모든 건물 생성 | 새 건물 추가 시 registry 누락 위험 | `src/config.test.ts` 간접 |
| `src/buildings/BaseBuilding.ts` | 모든 건물 공통 상태, 버퍼, HP, 감염, 코드 기반 렌더 기본 | 생산, 전투, 저장, UI tooltip, 건물 패널 그래픽 | `takeDamage()`는 전투 파괴 경로로 BuildingManager에 위임. 그래픽 변경 시 배경/카테고리 팔레트와 식별성을 같이 확인 | `src/buildings/BaseBuilding.test.ts` |
| `src/buildings/AbstractProcessor.ts` | 레시피 기반 입력 소비/가공/출력 공통 로직 | Processor, WeightTrainer, NeuralTrainer, Recycler | 연구 속도 배율과 진행바 계산 영향 | `src/utils/productionSimulation.test.ts` 간접 |
| `src/buildings/Miner.ts` | 자원 타일에서 Silicon/Energy 생산 | 자원 추출, 컨베이어 물류 | 자원 타일 위에 있어야 실제 생산 | 추정: `productionSimulation`은 Downloader 중심 |
| `src/buildings/DataDownloader.ts` | 전력 기반 RAW_DATA 생산 | 초반 데이터 라인 시작 | `MINING_RATE_MULTIPLIER` 효과를 함께 받음 | `src/utils/productionSimulation.test.ts` |
| `src/buildings/Processor.ts` | RAW_DATA -> LABELED_DATA | 핵심 데이터 라인 | `CONFIG.RECIPES.LABELLING` 의존 | `src/utils/productionSimulation.test.ts` |
| `src/buildings/WeightTrainer.ts` | LABELED_DATA 2개 -> WEIGHT_UPDATE | Confidence 성장 재료 | Core 점수와 모델 훈련 둘 다에 연결 | `src/utils/productionSimulation.test.ts` |
| `src/buildings/NeuralTrainer.ts` | MODEL_TRAINING / INFERENCE_UNIT_PRODUCTION 레시피 전환 | 후반 생산, 고급 연구 | 클릭 시 레시피 전환하며 버퍼 초기화 | E2E는 간접 |
| `src/buildings/ModelTrainingLab.ts` | 방어 모델 공유 상태 훈련 | 방어 모델 신뢰도/버전 성장 | `targetType`, `autoTrain`은 저장 customState 대상 | `src/utils/modelTrainingSummary.test.ts` 보조 |
| `src/buildings/DefenseTower.ts` | Classifier/Filter/Firewall 공격, 명중률, 연구 보정, 모델 상태 적용 및 실시간 타겟 추적/배리어/방화벽 요동 등 커스텀 벡터 비주얼 탑재 | 방어 전투, 적 제거 | Classifier(락온 타겟 실시간 포신 추적 및 지점 네온 크로스헤어), Filter(2중 원호 배리어), Firewall(요동치는 삼각 화염) 드로잉 및 누수 없는 트윈 클린업 구현 | E2E 방어 배치 smoke |
| `src/buildings/Core.ts` | Core HP와 Confidence Score 수신 | 연구 비용, 게임오버, 점수 | WEIGHT_UPDATE는 +10, LABELED_DATA는 +2, 기타 +0.1 | E2E, save smoke |
| `src/buildings/Conveyor.ts` | Silicon 물리 물류, 방향 기반 pull/push 및 스크롤 갈매기(Chevron) 벡터 렌더링 | 자원 라인 | 3중 네온 쉐브론 흐름선 스크롤링 및 레일 외곽선 효과, 누수 없는 트윈 적용 (FastLink 공통) | E2E placement smoke |
| `src/buildings/Storage.ts` | 단일 타입 저장, inputBuffer를 출력으로도 사용 및 실시간 잔여량 게이지 렌더링 | 인벤토리, 케이블/컨베이어 버퍼 | 저장 용량 비율(inputBuffer.length / maxBufferSize)에 연동되어 갱신되는 2중 원형 네온 아크(Arc) 게이지 탑재 | E2E storage placement |
| `src/buildings/DataCache.ts` | 데이터 아이템 전용 Storage | 케이블/AP 데이터 버퍼 | RAW/Labeled/Weight/Trained/Inference 허용 및 용량 맞춤형 원형 네온 아크 게이지 연계 | AP relay 테스트 간접 |
| `src/buildings/Unloader.ts` | Storage 뒤쪽에서 아이템 추출 및 진행 방향 피스톤 피드백 렌더링 | 저장고 -> 라인 연결 | 회전 방향을 정밀 매핑하여 1.2초 압축/팽창하는 네온 화살표 피스톤 애니메이션 및 누수 없는 트윈 탑재 | E2E early gating |
| `src/buildings/PowerPlant.ts` | Energy 자원 위 발전소 활성 여부 및 융합 제어 코어 렌더링 | 전력 생산 | 액티브(녹색 융합 제어 코어 링, 3개 회전 노드, 확산 파동) 및 인액티브(적색 경고 링) 드로잉과 누수 없는 트윈 탑재 | PowerManager 간접 |
| `src/buildings/PowerNode.ts`, `SolarPanel.ts` | 전력 범위 노드 및 솔라 표면 네온 그리드/반사광 연출 | 전력망 확장 | PowerNode(중앙 전하 스타 크리스탈 및 4개 회전 골드 틱), SolarPanel(2x2 그리드 셀 및 대각선 스크롤링 네온 반사 빔) 비주얼 탑재 | `src/utils/powerPreview.test.ts` |
| `src/buildings/AccessPoint.ts` | AP 시각/기본 범위/대역폭 상태 | 무선 데이터 릴레이 | 전송 정책은 `CableManager`와 `utils/apRelay.ts` | `src/utils/apRelay.test.ts` |
| `src/managers/TickSystem.ts` | 고정 틱 실행, 전력/케이블/건물 onTick 순서 | 생산, 전력, AP, 케이블 | `gameSpeed`가 tick interval을 나눔 | 생산/파워 관련 테스트 간접 |
| `src/managers/CableManager.ts` | 케이블 연결, 큐, 데이터 이동 (실리콘 케이블 전송 대응), AP 자동 릴레이, 케이블/패킷 펄스 렌더 | 데이터 물류, 저장 복원 | 큐 방향, bandwidth, AP 제외 정책 변경 시 테스트 필요. 실리콘 전송 기능 추가됨. | `src/utils/apRelay.test.ts`, E2E cable |
| `src/managers/PowerManager.ts` | 전력 노드 네트워크 구성, 풋프린트 중심 범위 계산, 소비자 할당, blackout 적용 | 생산/방어/케이블 활성 조건 | `hasPower` 적용 순서와 멀티타일 건물 중심 범위가 전체 런타임에 영향 | `src/utils/powerPreview.test.ts`, `src/utils/geometry.test.ts` 보조 |
| `src/managers/WaveManager.ts` | 웨이브 타이머, 적 스폰, 코어 중심 target 전달, 보상, boss aura, next-wave briefing 발행 | 방어 압박, 연구 개방 신호 | 웨이브 계산은 `utils/waveSimulation.ts`와 분리되어 있음. 적 이동 target은 Core footprint center 기준 | `src/utils/waveSimulation.test.ts`, `src/utils/waveBriefingKey.test.ts`, `src/utils/gridPath.test.ts`, E2E threat panel |
| `src/enemies/BaseEnemy.ts` | 적 HP/이동/pathfinding/건물 공격/특수 효과/적 실루엣 렌더 | 코어 피해, 건물 파괴, 감염, 보스 오라 | pathfinding 방문 제한과 blocking 규칙 변경 주의. 경로 계산은 `utils/gridPath.ts`로 분리 | `src/utils/gridPath.test.ts`, `src/utils/enemyBuildingInteraction.test.ts` |
| `src/managers/MapManager.ts` | 자원 패치와 BLOCKER 지형 생성 | 초기 맵, 저장 복원, 적 경로 차단 | spawn safe zone과 early lane blockers 보존 | `src/managers/MapManager.test.ts` |
| `src/managers/GridRenderer.ts` | 배경, 섹터 그리드, 자원 패치, BLOCKER 지형 렌더 | 카메라 이동/줌 중 월드 시각화 | camera dirty 기반 렌더이므로 무거운 per-tile 효과 주의 | build, E2E startup |
| `src/managers/SaveManager.ts` | localStorage 저장/로드, 런타임 재구성 | 자동 저장, 설정, 연구, 케이블/적/건물 복원 | 포맷 변경 시 migration과 SaveData 갱신. 적 복원 HP는 wave+difficulty effective multiplier 기준 | `src/utils/saveMigration.test.ts`, `src/utils/enemyRestore.ts`, E2E save |
| `src/utils/saveMigration.ts` | 구버전 저장 데이터 기본값 보정 | 로드 안정성 | 새 필드는 기본값과 버전 처리 필요 | `src/utils/saveMigration.test.ts` |
| `src/managers/ResearchManager.ts` | 연구 해금 조건/비용/효과 누적 | 연구 UI, 건물 해금, 밸런스 보정 | multiplier 효과는 곱하고 bonus는 더함 | config/research 간접 |
| `src/managers/UIManager.ts` | 상단 HUD, 우측 정보 레일, 하단 빌드 콘솔/선택 도구 요약, 툴팁, 모달 위임 | 모든 DOM UI | DOM id/text는 E2E와 연결. 빌드 버튼 id는 유지해야 hotkey/E2E 회귀가 적음 | E2E 전반 |
| `src/managers/SettingsUI.ts` | 설정 모달, 저장/로드/언어/속도 버튼 | 설정 UI | 닫기 후 canvas focus 복원 기대 | E2E focus/language/save |
| `src/managers/ResearchUI.ts` | 연구 모달 렌더링/해금 버튼 | 연구 진행 | 첫 방어 전 연구 버튼 gating과 연결 | E2E research smoke |
| `src/managers/TrainingLabUI.ts` | 모델 훈련 연구소 DOM UI | 방어 모델 타겟 선택/훈련 | `ModelTrainingLab` 상태와 동기화 | E2E 간접 |
| `src/managers/MobileUIManager.ts` | 모바일 액션바/케이블 메뉴/빌드 요약 | 모바일 조작 | touch gesture와 DOM guard 영향 | E2E mobile |
| `src/managers/TutorialManager.ts` | 튜토리얼 패널, 단계별 건물 잠금, 월드 하이라이트, 튜토리얼 웨이브 진입 이벤트 처리 | 초반 온보딩, 빌드 버튼 갱신, WaveManager mock wave 연동 | DEFENSE 단계는 Classifier 배치 후 `WAVE_STARTED`로 완료되어야 mock wave 분기가 유지됨 | `src/utils/tutorialFlow.test.ts`, E2E startup |
| `src/controllers/InputController.ts` | 캔버스 입력, 배치/케이블/철거/툴팁/모바일 탭 | 실 조작의 중심 | DOM UI guard 셀렉터, 좌표 snap, unlock 체크 주의 | E2E interaction |
| `src/controllers/OverlayController.ts` | 방어 범위/전력망 오버레이 그리기 | F1/F2, 모바일 토글 | 연구 보너스 반영 | E2E overlay |
| `src/managers/EventBus.ts` | typed pub/sub와 owner cleanup | 매니저 간 결합 완화 | owner 이름 누락 시 shutdown 누수 가능 | `src/managers/EventBus.test.ts` |
| `src/utils/waveSimulation.ts` | 웨이브 수량/HP/경로/브리핑 순수 계산 | WaveManager, UI threat panel, tests | 난이도/경로 정책의 기준 파일 | `src/utils/waveSimulation.test.ts` |
| `src/utils/gridPath.ts` | 적 경로 A* 순수 계산 | BaseEnemy 이동/pathfinding | no-path는 빈 배열로 유지해 런타임이 blocked fallback을 결정. 마지막 점은 정확한 target world 좌표를 보존 | `src/utils/gridPath.test.ts` |
| `src/utils/geometry.ts` | 멀티타일 건물 footprint center와 중심 기반 범위 tile 계산 | WaveManager target, EffectsManager route guide, PowerManager coverage | grid size와 건물 WIDTH/HEIGHT 변경 시 중심 좌표 기대값 확인 | `src/utils/geometry.test.ts` |
| `src/utils/buildingLifecycle.ts` | 건물 수동 제거/전투 파괴 이벤트 매핑 | BuildingManager lifecycle events | 이벤트 의미가 웨이브 통계와 피드백에 연결됨 | `src/utils/buildingLifecycle.test.ts` |
| `src/utils/enemyRestore.ts` | 저장된 적 HP/maxHP 복원 계산 | SaveManager active wave load | difficulty multiplier 누락 방지 | `src/utils/saveMigration.test.ts` |
| `src/utils/waveBriefingKey.ts` | next-wave briefing 중복 발행 방지 key | WaveManager -> UIManager briefing | countdown-only 변경은 `WAVE_UPDATE`로 처리 | `src/utils/waveBriefingKey.test.ts` |
| `src/utils/progressionGates.ts` | 초반 목표와 고급 시스템 숨김 정책 | UI 빌드바/목표 패널 | 초반 AP/Fast/Fiber/Unloader 노출 정책 | `src/utils/progressionGates.test.ts` |
| `src/utils/productionSimulation.ts` | 생산 라인 장기 시뮬레이션 | 밸런스 검증용 순수 모델 | 실제 CableManager와 완전 동일하지 않을 수 있음 | `src/utils/productionSimulation.test.ts` |
| `src/utils/apRelay.ts` | AP 소스/타겟 선택 정책 | CableManager 무선 릴레이 | Storage/DataCache를 자동 source에서 제외 | `src/utils/apRelay.test.ts` |
| `src/utils/enemyBuildingInteraction.ts` | 적의 건물 공격 우선순위 | BaseEnemy 공격 타겟 | Core/Firewall/일반 건물 우선순위 확인 | `src/utils/enemyBuildingInteraction.test.ts` |
| `src/utils/tutorialFlow.ts` | 튜토리얼 단계 정의/진행 | TutorialManager, UI copy | i18n 키와 단계 순서 연결 | `src/utils/tutorialFlow.test.ts` |
| `tests/e2e/app-smoke.spec.ts` | 실제 브라우저 smoke, 배치/케이블/모바일/저장/언어 | 회귀 최종 방어선 | Phaser canvas 좌표 테스트라 viewport 변경 영향 큼 | Playwright |
| `index.html` | Phaser mount와 `#game-hud-shell` DOM UI 컨테이너 | UIManager가 id 기반으로 제어 | 기존 HUD/패널/빌드 id 변경은 E2E와 manager 코드 영향 | E2E 전반 |
