(() => {
  const section = document.getElementById('contact');
  const canvas = document.getElementById('contactNoise');

  if (!section || !canvas) return;

  const context = canvas.getContext('2d', {
    alpha: false
  });

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  const finePointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  );

  let image = null;
  let visible = false;
  let frameId = null;
  let lastNoiseTime = 0;
  let lastTime = 0;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const noiseInterval = 1000 / 12;

  function drawNoise() {
    if (!context || !image) return;

    const pixels = image.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const value = Math.floor(Math.random() * 256);

      pixels[i] = Math.floor(value * 0.86);
      pixels[i + 1] = Math.floor(value * 0.96);
      pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }

    context.putImageData(image, 0, 0);
  }

  function resize() {
    if (!context) return;

    const bounds = section.getBoundingClientRect();

    canvas.width = Math.max(
      1,
      Math.min(560, Math.round(bounds.width / 3))
    );

    canvas.height = Math.max(
      1,
      Math.min(340, Math.round(bounds.height / 3))
    );

    image = context.createImageData(
      canvas.width,
      canvas.height
    );

    drawNoise();
  }

  function updateBackground() {
    section.style.setProperty(
      '--contact-x',
      `${currentX.toFixed(3)}px`
    );

    section.style.setProperty(
      '--contact-y',
      `${currentY.toFixed(3)}px`
    );
  }

  function resetBackground() {
    targetX = 0;
    targetY = 0;
    currentX = 0;
    currentY = 0;

    updateBackground();
  }

  function shouldAnimate() {
    return (
      visible &&
      !document.hidden &&
      !reducedMotion.matches
    );
  }

  function tick(time) {
    frameId = null;

    if (!shouldAnimate()) return;

    const elapsed = lastTime
      ? Math.min(64, time - lastTime)
      : 16.67;

    lastTime = time;

    const smoothing = 1 - Math.exp(-elapsed / 150);

    currentX += (targetX - currentX) * smoothing;
    currentY += (targetY - currentY) * smoothing;

    updateBackground();

    if (time - lastNoiseTime >= noiseInterval) {
      drawNoise();
      lastNoiseTime = time;
    }

    frameId = requestAnimationFrame(tick);
  }

  function syncAnimation() {
    if (!shouldAnimate()) {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }

      lastTime = 0;

      if (reducedMotion.matches) {
        resetBackground();
      }

      return;
    }

    if (frameId === null) {
      lastTime = 0;
      lastNoiseTime = 0;
      frameId = requestAnimationFrame(tick);
    }
  }

  section.addEventListener('pointermove', event => {
    if (
      reducedMotion.matches ||
      !finePointer.matches ||
      event.pointerType === 'touch'
    ) {
      return;
    }

    const bounds = section.getBoundingClientRect();

    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    targetX = (x - 0.5) * -14;
    targetY = (y - 0.5) * -10;
  }, {
    passive: true
  });

  section.addEventListener('pointerleave', () => {
    targetX = 0;
    targetY = 0;
  });

  resize();

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(section);
  } else {
    window.addEventListener('resize', resize);
  }

  if ('IntersectionObserver' in window) {
    const visibilityObserver = new IntersectionObserver(
      entries => {
        visible = entries[0].isIntersecting;
        syncAnimation();
      },
      {
        threshold: 0
      }
    );

    visibilityObserver.observe(section);
  } else {
    visible = true;
  }

  document.addEventListener(
    'visibilitychange',
    syncAnimation
  );

  function handleMotionChange() {
    resetBackground();
    drawNoise();
    syncAnimation();
  }

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener(
      'change',
      handleMotionChange
    );

    finePointer.addEventListener(
      'change',
      resetBackground
    );
  } else {
    reducedMotion.addListener(handleMotionChange);
    finePointer.addListener(resetBackground);
  }

  syncAnimation();
})();