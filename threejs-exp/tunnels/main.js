/**
 * TUNNEL JOURNEY PRO
 * Enhanced with Premium Apple-style HUD & Logic
 */

(function() {
  // Scene set-up
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 40;
  camera.lookAt(scene.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  document.body.appendChild(renderer.domElement);

  const controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;
  controls.enabled = false;

  // State Variables
  let is_paused = false;
  let counter = 0;
  let move_speed = 0.0005;
  let speed_mult = 1.0;
  let auto_fire = false;
  let mouse = new THREE.Vector2();
  let mouse_pos = new THREE.Vector3();
  let win_half = { w: window.innerWidth / 2, h: window.innerHeight / 2 };

  // HUD Elements
  const btnPause = document.getElementById('btn-pause');
  const btnSpeedUp = document.getElementById('btn-speed-up');
  const btnSpeedDown = document.getElementById('btn-speed-down');
  const btnAutoFire = document.getElementById('btn-auto-fire');
  const btnReset = document.getElementById('btn-reset');
  const speedLabel = document.getElementById('speed-label');
  const iconPause = document.getElementById('icon-pause');

  const updatePlayUI = () => {
    if (is_paused) {
      iconPause.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; // Play Icon
      btnPause.classList.remove('active');
    } else {
      iconPause.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; // Pause Icon
      btnPause.classList.add('active');
    }
  };

  // Tunnel Track Construction
  const points = [];
  for (let i = 0; i < path_points.length; i += 3) {
    points.push(new THREE.Vector3(path_points[i], path_points[i + 1], path_points[i + 2]));
  }
  const spline = new THREE.SplineCurve3(points);
  
  // Custom Tunnel Tube
  const tube_geo = new THREE.TubeGeometry(spline, 222, 0.7, 10, false);
  tube_geo.vertices.forEach(v => {
    v.x += Math.random() * 0.3 - 0.15;
    v.y += Math.random() * 0.3 - 0.15;
    v.z += Math.random() * 0.3 - 0.15;
  });
  tube_geo.computeFaceNormals();

  const lambert_mat = new THREE.MeshLambertMaterial({
    color: 0x222222,
    emissive: 0x111111,
    side: THREE.DoubleSide,
    shading: THREE.SmoothShading
  });
  const wire_mat = new THREE.MeshBasicMaterial({
    color: 0x007AFF,
    wireframe: true,
    opacity: 0.15,
    transparent: true,
    wireframeLinewidth: 1
  });

  const tube = new THREE.SceneUtils.createMultiMaterialObject(tube_geo, [lambert_mat, wire_mat]);
  scene.add(tube);

  // Floating Boxes
  const box_geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
  const boxes = [];
  const boxes_fill = [];
  const num_boxes = 40;

  for (let i = 0; i < num_boxes; i++) {
    const p = (i / num_boxes + Math.random() * 0.05) % 1.0;
    const pos = spline.getPointAt(p);
    pos.x += Math.random() - 0.4;
    pos.z += Math.random() - 0.4;

    const col = new THREE.Color().setHSL(Math.random() * 0.1 + 0.55, 1, 0.5); // Neon Blue/Cyan range
    const mat_fill = new THREE.MeshLambertMaterial({ color: col, emissive: col, transparent: true, opacity: 0.2 });
    const mesh_fill = new THREE.Mesh(box_geo, mat_fill);
    mesh_fill.position.copy(pos);
    mesh_fill.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh_fill);
    boxes_fill.push(mesh_fill);

    const helper = new THREE.BoxHelper(mesh_fill);
    helper.material.color.copy(col);
    helper.material.transparent = true;
    helper.material.opacity = 0.6;
    helper.kill = () => {
      if (helper.active && helper.scale.x < 15) {
        helper.scale.multiplyScalar(1.1);
        helper.material.opacity -= 0.05;
        if (helper.material.opacity < 0) scene.remove(helper);
      }
    };
    scene.add(helper);
    boxes.push(helper);

    if (Math.random() < 0.4) {
      const p_light = new THREE.PointLight(col, 0.8, 3.0);
      p_light.position.copy(pos);
      scene.add(p_light);
    }
  }

  // Lasers
  const laser_geo = new THREE.IcosahedronGeometry(0.04, 2);
  const lasers = [];
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3();
  const crosshairs = new THREE.Object3D();
  crosshairs.position.z = -0.2;

  const cross_mat = new THREE.LineBasicMaterial({ color: 0x007AFF, linewidth: 2 });
  const cross_geo = new THREE.Geometry();
  cross_geo.vertices.push(new THREE.Vector3(0, 0.015, 0), new THREE.Vector3(0, 0.005, 0));
  for (let r = 0; r < 4; r++) {
    const l = new THREE.Line(cross_geo, cross_mat);
    l.rotation.z = (Math.PI / 2) * r;
    crosshairs.add(l);
  }
  camera.add(crosshairs);
  scene.add(camera);

  const fireLaser = () => {
    const laser_mat = new THREE.MeshBasicMaterial({ color: 0xFFCC00, transparent: true, opacity: 1.0 });
    const bolt = new THREE.Mesh(laser_geo, laser_mat);
    bolt.position.copy(camera.position);
    
    const goal_pos = camera.position.clone().setFromMatrixPosition(crosshairs.matrixWorld);
    const dir = new THREE.Vector3().subVectors(goal_pos, camera.position).normalize();
    
    let impact_point = null;
    raycaster.set(camera.position, dir);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) impact_point = intersects[0].point;

    const zap = {
      mesh: bolt,
      dir: dir.multiplyScalar(0.8),
      impact: impact_point,
      active: true,
      exploding: false,
      scale: 1.0,
      update: function() {
        if (!this.active) return;
        if (!this.exploding) {
          this.mesh.position.add(this.dir);
          if (this.impact && this.mesh.position.distanceTo(this.impact) < 0.6) {
            this.mesh.position.copy(this.impact);
            this.exploding = true;
            this.mesh.material.color.setRGB(1, 0.3, 0);
          }
        } else {
          this.scale *= 0.94;
          this.mesh.scale.set(this.scale, this.scale, this.scale);
          if (this.scale < 0.05) {
            this.active = false;
            scene.remove(this.mesh);
          }
        }
      }
    };
    lasers.push(zap);
    scene.add(bolt);
  };

  // Animation & Rendering
  const pos = new THREE.Vector3(9, -1, 10.5);
  const eye_pos = new THREE.Vector3(10, -0.75, 3.75);
  const lerp_speed = 0.1;

  function renderFrame() {
    requestAnimationFrame(renderFrame);

    if (!is_paused) {
      counter += move_speed * speed_mult;
      if (counter > 0.98) counter = 0.02;

      const target_p = spline.getPointAt(counter % 1.0);
      pos.lerp(target_p, lerp_speed);

      const look_p = spline.getPointAt((counter + 0.05 * speed_mult) % 1.0);
      eye_pos.lerp(look_p, lerp_speed);

      camera.position.copy(pos);
      camera.lookAt(eye_pos);
      camera.up.set(1, 0, 0);

      if (auto_fire && Math.random() < 0.05) fireLaser();
    } else {
      controls.update();
    }

    crosshairs.position.copy(mouse_pos);
    lasers.forEach((z, i) => {
      z.update();
      if (!z.active) lasers.splice(i, 1);
    });

    renderer.render(scene, camera);
  }

  // Events & UI Bindings
  const togglePause = () => {
    is_paused = !is_paused;
    controls.enabled = is_paused;
    if (is_paused) controls.target.copy(eye_pos);
    updatePlayUI();
  };

  btnPause.addEventListener('click', togglePause);
  btnSpeedUp.addEventListener('click', () => {
    speed_mult = Math.min(speed_mult + 0.5, 5.0);
    speedLabel.innerText = speed_mult.toFixed(1) + 'X';
  });
  btnSpeedDown.addEventListener('click', () => {
    speed_mult = Math.max(speed_mult - 0.5, 0.5);
    speedLabel.innerText = speed_mult.toFixed(1) + 'X';
  });
  btnAutoFire.addEventListener('click', () => {
    auto_fire = !auto_fire;
    btnAutoFire.classList.toggle('active', auto_fire);
  });
  btnReset.addEventListener('click', () => location.reload());

  window.addEventListener('mousemove', (e) => {
    mouse_pos.set(
      (e.clientX - win_half.w) * 0.00025,
      (e.clientY - win_half.h) * -0.00025,
      -0.2
    );
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener('keyup', (e) => {
    if (e.keyCode === 27) togglePause(); // ESC
    if (e.code === 'KeyZ' && !is_paused) fireLaser();
    
    // S + 1 for Auto Fire toggle
    if (e.code === 'Digit1') {
      auto_fire = !auto_fire;
      btnAutoFire.classList.toggle('active', auto_fire);
    }
  });

  window.addEventListener('resize', () => {
    win_half = { w: window.innerWidth / 2, h: window.innerHeight / 2 };
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('#apple-player')) return;
    if (!is_paused) fireLaser();
  });

  // Start
  updatePlayUI();
  renderFrame();
})();