'use strict';

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
  PIN_KEY: 'love-memory-pin',
  HEART_EMOJIS: ['\ud83d\udc97', '\ud83d\udc96', '\ud83d\udc95', '\ud83e\ude77', '\ud83d\udc9e', '\ud83c\udf38'],
  HEART_COUNT: 16
};

var API_ENDPOINT = CONFIG.API_BASE_URL + '/api/memories';
var MAX_FILE_MB = CONFIG.MAX_FILE_MB;
var MAX_IMAGE_WIDTH = CONFIG.MAX_IMAGE_WIDTH;
var MAX_IMAGE_HEIGHT = CONFIG.MAX_IMAGE_HEIGHT;
var COMPRESS_QUALITY = CONFIG.COMPRESS_QUALITY;
var APP_VERSION = CONFIG.APP_VERSION;
var LOCAL_CACHE_KEY = CONFIG.LOCAL_CACHE_KEY;
var THEME_STORAGE_KEY = CONFIG.THEME_STORAGE_KEY;
var ANNIVERSARY_KEY = CONFIG.ANNIVERSARY_KEY;
var AUTH_KEY = CONFIG.AUTH_KEY;
var PIN_KEY = CONFIG.PIN_KEY;
var HEART_EMOJIS = CONFIG.HEART_EMOJIS;
var HEART_COUNT = CONFIG.HEART_COUNT;
var els = {
  authView: document.getElementById('authView'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authError: document.getElementById('authError'),
  tabLogin: document.getElementById('tabLogin'),
  tabRegister: document.getElementById('tabRegister'),
  logoutBtn: document.getElementById('logoutBtn'),
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
  importInput: document.getElementById('importInput')
};

var allMemories = [];
var pendingDeleteId = null;
var currentImageData = null;
var isRegisterMode = false;
function showToast(message) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(function() { els.toast.classList.remove('show'); }, 3000);
}

function showError(message) {
  if (els.authError) {
    els.authError.textContent = message;
    els.authError.classList.remove('hidden');
  }
}

function clearError() {
  if (els.authError) {
    els.authError.textContent = '';
    els.authError.classList.add('hidden');
  }
}

function switchToLogin() {
  isRegisterMode = false;
  if (els.tabLogin) els.tabLogin.classList.add('active');
  if (els.tabRegister) els.tabRegister.classList.remove('active');
  if (els.authSubmitBtn) els.authSubmitBtn.textContent = 'Login';
  if (els.authEmail) els.authEmail.style.display = '';
  clearError();
}

function switchToRegister() {
  isRegisterMode = true;
  if (els.tabRegister) els.tabRegister.classList.add('active');
  if (els.tabLogin) els.tabLogin.classList.remove('active');
  if (els.authSubmitBtn) els.authSubmitBtn.textContent = 'Register';
  if (els.authEmail) els.authEmail.style.display = '';
  clearError();
}
function isLoggedIn() {
  try { return localStorage.getItem(AUTH_KEY) === 'true'; } catch (e) { return false; }
}

function setLoggedIn(status) {
  try {
    if (status) localStorage.setItem(AUTH_KEY, 'true');
    else localStorage.removeItem(AUTH_KEY);
  } catch (e) {}
}

function getSavedPin() {
  try { return localStorage.getItem(PIN_KEY); } catch (e) { return null; }
}

function savePin(pin) {
  try { localStorage.setItem(PIN_KEY, pin); } catch (e) {}
}

function loginWithPin(pin) {
  var savedPin = getSavedPin();
  if (!savedPin) {
    savePin(pin);
    setLoggedIn(true);
    return { success: true, message: 'Pin set successfully' };
  }
  if (pin === savedPin) {
    setLoggedIn(true);
    return { success: true, message: 'Login successful' };
  }
  return { success: false, message: 'Invalid PIN' };
}

function logout() {
  setLoggedIn(false);
  showAuthView();
  showToast('Logged out');
}

function showAuthView() {
  if (els.authView) els.authView.classList.remove('hidden');
  var header = document.querySelector('.header');
  var container = document.querySelector('.container');
  var footer = document.querySelector('.footer');
  if (header) header.style.display = 'none';
  if (container) container.style.display = 'none';
  if (footer) footer.style.display = 'none';
  switchToLogin();
}

function showMainView() {
  if (els.authView) els.authView.classList.add('hidden');
  var header = document.querySelector('.header');
  var container = document.querySelector('.container');
  var footer = document.querySelector('.footer');
  if (header) header.style.display = '';
  if (container) container.style.display = '';
  if (footer) footer.style.display = '';
}
function handleAuthSubmit(e) {
  e.preventDefault();
  clearError();
  
  var password = els.authPassword ? els.authPassword.value.trim() : '';
  var email = els.authEmail ? els.authEmail.value.trim() : '';
  
  if (!password || password.length < 4) {
    showError('Please enter at least 4 characters');
    return;
  }
  
  if (isRegisterMode && !email) {
    showError('Please enter email');
    return;
  }
  
  if (els.authSubmitBtn) {
    els.authSubmitBtn.disabled = true;
    els.authSubmitBtn.textContent = 'Processing...';
  }
  
  setTimeout(function() {
    var result = loginWithPin(password);
    
    if (result.success) {
      showToast(result.message);
      showMainView();
      loadMemories();
    } else {
      showError(result.message);
    }
    
    if (els.authSubmitBtn) {
      els.authSubmitBtn.disabled = false;
      els.authSubmitBtn.textContent = isRegisterMode ? 'Register' : 'Login';
    }
  }, 500);
}
async function fetchMemoriesFromAPI() {
  try {
    var response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map(function(item) {
        return {
          id: item._id,
          image: item.image || '',
          text: item.text || '',
          title: item.title || '',
          date: item.date || '',
          createdAt: item.createdAt
        };
      });
    }
    return [];
  } catch (error) {
    console.error('API Error:', error.message);
    return null;
  }
}

async function saveMemoryToAPI(memoryData) {
  try {
    var response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(memoryData)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('Save Error:', error.message);
    return { success: false, message: error.message };
  }
}

async function deleteMemoryFromAPI(memoryId) {
  try {
    var response = await fetch(API_ENDPOINT + '?id=' + memoryId, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } catch (error) {
    console.error('Delete Error:', error.message);
    return { success: false, message: error.message };
  }
}
function getLocalCache() {
  try {
    var cached = localStorage.getItem(LOCAL_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) { return []; }
}

function setLocalCache(memories) {
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(memories)); }
  catch (e) { console.warn('Cache save failed:', e.message); }
}

async function loadMemories() {
  showLoadingState();
  var apiMemories = await fetchMemoriesFromAPI();
  
  if (apiMemories && apiMemories.length > 0) {
    allMemories = apiMemories;
    setLocalCache(allMemories);
    renderGallery();
    updateStorageInfo('Loaded: ' + allMemories.length + ' items');
  } else if (apiMemories && apiMemories.length === 0) {
    allMemories = [];
    renderGallery();
    updateStorageInfo('No memories yet');
  } else {
    var cached = getLocalCache();
    if (cached.length > 0) {
      allMemories = cached;
      renderGallery();
      updateStorageInfo('Loaded from cache (API unavailable)');
    } else {
      allMemories = [];
      renderGallery();
      updateStorageInfo('API unavailable - using local storage');
    }
  }
}

function showLoadingState() {
  if (els.gallery) els.gallery.innerHTML = '<li class="loading-state">Loading...</li>';
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
  
  allMemories.forEach(function(memory, index) {
    var li = document.createElement('li');
    li.className = 'timeline-item ' + (index % 2 === 0 ? 'left' : 'right');
    li.dataset.id = memory.id;
    
    var dateFormatted = formatDate(memory.date);
    var hasImage = memory.image && memory.image.length > 0;
    var hasText = memory.text && memory.text.trim().length > 0;
    
    var html = '<div class="memory-card">';
    html += '<div class="memory-header">';
    html += '<span class="memory-date">' + dateFormatted + '</span>';
    html += '<button type="button" class="btn-delete-memory" data-id="' + memory.id + '">Delete</button>';
    html += '</div>';
    if (hasImage) html += '<div class="memory-image-wrap"><img src="' + memory.image + '" loading="lazy" /></div>';
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
async function handleSaveMemory(e) {
  e.preventDefault();
  if (!els.memoryText) return;
  
  var text = els.memoryText.value.trim();
  var imageData = currentImageData;
  
  if (!text && !imageData) {
    showToast('Please add image or text');
    return;
  }
  
  if (els.saveBtn) {
    els.saveBtn.disabled = true;
    els.saveBtn.textContent = 'Saving...';
  }
  
  var memoryData = { image: imageData || '', text: text, date: new Date().toISOString().split('T')[0] };
  var result = await saveMemoryToAPI(memoryData);
  
  if (result.success) {
    showToast('Saved successfully');
    resetForm();
    await loadMemories();
  } else {
    var newMemory = { id: 'local-' + Date.now(), image: memoryData.image, text: memoryData.text, date: memoryData.date, createdAt: new Date().toISOString() };
    allMemories.unshift(newMemory);
    setLocalCache(allMemories);
    renderGallery();
    showToast('Saved locally (API unavailable)');
  }
  
  if (els.saveBtn) {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = 'Save Memory';
  }
}

function resetForm() {
  if (els.form) els.form.reset();
  currentImageData = null;
  if (els.previewWrap) els.previewWrap.classList.add('hidden');
  if (els.dropZone) els.dropZone.classList.remove('has-image');
  if (els.dropText) els.dropText.textContent = 'Tap to select image';
}

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
    showToast('Deleted');
    closeDeleteModal();
    await loadMemories();
  } else {
    allMemories = allMemories.filter(function(m) { return m.id !== pendingDeleteId; });
    setLocalCache(allMemories);
    renderGallery();
    closeDeleteModal();
    showToast('Deleted locally');
  }
}
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
  if (!validTypes.includes(file.type)) { showToast('Only JPG, PNG, GIF, WEBP'); return; }
  if (file.size / (1024 * 1024) > MAX_FILE_MB) { showToast('File too large (max ' + MAX_FILE_MB + 'MB)'); return; }
  try {
    var dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > 200 * 1024) {
      dataUrl = await resizeImage(dataUrl, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, COMPRESS_QUALITY);
    }
    currentImageData = dataUrl;
    if (els.previewImg) els.previewImg.src = dataUrl;
    if (els.previewWrap) els.previewWrap.classList.remove('hidden');
    if (els.dropZone) els.dropZone.classList.add('has-image');
    if (els.dropText) els.dropText.textContent = 'Image selected';
  } catch (error) { showToast('Cannot process image'); }
}

async function handleFileSelect(e) {
  var file = e.target.files[0];
  if (file) await processImageFile(file);
}

function handleRemovePreview() {
  currentImageData = null;
  if (els.previewWrap) els.previewWrap.classList.add('hidden');
  if (els.dropZone) els.dropZone.classList.remove('has-image');
  if (els.dropText) els.dropText.textContent = 'Tap to select image';
  if (els.photoInput) els.photoInput.value = '';
}

function handleDragOver(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.add('drag-over'); }
function handleDragLeave(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.remove('drag-over'); }
function handleDrop(e) { e.preventDefault(); if (els.dropZone) els.dropZone.classList.remove('drag-over'); var files = e.dataTransfer.files; if (files.length > 0) processImageFile(files[0]); }
function loadTheme() {
  try {
    var saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') { document.body.classList.add('dark-mode'); if (els.themeToggle) els.themeToggle.textContent = 'Sun'; }
  } catch (e) {}
}

function toggleTheme() {
  var isDark = document.body.classList.toggle('dark-mode');
  try { localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light'); } catch (e) {}
  if (els.themeToggle) els.themeToggle.textContent = isDark ? 'Sun' : 'Moon';
}

function getAnniversary() { try { return localStorage.getItem(ANNIVERSARY_KEY); } catch (e) { return null; } }

function renderDaysCounter() {
  var stored = getAnniversary();
  if (els.anniversaryInput) els.anniversaryInput.value = stored || '';
  if (els.clearAnniversary) els.clearAnniversary.hidden = !stored;
  if (!stored) { if (els.daysText) els.daysText.textContent = 'Set your start date'; return; }
  var parts = stored.split('-').map(Number);
  var start = new Date(parts[0], parts[1] - 1, parts[2]);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var diffDays = Math.floor((today - start) / 86400000);
  if (!els.daysText) return;
  if (isNaN(diffDays)) { els.daysText.textContent = 'Invalid date'; }
  else if (diffDays < 0) { els.daysText.textContent = 'Future date'; }
  else if (diffDays === 0) { els.daysText.textContent = 'First day!'; }
  else { els.daysText.textContent = 'Days together: ' + diffDays.toLocaleString('th-TH'); }
}

function handleAnniversaryChange() {
  var value = els.anniversaryInput ? els.anniversaryInput.value : '';
  try { if (value) { localStorage.setItem(ANNIVERSARY_KEY, value); showToast('Saved'); } else { localStorage.removeItem(ANNIVERSARY_KEY); } } catch (e) {}
  renderDaysCounter();
}

function handleAnniversaryClear() { try { localStorage.removeItem(ANNIVERSARY_KEY); } catch (e) {} renderDaysCounter(); showToast('Cleared'); }
function handleExport() {
  if (allMemories.length === 0) { showToast('No data to export'); return; }
  var data = { version: APP_VERSION, exportDate: new Date().toISOString(), memories: allMemories };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = 'love-memories-' + new Date().toISOString().split('T')[0] + '.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('Export successful');
}

async function handleImport(e) {
  var file = e.target.files[0]; if (!file) return;
  try {
    var text = await file.text();
    var data = JSON.parse(text);
    if (!data.memories || !Array.isArray(data.memories)) { showToast('Invalid file'); return; }
    var importedCount = 0;
    for (var i = 0; i < data.memories.length; i++) {
      var memory = data.memories[i];
      var result = await saveMemoryToAPI({ image: memory.image || '', text: memory.text || '', date: memory.date || new Date().toISOString().split('T')[0] });
      if (result.success) importedCount++;
    }
    showToast('Imported ' + importedCount + ' items');
    await loadMemories();
  } catch (error) { showToast('Import failed: ' + error.message); }
  if (els.importInput) els.importInput.value = '';
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
function bindEvents() {
  if (els.tabLogin) els.tabLogin.addEventListener('click', switchToLogin);
  if (els.tabRegister) els.tabRegister.addEventListener('click', switchToRegister);
  if (els.authForm) els.authForm.addEventListener('submit', handleAuthSubmit);
  if (els.logoutBtn) els.logoutBtn.addEventListener('click', logout);
  if (els.form) els.form.addEventListener('submit', handleSaveMemory);
  if (els.photoInput) els.photoInput.addEventListener('change', handleFileSelect);
  if (els.removePreview) els.removePreview.addEventListener('click', handleRemovePreview);
  if (els.dropZone) { els.dropZone.addEventListener('dragover', handleDragOver); els.dropZone.addEventListener('dragleave', handleDragLeave); els.dropZone.addEventListener('drop', handleDrop); }
  if (els.cancelDelete) els.cancelDelete.addEventListener('click', closeDeleteModal);
  if (els.confirmDelete) els.confirmDelete.addEventListener('click', handleConfirmDelete);
  if (els.deleteModal) els.deleteModal.addEventListener('click', function(e) { if (e.target === els.deleteModal) closeDeleteModal(); });
  if (els.themeToggle) els.themeToggle.addEventListener('click', toggleTheme);
  if (els.anniversaryInput) els.anniversaryInput.addEventListener('change', handleAnniversaryChange);
  if (els.clearAnniversary) els.clearAnniversary.addEventListener('click', handleAnniversaryClear);
  if (els.exportBtn) els.exportBtn.addEventListener('click', handleExport);
  if (els.importInput) els.importInput.addEventListener('change', handleImport);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDeleteModal(); });
}

async function init() {
  console.log('Love Memory App v' + APP_VERSION + ' (API Mode)');
  console.log('API Endpoint: ' + API_ENDPOINT);
  bindEvents();
  loadTheme();
  createFloatingHearts();
  if (isLoggedIn()) { showMainView(); renderDaysCounter(); await loadMemories(); }
  else { showAuthView(); }
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
else { init(); }
