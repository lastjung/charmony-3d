import { initVisualizer } from './visualizer.js';
import { initController } from './controller.js';

const canvas = document.getElementById('three-canvas');
if (initVisualizer(canvas)) {
  initController();
}