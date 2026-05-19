# 향후 진행 구현계획서

> 작성일: 2026-05-17  
> 기준: `NEXT_TASKS.md`의 Task 1, 2, 4 완료 이후 상태  
> 목적: 현재 프로젝트를 "기능 구현 가능 상태"에서 "검증 가능한 플레이 가능 빌드"로 끌어올리기

---

## 진행 로그

### 2026-05-19

- Implemented P0/P1 UX hardening: modal close canvas focus restore, safer `EventBus.off(event)`, Solar Panel wording, localized tooltip/training lab strings, tooltip viewport clamping, and blackout/buffer visual warnings.
- Added low-risk P2 placement range preview for power/defense/AP ghost placement and wave route edge warnings from active intrusion routes.
- Verification: `npm test`, `npm run test:e2e`, and `npm run build` passed.

### 2026-05-18

- Fixed game startup camera positioning so the initial viewport centers on the Neural Core, and added Playwright regression coverage across desktop/mobile projects.
- Added a Korean-first language toggle with local i18n helpers, settings controls, save migration, and default Korean UI coverage.
- Added Vitest coverage for translation defaults/key parity and save language migration.
- Added Playwright coverage for default Korean UI and switching to English from settings.
- Verification: `npm test`, `npm run test:e2e`, and `npm run build` passed.

### 2026-05-17

- `vitest`를 도입하고 `npm test` 스크립트를 추가했다.
- 설정 무결성 테스트를 추가했다.
- 저장 데이터 마이그레이션 순수 함수와 테스트를 추가했다.
- AP Relay source/target 선택 로직을 순수 함수로 분리하고 테스트를 추가했다.
- 테스트가 발견한 `TECH_SPLITTER -> SPLITTER` 레거시 해금 불일치를 수정했다.
- `CableManager`, `TickSystem`, `CameraController`, `WaveManager`, 일부 building/enemy 클래스의 Scene 접근 타입을 `IMainScene` 기반으로 정리했다.
- 현재 검증: `npm test` 통과, `npm run build` 통과.
- Vite dev server 스모크 확인: `http://127.0.0.1:5173/` HTTP 200 응답 확인.
- `@playwright/test`와 Chromium 브라우저를 설치하고 E2E 스모크 테스트를 추가했다.
- E2E 스모크 범위: 데스크톱 게임 시작/설정 모달, 모바일 세로/가로 액션바 표시.
- 현재 추가 검증: `npm run test:e2e` 통과.
- E2E 스모크 범위를 데스크톱 canvas 조작까지 확장했다: Data Downloader 배치, Processor 배치, Basic Cable 연결, Remove 모드 케이블 제거.
- Playwright 검증에서 Phaser scene 상태를 안정적으로 확인하기 위해 `window.__NEURAL_FACTORY_GAME__`에 game 인스턴스를 노출했다.
- 모바일 E2E 스모크를 확장했다: 세로/가로 뷰포트에서 Rotate, Remove, Cable, Cancel, Defense, Power 버튼이 scene 상태를 바꾸는지 확인한다.
- 모바일 E2E 스모크를 실제 터치 조작까지 확장했다: 세로/가로 뷰포트에서 Data Downloader와 Processor를 배치하고 Basic Cable을 연결한다.
- 데스크톱 E2E 스모크를 주요 상호작용까지 확장했다: Conveyor, Storage, Weight Trainer, Classifier 배치, 우클릭 제거, `R` 회전, `F1`/`F2` 오버레이, 게임 속도 설정, 저장, 연구 모달을 확인한다.
- 튜토리얼을 새 온보딩 흐름으로 개편했다: 리소스 확인, 데이터 생산, 처리, 연결, 전력, 방어, 연구, 웨이브 순서로 진행한다.
- 튜토리얼 진행 상태를 `tutorialFlow` 순수 유틸로 분리하고 Vitest로 저장 step 계산과 완료 상태를 검증한다.
- 웨이브 수식을 `waveSimulation` 유틸로 분리하고 WaveManager가 같은 수식을 사용하도록 정리했다.
- Wave 1/5/10/12/20, 난이도 배율, DDoS/Boss 압박을 Vitest 시뮬레이션으로 검증한다.
- 2,000~10,000 tick 데이터 생산 루프 시뮬레이션을 추가해 장시간 생산량, confidence 증가, buffer 상한을 검증한다.

---

## 1. 현재 상태 요약

현재 프로젝트는 공장 자동화와 타워 디펜스의 핵심 루프가 대부분 구현된 상태다.

- `MainScene` 입력 책임은 `InputController`로 분리됐다.
- building 클래스의 `as MainScene` 캐스팅은 `IMainScene`으로 대체됐다.
- AP는 Downlink 구조가 아니라 Session Relay 방식으로 동작한다.
- Fiber 연구(`TECH_FIBER_OPTIC`)와 ENERGY 패치 기반 생산 루프는 코드에 존재한다.
- 저장/로드는 기본 마이그레이션 경로를 갖고 있다.

하지만 아직 "게임으로 안정적으로 플레이 가능하다"고 말하려면 검증과 마감 작업이 필요하다. 특히 실제 플레이 QA, 자동 테스트, 모바일 회귀 검증, UI/UX 피드백, 밸런스 데이터 수집이 다음 단계의 핵심이다.

---

## 2. 우선순위 결론

### 가장 먼저 해야 할 일

1. **수동 QA 패스 1회**
   - 기술 부채 정리 이후 실제 조작성 회귀가 가장 큰 리스크다.
   - 데스크톱 배치/삭제/케이블, 모바일 탭/드래그/액션바를 먼저 확인해야 한다.

2. **자동 테스트 기반 구축**
   - 현재 `npm run build`만 검증 수단으로 남아 있다.
   - 연구 해금, 저장 마이그레이션, 물류 규칙 같은 순수 로직부터 테스트해야 한다.

3. **잔여 `as any` 축소**
   - 현재 `src`에 `as any`가 남아 있다.
   - 런타임 오류를 컴파일 단계에서 잡으려면 Manager/Scene 경계 타입을 더 좁혀야 한다.

4. **게임 루프 밸런스 검증**
   - Normal 기준 Wave 1~20, Hard/Easy 난이도, DDoS 대응성이 아직 플레이 데이터로 검증되지 않았다.

5. **콘텐츠 확장**
   - EMP Tower, Honeypot, 게임오버 결과 화면, 이벤트 웨이브는 밸런스 검증 이후에 들어가는 것이 안전하다.

---

## 3. Phase 1 — 회귀 QA 및 플레이 안정화

**우선순위:** 높음  
**예상 공수:** 0.5~1일  
**목표:** 최근 리팩터링 이후 조작/물류/모바일 UI가 깨지지 않았는지 확인

### 구현/진행 항목

- `docs/QA_CHECKLIST.md` 기준으로 데스크톱 QA 수행
- 모바일 뷰포트 3종 확인
  - 390×844
  - 844×390
  - 768×1024
- `InputController` 분리 이후 확인할 핵심 동작
  - 건물 배치
  - 우클릭 삭제
  - 케이블 시작/연결/취소
  - 모바일 탭 배치
  - 모바일 카메라 드래그
  - `R`, `F1`, `F2` 키 입력
- AP Session Relay 확인
  - 생산 건물 output에서만 AP가 데이터를 가져가는지
  - Storage/DataCache에서 자동으로 빼가지 않는지
  - `Relayed this tick` 값이 툴팁에 표시되는지

### 완료 기준

- [ ] `docs/QA_CHECKLIST.md` 주요 항목 체크
- [ ] 데스크톱 핵심 조작 정상
- [ ] 모바일 세로/가로/태블릿에서 UI 치명적 겹침 없음
- [ ] AP 릴레이 규칙 수동 확인
- [ ] 발견 이슈를 `docs/NEXT_TASKS.md` 또는 별도 QA 로그에 기록

### 자동 스모크 완료 항목

- [x] 데스크톱: 메뉴에서 게임 시작 가능
- [x] 데스크톱: 설정 모달 열기/닫기 가능
- [x] 모바일 세로: 게임 시작 후 action bar 표시
- [x] 모바일 가로: 게임 시작 후 action bar 표시
- [x] 모바일 세로/가로: Rotate/Remove/Cable/Cancel/Defense/Power 버튼 상태 변경
- [x] 모바일 세로/가로: 터치 기반 Data Downloader/Processor 배치 및 Basic Cable 연결
- [x] 데스크톱: Data Downloader/Processor 배치
- [x] 데스크톱: Basic Cable 연결 및 Remove 모드 케이블 제거
- [x] 데스크톱: Conveyor/Storage/Weight Trainer/Classifier 배치, 우클릭 제거, 회전/오버레이/저장/연구 모달 스모크
- [x] 데스크톱: 튜토리얼 패널 표시 및 첫 목표 안내 확인
- [x] Vitest: 튜토리얼 진행 순서/저장 step 검증
- [x] Vitest: 웨이브 수식/난이도/DDoS/Boss 시뮬레이션 검증
- [x] Vitest: 장시간 생산 루프 2,000~10,000 tick 시뮬레이션 검증
- [x] 런타임 console/page error 없음

---

## 4. Phase 2 — 자동 테스트 도입

**우선순위:** 높음  
**예상 공수:** 1~2일  
**목표:** 빌드 성공 외에 게임 규칙이 깨졌는지 감지하는 최소 테스트망 구성

### 추천 도구

현재 devDependency에 `typescript`, `vite`, `playwright-core`만 있다. 단위 테스트는 `vitest` 도입을 권장한다.

```bash
npm install -D vitest
```

### 테스트 우선순위

#### 2-1. 설정 무결성 테스트

- `CONFIG.BUILDINGS`의 모든 `UNLOCK_REQUIRED`가 `CONFIG.RESEARCH`에 존재하는지
- `CONFIG.CABLES`의 모든 `UNLOCK_REQUIRED`가 `CONFIG.RESEARCH`에 존재하는지
- 모든 recipe input/output item이 `CONFIG.ITEMS`에 존재하는지
- 모든 research unlock 대상이 실제 building/recipe/cable에 존재하는지

#### 2-2. 저장 마이그레이션 테스트

- version 없는 save data가 현재 구조로 보정되는지
- `buildings`, `items`, `cables`, `settings`, `research` 누락 시 기본값이 채워지는지
- 구버전 cable queue가 `CablePacket` 구조로 정규화되는지

#### 2-3. 물류 규칙 테스트

- Cable은 data item만 전송하는지
- Storage는 `getOutputSource()`로 `inputBuffer`를 내보내는지
- DataCache는 data item만 받는지
- AP는 Storage/DataCache를 자동 source로 삼지 않는지
- AP 수신자는 buffer 여유가 큰 후보가 우선되는지

### 완료 기준

- [x] `npm test` 스크립트 추가
- [x] 설정 무결성 테스트 작성
- [x] 저장 마이그레이션 테스트 작성
- [x] AP/Cable 핵심 규칙 테스트 작성
- [x] `npm run build`와 `npm test` 모두 통과

---

## 5. Phase 3 — 타입 안정성 강화

**우선순위:** 중간~높음  
**예상 공수:** 1~2일  
**목표:** 남은 `as any`를 줄이고 Manager/Scene 경계 타입을 명확히 만들기

### 현재 문제

`src`에는 아직 `as any`가 여러 곳에 남아 있다. 주요 원인은 다음과 같다.

- `Phaser.Scene`으로 받은 객체가 실제로는 `MainScene`이라는 가정
- building별 custom state 타입 부재
- enemy effect graphics 같은 optional 런타임 필드 타입 부재
- EventBus 내부 generic 타입 미정리

### 구현 순서

#### 3-1. Scene 인터페이스 확장

- `IGameSceneRuntime` 또는 기존 `IMainScene`을 확장한다.
- `tickSystem`, `soundManager`, `inventoryManager`, `tutorialManager`, `saveManager` 등 실제 참조되는 필드를 포함한다.
- `CableManager`, `TickSystem`, `CameraController`, `WaveManager`에서 `as any`를 `IMainScene` 계열로 교체한다.

#### 3-2. Building custom state 타입 분리

추천 타입:

```typescript
export interface CustomStateProvider {
    getCustomState(): object;
}

export interface RecipeState {
    recipe?: string;
}
```

적용 대상:

- `SaveManager`
- `NeuralTrainer`
- `ModelTrainingLab`
- `DefenseTower`

#### 3-3. EventBus 타입 개선

- 현재 string event 기반은 유지한다.
- 우선 `any` 제거가 목적이므로 지나치게 큰 이벤트 타입 시스템은 피한다.
- 최소한 listener 배열 타입을 명시해 내부 `as any`를 제거한다.

### 완료 기준

- [ ] `as any` 사용량 50% 이상 감소
- [x] `CableManager`, `TickSystem`, `CameraController`, `WaveManager`의 Scene 참조 타입 정리
- [ ] `SaveManager` custom state 접근 타입 정리
- [ ] `npm run build` 통과

---

## 6. Phase 4 — 밸런스 검증 및 수치 조정

**우선순위:** 중간  
**예상 공수:** QA 세션 1~2회 + 조정 0.5일  
**목표:** 게임이 초반부터 후반까지 의도한 압박 곡선을 갖는지 확인

### 검증 시나리오

#### Normal 기준

- Wave 1~5: 초보자가 타워 2~3개로 막을 수 있어야 한다.
- Wave 6~10: confidence 50% 이하에서도 방어가 가능해야 한다.
- Wave 11~20: ModelTrainingLab 없이 진행하면 압박이 느껴져야 한다.
- Wave 8+ DDoS: Filter가 있으면 확실히 편해져야 한다.

#### Easy 기준

- Wave 10까지 큰 막힘 없이 진행 가능해야 한다.
- 연구/케이블/고급 생산을 실험할 여유가 있어야 한다.

#### Hard 기준

- Normal보다 명확히 어렵되, 초반 억까로 보이면 안 된다.
- 필요 시 HP 배율 1.5를 1.3~1.35로 완화한다.

### 수집할 데이터

- Wave별 코어 HP
- Wave별 타워 수
- Wave별 confidence
- 첫 ModelTrainingLab 건설 시점
- 첫 Fiber 사용 시점
- 첫 INFERENCE_UNIT 생산 시점
- 게임오버 Wave와 원인

### 완료 기준

- [x] Normal Wave 20까지 자동 수식/HP 압박 시뮬레이션 확보
- [ ] Normal Wave 20까지 1회 이상 실제 플레이 로그 확보
- [ ] Easy Wave 10까지 확인
- [ ] Hard Wave 10까지 확인
- [ ] 필요 수치 조정 PR/커밋 단위로 반영
- [ ] 밸런스 결과를 `docs/QA_CHECKLIST.md` 또는 별도 로그에 기록

---

## 7. Phase 5 — UI/UX 피드백 강화

**우선순위:** 중간  
**예상 공수:** 1~2일  
**목표:** 플레이어가 막힌 이유를 즉시 알 수 있게 만들기

### 개선 항목

#### 5-1. 건물 상태 표시 강화

현재 compact info sheet에 일부 상태가 있으나, 필드 위에서 막힌 이유가 더 명확해야 한다.

추가 후보:

- 전력 부족
- input full
- output full
- recipe 재료 부족
- cable queue 포화
- AP relay idle/no receiver

#### 5-2. 연구/생산 가이드

플레이어가 다음 목표를 놓치지 않게 한다.

예:

- `Need ENERGY for Inference Units`
- `Build Miner on ENERGY patch`
- `Unlock Fiber to relieve cable congestion`
- `Train models in Model Training Lab`

#### 5-3. AP 상태 가시화

- AP 툴팁 외에도 필드 위 짧은 상태 텍스트 검토
- `0/2 relayed`가 오래 지속되면 source/receiver 부재를 표시
- 단, 화면 노이즈가 많아지면 툴팁과 모바일 정보 시트까지만 유지

### 완료 기준

- [ ] 주요 막힘 상태가 UI에서 설명됨
- [ ] 모바일 정보 시트에도 동일 정보 반영
- [ ] 튜토리얼 또는 로그 메시지가 현재 생산 루프와 일치
- [ ] `npm run build` 통과

---

## 8. Phase 6 — 콘텐츠 확장

**우선순위:** 중간~낮음  
**선행 조건:** Phase 4 밸런스 검증 완료  
**목표:** 방어 배치와 웨이브 대응에 선택지를 추가

### 6-1. EMP Tower

**역할:** 고속 적 대응  
**대상:** `ADVERSARIAL`, `DDOS_BOT`

구현 개요:

- `CONFIG.BUILDINGS.EMP_TOWER` 추가
- `BuildingType`에 추가
- `BuildingFactory` 등록
- `DefenseTower` 또는 별도 subclass에서 slow effect 처리
- 적에게 temporary slow 상태 부여

주의:

- Firewall의 벽 역할과 겹치지 않게 "범위 둔화"에 집중한다.
- DDoS 대응 수단이 너무 강해지면 Filter의 존재감이 약해진다.

### 6-2. Honeypot

**역할:** 적 유인 및 경로 교란  
**목표:** 방어 배치 전략 분기 만들기

구현 개요:

- Honeypot 건물 추가
- WaveManager/BaseEnemy 타겟 선택 로직 확장
- 일정 범위 내 적이 Core 대신 Honeypot을 우선 목표로 삼게 함
- HP와 수리/재건 비용으로 밸런스 조정

주의:

- 적 pathing이 복잡해지므로 최소 구현은 "범위 내 목표 우선순위 변경"부터 시작한다.

### 6-3. 게임오버 결과 화면

**역할:** 다음 플레이 동기 제공  
**현재:** 재시작 버튼 중심  
**추가:** 결과 요약과 패인 분석

표시 후보:

- 도달 Wave
- 처치 수
- 획득 Confidence Score
- 생존 시간
- 가장 많이 사용한 타워
- 게임오버 원인 추정

구현 위치:

- `WaveManager` 또는 별도 `RunStatsManager`
- `UIManager` 게임오버 화면
- Save에는 저장하지 않아도 됨

### 6-4. 이벤트 웨이브

**역할:** 반복 웨이브에 변주 추가  
**예시:** 대역폭 포화 공격

구현 후보:

- 특정 wave에서 cable bandwidth 임시 감소
- DDoS 추가 스폰
- 일정 시간 processor 처리 속도 감소
- AP relay 제한 또는 과부하

주의:

- 첫 구현은 한 종류만 넣고, UI 경고를 반드시 같이 넣는다.

---

## 9. Phase 7 — 출시 준비형 마감

**우선순위:** 낮음  
**예상 공수:** 2~5일  
**목표:** 배포 가능한 데모 품질 확보

### 작업 항목

- 튜토리얼 텍스트 최신화
- README 플레이 방법 갱신
- Itch.io용 빌드/배포 가이드 작성
- PWA 또는 Capacitor 패키징 검토
- 사운드/이펙트 볼륨 밸런스 조정
- 저장 파일 초기화/삭제 UI 추가
- 버전 표기 추가

### 완료 기준

- [ ] 신규 플레이어가 README만 보고 실행 가능
- [ ] 튜토리얼이 실제 시스템과 불일치하지 않음
- [ ] 데스크톱/모바일에서 치명적 UI 겹침 없음
- [ ] 빌드 산출물로 배포 테스트 가능

---

## 10. 추천 실행 순서

```text
1. 수동 QA 1회
2. QA 결과 기반 즉시 버그 수정
3. Vitest 도입 및 설정 무결성 테스트 작성
4. 저장/물류/AP 규칙 테스트 추가
5. 남은 as any 축소
6. Normal/Easy/Hard 밸런스 플레이 로그 수집
7. UI/UX 피드백 강화
8. EMP Tower 또는 게임오버 결과 화면 중 하나부터 콘텐츠 확장
```

---

## 11. 다음 작업 티켓 초안

### Ticket A — QA 패스 및 회귀 수정

- `docs/QA_CHECKLIST.md` 수행
- 실패 항목을 `docs/NEXT_TASKS.md`에 기록
- 치명 조작 버그 우선 수정

### Ticket B — Vitest 기반 설정 무결성 테스트

- `vitest` 설치
- `npm test` 스크립트 추가
- config 관계 검증 테스트 작성

### Ticket C — SaveManager 마이그레이션 테스트

- version 없는 저장 데이터 테스트
- 누락 필드 기본값 테스트
- cable queue 정규화 테스트

### Ticket D — AP Relay 테스트 가능 구조화

- AP source/target 선택 로직을 순수 함수로 분리
- Storage/DataCache 제외 테스트
- buffer 여유 우선순위 테스트

### Ticket E — 타입 안정성 2차 패스

- `IMainScene` 확장
- Manager의 `as any` 제거
- custom state 타입 추가

### Ticket F — 게임오버 결과 화면

- run stats 수집
- 게임오버 UI에 Wave/kill/time/score 표시
- 재시작 전 플레이 결과 확인 가능하게 개선

---

## 12. 리스크와 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 모바일 입력 회귀 | 건설/케이블 불가 | QA Phase를 최우선으로 수행 |
| 밸런스 미검증 | 초반/후반 재미 붕괴 | Wave별 로그 기반으로 수치 조정 |
| 테스트 없는 리팩터링 | 기존 루프 파손 | Vitest를 먼저 깔고 config/물류부터 보호 |
| `as any` 잔존 | 런타임 오류 은폐 | Scene/Manager 인터페이스 확장 |
| 콘텐츠 선추가 | 복잡도 증가 | QA/밸런스 이후 EMP/Honeypot 진행 |

---

## 13. 최종 판단

지금 프로젝트는 새 기능을 더 넣기보다, 먼저 "검증 가능한 플레이 가능성"을 확보해야 한다.

가장 좋은 다음 한 걸음은 **QA 체크리스트 실행 → 발견 버그 수정 → Vitest 도입**이다. 그 다음에 밸런스 데이터를 보고 EMP Tower, Honeypot, 이벤트 웨이브 같은 콘텐츠를 추가하면 안정성과 재미를 동시에 끌어올릴 수 있다.
