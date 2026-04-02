import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { LineSegments2 } from "jsm/lines/LineSegments2.js";
import { LineMaterial } from "jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "jsm/lines/LineSegmentsGeometry.js";

const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 1);
document.body.appendChild(renderer.domElement);

const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 10;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2.5;
const scene = new THREE.Scene();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;

// Global objects to manage geometry
let currentMesh;
let currentWireframe;
const mat = new THREE.MeshStandardMaterial({
    flatShading: true,
    transparent: true,
    opacity: 1.0,
    vertexColors: true // Enable vertex multi-color
});

const wireMat = new LineMaterial({
    color: 0xffffff,
    linewidth: 3.0, // 굵고 선명한 선 (Fat Lines)
    resolution: new THREE.Vector2(w, h),
    vertexColors: true // Support per-vertex color
});

// Color Scheme State
let targetMode = 'composite'; // surface, edges, composite
let currentTheme = 'rainbow';
const themes = {
    rainbow: [0, 60, 120, 180, 240, 300, 360],
    cosmic: [190, 220, 260, 290],
    twilight: [50, 30, 310, 260, 250],
    aurora: [150, 180, 280, 320],
    cyan: [170, 190, 210, 230],
    sunset: [10, 30, 50, 10],
    lime: [75, 110, 160, 200, 100],
    amethyst: [260, 280, 310, 270]
};

// Premium Interpolation (Core Logic)
function interpolate(t, stops) {
    if (!stops || stops.length === 0) return 0;
    const f = t * (stops.length - 1);
    const low = Math.floor(f);
    let high = Math.min(low + 1, stops.length - 1);
    const frac = f - low;
    
    let h1 = stops[low];
    let h2 = stops[high];
    
    // 360 degree wrap correction
    if (h2 > h1 + 180) h1 += 360;
    if (h1 > h2 + 180) h2 += 360;
    
    return (h1 + (h2 - h1) * frac) % 360;
}

function updateVertexColors(mesh, line, themeName) {
    const stops = themes[themeName];
    if (!stops) return;

    // 1. Mesh Vertex Colors (Spatial Gradient Distribution)
    const geometry = mesh.geometry;
    const pos = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    // To make a smooth gradient, we'll normalize the Y coordinate.
    // Most standard geometries in this project are roughly between -1 and 1.
    const normalizeY = (y) => (y + 1) / 2;

    for (let i = 0; i < pos.count; i += 3) {
        // Use the average Y of the three vertices for a consistent face color
        const yAvg = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
        const t = THREE.MathUtils.clamp(normalizeY(yAvg), 0, 1);
        
        const hue = interpolate(t, stops);
        
        if (targetMode === 'surface' || targetMode === 'composite') {
            color.setHSL(hue / 360, 0.8, 0.5);
        } else {
            // Darker or subtle color when not active
            color.setHex(0x111111); 
        }

        for (let j = 0; j < 3; j++) {
            colors.push(color.r, color.g, color.b);
        }
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // 2. Line Vertex Colors (Spatial Gradient Distribution)
    const lineGeo = line.geometry;
    const linePos = lineGeo.attributes.instanceStart;
    const lineColors = [];

    if (linePos) {
        for (let i = 0; i < linePos.count; i++) {
            // Use the Y coordinate of the segment's start point
            const y = linePos.getY(i);
            const t = THREE.MathUtils.clamp(normalizeY(y), 0, 1);
            
            const hue = interpolate(t, stops);
            
            // For composite mode, slightly offset the line color for contrast if needed
            const lineHue = (targetMode === 'composite') ? hue : hue;
            const saturation = 0.9;
            const luminance = (targetMode === 'edges') ? 0.6 : 0.7;
            
            if (targetMode === 'edges' || targetMode === 'composite') {
                color.setHSL(lineHue / 360, saturation, luminance);
            } else {
                color.setHex(0x444444); // Subtle lines when not in focus
            }
            lineColors.push(color.r, color.g, color.b);
        }
        lineGeo.setAttribute('instanceColorStart', new THREE.Float32BufferAttribute(lineColors, 3));
        lineGeo.setAttribute('instanceColorEnd', new THREE.Float32BufferAttribute(lineColors, 3));
    }
}

function applyTheme(themeName) {
    currentTheme = themeName;
    if (currentMesh && currentWireframe) {
        updateVertexColors(currentMesh, currentWireframe, themeName);
    }
}

function getGeometry(type) {
    switch (type) {
        case 'box': return new THREE.BoxGeometry(1, 1, 1);
        case 'sphere': return new THREE.SphereGeometry(0.8, 32, 32);
        case 'capsule': return new THREE.CapsuleGeometry(0.5, 0.8, 10, 20);
        case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        case 'cone': return new THREE.ConeGeometry(0.5, 1, 32);
        case 'icosahedron': return new THREE.IcosahedronGeometry(1.0, 2);
        case 'dodecahedron': return new THREE.DodecahedronGeometry(0.8);
        case 'octahedron': return new THREE.OctahedronGeometry(1);
        case 'tetrahedron': return new THREE.TetrahedronGeometry(1);
        case 'torus': return new THREE.TorusGeometry(0.6, 0.2, 16, 100);
        case 'knot': return new THREE.TorusKnotGeometry(0.5, 0.2, 100, 16);
        case 'plane': return new THREE.PlaneGeometry(1, 1);
        case 'circle': return new THREE.CircleGeometry(0.8, 32);
        case 'ring': return new THREE.RingGeometry(0.4, 0.8, 32);
        default:
            return new THREE.BoxGeometry(1, 1, 1);
    }
}

function updateGeometry(type) {
    // Clean up
    if (currentMesh) {
        scene.remove(currentMesh);
        if (currentMesh.geometry) currentMesh.geometry.dispose();
    }
    if (currentWireframe) {
        if (currentWireframe.geometry) currentWireframe.geometry.dispose();
    }

    let geo = getGeometry(type);
    
    // IMPORTANT: Convert to Non-Indexed to allow individual face colors (Flat Look)
    geo = geo.toNonIndexed();
    
    // 2. Create new mesh
    currentMesh = new THREE.Mesh(geo, mat);
    
    // 3. Create CLEAN Edge-based Fat Line
    const edges = new THREE.EdgesGeometry(geo);
    const lineGeo = new LineSegmentsGeometry().fromEdgesGeometry(edges);
    currentWireframe = new LineSegments2(lineGeo, wireMat);
    
    currentMesh.add(currentWireframe);
    scene.add(currentMesh);

    // PERSISTENCE: Re-apply current theme to new geometry
    applyTheme(currentTheme);
}

// Initial setup
updateGeometry('box');

// --- Lighting System ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5.0, 10.0, 7.5);
scene.add(dirLight);

// Lighting UI Elements
const sliders = {
    ambient: document.getElementById('slider-ambient'),
    direct: document.getElementById('slider-direct'),
    x: document.getElementById('slider-x'),
    y: document.getElementById('slider-y'),
    z: document.getElementById('slider-z')
};

const labels = {
    ambient: document.getElementById('val-ambient'),
    direct: document.getElementById('val-direct'),
    x: document.getElementById('val-x'),
    y: document.getElementById('val-y'),
    z: document.getElementById('val-z')
};

const rows = {
    ambient: document.getElementById('row-ambient'),
    direct: document.getElementById('row-direct'),
    x: document.getElementById('row-x'),
    y: document.getElementById('row-y'),
    z: document.getElementById('row-z')
};

// Auto Mode States
const autoStates = {
    ambient: false,
    direct: false,
    x: false,
    y: false,
    z: false
};

function updateLightUI(type, value) {
    if (labels[type]) labels[type].textContent = parseFloat(value).toFixed(1);
    if (sliders[type]) sliders[type].value = value;
}

// Event Listeners for Sliders
sliders.ambient.addEventListener('input', (e) => {
    hemiLight.intensity = e.target.value;
    updateLightUI('ambient', e.target.value);
    autoStates.ambient = false; // Manual override
    rows.ambient.classList.remove('auto-active');
});

sliders.direct.addEventListener('input', (e) => {
    dirLight.intensity = e.target.value;
    updateLightUI('direct', e.target.value);
    autoStates.direct = false;
    rows.direct.classList.remove('auto-active');
});

sliders.x.addEventListener('input', (e) => {
    dirLight.position.x = e.target.value;
    updateLightUI('x', e.target.value);
    autoStates.x = false;
    rows.x.classList.remove('auto-active');
});

sliders.y.addEventListener('input', (e) => {
    dirLight.position.y = e.target.value;
    updateLightUI('y', e.target.value);
    autoStates.y = false;
    rows.y.classList.remove('auto-active');
});

sliders.z.addEventListener('input', (e) => {
    dirLight.position.z = e.target.value;
    updateLightUI('z', e.target.value);
    autoStates.z = false;
    rows.z.classList.remove('auto-active');
});

// Auto Progress (for smooth start)
const autoProgress = {
    ambient: 0,
    direct: 0,
    x: 0,
    y: 0,
    z: 0
};

// --- Robust Shortcut System (S + Digit) ---
const activeKeys = {};
function toggleAuto(type) {
    autoStates[type] = !autoStates[type];
    
    if (autoStates[type]) {
        rows[type].classList.add('auto-active');
        rows[type].querySelector('.auto-indicator').textContent = '||';
        
        // Sync starting phase to avoid jumps
        // For simple waves, we just reset the local progress to a "neutral" point
        // Or we can calculate complex inverse sin, but simple reset works better here
        autoProgress[type] = 0; 
    } else {
        rows[type].classList.remove('auto-active');
        rows[type].querySelector('.auto-indicator').textContent = '▶';
    }
}

// Add Click Listeners for Labels
Object.keys(rows).forEach(type => {
    const header = rows[type].querySelector('.setting-header');
    header.addEventListener('click', () => toggleAuto(type));
});

window.addEventListener('keydown', (e) => {
    activeKeys[e.code] = true;
    if (activeKeys['KeyS']) {
        if (e.code.startsWith('Digit')) {
            const num = e.code.replace('Digit', '');
            if (num >= '1' && num <= '5') {
                const types = ['ambient', 'direct', 'x', 'y', 'z'];
                toggleAuto(types[parseInt(num) - 1]);
                e.preventDefault(); 
            }
        }
    }
});

window.addEventListener('keyup', (e) => {
    delete activeKeys[e.code];
});

// Premium Color Logic Listeners
document.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.target-btn.active').classList.remove('active');
        btn.classList.add('active');
        targetMode = btn.dataset.mode;
    });
});

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const activeTheme = document.querySelector('.color-btn.active');
        if (activeTheme) activeTheme.classList.remove('active');
        btn.classList.add('active');
        applyTheme(btn.dataset.theme);
    });
});

// UI Multi-selection Logic
document.querySelectorAll('.geo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.geo-btn.active').classList.remove('active');
        btn.classList.add('active');
        updateGeometry(btn.dataset.type);
    });
});

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    wireMat.resolution.set(w, h);
});

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = 0.016; // Standard 60fps frame delta

    // Helper for smooth transitions
    const lerp = (a, b, t) => a + (b - a) * t;

    // Apply Auto Modes with Smooth Drifting
    if (autoStates.ambient) {
        autoProgress.ambient += deltaTime;
        const target = 2.5 + Math.sin(autoProgress.ambient * 1.5) * 1.5;
        hemiLight.intensity = lerp(hemiLight.intensity, target, 0.1); // Smooth drift to target
        updateLightUI('ambient', hemiLight.intensity);
    }
    if (autoStates.direct) {
        autoProgress.direct += deltaTime;
        const target = 2.5 + Math.cos(autoProgress.direct * 2.0) * 1.5;
        dirLight.intensity = lerp(dirLight.intensity, target, 0.1);
        updateLightUI('direct', dirLight.intensity);
    }
    if (autoStates.x) {
        autoProgress.x += deltaTime;
        const target = Math.sin(autoProgress.x * 1.0) * 8;
        dirLight.position.x = lerp(dirLight.position.x, target, 0.1);
        updateLightUI('x', dirLight.position.x);
    }
    if (autoStates.y) {
        autoProgress.y += deltaTime;
        const target = 10 + Math.sin(autoProgress.y * 1.2) * 5;
        dirLight.position.y = lerp(dirLight.position.y, target, 0.1);
        updateLightUI('y', dirLight.position.y);
    }
    if (autoStates.z) {
        autoProgress.z += deltaTime;
        const target = Math.cos(autoProgress.z * 1.5) * 8;
        dirLight.position.z = lerp(dirLight.position.z, target, 0.1);
        updateLightUI('z', dirLight.position.z);
    }

    if (currentMesh) {
        currentMesh.rotation.y += 0.005;
        currentMesh.rotation.x += 0.002;
    }
    renderer.render(scene, camera);
    controls.update();
}
animate();
