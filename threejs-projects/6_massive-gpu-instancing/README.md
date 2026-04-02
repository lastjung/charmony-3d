# ⚡ Massive GPU Instancing | Earth Data Engine

A high-performance, immersive 3D planetary data visualization engine built with **Three.js** and optimized via **GPU Instancing**. This project demonstrates the ability to render and animate over **250,000 individual data nodes** in real-time within a single draw call.

## 🚀 Key Features

- **Massive Scalability**: Leverages `THREE.InstancedMesh` to handle up to 250,000 nodes with a smooth 60 FPS performance.
- **Dynamic Data Visualization**: Three distinct visualization modes mapping global data patterns:
    - **Data Flow**: Vector-field based animation wrapping the planet's surface.
    - **Network**: Static infrastructure node projection with refined pulsing effects.
    - **Heatmap**: Energy density representation via scale and opacity modulation.
- **Premium Apple-Style HUD**: A sophisticated Glassmorphism UI featuring detailed parameter controls and an engine brief.
- **S-Command Shortcut System**: Professional tool interaction patterns using `S+Number` (Digit 1-4) for instant mode switching.
- **Advanced Rendering**: Utilizes custom Fresnel Atmospheric Scattering shaders and high-fidelity planetary textures.

## 🛠 Tech Stack

- **Core**: Three.js (r183+), Vanilla JavaScript (ESM)
- **Rendering**: WebGL, GPU Instancing, Custom Shaders
- **Build / Dev Server**: Vite
- **UI/UX**: HTML5, CSS3 (Glassmorphism), Google Fonts (Inter, Outfit)

## ⌨️ Controls & Interaction

| Key | Action |
| :--- | :--- |
| **Digit 1** | Switch to **DATA FLOW** mode |
| **Digit 2** | Switch to **NETWORK** mode |
| **Digit 3** | Switch to **HEATMAP** mode |
| **Digit 4** | Switch to **STAR DRIFT** mode |
| **Mouse Drag** | Orbit around the planet |
| **Mouse Scroll** | Zoom In/Out |

## ⚙️ Parameters

- **Data Density**: Adjust the number of active nodes from 1k to 250k.
- **Flow Velocity**: Control the speed of the global vector field movement.
- **Atmosphere Intensity**: Fine-tune the Fresnel glow intensity.

## 📦 Directory Structure

```text
6_massive-gpu-instancing/
├── index.html           # Main UI & Frame
├── index.js             # Core Engine & GPU Logic
├── README.md            # Project Documentation
├── src/
│   ├── getFresnelMat.js # Atmospheric Scattering Shader
│   └── getStarfield.js  # Galactic Background Engine
└── textures/            # High-fidelity Planetary Assets
```

---
*Created by **Antigravity** (Powered by User-defined Specialized Skills).*
