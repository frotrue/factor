# The Neural Factory - 프로젝트 분석 및 개발 로드맵
> 최종 갱신: 2026-05-12  
> 버전: v1.0 "The Initial Weight"

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | The Neural Factory |
| 장르 | 공장 자동화(Factorio-like) + 타워 디펜스 + 인크리멘털 |
| 엔진 | Phaser 3 |
| 언어 | TypeScript |
| 빌드 | Vite |
| 테마 | 사이버펑크 / AI / 신경망 |

### 핵심 게임 루프

```text
원시 데이터 채굴
-> 라벨링 데이터 가공
-> 가중치 학습
-> 모델/추론 유닛 생산
-> 방어 타워에 공급
-> 적 웨이브 방어
```

---

## 2. 현재 구현 현황

| 시스템 | 상태 | 주요 파일 | 비고 |
|--------|------|-----------|------|
| 그리드 기반 건설 | 완료 | `BuildingManager.ts`, `MainScene.ts` | 고스트 프리뷰, 회전, 2x2 건물 지원 |
| 케이블 물류 | 완료 | `CableManager.ts` | 이더넷/광섬유 2종, 양방향 데이터 전송 |
| 무선 AP | 완료 | `CableManager.ts`, `AccessPoint.ts` | 반경 기반 무선 데이터 전송 |
| 전력망 | 완료 | `PowerManager.ts` | 발전/소비/정전/전력 범위 계산 |
| 웨이브 | 완료 | `WaveManager.ts` | 일반 적 3종 + 10웨이브 보스 |
| 방어 타워 | 완료 | `DefenseTower.ts` | 단일, 광역, 접촉형 방어 |
| 연구 | 완료 | `ResearchManager.ts` | Confidence Score 소비 기반 해금 |
| 생산 체인 | 완료 | `AbstractProcessor.ts` | RAW -> LABELED -> WEIGHT -> MODEL -> INFERENCE |
| 저장/로드 | 개선됨 | `SaveManager.ts` | localStorage 기반, 로드 시 비용 재차감 방지 |
| UI/HUD | 개선됨 | `UIManager.ts`, `index.html` | 하단 탭, HUD, 연구/설정 모달 |
| 레거시 물류 | 보존 | `src/buildings/legacy/`, `config.ts` 주석 블록 | 컨베이어 계열은 추후 재도입 예정 |

---

## 3. 아키텍처 요약

```text
src/
├── main.ts                    # Phaser 초기화
├── config.ts                  # 전역 게임 설정
├── types.ts                   # 타입 정의
├── styles/main.css            # DOM UI 스타일
├── scenes/
│   ├── MainMenuScene.ts       # 메인 메뉴
│   └── MainScene.ts           # 게임 본편 오케스트레이션
├── managers/                  # 시스템별 매니저
├── buildings/                 # 활성 건물 클래스
│   └── legacy/                # 미래 컨베이어 재도입용 보존 코드
└── enemies/
```

주요 패턴은 매니저 패턴, 빌딩 팩토리, 이벤트 버스, tick 기반 업데이트다. `MainScene`은 아직 입력/오버레이/게임 상태 조율 책임이 커서 추후 분리 대상이다.

---

## 4. 발견된 이슈 및 기술 부채

| 우선순위 | 이슈 | 방향 |
|----------|------|------|
| 높음 | 레거시 컨베이어 코드가 미래 기능으로 남아 있음 | 삭제하지 않고 비활성 보존한다. 현재 빌드 UI/입력 흐름에서는 노출하지 않는다. |
| 높음 | 적 AI가 코어 직선 이동 중심 | Phase 1에서 경로 탐색과 적별 특수 행동을 추가한다. |
| 높음 | 밸런스가 초반 이후 급격함 | Phase 1에서 웨이브 곡선과 방어 업그레이드를 조정한다. |
| 중간 | `MainScene` 책임 과다 | Phase 5에서 InputHandler/OverlayManager 분리를 검토한다. |
| 중간 | 시각/사운드 완성도 부족 | Phase 2에서 건물 비주얼, 이펙트, 사운드 시스템을 개선한다. |
| 낮음 | `as any` 사용과 테스트 부족 | Phase 5에서 타입 안정성과 테스트 기반을 강화한다. |

---

## 5. 개발 로드맵

### Phase 0: 안정화 및 레거시 보존형 정리

- [x] CSS를 `src/styles/main.css`로 분리
- [x] `vite.config.ts` 추가 및 Phaser chunk 분리
- [x] 웨이브/스폰/자동 저장/tick 관련 매직 넘버를 `CONFIG.TIMING`으로 이동
- [x] 저장 파일 로드 시 건설 비용이 다시 차감되지 않도록 수정
- [x] 케이블 저장/로드 queue 복원 안정화
- [x] 플레이 중 노출되는 깨진 UI 문자열 정리
- [x] 컨베이어/분배기/합류기/고속 시냅스 레거시 코드는 삭제하지 않고 비활성 보존

### Phase 1: 게임플레이 핵심 강화

- [x] 적 경로 탐색 개선: 격자 기반 BFS로 일반 건물을 우회하고 방화벽은 차단물로 취급
- [x] 적 유형별 특수 행동 추가: Malware 감염, Adversarial 회피, Overfitted Model 오라
- [x] 적 처치 보상 추가: 웨이브 방어 후 Silicon 회수
- [x] 웨이브 성장 곡선 1차 재설계
- [x] 방어/생산/네트워크 연구 효과 도입
- [x] 방어 타워 업그레이드 전용 UI: Research 모달에 Defense Upgrades 탭 추가
- [x] 적 행동 연출과 상태 아이콘: Malware/Adversarial/Boss 상태 링 및 오라 추가
- [x] 감염 상태 표시: 감염된 건물 위 경고 마커 추가

### Phase 2: 비주얼 및 UX 강화

- 건물별 시각적 실루엣과 애니메이션 강화
- 전력 차단/데이터 전송/방어 발사 이펙트 개선
- SoundManager 도입
- 신규 플레이어용 튜토리얼 추가

### Phase 3: 시스템 확장

- 신규 건물 추가
- 난이도 선택과 게임 모드 추가
- 통계/업적 시스템 추가

### Phase 4: 플랫폼 확장

- 모바일 터치 입력
- 반응형 UI
- PWA 또는 Capacitor 패키징

### Phase 5: 코드 품질 및 안정성

- `MainScene` 책임 분리
- `as any` 축소
- Vitest 기반 핵심 로직 테스트 추가
- ESLint/Prettier 및 CI 검증 추가

---

## 권장 실행 순서

1. Phase 1-1/1-2: 적 AI와 밸런스 개선
2. Phase 2-3: 사운드 시스템
3. Phase 1-3: 연구 트리 확장
4. Phase 2-1/2-2: 비주얼과 이펙트 강화
5. Phase 2-4: 튜토리얼
6. Phase 3: 신규 콘텐츠
7. Phase 4: 모바일 확장
