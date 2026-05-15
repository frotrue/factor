# 기술 부채 해결 구현 계획서

> 작성일: 2026-05-15  
> 기준: 소스 코드 직접 확인 (config.ts, Miner.ts, SaveManager.ts, EventBus.ts, UIManager.ts, MainScene.ts)  
> 목적: PROJECT_ANALYSIS_AND_ROADMAP.md §6 기술 부채 목록을 실행 가능한 수준으로 구체화

---

## 우선순위 한눈에 보기

| # | 항목 | 심각도 | 예상 시간 | 단계 |
|---|------|--------|-----------|------|
| 1 | Fiber 연구 노드 누락 | 🔴 치명 | 10분 | 즉시 |
| 2 | ENERGY 아이템 생산 경로 없음 | 🔴 치명 | 1시간 | 즉시 |
| 3 | EventBus.off 전체 삭제 | 🟠 높음 | 30분 | 즉시 |
| 4 | 저장 마이그레이션 없음 | 🟠 높음 | 2시간 | 단기 |
| 5 | Solar Panel RANGE 0 미표시 | 🟡 중간 | 30분 | 단기 |
| 6 | AP O(n) 전체 순회 | 🟡 중간 | 1시간 | 단기 |
| 7 | UIManager/MainScene 과대화 | 🟠 높음 | 3~5일 | 중기 |
| 8 | as any 남용 | 🟡 중간 | 2~3일 | 중기 |
| 9 | legacy/ 빈 파일 | 🟢 낮음 | 5분 | 즉시 |

---

## Phase 1 — 즉시 (게임 진행 막는 버그)

### TD-1: Fiber 연구 노드 누락

**문제:** `config.ts:272`에서 `FIBER` 케이블이 `TECH_FIBER_OPTIC`을 요구하지만 `CONFIG.RESEARCH`에 해당 노드가 없어 해금이 불가능하다.

**수정 파일:** `src/config.ts`

**변경 내용:**

```typescript
// RESEARCH 블록 내, TECH_DISTRIBUTED_AP 다음에 추가
TECH_FIBER_OPTIC: {
    ID: 'TECH_FIBER_OPTIC',
    NAME: '광섬유 케이블',
    COST: 150,
    DESCRIPTION: '광섬유 케이블을 해금합니다. 대역폭 8, 큐 20으로 대용량 데이터 전송이 가능합니다.',
    REQUIREMENTS: ['TECH_DISTRIBUTED_AP'],
    UNLOCKS: { CABLES: ['FIBER'] },
    EFFECTS: {}
},
```

**완료 기준:**
- 연구 UI에서 `광섬유 케이블` 노드가 보인다
- `TECH_DISTRIBUTED_AP` 해금 후 조건 충족 시 Research 버튼이 활성화된다
- Fiber 케이블 선택이 빌드 UI에 나타난다

---

### TD-2: ENERGY 아이템 생산 경로 없음

**문제:** `INFERENCE_UNIT_PRODUCTION` 레시피가 `ENERGY` 아이템을 요구하지만 (`config.ts:304`), `Miner.ts:45`에서 `SILICON` 패치만 생산한다. ENERGY 패치 위의 Miner는 아무것도 생산하지 않는다.

**선택 방안: A (Miner가 자원 타입에 따라 분기)**

**수정 파일 1: `src/buildings/Miner.ts`**

```typescript
// onTick 내 생산 로직 교체
onTick(tickCount: number): void {
    if (this.isInfected(tickCount) && tickCount % 2 !== 0) return;

    if (this.shouldProduce(tickCount)) {
        if (this.outputBuffer.length >= this.maxBufferSize) return;
        const mapManager = (this.scene as MainScene).mapManager;
        const resourceType = mapManager.getResourceAt(this.x, this.y);
        if (resourceType === 'SILICON') {
            this.outputBuffer.push('SILICON');
        } else if (resourceType === 'ENERGY') {
            this.outputBuffer.push('ENERGY');
        }
    }
}
```

**수정 파일 2: `src/buildings/BaseBuilding.ts` — `drawBody()` 내 MINER case 확장**

```typescript
case 'MINER':
    if ((this as any).resourceType === 'ENERGY') {
        this.graphics.lineStyle(2, 0xfde047, 0.9);
        this.graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.24);
        this.graphics.fillStyle(0xfde047, 0.8);
        this.graphics.fillCircle(cx, cy, 4);
    } else {
        this.graphics.strokeCircle(cx, cy, Math.min(width, height) * 0.24);
        this.graphics.lineBetween(cx - 7, cy, cx + 7, cy);
        this.graphics.lineBetween(cx, cy - 7, cx, cy + 7);
    }
    break;
```

**수정 파일 3: `src/buildings/Miner.ts` — `drawResourceMode()` ENERGY 분기 추가**

```typescript
drawResourceMode(): void {
    if (this.resourceType === 'SILICON') {
        this.graphics.fillStyle(0x475569, 1);
        this.graphics.fillTriangle(-6, -10, 8, 0, -6, 10);
        this.graphics.lineStyle(2, 0xe2e8f0, 0.9);
        this.graphics.strokeCircle(0, 0, 9);
    } else if (this.resourceType === 'ENERGY') {
        this.graphics.lineStyle(2, 0xfde047, 1);
        this.graphics.strokeCircle(0, 0, 9);
        this.graphics.fillStyle(0xfde047, 0.9);
        this.graphics.fillCircle(0, 0, 4);
    } else {
        this.graphics.lineStyle(2, 0xffffff, 0.5);
        this.graphics.strokeCircle(0, 0, 8);
    }
}
```

**완료 기준:**
- ENERGY 패치 위 Miner가 `ENERGY` 아이템을 outputBuffer에 생산한다
- ENERGY 패치 Miner는 노란 원 아이콘으로 구별된다
- NeuralTrainer에 TRAINED_MODEL + ENERGY가 공급되면 INFERENCE_UNIT이 생산된다

---

### TD-3: EventBus.off 전체 삭제

**문제:** `MainScene.ts:154-172`에서 `EventBus.off('EVENT_NAME')` 형태로 콜백 참조 없이 호출하면 해당 이벤트의 **모든** 리스너가 삭제된다. `UIManager`, `CableManager`, `SaveManager` 등 다른 매니저의 리스너도 함께 삭제될 수 있다.

`EventBus.ts:38`에서 콜백 없이 호출 시 이벤트 전체를 삭제하는 것이 확인됨:
```typescript
off<K>(event: K, callback?: EventCallback): void {
    if (!callback) {
        delete this.events[event]; // ← 전체 삭제
        return;
    }
}
```

**수정 방향:** `EventBus`에 네임스페이스 또는 소유자(owner) 기반 등록/해제를 도입한다.

**수정 파일: `src/managers/EventBus.ts`**

```typescript
// 콜백 맵을 owner 태그를 포함하는 구조로 변경
type TaggedCallback<T = any> = { owner: string; fn: EventCallback<T> };

class EventBusClass {
    private events: { [K in keyof EventMap]?: TaggedCallback<EventMap[K]>[] } = {};

    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>, owner = 'global'): void {
        if (!this.events[event]) this.events[event] = [] as any;
        (this.events[event] as any).push({ owner, fn: callback });
    }

    off<K extends keyof EventMap>(event: K, callbackOrOwner?: EventCallback<EventMap[K]> | string): void {
        const listeners = this.events[event];
        if (!listeners) return;
        if (!callbackOrOwner) {
            delete this.events[event];
            return;
        }
        if (typeof callbackOrOwner === 'string') {
            // owner 기반: 해당 owner의 리스너만 삭제
            this.events[event] = listeners.filter((l: any) => l.owner !== callbackOrOwner) as any;
        } else {
            // 콜백 기반: 해당 콜백만 삭제
            this.events[event] = listeners.filter((l: any) => l.fn !== callbackOrOwner) as any;
        }
    }

    offAll(owner: string): void {
        (Object.keys(this.events) as (keyof EventMap)[]).forEach(event => {
            const listeners = this.events[event];
            if (listeners) {
                this.events[event] = listeners.filter((l: any) => l.owner !== owner) as any;
            }
        });
    }

    emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
        const listeners = this.events[event];
        if (listeners) {
            listeners.forEach(l => (l as any).fn(data as EventMap[K]));
        }
    }
}
```

**수정 파일: `src/scenes/MainScene.ts` — shutdown 핸들러**

```typescript
// 기존 EventBus.off('BUILDING_SELECTED') 등 개별 호출 대신
this.events.on('shutdown', () => {
    EventBus.offAll('MainScene');
    // ...
});

// on() 등록 시 owner 지정
EventBus.on('BUILDING_SELECTED', () => { ... }, 'MainScene');
EventBus.on('POWER_UPDATED', () => { ... }, 'MainScene');
// 나머지 모두 동일하게 'MainScene' owner 추가
```

**영향 범위:** `UIManager`, `CableManager`, `SaveManager`, `WaveManager`, `TutorialManager`의 `EventBus.on()` 호출도 각자 owner를 지정하도록 수정한다.

**완료 기준:**
- `shutdown` 시 MainScene 리스너만 정리되고 다른 매니저 리스너는 유지된다
- `npm run build` 통과

---

### TD-9: legacy/ 빈 파일 삭제

**수정 파일:** `src/buildings/legacy/` 디렉터리 내 4개 파일 삭제

```
Conveyor.ts  (16 bytes — 빈 re-export)
FastLink.ts  (16 bytes — 빈 re-export)
Merger.ts    (16 bytes — 빈 re-export)
Splitter.ts  (16 bytes — 빈 re-export)
```

**명령어:**
```powershell
Remove-Item src\buildings\legacy\ -Recurse -Force
```

**사전 확인:** 다른 파일에서 `from './legacy/'` import가 없는지 grep으로 확인 후 삭제.

**완료 기준:** `npm run build` 통과, legacy/ 디렉터리 없음

---

## Phase 2 — 단기 (안정성 및 UX)

### TD-4: 저장 마이그레이션 없음

**문제:** `SaveManager.ts:91`에서 `version: '1.0.0'`으로 고정 저장하지만, `loadGame()`에서 버전을 확인하거나 구버전 데이터를 보완하는 코드가 없다. 신규 필드 추가 시 기존 저장 파일 로드 시 `undefined`가 된다.

**수정 파일: `src/managers/SaveManager.ts`**

```typescript
// 현재 저장 버전
const CURRENT_SAVE_VERSION = '1.1.0';

// loadGame() 내 JSON.parse 직후에 삽입
const data: SaveData = this.migrate(JSON.parse(saveString));

// migrate 메서드 추가
migrate(data: any): SaveData {
    const version = data.version || '1.0.0';
    
    // v1.0.0 → v1.1.0: defenseModelStates, tutorialStep, AP 필드 누락 보완
    if (version === '1.0.0') {
        data.version = '1.1.0';
        data.defenseModelStates = data.defenseModelStates || {};
        data.settings = data.settings || {};
        data.settings.tutorialCompleted = data.settings.tutorialCompleted ?? false;
        data.settings.tutorialStep = data.settings.tutorialStep ?? 0;
        data.settings.masterVolume = data.settings.masterVolume ?? 0.6;
        data.settings.muted = data.settings.muted ?? false;
        data.research = data.research || [];
        // 건물별 inputBuffer/outputBuffer 기본값
        if (data.buildings) {
            data.buildings = data.buildings.map((b: any) => ({
                ...b,
                inputBuffer: b.inputBuffer || [],
                outputBuffer: b.outputBuffer || [],
            }));
        }
    }
    
    return data as SaveData;
}
```

**수정 파일: `src/managers/SaveManager.ts` — saveGame()**

```typescript
const saveData: SaveData = {
    version: CURRENT_SAVE_VERSION,  // '1.0.0' → CURRENT_SAVE_VERSION
    // ... 나머지 동일
};
```

**완료 기준:**
- v1.0.0 저장 파일을 로드해도 오류 없이 로드됨
- 로드 후 `console.log(data.version)`이 '1.1.0'을 출력함
- 새로 저장 시 버전이 '1.1.0'으로 기록됨

---

### TD-5: Solar Panel RANGE 0 미표시

**문제:** Solar Panel의 `POWER.RANGE: 0`이라 자기 타일만 커버하지만 UI에 설명이 없어 플레이어가 독립 전력 전용임을 알기 어렵다.

**수정 파일 1: `src/config.ts`**

```typescript
SOLAR_PANEL: {
    // ...
    DESCRIPTION: '독립 전력 전용. 자신이 놓인 건물에만 전력을 공급합니다. 전력망과 연결되지 않습니다.',
    // ...
}
```

**수정 파일 2: `src/scenes/MainScene.ts` — `updateCursorPosition()` 내 툴팁 표시**

```typescript
// SOLAR_PANEL 툴팁에 독립 전력 경고 추가
if (existingBuilding.type === 'SOLAR_PANEL') {
    content += `\nMode: Standalone (covers self only)`;
    content += `\nDoes NOT connect to power network`;
}
```

**완료 기준:**
- Solar Panel 마우스오버 시 "Standalone (covers self only)" 문구가 툴팁에 보임
- 빌드 버튼 설명에 독립 전력임이 명시됨

---

### TD-6: AP O(n) 전체 순회 최적화

**문제:** `CableManager.ts:236-274`의 `transferWirelessData()`에서 AP마다 전체 건물 배열을 순회(`O(AP × Building)`). 건물이 많아지면 매 tick마다 비용이 커진다.

**수정 파일: `src/managers/CableManager.ts`**

```typescript
transferWirelessData(buildingManager: BuildingManager): void {
    const accessPoints: AccessPoint[] = [];
    
    // 전체 건물을 한 번만 수집
    const buildings: BaseBuilding[] = [];
    buildingManager.forEach(b => {
        buildings.push(b);
        if (b instanceof AccessPoint && b.hasPower) accessPoints.push(b);
    });
    
    if (accessPoints.length === 0) return;
    
    // AP별 범위 캐시: 사전에 범위 내 건물 목록을 계산
    for (const ap of accessPoints) {
        const rangeBonus = (this.scene as any).researchManager?.getEffectValue('AP_RANGE_BONUS', 0) ?? 0;
        const apRange = ap.range + rangeBonus;
        
        // 범위 내 건물만 필터 (전체 순회는 1회)
        const inRange = buildings.filter(b =>
            b !== ap
            && !(b instanceof AccessPoint)
            && b.hasPower
            && Math.abs(b.x - ap.x) / CONFIG.GRID_SIZE <= apRange
            && Math.abs(b.y - ap.y) / CONFIG.GRID_SIZE <= apRange
        );
        
        // 송신자(output 있음)와 수신자(accept 가능)로 분리
        const senders = inRange.filter(b => this.isDataItem(b.outputBuffer[0]));
        
        let relayed = 0;
        for (const source of senders) {
            if (relayed >= ap.bandwidth) break;
            const item = source.outputBuffer[0];
            const target = inRange.find(b =>
                b !== source && b.canAcceptItem(item)
            );
            if (!target) continue;
            source.outputBuffer.shift();
            target.acceptItem(item);
            relayed++;
            this.createPulseAnimation(`${source.x},${source.y}`, `${ap.x},${ap.y}`, item);
            this.createPulseAnimation(`${ap.x},${ap.y}`, `${target.x},${target.y}`, item);
        }
    }
}
```

**완료 기준:**
- 동작 결과가 기존과 동일함 (리팩터링만, 기능 변경 없음)
- `npm run build` 통과

---

## Phase 3 — 중기 (구조 리팩터링)

### TD-7: UIManager / MainScene 과대화

현재 상태:
- `UIManager.ts`: 932줄, HUD/연구/설정/모바일/툴팁/TrainingLab UI 전부
- `MainScene.ts`: 802줄, 입력/커서/배치/케이블/오버레이/방어모델 전부

**분리 목표 구조:**

```
src/
  scenes/
    MainScene.ts          ← 시스템 조율만 (~300줄 목표)
  controllers/
    InputController.ts    ← pointerdown/up, 키보드 핸들러 (신규)
    PlacementController.ts ← handlePointerAction(), 배치/케이블 로직 (신규)
    OverlayController.ts  ← drawPowerGridOverlay(), drawDefenseRangeOverlay() (신규)
  managers/
    UIManager.ts          ← HUD 업데이트, 로그, 버튼 관리만 (~300줄 목표)
    BuildMenuManager.ts   ← createBuildingButtons(), 탭 관리 (신규)
    ResearchUI.ts         ← renderResearchTree(), setupResearchUI() (신규)
    SettingsUI.ts         ← setupSettingsUI() (신규)
    MobileUIManager.ts    ← setupMobileUI(), updateMobileControls() (신규)
    TrainingLabUI.ts      ← setupTrainingLabUI(), renderTrainingLab() (신규)
```

**분리 순서 (점진적):**

#### Step 1: OverlayController 분리 (위험도 낮음)

```typescript
// src/controllers/OverlayController.ts
export default class OverlayController {
    constructor(private scene: MainScene) {}
    
    drawDefenseRangeOverlay(): void { /* MainScene에서 이동 */ }
    drawPowerGridOverlay(): void { /* MainScene에서 이동 */ }
}
```

```typescript
// MainScene에서
this.overlayController = new OverlayController(this);
// 기존 메서드 위임
drawDefenseRangeOverlay() { this.overlayController.drawDefenseRangeOverlay(); }
drawPowerGridOverlay() { this.overlayController.drawPowerGridOverlay(); }
```

#### Step 2: TrainingLabUI 분리 (UIManager에서)

```typescript
// src/managers/TrainingLabUI.ts
export default class TrainingLabUI {
    constructor(private scene: MainScene) {}
    setup(): void { /* setupTrainingLabUI() 이동 */ }
    open(lab: ModelTrainingLab): void { /* openTrainingLab() 이동 */ }
    render(): void { /* renderTrainingLab() 이동 */ }
}
```

#### Step 3: ResearchUI / SettingsUI 분리

#### Step 4: InputController 분리 (위험도 높음, 마지막)

```typescript
// src/controllers/InputController.ts
export default class InputController {
    constructor(private scene: MainScene) {}
    setup(): void { /* setupInput() 이동 */ }
    isPointerOverDomUI(pointer: Phaser.Input.Pointer): boolean { /* 이동 */ }
}
```

**각 Step 완료 기준:**
- `npm run build` 통과
- 분리 전후 동작 동일

**주의사항:**
- `as MainScene` 캐스팅이 많으므로, 분리된 클래스는 `MainScene`을 생성자 파라미터로 받아 타입 안전성 확보
- 한 번에 전체 리팩터링하지 않고 Step별로 PR/커밋 분리

---

### TD-8: as any 남용 축소

현재 패턴:
```typescript
// MainScene에서 다른 매니저 접근 시
const mainScene = this.scene as MainScene;
mainScene.researchManager.getEffectValue(...)
```

**수정 방향:** 공유 인터페이스 정의

**수정 파일: `src/types.ts` — 인터페이스 추가**

```typescript
// 매니저들이 scene에서 참조하는 MainScene의 인터페이스
export interface IMainScene extends Phaser.Scene {
    researchManager: ResearchManager;
    buildingManager: BuildingManager;
    cableManager: CableManager;
    powerManager: PowerManager;
    waveManager: WaveManager;
    uiManager: UIManager;
    effectsManager: EffectsManager;
    mapManager: MapManager;
    itemManager: ItemManager;
    defenseModelStates: Record<string, DefenseModelState>;
    gameSpeed: number;
    difficultyId: string;
    isMobileLayout: boolean;
    showPowerGrid: boolean;
    showDefenseRange: boolean;
    getDefenseModelState(type: string): DefenseModelState;
    trainDefenseModelType(type: string, itemType: string): boolean;
    syncDefenseModelType(type: string): void;
    setGameSpeed(speed: number): void;
}
```

**사용처 변경:**
```typescript
// 기존
const mainScene = this.scene as MainScene;

// 변경 후
const mainScene = this.scene as IMainScene;
// 또는 생성자에서 타입 지정
constructor(scene: IMainScene) { ... }
```

**우선 적용 대상:**
1. `UIManager.ts` — `this.scene as MainScene` 사용 전체 (약 20곳)
2. `SaveManager.ts` — `this.scene.` 접근
3. `TutorialManager.ts`

**완료 기준:**
- `as MainScene` 사용이 `as IMainScene`으로 대체됨
- 존재하지 않는 속성 접근 시 TypeScript 컴파일 오류로 감지 가능
- `npm run build` 통과

---

## 검증 계획

### 각 Phase 완료 후 공통 검증

```powershell
npm run build
```

### Phase 1 완료 후 기능 검증

| 항목 | 방법 |
|------|------|
| Fiber 해금 | 게임 실행 → 연구 UI에서 TECH_DISTRIBUTED_AP 해금 → 광섬유 케이블 노드 표시 확인 |
| ENERGY 생산 | ENERGY 패치 위 Miner 배치 → outputBuffer에 ENERGY 아이템 생성 확인 |
| INFERENCE_UNIT | TRAINED_MODEL + ENERGY → NeuralTrainer → INFERENCE_UNIT 생산 확인 |
| EventBus | shutdown 후 UIManager의 WAVE_STARTED 리스너가 살아있는지 확인 |

### Phase 2 완료 후 기능 검증

| 항목 | 방법 |
|------|------|
| 마이그레이션 | v1.0.0 저장 JSON을 localStorage에 수동 삽입 → Load → 오류 없이 로드 |
| Solar Panel | Solar Panel 마우스오버 → 툴팁에 "Standalone" 문구 확인 |

### Phase 3 완료 후 회귀 검증

- 모든 건물 배치 동작
- 케이블 연결/해제
- 연구 해금
- 저장/로드
- 모바일 뷰포트(390×844) 기본 동작

---

## 공수 요약

| Phase | 합계 예상 시간 |
|-------|--------------|
| Phase 1 (즉시) | ~2시간 |
| Phase 2 (단기) | ~3.5시간 |
| Phase 3 (중기) | ~5~8일 (Step 단위 진행) |

> **권장 진행 순서:** TD-1 → TD-9 → TD-2 → TD-3 → TD-4 → TD-5 → TD-6 → TD-7(Step 1~2) → TD-8 → TD-7(Step 3~4)
