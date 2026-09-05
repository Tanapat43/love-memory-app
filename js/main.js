/* =========================================================
   Space Love Story — Main Entry & State Manager
   ---------------------------------------------------------
   จุดเริ่มต้นของแอป: จัดการ State, พื้นหลังอวกาศ,
   การอัปโหลดรูป และควบคุมลำดับ Warp -> 3D Gallery

   สารบัญ
   1. Config & Elements & State
   2. Background Effects (ดาวระยิบ / ฝุ่นดาวเรืองแสง)
   3. Photo Handling (อัปโหลด / จัดเก็บ / ตัวอย่าง)
   4. Flow Control (สตาร์ท -> Warp -> Gallery)
   5. Boot & Event Listeners
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* =========================================
     1. Config & Elements & State
     ========================================= */
  const STORAGE_KEY = 'spaceLovePhotos';
  const MAX_PREVIEW_COUNT = 10;

  const els = {
    hero: document.getElementById('hero'),
    startBtn: document.getElementById('startBtn'),
    photoInput: document.getElementById('photoInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    previewSection: document.getElementById('previewSection'),
    thumbnails: document.getElementById('thumbnailsContainer'),
    photoCount: document.getElementById('photoCount'),
    displayCount: document.getElementById('displayCount'),
    starsBg: document.getElementById('starsBg'),
    warpOverlay: document.getElementById('warpOverlay'),
  };

  const state = {
    photos: [], // รายการรูป (data URL) ที่ผู้ใช้เลือกไว้
  };

  /* =========================================
     2. Background Effects
     ========================================= */

  // สร้างดาวระยิบระยับ (พื้นหลังเว็บ + ฉากหลังบน overlay วาร์ป)
  function createStars(container, count) {
    if (!container) return;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = 1 + Math.random() * 2;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 4 + 's';
      star.style.animationDuration = 3 + Math.random() * 3 + 's';
      container.appendChild(star);
    }
  }

  // สร้างฝุ่นดาวเรืองแสงหลากสี ลอยช้าๆ (Ambient Soft Lighting)
  function createStardust() {
    if (!els.starsBg) return;
    const colors = [
      '125, 249, 255',
      '255, 46, 196',
      '155, 93, 229',
      '255, 210, 138',
    ];
    for (let i = 0; i < 26; i++) {
      const dust = document.createElement('div');
      dust.className = 'stardust';
      const size = 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      dust.style.width = size + 'px';
      dust.style.height = size + 'px';
      dust.style.left = Math.random() * 100 + '%';
      dust.style.top = Math.random() * 100 + '%';
      dust.style.background = 'rgb(' + color + ')';
      dust.style.setProperty('--glow', 'rgba(' + color + ', 0.5)');
      dust.style.opacity = (0.25 + Math.random() * 0.3).toFixed(2);
      dust.style.animationDelay = Math.random() * 10 + 's';
      dust.style.animationDuration = 26 + Math.random() * 24 + 's';
      els.starsBg.appendChild(dust);
    }
  }

  /* =========================================
     3. Photo Handling
     ========================================= */

  // โหลดรูปที่เคยเลือกไว้จาก localStorage
  function loadPhotosFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      state.photos = JSON.parse(stored) || [];
      if (state.photos.length > 0) {
        renderThumbnails();
        els.previewSection.hidden = false;
      }
    } catch (err) {
      console.log('No stored photos found');
    }
  }

  // บันทึกรูปลง localStorage (กันกรณี quota เต็ม)
  function savePhotosToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.photos));
    } catch (err) {
      console.error('Storage full — เก็บรูปไว้ชั่วคราวในหน้านี้ได้อย่างเดียว');
    }
  }

  // เรนเดอร์รูปตัวอย่างพร้อมปุ่มลบรายรูป
  function renderThumbnails() {
    els.thumbnails.innerHTML = '';
    state.photos.forEach((photo, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'thumbnail-wrap';

      const img = document.createElement('img');
      img.src = photo;
      img.alt = 'ตัวอย่างรูปที่ ' + (index + 1);
      img.className = 'thumbnail';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'thumb-remove';
      removeBtn.textContent = '✕';
      removeBtn.setAttribute('aria-label', 'ลบรูปที่ ' + (index + 1));
      removeBtn.addEventListener('click', function () {
        removePhoto(index);
      });

      wrap.appendChild(img);
      wrap.appendChild(removeBtn);
      els.thumbnails.appendChild(wrap);
    });
    syncPhotoMeta();
  }

  // อัปเดตตัวเลขจำนวนรูป + ค่าในช่องจำนวนรูปที่ต้องการโชว์
  function syncPhotoMeta() {
    els.photoCount.textContent = String(state.photos.length);
    els.displayCount.max = String(Math.max(state.photos.length, 1));
    const current = Number(els.displayCount.value);
    if (!current || current > state.photos.length) {
      els.displayCount.value = String(
        Math.min(state.photos.length, MAX_PREVIEW_COUNT)
      );
    }
  }

  // ลบรูป 1 ใบออกจากรายการ
  function removePhoto(index) {
    state.photos.splice(index, 1);
    if (state.photos.length === 0) {
      els.previewSection.hidden = true;
    }
    renderThumbnails();
    savePhotosToStorage();
  }

  // อ่านไฟล์รูปที่เลือกเป็น data URL แล้วเพิ่มเข้า State
  function handlePhotoSelect(event) {
    const files = Array.from(event.target.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        state.photos.push(e.target.result);
        renderThumbnails();
        savePhotosToStorage();
        els.previewSection.hidden = false;
      };
      reader.readAsDataURL(file);
    });
    event.target.value = ''; // อนุญาตให้เลือกไฟล์ชุดเดิมซ้ำได้
  }

  // จำนวนรูปที่จะโชว์ในแกลเลอรี (clamp ไว้ที่ 1..จำนวนที่มี)
  function resolveDisplayCount() {
    const parsed = parseInt(els.displayCount.value, 10);
    if (Number.isNaN(parsed) || parsed < 1) return 1;
    return Math.min(parsed, state.photos.length);
  }

  /* =========================================
     4. Flow Control
     ========================================= */

  // กดสตาร์ท: ซ่อน Hero -> สร้างแกลเลอรี -> เล่นวาร์ป -> เปิด 3D Gallery
  async function startStory() {
    if (state.photos.length === 0) {
      alert('Please select photos first!');
      return;
    }

    const shownPhotos = state.photos.slice(0, resolveDisplayCount());
    els.hero.hidden = true; // ซ่อนหน้าแรกทันทีที่กดสตาร์ท

    if (App.Sound) App.Sound.play('warp'); // เสียงวาร์ปความถี่ต่ำ

    App.Gallery.build(shownPhotos); // เตรียมการ์ดระหว่างรอวาร์ป
    await App.Warp.play(shownPhotos); // จรวดวาร์ป + Cyber Flash
    App.Gallery.show(); // ตอนแสงวาบสว่างสุด -> เผยแกลเลอรี 3D
  }

  /* =========================================
     5. Boot & Event Listeners
     ========================================= */

  function bindEvents() {
    if (els.startBtn) {
      els.startBtn.addEventListener('click', startStory);
    }
    if (els.uploadBtn) {
      els.uploadBtn.addEventListener('click', function () {
        els.photoInput.click();
      });
    }
    if (els.photoInput) {
      els.photoInput.addEventListener('change', handlePhotoSelect);
    }
  }

  function init() {
    if (App.Sound) App.Sound.init();
    if (App.Music) App.Music.init();
    if (App.CursorFX) App.CursorFX.init();
    createStars(els.starsBg, 150);
    createStars(els.warpOverlay, 90); // ดาวฉากหลังบน overlay วาร์ป
    createStardust();
    loadPhotosFromStorage();
    bindEvents();
    console.log('Space Love Story ready! ✨');
  }

  init();
})(window.SpaceLove);