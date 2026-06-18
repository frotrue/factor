# Mobile Conveyor Input Fix Plan

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

> 작성일: 2026-05-14  
> 목표: 모바일에서 Conveyor/Fast Link 선택 후 카메라 이동 또는 DOM UI 터치가 월드 배치로 처리되는 문제를 막는다.

## 1. 문제 요약

모바일 환경에서 Conveyor를 선택한 뒤 다음 행동을 할 때 의도하지 않은 컨베이어가 설치될 수 있다.

- 화면을 드래그해 카메라를 이동할 때
- 하단 빌드바, 카테고리 탭, 상단 설정/연구 버튼을 터치할 때
- 모바일 액션 UI와 월드 입력이 같은 터치 흐름으로 섞일 때

기존 코드에는 모바일에서 드래그 중 컨베이어 연속 배치를 막는 조건이 있다.

- `MainScene.updateCursorPosition()`의 `!this.isMobileLayout && pointer.leftButtonDown()` 조건

하지만 이 조건만으로는 부족하다. 모바일 tap 배치 로직은 `pointerdown`에서 터치 시작점을 저장하고, `pointerup`에서 짧은 탭이면 `handlePointerAction()`을 호출한다. 이때 터치가 DOM UI 위에서 끝났거나, UI 터치가 Phaser pointer 흐름과 섞이면 선택된 건물이 월드에 배치될 수 있다.

## 2. 원인 분석

### 원인 A: 월드 입력이 DOM UI 위 터치를 필터링하지 않음

`MainScene.setupInput()`은 모바일 `pointerdown`에서 터치 시작 위치와 시간을 기록한다. 그러나 현재 pointer가 `#bottom-ui-container`, `#ui-overlay`, `#ui-tabs`, `#top-actions`, modal, mobile action bar 등 DOM UI 위에 있는지 검사하지 않는다.

결과적으로 UI 조작과 월드 탭 배치가 같은 입력 흐름으로 해석될 수 있다.

### 원인 B: 빌드바/탭/상단 버튼 이벤트 차단이 모바일 액션바보다 약함

`mobile-action-bar` 버튼에는 `preventDefault()`와 `stopPropagation()`이 들어가 있다. 반면 `createBuildingButtons()`에서 생성하는 빌드 버튼과 탭 버튼, 설정/연구 버튼에는 같은 수준의 pointer event guard가 없다.

### 원인 C: 카메라 팬과 짧은 탭 판정의 경계

현재 모바일 배치 판정은 이동 거리 `8px` 이하, 시간 `250ms` 이하인 경우만 배치한다. 이 기준은 유지하되, 터치 시작 또는 종료가 UI 위라면 아예 월드 탭 후보에서 제외해야 한다.

## 3. 구현 방향

### Step 1. MainScene에서 DOM UI hit-test 추가

`document.elementFromPoint(pointer.x, pointer.y)`로 현재 pointer 아래 DOM 요소를 확인하고, 다음 UI 영역이면 월드 입력으로 처리하지 않는다.

- `#bottom-ui-container`
- `#ui-overlay`
- `#ui-tabs`
- `#top-actions`
- `#settings-modal`
- `#research-modal`
- `#game-over-screen`
- `#mobile-action-bar`
- `#mobile-cable-menu`
- `#mobile-build-summary`
- `#mobile-info-sheet`
- `#activity-log`
- `#tutorial-panel`
- `.build-btn`
- `.tab-btn`
- `.mobile-action-btn`
- `.mobile-cable-option`

### Step 2. 모바일 pointerdown/pointerup 방어

- 모바일 `pointerdown`이 DOM UI 위에서 시작하면 `mobileTouchStart`를 저장하지 않는다.
- 모바일 `pointerup`이 DOM UI 위에서 끝나면 배치/취소 처리를 하지 않는다.
- 이 방어는 Conveyor뿐 아니라 모든 선택 모드에 적용한다.

### Step 3. UIManager에서 빌드바/탭/상단 버튼 pointer guard 추가

- 동적으로 생성되는 빌드 버튼과 탭 버튼에 `pointerdown`, `pointerup`, `touchstart`, `touchend` 전파 차단을 추가한다.
- 클릭 핸들러에는 `preventDefault()`와 `stopPropagation()`을 적용한 뒤 기존 동작을 호출한다.
- 설정/연구/저장/로드/속도 버튼도 같은 방식으로 보호한다.

## 4. 완료 기준

- 모바일에서 Conveyor 선택 후 하단 UI를 터치해도 월드에 Conveyor가 설치되지 않는다.
- 모바일에서 Conveyor 선택 후 카메라 팬을 해도 Conveyor가 설치되지 않는다.
- 모바일에서 빈 월드를 짧게 탭하면 기존처럼 1개 배치된다.
- 데스크톱의 드래그 컨베이어 배치 동작은 유지된다.
- `npm run build`가 성공한다.

## 5. 테스트 항목

- `390x844`에서 Conveyor 선택 후 빌드바 스크롤
- `390x844`에서 Conveyor 선택 후 카메라 드래그
- `390x844`에서 Conveyor 선택 후 Settings/Research 버튼 클릭
- `844x390`에서 같은 테스트 반복
- 데스크톱에서 Conveyor 선택 후 마우스 드래그 연속 배치 유지 확인

