(() => {
  const track = document.getElementById('expTrack');
  if (!track) return;

  const title  = track.querySelector('.exp-title');
  const img    = title.querySelector('img');
  const slides = [...track.querySelectorAll('.exp-slide')];
  const dotsEl = track.querySelector('.exp-dots');
  const N = slides.length;

  track.style.setProperty('--slides', N);

  /* ---- find where the lettering really starts and ends inside the PNG ---- */
  let top = null, bottom = null;           // as fractions of the image height

  function measure() {
    try {
      const w = 600;
      const h = Math.round(w * img.naturalHeight / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;

      let first = -1, last = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (d[i + 3] > 40 && lum > 50) {   // visible, not near-black
            if (first < 0) first = y;
            last = y;
            break;
          }
        }
      }
      if (first >= 0) { top = first / h; bottom = (last + 1) / h; }
    } catch (e) {
      top = bottom = null;                  // file:// taints the canvas, CSS fallback is used
    }
  }

  function fit() {
    if (top !== null) {
      const H = img.clientHeight;
      img.style.marginTop = (-top * H) + 'px';
      img.style.marginBottom = '0';
      title.style.height = ((bottom - top) * H) + 'px';
    }
    track.style.setProperty('--title-h', (title.offsetTop + title.offsetHeight) + 'px');
  }

  /* ---- slides ---- */
  const dots = slides.map(() => {
    const d = document.createElement('span');
    dotsEl.appendChild(d);
    return d;
  });

  let current = -1;

  function show(i) {
    if (i === current) return;
    current = i;
    slides.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      s.classList.toggle('is-past', k < i);
      dots[k].classList.toggle('on', k === i);
    });
  }

  function update() {
    const rect  = track.getBoundingClientRect();
    const range = track.offsetHeight - window.innerHeight;
    const p     = Math.min(Math.max(-rect.top / range, 0), 0.9999);
    show(Math.floor(p * N));
  }

  function init() { measure(); fit(); update(); }

  if (img.complete && img.naturalWidth) init();
  else img.addEventListener('load', init);

  window.addEventListener('resize', () => { fit(); update(); });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  update();
})();