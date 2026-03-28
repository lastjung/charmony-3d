# Beam Mode Review & Verification

이 문서는 `beam-audio-improvement-plan.md`와 `beam-coordinate-notes.md`를 바탕으로 작성된 전문 검토 의견 및 진척 상황 기록입니다.

---

## 1. 현재 상황 및 작업 진척 (Status & Progress)

### 1-1. [완료] 우선순위 2: 상태 분할 및 App.tsx 경량화
*   **작업 내용:** `src/hooks/useBeamSettings.ts` 커스텀 훅을 도입하여 빔 관련 10여 개의 개별 상태를 단일 `beamSettings` 객체로 통합 관리.
*   **효과:** `App.tsx`의 상태 복잡도가 대폭 낮아졌으며, 빔 설정 변경 시 유닛 단위의 가독성과 유지보수성이 향상됨.

### 1-2. [완료] 우선순위 1: Grid / Beam 기준축 통일 (좌표계 표준화)
*   **작업 내용:** `App.tsx`에서 분리되어 있던 `gridHelper`와 `BeamCollider3D`의 부모 그룹 위치를 `[0, -2.5, 0]`으로 통일.
*   **결과:** 시각적 바닥(Grid)과 물리 계산상의 바닥이 완벽하게 일치함. `REVOLUTION` 및 `ROTATION` 제어의 기하학적 정밀도 확보를 위한 토대 마련.

---

## 2. 검토 의견 및 향후 계획 (Review & Next Steps)

### 2-1. [진행 중] Phase 2: 명령형 렌더링(Imperative Rendering)으로의 전환
*   **현황:** 1차 전환 완료.
*   **적용 내용:** 
    *   `setBeams` 기반 per-beam React 렌더 제거
    *   `useRef` 기반 ray pool 도입
    *   batched `LineSegments` 렌더 도입
    *   `InstancedMesh` 기반 beam head 렌더 도입
*   **남은 과제:**
    *   고밀도 시각 품질(잔상, 페이드, 표현 방식) 보완
    *   시각 표현(페이드/두께/헤드 상태)의 품질 보완

### 2-1-b. [진행 중] Phase 4: `RAY NUMBER` 시맨틱스 정교화
*   **적용 내용:**
    *   완료된 ray 슬롯을 즉시 재사용하도록 수정
    *   재생 중에는 설정한 `RAY NUMBER`만큼 active ray를 유지하도록 변경
*   **의미:** `RAY NUMBER`는 이제 단순한 spawn proxy가 아니라, 훨씬 더 강하게 "동시 active ray 수"에 가까워짐
*   **남은 과제:**
    *   caustics와 비교한 시각적 체감 보정
    *   trail/persistence를 잃지 않으면서 simultaneous semantics를 유지하는 개선

### 2-2. [진행 중] Phase 1: `REVOLUTION` / `ROTATION` 의미 복구
*   **현황:** 1차 semantics 복구 완료.
*   **적용 내용:**
    *   `REVOLUTION`은 beam-local orbit 위의 emitter 위치를 제어
    *   `ROTATION`은 emitter 위치와 분리된 절대 발사각을 제어
    *   UI에 각도 규약 안내를 노출:
        * `0° = +Y`
        * `-90° = -Y`
        * `90° = -X`
*   **남은 과제:**
    *   각도 규약(`0°`, `90°`, `-90°`)을 UI 문구로 고정
    *   emitter orbit radius를 설정/문서 기준으로 더 명확히 정리

### 2-3. [진행 중] Phase 6: Beam Auto Mode
*   **적용 내용:** beam 주요 슬라이더에 라벨 클릭 오토 모드 도입.
*   **동작 규칙:**
    *   라벨 클릭으로 auto on/off
    *   슬라이더를 직접 움직이면 해당 auto mode는 꺼짐
*   **남은 과제:** auto motion curve를 더 음악적/직관적으로 조정

### 2-4. [진행 중] Phase 7: 오디오 보이스 풀링 및 밀도 관리
*   **적용 내용:**
    *   프레임당 최대 충돌 사운드 수 제한을 1차 도입함
    *   impact synth에 reusable voice pool을 도입하여 충돌마다 새 oscillator/filter graph를 만들지 않도록 변경
    *   악기 변경 시 pooled voice를 재생성하여 현재 instrument와 일치하도록 정리
*   **남은 과제:**
    *   1차 충돌 우선순위 규칙은 도입되었지만, 아직 measured collision energy 기반은 아님
    *   continuous synth / impact synth의 풀링 정책을 더 일관되게 정리

---

## 3. 최종 확인자 의견 (Verifier's Comment)

**현재까지의 작업 결과: 매우 만족 (Excellent)**
*   구조적인 기초 공사(상태 분리 및 좌표계 통일)가 끝났습니다.
*   명령형 렌더링 엔진 개편은 이미 시작되었고, 기본 골격이 적용되었습니다.
*   이제 남은 핵심은 semantics 정교화(`RAY NUMBER`, angle rules)와 품질 보완입니다.

---
**Verifier:** Antigravity (AI Coding Assistant)
**Date:** 2026-03-28
