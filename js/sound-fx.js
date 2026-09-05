/* =========================================================
   Space Love Story — Sci-Fi Sound FX Module (Web Audio API)
   ---------------------------------------------------------
   สังเคราะห์เสียงเอฟเฟกต์ไซไฟด้วย Web Audio API ล้วนๆ
   (ไม่ต้องโหลดไฟล์เสียง) + ปุ่มมิวต์จิ๋วมุมจอ

   สารบัญ
   1. Config & State
   2. Audio Context Bootstrap
   3. Synth Builders (tone / rumble)
   4. SFX Presets (hover / click / focus / warp)
   5. Mute Toggle & UI Delegation
   6. Public API
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Config & State
     ----------------------------------------- */
  const STORAGE_KEY = 'spaceLoveMuted';
  const UI_SELECTORS = [
    '.carousel-card',
    '.carousel-btn',
    '.carousel-dot',
    '.neon-btn',
    '.upload-btn',
    '.thumb-remove',
    '.mp-btn',
    '.audio-toggle',
  ].join(', ');

  let ctx = null;
  let master = null;
  let muted = false;
  let lastHoverAt = 0;

  /* -----------------------------------------
     2. Audio Context Bootstrap
     ----------------------------------------- */
  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function resumeContext() {
    if (ensureContext() && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  /* -----------------------------------------
     3. Synth Builders
     ----------------------------------------- */

  // เสียงโน้ตสั้นๆ พร้อมสไลด์ความถี่และเอนเวลอป
  function tone(opts) {
    if (!ensureContext()) return;
    resumeContext();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + opts.dur);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(opts.vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  // เสียงคลื่นชนจาก white noise ผ่าน low-pass — ความรู้สึกดันทุลังวาร์ป
  function rumble(dur, vol) {
    if (!ensureContext()) return;
    const t0 = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    src.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, t0);
    filter.frequency.exponentialRampToValueAtTime(70, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  /* -----------------------------------------
     4. SFX Presets
     ----------------------------------------- */
  const SFX = {
    hover() {
      tone({ from: 640, to: 940, dur: 0.07, type: 'sine', vol: 0.045 });
    },
    click() {
      tone({ from: 520, to: 180, dur: 0.1, type: 'triangle', vol: 0.09 });
      tone({ from: 1240, to: 620, dur: 0.07, type: 'sine', vol: 0.04 });
    },
    focus() {
      tone({ from: 660, dur: 0.09, type: 'sine', vol: 0.07 });
      window.setTimeout(() => {
        tone({ from: 990, dur: 0.13, type: 'sine', vol: 0.055 });
      }, 75);
    },
    warp() {
      tone({ from: 175, to: 36, dur: 1.15, type: 'sawtooth', vol: 0.2 });
      tone({ from: 1500, to: 190, dur: 0.85, type: 'sine', vol: 0.045 });
      rumble(1.2, 0.16);
    },
  };

  function play(name) {
    if (muted) return;
    if (SFX[name]) SFX[name]();
  }

  /* -----------------------------------------
     5. Mute Toggle & UI Delegation
     ----------------------------------------- */
  function setMuted(value) {
    muted = value;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (err) { /* ไม่มี storage ก็ข้าม */ }
    if (master) {
      master.gain.value = muted ? 0 : 0.5;
    }
  }

  function isMuted() {
    return muted;
  }

  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function bindUi() {
    // เสียงคลิก/ฮิเวอร์ของ UI ทั้งหมด ผูกแบบ delegate ครั้งเดียวจบ
    document.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest(UI_SELECTORS)) {
        play('click');
      }
    }, true);

    document.addEventListener('pointerover', (e) => {
      const now = performance.now();
      if (now - lastHoverAt < 90) return;
      if (e.target.closest && e.target.closest(UI_SELECTORS)) {
        lastHoverAt = now;
        play('hover');
      }
    }, true);

    // ปลดล็อก AudioContext ตั้งแต่สัมผัสแรก (นโยบาย autoplay)
    ['pointerdown', 'keydown'].forEach((evtName) => {
      document.addEventListener(evtName, resumeContext, true);
    });

    // ปุ่มมิวต์จิ๋วมุมจอ
    const btn = document.getElementById('soundToggle');
    if (!btn) return;
    const syncIcon = () => {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.classList.toggle('is-muted', muted);
    };
    syncIcon();
    btn.addEventListener('click', () => {
      toggleMuted();
      syncIcon();
    });
  }

  function init() {
    try {
      muted = localStorage.getItem(STORAGE_KEY) === '1';
    } catch (err) { /* ข้าม */ }
    bindUi();
  }

  /* -----------------------------------------
     6. Public API
     ----------------------------------------- */
  App.Sound = {
    init: init,
    play: play,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
    ensureContext: ensureContext,
  };
})(window.SpaceLove);