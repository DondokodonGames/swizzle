// 006-bubble-pop.js
// バブルポップ — 水面に達する前に弾ける気持ちよさ
// 操作: 泡をタップして弾く
// 成功: 1個弾く  失敗: 1個でも水面に届く or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、1セットのみ使用） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE_COLORS = [C.a, C.b, C.c, C.d, C.e, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'TAP BUBBLES BEFORE THEY SURFACE';
  var MAX_TIME = 15;
  var NEEDED   = 1;               // 修正2: 10 → 1
  var TOP   = 220;                // プレイ有効エリア上端（兼 水面ライン）
  var BOTTOM = H - 180;           // プレイ有効エリア下端

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var score, timeLeft, done, bubbles, popFx, spawnTimer;

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
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // 水中グラデーション風の帯
    game.draw.rect(0, TOP, W, BOTTOM - TOP, C.d, 0.25);
    game.draw.rect(0, TOP, W, 8, C.e);   // 水面ライン
  }

  // ── 初期化 ──
  function initGame() {
    score = 0;
    timeLeft = MAX_TIME;
    done = false;
    bubbles = [];
    popFx = [];
    spawnTimer = 0.6;
    spawnBubble();
    spawnBubble();
  }

  function spawnBubble() {
    bubbles.push({
      x:      snap(game.random(120, W - 120)),
      y:      H + 80,
      r:      snap(game.random(56, 96)),
      vy:     -game.random(220, 420),
      color:  BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
      ws:     game.random(2, 4)
    });
  }

  // ── 終了処理（リザルト画面を見せてから親フレームへ通知） ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 100 + Math.ceil(timeLeft) * 10) : score * 50;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) {
      state = S.ATTRACT;
      return;
    }
    // PLAYING
    if (done) return;
    var rTap = 80; // 修正1: タップ最小半径80px
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      var dx = x - b.x, dy = y - b.y;
      var hit = Math.max(b.r, rTap);
      if (dx * dx + dy * dy <= hit * hit) {
        popFx.push({ x: b.x, y: b.y, r: b.r, color: b.color, t: 0 });
        bubbles.splice(i, 1);
        score++;
        game.audio.play('se_tap', 0.7);
        if (score >= NEEDED) finish(true);
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    // ATTRACT（デモ画面）
    if (state === S.ATTRACT) {
      background();
      // デモ用に泡をゆっくり漂わせる
      for (var d = 0; d < 5; d++) {
        var bx = snap((d * 240 + 140 + game.time.elapsed * 30) % W);
        var by = snap(BOTTOM - ((game.time.elapsed * 120 + d * 360) % (BOTTOM - TOP)));
        drawPixelCircle(bx, by, 48, BUBBLE_COLORS[d % BUBBLE_COLORS.length], 0.5);
      }
      txt(GAME_TITLE,  W / 2, H * 0.28, 96, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.40, 44, C.e);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.72, 52, C.g);
      }
      txt('HI-SCORE  000300', W / 2, H * 0.85, 48, C.g);
      txt('INSERT COIN', W / 2, H * 0.91, 42, '#888888');
      scanlines();
      return;
    }

    // RESULT
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      spawnTimer -= dt;
      var spawnInterval = Math.max(0.45, 1.1 - (MAX_TIME - timeLeft) * 0.03);
      if (spawnTimer <= 0) { spawnBubble(); spawnTimer = spawnInterval; }

      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i];
        b.wobble += b.ws * dt;
        b.x += Math.sin(b.wobble) * 24 * dt;
        b.y += b.vy * dt;
        if (b.y + b.r < TOP) { finish(false); return; }  // 水面到達 → 失敗
      }
    }

    for (var j = popFx.length - 1; j >= 0; j--) {
      popFx[j].t += dt;
      if (popFx[j].t > 0.4) popFx.splice(j, 1);
    }

    // ---- 描画 ----
    background();

    for (var k = 0; k < bubbles.length; k++) {
      var b2 = bubbles[k];
      drawPixelCircle(b2.x, b2.y, b2.r, b2.color, 0.85);
      drawPixelCircle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, 12, C.g, 0.9); // ハイライト
    }

    for (var p = 0; p < popFx.length; p++) {
      var fx = popFx[p];
      var prog = fx.t / 0.4;
      drawPixelCircle(fx.x, fx.y, fx.r * (1 + prog * 1.4), fx.color, (1 - prog) * 0.7);
    }

    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.g);
    txt(score + ' / ' + NEEDED, W / 2, H - 120, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
