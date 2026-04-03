# Sort 3D

`Sort 3D`는 기존 막대 정렬 시각화와 분리된 독립 실험 프로젝트입니다. 정렬 알고리즘은 1차원 배열을 유지하고, 화면에서는 그 데이터를 `Grid`, `Cube`, `Sphere` 같은 공간 구조로 배치하는 방향을 목표로 합니다.

## 현재 상태

- `7_sort-bar`의 정렬 알고리즘 모듈을 가져왔습니다.
- 화면 구조를 `왼쪽 Sorting Info / 오른쪽 Geometry Info / 하단 Player`로 정리했습니다.
- 기본 scaffold에서 다음 항목을 바로 조절할 수 있습니다.
  - 알고리즘 선택
  - 노드 수
  - 재생 속도
  - 레이아웃 모드 (`Grid`, `Cube`, `Sphere`)
  - 셰이프 (`Rectangle`, `Sphere`)
  - 간격과 높이 증폭

## 설계 방향

- 정렬 로직은 `algorithm/` 내부의 1차원 알고리즘을 그대로 사용합니다.
- 색상은 주값이 아니라 보조 정보입니다.
- 공간 배치만 바꿔도 동일한 알고리즘을 다른 기하 구조에서 비교할 수 있도록 구성합니다.

## 다음 작업 후보

- `write` 중심 알고리즘의 시각화 보강
- `Grid / Cube / Sphere` 전용 하이라이트 규칙 분리
- 색 기준 정렬 모드 추가
- 대량 노드 대응을 위한 `InstancedMesh` 전환

## 디렉터리 구조

```text
8_sort-3d/
├── algorithm/       # 7_sort-bar에서 가져온 정렬 알고리즘
├── index.html       # Sort 3D UI 프레임
├── index.js         # 정렬 + geometry scaffold
├── sortEvents.js    # 정렬 이벤트 정규화
└── README.md
```
