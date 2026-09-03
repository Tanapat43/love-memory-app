
'use strict';

const startBtn = document.getElementById('startBtn');
const hero = document.getElementById('hero');
const timelineSection = document.getElementById('timelineSection');
const timeline = document.getElementById('timeline');
const finale = document.getElementById('finale');
const starsBg = document.getElementById('starsBg');
const restartBtn = document.getElementById('restartBtn');
const photoInput = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const previewSection = document.getElementById('previewSection');
const thumbnailsContainer = document.getElementById('thumbnailsContainer');
const photoCount = document.getElementById('photoCount');
const displayCount = document.getElementById('displayCount');
const warpOverlay = document.getElementById('warpOverlay');

let selectedPhotos = [];

function createStars() {
  const starCount = 150;
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 3 + 's';
    star.style.animationDuration = (2 + Math.random() * 3) + 's';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    starsBg.appendChild(star);
  }
}

function createFloatingHearts() {
  const heartEmojis = ['❤️', '💕', '💖', '✨', '🌟', '💫'];
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

function savePhotosToStorage() {
  try {
    localStorage.setItem('spaceLovePhotos', JSON.stringify(selectedPhotos));
  } catch (e) {
    console.error('Storage full');
  }
}

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

function handlePhotoSelect(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(event) {
        selectedPhotos.push(event.target.result);
        displayThumbnails();
        savePhotosToStorage();
        previewSection.hidden = false;
        displayCount.max = selectedPhotos.length;
        displayCount.value = Math.min(selectedPhotos.length, 10);
      };
      reader.readAsDataURL(file);
    }
  });
}

function createTimeline() {
  const count = Math.min(parseInt(displayCount.value) || selectedPhotos.length, selectedPhotos.length);
  const photosToShow = selectedPhotos.slice(0, count);
  timeline.innerHTML = '';
  const dots = ['❤️', '💕', '💖', '✨', '🌟', '💫', '🦋', '🌸', '💝', '🩷'];
  photosToShow.forEach((photo, index) => {
    const isLeft = index % 2 === 0;
    const item = document.createElement('div');
    item.className = 'timeline-item ' + (isLeft ? 'left' : 'right');
    const dotIndex = index % dots.length;
    item.innerHTML = '<div class="timeline-card"><div class="card-image"><img src="' + photo + '" alt="Photo ' + (index + 1) + '" /></div></div><div class="timeline-connector"><div class="timeline-dot">' + dots[dotIndex] + '</div><div class="timeline-line"></div></div>';
    timeline.appendChild(item);
  });
}

function playWarpAnimation() {
  return new Promise(resolve => {
    warpOverlay.classList.add('active');
    setTimeout(() => {
      warpOverlay.classList.remove('active');
      resolve();
    }, 2000);
  });
}

function smoothScrollToTimeline() {
  timelineSection.hidden = false;
  finale.hidden = false;
  requestAnimationFrame(() => {
    const targetPosition = timelineSection.offsetTop - 20;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1500;
    let startTime = null;
    function animationScroll(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startPosition + distance * ease);
      if (timeElapsed < duration) {
        requestAnimationFrame(animationScroll);
      }
    }
    requestAnimationFrame(animationScroll);
  });
}

function animateTimelineItems() {
  const items = document.querySelectorAll('.timeline-item');
  items.forEach((item, index) => {
    setTimeout(() => {
      item.classList.add('visible');
    }, index * 300);
  });
}

async function startStory() {
  if (selectedPhotos.length === 0) {
    alert('Please select photos first!');
    return;
  }
  createTimeline();
  await playWarpAnimation();
  smoothScrollToTimeline();
  setTimeout(() => {
    animateTimelineItems();
  }, 1600);
}

function restartStory() {
  timelineSection.hidden = true;
  finale.hidden = true;
  document.querySelectorAll('.timeline-item').forEach(item => {
    item.classList.remove('visible');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if (startBtn) startBtn.addEventListener('click', startStory);
if (restartBtn) restartBtn.addEventListener('click', restartStory);
if (uploadBtn) uploadBtn.addEventListener('click', () => photoInput.click());
if (photoInput) photoInput.addEventListener('change', handlePhotoSelect);

document.addEventListener('DOMContentLoaded', () => {
  createStars();
  createFloatingHearts();
  loadPhotosFromStorage();
  console.log('Space Love Story ready!');
});
