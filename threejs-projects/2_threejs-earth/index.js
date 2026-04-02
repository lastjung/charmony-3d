import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

/**
 * --- COSMOS NAVIGATOR ---
 * Interactive Planetary Simulator
 */

// 1. SCENE SETUP
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 2. CORE OBJECTS
const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

const loader = new THREE.TextureLoader();
const geo = new THREE.IcosahedronGeometry(1, 12);

// Main Planet Mesh
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
const earthMesh = new THREE.Mesh(geo, material);
earthGroup.add(earthMesh);

// Auxiliary Layers (Lights, Clouds, Glow)
const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geo, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geo, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geo, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

// Saturn/Uranus Rings
const ringMesh = new THREE.Mesh(
  new THREE.RingGeometry(1.4, 2.2, 128),
  new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
);
ringMesh.rotation.x = Math.PI / 2;
ringMesh.visible = false;
earthGroup.add(ringMesh);

// Sun Flare (Corona)
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: loader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/lensflare/lensflare0.png'),
  color: 0xffaa00,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending
}));
sunHalo.scale.set(4, 4, 1);
sunHalo.visible = false;
scene.add(sunHalo);

// Background & Lighting
const stars = getStarfield({numStars: 2000});
scene.add(stars);
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

// 3. PLANET DATABASE
const BASE_URL = './textures/planets/';
const PLANETS = {
  sun: { map: BASE_URL + 'sunmap.jpg', glow: false, tilt: 7.25, isSun: true },
  mercury: { map: BASE_URL + 'mercurymap.jpg', bump: BASE_URL + 'mercurybump.jpg', glow: false, tilt: 0.03 },
  venus: { map: BASE_URL + 'venusmap.jpg', bump: BASE_URL + 'venusbump.jpg', glow: false, tilt: 177.3 },
  earth: { 
    map: "./textures/00_earthmap1k.jpg", 
    specular: "./textures/02_earthspec1k.jpg", 
    bump: "./textures/01_earthbump1k.jpg", 
    lights: "./textures/03_earthlights1k.jpg", 
    clouds: "./textures/04_earthcloudmap.jpg", 
    glow: true, 
    tilt: -23.4 
  },
  moon: { map: BASE_URL + 'moonmap1k.jpg', bump: BASE_URL + 'moonbump1k.jpg', glow: false, tilt: -6.7 },
  mars: { map: BASE_URL + 'marsmap1k.jpg', bump: BASE_URL + 'marsbump1k.jpg', glow: false, tilt: -25.2 },
  jupiter: { map: BASE_URL + 'jupitermap.jpg', glow: false, tilt: -3.1 },
  saturn: { map: BASE_URL + 'saturnmap.jpg', rings: { map: BASE_URL + 'saturnringcolor.jpg', inner: 1.4, outer: 2.1 }, glow: false, tilt: -26.7 },
  uranus: { map: BASE_URL + 'uranusmap.jpg', rings: { map: BASE_URL + 'uranusringcolour.jpg', inner: 1.3, outer: 1.7 }, glow: false, tilt: -97.8 },
  neptune: { map: BASE_URL + 'neptunemap.jpg', glow: false, tilt: -28.3 },
  pluto: { map: BASE_URL + 'plutomap1k.jpg', bump: BASE_URL + 'plutobump1k.jpg', glow: false, tilt: -122.5 }
};

let currentPlanetKey = 'earth';

// 4. TRANSITION LOGIC
function updatePlanet(name) {
  const data = PLANETS[name];
  if (!data) return;
  currentPlanetKey = name;

  // Reset Visibilities
  [sunHalo, glowMesh, lightsMesh, cloudsMesh, ringMesh].forEach(m => m.visible = false);

  // Material Reset
  material.color.setHex(0xffffff);
  material.emissive.setHex(0x000000);
  material.emissiveIntensity = 1.0;
  material.map = material.emissiveMap = material.specularMap = material.bumpMap = null;
  material.bumpScale = 0;

  // Texture Loading
  material.map = loader.load(data.map, (tex) => {
    if (data.isSun) {
      tex.wrapS = tex.wrapV = THREE.RepeatWrapping;
      material.emissiveMap = tex;
    } else {
      tex.wrapS = tex.wrapV = THREE.ClampToEdgeWrapping;
      tex.offset.set(0, 0);
    }
    material.needsUpdate = true;
  });

  if (data.specular) material.specularMap = loader.load(data.specular);
  if (data.bump) {
    material.bumpMap = loader.load(data.bump);
    material.bumpScale = 0.05;
  }

  // Visual Specialists
  if (data.isSun) {
    material.emissive.setHex(0xffaa22);
    material.emissiveIntensity = 4.0;
    sunHalo.visible = true;
  } else {
    // BLUE BAND: ONLY for Earth
    if (name === 'earth') {
      glowMesh.visible = true;
      fresnelMat.uniforms.color1.value.setHex(0x4488ff);
    }
    if (data.rings) {
      ringMesh.visible = true;
      const rGeo = new THREE.RingGeometry(data.rings.inner, data.rings.outer, 128);
      const pos = rGeo.attributes.position;
      const uvs = rGeo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const d = Math.sqrt(pos.getX(i)**2 + pos.getY(i)**2);
        uvs.setXY(i, (d - data.rings.inner) / (data.rings.outer - data.rings.inner), 0);
      }
      if (ringMesh.geometry) ringMesh.geometry.dispose();
      ringMesh.geometry = rGeo;
      ringMesh.material.map = loader.load(data.rings.map);
    }
  }

  // Earth Extras
  if (data.lights) { lightsMesh.visible = true; lightsMat.map = loader.load(data.lights); }
  if (data.clouds) {
    cloudsMesh.visible = true;
    cloudsMat.map = loader.load(data.clouds);
    cloudsMat.alphaMap = (name === 'earth') ? loader.load('./textures/05_earthcloudmaptrans.jpg') : null;
  }

  earthGroup.rotation.set(0, 0, (data.tilt || 0) * Math.PI / 180);
}

// 5. UI & CONTROLS
const settings = { earthSpeed: 1.0, cloudSpeed: 1.2, cloudOpacity: 0.8, starDrift: 1.0, intensity: 2.0, x: -2.0, y: 0.5, z: 1.5 };
const autoStates = { intensity: false, x: false, y: false, z: false };
const autoProgress = { intensity: 0, x: 0, y: 0, z: 0 };

const getEl = (id) => document.getElementById(id);
const ui = {
  planetButtons: document.querySelectorAll('.geo-btn'),
  earth: { slider: getEl('slider-earth'), val: getEl('val-earth') },
  cloud: { slider: getEl('slider-cloud'), val: getEl('val-cloud') },
  opacity: { slider: getEl('slider-opacity'), val: getEl('val-opacity') },
  stars: { slider: getEl('slider-stars'), val: getEl('val-stars') },
  intensity: { slider: getEl('slider-intensity'), val: getEl('val-intensity'), row: getEl('row-intensity') },
  x: { slider: getEl('slider-x'), val: getEl('val-x'), row: getEl('row-x') },
  y: { slider: getEl('slider-y'), val: getEl('val-y'), row: getEl('row-y') },
  z: { slider: getEl('slider-z'), val: getEl('val-z'), row: getEl('row-z') }
};

// Navigation
ui.planetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.geo-btn.active')?.classList.remove('active');
    btn.classList.add('active');
    updatePlanet(btn.dataset.planet);
  });
});

function updateUI(type, value) {
  if (ui[type].val) ui[type].val.textContent = parseFloat(value).toFixed(type === 'opacity' ? 2 : 1);
  if (ui[type].slider) ui[type].slider.value = value;
}

// Sliders
ui.earth.slider.oninput = (e) => { settings.earthSpeed = parseFloat(e.target.value); updateUI('earth', e.target.value); };
ui.cloud.slider.oninput = (e) => { settings.cloudSpeed = parseFloat(e.target.value); updateUI('cloud', e.target.value); };
ui.opacity.slider.oninput = (e) => { 
  settings.cloudOpacity = parseFloat(e.target.value); 
  cloudsMat.opacity = settings.cloudOpacity; 
  updateUI('opacity', e.target.value); 
};
ui.stars.slider.oninput = (e) => { settings.starDrift = parseFloat(e.target.value); updateUI('stars', e.target.value); };

// Solar Dynamics
['intensity', 'x', 'y', 'z'].forEach(p => {
  ui[p].slider.oninput = (e) => {
    settings[p] = parseFloat(e.target.value);
    autoStates[p] = false;
    ui[p].row.classList.remove('auto-active');
    updateUI(p, e.target.value);
    if (p === 'intensity') sunLight.intensity = settings.intensity;
    else sunLight.position[p] = settings[p];
  };
  ui[p].row.querySelector('.setting-header').onclick = () => {
    autoStates[p] = !autoStates[p];
    ui[p].row.classList.toggle('auto-active', autoStates[p]);
    ui[p].row.querySelector('.auto-indicator').textContent = autoStates[p] ? '||' : '▶';
  };
});

// 6. ANIMATION LOOP
const lerp = (a, b, t) => a + (b - a) * t;

function animate() {
  requestAnimationFrame(animate);
  const baseRot = 0.002 * settings.earthSpeed;
  
  earthMesh.rotation.y += baseRot;
  lightsMesh.rotation.y += baseRot;
  cloudsMesh.rotation.y += 0.0023 * settings.cloudSpeed;
  glowMesh.rotation.y += baseRot;
  stars.rotation.y -= 0.0002 * settings.starDrift;

  if (ringMesh.visible) ringMesh.rotation.z += baseRot * 0.5;

  // Sun Effects
  if (currentPlanetKey === 'sun') {
    const p = Date.now() * 0.002;
    sunHalo.scale.setScalar(1.25 + Math.sin(p * 1.5) * 0.08 + 5); 
    fresnelMat.uniforms.color1.value.setHSL(0.08, 1.0, 0.4 + Math.sin(p * 0.7) * 0.15);
    if (material.map) { material.map.offset.x += 0.0005; material.map.offset.y += 0.0002; }
  }

  // Auto Lighting
  const dt = 0.016;
  if (autoStates.intensity) {
    autoProgress.intensity += dt;
    sunLight.intensity = lerp(sunLight.intensity, 2.5 + Math.sin(autoProgress.intensity * 2) * 1.5, 0.1);
    updateUI('intensity', sunLight.intensity);
  }
  ['x', 'y', 'z'].forEach(p => {
    if (autoStates[p]) {
      autoProgress[p] += dt;
      const target = (p === 'y' ? Math.cos(autoProgress[p] * 1.2) * 3 : Math.sin(autoProgress[p] * 0.8) * 6);
      sunLight.position[p] = lerp(sunLight.position[p], target, 0.1);
      updateUI(p, sunLight.position[p]);
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();
updatePlanet('earth');

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});