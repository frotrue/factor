# AP Wireless Bus Rework Plan

> 모바일 개발 상태: 현재 모바일 개발은 일시 중단 상태입니다. 모바일 관련 구현, QA, 레이아웃 개선, 터치 조작 개선은 개발 재개 전까지 보류합니다.

> 작성일: 2026-05-15  
> 목적: 현재 AP가 범위 내 모든 건물을 서로 자동 연결해 물류 흐름이 과도하게 복잡해지는 문제를 해결한다.  
> 핵심 방향: AP를 "가상 케이블 생성기"가 아니라 "무선 버스/허브"로 재정의하고, 별도 수신 건물로 흐름을 통제한다.
> 상태: 보류. Downlink 없는 Session Relay 방식으로 방향을 전환했다. 최신 구현 계획은 `docs/AP_SESSION_RELAY_REWORK_PLAN.md`를 기준으로 한다.

---

## 1. 현재 문제

현재 `CableManager.updateAPConnections()`는 AP 범위 안에 있는 모든 건물 쌍을 순회하며 `apConnections`를 만든다.

```text
AP 범위 안 건물 A, B, C, D
-> A-B, A-C, A-D, B-C, B-D, C-D 연결 생성
```

이 방식은 다음 문제가 있다.

- 연결 수가 건물 수에 따라 급격히 증가한다.
- 플레이어가 실제 데이터 흐름을 예측하기 어렵다.
- AP가 케이블을 대체한다기보다 보이지 않는 케이블 수십 개를 자동 생성하는 장치처럼 동작한다.
- 어떤 건물이 어떤 건물로 데이터를 보내는지 UI로 설명하기 어렵다.
- 디버깅과 밸런싱이 어렵다.

AP의 의도는 "이더넷 케이블을 덜 쓰게 해주는 무선 물류"인데, 완전 자동 연결은 편의성보다 혼란을 더 크게 만든다.

---

## 2. 목표 설계

AP를 다음처럼 재정의한다.

```text
생산 건물 output
-> AP가 범위 안에서 자동 수거
-> AP 내부 버퍼
-> Downlink Node가 AP 버퍼에서 수신
-> Downlink Node 인접 건물 input으로 전달
```

즉, AP는 더 이상 범위 안의 모든 건물을 서로 직접 연결하지 않는다.

### 플레이어가 이해해야 하는 규칙

- AP 범위 안의 생산 건물은 데이터 아이템을 무선망에 올릴 수 있다.
- AP는 내부 버퍼와 처리량 제한을 가진다.
- 데이터는 아무 건물에나 내려가지 않고, `Downlink Node`를 통해서만 내려간다.
- 대량/정밀 물류는 여전히 케이블이 더 좋다.
- AP는 선을 줄이는 편의 장치지만, 대역폭과 버퍼 관리가 필요하다.

---

## 3. 추천 1차 구현 범위

1차는 최소 기능으로 시작한다.

### 추가 건물

#### AP Tower

기존 `ACCESS_POINT`를 유지하되 역할을 바꾼다.

- 범위 제공
- 내부 무선 버퍼 보유
- 범위 내 건물 output에서 데이터 아이템 자동 수거
- Downlink Node에 데이터 공급
- AP끼리 직접 연결하지 않음

#### AP Downlink Node

새 건물 타입을 추가한다.

- ID: `AP_DOWNLINK`
- 카테고리: `LOGISTICS`
- 역할: 근처 AP 버퍼에서 아이템을 받아 인접한 소비 건물에 전달
- 크기: 1x1
- 전력 소비: 낮음 또는 중간
- 기본 비용: Silicon 8~12 정도

1차에서는 `Uplink Node`는 만들지 않는다. AP가 범위 내 output을 자동 수거하도록 해서 무선의 편의성을 유지한다. 복잡도 제어는 Downlink를 통해 한다.

---

## 4. 세부 동작 규칙

### 4.1 AP 수거 규칙

AP는 일정 틱마다 범위 안 건물의 output을 스캔한다.

수거 대상:

- `RAW_DATA`
- `LABELED_DATA`
- `WEIGHT_UPDATE`
- `TRAINED_MODEL`
- `INFERENCE_UNIT`

수거 제외:

- `SILICON`
- `ENERGY`
- 물리 컨베이어용 자원
- AP 자신
- 다른 AP
- Downlink Node output

기본 수치 제안:

| 항목 | 값 |
|---|---:|
| AP 범위 | 5 tiles |
| AP 내부 버퍼 | 20 |
| 수거 대역폭 | tick당 1~2개 |
| 분배 대역폭 | tick당 1~2개 |

### 4.2 AP 버퍼 규칙

AP는 내부 버퍼를 하나 가진다.

```ts
wirelessBuffer: string[];
maxWirelessBuffer: number;
```

버퍼가 가득 차면 더 이상 수거하지 않는다.

초기 구현은 단일 FIFO 버퍼로 충분하다. 이후 필요하면 타입별 버퍼 또는 필터 모듈로 확장한다.

### 4.3 Downlink 수신 규칙

Downlink Node는 가까운 AP 또는 범위 내 AP 중 하나에서 데이터를 받는다.

추천 규칙:

1. Downlink가 자신을 커버하는 AP 목록을 찾는다.
2. AP 버퍼 앞쪽 아이템부터 확인한다.
3. Downlink에 인접한 건물 중 해당 아이템을 받을 수 있는 건물이 있으면 전달한다.
4. 전달 성공 시 AP 버퍼에서 제거한다.

인접 전달 대상은 기존 컨베이어/케이블 방식과 비슷하게 `canAcceptItem()`을 사용한다.

목적지 선택 우선순위:

1. 인접 건물 중 해당 아이템을 받을 수 있는 건물
2. 버퍼 여유가 가장 큰 건물
3. 거리가 같거나 여유가 같으면 고정 순서

1차 구현에서는 "고정 방향 우선순위"만 써도 된다.

```text
오른쪽 -> 아래 -> 왼쪽 -> 위
```

---

## 5. 케이블과 AP의 역할 구분

### Ethernet / Fiber Cable

- 명확한 1:1 연결
- 예측 가능
- 빠름
- 병목 파악 쉬움
- 배치 공간과 비용이 듦

### AP Wireless Bus

- 선을 많이 줄일 수 있음
- 구역 단위 자동 수거 가능
- Downlink 위치로 수신 지점을 통제
- 느림
- 내부 버퍼가 막히면 전체 무선망이 정체됨
- 정밀 제어는 케이블보다 약함

이 구분이 중요하다. AP가 케이블의 상위호환이 되면 안 된다.

---

## 6. 코드 영향 범위

### `src/config.ts`

추가/변경:

- `ACCESS_POINT` 설명과 역할 수정
- `AP_DOWNLINK` 건물 추가
- AP 관련 밸런스 수치 추가 가능

예상 config:

```ts
AP_DOWNLINK: {
    ID: 'AP_DOWNLINK',
    NAME: 'AP Downlink',
    COLOR: 0x38bdf8,
    DESCRIPTION: 'Receives data from nearby wireless AP buffers and feeds adjacent buildings.',
    POWER: { CONSUMPTION: 4, PRODUCTION: 0 },
    CATEGORY: 'LOGISTICS',
    COST: [{ resource: 'SILICON', amount: 10 }]
}
```

### `src/types.ts`

추가:

```ts
interface WirelessBufferState {
    wirelessBuffer: string[];
}
```

`BuildingType`에 `AP_DOWNLINK` 추가.

저장 데이터에 AP 버퍼가 들어가야 하므로 `customState` 또는 건물 클래스 상태 저장을 사용한다.

### `src/buildings/AccessPoint.ts`

기존 AP를 실제 버퍼 보유 건물로 확장한다.

필요 필드:

```ts
wirelessBuffer: string[];
maxWirelessBuffer: number;
bandwidth: number;
range: number;
```

필요 메서드:

```ts
canAcceptWirelessItem(type: string): boolean;
pushWirelessItem(type: string): boolean;
peekWirelessItem(): string | null;
popWirelessItem(): string | null;
getCustomState(): object;
```

### `src/buildings/APDownlink.ts`

새 건물 클래스 추가.

역할:

- 인접 건물 탐색
- 범위 내 AP 탐색
- AP 버퍼에서 받을 수 있는 아이템 선택
- 인접 건물로 전달

### `src/buildings/BuildingFactory.ts`

`AP_DOWNLINK` 등록.

### `src/managers/CableManager.ts`

가장 큰 변경 지점.

삭제 또는 비활성화:

- `apConnections`
- `updateAPConnections()`의 모든 건물 쌍 연결 생성
- AP 연결 렌더링
- `transferData()` 안의 AP 연결 즉시 전송 루프

대체:

- `transferWirelessData()` 또는 별도 `WirelessManager` 도입
- AP 수거와 Downlink 분배를 명확히 분리

권장: 장기적으로는 `WirelessManager`를 새로 만드는 것이 좋다.  
단기 구현에서는 `CableManager` 안에서 AP 관련 로직만 바꿔도 된다.

### `src/managers/SaveManager.ts`

AP 버퍼와 Downlink 상태 저장/로드 확인.

AP가 `getCustomState()`를 제공하면 기존 저장 구조를 그대로 활용할 수 있다.

### `src/managers/UIManager.ts`

건물 버튼에 `AP_DOWNLINK` 추가.

건물 정보 툴팁에 AP 상태 표시:

```text
Wireless Buffer: 7 / 20
Bandwidth: 2
Range: 5
```

Downlink 정보:

```text
Linked APs: 1
Output Target: Adjacent
```

---

## 7. 구현 단계

### Phase 1: 데이터 모델 준비

- `AP_DOWNLINK` config 추가
- `BuildingType` 업데이트
- `APDownlink.ts` 클래스 생성
- `BuildingFactory` 등록
- UI 버튼 표시 확인

완료 기준:

- Downlink Node를 배치할 수 있다.
- 저장/로드 후에도 Downlink Node가 유지된다.

### Phase 2: AP 버퍼화

- `AccessPoint`에 `wirelessBuffer` 추가
- `getCustomState()`로 버퍼 저장
- 정보 패널에 버퍼 수량 표시

완료 기준:

- AP가 내부 상태를 가진다.
- 저장/로드 후 AP 버퍼가 보존된다.

### Phase 3: 자동 완전 연결 제거

- `CableManager.updateAPConnections()` 비활성화 또는 제거
- `apConnections` 기반 전송 제거
- AP 가상 연결선 렌더링 제거

완료 기준:

- AP를 설치해도 범위 안 모든 건물 간 가상 링크가 생기지 않는다.
- 기존 이더넷/광케이블 동작은 유지된다.

### Phase 4: AP 자동 수거

- AP 범위 내 건물 output 스캔
- 데이터 아이템만 AP 버퍼로 이동
- AP 수거 대역폭 적용

완료 기준:

- AP 범위 안 생산 건물 output에서 데이터 아이템이 AP 버퍼로 들어간다.
- 버퍼가 가득 차면 수거가 멈춘다.

### Phase 5: Downlink 분배

- Downlink가 범위 내 AP를 찾는다.
- Downlink 인접 건물이 받을 수 있는 아이템만 전달한다.
- AP 분배 대역폭 또는 Downlink 처리량을 적용한다.

완료 기준:

- AP 버퍼의 데이터가 Downlink 근처 소비 건물로 이동한다.
- Downlink가 없으면 AP 버퍼에서 데이터가 내려가지 않는다.

### Phase 6: 밸런스 및 UX

- AP 버퍼 크기, 대역폭, 전력 소비 조정
- 정보 패널 문구 정리
- 필요하면 AP 버퍼가 막힐 때 시각 효과 추가

완료 기준:

- AP는 편하지만 케이블보다 느리고 덜 정밀하다.
- 플레이어가 AP 흐름을 정보 패널만 보고 이해할 수 있다.

---

## 8. 밸런스 초안

| 항목 | AP | Cable |
|---|---:|---:|
| 설치 편의성 | 높음 | 낮음 |
| 예측 가능성 | 중간 | 높음 |
| 처리량 | 낮음 | 중간~높음 |
| 공간 효율 | 높음 | 낮음 |
| 병목 표현 | 버퍼 혼잡 | 선/큐 혼잡 |
| 제어 방식 | Downlink 위치 | 직접 연결 |

추천 초기 수치:

| 대상 | 값 |
|---|---:|
| AP 비용 | Silicon 15 |
| Downlink 비용 | Silicon 10 |
| AP 전력 | 10 |
| Downlink 전력 | 4 |
| AP 버퍼 | 20 |
| AP 수거량 | tick당 1 |
| Downlink 분배량 | tick당 1 |
| 연구 후 AP 수거량 | tick당 +1 |
| 연구 후 AP 범위 | +2 |

---

## 9. 향후 확장

### AP Uplink Node

자동 수거가 여전히 너무 강하거나 혼란스럽다면 Uplink도 별도 건물로 분리한다.

```text
Uplink Node 인접 건물 output
-> AP 버퍼
-> Downlink Node
-> 소비 건물 input
```

이 경우 AP는 완전히 명시적인 무선망이 된다.

### AP Filter Module

AP 또는 Downlink에 아이템 필터를 둔다.

예:

- RAW_DATA only
- WEIGHT_UPDATE only
- TRAINED_MODEL only

### AP Priority Module

분배 우선순위 지정.

예:

- 연구소 우선
- 방어 타워 우선
- 저장소 우선

### AP-to-AP Relay

후반 연구로만 허용한다.

주의:

- 너무 빨리 열면 케이블의 의미가 줄어든다.
- AP-to-AP는 별도 대역폭과 높은 전력 비용이 필요하다.

---

## 10. 리스크

### AP가 너무 약해질 수 있음

Downlink가 필수라면 AP의 편의성이 줄어든다.

대응:

- AP는 자동 수거를 유지한다.
- Downlink는 배치만 하면 자동으로 받게 한다.
- 별도 페어링 UI는 1차에서 만들지 않는다.

### AP가 여전히 너무 강할 수 있음

자동 수거 + Downlink만으로도 구역 전체 물류가 쉬워질 수 있다.

대응:

- 기본 대역폭을 낮게 둔다.
- 버퍼 크기를 제한한다.
- Downlink 전력 소비를 둔다.
- 고성능 AP는 연구로 열어준다.

### 기존 저장 파일 호환

기존 저장 파일에는 `apConnections`가 저장되지 않으므로 큰 문제는 적다.  
다만 기존 AP의 의미가 바뀌므로 로드 후 물류 흐름이 달라진다.

대응:

- 릴리즈 노트 또는 게임 내 로그로 AP 재설계를 안내한다.
- 기존 AP는 유지하되 새 규칙으로 동작하게 한다.

---

## 11. 최종 권장안

1차 구현은 다음 형태가 가장 좋다.

```text
기존 AP:
    범위 내 데이터 output 자동 수거
    내부 무선 버퍼 보유

신규 AP Downlink:
    AP 버퍼에서 데이터를 받아 인접 건물에 전달

삭제:
    범위 내 모든 건물 쌍 자동 연결
```

이 구조는 수동 케이블과 자동 AP 사이의 장점을 적당히 나눈다.

- 케이블: 정확하고 빠른 직접 물류
- AP: 선 없는 구역 물류, 하지만 느리고 Downlink로 수신 지점 제한

결과적으로 AP가 케이블의 단순 상위호환이 되지 않으면서도, "케이블을 덜 쓰게 해주는 무선 물류"라는 원래 목적을 유지할 수 있다.
