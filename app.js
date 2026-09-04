/* =========================================================
   Space Love Story — App Script
   ---------------------------------------------------------
   สารบัญ
   1. Elements & State
   2. Background Effects (ดาว / ฝุ่นดาวโทนอุ่น)
   3. Photo Handling (อัปโหลด / จัดเก็บ / ตัวอย่าง)
   4. Timeline — Polaroid Photos (สร้าง + reveal ทีละรูป)
   5. Rocket Warp Transition
   6. Auto Smooth Scroll
   7. Flow Control (เริ่มการเดินทาง)
   8. Event Listeners
   ========================================================= */

'use strict';


/* =========================================
   1. Elements & State
   ========================================= */
const startBtn = document.getElementById('startBtn');
const hero = document.getElementById('hero');
const timelineSection = document.getElementById('timelineSection');
const timeline = document.getElementById('timeline');
const starsBg = document.getElementById('starsBg');
const photoInput = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewSection = document.getElementById('previewSection');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const photoCount = document.getElementById('photoCount');
const displayCount = document.getElementById('displayCount');
const warpOverlay = document.getElementById('warpOverlay');
const warpFlash = document.getElementById('warpFlash');
const warpPhotos = document.getElementById('warpPhotos');

let selectedPhotos = [];


/* =========================================
   2. Background Effects
   ========================================= */

// สร้างดาวระยิบระยับ (ใช้ทำพื้นหลังหน้าเว็บ และฉากหลังของ overlay วาร์ป)
function createStars(container = starsBg, count = 150) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 4 + 's';
    star.style.animationDuration = 3 + Math.random() * 3 + 's';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    container.appendChild(star);
  }
}

// สร้างฝุ่นดาวเรืองแสงโทนอุ่น (Ambient Soft Lighting)
function createStardust() {
  const dustColors = ['255, 210, 138', '255, 236, 200', '188, 220, 255'];
  const dustCount = 26;
  for (let i = 0; i < dustCount; i++) {
    const dust = document.createElement('div');
    dust.className = 'stardust';
    const size = 2 + Math.random() * 3;
    const color = dustColors[Math.floor(Math.random() * dustColors.length)];
    dust.style.width = size + 'px';
    dust.style.height = size + 'px';
    dust.style.left = Math.random() * 100 + '%';
    dust.style.top = Math.random() * 100 + '%';
    dust.style.background = 'rgb(' + color + ')';
    dust.style.setProperty('--glow', 'rgba(' + color + ', 0.5)');
    dust.style.opacity = (0.25 + Math.random() * 0.3).toFixed(2);
    dust.style.animationDelay = Math.random() * 10 + 's';
    dust.style.animationDuration = 26 + Math.random() * 24 + 's';
    starsBg.appendChild(dust);
  }
}


/* =========================================
   3. Photo Handling
   ========================================= */

// โหลดรูปที่เคยเลือกไว้จาก localStorage
function loadPhotosFromStorage() {
  try {
    const stored = localStorage.getItem('spaceLovePhotos');
    if (stored) {
      selectedPhotos = JSON.parse(stored);
      if (selectedPhotos.length > 0) {
        displayThumbnails();
        previewSection.hidden = false;
        photoCount.textContent = selectedPhotos.length;
      }
    }
  } catch (e) {
    console.log('No stored photos found');
  }
}

// บันทึกรูปที่เลือกลง localStorage
function savePhotosToStorage() {
  try {
    localStorage.setItem('spaceLovePhotos', JSON.stringify(selectedPhotos));
  } catch (e) {
    console.error('Storage full');
  }
}

// แสดงรูปตัวอย่างใน Hero
function displayThumbnails() {
  thumbnailsContainer.innerHTML = '';
  selectedPhotos.forEach((photo, index) => {
    const img = document.createElement('img');
    img.src = photo;
    img.className = 'thumbnail';
    img.alt = 'Photo ' + (index + 1);
    thumbnailsContainer.appendChild(img);
  });
  photoCount.textContent = selectedPhotos.length;
}

// จัดการเมื่อผู้ใช้เลือกรูปจากเครื่อง
function handlePhotoSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  files.forEach((file) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      selectedPhotos.push(event.target.result);
      displayThumbnails();
      savePhotosToStorage();
      previewSection.hidden = false;
      displayCount.max = selectedPhotos.length;
      displayCount.value = Math.min(selectedPhotos.length, 10);
    };
    reader.readAsDataURL(file);
  });
}

/* =========================================
   4. Timeline
   ========================================= */

// คำโปรยสั้นๆ ใต้รูปโพลารอยด์ (วนซ้ำตามจำนวนรูป)
const POLAROID_CAPTIONS = [
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

// สร้าง Timeline รูปโพลารอยด์ สลับซ้าย-ขวาตามแนวเส้นกลาง + เอียงสุ่มเหมือนวางบนโต๊ะ
function createTimeline() {
  const count = Math.min(parseInt(displayCount.value, 10) || selectedPhotos.length, selectedPhotos.length);
  const photosToShow = selectedPhotos.slice(0, count);
  const dots = ['⭐', '🌟', '✨', '💫', '🚀', '🛸', '🌙', '☄️', '🪐', '🔭'];

  timeline.innerHTML = '';

  photosToShow.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item ' + (index % 2 === 0 ? 'left' : 'right');

    // โพลารอยด์: เอียงสุ่ม -5 ถึง 5 องศา
    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid';
    const tilt = (Math.random() * 10 - 5).toFixed(2);
    polaroid.style.setProperty('--tilt', tilt + 'deg');
    polaroid.innerHTML = `
      <div class="polaroid-photo">
        <img src="${photo}" alt="Photo ${index + 1}" />
      </div>
      <div class="polaroid-caption">${POLAROID_CAPTIONS[index % POLAROID_CAPTIONS.length]}</div>`;

    // จุดเชื่อมบนเส้น Timeline
    const connector = document.createElement('div');
    connector.className = 'timeline-connector';
    connector.innerHTML = `
      <div class="timeline-dot">${dots[index % dots.length]}</div>
      <div class="timeline-line"></div>`;

    item.appendChild(polaroid);
    item.appendChild(connector);
    timeline.appendChild(item);
  });

  setupTimelineReveal();
}

// ทำให้รูปแต่ละใบปรากฏทีละใบ เมื่อเลื่อนเข้ามาในหน้าจอ (sync กับ Auto-Scroll เสมอ)
let revealObserver = null;

function setupTimelineReveal() {
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -12% 0px' }
  );

  document.querySelectorAll('.timeline-item').forEach((item) => revealObserver.observe(item));
}

/* =========================================
   5. Rocket Warp Transition
   ========================================= */
const WARP = {
  FLY_IN: 900,           // เฟส 1: จรวดพุ่งเข้ามาจากขอบขวา
  PHOTO_START: 1400,     // รูปแรกพุ่งออกจากจรวด (หลังเริ่มบินวน 0.5 วินาที)
  PHOTO_INTERVAL: 420,   // ระยะห่างของรูปแต่ละรูปที่พุ่งออกมา
  PHOTO_POP: 550,        // ความยาวแอนิเมชัน pop ของรูป 1 รูป
  HOLD: 650,             // พักหลังรูปสุดท้ายก่อนแสงวาร์ป
  FLASH: 850,            // ความยาวแสงวาร์ปวาบ
  RESOLVE_AT_FLASH: 380, // จุดที่แสงสว่างสุด -> เปลี่ยนหน้า
};
const MAX_WARP_PHOTOS = 7; // จำนวนรูปสูงสุดที่โชว์เป็นวงรอบจรวด

// สร้างรูปโพลารอยด์จิ๋ว (ใช้รูปจริงของผู้ใช้) เรียงเป็นวงรอบจุดที่จรวดบินวน
function buildWarpPhotos() {
  warpPhotos.innerHTML = '';
  const shown = Math.min(selectedPhotos.length, MAX_WARP_PHOTOS);

  for (let i = 0; i < shown; i++) {
    const angle = ((-90 + (360 / shown) * i) * Math.PI) / 180;
    const radius = 148 + (i % 3) * 22;
    const photo = document.createElement('div');
    photo.className = 'warp-photo';
    photo.style.setProperty('--tx', Math.round(Math.cos(angle) * radius) + 'px');
    photo.style.setProperty('--ty', Math.round(Math.sin(angle) * radius) + 'px');
    photo.style.setProperty('--tilt', (Math.random() * 14 - 7).toFixed(2) + 'deg');
    photo.style.setProperty('--delay', WARP.PHOTO_START + i * WARP.PHOTO_INTERVAL + 'ms');
    photo.innerHTML = `<img src="${selectedPhotos[i]}" alt="" />`;
    warpPhotos.appendChild(photo);
  }

  return shown;
}

// เล่นแอนิเมชัน: จรวดพุ่งเข้าจากขอบขวา -> บินวนเป็นเกลียวกลางจอ
// พร้อมรูปโพลารอยด์พุ่งออกมาทีละรูป -> แสงวาร์ปวาบ -> เปลี่ยนหน้าจอ
function playWarpAnimation() {
  return new Promise((resolve) => {
    const shown = buildWarpPhotos();
    const lastPhotoMs = WARP.PHOTO_START + (shown - 1) * WARP.PHOTO_INTERVAL + WARP.PHOTO_POP;
    const flashAt = lastPhotoMs + WARP.HOLD;

    // เปิด Overlay และเริ่มลำดับแอนิเมชัน (CSS ผูกกับคลาส .play)
    warpOverlay.classList.add('active', 'play');

    // รูปพุ่งครบทุกรูป + พักเล็กน้อย -> แสงวาร์ปวาบ
    setTimeout(() => warpFlash.classList.add('flash'), flashAt);

    // เปลี่ยนหน้าจอช่วงที่แสงสว่างที่สุด เพื่อให้ต่อเนื่องเป็นธรรมชาติ
    setTimeout(resolve, flashAt + WARP.RESOLVE_AT_FLASH);

    // ล้าง Overlay และคลาสแอนิเมชันหลังแสงจางหมด
    setTimeout(() => {
      warpOverlay.classList.remove('active', 'play');
      warpFlash.classList.remove('flash');
    }, flashAt + WARP.FLASH);
  });
}


/* =========================================
   6. Auto Smooth Scroll
   ========================================= */

/* --- Auto Smooth Scroll: เลื่อนจอลงอัตโนมัติอย่างช้าๆ นุ่มนวล --- */
const AUTO_SCROLL_SPEED = 90; // ความเร็วเลื่อนอัตโนมัติ (พิกเซล/วินาที)
const RESUME_DELAY = 2500;    // เวลาพัก (มิลลิวินาที) หลังผู้ใช้แตะ/เลื่อนเอง ก่อนกลับมาเลื่อนต่อ

let autoScrollRafId = null;
let autoScrollPaused = false;
let autoScrollLastTime = null;
let autoScrollStartTime = 0;
let resumeTimeout = null;

function isAutoScrollRunning() {
  return autoScrollRafId !== null;
}

function startAutoScroll() {
  stopAutoScroll();
  autoScrollPaused = false;
  autoScrollLastTime = null;
  autoScrollStartTime = performance.now();
  // ปิด scroll-behavior ของ CSS ชั่วคราว ไม่ให้ตีกับการเลื่อนทีละเฟรม
  document.documentElement.style.scrollBehavior = 'auto';
  autoScrollRafId = requestAnimationFrame(autoScrollStep);
}

function autoScrollStep(timestamp) {
  if (autoScrollLastTime === null) autoScrollLastTime = timestamp;
  // จำกัด delta ไม่ให้หน้ากระโดด เมื่อสลับแท็บแล้วกลับมา
  const delta = Math.min(timestamp - autoScrollLastTime, 100);
  autoScrollLastTime = timestamp;

  if (!autoScrollPaused && delta > 0) {
    // ค่อยๆ เร่งความเร็วในช่วงต้น เพื่อให้เริ่มเลื่อนอย่างนุ่มนวล
    const elapsed = timestamp - autoScrollStartTime;
    const ease = Math.min(elapsed / 800, 1);
    const speed = AUTO_SCROLL_SPEED * (0.4 + 0.6 * ease);
    window.scrollBy(0, (speed * delta) / 1000);

    // เลื่อนถึงสุดหน้าแล้วให้หยุด
    const bottomReached =
      Math.ceil(window.innerHeight + window.pageYOffset) >=
      document.documentElement.scrollHeight - 2;
    if (bottomReached) {
      stopAutoScroll();
      return;
    }
  }

  autoScrollRafId = requestAnimationFrame(autoScrollStep);
}

function stopAutoScroll() {
  if (autoScrollRafId !== null) {
    cancelAnimationFrame(autoScrollRafId);
    autoScrollRafId = null;
  }
  autoScrollPaused = false;
  if (resumeTimeout) {
    clearTimeout(resumeTimeout);
    resumeTimeout = null;
  }
  document.documentElement.style.scrollBehavior = '';
}

// ผู้ใช้สัมผัสหน้าจอ/เลื่อนเอง -> หยุดชั่วคราว แล้วกลับมาเลื่อนต่อเองเมื่อผู้ใช้หยุดพัก
function pauseAutoScroll() {
  if (!isAutoScrollRunning() || autoScrollPaused) return;
  autoScrollPaused = true;
  if (resumeTimeout) clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(() => {
    resumeTimeout = null;
    if (isAutoScrollRunning()) {
      autoScrollPaused = false;
      autoScrollLastTime = null;
    }
  }, RESUME_DELAY);
}


/* =========================================
   7. Flow Control
   ========================================= */

// คลิกปุ่มสตาร์ท: ซ่อนหน้าแรก -> แอนิเมชันจรวดวาร์ป+รูปพุ่งออก -> แสดง Timeline -> Auto-Scroll โชว์รูปทีละใบ
async function startStory() {
  if (selectedPhotos.length === 0) {
    alert('Please select photos first!');
    return;
  }

  stopAutoScroll();
  hero.hidden = true; // ซ่อนหน้าแรกทันทีที่กดสตาร์ท
  createTimeline();
  await playWarpAnimation();
  switchToTimeline();
  startAutoScroll();
}

// ซ่อน Landing Page (Hero) ทั้งหมด แล้วแสดง Story Section (Timeline) ขึ้นมาแทน
function switchToTimeline() {
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  hero.hidden = true;
  timelineSection.hidden = false;
}


/* =========================================
   8. Event Listeners
   ========================================= */

// แตะจอ / เลื่อนเมาส์ / ใช้คีย์เลื่อนหน้า -> หยุด Auto-Scroll ชั่วคราว
['wheel', 'touchstart', 'touchmove'].forEach((evtName) => {
  window.addEventListener(evtName, pauseAutoScroll, { passive: true });
});

window.addEventListener('keydown', (e) => {
  const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
  if (scrollKeys.includes(e.key)) pauseAutoScroll();
});

if (startBtn) startBtn.addEventListener('click', startStory);
if (uploadBtn) uploadBtn.addEventListener('click', () => photoInput.click());
if (photoInput) photoInput.addEventListener('change', handlePhotoSelect);

document.addEventListener('DOMContentLoaded', () => {
  createStars();
  createStardust();
  createStars(warpOverlay, 90); // ดาวฉากหลังบน overlay วาร์ป
  loadPhotosFromStorage();
  console.log('Space Love Story ready!');
});
