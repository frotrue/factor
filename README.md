# The Neural Factory

Phaser 3 + TypeScript로 만든 2D 공장 자동화 / 타워 디펜스 게임.

플레이어는 AI 학습 파이프라인을 공장처럼 구축한다.  
Signal Packet을 수집하고, 가공하고, 가중치를 학습시켜 방어 AI 모델을 강화한다.  
웨이브로 몰려오는 악성 데이터(적)로부터 Neural Core를 지키는 것이 목표다.

---

## 핵심 게임 루프

```
DataDownloader → Signal Packet
  → Processor   → Labeled Data
  → WeightTrainer → Weight Update → Core (Confidence Score 획득)
                                 → ModelTrainingLab (타워 AI 강화)

Miner → Silicon → Conveyor → Storage → 건물 건설 자원
```

- **케이블**: 데이터 아이템(Signal Packet, Labeled Data, Weight Update 등) 전송
- **컨베이어**: 물리 자원(Silicon) 운반
- **전력망**: 범위가 겹치는 발전소/노드끼리 네트워크 병합, 전력 부족 시 구역 블랙아웃
- **ModelTrainingLab**: Weight Update/Trained Model을 소비해 타워의 AI confidence 향상 → 데미지·명중률 상승
- **방어 타워**: 탄약 없이 confidence 기반으로 발사

---

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

```bash
npm run build   # 프로덕션 빌드 (dist/ 생성)
```

---

## 조작법

### 데스크톱

| 키/마우스 | 동작 |
|-----------|------|
| `W A S D` | 카메라 이동 |
| 마우스 휠 | 줌 인/아웃 |
| 좌클릭 | 건물 배치 |
| 우클릭 | 건물/케이블 제거 |
| `R` | 선택 건물 회전 |
| `F1` | 방어 범위 오버레이 토글 |
| `F2` | 전력망 오버레이 토글 |
| `0` / `Delete` / `Backspace` | 제거 모드 |
| Conveyor 드래그 | 연속 컨베이어 배치 |

### 모바일

| 조작 | 동작 |
|------|------|
| 짧은 탭 | 건물 배치 |
| 한 손가락 드래그 | 카메라 이동 |
| 두 손가락 핀치 | 줌 인/아웃 |
| 액션바 — Rotate | 건물 회전 |
| 액션바 — Remove | 제거 모드 |
| 액션바 — Cable | 케이블 연결 모드 |
| 액션바 — Cancel | 현재 모드 취소 |

---

## 건물 목록

### 자원 채굴

| 건물 | 역할 |
|------|------|
| Extractor (Miner) | Silicon 패치 위에서 Silicon 채굴 |
| Data Downloader | 전력만 있으면 어디서든 Signal Packet 생산 |
| Unloader | 인접 Storage에서 자원 인출 |

### 데이터 처리

| 건물 | 레시피 |
|------|--------|
| Data Processor | RAW_DATA → Labeled Data (3 ticks) |
| Weight Trainer | Labeled Data ×2 → Weight Update (5 ticks) |
| Neural Trainer | Weight Update + Silicon → Trained Model (8 ticks) |
| Model Training Lab | Weight Update/Trained Model → 타워 AI confidence 상승 |
| Recycler | 데이터 아이템 ×2 → Silicon (4 ticks) |

### 물류

| 건물 | 역할 |
|------|------|
| Conveyor | Silicon 단방향 이동 |
| Fast Link | 고속 컨베이어 (연구 해금) |
| Data Cache | 데이터 아이템 전용 버퍼 (최대 20개) |
| Storage | 자원/데이터 대량 보관 (2×2, 최대 50개) |
| Access Point (AP) | 범위 내 건물 간 무선 데이터 중계 |

### 전력

| 건물 | 역할 |
|------|------|
| Neural Core | 전력 50W 생산, 범위 3 (시작 건물) |
| Power Plant | Energy 패치 위에서 전력 50W 생산 |
| Power Node | 전력 범위 중계 (Range 5) |
| Solar Panel | 전력 10W 생산, 자기 타일만 커버 (연구 해금) |

### 방어

| 건물 | 특징 |
|------|------|
| Classifier | 단일 대상 Lock-on, 높은 단일 피해 |
| Anomaly Detection Engine (Filter) | AoE 범위 스캔, 모든 적 동시 타격 |
| Firewall | HP 500, 적 이동 차단, 접촉 시 피해 |

---

## 적 목록

| 이름 | 특징 |
|------|------|
| Noise | 기본 적 |
| Malware | 인접 건물 일시 감염 (50% 성능 저하) |
| Adversarial | 빠른 속도, 타워 명중률 감소 |
| Overfitted Model | 보스, HP 1500, 범위 내 적 속도 1.25× 버프 |
| DDoS Packet | 초고속, 보상 없음, 스웜 전체 처치 시 Silicon +5 |

---

## 연구 트리 (Confidence Score 소비)

| 연구 | 비용 | 효과 |
|------|------|------|
| 고속 컨베이어 | 50 | Fast Link 해금 |
| Recycling Loop | 80 | Recycler 해금 |
| 효율적 채굴 | 75 | 채굴 속도 25% 향상 |
| 태양광 발전 | 100 | Solar Panel 해금 |
| 처리 파이프라인 최적화 | 120 | 가공 속도 20% 향상 |
| 광섬유 케이블 | 150 | Fiber Optic 케이블 해금 |
| 분산 AP 처리 | 150 | AP 범위 +2, 케이블 대역폭 +1 |
| 방화벽 경화 | 180 | Firewall HP 50% 증가 |
| 정밀 추론 | 140 | 타워 데미지 30% 증가 |
| 방어 범위 확장 | 160 | 타워 사거리 +1 |
| 고속 대응 루프 | 220 | 타워 발사 주기 20% 단축 |
| 고급 모델 학습 | 200 | Neural Trainer, Model Training Lab 해금 |
| 자동 방어 AI | 300 | Inference Unit 생산 레시피 해금 |

---

## 프로젝트 구조

```
src/
  main.ts              # Phaser 게임 초기화
  config.ts            # 게임 밸런스와 전역 설정
  types.ts             # 타입 정의
  styles/main.css      # DOM HUD/UI 스타일
  scenes/
    MainMenuScene.ts   # 메인 메뉴, 난이도 선택
    MainScene.ts       # 게임 월드 및 시스템 조율
  managers/
    TickSystem.ts      # 틱 기반 게임 루프
    BuildingManager.ts # 건물 배치/삭제/조회
    CableManager.ts    # 케이블/AP 무선 데이터 전송
    PowerManager.ts    # 전력망 계산 및 블랙아웃
    WaveManager.ts     # 적 웨이브 진행
    ResearchManager.ts # 연구 해금 및 효과 적용
    SaveManager.ts     # 저장/로드 (localStorage)
    UIManager.ts       # HUD, 빌드바, 연구/설정 UI
    TutorialManager.ts # 체크리스트 튜토리얼
    EffectsManager.ts  # 시각 효과
    SoundManager.ts    # Web Audio 기반 사운드
  buildings/           # 건물 클래스
  enemies/             # 적 클래스 (BaseEnemy)
docs/                  # 설계 문서 및 로드맵
```

---

## 기술 스택

- **TypeScript** + **Phaser 3.90**
- **Vite 5** (개발 서버 및 번들링)
- **DOM 기반 HUD/UI** (CSS + 인라인 DOM 생성)
- **Web Audio API** (효과음)
- **localStorage** (저장/로드)

---

## 개발 노트

- 저장/로드는 `localStorage('neural_factory_save')` 기반이다.
- 타워는 탄약을 소비하지 않으며, ModelTrainingLab으로 타워의 AI confidence를 높이면 데미지와 명중률이 향상된다.
- AP(Access Point)는 범위 내 건물 간 무선 데이터 중계를 한다. 케이블보다 유연하지만 처리량이 낮다.
- `docs/PROJECT_ANALYSIS_AND_ROADMAP.md`에 현재 버그, 밸런스 수치, 개발 로드맵이 정리되어 있다.
