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
const MAX_IMAGE_WIDTH = 600;    // 🖼️ ความกว้างสูงสุดหลังย่อ (เล็กสุดเพื่อมือถือ)
const MAX_IMAGE_HEIGHT = 600;   // ความสูงสุดหลังย่อ (กันรูปแนวตั้งยาวกินหน่วยความจำ)
const COMPRESS_QUALITY = 0.5;   // คุณภาพเริ่มต้น JPEG: canvas.toDataURL('image/jpeg', 0.5)
const MIN_QUALITY = 0.35;       // คุณภาพต่ำสุดที่ยอม (ลดทีละขั้นถ้าไฟล์ยังใหญ่เกินเป้า)
const TARGET_MAX_KB = 150;      // เป้าหมายขนาดไฟล์หลังบีบอัด (ไม่กี่สิบถึงร้อยกว่า KB)
const KEEP_ORIGINAL_IF_SMALLER_THAN = 150 * 1024; // ไฟล์เล็กและไม่ต้องย่อ → เก็บต้นฉบับ
const APP_VERSION = '2.5.0';    // เวอร์ชันแอป (ดูที่ footer + Console เวลา debug บนมือถือ)
const THEME_STORAGE_KEY = 'love-memory-theme';     // 🌙 จำธีมล่าสุด (เก็บในเครื่องเท่านั้น)
const ANNIVERSARY_KEY = 'love-memory-anniversary'; // ⏳ วันแรกที่เริ่มคบกัน (เก็บในเครื่องเท่านั้น)
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
  themeToggle: document.getElementById('themeToggle'),
  daysText: document.getElementById('daysText'),
  anniversaryInput: document.getElementById('anniversaryInput'),
  clearAnniversary: document.getElementById('clearAnniversary'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
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

/** เปิดฐานข้อมูล (สร้าง object store อัตโนมัติ + กันค้างด้วย timeout) */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('เบราว์เซอร์นี้ไม่รองรับ IndexedDB'));
      return;
    }

    let settled = false;

    // กันค้างบนมือถือ: ถ้าเปิดไม่เสร็จภายใน 10 วินาที ให้ fail พร้อมข้อความเข้าใจง่าย
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('เปิดฐานข้อมูลช้าผิดปกติ ลองปิดแท็บอื่นของเว็บนี้แล้วรีเฟรชหน้านะ 🥺'));
    }, 10000);

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      callback(value);
    };

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      // กัน transaction ค้าง: ถ้ามีแท็บอื่นขออัปเกรดเวอร์ชัน ให้ปิดการเชื่อมต่อนี้อย่างสวยงาม
      database.onversionchange = () => database.close();
      finish(resolve, database);
    };
    request.onerror = () => finish(reject, request.error || new Error('เปิดฐานข้อมูลไม่สำเร็จ'));
    request.onblocked = () => finish(reject, new Error('มีแท็บอื่นของเว็บนี้เปิดค้างอยู่ ปิดแท็บอื่นแล้วรีเฟรชหน้านะ 💗'));
  });
}

/** พิมพ์รายละเอียด error ของ IndexedDB ลง Console อย่างละเอียด (name/code/message) */
function logIndexedDbError(prefix, error) {
  console.error('❌ ' + prefix);
  console.error('   name   :', error && error.name);
  console.error('   code   :', error && error.code);
  console.error('   message:', error && error.message);
  console.error('   error  :', error);
}

/** เพิ่มความทรงจำใหม่ลงฐานข้อมูล (กัน error ทุกกรณี รวมถึงธุรกรรมค้าง) */
function addMemoryRecord(memory) {
  return new Promise((resolve, reject) => {
    if (!db) {
      const err = new Error('ฐานข้อมูลยังไม่พร้อม ลองรีเฟรชหน้าก่อนนะ');
      logIndexedDbError('บันทึกไม่สำเร็จ: ฐานข้อมูลยังไม่พร้อม', err);
      reject(err);
      return;
    }

    console.log('💾 กำลังเขียนลง IndexedDB (รูป: ' + (memory.photo ? formatBytes(memory.photo.size) : 'ไม่มี') + ')');

    let tx;
    try {
      tx = db.transaction(STORE_NAME, 'readwrite');
    } catch (err) {
      // เช่น InvalidStateError เมื่อการเชื่อมต่อถูกปิดไปแล้ว
      logIndexedDbError('สร้าง transaction ไม่สำเร็จ', err);
      reject(err);
      return;
    }

    try {
      tx.objectStore(STORE_NAME).add(memory);
    } catch (err) {
      // เช่น DataCloneError เมื่อข้อมูลไม่สามารถเก็บลงฐานข้อมูลได้
      logIndexedDbError('add() ไม่สำเร็จ', err);
      reject(err);
      return;
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      const error = tx.error || new Error('เขียนข้อมูลลง IndexedDB ไม่สำเร็จ');
      logIndexedDbError('เขียนข้อมูลไม่สำเร็จ (tx.onerror)', error);
      reject(error);
    };
    tx.onabort = () => {
      const error = tx.error || new Error('ธุรกรรม IndexedDB ถูกยกเลิก');
      logIndexedDbError('ธุรกรรมถูกยกเลิก (tx.onabort)', error);
      reject(error);
    };
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
   ส่วนที่ 3.5: บีบอัดรูปภาพก่อนบันทึก (Image Compression)
   ---------------------------------------------------------
   • อ่านไฟล์ด้วย FileReader → data URL (เสถียรบนมือถือทุกตัว)
   • ย่อด้วย HTML5 Canvas ให้ไม่เกิน 800 × 800 px (พอดีจอมือถือ
     และใช้หน่วยความจำน้อย ไม่พังบน iOS/Android)
   • เข้ารหัส canvas.toDataURL('image/jpeg', 0.6) แล้วลดคุณภาพ
     ทีละขั้นจนไฟล์เล็กกว่า ~300 KB
   • แก้ปัญหา "บันทึกไม่สำเร็จ" / Quota Error บนเบราว์เซอร์มือถือ
   • ทุกกรณีที่บีบอัดไม่สำเร็จ จะคืนไฟล์ต้นฉบับให้บันทึกต่อได้เสมอ
   ========================================================= */

/** โหลดรูปจาก data URL เป็น Image (พร้อม Promise) */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('อ่านหรือถอดรหัสรูปภาพไม่สำเร็จ'));
    img.src = src;
  });
}

/**
 * บีบอัดรูปแบบมี "รถกันค้าง" — ถ้ามือถือประมวลผลนานเกิน 12 วินาที
 * จะใช้ไฟล์ต้นฉบับทันที ไม่ทำให้ปุ่มบันทึกค้าง
 */
function compressImage(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  if (file.type === 'image/gif') {
    // GIF ภาพเคลื่อนไหว: ผ่าน Canvas จะเหลือเฟรมเดียว → เก็บต้นฉบับไว้
    return Promise.resolve(file);
  }

  return Promise.race([
    runCompression(file),
    new Promise((resolve) => {
      setTimeout(() => {
        console.warn('⏰ บีบอัดรูปนานเกิน 12 วินาที → ใช้ไฟล์ต้นฉบับแทน');
        resolve(file);
      }, 12000);
    }),
  ]);
}

/**
 * ย่อ + บีบอัดรูปภาพเป็น Blob ขนาดเล็กมาก (เหมาะกับมือถือ)
 * ขั้นตอน: FileReader → data URL → Image → Canvas ย่อไม่เกิน 600×600
 *          → toDataURL('image/jpeg', 0.5) → ลดคุณภาพทีละขั้นถ้ายังใหญ่
 */
async function runCompression(file) {
  try {
    // 1) อ่านไฟล์เป็น data URL ด้วย FileReader (เสถียรบนมือถือมากกว่า objectURL)
    const originalDataUrl = await blobToDataUrl(file);

    // 2) โหลดเป็น Image เพื่อวัดขนาดจริงของรูป
    const img = await loadImage(originalDataUrl);

    // กันภาพที่ถอดรหัสไม่สมบูรณ์ (บางเบราว์เซอร์มือถือคืนค่า 0)
    if (!img.naturalWidth || !img.naturalHeight) {
      throw new Error('อ่านขนาดรูปภาพไม่สำเร็จ');
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_WIDTH / img.naturalWidth,
      MAX_IMAGE_HEIGHT / img.naturalHeight
    );

    // รูปเล็กอยู่แล้วและไฟล์ไม่ใหญ่ → เก็บต้นฉบับ (คมชัดที่สุด)
    if (scale >= 1 && file.size <= KEEP_ORIGINAL_IF_SMALLER_THAN) {
      console.log('🖼️ Original size vs Compressed size: ' + formatBytes(file.size) + ' → เก็บต้นฉบับ (รูปเล็กอยู่แล้ว)');
      return file;
    }

    // 3) วาดลง Canvas ขนาดที่ย่อแล้ว
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // JPEG ไม่มีความโปร่งใส → รองพื้นขาวกันภาพดำทั้งใบ
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 4) เข้ารหัส JPEG คุณภาพ 0.5 แล้วลดคุณภาพทีละขั้นถ้ายังใหญ่เกินเป้า
    let quality = COMPRESS_QUALITY;
    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    if (typeof compressedDataUrl !== 'string' || compressedDataUrl.indexOf('data:image/jpeg') !== 0) {
      throw new Error('เข้ารหัสรูปภาพไม่สำเร็จ');
    }

    const targetBytes = TARGET_MAX_KB * 1024;
    while (compressedDataUrl.length * 0.75 > targetBytes && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.1);
      compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // 5) แปลง data URL กลับเป็น Blob เพื่อเก็บลง IndexedDB
    const blob = await dataUrlToBlob(compressedDataUrl);

    // 🔍 Debug: เทียบขนาดไฟล์ก่อน-หลังบีบอัด
    console.log('🖼️ Original size vs Compressed size: ' + formatBytes(file.size) + ' → ' + formatBytes(blob.size)
      + ' | ภาพ: ' + img.naturalWidth + '×' + img.naturalHeight + ' → ' + targetWidth + '×' + targetHeight
      + ' | quality: ' + quality.toFixed(2));

    // ใช้ผลลัพธ์เฉพาะเมื่อเล็กกว่าไฟล์ต้นฉบับจริง ไม่งั้นเก็บต้นฉบับ
    return blob.size > 0 && blob.size < file.size ? blob : file;
  } catch (err) {
    console.warn('บีบอัดรูปไม่สำเร็จ ใช้ไฟล์ต้นฉบับแทน:', err && err.name, '-', err && err.message);
    return file;
  }
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
  els.saveBtn.textContent = '⏳ กำลังบีบอัด & บันทึก...';

  let savedOk = false;

  // 💾 ขั้นตอนบีบอัด + เขียนลง IndexedDB — try/catch ครอบครั้ง
  try {
    // 🖼️ รอบีบอัดรูปให้เสร็จก่อนเขียนลงฐานข้อมูลเสมอ (async/await)
    const photo = pendingFile ? await compressImage(pendingFile) : null;

    const memory = {
      id: createId(),
      text: text,
      photo: photo || null, // เก็บเป็น Blob ขนาดเล็กลงเครื่องโดยตรง
      createdAt: Date.now(),
    };

    await addMemoryRecord(memory); // เขียน + commit transaction
    savedOk = true;

    clearForm();
    showToast('บันทึกความทรงจำแล้ว 💖');
  } catch (err) {
    // 🔍 แจ้ง error ที่เฉพาะเจาะจงลง Console เพื่อวิเคราะห์บนมือถือ
    console.error('❌ บันทึกลง IndexedDB ไม่สำเร็จ');
    console.error('   name   :', err && err.name);
    console.error('   message:', err && err.message);
    console.error('   error  :', err);

    const errorName = err && err.name;
    if (errorName === 'QuotaExceededError' || errorName === 'NS_ERROR_DOM_QUOTA_REACHED') {
      showToast('พื้นที่จัดเก็บเต็มแล้ว 🥺 ลองลบความทรงจำเก่าบางส่วนก่อนนะ', 5000);
    } else if (errorName === 'DataCloneError') {
      showToast('รูปภาพนี้เก็บลงเครื่องไม่ได้ ลองเลือกรูปอื่นนะ 🖼️');
    } else if (err && typeof err.message === 'string' && err.message.indexOf('แท็บอื่น') !== -1) {
      showToast(err.message, 5000);
    } else {
      showToast('บันทึกไม่สำเร็จ ลองอีกครั้งนะ 🥺');
    }
  } finally {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = '💖 บันทึกความทรงจำ';
  }

  // 🌟 รีเฟรชแกลเลอรี "หลัง" บันทึกสำเร็จเท่านั้น และแยก try/catch
  //    กันกรณี render พังบนมือถือแล้วขึ้นว่า "บันทึกไม่สำเร็จ"
  //    ทั้งที่ข้อมูลถูกบันทึกลง IndexedDB เรียบร้อยแล้ว
  if (savedOk) {
    try {
      await renderGallery();
    } catch (err) {
      console.error('รีเฟรชแกลเลอรีไม่สำเร็จ (แต่ข้อมูลถูกบันทึกแล้ว):', err && err.name, '-', err && err.message);
    }
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

  // 🌙 สลับธีมกลางคืน/กลางวัน
  els.themeToggle.addEventListener('click', toggleTheme);

  // ⏳ นับจำนวนวันที่คบกัน
  els.anniversaryInput.addEventListener('change', handleAnniversaryChange);
  els.clearAnniversary.addEventListener('click', handleAnniversaryClear);

  // 🧰 สำรอง / กู้คืนข้อมูล
  els.exportBtn.addEventListener('click', exportData);
  els.importInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    importData(file);
  });
}

/* =========================================================
   ส่วนที่ 9.5: Dark Mode (โหมดกลางคืน)
   • สลับคลาส dark-mode บน <html> → ตัวแปรสีทั้งชุดเปลี่ยนตาม
   • จำธีมล่าสุดใน LocalStorage (เก็บในเครื่องเท่านั้น)
   • ถ้ายังไม่เคยเลือก ใช้ตามค่าตั้ง prefers-color-scheme ของระบบ
   ========================================================= */

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  els.themeToggle.textContent = isDark ? '☀️' : '🌙';
  els.themeToggle.setAttribute('aria-label', isDark ? 'สลับไปโหมดกลางวัน' : 'สลับไปโหมดกลางคืน');
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* LocalStorage ใช้ไม่ได้ → ข้ามไปใช้ค่าของระบบ */
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setupTheme() {
  applyTheme(getSavedTheme());
}

function toggleTheme() {
  const next = document.documentElement.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    /* ข้าม — แค่ไม่จำค่า */
  }
}

/* =========================================================
   ส่วนที่ 9.6: นับจำนวนวันที่คบกัน (Days Together Counter)
   • เก็บ "วันแรกที่เริ่มคบกัน" ใน LocalStorage
   • คำนวณจำนวนวันแบบเทียบวันที่แบบเวลา 00:00 กันพอดี
   ========================================================= */

function getAnniversary() {
  try {
    return localStorage.getItem(ANNIVERSARY_KEY);
  } catch {
    return null;
  }
}

function renderDaysCounter() {
  const stored = getAnniversary();
  els.anniversaryInput.value = stored || '';
  els.clearAnniversary.hidden = !stored;

  if (!stored) {
    els.daysText.textContent = 'ตั้งวันแรกที่เริ่มคบกันด้านล่าง\nแล้วเดี๋ยวเราช่วยนับวันให้นะ 💕';
    return;
  }

  const parts = stored.split('-').map(Number);
  const start = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - start) / 86400000);

  if (Number.isNaN(diffDays)) {
    els.daysText.textContent = 'วันที่ไม่ถูกต้อง ลองเลือกใหม่นะ 🥺';
  } else if (diffDays < 0) {
    els.daysText.textContent = 'วันแรกยังอยู่ข้างหน้า ตั้งใจรอวันนั้นนะ 💫';
  } else if (diffDays === 0) {
    els.daysText.textContent = 'วันนี้คือวันแรกของเรา! ยินดีด้วยนะ 🎉';
  } else {
    els.daysText.textContent = 'เราคบกันมาแล้ว ' + diffDays.toLocaleString('th-TH') + ' วัน 💕';
  }
}

function handleAnniversaryChange() {
  const value = els.anniversaryInput.value;
  try {
    if (value) {
      localStorage.setItem(ANNIVERSARY_KEY, value);
      showToast('บันทึกวันแรกไว้แล้ว 🎀');
    } else {
      localStorage.removeItem(ANNIVERSARY_KEY);
    }
  } catch {
    /* ข้าม — แค่ไม่จำค่า */
  }
  renderDaysCounter();
}

function handleAnniversaryClear() {
  try {
    localStorage.removeItem(ANNIVERSARY_KEY);
  } catch {
    /* ข้าม */
  }
  renderDaysCounter();
  showToast('ล้างวันครบรอบแล้ว 🌷');
}

/* =========================================================
   ส่วนที่ 9.7: สำรอง / กู้คืนข้อมูล (Export & Import JSON)
   ---------------------------------------------------------
   • Export: อ่านจาก IndexedDB → ฝังรูปเป็น base64 → ดาวน์โหลดไฟล์
   • Import: อ่านไฟล์ JSON → ใส่กลับเข้า IndexedDB (ข้าม id ที่ซ้ำ)
   • ทุกอย่างทำในเครื่องทั้งหมด — ไฟล์สำรองอยู่กับผู้ใช้เท่านั้น 🔒
   ========================================================= */

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์รูปไม่สำเร็จ'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const base64 = dataUrl.split(',')[1];
      const mime = (dataUrl.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: mime }));
    } catch (err) {
      reject(err);
    }
  });
}

/** เพิ่มรายการโดยไม่ทับของเดิม — คืน true ถ้าเพิ่มใหม่, false ถ้า id ซ้ำ */
function addMemorySafe(memory) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(memory);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.onabort = () => resolve(false);
  });
}

async function exportData() {
  if (!db) {
    showToast('ยังเปิดพื้นที่จัดเก็บไม่ได้ ลองรีเฟรชหน้าก่อนนะ 🥺');
    return;
  }
  els.exportBtn.disabled = true;
  try {
    const memories = await getAllMemories();
    const payload = {
      app: 'love-memory-app',
      version: 1,
      exportedAt: new Date().toISOString(),
      count: memories.length,
      memories: [],
    };

    for (const memory of memories) {
      const item = {
        id: memory.id,
        text: memory.text || '',
        createdAt: memory.createdAt,
        photo: null,
      };
      if (memory.photo instanceof Blob) {
        item.photo = await blobToDataUrl(memory.photo);
      }
      payload.memories.push(item);
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'love-memory-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('ดาวน์โหลดไฟล์สำรองแล้ว 📥');
  } catch (err) {
    console.error('ส่งออกไม่สำเร็จ:', err);
    showToast('ส่งออกไม่สำเร็จ ลองอีกครั้งนะ 🥺');
  } finally {
    els.exportBtn.disabled = false;
  }
}

async function importData(file) {
  if (!file) return;
  if (!db) {
    showToast('ยังเปิดพื้นที่จัดเก็บไม่ได้ ลองรีเฟรชหน้าก่อนนะ 🥺');
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.memories) ? parsed.memories : null;
    if (!list) throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง');

    let added = 0;
    let skipped = 0;
    for (const item of list) {
      const memory = {
        id: typeof item.id === 'string' && item.id ? item.id : createId(),
        text: typeof item.text === 'string' ? item.text : '',
        photo: null,
        createdAt: Number.isFinite(item.createdAt) ? item.createdAt : Date.now(),
      };
      if (typeof item.photo === 'string' && item.photo.indexOf('data:image/') === 0) {
        memory.photo = await dataUrlToBlob(item.photo);
      }
      const isNew = await addMemorySafe(memory);
      if (isNew) { added += 1; } else { skipped += 1; }
    }

    await renderGallery();
    showToast('นำเข้าสำเร็จ: เพิ่ม ' + added + ' รายการ' + (skipped > 0 ? ' (ข้ามที่ซ้ำ ' + skipped + ')' : '') + ' 💖', 3500);
  } catch (err) {
    console.error('นำเข้าไม่สำเร็จ:', err);
    showToast('ไฟล์ไม่ถูกต้องหรือนำเข้าไม่สำเร็จ 🥺');
  }
}

/* =========================================================
   ส่วนที่ 10: เริ่มต้นแอป — โหลดความทรงจำเก่าอัตโนมัติ
   ========================================================= */

async function init() {
  setupTheme();          // 🌙 ใช้ธีมที่จำไว้ทันทีที่เปิดหน้า
  createFloatingHearts(HEART_COUNT);
  bindEvents();
  renderDaysCounter();   // ⏳ แสดงจำนวนวันที่คบกัน (ถ้าตั้งวันแรกไว้)

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


