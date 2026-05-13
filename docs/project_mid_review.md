# The Neural Factory 프로젝트 중간 점검 보고서

> 작성일: 2026-05-13  
> 기준 상태: 현재 워크스페이스 코드, 문서, 설정, 빌드 산출물 기준  
> 분석 범위: `src/`, `docs/`, `index.html`, `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `dist/` QA/빌드 산출물 확인

## 0. 요약 결론

`The Neural Factory`는 Factorio식 공장 자동화와 타워 디펜스를 결합한 2D 전략/자동화 게임이다. 현재는 단순 데모를 넘어 실제로 실행 가능한 핵심 루프가 있다. 플레이어는 자원과 데이터 생산 라인을 만들고, 케이블/컨베이어로 물류를 연결하며, 생산된 데이터 산출물을 방어 타워 탄약과 연구 자원으로 전환해 웨이브를 버틴다.

완성도는 기능 기준으로는 꽤 높다. Core, 자원 패치, 생산 건물, 케이블, 전력망, 방어 타워, 적 웨이브, 연구, 저장/로드, 모바일 UI까지 이미 들어가 있다. 다만 게임 프로젝트 관점에서는 아직 "재미를 안정적으로 전달하는 단계"에는 조금 못 미친다. 이유는 모바일 레이아웃 QA가 아직 재검증 중이고, 일부 고급 루프가 막혀 있으며, 밸런스가 실제 플레이 데이터로 검증되지 않았고, 문서/표시 텍스트 인코딩이 많이 깨져 있기 때문이다.

가장 먼저 해야 할 일은 새 기능 추가가 아니라 다음 세 가지다.

1. 모바일 QA 재실행 및 레이아웃 실패 항목 완전 종료
2. Fiber/ENERGY/INFERENCE_UNIT 같은 고급 루프의 막힌 지점 정리
3. Normal 기준 20 wave 플레이를 기준으로 밸런스 측정 체계 만들기

## 1. 프로젝트 전체 개요

### 장르

이 게임은 다음 장르가 섞인 구조다.

- 공장 자동화: 건물 배치, 자원 생산, 물류 연결, 처리 라인 구성
- 타워 디펜스: 주기적으로 몰려오는 적을 방어 타워로 막기
- 점진적 성장 게임: Confidence Score를 모아 연구를 열고 생산/방어 효율을 올리기
- 퍼즐/최적화: 전력망, 케이블 병목, 탄약 공급, 자원 저장 위치를 최적화하기

핵심 파일 근거:
- Phaser 게임 초기화: `src/main.ts`
- 메인 메뉴/난이도 선택: `src/scenes/MainMenuScene.ts`
- 실제 게임 월드와 시스템 조율: `src/scenes/MainScene.ts:71`
- 전역 밸런스/데이터 정의: `src/config.ts`

### 핵심 목표

플레이어의 목표는 Neural Core를 지키면서 데이터 생산 체계를 확장하는 것이다. Core는 원점에 배치되고 `CORE_DAMAGED` 이벤트를 통해 체력이 줄어든다. Core HP가 0 이하가 되면 `GAME_OVER`가 발생한다.

근거:
- Core 배치: `src/scenes/MainScene.ts:93`
- Core 피격/게임오버: `src/buildings/Core.ts`
- 적이 Core에 닿으면 피해 발생: `src/enemies/BaseEnemy.ts:141`

### 플레이어의 주요 행동

플레이어가 반복적으로 수행하는 행동은 다음과 같다.

- Silicon 자원 채굴/저장
- Data Downloader로 RAW_DATA 생산
- Processor/Weight Trainer/Neural Trainer로 데이터 가공
- 케이블로 데이터 건물 연결
- 컨베이어로 Silicon 이동
- 전력망 확장
- 방어 타워 배치 및 탄약 공급
- 웨이브 방어
- Confidence Score로 연구 해금
- 저장/로드
- 모바일에서는 화면 버튼으로 회전, 삭제, 케이블, 오버레이 조작

핵심 구현 위치:
- 건물 배치/삭제: `src/managers/BuildingManager.ts:16`, `src/managers/BuildingManager.ts:54`
- 입력 처리: `src/scenes/MainScene.ts:192`, `src/scenes/MainScene.ts:563`
- 케이블 연결: `src/managers/CableManager.ts:60`
- 물류 전송: `src/managers/CableManager.ts:185`, `src/buildings/Conveyor.ts`
- 웨이브: `src/managers/WaveManager.ts:74`
- 연구: `src/managers/ResearchManager.ts`
- 저장/로드: `src/managers/SaveManager.ts:34`, `src/managers/SaveManager.ts:127`

### 사용 기술 스택

- TypeScript
- Phaser 3.90.0
- Vite 5.4.21
- DOM 기반 HUD/UI
- Web Audio API 기반 간단 사운드
- localStorage 기반 저장/설정/튜토리얼 상태

근거:
- 의존성: `package.json`, `package-lock.json`
- Vite 설정: `vite.config.ts`
- DOM UI: `index.html`, `src/styles/main.css`, `src/managers/UIManager.ts`
- 사운드: `src/managers/SoundManager.ts`

### 전체 실행 흐름

1. `src/main.ts`에서 Phaser.Game을 생성한다.
2. 첫 Scene은 `MainMenuScene`이다.
3. 메뉴에서 난이도를 선택하고 시작하면 DOM HUD/빌드바를 표시한 뒤 `MainScene`으로 전환한다.
4. `MainScene.create()`에서 모든 매니저를 생성한다.
5. 맵 자원 패치를 생성하고 Core와 시작 Storage를 배치한다.
6. 매 프레임 `MainScene.update()`가 호출된다.
7. `TickSystem`이 일정 주기로 건물 로직/전력/케이블 전송을 처리한다.
8. `WaveManager`가 웨이브 타이머와 적 업데이트를 처리한다.
9. `UIManager`가 HUD, 연구, 설정, 빌드 버튼, 모바일 UI를 갱신한다.
10. `SaveManager`가 자동 저장과 수동 저장/로드를 처리한다.

핵심 근거:
- Phaser 시작: `src/main.ts`
- Scene 전환: `src/scenes/MainMenuScene.ts`
- MainScene 초기화: `src/scenes/MainScene.ts:71`
- 메인 업데이트: `src/scenes/MainScene.ts:350`
- Tick 처리: `src/managers/TickSystem.ts`

### 현재 구현된 핵심 기능

- 메인 메뉴 및 난이도 선택
- Core, Storage, Data Downloader, Processor, Weight Trainer, Neural Trainer
- Miner, Conveyor, Fast Link, Unloader
- Basic/Fiber 케이블 구조
- Access Point 무선 데이터 중계
- Power Node, Power Plant, Solar Panel, 전력망/블랙아웃
- Classifier, Filter, Firewall 방어 타워
- Noise, Malware, Adversarial, Overfitted Model, DDoS Packet 적
- Confidence Score와 연구 트리
- 저장/로드/자동 저장
- 튜토리얼 패널
- 사운드/시각 효과
- 모바일 액션바와 모바일 레이아웃 1차 구현

## 2. 파일 및 디렉터리 구조 분석

### 루트 파일

| 파일 | 역할 | 점검 결과 |
|---|---|---|
| `package.json` | npm script와 의존성 정의 | `dev`, `build`, `preview`만 있음. QA/test script는 아직 없음 |
| `package-lock.json` | 의존성 고정 | Phaser 3.90.0, Vite 5.4.21, TypeScript 6.0.3 확인 |
| `tsconfig.json` | TypeScript 설정 | `strict: true`, `allowJs: true`. 테스트 exclude는 없음 |
| `vite.config.ts` | 번들 설정 | Phaser를 manual chunk로 분리, chunk warning 1600 설정 |
| `index.html` | DOM UI 뼈대 | 인라인 스타일이 많아 모바일/테마 유지보수 난도 높음 |
| `README.md` | 프로젝트 설명 | 내용은 유용하나 인코딩 깨짐 |
| `.gitignore` | ignore 설정 | `dist/`, `node_modules/`, env, IDE 파일 ignore |

### `src/`

| 폴더/파일 | 역할 |
|---|---|
| `src/main.ts` | Phaser 게임 생성, Scene 등록 |
| `src/config.ts` | 건물, 케이블, 레시피, 아이템, 적, 연구, 난이도 수치 |
| `src/types.ts` | 주요 타입 정의 |
| `src/styles/main.css` | DOM HUD, 빌드바, 모바일 레이아웃, 튜토리얼 스타일 |
| `src/scenes/` | 메뉴 Scene과 실제 게임 Scene |
| `src/managers/` | 전력, 웨이브, 저장, UI, 케이블, 연구 등 게임 시스템 |
| `src/buildings/` | 건물별 동작 클래스 |
| `src/enemies/` | 적 기본 클래스 |

### 핵심 게임 로직 파일

- `src/scenes/MainScene.ts`: 시스템 생성, 입력, 배치, 오버레이, 커서, 케이블 연결, 업데이트 루프
- `src/config.ts`: 밸런스 데이터와 게임 콘텐츠 정의
- `src/managers/TickSystem.ts`: 주기적 건물 처리
- `src/managers/WaveManager.ts`: 적 웨이브, 난이도, 보상
- `src/enemies/BaseEnemy.ts`: 적 이동, 길찾기, 감염, Core 공격
- `src/buildings/BaseBuilding.ts`: 모든 건물의 공통 상태와 버퍼 구조
- `src/buildings/AbstractProcessor.ts`: 데이터 처리/레시피 생산 로직
- `src/buildings/DefenseTower.ts`: 타워 공격/탄약/명중률/피해 처리
- `src/managers/CableManager.ts`: 데이터 케이블/AP 전송
- `src/managers/PowerManager.ts`: 전력망 계산

### UI, 입력, 상태 관리, 데이터 관리 파일

- UI: `src/managers/UIManager.ts`, `src/styles/main.css`, `index.html`
- 입력: `src/scenes/MainScene.ts:192`, `src/managers/CameraController.ts`
- 상태 관리: `EventBus`, 각 manager 인스턴스, localStorage
- 저장: `src/managers/SaveManager.ts`
- 튜토리얼: `src/managers/TutorialManager.ts`
- 사운드 설정: `src/managers/SoundManager.ts`

### 불필요하거나 중복되어 보이는 파일

- `src/buildings/legacy/Conveyor.ts`
- `src/buildings/legacy/FastLink.ts`
- `src/buildings/legacy/Merger.ts`
- `src/buildings/legacy/Splitter.ts`

이 파일들은 현재 각각 1줄 수준이고 실제 import 경로도 사용되지 않는다. 미래 확장을 위해 남긴 의도라면 `legacy/README.md` 또는 문서화가 필요하고, 아니라면 제거 후보로 볼 수 있다.

문서 쪽에서는 `docs/archive/`는 보관 위치로 적절하지만, 현재 active 문서와 archive 문서 모두 인코딩이 깨진 파일이 많다. 특히 `README.md`, `docs/CONCEPT.md`, `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`, `docs/PLAYABILITY_HARDENING_PLAN.md`, `docs/QA_CHECKLIST.md`는 실제 협업 문서로 쓰기 어렵다.

### 정리가 필요한 구조

현재 가장 큰 구조 문제는 파일 크기와 책임 집중이다.

- `src/managers/UIManager.ts`: 738줄, HUD/설정/연구/빌드바/모바일/툴팁/로그를 모두 담당
- `src/scenes/MainScene.ts`: 682줄, 시스템 생성/입력/배치/케이블/오버레이/업데이트를 모두 담당
- `src/config.ts`: 551줄, 데이터 중심이라 긴 것은 괜찮지만 표시명 인코딩 문제와 일부 누락이 있음

권장 분리:
- `InputController`
- `MobileUIManager`
- `BuildMenuManager`
- `TooltipManager`
- `OverlayManager`
- `BalanceConfig` 또는 `waveConfig`, `buildingConfig`, `researchConfig` 분리

## 3. 코드 구조 분석

### 주요 클래스와 모듈

#### `MainMenuScene`

`src/scenes/MainMenuScene.ts`는 메뉴, 난이도 선택, 시작 버튼을 담당한다. 선택된 난이도는 `this.scene.start('MainScene', { difficulty })`로 전달된다.

장점:
- 메뉴와 게임 Scene이 분리되어 있다.
- 난이도 선택 UI가 단순하고 명확하다.
- 작은 화면에서 제목/시작 버튼 scale 보정이 들어갔다.

주의점:
- Phaser 텍스트 기반 UI라 DOM처럼 자동 접근성/레이아웃을 얻기 어렵다.
- 메뉴 텍스트와 DOM 텍스트의 인코딩 상태가 섞여 있다.

#### `MainScene`

`src/scenes/MainScene.ts`는 프로젝트의 중심이다.

담당:
- 모든 manager 생성
- Core/시작 Storage 배치
- 입력 처리
- 커서/고스트 표시
- 건물 배치/삭제
- 케이블 연결
- 모바일 레이아웃 감지
- 전력/방어 오버레이
- update loop 조율

핵심 위치:
- create: `src/scenes/MainScene.ts:71`
- setupInput: `src/scenes/MainScene.ts:192`
- update: `src/scenes/MainScene.ts:350`
- handlePointerAction: `src/scenes/MainScene.ts:563`

리스크:
- 책임이 너무 많아 입력 변경이 배치/케이블/모바일/오버레이에 같이 영향을 준다.
- `EventBus.off('EVENT')`가 callback 없이 호출되어 해당 이벤트의 모든 listener를 삭제한다. Scene 재시작이 많아지면 다른 시스템 listener까지 정리될 수 있어 조심해야 한다.

#### `TickSystem`

`src/managers/TickSystem.ts`는 `CONFIG.TICK_RATE * CONFIG.TIMING.TICK_RATE_MULTIPLIER` 기준으로 tick을 만든다. 현재 기본값은 `500 * 0.5 = 250ms`다. 다만 건물 처리와 전력 계산은 `currentTick % 2 === 0`인 full tick에서만 실행되므로 실제 주요 생산/처리 간격은 500ms 단위에 가깝다.

장점:
- 프레임 업데이트와 게임 논리를 분리했다.
- `gameSpeed`를 적용하기 쉽다.

주의점:
- 실제 tick 체감이 `TICK_RATE`, `TICK_RATE_MULTIPLIER`, `isFullTick` 세 요소에 의해 결정되어 밸런스 문서에 명확히 적어야 한다.

#### `BuildingManager`

건물 배치/삭제/조회 책임을 가진다. 2x2 건물은 여러 grid key에 같은 building 인스턴스를 저장하고, `forEach`에서는 unique set으로 중복을 제거한다.

장점:
- 2x2 건물 충돌 처리가 단순하다.
- 비용 차감이 배치 시점에 통합되어 있다.

리스크:
- 비용 차감은 Storage에 들어 있는 자원만 본다. 시작 자원도 Storage에 들어 있으므로 구조는 일관적이지만, 플레이어가 "전역 인벤토리"처럼 이해할 수 있어 UI 설명이 필요하다.
- 배치 실패 원인이 UI에서 항상 명확하지 않다.

#### `CableManager`

데이터 아이템 전송의 핵심이다. Basic/Fiber cable과 AP 연결을 모두 처리한다.

장점:
- `makeCableId()`로 A-B 중복 연결 방지
- 데이터 아이템만 케이블로 이동시키고 Silicon은 컨베이어로 분리
- AP 자동 연결이 있어 후반 물류 확장성이 있다

리스크:
- AP 연결은 범위 안 모든 건물 쌍을 검사한다. AP와 건물이 늘어나면 O(n^2) 비용이 커질 수 있다.
- `FIBER`는 `TECH_FIBER_OPTIC`를 요구하지만 현재 `CONFIG.RESEARCH`에 해당 연구가 없다. 따라서 Fiber는 코드상 존재하지만 정상 게임 플레이에서는 해금 불가능하다.

#### `PowerManager`

전력 생산/범위/네트워크 병합/블랙아웃을 처리한다.

장점:
- 겹치는 전력 범위가 하나의 network로 병합된다.
- 블랙아웃은 network 단위로 적용되어 지역 전력망 느낌이 난다.

리스크:
- 소비자를 어떤 네트워크에 붙일지 선택하는 규칙은 있으나 플레이어에게 설명이 부족하다.
- Solar Panel의 `RANGE: 0`은 자기 타일만 커버한다. 생산 건물이지만 다른 건물에 전력을 공급하기 어렵게 느껴질 수 있다.

#### `WaveManager`와 `BaseEnemy`

웨이브 진행과 적 업데이트를 담당한다.

현재 흐름:
- 첫 웨이브까지 30초
- 웨이브 종료 후 난이도별 cooldown
- 1~5 wave는 적 수가 완만히 증가
- 6~15 wave는 수와 HP multiplier 증가
- 16 wave 이후 증가폭이 커짐
- 10 wave마다 boss 추가
- 8 wave 이후 DDoS swarm 추가

근거:
- 웨이브 수식: `src/managers/WaveManager.ts:74`
- 적 생성: `src/managers/WaveManager.ts:111`
- 길찾기: `src/enemies/BaseEnemy.ts:218`
- Malware 감염: `src/enemies/BaseEnemy.ts:268`

리스크:
- 실제 플레이 데이터 없이 수치만으로 조정되어 난이도 체감은 불확실하다.
- 적 길찾기는 각 적이 700ms마다 BFS를 수행하며 visited size 900 제한을 둔다. 적이 많아지면 성능 비용이 커질 수 있다.

#### `UIManager`

DOM UI 대부분을 담당한다.

담당:
- HUD 이벤트 반영
- 연구 모달
- 설정 모달
- 빌드 버튼/카테고리
- 모바일 액션바
- 모바일 정보 시트
- 툴팁
- activity log

리스크:
- 파일이 너무 크고 DOM inline style 생성이 많다.
- 연구 UI, 설정 UI, 모바일 UI, 빌드 UI가 한 클래스에 섞여 있다.
- 한국어 표시 텍스트 인코딩이 깨져 사용자 경험을 크게 해친다.

### 게임 루프 분석

실제 게임 루프는 다음으로 요약된다.

```text
Phaser frame update
  MainScene.update()
    updateCursorPosition()
    gridRenderer.draw()
    tickSystem.update()
      powerManager.updatePowerGrid()
      cableManager.updateAPConnections()
      cableManager.transferData()
      building.onTick()
    waveManager.update()
      spawn enemy
      enemy.update()
    saveManager.update()
    uiManager.update()
    cameraController.update()
    cableManager.drawCables()
    effectsManager.updatePowerWarnings()
    draw overlays if dirty
```

이 흐름은 명확하다. 다만 `MainScene.update()`가 너무 많은 일을 호출하고 있어, 디버깅 시 어느 하위 시스템이 문제인지 추적하기 어렵다.

### 입력 처리 방식

데스크톱:
- WASD 카메라 이동
- 마우스 휠 줌
- 좌클릭 배치
- 우클릭 삭제
- R 회전
- F1 방어 범위
- F2 전력망
- 숫자 키 빌드 선택

모바일:
- `matchMedia('(pointer: coarse), (max-width: 768px), (max-height: 480px)')`
- 한 손가락 드래그 카메라 팬
- 짧은 탭 배치
- 2손가락 핀치 줌
- 모바일 액션바로 Rotate/Remove/Cable/Cancel/Defense/Power

핵심 위치:
- 모바일 감지: `src/scenes/MainScene.ts:168`
- 모바일 탭 판정: `src/scenes/MainScene.ts:192`
- 카메라 팬/핀치: `src/managers/CameraController.ts`

### 게임 상태 관리 방식

상태는 중앙 store가 아니라 manager 인스턴스와 EventBus, localStorage로 분산되어 있다.

- 건물 상태: 각 `BaseBuilding` 인스턴스
- 적 상태: `WaveManager.enemies`
- 자원 상태: Storage 건물의 `inputBuffer`
- 데이터 상태: 각 건물의 `inputBuffer`/`outputBuffer`와 케이블 queue
- 연구 상태: `ResearchManager.unlockedResearch`
- UI 상태: DOM + `UIManager.selectedBuildingType`
- 저장 상태: localStorage `neural_factory_save`

장점:
- 빠르게 기능 추가하기 좋다.

단점:
- 상태 출처가 많아 저장/로드/QA가 어려워진다.
- `as any`가 많아 타입 안정성이 약해진다.

## 4. 기능 구현 상태 분석

### 현재 구현된 기능

실제 플레이 가능한 기능:
- 난이도 선택 후 게임 시작
- Core 방어
- 시작 Storage에 Silicon 30개 지급
- Data Downloader로 RAW_DATA 생산
- Processor로 LABELED_DATA 생산
- Weight Trainer로 WEIGHT_UPDATE 생산
- Classifier/Filter/Firewall 방어
- Basic Cable 연결
- Conveyor 기반 Silicon 물류
- 전력망과 블랙아웃
- 연구 해금과 효과 적용
- 저장/로드
- 모바일 액션바 및 반응형 UI 1차

### 아직 구현되지 않았거나 막힌 기능

중요도 높은 막힘:

1. Fiber 해금 불가  
   `CONFIG.CABLES.FIBER.UNLOCK_REQUIRED`는 `TECH_FIBER_OPTIC`인데, `CONFIG.RESEARCH`에 `TECH_FIBER_OPTIC`가 없다. 결과적으로 Fiber는 존재하지만 일반 플레이로 열 수 없다.

2. INFERENCE_UNIT 생산 루프 막힘 가능성  
   `INFERENCE_UNIT_PRODUCTION`은 `TRAINED_MODEL + ENERGY`를 요구한다. 하지만 현재 `Miner`는 Silicon만 생산하고, Energy item을 생산하거나 채굴하는 흐름이 없다. Energy resource patch는 PowerPlant 활성화용으로만 쓰인다. 따라서 Inference Unit은 정상 루프에서 생산하기 어렵다.

3. Splitter/Merger 계열  
   config에 주석/legacy 흔적이 있으나 실제 빌드 UI에는 숨겨져 있고 파일도 legacy에 1줄 수준이다.

4. 자동 QA/test script  
   `package.json`에는 `dev`, `build`, `preview`만 있고 `test`, `qa:layout` 등은 없다.

### 구현은 되었지만 완성도가 낮은 기능

- 모바일 지원: 구현은 되었지만 방금 QA에서 실패 항목이 나왔고 재QA가 필요하다.
- 연구 UI: 작동하지만 인코딩과 정보 구조가 약하다.
- 튜토리얼: 체크리스트 구조는 좋으나 텍스트 인코딩이 깨져 안내 기능을 제대로 못 한다.
- 저장/로드: 기능은 있으나 버전 마이그레이션이 사실상 없다.
- AP 연결: 기능은 좋지만 시각적/성능/설명 측면에서 더 다듬어야 한다.
- 전력망: 시스템은 흥미롭지만 플레이어가 블랙아웃 원인을 직관적으로 파악하기 어렵다.

### 데모/발표에서 보여주기 좋은 기능

- Factorio식 건물 배치 + 데이터 케이블 연결
- 전력망 오버레이
- 방어 범위 오버레이
- DDoS swarm
- Malware 감염 비주얼
- Overfitted Model boss aura
- Confidence Score 기반 연구
- 모바일 액션바
- 저장/로드

발표에서 강조할 차별점:
- "AI 학습 파이프라인을 공장 자동화 게임으로 표현했다"는 콘셉트
- RAW_DATA -> LABELED_DATA -> WEIGHT_UPDATE -> TRAINED_MODEL 흐름
- 생산물이 방어 탄약과 연구 자원이 되는 구조
- 전력망/케이블/컨베이어가 다른 종류의 물류를 담당하는 이중 물류 구조

### 핵심 재미와 직접 연결되는 기능

핵심 재미는 "생산 라인 최적화가 곧 생존력으로 연결되는 것"이다.

잘 연결된 기능:
- WEIGHT_UPDATE가 Core 점수와 타워 탄약 양쪽에 쓰임
- 전력이 부족하면 생산/방어가 멈춤
- 케이블 병목이 데이터 흐름을 막음
- 방어 타워가 탄약 공급을 요구함

아직 약한 연결:
- DDoS Bot은 빠르고 보상 없는 적이지만, 방어 전략을 얼마나 바꾸게 하는지는 검증 부족
- Recycler/Data Cache는 좋은 보조 콘텐츠지만 아직 "필수 전략"인지 "있어도 되는 건물"인지 불명확
- Advanced production은 ENERGY/Fiber 누락으로 후반 재미까지 연결되지 않는다

## 5. 실행 및 빌드 점검

### 실행 조건

필요 조건:
- Node.js/npm
- 의존성 설치: `npm install`
- 개발 서버: `npm run dev`
- 빌드: `npm run build`

### 의존성

`package.json` 기준:
- runtime dependency: `phaser`
- dev dependencies: `typescript`, `vite`

테스트/린트/포맷 도구는 없다.

### 빌드 방법

```bash
npm run build
```

Vite가 `dist/`에 결과물을 생성한다.

### 실행 과정에서 주의할 문제

- 현재 Codex sandbox에서는 Vite/esbuild가 상위 경로 접근 문제로 `vite.config.ts`를 읽지 못하는 경우가 있다. 실제 권한으로 실행하면 빌드는 통과했다.
- `dist/`는 `.gitignore`에 포함되어 있으므로 QA 산출물을 공유하려면 별도 보관/문서화가 필요하다.
- Google Fonts를 사용하므로 네트워크가 막힌 환경에서는 폰트가 fallback될 수 있다.
- localStorage에 저장된 이전 상태가 UI/QA 결과에 영향을 줄 수 있다. QA 전 localStorage 초기화 절차가 필요하다.

## 6. 오류 및 문제점 분석

### 치명도 높음

#### 1. Fiber 해금 불가

문제:
- `src/config.ts:260`에서 Fiber가 `TECH_FIBER_OPTIC`를 요구한다.
- 하지만 `CONFIG.RESEARCH`에는 `TECH_FIBER_OPTIC`가 없다.

영향:
- Fiber는 UI/모바일 메뉴 코드에 존재하지만 일반 플레이에서 해금할 수 없다.
- 케이블 업그레이드 진행감이 끊긴다.

권장:
- `TECH_FIBER_OPTIC` 연구를 추가하거나, Fiber의 `UNLOCK_REQUIRED`를 기존 연구로 변경한다.
- 밸런스 영향이 있으므로 별도 작업에서 수치와 함께 정리하는 편이 좋다.

#### 2. INFERENCE_UNIT 생산 루프 막힘

문제:
- `src/config.ts:291`의 `INFERENCE_UNIT_PRODUCTION`은 `ENERGY` item을 요구한다.
- 현재 `Miner`는 `SILICON`만 생산한다.
- `ENERGY` resource patch는 `PowerPlant` 활성 조건으로 쓰일 뿐 item화되지 않는다.

영향:
- Neural Trainer의 두 번째 recipe가 사실상 막힌다.
- 후반 생산 목표가 끊긴다.

권장:
- Energy item을 생산하는 건물 또는 Energy patch 위 Miner 동작을 정의한다.
- 아니면 recipe에서 `ENERGY` item 요구를 제거하고 전력 소비/전력망 조건으로 대체한다.

#### 3. 문서와 표시 텍스트 인코딩 손상

문제:
- `README.md`, `docs/CONCEPT.md`, `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`, `docs/PLAYABILITY_HARDENING_PLAN.md`, `docs/QA_CHECKLIST.md`, `src/config.ts`의 다수 한국어 문자열이 깨져 있다.

영향:
- 튜토리얼, 빌드 버튼, 연구명, 문서가 사용자와 개발자 모두에게 읽기 어렵다.
- 발표/데모 품질을 크게 떨어뜨린다.

권장:
- UTF-8 기준으로 사용자 노출 문자열을 복구한다.
- config의 내부 ID는 유지하고 `NAME`, `DESCRIPTION`, tutorial text, README를 우선 복구한다.

### 치명도 중간

#### 모바일 레이아웃 QA 미완료

직전 QA에서 `390x844`, `844x390`에서 실패가 나왔고 일부 수정은 적용되었다. 그러나 수정 후 CDP QA 재실행 결과는 아직 반영되지 않았다.

권장:
- `qa:layout` 자동화 script를 만들고 QA report를 재생성한다.

#### 저장 데이터 마이그레이션 부족

`SaveData.version`은 있지만 실제 version migration 함수는 없다. 신규 건물/적/연구가 계속 추가되는 프로젝트라 장기적으로 깨질 가능성이 있다.

근거:
- 저장 버전: `src/managers/SaveManager.ts:91`
- 로드 시 버전 분기 없음: `src/managers/SaveManager.ts:127`

#### EventBus 정리 방식

`MainScene` shutdown에서 이벤트 이름만 넘겨 `off()`를 호출한다. 이 방식은 해당 이벤트의 모든 listener를 삭제한다.

영향:
- 현재는 Scene이 거의 단일 구조라 문제가 작지만, Scene/manager가 늘어나면 예상치 못한 listener 제거 가능성이 있다.

#### UIManager/MainScene 과대화

파일 크기:
- `UIManager.ts`: 738줄
- `MainScene.ts`: 682줄

영향:
- 모바일, 연구, 설정, 빌드바 변경이 서로 영향을 주기 쉽다.

### 성능상 비효율 가능성

- 적 pathfinding은 각 적이 700ms마다 BFS를 수행한다. 적 수가 많아지면 CPU 부담이 커질 수 있다.
- AP 연결은 범위 내 모든 건물 쌍을 연결 후보로 만들기 때문에 건물 수가 많아지면 비용이 커진다.
- data pulse animation은 전송마다 tween/graphics를 생성한다. 대량 전송 시 오브젝트 생성/파괴가 많아질 수 있다.

### 사용자 경험 문제

- 건물 배치 실패 원인이 충분히 표시되지 않는다.
- 전력 부족, 버퍼 막힘, 탄약 부족이 모바일 info sheet에는 일부 표시되지만 데스크톱에서는 여전히 hover 의존이다.
- 튜토리얼 텍스트 인코딩 깨짐으로 안내가 약하다.
- 빌드 버튼 텍스트가 깨져 건물 의미를 알기 어렵다.

## 7. 게임 밸런스 분석

### 현재 수치 구조

주요 수치는 `src/config.ts`에 집중되어 있다.

- Tick: `TICK_RATE = 500`, `TICK_RATE_MULTIPLIER = 0.5`
- 시작 웨이브 지연: 30초
- 웨이브 cooldown: Normal 20초
- 시작 Silicon: `MainScene.create()`에서 Storage에 30개 지급
- Core HP: 1000
- 기본 적:
  - Noise: HP 50, speed 30, damage 10, reward 1
  - Malware: HP 150, speed 25, damage 30, reward 3
  - Adversarial: HP 80, speed 50, damage 20, reward 2
  - Overfitted Model: HP 1500, speed 15, damage 100, reward 20
  - DDoS Bot: HP 15, speed 55, damage 4, reward 0
- 기본 방어:
  - Classifier: damage 25, range 4, fire rate 2, ammo WEIGHT_UPDATE 1
  - Filter: damage 10 AoE, range 3, fire rate 4, ammo WEIGHT_UPDATE 2
  - Firewall: damage 5, range 1, fire rate 1, no ammo, HP 500

### 난이도 흐름

초반:
- 30초 준비 시간과 Silicon 30개는 충분히 관대하다.
- Data Downloader 5, Processor 5, Weight Trainer 10, Classifier 10이므로 시작 자원 30개로 기본 생산+방어 조합을 만들 수 있다.
- Noise wave 1은 5마리 정도라 Core HP 1000 기준으로 방어가 없어도 즉시 게임오버는 아니다.

중반:
- 6 wave 이후 적 수와 HP multiplier가 증가한다.
- Malware 감염, DDoS swarm, Adversarial 고속 적이 섞이면서 생산/방어 라인 관리가 필요해진다.
- 이 구간부터 케이블 병목과 탄약 공급이 핵심 재미로 작동할 가능성이 높다.

후반:
- 10 wave boss, 16 wave 이후 HP 증가폭, DDoS swarm이 겹친다.
- 하지만 INFERENCE_UNIT/Fiber 같은 후반 확장 루프가 막혀 있어 후반 성장감이 제한될 수 있다.

### 너무 쉽거나 어려울 가능성

쉬울 수 있는 부분:
- Core HP 1000은 초반 적 피해량 대비 매우 높다.
- Firewall은 탄약 없이 작동하므로 초반 버티기에 강할 수 있다.
- 시작 Silicon 30은 기본 조합을 바로 완성할 수 있는 양이다.

어려울 수 있는 부분:
- 방어 타워 핵심 탄약인 WEIGHT_UPDATE를 만들려면 Data Downloader -> Processor -> Weight Trainer -> 케이블 연결이 필요하다.
- 튜토리얼 텍스트가 깨져 있으면 초보자는 이 흐름을 이해하기 어렵다.
- 전력망이 끊기면 생산/방어가 멈추는데 원인 파악이 어렵다.
- 모바일에서는 아직 정보 표시/조작이 불안할 수 있다.

### 리스크와 보상

좋은 구조:
- WEIGHT_UPDATE를 Core에 넣으면 점수, 타워에 넣으면 방어 탄약이 된다. 이는 훌륭한 선택 압박이다.
- Storage를 많이 만들면 자원 보상과 건설 안정성이 올라간다.
- Power Node/Power Plant/Solar Panel은 확장 비용과 안정성을 교환한다.

약한 구조:
- 적 처치 보상은 Storage 공간이 있어야 들어간다. 이 규칙은 좋지만 플레이어에게 설명이 부족하다.
- DDoS Bot은 reward 0이라 "귀찮은 적"으로 느껴질 수 있다. swarm 전체 처치 시 5 Silicon 보상이 있긴 하지만 눈에 잘 띄어야 한다.
- Recycler가 과잉 데이터 처리 역할을 하지만 효율이 실제로 유의미한지는 검증 필요다.

### 운 요소와 실력 요소

운 요소:
- 자원 패치 위치와 종류
- 적 spawn edge
- 타워 hit chance
- 웨이브 적 타입 확률

실력 요소:
- 생산 라인 설계
- 케이블/컨베이어 구분
- 전력망 배치
- 탄약 공급 최적화
- 방어 타워 위치 선정

현재 비중은 실력 요소가 더 크다. 다만 자원 패치가 시작 위치에서 너무 멀거나, 모바일에서 카메라 탐색이 불편하면 운 요소처럼 느껴질 수 있다.

### 특정 기능의 강약

강할 가능성:
- Firewall: 탄약 없음, HP 500, 적을 막고 직접 피해를 준다. 초반에는 비용 20이지만 방어 안정성이 매우 높을 수 있다.
- Core HP 1000: 초반 실패를 완화하는 장점이 있지만 긴장감을 늦출 수 있다.

약할 가능성:
- Filter: ammo 2개 소비, damage 10, fire rate 4. AoE가 얼마나 자주 유효한지에 따라 체감이 크게 갈린다.
- Data Cache: 20개 저장은 좋지만 케이블 병목이 체감되지 않으면 선택 이유가 약할 수 있다.
- Recycler: 데이터 2개 -> Silicon 1개가 실제 병목 완화에 충분한지 검증 필요.

막힌 기능:
- Fiber: 연구 누락으로 해금 불가
- Inference Unit: Energy item 공급 부재로 생산 불가 가능성

### 반복 플레이 유도 요소

있는 요소:
- 난이도 4단계
- 랜덤 자원 패치
- 연구 트리
- 웨이브 진행

부족한 요소:
- run 결과 요약
- 최고 wave 기록
- 업적
- 통계
- seed 기반 맵 재도전
- wave/event 변주

### 밸런스 조정 구조

장점:
- 대부분의 수치는 `CONFIG`에 모여 있어 조정 출발점은 좋다.
- 건물/적/연구/난이도가 data-driven 형태에 가깝다.

단점:
- 웨이브 구성 수식은 `WaveManager.startWave()`에 하드코딩되어 있다.
- Core 점수 보상은 `Core.acceptItem()`에 하드코딩되어 있다.
- 시작 자원 30개는 `MainScene.create()`에 하드코딩되어 있다.
- enemy type 확률은 `WaveManager.spawnEnemy()`에 하드코딩되어 있다.

개선안:
- `CONFIG.STARTING_RESOURCES`
- `CONFIG.CORE_SCORE_REWARDS`
- `CONFIG.WAVES` 또는 `CONFIG.WAVE_RULES`
- `CONFIG.ENEMY_SPAWN_TABLES`
- `CONFIG.REWARD_RULES`

## 8. 게임성 및 플레이 경험 분석

### 핵심 재미

이 게임의 핵심 재미는 "데이터 생산 라인을 설계하면 그 결과물이 방어력과 연구력으로 돌아오는 자동화-방어 선순환"이다.

좋은 점:
- 주제가 독특하다. AI 학습 파이프라인을 공장 자동화 문법으로 바꾼 점은 발표용 차별점이 강하다.
- 생산 라인이 곧 방어 탄약 라인이라 설계의 의미가 있다.
- 전력/케이블/컨베이어가 각각 다른 병목을 만든다.

약한 점:
- 현재 텍스트가 깨져 있어 주제 전달력이 크게 떨어진다.
- 초보자는 "무엇을 어디에 연결해야 하는지"를 이해하기 어렵다.
- 고급 목표가 막혀 있어 후반 몰입이 약해질 수 있다.

### 조작감

데스크톱:
- WASD/휠/좌클릭/우클릭/R/F1/F2 구조는 적절하다.
- 컨베이어 드래그 배치가 있어 물류 라인 구축 감각이 좋다.

모바일:
- 액션바 기반 접근은 좋은 방향이다.
- 짧은 탭/드래그/핀치 구분이 들어간 점은 중요하다.
- 다만 실제 모바일 QA 재검증이 아직 필요하다.

### 피드백

좋은 피드백:
- 건물 배치/삭제 효과
- 적 처치 효과
- 방어 projectile 효과
- 전력 부족 시 alpha/marker 표시
- activity log
- 모바일 상태 tag

부족한 피드백:
- 배치 실패 사유
- 자원 부족 원인
- 케이블 병목 정도
- 생산 라인 어디에서 막혔는지
- 적 종류별 위험도
- 연구 조건 충족까지 얼마나 남았는지

### 실패/성공 구조

실패:
- 적이 Core에 닿으면 Core HP 감소
- Core HP 0이면 game over

현재 실패는 명확하지만 "왜 졌는가" 분석이 부족하다. 예를 들어 탄약 부족인지, 전력 부족인지, 적 속도 대응 실패인지, 라인 병목인지 post-game에서 알려주면 훨씬 납득 가능하다.

성공:
- wave를 막고 Silicon을 회수
- Core에 데이터가 들어가면 Confidence Score 증가
- 연구 해금

성공 보상은 구조상 좋지만 시각적으로 더 강하게 보여줄 필요가 있다.

### 계속 플레이하고 싶게 만드는 요소

현재 있는 동기:
- 연구 해금
- 새 건물 unlock
- 더 높은 wave
- 난이도 선택

추가하면 좋은 요소:
- 최고 wave 기록
- run 통계
- milestone toast
- boss wave 경고 연출 강화
- wave별 새 적 예고
- 연구 완료 후 즉시 사용할 추천 행동 표시

### UI/UX 부족점

- 인코딩 깨짐이 가장 큰 UX 문제다.
- 연구 모달은 기능은 있으나 정보 밀도가 높고 시각 hierarchy가 약하다.
- 빌드 버튼은 긴 텍스트가 깨지거나 넘치기 쉽다.
- 데스크톱 tooltip은 hover 기반이라 모바일과 정보량 차이가 난다.
- 설정/연구 모달에 인라인 스타일이 많아 CSS 관리가 어렵다.

### 튜토리얼 보완 필요 부분

반드시 안내해야 하는 규칙:
- Silicon은 Storage 기반 자원이다.
- Data는 Cable로, Silicon은 Conveyor로 이동한다.
- 방어 타워는 WEIGHT_UPDATE 탄약이 필요하다.
- Core에 데이터를 넣으면 Confidence Score가 오른다.
- Power Node/Power Plant/Solar Panel의 전력 범위와 블랙아웃
- Cable 첫 탭/두 번째 탭/Cancel 흐름
- Enemy reward는 Storage 공간이 있어야 회수된다.

## 9. 개선 방향 제안

### 우선 수정해야 할 부분

1. 모바일 QA 재실행
   - 기존 실패 항목이 수정 후 해결됐는지 확인
   - `qa-cdp-report.json` 재생성

2. 텍스트 인코딩 복구
   - `src/config.ts`의 `NAME`, `DESCRIPTION`
   - `TutorialManager`의 tutorial text
   - `README.md`
   - `docs/QA_CHECKLIST.md`, `docs/PLAYABILITY_HARDENING_PLAN.md`, `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`

3. Fiber/ENERGY 루프 정리
   - `TECH_FIBER_OPTIC` 추가 또는 Fiber unlock 변경
   - `ENERGY` item 생산 경로 추가 또는 recipe 수정

4. QA 자동화 추가
   - `npm run qa:layout`
   - CDP/headless Chrome 기반 캡처/리포트 생성
   - viewport: desktop, 390x844, 844x390, 768x1024

5. 저장/로드 회귀
   - 신규 건물, 케이블 queue, 연구, 난이도, 적 웨이브 저장/로드 확인

### 기능적으로 추가하면 좋은 부분

- Diagnostics panel: 전력 부족, input full, output full, ammo missing, cable congestion 요약
- Wave preview: 다음 wave 적 타입/위험도 표시
- StatsManager: 최고 wave, kill count, 생산량, Core damage 기록
- Run summary/game over 분석
- EMP Tower/Honeypot 같은 전략적 방어 콘텐츠

### 구조적으로 리팩토링하면 좋은 부분

우선순위:

1. `UIManager` 분리
   - `BuildMenuManager`
   - `ResearchUI`
   - `SettingsUI`
   - `MobileUIManager`
   - `TooltipManager`

2. `MainScene` 입력/오버레이 분리
   - `InputController`
   - `OverlayManager`
   - `PlacementController`
   - `CablePlacementController`

3. 밸런스 설정 분리
   - `config/buildings.ts`
   - `config/enemies.ts`
   - `config/waves.ts`
   - `config/research.ts`

4. `as any` 축소
   - Scene 인터페이스 정의
   - Building subclass type guard 추가

### 게임 밸런스 조정을 위해 필요한 부분

- Normal 20 wave 기준 플레이 로그 수집
- wave별 적 수/HP/피해량/실패 지점 기록
- 타워별 DPS와 ammo 소비량 계산표 작성
- 생산 라인의 평균 산출량 계산
- 시작 30초 동안 만들 수 있는 최소 방어 빌드 검증
- Easy/Hard/Nightmare multiplier 재조정

### 발표 전까지 현실적으로 완성 가능한 작업

우선순위 높은 발표 준비:

- 인코딩 깨진 사용자 노출 텍스트 복구
- 모바일 레이아웃 QA 완료
- Fiber/ENERGY 막힌 루프 중 최소 하나 해결
- Normal 10 wave까지 안정적으로 플레이 가능하게 밸런스 확인
- README를 실행/조작/핵심 루프 중심으로 정리
- 데모 시나리오 작성

발표에서 보여줄 흐름:

1. 난이도 선택
2. Data Downloader 배치
3. Processor/Weight Trainer 연결
4. Classifier에 Weight Update 공급
5. Wave 방어
6. Confidence Score로 연구
7. 전력망/방어 범위 오버레이
8. DDoS swarm 또는 boss wave

### 시간이 부족하면 축소해도 되는 작업

- EMP/Honeypot/Ransomware 신규 콘텐츠
- 대규모 리팩토링
- PWA/배포 패키징
- 업적 시스템
- 고급 통계 UI
- Splitter/Merger 부활

## 10. 최종 중간 점검 결론

### 현재 완성도 평가

- 기술 구현 완성도: 70%
- 실제 플레이 완성도: 60%
- 게임성 잠재력: 80%
- 밸런스 검증도: 35%
- 발표 가능성: 텍스트/QA 정리 후 75%

현재 프로젝트는 "많이 구현된 실험작" 단계다. 핵심 루프는 이미 살아 있고, 차별점도 분명하다. 하지만 사용자에게 그 루프가 자연스럽게 전달되는 정도와, 후반 성장 루프의 완성도는 아직 보완이 필요하다.

### 가장 큰 장점

AI 학습 파이프라인을 자동화/디펜스 게임 규칙으로 바꾼 콘셉트가 강하다. 단순한 타워 디펜스가 아니라 생산 라인, 물류, 전력, 연구가 서로 연결되어 있어 확장 여지가 크다.

### 가장 큰 문제점

인코딩 깨짐과 정보 전달 부족이다. 코드상 시스템은 있는데 플레이어가 무엇을 해야 하는지, 왜 막혔는지, 어떤 전략을 세워야 하는지 알기 어렵다.

### 현재 게임 밸런스 평가

초반은 관대하고 안정적일 가능성이 높다. 중반부터는 케이블/탄약/전력 병목이 재미를 만들 수 있다. 후반은 Fiber/ENERGY/INFERENCE_UNIT 루프가 막혀 있어 성장감이 끊길 위험이 있다. 난이도 multiplier는 존재하지만 실제 플레이 로그 기반 검증이 필요하다.

### 지금 바로 수정해야 할 것

1. 모바일 QA 재실행
2. 사용자 노출 텍스트 인코딩 복구
3. `TECH_FIBER_OPTIC` 누락 해결
4. `ENERGY` item 생산/사용 규칙 정리
5. QA 자동화 script 추가

### 이후 개발 우선순위

1. Playability hardening 종료: 모바일 QA, 텍스트 복구, 정보 표시
2. 고급 루프 막힘 해결: Fiber, Energy, Inference Unit
3. Save/load 회귀 검증
4. Normal 20 wave 밸런스 패스
5. Diagnostics/Stats 기반 분석 도구 추가
6. EMP Tower/Honeypot 등 신규 전략 콘텐츠
7. 구조 리팩토링

## 11. 질문별 직접 답변

### 이 게임의 핵심 재미는 무엇인가?

데이터 생산 라인을 설계하고, 그 산출물이 방어와 연구로 전환되는 자동화-디펜스 선순환이다.

### 현재 구현된 기능들이 핵심 재미와 잘 연결되어 있는가?

초중반 기능은 잘 연결되어 있다. Data Downloader, Processor, Weight Trainer, 방어 타워, 케이블, 전력망은 핵심 재미와 직접 연결된다. 다만 후반의 Fiber/Inference Unit 쪽은 막혀 있어 연결이 약하다.

### 난이도 흐름은 적절한가?

수식상 초반은 관대하고 중반부터 증가하는 구조다. 방향은 적절하지만 실제 플레이 데이터가 없어 확정 평가는 어렵다. 특히 wave 8 이후 DDoS와 wave 10 boss가 겹칠 때 체감 난이도 확인이 필요하다.

### 특정 기능, 수치, 규칙이 지나치게 강하거나 약하지 않은가?

Firewall은 초반에 강할 가능성이 있다. Filter는 ammo 소비 대비 효율이 약할 가능성이 있다. Core HP 1000은 초반 안전망으로 좋지만 긴장감을 늦출 수 있다. Fiber와 Inference Unit은 현재 약한 것이 아니라 접근이 막혀 있다.

### 플레이어가 게임을 이해하고 몰입하기 쉬운가?

현재는 어렵다. 이유는 텍스트 인코딩 깨짐, 튜토리얼 안내 부족, 병목 원인 피드백 부족이다. 콘셉트 자체는 좋으므로 표시 텍스트와 diagnostics만 보완해도 몰입도가 크게 올라갈 것이다.

### 게임 밸런스를 조정하기 쉬운 코드 구조인가?

절반 정도 쉽다. 수치가 `config.ts`에 많이 모여 있는 점은 좋다. 하지만 wave 수식, 시작 자원, Core 점수, 적 타입 확률은 코드에 흩어져 있어 장기적으로는 `waveConfig`와 `scoreConfig`로 분리하는 편이 좋다.

### 밸런스 수치가 흩어져 있다면 어떻게 정리하면 좋은가?

다음 구조를 권장한다.

```text
src/config/
  buildings.ts
  enemies.ts
  research.ts
  waves.ts
  scoring.ts
  startingState.ts
```

특히 `WaveManager.startWave()`의 수식과 `Core.acceptItem()`의 점수 보상은 config로 빼는 것이 좋다.

### 현재 기능 중 과하거나 불필요한 부분은 무엇인가?

지금 당장은 신규 콘텐츠 후보보다 안정화가 우선이다. legacy Splitter/Merger/FastLink placeholder 파일은 당장 사용자 가치가 없고 문서화 또는 제거가 필요하다. 또한 인라인 DOM 스타일이 많아 유지보수 비용이 크다.

### 현재 기능 중 부족하거나 반드시 보완해야 하는 부분은 무엇인가?

- 텍스트 복구
- 모바일 QA 종료
- Fiber unlock
- Energy/Inference Unit 루프
- 저장/로드 회귀
- 병목 진단 UI

### 사용자가 이 게임을 실행했을 때 어떤 흐름으로 플레이하게 되는가?

난이도를 선택하고 게임을 시작한다. Core와 Storage가 주어지고, Storage에는 Silicon 30개가 있다. 플레이어는 Data Downloader, Processor, Weight Trainer, 방어 타워를 배치하고 케이블로 연결한다. 30초 후 첫 wave가 오고, 생산한 Weight Update를 방어 타워 탄약 또는 Core 점수로 활용하며 wave를 버틴다. 점수가 쌓이면 연구를 열고 더 효율적인 생산/방어를 만든다.

### 발표 자료에서 강조할 만한 차별점은 무엇인가?

- AI 학습 파이프라인을 공장 자동화로 표현한 점
- 생산 산출물이 방어 탄약이자 연구 자원인 점
- 데이터 케이블과 Silicon 컨베이어를 분리한 이중 물류
- 지역 전력망과 블랙아웃
- DDoS/Malware/Overfitted Model 같은 AI/보안 은유의 적

### 지금 가장 먼저 고쳐야 할 문제는 무엇인가?

모바일 QA 재검증과 텍스트 인코딩 복구다. 그다음 Fiber/ENERGY 루프 막힘을 해결해야 한다. 이 셋이 닫히기 전에는 신규 콘텐츠를 더 넣어도 플레이어가 제대로 이해하고 즐기기 어렵다.

## 12. 이번 점검에서 직접 수정한 내용

이번 작업에서는 사용자의 요청에 따라 코드 구조나 밸런스 수치를 크게 변경하지 않았다.

- 수정한 파일: `docs/project_mid_review.md`
- 수정 이유: 현재 프로젝트 상태를 코드, 구조, 게임성, 밸런스, UX 관점에서 중간 점검하기 위해 신규 보고서 작성
- 수정 전 문제점: 전체 프로젝트의 현재 위치와 우선순위를 한 문서에서 볼 수 없었음
- 수정 후 개선점: 핵심 재미, 구현 상태, 막힌 루프, 밸런스 리스크, 다음 우선순위를 정리함
- 추가로 검토해야 할 부분: Fiber unlock, Energy item loop, 모바일 QA 재실행, 텍스트 인코딩 복구

