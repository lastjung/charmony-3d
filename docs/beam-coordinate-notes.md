# Beam Coordinate Notes

## Purpose

This document captures the current coordinate behavior of `beam` mode before the planned refactor.

It is a temporary source of truth for:

- world coordinates
- beam-local coordinates
- emitter placement
- shape placement
- visible debug helpers

## Current Scene Composition

### World Space

The main `Canvas` uses standard Three.js math coordinates:

- `+X`: right
- `+Y`: up
- `+Z`: toward/away from the camera depth axis

There is a world `axesHelper` at the root scene level in:

- [App.tsx](/Users/eric/PG/charmony-3d/src/App.tsx)

### Shared Scene Furniture

The grid is drawn in a translated group:

- grid group position: `[0, -2.5, 0]`

This means the visible floor/grid is intentionally below the world origin.

### Beam Placement

`BeamCollider3D` is currently rendered inside a translated group:

- beam group position in `App.tsx`: `[0, -2.5, 0]`

So beam-local coordinates are offset from world coordinates by the same transform as the visible grid.

## Current Beam-Local Model

Inside `BeamCollider3D`:

- shapes are defined around local origin
- emitter orbit currently uses a local radius of `6`
- `REVOLUTION` now moves the emitter around that local orbit
- `ROTATION` now controls an absolute launch direction independent of emitter position
- collisions are solved in beam-local coordinates
- beam head positions and line paths are also beam-local

This means:

- beam math currently happens in local space
- world placement is applied outside the component through the parent group transform

## Current Ambiguities

These are not final and must be normalized:

1. The floor/grid reference is translated differently from the beam group.
2. The emitter orbit radius is currently fixed instead of derived from a documented control model.
3. The visible “ground” and the true math origin are still not the same visual reference.
4. `ROTATION` is now absolute, but its final documented convention still needs to be frozen in the UI/help text.

## Required Refactor Direction

Before deeper beam-math changes, the refactor should define:

1. whether beam-local origin should equal shape origin
2. whether the beam group offset should remain or be absorbed into shape/emitter definitions
3. how emitter world position is derived from local beam coordinates
4. whether the visible floor should be aligned with beam-local zero or only with world zero

## Immediate Working Rule

Until the pooled renderer refactor lands:

- treat `BeamCollider3D` math as local-space math
- treat the parent `group position={[0, -2.5, 0]}` as the beam-to-world transform
- treat `REVOLUTION` as emitter orbit in beam-local space
- treat `ROTATION` as absolute launch direction in beam-local space
