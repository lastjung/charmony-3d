/**
 * SHADOWS QUAD-TREE PRO
 * Enhanced for Premium Experience
 */

(function() {
  // Scene Setup
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xe0e0e0, 0.0025);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  camera.position.set(12, 18, 24);
  camera.lookAt(scene.position);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMapEnabled = true;
  renderer.shadowMapType = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xe0e0e0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  // Variables & State
  let num_balls = 32;
  let repel_strength = 0.05;
  let friction = 0.95;
  let show_grid = false;
  let auto_scatter = false;
  let objs = [];
  const ball_radius = 1;
  const origin = new THREE.Vector3(0, 1, 0);

  // UI Elements
  const ui = {
    count: { label: document.getElementById('val-count'), input: document.getElementById('input-count') },
    repel: { label: document.getElementById('val-repel'), input: document.getElementById('input-repel') },
    friction: { label: document.getElementById('val-friction'), input: document.getElementById('input-friction') },
    grid: { switch: document.getElementById('switch-grid') },
    auto: { switch: document.getElementById('switch-auto') }
  };

  // Quadtree Implementation
  class Node {
    constructor(x, y, width, height, level = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.level = level;
      this.objs = [];
      this.max_objs = 4;
      this.max_levels = 5;
      this.sub_nodes = [];
      this.helper = null;
    }

    clear() {
      this.objs = [];
      if (this.helper) {
        scene.remove(this.helper);
        this.helper.geometry.dispose();
        this.helper = null;
      }
      this.sub_nodes.forEach(node => node.clear());
      this.sub_nodes = [];
    }

    split() {
      const hw = this.width / 2;
      const hh = this.height / 2;
      const l = this.level + 1;
      this.sub_nodes = [
        new Node(this.x, this.y, hw, hh, l),
        new Node(this.x + hw, this.y, hw, hh, l),
        new Node(this.x + hw, this.y + hh, hw, hh, l),
        new Node(this.x, this.y + hh, hw, hh, l)
      ];
    }

    getIndex(obj) {
      const mx = this.x + this.width / 2;
      const my = this.y + this.height / 2;
      const pos = obj.mesh.position;
      if (pos.x < mx && pos.z < my) return 0;
      if (pos.x >= mx && pos.z < my) return 1;
      if (pos.x >= mx && pos.z >= my) return 2;
      if (pos.x < mx && pos.z >= my) return 3;
      return -1;
    }

    add(obj) {
      if (this.sub_nodes.length > 0) {
        const index = this.getIndex(obj);
        if (index !== -1) {
          this.sub_nodes[index].add(obj);
          return;
        }
      }

      this.objs.push(obj);

      if (this.objs.length > this.max_objs && this.level < this.max_levels) {
        if (this.sub_nodes.length === 0) this.split();
        let i = 0;
        while (i < this.objs.length) {
          const index = this.getIndex(this.objs[i]);
          if (index !== -1) {
            this.sub_nodes[index].add(this.objs.splice(i, 1)[0]);
          } else {
            i++;
          }
        }
      }
    }

    getNearbyObjs(obj) {
      let result = [...this.objs];
      if (this.sub_nodes.length > 0) {
        const index = this.getIndex(obj);
        if (index !== -1) {
          result = result.concat(this.sub_nodes[index].getNearbyObjs(obj));
        }
      }
      return result;
    }

    draw() {
      if (!show_grid) return;
      
      const geo = new THREE.Geometry();
      const hw = this.width / 2;
      const hh = this.height / 2;
      
      // Rect lines
      geo.vertices.push(
        new THREE.Vector3(this.x, 0.01, this.y), new THREE.Vector3(this.x + this.width, 0.01, this.y),
        new THREE.Vector3(this.x + this.width, 0.01, this.y), new THREE.Vector3(this.x + this.width, 0.01, this.y + this.height),
        new THREE.Vector3(this.x + this.width, 0.01, this.y + this.height), new THREE.Vector3(this.x, 0.01, this.y + this.height),
        new THREE.Vector3(this.x, 0.01, this.y + this.height), new THREE.Vector3(this.x, 0.01, this.y)
      );

      const mat = new THREE.LineBasicMaterial({ color: 0x007AFF, opacity: 0.2, transparent: true });
      this.helper = new THREE.Line(geo, mat, THREE.LinePieces);
      scene.add(this.helper);

      this.sub_nodes.forEach(node => node.draw());
    }
  }

  const quad_tree = new Node(-50, -50, 100, 100);

  // Ball Geometry and Material
  const ball_geo = new THREE.IcosahedronGeometry(ball_radius, 1); // Reverted to 1 for flat look
  const getBallMat = () => new THREE.MeshPhongMaterial({
    color: 0x0099FF, // Reverted to original neon blue
    specular: 0xa0a0a0,
    shininess: 10,
    shading: THREE.FlatShading
  });

  // Ball Object Factory
  function createBall(id) {
    const mesh = new THREE.Mesh(ball_geo, getBallMat());
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      ball_radius,
      (Math.random() - 0.5) * 10
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.velocity = new THREE.Vector3();

    const nudge = (toward_center = false) => {
      const mag = 0.4;
      const impulse = new THREE.Vector3((Math.random() - 0.5) * mag, 0, (Math.random() - 0.5) * mag);
      if (toward_center) {
        impulse.subVectors(origin, mesh.position).normalize().multiplyScalar(0.2);
      }
      mesh.velocity.add(impulse);
    };

    const update = () => {
      mesh.position.add(mesh.velocity);
      mesh.velocity.multiplyScalar(friction);
      
      // Boundary check
      const bound = 50 - ball_radius;
      if (Math.abs(mesh.position.x) > bound) {
        mesh.position.x = Math.sign(mesh.position.x) * bound;
        mesh.velocity.x *= -0.8;
      }
      if (Math.abs(mesh.position.z) > bound) {
        mesh.position.z = Math.sign(mesh.position.z) * bound;
        mesh.velocity.z *= -0.8;
      }

      // Auto movement
      if (auto_scatter && Math.random() < 0.01) nudge();
    };

    return { id, mesh, update, nudge };
  }

  // Initialization
  function initBalls() {
    objs.forEach(o => scene.remove(o.mesh));
    objs = [];
    for (let i = 0; i < num_balls; i++) {
      const ball = createBall(i);
      scene.add(ball.mesh);
      objs.push(ball);
    }
  }

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadowCameraNear = 1;
  sun.shadowCameraFar = 200;
  sun.shadowCameraLeft = -60;
  sun.shadowCameraRight = 60;
  sun.shadowCameraTop = 60;
  sun.shadowCameraBottom = -60;
  sun.shadowMapWidth = 2048;
  sun.shadowMapHeight = 2048;
  scene.add(sun);

  // Ground
  const ground_geo = new THREE.PlaneGeometry(100, 100);
  const ground_mat = new THREE.MeshPhongMaterial({ color: 0xffffff });
  const ground = new THREE.Mesh(ground_geo, ground_mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(50, 20, 0x000000, 0xcccccc);
  gridHelper.position.y = 0.05;
  scene.add(gridHelper);

  // UI Event Listeners
  const updateCount = (e) => {
    num_balls = parseInt(e.target.value);
    ui.count.label.innerText = num_balls;
    initBalls();
  };
  ui.count.input.addEventListener('input', updateCount);
  ui.count.input.addEventListener('change', updateCount);

  const updateRepel = (e) => {
    repel_strength = parseFloat(e.target.value);
    ui.repel.label.innerText = repel_strength.toFixed(3);
  };
  ui.repel.input.addEventListener('input', updateRepel);
  ui.repel.input.addEventListener('change', updateRepel);

  const updateFriction = (e) => {
    friction = parseFloat(e.target.value);
    ui.friction.label.innerText = friction.toFixed(2);
  };
  ui.friction.input.addEventListener('input', updateFriction);
  ui.friction.input.addEventListener('change', updateFriction);

  ui.grid.switch.parentElement.addEventListener('click', () => {
    show_grid = !show_grid;
    ui.grid.switch.classList.toggle('active', show_grid);
  });

  ui.auto.switch.parentElement.addEventListener('click', () => {
    auto_scatter = !auto_scatter;
    ui.auto.switch.classList.toggle('active', auto_scatter);
  });

  // Render Loop
  const repel_vec = new THREE.Vector3();
  function animate() {
    requestAnimationFrame(animate);
    controls.update();

    quad_tree.clear();
    objs.forEach(o => {
      o.update();
      quad_tree.add(o);
    });

    // Collision (Repulsion) using Quadtree
    objs.forEach(b => {
      const near = quad_tree.getNearbyObjs(b);
      near.forEach(other => {
        if (b.id === other.id) return;
        const dist = b.mesh.position.distanceTo(other.mesh.position);
        if (dist < ball_radius * 2) {
          repel_vec.subVectors(b.mesh.position, other.mesh.position).normalize().multiplyScalar(repel_strength);
          b.mesh.velocity.add(repel_vec);
        }
      });
    });

    if (show_grid) quad_tree.draw();
    renderer.render(scene, camera);
  }

  // Interaction
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      objs.forEach(o => o.nudge(e.shiftKey));
      e.preventDefault();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  initBalls();
  animate();
})();
