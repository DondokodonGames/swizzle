// 126-tempo-tap.js
// テンポタップ — 音楽のBPMに合わせてタップし続けるリズムの気持ちよさ
// 操作: リズム（12時の判定枠）に合わせてタップ
// 成功: 3回ジャストで叩く  失敗: ズレすぎ×5 or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムマシン） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TEMPO TAP';
  var HOW_TO_PLAY = 'TAP WHEN THE MARKER HITS THE TOP';
  var MAX_TIME = 12;             // 修正2: 30 → 12
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_MISS = 5;
  var BPM = 120;
  var BEAT = 60 / BPM;
  var GOOD_WINDOW = 0.14;        // 修正2: 判定を甘めに
  var CX = snap(W / 2);
  var CY = snap(H * 0.5);
  var RING_R = 240;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, totalTaps, goodTaps, misses, timeLeft, done, tapFlash, tapOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function drawRing(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.14) {
      game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
  }

  // ── 判定マーカーとリング（多矩形の装置） ──
  function drawMachine(beatPhase, pulse) {
    // 外周リング
    drawRing(CX, CY, RING_R, C.d, 0.5);
    drawRing(CX, CY, snap(RING_R * pulse), C.e, 0.4);
    // 判定枠（12時）
    var winAngle = (GOOD_WINDOW / BEAT) * Math.PI * 2;
    for (var w = -winAngle; w <= winAngle; w += 0.14) {
      var wa = -Math.PI / 2 + w;
      game.draw.rect(snap(CX + Math.cos(wa) * RING_R) - 6, snap(CY + Math.sin(wa) * RING_R) - 6, 12, 12, C.b, 0.9);
    }
    // 上部ターゲットランプ
    game.draw.rect(CX - 24, CY - RING_R - 40, 48, 24, C.b);
    // 回るマーカー
    var ma = beatPhase * Math.PI * 2 - Math.PI / 2;
    drawPixelCircle(CX + Math.cos(ma) * RING_R, CY + Math.sin(ma) * RING_R, 24, C.c, 1);
    // 中心スピーカー
    drawPixelCircle(CX, CY, snap(72 * pulse), C.a, 0.5);
    drawPixelCircle(CX, CY, 32, C.g, 0.7);
    game.draw.rect(CX - 8, CY - 8, 16, 16, C.d);
  }

  // ── 初期化 ──
  function initGame() {
    beatTimer = 0;
    totalTaps = 0;
    goodTaps = 0;
    misses = 0;
    timeLeft = MAX_TIME;
    done = false;
    tapFlash = 0;
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    var acc = totalTaps > 0 ? Math.round(goodTaps / totalTaps * 100) : 0;
    finalScore = success ? (goodTaps * 200 + acc * 5 + Math.ceil(timeLeft) * 20) : goodTaps * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    var tMod = beatTimer % BEAT;
    var offset = Math.min(tMod, BEAT - tMod);
    totalTaps++;
    if (offset < GOOD_WINDOW) {
      goodTaps++;
      tapOk = true; tapFlash = 0.25;
      game.audio.play('se_tap', 0.9);
      if (goodTaps >= NEEDED) { finish(true); return; }
    } else {
      misses++;
      tapOk = false; tapFlash = 0.2;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoPhase = (game.time.elapsed % BEAT) / BEAT;
      drawMachine(demoPhase, 1 + 0.3 * Math.pow(1 - demoPhase, 2));
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN TEMPO!' : 'OFF BEAT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      beatTimer += dt;
      if (timeLeft <= 0) { finish(false); return; }
    }
    if (tapFlash > 0) tapFlash -= dt;

    var beatPhase = (beatTimer % BEAT) / BEAT;
    var pulse = 1 + 0.3 * Math.pow(1 - beatPhase, 2);

    // ---- 描画 ----
    background();
    drawMachine(beatPhase, pulse);
    if (tapFlash > 0) {
      drawRing(CX, CY, snap(RING_R * 1.1), tapOk ? C.b : C.a, tapFlash * 2);
      txt(tapOk ? 'GOOD' : 'MISS', CX, CY, 72, tapOk ? C.b : C.a);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(goodTaps + ' / ' + NEEDED, W / 2, H - 160, 52, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mxx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mxx - 12, H - 100, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
