// 197-crystal-match.js
// クリスタルマッチ — 降ってくる宝石を同じ列のボタンでキャッチする反射神経ゲーム
// 操作: タップで対応する列ボタンを押す
// 成功: 3個キャッチ  失敗: 7個取り逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石鉱山） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEMS = [C.e, C.c, C.b, C.a];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL MATCH';
  var HOW_TO_PLAY = 'TAP THE COLUMN BUTTON TO CATCH THE GEM';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 3;              // 修正2: 25 → 3
  var MAX_MISS = 7;
  var COLS = 4, COL_W = W / 4, GEM_R = 48, FALL_SPEED = 330, BTN_Y = snap(H * 0.80), BTN_H = 150;
  var CATCH_Y = BTN_Y - GEM_R;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gems, particles, spawnTimer, score, misses, timeLeft, done, btnFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var lc = 0; lc < COLS; lc++) game.draw.rect(lc * COL_W + 4, 0, COL_W - 8, H, GEMS[lc], 0.05);
    game.draw.rect(0, CATCH_Y - 4, W, 8, C.d, 0.7);
  }

  function drawGem(g) {
    var gx = (g.col + 0.5) * COL_W;
    if (g.caught) { pc(gx, g.y, GEM_R, GEMS[g.colorIdx], 0.4); return; }
    pc(gx, g.y, GEM_R, GEMS[g.colorIdx], 0.95);
    pc(gx - 14, g.y - 14, 8, C.g, 0.7);
    game.draw.rect(snap(gx) - 4, snap(g.y) - GEM_R, 8, 12, C.g, 0.5);
  }

  function drawButtons() {
    for (var bc = 0; bc < COLS; bc++) {
      var bx = bc * COL_W;
      game.draw.rect(bx + 8, BTN_Y, COL_W - 16, BTN_H, GEMS[bc], btnFlash[bc] > 0 ? 0.7 : 0.35);
      game.draw.rect(bx + 8, BTN_Y, COL_W - 16, 12, C.g, btnFlash[bc] > 0 ? 0.5 : 0.2);
    }
  }

  function spawnGem() { gems.push({ col: Math.floor(Math.random() * COLS), y: -GEM_R, colorIdx: Math.floor(Math.random() * GEMS.length), caught: false }); }

  function initGame() {
    gems = []; particles = []; spawnTimer = 0.4; score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; btnFlash = [0, 0, 0, 0];
    spawnGem();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || y < BTN_Y) return;
    var col = Math.floor(x / COL_W);
    if (col < 0 || col >= COLS) return;
    btnFlash[col] = 0.2;
    for (var gi = gems.length - 1; gi >= 0; gi--) {
      var g = gems[gi];
      if (g.col !== col || g.caught) continue;
      if (g.y > CATCH_Y - 130 && g.y < CATCH_Y + 60) {
        g.caught = true; score++;
        game.audio.play('se_tap', 0.6);
        var cx = (col + 0.5) * COL_W;
        for (var pi = 0; pi < 6; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: cx, y: CATCH_Y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, colorIdx: g.colorIdx }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
    game.audio.play('se_failure', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawGem({ col: 1, y: H * 0.4, colorIdx: 1, caught: false }); drawButtons();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.70, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CAUGHT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = 0.7 * (0.7 + Math.random() * 0.6); spawnGem(); }
      for (var ci = 0; ci < COLS; ci++) if (btnFlash[ci] > 0) btnFlash[ci] -= dt;
      for (var gi = gems.length - 1; gi >= 0; gi--) {
        var g = gems[gi]; g.y += FALL_SPEED * dt;
        if (g.caught && g.y > CATCH_Y + 80) { gems.splice(gi, 1); continue; }
        if (!g.caught && g.y > CATCH_Y + 60) { misses++; gems.splice(gi, 1); if (misses >= MAX_MISS) { finish(false); return; } }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var gi2 = 0; gi2 < gems.length; gi2++) drawGem(gems[gi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, GEMS[particles[pp].colorIdx], particles[pp].life * 2.5);
    drawButtons();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 48);
      game.draw.rect(mx - 8, 208, 16, 16, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
