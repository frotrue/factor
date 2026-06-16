# 게임 밸런스 맵

이 문서는 밸런스 수치와 플레이 흐름을 빠르게 이해하기 위한 지도입니다. 실제 수치의 단일 원천은 대부분 `src/config.ts`이며, 웨이브 계산은 `src/utils/waveSimulation.ts`, 런타임 적용은 `src/managers/WaveManager.ts`, `src/buildings/*`, `src/enemies/BaseEnemy.ts`에 흩어져 있습니다.

## 핵심 자원 구조

| 자원/아이템 | 역할 | 정의/주요 처리 |
|---|---|---|
| `SILICON` | 건설 비용, 케이블 물류, 일부 고급 레시피 입력 | `CONFIG.ITEMS`, `Miner`, `CableManager`, `Storage`, `InventoryManager` |
| `ENERGY` | Energy patch에서 생산 가능한 아이템, 일부 레시피 입력 | `CONFIG.ITEMS`, `Miner`, `NeuralTrainer` 레시피 |
| `MATERIAL_SAMPLE` | Material Data 생산 입력, 별도 Material Sample patch에서만 채굴되는 케이블 운송 아이템 | `CONFIG.RESOURCE_PATCHES`, `Miner`, `CableManager`, `ResearchLab` |
| `TACTICAL_DATA` | Neural Trainer 합성 결과의 연구 데이터 의미. 런타임은 아이템 출력 대신 tactical research data를 직접 적립 | `NeuralTrainer`, `ResearchManager` |
| `RAW_DATA` / Signal Packet | 데이터 라인 시작 재료 | `DataDownloader`, `CableManager.DATA_ITEMS` |
| `LABELED_DATA` | Processor 산출물, Weight Trainer 입력 | `Processor`, `WeightTrainer` |
| `WEIGHT_UPDATE` | WeightTrainer 산출물, Neural Trainer 입력 | `WeightTrainer`, `NeuralTrainer` |
| 3종 Research Data | material/tactical/system 연구 진행 재료 | `ResearchManager`, `ResearchLab`, `NeuralTrainer`, `DataCenter` |

## 튜토리얼 arena 배치

- 신규 튜토리얼은 캠페인 맵을 활용하지 않고, `MapManager.generateTutorialMap()`이 만드는 작은 독립 arena에서 진행됩니다.
- 시작 자원은 코어 좌상단 3x3 `SILICON` 패치(`-5,-3`), 코어 우하단 3x3 `ENERGY` 패치(`2,2`), 북쪽 확장용 2x2 `SILICON` 패치(`-2,-6`)입니다. 튜토리얼은 랜덤 패치가 아니라 이 고정 패치를 기준으로 안내합니다.
- 튜토리얼 단계는 Core/자원/PowerNode/Miner/Storage/Downloader/Cable/Processor/WeightTrainer/Classifier/첫 웨이브/Research Operations Center 순서로 건물 역할을 하나씩 분리합니다.
- 완료 기준은 최소 생산/상태 변화 중심입니다. Miner는 `SILICON`, Downloader는 `RAW_DATA`, Processor는 `LABELED_DATA`, WeightTrainer는 `WEIGHT_UPDATE`, PowerNode는 온라인 상태, Research Operations Center는 배치를 확인합니다.
- arena 외곽은 `BLOCKER` 벽으로 둘러싸고, 북쪽에는 3타일 폭 게이트를 열어 첫 방어 위치를 명확히 보여줍니다.
- 튜토리얼 완료/스킵 시 튜토리얼 맵과 공장은 폐기되고, 새 캠페인 랜덤 맵이 시작됩니다. 튜토리얼 실행 중 일반 캠페인 저장 슬롯은 덮어쓰지 않습니다.

## 캠페인 맵 생성 밸런스 정책

- 캠페인 맵은 preset 기반 고정 구조물과 내부 seed 기반 자원 분배를 조합합니다. 장벽/핵심 동선은 preset으로 유지하고, 자원 위치만 seed로 흔들어 재플레이성을 줍니다.
- seed는 유저에게 노출할 필요는 없지만 저장 데이터에는 `presetId + seed`로 남겨 재현 가능한 맵을 보장합니다.
- 시작 자원은 고정 좌표가 아니라 starter zone 안에서 패치 단위로 배치합니다. 패치 전체가 zone 안에 들어가야 하며, seed에 따라 위치만 달라집니다.
- `RESOURCE_RINGS`가 있는 preset은 랜덤 자원을 코어 기준 거리대별로 배치합니다. 각 패치는 blocker 지형, 기존 자원, starter safe area, Core footprint와 겹치면 폐기하고 100회 안에 후보를 못 찾으면 해당 패치를 skip합니다.
- standard 캠페인 맵의 랜덤 자원은 초반 ring 17~23타일에 소량, 중반 ring 24~44타일에 가장 많은 중형 패치, 외곽 ring 45~60타일에 소수 대형 패치를 둡니다. 중반 ring은 북/동 Silicon, 남/서 Energy 쪽으로 약한 방향 편향을 두며, Material Sample patch는 낮은 확률로 섞입니다.
- standard 캠페인 맵은 시작권 북동쪽에 Material Sample starter patch 1개를 보장하고, 네 방향 외곽에도 고정 Material Sample patch를 추가로 두어 ResearchLab용 Material Data 재료를 Silicon 라인과 분리합니다.
- standard resource patch는 정사각형 덩어리 대신 중심부가 조밀하고 가장자리가 불규칙한 organic blob으로 배치합니다. tutorial resource patch는 기존 고정 사각 배치를 유지합니다.
- standard blocker는 긴 1타일 직선 벽이나 작은 단일 debris 대신 seed 기반 중형 blob/rough-line/cluster 군집으로 배치합니다. outer boundary terrain pass는 외곽으로 갈수록 더 조밀한 cave/rock mass를 만들고, 주요 enemy route는 tile Set으로 먼저 예약해 입구를 열린 corridor로 유지합니다. 생성 후 작은 blocker 파편을 정리한 뒤 BFS 실패 시 blocker만 좁게 지워 경로를 복구합니다.
- 후속 방향은 Mindustry처럼 terrain region이 먼저 lane corridor를 만들고, ore vein/resource blob이 그 region 가장자리나 내부에 붙는 구조입니다. 현 단계에서는 seed 결정성, reserved lane, BFS 검증을 future pass의 고정 계약으로 둡니다.
- fixed resource 타일은 blocker 배치에서 보호합니다. core/reserved/blocker 타일 위 자원은 최종 cleanup에서 삭제하며, starter resource 부족분은 패치 단위로 보정합니다.
- 공정성 기준은 시작 반경 안 필수 `SILICON`/`ENERGY`/`MATERIAL_SAMPLE` 수량 보장으로 제한합니다. 전체 맵 자원 품질은 점수화하지 않고, 부족한 starter resource만 패치 단위로 보정합니다.
- standard 캠페인 맵은 큰 유한 작전 구역입니다. world/build bounds는 `-64..64`, 랜덤 자원 생성 bounds는 `-60..60`이며, Core 주변 `-20..20`을 시작 안전 구역으로 취급합니다.
- 좋은 자원 구역은 새 상위 자원보다 고밀도/복합/위험 위치로 표현하며, standard preset에는 통로 사이 중립지대 쪽 고정 Silicon/Energy 패치가 추가되어 있습니다.

## 현재 생산 루프

```text
DataDownloader -> RAW_DATA
Miner: SILICON patch -> SILICON
Miner: ENERGY patch -> ENERGY
Miner: MATERIAL_SAMPLE patch -> MATERIAL_SAMPLE
Processor: RAW_DATA -> LABELED_DATA
WeightTrainer: 2 LABELED_DATA -> WEIGHT_UPDATE
NeuralTrainer: WEIGHT_UPDATE -> Tactical Research Data
Core: 데이터 수신량 집계
ResearchLab: MATERIAL_SAMPLE -> Material Data
DataCenter: 시스템 작동 로그 -> System Data
Research Operations Center(`RESEARCH_OPERATIONS_CENTER`): 전역 research throughput 증가, 인접 GPU로 기여도 강화
ResearchManager: research data store + throughput 소비 -> 전역 연구 완료/효과 적용
```

자원/데이터 물류는 케이블 중심입니다. `Miner -> Cable/Fiber/AP -> Storage/ResearchLab` 경로로 `SILICON`, `ENERGY`, `MATERIAL_SAMPLE`을 운송하며, 기존 Conveyor/FastLink/Unloader 물리 운송 계열은 제거되었습니다. 케이블은 이미 버퍼에 들어온 아이템 이동 자체는 endpoint 전력과 분리합니다. 전력은 생산/가공 속도를 제어하고, Repeater/AP 같은 능동 중계는 전력이 필요합니다.

## 연구 economy 기준

- `CONFIG.RESEARCH_SETTINGS.DATA_OUTPUT`은 material/tactical/system 모두 1입니다. Research data 생산량은 각 생산 건물 cycle 수에 이 값을 곱해 쌓이고, ROC/GPU는 research data 생산이 아니라 전역 throughput 소비 속도만 올립니다.
- 데스크톱 기준 첫 material research 목표는 ResearchLab/Miner material line이 안정화된 뒤 약 4~6분입니다. `CORE_BASIC_RESEARCH`는 `COST: 300`, `DATA_COSTS: { material: 300 }`로 고정합니다.
- Tactical entry 목표는 Processor -> WeightTrainer -> NeuralTrainer chain 이후 약 7~10분입니다. 첫 tactical branch인 `TECH_PRECISION_INFERENCE`와 `TECH_DATASET_ENCODING`은 각각 `COST: 100`, `DATA_COSTS: { tactical: 100 }`입니다.
- System branch는 DataCenter 이후 약 10~14분 진입을 목표로 의도적으로 늦게 둡니다. `TECH_AUTO_QUEUE`와 `TECH_DISTRIBUTED_AP`은 각각 `1440 system`, `TECH_FIBER_OPTIC`은 `1680 system`, `TECH_AUTOMATION_PRIORITY`는 `1920 system`, `TECH_FIREWALL_HARDENING`은 `COST: 1800`과 `DATA_COSTS: { system: 1500, tactical: 300 }`입니다.
- ROC/GPU throughput 수치와 50% ROC cap은 이번 tuning에서 변경하지 않았습니다. Research data가 부족한 상태에서는 ROC 체감이 제한될 수 있습니다.

## 건물 밸런스 요소와 파일 위치

| 요소 | 주요 수치 | 정의/런타임 |
|---|---|---|
| 건물 비용/HP/전력/크기/카테고리 | `CONFIG.BUILDINGS` | `src/config.ts`, `BuildingManager`, `BaseBuilding` |
| 생산률 | `PRODUCTION_RATE`, recipe `TIME` | `DataDownloader`, `Miner`, `AbstractProcessor` |
| 케이블 물류 속도 | `BANDWIDTH`, `MAX_QUEUE`, `MAX_LENGTH_TILES` | `CONFIG.CABLES`, `CableManager` |
| 데이터 케이블 | `BANDWIDTH`, `MAX_QUEUE`, `MAX_LENGTH_TILES`, `COST_PER_TILE`, `DATA_PULSE_DURATION_MS` | `CONFIG.CABLES`, `CableManager` |
| 케이블 중계기 | 비용 8 Silicon, 전력 4, HP 120, 무버퍼 유선 endpoint | `CONFIG.BUILDINGS.REPEATER`, `Repeater`, `CableManager` |
| AP 릴레이 | `RANGE`, `BANDWIDTH`, `AP_RANGE_BONUS` | `CONFIG.ACCESS_POINT`, `AccessPoint`, `CableManager`, `apRelay` |
| 전력망 | `POWER.PRODUCTION`, `CONSUMPTION`, `RANGE`, network satisfaction | `PowerManager`, 각 건물 `powerEfficiency` |
| 방어 타워 | `DEFENSE.DAMAGE`, `RANGE`, `FIRE_RATE`, HP | `DefenseTower`, `CONFIG.BUILDINGS` |
| ROC 연구 처리량 | powered Research Operations Center(`RESEARCH_OPERATIONS_CENTER`)가 전역 research throughput을 올리고, powered adjacent GPU Cluster가 해당 기여도를 강화 | `RESEARCH_OPERATIONS_CENTER`, `GPU_CLUSTER`, `ResearchManager` |
| 독립 연구 | 6축 노드, `DATA_OUTPUT` 1/1/1, 3종 research data 비용, 단일 활성 연구, queue, throughput, 선행조건, 효과 | `CONFIG.RESEARCH_AXES`, `CONFIG.RESEARCH_SETTINGS`, `CONFIG.RESEARCH`, `ResearchManager`, `ResearchPanel` |
| 난이도 | 적 HP/스폰/보상/쿨다운 배율 | `CONFIG.DIFFICULTY`, `WaveManager`, `waveSimulation` |

## 타워/방어 요소

| 방어 | 현재 역할 | 주요 수치 위치 | 파급 |
|---|---|---|---|
| `CLASSIFIER` | 단일 대상, lock-on 계열 공격 | `CONFIG.BUILDINGS.CLASSIFIER.DEFENSE`, `DefenseTower` | 초반 핵심 방어, 연구 accuracy/damage 효과 영향 |
| `FILTER` | 범위 피해, anomaly sweep 이펙트 | `CONFIG.BUILDINGS.FILTER.DEFENSE.IS_AOE` | 군집/DDoS 대응 역할 |
| `FIREWALL` | 이동 차단/접촉 피해/자체 피해 | `CONFIG.BUILDINGS.FIREWALL`, `DefenseTower`, `BaseEnemy.findPath()` | pathfinding, 건물 HP, 적 공격 우선순위와 강하게 연결 |
| 연구 방어 효과 | 명중률/피해/사거리/연사 보정은 완료 연구의 영구 효과로만 적용 | `ResearchManager.getEffectValue()`, `DefenseTower.tryFire()` | 연구 밸런스가 방어 전체 DPS에 영향 |

방어 피해는 `CONFIG.BUILDINGS.*.DEFENSE.DAMAGE`에 완료 연구의 `TOWER_DAMAGE_MULTIPLIER`를 곱해 계산합니다. 명중률은 `BASE_HIT_CHANCE`에 연구의 `TOWER_ACCURACY_BONUS`를 더해 clamp합니다.

## 적/웨이브 요소

| 적 | 역할 | 주요 수치 위치 | 런타임 특수 |
|---|---|---|---|
| `NOISE` | 기본 적 | `CONFIG.ENEMIES.NOISE` | 기본 스폰 |
| `MALWARE` | 느리지만 고HP, 주변 건물 감염 | `CONFIG.ENEMIES.MALWARE`, `BaseEnemy.tryInfectBuilding()` | 감염 중 건물이 일부 tick을 건너뜀 |
| `ADVERSARIAL` | 빠르고 명중률 저항 | `CONFIG.ENEMIES.ADVERSARIAL`, `DefenseTower.getFinalHitChance()` | tower hit chance 감소 |
| `DDOS_BOT` | Wave 8 이후 swarm 압박 | `CONFIG.ENEMIES.DDOS_BOT`, `WaveManager.spawnDdosSwarm()` | 보상 0, swarm 완전 제거 시 보너스 |
| `OVERFITTED_MODEL` | 10의 배수 wave 보스 | `CONFIG.ENEMIES.OVERFITTED_MODEL`, `WaveManager.applyBossAuras()` | 주변 적 speed +25% |

웨이브 수량/HP 스케일은 `src/utils/waveSimulation.ts`의 `getBaseWaveStats()`와 `createWavePlan()`이 기준입니다. 실제 적 타입 선택은 `WaveManager.spawnEnemy()`에서 랜덤/조건으로 결정됩니다.
적 런타임 이동은 `BaseEnemy.findPath()`가 적 전용 8방향 경로를 사용하며, 대각선 비용은 직선보다 높고 양쪽 직교 칸이 모두 열려야 코너 대각선 통과가 가능합니다. `CONFIG.DIRECTIONS`는 맵 생성/검증의 보수적 4방향 계약으로 유지합니다.

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
| 연구 pacing | research data 생산량, store capacity, throughput, 연구 비용. Desktop target: material 4~6분, tactical 7~10분, system 10~14분 | `ResearchManager`, `ResearchLab`, `NeuralTrainer`, `DataCenter`, `ResearchPanel`, `src/config.test.ts` |
| 저장 호환 | balance state 추가 시 `types.ts`, `SaveManager`, `saveMigration` | `saveMigration.test.ts` |

## 밸런스 변경의 파급

- DataDownloader/Processor/WeightTrainer/NeuralTrainer 수치를 바꾸면 tactical research data 공급 속도가 같이 변합니다.
- WEIGHT_UPDATE는 NeuralTrainer 입력이라 tactical research pacing의 핵심 병목입니다.
- 방어 타워 기본 피해를 올리면 연구 피해 배율과 hit chance 보정까지 곱해져 후반 스케일이 커질 수 있습니다.
- FIREWALL HP/피해 조정은 적 pathfinding과 건물 파괴/수리 부재에 큰 영향을 줍니다.
- 전력 소비를 높이면 네트워크 satisfaction이 낮아지고 생산, 처리, AP, 방어, research data 생산, 연구 throughput이 비례 감속됩니다. 이미 출력 버퍼에 들어온 아이템의 유선 케이블 이동은 계속됩니다.
- 케이블 대역폭과 queue를 키우면 생산 병목이 줄어 NeuralTrainer tactical data 공급이 빨라집니다.
- 케이블 최대 길이/거리 비용/Repeater 전력 부담은 외곽 자원 확장 속도와 방어 부담을 직접 조절합니다. Basic은 8타일, Fiber는 16타일이며 Distributed AP 연구가 최대 길이를 +4타일 늘립니다.
- 난이도 reward multiplier는 적 보상 Silicon에만 직접 적용되고, research data 생산에는 직접 적용되지 않습니다.

## 현재 밸런스상 어색하거나 개선 여지가 있는 부분

- 추정: 초반 시작 Storage에 Silicon 100개가 있고(실리콘 고갈 방지를 위해 30개에서 100개로 버프됨), 일부 핵심 건물 비용이 낮아 초반 배치 실험은 편하지만 비용 압박이 약할 수 있습니다.
- 추정: `MINING_RATE_MULTIPLIER`가 Miner뿐 아니라 DataDownloader에도 적용됩니다. 이름은 mining이지만 데이터 다운로드 속도도 빨라져 연구 속도에 영향을 줍니다.
- 추정: Material Sample patch는 Silicon 라인과 분리되어 research 재료 막힘을 줄이지만, 플레이어가 ResearchLab용 별도 채굴 라인을 배워야 합니다.
- 추정: `PowerPlant`는 Energy patch 위에 있어야 생산하지만, `Miner`도 Energy를 생산합니다. 전력 생산과 Energy 아이템 경제의 관계가 직관적으로 드러나지 않을 수 있습니다.
- 추정: 적 pathfinding은 탐색 범위/방문 수 제한이 있어 대형 벽이나 복잡한 미로에서 예상과 다르게 빈 path가 나올 수 있습니다. 적은 8방향으로 움직이지만 strict corner rule 때문에 방어선 모서리를 비집고 지나가지는 않습니다.
- 추정: ROC는 처리량 보너스 건물이므로 research data 생산 라인이 부족하면 체감이 약할 수 있습니다.
- 추정: DDoS bot 보상은 개별 0이고 swarm 완료 보너스 5라, 위험 대비 보상 체감이 낮을 수 있습니다.
- 추정: 프로토콜 필요 진행도와 데이터 생산량의 관계는 장시간 플레이 실측 없이 코드 기준으로만 판단했습니다.

## 향후 밸런스 조정 제안

1. `productionSimulation`에 연구 효과/케이블 queue/AP 시나리오를 추가해 5분/10분 기준 research data 획득량을 고정하세요.
2. Wave 1~10 목표를 “첫 방어 성공 -> 연구 열림 -> 두 번째 방어 노드”로 두고, Normal 기준 권장 타워 수와 실제 생존률을 Playwright 또는 headless simulation으로 검증하세요.
3. `MINING_RATE_MULTIPLIER`가 DataDownloader에도 적용되는 설계가 의도인지 결정하고, 의도라면 이름/문구를 생산 속도 쪽으로 바꾸세요.
4. Energy 아이템의 역할을 확정하세요. 전력 건물 placement 조건용인지, 후반 recipe 재료인지, 물류 대상인지 명확히 하는 편이 좋습니다.
5. FIREWALL은 길막/탱킹/DPS를 모두 갖고 있으므로 HP와 접촉 피해를 분리해서 테스트하세요.
6. AP는 편의 시스템이라 너무 강하면 케이블/Repeater 학습을 건너뛸 수 있습니다. 초반 gating은 유지하되 해금 후 체감은 명확히 하는 방향이 좋습니다.
7. 난이도별 route 개방 시점과 reward multiplier를 README/툴팁에 노출하면 플레이어가 실패 원인을 이해하기 쉽습니다.
