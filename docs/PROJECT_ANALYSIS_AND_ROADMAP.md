# The Neural Factory — 프로젝트 분석 및 로드맵

> 최종 갱신: 2026-05-15
> 기준: 소스 코드 직접 확인 (config.ts, buildings/, managers/, enemies/ 전체)

---

## 1. 결론 요약

현재 프로젝트는 **공장 자동화 + 타워 디펜스**의 핵심 루프가 실제로 동작하는 상태다. ModelTrainingLab, Recycler, Data Cache, DDoS Packet, 난이도 선택, 모바일 터치 UI까지 구현되어 있다.

가장 긴급한 문제 두 가지는 다음과 같다.

1. **Fiber 케이블 해금 불가** — `TECH_FIBER_OPTIC` 연구 노드가 CONFIG에 없음
2. **INFERENCE_UNIT 생산 불가** — ENERGY 아이템 생산 경로 미정의

이 두 가지가 해결되어야 후반 루프가 완결된다. 그 다음은 밸런스 검증과 QoL 개선 순서다.

### 현재 활성 문서

| 문서 | 역할 |
|------|------|
| `docs/CONCEPT.md` | 게임 콘셉트와 방향성 |
| `docs/PROJECT_ANALYSIS_AND_ROADMAP.md` | 총괄 분석 및 로드맵 (이 문서) |
| `docs/PLAYABILITY_HARDENING_PLAN.md` | 모바일/데스크톱 QA 및 조작성 안정화 계획 |
| `docs/QA_CHECKLIST.md` | 수동 QA 체크리스트 |
| `docs/AP_SESSION_RELAY_REWORK_PLAN.md` | AP 무선 중계 재설계 계획 |

완료되었거나 흡수된 과거 문서는 `docs/archive/`에 보존한다.

---

## 2. 실제 구현 상태 (코드 기반)

### 2.1 핵심 게임 루프

```
[자원 채굴]
  Miner (SILICON patch) → outputBuffer → Conveyor → Storage

[데이터 생산]
  DataDownloader → RAW_DATA → 케이블 → Processor
  → LABELED_DATA → WeightTrainer → WEIGHT_UPDATE → 케이블 → Core
    → Confidence Score +10 → 연구 해금

[고급 생산] (TECH_ADVANCED_PROCESSING 해금 후)
  WEIGHT_UPDATE + SILICON → NeuralTrainer → TRAINED_MODEL
  → ModelTrainingLab → 타워 modelConfidence 상승
  ❌ INFERENCE_UNIT: ENERGY 아이템 생산 경로 없음 → 현재 불가

[방어]
  Classifier/Filter/Firewall — 탄약 없이 발사 (AMMO_CONSUMPTION: 0)
  데미지 = base × researchMultiplier × (0.6 + confidence/125)
  명중률 = 0.45 + confidence/180 (최대 95%)
  → ModelTrainingLab으로 confidence를 올리면 성능 향상
```

### 2.2 구현 현황표

| 영역 | 상태 | 비고 |
|------|------|------|
| 핵심 생산 루프 | ✅ 동작 | RAW_DATA → WEIGHT_UPDATE 정상 |
| ModelTrainingLab | ✅ 동작 | 타워별 confidence 관리, Auto Train |
| 물류 (케이블/AP) | ✅ 동작 | 양방향 자동 감지, AP 무선 중계 |
| 물류 (컨베이어) | ✅ 동작 | Silicon 전용, 드래그 배치 |
| Recycler | ✅ 동작 | 5종 데이터 2개 → Silicon 1개 |
| Data Cache | ✅ 동작 | Storage 서브클래스, 데이터 전용 버퍼 20 |
| 전력망 | ✅ 동작 | 네트워크 분리, 블랙아웃, 범위 병합 |
| 방어 타워 | ✅ 동작 | Classifier(Lock-on), Filter(AoE), Firewall(차단) |
| 적 웨이브 | ✅ 동작 | 5종 적, 보스, DDoS 스웜 |
| 연구 트리 | ✅ 동작 | 13개 노드, Confidence Score 차감 |
| 저장/로드 | ✅ 동작 | localStorage, 마이그레이션 없음 |
| 메인 메뉴/난이도 | ✅ 동작 | Easy/Normal/Hard/Nightmare |
| 모바일 지원 | ⚠️ 1차 구현 | 터치/핀치/액션바 구현됨, QA 재검증 필요 |
| **Fiber 해금** | ❌ 막힘 | `TECH_FIBER_OPTIC` 연구 누락 |
| **INFERENCE_UNIT** | ❌ 막힘 | ENERGY 아이템 생산 경로 없음 |
| 자동 테스트 | ❌ 없음 | `npm run build`만 가능 |
| 저장 마이그레이션 | ❌ 없음 | version 필드 있으나 분기 없음 |

---

## 3. 핵심 문제 분석

### 3.1 Fiber 해금 불가 (Critical)

**원인:** `config.ts:272`
```typescript
FIBER: { UNLOCK_REQUIRED: 'TECH_FIBER_OPTIC' }
```
`CONFIG.RESEARCH`에 `TECH_FIBER_OPTIC` 노드가 없다.

**영향:** 케이블 업그레이드 진행감 단절, 물류 병목 해소 수단 부재

**해결:** `CONFIG.RESEARCH`에 노드 추가
```typescript
TECH_FIBER_OPTIC: {
    ID: 'TECH_FIBER_OPTIC',
    NAME: '광섬유 케이블',
    COST: 150,
    DESCRIPTION: '광섬유 케이블을 해금합니다. 대역폭 8, 큐 20으로 대용량 데이터 전송이 가능합니다.',
    REQUIREMENTS: ['TECH_DISTRIBUTED_AP'],
    UNLOCKS: { CABLES: ['FIBER'] }
}
```

### 3.2 INFERENCE_UNIT 생산 불가 (Critical)

**원인:** `config.ts:303-307`의 `INFERENCE_UNIT_PRODUCTION` 레시피가 `ENERGY` 아이템을 요구하나, Miner는 SILICON만 생산하고 PowerPlant는 전력만 생산한다.

**해결 방안 (택 1):**

| 방안 | 내용 | 권장 |
|------|------|------|
| A | Miner가 ENERGY 패치 위에서 ENERGY 아이템 생산 | ⭐ 권장 |
| B | 레시피에서 ENERGY 제거, SILICON만 요구 | 빠르나 테마 약화 |
| C | Energy Converter 신규 건물 추가 | 작업량 많음 |

### 3.3 밸런스 미검증

실제 플레이 데이터 없이 수식만으로 조정됨.

**주요 검증 필요 항목:**
- Normal 기준 웨이브 1~20 난이도 곡선
- DDoS 스웜이 Filter 없이 버틸 수 있는지 여부
- Recycler/Data Cache가 실제로 선택되는 상황인지
- Hard 난이도가 수치 뻥튀기 이상의 전략적 압박을 주는지

### 3.4 저장/로드 마이그레이션 부재

`SaveData.version = '1.0.0'`이지만 로드 시 버전 분기가 없다. 신규 건물/시스템 추가마다 기존 저장 파일 호환성이 깨질 수 있다.

### 3.5 코드 비대화

- `UIManager.ts`: ~39KB — HUD/설정/연구/빌드바/모바일/툴팁 전부
- `MainScene.ts`: ~38KB — 입력/배치/케이블/오버레이/업데이트 전부

점진적 분리가 필요하나 즉각적인 대규모 리팩터링은 리스크가 크다.

---

## 4. 게임 밸런스 수치 (코드 기반)

### 4.1 Confidence Score 경제

| 아이템 | Core 기여 | 생산 체인 |
|--------|-----------|----------|
| WEIGHT_UPDATE | +10 | DataDownloader → Processor(3t) → WeightTrainer(5t) |
| LABELED_DATA | +2 | DataDownloader → Processor(3t) |
| RAW_DATA 등 | +0.1 | — |

WeightTrainer 1개 기준 분당 약 75 Confidence 생산 (8 ticks/개 × 분당 약 7.5개).

### 4.2 타워 성능 (탄약 없음)

| 타워 | 데미지 | Fire Rate | Range | 특징 |
|------|--------|-----------|-------|------|
| Classifier | 25 | 2 ticks | 4 | Lock-on, 투사체 |
| Filter | 10 | 4 ticks | 3 | AoE 범위 스캔 |
| Firewall | 5 | 1 tick | 1 | HP 500, 적 속도 0 |

**데미지 공식:** `base × researchMultiplier × (0.6 + confidence/125)`  
**명중률:** `0.45 + confidence/180` (최대 95%)

초기 confidence 35 기준: 데미지 88%, 명중률 64%  
최대 confidence 100 기준: 데미지 140%, 명중률 ~100%

### 4.3 웨이브 스케일링

| 구간 | 적 수 | HP 배율 |
|------|-------|---------|
| Wave 1~5 | 4 + wave | 1.0 |
| Wave 6~15 | 8 + wave×1.5 | 1.25 + (wave-5)×0.04 |
| Wave 16+ | 18 + wave×1.8 | 1.8 + (wave-15)×0.12 |

10의 배수 Wave: 보스(OVERFITTED_MODEL) 추가  
Wave 8+: DDoS 스웜 8~12마리 추가 (전체 처치 시 Silicon +5)

### 4.4 난이도 배율

| 난이도 | 적 HP × | 스폰 × | 보상 × | Cooldown |
|--------|---------|--------|--------|----------|
| Easy | 0.7 | 0.8 | 1.2 | 25s |
| Normal | 1.0 | 1.0 | 1.0 | 20s |
| Hard | 1.5 | 1.3 | 0.8 | 15s |
| Nightmare | 2.0 | 1.5 | 0.6 | 12s |

Normal → Hard 간 HP 50% 상승이 급격하다. 검토 필요.

---

## 5. 로드맵

### Phase A: Critical 버그 수정 (즉시)

- [ ] `TECH_FIBER_OPTIC` 연구 노드 추가 (`config.ts`)
- [ ] INFERENCE_UNIT 생산 루프 결정 및 구현 (방안 A/B 택일)

### Phase B: QoL 안정화

- [ ] 모바일 QA 재검증 (390×844, 844×390, 768×1024)
- [ ] 건물 상태 피드백 강화 (전력부족/버퍼막힘 시각화)
- [ ] 저장 버전 마이그레이션 도입
- [ ] Solar Panel RANGE 0 UI 명시 ("독립 전력 전용")

### Phase C: 밸런스 패스

- [ ] Normal 기준 Wave 1~20 실플레이 데이터로 조정
- [ ] Hard 난이도 HP 배율 완화 검토 (1.5 → 1.25)
- [ ] DDoS 스웜 출현 빈도와 Filter 필요성 검증
- [ ] Recycler/Data Cache 실제 효용 검증

### Phase D: 전략 콘텐츠 확장

- [ ] EMP Tower (DDoS/고속 적 대응)
- [ ] Honeypot (방어 배치 전략 분기)
- [ ] AP Session Relay 방식 재설계 (`docs/AP_SESSION_RELAY_REWORK_PLAN.md` 참조)
- [ ] 이벤트 웨이브 시스템
- [ ] 게임오버 결과 화면 + 패인 분석

### Phase E: 구조 및 품질

- [ ] `InputController` 분리 (MainScene에서 입력 책임 이동)
- [ ] `MobileUIManager` 분리
- [ ] Vitest 단위 테스트 도입 (연구 해금, 난이도 배율, 저장 마이그레이션)
- [ ] `as any` 사용 축소

### Phase F: 출시형 마감

- [ ] PWA 패키징 검토 (Capacitor)
- [ ] 튜토리얼 텍스트 최신화
- [ ] 사운드/이펙트 품질 향상
- [ ] Itch.io 배포

---

## 6. 기술 부채 요약

| 항목 | 심각도 | 근거 |
|------|--------|------|
| Fiber 연구 누락 | 🔴 치명 | `config.ts` TECH_FIBER_OPTIC 없음 |
| ENERGY 아이템 생산 없음 | 🔴 치명 | Miner/PowerPlant 코드 |
| 저장 마이그레이션 없음 | 🟠 높음 | `SaveManager.ts` version 분기 없음 |
| UIManager 과대화 | 🟠 높음 | ~39KB, 책임 과다 |
| MainScene 과대화 | 🟠 높음 | ~38KB, 책임 과다 |
| EventBus.off 전체 삭제 | 🟠 높음 | 이름만으로 off() 시 모든 listener 삭제 |
| Solar Panel RANGE 0 미표시 | 🟡 중간 | 자기 타일만 커버, UI 설명 없음 |
| AP O(n) 전체 순회 | 🟡 중간 | `transferWirelessData`: 모든 건물 순회 |
| as any 남용 | 🟡 중간 | MainScene 참조 타입 불안정 |
| legacy/ 빈 파일 | 🟢 낮음 | `src/buildings/legacy/` 4개 |
