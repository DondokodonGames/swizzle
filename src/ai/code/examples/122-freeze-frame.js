// 122-freeze-frame.js
// フリーズフレーム — 周回する標的が照準に重なった瞬間にタップする一瞬の快感
// 操作: タップでフリーズ（周回ブリップが照準に重なった瞬間を狙う）
// 成功: 1回ぴったり重ねる  失敗: 5回外す or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーダー装置） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE FRAME';
  var HOW_TO_PLAY = 'TAP WHEN THE BLIP LOCKS ON TARGET';
  var MAX_TIME = 12;             // 修正2: 35 → 12
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var CX = snap(W / 2);
  var CY = snap(H * 0.5);
  var ORBIT_R = 240;
  var OBJ_R = 48;
  var OVERLAP_THRESHOLD = 56;    // 修正2: 判定を甘めに
  var ORBIT_SPEED = 1.8;

  var targetOffsets = [
    [0, 0], [ORBIT_R, 0], [0, ORBIT_R], [-ORBIT_R, 0],
    [0, -ORBIT_R], [ORBIT_R * 0.7, ORBIT_R * 0.7], [-ORBIT_R * 0.7, ORBIT_R * 0.7]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetX, targetY, targetLevel, angle, speed, score, misses;
  var timeLeft, done, flash, flashOk, frozen, freezeTimer;

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
    // レーダーの同心リング
    for (var rr = 80; rr <= ORBIT_R; rr += 80) {
      drawRing(CX, CY, rr, C.d, 0.3);
    }
  }

  // 8pxブロックのリング
  function drawRing(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.18) {
      game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
    }
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawTarget(tx, ty, close) {
    var col = close ? C.c : C.b;
    // コーナーブラケット（照準）
    var s = OBJ_R + 16;
    game.draw.rect(tx - s,      ty - s,      24, 8, col); game.draw.rect(tx - s, ty - s, 8, 24, col);
    game.draw.rect(tx + s - 24, ty - s,      24, 8, col); game.draw.rect(tx + s - 8, ty - s, 8, 24, col);
    game.draw.rect(tx - s,      ty + s - 8,  24, 8, col); game.draw.rect(tx - s, ty + s - 24, 8, 24, col);
    game.draw.rect(tx + s - 24, ty + s - 8,  24, 8, col); game.draw.rect(tx + s - 8, ty + s - 24, 8, 24, col);
    // 中心マーカー
    game.draw.rect(tx - 4, ty - OBJ_R, 8, OBJ_R * 2, col, 0.6);
    game.draw.rect(tx - OBJ_R, ty - 4, OBJ_R * 2, 8, col, 0.6);
  }

  function drawBlip(mx, my, close) {
    drawPixelCircle(mx, my, OBJ_R, close ? C.c : C.f, 1);
    drawPixelCircle(mx, my, OBJ_R - 16, C.g, 0.9);
    drawPixelCircle(mx, my, 8, close ? C.f : C.a, 1);
  }

  function setTarget() {
    var off = targetOffsets[targetLevel % targetOffsets.length];
    targetX = snap(CX + off[0]);
    targetY = snap(CY + off[1]);
  }

  // ── 初期化 ──
  function initGame() {
    targetLevel = 0;
    angle = 0;
    speed = ORBIT_SPEED;
    score = 0;
    misses = 0;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    frozen = false;
    freezeTimer = 0;
    setTarget();
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
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
    if (done || frozen) return;
    frozen = true;
    freezeTimer = 0.5;
    var mx = CX + Math.cos(angle) * ORBIT_R;
    var my = CY + Math.sin(angle) * ORBIT_R;
    var dx = mx - targetX, dy = my - targetY;
    if (Math.sqrt(dx * dx + dy * dy) < OVERLAP_THRESHOLD) {
      score++;
      flash = 0.5; flashOk = true;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
      targetLevel++;
      speed = ORBIT_SPEED + score * 0.2;
      setTimeout(function() { if (state === S.PLAYING && !done) { setTarget(); frozen = false; } }, 550);
    } else {
      misses++;
      flash = 0.4; flashOk = false;
      game.audio.play('se_failure');
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) frozen = false; }, 550);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var da = game.time.elapsed * 1.5;
      drawTarget(CX, CY, false);
      drawBlip(CX + Math.cos(da) * ORBIT_R, CY + Math.sin(da) * ORBIT_R, false);
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
      txt(resultSuccess ? 'LOCKED ON!' : 'MISSED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (timeLeft <= 0) { finish(false); return; }
      if (!frozen) angle += speed * dt;
    }
    if (freezeTimer > 0) freezeTimer -= dt;
    if (flash > 0) flash -= dt;

    var mx = CX + Math.cos(angle) * ORBIT_R;
    var my = CY + Math.sin(angle) * ORBIT_R;
    var dist = Math.sqrt((mx - targetX) * (mx - targetX) + (my - targetY) * (my - targetY));
    var close = dist < OVERLAP_THRESHOLD;

    // ---- 描画 ----
    background();
    drawTarget(targetX, targetY, close);
    drawBlip(mx, my, close);
    if (close && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      txt('NOW!', CX, CY - 320, 72, C.c);
    }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashOk ? C.b : C.a, flash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, H - 160, 52, C.b);
    // ミスドット
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mxx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mxx - 12, H - 100, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
