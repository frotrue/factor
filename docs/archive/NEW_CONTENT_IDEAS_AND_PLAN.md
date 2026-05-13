# 🚀 The Neural Factory — 신규 콘텐츠 아이디어 및 구현 계획서

> 작성일: 2026-05-13  
> 기준 버전: v1.0 "The Initial Weight"  
> 로드맵 위치: Phase 3 (시스템 확장)

---

## 목차

1. [콘텐츠 설계 원칙](#1-콘텐츠-설계-원칙)
2. [신규 건물 아이디어](#2-신규-건물-아이디어)
3. [신규 적 유닛 아이디어](#3-신규-적-유닛-아이디어)
4. [신규 시스템 아이디어](#4-신규-시스템-아이디어)
5. [구현 우선순위 및 로드맵](#5-구현-우선순위-및-로드맵)
6. [구현 상세 계획](#6-구현-상세-계획)
7. [밸런스 가이드라인](#7-밸런스-가이드라인)

---

## 1. 콘텐츠 설계 원칙

현재 게임의 핵심 루프 `채굴 → 가공 → 학습 → 방어`를 보존하면서, 아래 원칙에 따라 신규 콘텐츠를 설계합니다.

| 원칙 | 설명 |
|------|------|
| **수평 확장** | 기존 생산 체인의 깊이를 늘리기보다, 분기와 선택지를 추가 |
| **테마 일관성** | 모든 콘텐츠는 AI/신경망/사이버보안 세계관을 따름 |
| **전략적 트레이드오프** | 단순한 상위호환이 아닌, 상황에 따른 선택을 유도 |
| **점진적 복잡성** | 웨이브 진행에 따라 자연스럽게 해금되는 구조 |

---

## 2. 신규 건물 아이디어

### 2.1 생산 계열

#### 🔹 배치 프로세서 (Batch Processor)
- **컨셉**: 입력을 모아 한꺼번에 대량 가공하는 2×1 건물
- **메커니즘**: Labeled Data 4개를 모은 뒤 한 번에 Weight Update 3개 생산 (시간 8틱)
- **트레이드오프**: 단위 효율은 높지만 초기 대기 시간이 김
- **전력 소비**: 25W
- **비용**: Silicon 20
- **해금**: 연구 `TECH_BATCH_PROCESSING` (Cost 180)

#### 🔹 데이터 증강기 (Data Augmenter)
- **컨셉**: 하나의 Labeled Data를 복제하여 2개로 만드는 건물
- **메커니즘**: Labeled Data 1개 → Labeled Data 2개 (시간 6틱)
- **트레이드오프**: 전력을 많이 먹지만 데이터 파이프라인 병목 해소
- **전력 소비**: 18W
- **비용**: Silicon 15
- **해금**: 연구 `TECH_DATA_AUGMENTATION` (Cost 150)

#### 🔹 재활용 분해기 (Recycler)
- **컨셉**: 잉여 아이템을 Silicon으로 역변환
- **메커니즘**: 아무 데이터 아이템 2개 → Silicon 1개 (시간 4틱)
- **트레이드오프**: 비효율적이지만 막힌 버퍼를 해소하고 긴급 자원 확보 가능
- **전력 소비**: 8W
- **비용**: Silicon 8
- **해금**: 연구 `TECH_RECYCLING` (Cost 80)

### 2.2 방어 계열

#### 🔹 EMP 타워 (EMP Tower)
- **컨셉**: 범위 내 적을 일시 정지(2초)시키는 군중제어 타워
- **메커니즘**: 발동 시 범위 3칸 내 모든 적 이동속도 0 (쿨타임 8틱)
- **트레이드오프**: 피해는 없지만 다른 타워와 시너지가 극대화
- **탄약**: Inference Unit 1개 소비
- **전력 소비**: 20W
- **비용**: Silicon 25
- **해금**: 연구 `TECH_EMP_DEFENSE` (Cost 250)

#### 🔹 허니팟 (Honeypot)
- **컨셉**: 적의 어그로를 자신에게 끄는 미끼 건물
- **메커니즘**: HP 300, 반경 6칸의 적이 코어 대신 허니팟을 우선 공격
- **트레이드오프**: 일정 HP를 가지며 파괴 후 재건 필요
- **전력 소비**: 5W
- **비용**: Silicon 12
- **해금**: 연구 `TECH_HONEYPOT` (Cost 120)

#### 🔹 패치 드론 (Repair Drone Hub)
- **컨셉**: 주변 손상된 건물(방화벽 등)을 자동 수리하는 지원 건물
- **메커니즘**: 범위 4칸 내 HP가 있는 건물을 틱마다 HP 5 회복
- **탄약**: Silicon 1개/회복 주기
- **전력 소비**: 15W
- **비용**: Silicon 20
- **해금**: 연구 `TECH_AUTO_REPAIR` (Cost 200)

### 2.3 물류/인프라 계열

#### 🔹 데이터 캐시 (Data Cache)
- **컨셉**: 소형(1×1) 데이터 전용 버퍼 건물
- **메커니즘**: 데이터 아이템만 최대 20개 보관, 케이블로 입출력
- **용도**: 케이블 네트워크의 중간 버퍼 역할
- **전력 소비**: 3W
- **비용**: Silicon 6
- **해금**: 기본 해금

#### 🔹 과충전 노드 (Overcharge Node)
- **컨셉**: 범위는 좁지만(2칸) 범위 내 건물의 생산속도를 25% 증가시키는 전력 노드
- **트레이드오프**: 전력 50W 소비, 좁은 범위
- **비용**: Silicon 25
- **해금**: 연구 `TECH_OVERCHARGE` (Cost 220)

---

## 3. 신규 적 유닛 아이디어

### 3.1 DDoS 스웜 (DDoS Swarm)
- **컨셉**: 매우 낮은 HP(15)의 초소형 적이 대량(8~12마리) 동시 출현
- **특수 행동**: 개별 처치 보상은 없고, 전부 처치 시 Silicon 5 보상
- **위협**: 광역 방어(Filter) 없이는 물량에 압도당함
- **출현 조건**: 웨이브 8 이상
- **색상**: `0x00ff88` (밝은 녹색)

### 3.2 랜섬웨어 (Ransomware)
- **컨셉**: 건물에 도달하면 즉시 파괴하는 대신, 건물을 "잠금(Lock)" 상태로 만듦
- **특수 행동**: 잠긴 건물은 Silicon 10을 지불해야 해제 가능 (감염과 달리 시간 해제 불가)
- **위협**: 생산 라인 핵심 건물 잠금 시 치명적
- **출현 조건**: 웨이브 12 이상
- **HP**: 120, **속도**: 35
- **색상**: `0xff6600` (주황)

### 3.3 딥페이크 (Deepfake)
- **컨셉**: 아군 건물처럼 보이는 위장 적
- **특수 행동**: 처음 5초간 방어 타워에게 타겟팅되지 않음, 이후 정체 노출
- **위협**: 발각 전 코어에 근접할 수 있음
- **출현 조건**: 웨이브 20 이상
- **HP**: 100, **속도**: 40
- **색상**: `0x10b981` (아군과 유사한 녹색)

### 3.4 제로데이 (Zero-Day) — 미니보스
- **컨셉**: 5웨이브마다 출현하는 중간 보스급 적
- **특수 행동**: 방화벽을 무시하고 통과, 접촉 시 방화벽에 큰 피해(HP의 30%)
- **위협**: 방화벽 방어 전략의 카운터
- **출현 조건**: 웨이브 15, 25, 35...
- **HP**: 800, **속도**: 20
- **보상**: Silicon 12
- **색상**: `0xff0000` (강렬한 적색)

---

## 4. 신규 시스템 아이디어

### 4.1 🏆 업적 시스템 (Achievement System)

플레이어의 장기 목표를 제공합니다.

| 업적 | 조건 | 보상 |
|------|------|------|
| 첫 방어 | 웨이브 1 클리어 | 연구 비용 10% 할인 (1회) |
| 데이터 과학자 | Labeled Data 100개 생산 | Data Downloader 생산 속도 +10% |
| 철벽 방어 | 웨이브 10까지 코어 피해 없이 클리어 | 방화벽 1개 무료 지급 |
| 에너지 독립 | Solar Panel 5개 이상 가동 | Solar Panel 비용 30% 감소 |
| 무한 스케일링 | 웨이브 50 도달 | 영구 전체 생산 속도 +5% |

**구현 위치**: `src/managers/AchievementManager.ts` (신규)

### 4.2 📊 통계 대시보드 (Statistics Dashboard)

게임 진행 데이터를 추적하고 보여줍니다.

- **추적 항목**: 총 Silicon 채굴량, 총 적 처치 수, 최고 도달 웨이브, 총 플레이 시간, 건물별 생산량
- **표시 방법**: 설정(Settings) 모달에 "Statistics" 탭 추가
- **구현 위치**: `src/managers/StatsManager.ts` (신규)

### 4.3 🎮 난이도 선택 (Difficulty Modes)

메인 메뉴에서 난이도를 선택합니다.

| 난이도 | 적 HP 배율 | 적 스폰 배율 | 자원 보상 배율 | 웨이브 쿨다운 |
|--------|-----------|-------------|--------------|-------------|
| Easy | 0.7x | 0.8x | 1.2x | 25초 |
| Normal | 1.0x | 1.0x | 1.0x | 20초 |
| Hard | 1.5x | 1.3x | 0.8x | 15초 |
| Nightmare | 2.0x | 1.5x | 0.6x | 12초 |

**구현 위치**: `src/config.ts`에 `DIFFICULTY` 섹션 추가, `MainMenuScene.ts`에 선택 UI

### 4.4 🔬 연구 트리 확장

신규 건물/적에 대응하는 연구 노드를 추가합니다.

```
기존 트리
├── TECH_EFFICIENT_MINING
│   └── TECH_STREAMLINED_PROCESSING
├── TECH_PRECISION_INFERENCE
│   └── TECH_DEFENSE_RANGE
│       └── TECH_RAPID_RESPONSE
│           └── TECH_EMP_DEFENSE ★ (신규)
├── TECH_DISTRIBUTED_AP
├── TECH_FIREWALL_HARDENING
│   └── TECH_HONEYPOT ★ (신규)
│       └── TECH_AUTO_REPAIR ★ (신규)
├── TECH_FAST_CONVEYOR
├── TECH_SOLAR_POWER
│   └── TECH_OVERCHARGE ★ (신규)
├── TECH_ADVANCED_PROCESSING
│   ├── TECH_AUTOMATED_DEFENSE
│   ├── TECH_BATCH_PROCESSING ★ (신규)
│   └── TECH_DATA_AUGMENTATION ★ (신규)
└── TECH_RECYCLING ★ (신규, 독립)
```

### 4.5 🌊 이벤트 웨이브 (Special Wave Events)

특정 웨이브에서 발생하는 특수 상황을 도입합니다.

| 웨이브 | 이벤트 | 효과 |
|--------|--------|------|
| 5 | 데이터 보너스 | 모든 Data Downloader 생산량 2배 (해당 웨이브 동안) |
| 10 | 보스 출현 | Overfitted Model 출현 (기존) |
| 15 | 전력 서지 | 모든 전력 소비 50% 증가 (해당 웨이브 동안) |
| 20 | 대규모 침공 | 적 스폰 수 2배 |
| 25 | 제로데이 + DDoS | Zero-Day 1체 + DDoS Swarm 동시 출현 |

---

## 5. 구현 우선순위 및 로드맵

### 🔴 1순위 — 핵심 게임플레이 확장 (예상 3~4일)

| 항목 | 난이도 | 영향도 |
|------|--------|--------|
| 재활용 분해기 (Recycler) | ★★☆ | 버퍼 관리 QoL |
| 데이터 캐시 (Data Cache) | ★☆☆ | 물류 유연성 |
| DDoS 스웜 적 | ★★☆ | 전략 다양성 |
| 난이도 선택 시스템 | ★★☆ | 리플레이성 |

### 🟡 2순위 — 전략적 깊이 추가 (예상 4~5일)

| 항목 | 난이도 | 영향도 |
|------|--------|--------|
| EMP 타워 | ★★★ | 군중제어 전략 |
| 허니팟 | ★★☆ | 방어 전략 분기 |
| 랜섬웨어 적 | ★★★ | 신규 위협 |
| 이벤트 웨이브 | ★★☆ | 긴장감 |
| 업적 시스템 | ★★☆ | 장기 목표 |

### 🟢 3순위 — 고급 콘텐츠 (예상 5~6일)

| 항목 | 난이도 | 영향도 |
|------|--------|--------|
| 배치 프로세서 | ★★★ | 생산 최적화 |
| 데이터 증강기 | ★★☆ | 생산 분기 |
| 패치 드론 허브 | ★★★ | 방어 지원 |
| 과충전 노드 | ★★☆ | 인프라 확장 |
| 딥페이크/제로데이 적 | ★★★ | 후반 긴장감 |
| 통계 대시보드 | ★★☆ | 정보 가시성 |

---

## 6. 구현 상세 계획

### 6.1 신규 건물 추가 체크리스트

새 건물 1종 추가 시 수정이 필요한 파일 목록:

1. **`src/config.ts`** — `BUILDINGS` 섹션에 건물 설정 추가
2. **`src/types.ts`** — `BuildingType` 유니온에 타입 추가
3. **`src/buildings/[Name].ts`** — 건물 클래스 생성 (`BaseBuilding` 또는 `AbstractProcessor` 상속)
4. **`src/buildings/BuildingFactory.ts`** — 팩토리에 case 추가
5. **`src/buildings/BaseBuilding.ts`** — `drawBody()`에 시각적 외형 추가
6. **`src/config.ts` → `RESEARCH`** — 해금 연구 노드 추가 (필요 시)
7. **`src/managers/SaveManager.ts`** — 저장/로드 호환성 확인

### 6.2 신규 적 추가 체크리스트

1. **`src/config.ts`** — `ENEMIES` 섹션에 적 설정 추가
2. **`src/enemies/BaseEnemy.ts`** — 특수 행동 로직 추가 (type 분기)
3. **`src/managers/WaveManager.ts`** — 스폰 조건 및 확률 추가
4. **`src/managers/SaveManager.ts`** — 저장 호환성 확인

### 6.3 신규 시스템 추가 체크리스트

1. **신규 매니저 파일 생성**: `src/managers/[Name]Manager.ts`
2. **`src/scenes/MainScene.ts`** — 매니저 인스턴스 생성 및 연결
3. **`src/managers/UIManager.ts`** — UI 탭/모달 추가
4. **`index.html`** — DOM 요소 추가 (필요 시)
5. **`src/styles/main.css`** — 스타일 추가 (필요 시)

### 6.4 Recycler 건물 구현 예시 (1순위)

```typescript
// src/buildings/Recycler.ts
import AbstractProcessor from './AbstractProcessor';
import { BuildingOptions } from '../types';

export default class Recycler extends AbstractProcessor {
    constructor(scene: Phaser.Scene, x: number, y: number, config: BuildingOptions = {}) {
        super(scene, x, y, 'RECYCLER', config);
    }

    // 아무 데이터 아이템이든 2개 받아 Silicon 1개 생산
    canAcceptItem(type: string): boolean {
        if (!this.hasPower) return false;
        const dataTypes = ['RAW_DATA', 'LABELED_DATA', 'WEIGHT_UPDATE', 'TRAINED_MODEL'];
        return dataTypes.includes(type) && this.inputBuffer.length < this.maxBufferSize;
    }
}
```

```typescript
// config.ts BUILDINGS 섹션에 추가
RECYCLER: {
    ID: 'RECYCLER',
    NAME: '재활용 분해기 (Recycler)',
    COLOR: 0x78716c,
    DESCRIPTION: '잉여 데이터 아이템 2개를 Silicon 1개로 변환합니다.',
    POWER: { CONSUMPTION: 8, PRODUCTION: 0 },
    CATEGORY: 'PRODUCTION',
    COST: [{ resource: 'SILICON', amount: 8 }]
}

// config.ts RECIPES 섹션에 추가
RECYCLING: {
    INPUTS: [{ type: 'ANY_DATA', amount: 2 }],
    OUTPUT: 'SILICON',
    TIME: 4
}
```

---

## 7. 밸런스 가이드라인

### 건물 밸런스 기준

| 지표 | 기준값 |
|------|--------|
| Silicon ROI (투자회수 틱 수) | 생산건물: 30~60틱 / 방어건물: 웨이브 2~3회분 |
| 전력 효율 (W당 산출) | 기본 건물 대비 ±30% 범위 |
| 버퍼 크기 | 생산 주기의 2~3배 |

### 적 밸런스 기준

| 지표 | 기준값 |
|------|--------|
| HP/보상 비율 | 기본(Noise) 대비 일관된 비율 유지 |
| 특수 능력 빈도 | 전체 스폰 중 특수 적 비율 20~30% |
| 보스 출현 주기 | 기존 10웨이브 + 미니보스 5웨이브 병행 |

### 웨이브별 난이도 곡선 (Normal 기준)

```
웨이브  1~5   : Noise만 출현, 적응 구간
웨이브  6~10  : Malware 합류, 물류 위협 시작
웨이브  8~15  : DDoS Swarm 합류, 광역 방어 필요
웨이브 12~20  : Ransomware 합류, 자원 관리 중요
웨이브 15~    : Adversarial 합류, 정밀 방어 필요
웨이브 20~    : Deepfake 합류, 주시 필요
웨이브 10,20..: Overfitted Model (보스)
웨이브 15,25..: Zero-Day (미니보스)
```

---

## 부록: 파일 영향도 매트릭스

| 파일 | 신규 건물 | 신규 적 | 업적 | 난이도 | 통계 |
|------|:---------:|:-------:|:----:|:------:|:----:|
| `config.ts` | ✅ | ✅ | — | ✅ | — |
| `types.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `BuildingFactory.ts` | ✅ | — | — | — | — |
| `BaseBuilding.ts` | ✅ | — | — | — | — |
| `BaseEnemy.ts` | — | ✅ | — | — | — |
| `WaveManager.ts` | — | ✅ | — | ✅ | ✅ |
| `ResearchManager.ts` | ✅ | — | — | — | — |
| `UIManager.ts` | ✅ | — | ✅ | ✅ | ✅ |
| `SaveManager.ts` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MainScene.ts` | ✅ | — | ✅ | — | ✅ |
| `MainMenuScene.ts` | — | — | — | ✅ | — |
| `index.html` | — | — | ✅ | — | ✅ |

---

> **다음 단계**: 이 문서를 리뷰한 후 구현할 콘텐츠의 우선순위를 확정하고, 개별 항목별 상세 구현에 착수합니다.
