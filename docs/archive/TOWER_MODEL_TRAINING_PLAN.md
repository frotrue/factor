# Tower Model Training & Inference Targeting Plan

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

> 작성일: 2026-05-14  
> 목적: The Neural Factory의 방어를 "탄약을 쏘는 타워"가 아니라 "학습된 추론 모델이 적을 인식하고 처리하는 시스템"으로 느껴지게 만든다.  
> 범위: 별도 학습 건물 추가, 타워별 모델 confidence 관리, 추론 모델의 바운딩 박스 타겟팅 이펙트 설계.

---

## 1. 한 줄 결론

`Weight Update`를 타워 탄약으로 소비하는 구조를 줄이고, 별도 `Model Training Lab`에서 각 방어 타워의 개별 모델을 학습시켜 `modelConfidence`를 올리며, 공격 시 적을 바운딩 박스로 탐지/분류하는 이펙트를 보여주는 방향이 가장 컨셉에 맞다.

---

## 2. 현재 문제

### 2.1 Confidence가 탄약 수처럼 느껴짐

현재 `DefenseTower.tryFire()`는 타워 `inputBuffer`에 쌓인 `WEIGHT_UPDATE` 수량을 기준으로 confidence를 계산한다.

- 관련 파일: `src/buildings/DefenseTower.ts`
- 현재 체감: `Weight Update`가 모델 업데이트가 아니라 탄약처럼 보인다.
- 문제: 플레이어가 "AI 모델을 학습시킨다"보다 "타워에 탄을 넣는다"로 이해하기 쉽다.

### 2.2 Trained Model / Inference Unit의 존재감이 약함

`TRAINED_MODEL`, `INFERENCE_UNIT` 레시피와 아이템은 이미 있지만, 방어 성능의 중심은 아직 `WEIGHT_UPDATE` 직접 소비에 가깝다.

- 관련 파일: `src/config.ts`, `src/buildings/NeuralTrainer.ts`
- 문제: 고급 AI 산출물이 전투 체감으로 연결되지 않는다.

### 2.3 추론 모델의 공격 표현이 일반 투사체임

현재 방어 공격 이펙트는 흰 선과 흰 투사체 중심이다.

- 관련 파일: `src/managers/EffectsManager.ts`
- 문제: `Classifier`, `Filter`, `Inference`라는 이름과 달리 적을 "인식/분류/탐지"하는 느낌이 약하다.

---

## 3. 목표 플레이 감각

플레이어는 다음 순서로 게임을 이해해야 한다.

```text
Raw Data / Signal Packet 수집
-> Labeled Data / Weight Update 생산
-> Model Training Lab에서 특정 방어 타워의 모델 학습
-> 해당 타워의 modelConfidence 상승
-> 적을 더 정확히 탐지하고 바운딩 박스로 처리
-> Adversarial Data는 박스를 흔들거나 인식을 방해
```

핵심은 전역 confidence가 아니라 **각 타워가 자기 모델 품질을 갖는 것**이다.

---

## 4. 신규 건물: Model Training Lab

### 4.1 역할

`Model Training Lab`은 전투 타워에 직접 연결된 학습소다. 플레이어는 학습소 UI에서 대상 방어 타워를 선택하고, `Weight Update` 또는 `Trained Model`을 투입해 해당 타워의 모델을 학습시킨다.

권장 이름:

- 내부 ID: `MODEL_TRAINING_LAB`
- 표시 이름: `Model Training Lab`
- 카테고리: `PRODUCTION` 또는 신규 `AI`
- 역할: 타워별 모델 confidence 상승

### 4.2 입출력

1차 구현에서는 단순하게 간다.

| 입력 아이템 | 효과 |
|---|---|
| `WEIGHT_UPDATE` | 선택된 타워의 `modelConfidence` 소폭 증가 |
| `TRAINED_MODEL` | 선택된 타워의 `modelConfidence` 대폭 증가, `modelVersion` 증가 |
| `INFERENCE_UNIT` | 선택된 타워의 `inferenceCharge` 증가 또는 고급 추론 모드 충전 |

초기 추천 수치:

| 입력 | 추천 효과 |
|---|---:|
| `WEIGHT_UPDATE` | `modelConfidence +5` |
| `TRAINED_MODEL` | `modelConfidence +25`, `modelVersion +1` |
| `INFERENCE_UNIT` | `inferenceCharge +10` 또는 10회 고급 공격 |

`modelConfidence`는 0~100으로 clamp한다.

### 4.3 배치와 대상 선택

추천 1차 방식:

- 학습소는 케이블/컨베이어로 데이터 아이템을 받는다.
- 학습소 클릭 또는 별도 버튼으로 `Training Target` UI를 연다.
- UI에서 현재 배치된 방어 타워 목록을 보여준다.
- 플레이어가 학습 대상 타워를 선택한다.
- 학습소가 입력 아이템을 소비할 때 선택된 타워의 모델 상태를 갱신한다.

대상 선택 기준:

- 1차: 맵 전체 방어 타워 중 선택 가능
- 2차 확장: 학습소 반경 또는 네트워크 연결된 타워만 선택 가능

1차에서는 전역 선택이 구현 난이도 대비 효과가 좋다.

---

## 5. 타워별 모델 상태

### 5.1 DefenseTower에 추가할 상태

`DefenseTower`에 다음 필드를 추가한다.

```ts
modelConfidence: number; // 0~100
modelVersion: number;
inferenceCharge: number;
```

추천 초기값:

```ts
modelConfidence = 35;
modelVersion = 1;
inferenceCharge = 0;
```

이유:

- 0부터 시작하면 초반 방어가 너무 답답할 수 있다.
- 35 정도면 "기본 모델은 있지만 학습이 필요하다"는 느낌을 준다.

### 5.2 전투 계산

현재 버퍼 수량 기반 confidence 계산을 타워의 `modelConfidence` 기반으로 바꾼다.

권장 공식:

```text
confidenceFactor = 0.6 + modelConfidence / 125
actualDamage = baseDamage * researchMultiplier * confidenceFactor
hitChance = 0.45 + modelConfidence / 180
```

예상 결과:

| modelConfidence | 피해 배율 | 기본 명중률 |
|---:|---:|---:|
| 0 | 0.60x | 45% |
| 35 | 0.88x | 64% |
| 70 | 1.16x | 84% |
| 100 | 1.40x | 약 100%, 상한 필요 |

명중률은 최종적으로 95% 정도에 clamp하는 것을 권장한다.

### 5.3 Adversarial Data 대응

`ADVERSARIAL` 적은 기존처럼 명중률을 낮추되, 낮은 confidence 타워에서 더 크게 흔들리게 한다.

예시:

```text
Adversarial finalHitChance =
  hitChance * enemy.getHitChanceMultiplier() * adversarialConfidenceResist

adversarialConfidenceResist =
  0.65 + modelConfidence / 300
```

효과:

- 낮은 confidence 타워는 Adversarial에 크게 흔들림
- 학습된 타워는 Adversarial 교란을 일부 극복

---

## 6. Training Lab UI 팝업

### 6.1 목적

플레이어가 "어느 타워 모델을 학습시킬지" 직접 선택하게 한다.

### 6.2 UI 구성

팝업 제목:

```text
Model Training Lab
```

표시 요소:

| 영역 | 내용 |
|---|---|
| 입력 버퍼 | 현재 학습소에 들어온 `WEIGHT_UPDATE`, `TRAINED_MODEL`, `INFERENCE_UNIT` 수량 |
| 대상 타워 목록 | `Classifier`, `Filter`, `Firewall` 또는 추후 추론 타워 |
| 타워 상태 | `Model Confidence`, `Model Version`, `Inference Charge` |
| 액션 버튼 | `Set Target`, `Train Once`, `Auto Train` |

1차 구현에서는 `Set Target`과 `Auto Train`만 있어도 충분하다.

### 6.3 대상 타워 목록 표기

예시:

```text
Classifier #3
Confidence: 62%
Version: v2
Status: Targeting Malware lane
```

좌표도 함께 표시하면 디버깅과 플레이에 유용하다.

```text
Classifier (12, -4)
```

### 6.4 UX 규칙

- 선택된 타워는 맵에서 짧게 링 하이라이트를 표시한다.
- 학습 완료 시 해당 타워 위에 `MODEL +5%` 같은 작은 플로팅 텍스트를 띄운다.
- 대상 타워가 제거되면 학습소 target을 자동 해제한다.
- target이 없으면 입력 아이템을 소비하지 않는다.

---

## 7. 추론 모델 바운딩 박스 공격 이펙트

### 7.1 핵심 방향

일반 투사체 대신, 타워가 적을 "AI 비전 모델처럼 탐지"하는 느낌을 준다.

기본 연출:

1. 타워에서 타겟으로 얇은 스캔 라인이 뻗는다.
2. 타겟 주변에 바운딩 박스가 생성된다.
3. 박스 모서리 또는 라벨에 적 타입과 confidence가 표시된다.
4. 명중 시 박스가 조여들거나 글리치 후 피해 적용.

### 7.2 타워별 이펙트

| 타워 | 이펙트 |
|---|---|
| `CLASSIFIER` | 단일 적 바운딩 박스 + 라벨 + 정확도 표시 |
| `FILTER` | 범위 내 여러 적에게 짧은 다중 박스/스캔라인 |
| `FIREWALL` | 접촉 적에게 붉은 차단 프레임, `BLOCKED` 또는 `QUARANTINED` |

### 7.3 Confidence별 박스 품질

| Confidence | 시각 표현 |
|---:|---|
| 0~30 | 붉은 점선 박스, 위치 흔들림 큼, 라벨 `LOW CONF` |
| 31~70 | 노란/보라 박스, 약한 흔들림 |
| 71~100 | 청록/분홍 안정 박스, 라벨에 높은 confidence 표시 |

### 7.4 Adversarial 전용 표현

`ADVERSARIAL` 적은 다음 효과를 가진다.

- 바운딩 박스가 적 중심에서 살짝 벗어남
- 박스가 2~3개 잔상처럼 겹침
- 라벨이 `??%` 또는 `ADV SHIFT`처럼 흔들림
- 명중 실패 시 박스가 깨지는 효과

이 효과는 현재 `ADVERSARIAL`의 낮은 명중률과 잘 연결된다.

### 7.5 구현 위치

권장 메서드:

```ts
EffectsManager.playInferenceTargeting(options)
```

예상 인자:

```ts
{
  towerType: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  targetType: string;
  confidence: number;
  hit: boolean;
  onHit: () => void;
}
```

기존 `playDefenseShot()`은 남겨두되, 추론형 타워는 새 이펙트를 사용한다.

---

## 8. 구현 단계

### Phase 1: 데이터 모델 추가

목표:

- 타워별 모델 상태를 저장한다.
- 기존 공격 로직은 최대한 유지하되 confidence 계산만 교체한다.

작업:

1. `DefenseTower`에 `modelConfidence`, `modelVersion`, `inferenceCharge` 추가
2. `tryFire()`에서 inputBuffer 기반 confidence 계산 제거 또는 후순위화
3. `modelConfidence` 기반 피해량/명중률 계산
4. 타워 툴팁에 모델 상태 노출

관련 파일:

- `src/buildings/DefenseTower.ts`
- `src/managers/UIManager.ts`
- `src/types.ts`

완료 기준:

- 타워마다 confidence 수치가 다르게 유지된다.
- confidence가 높은 타워가 더 잘 맞추고 더 강하다.

### Phase 2: Model Training Lab 추가

목표:

- 플레이어가 특정 타워 모델을 학습할 수 있다.

작업:

1. `CONFIG.BUILDINGS.MODEL_TRAINING_LAB` 추가
2. `BuildingFactory`에 새 건물 생성 case 추가
3. `ModelTrainingLab.ts` 추가
4. 입력 버퍼에서 학습 아이템 소비
5. 선택된 타워에 confidence/version/charge 적용

관련 파일:

- `src/config.ts`
- `src/buildings/ModelTrainingLab.ts`
- `src/buildings/BuildingFactory.ts`
- `src/types.ts`
- `src/managers/SaveManager.ts`

완료 기준:

- 학습소를 배치할 수 있다.
- 학습소가 `WEIGHT_UPDATE` 또는 `TRAINED_MODEL`을 받아 선택된 타워 confidence를 올린다.

### Phase 3: Training Lab UI 팝업

목표:

- 대상 타워 선택과 상태 확인을 UI로 제공한다.

작업:

1. `UIManager` 또는 별도 `TrainingUIManager`에 팝업 생성
2. 방어 타워 목록 렌더링
3. 선택된 타워 하이라이트
4. target 해제/재선택 처리

관련 파일:

- `src/managers/UIManager.ts`
- `src/scenes/MainScene.ts`
- `src/buildings/ModelTrainingLab.ts`
- `src/styles/main.css`

완료 기준:

- 팝업에서 타워를 선택할 수 있다.
- 선택된 타워의 `Model Confidence`가 보인다.

### Phase 4: 바운딩 박스 추론 이펙트

목표:

- 추론 모델이 적을 인식하고 처리하는 전투 느낌을 만든다.

작업:

1. `EffectsManager.playInferenceTargeting()` 추가
2. `DefenseTower.fireProjectile()` 또는 새 메서드에서 타워 타입별 이펙트 호출
3. confidence별 박스 흔들림/색상/라벨 적용
4. Adversarial 전용 글리치 박스 적용

관련 파일:

- `src/managers/EffectsManager.ts`
- `src/buildings/DefenseTower.ts`
- `src/enemies/BaseEnemy.ts`

완료 기준:

- Classifier/Filter 공격이 일반 탄환이 아니라 바운딩 박스 탐지로 보인다.
- 낮은 confidence와 Adversarial 상황이 시각적으로 구분된다.

### Phase 5: 저장/로드 대응

목표:

- 새 타워 모델 상태와 학습소 target이 저장된다.

작업:

1. `SaveManager`의 건물 저장 데이터에 모델 상태 추가
2. 로드 시 누락 필드 기본값 채우기
3. 학습소 target은 좌표 기반으로 저장하거나 로드 후 재연결

관련 파일:

- `src/managers/SaveManager.ts`
- `src/types.ts`

완료 기준:

- 저장/로드 후 타워 confidence가 유지된다.
- 제거된 타워를 target으로 가진 학습소가 오류 없이 target을 해제한다.

---

## 9. 밸런스 원칙

### 9.1 초반 방어가 막히면 안 됨

초기 `modelConfidence`는 30~40 사이를 권장한다. 학습소가 없어도 초반 웨이브는 방어 가능해야 한다.

### 9.2 학습한 타워는 확실히 달라야 함

confidence 35와 80의 차이는 플레이어가 체감해야 한다.

체감 요소:

- 박스 안정성
- 명중률
- 피해량
- Adversarial 대응력

### 9.3 Weight Update는 여전히 중요해야 함

`Weight Update`를 탄약에서 학습 재료로 바꾸되, 생산 라인의 중요도는 유지한다.

추천:

- `WEIGHT_UPDATE`는 반복 학습에 사용
- `TRAINED_MODEL`은 큰 상승과 version 증가
- `INFERENCE_UNIT`은 고급 공격 또는 충전 자원

---

## 10. 리스크와 대응

| 리스크 | 설명 | 대응 |
|---|---|---|
| UI 복잡도 증가 | 타워별 학습 선택이 어렵게 느껴질 수 있음 | 1차는 단일 target + Auto Train만 제공 |
| 저장 데이터 변경 | 기존 저장 파일에 새 필드가 없음 | 기본값 fallback 추가 |
| 전투 밸런스 붕괴 | confidence가 너무 강하면 학습 타워 하나가 모든 것을 해결 | 피해/명중률 clamp 적용 |
| 성능 문제 | 바운딩 박스 이펙트가 많이 생기면 렌더 비용 증가 | 짧은 duration, Graphics 즉시 destroy |
| 학습소 target 제거 | 대상 타워 삭제 시 참조 오류 가능 | 좌표 lookup 실패 시 target 자동 해제 |

---

## 11. 우선순위 요약

1. `DefenseTower`에 타워별 `modelConfidence` 추가
2. 공격 계산을 탄약 수량 기반에서 타워 confidence 기반으로 변경
3. `Model Training Lab` 건물 추가
4. 학습소에서 방어 타워를 target으로 선택하는 UI 추가
5. `WEIGHT_UPDATE`/`TRAINED_MODEL`로 target 타워 학습
6. 바운딩 박스 추론 이펙트 추가
7. Adversarial 전용 박스 흔들림/글리치 적용
8. 저장/로드에 모델 상태 반영

---

## 12. 바로 구현할 때의 최소 컷

가장 작은 성공 버전은 다음과 같다.

```text
1. DefenseTower가 modelConfidence를 가진다.
2. Model Training Lab을 배치할 수 있다.
3. 학습소 UI에서 타워 하나를 선택할 수 있다.
4. 학습소가 WEIGHT_UPDATE를 소비해 해당 타워 confidence를 올린다.
5. Classifier 공격 시 적 주변에 바운딩 박스가 뜬다.
```

이 5개만 구현해도 컨셉 체감은 크게 좋아진다.

---

## 13. Codex 구현 프롬프트

```text
The Neural Factory에 타워별 AI 모델 학습 시스템을 추가해줘.

목표:
- 기존 DefenseTower가 WEIGHT_UPDATE 버퍼 수량으로 confidence를 계산하는 구조를 줄인다.
- 각 DefenseTower가 modelConfidence, modelVersion, inferenceCharge를 갖게 한다.
- 신규 건물 Model Training Lab을 추가한다.
- Model Training Lab은 WEIGHT_UPDATE / TRAINED_MODEL / INFERENCE_UNIT을 받아 선택된 방어 타워의 모델을 학습시킨다.
- 필요하면 UI 팝업을 만들어 학습 대상 타워를 선택할 수 있게 한다.
- Classifier/Filter 같은 추론 모델 공격은 적을 바운딩 박스로 타겟팅하는 이펙트로 표현한다.
- Adversarial 적은 바운딩 박스가 흔들리거나 어긋나게 표현한다.

우선순위:
1. 최소 기능이 동작하는 작은 구현
2. 저장/로드 호환성
3. UI는 단순하지만 명확하게
4. 대규모 리팩토링 금지

주요 파일:
- src/config.ts
- src/types.ts
- src/buildings/DefenseTower.ts
- src/buildings/ModelTrainingLab.ts
- src/buildings/BuildingFactory.ts
- src/managers/UIManager.ts
- src/managers/EffectsManager.ts
- src/managers/SaveManager.ts
- src/styles/main.css

검증:
- npm run build
- 학습소 배치 가능
- 타워 선택 가능
- WEIGHT_UPDATE 투입 시 선택 타워 confidence 증가
- confidence가 높은 타워가 전투에서 더 안정적
- Classifier 공격 시 바운딩 박스 이펙트 표시
```
