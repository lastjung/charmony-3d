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
    color: 0x0072ff, // Apple Blue
    flatShading: true,
    transparent: true,
    opacity: 1.0
});

const wireMat = new LineMaterial({
    color: 0xffffff,
    linewidth: 3.0, // 굵고 선명한 선 (Fat Lines)
    resolution: new THREE.Vector2(w, h)
});

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

    const geo = getGeometry(type);
    
    // 2. Create new mesh
    currentMesh = new THREE.Mesh(geo, mat);
    
    // 3. Create CLEAN Edge-based Fat Line (No 'X' lines)
    const edges = new THREE.EdgesGeometry(geo);
    const lineGeo = new LineSegmentsGeometry().fromEdgesGeometry(edges);
    currentWireframe = new LineSegments2(lineGeo, wireMat);
    
    currentMesh.add(currentWireframe);
    scene.add(currentMesh);
}

// Initial setup
updateGeometry('box');

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(hemiLight);

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
    if (currentMesh) {
        currentMesh.rotation.y += 0.005;
        currentMesh.rotation.x += 0.002;
    }
    renderer.render(scene, camera);
    controls.update();
}
animate();
