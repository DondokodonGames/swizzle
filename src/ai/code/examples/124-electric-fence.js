// 124-electric-fence.js
// 電気フェンス — 感電しないよう隙間のレーンを合わせてくぐり抜ける緊張感
// 操作: タップで下方向へレーン切替、スワイプ上下でも移動（3レーン）
// 成功: フェンスを2枚くぐり抜ける  失敗: 電流に触れる or 10秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、高圧設備） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ELECTRIC FENCE';
  var HOW_TO_PLAY = 'MATCH THE GAP LANE · DONT GET ZAPPED';
  var MAX_TIME = 10;             // 修正2: 25 → 10
  var TOTAL_DIST = 2;            // 修正2: 20 → 2（くぐり抜ける枚数）
  var TOP    = 220;
  var BOTTOM = H - 180;

  var LANES = 3;
  var laneY = [snap(H * 0.42), snap(H * 0.56), snap(H * 0.70)]; // 下部寄り
  var PLAYER_X = snap(W * 0.2);
  var PLAYER_R = 40;
  var PANEL_W = 40;
  var LANE_GAP = 120;
  var SCROLL_SPEED = 260;        // 修正2: 少しゆっくり

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var obstacles, currentLane, spawnTimer, passed, timeLeft, done, flash, particles;

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
    // レーンレール
    for (var li = 0; li < LANES; li++) {
      game.draw.rect(0, laneY[li] - 2, W, 4, C.d, 0.4);
    }
  }

  // ── フェンススプライト（多矩形・電流ブロック） ──
  function drawPanel(obs) {
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    for (var li = 0; li < LANES; li++) {
      if (li === obs.gapLane) continue;
      var top = laneY[li] - LANE_GAP / 2;
      // 支柱
      game.draw.rect(obs.x - PANEL_W / 2, top, 8, LANE_GAP, C.g);
      game.draw.rect(obs.x + PANEL_W / 2 - 8, top, 8, LANE_GAP, C.g);
      // 電流（フレーム刻みで色替え）
      for (var yy = top; yy < top + LANE_GAP; yy += 16) {
        game.draw.rect(obs.x - PANEL_W / 2 + 8, yy, PANEL_W - 16, 8, on ? C.c : C.f, 0.9);
      }
    }
    // 隙間ラベル
    var g = laneY[obs.gapLane];
    game.draw.rect(obs.x - 6, g - 24, 12, 48, C.b);
    txt('▶', obs.x, g, 40, C.b);
  }

  function drawPlayer(y) {
    // ロボット風の多矩形キャラ
    drawPixelCircle(PLAYER_X, y, PLAYER_R, C.e, 1);
    game.draw.rect(PLAYER_X - 24, y - 12, 48, 8, C.g);        // バイザー
    game.draw.rect(PLAYER_X - 16, y - 12, 12, 8, C.a);        // 目
    game.draw.rect(PLAYER_X + 4,  y - 12, 12, 8, C.a);
    game.draw.rect(PLAYER_X - 8,  y + 16, 16, 16, C.b);       // コア
    game.draw.rect(PLAYER_X - PLAYER_R, y - 4, 8, 8, C.g);    // アンテナ台
    game.draw.rect(PLAYER_X - PLAYER_R - 8, y - 24, 8, 20, C.c);
  }

  // ── 初期化 ──
  function initGame() {
    obstacles = [];
    currentLane = 1;
    spawnTimer = 0.8;
    passed = 0;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    particles = [];
    spawnPanel();
  }

  function spawnPanel() {
    obstacles.push({ x: W + PANEL_W, gapLane: Math.floor(Math.random() * LANES), counted: false });
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (passed * 200 + Math.ceil(timeLeft) * 30) : passed * 100;
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
    currentLane = (currentLane + 1) % LANES;
    game.audio.play('se_tap', 0.5);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up')   currentLane = Math.max(0, currentLane - 1);
    if (dir === 'down') currentLane = Math.min(LANES - 1, currentLane + 1);
    game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawPanel({ x: W * 0.6, gapLane: 1 });
      drawPlayer(laneY[1]);
      txt(GAME_TITLE,  W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 30, C.b);
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
      txt(resultSuccess ? 'ESCAPED!' : 'ZAPPED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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

      for (var i = 0; i < obstacles.length; i++) obstacles[i].x -= SCROLL_SPEED * dt;

      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = 1.1 + Math.random() * 0.4; spawnPanel(); }

      var py = laneY[currentLane];
      for (var j = obstacles.length - 1; j >= 0; j--) {
        var obs = obstacles[j];
        if (Math.abs(PLAYER_X - obs.x) < PANEL_W * 0.5 + PLAYER_R && currentLane !== obs.gapLane) {
          flash = 0.6;
          for (var pi = 0; pi < 16; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: PLAYER_X, y: py, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5 });
          }
          finish(false);
          return;
        }
        if (obs.x + PANEL_W < PLAYER_X - PLAYER_R && !obs.counted) {
          obs.counted = true;
          passed++;
          game.audio.play('se_tap', 0.7);
          if (passed >= TOTAL_DIST) { finish(true); return; }
        }
        if (obs.x + PANEL_W < -60) obstacles.splice(j, 1);
      }
    }

    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    for (var oi = 0; oi < obstacles.length; oi++) drawPanel(obstacles[oi]);
    drawPlayer(laneY[currentLane]);
    for (var pp = 0; pp < particles.length; pp++) {
      var pt = particles[pp];
      game.draw.rect(snap(pt.x) - 4, snap(pt.y) - 4, 8, 8, C.c, pt.life * 2);
    }
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.3);

    // 進捗（下部）
    var barW = W - 200;
    game.draw.rect(100, BOTTOM - 40, barW, 24, '#2a0a3a');
    game.draw.rect(100, BOTTOM - 40, snap(barW * Math.min(1, passed / TOTAL_DIST)), 24, C.b, 0.9);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + TOTAL_DIST, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
