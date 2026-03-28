# Beam / Audio Progress Log

## 2026-03-28

### Baseline Snapshot

Current implementation status before the main architecture refactor:

- Shared instrument selection exists across modes.
- Beam sound is triggered on head-progress collision timing, not just one delayed endpoint sound.
- Beam mode still uses per-beam React rendering and per-frame React state updates.
- Beam controls were partially renamed toward the `caustics` vocabulary, but semantics are not yet fully aligned.
- Beam is currently rendered with a local placement offset in `App.tsx`.

### Current Risks

1. Beam rendering is still too expensive for high ray counts.
2. `RAY NUMBER` does not yet behave as a true simultaneous launch count.
3. `REVOLUTION` / `ROTATION` semantics are not finalized for this 3D scene.
4. Coordinate handling mixes world expectations and beam-local expectations.
5. Auto-mode behavior from the `caustics` reference has not yet been implemented.

### Decisions Logged

- The next implementation work will follow the documented plan in:
  - [beam-audio-improvement-plan.md](/Users/eric/PG/charmony-3d/docs/beam-audio-improvement-plan.md)
- A reusable beam pool must be designed before moving to `InstancedMesh`/batched rendering.
- World and local coordinate rules must be documented before more beam math changes.

### Files Most Likely to Change Next

- [App.tsx](/Users/eric/PG/charmony-3d/src/App.tsx)
- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)
- [ControlSlider.tsx](/Users/eric/PG/charmony-3d/src/components/ControlSlider.tsx)
- [audioSynth.ts](/Users/eric/PG/charmony-3d/src/utils/audioSynth.ts)

### Next Step

Document the current beam coordinate model explicitly, then replace per-beam React rendering with a pooled imperative beam system skeleton.

### Update: Pooled Imperative Skeleton Started

Work completed:

- `BeamCollider3D` no longer renders one React component per beam.
- beam simulation now uses a reusable ray pool stored in refs
- beam lines are now rendered through one batched `LineSegments`
- beam heads are now rendered through one `InstancedMesh`
- impact audio is now frame-limited to avoid unlimited event bursts

Files changed:

- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- React rerender pressure from beam mode is much lower
- the renderer now has a structure that can scale beyond the previous per-beam component model
- the codebase now has a concrete base for true pooled beam lifecycle work

What is still incomplete:

- `RAY NUMBER` is still limited by the current pool size and respawn logic, not yet a final caustics-equivalent implementation
- per-ray fading and richer beam visual variation are simplified in the batched renderer
- `REVOLUTION` semantics are still not finalized
- auto-mode controls for beam are still pending
- coordinate normalization between world/grid/beam-local is still pending

### Update: Coordinate Mismatch Removed and Beam State Grouped

Work completed:

- the beam group and grid now use the same vertical offset in `App.tsx`
- the previous 2.5-unit mismatch between visible floor and beam placement was removed
- beam settings were extracted from scattered top-level state into:
  - [useBeamSettings.ts](/Users/eric/PG/charmony-3d/src/hooks/useBeamSettings.ts)
- beam reset and partial-reset behavior now flow through the grouped beam settings hook

Files changed:

- [App.tsx](/Users/eric/PG/charmony-3d/src/App.tsx)
- [useBeamSettings.ts](/Users/eric/PG/charmony-3d/src/hooks/useBeamSettings.ts)

What is improved already:

- `App.tsx` carries less beam-specific state noise
- beam settings are easier to reset and evolve together
- the visible floor and beam mode are no longer offset by different Y transforms

What is still incomplete:

- world/grid/beam-local semantics are still not fully normalized, only the most obvious mismatch was removed
- beam controls still need auto-mode support
- `REVOLUTION` still needs real authority over emitter placement

### Update: Revolution / Rotation Semantics Partially Restored

Work completed:

- `REVOLUTION` now moves the emitter around a beam-local orbit
- `ROTATION` now drives an absolute launch direction instead of acting as a simple offset from emitter-to-origin
- review and coordinate docs were updated to match the current code state

Files changed:

- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)
- [beam-coordinate-notes.md](/Users/eric/PG/charmony-3d/docs/beam-coordinate-notes.md)
- [beam-review.md](/Users/eric/PG/charmony-3d/docs/beam-review.md)

What is improved already:

- `REVOLUTION` is no longer a dead UI control
- emitter placement and launch direction are now conceptually separated
- the docs match the current implementation more closely

What is still incomplete:

- the final angle convention still needs to be frozen and explained in UI terms
- the emitter orbit radius is still fixed
- `RAY NUMBER` semantics still need a stronger caustics-style interpretation

### Update: Beam Auto Modes Added

Work completed:

- beam auto modes were added for:
  - revolution
  - rotation
  - spread
  - ray number
  - ray speed
  - reflections
- clicking a slider label now toggles that control’s auto mode
- direct slider movement disables that control’s auto mode
- angle semantics are now shown inline in the beam settings UI

Files changed:

- [useBeamSettings.ts](/Users/eric/PG/charmony-3d/src/hooks/useBeamSettings.ts)
- [App.tsx](/Users/eric/PG/charmony-3d/src/App.tsx)
- [beam-review.md](/Users/eric/PG/charmony-3d/docs/beam-review.md)

What is improved already:

- beam controls now behave more like the caustics reference
- rotation semantics are visible at the point of control
- the UI now supports faster exploratory motion without manual dragging only

What is still incomplete:

- auto motion curves are still first-pass approximations
- `RAY NUMBER` still needs deeper simultaneous-ray semantics refinement
- full audio voice pooling is still pending

### Update: Ray Number Semantics Strengthened

Work completed:

- completed rays are now recycled immediately while playing
- active ray slots are maintained up to the configured `RAY NUMBER`
- `RAY NUMBER` now behaves much more like a simultaneous active-ray control than a loose spawn proxy

Files changed:

- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)
- [beam-review.md](/Users/eric/PG/charmony-3d/docs/beam-review.md)

What is improved already:

- visual density now tracks the intended ray count more directly
- beam playback is closer to the caustics mental model
- high ray counts no longer spend time waiting for faded-out slots to free up

What is still incomplete:

- visual trail persistence was reduced by this semantics change
- full voice pooling is still pending
- auto curves and simultaneous-ray behavior still need perceptual tuning together

### Update: Ghost Trail Layer Restored

Work completed:

- completed rays now write their finished path into a separate ghost trail buffer
- active rays are still recycled immediately for simultaneous-ray semantics
- trail persistence now survives the immediate ray-slot reuse behavior

Files changed:

- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- beam density stays high while the scene still shows residual flow
- immediate slot reuse no longer makes the image feel too abruptly “clean”
- the renderer now separates:
  - active ray layer
  - short-lived ghost trail layer

What is still incomplete:

- ghost trails use a simple shared-material fade model rather than per-trail opacity shaping
- full audio voice pooling is still pending
- auto curves and density tuning still need perceptual polish

### Update: Impact Voice Pooling Added

Work completed:

- impact audio now uses a reusable voice pool instead of creating fresh oscillator/filter chains for every collision
- beam collision playback now steals the next available pooled voice when density spikes
- instrument changes rebuild the impact pool cleanly so pooled timbres stay aligned with the selected instrument

Files changed:

- [audioSynth.ts](/Users/eric/PG/charmony-3d/src/utils/audioSynth.ts)
- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- high-density collision playback creates much less Web Audio node churn
- bursty beam passages are less likely to hitch the main thread
- impact playback now has a stable architectural base for future velocity and voice-priority tuning

What is still incomplete:

- pooled voices still use simple oldest-voice stealing rather than a perceptual priority strategy
- continuous synth and impact synth pooling are still separate systems
- audio mix tuning across very high ray counts still needs ear-based polish

### Update: Voice Priority Tuning Added

Work completed:

- pooled impact voices now track their recent velocity and start time
- when the pool is saturated, weaker and older voices are preferred for stealing
- low-priority edge collisions can now be dropped instead of always interrupting stronger center hits

Files changed:

- [audioSynth.ts](/Users/eric/PG/charmony-3d/src/utils/audioSynth.ts)
- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- dense beam passages keep their stronger rhythmic accents more consistently
- the pool no longer behaves like a simple oldest-voice ring buffer under pressure
- collision loudness now reflects beam context a little better through center/bounce weighting

What is still incomplete:

- priority is still heuristic, not based on measured collision energy
- continuous synth and impact synth pooling are still separate systems
- audio mix tuning across very high ray counts still needs ear-based polish

### Update: Instrument-Specific Density Tuning Added

Work completed:

- impact pool size is now chosen per instrument instead of using one shared size for everything
- collision velocity shaping now uses instrument-specific floor and response curves
- long-decay instruments keep more simultaneous voices, while bright short-hit instruments preserve clearer accents under dense beam traffic

Files changed:

- [audioSynth.ts](/Users/eric/PG/charmony-3d/src/utils/audioSynth.ts)
- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- `piano` and `xylophone` should separate a bit better during dense passages
- `bell` and `glass` are less likely to choke on their own long tails
- beam audio density now reflects instrument character instead of one generic policy

What is still incomplete:

- priority is still heuristic, not based on measured collision energy
- audio mix tuning across very high ray counts still needs ear-based polish

### Update: Adaptive Density Mix Layer Added

Work completed:

- beam impact response now tracks recent audio density with a smoothed runtime signal
- dense passages raise the effective velocity floor and soften the response curve so accents survive heavy overlap more reliably
- adaptive priority scaling now rides on top of the instrument-specific tuning rather than replacing it

Files changed:

- [audioSynth.ts](/Users/eric/PG/charmony-3d/src/utils/audioSynth.ts)
- [BeamCollider3D.tsx](/Users/eric/PG/charmony-3d/src/components/BeamCollider3D.tsx)

What is improved already:

- beam audio no longer uses only static per-instrument density rules
- high `RAY NUMBER` passages should keep more audible structure when auto mode speeds up
- adaptive behavior is smoothed, so it should not pump too abruptly frame to frame

What is still incomplete:

- priority is still heuristic, not based on measured collision energy
- adaptive pool resizing is still not implemented
- audio mix tuning across very high ray counts still needs ear-based polish
