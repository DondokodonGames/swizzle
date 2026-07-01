// 127-plate-spinner.js
// 皿回し — 回転が遅くなったらタップして勢いを回復させ皿を落とさない集中力
// 操作: タップで皿に勢いを補給
// 成功: 5秒間すべての皿を回し続ける  失敗: 1枚でも落ちたら終了

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、大道芸ステージ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLATE SPINNER';
  var HOW_TO_PLAY = 'TAP SLOWING PLATES TO KEEP THEM UP';
  var TARGET_TIME = 5;           // 修正2: 20 → 5（サバイバル短縮）
  var MAX_TIME = 12;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var NUM_PLATES = 3;            // 修正2: 4 → 3
  var PLATE_R = 60;
  var MAX_SPIN = 5.0;
  var MIN_SPIN = 0.8;
  var DECAY = 0.22;              // 修正2: 減衰ゆるめ
  var POLE_H = 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var plates, survived, timeLeft, done, particles;

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
    var lit = Math.ceil((TARGET_TIME - survived) / TARGET_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // ステージ床
    game.draw.rect(0, snap(H * 0.62), W, 8, C.d, 0.5);
  }

  // ── 皿スプライト（多矩形・皿＋支柱＋回転マーク） ──
  function drawPlate(p) {
    var ratio = p.spin / MAX_SPIN;
    var col = ratio > 0.5 ? C.b : (ratio > 0.25 ? C.c : C.a);
    var wobble = snap(Math.sin(game.time.elapsed * 6) * p.tilt * PLATE_R);
    // 支柱
    game.draw.rect(p.x - 6, p.y, 12, POLE_H, C.g);
    game.draw.rect(p.x - 6, p.y, 12, 8, C.e);
    // 皿本体（潰れ回転を横幅の点滅で表現）
    var flat = Math.floor(game.time.elapsed * 8) % 2 === 0 ? 1 : 0.55;
    var px = p.x + wobble;
    for (var yy = -16; yy <= 16; yy += 8) {
      var hw = snap(PLATE_R * flat * Math.sqrt(Math.max(0, 1 - (yy / 20) * (yy / 20))));
      game.draw.rect(snap(px) - hw, snap(p.y) + yy, hw * 2, 8, col, 0.9);
    }
    // 皿の縁ハイライト
    game.draw.rect(snap(px) - snap(PLATE_R * flat), p.y - 8, 16, 8, C.g);
    game.draw.rect(snap(px) + snap(PLATE_R * flat) - 16, p.y - 8, 16, 8, C.g);
    // 回転ゲージ（皿上の点列）
    var lit = Math.round(ratio * 6);
    for (var g = 0; g < 6; g++) {
      game.draw.rect(px - 44 + g * 16, p.y - PLATE_R - 24, 12, 12, g < lit ? col : '#2a0a3a');
    }
  }

  // ── 初期化 ──
  function initGame() {
    plates = [];
    var xs = [snap(W * 0.25), snap(W * 0.5), snap(W * 0.75)];
    for (var i = 0; i < NUM_PLATES; i++) {
      plates.push({ x: xs[i], y: snap(H * 0.42), spin: MAX_SPIN * (0.75 + Math.random() * 0.25), tilt: 0, alive: true });
    }
    survived = 0;
    timeLeft = MAX_TIME;
    done = false;
    particles = [];
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 30) : Math.round(survived * 60);
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
    var best = -1, bestD = 99999;
    for (var i = 0; i < plates.length; i++) {
      if (!plates[i].alive) continue;
      var dx = x - plates[i].x, dy = y - plates[i].y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0 && bestD < PLATE_R + 80) {   // タップ最小半径確保
      plates[best].spin = Math.min(MAX_SPIN, plates[best].spin + 2.5);
      game.audio.play('se_tap', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: plates[best].x, y: plates[best].y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.3, color: C.c });
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var d = 0; d < NUM_PLATES; d++) {
        drawPlate({ x: snap(W * 0.25 + d * W * 0.25), y: snap(H * 0.42), spin: MAX_SPIN * 0.8, tilt: 0 });
      }
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.c);
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
      txt(resultSuccess ? 'BRAVO!' : 'CRASH', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      survived += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (survived >= TARGET_TIME) { finish(true); return; }

      for (var i = 0; i < plates.length; i++) {
        var p = plates[i];
        if (!p.alive) continue;
        p.spin -= DECAY * dt;
        if (p.spin < 0) p.spin = 0;
        var tiltTarget = (p.spin < MIN_SPIN) ? (MIN_SPIN - p.spin) * 0.8 : 0;
        p.tilt += (tiltTarget - p.tilt) * dt * 4;
        if (p.spin === 0 || p.tilt > 0.9) {
          p.alive = false;
          for (var pi2 = 0; pi2 < 10; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: p.x, y: p.y, vx: Math.cos(ang2) * 180, vy: Math.sin(ang2) * 180 - 100, life: 0.5, color: C.g });
          }
          finish(false);
          return;
        }
      }
    }

    for (var k = 0; k < particles.length; k++) {
      particles[k].x += particles[k].vx * dt; particles[k].y += particles[k].vy * dt;
      particles[k].vy += 600 * dt; particles[k].life -= dt;
    }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var i3 = 0; i3 < plates.length; i3++) if (plates[i3].alive) drawPlate(plates[i3]);
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.rect(snap(part.x) - 4, snap(part.y) - 4, 8, 8, part.color, part.life * 2);
    }

    // 生存進捗（下部）
    var barW = W - 200;
    game.draw.rect(100, BOTTOM - 40, barW, 24, '#2a0a3a');
    game.draw.rect(100, BOTTOM - 40, snap(barW * Math.min(1, survived / TARGET_TIME)), 24, C.b, 0.9);

    timeBar();
    txt(Math.ceil(TARGET_TIME - survived) + 's', W / 2, 96, 44, C.g);
    txt('KEEP SPINNING!', W / 2, H - 150, 48, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
