import { dataArray, highlightComparedIndices, updateScaleAndBars, initAudio } from './visualizer.js';
import { algorithms } from './algorithm/index.js';

let fsmState = 'IDLE';
let sortLoopPromise = null;
let cancelRequested = false;
let sortSessionId = 0;
let currentAlgorithm = 'bubbleSort';
let speed = 50;
let countdownSeconds = 3;
let countdownInterval = null;
let roundStartData = [];

// New HUD Variables
let startTime = 0;
let stepCount = 0;
let totalStepsEstimate = 1;
let autoCycle = false;
let isMuted = false;

// SVG Icons Constants
const SVG_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const SVG_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
const SVG_MUTE = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
const SVG_MUTED = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';

function updateFSMDisplay() {
  const el = document.getElementById('fsmStateDisplay');
  if (el) el.textContent = fsmState;
  
  const metaEl = document.getElementById('ui-meta');
  if (metaEl) {
    const name = algorithms[currentAlgorithm]?.name || currentAlgorithm;
    metaEl.textContent = `${name.toUpperCase()} • ${fsmState}`;
  }
}

function updateAlgorithmDescription() {
  const desc = algorithms[currentAlgorithm]?.description || '';
  document.getElementById('algorithmDescription').textContent = desc;
}

function updateStartPauseButton() {
  const btn = document.getElementById('startPauseBtn');
  if (!btn) return;
  if (fsmState === 'SORTING') {
    btn.innerHTML = SVG_PAUSE;
    btn.classList.add('active');
  } else {
    btn.innerHTML = SVG_PLAY;
    btn.classList.remove('active');
  }
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${hundredths.toString().padStart(2, '0')}`;
}

function updateHUD() {
  const timerEl = document.getElementById('ui-timer');
  if (timerEl && fsmState === 'SORTING') {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }
}

function getAlgorithmGenerator() {
  const algo = algorithms[currentAlgorithm];
  const n = dataArray.length;
  if (algo.isSlow) totalStepsEstimate = n * n * 0.5;
  else totalStepsEstimate = n * Math.log2(n) * 4;
  stepCount = 0;
  roundStartData = [...dataArray];
  return algo.generator(dataArray);
}

async function sortLoop() {
  const sessionId = sortSessionId;
  const sorter = getAlgorithmGenerator();
  startTime = Date.now();
  for await (const step of sorter) {
    if (cancelRequested || sessionId !== sortSessionId) break;
    if (fsmState === 'PAUSED') {
      while (fsmState === 'PAUSED' && !cancelRequested) { await new Promise(r => setTimeout(r, 50)); }
      if (cancelRequested || sessionId !== sortSessionId) break;
    }
    stepCount++;
    if (step.type === 'compare') highlightComparedIndices(...step.indices);
    else if (step.type === 'swap') updateScaleAndBars();
    updateHUD();
    await new Promise(r => setTimeout(r, Math.max(1, 201 - speed * 2)));
  }
  highlightComparedIndices(-1, -1);
  sortLoopPromise = null;
  if (!cancelRequested) {
    if (autoCycle) transitionTo('COUNTDOWN');
    else transitionTo('IDLE');
  }
}

function transitionTo(newState) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  fsmState = newState;
  updateFSMDisplay();
  updateStartPauseButton();
  if (newState === 'IDLE') {
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = '';
  }
  if (newState === 'SORTING') {
    cancelRequested = false;
    sortSessionId++;
    if (!sortLoopPromise) sortLoopPromise = sortLoop();
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = '';
  }
  if (newState === 'CANCELING') {
    cancelRequested = true;
    sortSessionId++;
    if (sortLoopPromise) {
      sortLoopPromise.then(() => { cancelRequested = false; transitionTo('SORTING'); });
    } else { cancelRequested = false; transitionTo('SORTING'); }
  }
  if (newState === 'COUNTDOWN') {
    let sl = countdownSeconds;
    const cdEl = document.getElementById('countdownDisplay');
    if (cdEl) cdEl.textContent = `NEXT: ${sl}s`;
    countdownInterval = setInterval(() => {
      sl--;
      if (sl > 0) { if (cdEl) cdEl.textContent = `NEXT: ${sl}s`; }
      else { clearInterval(countdownInterval); reshuffle(); pickNext(); transitionTo('SORTING'); }
    }, 1000);
  }
}

function randomizeData() {
  for (let i = dataArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dataArray[i], dataArray[j]] = [dataArray[j], dataArray[i]];
  }
}

function syncBarsAfterDataChange() {
  updateScaleAndBars();
  stepCount = 0;
  updateHUD();
}

function reshuffle() {
  randomizeData();
  roundStartData = [...dataArray];
  syncBarsAfterDataChange();
}

function restoreRoundStartData() {
  if (roundStartData.length === dataArray.length) {
    dataArray.splice(0, dataArray.length, ...roundStartData);
  }
  syncBarsAfterDataChange();
}

function pickNext() {
  const sel = document.getElementById('algorithmSelect');
  const nextIdx = (sel.selectedIndex + 1) % sel.options.length;
  sel.selectedIndex = nextIdx;
  currentAlgorithm = sel.options[nextIdx].value;
  updateAlgorithmDescription();
}

export function initController() {
  const sel = document.getElementById('algorithmSelect');
  const spSub = document.getElementById('sp-val');
  const muteBtn = document.getElementById('ui-mute');
  const volumeSlider = document.getElementById('ui-vol');
  const windowFullscreenBtn = document.getElementById('apple-fs');
  sel.innerHTML = '';
  for (const [k, v] of Object.entries(algorithms)) {
    const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o);
  }
  sel.value = currentAlgorithm;
  if (muteBtn) {
    muteBtn.dataset.muted = String(isMuted);
    muteBtn.setAttribute('aria-pressed', String(isMuted));
  }
  if (windowFullscreenBtn) {
    windowFullscreenBtn.dataset.expanded = 'false';
    windowFullscreenBtn.setAttribute('aria-pressed', 'false');
  }

  document.getElementById('startPauseBtn').addEventListener('click', () => {
    initAudio(); 
    if (fsmState === 'IDLE') transitionTo('SORTING');
    else if (fsmState === 'SORTING') transitionTo('PAUSED');
    else if (fsmState === 'PAUSED') transitionTo('SORTING');
  });

  const stopCurrentSort = () => {
    cancelRequested = true;
    sortSessionId++;
  };

  const fullReset = () => {
    stopCurrentSort();
    reshuffle();
    transitionTo('IDLE');
  };

  const partialReset = () => {
    stopCurrentSort();
    restoreRoundStartData();
    transitionTo('IDLE');
  };

  document.getElementById('ui-reset').addEventListener('click', partialReset);
  document.getElementById('ui-reshuffle').addEventListener('click', fullReset);
  document.getElementById('ui-next').addEventListener('click', () => { pickNext(); if (fsmState !== 'IDLE') transitionTo('CANCELING'); });
  
  const setSp = (v) => { speed = parseInt(v); document.getElementById('speedSlider').value = speed; spSub.textContent = speed; };
  const setWindowFullscreen = (expanded) => {
    document.body.classList.toggle('window-fullscreen', expanded);
    if (windowFullscreenBtn) {
      windowFullscreenBtn.dataset.expanded = String(expanded);
      windowFullscreenBtn.setAttribute('aria-pressed', String(expanded));
      windowFullscreenBtn.classList.toggle('active', expanded);
      windowFullscreenBtn.title = expanded ? 'Exit Window Full Screen' : 'Window Full Screen';
    }
  };

  document.getElementById('speedSlider').addEventListener('input', (e) => setSp(e.target.value));
  document.getElementById('ui-up').addEventListener('click', () => setSp(Math.min(100, speed + 10)));
  document.getElementById('ui-down').addEventListener('click', () => setSp(Math.max(1, speed - 10)));
  windowFullscreenBtn?.addEventListener('click', () => { 
    setWindowFullscreen(!document.body.classList.contains('window-fullscreen'));
  });

  muteBtn?.addEventListener('click', () => {
    isMuted = !isMuted;
    muteBtn.innerHTML = isMuted ? SVG_MUTED : SVG_MUTE;
    muteBtn.dataset.muted = String(isMuted);
    muteBtn.setAttribute('aria-pressed', String(isMuted));
    // 시각적 피드백을 위해 볼륨 슬라이더 이벤트 발생
    volumeSlider?.dispatchEvent(new Event('input'));
  });

  sel.addEventListener('change', (e) => { currentAlgorithm = e.target.value; updateAlgorithmDescription(); updateFSMDisplay(); if (fsmState !== 'IDLE') transitionTo('CANCELING'); });

  let sHeld = false;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyS') sHeld = true;
    if (e.code === 'Escape') { 
      setWindowFullscreen(false);
      document.getElementById('apple-hud').classList.remove('hud-hidden');
      document.getElementById('apple-side').classList.remove('side-hidden');
    }
    if (e.code === 'Space') { document.getElementById('startPauseBtn').click(); e.preventDefault(); }
    if (sHeld && e.code === 'Digit1') {
      autoCycle = !autoCycle;
      document.getElementById('apple-hud').style.boxShadow = autoCycle ? '0 0 20px rgba(255, 77, 77, 0.4)' : '';
    }
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'KeyS') sHeld = false; });

  updateAlgorithmDescription();
  updateFSMDisplay();
  updateHUD();
  updateStartPauseButton();
  transitionTo('IDLE');
}
