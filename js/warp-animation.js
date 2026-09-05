/* =========================================================
   Space Love Story — Warp Animation Module
   ---------------------------------------------------------
   แอนิเมชันจรวดวาร์ป: พุ่งเข้าจอ -> บินวนเกลียวพร้อมรูปกระจก
   จิ๋วพุ่งออกมา -> จรวดพุ่งทะลุขึ้นเหนือจอ -> แสง Cyber Flash
   จบด้วยการ resolve Promise เพื่อสลับเข้าสู่ 3D Gallery

   สารบัญ
   1. Timing Config
   2. Scene Builders (Streaks / รูปจิ๋ว)
   3. playWarp() — เล่นลำดับแอนิเมชันทั้งหมด
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Timing Config (มิลลิวินาที)
     ----------------------------------------- */
  const WARP = {
    PHOTO_START: 1350,     // รูปแรกพุ่งออกจากจรวด (หลังเริ่มบินวน)
    PHOTO_INTERVAL: 380,   // ระยะห่างของรูปแต่ละรูปที่พุ่งออกมา
    PHOTO_POP: 520,        // ความยาวแอนิเมชัน pop ของรูป 1 รูป
    HOLD: 520,             // พักหลังรูปสุดท้ายก่อนจรวดทะลุจอ
    LAUNCH_LEAD: 420,      // จรวดเริ่มพุ่งทะลุก่อนแสงวาบ (สัมพันธ์กับ CSS)
    FLASH: 800,            // ความยาวแสง Cyber Flash
    RESOLVE_AT_FLASH: 340, // จุดที่แสงสว่างสุด -> เปลี่ยนหน้า
  };

  const MAX_WARP_PHOTOS = 7; // จำนวนรูปสูงสุดที่โชว์เป็นวงรอบจรวด
  const STREAK_COUNT = 42;   // จำนวนเส้นแสง Hyperspace


  /* -----------------------------------------
     2. Scene Builders
     ----------------------------------------- */

  // สร้างเส้นแสง Streak พุ่งออกจากจุดกลางจอ (มุม/ความยาว/ดีเลย์สุ่ม)
  function buildStreaks(overlay) {
    const box = overlay.querySelector('.warp-streaks');
    if (!box) return;

    box.innerHTML = '';
    for (let i = 0; i < STREAK_COUNT; i++) {
      const streak = document.createElement('span');
      streak.className = 'warp-streak';
      streak.style.setProperty('--angle', (Math.random() * 360).toFixed(1) + 'deg');
      streak.style.setProperty('--len', Math.round(90 + Math.random() * 150) + 'px');
      streak.style.setProperty('--delay', (Math.random() * 1.1).toFixed(2) + 's');
      box.appendChild(streak);
    }
  }

  // สร้างรูปกระจกจิ๋ว (ใช้รูปจริงของผู้ใช้) เรียงเป็นวงรอบจุดที่จรวดบินวน
  function buildWarpPhotos(photos, box) {
    box.innerHTML = '';
    const shown = Math.min(photos.length, MAX_WARP_PHOTOS);

    for (let i = 0; i < shown; i++) {
      const angle = ((-90 + (360 / shown) * i) * Math.PI) / 180;
      const radius = 150 + (i % 3) * 24;
      const tile = document.createElement('div');
      tile.className = 'warp-photo';
      tile.style.setProperty('--tx', Math.round(Math.cos(angle) * radius) + 'px');
      tile.style.setProperty('--ty', Math.round(Math.sin(angle) * radius) + 'px');
      tile.style.setProperty('--tilt', (Math.random() * 14 - 7).toFixed(2) + 'deg');
      tile.style.setProperty('--delay', WARP.PHOTO_START + i * WARP.PHOTO_INTERVAL + 'ms');
      tile.innerHTML = '<img src="' + photos[i] + '" alt="" />';
      box.appendChild(tile);
    }

    return shown;
  }


  /* -----------------------------------------
     3. playWarp()
     ----------------------------------------- */

  // เล่นลำดับแอนิเมชันทั้งหมด แล้ว resolve ตอนแสง Cyber Flash สว่างสุด
  function playWarp(photos) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('warpOverlay');
      const flash = document.getElementById('warpFlash');
      const photoBox = document.getElementById('warpPhotos');
      if (!overlay || !flash || !photoBox) {
        resolve();
        return;
      }

      const shown = buildWarpPhotos(photos, photoBox);
      buildStreaks(overlay);

      const lastPhotoMs =
        WARP.PHOTO_START + (shown - 1) * WARP.PHOTO_INTERVAL + WARP.PHOTO_POP;
      const flashAt = lastPhotoMs + WARP.HOLD;

      // ส่งเวลาจุดพุ่งทะลุจอให้ CSS (จรวดออกก่อนแสงวาบเล็กน้อย)
      overlay.style.setProperty('--launch-delay', flashAt - WARP.LAUNCH_LEAD + 'ms');

      // เปิด Overlay และเริ่มลำดับแอนิเมชัน (CSS ผูกกับคลาส .play)
      overlay.classList.add('active', 'play');

      // จรวดพุ่งทะลุจอ -> แสง Cyber Flash วาบ
      window.setTimeout(() => flash.classList.add('flash'), flashAt);

      // เปลี่ยนหน้าจอช่วงที่แสงสว่างที่สุด เพื่อให้ต่อเนื่องเป็นธรรมชาติ
      window.setTimeout(resolve, flashAt + WARP.RESOLVE_AT_FLASH);

      // ล้าง Overlay และคลาสแอนิเมชันหลังแสงจางหมด
      window.setTimeout(() => {
        overlay.classList.remove('active', 'play');
        overlay.style.removeProperty('--launch-delay');
        flash.classList.remove('flash');
        photoBox.innerHTML = '';
      }, flashAt + WARP.FLASH + 60);
    });
  }

  App.Warp = { play: playWarp };
})(window.SpaceLove);
