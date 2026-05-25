# 프로젝트 맵

다음 AI 세션이 전체 파일을 다시 훑지 않고도 빠르게 시작하기 위한 코드베이스 지도입니다. 파일별 세부 역할은 [FILE_ROLE_MAP.md](./FILE_ROLE_MAP.md), 런타임 관계는 [ARCHITECTURE.md](./ARCHITECTURE.md), 테스트 범위는 [TEST_MAP.md](./TEST_MAP.md), 밸런스 수치는 [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)를 먼저 함께 보세요.

## 프로젝트 목적과 현재 게임 개요

Gradium은 Phaser 3 + TypeScript + Vite 기반의 2D 공장 자동화/타워 디펜스 게임입니다.

핵심 플레이는 `Signal Packet -> Labeled Data -> Weight Update -> Confidence Score` 데이터 생산 라인을 만들고, 침입 포트에서 들어오는 적을 방어하며, 연구와 방어 모델 훈련으로 공장을 성장시키는 흐름입니다. 현재 빌드는 난이도 선택, 튜토리얼, 자원/지형 생성, 건물 배치/철거/회전, 컨베이어와 케이블/AP 물류, 전력망, 웨이브, 저장/불러오기, 한국어/영어 UI, 데스크톱/모바일 조작을 포함합니다.

## 주요 기술 스택

- 런타임: Phaser 3
- 언어: TypeScript, 일부 DOM HTML/CSS
- 번들러: Vite
- 유닛 테스트: Vitest
- E2E 테스트: Playwright
- 저장소 상태: `dist/`, `test-results/`, `node_modules/`가 로컬에 존재하지만 핵심 소스는 `src/`, E2E는 `tests/e2e/`, 문서는 `docs/`입니다.

## 폴더 구조 요약

| 경로 | 역할 |
|---|---|
| `src/main.ts` | Phaser 게임 인스턴스 생성, 전역 테스트 훅 노출 |
| `src/scenes/` | 메뉴와 실제 게임 Scene |
| `src/managers/` | 건물, 전력, 웨이브, 저장, UI, 맵, 아이템, 케이블 등 런타임 하위 시스템 |
| `src/buildings/` | 건물 기반 클래스와 건물별 동작 |
| `src/enemies/` | 적 런타임 객체와 이동/공격/특수 효과 |
| `src/controllers/` | 입력과 오버레이 그리기 로직 분리 |
| `src/visuals/` | 캔버스 그래픽 패치용 팔레트와 의미 색상 |
| `src/utils/` | 순수 로직/시뮬레이션/요약/마이그레이션/게이트 함수 |
| `src/styles/` | DOM UI와 모바일 레이아웃 CSS |
| `public/assets/buildings/` | 미사용 건물 텍스처 PNG 보관 |
| `tests/e2e/` | Playwright smoke 및 조작 테스트 |
| `docs/` | 설계, QA, 로드맵, 코드베이스 지도 문서 |

## 핵심 실행 흐름

1. `src/main.ts`가 `MainMenuScene`, `MainScene`을 Phaser 게임에 등록합니다.
2. `MainMenuScene`이 난이도 선택 후 `MainScene`을 시작합니다.
3. `MainScene.create()`가 매니저를 생성하고, 맵 자원/지형 생성, Core와 시작 Storage 배치, UI/입력/이벤트를 초기화합니다.
4. 매 프레임 `MainScene.update()`가 커서, 그리드, 틱, 웨이브, 저장, UI, 카메라, 케이블, 이펙트, 오버레이를 갱신합니다.
5. `TickSystem`은 고정 틱으로 전력망, AP/케이블 데이터 전송, 건물 `onTick()` 생산/가공을 처리합니다.
6. `WaveManager`는 프레임 delta 기반으로 웨이브 카운트다운, 적 스폰, 적 업데이트, 웨이브 종료를 처리합니다.
7. DOM UI는 `index.html`의 `#game-hud-shell` 아래에서 상단 상태바, 우측 정보 레일, 하단 빌드 콘솔로 나뉘며 `UIManager`와 하위 `SettingsUI`, `ResearchUI`, `TrainingLabUI`, `MobileUIManager`가 관리합니다.

## 주요 엔트리포인트

- 앱 시작: `src/main.ts`
- 메뉴/난이도: `src/scenes/MainMenuScene.ts`
- 게임 런타임 조립: `src/scenes/MainScene.ts`
- 밸런스/설정 단일 원천: `src/config.ts`
- 타입 계약: `src/types.ts`
- DOM 뼈대: `index.html`
- 전역 스타일: `src/styles/main.css`

## 중요한 설정 파일

| 파일 | 용도 |
|---|---|
| `package.json` | npm 스크립트와 Phaser/Vite/Vitest/Playwright 의존성 |
| `vite.config.ts` | Phaser 청크 분리와 빌드 경고 한도 |
| `vitest.config.ts` | `src/**/*.test.ts`만 Vitest 대상으로 지정 |
| `playwright.config.ts` | `tests/e2e`, 포트 `5174`, desktop/mobile 프로젝트 |
| `tsconfig.json` | ES2020, strict, bundler resolution, `src/**/*.ts/js` 포함 |
| `AGENTS.md` | UTF-8/Korean 출력 주의, 프로젝트 로컬 작업 규칙 |

## 빌드/테스트/실행 명령어

```powershell
npm install
npm run dev
npm run build
npm test
npm run test:e2e
npm run test:e2e -- --workers=1
```

Playwright는 `playwright.config.ts`가 자동으로 `npm run dev -- --host 127.0.0.1 --port 5174`를 띄웁니다. 로컬 안정 기준은 `--workers=1`입니다.

## AI가 먼저 읽어야 할 파일 목록

1. `docs/PROJECT_MAP.md`
2. `docs/ARCHITECTURE.md`
3. `docs/FILE_ROLE_MAP.md`
4. `docs/GAME_BALANCE_MAP.md`
5. `docs/TEST_MAP.md`
6. `src/config.ts`
7. `src/scenes/MainScene.ts`
8. `src/managers/TickSystem.ts`
9. `src/managers/WaveManager.ts`
10. `src/buildings/BuildingFactory.ts`
11. `src/types.ts`

## 자주 수정되는 파일과 이유

| 파일 | 자주 바뀌는 이유 |
|---|---|
| `src/config.ts` | 건물/적/연구/난이도/레시피 수치와 해금 조건의 중심 |
| `src/visuals/visualTheme.ts` | 인게임 그래픽 톤, 건물 카테고리/아이템/적/오버레이 색의 단일 팔레트 |
| `src/scenes/MainScene.ts` | 매니저 조립, 이벤트 연결, 런타임 상태 추가 지점 |
| `src/managers/UIManager.ts` | 상단 HUD, 우측 정보 레일, 하단 빌드 콘솔, 툴팁, 게임오버 등 DOM UI 중심 |
| `src/styles/main.css` | PC 인게임 HUD shell, 모달/튜토리얼/모바일 회귀 레이아웃과 시각 상태 |
| `src/managers/WaveManager.ts` + `src/utils/waveSimulation.ts` | 웨이브 압박, 경로, 브리핑, 난이도 조정 |
| `src/buildings/*` | 새 건물/건물별 생산/방어/물류 동작 |
| `src/managers/GridRenderer.ts`, `src/buildings/BaseBuilding.ts`, `src/enemies/BaseEnemy.ts` | 월드 그리드, 건물 프레임, 적 실루엣의 핵심 캔버스 그래픽 |
| `src/utils/*` | 테스트 가능한 순수 로직 분리 지점 |
| `tests/e2e/app-smoke.spec.ts` | 실제 캔버스+DOM 흐름 회귀 검증 |

## 건드리면 위험한 파일 또는 주의 영역

- `src/config.ts`: 타입, UI 텍스트, 건물 팩토리, 연구 해금, 테스트가 모두 기대합니다. 새 건물은 `CONFIG.BUILDINGS`, `BuildingType`, `BuildingFactory`, i18n, UI 카테고리, 테스트를 함께 봐야 합니다.
- `src/scenes/MainScene.ts`: 매니저 초기화 순서에 암묵 의존성이 있습니다. 특히 `CableManager`, `ResearchManager`, `UIManager`, `TutorialManager` 생성 시점과 이벤트 해제(owner)가 중요합니다.
- `src/managers/EventBus.ts`: owner 기반 cleanup이 Scene shutdown과 테스트 안정성에 연결됩니다.
- `src/managers/SaveManager.ts` + `src/utils/saveMigration.ts` + `src/types.ts`: 저장 포맷 변경은 마이그레이션과 테스트를 같이 갱신해야 합니다.
- `src/managers/PowerManager.ts`: 전력망은 건물 `hasPower`를 직접 바꾸므로 생산/케이블/방어 전체에 영향이 큽니다.
- `src/managers/CableManager.ts`: 케이블 큐, AP 자동 릴레이, 연구 보너스, 저장 큐 복원과 연결됩니다.
- `src/enemies/BaseEnemy.ts`: 이동/건물 공격/코어 피해/특수 적 효과가 한 파일에 모여 있어 밸런스 변경의 파급이 큽니다.
- `index.html`과 `src/styles/main.css`: Playwright가 DOM id와 텍스트 일부에 의존합니다. id 변경 시 E2E를 같이 수정하세요.

## 현재 문서화 기준의 불확실성

- 현재 worktree에는 이미 수정된 파일이 많습니다. 이 문서는 작업 시점의 로컬 파일 내용을 기준으로 작성했습니다.
- 밸런스 평가는 플레이 로그나 장시간 실측이 아니라 코드와 테스트에서 추론한 것입니다. [GAME_BALANCE_MAP.md](./GAME_BALANCE_MAP.md)의 “추정” 표시를 확인하세요.
