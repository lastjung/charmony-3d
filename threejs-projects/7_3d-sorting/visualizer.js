import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const BAR_COUNT = 50;

// The data array representing the sorting state

// These will be dynamically calculated
let BAR_WIDTH = 1;

// Map from value to fixed hue (based on sorted order)
let valueToHue = {};
let BAR_SPACING = 0.2;
let MAX_HEIGHT = 10;

// Fill ratios relative to viewport
const WIDTH_FILL_RATIO = 0.9;
const HEIGHT_FILL_RATIO = 0.8;

export let dataArray = [];
let scene, camera, renderer, controls, barsGroup;

// Indicator dots group
let indicatorGroup = null;

export function initVisualizer(canvas) {
  // WebGL support check
  // Inline WebGL support checks
  function showWebGLError(canvas, message) {
    if (!canvas || !canvas.parentNode) return;
    // Prevent duplicate error messages
    if (canvas.parentNode.querySelector('.webgl-error-message')) return;
    const errorMsg = document.createElement('div');
    errorMsg.className = 'webgl-error-message';
    errorMsg.style.position = 'absolute';
    errorMsg.style.top = '0';
    errorMsg.style.left = '0';
    errorMsg.style.width = '100%';
    errorMsg.style.height = '100%';
    errorMsg.style.background = '#202020';
    errorMsg.style.color = '#fff';
    errorMsg.style.display = 'flex';
    errorMsg.style.alignItems = 'center';
    errorMsg.style.justifyContent = 'center';
    errorMsg.style.fontSize = '1.5em';
    errorMsg.style.zIndex = '1000';
    errorMsg.innerText = message;
    canvas.parentNode.appendChild(errorMsg);
  }

  // Removed redundant pre-check for WebGL2/WebGL1 support.

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Camera setup
  const fov = 45;
  const aspect = window.innerWidth / window.innerHeight;
  const near = 0.1;
  const far = 1000;
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(0, 20, 10);
  scene.add(directionalLight);

  // Renderer
  // Try to create renderer (WebGL2 only, as Three.js r163+ does not support WebGL1)
  let rendererCreationError = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    rendererCreationError = e;
  }
  if (!renderer) {
    let extraMsg = '';
    if (rendererCreationError && typeof rendererCreationError.message === 'string' && rendererCreationError.message.length > 0) {
      extraMsg = '\n\nDetails: ' + rendererCreationError.message;
    }
    showWebGLError(
      canvas,
      'WebGL context could not be created.\n\nPlease check your browser and graphics settings.\n\nIf the problem persists, try updating your browser or using a different one that supports WebGL2.' + extraMsg
    );
    return false;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Bars group
  barsGroup = new THREE.Group();
  scene.add(barsGroup);

  // Initialize the data array linearly
  dataArray = [];
  valueToHue = {};
  for (let i = 1; i <= BAR_COUNT; i++) {
    dataArray.push(i);
    valueToHue[i] = (i - 1) / BAR_COUNT;  // fixed hue for each value
  }

  // Shuffle the array using Fisher-Yates
  for (let i = dataArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataArray[i], dataArray[j]] = [dataArray[j], dataArray[i]];
  }

  updateScaleAndBars();

  positionCamera();

  window.addEventListener('resize', onWindowResize);

  animate();
  return true;
}

export function highlightComparedIndices(index1, index2) {
  if (!indicatorGroup) {
    indicatorGroup = new THREE.Group();
    scene.add(indicatorGroup);
  }

  // Clear previous indicators
  indicatorGroup.clear();

  const indices = [index1, index2];
  const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_SPACING);

  indices.forEach(i => {
    const bar = barsGroup.children[i];
    if (!bar) return;

    const dotGeometry = new THREE.SphereGeometry(BAR_WIDTH * 0.3, 16, 16);
    const dotMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);

    dot.position.x = bar.position.x;
    dot.position.y = -MAX_HEIGHT / 2 - (BAR_WIDTH * 0.3);  // just below the bars
    dot.position.z = 0;

    indicatorGroup.add(dot);
  });
}

export function updateScaleAndBars() {
  // Fixed world scale
  const totalTargetWidth = 50; // units
  const targetMaxHeight = 20;  // units

  BAR_WIDTH = totalTargetWidth / (BAR_COUNT * 1.2);
  BAR_SPACING = BAR_WIDTH * 0.25;
  MAX_HEIGHT = targetMaxHeight;

  console.log('BAR_WIDTH:', BAR_WIDTH.toFixed(2), 'BAR_SPACING:', BAR_SPACING.toFixed(2), 'MAX_HEIGHT:', MAX_HEIGHT.toFixed(2));

  // Clear existing bars
  barsGroup.clear();

  const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_SPACING);

  for (let i = 0; i < BAR_COUNT; i++) {
      const value = dataArray[i];

      // Map value (1..BAR_COUNT) proportionally to height (20% to 100% of MAX_HEIGHT)
      const height = (value / BAR_COUNT) * (MAX_HEIGHT * 0.8) + (MAX_HEIGHT * 0.2);

      const geometry = new THREE.BoxGeometry(BAR_WIDTH, height, BAR_WIDTH);

      // Fixed rainbow gradient based on original sorted value
      const hue = valueToHue[value];
      const color = new THREE.Color().setHSL(hue, 1.0, 0.5);

      const material = new THREE.MeshStandardMaterial({ color });
      const bar = new THREE.Mesh(geometry, material);

      bar.position.x = i * (BAR_WIDTH + BAR_SPACING) - totalWidth / 2 + (BAR_WIDTH + BAR_SPACING) / 2;
      bar.position.y = height / 2 - MAX_HEIGHT / 2;
      bar.position.z = 0;

      barsGroup.add(bar);
    }
}

function positionCamera() {
  const totalWidth = BAR_COUNT * (BAR_WIDTH + BAR_SPACING);
  const fovRadians = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;

  // Calculate distance so that the whole width fits in view
  const distance = (totalWidth / 2) / Math.tan(fovRadians / 2);

  console.log('Camera distance:', distance.toFixed(2), 'Camera aspect:', aspect.toFixed(2));

  camera.position.set(0, MAX_HEIGHT / 2, distance * 0.8);
  camera.lookAt(0, 0, 0);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  updateScaleAndBars();
  positionCamera();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}