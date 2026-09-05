/* =========================================================
   Space Love Story — Ambient Music Player Module
   ---------------------------------------------------------
   เครื่องเล่นเพลงจิ๋วมุมจอ + เอนจินดนตรี Space Ambient
   แบบโพรซีเดอรัล: คอร์ดแพดช้าๆ + เสียงดาวระยิบผ่านวงจรดีเลย์
   สร้างสดด้วย Web Audio API — ไม่ต้องโหลดไฟล์เพลง

   สารบัญ
   1. Config & Elements
   2. Sound Chain (master / filter / delay)
   3. Generative Layers (pad chords / pluck sparkles)
   4. Transport (start / stop / toggle)
   5. Public API
   ========================================================= */

'use strict';

window.SpaceLove = window.SpaceLove || {};

(function (App) {
  /* -----------------------------------------
     1. Config & Elements
     ----------------------------------------- */
  const CHORD_INTERVAL_MS = 8000;
  const PLUCK_INTERVAL_MS = 1500;
  const MASTER_VOLUME = 0.16;

  const midiToHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // โปรเกรสชัน Am - F - C - G (เรจิสเตอร์ต่ำ อบอุ่น)
  const CHORDS = [
    [45, 48, 52],
    [41, 45, 48],
    [48, 52, 55],
    [43, 47, 50],
  ];

  // สเกลเพนทาโทนิก A minor สำหรับเสียงดาวระยิบก้องๆ
  const PENTA = [69, 72, 74, 76, 79, 81];

  const el = {
    player: null,
    btn: null,
  };

  let audio = null; // { ctx, master, delay }
  let playing = false;
  let chordIndex = 0;
  let padTimer = null;
  let pluckTimer = null;

  /* -----------------------------------------
     2. Sound Chain
     ----------------------------------------- */
  function buildChain(ctx) {
    const master = ctx.createGain();
    master.gain.value = 0;

    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 2200;
    warm.Q.value = 0.6;

    master.connect(warm);
    warm.connect(ctx.destination);

    // วงจรดีเลย์ฟีดแบ็ก — ให้เสียงก้องลอยเป็นอวกาศ
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.46;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master);

    audio = { ctx: ctx, master: master, delay: delay };
  }

  /* -----------------------------------------
     3. Generative Layers
     ----------------------------------------- */

  // แพดคอร์ดยาว: 3 โน้ต x 2 ชั้นดีทูน เข้านุ่มออกนุ่ม
  function playPad(freqs) {
    const t0 = audio.ctx.currentTime;
    freqs.forEach((midi, i) => {
      [-6, 5].forEach((detune) => {
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();

        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = midiToHz(midi);
        osc.detune.value = detune;

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(0.05 / (i + 1), t0 + 2.6);
        gain.gain.linearRampToValueAtTime(0.0001, t0 + 8.2);

        osc.connect(gain);
        gain.connect(audio.master);
        osc.start(t0);
        osc.stop(t0 + 8.4);
      });
    });
  }

  // เสียงพลักสั้นๆ แบบสุ่ม ส่งเข้าดีเลย์ให้ก้องเป็นหางเสียงยาว
  function playPluck() {
    const t0 = audio.ctx.currentTime;
    const midi = PENTA[Math.floor(Math.random() * PENTA.length)];
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = midiToHz(midi);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);

    osc.connect(gain);
    gain.connect(audio.master);
    gain.connect(audio.delay);
    osc.start(t0);
    osc.stop(t0 + 1.2);
  }

  /* -----------------------------------------
     4. Transport
     ----------------------------------------- */
  function syncUi() {
    el.player.classList.toggle('is-playing', playing);
    el.btn.textContent = playing ? '❚❚' : '▶';
    el.btn.setAttribute(
      'aria-label',
      playing ? 'หยุดเพลง Space Ambient' : 'เล่นเพลง Space Ambient'
    );
  }

  function start() {
    const ctx =
      App.Sound && App.Sound.ensureContext ? App.Sound.ensureContext() : null;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!audio) buildChain(ctx);

    playing = true;
    syncUi();

    audio.master.gain.cancelScheduledValues(audio.ctx.currentTime);
    audio.master.gain.setTargetAtTime(
      MASTER_VOLUME,
      audio.ctx.currentTime,
      1.1
    );

    playPad(CHORDS[chordIndex % CHORDS.length]);
    chordIndex += 1;
    padTimer = window.setInterval(() => {
      playPad(CHORDS[chordIndex % CHORDS.length]);
      chordIndex += 1;
    }, CHORD_INTERVAL_MS);

    pluckTimer = window.setInterval(() => {
      if (Math.random() < 0.6) playPluck();
    }, PLUCK_INTERVAL_MS);
  }

  function stop() {
    playing = false;
    syncUi();
    if (audio) {
      audio.master.gain.setTargetAtTime(0.0001, audio.ctx.currentTime, 0.5);
    }
    window.clearInterval(padTimer);
    window.clearInterval(pluckTimer);
    padTimer = null;
    pluckTimer = null;
  }

  function toggle() {
    if (playing) {
      stop();
    } else {
      start();
    }
  }

  function init() {
    el.player = document.getElementById('musicPlayer');
    el.btn = document.getElementById('musicToggle');
    if (!el.player || !el.btn) return;
    el.btn.addEventListener('click', toggle);
    syncUi();
  }

  /* -----------------------------------------
     5. Public API
     ----------------------------------------- */
  App.Music = {
    init: init,
    toggle: toggle,
    isPlaying: () => playing,
  };
})(window.SpaceLove);