# 게임 밸런스 맵

이 문서는 밸런스 수치와 플레이 흐름을 빠르게 이해하기 위한 지도입니다. 실제 수치의 단일 원천은 대부분 `src/config.ts`이며, 웨이브 계산은 `src/utils/waveSimulation.ts`, 런타임 적용은 `src/managers/WaveManager.ts`, `src/buildings/*`, `src/enemies/BaseEnemy.ts`에 흩어져 있습니다.

## 핵심 자원 구조

| 자원/아이템 | 역할 | 정의/주요 처리 |
|---|---|---|
| `SILICON` | 건설 비용, 물리 물류, 일부 고급 레시피 입력 | `CONFIG.ITEMS`, `Miner`, `Conveyor`, `Storage`, `InventoryManager` |
| `ENERGY` | Energy patch에서 생산 가능한 아이템, 일부 레시피 입력 | `CONFIG.ITEMS`, `Miner`, `NeuralTrainer` 레시피 |
| `RAW_DATA` / Signal Packet | 데이터 라인 시작 재료 | `DataDownloader`, `CableManager.DATA_ITEMS` |
| `LABELED_DATA` | Processor 산출물, Core 점수 +2 | `Processor`, `Core.acceptItem()` |
| `WEIGHT_UPDATE` | WeightTrainer 산출물, Core 점수 +10, 모델 훈련 +2% | `WeightTrainer`, `Core`, `ModelTrainingLab` |
| `TRAINED_MODEL` | 고급 훈련 산출물, 모델 훈련 +10%와 버전 +1 | `NeuralTrainer`, `ModelTrainingLab` |
| `INFERENCE_UNIT` | 고급 추론 재료, 모델 훈련 시 inferenceCharge +5 | `NeuralTrainer`, `ModelTrainingLab` |
| `Confidence Score` | 연구 비용으로 쓰는 성장 점수 | `Core.confidenceScore`, `ResearchManager` |

## 튜토리얼 arena 배치

- 신규 튜토리얼은 캠페인 맵을 활용하지 않고, `MapManager.generateTutorialMap()`이 만드는 작은 독립 arena에서 진행됩니다.
- 시작 자원은 코어 좌상단 3x3 `SILICON` 패치(`-5,-3`), 코어 우하단 3x3 `ENERGY` 패치(`2,2`), 북쪽 확장용 2x2 `SILICON` 패치(`-2,-6`)입니다. 튜토리얼은 랜덤 패치가 아니라 이 고정 패치를 기준으로 안내합니다.
- 튜토리얼 단계는 Core/자원/PowerNode/Miner/Storage/Downloader/Cable/Processor/WeightTrainer/Classifier/첫 웨이브/ModelTrainingLab 순서로 건물 역할을 하나씩 분리합니다.
- 완료 기준은 최소 생산/상태 변화 중심입니다. Miner는 `SILICON`, Downloader는 `RAW_DATA`, Processor는 `LABELED_DATA`, WeightTrainer는 `WEIGHT_UPDATE`, PowerNode는 온라인 상태, ModelTrainingLab은 훈련 대상 선택을 확인합니다.
- arena 외곽은 `BLOCKER` 벽으로 둘러싸고, 북쪽에는 3타일 폭 게이트를 열어 첫 방어 위치를 명확히 보여줍니다.
- 튜토리얼 완료/스킵 시 튜토리얼 맵과 공장은 폐기되고, 새 캠페인 랜덤 맵이 시작됩니다. 튜토리얼 실행 중 일반 캠페인 저장 슬롯은 덮어쓰지 않습니다.

## 현재 생산 루프

```text
DataDownloader -> RAW_DATA
Processor: RAW_DATA -> LABELED_DATA
WeightTrainer: 2 LABELED_DATA -> WEIGHT_UPDATE
Core: WEIGHT_UPDATE 수신 -> Confidence +10
ResearchManager: Confidence 소비 -> 연구 해금/효과
ModelTrainingLab: WEIGHT_UPDATE/TRAINED_MODEL/INFERENCE_UNIT 소비 -> 방어 모델 공유 성장
```

물리 자원 루프는 `Miner -> Conveyor/FastLink -> Storage` 중심이며, 현재 컨베이어는 `SILICON`만 운반합니다. 데이터 아이템은 케이블 또는 AP 릴레이를 통해 이동합니다.

## 건물 밸런스 요소와 파일 위치

| 요소 | 주요 수치 | 정의/런타임 |
|---|---|---|
| 건물 비용/HP/전력/크기/카테고리 | `CONFIG.BUILDINGS` | `src/config.ts`, `BuildingManager`, `BaseBuilding` |
| 생산률 | `PRODUCTION_RATE`, recipe `TIME` | `DataDownloader`, `Miner`, `AbstractProcessor` |
| 물리 물류 속도 | `Conveyor.transferRate`, `FastLink.transferRate` | `src/buildings/Conveyor.ts` |
| 데이터 케이블 | `BANDWIDTH`, `MAX_QUEUE`, `DATA_PULSE_DURATION_MS` | `CONFIG.CABLES`, `CableManager` |
| AP 릴레이 | `RANGE`, `BANDWIDTH`, `AP_RANGE_BONUS` | `CONFIG.ACCESS_POINT`, `AccessPoint`, `CableManager`, `apRelay` |
| 전력망 | `POWER.PRODUCTION`, `CONSUMPTION`, `RANGE` | `PowerManager` |
| 방어 타워 | `DEFENSE.DAMAGE`, `RANGE`, `FIRE_RATE`, HP | `DefenseTower`, `CONFIG.BUILDINGS` |
| 방어 모델 | 시작 신뢰도 35, 훈련 증가량 | `MainScene`, `ModelTrainingLab`, `DefenseTower` |
| 연구 | 비용, 선행조건, 효과 | `CONFIG.RESEARCH`, `ResearchManager` |
| 난이도 | 적 HP/스폰/보상/쿨다운 배율 | `CONFIG.DIFFICULTY`, `WaveManager`, `waveSimulation` |

## 타워/방어 요소

| 방어 | 현재 역할 | 주요 수치 위치 | 파급 |
|---|---|---|---|
| `CLASSIFIER` | 단일 대상, lock-on 계열 공격 | `CONFIG.BUILDINGS.CLASSIFIER.DEFENSE`, `DefenseTower` | 초반 핵심 방어, 명중률이 모델 신뢰도에 민감 |
| `FILTER` | 범위 피해, anomaly sweep 이펙트 | `CONFIG.BUILDINGS.FILTER.DEFENSE.IS_AOE` | 군집/DDoS 대응 역할 |
| `FIREWALL` | 이동 차단/접촉 피해/자체 피해 | `CONFIG.BUILDINGS.FIREWALL`, `DefenseTower`, `BaseEnemy.findPath()` | pathfinding, 건물 HP, 적 공격 우선순위와 강하게 연결 |
| 모델 신뢰도 | 피해/명중률 보정 | `MainScene.defenseModelStates`, `DefenseTower.tryFire()` | 훈련 랩 밸런스가 방어 전체 DPS에 영향 |

방어 피해는 대략 `기본 DAMAGE * 연구 피해 배율 * (0.6 + modelConfidence / 125)`로 계산됩니다. 명중률도 modelConfidence에 따라 오릅니다.

## 적/웨이브 요소

| 적 | 역할 | 주요 수치 위치 | 런타임 특수 |
|---|---|---|---|
| `NOISE` | 기본 적 | `CONFIG.ENEMIES.NOISE` | 기본 스폰 |
| `MALWARE` | 느리지만 고HP, 주변 건물 감염 | `CONFIG.ENEMIES.MALWARE`, `BaseEnemy.tryInfectBuilding()` | 감염 중 건물이 일부 tick을 건너뜀 |
| `ADVERSARIAL` | 빠르고 명중률 저항 | `CONFIG.ENEMIES.ADVERSARIAL`, `DefenseTower.getFinalHitChance()` | tower hit chance 감소 |
| `DDOS_BOT` | Wave 8 이후 swarm 압박 | `CONFIG.ENEMIES.DDOS_BOT`, `WaveManager.spawnDdosSwarm()` | 보상 0, swarm 완전 제거 시 보너스 |
| `OVERFITTED_MODEL` | 10의 배수 wave 보스 | `CONFIG.ENEMIES.OVERFITTED_MODEL`, `WaveManager.applyBossAuras()` | 주변 적 speed +25% |

웨이브 수량/HP 스케일은 `src/utils/waveSimulation.ts`의 `getBaseWaveStats()`와 `createWavePlan()`이 기준입니다. 실제 적 타입 선택은 `WaveManager.spawnEnemy()`에서 랜덤/조건으로 결정됩니다.

## 웨이브/난이도 흐름

- 초기 웨이브 대기: `CONFIG.TIMING.INITIAL_WAVE_DELAY_MS = 30000`
- wave cooldown은 난이도별 `CONFIG.DIFFICULTY.*.WAVE_COOLDOWN_MS`
- Normal은 Wave 1~10에서 North route만 사용하고, 이후 East route가 추가됩니다.
- Hard는 초반 1 route, 중반 2 routes, 이후 3 routes까지 열립니다.
- Nightmare는 난이도 route 수 기준 최대 4 routes를 더 빨리 사용합니다.
- Wave 8부터 DDoS swarm 위험이 생깁니다.
- Wave 10, 20, 30...에는 boss가 마지막 스폰으로 등장합니다.

## 수치 조정 시 봐야 할 파일

| 조정 목적 | 먼저 볼 파일 | 같이 볼 파일 |
|---|---|---|
| 초반 성장 속도 | `src/config.ts`의 `DATA_DOWNLOADER`, `PROCESSOR`, `WEIGHT_TRAINER`, `RECIPES` | `src/utils/productionSimulation.ts` |
| 건설 비용 | `src/config.ts`의 `BUILDINGS.*.COST` | `InventoryManager`, E2E placement |
| 전력 압박 | `src/config.ts`의 `POWER`, `PowerManager` | `OverlayController`, `powerPreview` |
| 케이블 병목 | `CONFIG.CABLES`, `CableManager` | `apRelay`, E2E cable |
| AP 편의성 | `CONFIG.ACCESS_POINT`, `TECH_DISTRIBUTED_AP`, `CableManager.transferWirelessData()` | `apRelay.test.ts` |
| 방어 DPS | `CONFIG.BUILDINGS.*.DEFENSE`, `DefenseTower`, 연구 효과 | `waveSimulation`, E2E defense smoke |
| 적 압박 | `CONFIG.ENEMIES`, `CONFIG.DIFFICULTY`, `waveSimulation.ts`, `WaveManager.ts` | `waveSimulation.test.ts` |
| 연구 pacing | `CONFIG.RESEARCH`, `Core.acceptItem()` 점수 | `ResearchManager`, UI research |
| 저장 호환 | balance state 추가 시 `types.ts`, `SaveManager`, `saveMigration` | `saveMigration.test.ts` |

## 밸런스 변경의 파급

- DataDownloader/Processor/WeightTrainer 수치를 바꾸면 Confidence 획득과 연구 개방 속도가 같이 변합니다.
- WEIGHT_UPDATE 가치는 Core 점수와 모델 훈련 입력이라는 두 역할을 동시에 갖습니다.
- 방어 타워 기본 피해를 올리면 모델 훈련, 연구 피해 배율, hit chance 보정까지 곱해져 후반 스케일이 커질 수 있습니다.
- FIREWALL HP/피해 조정은 적 pathfinding과 건물 파괴/수리 부재에 큰 영향을 줍니다.
- 전력 소비를 높이면 `hasPower=false`가 생산, 케이블, AP, 방어를 모두 멈추게 합니다.
- 케이블 대역폭과 queue를 키우면 생산 병목이 줄어 Core 점수와 연구가 빨라집니다.
- 난이도 reward multiplier는 적 보상 Silicon에만 직접 적용되고, 데이터 생산 기반 Confidence에는 직접 적용되지 않습니다.

## 현재 밸런스상 어색하거나 개선 여지가 있는 부분

- 추정: 초반 시작 Storage에 Silicon 100개가 있고(실리콘 고갈 방지를 위해 30개에서 100개로 버프됨), 일부 핵심 건물 비용이 낮아 초반 배치 실험은 편하지만 비용 압박이 약할 수 있습니다.
- 추정: `MINING_RATE_MULTIPLIER`가 Miner뿐 아니라 DataDownloader에도 적용됩니다. 이름은 mining이지만 데이터 다운로드 속도도 빨라져 연구 속도에 영향을 줍니다.
- 추정: Conveyor가 `SILICON`만 운반하고 `ENERGY`는 현재 물리 물류에서 제외되어 Energy 아이템의 실전 사용감이 제한될 수 있습니다.
- 추정: `PowerPlant`는 Energy patch 위에 있어야 생산하지만, `Miner`도 Energy를 생산합니다. 전력 생산과 Energy 아이템 경제의 관계가 직관적으로 드러나지 않을 수 있습니다.
- 추정: 적 pathfinding은 탐색 범위/방문 수 제한이 있어 대형 벽이나 복잡한 미로에서 예상과 다르게 빈 path가 나올 수 있습니다.
- 추정: 방어 모델 신뢰도는 타워 전체 공유라 성장 체감은 좋지만, 개별 타워 정체성은 약해질 수 있습니다.
- 추정: DDoS bot 보상은 개별 0이고 swarm 완료 보너스 5라, 위험 대비 보상 체감이 낮을 수 있습니다.
- 추정: 연구 비용과 Confidence 생산량의 관계는 장시간 플레이 실측 없이 코드 기준으로만 판단했습니다.

## 향후 밸런스 조정 제안

1. `productionSimulation`에 연구 효과/케이블 queue/AP 시나리오를 추가해 5분/10분 기준 Confidence 획득량을 고정하세요.
2. Wave 1~10 목표를 “첫 방어 성공 -> 연구 열림 -> 두 번째 방어 노드”로 두고, Normal 기준 권장 타워 수와 실제 생존률을 Playwright 또는 headless simulation으로 검증하세요.
3. `MINING_RATE_MULTIPLIER`가 DataDownloader에도 적용되는 설계가 의도인지 결정하고, 의도라면 이름/문구를 생산 속도 쪽으로 바꾸세요.
4. Energy 아이템의 역할을 확정하세요. 전력 건물 placement 조건용인지, 후반 recipe 재료인지, 물류 대상인지 명확히 하는 편이 좋습니다.
5. FIREWALL은 길막/탱킹/DPS를 모두 갖고 있으므로 HP와 접촉 피해를 분리해서 테스트하세요.
6. AP는 편의 시스템이라 너무 강하면 케이블/컨베이어 학습을 건너뛸 수 있습니다. 초반 gating은 유지하되 해금 후 체감은 명확히 하는 방향이 좋습니다.
7. 난이도별 route 개방 시점과 reward multiplier를 README/툴팁에 노출하면 플레이어가 실패 원인을 이해하기 쉽습니다.
