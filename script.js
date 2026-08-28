// Automatically update current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Theme Toggle with Directional Diagonal Sliding Transition
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('.theme-icon');
const themeText = themeToggleBtn.querySelector('.theme-text');
const rootElement = document.documentElement;

// Load saved user preference or default to dark
const savedTheme = localStorage.getItem('portfolio-theme') || 'dark';
applyThemeUI(savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const currentTheme = rootElement.getAttribute('data-theme');
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

  // Light to Dark -> Left to Right
  // Dark to Light -> Right to Left
  const direction = nextTheme === 'dark' ? 'left-to-right' : 'right-to-left';
  rootElement.setAttribute('data-transition-dir', direction);

  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => {
      applyThemeUI(nextTheme);
    });

    // Clean up transition direction attribute once animation completes
    transition.finished.finally(() => {
      rootElement.removeAttribute('data-transition-dir');
    });
  } else {
    // Fallback for older browsers
    applyThemeUI(nextTheme);
  }
});

function applyThemeUI(theme) {
  rootElement.setAttribute('data-theme', theme);
  localStorage.setItem('portfolio-theme', theme);

  if (theme === 'dark') {
    themeIcon.textContent = '☀️';
    themeText.textContent = 'Light';
  } else {
    themeIcon.textContent = '🌙';
    themeText.textContent = 'Dark';
  }
}

// Secure Contact Form Handler
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
const submitBtn = document.getElementById('submit-btn');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. Update UI to show loading state
  const originalBtnText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formStatus.textContent = '';

  const formData = new FormData(contactForm);
  const object = Object.fromEntries(formData);
  const json = JSON.stringify(object);

  try {
    // 2. Post data to the secure endpoint
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: json
    });

    const result = await response.json();

    // 3. Handle success or error response
    if (response.status === 200 && result.success) {
      formStatus.textContent = '✓ Message sent successfully! I will get back to you soon.';
      formStatus.style.color = 'var(--text-main)';
      contactForm.reset();
    } else {
      formStatus.textContent = `✗ ${result.message || 'Something went wrong. Please try again.'}`;
      formStatus.style.color = '#ef4444'; // Red error text
    }
  } catch (error) {
    formStatus.textContent = '✗ Network error. Please check your connection and try again.';
    formStatus.style.color = '#ef4444';
  } finally {
    // 4. Restore button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;

    // Dismiss message after 6 seconds
    setTimeout(() => {
      formStatus.textContent = '';
    }, 6000);
  }
});

/* ==========================================================================
   Interactive Ateneo CompSAt Lanyard & ID Card Physics Engine
   ========================================================================== */
(function initLanyardPhysics() {
  const stage = document.getElementById('lanyard-stage');
  const cardWrapper = document.getElementById('id-card-wrapper');
  const card = document.getElementById('id-card');
  const cardSheen = document.getElementById('card-sheen');
  const dragHint = document.getElementById('drag-hint');

  // SVG ribbon elements
  const leftRibbonPath = document.getElementById('left-ribbon-path');
  const rightRibbonPath = document.getElementById('right-ribbon-path');
  const leftRibbonBg = document.getElementById('left-ribbon-bg');
  const rightRibbonBg = document.getElementById('right-ribbon-bg');
  const leftRibbonEdge = document.getElementById('left-ribbon-edge');
  const rightRibbonEdge = document.getElementById('right-ribbon-edge');

  if (!stage || !cardWrapper || !card) return;

  // Physics constants
  const L_REST = 160;     // Resting lanyard length from mount (px)
  const L_MAX = 245;      // Maximum stretch limit of lanyard (px)
  const PIN_SPREAD = 32;  // Left & right anchor distance from center (px)
  const SPRING_K = 0.042; // Harmonic spring constant
  const DAMPING = 0.91;   // Harmonic damping factor

  // State variables
  let stageRect = stage.getBoundingClientRect();
  let mountX = stageRect.width / 2;
  let mountY = 8;

  // Initial luxury entrance drop: Start higher and bounce into resting position
  let x = mountX;
  let y = mountY + 80;
  let vx = 0;
  let vy = 7.5;

  let rotZ = 0;
  let tiltX = 0;
  let tiltY = 0;

  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let lastPointer = { x: 0, y: 0, time: 0 };
  let pointerVel = { x: 0, y: 0 };
  let ambientTime = 0;
  let hasInteracted = false;

  function updateDimensions() {
    stageRect = stage.getBoundingClientRect();
    mountX = stageRect.width / 2;
    mountY = 8;
    if (!isDragging && Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
      x = mountX;
      y = mountY + L_REST;
    }
  }

  window.addEventListener('resize', updateDimensions);

  // Pointer Interaction Handlers
  cardWrapper.addEventListener('pointerdown', (e) => {
    isDragging = true;
    cardWrapper.setPointerCapture(e.pointerId);
    cardWrapper.classList.add('is-dragging');

    // Dismiss drag hint after first interaction
    if (!hasInteracted && dragHint) {
      dragHint.style.opacity = '0';
      setTimeout(() => { if (dragHint) dragHint.style.display = 'none'; }, 300);
      hasInteracted = true;
    }

    stageRect = stage.getBoundingClientRect();
    const pointerX = e.clientX - stageRect.left;
    const pointerY = e.clientY - stageRect.top;

    // Offset from current card top anchor
    dragOffset.x = pointerX - x;
    dragOffset.y = pointerY - y;

    lastPointer = { x: pointerX, y: pointerY, time: performance.now() };
    pointerVel = { x: 0, y: 0 };
    vx = 0;
    vy = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;

    const pointerX = e.clientX - stageRect.left;
    const pointerY = e.clientY - stageRect.top;
    const now = performance.now();
    const dt = Math.max(1, now - lastPointer.time);

    // Track instant pointer velocity for natural momentum release
    pointerVel.x = ((pointerX - lastPointer.x) / dt) * 16;
    pointerVel.y = ((pointerY - lastPointer.y) / dt) * 16;
    lastPointer = { x: pointerX, y: pointerY, time: now };

    // Target coordinates with offset
    let targetX = pointerX - dragOffset.x;
    let targetY = pointerY - dragOffset.y;

    // Constrain by lanyard rope length
    const dx = targetX - mountX;
    const dy = targetY - mountY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > L_MAX) {
      const overshoot = dist - L_MAX;
      const elasticDist = L_MAX + overshoot * 0.18; // Soft rubber-band resistance
      const ratio = elasticDist / dist;
      targetX = mountX + dx * ratio;
      targetY = mountY + dy * ratio;
    }

    // Prevent pushing above mount bar
    targetY = Math.max(targetY, mountY + 28);

    // Responsive position smoothing
    x += (targetX - x) * 0.75;
    y += (targetY - y) * 0.75;

    // Dynamic 3D tilt while dragging
    tiltY = Math.max(-24, Math.min(24, (x - mountX) * 0.1 + pointerVel.x * 0.7));
    tiltX = Math.max(-22, Math.min(22, -(y - (mountY + L_REST)) * 0.08 - pointerVel.y * 0.7));
  });

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    cardWrapper.classList.remove('is-dragging');

    // Impart fling/throw velocity
    vx = Math.max(-28, Math.min(28, pointerVel.x * 1.1));
    vy = Math.max(-28, Math.min(28, pointerVel.y * 1.1));
  }

  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Main 60fps Physics Simulation & Render Loop
  function animate() {
    const cardWidth = cardWrapper.offsetWidth || 240;

    if (!isDragging) {
      // Spring & Pendulum Simulation
      const targetRestX = mountX;
      const targetRestY = mountY + L_REST;

      const fx = -SPRING_K * (x - targetRestX);
      const fy = -SPRING_K * (y - targetRestY);

      vx = (vx + fx) * DAMPING;
      vy = (vy + fy) * DAMPING;

      x += vx;
      y += vy;

      // Ambient gentle breathing sway when settled
      if (Math.abs(vx) < 0.08 && Math.abs(vy) < 0.08) {
        ambientTime += 0.024;
        x += Math.sin(ambientTime) * 0.25;
      }

      // Smooth tilt recovery
      tiltX *= 0.92;
      tiltY *= 0.92;
    }

    // Compute rotational pendulum angle from swing displacement
    const swingAngle = Math.atan2(x - mountX, y - mountY) * (180 / Math.PI) * 0.72;
    rotZ += (swingAngle - rotZ) * (isDragging ? 0.4 : 0.25);

    // Position & rotate Card Wrapper as a unified physical unit (clasp + card + slot hole)
    const leftPos = x - cardWidth / 2;
    const topPos = y;
    cardWrapper.style.transform = `translate3d(${leftPos.toFixed(2)}px, ${topPos.toFixed(2)}px, 0px) rotateZ(${rotZ.toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

    // Update dynamic holographic sheen position
    if (cardSheen) {
      cardSheen.style.transform = `rotate(25deg) translate(${(tiltY * 3).toFixed(1)}px, ${(tiltX * 2).toFixed(1)}px)`;
    }

    // Dynamic SVG Ribbon Curves connecting precisely to top of clasp buckle
    const pinL = { x: mountX - PIN_SPREAD, y: mountY };
    const pinR = { x: mountX + PIN_SPREAD, y: mountY };
    const clip = { x: x, y: y }; // Locked to exact top origin of clasp buckle

    const dx = x - mountX;
    const dy = y - mountY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const slack = Math.max(0, 1 - dist / L_REST);
    const sag = slack * 28;

    // Bezier control points with realistic weight and tension
    const cpL = {
      x: pinL.x + dx * 0.35 - 8,
      y: pinL.y + dy * 0.55 + sag
    };
    const cpR = {
      x: pinR.x + dx * 0.35 + 8,
      y: pinR.y + dy * 0.55 + sag
    };

    const leftD = `M ${pinL.x.toFixed(1)} ${pinL.y.toFixed(1)} Q ${cpL.x.toFixed(1)} ${cpL.y.toFixed(1)} ${clip.x.toFixed(1)} ${clip.y.toFixed(1)}`;
    const rightD = `M ${clip.x.toFixed(1)} ${clip.y.toFixed(1)} Q ${cpR.x.toFixed(1)} ${cpR.y.toFixed(1)} ${pinR.x.toFixed(1)} ${pinR.y.toFixed(1)}`;

    if (leftRibbonPath) leftRibbonPath.setAttribute('d', leftD);
    if (rightRibbonPath) rightRibbonPath.setAttribute('d', rightD);
    if (leftRibbonBg) leftRibbonBg.setAttribute('d', leftD);
    if (rightRibbonBg) rightRibbonBg.setAttribute('d', rightD);
    if (leftRibbonEdge) leftRibbonEdge.setAttribute('d', leftD);
    if (rightRibbonEdge) rightRibbonEdge.setAttribute('d', rightD);

    requestAnimationFrame(animate);
  }

  // Initial layout calculation & start loop
  updateDimensions();
  requestAnimationFrame(animate);
})();