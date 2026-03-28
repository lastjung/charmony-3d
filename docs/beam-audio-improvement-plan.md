# Beam / Audio / App Improvement Plan

## Goal

Stabilize the whole app, with `beam` mode as the highest-risk area.

The plan covers:

- beam visuals, collisions, and sound must agree in time
- beam controls must have clear meanings
- high ray counts must remain responsive
- `lissajous`, `lorenz`, and `beam` must use a consistent scene model
- shared sound selection must stay simple while mode-specific playback remains different
- React state and rendering must follow a lighter-weight architecture
- controls must stay responsive during heavy visual scenes
- app-wide coordinate, reset, and mode semantics must be consistent

## Current Problems

### 1. Beam Rendering Architecture Is Too Heavy

Current `beam` mode still depends too much on React-level updates for simulation-like work.

- many beam updates happen every frame
- beam data changes trigger React work too often
- line objects and supporting visual objects are still too expensive for large ray counts
- this makes sliders feel sticky and blocks fast auto modes

### 2. Control Semantics Are Not Finalized

The right panel labels were adapted from `caustics`, but the underlying 3D behavior is not yet aligned.

- `RAY NUMBER` should mean simultaneous launched rays, not an approximate density cap
- `ROTATION` should use a stable absolute direction convention
- `REVOLUTION` should describe emitter orbit/placement, not a mixed offset concept
- `BEAM SPREAD` should only affect point-source spread

### 3. Coordinate System Confusion

The project mixes:

- global scene coordinates
- beam-local placement offsets
- math-style axis expectations
- canvas-style intuition

This made it hard to reason about emitter position and beam direction.

### 4. Audio Timing and Density Need Guardrails

Impact audio is now closer to the right mental model, but dense beam scenes still need better control.

- collision-triggered sound can become too dense
- high ray counts may create too many simultaneous audio events
- instrument behavior across modes still needs tuning

### 5. Auto Mode Behavior Is Missing in Beam Controls

The `caustics` reference has an important interaction model:

- clicking specific labels toggles auto motion
- directly moving a slider disables that auto mode
- fast auto motion is part of the feel

That model is not yet implemented in this app.

### 6. App-Wide State Is Too Centralized in `App.tsx`

The current app keeps too much mutable behavior in one top-level component.

- `App.tsx` owns many unrelated concerns
- mode-specific state is mixed with global state
- beam settings, audio settings, and plotting controls affect the same render path
- this raises rerender cost and makes behavior harder to reason about

### 7. Scene Structure Is Not Clearly Layered

The 3D scene currently mixes:

- shared scene furniture
- mode-specific content
- debug helpers
- local transforms

That makes it easy to accidentally break one mode while adjusting another.

### 8. Control Updates Need Priority Separation

Following `react-best-practices`, urgent UI input and non-urgent scene updates should not share the same pressure path.

- dragging sliders should feel immediate
- heavy visual recalculation should be deprioritized where possible
- mode switches and resets should be predictable and isolated

### 9. Reset Semantics Are Not Fully Normalized

`reset` and `partialReset` exist, but their meaning is not yet perfectly aligned across all modes.

- beam has emitter/state-specific reset needs
- continuous modes mostly care about progress and parameters
- the same labels should map to consistent user expectations

## Improvement Strategy

### Phase 1. Lock Down Coordinate and Control Semantics

Define exact meanings for beam controls in this 3D scene.

- `REVOLUTION`: emitter position around a chosen orbit or anchor system
- `ROTATION`: absolute launch direction in math coordinates
- `BEAM SPREAD`: angular spread around the absolute launch direction
- `RAY NUMBER`: simultaneous rays alive in the system
- `RAY SPEED`: head travel speed
- `RAY WIDTH`: visual thickness / head size multiplier
- `REFLECTIONS`: maximum bounce count
- `ALPHA`: visual opacity multiplier

Deliverables:

- one agreed coordinate convention
- one agreed control-to-behavior mapping
- updated defaults that make beams visible and understandable immediately

### Phase 2. Replace Beam-Per-Component Rendering

Move `beam` rendering to a system architecture.

- remove beam-per-component rendering
- design a ray pool first:
  - stable ray ids
  - alive / dead lifecycle states
  - reuse dead rays instead of allocating new ray objects continuously
  - separate simulation storage from render storage where helpful
- move beam simulation data to refs or imperative structures
- keep only a few long-lived Three.js objects
- update geometry buffers directly inside `useFrame`

Target structure:

- one pooled simulation store for all rays
- one or a few `BufferGeometry` objects for beam lines
- one `InstancedMesh` or batched representation for beam heads
- no per-ray React component tree

Expected result:

- large ray counts become realistic
- slider interaction remains responsive
- auto mode can run quickly without choking the UI

### Phase 3. Refactor Global App State by Responsibility

Split top-level app concerns so React only rerenders what must change.

Suggested state partitions:

- global UI shell state
- shared audio/instrument state
- plotting/playback state
- `lissajous` state
- `lorenz` state
- `beam` state

Suggested implementation direction:

- extract mode-specific settings hooks or modules
- keep scene-independent UI state away from hot render loops
- reduce the amount of mode branching inside `App.tsx`

Expected result:

- smaller rerender surfaces
- simpler debugging
- safer future changes

### Phase 4. Rebuild Ray Number as True Simultaneous Launch Count

Make `RAY NUMBER` match the `caustics` mental model.

- maintain a pool of active rays
- emit or reset rays in batches as needed
- stop treating ray count as a soft spawn-rate proxy
- distinguish clearly between:
  - simultaneous active rays
  - ray lifecycle timing
  - visual persistence / trail fade

Expected result:

- `RAY NUMBER = 1000` means 1000 active launched rays, not an indirect approximation

### Phase 5. Normalize Scene Layering and Coordinates

Make scene composition explicit and mode-safe.

- document both coordinate spaces clearly:
  - world coordinates
  - beam-local coordinates
- define how emitter position, floor, wall, and shape origin are represented in each space
- document which calculations happen in local space and when they are transformed to world space
- define one shared world coordinate convention
- isolate mode-local transforms
- keep debug helpers opt-in and clearly scoped
- document emitter coordinates relative to beam-local origin

Expected result:

- fewer coordinate mistakes
- easier beam debugging
- safer scene edits across modes

### Phase 6. Add Beam Auto Modes

Implement beam auto behavior modeled after `caustics`.

- clickable labels for:
  - revolution
  - rotation
  - ray number
  - ray speed
  - beam spread
  - reflections
- local auto state per control
- direct slider movement disables that control’s auto mode
- support fast oscillation without blocking UI

Expected result:

- beam controls become playable
- motion-based exploration works without extra UI clutter

### Phase 7. Add Audio Density Management

Protect sound quality under dense beam scenes.

- frame-level rate limiting for impact sounds
- optional priority rules:
  - strongest collisions first
  - nearest-to-head or earliest collisions first
- possible voice pooling for impact synth nodes
- avoid turning dense scenes into noise

Expected result:

- collisions still sound musical at high ray counts
- beam mode remains usable as a musical system

### Phase 8. Tune Shared Instrument System

Refine the shared `instrument` model across all modes.

- `lissajous`: continuous tone behavior
- `lorenz`: continuous evolving tone behavior
- `beam`: discrete impact behavior

Specific tasks:

- retune `piano`
- finalize `xylophone`
- balance attack/decay per instrument
- make impact brightness react to collision context if useful

Expected result:

- one instrument chooser
- distinct but coherent playback behavior per mode

### Phase 9. Apply React Interaction Priorities

Use `react-best-practices` guidance across the app.

- keep urgent slider movement local and immediate
- use transitions only for non-urgent state
- narrow effect dependencies
- reduce unnecessary top-level state reads
- avoid render-path work that belongs in refs or imperative systems

Expected result:

- controls feel immediate
- mode switching is cleaner
- app remains responsive under load

### Phase 10. Normalize Reset and Playback Semantics

Unify what `Reset`, `Partial Reset`, and play/stop mean by mode.

- `Reset`: restore defaults for the current mode and clear active simulation state
- `Partial Reset`: restart playback / ray state without wiping all settings
- play/stop should not leave stale beam state or stale audio nodes behind

Expected result:

- fewer surprises
- cleaner mode transitions
- better parity between UI labels and behavior

### Phase 11. UX Cleanup

Reduce confusion in the right panel and scene.

- make beam labels consistent with actual behavior
- show emitter clearly
- decide whether beam-only axis helpers are needed
- add small formatting improvements for angle and speed readouts
- verify reset / partial reset behavior matches user expectation

## Recommended Execution Order

1. finalize beam coordinate semantics
2. write down world/local coordinate rules before more beam math changes
3. refactor beam rendering into an imperative batched system with a ray pool
4. split top-level state by responsibility
5. implement true simultaneous `RAY NUMBER`
6. normalize scene layering and coordinates in code
7. add beam auto modes
8. add impact-audio density limits
9. retune instruments
10. apply broader React interaction-priority cleanup
11. polish labels, defaults, and reset behavior

## Success Criteria

The work is done when all of the following are true:

- `beam` controls have stable, documented meanings
- `RAY NUMBER` behaves as simultaneous beam count
- sliders stay responsive during heavy beam scenes
- `beam` auto modes can run quickly without UI hitching
- impact sound follows actual head collisions
- high-density scenes remain visually and sonically usable
- shared instrument selection feels coherent across all three modes
- `App.tsx` is no longer carrying most hot-path responsibilities
- control responsiveness remains acceptable during heavy mode activity
- reset behavior is consistent across modes

## Immediate Next Step

Start with Phase 1, Phase 2, and the state split from Phase 3 together:

- lock the beam coordinate/control model
- document world/local coordinate rules explicitly
- replace per-beam React rendering with a batched imperative renderer backed by a reusable ray pool
- reduce top-level React involvement in beam hot paths

Without that change, the rest of the improvements will remain unstable or misleading.
