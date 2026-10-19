// The 3D cube: meshes, turn animation, turn arrows, cameras, previews and drag-to-inspect.
// three.js is loaded as a global (THREE) by index.html.
import * as Cube from './cube.js';

const THREE = window.THREE;

export const FACE_NAME = { U: 'top', D: 'bottom', F: 'front', B: 'back', R: 'right', L: 'left' };

// Camera views: the 8 corners of the cube, named by the three faces they show.
export const VIEWS = [];
for (const sy of [1, -1]) for (const sz of [1, -1]) for (const sx of [1, -1]) {
  VIEWS.push({ id: (sy > 0 ? 'U' : 'D') + (sz > 0 ? 'F' : 'B') + (sx > 0 ? 'R' : 'L'), pos: [sx * 5.4, sy * 5.2, sz * 8] });
}
export const viewById = (id) => VIEWS.find((v) => v.id === id) || VIEWS[0];
const opposite = (v) => VIEWS.find((x) => x.pos.every((n, i) => n === -v.pos[i]));

const STICKER_HEX = { W: 0xf2f2ee, Y: 0xffd23f, R: 0xe5383b, O: 0xff8a1f, G: 0x2bb673, B: 0x2f6fde };
const TURN_MS = 110, FAST_TURN_MS = 60, ARROW_MS = 550;

function roundedSquare(half, radius) {
  const s = new THREE.Shape(), h = half, r = radius;
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  return new THREE.ShapeGeometry(s);
}

export function createScene({ stage, canvas, mirrorBox, mirrorLabel, onFrame, onSwipe }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const root = new THREE.Group();
  scene.add(root);
  const camMain = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const camMirror = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  let mirrorOn = true, accent = '#7fb4d9';

  // Cubies
  const stickerGeo = roundedSquare(0.42, 0.1);
  const boxGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
  const boxMat = new THREE.MeshBasicMaterial({ color: 0x1b1c1e });
  const stickerMats = {};
  for (const k in STICKER_HEX) stickerMats[k] = new THREE.MeshBasicMaterial({ color: STICKER_HEX[k], side: THREE.DoubleSide });
  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if (!x && !y && !z) continue;
    const g = new THREE.Group();
    g.add(new THREE.Mesh(boxGeo, boxMat));
    for (const f in Cube.FACES) {
      const d = Cube.FACES[f];
      if (d[0] * x + d[1] * y + d[2] * z !== 1) continue;
      const s = new THREE.Mesh(stickerGeo, stickerMats[Cube.COLOR_OF[f]]);
      s.position.set(d[0] * 0.495, d[1] * 0.495, d[2] * 0.495);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...d));
      g.add(s);
    }
    g.userData.home = [x, y, z];
    g.position.set(x, y, z);
    root.add(g);
    cubies.push(g);
  }

  // Turn animation
  const queue = [];
  let anim = null;
  const gridPos = (c) => [Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)];
  function snap(c) {
    c.position.set(...gridPos(c));
    const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion);
    for (let i = 0; i < 16; i++) m.elements[i] = Math.round(m.elements[i]);
    c.quaternion.setFromRotationMatrix(m);
  }
  function startTurn(tok, ms) {
    const spec = Cube.moveSpec(tok);
    const pivot = new THREE.Group();
    root.add(pivot);
    const sel = cubies.filter((c) => spec.sel(gridPos(c)));
    sel.forEach((c) => pivot.attach(c));
    anim = { pivot, sel, axis: new THREE.Vector3(...spec.d), angle: -spec.s * spec.turns * Math.PI / 2, t0: performance.now(), ms };
    if (ms) spawnArrow(spec, tok);
  }
  function finishTurn() {
    anim.pivot.quaternion.setFromAxisAngle(anim.axis, anim.angle);
    anim.pivot.updateMatrixWorld(true);
    anim.sel.forEach((c) => { root.attach(c); snap(c); });
    root.remove(anim.pivot);
    anim = null;
  }
  function flush() { while (anim || queue.length) { if (!anim) startTurn(queue.shift(), 0); finishTurn(); } }

  // A curved arrow on the turning layer that fades out, showing the direction.
  const arrows = [];
  function spawnArrow(spec, tok) {
    const whole = /^[xyz]/.test(tok), slice = /^[MES]/.test(tok);
    const radius = whole ? 1.95 : slice ? 1.8 : 0.95, arc = Math.PI * 1.3;
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent), transparent: true, opacity: 0.95 });
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 8, 48, arc), mat));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 14), mat);
    head.position.set(radius * Math.cos(arc), radius * Math.sin(arc), 0);
    head.rotation.z = arc;
    g.add(head);
    // The torus runs counter-clockwise seen from outside; mirror it for clockwise turns.
    if (spec.s === 1) g.scale.x = -1;
    const out = new THREE.Vector3(...spec.d);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
    if (!whole && !slice) g.position.copy(out).multiplyScalar(1.56);
    root.add(g);
    arrows.push({ g, mat, t0: performance.now() });
  }
  function fadeArrows(now) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i], age = (now - a.t0) / ARROW_MS;
      if (age < 1) { a.mat.opacity = 0.95 * (1 - age * age); continue; }
      root.remove(a.g);
      a.g.children.forEach((m) => m.geometry.dispose());
      a.mat.dispose();
      arrows.splice(i, 1);
    }
  }

  // Swipes turn the whole cube. Horizontal = y, vertical = x, and shift-drag or a
  // two-finger swipe = z. While dragging the cube leans a little toward the turn.
  const SWIPE_PX = 36, LEAN = 0.35;
  const view = new THREE.Quaternion(), tmpQ = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0), RIGHT = new THREE.Vector3(1, 0, 0), OUT = new THREE.Vector3(0, 0, 1);
  const pointers = new Map();
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, e);
    if (!drag) drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, z: e.shiftKey };
    if (pointers.size > 1) drag.z = true;
    try { stage.setPointerCapture(e.pointerId); } catch {}
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    const lean = (px) => Math.max(-LEAN, Math.min(LEAN, px / 160));
    if (drag.z) view.setFromAxisAngle(OUT, -lean(drag.dx));
    else if (Math.abs(drag.dx) > Math.abs(drag.dy)) view.setFromAxisAngle(UP, lean(drag.dx));
    else view.setFromAxisAngle(RIGHT, lean(drag.dy));
  });
  function endDrag(e) {
    pointers.delete(e.pointerId);
    if (!drag || pointers.size) return;
    const { dx, dy, z } = drag;
    drag = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX || !onSwipe) return;
    if (z) onSwipe(dx > 0 ? 'z' : "z'");
    else if (Math.abs(dx) > Math.abs(dy)) onSwipe(dx > 0 ? "y'" : 'y'); // drag right: the front face follows to the right
    else onSwipe(dy < 0 ? 'x' : "x'");                                  // drag up: the front face goes up
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Sizing and rendering
  const mirrorSize = (w, h) => Math.round(Math.min(w, h) * (w < 640 ? 0.3 : 0.34));
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camMain.aspect = w / h;
    camMain.zoom = Math.min(1, camMain.aspect / 1.6); // narrow screens: zoom out to fit
    camMain.updateProjectionMatrix();
    mirrorBox.style.width = mirrorBox.style.height = mirrorSize(w, h) + 'px';
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  function render() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    renderer.render(scene, camMain);
    if (!mirrorOn) return;
    const m = mirrorSize(w, h);
    renderer.setViewport(w - m, 0, m, m); renderer.setScissor(w - m, 0, m, m);
    renderer.clear();
    renderer.render(scene, camMirror);
  }

  let slideT0 = -1e9, pulseT0 = -1e9;
  function frame(now) {
    if (anim && queue.length > 1) finishTurn(); // typing faster than the animation: skip ahead
    if (!anim && queue.length) startTurn(queue.shift(), queue.length ? FAST_TURN_MS : TURN_MS);
    if (anim) {
      const t = anim.ms ? Math.min(1, (now - anim.t0) / anim.ms) : 1;
      anim.pivot.quaternion.setFromAxisAngle(anim.axis, anim.angle * (1 - (1 - t) ** 3));
      if (t >= 1) finishTurn();
    }
    fadeArrows(now);
    const st = (now - slideT0) / 260;
    root.position.x = st < 1 ? 6 * (1 - st) ** 3 : 0;
    if (!drag) view.slerp(tmpQ.identity(), 0.2);
    root.quaternion.copy(view);
    const pt = (now - pulseT0) / 300;
    root.scale.setScalar(pt < 1 ? 1 + 0.08 * Math.sin(pt * Math.PI) : 1);
    if (onFrame) onFrame();
    render();
    requestAnimationFrame(frame);
  }

  // Preview thumbnails use their own small renderer.
  let thumbRenderer = null;
  function drawThumbs(canvases) {
    try { thumbRenderer = thumbRenderer || new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return; }
    thumbRenderer.setPixelRatio(1);
    thumbRenderer.setSize(120, 120, false);
    thumbRenderer.setClearColor(0x000000, 0);
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const keepQ = root.quaternion.clone(), keepX = root.position.x;
    root.quaternion.identity(); root.position.x = 0;
    for (const v of VIEWS) {
      cam.position.set(...v.pos); cam.lookAt(0, 0, 0);
      thumbRenderer.render(scene, cam);
      const ctx = canvases[v.id].getContext('2d');
      ctx.clearRect(0, 0, 120, 120);
      ctx.drawImage(thumbRenderer.domElement, 0, 0, 120, 120);
    }
    root.quaternion.copy(keepQ); root.position.x = keepX;
  }

  resize();
  requestAnimationFrame(frame);

  return {
    turn: (tok) => queue.push(tok),
    // Show a position instantly: reset to solved, then apply the moves without animation.
    setPosition(toks, slide) {
      flush();
      for (const c of cubies) { c.position.set(...c.userData.home); c.quaternion.identity(); }
      for (const t of toks) { startTurn(t, 0); finishTurn(); }
      if (slide) slideT0 = performance.now();
    },
    pulse() { pulseT0 = performance.now(); },
    setAccent(hex) { accent = hex; },
    setView(mainId, mirror) {
      const v = viewById(mainId);
      camMain.position.set(...v.pos); camMain.lookAt(0, 0, 0); camMain.updateMatrixWorld();
      const mv = mirror === 'off' ? null : mirror === 'auto' ? opposite(v) : viewById(mirror);
      mirrorOn = !!mv;
      mirrorBox.hidden = !mv;
      if (mv) {
        camMirror.position.set(...mv.pos); camMirror.lookAt(0, 0, 0);
        mirrorLabel.textContent = mv.id.split('').map((f) => FACE_NAME[f]).join(' · ');
      }
      view.identity();
    },
    // Where each face points on screen in the main view (through a square copy of the camera,
    // so the answer doesn't depend on window size).
    faceDirections() {
      const ref = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
      ref.position.copy(camMain.position); ref.lookAt(0, 0, 0); ref.updateMatrixWorld();
      const o = new THREE.Vector3().project(ref), camDir = camMain.position.clone().normalize();
      return Object.entries(Cube.FACES).map(([face, d]) => {
        const p = new THREE.Vector3(...d).multiplyScalar(1.5).project(ref);
        return { face, angle: Math.atan2(p.y - o.y, p.x - o.x), mag: Math.hypot(p.x - o.x, p.y - o.y), visible: new THREE.Vector3(...d).dot(camDir) > 0 };
      });
    },
    drawThumbs,
    // Debug: stickers where the 3D view disagrees with a logic state (should be 0).
    mismatches(state) {
      flush();
      const colorOf = new Map(Object.entries(stickerMats).map(([k, m]) => [m, k]));
      const logic = new Map(state.map((k) => [k.p.join() + '|' + k.n.join(), k.c]));
      let bad = 0;
      for (const c of cubies) for (const s of c.children) {
        if (!colorOf.has(s.material)) continue;
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(s.quaternion).applyQuaternion(c.quaternion);
        if (logic.get(gridPos(c).join() + '|' + [n.x, n.y, n.z].map(Math.round).join()) !== colorOf.get(s.material)) bad++;
      }
      return bad;
    },
  };
}
