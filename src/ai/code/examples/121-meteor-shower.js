// 121-meteor-shower.js
// 流星雨 — 降り注ぐ流星をタップしてエネルギーを収集する宇宙的快感
// 操作: タップで流星をキャッチ
// 成功: 3個収集  失敗: 6個見逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宇宙） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHOWER';
  var HOW_TO_PLAY = 'TAP FALLING METEORS TO COLLECT';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 3;              // 修正2: 30 → 3
  var MAX_MISS = 6;              // 見逃し許容
  var TOP    = 220;
  var BOTTOM = H - 180;
  var METEOR_R = 40;             // タップ最小半径以上
  var SPAWN_INTERVAL = 0.85;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var meteors, sparkles, stars, spawnTimer, collected, misses, timeLeft, done, flash;

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
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var on = Math.floor((game.time.elapsed + st.o) * 8) % 2 === 0 ? 0.9 : 0.35;
      game.draw.rect(st.x, st.y, st.s, st.s, C.g, on);
    }
  }

  // ── 流星スプライト（多矩形・核＋尾＋きらめき） ──
  function drawMeteor(m) {
    // 尾（斜めブロック）
    for (var t = 1; t <= 4; t++) {
      game.draw.rect(snap(m.x - m.vx * 0.02 * t) - 6, snap(m.y - m.vy * 0.02 * t) - 6, 12, 12, C.d, 0.7 - t * 0.12);
    }
    // 核
    drawPixelCircle(m.x, m.y, METEOR_R, C.f, 1);
    drawPixelCircle(m.x, m.y, METEOR_R - 16, C.c, 1);
    // きらめき（十字）
    game.draw.rect(snap(m.x) - 4, snap(m.y) - METEOR_R - 8, 8, 16, C.g);
    game.draw.rect(snap(m.x) - METEOR_R - 8, snap(m.y) - 4, 16, 8, C.g);
  }

  // ── 初期化 ──
  function initGame() {
    meteors = [];
    sparkles = [];
    stars = [];
    for (var i = 0; i < 40; i++) {
      stars.push({ x: snap(game.random(0, W)), y: snap(game.random(0, H)), s: 8, o: Math.random() });
    }
    spawnTimer = 0;
    collected = 0;
    misses = 0;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    spawnMeteor();
  }

  function spawnMeteor() {
    var startX = snap(game.random(-W * 0.1, W * 1.1));
    var angle = Math.PI * 0.55 + Math.random() * Math.PI * 0.3;
    var speed = game.random(360, 560);   // 修正2: 少し遅めで捕まえやすく
    meteors.push({
      x: startX, y: -60,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      caught: false, missed: false
    });
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (collected * 200 + Math.ceil(timeLeft) * 20) : collected * 60;
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
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      if (m.caught || m.missed) continue;
      var dx = x - m.x, dy = y - m.y;
      var hit = Math.max(METEOR_R + 24, 80);   // タップ最小半径80px
      if (dx * dx + dy * dy < hit * hit) {
        m.caught = true;
        collected++;
        flash = 0.3;
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          sparkles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5 });
        }
        game.audio.play('se_tap', 0.8);
        if (collected >= NEEDED) finish(true);
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      // デモ: 流れる流星
      for (var d = 0; d < 3; d++) {
        var ph = (game.time.elapsed * 0.4 + d * 0.33) % 1;
        drawMeteor({ x: snap(W * 0.2 + ph * W * 0.6), y: snap(TOP + ph * (BOTTOM - TOP)), vx: 300, vy: 500 });
      }
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STARDUST!' : 'MISSED OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(0.5, SPAWN_INTERVAL - collected * 0.03);
        spawnMeteor();
      }

      for (var i = 0; i < meteors.length; i++) {
        var m = meteors[i];
        if (m.caught) continue;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (!m.missed && (m.y > H + 80 || m.x < -120 || m.x > W + 120)) {
          m.missed = true;
          misses++;
          game.audio.play('se_failure', 0.3);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
      meteors = meteors.filter(function(m) { return !m.caught && !(m.missed && m.y > H + 120); });
    }

    for (var sp = 0; sp < sparkles.length; sp++) {
      sparkles[sp].x += sparkles[sp].vx * dt;
      sparkles[sp].y += sparkles[sp].vy * dt;
      sparkles[sp].vy += 300 * dt;
      sparkles[sp].life -= dt;
    }
    sparkles = sparkles.filter(function(s) { return s.life > 0; });
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.15);

    for (var mi = 0; mi < meteors.length; mi++) {
      if (!meteors[mi].caught) drawMeteor(meteors[mi]);
    }
    for (var si = 0; si < sparkles.length; si++) {
      var s = sparkles[si];
      game.draw.rect(snap(s.x) - 4, snap(s.y) - 4, 8, 8, C.c, s.life * 2);
    }

    // ミスドット（下部）
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, H - 80, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
