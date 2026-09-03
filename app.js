/*
 * =========================================================
 *  🚀 Space Love Story - Interactive Timeline
 *  เว็บบอกรักแฟนธีมอวกาศ
 * =========================================================
 */

'use strict';

/* ========== ตัวแปรหลัก ========== */
const startBtn = document.getElementById('startBtn');
const hero = document.getElementById('hero');
const timelineSection = document.getElementById('timelineSection');
const finale = document.getElementById('finale');
const starsBg = document.getElementById('starsBg');
const restartBtn = document.getElementById('restartBtn');

/* ========== สร้างดาวระยิบระยับพื้นหลัง ========== */
function createStars() {
  const starCount = 150;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.animationDuration = (2 + Math.random() * 3) + 's';
    
    // สุ่มขนาดดาว
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    
    starsBg.appendChild(star);
  }
}

/* ========== สร้างหัวใจลอยอวกาศ ========== */
function createFloatingHearts() {
  const heartEmojis = ['💗', '💖', '💕', '🩷', '💞', '✨', '🌟', '💫', '🦋', '🪐'];
  const heartCount = 15;

  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.animationDelay = Math.random() * 20 + 's';
    heart.style.animationDuration = (15 + Math.random() * 15) + 's';
    heart.style.fontSize = (1 + Math.random() * 2) + 'rem';
    starsBg.appendChild(heart);
  }
}
/* ========== Smooth Scroll ไปยัง Timeline ========== */
function smoothScrollToTimeline() {
  // แสดง Timeline ก่อน
  timelineSection.hidden = false;
  finale.hidden = false;
  
  // ใช้ requestAnimationFrame เพื่อให้ DOM อัปเดตก่อน scroll
  requestAnimationFrame(() => {
    const targetPosition = timelineSection.offsetTop - 20; // ห่างจากบน 20px
    
    // ใช้ custom smooth scroll
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1500; // 1.5 วินาที
    let startTime = null;
    
    function animationScroll(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // ใช้ easing function (easeInOutCubic)
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animationScroll);
      } else {
        // เมื่อ scroll เสร็จ ให้เริ่มแอนิเมชั่น Timeline Items
        animateTimelineItems();
      }
    }
    
    requestAnimationFrame(animationScroll);
  });
}

/* ========== เริ่มต้นการเดินทางอวกาศ ========== */
function startStory() {
  // ซ่อน Hero พร้อมแอนิเมชั่น
  hero.style.opacity = '0';
  hero.style.transform = 'translateY(-50px)';
  hero.style.transition = 'all 0.8s ease-out';
  
  setTimeout(() => {
    hero.classList.add('hidden');
    // รีเซ็ต style สำหรับกรณี restart
    hero.style.opacity = '';
    hero.style.transform = '';
  }, 800);
  
  // Smooth scroll ไป Timeline
  setTimeout(() => {
    smoothScrollToTimeline();
  }, 300);
}
/* ========== แอนิเมชั่น Timeline Items ========== */
function animateTimelineItems() {
  const items = document.querySelectorAll('.timeline-item');
  
  items.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add('visible');
    }, index * 300); // แต่ละอันจะแสดงที่ละ 300ms
  });
}

/* ========== ตรวจสอบ Scroll เพื่อแสดง Items ========== */
function setupScrollObserver() {
  const items = document.querySelectorAll('.timeline-item');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
  });
  
  items.forEach(item => observer.observe(item));
}

/* ========== เดินทางกลับไปอีกครั้ง ========== */
function restartStory() {
  // ซ่อน Timeline และ Finale
  timelineSection.hidden = true;
  finale.hidden = true;
  
  // รีเซ็ต Timeline Items
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.classList.remove('visible');
  });
  
  // แสดง Hero อีกครั้ง
  hero.classList.remove('hidden');
  
  // เลื่อนกลับไปบนสุด
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ========== Event Listeners ========== */
if (startBtn) {
  startBtn.addEventListener('click', startStory);
}

if (restartBtn) {
  restartBtn.addEventListener('click', restartStory);
}

/* ========== เริ่มต้น ========== */
document.addEventListener('DOMContentLoaded', () => {
  createStars();
  createFloatingHearts();
  setupScrollObserver();
  console.log('🚀 Space Love Story - พร้อมเดินทางท่องอวกาศแล้ว!');
});
