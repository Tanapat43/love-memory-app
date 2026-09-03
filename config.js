/* =========================================================
   Love Memory App - Configuration
   ไฟล์นี้ใช้สำหรับตั้งค่า API URL และค่าคงที่ต่างๆ
   ========================================================= */

const CONFIG = {
  // 🔧 ใส่ URL ของ Vercel App ที่ได้จากการ Deploy
  // ตัวอย่าง: 'https://love-memory-app-xyz123.vercel.app'
  API_BASE_URL: 'https://your-vercel-app.vercel.app',
  
  // ไม่ต้องแก้ไขส่วนนี้
  get API_ENDPOINT() {
    return this.API_BASE_URL + '/api/memories';
  },
  
  // App Version
  APP_VERSION: '4.0.0',
  
  // Image Settings
  MAX_FILE_MB: 20,
  MAX_IMAGE_WIDTH: 500,
  MAX_IMAGE_HEIGHT: 500,
  COMPRESS_QUALITY: 0.4,
  
  // Storage Keys
  LOCAL_CACHE_KEY: 'love-memory-cache',
  THEME_STORAGE_KEY: 'love-memory-theme',
  ANNIVERSARY_KEY: 'love-memory-anniversary',
  AUTH_KEY: 'love-memory-auth',
  
  // UI Settings
  HEART_EMOJIS: ['💗', '💖', '💕', '🩷', '💞', '🌸'],
  HEART_COUNT: 16,
};

// ทำให้ CONFIG ใช้งานได้ทั่วโลก
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
