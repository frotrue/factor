# Playability Hardening Plan

> 시작 목표: 최종 제안 1번 - 모바일/데스크톱 플레이 QA와 조작성 안정화
> 현재 상태: 코드 구현 완료, 실제 기기/브라우저 수동 QA만 남음

## 1. 범위

이번 작업은 신규 콘텐츠 추가가 아니라 플레이 가능성 안정화를 목표로 한다.

포함:
- 모바일 터치 입력 충돌 제거
- 모바일 레이아웃 겹침 조정
- 터치 드래그와 짧은 탭 판정 안정화
- 케이블 연결 중 상태 표시 개선
- 선택된 건물/타일 정보 표시 개선
- 데스크톱 입력 회귀 확인 절차 정리

제외:
- EMP Tower, Honeypot 등 신규 콘텐츠 구현
- 웨이브 밸런스 수치 조정
- 저장 데이터 마이그레이션 구조 개편
- 대규모 `MainScene` 리팩터링

## 2. 구현 완료 내역

### 모바일 레이아웃
- `src/styles/main.css`에서 모바일 HUD, 하단 빌드바, 액션바, 정보 시트, 모달 반응형 스타일을 추가했다.
- `#mobile-action-bar`, `#mobile-build-summary`, `#mobile-info-sheet`의 하단 offset을 정리했다.
- 모바일 가로 화면에서는 HUD와 하단 UI 높이를 줄이고, 활동 로그/튜토리얼 패널은 숨기도록 했다.
- 모달은 모바일에서 화면 안에 들어오고 내부 스크롤이 가능하도록 했다.

### 터치 입력 안정화
- `src/scenes/MainScene.ts`에서 모바일 `pointerdown`은 즉시 배치하지 않고 시작 위치/시간을 기록한다.
- 이동 거리 `8px` 이하, 시간 `250ms` 이하일 때만 배치 탭으로 처리한다.
- 이동 거리 `10px` 이하, 시간 `500ms` 이상이고 빈 공간이면 현재 액션을 취소한다.
- 멀티터치 중에는 탭 배치가 발생하지 않도록 방어했다.
- `src/managers/CameraController.ts`에서 모바일 한 손가락 팬과 두 손가락 핀치 줌을 지원한다.

### 모바일 조작 UI
- `src/managers/UIManager.ts`에서 모바일 전용 DOM을 생성한다.
  - `mobile-action-bar`
  - `mobile-info-sheet`
  - `mobile-build-summary`
  - `mobile-cable-menu`
- 모바일 버튼은 `Rotate`, `Remove`, `Cable`, `Cancel`, `Defense`, `Power`를 제공한다.
- 모바일 DOM 버튼은 `preventDefault`와 `stopPropagation`을 적용해 월드 입력으로 새지 않게 했다.
- 터치 타깃은 최소 `56px` 높이를 보장한다.

### 케이블 UX
- 케이블 시작 시 `Cable: select endpoint` 상태를 모바일 요약 패널에 표시한다.
- 케이블 성공, 중복 연결, 다른 건물 선택 필요, 자원 부족, 취소 상태를 로그로 표시한다.
- `Cancel` 버튼은 케이블 대기 상태와 삭제 모드를 해제하고 이전 빌딩 선택으로 돌아간다.

### 정보 시트
- 모바일에서는 마우스 hover 툴팁 대신 하단 compact info sheet를 표시한다.
- 표시 태그:
  - `POWER OK`
  - `NO POWER`
  - `INPUT FULL`
  - `OUTPUT FULL`
  - `NO AMMO`
  - `PROCESSING`
- 출력 버퍼도 `현재 / 최대` 형식으로 표시해 `OUTPUT FULL` 판정이 가능해졌다.

## 3. 남은 항목

코드로 처리할 수 있는 1차 구현은 완료됐다. 남은 작업은 실제 화면에서의 수동 QA다.

필수 확인:
- 데스크톱 조작 회귀
- `390x844` 모바일 세로
- `844x390` 모바일 가로
- `768x1024` 태블릿 세로
- 연구/설정/게임오버 모달 스크롤
- 터치 팬, 핀치 줌, 짧은 탭 배치
- 모바일 액션 버튼 전체

체크리스트는 `docs/QA_CHECKLIST.md`로 분리했다.

## 4. 완료 기준

- `npm run build`가 성공한다.
- 데스크톱의 WASD, 휠 줌, 우클릭 삭제, R 회전, F1/F2 오버레이가 유지된다.
- 모바일에서 키보드/마우스 없이 건설, 회전, 삭제, 케이블 연결, 오버레이 토글이 가능하다.
- 작은 화면에서 HUD, 빌드바, 액션바, 모달이 치명적으로 겹치지 않는다.
- 케이블 연결 상태와 실패 이유를 UI에서 알 수 있다.
