'use strict';

/* =========================================================
   💗 ความทรงจำของเรา — app.js (Privacy-First)
   ---------------------------------------------------------
   • ข้อมูลทั้งหมด (รูปภาพ + ข้อความ) ถูกบันทึกด้วย IndexedDB
     ลงในเบราว์เซอร์ของผู้ใช้เท่านั้น
   • ไฟล์นี้ไม่มี fetch / XMLHttpRequest / WebSocket / sendBeacon
     จึงไม่มีทางส่งข้อมูลออกไปยังเซิร์ฟเวอร์ใดๆ — ปลอดภัย 100%
   • เปิดหน้าเว็บครั้งถัดไป ระบบจะโหลดความทรงจำเก่าให้อัตโนมัติ
   ========================================================= */

/* ---------- ค่าคงที่ ---------- */
const DB_NAME = 'love-memory-db';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const MAX_FILE_MB = 20;
const HEART_EMOJIS = ['💗', '💖', '💕', '🩷', '💞', '🌸'];
const HEART_COUNT = 16;

/* ---------- อ้างอิงองค์ประกอบในหน้าเว็บ ---------- */
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
};

/* ---------- สถานะของแอป ---------- */
let db = null;                 // การเชื่อมต่อฐานข้อมูล IndexedDB
let pendingFile = null;        // รูปที่เลือกไว้ก่อนกดบันทึก
let previewUrl = null;         // Object URL ของรูปตัวอย่าง
let pendingDeleteId = null;    // รายการที่รอยืนยันการลบ
let toastTimer = null;
const objectUrls = new Set();  // Object URL ของรูปในแกลเลอรี (คืนหน่วยความจำทีหลัง)

/* =========================================================
   ส่วนที่ 1: IndexedDB — ฐานข้อมูลในเครื่องของผู้ใช้เท่านั้น
   ========================================================= */

/** เปิดฐานข้อมูล (สร้าง object store อัตโนมัติถ้ายังไม่มี) */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('เปิดฐานข้อมูลไม่สำเร็จ'));
  });
}

/** เพิ่มความทรงจำใหม่ลงฐานข้อมูล */
function addMemoryRecord(memory) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(memory);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** ดึงความทรงจำทั้งหมดออกมาแสดง */
function getAllMemories() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/** ลบความทรงจำตาม id */
function deleteMemoryRecord(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* =========================================================
   ส่วนที่ 2: ฟังก์ชันช่วยทั่วไป
   ========================================================= */

/** สร้าง id ไม่ซ้ำกันสำหรับแต่ละความทรงจำ */
function createId() {
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
}

/** แปลง timestamp เป็นวันที่แบบไทย เช่น "14 กุมภาพันธ์ 2569, 18:30" */
function formatThaiDate(timestamp) {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

/** แปลงจำนวนไบต์เป็นข้อความอ่านง่าย เช่น "1.2 MB" */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return value.toFixed(1) + ' ' + units[unitIndex];
}

/** แสดงข้อความแจ้งเตือนสุดน่ารักที่ด้านล่างจอ */
function showToast(message, duration = 2600) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
}

/* =========================================================
   ส่วนที่ 3: เลือกรูปภาพ + พรีวิวก่อนบันทึก
   ========================================================= */

/** รับไฟล์รูปที่เลือก (จากการแตะ / ลากมาวาง / วางจากคลิปบอร์ด) */
function setSelectedFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('เลือกไฟล์รูปภาพนะ 🖼️');
    return;
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    showToast('รูปใหญ่เกิน ' + MAX_FILE_MB + ' MB 🥺 ลองเลือกรูปอื่นนะ');
    return;
  }

  clearSelectedFile();
  pendingFile = file;
  previewUrl = URL.createObjectURL(file);
  els.previewImg.src = previewUrl;
  els.dropIcon.textContent = '🌸';
  els.dropText.textContent = '✅ ' + file.name;
  els.dropHint.textContent = 'แตะเพื่อเปลี่ยนรูป';
  els.previewWrap.classList.remove('hidden');
}

/** เอารูปที่เลือกไว้ออก */
function clearSelectedFile() {
  pendingFile = null;
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  els.photoInput.value = '';
  els.previewImg.removeAttribute('src');
  els.previewWrap.classList.add('hidden');
  els.dropIcon.textContent = '🖼️';
  els.dropText.textContent = 'แตะเพื่อเลือกรูปภาพ';
  els.dropHint.textContent = 'หรือลากรูปมาวางที่นี่ (JPG, PNG, GIF, WEBP)';
}

/** ล้างฟอร์มทั้งหมดหลังบันทึกสำเร็จ */
function clearForm() {
  clearSelectedFile();
  els.memoryText.value = '';
}

/* =========================================================
   ส่วนที่ 4: บันทึกความทรงจำลง IndexedDB (ในเครื่องเท่านั้น)
   ========================================================= */

async function handleSave(event) {
  event.preventDefault();

  const text = els.memoryText.value.trim();

  if (!pendingFile && !text) {
    showToast('ใส่รูปหรือข้อความอย่างน้อยหนึ่งอย่างนะ 💕');
    return;
  }

  els.saveBtn.disabled = true;
  try {
    const memory = {
      id: createId(),
      text: text,
      photo: pendingFile || null, // เก็บเป็น Blob ลงเครื่องโดยตรง
      createdAt: Date.now(),
    };
    await addMemoryRecord(memory);
    clearForm();
    await renderGallery();
    showToast('บันทึกความทรงจำแล้ว 💖');
  } catch (err) {
    console.error('บันทึกไม่สำเร็จ:', err);
    showToast('บันทึกไม่สำเร็จ ลองอีกครั้งนะ 🥺');
  } finally {
    els.saveBtn.disabled = false;
  }
}

/* =========================================================
   ส่วนที่ 5: แสดงผลการ์ดโพลารอยด์ (โหลดอัตโนมัติทุกครั้งที่เปิดหน้า)
   ========================================================= */

/** คืนหน่วยความจำของ Object URL เก่าก่อนวาดแกลเลอรีใหม่ */
function releaseObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.clear();
}

/** โหลดความทรงจำทั้งหมดจาก IndexedDB มาแสดง (เรียงใหม่สุดอยู่บน) */
async function renderGallery() {
  const memories = (await getAllMemories()).sort((a, b) => b.createdAt - a.createdAt);

  releaseObjectUrls();
  els.gallery.replaceChildren();

  const items = memories.map(createTimelineItem);
  items.forEach((item) => els.gallery.appendChild(item));
  observeTimelineItems(items);

  els.emptyState.classList.toggle('hidden', memories.length > 0);
  els.memoryCount.textContent = memories.length > 0 ? memories.length + ' ความทรงจำ' : '';
  updateStorageInfo();
}

/** สร้างการ์ดโพลารอยด์ 1 ใบจากข้อมูลความทรงจำ */
function createPolaroidCard(memory) {
  const card = document.createElement('figure');
  card.className = 'polaroid';
  const direction = memory.createdAt % 2 === 0 ? 1 : -1;
  card.style.setProperty('--tilt', (direction * (0.4 + Math.random() * 0.9)).toFixed(2) + 'deg');

  // เทปกามุมบน
  const tape = document.createElement('span');
  tape.className = 'tape';
  tape.setAttribute('aria-hidden', 'true');

  // ปุ่มลบ
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'ลบความทรงจำนี้';
  deleteBtn.setAttribute('aria-label', 'ลบความทรงจำนี้');
  deleteBtn.addEventListener('click', () => askDelete(memory.id));

  // ส่วนรูปภาพ (หรืออิโมจิ ถ้าเป็นบันทึกข้อความเดียว)
  const media = document.createElement('div');
  media.className = 'polaroid-media';
  if (memory.photo instanceof Blob) {
    const img = document.createElement('img');
    const url = URL.createObjectURL(memory.photo);
    objectUrls.add(url);
    img.src = url;
    img.alt = memory.text ? 'รูปความทรงจำ: ' + memory.text.slice(0, 80) : 'รูปความทรงจำ';
    img.loading = 'lazy';
    media.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'text-only';
    placeholder.textContent = '💌';
    media.appendChild(placeholder);
  }

  // คำบรรยายใต้รูป (ใช้ textContent จึงปลอดภัยจาก XSS)
  const caption = document.createElement('figcaption');
  caption.className = 'caption';
  if (memory.text) {
    const captionText = document.createElement('p');
    captionText.className = 'caption-text';
    captionText.textContent = memory.text;
    caption.appendChild(captionText);
  }
  const date = document.createElement('time');
  date.className = 'caption-date';
  date.setAttribute('datetime', new Date(memory.createdAt).toISOString());
  date.textContent = '📅 ' + formatThaiDate(memory.createdAt);
  caption.appendChild(date);

  card.append(tape, deleteBtn, media, caption);
  return card;
}

/** ห่อการ์ดโพลารอยด์เป็นช่องไทม์ไลน์ พร้อมจุดหัวใจบนเส้น */
function createTimelineItem(memory) {
  const item = document.createElement('li');
  item.className = 'timeline-item';

  const node = document.createElement('span');
  node.className = 'timeline-node';
  node.setAttribute('aria-hidden', 'true');
  node.textContent = '💕';

  item.append(node, createPolaroidCard(memory));
  return item;
}

/* =========================================================
   ส่วนที่ 5.5: เอฟเฟกต์ Fade In / Scale Up ตอนเลื่อนถึง
   ========================================================= */

let timelineObserver = null;

/** ค่อยๆ เผยการ์ดเมื่อเลื่อนมาเจอ (ถ้าตั้งค่าลดแอนิเมชัน จะแสดงทันที) */
function observeTimelineItems(items) {
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || typeof IntersectionObserver !== 'function') {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  if (timelineObserver) {
    timelineObserver.disconnect();
  }

  timelineObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          timelineObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );

  items.forEach((item) => timelineObserver.observe(item));
}

/* =========================================================
   ส่วนที่ 6: ป็อปอัปยืนยันการลบ
   ========================================================= */

/** เปิดป็อปอัปถามยืนยันก่อนลบ */
function askDelete(id) {
  pendingDeleteId = id;
  els.deleteModal.classList.remove('hidden');
  els.confirmDelete.focus();
}

/** ปิดป็อปอัปโดยไม่ลบ */
function closeDeleteModal() {
  pendingDeleteId = null;
  els.deleteModal.classList.add('hidden');
}

/** ยืนยันลบรายการออกจาก IndexedDB */
async function handleConfirmDelete() {
  const id = pendingDeleteId;
  closeDeleteModal();
  if (id == null) return;

  try {
    await deleteMemoryRecord(id);
    await renderGallery();
    showToast('ลบความทรงจำแล้ว 🌷');
  } catch (err) {
    console.error('ลบไม่สำเร็จ:', err);
    showToast('ลบไม่สำเร็จ ลองอีกครั้งนะ 🥺');
  }
}

/* =========================================================
   ส่วนที่ 7: หัวใจลอยขึ้นจากด้านล่างจอ (Floating Hearts)
   ========================================================= */

/** สร้างหัวใจหลายดวงแบบสุ่ม แล้วให้ CSS เป็นคนแอนิเมตต่อ */
function createFloatingHearts(count) {
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart';
    heart.setAttribute('aria-hidden', 'true');

    // สุ่มตำแหน่ง/ขนาด/ความเร็ว — ใส่ delay ติดลบให้ดวงแรกลอยกลางทางตอนเปิดหน้า
    heart.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    heart.style.setProperty('--size', Math.round(14 + Math.random() * 26) + 'px');
    heart.style.setProperty('--dur', (9 + Math.random() * 10).toFixed(1) + 's');
    heart.style.setProperty('--delay', (-Math.random() * 18).toFixed(1) + 's');
    heart.style.setProperty('--sway', Math.round(6 + Math.random() * 26) + 'px');
    heart.style.setProperty('--sway-dur', (2 + Math.random() * 2.5).toFixed(1) + 's');
    heart.style.setProperty('--op', (0.35 + Math.random() * 0.4).toFixed(2));

    const glyph = document.createElement('span');
    glyph.textContent = HEART_EMOJIS[i % HEART_EMOJIS.length];
    heart.appendChild(glyph);

    fragment.appendChild(heart);
  }

  els.heartsBg.appendChild(fragment);
}

/* =========================================================
   ส่วนที่ 8: ข้อมูลพื้นที่จัดเก็บ (แสดงในส่วนท้าย)
   ========================================================= */

async function updateStorageInfo() {
  if (!els.storageInfo) return;

  if (!navigator.storage || typeof navigator.storage.estimate !== 'function') {
    els.storageInfo.textContent = '💾 ข้อมูลถูกจัดเก็บในเบราว์เซอร์ของคุณเอง';
    return;
  }

  try {
    const estimate = await navigator.storage.estimate();
    if (typeof estimate.usage === 'number') {
      els.storageInfo.textContent = '💾 ใช้พื้นที่ในเครื่องปัจจุบันประมาณ ' + formatBytes(estimate.usage);
    }
  } catch {
    /* เงียบไว้ — ไม่มีผลต่อการใช้งาน */
  }
}

/** ขอสิทธิ์จัดเก็บถาวร กันเบราว์เซอร์ล้างข้อมูลเมื่อพื้นที่เต็ม (ทำเงียบๆ) */
async function requestPersistentStorage() {
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      await navigator.storage.persist();
    }
  } catch {
    /* ไม่สำคัญ — ข้ามได้ */
  }
}

/* =========================================================
   ส่วนที่ 9: ผูกเหตุการณ์ทั้งหมด
   ========================================================= */

function bindEvents() {
  // บันทึกฟอร์ม
  els.form.addEventListener('submit', handleSave);

  // เลือกรูปจากปุ่ม (ล้าง value ทิ้ง เพื่อให้เลือกไฟล์เดิมซ้ำได้)
  els.photoInput.addEventListener('change', (event) => {
    setSelectedFile(event.target.files && event.target.files[0]);
    event.target.value = '';
  });

  // เอารูปตัวอย่างออก
  els.removePreview.addEventListener('click', clearSelectedFile);

  // ลากรูปมาวาง (Drag & Drop)
  ['dragenter', 'dragover'].forEach((type) => {
    els.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropZone.classList.add('is-dragging');
    });
  });
  ['dragleave', 'drop'].forEach((type) => {
    els.dropZone.addEventListener(type, () => els.dropZone.classList.remove('is-dragging'));
  });
  els.dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    setSelectedFile(file);
  });

  // วางรูปจากคลิปบอร์ด (Ctrl+V)
  document.addEventListener('paste', (event) => {
    const files = event.clipboardData && event.clipboardData.files;
    if (!files) return;
    const image = Array.from(files).find((file) => file.type.startsWith('image/'));
    if (image) setSelectedFile(image);
  });

  // ป็อปอัปลบ
  els.cancelDelete.addEventListener('click', closeDeleteModal);
  els.confirmDelete.addEventListener('click', handleConfirmDelete);
  els.deleteModal.addEventListener('click', (event) => {
    if (event.target === els.deleteModal) closeDeleteModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.deleteModal.classList.contains('hidden')) {
      closeDeleteModal();
    }
  });
}

/* =========================================================
   ส่วนที่ 10: เริ่มต้นแอป — โหลดความทรงจำเก่าอัตโนมัติ
   ========================================================= */

async function init() {
  createFloatingHearts(HEART_COUNT);
  bindEvents();

  try {
    db = await openDatabase();
    requestPersistentStorage();
    await renderGallery(); // 💗 ดึงความทรงจำเก่าขึ้นมาแสดงทันทีที่เปิดหน้าเว็บ
  } catch (err) {
    console.error('เปิดฐานข้อมูลไม่สำเร็จ:', err);
    els.saveBtn.disabled = true;
    els.emptyText.textContent = 'เบราว์เซอร์นี้เปิดพื้นที่จัดเก็บไม่ได้ ลองใช้ Chrome / Edge / Safari เวอร์ชันล่าสุดดูนะ 💗';
    showToast('เปิดพื้นที่จัดเก็บ (IndexedDB) ไม่สำเร็จ 🥺', 5000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


