/* =========================================================
   Space Love Story — 3D Gallery Module
   ---------------------------------------------------------
   การ์ดรูปแบบแผ่นกระจกเรียงเป็นวงกลม 3D ลอยกลางอวกาศ
   หมุนได้จากปุ่ม / จุดนำทาง / การลากเมาส์ / ปัดหน้าจอ
   พร้อมเอฟเฟกต์ Tilt ตามเมาส์ + วงแหวนฮอโลแกรม + ฝุ่นดาวโคจร

   สารบัญ
   1. Config & Captions
   2. Card Factory (กระจก + วงแหวน + ฝุ่นดาวโคจร)
   3. Carousel Engine (มุม / รัศมี / เรนเดอร์ / สแนป)
   4. 3D Tilt Effect
   5. Controls (ปุ่ม / จุด / คีย์บอร์ด / ลาก / Auto-rotate)
   6. Public API (build / goTo / next / prev)
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Config & Captions
     ----------------------------------------- */
  const CONFIG = {
    GAP: 70,                // ระยะห่างขอบการ์ดในวง (px)
    MIN_RADIUS: 300,        // รัศมีวงน้อยที่สุด (px)
    MAX_RADIUS: 560,        // รัศมีวงมากที่สุด (px)
    TILT_MAX: 10,           // องศาเอียงสูงสุดของการ์ด
    DRAG_SENSITIVITY: 0.22, // ความไวการลาก (องศา/พิกเซล)
    SNAP_MS: 650,           // เวลา transition ตอนสแนปเข้าการ์ด
    AUTO_ROTATE_MS: 4200,   // รอบการหมุนอัตโนมัติ
    AUTO_RESUME_MS: 2600,   // หน่วงก่อนกลับมาหมุนอัตโนมัติ
    ENTER_STAGGER: 90,      // ระยะห่างของการ์ดตอนเปิดฉาก (ms)
    ORBIT_DOT_COUNT: 3,     // จำนวนฝุ่นดาวโคจรต่อการ์ด
  };

  // คำโปรยสั้นๆ ใต้รูป (วนซ้ำตามจำนวนรูป)
  const CAPTIONS = [
    '⭐ ความทรงจำของเรา',
    '🌙 อยู่ด้วยกันทุกวัน',
    '🌌 รักกว้างเท่าจักรวาล',
    '✨ โมเมนต์ที่ดีที่สุด',
    '🪐 เธอคือที่สุด',
    '🚀 เดินทางไปด้วยกัน',
    '💫 ดาวดวงของฉัน',
    '☄️ วันที่แสนวิเศษ',
    '🛸 ผจญภัยด้วยกัน',
    '🔭 ก้าวต่อไปด้วยกัน',
  ];

  const ORBIT_COLORS = ['#7df9ff', '#ff2ec4', '#ffd28a', '#9b5de5'];

  const els = {
    section: null,
    stage: null,
    viewport: null,
    dots: null,
    prevBtn: null,
    nextBtn: null,
  };

  const carousel = {
    cards: [],
    count: 0,
    active: 0,
    step: 60,
    radius: 320,
    rotation: 0,
    ready: false,
    dragging: false,
    autoTimer: null,
    resumeTimer: null,
  };

  let uiSignal = null; // AbortController ควบคุม listener ทั้งหมดของโมดูล


  /* -----------------------------------------
     2. Card Factory
     ----------------------------------------- */

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  // สร้างฝุ่นดาวโคจรรอบการ์ด (รัศมี/ความเร็ว/สี สุ่มไม่ซ้ำกัน)
  function createOrbitDots(card) {
    for (let i = 0; i < CONFIG.ORBIT_DOT_COUNT; i++) {
      const path = document.createElement('span');
      path.className = 'orbit-path';
      path.style.setProperty('--orbit-r', Math.round(118 + Math.random() * 64) + 'px');
      path.style.setProperty('--orbit-y', Math.round(Math.random() * 60 - 30) + 'px');
      path.style.setProperty('--orbit-speed', (7 + Math.random() * 7).toFixed(1) + 's');
      path.style.animationDelay = '-' + (Math.random() * 12).toFixed(2) + 's';

      const dot = document.createElement('span');
      dot.className = 'orbit-dot';
      const color = ORBIT_COLORS[Math.floor(Math.random() * ORBIT_COLORS.length)];
      dot.style.setProperty('--dot-size', (4 + Math.random() * 4).toFixed(1) + 'px');
      dot.style.setProperty('--dot-color', color);

      path.appendChild(dot);
      card.appendChild(path);
    }
  }

  // สร้างการ์ดกระจก 1 ใบ: วงแหวนฮอโลแกรม + ชั้น Tilt + กรอบรูป + แสงวาบ
  function createCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'carousel-card';
    card.dataset.index = String(index);
    card.innerHTML = [
      '<div class="holo-ring ring-a" aria-hidden="true"></div>',
      '<div class="holo-ring ring-b" aria-hidden="true"></div>',
      '<div class="holo-base" aria-hidden="true"></div>',
      '<div class="tilt-layer">',
      '  <div class="glass-frame">',
      '    <span class="card-num">' + pad2(index + 1) + '</span>',
      '    <figure class="card-photo">',
      '      <img src="' + photo + '" alt="ความทรงจำที่ ' + (index + 1) + '" draggable="false" />',
      '      <figcaption class="card-caption">',
      '        ' + CAPTIONS[index % CAPTIONS.length],
      '      </figcaption>',
      '    </figure>',
      '  </div>',
      '  <div class="card-glare" aria-hidden="true"></div>',
      '</div>',
    ].join('\n');

    createOrbitDots(card);
    return card;
  }

  /* -----------------------------------------
     3. Carousel Engine
     ----------------------------------------- */

  // คำนวณรัศมีวงให้การ์ดไม่ทับกัน ตามจำนวนรูปและขนาดการ์ดจริง
  function computeLayout() {
    const count = Math.max(carousel.count, 1);
    const firstCard = carousel.cards[0];
    const cardW =
      firstCard && firstCard.offsetWidth > 0 ? firstCard.offsetWidth : 250;
    const ideal = (count * (cardW + CONFIG.GAP)) / (2 * Math.PI);
    carousel.radius = Math.round(
      Math.min(CONFIG.MAX_RADIUS, Math.max(CONFIG.MIN_RADIUS, ideal))
    );
    carousel.step = 360 / count;
  }

  // วางการ์ดทุกใบบนวงกลม 3D (ตำแหน่งเป็นมุมบนวง + รัศมี)
  function renderCards() {
    carousel.cards.forEach((card, i) => {
      const angle = carousel.step * i;
      card.style.transform =
        'rotateY(' + angle + 'deg) translateZ(' + carousel.radius + 'px)';
    });
  }

  // หมุน viewport ทั้งวงไปยังมุมปัจจุบัน
  function applyRotation() {
    els.viewport.style.transform = 'rotateY(' + carousel.rotation + 'deg)';
  }

  // มุมที่สั้นที่สุดจาก from ไป to (อยู่ในช่วง -180..180 องศา)
  function shortestDelta(from, to) {
    let delta = (to - from) % 360;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }

  // จัด index ให้อยู่ในช่วง 0..count-1 (รองรับค่าติดลบด้วย)
  function normalizeIndex(index) {
    const n = carousel.count;
    return ((index % n) + n) % n;
  }

  // อัปเดตสถานะการ์ด active + จุดนำทางให้ตรงกัน
  function setActive(index) {
    carousel.active = normalizeIndex(index);
    carousel.cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === carousel.active);
    });
    Array.from(els.dots.children).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === carousel.active);
    });
  }

  // หมุนวงไปยังการ์ดลำดับ index โดยเลือกเส้นทางที่สั้นที่สุด
  function goTo(index) {
    if (!carousel.ready || carousel.dragging) return;
    const target = -carousel.step * normalizeIndex(index);
    carousel.rotation += shortestDelta(carousel.rotation, target);
    applyRotation();
    setActive(index);
  }

  function next() {
    goTo(carousel.active + 1);
  }

  function prev() {
    goTo(carousel.active - 1);
  }

  /* -----------------------------------------
     4. 3D Tilt Effect (เอียงตามเมาส์นุ่มนวลด้วย rAF)
     ----------------------------------------- */

  function attachTilt(card) {
    const layer = card.querySelector('.tilt-layer');
    const glare = card.querySelector('.card-glare');
    const state = { targetX: 0, targetY: 0, x: 0, y: 0, raf: null };

    // วน rAF ไล่ค่าแบบ lerp เพื่อให้การ์ดเอียงอย่างนุ่มนวล
    function step() {
      state.x += (state.targetX - state.x) * 0.14;
      state.y += (state.targetY - state.y) * 0.14;
      layer.style.transform =
        'rotateX(' + state.y.toFixed(2) + 'deg) rotateY(' +
        state.x.toFixed(2) + 'deg)';
      const done =
        Math.abs(state.targetX - state.x) < 0.05 &&
        Math.abs(state.targetY - state.y) < 0.05;
      state.raf = done ? null : requestAnimationFrame(step);
    }

    function kick() {
      if (state.raf === null) state.raf = requestAnimationFrame(step);
    }

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      state.targetX = (px - 0.5) * 2 * CONFIG.TILT_MAX;
      state.targetY = (0.5 - py) * 2 * CONFIG.TILT_MAX;
      if (glare) {
        glare.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        glare.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      }
      kick();
    });

    card.addEventListener('pointerleave', () => {
      state.targetX = 0;
      state.targetY = 0;
      kick();
    });
  }

  /* -----------------------------------------
     5. Controls (ปุ่ม / จุด / คีย์บอร์ด / ลาก / Auto-rotate)
     ----------------------------------------- */

  let resizeTimer = null;

  function buildDots(count) {
    els.dots.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', 'ไปที่รูปที่ ' + (i + 1));
      dot.addEventListener('click', () => {
        goTo(i);
        restartAutoRotate();
      });
      els.dots.appendChild(dot);
    }
  }

  function startAutoRotate() {
    stopAutoRotate();
    carousel.autoTimer = window.setInterval(() => {
      goTo(carousel.active + 1);
    }, CONFIG.AUTO_ROTATE_MS);
  }

  function stopAutoRotate() {
    if (carousel.autoTimer !== null) {
      window.clearInterval(carousel.autoTimer);
      carousel.autoTimer = null;
    }
  }

  // ผู้ใช้สัมผัสแกลเลอรี -> พักหมุนอัตโนมัติ แล้วค่อยกลับมาหมุนต่อ
  function restartAutoRotate() {
    stopAutoRotate();
    window.clearTimeout(carousel.resumeTimer);
    carousel.resumeTimer = window.setTimeout(
      startAutoRotate,
      CONFIG.AUTO_RESUME_MS
    );
  }

  // ลากเมาส์ / ปัดหน้าจอเพื่อหมุนวงการ์ด
  function onDragStart(e) {
    if (!carousel.ready) return;
    carousel.dragging = true;
    carousel.dragStartX = e.clientX;
    carousel.dragStartRotation = carousel.rotation;
    carousel.dragLastDx = 0;
    els.viewport.classList.add('is-dragging');
    stopAutoRotate();
    window.clearTimeout(carousel.resumeTimer);
  }

  function onDragMove(e) {
    if (!carousel.dragging) return;
    const dx = e.clientX - carousel.dragStartX;
    carousel.dragLastDx = dx;
    carousel.rotation = carousel.dragStartRotation + dx * CONFIG.DRAG_SENSITIVITY;
    applyRotation();
  }

  function onDragEnd(e) {
    if (!carousel.dragging) return;
    carousel.dragging = false;
    els.viewport.classList.remove('is-dragging');

    // แตะ/คลิกเบาๆ โดยไม่ลาก -> หมุนไปหาการ์ดที่คลิกทันที
    if (Math.abs(carousel.dragLastDx) < 6) {
      const hit = e.target && e.target.closest
        ? e.target.closest('.carousel-card')
        : null;
      if (hit) {
        goTo(Number(hit.dataset.index));
        restartAutoRotate();
        return;
      }
    }

    // ปล่อยมือ -> สแนปเข้าการ์ดที่ใกล้ทิศทางการหมุนปัจจุบัน
    goTo(Math.round(-carousel.rotation / carousel.step));
    restartAutoRotate();
  }

  function onKeyDown(e) {
    if (els.section.hidden) return;
    if (e.key === 'ArrowRight') {
      next();
      restartAutoRotate();
    } else if (e.key === 'ArrowLeft') {
      prev();
      restartAutoRotate();
    }
  }

  // จอเปลี่ยนขนาด -> คำนวณรัศมีใหม่ (debounce กันคำนวณรัวๆ)
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      computeLayout();
      renderCards();
      applyRotation();
    }, 160);
  }

  // ผูก event ของรอบนี้ทั้งหมด (abort อัตโนมัติตอน build รอบใหม่)
  function wireControls(signal) {
    els.prevBtn.addEventListener('click', () => {
      prev();
      restartAutoRotate();
    }, { signal });
    els.nextBtn.addEventListener('click', () => {
      next();
      restartAutoRotate();
    }, { signal });
    els.viewport.addEventListener('pointerdown', onDragStart, { signal });
    window.addEventListener('pointermove', onDragMove, { signal });
    window.addEventListener('pointerup', onDragEnd, { signal });
    window.addEventListener('pointercancel', onDragEnd, { signal });
    document.addEventListener('keydown', onKeyDown, { signal });
    window.addEventListener('resize', onResize, { signal });
  }

  /* -----------------------------------------
     6. Public API (build / show / goTo / next / prev)
     ----------------------------------------- */

  // ค้นหา element ของแกลเลอรี (เรียกซ้ำได้ทุกครั้งที่ build)
  function captureElements() {
    els.section = document.getElementById('gallerySection');
    els.stage = document.getElementById('carouselStage');
    els.viewport = document.getElementById('carouselViewport');
    els.dots = document.getElementById('carouselDots');
    els.prevBtn = document.getElementById('prevBtn');
    els.nextBtn = document.getElementById('nextBtn');
    return Boolean(els.section && els.viewport && els.dots);
  }

  // สร้างการ์ดกระจกทั้งหมดจากรายการรูป (ยังไม่วัดขนาด — รอตอน show)
  function build(photos) {
    if (!captureElements()) return;
    if (uiSignal) uiSignal.abort(); // เคลียร์ listener ของรอบก่อน
    uiSignal = new AbortController();

    stopAutoRotate();
    window.clearTimeout(carousel.resumeTimer);
    els.section.classList.remove('is-visible');
    els.viewport.innerHTML = '';

    carousel.cards = [];
    carousel.count = photos.length;
    carousel.active = 0;
    carousel.rotation = 0;
    carousel.ready = false;

    photos.forEach((photo, index) => {
      const card = createCard(photo, index);
      card.style.setProperty('--enter-delay', (index * CONFIG.ENTER_STAGGER) + 'ms');
      attachTilt(card);
      els.viewport.appendChild(card);
      carousel.cards.push(card);
    });

    buildDots(photos.length);
    wireControls(uiSignal.signal);
  }

  // เผยแกลเลอรี: วัดขนาดจริง -> วางวง -> การ์ดบินเข้าทีละใบ -> หมุนอัตโนมัติ
  function show() {
    if (!carousel.cards.length) return;
    els.section.hidden = false;
    void els.section.offsetWidth; // บังคับ reflow เพื่อวัดขนาดการ์ดจริง

    computeLayout();
    renderCards();
    applyRotation();
    setActive(0);

    requestAnimationFrame(() => {
      els.section.classList.add('is-visible');
      carousel.ready = true;
      startAutoRotate();
    });
  }

  App.Gallery = {
    build: build,
    show: show,
    goTo: goTo,
    next: next,
    prev: prev,
  };
})(window.SpaceLove);
