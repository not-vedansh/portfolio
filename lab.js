(() => {
  const monitor = document.querySelector("#lab-monitor");
  let canvas = document.querySelector("#shader-output");
  const image = monitor.querySelector("img");
  const compare = document.querySelector("#compare");
  const intensity = document.querySelector("#intensity");
  const controls = document.querySelector(".lab-controls");
  const status = document.querySelector("#engine-status");
  const keys = ["grade", "glow", "scan", "aberration"];
  const passes = keys.map((key) => document.getElementById(key));
  const presets = {
    green: { rgb: [0.48, 1.27, 0.69], tint: "#50f18d", flags: [1, 1, 1, 0] },
    amber: { rgb: [1.36, 0.69, 0.26], tint: "#ff8a33", flags: [1, 1, 0, 0] },
    cold: { rgb: [0.57, 0.81, 1.38], tint: "#7093ff", flags: [1, 0, 1, 1] }
  };
  let renderEffects;
  let queued = false;

  function webgl() {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return null;
    const program = gl.createProgram();
    const sources = [
      [gl.VERTEX_SHADER, `
        attribute vec2 position;
        varying vec2 uv;
        void main() {
          uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
          gl_Position = vec4(position, 0., 1.);
        }`],
      [gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D scene;
        uniform vec3 tint;
        uniform vec4 enabled;
        uniform float amount;
        uniform vec2 pixel;
        vec3 bright(vec2 offset) {
          return max(texture2D(scene, uv + offset).rgb - .38, 0.);
        }
        void main() {
          vec3 base = texture2D(scene, uv).rgb;
          vec2 shift = (uv - .5) * .028 * amount * enabled.w;
          vec3 color = vec3(texture2D(scene, uv + shift).r, base.g, texture2D(scene, uv - shift).b);
          float luma = dot(color, vec3(.2126, .7152, .0722));
          vec3 graded = pow(vec3(luma), vec3(.77)) * tint;
          color = mix(color, graded, enabled.x * amount);
          vec2 spread = pixel * 13.;
          vec3 halo = bright(vec2(spread.x, 0.)) + bright(vec2(-spread.x, 0.))
                    + bright(vec2(0., spread.y)) + bright(vec2(0., -spread.y))
                    + bright(spread) + bright(-spread);
          color += halo * .49 * amount * enabled.y;
          float lines = mix(.72, 1., step(1., mod(gl_FragCoord.y, 4.)));
          color *= mix(1., lines, amount * enabled.z);
          gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
        }`]
    ];
    for (const [kind, code] of sources) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, code);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const uniforms = Object.fromEntries(["tint", "enabled", "amount", "pixel"].map((name) => [name, gl.getUniformLocation(program, name)]));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pixel, 1 / canvas.width, 1 / canvas.height);
    return (preset, flags, amount) => {
      gl.uniform3fv(uniforms.tint, preset.rgb);
      gl.uniform4fv(uniforms.enabled, flags);
      gl.uniform1f(uniforms.amount, amount);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  function useFallback() {
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    const { width, height } = canvas;
    return (preset, [grade, glow, scan, split], amount) => {
      ctx.save();
      ctx.drawImage(image, 0, 0, width, height);
      if (grade) {
        ctx.globalCompositeOperation = "color";
        ctx.globalAlpha = amount;
        ctx.fillStyle = preset.tint;
        ctx.fillRect(0, 0, width, height);
      }
      if (glow || split) {
        ctx.globalCompositeOperation = "screen";
        if (glow) {
          ctx.globalAlpha = amount * .48;
          ctx.filter = "contrast(155%) brightness(85%) blur(7px)";
          ctx.drawImage(image, 0, 0, width, height);
        }
        if (split) {
          ctx.globalAlpha = amount * .26;
          ctx.filter = "grayscale(1) sepia(1) saturate(3)";
          ctx.drawImage(image, amount * 9, 0, width, height);
          ctx.filter = "grayscale(1) sepia(1) saturate(3) hue-rotate(158deg)";
          ctx.drawImage(image, -amount * 9, 0, width, height);
        }
        ctx.filter = "none";
      }
      if (scan) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = amount * .31;
        ctx.fillStyle = "#040a06";
        for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
      }
      ctx.restore();
    };
  }

  function draw() {
    queued = false;
    const preset = presets[controls.querySelector("input[name=preset]:checked").value];
    document.querySelector("#intensity-value").textContent = intensity.value + "%";
    renderEffects?.(preset, passes.map((input) => Number(input.checked)), intensity.value / 100);
  }

  function queueDraw() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  }

  function setDivider() {
    monitor.style.setProperty("--split", compare.value + "%");
    document.querySelector("#split-value").textContent = compare.value + "% ORIGINAL";
  }

  function initialize() {
    canvas.width = 960;
    canvas.height = Math.round(960 * image.naturalHeight / image.naturalWidth);
    try { renderEffects = webgl(); } catch { renderEffects = null; }
    status.textContent = renderEffects ? "● LIVE WEBGL SHADER" : "● CANVAS EFFECTS MODE";
    if (!renderEffects) renderEffects = useFallback();
    if (!renderEffects) {
      status.textContent = "EFFECTS UNAVAILABLE";
      canvas.hidden = true;
      return;
    }
    canvas.addEventListener("webglcontextlost", () => {
      renderEffects = useFallback();
      status.textContent = "● CANVAS EFFECTS MODE";
      queueDraw();
    }, { once: true });
    queueDraw();
  }

  compare.addEventListener("input", setDivider);
  controls.addEventListener("input", (event) => {
    if (event.target.name === "preset") {
      const flags = presets[event.target.value].flags;
      passes.forEach((input, i) => { input.checked = Boolean(flags[i]); });
    }
    queueDraw();
  });
  document.querySelector("#reset-lab").addEventListener("click", () => {
    controls.querySelector('input[value="green"]').checked = true;
    passes.forEach((input, i) => { input.checked = Boolean(presets.green.flags[i]); });
    intensity.value = "75";
    compare.value = "50";
    setDivider();
    queueDraw();
  });
  if (image.complete && image.naturalWidth) initialize();
  else image.addEventListener("load", initialize, { once: true });
})();
