/* =========================================================
   Space Love Story — Memory Share & Export Module
   ---------------------------------------------------------
   ส่งต่อความทรงจำ: สร้างลิงก์แชร์ที่บรรจุรูปไว้ใน URL hash
   + แคปการ์ดกระจกออกมาเป็นไฟล์ PNG ด้วย html2canvas

   สารบัญ
   1. Config & Elements
   2. Toast Notification
   3. Photo Compression (ย่อรูปก่อนแพ็กลงลิงก์)
   4. Shareable Link (generate / copy)
   5. URL Reader (เปิดลิงก์ที่ได้รับแชร์)
   6. Export Memory Card (html2canvas)
   7. Public API
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Config & Elements
     ----------------------------------------- */
  const MAX_SHARE_PHOTOS = 10;
  const SHARE_MAX_DIM = 400;
  const SHARE_QUALITY = 0.5;
  const HASH_PREFIX = '#m=';

  let toastTimer = null;

  /* -----------------------------------------
     2. Toast Notification
     ----------------------------------------- */
  function toast(message, duration) {
    const box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      box.classList.remove('is-visible');
    }, duration || 2600);
  }

  /* -----------------------------------------
     3. Photo Compression
     ----------------------------------------- */

  // ย่อรูปให้เล็กพอที่จะแพ็กลงลิงก์ได้ (คืนเป็น data URL JPEG)
  function compressPhoto(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(
          1,
          SHARE_MAX_DIM / Math.max(img.width, img.height)
        );
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', SHARE_QUALITY));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /* -----------------------------------------
     4. Shareable Link
     ----------------------------------------- */

  // คัดลอกข้อความลงคลิปบอร์ด (มีวิธีสำรองสำหรับเบราว์เซอร์เก่า)
  function copyTextFallback(text) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch (err) {
      return false;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        () => true,
        () => copyTextFallback(text)
      );
    }
    return Promise.resolve(copyTextFallback(text));
  }

  // แพ็ก JSON ลง URL ให้สั้นที่สุด (ใช้ LZString ถ้าโหลดมา)
  function packPayload(payload) {
    if (window.LZString) {
      return LZString.compressToEncodedURIComponent(payload);
    }
    return 'raw:' + encodeURIComponent(payload);
  }

  function unpackPayload(code) {
    if (code.indexOf('raw:') === 0) {
      return decodeURIComponent(code.slice(4));
    }
    if (window.LZString) {
      return LZString.decompressFromEncodedURIComponent(code);
    }
    return null;
  }

  // สร้างลิงก์แชร์ -> คัดลอกลงคลิปบอร์ด -> แจ้งผลด้วย Toast
  function shareMemory() {
    if (!App.Gallery || !App.Gallery.getPhotos) return;
    const photos = App.Gallery.getPhotos()
      .slice(0, MAX_SHARE_PHOTOS)
      .filter((src) => src && src.indexOf('data:image') === 0);
    if (photos.length === 0) {
      toast('ยังไม่มีความทรงจำให้แชร์ — เลือกรูปก่อนนะ');
      return;
    }

    toast('กำลังบีบอัดความทรงจำลงลิงก์... 🛰️', 1800);

    Promise.all(photos.map((src) => compressPhoto(src)))
      .then((packed) => {
        const payload = JSON.stringify({ v: 1, p: packed });
        const url =
          window.location.origin +
          window.location.pathname +
          HASH_PREFIX +
          packPayload(payload);
        return copyText(url);
      })
      .then((ok) => {
        toast(
          ok
            ? 'คัดลอกลิงก์ส่งต่อเรียบร้อยแล้ว! ✨'
            : 'คัดลอกไม่สำเร็จ — ลองกดใหม่อีกครั้งนะ'
        );
      })
      .catch(() => {
        toast('เกิดข้อผิดพลาดตอนแชร์ 😥 ลองอีกครั้งนะ');
      });
  }

  /* -----------------------------------------
     5. URL Reader (เปิดลิงก์ที่ได้รับแชร์)
     ----------------------------------------- */

  // อ่านลิงก์แชร์จาก URL — คืนรายการรูป หรือ null ถ้าไม่ใช่ลิงก์แชร์
  function readFromUrl() {
    const match = (window.location.hash || '').match(/#m=([^&]+)/);
    if (!match) return null;
    try {
      const data = JSON.parse(unpackPayload(match[1]));
      if (!data || !Array.isArray(data.p)) return null;
      const photos = data.p.filter(
        (src) => typeof src === 'string' && src.indexOf('data:image') === 0
      );
      return photos.length > 0 ? photos : null;
    } catch (err) {
      console.error('Invalid share link');
      return null;
    }
  }

  // โหมดผู้รับ: แปะป้ายกำกับ + ปุ่มกลับไปสร้างแกลเลอรีของตัวเอง
  function markRecipientMode() {
    const header = document.querySelector('.gallery-header');
    if (!header || header.querySelector('.shared-actions')) return;

    const box = document.createElement('div');
    box.className = 'shared-actions';

    const chip = document.createElement('span');
    chip.className = 'glass-chip';
    chip.textContent = '✦ ความทรงจำที่ได้รับแชร์ ✦';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'neon-btn own-btn';
    btn.textContent = '🚀 สร้างแกลเลอรีของฉัน';
    btn.addEventListener('click', () => {
      window.location.href =
        window.location.origin + window.location.pathname;
    });

    box.appendChild(chip);
    box.appendChild(btn);
    header.appendChild(box);
  }

  /* -----------------------------------------
     6. Export Memory Card (html2canvas)
     ----------------------------------------- */

  // แคปการ์ด active ออกมาเป็น PNG (เรนเดอร์นอกจอก่อนแคป)
  function exportCard() {
    const card = document.querySelector('.carousel-card.is-active');
    if (!card) {
      toast('ยังไม่มีการ์ดให้บันทึก — เลือกรูปก่อนนะ');
      return;
    }
    if (typeof html2canvas === 'undefined') {
      toast('โหลดตัวแคปภาพไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วลองใหม่');
      return;
    }

    toast('กำลังประกอบการ์ดความทรงจำ... 🛠️', 1600);

    const imgEl = card.querySelector('.card-photo img');
    const frame = document.createElement('div');
    frame.className = 'export-card';
    frame.innerHTML = [
      '<div class="ex-head">SPACE LOVE STORY · MEMORY CARD</div>',
      '<img class="ex-photo" src="' + (imgEl ? imgEl.src : '') + '" alt="" />',
      '<div class="ex-stardate">' + (card.dataset.stardate || '') + '</div>',
      '<div class="ex-caption">' + (card.dataset.caption || '') + '</div>',
      '<div class="ex-foot">✦ WITH LOVE ACROSS THE UNIVERSE ✦</div>',
    ].join('');

    document.body.appendChild(frame);

    html2canvas(frame, { scale: 2, backgroundColor: null })
      .then((canvas) => {
        const link = document.createElement('a');
        link.download = 'space-love-memory-card.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast('บันทึกการ์ดความทรงจำเรียบร้อย! 💾');
      })
      .catch(() => {
        toast('แคปภาพไม่สำเร็จ — ลองอีกครั้งนะ');
      })
      .then(() => frame.remove());
  }

  /* -----------------------------------------
     7. Public API
     ----------------------------------------- */
  function bindUi() {
    const shareBtn = document.getElementById('shareBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    if (shareBtn) shareBtn.addEventListener('click', shareMemory);
    if (downloadBtn) downloadBtn.addEventListener('click', exportCard);
  }

  App.MemoryShare = {
    init: bindUi,
    toast: toast,
    readFromUrl: readFromUrl,
    markRecipientMode: markRecipientMode,
    shareMemory: shareMemory,
    exportCard: exportCard,
  };
})(window.SpaceLove);