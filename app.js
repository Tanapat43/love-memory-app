'use strict';

/* =========================================================
   Love Memory App - app.js (API Mode)
   API-based version using Vercel + MongoDB Atlas
   ========================================================= */

// ใช้ CONFIG จาก config.js
var CONFIG = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : {
  API_BASE_URL: 'https://your-vercel-app.vercel.app',
  APP_VERSION: '4.0.0',
  MAX_FILE_MB: 20,
  MAX_IMAGE_WIDTH: 500,
  MAX_IMAGE_HEIGHT: 500,
  COMPRESS_QUALITY: 0.4,
  LOCAL_CACHE_KEY: 'love-memory-cache',
  THEME_STORAGE_KEY: 'love-memory-theme',
  ANNIVERSARY_KEY: 'love-memory-anniversary',
  AUTH_KEY: 'love-memory-auth',
  HEART_EMOJIS: ['\ud83d\udc97', '\ud83d\udc96', '\ud83d\udc95', '\ud83e\ude77', '\ud83d\udc9e', '\ud83c\udf38'],
  HEART_COUNT: 16
};

const API_ENDPOINT = CONFIG.API_BASE_URL + '/api/memories';
const MAX_FILE_MB = CONFIG.MAX_FILE_MB;
const MAX_IMAGE_WIDTH = CONFIG.MAX_IMAGE_WIDTH;
const MAX_IMAGE_HEIGHT = CONFIG.MAX_IMAGE_HEIGHT;
const COMPRESS_QUALITY = CONFIG.COMPRESS_QUALITY;
const APP_VERSION = CONFIG.APP_VERSION;
const LOCAL_CACHE_KEY = CONFIG.LOCAL_CACHE_KEY;
const THEME_STORAGE_KEY = CONFIG.THEME_STORAGE_KEY;
const ANNIVERSARY_KEY = CONFIG.ANNIVERSARY_KEY;
const AUTH_KEY = CONFIG.AUTH_KEY;
const HEART_EMOJIS = CONFIG.HEART_EMOJIS;
const HEART_COUNT = CONFIG.HEART_COUNT;
/* ========== Authentication System ========== */

// ตรวจสอบว่าล็อกอินอยู่หรือไม่
function isLoggedIn() {
  try {
    return localStorage.getItem(AUTH_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

// เข้าสู่ระบบ (PIN-based Auth)
function login(pin) {
  try {
    // ถ้ายังไม่มี PIN ที่บันทึกไว้ ให้ตั้ง PIN นี้เป็นค่าเริ่มต้น
    var savedPin = localStorage.getItem('love-memory-pin');
    if (!savedPin) {
      // ครั้งแรก - บันทึก PIN ที่กรอก
      localStorage.setItem('love-memory-pin', pin);
      localStorage.setItem(AUTH_KEY, 'true');
      return { success: true, message: 'ตั้งรหัสผ่านสำเร็จ! ยินดีต้อนรับ 💕' };
    }
    // ตรวจสอบ PIN
    if (pin === savedPin) {
      localStorage.setItem(AUTH_KEY, 'true');
      return { success: true, message: 'เข้าสู่ระบบสำเร็จ 💕' };
    }
    return { success: false, message: 'รหัสผ่านไม่ถูกต้อง ลองใหม่นะ 🥺' };
  } catch (e) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

// ออกจากระบบ
function logout() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {}
  showAuthView();
}

// แสดงหน้า Login
function showAuthView() {
  var authView = document.getElementById('authView');
  if (authView) authView.classList.remove('hidden');
  
  // ซ่อนส่วนหลัก
  var header = document.querySelector('.header');
  var container = document.querySelector('.container');
  if (header) header.style.display = 'none';
  if (container) container.style.display = 'none';
}

// แสดงหน้าหลัก (หลัง Login สำเร็จ)
function showMainView() {
  var authView = document.getElementById('authView');
  if (authView) authView.classList.add('hidden');
  
  // แสดงส่วนหลัก
  var header = document.querySelector('.header');
  var container = document.querySelector('.container');
  if (header) header.style.display = '';
  if (container) container.style.display = '';
}

// จัดการการส่งฟอร์ม Login
function handleAuthSubmit(e) {
  e.preventDefault();
  
  var pinInput = document.getElementById('authPassword');
  var errorEl = document.getElementById('authError');
  var submitBtn = document.getElementById('authSubmitBtn');
  
  var pin = pinInput.value.trim();
  
  if (!pin || pin.length < 4) {
    if (errorEl) {
      errorEl.textContent = 'กรุณาใส่รหัสผ่านอย่างน้อย 4 ตัว';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // แสดงสถานะกำลังประมวลผล
  if (submitBtn) submitBtn.textContent = '⏳ กำลังตรวจสอบ...';
  
  // จำลอง delay เล็กน้อย
  setTimeout(function() {
    var result = login(pin);
    
    if (result.success) {
      showToast(result.message);
      showMainView();
      // โหลดข้อมูลหลังเข้าสู่ระบบ
      loadMemories();
    } else {
      if (errorEl) {
        errorEl.textContent = result.message;
        errorEl.classList.remove('hidden');
      }
      if (submitBtn) submitBtn.textContent = '💕 เข้าสู่ระบบ';
    }
  }, 500);
}
const els = {
  form: document.getElementById('memoryForm'),
  photoInput: document.getElementById('photoInput'),
  dropZone: document.getElementById('dropZone'),
  dropIcon: document.getElementById('dropIcon'),
  dropText: document.getElementById('dropText'),
  dropHint: document.getElementById('dropHint'),
  previewWrap: document.getElementById('previewWrap'),
  previewImg: document.getElementById('previewImg'),
  removePreview: document.getElementById('removePreview'),
  memoryText: document.getElementById('memoryText'),
  saveBtn: document.getElementById('saveBtn'),
  gallery: document.getElementById('gallery'),
  emptyState: document.getElementById('emptyState'),
  emptyText: document.querySelector('#emptyState p'),
  memoryCount: document.getElementById('memoryCount'),
  heartsBg: document.getElementById('heartsBg'),
  toast: document.getElementById('toast'),
  deleteModal: document.getElementById('deleteModal'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete'),
  storageInfo: document.getElementById('storageInfo'),
  themeToggle: document.getElementById('themeToggle'),
  daysText: document.getElementById('daysText'),
  anniversaryInput: document.getElementById('anniversaryInput'),
  clearAnniversary: document.getElementById('clearAnniversary'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  authForm: document.getElementById('authForm'),
  logoutBtn: document.getElementById('logoutBtn'),
};

let allMemories = [];
let pendingDeleteId = null;
let currentImageData = null;
/* ========== API Functions ========== */

async function fetchMemoriesFromAPI() {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((item) => ({
        id: item._id,
        image: item.image || '',
        text: item.text || '',
        title: item.title || '',
        date: item.date || '',
        createdAt: item.createdAt,
      }));
    }
    return [];
  } catch (error) {
    console.error('fetchMemoriesFromAPI Error:', error.message);
    return null;
  }
}

async function saveMemoryToAPI(memoryData) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(memoryData),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('saveMemoryToAPI Error:', error.message);
    return { success: false, message: error.message };
  }
}

async function deleteMemoryFromAPI(memoryId) {
  try {
    const response = await fetch(API_ENDPOINT + '?id=' + memoryId, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('deleteMemoryFromAPI Error:', error.message);
    return { success: false, message: error.message };
  }
}
/* ========== Local Cache ========== */

function getLocalCache() {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) { return []; }
}

function setLocalCache(memories) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.warn('Cannot save cache:', e.message);
  }
}

/* ========== Load and Render ========== */

async function loadMemories() {
  showLoadingState();
  const apiMemories = await fetchMemoriesFromAPI();
  if (apiMemories && apiMemories.length > 0) {
    allMemories = apiMemories;
    setLocalCache(allMemories);
    renderGallery();
    updateStorageInfo('โหลดสำเร็จ: ' + allMemories.length + ' รายการ');
  } else if (apiMemories && apiMemories.length === 0) {
    allMemories = [];
    renderGallery();
    updateStorageInfo('ยังไม่มีความทรงจำ - เริ่มเพิ่มได้เลย!');
  } else {
    const cached = getLocalCache();
    if (cached.length > 0) {
      allMemories = cached;
      renderGallery();
      updateStorageInfo('โหลดจากแคช (ออฟไลน์)');
    } else {
      allMemories = [];
      renderGallery();
      updateStorageInfo('ไม่สามารถเชื่อมต่อ API - ตรวจสอบ Vercel URL');
    }
  }
}

function showLoadingState() {
  if (els.gallery) els.gallery.innerHTML = '<li class="loading-state">กำลังโหลดความทรงจำ...</li>';
  if (els.emptyState) els.emptyState.classList.add('hidden');
}

function renderGallery() {
  if (!els.gallery) return;
  els.gallery.innerHTML = '';
  if (allMemories.length === 0) {
    if (els.emptyState) els.emptyState.classList.remove('hidden');
    if (els.memoryCount) els.memoryCount.textContent = '';
    return;
  }
  if (els.emptyState) els.emptyState.classList.add('hidden');
  if (els.memoryCount) els.memoryCount.textContent = '(' + allMemories.length + ')';
  allMemories.forEach((memory, index) => {
    var li = document.createElement('li');
    li.className = 'timeline-item ' + (index % 2 === 0 ? 'left' : 'right');
    li.dataset.id = memory.id;
    var dateFormatted = formatDate(memory.date);
    var hasImage = memory.image && memory.image.length > 0;
    var hasText = memory.text && memory.text.trim().length > 0;
    var html = '<div class="memory-card">';
    html += '<div class="memory-header">';
    html += '<span class="memory-date">' + dateFormatted + '</span>';
    html += '<button type="button" class="btn-delete-memory" data-id="' + memory.id + '" aria-label="ลบ">Del</button>';
    html += '</div>';
    if (hasImage) html += '<div class="memory-image-wrap"><img src="' + memory.image + '" alt="memory" loading="lazy" /></div>';
    if (hasText) html += '<p class="memory-text">' + escapeHtml(memory.text) + '</p>';
    html += '</div>';
    li.innerHTML = html;
    els.gallery.appendChild(li);
  });
  document.querySelectorAll('.btn-delete-memory').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openDeleteModal(btn.dataset.id);
    });
  });
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    var date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return dateString; }
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateStorageInfo(message) {
  if (els.storageInfo) els.storageInfo.textContent = message;
}
/* ========== Save Memory ========== */

async function handleSaveMemory(e) {
  e.preventDefault();
  if (!els.memoryText) return;
  var text = els.memoryText.value.trim();
  var imageData = currentImageData;
  if (!text && !imageData) {
    showToast('กรุณาเพิ่มรูปภาพหรือข้อความอย่างน้อย 1 อย่าง');
    return;
  }
  if (els.saveBtn) {
    els.saveBtn.disabled = true;
    els.saveBtn.textContent = 'กำลังบันทึก...';
  }
  var memoryData = { image: imageData || '', text: text, date: new Date().toISOString().split('T')[0] };
  var result = await saveMemoryToAPI(memoryData);
  if (result.success) {
    showToast('บันทึกความทรงจำสำเร็จ');
    resetForm();
    await loadMemories();
  } else {
    showToast('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถบันทึกได้'));
  }
  if (els.saveBtn) {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = 'บันทึกความทรงจำ';
  }
}

function resetForm() {
  if (els.form) els.form.reset();
  currentImageData = null;
  if (els.previewWrap) els.previewWrap.classList.add('hidden');
  if (els.dropZone) els.dropZone.classList.remove('has-image');
  if (els.dropText) els.dropText.textContent = 'แตะเพื่อเลือกรูปภาพ';
}

/* ========== Delete Memory ========== */

function openDeleteModal(memoryId) {
  pendingDeleteId = memoryId;
  if (els.deleteModal) els.deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  if (els.deleteModal) els.deleteModal.classList.add('hidden');
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;
  var result = await deleteMemoryFromAPI(pendingDeleteId);
  if (result.success) {
    showToast('ลบความทรงจำแล้ว');
    closeDeleteModal();
    await loadMemories();
  } else {
    showToast('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถลบได้'));
  }
}
/* ========== Image Processing ========== */

function fileToDataUrl(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(reader.error || new Error('Read failed')); };
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl, maxWidth, maxHeight, quality) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w <= maxWidth && h <= maxHeight) { resolve(dataUrl); return; }
      var ratio = Math.min(maxWidth / w, maxHeight / h);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { reject(new Error('Image load failed')); };
    img.src = dataUrl;
  });
}

async function processImageFile(file) {
  var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) { showToast('รองรับเฉพาะไฟล์ JPG, PNG, GIF, WEBP'); return; }
  if (file.size / (1024 * 1024) > MAX_FILE_MB) { showToast('ไฟล์ใหญ่เกินไป (สูงสุด ' + MAX_FILE_MB + 'MB)'); return; }
  try {
    var dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > 200 * 1024) {
      dataUrl = await resizeImage(dataUrl, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, COMPRESS_QUALITY);
    }
    currentImageData = dataUrl;
    if (els.previewImg) els.previewImg.src = dataUrl;
    if (els.previewWrap) els.previewWrap.classList.remove('hidden');
    if (els.dropZone) els.dropZone.classList.add('has-image');
    if (els.dropText) els.dropText.textContent = 'เลือกรูปแล้ว';
  } catch (error) {
    showToast('ไม่สามารถประมวลผลรูปภาพได้');
  }
}

async function handleFileSelect(e) {
  var file = e.target.files[0];
  if (file) await processImageFile(file);
}

function handleRemovePreview() {
  currentImageData = null;
  if (els.previewWrap) els.previewWrap.classList.add('hidden');
  if (els.dropZone) els.dropZone.classList.remove('has-image');
  if (els.dropText) els.dropText.textContent = 'แตะเพื่อเลือกรูปภาพ';
  if (els.photoInput) els.photoInput.value = '';
}

function handleDragOver(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.add('drag-over'); }
function handleDragLeave(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.remove('drag-over'); }
function handleDrop(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.remove('drag-over'); var files = e.dataTransfer.files; if (files.length > 0) processImageFile(files[0]); }
/* ========== Theme ========== */

function loadTheme() {
  try {
    var saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') {
      document.body.classList.add('dark-mode');
      if (els.themeToggle) els.themeToggle.textContent = 'Sun';
    }
  } catch (e) {}
}

function toggleTheme() {
  var isDark = document.body.classList.toggle('dark-mode');
  try { localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
  if (els.themeToggle) els.themeToggle.textContent = isDark ? 'Sun' : 'Moon';
}

/* ========== Anniversary Counter ========== */

function getAnniversary() { try { return localStorage.getItem(ANNIVERSARY_KEY); } catch (e) { return null; } }

function renderDaysCounter() {
  var stored = getAnniversary();
  if (els.anniversaryInput) els.anniversaryInput.value = stored || '';
  if (els.clearAnniversary) els.clearAnniversary.hidden = !stored;
  if (!stored) {
    if (els.daysText) els.daysText.textContent = 'ตั้งวันแรกที่เริ่มคบกันด้านล่าง';
    return;
  }
  var parts = stored.split('-').map(Number);
  var start = new Date(parts[0], parts[1] - 1, parts[2]);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var diffDays = Math.floor((today - start) / 86400000);
  if (isNaN(diffDays)) { if (els.daysText) els.daysText.textContent = 'วันที่ไม่ถูกต้อง'; }
  else if (diffDays < 0) { if (els.daysText) els.daysText.textContent = 'วันแรกยังอยู่ข้างหน้า'; }
  else if (diffDays === 0) { if (els.daysText) els.daysText.textContent = 'วันนี้คือวันแรกของเรา!'; }
  else { if (els.daysText) els.daysText.textContent = 'เราคบกันมาแล้ว ' + diffDays.toLocaleString('th-TH') + ' วัน'; }
}

function handleAnniversaryChange() {
  var value = els.anniversaryInput ? els.anniversaryInput.value : '';
  try { if (value) { localStorage.setItem(ANNIVERSARY_KEY, value); showToast('บันทึกวันแรกไว้แล้ว'); } else { localStorage.removeItem(ANNIVERSARY_KEY); } } catch (e) {}
  renderDaysCounter();
}

function handleAnniversaryClear() { try { localStorage.removeItem(ANNIVERSARY_KEY); } catch (e) {} renderDaysCounter(); showToast('ล้างวันครบรอบแล้ว'); }
/* ========== Export / Import ========== */

function handleExport() {
  if (allMemories.length === 0) { showToast('ยังไม่มีข้อมูลให้ Export'); return; }
  var data = { version: APP_VERSION, exportDate: new Date().toISOString(), memories: allMemories };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'love-memories-' + new Date().toISOString().split('T')[0] + '.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Export ข้อมูลสำเร็จ');
}

async function handleImport(e) {
  var file = e.target.files[0]; if (!file) return;
  try {
    var text = await file.text();
    var data = JSON.parse(text);
    if (!data.memories || !Array.isArray(data.memories)) { showToast('ไฟล์ไม่ถูกต้อง'); return; }
    var importedCount = 0;
    for (var i = 0; i < data.memories.length; i++) {
      var memory = data.memories[i];
      var result = await saveMemoryToAPI({ image: memory.image || '', text: memory.text || '', date: memory.date || new Date().toISOString().split('T')[0] });
      if (result.success) importedCount++;
    }
    showToast('Import สำเร็จ ' + importedCount + ' รายการ');
    await loadMemories();
  } catch (error) { showToast('Import ไม่สำเร็จ: ' + error.message); }
  if (els.importInput) els.importInput.value = '';
}

/* ========== UI Helpers ========== */

function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(function() { els.toast.classList.remove('show'); }, 3000);
}

function createFloatingHearts() {
  if (!els.heartsBg) return;
  for (var i = 0; i < HEART_COUNT; i++) {
    var heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.animationDelay = Math.random() * 15 + 's';
    heart.style.animationDuration = (15 + Math.random() * 10) + 's';
    heart.style.fontSize = (1 + Math.random() * 2) + 'rem';
    els.heartsBg.appendChild(heart);
  }
}
/* ========== Initialization ========== */

function bindEvents() {
  // Auth form
  if (els.authForm) els.authForm.addEventListener('submit', handleAuthSubmit);
  
  // Memory form
  if (els.form) els.form.addEventListener('submit', handleSaveMemory);
  
  // Image upload
  if (els.photoInput) els.photoInput.addEventListener('change', handleFileSelect);
  if (els.removePreview) els.removePreview.addEventListener('click', handleRemovePreview);
  
  // Drag & Drop
  if (els.dropZone) {
    els.dropZone.addEventListener('dragover', handleDragOver);
    els.dropZone.addEventListener('dragleave', handleDragLeave);
    els.dropZone.addEventListener('drop', handleDrop);
  }
  
  // Delete modal
  if (els.cancelDelete) els.cancelDelete.addEventListener('click', closeDeleteModal);
  if (els.confirmDelete) els.confirmDelete.addEventListener('click', handleConfirmDelete);
  if (els.deleteModal) els.deleteModal.addEventListener('click', function(e) { if (e.target === els.deleteModal) closeDeleteModal(); });
  
  // Theme toggle
  if (els.themeToggle) els.themeToggle.addEventListener('click', toggleTheme);
  
  // Logout
  if (els.logoutBtn) els.logoutBtn.addEventListener('click', logout);
  
  // Anniversary
  if (els.anniversaryInput) els.anniversaryInput.addEventListener('change', handleAnniversaryChange);
  if (els.clearAnniversary) els.clearAnniversary.addEventListener('click', handleAnniversaryClear);
  
  // Export/Import
  if (els.exportBtn) els.exportBtn.addEventListener('click', handleExport);
  if (els.importInput) els.importInput.addEventListener('change', handleImport);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDeleteModal(); });
}

async function init() {
  console.log('Love Memory App v' + APP_VERSION + ' (API Mode)');
  console.log('API Endpoint: ' + API_ENDPOINT);
  
  // ผูก events
  bindEvents();
  
  // โหลดธีม
  loadTheme();
  
  // สร้างหัวใจลอย
  createFloatingHearts();
  
  // ตรวจสอบสถานะล็อกอิน
  if (isLoggedIn()) {
    // ล็อกอินแล้ว - แสดงหน้าหลัก
    showMainView();
    await loadMemories();
  } else {
    // ยังไม่ล็อกอิน - แสดงหน้า Login
    showAuthView();
  }
}

// เริ่มทำงานเมื่อ DOM พร้อม
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
