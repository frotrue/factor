# Pull Request: Gradium Direction Realignment & UX/UI Overhaul

## 📋 개요 (Overview)

본 Pull Request는 `origin/codex/ux-hardening` 브랜치를 베이스로 삼아, 핵심 플레이 경험(팩토리 자동화 60% + 디펜스 40%)의 연결성을 직관적이고 완성도 있게 강화하기 위한 **Gradium 방향성 재조정 및 UI/UX 전면 개편** 작업을 병합합니다. 

이전 빌드의 복잡하고 다소 모호했던 조작 및 진행 방식을 단순화하고, 플레이어가 팩토리 데이터 파이프라인 구축(`Signal Packet -> Labeled Data -> Weight Update -> Confidence Score`)과 방어 모델 훈련의 인과관계를 자연스럽게 체득할 수 있도록 핵심 온보딩 및 피드백 루프를 크게 개선했습니다.

This Pull Request merges the **Gradium Direction Realignment & UI/UX Overhaul**, built on top of `origin/codex/ux-hardening`. It solidifies the connection between factory automation (60%) and tower defense (40%) to create a more intuitive and polished core player experience. 

It simplifies early logistics ambiguity, optimizes onboarding, and provides rich feedforward/feedback loops so players naturally grasp how building a data pipeline directly improves their defensive confidence and capabilities.

---

## 🚀 주요 변경 사항 (Key Changes)

### 1. Gradium 방향성 재조정 및 핵심 루프 고정 (Direction Realignment)
- **핵심 루프**: 데이터 흐름 구축 ➡️ 방어선 배치 ➡️ 웨이브 방어 ➡️ 성장 시스템 해금 ➡️ 팩토리 확장 ➡️ 방어 모델 훈련 ➡️ 더 강력한 침입 방어.
- **초반 복잡도 완화**: `Unloader` 해금 타이밍을 첫 웨이브 방어 성공 이후로 연기하고, `AP Relay`, `Fiber`, `Fast Link` 등 복잡한 물류 노출을 지연시켜 핵심 흐름인 Miner-Downloader-Cable 중심의 인입선 집중을 유도했습니다.
- **연구 타이밍 조율**: 게임 규칙과 위협을 인지한 상태에서 전략적 결정을 내릴 수 있도록 첫 디펜스 성공 이후 연구 기능이 활성화되도록 조정했습니다.

### 2. 인게임 UI/UX 개편 및 시각 피드백 강화 (UI/UX & Visual Overhaul)
- **전술적 패널화**: 우측 정보 레일을 개선하여 다음 4가지 핵심 영역을 명확히 노출합니다.
  - **현재 목표 (Current Objective)**: 플레이어가 다음에 무엇을 해야 하는지 알려주는 실시간 동적 가이드.
  - **다음 웨이브 (Next Wave)**: 침입 경로, 적 유형, 대처 추천 가이드 표시.
  - **방어 상태 (Defense Status)**: 활성 방어 도구 및 모델 신뢰도(Confidence Score), 실시간 훈련 상태 정보 표시.
  - **전력 상태 (Power Status)**: 간결한 전력 사용량 서머리 및 블랙아웃 경고 안내.
- **시각적 가독성 개선**: 32x32 크기에서도 건물들의 카테고리를 명확히 구분할 수 있도록 소형 카테고리 엑센트 마크와 네온 테마 전용 그래픽 스타일을 적용했습니다 (`BaseBuilding` 렌더링).
- **게임오버 및 웨이브 요약 (Result Summaries)**:
  - **웨이브 결과 카드**: 각 웨이브 종료 시 파괴된 적 수, 코어 HP 변화량, 신뢰도 변화, 파괴되거나 손상된 건물 통계를 비차단(non-blocking) 카드로 요약 보고합니다.
  - **최종 런 리포트**: 게임 오버 시 도달한 웨이브, 코어 잔여 무결성, 신뢰도, 연구 완료 개수, 가장 강력한 모델 등의 통계를 종합적으로 표시하여 리플레이 가치를 높였습니다.

### 3. 온보딩 및 튜토리얼 아레나 재설계 (Tutorial & Onboarding Gates)
- **단계별 가이드 강화**: `CORE -> RESOURCE -> POWER -> MINER -> STORAGE -> DOWNLOADER -> CABLE -> PROCESSOR -> TRAINER -> DEFENSE -> FIRST_WAVE -> MODEL_LAB`으로 연결되는 가이드 잠금 및 검증 로직을 고도화했습니다 (`tutorialFlow.ts`).
- **아레나 및 캠페인 전환**: 튜토리얼 완료/스킵 시 기존 배치를 이어받는 방식 대신 새 캠페인 랜덤 맵으로 자연스럽게 안내하여 유저가 스스로 배치를 시도하도록 설계했습니다.

### 4. 밸런스 및 웨이브 시뮬레이션 개선 (Balance & Waves Tuning)
- **DDoS 난이도 곡선 조절**: Wave 8+에서 발생하는 무차별적인 DDoS 적 개체 수를 하향 안정화(최대 10개 ➡️ 6~8개)하여 가독성과 대응성을 높였습니다.
- **경로 탐색 최적화**: 강력하고 디버깅 가능한 새로운 그리드 경로 탐색 유틸리티(`gridPath.ts`)를 작성해 유닛 경로 안정성을 크게 높였습니다.

### 5. 현지화 및 QoL 패치 (Localization & Bug Fixes)
- **다국어(i18n) 시스템 통합**: 한국어 및 영어 지원(`src/i18n.ts`)을 전 UI 영역에 걸쳐 완벽히 분리 및 구현했습니다.
- **QoL 개선**: 장애물(Blocker) 위 마우스 오버 시 툴팁이 표시되지 않던 버그를 정밀 수정했습니다.

### 6. 테스트 자동화 확보 (Test Coverage)
- **Vitest**: 새로 추가된 `waveResultSummary`, `runResultSummary`, `progressionGates`, `gridPath` 등의 순수 로직에 대한 철저한 단위 테스트를 완료했습니다.
- **Playwright E2E**: 튜토리얼 진행 잠금 및 UI 가이드 흐름을 정밀하게 탐지하는 통합 E2E 테스트 스위트(`tests/e2e/tutorial-guidance.spec.ts`)를 작성하여 빌드 안전성을 공고히 했습니다.

---

## 🛠️ 검증 결과 (Verification Results)

모든 단위 및 E2E 테스트가 성공적으로 통과하였으며, 빌드 오류 및 런타임 누수가 없음을 확인했습니다.

```powershell
# 1. 단위 테스트 실행 (Vitest) - 17개 파일, 57개 테스트 통과
npm test

# 2. 프로덕션 빌드 검증 - 64개 모듈 트랜스폼 성공
npm run build

# 3. Playwright E2E 테스트 실행 - 전체 통과
npm run test:e2e -- --workers=1
```

- **Residual Risks**: 미세 수치 밸런스는 향후 추가적인 실측 플레이를 통해 상시 튜닝 가능하며, 파괴되거나 손상된 건물에 대한 시각적인 `UNDER ATTACK` 상태 연출은 차후 마이너 패치로 보강할 예정입니다.

---

## 📝 추천 커밋 메시지 (Suggested Commit Message)

```text
feat & fix: clarify factory-defense progression, overhaul in-game UI & UX, and realign Gradium direction

- Realigned core Gradium loop to bind data pipelining with defense confidence.
- Overhauled in-game UI with tactical panels (Current Objective, Next Wave, Defense, Power).
- Integrated non-blocking Wave Results and GameOver Run Report.
- Gated early logistics (Unloader/AP) and eased DDoS pressure for smooth onboarding.
- Standardized full English/Korean translation framework (i18n.ts).
- Added comprehensive unit tests and automated Playwright E2E coverage.
```
