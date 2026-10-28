(() => {
  const hero = document.getElementById('home');
  const canvas = document.getElementById('heroFx');
  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) return;

  // ---- settings you can tweak ----
  const FISHEYE = 0.14;   // lens curvature: 0 = flat, 0.3 = strong
  const STATIC  = 0.05;   // constant static (0-1)
  const BURST   = 0.12;   // extra static during glitches
  const SCAN    = 0.04;   // scanline strength
  const AMBIENT = 0.45;   // brightness of the blurred area around the lens
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vs = `
    attribute vec2 p;
    void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const fs = `
    precision mediump float;
    uniform sampler2D tex;   // sharp image
    uniform sampler2D amb;   // tiny blurred copy
    uniform vec2  res;
    uniform vec2  vis;
    uniform vec2  off;
    uniform float time, k, stat, burst, scan, ambient;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main(){
      vec2 uv = vec2(gl_FragCoord.x / res.x, 1.0 - gl_FragCoord.y / res.y);

      // ambient fill: same picture, blurred and dimmed
      vec3 bg = texture2D(amb, off + uv * vis).rgb * ambient;

      // fisheye lens
      vec2 c = uv * 2.0 - 1.0;
      float r2 = dot(c, c);
      c *= 1.0 + k * r2;
      vec2 d = c * 0.5 + 0.5;

      // glitch: horizontal tearing
      float t = floor(time * 24.0);
      float g = step(0.975, hash(vec2(t, 1.0)));
      d.x += g * (hash(vec2(floor(d.y * 40.0), t)) - 0.5) * 0.02;

      vec3 sharp = texture2D(tex, off + clamp(d, 0.0, 1.0) * vis).rgb;

      // inside-lens mask with a soft edge (negative m = outside)
      float m = min(min(d.x, 1.0 - d.x), min(d.y, 1.0 - d.y));
      float mask = smoothstep(0.0, 0.006, m);
      vec3 col = mix(bg, sharp, mask);

      // faint glowing rim along the lens edge
      col += vec3(0.35, 0.5, 0.55) * smoothstep(0.012, 0.0, abs(m)) * 0.06;

      // static
      float n = hash(gl_FragCoord.xy + t * 17.0);
      col = mix(col, vec3(n), stat + g * burst);

      // smooth scanlines (4px period) + gentle vignette
      col *= 1.0 - scan * (0.5 + 0.5 * sin(gl_FragCoord.y * 1.5708));
      col *= 1.0 - 0.25 * r2 * 0.5;

      gl_FragColor = vec4(col, 1.0);
    }`;

  function sh(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const u = { res:U('res'), vis:U('vis'), off:U('off'), time:U('time'),
              k:U('k'), stat:U('stat'), burst:U('burst'), scan:U('scan'),
              ambient:U('ambient'), tex:U('tex'), amb:U('amb') };

  function makeTexture(unit, source){
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  // shrink by halves down to ~48px wide; GPU upscaling makes it a soft blur
  function tinyCopy(image){
    let w = image.width, h = image.height, src = image;
    while (w > 48) {
      w = Math.max(48, w >> 1);
      h = Math.max(1, Math.round(h / 2));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(src, 0, 0, w, h);
      src = c;
    }
    return src;
  }

  const img = new Image();
  img.src = 'Images/heroImg.png';
  img.onload = () => {
    makeTexture(0, img);
    makeTexture(1, tinyCopy(img));
    gl.uniform1i(u.tex, 0);
    gl.uniform1i(u.amb, 1);

    hero.classList.add('fx-on');
    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(frame);
  };

  // mimics: background: center 30% / cover (62% x on phones)
  function resize(){
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const ca = w / h, ia = img.width / img.height;
    const vis = ca > ia ? [1, ia / ca] : [ca / ia, 1];
    const px = innerWidth <= 600 ? 0.62 : 0.5, py = 0.3;

    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform2f(u.vis, vis[0], vis[1]);
    gl.uniform2f(u.off, (1 - vis[0]) * px, (1 - vis[1]) * py);
    if (reduced) draw(0);
  }

  function draw(t){
    gl.uniform1f(u.time, t);
    gl.uniform1f(u.k, FISHEYE);
    gl.uniform1f(u.stat, reduced ? 0.02 : STATIC);
    gl.uniform1f(u.burst, reduced ? 0 : BURST);
    gl.uniform1f(u.scan, SCAN);
    gl.uniform1f(u.ambient, AMBIENT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(ms){
    if (reduced) return;
    draw(ms / 1000);
    requestAnimationFrame(frame);
  }
})();