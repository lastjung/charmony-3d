import { dataArray, highlightComparedIndices, updateScaleAndBars } from './visualizer.js';
import { algorithms } from './algorithm/index.js';


let fsmState = 'IDLE';
let sortLoopPromise = null;
let cancelRequested = false;
let currentAlgorithm = 'bubbleSort';
let speed = 50;
let countdownSeconds = 3;
let countdownInterval = null;

function updateFSMDisplay() {
  const el = document.getElementById('fsmStateDisplay');
  if (el) el.textContent = `${fsmState}`;
}

function updateAlgorithmDescription() {
  const desc = algorithms[currentAlgorithm]?.description || '';
  document.getElementById('algorithmDescription').textContent = desc;
}

function updateStartPauseButton() {
  const btn = document.getElementById('startPauseBtn');
  if (fsmState === 'IDLE') {
    btn.textContent = 'Start';
  } else if (fsmState === 'SORTING') {
    btn.textContent = 'Pause';
  } else if (fsmState === 'PAUSED') {
    btn.textContent = 'Resume';
  } else {
    btn.textContent = 'Start';
  }
}

function getAlgorithmGenerator() {
  const algo = algorithms[currentAlgorithm];
  if (algo && typeof algo.generator === 'function') {
    return algo.generator(dataArray);
  } else {
    // fallback to bubbleSort if not found
    return algorithms['bubbleSort'].generator(dataArray);
  }
}

async function sortLoop() {
  const sorter = getAlgorithmGenerator();
  for await (const step of sorter) {
    if (cancelRequested) break;
    if (fsmState === 'PAUSED') {
      while (fsmState === 'PAUSED' && !cancelRequested) {
        await new Promise(r => setTimeout(r, 50));
      }
      if (cancelRequested) break;
    }
    if (step.type === 'compare') {
      const [i, j] = step.indices;
      highlightComparedIndices(i, j);
    } else if (step.type === 'swap') {
      updateScaleAndBars();
    }
    const delay = Math.max(1, 201 - speed * 2);
    await new Promise(r => setTimeout(r, delay));
  }
  highlightComparedIndices(-1, -1);
  sortLoopPromise = null;
  if (!cancelRequested) {
    transitionTo('COUNTDOWN');
  }
}

function reshuffleArray() {
  for (let i = dataArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataArray[i], dataArray[j]] = [dataArray[j], dataArray[i]];
  }
  updateScaleAndBars();
}

function transitionTo(newState) {
  fsmState = newState;
  updateFSMDisplay();
  updateStartPauseButton();

  if (newState === 'IDLE') {
    cancelRequested = false;
    document.getElementById('countdownDisplay').textContent = '';
  }

  if (newState === 'SORTING') {
    cancelRequested = false;
    if (!sortLoopPromise) {
      sortLoopPromise = sortLoop();
    }
    document.getElementById('countdownDisplay').textContent = '';
  }

  if (newState === 'PAUSED') {
    // nothing special, sortLoop respects pause
  }

  if (newState === 'CANCELING') {
    cancelRequested = true;
    if (sortLoopPromise) {
      sortLoopPromise.then(() => {
        cancelRequested = false;
        transitionTo('SORTING');
      });
    } else {
      cancelRequested = false;
      transitionTo('SORTING');
    }
  }

  if (newState === 'COUNTDOWN') {
    let secondsLeft = countdownSeconds;
    const countdownEl = document.getElementById('countdownDisplay');
    countdownEl.textContent = `Next sort in ${secondsLeft}...`;
    countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        countdownEl.textContent = `Next sort in ${secondsLeft}...`;
      } else {
        clearInterval(countdownInterval);
        reshuffleArray();
        pickNextAlgorithm();
        transitionTo('SORTING');
      }
    }, 1000);
  }
}

function pickNextAlgorithm() {
  const select = document.getElementById('algorithmSelect');
  const options = Array.from(select.options);
  const currentIndex = options.findIndex(opt => opt.value === currentAlgorithm);
  const nextIndex = (currentIndex + 1) % options.length;
  currentAlgorithm = options[nextIndex].value;
  select.value = currentAlgorithm;
  updateAlgorithmDescription();
}

export function initController() {
  const algorithmSelect = document.getElementById('algorithmSelect');

  // Dynamically populate dropdown
  algorithmSelect.innerHTML = '';
  for (const [key, algo] of Object.entries(algorithms)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = algo.name || key;
    algorithmSelect.appendChild(option);
  }

  // Set default algorithm to the first one
  const firstKey = Object.keys(algorithms)[0];
  currentAlgorithm = firstKey;
  algorithmSelect.value = firstKey;

  const speedSlider = document.getElementById('speedSlider');
  speed = parseInt(speedSlider.value, 10);
  document.getElementById('startPauseBtn').addEventListener('click', () => {
    if (fsmState === 'IDLE') {
      transitionTo('SORTING');
    } else if (fsmState === 'SORTING') {
      transitionTo('PAUSED');
    } else if (fsmState === 'PAUSED') {
      transitionTo('SORTING');
    } else if (fsmState === 'COUNTDOWN') {
      clearInterval(countdownInterval);
      transitionTo('SORTING');
    }
  });

  document.getElementById('stepBtn').addEventListener('click', () => {
    // Optional: implement step mode if desired
  });

  algorithmSelect.addEventListener('change', async (e) => {
    currentAlgorithm = e.target.value;
    updateAlgorithmDescription();
    if (fsmState === 'SORTING' || fsmState === 'PAUSED' || fsmState === 'COUNTDOWN') {
      transitionTo('CANCELING');
    }
  });

  speedSlider.addEventListener('input', () => {
    speed = parseInt(speedSlider.value, 10);
  });

  updateAlgorithmDescription();
  updateFSMDisplay();
  updateStartPauseButton();

  // Start automatically
  transitionTo('SORTING');
}