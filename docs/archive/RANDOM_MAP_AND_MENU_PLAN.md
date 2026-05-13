# 🗺️ 맵 무작위 생성 및 메인 메뉴 구현 계획서

## 1. 개요
현재 고정된 위치에 생성되던 자원(매립지)을 플레이할 때마다 매번 다르게 생성되도록(Roguelike/Procedural Generation 방식) 변경합니다. 또한, 바로 게임 화면으로 진입하는 대신 몰입감을 높여줄 사이버펑크 테마의 **메인 메뉴 화면(Main Menu Scene)**을 도입합니다.

---

## 2. 세부 구현 계획

### Phase 1: 자원 매립지 무작위 생성 (Random Map Generation)
*   **대상 파일**: `src/managers/MapManager.js`
*   **변경 내용**:
    *   기존의 하드코딩된 `generateResourcePatches` 로직을 제거합니다.
    *   **난수 기반 생성 알고리즘**을 도입하여 다음을 무작위로 결정합니다:
        *   **생성 개수**: 전체 맵에 생성될 매립지 덩어리 개수 (예: 10 ~ 15개)
        *   **위치**: 반경 `X: -30~30, Y: -30~30` 타일 내의 무작위 좌표
        *   **크기**: 2x2 타일에서 최대 6x6 타일까지 무작위 크기 배정
        *   **종류**: `SILICON`, `ENERGY` 중 무작위 배정. 데이터는 맵 자원 대신 `DATA_DOWNLOADER` 건물에서 생산.
    *   **안전 구역(Safe Zone)**: 중앙(0,0) 주변 반경 3타일 이내에는 자원이 생성되지 않도록 예외 처리하여 메인 서버(Core) 건설 공간을 확보합니다.

### Phase 2: 메인 메뉴 씬 추가 (Main Menu Scene)
*   **신규 파일**: `src/scenes/MainMenuScene.js`
*   **구성 요소**:
    *   사이버펑크 테마의 게임 타이틀: "NEURAL FACTORY"
    *   시작 버튼 (Hover 효과 포함)
    *   배경: 짙은 배경에 무작위로 떠다니는 입자(Particle)나 그리드 애니메이션 등 가벼운 시각적 효과 추가.

### Phase 3: 게임 진입 플로우 및 UI 제어 (Flow Control)
*   **대상 파일**: `src/main.js`, `index.html`, `src/scenes/MainScene.js`
*   **변경 내용**:
    *   `main.js`의 Phaser 설정(`config.scene`)에 `MainMenuScene`을 첫 번째로 등록하여 메인 메뉴가 먼저 뜨도록 합니다.
    *   초기 로딩 시 HTML의 인게임 UI들(`top-hud`, `info-layer`, `ui-overlay` 등)은 `display: none`으로 숨겨둡니다.
    *   메인 메뉴에서 "Start Game"을 누르면, Phaser의 씬 전환(`this.scene.start('MainScene')`)을 호출하면서 동시에 HTML DOM UI들의 가시성을 `display: block`(또는 flex)으로 켜줍니다.

---

## 3. 기대 효과
*   **리플레이성(Replayability) 증가**: 매번 자원의 위치와 크기가 달라지므로, 플레이어는 매번 새로운 형태로 컨베이어 벨트와 전력망을 설계해야 합니다.
*   **게임의 완성도 향상**: 시작 메뉴를 통해 "프로토타입" 느낌에서 벗어나 실제 완성된 게임 패키지 같은 인상을 줍니다.
