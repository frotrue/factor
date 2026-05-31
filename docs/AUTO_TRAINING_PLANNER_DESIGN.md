# Auto Training Planner Design

## 목적

Neural Operations Lab을 개별 수동 작업 슬롯이 아니라 전역 학습 네트워크의 입력/처리 노드로 다룹니다. 자동 모드가 켜져 있으면 학습 대상, 시스템 프로토콜, 방어 모델 보상 모드(정확도/공격력)를 현재 런 상태에 맞춰 선택합니다. 자동 모드가 꺼져 있거나 플레이어가 수동 고정을 선택하면 기존처럼 플레이어 선택을 존중합니다.

## 핵심 방향

- 전역 `TrainingPlannerManager`를 추가해 Lab 간 active job, 자동 모드, 수동 고정 상태를 공유합니다.
- 여러 `ModelTrainingLab`은 같은 전역 작업에 데이터를 공급하고 같은 학습 진행도를 밀어줍니다.
- 여러 Lab과 각 Lab 주변 powered GPU는 하나의 전역 `trainingPower`로 합산되어 학습 속도를 올립니다.
- 자동 판단은 작업 완료 후 또는 아직 학습이 시작되지 않은 대기 상태에서만 재평가합니다.
- 현재 선택 작업이 요구 데이터의 90% 이상이면 다른 시작 가능한 작업이 있어도 기다리고, 새 입력 데이터도 현재 작업에 계속 투입합니다.
- 시스템 프로토콜은 안정 구간에서만 자동 우선 후보가 됩니다.
- 방어 모델 보상은 실효 정확도 80%를 기본 안전선으로 삼아 정확도/공격력을 선택합니다.
- 타워 타입 우선순위는 v1에서 지어진 타워 수를 기준으로 합니다.

## 상태 모델

```ts
type TrainingPlannerMode = 'AUTO_DECIDE' | 'MANUAL_LOCK';

interface TrainingPlannerState {
    activeJobId: string | null;
    mode: TrainingPlannerMode;
    autoEnabled: boolean;
    lastDecisionReason: string | null;
}
```

방어 모델별 정확도/공격력 보상 선호도는 기존 `DefenseModelState.trainingRewardPreference`를 유지합니다. 자동 모드는 이 값을 판단 결과에 따라 바꾸고, 수동 모드는 플레이어가 누른 값을 유지합니다.

저장 데이터에는 전역 상태를 추가합니다.

```ts
trainingPlanner: {
    activeJobId: string | null;
    autoEnabled: boolean;
    mode: 'AUTO_DECIDE' | 'MANUAL_LOCK';
}
```

## 런타임 흐름

1. 각 Lab tick에서 input buffer를 전역 planner의 active job에 공급합니다.
2. planner는 자동 모드가 켜져 있고 재평가 가능한 상태인지 확인합니다.
3. 재평가 가능하면 현재 위기 압력과 후보 점수를 계산해 active job과 보상 모드를 선택합니다.
4. 모든 powered Lab의 training power를 합산합니다.
5. active job이 방어 모델이면 해당 `DefenseModelState.trainingProgressTicks`를 `totalTrainingPower`만큼 증가시킵니다.
6. active job이 시스템 프로토콜이면 `ResearchManager` job training progress를 `totalTrainingPower`만큼 증가시킵니다.
7. 작업 완료 시 보상을 적용하고, 다음 tick 또는 같은 tick 후반에 다시 자동 판단할 수 있습니다.

## Training Power

각 Lab의 기본 power는 1입니다. GPU는 기존 `getGpuTrainingSpeedMultiplier(activeGpuCount)` 의미를 유지하되, 전역 power에서는 역수로 변환합니다.

```ts
labPower = 1 / getGpuTrainingSpeedMultiplier(activeGpuCount)
totalTrainingPower = sum(poweredLab.labPower)
```

예시:

| 구성 | 진행량 |
|---|---:|
| Lab 1개, GPU 0개 | +1/tick |
| Lab 1개, GPU 2개 | +1.67/tick |
| Lab 2개, GPU 0개 | +2/tick |
| Lab 2개, GPU 4개씩 | +10/tick |

Lab이 감염되어 해당 tick을 스킵하거나 전력 조건이 필요하다고 판단되는 경우, 해당 Lab의 power는 그 tick에서 제외합니다.

## 자동 재평가 규칙

```ts
if (!autoEnabled) return keepCurrent;
if (mode !== 'AUTO_DECIDE') return keepCurrent;

if (selectedJobIsTraining) return keepCurrent;
if (selectedJobCanStart) return keepCurrent;
if (selectedJobProgressRatio >= 0.9) return keepCurrentAndFeed;

if (anyOtherCandidateCanStart) return chooseBestReadyCandidate;
return chooseBestLongTermCandidateForIncomingData;
```

`selectedJobProgressRatio`는 방어 모델이면 `accumulatedTrainingData / currentRequirement`, 시스템 프로토콜이면 `progress / COST`입니다.

## 균형 판단

자동 모드는 먼저 현재 위기 압력 `pressure`를 계산합니다. v1은 단순하고 설명 가능한 값으로 시작합니다.

```ts
pressure = clamp01(
    coreDamageRecent * 0.35 +
    enemiesLeakedRecent * 0.30 +
    activeEnemyPressure * 0.20 +
    weakDefenseCoverage * 0.15
)
```

초기 구현에서 telemetry가 부족하면 다음 근사값으로 시작할 수 있습니다.

- `coreDamageRecent`: 최근 window의 Core HP 감소량. 없으면 0.
- `enemiesLeakedRecent`: Core 근처까지 온 적 수. 없으면 0.
- `activeEnemyPressure`: 현재 적 수 또는 현재 적 HP 총량의 정규화 값.
- `weakDefenseCoverage`: 지어진 타워의 실효 정확도가 낮을수록 증가.

가중치는 pressure에 따라 바뀝니다.

```ts
survivalWeight = lerp(0.35, 0.85, pressure)
growthWeight = 1 - survivalWeight
```

## 시스템 프로토콜 선택

자동 모드는 안정 구간에서만 시스템 프로토콜을 공격적으로 선택합니다.

```ts
if (pressure >= 0.65) {
    system protocols are ignored unless no defense candidate exists
}

if (pressure <= 0.35) {
    system protocols can outrank defense by priority
}

if (0.35 < pressure && pressure < 0.65) {
    defense is preferred, but very high-value ready protocols may compete lightly
}
```

프로토콜 내부 우선순위는 명시 테이블로 둡니다.

```ts
const SYSTEM_PROTOCOL_PRIORITIES = {
    AP_BANDWIDTH: 90,
    TOWER_DAMAGE: 85,
    TOWER_RANGE: 75,
    MINING_RATE: 65,
    LOGISTICS: 60
};
```

실제 research id는 현재 `CONFIG.RESEARCH` 이름에 맞춰 매핑합니다.

## 방어 모델 선택

타워 타입 우선순위는 v1에서 지어진 타워 수 기준입니다.

```ts
towerPresenceScore =
    towerCount(type) > 0
        ? 30 + towerCount(type) * 12
        : 5;
```

정확도/공격력 보상은 실효 정확도 기준으로 결정합니다.

```ts
targetAccuracy = pressure >= 0.65 ? 90 : 80;

if (effectiveAccuracy < targetAccuracy) {
    prefer accuracy;
} else if (effectiveAccuracy >= 90 && pressure < 0.65) {
    prefer damage;
} else {
    compare accuracy and damage scores;
}
```

시간 감소 때문에 저장 정확도 `modelAccuracy`가 100이어도 `effectiveAccuracy`가 안전선 아래로 내려가면 자동 모드는 다시 정확도 학습을 선택할 수 있습니다.

## 후보 점수 예시

```ts
accuracyScore =
    survivalWeight *
    towerPresenceScore *
    clamp01((targetAccuracy - effectiveAccuracy) / targetAccuracy);

damageScore =
    survivalWeight *
    towerPresenceScore *
    clamp01((effectiveAccuracy - 60) / 40) *
    enemyHpPressure;

protocolScore =
    growthWeight *
    protocolPriority *
    readyOrNearReadyMultiplier;
```

점수 함수는 v1에서 deterministic해야 합니다. 같은 상태에서는 같은 작업을 선택해야 저장/로드와 테스트가 안정적입니다.

## UI 계약

Lab 모달은 길게 설명하지 않고 작은 상태만 보여줍니다.

```text
[AUTO ON] Classifier Accuracy
4 towers, effective accuracy 72%
```

시스템 프로토콜일 때:

```text
[AUTO ON] AP Bandwidth
low threat, protocol ready
```

수동 고정일 때:

```text
[MANUAL] Firewall Damage
player selected
```

플레이어가 모델, 시스템 프로토콜, 보상 버튼을 직접 누르면 `MANUAL_LOCK`으로 전환합니다. 다시 `AUTO` 버튼을 누르면 `AUTO_DECIDE`로 복귀합니다. 자동 모드가 켜진 상태에서만 planner가 기존 선택을 덮어씁니다.

## 저장/마이그레이션

기존 저장은 각 Lab `customState`에 `targetType`, `activeJobId`, `autoTrain`을 가질 수 있습니다. 전역 planner 도입 시 로드 마이그레이션은 다음 순서로 전역 상태를 승격합니다.

1. 이미 학습 중인 방어 모델 또는 시스템 프로토콜 작업이 있으면 그 작업을 우선합니다.
2. 없으면 첫 번째 유효 Lab `activeJobId`를 사용합니다.
3. 그래도 없으면 active job은 null로 두고 자동 판단이 다음 tick에 선택하게 합니다.
4. 기존 Lab별 `autoTrain` 중 하나라도 true면 `autoEnabled` true로 승격합니다.

로드 이후 Lab별 target/active job custom state는 무시하거나 다음 저장부터 제거합니다.

## 구현 단계

1. `src/managers/TrainingPlannerManager.ts` 추가
2. `MainScene`에서 planner 생성, 저장/로드 연결
3. `ModelTrainingLab`의 active job 소유권을 planner로 이전
4. 여러 Lab/GPU training power 합산 경로 추가
5. 자동 판단 v1 점수 함수 추가
6. `TrainingLabUI`에 AUTO 상태, 짧은 reason, 수동 고정 전환 연결
7. save migration과 타입 갱신
8. 단위 테스트와 문서 맵 갱신

## 테스트 계획

- planner가 자동 모드에서 시작 가능한 최고 점수 후보를 선택한다.
- 현재 선택 작업이 90% 이상이면 다른 ready 후보가 있어도 유지한다.
- 현재 선택 작업이 학습 중이면 재평가하지 않는다.
- pressure가 높으면 방어 모델이 시스템 프로토콜보다 우선된다.
- pressure가 낮으면 ready protocol이 방어 후보를 이길 수 있다.
- effective accuracy가 80% 아래면 accuracy 보상을 선택한다.
- 여러 Lab/GPU power가 합산되어 training progress가 빨라진다.
- 기존 Lab별 저장 상태가 전역 planner 상태로 마이그레이션된다.
- 플레이어 수동 선택은 `MANUAL_LOCK`으로 전환되고 자동 덮어쓰기를 멈춘다.

## 열린 결정

- Core damage/leak telemetry를 새로 기록할지, v1에서는 현재 적 수와 Core HP 변화만으로 근사할지 결정 필요.
- 시스템 프로토콜 priority table은 실제 `CONFIG.RESEARCH` id에 맞춰 별도 밸런스 패스가 필요합니다.
- Lab power에 전력 조건을 강제할지, 기존 Lab 동작과 동일하게 감염/틱 스킵만 반영할지 결정 필요.
- 자동 선택 로그를 UI log에 항상 남길지, 작업 변경 시에만 남길지 결정 필요. 추천은 변경 시 1회입니다.
