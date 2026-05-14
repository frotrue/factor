# The Neural Factory

Phaser 3와 TypeScript로 만든 Factorio 스타일 2D 자동화/방어 게임입니다. 플레이어는 데이터 생산 라인을 구축하고, 전력망과 물류를 관리하며, 웨이브로 몰려오는 적으로부터 Neural Core를 방어합니다.

## 주요 특징

- **자동화 생산 라인**: Data Downloader로 Signal Packet을 다운로드하고 Processor, Weight Trainer, Neural Trainer를 거쳐 고급 데이터 산출물을 만듭니다.
- **물류 시스템**: 케이블은 데이터 아이템을 전송하고, 컨베이어는 Silicon 같은 물리 자원을 운반합니다.
- **구역별 전력망**: 발전/중계 범위가 겹치는 전력망끼리 묶이며, 전력 부족은 해당 구역에만 영향을 줍니다.
- **방어와 웨이브**: Classifier, Anomaly Detection Engine, Firewall로 Noise, Malware, Adversarial, Overfitted Model을 방어합니다.
- **연구/업그레이드**: Confidence Score를 사용해 생산, 네트워크, 방어 효과를 확장합니다.
- **튜토리얼과 피드백**: 체크리스트 튜토리얼, 시각 효과, Web Audio 기반 사운드가 포함되어 있습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 표시하는 로컬 주소로 접속합니다. 기본적으로 `http://localhost:5173` 또는 `http://127.0.0.1:5173`를 사용합니다.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

## 조작

- `W A S D`: 카메라 이동
- `Scroll`: 줌
- `R`: 건물 회전
- `F1`: 방어 범위 오버레이
- `F2`: 전력망 오버레이
- `0`, `Delete`, `Backspace`: 제거 모드
- 우클릭: 건물/케이블 제거

## 주요 시스템

### 데이터 생산

`Signal Source` 맵 자원은 제거되었고, 데이터는 `Data Downloader`가 생산합니다. `RAW_DATA`는 내부 아이템 ID로 유지되며, 화면에서는 `Signal Packet`으로 표시됩니다.

### 물류

케이블은 데이터 계열 아이템만 운반합니다. 컨베이어는 물리 자원 운송을 담당하며, Splitter/Merger/Fast Link 계열 레거시 코드는 추후 확장을 위해 보존되어 있습니다.

### 전력

Core, Power Plant, Solar Panel, Power Node처럼 전력을 생산하거나 범위를 제공하는 건물은 전력 노드로 계산됩니다. 공급 범위가 겹치는 노드들은 같은 전력망으로 병합되고, 전력 부족은 해당 네트워크 안의 소비 건물에만 적용됩니다.

### 방어

방어 타워는 연구 효과에 따라 피해량, 사거리, 발사 주기가 달라집니다. 적은 타입별 상태 비주얼을 가지며, Malware는 건물을 일시적으로 감염시킬 수 있습니다.

## 프로젝트 구조

```text
src/
  main.ts                 # Phaser 게임 초기화
  config.ts               # 게임 밸런스와 전역 설정
  types.ts                # 주요 타입 정의
  styles/main.css         # DOM UI 스타일
  scenes/                 # 메뉴와 메인 게임 씬
  managers/               # 전력, 물류, 저장, UI, 연구, 웨이브 등 시스템
  buildings/              # 건물 클래스
  enemies/                # 적 클래스
docs/                     # 로드맵과 설계 문서
```

## 기술 스택

- TypeScript
- Phaser 3
- Vite

## 개발 메모

- 저장/로드는 `localStorage` 기반입니다.
- 레거시 컨베이어 계열 코드는 삭제하지 않고 보존합니다.
- 향후 작업은 신규 건물, 게임 모드, 통계/업적, 모바일 대응, 테스트/CI 강화가 중심입니다.
