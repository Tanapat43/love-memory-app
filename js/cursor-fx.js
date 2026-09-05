/* =========================================================
   Space Love Story — Cursor Hologram FX Module
   ---------------------------------------------------------
   เป้าโฟกัสโฮโลแกรม + หางละอองดาวเรืองแสง (Particle Trail)
   วิ่งตามการเคลื่อนที่ของเมาส์แบบนุ่มนวลด้วย rAF

   สารบัญ
   1. Config & State
   2. Particle Trail (ละอองดาว)
   3. Hologram Reticle (เป้าโฟกัส)
   4. Main Loop & Events
   5. Public API
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Config & State
     ----------------------------------------- */
  const COLORS = ['#7df9ff', '#ff2ec4', '#ffd28a', '#9b5de5'];
  const MAX_MOTES = 70;
  const SPAWN_DISTANCE = 18;
  const RETICLE_LERP = 0.18;

  let reticle = null;
  let dustBox = null;
  let targetX = -100;
  let targetY = -100;
  let posX = -100;
  let posY = -100;
  let pressed = false;
  let rafId = null;
  let lastSpawn = { x: -999, y: -999, t: 0 };

  /* -----------------------------------------
     2. Particle Trail
     ----------------------------------------- */
  function spawnMote(x, y) {
    if (dustBox.children.length >= MAX_MOTES) {
      dustBox.firstElementChild.remove();
    }
    const mote = document.createElement('span');
    const size = (2 + Math.random() * 3.2).toFixed(1);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    mote.className = 'dust-mote';
    mote.style.width = size + 'px';
    mote.style.height = size + 'px';
    mote.style.left = x.toFixed(1) + 'px';
    mote.style.top = y.toFixed(1) + 'px';
    mote.style.background = color;
    mote.style.boxShadow =
      '0 0 ' + (6 + Math.random() * 9).toFixed(0) + 'px ' + color;
    mote.style.setProperty('--dx', (Math.random() * 56 - 28).toFixed(1) + 'px');
    mote.style.setProperty('--dy', (-18 - Math.random() * 46).toFixed(1) + 'px');
    mote.style.setProperty('--life', (0.7 + Math.random() * 0.7).toFixed(2) + 's');
    mote.style.setProperty('--o', (0.5 + Math.random() * 0.4).toFixed(2));
    mote.addEventListener('animationend', () => mote.remove());

    dustBox.appendChild(mote);
  }

  function trySpawnMote(x, y) {
    const now = performance.now();
    const dist = Math.hypot(x - lastSpawn.x, y - lastSpawn.y);
    if (dist < SPAWN_DISTANCE && now - lastSpawn.t < 60) return;
    lastSpawn = { x: x, y: y, t: now };
    spawnMote(x, y);
  }

  /* -----------------------------------------
     3. Hologram Reticle
     ----------------------------------------- */
  function applyReticleTransform() {
    const scale = pressed ? 0.72 : 1;
    reticle.style.transform =
      'translate(' + posX.toFixed(1) + 'px, ' + posY.toFixed(1) + 'px)' +
      ' scale(' + scale + ')';
  }

  /* -----------------------------------------
     4. Main Loop & Events
     ----------------------------------------- */
  function loop() {
    posX += (targetX - posX) * RETICLE_LERP;
    posY += (targetY - posY) * RETICLE_LERP;
    applyReticleTransform();
    rafId = requestAnimationFrame(loop);
  }

  function onPointerMove(e) {
    targetX = e.clientX;
    targetY = e.clientY;
    reticle.classList.remove('is-hidden');
    trySpawnMote(e.clientX, e.clientY);
  }

  function onPointerDown() {
    pressed = true;
  }

  function onPointerUp() {
    pressed = false;
  }

  function onPointerOut(e) {
    if (!e.relatedTarget) {
      reticle.classList.add('is-hidden'); // เมาส์ออกนอกหน้าต่าง
    }
  }

  function createElements() {
    dustBox = document.createElement('div');
    dustBox.className = 'cursor-dust';
    dustBox.setAttribute('aria-hidden', 'true');

    reticle = document.createElement('div');
    reticle.className = 'cursor-reticle is-hidden';
    reticle.setAttribute('aria-hidden', 'true');

    document.body.appendChild(dustBox);
    document.body.appendChild(reticle);
  }

  function init() {
    // ข้ามบนจอสัมผัสและผู้ใช้ที่ตั้งค่าลดแอนิเมชัน
    if (window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    createElements();
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointerout', onPointerOut);
    rafId = requestAnimationFrame(loop);
  }

  /* -----------------------------------------
     5. Public API
     ----------------------------------------- */
  App.CursorFX = {
    init: init,
    stop: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
})(window.SpaceLove);