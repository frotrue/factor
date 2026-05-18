# 자동화 테스트 가이드

> 작성일: 2026-05-17  
> 목적: 다른 채팅/세션에서도 현재 프로젝트의 자동 QA를 바로 이어서 실행하기 위한 절차

---

## 1. 빠른 실행

프로젝트 루트:

```powershell
cd C:\Users\user\Desktop\react\factor
```

표준 검증:

```powershell
npm test
npm run test:e2e
npm run build
```

Playwright 브라우저가 없다는 오류가 나오면:

```powershell
npx playwright install chromium
```

---

## 2. 현재 테스트 구성

| 명령 | 역할 | 설정 |
|------|------|------|
| `npm test` | Vitest 단위/무결성 테스트 | `vitest.config.ts` |
| `npm run test:e2e` | Playwright 브라우저 스모크 테스트 | `playwright.config.ts` |
| `npm run build` | Vite production build 검증 | `vite.config.ts` |

현재 주요 테스트 파일:

| 파일 | 검증 내용 |
|------|-----------|
| `src/config.test.ts` | 연구/해금/아이템/레시피 config 무결성 |
| `src/utils/saveMigration.test.ts` | 저장 데이터 마이그레이션 기본값/보존 |
| `src/utils/apRelay.test.ts` | AP 자동 릴레이 source 제외 및 수신자 우선순위 |
| `src/utils/tutorialFlow.test.ts` | 튜토리얼 진행 순서, 저장 step, 완료 상태 계산 |
| `src/utils/waveSimulation.test.ts` | 웨이브 수식, 난이도 배율, DDoS/Boss 압박 시뮬레이션 |
| `src/utils/productionSimulation.test.ts` | 2,000~10,000 tick 장시간 생산 루프 시뮬레이션 |
| `tests/e2e/app-smoke.spec.ts` | 데스크톱 시작/설정 모달/튜토리얼 패널/주요 빌드 상호작용, 모바일 액션바 버튼 상태, 데스크톱/모바일 배치와 케이블 조작 |

---

## 3. 권장 작업 흐름

1. 작업 전 상태 확인

```powershell
git -c safe.directory=C:/Users/user/Desktop/react/factor status --short
```

2. 표준 검증 실행

```powershell
npm test
npm run test:e2e
npm run build
```

3. 실패 시 우선순위

- `npm test` 실패: config/순수 로직 불일치 가능성이 큼
- `npm run test:e2e` 실패: UI 준비 타이밍, viewport 레이아웃, 실제 런타임 오류 확인
- `npm run build` 실패: 타입 오류 또는 번들링 오류

4. 수정 후 재검증

- 먼저 실패한 명령만 재실행
- 마지막에는 표준 검증 3종 모두 실행

5. 문서 업데이트

- `docs/QA_CHECKLIST.md`
- `docs/FUTURE_IMPLEMENTATION_PLAN.md`

---

## 4. Playwright E2E 작성 규칙

Phaser 메뉴와 게임 필드는 canvas 기반이라 DOM selector만으로 모든 조작을 검증하기 어렵다.

### 게임 시작

현재 `tests/e2e/app-smoke.spec.ts`는 viewport 중심 좌표를 기준으로 시작 버튼을 클릭한다.

```typescript
const viewport = page.viewportSize()!;
const isCompact = viewport.width < 600 || viewport.height < 520;
await page.mouse.click(viewport.width / 2, viewport.height / 2 + (isCompact ? 112 : 120));
```

### MainScene UI 준비 대기

HUD가 보인 직후에도 DOM 버튼 이벤트 연결이 아직 끝나지 않았을 수 있다. DOM 버튼을 클릭하기 전에는 UI 준비 신호를 기다린다.

```typescript
await expect(page.locator('#ui-overlay .build-btn').first()).toBeVisible();
await page.waitForFunction(() => document.getElementById('btn-settings')?.dataset.pointerGuarded === 'true');
```

### Phaser 상태 확인

Playwright에서 canvas 조작 결과를 검증하기 위해 앱은 `window.__NEURAL_FACTORY_GAME__`에 Phaser game 인스턴스를 노출한다.

```typescript
const state = await page.evaluate(() => {
    const scene = window.__NEURAL_FACTORY_GAME__?.scene.getScene('MainScene') as any;
    return {
        cableCount: scene.cableManager.cables.size,
        selectedBuildingType: scene.uiManager.getSelectedBuildingType()
    };
});
```

실제 행동은 `page.mouse.click()`과 DOM 버튼 클릭으로 수행하고, 내부 상태는 검증에만 사용한다.

### 데스크톱/모바일 분리

Playwright project 이름으로 테스트 대상을 분리한다.

```typescript
test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only smoke');
test.skip(!testInfo.project.name.startsWith('mobile-'), 'mobile-only smoke');
```

### 런타임 오류 수집

스모크 테스트에서는 console/page error를 모아 마지막에 비어 있는지 확인한다.

```typescript
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
});
expect(errors).toEqual([]);
```

---

## 5. 테스트 추가 기준

### Vitest로 추가할 것

- config 간 참조 무결성
- recipe/input/output 관계
- research unlock 관계
- save migration
- AP/Cable 규칙
- 순수 함수로 분리 가능한 게임 규칙
- tutorial flow/order/progress 계산
- wave formula/difficulty/DDOS/boss pressure simulation
- long-running production loop simulation

### Playwright로 추가할 것

- 메뉴에서 게임 시작
- 설정/연구/훈련 모달 열기/닫기
- 모바일 action bar 표시
- 모바일 action bar 버튼 상태 변경
- 모바일 cable menu 표시
- canvas 좌표 기반 건물 배치/삭제/케이블 연결 스모크
- 모바일 터치 기반 건물 배치/케이블 연결 스모크
- 데스크톱 주요 빌드 카테고리, 핫키, 오버레이, 저장, 연구 모달 스모크

가능하면 먼저 순수 함수로 분리하고 Vitest를 붙인다. 브라우저가 꼭 필요한 상호작용만 Playwright로 검증한다.

---

## 6. 흔한 실패와 대응

| 증상 | 원인 후보 | 대응 |
|------|-----------|------|
| `npm test`가 Playwright 파일을 읽음 | Vitest include 범위 문제 | `vitest.config.ts` 확인 |
| settings modal이 안 열림 | MainScene UI 이벤트 연결 전 클릭 | `dataset.pointerGuarded` 대기 |
| Chromium 없음 | Playwright browser 미설치 | `npx playwright install chromium` |
| E2E가 엉뚱한 앱을 테스트 | 5174 포트 재사용 | Playwright webServer 로그/페이지 내용 확인 |
| 모바일 테스트만 실패 | body에 `mobile-layout` 미적용 | viewport/project 설정 확인 |

---

## 7. Codex Skill

다른 채팅/세션에서 자동으로 꺼내 쓰기 위한 skill도 생성했다.

경로:

```text
C:\Users\user\.codex\skills\factor-automated-testing\SKILL.md
```

다른 세션에서는 다음처럼 요청하면 된다.

```text
이 프로젝트 자동화 테스트 진행해줘.
factor-automated-testing skill을 사용해서 QA 체크해줘.
Vitest/Playwright 회귀 테스트를 돌리고 문서 업데이트해줘.
```
