export const LISSAJOUS_PRESETS = [
  { name: 'Line', fx: 1, fy: 1, fz: 1, px: 0, py: 0, pz: 0, color: '#ffffff', rain: false },
  { name: 'Circle', fx: 1, fy: 1, fz: 0, px: Math.PI / 2, py: 0, pz: 0, color: '#3b82f6', rain: false },
  { name: 'Knot', fx: 2, fy: 3, fz: 5, px: 0, py: Math.PI / 2, pz: Math.PI / 4, color: '#10b981', rain: true },
  { name: 'DNA', fx: 1, fy: 1, fz: 10, px: Math.PI / 2, py: 0, pz: 0, color: '#f43f5e', rain: true },
  { name: 'Infinity', fx: 1, fy: 2, fz: 0, px: Math.PI / 2, py: 0, pz: 0, color: '#8b5cf6', rain: false },
  { name: 'Helix', fx: 1, fy: 1, fz: 5, px: Math.PI / 2, py: 0, pz: 0, color: '#06b6d4', rain: true },
  { name: 'Clover', fx: 3, fy: 2, fz: 0, px: Math.PI / 2, py: 0, pz: 0, color: '#84cc16', rain: false },
  { name: 'Star', fx: 5, fy: 2, fz: 0, px: Math.PI / 2, py: 0, pz: 0, color: '#eab308', rain: false },
  { name: 'Butterfly', fx: 2, fy: 4, fz: 1, px: 0, py: Math.PI / 2, pz: 0, color: '#ec4899', rain: true },
  { name: 'Orbit', fx: 1, fy: 1, fz: 1, px: Math.PI / 2, py: Math.PI / 4, pz: 0, color: '#6366f1', rain: false },
  { name: 'Wave', fx: 1, fy: 5, fz: 2, px: 0, py: 0, pz: Math.PI / 2, color: '#14b8a6', rain: true },
  { name: 'Spiral', fx: 1, fy: 1, fz: 20, px: Math.PI / 2, py: 0, pz: 0, color: '#f97316', rain: true },
  { name: 'Complex', fx: 3, fy: 4, fz: 7, px: 0, py: Math.PI / 2, pz: Math.PI / 4, color: '#a855f7', rain: true },
  { name: 'Cardioid', fx: 1, fy: 1, fz: 0, px: Math.PI / 2, py: 0, pz: 0, color: '#f59e0b', mod: true, mult: 2, rain: false, cycles: 1 },
];

export const LORENZ_PRESETS = [
  { name: 'Classic', sigma: 10, rho: 28, beta: 2.667, speed: 0.01, color: '#3b82f6', rain: true },
  { name: 'Chaos', sigma: 10, rho: 100, beta: 2.667, speed: 0.005, color: '#f43f5e', rain: true },
  { name: 'Stable', sigma: 10, rho: 13, beta: 2.667, speed: 0.02, color: '#10b981', rain: false },
  { name: 'Dense', sigma: 20, rho: 50, beta: 4, speed: 0.008, color: '#8b5cf6', rain: true },
  { name: 'Intermittent', sigma: 10, rho: 166.1, beta: 2.667, speed: 0.002, color: '#f59e0b', rain: true },
  { name: 'Symmetry', sigma: 10, rho: 28, beta: 1, speed: 0.01, color: '#ec4899', rain: false },
  { name: 'Transient', sigma: 10, rho: 24, beta: 2.667, speed: 0.015, color: '#06b6d4', rain: false },
  { name: 'Hyper', sigma: 10, rho: 150, beta: 2.667, speed: 0.002, color: '#f97316', rain: true },
];
