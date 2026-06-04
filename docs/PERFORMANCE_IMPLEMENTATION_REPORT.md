# 성능 문제 해결 구현 보고서

Last updated: 2026-06-01

## 목적

건물, 케이블, AP, 적, 이펙트가 수백-수천 개까지 증가해도 게임 루프가 급격히 느려지지 않도록 현재 구조의 병목을 제거한다. 목표는 단순 FPS 완화가 아니라, 전체 런타임 구조를 `전체 순회 중심`에서 `dirty/event/index/cache 중심`으로 전환하는 것이다.

## 현재 근거

정적 분석과 제공된 Firefox Profiler HTML을 함께 확인했다. Profiler HTML은 원본 sample JSON이 아니라 저장된 Profiler 화면이어서 함수별 시간은 추출할 수 없었다. 확인 가능한 정보는 `22s` 범위, `localhost` 탭 포함, `GPU Process` 선택 상태, 빈 call tree였다. 실제 비용 순위 확정에는 원본 profiler JSON 또는 share URL이 필요하다.

코드 기준으로 확인된 핵심 병목은 다음이다.

| 영역 | 현재 구조 | 문제 |
|---|---|---|
| 프레임 루프 | `MainScene.update()`가 매 프레임 UI, 커서, 케이블 dirty 확인, 경고 갱신을 호출 | FPS가 높을수록 전체 순회/DOM 작업이 선형 증가 |
| UI | `UIManager.update()`가 매 프레임 objective/defense/resource 상태를 다시 계산 | 건물 수에 비례하는 DOM/건물 순회 반복 |
| 전력망 | `PowerManager.updatePowerGrid()`가 주기적으로 전체 rebuild | 전력 노드 연결 계산에 O(P^2) 성격 포함 |
| AP 릴레이 | AP마다 전체 건물을 filter | AP 수 x 건물 수로 증가 |
| 방어 타워 | 타워 firing 때 모든 적을 range 검사 | 타워 수 x 적 수로 증가 |
| 적 경로 | 적마다 주기적으로 A* 계산 | 적 수 증가 시 CPU spike |
| 렌더링 | 건물별 Graphics/Tween, 데이터 pulse별 GameObject/Tween 생성 | GameObject/Tween/GC 부하 증가 |
| 저장 | 자동 저장이 한 프레임에서 전체 상태를 stringify | 대형 세이브에서 순간 멈춤 |

## 구현 원칙

1. 전체 순회는 생성/삭제/상태 변경 이벤트에서만 갱신되는 index로 대체한다.
2. 매 프레임 DOM 갱신은 금지하고, 값 변경 또는 낮은 빈도 throttle로 제한한다.
3. GameObject와 Tween 생성은 풀링하거나 상한을 둔다.
4. 거리 검색은 spatial index를 사용한다.
5. 고비용 계산은 dirty flag, cache, chunked work, staggered scheduling으로 분산한다.
6. 각 단계는 테스트와 성능 계측으로 완료를 판정한다.

## 구현 범위

### 1. 계측 및 성능 기준선

수정 대상:

- `src/scenes/MainScene.ts`
- `src/managers/TickSystem.ts`
- `src/managers/UIManager.ts`
- `tests/e2e/`

구현:

- 개발 모드에서만 켜지는 `PerformanceStats`를 추가한다.
- 프레임 시간, tick 시간, 건물 수, 케이블 수, AP 수, 적 수, active tweens, active game objects, UI update 횟수, power rebuild 횟수를 기록한다.
- E2E용 대형 월드 fixture를 만든다: 100, 500, 1000 건물 배치.
- Playwright에서 10초 동안 평균 FPS, p95 frame time, long frame count를 측정한다.

완료 기준:

- 현재 성능 기준선 JSON 또는 console summary가 생성된다.
- 이후 최적화의 전/후 비교가 가능하다.

### 2. 프레임 루프와 UI 갱신 축소

수정 대상:

- `src/main.ts`
- `src/scenes/MainScene.ts`
- `src/managers/UIManager.ts`
- `src/managers/InventoryManager.ts`
- `src/managers/WaveManager.ts`
- `src/controllers/InputController.ts`

구현:

- 기본 FPS target을 `240`에서 `60` 또는 `120`으로 낮춘다. 설정 UI에서 고주사율 선택은 유지하되 기본값은 안정값으로 둔다.
- `UIManager.update()`를 매 프레임 호출하지 않는다. HUD 값 변경 이벤트 또는 250ms throttle로 제한한다.
- objective/defense summary는 건물 배치/삭제, 연구, 모델 학습, 웨이브 종료 때만 dirty 처리한다.
- `InventoryManager.getResourceCount()`의 전체 Storage scan을 캐시된 resource index로 대체한다.
- `WAVE_UPDATE`는 남은 초가 바뀔 때만 emit한다.
- `InputController.updateCursorPosition()`은 snapped tile, selected tool, validity가 바뀐 경우에만 ghost graphics와 tooltip을 다시 그린다.

완료 기준:

- 정지 화면에서 UI 관련 전체 건물 순회가 매 프레임 발생하지 않는다.
- `UIManager.update()`는 초당 4회 이하 또는 이벤트 기반 호출로 제한된다.
- 커서를 움직이지 않을 때 ghost/tooltip DOM 작업이 발생하지 않는다.

### 3. BuildingManager index 확장

수정 대상:

- `src/managers/BuildingManager.ts`
- `src/managers/InventoryManager.ts`
- `src/managers/PowerManager.ts`
- `src/managers/CableManager.ts`
- `src/managers/UIManager.ts`
- `src/managers/WaveManager.ts`

구현:

- `BuildingManager`에 다음 index를 유지한다.
  - unique buildings array
  - `type -> Set<BaseBuilding>`
  - power producers/nodes/consumers
  - AP list
  - defense tower list
  - storage list
  - spatial bucket index
- `place/remove/destroy`에서 index를 갱신한다.
- 기존 `forEach` 기반 count/filter 호출을 index 조회로 교체한다.

완료 기준:

- UI count, storage resource count, AP list, tower list 조회가 전체 건물 scan 없이 동작한다.
- 건물 추가/삭제 후 index 일관성 테스트가 통과한다.

### 4. 전력망 dirty rebuild

수정 대상:

- `src/managers/PowerManager.ts`
- `src/buildings/PowerPlant.ts`
- `src/buildings/SolarPanel.ts`
- `src/buildings/PowerNode.ts`
- `src/scenes/MainScene.ts`
- `src/controllers/OverlayController.ts`

구현:

- `PowerManager.updatePowerGrid()`를 매 full tick 호출하지 않는다.
- 건물 배치/삭제, 전력 생산 상태 변경, 연구 보너스 변경, save load 이후에만 `powerDirty = true`로 표시한다.
- dirty일 때만 network rebuild를 수행한다.
- node range overlap 탐색은 spatial bucket으로 후보를 좁혀 O(P^2)를 제거한다.
- power coverage tiles는 node key/range/size 단위로 캐시한다.
- `POWER_UPDATED` emit도 값이 바뀐 경우로 제한한다.

완료 기준:

- 안정 상태에서 power rebuild count가 0에 가깝다.
- 1000개 건물 중 전력 관련 건물 하나를 추가/삭제해도 rebuild가 한 번만 발생한다.
- power overlay는 dirty 시점에만 다시 그려진다.

### 5. AP와 케이블 전송 최적화

수정 대상:

- `src/managers/CableManager.ts`
- `src/buildings/AccessPoint.ts`
- `src/utils/apRelay.ts`
- `src/types.ts`

구현:

- AP relay는 AP index와 spatial bucket을 사용해 범위 내 후보만 조회한다.
- `buildings.filter()` 기반 AP in-range scan을 제거한다.
- cable endpoint building/center lookup을 cable 객체에 캐시하고, 건물 삭제/이동 시 invalidation한다.
- cable queue 처리에서 매 틱 `map()` 재할당을 제거하고 in-place로 처리한다.
- cable throttling dirty check를 매 프레임 전체 cable scan하지 않는다. queue 상태 변경 시 dirty 처리한다.
- pulse animation은 pool을 사용하고, frame당 생성 상한을 둔다.

완료 기준:

- AP 수가 증가해도 `transferWirelessData()`가 전체 건물 수 x AP 수로 증가하지 않는다.
- cable draw는 dirty 상태에서만 실행된다.
- pulse GameObject 수가 상한을 넘지 않는다.

### 6. 렌더링 오브젝트와 Tween 축소

수정 대상:

- `src/buildings/BaseBuilding.ts`
- `src/buildings/Conveyor.ts`
- `src/buildings/AbstractProcessor.ts`
- `src/buildings/DefenseTower.ts`
- `src/buildings/Miner.ts`
- `src/buildings/PowerPlant.ts`
- `src/buildings/PowerNode.ts`
- `src/buildings/SolarPanel.ts`
- `src/buildings/AccessPoint.ts`
- `src/managers/EffectsManager.ts`
- `src/managers/CableManager.ts`

구현:

- 건물별 무한 Tween을 중앙 `VisualUpdateSystem`으로 통합한다.
- 화면 밖 건물은 animated graphics update를 건너뛴다.
- 정적 건물 body처럼 동적 visual도 texture/sprite 재사용으로 전환 가능한 부분을 분리한다.
- 데이터 pulse, defense shot, AP wave, damage/build/remove effect는 pool 기반으로 재작성한다.
- bloom on 상태에서도 frame당 이펙트 생성 상한을 둔다.

완료 기준:

- 1000개 건물 배치 시 active tween 수가 건물 수에 선형으로 증가하지 않는다.
- 화면 밖 건물의 graphics clear/draw 호출이 발생하지 않는다.
- 대량 데이터 전송 중 GC spike가 감소한다.

### 7. 적 검색과 경로 탐색 최적화

수정 대상:

- `src/managers/WaveManager.ts`
- `src/enemies/BaseEnemy.ts`
- `src/buildings/DefenseTower.ts`
- `src/utils/gridPath.ts`

구현:

- `WaveManager`에 enemy spatial index를 추가한다.
- `getEnemiesInRange()`는 spatial bucket 후보만 검사한다.
- tower target은 range query 결과를 재사용하고, 같은 tick에서 중복 검색을 줄인다.
- 적 pathfinding은 동일 목적지/비슷한 start bucket 단위로 path cache 또는 flow field를 사용한다.
- A* 재계산은 한 프레임에 몰리지 않도록 enemy별 offset을 둔다.
- `maxVisited` 도달 또는 path 실패를 계측해 비정상 경로 spike를 추적한다.

완료 기준:

- 타워 수 x 적 수 전체 검색이 제거된다.
- 200마리 이상 적이 있어도 path recalculation spike가 분산된다.
- 기존 pathfinding 테스트와 enemy interaction 테스트가 통과한다.

### 8. 자동 저장 분산

수정 대상:

- `src/managers/SaveManager.ts`
- `src/types.ts`
- `src/utils/saveMigration.ts`

구현:

- 자동 저장 직전 한 프레임에서 전체 serialize하지 않는다.
- save snapshot 수집을 chunk 단위로 나누거나 idle callback 기반으로 분산한다.
- 플레이어 수동 저장은 기존처럼 즉시 저장하되, 저장 중 UI freeze를 계측한다.
- 대형 save payload 크기를 기록한다.

완료 기준:

- 1000개 건물 save에서 long frame이 줄어든다.
- 기존 save/load/migration 테스트가 통과한다.

### 9. GridRenderer와 overlay 유지보수

수정 대상:

- `src/managers/GridRenderer.ts`
- `src/controllers/OverlayController.ts`

구현:

- `GridRenderer`는 이미 chunk texture cache가 있으므로 1차 병목은 아니다.
- 장기적으로 카메라가 넓게 이동할 때 chunk cache가 무한 증가하지 않도록 LRU 또는 radius eviction을 추가한다.
- power/defense overlay는 표시 상태와 dirty 상태가 바뀔 때만 다시 그린다.

완료 기준:

- 장시간 카메라 이동 후 grid chunk count가 상한 안에 유지된다.
- overlay off 상태에서 overlay drawing이 발생하지 않는다.

## 구현 순서

| 단계 | 목표 | 주요 산출물 |
|---|---|---|
| P0 | 계측/기준선 | `PerformanceStats`, E2E perf fixture |
| P1 | 프레임/UI 부하 제거 | throttled UI, cached inventory, cursor dirty |
| P2 | index 기반 조회 | BuildingManager indexes, resource/type/AP/tower queries |
| P3 | 전력망 dirty rebuild | PowerManager dirty graph, spatial overlap |
| P4 | AP/cable 최적화 | AP spatial relay, cable endpoint cache, pulse pool |
| P5 | 렌더/Tween 축소 | VisualUpdateSystem, viewport culling, effect pooling |
| P6 | 적/타워/path 최적화 | enemy spatial index, tower range query, path cache/stagger |
| P7 | 저장 분산 | chunked/idle autosave |
| P8 | 회귀 검증 | Vitest, Playwright, perf report |

## 구현 진행 상황

### 2026-06-01 P1 일부 완료

수정 파일:

- `src/main.ts`
- `src/managers/UIManager.ts`
- `src/managers/WaveManager.ts`

구현 내용:

- 기본 FPS target을 `240`에서 `60`으로 낮추고, 저장된 FPS 설정은 `30..240` 범위로 clamp한다.
- `UIManager.update()`에서 매 프레임 실행되던 objective/defense 전체 건물 순회를 제거했다.
- objective/defense/research visibility 패널은 건물 배치/삭제/파괴, 연구 해금, 웨이브 상태 변경, 언어 변경 같은 상태 변경 이벤트에서 dirty 처리하고 최대 250ms 간격으로 갱신한다.
- Silicon HUD는 `InventoryManager.getResourceCount('SILICON')` 전체 Storage scan을 매 프레임 호출하지 않고 최대 250ms 간격으로만 호출하며, 값이 바뀐 경우에만 DOM을 수정한다.
- `WaveManager`의 `WAVE_UPDATE` 발행을 매 프레임에서 남은 초가 바뀐 경우로 줄였다. 튜토리얼에서 고정된 웨이브 타이머도 같은 throttling 경로를 사용한다.

검증:

- `npm test`: 27 files, 107 tests 통과.
- `npm run build`: 통과. 샌드박스 권한에서는 Vite config resolve가 상위 디렉터리 읽기 권한 문제로 실패했고, 권한 상승 후 정상 빌드됨.

남은 P1 항목:

- `InventoryManager` resource count 자체를 index/cache 기반으로 전환.
- `InputController.updateCursorPosition()`의 ghost/tooltip dirty 갱신.
- `MainScene.update()`에서 UI 호출 빈도 자체를 더 낮추거나 HUD별 이벤트 기반으로 분리.

### 2026-06-01 P1 FPS 설정 정합성 수정

수정 파일:

- `src/managers/SettingsUI.ts`

구현 내용:

- 설정 UI 초기화가 저장된 FPS 값이 없을 때 `240` FPS를 다시 적용하던 문제를 수정했다.
- `main.ts`와 동일하게 기본값을 `60` FPS로 맞추고, 설정 버튼 입력도 `30..240` 범위로 clamp한다.
- 이 변경으로 메뉴 진입 후 설정 UI setup이 성능 기본값을 되돌리는 경로를 제거했다.

검증:

- `npx playwright test tests/e2e/app-smoke.spec.ts tests/e2e/tutorial-guidance.spec.ts --project=desktop-chromium --workers=1`: 통과.

### 2026-06-01 P2/P3 일부 완료

수정 파일:

- `src/managers/BuildingManager.ts`
- `src/managers/InventoryManager.ts`
- `src/managers/UIManager.ts`
- `src/managers/WaveManager.ts`
- `src/scenes/MainScene.ts`
- `src/managers/PowerManager.ts`
- `src/managers/TickSystem.ts`
- `src/managers/SaveManager.ts`
- `src/managers/PowerManager.test.ts`

구현 내용:

- `BuildingManager`에 타입별 index를 추가했다. `getByType`, `getByTypes`, `countByTypes`, `getUniqueBuildings`, `clear` API를 제공한다.
- 건물 배치/삭제 시 타입 index와 unique cache를 함께 갱신한다.
- save load cleanup이 `buildings.clear()`를 직접 호출하지 않고 `BuildingManager.clear()`를 사용하도록 바꿔 index stale 상태를 방지했다.
- `InventoryManager`는 전역 건물 scan 대신 `getByType('STORAGE')`로 Storage만 순회한다.
- `UIManager`의 건물 count와 ModelTrainingLab 탐색은 타입 index를 사용한다.
- `WaveManager` 튜토리얼 방어 건물 확인과 Silicon 보상 저장소 탐색은 타입 index를 사용한다.
- `MainScene.syncDefenseModelType()`은 해당 방어 타입 건물만 조회한다.
- `PowerManager`에 dirty flag를 추가했다. 건물 배치/삭제/파괴/연구 해금 시 dirty 처리하고, `TickSystem`은 full tick마다 무조건 rebuild하지 않고 `updateIfDirty()`만 호출한다.
- Scene shutdown에서 `PowerManager` EventBus listener를 정리한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.

남은 P2/P3 항목:

- 전력 node overlap 계산의 O(P^2) 제거.
- 전력 소비자/생산자 전용 index로 `PowerManager` 내부 scan 추가 축소.
- AP/tower/enemy spatial index 구현.
- 실제 100/500/1000 건물 fixture에서 rebuild count와 frame time 계측.

### 2026-06-01 P4 일부 완료

수정 파일:

- `src/managers/CableManager.ts`

구현 내용:

- AP 무선 릴레이 후보를 매 tick 전체 건물 scan으로 만들지 않고 `BuildingManager.getByTypes()` 기반 cache로 만든다.
- AP 자체는 `getByType('ACCESS_POINT')`로 조회한다.
- 무선 릴레이 후보는 tile bucket spatial cache에 저장하고, 각 AP는 자신의 range 주변 bucket만 조회한다.
- 기존 `buildings.filter()` 기반 AP별 전체 후보 필터를 제거하고, range 후보 루프에서 source 조건을 바로 검사한다.
- 건물 배치/삭제/파괴 시 wireless cache를 dirty 처리한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.

남은 P4 항목:

- cable endpoint center cache.
- cable queue 처리의 추가 allocation 감소.
- pulse animation pooling 또는 frame당 생성 상한.
- AP relay manager 단위 성능/동작 테스트 추가.

### 2026-06-01 P6 일부 완료

수정 파일:

- `src/managers/WaveManager.ts`

구현 내용:

- `WaveManager`에 적 spatial bucket index를 추가했다.
- `getEnemiesInRange()`는 모든 적을 매번 검사하지 않고, tower range 주변 bucket의 적만 검사한다.
- 적 스폰/사망/이동 후 spatial index를 dirty 처리한다.
- 같은 tick에서 여러 타워가 range query를 수행하면 첫 query에서만 index를 rebuild하고 이후 query는 재사용한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.

남은 P6 항목:

- pathfinding cache/stagger.
- boss aura도 spatial 또는 boss list cache로 추가 최적화.
- tower target 정렬 allocation 감소.

### 2026-06-01 P3/P4/P7 추가 완료

수정 파일:

- `src/managers/PowerManager.ts`
- `src/managers/CableManager.ts`
- `src/managers/SaveManager.ts`

구현 내용:

- `PowerManager.collectPowerNodes()`, `assignConsumersToNetworks()`, `applyPowerState()`가 전체 건물 scan 대신 전력 관련 타입 index를 사용한다.
- `PowerManager.buildNetworks()`의 node 연결 탐색을 전체 node 비교에서 spatial bucket 후보 비교로 바꿨다. rebuild가 필요한 경우에도 node 수 증가에 따른 연결 탐색 비용을 줄인다.
- 케이블 데이터 pulse와 AP wireless wave에 active 상한을 추가했다. 대량 전송 중에도 시각 효과 GameObject/Tween 생성량이 무한히 증가하지 않는다.
- `SaveManager`에 dirty autosave gate를 추가했다. 변경이 없고 wave/item/cable queue 같은 volatile state가 없으면 autosave interval마다 전체 save JSON을 다시 만들지 않는다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.

남은 항목:

- autosave chunked/idle serialization.
- pulse object pooling.
- pathfinding cache/stagger.
- 100/500/1000 건물 성능 fixture와 실제 frame-time 비교.

### 2026-06-01 P0/P6 추가 완료

수정 파일:

- `src/managers/PerformanceStats.ts`
- `src/scenes/MainScene.ts`
- `src/types.ts`
- `src/enemies/BaseEnemy.ts`
- `tests/e2e/performance.spec.ts`

구현 내용:

- `PerformanceStats` 런타임 계측기를 추가했다.
- 최근 frame samples, avg/p95 frame time, long frame count, 건물/케이블/적/아이템 수, 주요 최적화 counter를 수집한다.
- `window.__GRADIUM_PERF__`와 `scene.performanceStats.getSummary()`로 Playwright와 수동 디버깅에서 성능 요약을 읽을 수 있다.
- 수집 counter:
  - power rebuild
  - UI tactical render
  - enemy range query
  - path cache hit/miss
  - cable pulse/AP wave skip
  - save write/autosave skip/autosave chunk
- `BaseEnemy` pathfinding에 start tile/target tile 기반 cache를 추가했다.
- 건물 배치/삭제/파괴 시 path cache를 invalidation한다.
- 적 id 기반 initial path stagger를 추가해 대량 스폰 직후 A* 계산이 한 프레임에 몰리지 않게 했다.
- Playwright 성능 fixture를 추가했다. desktop Chromium에서 100/500/1000 STORAGE 건물을 직접 배치하고 `PerformanceStats` 요약을 검증한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

참고:

- `npm test` 최초 전체 실행에서 기존 `MapManager.test.ts`의 랜덤 캠페인 좌표 기대값 테스트가 1회 실패했으나, 동일 테스트 단독 재실행과 이후 전체 재실행은 통과했다. 이번 변경과 직접 관련된 파일은 아니며 nondeterministic map expectation으로 보인다.

남은 항목:

- pulse object pooling.
- 더 엄격한 perf threshold를 fixture에 도입.

### 2026-06-01 P4/P7 마무리

수정 파일:

- `src/managers/CableManager.ts`
- `src/managers/SaveManager.ts`
- `tests/e2e/performance.spec.ts`

구현 내용:

- 케이블 pulse circle, trailing circle, trail graphics, AP wave ring에 object pool을 적용했다.
- pool은 active/visible을 끄고 보관하며, 재사용 시 위치/반경/색/alpha/depth를 초기화한다.
- pool 상한을 넘는 객체는 destroy해 장기 세션에서 pool이 무한 증가하지 않게 했다.
- 자동 저장은 interval 도달 즉시 직렬화하지 않고 다음 macrotask로 넘긴다.
- 수동 저장/로드 시 예약된 자동 저장을 취소해 stale autosave가 뒤늦게 실행되지 않게 했다.
- perf fixture에 느슨한 회귀 threshold를 추가했다. 100/500/1000 건물에서 p95 frame time이 명백한 정지 수준이면 실패한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

남은 개선 여지:

- perf threshold는 현재 환경 안정성을 우선해 느슨하다. CI 성능 데이터가 쌓이면 p95/long-frame 기준을 강화해야 한다.

### 2026-06-01 P7 autosave chunk 수집 완료

수정 파일:

- `src/managers/SaveManager.ts`
- `src/managers/PerformanceStats.ts`
- `tests/e2e/performance.spec.ts`

구현 내용:

- 자동 저장 snapshot 수집을 buildings/items/cables/enemies/resource/terrain 단위로 분리했다.
- 수동 저장은 기존처럼 즉시 저장하고, 자동 저장만 deferred chunk 경로를 사용한다.
- 각 chunk 사이에 macrotask yield를 넣어 대형 저장 수집이 한 프레임에 몰리지 않게 했다.
- `PerformanceStats`에 `autosaveChunks` counter를 추가했다.
- 성능 fixture가 1000 건물 상태에서 autosave를 public `SaveManager.update()` 경로로 발생시키고, `autosaveChunks > 0` 및 저장된 건물 수를 검증한다.

검증:

- `npm test`: 28 files / 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

### 2026-06-01 P1 커서/툴팁 dirty 갱신 완료

수정 파일:

- `src/controllers/InputController.ts`
- `src/scenes/MainScene.ts`

구현 내용:

- 커서 ghost redraw를 snapped tile, selected tool, rotation, cable state, existing building type 기반 signature로 제한했다.
- 건물 배치/삭제/파괴/연구 해금 이벤트에서 cursor cache를 invalidation한다.
- tooltip 렌더는 tile/resource/terrain/building buffer/power state signature와 250ms throttle을 사용한다.
- 같은 타일에서 매 프레임 tooltip DOM 문자열과 ghost graphics를 다시 만들지 않는다.
- Scene shutdown에서 `InputController` EventBus listener를 정리한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

### 2026-06-01 P5 tween 상한 완료

수정 파일:

- `src/buildings/BaseBuilding.ts`
- `src/buildings/Conveyor.ts`
- `src/buildings/AbstractProcessor.ts`
- `src/buildings/AccessPoint.ts`
- `src/buildings/DefenseTower.ts`
- `src/buildings/DataDownloader.ts`
- `src/buildings/GpuCluster.ts`
- `src/buildings/Miner.ts`
- `src/buildings/PowerNode.ts`
- `src/buildings/PowerPlant.ts`
- `src/buildings/SolarPanel.ts`
- `src/buildings/Unloader.ts`

구현 내용:

- `BaseBuilding.shouldUseAnimatedVisuals()`를 추가해 장식용 반복 tween 생성 상한을 제공한다.
- 건물 수가 180개 이상이면 Conveyor, DefenseTower, PowerNode, SolarPanel, AbstractProcessor 계열, AccessPoint, DataDownloader, GpuCluster, Miner, PowerPlant, Unloader는 반복 tween을 만들지 않고 정적 visual만 그린다.
- 전송/전투/생산 로직은 그대로 유지하고 장식 애니메이션만 줄인다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

남은 개선 여지:

- Core와 적 상태 시각 효과 tween은 수량이 상대적으로 제한적이므로 남겨뒀다.

### 2026-06-01 P6 적 상태 tween 상한 완료

수정 파일:

- `src/enemies/BaseEnemy.ts`

구현 내용:

- 적 상태/오라 tween 생성에 active 상한을 추가했다.
- 상한을 넘은 적은 정적 status visual만 사용한다.
- 적 사망 시 tween을 정리하고 animated slot을 반환한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

### 2026-06-01 경고 마커 순회 축소 완료

수정 파일:

- `src/managers/EffectsManager.ts`

구현 내용:

- 전력/버퍼 경고 마커 갱신이 전체 건물을 매번 순회하지 않고, 전력 소비 타입과 buffer 보유 타입 index를 사용한다.
- 기존 marker가 붙어 있는 건물은 후보에 유지해 stale marker cleanup을 보장한다.
- 테스트 mock처럼 index API가 없는 환경에서는 기존 `forEach` fallback을 사용한다.

검증:

- `npm test`: 28 files, 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.

추가 확인:

- `npx playwright test --workers=1` 전체 E2E도 실행했다.
- 성능 fixture와 대부분의 smoke는 통과했지만, 기존 broad desktop build-flow 1건과 tutorial transition 3건이 실패했다.
- 실패 내용은 STORAGE 테스트 좌표의 기존 시작 창고 overlap 기대값과 tutorial 완료 후 factory 잔존 기대값이며, 이번 성능 경로 변경 파일과 직접 연결된 실패로 보이지 않는다. 별도 기능 회귀/테스트 정합성 확인이 필요하다.

### 2026-06-01 E2E smoke 정합성 수정

수정 파일:

- `tests/e2e/app-smoke.spec.ts`
- `tests/e2e/tutorial-guidance.spec.ts`

구현 내용:

- desktop build-flow smoke에서 시작 Storage 2x2 footprint와 겹치던 Storage/Trainer/Classifier 클릭 좌표를 빈 타일로 옮겼다.
- tutorial 완료 후 캠페인 전환 검증은 Core footprint 내부 key(`-32,-32`)가 아니라 튜토리얼에서 실제로 배치한 전용 건물 좌표 집합을 확인하도록 바꿨다.

검증:

- `npx playwright test tests/e2e/app-smoke.spec.ts tests/e2e/tutorial-guidance.spec.ts --project=desktop-chromium --workers=1`: 통과.

### 2026-06-01 최종 회귀 검증

검증:

- `npm test`: 28 files / 108 tests 통과.
- `npm run build`: 통과.
- `npx playwright test tests/e2e/performance.spec.ts --project=desktop-chromium --workers=1`: 통과.
- `npx playwright test --workers=1`: 19 passed / 17 skipped 통과.

결과:

- 이전 전체 E2E 실패 4건은 app smoke 좌표와 tutorial transition 검증 조건 정합성 수정 후 해소됐다.
- 성능 fixture는 100/500/1000 건물 배치에서 `PerformanceStats` summary와 p95/long-frame guard를 통과한다.

## 테스트 계획

유닛 테스트:

- `BuildingManager` index 일관성: place/remove/destroy/multitile 건물.
- `InventoryManager` cached resource count: storage 추가/삭제/소비/보상.
- `PowerManager` dirty rebuild: 변경 없는 tick에서 rebuild 없음, 전력 변경 시 1회 rebuild.
- `CableManager` AP relay: 범위 후보 제한, queue 처리, endpoint cache invalidation.
- `WaveManager` enemy spatial query: bucket 경계, 이동 후 index 갱신.
- `gridPath` cache/stagger 변경 후 기존 경로 보장.
- `SaveManager` chunked autosave 후 payload 동일성.

E2E/성능 테스트:

- smoke: 기존 앱 시작, 배치, 웨이브, 저장/불러오기.
- perf fixture:
  - 100 건물: p95 frame time 안정.
  - 500 건물: UI/전력/케이블 부하가 선형 이하.
  - 1000 건물: 조작 가능, long frame count 제한.
- visual check: 대량 건물 후 canvas nonblank, overlay/cable/effects 표시 정상.

권장 명령:

```powershell
npm test
npm run build
npm run test:e2e -- --workers=1
```

## 완료 판정

이 작업은 다음 조건이 모두 충족되어야 완료로 본다.

1. 정지 상태에서 매 프레임 전체 건물 순회가 사라졌다.
2. 전력망은 dirty 상태가 아닐 때 rebuild되지 않는다.
3. AP relay와 tower targeting은 spatial index를 사용한다.
4. 건물별 무한 Tween 수가 건물 수에 비례해 증가하지 않는다.
5. pulse/effect 생성은 pooling 또는 상한으로 제한된다.
6. autosave가 대형 세이브에서 한 프레임을 장시간 점유하지 않는다.
7. 100/500/1000 건물 성능 fixture 결과가 전/후 비교로 남는다.
8. 기존 Vitest, build, Playwright smoke가 통과한다.
9. `PROJECT_MAP`, `ARCHITECTURE`, `FILE_ROLE_MAP`, `TEST_MAP`, `GAME_BALANCE_MAP` 중 실제 코드 변경과 관련된 문서가 갱신된다.

## 위험과 대응

| 위험 | 대응 |
|---|---|
| index 캐시 불일치 | 모든 index 변경에 단위 테스트 추가 |
| dirty flag 누락으로 UI/전력 상태 stale | 이벤트 기반 테스트와 save/load 후 강제 rebuild |
| pooling으로 이펙트가 남거나 잘못 재사용 | pool acquire/release 상태 테스트, scene shutdown cleanup |
| path cache로 적이 막힌 경로를 따라감 | building/terrain 변경 시 cache invalidation |
| FPS 기본값 하향으로 고주사율 사용자 불만 | 기본은 60/120, 설정에서 고주사율 선택 유지 |

## 결론

현재 성능 문제는 단일 hot function보다 구조적 문제다. 우선순위는 `UI/frame loop -> BuildingManager index -> PowerManager dirty rebuild -> AP/tower spatial query -> render/effect pooling -> path/save 분산`이다. 이 순서로 구현하면 체감 렉과 대형 공장 확장성 문제를 동시에 줄일 수 있다.
