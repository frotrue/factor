# 다음 작업 목록

> 작성일: 2026-05-17  
> 기준: 기술 부채 9/9 완료 이후 상태  
> 빌드: ✅ 통과 (53 modules, 4.21s)

---

## 현재 잔여 기술 부채

| 항목 | 파일 | 건수 | 영향 |
|------|------|------|------|
| `as MainScene` 캐스팅 | `DefenseTower.ts` (10), `Miner.ts` (3), `Conveyor.ts` (2), `ModelTrainingLab.ts` (2), 기타 3 | 20건 | 타입 안전성 부재 |
| `as any` 전체 | 소스 전체 | 39건 | 컴파일 타임 오류 감지 불가 |
| `MainScene.ts` 입력 메서드 잔존 | `MainScene.ts` | 7개 메서드 / ~300줄 | 단일 책임 위반 |

---

## Task 1 — InputController 분리

**우선순위:** 🔴 높음  
**예상 공수:** 2~3시간  
**위험도:** 중간 (mobile 입력 회귀 테스트 필요)

### 배경

`MainScene.ts`에 입력 처리 메서드 7개가 남아 있다. 총 ~300줄 규모로, 배치/케이블/커서 로직이 섞여 있어 버그 추적이 어렵다.

| 메서드 | 현재 위치 | 이동 대상 |
|--------|-----------|-----------|
| `setupInput()` | MainScene.ts:243 | InputController |
| `isPointerOverDomUI()` | MainScene.ts:297 | InputController |
| `setupCursor()` | MainScene.ts:324 | InputController |
| `rotateCursor()` | MainScene.ts:404 | InputController |
| `cancelCurrentAction()` | MainScene.ts:423 | InputController |
| `updateCursorPosition()` | MainScene.ts:493 | InputController |
| `handlePointerAction()` | MainScene.ts:634 | InputController |

### 목표 구조

```
src/controllers/
  OverlayController.ts   ← 완료
  InputController.ts     ← 신규
```

### 구현 규칙

- `InputController`는 생성자에서 `MainScene`을 받는다
- `MainScene`의 기존 메서드는 위임 형태로 유지한다 (`setupInput() { this.inputController.setup(); }`)
- 한 번에 전체 이동하지 말고 메서드 하나씩 이동 후 빌드 확인
- 완료 후 `MainScene.ts` 목표: ~450줄

### 완료 기준

- [x] `src/controllers/InputController.ts` 생성
- [x] 위 7개 메서드 이동 완료
- [x] `MainScene.ts`에서 위임 호출로 교체
- [x] `npm run build` 통과
- [ ] 데스크톱: 건물 배치, 우클릭 삭제, 케이블 연결 정상
- [ ] 모바일(390×844): 탭 배치, 카메라 드래그, 액션바 정상

---

## Task 2 — IMainScene 인터페이스 도입

**우선순위:** 🟠 중간  
**예상 공수:** 1~2시간  
**위험도:** 낮음 (타입만 변경, 런타임 영향 없음)

### 배경

`building` 클래스들이 `(this.scene as MainScene)` 형태로 접근한다. 존재하지 않는 속성 접근도 컴파일이 통과되어 런타임 오류 위험이 있다.

### 구현 내용

**`src/types.ts`에 인터페이스 추가:**

```typescript
export interface IMainScene extends Phaser.Scene {
    researchManager: ResearchManager;
    buildingManager: BuildingManager;
    cableManager: CableManager;
    powerManager: PowerManager;
    waveManager: WaveManager;
    uiManager: UIManager;
    effectsManager: EffectsManager;
    mapManager: MapManager;
    itemManager: ItemManager;
    defenseModelStates: Record<string, DefenseModelState>;
    gameSpeed: number;
    difficultyId: string;
    isMobileLayout: boolean;
    getDefenseModelState(type: string): DefenseModelState;
    trainDefenseModelType(type: string, itemType: string): boolean;
    syncDefenseModelType(type: string): void;
    setGameSpeed(speed: number): void;
}
```

**각 building 클래스에서 교체:**

```typescript
// 변경 전
const mainScene = (this.scene as MainScene);

// 변경 후
const mainScene = (this.scene as IMainScene);
```

### 완료 기준

- [x] `IMainScene` 인터페이스 정의 (`types.ts`)
- [x] `DefenseTower.ts` 10건 교체
- [x] `Miner.ts` 3건, `Conveyor.ts` 2건, `ModelTrainingLab.ts` 2건, 기타 교체
- [x] `npm run build` 통과

---

## Task 3 — 실플레이 밸런스 검증

**우선순위:** 🟠 중간  
**예상 공수:** QA 세션 1~2회  
**위험도:** 없음

### 배경

기술 부채 해소 이후 첫 전체 플레이. 밸런스 수치가 코드에만 존재하고 실데이터 없이 작성됐다.

### 검증 항목

#### 생산 루프

- [ ] ENERGY 패치 위 Miner → ENERGY 아이템 생산 확인
- [ ] ENERGY 아이템 → 케이블 → NeuralTrainer → INFERENCE_UNIT 생산 확인
- [ ] TECH_AUTOMATED_DEFENSE 해금 후 위 루프 실동작 확인
- [ ] Fiber 케이블 해금 (TECH_FIBER_OPTIC) 후 Fiber 선택 가능 확인

#### 밸런스 (Normal 기준)

- [ ] Wave 1~5: 타워 2~3개로 방어 가능한지
- [ ] Wave 6~10: Confidence 50% 이하 타워로 버틸 수 있는지
- [ ] Wave 11~20: ModelTrainingLab 없으면 버거워지는지
- [ ] DDoS 스웜(Wave 8+): Filter 없이 버틸 수 있는지

#### 난이도 검증

- [ ] Hard (HP ×1.5): Normal보다 확실히 어렵지만 클리어 가능한지
  - 만약 너무 어려우면: HP 배율 1.5 → 1.3 완화 검토
- [ ] Easy: 초보자가 Wave 10까지 무리 없이 진행 가능한지

#### 모바일 레이아웃 (QA_CHECKLIST.md 참조)

- [ ] 390×844 (모바일 세로): HUD/빌드바/액션바 겹침 없음
- [ ] 844×390 (모바일 가로): 핵심 UI 접근 가능
- [ ] 768×1024 (태블릿): 레이아웃 이상 없음

---

## Task 4 — AP Session Relay 고도화

**우선순위:** 🟢 낮음 (별도 트랙)  
**예상 공수:** 반나절~1일  
**위험도:** 중간 (CableManager 수정)

### 배경

`docs/AP_SESSION_RELAY_REWORK_PLAN.md`에 설계가 완성되어 있다. `CableManager.transferWirelessData()`가 이미 `inRange`/`senders` 분리 구조로 정리됨.

### 현재 AP 동작 vs 목표

| 항목 | 현재 | 목표 |
|------|------|------|
| 목적지 선택 | 단순 순회 첫 번째 수신자 | 버퍼 여유 큰 수신자 우선 |
| Storage/DataCache 자동 인출 | 됨 (outputBuffer 스캔) | 안 됨 (생산 건물 output만) |
| AP 필터 | 없음 | 선택적 데이터 타입 필터 |
| 처리량 피드백 | 없음 | HUD에 릴레이 수 표시 |

### 구현 항목

- [x] Storage/DataCache를 AP 자동 수거 대상에서 제외
- [x] 수신자 우선순위: 버퍼 여유 큰 건물 우선
- [x] AP 툴팁에 `Relayed this tick: N` 표시
- [x] 설계 문서(`AP_SESSION_RELAY_REWORK_PLAN.md`) 완료 표시

---

## Task 5 — 콘텐츠 확장 (중기)

**우선순위:** 🟢 낮음  
**선행 조건:** Task 3(밸런스 검증) 완료 후 진행

### 5-1. EMP Tower

- 고속 적 (Adversarial, DDoS)에 특화된 방어 타워
- 범위 내 적 이동 속도 일시 감소 (Firewall의 소프트 버전)
- config, BuildingFactory, DefenseTower 패턴 참조

### 5-2. Honeypot

- 일정 범위 내 적을 유인하는 건물
- 전략적 방어 배치 분기를 만드는 것이 목적
- 적 병목 지점 생성 → Firewall/Filter 시너지

### 5-3. 게임오버 결과 화면

- 현재: 게임오버 화면에 재시작 버튼만 있음
- 추가: 최고 Wave, 처치 수, Confidence Score, 플레이 시간 표시
- `WaveManager.ts`의 집계 데이터 활용

### 5-4. 이벤트 웨이브

- 특정 Wave에서 일반 스폰 외 특수 이벤트 발생
- 예: "대역폭 포화 공격" — 일정 시간 데이터 생산 50% 감소

---

## 진행 순서 요약

```
1. InputController 분리       ← 지금 바로 시작 가능
2. IMainScene 인터페이스 도입  ← Task 1과 병행 가능
3. 실플레이 밸런스 검증        ← 1, 2 완료 후
4. AP Session Relay 고도화    ← 3과 병행 가능
5. 콘텐츠 확장                ← 3 완료 후
```
