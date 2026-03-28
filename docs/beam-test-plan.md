# Beam Test Plan

## Scope

이 문서는 **현재 구현 기준으로 바로 브라우저에서 확인 가능한 항목만** 남긴 테스트 문서다.

다음 항목은 여기서 제외한다.

- ray renderer 근본 교체
- ray visibility 최종 검증
- `LineBasicMaterial` 한계 해결

위 내용은 별도 문서 [ray-rendering-plan.md](/Users/eric/PG/charmony-3d/docs/ray-rendering-plan.md) 에서 다룬다.

---

## Jaemin Browser Check

### 1. Lissajous / Lorenz sound

확인:

- `Play`를 누르면 소리가 바로 나는지
- beam에 비해 지나치게 작지 않은지
- `piano`, `xylophone`, `bell`을 바꿨을 때 성격 차이가 바로 들리는지

실패 조건:

- `Play`를 눌러도 무음
- 처음에만 나고 다시 재생하면 안 남
- beam에 비해 너무 작아서 존재감이 거의 없음

### 2. Mode isolation

확인:

- lissajous에서 `Play`를 눌렀을 때 beam이 같이 시작되지 않는지
- beam에서 `Play`를 눌렀을 때 lissajous / lorenz 재생 상태와 섞이지 않는지

실패 조건:

- 한 모드 재생이 다른 모드 state를 건드림

### 3. Beam controls sanity

확인:

- `Reset` 시 기본 beam 세팅으로 돌아가는지
- `Partial Reset` 시 현재 beam 세팅은 유지되고 발사만 다시 되는지
- `Rotation 270`에서 아래 방향으로 시작하는지
- 광원 표시가 `(0, 5, 0)` 부근에서 보이는지

실패 조건:

- reset / partial reset 구분이 없음
- 기본 방향이 아래로 안 보임
- 광원 위치가 명백히 어긋남

### 4. Beam audio sanity

확인:

- beam 충돌 시 소리가 나는지
- 악기를 바꾸면 충돌음 캐릭터가 같이 바뀌는지
- 고밀도에서 브라우저가 즉시 깨지지 않는지

실패 조건:

- 충돌음이 안 남
- instrument 변경이 반영되지 않음
- 짧은 조작만으로 심한 끊김 발생

---

## Notes

- 현재 가장 큰 미해결 이슈는 `ray visibility`다.
- 재민이 테스트에서는 이 항목을 “이미 알려진 문제”로 분리해서 봐야 한다.
- 즉 이번 브라우저 테스트의 목적은:
  - 나머지 업데이트가 안정적인지 확인
  - ray 문제 외에 숨은 회귀가 없는지 확인

---

## Expected Outcome

브라우저 테스트 후에는 결과를 아래 세 가지로 정리하면 된다.

1. 통과
   ray 문제를 제외하면 동작 안정

2. 부분 통과
   ray 외에 소리 / reset / mode isolation 중 1개 이상 추가 이슈 있음

3. 실패
   ray 외에 기본 재생 동작 자체가 아직 불안정함
