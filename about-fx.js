(() => {
  const section = document.getElementById('about');
  const card = document.getElementById('aboutCard');
  const img = document.getElementById('aboutName');
  if (!section || !card || !img) return;

  const text = card.querySelector('.about-text');

  // ---- 1. wrap every plain word so each one can warm up on hover ----
  function wrapWords(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.append(part);
          } else {
            const s = document.createElement('span');
            s.className = 'w';
            s.textContent = part;
            frag.append(s);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('kw')) {
        wrapWords(child);
      }
    }
  }
  if (text) wrapWords(text);

  // ---- 2. keyword hover / focus swaps the background ----
  const setBg = (name) => {
    if (name) section.dataset.bg = name;
    else delete section.dataset.bg;
  };

  section.querySelectorAll('.kw').forEach((kw) => {
    kw.addEventListener('mouseenter', () => setBg(kw.dataset.bg));
    kw.addEventListener('mouseleave', () => setBg(null));
    kw.addEventListener('focus', () => setBg(kw.dataset.bg));
    kw.addEventListener('blur', () => setBg(null));
  });
  section.addEventListener('mouseleave', () => setBg(null));

  // ---- everything below needs a real mouse ----
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 3. alpha map of the name image, for pixel-accurate hover ----
  let map = null, mw = 0, mh = 0;

  function buildMap() {
    try {
      mw = Math.min(900, img.naturalWidth);
      mh = Math.round(mw * img.naturalHeight / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = mw; c.height = mh;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, mw, mh);
      map = ctx.getImageData(0, 0, mw, mh).data;
    } catch (e) {
      map = null; // opened from file:// -> run a local server
      console.warn('about-fx: cannot read image pixels (use a local server).', e);
    }
  }

  if (img.complete && img.naturalWidth) buildMap();
  else img.addEventListener('load', buildMap);

  function onLetter(cx, cy) {
    const r = img.getBoundingClientRect();
    const x = (cx - r.left) / r.width;
    const y = (cy - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1 || !map) return false;
    const px = Math.min(mw - 1, Math.floor(x * mw));
    const py = Math.min(mh - 1, Math.floor(y * mh));
    return map[(py * mw + px) * 4 + 3] > 40; // alpha threshold
  }

  // ---- 4. parallax (smooth follow) ----
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

  function loop() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    section.style.setProperty('--px', cx.toFixed(4));
    section.style.setProperty('--py', cy.toFixed(4));
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  }

  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  section.addEventListener('mousemove', (e) => {
    if (!reduced) {
      const r = section.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    }
    card.classList.toggle('is-hot', onLetter(e.clientX, e.clientY));
  });

  section.addEventListener('mouseleave', () => {
    tx = 0; ty = 0; kick();
    card.classList.remove('is-hot');
  });
})();