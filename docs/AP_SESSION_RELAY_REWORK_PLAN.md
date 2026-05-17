# AP Session Relay Rework Plan

> 작성일: 2026-05-15  
> 목적: AP를 별도 Downlink 건물 없이 "통신 매개체"처럼 작동하게 만든다.  
> 핵심 방향: AP가 범위 안 모든 건물을 연결하지 않고, 매 틱 필요한 송신-수신 세션만 소수 생성해 중계한다.

---

## 구현 완료 메모 (2026-05-17)

- Storage/DataCache는 AP 자동 수거 대상에서 제외했다.
- 수신자는 `canAcceptItem(item)`을 만족하는 후보 중 입력 버퍼 여유가 큰 건물을 우선한다.
- AP 툴팁에 `Relayed this tick: N`을 표시한다.
- `npm run build` 통과.

---

## 1. 문제 재정의

기존 AP 완전 자동 연결 방식은 범위 안 모든 건물 쌍을 가상 연결로 만들기 때문에 복잡했다.

Downlink 방식은 흐름 통제는 좋아졌지만, 무선 물류라는 느낌보다 "또 하나의 배달 건물"에 가까워졌다.

AP의 더 자연스러운 역할은 다음에 가깝다.

```text
AP 범위 안에 송신 건물과 수신 건물이 있다
-> AP가 필요한 순간에만 통신 세션을 열어준다
-> 데이터가 AP를 경유해 이동한다
```

즉 AP는 케이블도, 창고도, Downlink도 아니라 **무선 통신 매개체**다.

---

## 2. 목표 동작

AP는 매 처리 사이클마다 다음을 수행한다.

1. 범위 안에서 데이터 output이 있는 송신 건물을 찾는다.
2. 그 데이터 타입을 받을 수 있는 수신 건물을 같은 범위 안에서 찾는다.
3. AP bandwidth만큼만 세션을 생성한다.
4. 세션마다 데이터 1개를 송신 건물 output에서 수신 건물 input으로 옮긴다.
5. 이동 이펙트는 `송신 건물 -> AP -> 수신 건물`로 표시한다.

중요한 제한:

- AP는 모든 건물 쌍을 영구 연결하지 않는다.
- AP는 내부 장기 버퍼를 가지지 않는다.
- AP끼리 중계하지 않는다.
- Storage/Data Cache의 저장분을 자동으로 빼가지 않는다.
- 생산 건물의 `outputBuffer`에 있는 데이터만 자동 중계한다.

---

## 3. 케이블과의 차이

### Ethernet / Fiber

- 명확한 1:1 연결
- 빠름
- 방향과 목적지가 예측 가능
- 플레이어가 직접 연결해야 함

### AP Session Relay

- 범위 안 자동 중계
- 느림
- 선을 줄여줌
- 목적지는 AP가 자동으로 고름
- 대량/정밀 전송에는 케이블보다 불리함

이 차이 때문에 AP는 케이블의 상위호환이 아니라, "편하지만 낮은 처리량의 무선 매개체"가 된다.

---

## 4. 1차 구현 규칙

### 송신자 조건

송신자는 다음 조건을 만족해야 한다.

- AP 범위 안에 있음
- 전력이 있음
- `outputBuffer[0]`가 데이터 아이템임
- AP 자신이 아님
- 다른 AP가 아님

데이터 아이템:

```text
RAW_DATA
LABELED_DATA
WEIGHT_UPDATE
TRAINED_MODEL
INFERENCE_UNIT
```

### 수신자 조건

수신자는 다음 조건을 만족해야 한다.

- 같은 AP 범위 안에 있음
- 전력이 있음
- 송신자와 다른 건물임
- AP가 아님
- 해당 아이템에 대해 `canAcceptItem(item)`이 true

### 목적지 선택

1차 구현에서는 단순 고정 순회를 사용한다.

추후 개선 후보:

- AP와 가까운 수신자 우선
- 버퍼 여유가 큰 수신자 우선
- 같은 건물 타입 우선순위
- 아이템별 목적지 우선순위

### 처리량

기본 AP bandwidth는 낮게 유지한다.

추천:

```text
기본 AP: tick당 2세션
연구 보너스: +1세션
```

세션 하나는 아이템 1개 이동이다.

---

## 5. 코드 변경 계획

### `src/buildings/AccessPoint.ts`

- 장기 `wirelessBuffer` 제거
- 상태 텍스트는 `AP` 또는 bandwidth 표시만 유지
- `range`, `bandwidth`는 유지

### `src/managers/CableManager.ts`

- `apConnections`는 더 이상 실제 연결을 만들지 않는다.
- `transferWirelessData()`를 AP session relay 방식으로 변경한다.
- AP마다 `bandwidth`만큼 송신-수신 페어를 찾아 전송한다.
- 전송 이펙트는 두 구간으로 나눈다.

```text
source -> AP
AP -> receiver
```

### `src/config.ts`

- `AP_DOWNLINK` 제거
- `ACCESS_POINT` 설명을 Session Relay 개념으로 변경

### `src/types.ts`

- `AP_DOWNLINK` 타입 제거

### `src/buildings/BuildingFactory.ts`

- `AP_DOWNLINK` 등록 제거

### `src/scenes/MainScene.ts`

- AP tooltip에서 버퍼 정보 제거
- Session Relay 설명 표시
- Downlink tooltip 제거

---

## 6. 완료 기준

- AP를 설치해도 AP Downlink 없이 데이터가 자동 중계된다.
- AP 범위 안 모든 건물 쌍 연결이 생성되지 않는다.
- AP는 매 틱 bandwidth만큼만 전송한다.
- Storage/Data Cache에 저장된 데이터는 AP가 자동으로 빼가지 않는다.
- 기존 케이블 전송은 그대로 동작한다.
- `npm run build`가 통과한다.

---

## 7. 향후 확장

### AP Filter

AP가 특정 데이터 타입만 중계하도록 필터를 둘 수 있다.

### Priority Relay

수신 목적지를 우선순위로 정할 수 있다.

예:

- Processor 우선
- Model Training Lab 우선
- Defense 우선

### AP Congestion

AP가 처리량을 초과하면 상태 이펙트나 경고를 표시한다.

### AP-to-AP Relay

후반 연구로만 허용할 수 있다.  
단, 케이블의 의미가 약해지므로 높은 전력 비용과 낮은 처리량 제한이 필요하다.
