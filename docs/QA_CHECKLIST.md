# QA Checklist

## Automated Smoke

### 2026-05-20 terrain and building attack automated check

- [x] Vitest: every building has positive durability.
- [x] Vitest: blocker terrain config exists and blocks building/enemy movement.
- [x] Vitest: MapManager terrain blockers are queryable and generated outside core/resource safe tiles.
- [x] Vitest: enemy building targeting prioritizes Firewall, then defense, then utility buildings while ignoring Core.
- [x] Vitest: save migration preserves terrain and damaged building HP fields.
- [x] Playwright: existing desktop/mobile startup, placement, cable, overlay, save, and modal smoke tests passed.
- [x] `npm test` passed.
- [x] `npm run test:e2e` passed.
- [x] `npm run build` passed.

### 2026-05-20 onboarding intrusion ports automated check

- [x] Vitest: Normal waves 1-3 stay focused on North Port.
- [x] Vitest: Normal wave 11 introduces North + East ports.
- [x] Vitest: wave briefing metadata exposes route names, threat level, special threat, and recommended defense.
- [x] Vitest: tutorial flow remains compatible after defense guidance copy update.
- [x] Playwright: existing desktop/mobile startup and interaction smoke tests passed.
- [x] `npm test` passed.
- [x] `npm run test:e2e` passed.
- [x] `npm run build` passed.

### 2026-05-19 P0/P1/P2 UX hardening automated check

- [x] Vitest: EventBus owner/callback removal and no-arg `off(event)` guard
- [x] Vitest: tooltip/training-lab/Solar Panel i18n keys
- [x] Vitest: full output buffer warning marker
- [x] Playwright: settings modal close restores focus to Phaser canvas
- [x] `npm test` passed
- [x] `npm run test:e2e` passed
- [x] `npm run build` passed

- [x] Desktop/Mobile Playwright: game startup centers the camera on the Neural Core.

- [x] Desktop Chromium: default Korean UI is shown, settings language selector switches to English, and HUD/tutorial/settings labels update.

- [x] Desktop Chromium: 메뉴에서 게임 시작 가능
- [x] Desktop Chromium: 설정 모달 열기/닫기 가능
- [x] Mobile Portrait - 390x844: 게임 시작 후 모바일 액션바 표시
- [x] Mobile Landscape - 844x390: 게임 시작 후 모바일 액션바 표시
- [x] Mobile Portrait - 390x844: Rotate/Remove/Cable/Cancel/Defense/Power 버튼 상태 변경 확인
- [x] Mobile Landscape - 844x390: Rotate/Remove/Cable/Cancel/Defense/Power 버튼 상태 변경 확인
- [x] Desktop Chromium: Data Downloader 배치 가능
- [x] Desktop Chromium: Processor 배치 가능
- [x] Desktop Chromium: Basic Cable 연결 가능
- [x] Desktop Chromium: Remove 모드로 케이블 제거 가능
- [x] Desktop Chromium: Conveyor/Storage/Weight Trainer/Classifier 배치 가능
- [x] Desktop Chromium: `R` 회전, `F1` 방어 범위, `F2` 전력망 오버레이 토글 가능
- [x] Desktop Chromium: 우클릭 건물 제거, 게임 속도 설정, 저장, 연구 모달 열기 가능
- [x] Desktop Chromium: 튜토리얼 패널 표시 및 첫 목표 안내 확인
- [x] Mobile Portrait - 390x844: 터치로 Data Downloader/Processor 배치 및 Basic Cable 연결 가능
- [x] Mobile Landscape - 844x390: 터치로 Data Downloader/Processor 배치 및 Basic Cable 연결 가능
- [x] Vitest: 튜토리얼 진행 순서/저장 step 계산 검증
- [x] Vitest: Wave 1/5/10/12/20 수식, 난이도 배율, DDoS/Boss 압박 검증
- [x] Vitest: 2,000~10,000 tick 장시간 생산 루프 시뮬레이션 검증
- [x] `npm test` 통과
- [x] `npm run test:e2e` 통과
- [x] `npm run build` 통과

> 자동 스모크는 시작/표시/모달, 튜토리얼 첫 안내, 주요 건물 배치, 케이블 연결/제거, 모바일 액션바/터치 배치 회귀 방지용이다. 웨이브 수식과 장시간 생산 루프는 Vitest 시뮬레이션으로 보호한다. 실제 플레이 감각과 세밀한 밸런스 조정은 아래 수동 QA가 필요하다.

## Desktop

- [ ] 메뉴에서 난이도 선택 후 게임 시작 가능
- [ ] Data Downloader 배치 가능
- [ ] Processor/Weight Trainer 배치 가능
- [ ] 케이블 연결 가능
- [ ] Conveyor로 Silicon 이동 가능
- [ ] Storage에 Silicon 보관 가능
- [ ] 방어 타워 배치 가능
- [ ] 우클릭으로 건물 제거 가능
- [ ] `R` 키로 회전 가능
- [ ] `F1`로 방어 범위 오버레이 토글 가능
- [ ] `F2`로 전력망 오버레이 토글 가능
- [ ] 저장/로드 가능
- [ ] 연구/설정 모달 열기/닫기 가능

## Mobile Portrait - 390x844

- [ ] 메뉴 타이틀과 난이도/시작 버튼이 화면 안에 있음
- [ ] HUD가 게임 필드를 과도하게 가리지 않음
- [ ] 하단 빌드바를 가로 스크롤할 수 있음
- [ ] 액션바 버튼이 모두 터치 가능
- [ ] 짧은 탭으로 건물 배치 가능
- [ ] 드래그로 카메라 이동 가능
- [ ] 두 손가락 핀치 줌 가능
- [ ] Rotate 버튼으로 방향 전환 가능
- [ ] Remove 버튼으로 삭제 모드 전환 가능
- [ ] Cable 버튼으로 케이블 모드 진입 가능
- [ ] Cancel 버튼으로 케이블/삭제 상태 취소 가능
- [ ] 선택된 건물 정보가 compact info sheet에 표시됨

## Mobile Landscape - 844x390

- [ ] HUD가 상단을 과도하게 차지하지 않음
- [ ] 하단 UI가 화면 높이를 지나치게 차지하지 않음
- [ ] 액션바와 빌드 요약이 서로 겹치지 않음
- [ ] 연구/설정 모달이 화면 안에서 스크롤됨
- [ ] 게임오버 화면 버튼이 화면 안에 있음

## Tablet Portrait - 768x1024

- [ ] HUD가 2행 또는 compact 형태로 안정적으로 표시됨
- [ ] 빌드바와 액션바가 손가락 터치에 충분한 크기임
- [ ] 정보 시트가 빌드바/액션바와 치명적으로 겹치지 않음
- [ ] 모달 내부 스크롤이 가능함

## Cable Flow

- [ ] Cable 선택 후 첫 번째 건물을 탭하면 시작점이 선택됨
- [ ] 두 번째 건물을 탭하면 케이블이 연결됨
- [ ] 같은 건물을 다시 탭하면 실패 이유가 표시됨
- [ ] 이미 연결된 케이블이면 중복 연결 실패가 표시됨
- [ ] Silicon이 부족하면 자원 부족 메시지가 표시됨
- [ ] 빈 공간 롱프레스 또는 Cancel 버튼으로 연결 대기 상태가 취소됨
