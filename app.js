/*
 * =========================================================
 *  💕 Love Story - Interactive Timeline
 *  เว็บบอกรักแฟน - Static Frontend 100%
 * =========================================================
 */

'use strict';

/* ========== ตัวแปรหลัก ========== */
const startBtn = document.getElementById('startBtn');
const hero = document.getElementById('hero');
const timelineSection = document.getElementById('timelineSection');
const finale = document.getElementById('finale');
const heartsBg = document.getElementById('heartsBg');
const restartBtn = document.getElementById('restartBtn');

/* ========== สร้างหัวใจลอยพื้นหลัง ========== */
function createFloatingHearts() {
  const heartEmojis = ['💗', '💖', '💕', '🩷', '💞', '🌸', '✨', '🦋'];
  const heartCount = 20;

  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.animationDelay = Math.random() * 15 + 's';
    heart.style.animationDuration = (15 + Math.random() * 10) + 's';
    heart.style.fontSize = (1 + Math.random() * 2) + 'rem';
    heartsBg.appendChild(heart);
  }
}

/* ========== เริ่มต้นเรื่องราวความรัก ========== */
function startStory() {
  // ซ่อน Hero
  hero.classList.add('hidden');
  
  // แสดง Timeline
  timelineSection.hidden = false;
  finale.hidden = false;
  
  // เริ่มแอนิเมชั่น Timeline Items
  animateTimelineItems();
  
  // เลื่อนไปที่ Timeline
  setTimeout(() => {
    timelineSection.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

/* ========== แอนิเมชั่น Timeline Items ========== */
function animateTimelineItems() {
  const items = document.querySelectorAll('.timeline-item');
  
  items.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add('visible');
    }, index * 400); // แต่ละอันจะแสดงที่ละ 400ms
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

/* ========== กลับไปดูอีกครั้ง ========== */
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
  createFloatingHearts();
  setupScrollObserver();
  console.log('💕 Love Story - พร้อมบอกรักแฟนแล้ว!');
});
