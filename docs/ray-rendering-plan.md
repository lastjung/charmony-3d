# Ray Rendering Plan

## Purpose

이 문서는 beam mode에서 가장 중요한 시각 요소인 `ray`를 다시 보이게 만들기 위한 별도 작업 계획이다.

현재 문제는 beam 전체 구조보다 더 구체적이다.

- 점(head / lead point)은 보이는데 ray 선은 잘 안 보임
- `alpha` 슬라이더는 보조 조절값일 뿐, 근본 원인이 아님
- 사용자가 기대하는 핵심은 "빛 알갱이"가 아니라 "ray"

---

## Current Diagnosis

### 1. Current renderer is structurally weak for rays

현재 ray는 `BeamCollider3D.tsx`에서 아래 구조로 그린다.

- `BufferGeometry`
- `lineSegments`
- `LineBasicMaterial`

이 방식의 핵심 한계:

- 대부분 환경에서 line thickness가 사실상 1px 수준으로 보임
- `rayWidth`를 올려도 점(mesh) 쪽만 커지고 선은 거의 그대로 보일 수 있음
- 짧은 segment가 많은 beam 구조에서는 연속 curve보다 더 약하게 보임

### 2. Dots are visually overpowering the ray

현재는 다음 요소가 ray보다 눈에 먼저 들어온다.

- head instanced mesh
- lead point instanced mesh
- emitter point light / mesh

즉 시각 hierarchy가 잘못되어 있다.

원래 기대 hierarchy:

1. ray
2. source / reflection structure
3. small lead point

현재 실제 hierarchy:

1. head / lead point
2. source point
3. ray

### 3. Alpha tuning is not the root fix

`alpha`는 사용자가 슬라이더로 조절할 수 있으므로, ray가 안 보이는 문제를 `alpha` 문제로 보면 안 된다.

즉 다음 원칙을 따른다.

- alpha는 fine tuning 용도
- visibility는 renderer 구조가 책임져야 함

---

## Reference Insight

### Caustics / LGT-style reference

참고 프로젝트에서 얻은 핵심:

- ray count는 한 번에 launch config를 만들어 동시 발사됨
- 밝기 누적보다 ray 구조 유지가 중요함
- source point는 작게, ray 구조는 더 또렷하게 보이도록 정리됨

중요한 메모:

- 참고 프로젝트에서 사용자가 `LGT`라고 부르는 모드는 이름만 그렇게 유지된 것이지, 여기서 참고해야 하는 것은 "light-like look을 만드는 렌더 방식"이다.
- 따라서 이 문서에서 `LGT`는 이름 그대로의 UI 명칭이 아니라, 실제 렌더 성격을 가리키는 참조 약어로 이해한다.

하지만 현 프로젝트에서 가장 중요한 차이는 이것이다.

- reference는 2D canvas 기반
- 현재 프로젝트는 Three.js 3D 기반

따라서 “보이는 느낌”은 참고하되, 구현 방식은 Three.js에 맞는 별도 해결이 필요하다.

### Detailed Norm vs LGT notes

참고 프로젝트의 렌더러에는 크게 두 시각 경로가 있다.

#### Norm path

특징:

- ray를 직접 그린다
- ray 수가 많아질수록 alpha를 낮춘다
- bounce가 늘수록 decay를 준다
- 누적은 강하지만 구조가 무너지지 않도록 density-aware alpha를 적용한다

확인 포인트:

- `alphaFromDensity = 5 / drawRayNumber`
- `bounceDecay`
- launch config를 한 번에 생성

의미:

- "ray를 직접 보여주는 방식"이다
- 많아지면 흐려지지만, 적어도 구조는 읽히게 관리한다

#### LGT path

특징:

- 이름은 `LGT`지만, 핵심은 "밝기 누적을 과하게 쓰지 않고 structure를 먼저 남기는" 경로다
- 합성 성격은 `lighter` 과증폭보다 `source-over` 안정감에 가깝게 유지된다
- 선 자체를 과장하기보다 절제된 stroke로 깐다
- 별도 density/light field 기록이 뒤에서 받쳐준다

확인 포인트:

- light effect path에서 stroke는 절제된 알파로 유지된다
- brightness 인상은 density 쪽이 보조한다
- source point는 작게 보이지만 ray 구조는 여전히 읽힌다

의미:

- beam이 몰려도 그냥 하얗게 타지 않는다
- "빛처럼 보이되 ray 구조가 유지되는" 결과를 만든다

### What should be borrowed from LGT here

현재 프로젝트에서 LGT 참고로 가져와야 할 요소는 아래다.

1. launch는 batch로 동시에 시작할 것
2. source point는 아주 작고 분명할 것
3. ray brightness는 겹침만으로 과증폭되지 않을 것
4. ray가 시각 hierarchy의 중심일 것

가져오면 안 되는 요소도 있다.

- 2D canvas 전용 density field 구현을 그대로 복사하는 것
- 화면좌표계 전제를 Three.js world에 그대로 이식하는 것

즉 여기서 진짜 참조해야 하는 것은:

- 이름이 `LGT`라는 사실
- 그 코드 경로가 보여주는 시각 원칙

이다.

---

## Implementation Goal

최종 목표는 이렇다.

- ray 선이 beam mode의 주체로 보일 것
- head / lead point는 보조 역할만 할 것
- source point는 흰색으로 작고 분명하게 보일 것
- `RAY NUMBER`가 많아져도 ray 구조가 먼저 읽힐 것
- `alpha` 슬라이더는 visibility 구조를 무너뜨리지 않는 범위 안에서만 작동할 것

---

## Plan

### Phase R1. Separate ray visuals from dot visuals

목표:

- ray
- head
- lead point
- emitter

각 요소의 시각 우선순위를 명확히 분리한다.

작업:

- head / lead point 기본 크기와 emissive를 ray보다 약하게 설정
- emitter는 흰색 small marker로 유지
- ray 관련 색은 왼쪽 color picker 선택을 따르게 정리

성공 기준:

- 점이 아니라 ray가 먼저 보인다

### Phase R2. Replace current ray line renderer

목표:

- `LineBasicMaterial` 한계를 벗어난다

후보:

- `Line2` / `LineSegments2` / `LineMaterial`
- 또는 instanced thin quad / ribbon segment renderer

권장:

- 첫 시도는 `LineSegments2` 기반

이유:

- 현재 pooled segment 구조를 크게 버리지 않고 옮길 수 있음
- `rayWidth`를 실제 선 두께로 연결 가능

성공 기준:

- `rayWidth`를 올렸을 때 실제로 ray 선이 굵어짐
- 점 크기와 선 두께가 따로 제어됨

### Phase R3. Restore true ray-first hierarchy

목표:

- 점은 강조 포인트가 아니라 보조 정보로 후퇴

작업:

- head opacity / emissive 하향
- lead point는 아주 작은 선두 표시로만 유지
- ray material opacity / thickness를 시각 중심으로 재설계

성공 기준:

- “점만 보인다”는 피드백이 사라짐

### Phase R4. Batch lifecycle sanity

목표:

- ray lifecycle이 사용자 기대와 맞도록 정리

작업:

- play 시작 시 한 배치 동시 발사
- partial reset에서 한 번에 다시 발사
- 완료 후 자동 재생산 여부를 명확히 정책화

정책 후보:

- single-batch mode
- continuous-reseed mode

현재 우선:

- single-batch mode를 기준 동작으로 유지

성공 기준:

- “처음만 되고 그다음 이상함” 문제가 사라짐

### Phase R5. Browser QA with Jaemin

브라우저 테스트에서 꼭 확인할 항목:

- ray가 점보다 먼저 보이는지
- source point가 흰색으로 분명한지
- rotation 기본값 `270`이 아래 방향으로 보이는지
- `rayWidth` 슬라이더가 실제 ray 두께로 느껴지는지
- `RAY NUMBER`가 많아져도 ray 구조가 유지되는지

---

## Non-Goals

아래는 ray fix의 핵심 작업이 아니다.

- impact audio 세부 튜닝
- instrument 음색 개선
- Lorenz / Lissajous 구조 변경
- beam control naming 재개편

---

## Recommended Next Action

다음 실제 구현은 이것 하나다.

`BeamCollider3D`의 active / ghost ray renderer를 `LineBasicMaterial` 기반에서 두께 지원 방식으로 교체한다.

이 작업이 끝나기 전까지는:

- alpha 조절
- head 크기 조절
- brightness 튜닝

만으로는 ray 문제를 안정적으로 해결할 수 없다.
