# Gradium UI 전면 재개편 구현 계획

## 목표

현재 DOM 직접 조작 + Phaser Text 혼합 UI를 **Preact + Signals** 기반의 컴포넌트 아키텍처로 전면 교체하고, **새로운 디자인 시스템**을 도입하여 시각적 품질을 대폭 향상합니다.

## User Review Required

> [!IMPORTANT]
> **Preact 도입 범위**: Preact는 DOM HUD 오버레이에만 사용됩니다. Phaser 캔버스(게임 렌더링)는 변경하지 않습니다. 기존 게임 로직(`BuildingManager`, `WaveManager`, `CableManager` 등)은 그대로 유지됩니다.

> [!WARNING]
> **E2E 테스트 파손**: `tests/e2e/app-smoke.spec.ts`가 DOM ID에 의존합니다. UI 마이그레이션 시 테스트도 함께 업데이트해야 합니다. 각 Phase 끝에서 검증합니다.

## Open Questions

1. **디자인 톤 세부 방향**: "밀리터리 HUD + SF 홀로그램" 혼합 톤을 제안합니다. 현재 사이버펑크 네온 팔레트를 기반으로 하되, 비대칭 패널 컷(clip-path), 스캔라인 효과, 글리치 경고 애니메이션 등을 추가합니다. 이 방향이 괜찮은지 확인 부탁합니다.
2. **디스플레이 폰트**: 제목용 폰트로 **Rajdhani** (밀리터리/전술 느낌)를 제안합니다. 대안: Orbitron(더 SF적), Exo 2(깔끔한 모던). 데이터 폰트는 기존 Share Tech Mono 유지입니다.
3. **빌딩 아이콘**: `public/assets/buildings/`의 22개 PNG 컨셉아트를 빌드 버튼 아이콘으로 활용할지, 새로운 SVG 아이콘을 만들지 결정이 필요합니다.

---

## Proposed Changes

### Phase 0: 인프라 구축 (Preact + 디자인 토큰)

#### [MODIFY] [vite.config.ts](file:///c:/Users/user/Desktop/projects/factor/vite.config.ts)
- `@preact/preset-vite` 플러그인 추가
- `preact`, `@preact/signals`를 별도 chunk로 분리

```typescript
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
    plugins: [preact()],
    build: {
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser'],
                    preact: ['preact', '@preact/signals']
                }
            }
        }
    }
});
```

#### [MODIFY] [tsconfig.json](file:///c:/Users/user/Desktop/projects/factor/tsconfig.json)
- JSX/TSX 지원: `"jsx": "react-jsx"`, `"jsxImportSource": "preact"` 추가
- include에 `"src/**/*.tsx"` 추가

#### [MODIFY] [vite-env.d.ts](file:///c:/Users/user/Desktop/projects/factor/src/vite-env.d.ts)
- CSS Module 타입 선언 추가

#### [NEW] src/styles/tokens.css
- 기존 `main.css`의 `:root` 변수를 확장한 디자인 토큰 파일
- 새 팔레트, 스페이싱 스케일(4px 단위), 타이포그래피 스케일, 그림자 토큰, 전환 시간 토큰
- 두 가지 폰트 변수: `--font-display` (Rajdhani), `--font-mono` (Share Tech Mono)

```css
:root {
    /* ── Color Palette ── */
    --holo-cyan: #4dd8ff;
    --holo-cyan-dim: rgba(77, 216, 255, 0.12);
    --holo-magenta: #f06cff;
    --holo-green: #64f58d;
    --holo-amber: #f6c453;
    --holo-red: #ff6676;

    --bg-void: #030508;
    --bg-surface: rgba(8, 12, 20, 0.94);
    --bg-panel: rgba(12, 17, 28, 0.88);
    --bg-panel-hover: rgba(36, 46, 66, 0.92);
    --bg-elevated: rgba(18, 24, 38, 0.82);

    --border-subtle: rgba(152, 176, 204, 0.12);
    --border-active: rgba(77, 216, 255, 0.55);
    --border-danger: rgba(255, 102, 118, 0.5);

    --text-primary: #f3f7fb;
    --text-secondary: #9aa8ba;
    --text-dim: #64748b;

    /* ── Typography ── */
    --font-display: 'Rajdhani', sans-serif;
    --font-mono: 'Share Tech Mono', monospace;

    --text-xs: 10px;
    --text-sm: 12px;
    --text-base: 14px;
    --text-lg: 16px;
    --text-xl: 20px;
    --text-2xl: 28px;
    --text-3xl: 40px;

    /* ── Spacing (4px scale) ── */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;

    /* ── Radius ── */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;

    /* ── Shadows ── */
    --shadow-panel: 0 16px 40px rgba(0, 0, 0, 0.48);
    --shadow-glow-cyan: 0 0 14px rgba(77, 216, 255, 0.45);
    --shadow-glow-red: 0 0 14px rgba(255, 102, 118, 0.45);

    /* ── Transitions ── */
    --transition-fast: 0.12s ease;
    --transition-base: 0.2s ease;
    --transition-slow: 0.35s ease;
}
```

#### [MODIFY] [index.html](file:///c:/Users/user/Desktop/projects/factor/index.html)
- Rajdhani 폰트 Google Fonts preconnect/link 추가
- `<div id="preact-hud"></div>` 컨테이너 추가 (Phaser canvas와 sibling)
- 기존 `#game-hud-shell`은 Phase 1~4에서 점진적으로 제거

---

### Phase 1: 신호 브릿지 + 상단 HUD 바

#### [NEW] src/ui/mountHud.tsx
- Preact 마운트 진입점. `main.ts`에서 호출.
- `render(<HudApp game={game} />, document.getElementById('preact-hud')!)`

#### [MODIFY] [main.ts](file:///c:/Users/user/Desktop/projects/factor/src/main.ts)
- `import { mountHud } from './ui/mountHud'` 추가
- Phaser Game 생성 후 `mountHud(game)` 호출
- main.ts는 `.ts`로 유지 (JSX 없음)

#### [NEW] src/ui/HudApp.tsx
- 최상위 HUD 컴포넌트. `useEffect`로 Phaser scene ready 감지 후 signal bridge 연결
- 모든 HUD 패널 컴포넌트를 조합

#### [NEW] src/ui/signals/gameState.ts
- Preact Signals 기반 게임 상태 저장소
- `signal()`: score, power, silicon, packets, wave, waveTimer, currentObjective, defenseStatus, powerStatus 등
- `computed()`: 파생 상태 (powerDisplay, isLowPower, waveTimerDisplay)

#### [NEW] src/ui/signals/bridge.ts
- Phaser EventBus → Preact Signals 단방향 업데이트
- `batch()`로 다중 signal 쓰기를 하나의 렌더 사이클로 묶음
- Preact → Phaser 역방향은 콜백 함수 signal로 처리 (건물 선택, 설정 변경 등)

#### [MODIFY] [UIManager.ts](file:///c:/Users/user/Desktop/projects/factor/src/managers/UIManager.ts)
- HUD stat 업데이트 (`scoreEl`, `powerEl` 등)를 EventBus emit으로 교체
- 기존 DOM 직접 조작 코드를 signal bridge로 리다이렉트
- 일단 기존 기능은 유지하면서 신호 발행만 추가 (dual-write)

#### [NEW] src/ui/components/TopBar.tsx + TopBar.module.css
- 상단 리소스 바: 수신 데이터, 전력, 실리콘, 패킷, 웨이브, 타이머
- Signal 직접 참조로 자동 업데이트 (no manual DOM)
- 아이콘 추가, 수치 변경 애니메이션
- 설정/연구/Lab 바로가기 버튼 그룹

#### [NEW] src/ui/shared/GlassPanel.tsx + GlassPanel.module.css
- 재사용 가능한 글래스모피즘 래퍼 컴포넌트
- `clip-path`를 통한 비대칭 베벨 (밀리터리 HUD 스타일)
- variant props: `default`, `alert`, `success`

---

### Phase 2: 우측 레일 + 빌드 콘솔

#### [NEW] src/ui/components/RightRail.tsx + RightRail.module.css
- 미션 패널, 위협 패널, 시스템 패널
- 패널 접기/펼치기 토글 기능 추가
- 웨이브 정보에 위협도 시각 바(threat level bar) 추가
- 적 유형 아이콘/색상 표시

#### [NEW] src/ui/components/BuildConsole.tsx + BuildConsole.module.css
- 카테고리 탭 + 건물 그리드 + 선택 도구 패널
- 건물 아이콘: 기존 단색 swatch → PNG 컨셉아트 or SVG 아이콘
- 건물 hover 시 상세 프리뷰 팝업 (생산량, 전력, 범위 등)
- 핫키 표시 개선
- 스크롤 인디케이터

#### [NEW] src/ui/signals/buildState.ts
- 건물 선택, 카테고리, 건물 목록, 비용 등 빌드 UI 전용 signal
- Preact → Phaser 역방향: `selectedBuildingType` signal 변경 시 EventBus emit

#### [MODIFY] [UIManager.ts](file:///c:/Users/user/Desktop/projects/factor/src/managers/UIManager.ts)
- `createBuildingButtons()` 로직을 signals/buildState로 이전
- DOM 직접 생성 코드 제거, Preact 컴포넌트로 대체
- 기존 hotkey 바인딩은 유지 (Phaser input)

---

### Phase 3: 모달 시스템 + 메인 메뉴

#### [NEW] src/ui/components/ModalOverlay.tsx + ModalOverlay.module.css
- 공통 모달 시스템: 배경 딤, 열기/닫기 애니메이션, ESC 닫기
- `<ModalOverlay open={isSettingsOpen} onClose={...}>`
- CSS `@keyframes` 기반 슬라이드+페이드 전환

#### [NEW] src/ui/components/SettingsModal.tsx + SettingsModal.module.css
- 기존 SettingsUI.ts 로직을 Preact 컴포넌트로 이전
- 섹션 탭 분리: 게임 / 오디오 / 그래픽 / 시스템
- 저장/불러오기를 별도 섹션으로 분리
- 슬라이더, 토글, 버튼 그룹 스타일 개선

#### [NEW] src/ui/components/TrainingLabModal.tsx + TrainingLabModal.module.css
- TrainingLabUI.ts를 Preact로 이전
- 프로그레스 바 애니메이션 개선
- 보상 모드 토글 시각적 강화

#### [NEW] src/ui/components/GameOverScreen.tsx + GameOverScreen.module.css
- 극적 연출: 배경 레드 틴트, 글리치 효과, 페이드인
- 통계 카드 레이아웃 (아이콘 + 수치)
- 메인 메뉴 복귀 버튼 추가

#### [NEW] src/ui/components/MainMenu.tsx + MainMenu.module.css
- **Phaser MainMenuScene의 UI를 DOM으로 교체**
- 배경은 여전히 Phaser 캔버스 (그리드 + 파티클)
- 타이틀, 난이도 선택, 시작 버튼을 Preact 컴포넌트로
- 난이도별 설명 텍스트/아이콘 추가
- 저장 파일 존재 시 "이어하기" 버튼 표시
- Phaser 메뉴 배경 scene을 별도로 유지하되 UI만 DOM 전환

#### [MODIFY] [MainMenuScene.ts](file:///c:/Users/user/Desktop/projects/factor/src/scenes/MainMenuScene.ts)
- Phaser Text 기반 UI 코드 제거
- 배경 그래픽/파티클만 유지
- 시작/난이도 이벤트를 signals로 전환

#### [DELETE] 또는 [MODIFY] 기존 UI 매니저 파일들
- `SettingsUI.ts` → Preact 이전 후 제거
- `TrainingLabUI.ts` → Preact 이전 후 제거
- `ResearchUI.ts` (이미 no-op) → 제거

---

### Phase 4: 모바일 + 부가 UI + 정리

#### [NEW] src/ui/components/MobileActionBar.tsx + module.css
- 모바일 액션바를 Preact로 이전
- 터치 타겟 44×44px 이상으로 확대
- 스와이프 제스처 지원 검토

#### [NEW] src/ui/components/MobileBuildSummary.tsx + module.css
- 모바일 빌드 요약 바텀시트 패턴

#### [NEW] src/ui/components/Tooltip.tsx + module.css
- 통합 툴팁 컴포넌트 (데스크톱: 마우스 추종, 모바일: 바텀시트)

#### [NEW] src/ui/components/ActivityLog.tsx + module.css
- 로그 엔트리 관리, 히스토리 보기 기능 추가

#### [NEW] src/ui/components/WaveResultCard.tsx + module.css
- 웨이브 결과 알림 카드
- 애니메이션 개선, 히스토리 저장

#### [NEW] src/ui/components/TutorialPanel.tsx + module.css
- 튜토리얼 패널을 Preact로 이전
- 타이프라이터 효과 유지
- Phaser 가이드 하이라이트(Graphics)는 그대로 유지

#### [MODIFY] [UIManager.ts](file:///c:/Users/user/Desktop/projects/factor/src/managers/UIManager.ts)
- 최종 축소: Phaser ↔ DOM 이벤트 중개만 담당하는 얇은 레이어로 변환
- 또는 bridge.ts로 완전 대체 후 제거

#### [MODIFY] [main.css](file:///c:/Users/user/Desktop/projects/factor/src/styles/main.css)
- Preact 컴포넌트로 이전 완료된 스타일 블록 제거
- `:root` 토큰과 body 리셋, 글로벌 유틸리티만 유지
- 1280줄 → ~100줄로 축소 목표

#### [MODIFY] [index.html](file:///c:/Users/user/Desktop/projects/factor/index.html)
- `#game-hud-shell` 내부의 정적 HTML 전부 제거
- `#game-container`, `#preact-hud`, `<script>` 태그만 남김

---

## 파일 구조 (최종 목표)

```
src/
├── ui/                              # ← 새 Preact UI 레이어
│   ├── mountHud.tsx                 # Preact 마운트 진입점
│   ├── HudApp.tsx                   # 최상위 조합 컴포넌트
│   ├── signals/
│   │   ├── gameState.ts             # 게임 상태 signals
│   │   ├── buildState.ts            # 빌드 UI signals
│   │   ├── modalState.ts            # 모달 열림/닫힘 signals
│   │   └── bridge.ts               # Phaser↔Signal 브릿지
│   ├── components/
│   │   ├── TopBar.tsx               + .module.css
│   │   ├── RightRail.tsx            + .module.css
│   │   ├── BuildConsole.tsx         + .module.css
│   │   ├── SettingsModal.tsx        + .module.css
│   │   ├── TrainingLabModal.tsx     + .module.css
│   │   ├── GameOverScreen.tsx       + .module.css
│   │   ├── MainMenu.tsx             + .module.css
│   │   ├── TutorialPanel.tsx        + .module.css
│   │   ├── Tooltip.tsx              + .module.css
│   │   ├── ActivityLog.tsx          + .module.css
│   │   ├── WaveResultCard.tsx       + .module.css
│   │   ├── MobileActionBar.tsx      + .module.css
│   │   └── MobileBuildSummary.tsx   + .module.css
│   └── shared/
│       ├── GlassPanel.tsx           + .module.css
│       ├── ModalOverlay.tsx         + .module.css
│       ├── Button.tsx               + .module.css
│       ├── ProgressBar.tsx          + .module.css
│       └── StatCard.tsx             + .module.css
├── styles/
│   ├── tokens.css                   # 디자인 토큰 (글로벌)
│   └── main.css                     # 리셋 + 글로벌 유틸리티 (~100줄)
├── managers/
│   ├── UIManager.ts                 # 축소: 이벤트 중개만 또는 제거
│   ├── MobileUIManager.ts           # → Preact로 이전 후 제거
│   ├── SettingsUI.ts                # → Preact로 이전 후 제거
│   ├── TrainingLabUI.ts             # → Preact로 이전 후 제거
│   ├── ResearchUI.ts                # → 제거 (이미 no-op)
│   └── ... (나머지 매니저는 변경 없음)
├── scenes/
│   ├── MainMenuScene.ts             # 배경만 유지, UI → Preact
│   └── MainScene.ts                 # signal emit 추가
└── ... (나머지 게임 코드 변경 없음)
```

---

## 디자인 방향 디테일

### 비주얼 컨셉: "Tactical Hologram Interface"

기존 사이버펑크 네온 기반에 밀리터리/전술 HUD 요소를 혼합합니다:

1. **비대칭 패널 컷**: `clip-path: polygon()`으로 우상단 모서리를 45° 절단
2. **스캔라인 효과**: 패널에 미세한 가로 줄무늬 오버레이 (선택적, `prefers-reduced-motion` 존중)
3. **글리치 경고**: 위험 상태에서 순간적 글리치 애니메이션
4. **데이터 스트림**: 수치 변경 시 슬롯머신 스타일 롤링 애니메이션
5. **호버 피드백**: 버튼 hover 시 네온 언더라인 + 미세 스케일 (1.02x)
6. **모달 전환**: 슬라이드업 + 페이드인, 배경 블러 딤

### 색상 조정

| 용도 | 기존 | 신규 | 이유 |
|------|------|------|------|
| Primary accent | `#4dd8ff` (cyan) | `#4dd8ff` 유지 | 브랜드 색상으로 정착 |
| Alert accent | `#ff6676` | `#ff4d5e` 약간 강화 | 위험 상태 더 명확히 |
| Background | `#05070c` | `#030508` 더 깊게 | 패널 대비 향상 |
| Panel bg | `rgba(12,17,28,0.86)` | `rgba(8,12,20,0.94)` | 불투명도 높여 가독성 향상 |

---

## Verification Plan

### Automated Tests

```bash
# 1. TypeScript 컴파일 확인
npx tsc --noEmit

# 2. 단위 테스트 (기존 게임 로직 회귀 확인)
npm test

# 3. 빌드 확인
npm run build

# 4. E2E 스모크 테스트 (DOM ID 변경 반영)
npm run test:e2e
```

각 Phase 완료 후 위 4개 검증을 실행합니다.

### Manual Verification

- 각 Phase에서 브라우저로 `localhost:5173` 접속하여 시각적 확인
- 데스크톱/모바일 레이아웃 전환 확인
- 게임 진행 (튜토리얼 → 캠페인) 전체 플로우 플레이테스트
- 설정 모달, Training Lab 모달, 게임 오버 화면 등 모든 UI 상태 확인
- 저장/불러오기 기능 정상 동작 확인

---

## 작업 순서 요약

| Phase | 내용 | 예상 규모 |
|:-----:|------|-----------|
| **0** | 인프라 (Preact, tsconfig, 디자인 토큰) | 설정 파일 5개 + tokens.css |
| **1** | Signal 브릿지 + 상단 HUD 바 | ~8 새 파일, UIManager 수정 |
| **2** | 우측 레일 + 빌드 콘솔 | ~6 새 파일, UIManager 축소 |
| **3** | 모달 시스템 + 메인 메뉴 DOM 전환 | ~10 새 파일, 기존 UI 매니저 제거 |
| **4** | 모바일 + 부가 UI + 정리 | ~8 새 파일, index.html/main.css 정리 |

> [!IMPORTANT]
> 각 Phase는 **독립적으로 빌드/실행 가능**합니다. Preact 컴포넌트와 기존 DOM HUD가 일시적으로 공존하며, 점진적으로 이전합니다.
