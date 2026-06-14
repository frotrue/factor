# Gradium

Phaser 3 + TypeScript + Vite로 만든 2D 공장 자동화/타워 디펜스 게임입니다.

플레이어는 데이터 처리 공장을 구축해 `Signal Packet -> Labeled Data -> Weight Update -> Confidence Score` 흐름을 만들고, 침입 포트에서 들어오는 적을 방어합니다. 현재 빌드는 초반 온보딩, 고정 침입 포트, 지형 BLOCKER, 건물 내구도/파괴, AP 무선 릴레이, 모바일 조작, 저장/로드를 포함합니다.

## 실행

```powershell
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`에 접속합니다.

```powershell
npm test
npm run typecheck
npm run test:e2e
npm run build
```

## 핵심 루프

```text
Silicon / Energy 패치 확인
-> Data Downloader로 Signal Packet 생산
-> Processor / Weight Trainer로 데이터 처리
-> Core에 Weight Update 전달
-> Confidence Score 획득
-> 연구와 방어 모델 강화
-> 침입 포트 방어
```

## 현재 주요 기능

- 건물 배치, 철거, 회전, 카테고리형 빌드바
- 케이블 중심 물류: Ethernet / Fiber Cable / AP / Repeater
- Silicon과 데이터 아이템의 케이블 기반 저장/전송
- 전력망, 블랙아웃, 전력/방어 범위 오버레이
- 고정 침입 포트 기반 웨이브 예고와 방어 경로 시각화
- 모든 건물 내구도, 적의 건물 공격, 파괴 시 케이블 정리
- BLOCKER 지형: 건설 불가, 적 이동 불가
- 튜토리얼 체크리스트와 첫 10분 온보딩
- 연구 트리, 난이도 선택, 저장/로드, 언어 전환
- 데스크톱/모바일 기본 조작과 Playwright smoke coverage

## 조작

### 데스크톱

| 입력 | 동작 |
| --- | --- |
| `W A S D` | 카메라 이동 |
| 마우스 휠 | 줌 |
| 좌클릭 | 선택한 건물/케이블 배치 |
| 우클릭 | 건물/케이블 제거 |
| `R` | 배치 방향 회전 |
| `F1` | 방어 범위 오버레이 |
| `F2` | 전력망 오버레이 |
| `0`, `Delete`, `Backspace` | 제거 모드 |

설치 전 고스트에는 방향 화살표가 표시됩니다. 설치된 건물에는 별도 화살표를 표시하지 않습니다.

### 모바일

- 탭: 건물 배치
- 드래그: 카메라 이동
- 핀치: 줌
- 하단 액션바: Rotate, Remove, Cable, Cancel, Defense, Power

## 주요 건물

| 분류 | 건물 |
| --- | --- |
| 추출 | Extractor, Data Downloader |
| 물류 | Storage, Data Cache, AP, Repeater |
| 생산 | Data Processor, Weight Trainer, Neural Trainer, Model Training Lab, Recycler |
| 전력 | Neural Core, Power Plant, Power Node, Solar Panel |
| 방어 | Classifier, Anomaly Engine, Firewall |

## 적과 웨이브

- `Noise`: 기본 적
- `Malware`: 주변 건물 감염
- `Adversarial`: 명중률을 낮추는 고속 적
- `DDoS Packet`: Wave 8 이후 특수 압박
- `Overfitted Model`: 10의 배수 웨이브 보스

Normal 난이도 기준 Wave 1~10은 North Port 중심으로 진행되고, Wave 11부터 East Port가 추가됩니다.

## 문서

- [현재 상태와 로드맵](docs/PROJECT_ANALYSIS_AND_ROADMAP.md)
- [다음 작업](docs/NEXT_TASKS.md)
- [QA 체크리스트](docs/QA_CHECKLIST.md)
- [자동 테스트 가이드](docs/AUTOMATED_TESTING_GUIDE.md)
- [게임 콘셉트](docs/CONCEPT.md)
