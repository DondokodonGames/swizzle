// 433-drum-machine.js
// ドラムマシン — お手本で流れる4ステップの叩き順を覚え、同じ順にパッドを叩いて再現する
// 操作: HAT/SNARE/KICK/CRASHの4パッドを、お手本と同じ順にタップ
// 成功: 3パターン 再現  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムマシン） ──
  var C = { bg:'#080408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PADS = [
    { name: 'HAT', col: C.c, x: W * 0.28, y: H * 0.60 },
    { name: 'SNARE', col: C.d, x: W * 0.72, y: H * 0.60 },
    { name: 'KICK', col: C.a, x: W * 0.28, y: H * 0.76 },
    { name: 'CRASH', col: C.e, x: W * 0.72, y: H * 0.76 }
  ];
  var PAD_R = 130;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DRUM MACHINE';
  var HOW_TO_PLAY = 'WATCH THE PADS LIGHT UP · TAP THEM BACK IN ORDER';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;
  var BEATS = 4, DEMO_BEAT = 0.5;   // 修正2: 8 → 4

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pattern, iphase, demoStep, demoTimer, playStep, solved, misses, timeLeft, done, flash, flashCol, padFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181018');
  }

  function background() { game.draw.clear(C.bg); }

  function genPattern() { pattern = []; for (var i = 0; i < BEATS; i++) pattern.push(Math.floor(Math.random() * 4)); }

  function startDemo() { genPattern(); demoStep = 0; demoTimer = DEMO_BEAT; iphase = 'demo'; playStep = 0; }

  function initGame() { solved = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; padFlash = [0, 0, 0, 0]; startDemo(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 700 + Math.ceil(timeLeft) * 100) : solved * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPads() {
    for (var pi = 0; pi < PADS.length; pi++) { var pad = PADS[pi], fl = Math.max(0, padFlash[pi]); pc(pad.x, pad.y, PAD_R, pad.col, 0.5 + fl * 0.5); pc(pad.x - PAD_R * 0.28, pad.y - PAD_R * 0.28, PAD_R * 0.22, C.g, 0.15 + fl * 0.3); txt(pad.name, pad.x, pad.y + 18, 36, fl > 0.1 ? C.g : '#001'); }
  }

  function drawSeq() {
    var sx = 80, sw = (W - 160) / BEATS;
    for (var si = 0; si < BEATS; si++) { var x = sx + si * sw + sw / 2, on = (iphase === 'demo' && si < demoStep) || (iphase === 'play' && si < playStep); pc(x, H * 0.34, sw * 0.32, on ? PADS[pattern[si]].col : '#332', on ? 0.9 : 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'play') return;
    var hit = -1; for (var pi = 0; pi < PADS.length; pi++) if (Math.hypot(x - PADS[pi].x, y - PADS[pi].y) < PAD_R) { hit = pi; break; }
    if (hit < 0) return;
    padFlash[hit] = 0.3; game.audio.play('se_tap', 0.4);
    if (hit === pattern[playStep]) { playStep++; if (playStep >= BEATS) { solved++; flash = 0.9; flashCol = C.b; game.audio.play('se_success', 0.7); if (solved >= NEEDED) { finish(true); return; } iphase = 'result'; setTimeout(function() { if (!done && state === S.PLAYING) startDemo(); }, 900); } }
    else { misses++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } playStep = 0; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pattern) initGame(); background(); drawPads();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN THE POCKET!' : 'OFF BEAT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      for (var pi = 0; pi < 4; pi++) if (padFlash[pi] > 0) padFlash[pi] -= dt * 4;
      if (iphase === 'demo') { demoTimer -= dt; if (demoTimer <= 0) { if (demoStep < BEATS) { padFlash[pattern[demoStep]] = 0.4; game.audio.play('se_tap', 0.3); demoStep++; demoTimer = DEMO_BEAT; } else { iphase = 'play'; playStep = 0; } } }
    }

    // ---- 描画 ----
    background(); drawSeq(); drawPads();
    txt(iphase === 'demo' ? 'LISTEN...' : iphase === 'play' ? 'PLAY IT  ' + playStep + ' / ' + BEATS : 'NICE!', W / 2, snap(H * 0.44), 50, iphase === 'play' ? C.b : C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#181018');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
