/* =========================================================
   Space Love Story — App Script
   ---------------------------------------------------------
   สารบัญ
   1. Elements & State
   2. Background Effects (ดาว / หัวใจลอย)
   3. Photo Handling (อัปโหลด / จัดเก็บ / ตัวอย่าง)
   4. Timeline — Polaroid Photos (สร้าง + reveal ทีละรูป)
   5. Black Hole Warp Transition
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

let selectedPhotos = [];


/* =========================================
   2. Background Effects
   ========================================= */

// สร้างดาวระยิบระยับบนพื้นหลัง
function createStars() {
  const starCount = 150;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.animationDuration = 2 + Math.random() * 3 + 's';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    starsBg.appendChild(star);
  }
}

// สร้างหัวใจ/ดาวลอยขึ้นจากล่างจอ
function createFloatingHearts() {
  const heartEmojis = ['❤️', '💕', '💖', '✨', '🌟', '💫'];
  const heartCount = 15;
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.animationDelay = Math.random() * 20 + 's';
    heart.style.animationDuration = 15 + Math.random() * 15 + 's';
    heart.style.fontSize = 1 + Math.random() * 2 + 'rem';
    starsBg.appendChild(heart);
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
  '💕 อยู่ด้วยกันทุกวัน',
  '🌌 รักกว้างเท่าจักรวาล',
  '✨ โมเมนต์ที่ดีที่สุด',
  '💖 เธอคือที่สุด',
  '🚀 เดินทางไปด้วยกัน',
  '💫 ดาวดวงของฉัน',
  '🌸 วันที่แสนวิเศษ',
  '🩷 หัวใจของเรา',
  '🔭 ก้าวต่อไปด้วยกัน',
];

// สร้าง Timeline รูปโพลารอยด์ สลับซ้าย-ขวาตามแนวเส้นกลาง + เอียงสุ่มเหมือนวางบนโต๊ะ
function createTimeline() {
  const count = Math.min(parseInt(displayCount.value, 10) || selectedPhotos.length, selectedPhotos.length);
  const photosToShow = selectedPhotos.slice(0, count);
  const dots = ['❤️', '💕', '💖', '✨', '🌟', '💫', '🦋', '🌸', '💝', '🩷'];

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
   5. Black Hole Warp Transition
   ========================================= */
const WARP_SPIRAL_MS = 2400; // เวลาที่จรวดหมุนเกลียวถูกดูดเข้าหลุมดำ
const WARP_FLASH_MS = 850;   // ความยาวของแสงวาร์ปวาบ

// เล่นแอนิเมชัน: จรวดหมุนเกลียวเข้าหลุมดำ -> แสงวาร์ปวาบ -> เปลี่ยนหน้าจอ
function playWarpAnimation() {
  return new Promise((resolve) => {
    // เปิด Overlay และเริ่มแอนิเมชันจรวดหมุนเกลียว (CSS ผูกกับคลาส .play)
    warpOverlay.classList.add('active', 'play');

    // จรวดถึงจุดศูนย์กลางหลุมดำ -> เปิดแสงวาร์ปวาบ
    setTimeout(() => warpFlash.classList.add('flash'), WARP_SPIRAL_MS);

    // เปลี่ยนหน้าจอช่วงที่แสงสว่างที่สุด เพื่อให้ต่อเนื่องเป็นธรรมชาติ
    setTimeout(resolve, WARP_SPIRAL_MS + 380);

    // ล้าง Overlay และคลาสแอนิเมชันหลังแสงจางหมด
    setTimeout(() => {
      warpOverlay.classList.remove('active', 'play');
      warpFlash.classList.remove('flash');
    }, WARP_SPIRAL_MS + WARP_FLASH_MS);
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

// คลิกปุ่มสตาร์ท: สร้าง Timeline -> หลุมดำ+วาร์ป -> สลับ Landing Page เป็น Timeline -> Auto-Scroll โชว์รูปทีละใบ
async function startStory() {
  if (selectedPhotos.length === 0) {
    alert('Please select photos first!');
    return;
  }

  stopAutoScroll();
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
  createFloatingHearts();
  loadPhotosFromStorage();
  console.log('Space Love Story ready!');
});
