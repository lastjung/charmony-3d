# Troubleshooting & FAQ

---

## Common Pitfalls and Fixes

### 1. Visualization Too Small or Off-Center

**Cause:** Fixed camera position and bar spacing do not adapt to screen size.

**Fix:**

- Dynamically calculate camera distance based on:
  - Total width of bars (`BAR_COUNT * (BAR_WIDTH + spacing)`)
  - Camera FOV
  - Aspect ratio
- Center the camera and elevate slightly
- Shift the bar group upward by `-MAX_HEIGHT / 2` to center vertically

---

### 2. Opening `index.html` Directly Doesn't Work

**Cause:** ES module imports require a server context.

**Fix:** Use a local server (`npx serve` or `python3 -m http.server`).

---

### 3. Switching Algorithms Mid-Sort Looks Weird

**Cause:** New algorithm continues sorting the partially sorted array.

**Note:** This is intentional for educational purposes.

**Tip:** To see a fresh sort, pause and reset the array before switching.

---

### 4. Rainbow Gradient Doesn't Appear Sorted

**Cause:** Colors fixed per index instead of value.

**Fix:**

- Generate a color map based on data values (1 to 100)
- Set bar colors dynamically based on current value
- When sorted, the rainbow gradient naturally appears in order

---

### 5. WebGL2 Not Supported or Context Creation Fails

**Cause:**
Your browser or system does not support WebGL2, or WebGL2 is disabled due to browser settings, hardware, or graphics driver issues. Three.js (since r163) requires WebGL2 and will not work with WebGL1.

**Symptoms:**
- The app displays an error message:
  `WebGL context could not be created. Please check your browser and graphics settings.`
- You may also see details such as:
  `THREE.WebGLRenderer: WebGL 1 is not supported since r163.`
  or
  `AllowWebgl2:false restricts context creation on this system.`

**Fixes & Tips:**
- Make sure your browser is up to date.
- Try using a different browser that supports WebGL2.
- Check your browser settings to ensure WebGL2 is enabled.
- Update your graphics drivers.
- If you are using Firefox, check `about:config` for `webgl.disabled` and `webgl.enable-webgl2` settings.
- If you are running in a virtual machine or remote desktop, try running on native hardware.

If the problem persists, your system may not support WebGL2. See [WebGL2 support status](https://caniuse.com/webgl2) for more information.

---

## Debugging Tips

- Use `console.log()` to trace algorithm steps and UI events
- Test each feature incrementally (see [Implementation Guide](Implementation.md))
- Check browser console for errors
- Simplify the problem: isolate modules when debugging
- Use breakpoints and step through code in browser dev tools

---

## FSM Troubleshooting

If the application appears stuck or unresponsive:

- Check the current FSM state (e.g., IDLE, SORTING, PAUSED, COUNTDOWN, CANCELING).
- Ensure state transitions are triggered correctly by UI events.
- Avoid triggering multiple conflicting actions simultaneously.
- If switching algorithms mid-sort causes issues, verify cancellation flags are respected.

---

## Metadata Troubleshooting

If an algorithm does not appear in the dropdown or causes test failures:

- Ensure the algorithm module exports required metadata (`name`, `description`, etc.).
- Check that the metadata values are correct and consistent.
- Verify the algorithm is imported and registered in `algorithm/index.js`.
- Update documentation if adding new algorithms.

---

## FAQ

**Q:** Why does the visualization freeze or behave unexpectedly?

- Check for infinite loops or unhandled promises in sorting algorithms.
- Ensure async generators yield control regularly.

**Q:** How can I add a new sorting algorithm?

- Implement it as an async generator in `algorithm/`.
- Include metadata (`name`, `description`, `isSlow`, etc.).
- Import and register it in `algorithm/index.js`.
- Update the documentation accordingly.

**Q:** Can I customize colors or animations?

- Yes! Modify `visualizer.js` for colors and animation styles.