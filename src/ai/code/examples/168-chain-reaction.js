// 168-chain-reaction.js
// 連鎖爆発 — 最初の一発から爆発が広がる達成感、最大連鎖を狙え
// 操作: タップで爆発を開始する位置を選ぶ
// 成功: 爆発が40%以上に連鎖  失敗: 40%未満 or 10秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP TO START THE BLAST · CHAIN THEM ALL';
  var MAX_TIME = 10;             // 修正2: 20 → 10
  var SUCCESS_PCT = 0.40;        // 修正2: 0.80 → 0.40
  var BOMB_R = 44, CHAIN_RADIUS = 240, BOMB_COUNT = 16;   // 修正2: 半径拡大・数減
  var TOP    = 220, BOTTOM = H - 180;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bombs, explosions, phase, explodeCount, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(Math.max(0, timeLeft) / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawBomb(b) {
    if (b.exploded && b.chainTimer < 0) { pc(b.x, b.y, BOMB_R, '#3a2a4a', 0.6); return; }
    if (b.exploded) {
      pc(b.x, b.y, BOMB_R, '#222222', 1);
      var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.rect(snap(b.x) - 6, snap(b.y) - BOMB_R - 16, 12, 12, on ? C.c : C.f);
    } else {
      pc(b.x, b.y, BOMB_R, '#222222', 1);
      pc(b.x - 12, b.y - 12, 8, C.g, 0.6);
      game.draw.rect(snap(b.x) - 4, snap(b.y) - BOMB_R - 16, 8, 16, C.f);
    }
  }

  function initBombs() {
    bombs = []; var tries = 0;
    while (bombs.length < BOMB_COUNT && tries < 500) {
      tries++;
      var bx = snap(BOMB_R + 60 + Math.random() * (W - (BOMB_R + 60) * 2));
      var by = snap(TOP + 40 + Math.random() * (BOTTOM - TOP - 80));
      var overlap = false;
      for (var i = 0; i < bombs.length; i++) if (Math.hypot(bx - bombs[i].x, by - bombs[i].y) < BOMB_R * 2 + 16) { overlap = true; break; }
      if (!overlap) bombs.push({ x: bx, y: by, exploded: false, chainTimer: -1 });
    }
  }

  function startChain(cx, cy) {
    explosions.push({ x: cx, y: cy, r: 0, timer: 0.6 });
    explodeCount++;
    for (var i = 0; i < bombs.length; i++) {
      var b = bombs[i];
      if (b.exploded) continue;
      var dist = Math.hypot(cx - b.x, cy - b.y);
      if (dist < CHAIN_RADIUS) { b.exploded = true; b.chainTimer = dist / CHAIN_RADIUS * 0.4; }
    }
  }

  function initGame() {
    explosions = []; phase = 'aim'; explodeCount = 0; timeLeft = MAX_TIME; done = false;
    initBombs();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    var pct = explodeCount / BOMB_COUNT;
    finalScore = success ? Math.round(pct * 800 + 300) : Math.round(pct * 300);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'aim') { phase = 'exploding'; game.audio.play('se_tap', 0.6); startChain(x, y); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var b = 0; b < 8; b++) drawBomb({ x: W * (0.2 + (b % 4) * 0.2), y: H * (0.35 + Math.floor(b / 4) * 0.15), exploded: false, chainTimer: -1 });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      var pct = Math.round(explodeCount / BOMB_COUNT * 100);
      txt(resultSuccess ? 'BIG CHAIN!' : 'FIZZLED', W / 2, H * 0.32, 76, resultSuccess ? C.b : C.a);
      txt(pct + '% (' + explodeCount + '/' + BOMB_COUNT + ')', W / 2, H * 0.44, 54, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 56, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (phase === 'aim' && !done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }
    if (phase === 'exploding') {
      var pending = false;
      for (var i = 0; i < bombs.length; i++) {
        var b = bombs[i];
        if (b.exploded && b.chainTimer >= 0) { b.chainTimer -= dt; if (b.chainTimer <= 0) { b.chainTimer = -1; startChain(b.x, b.y); game.audio.play('se_tap', 0.2); } pending = true; }
      }
      var expanding = false;
      for (var ei = explosions.length - 1; ei >= 0; ei--) { explosions[ei].r += 600 * dt; explosions[ei].timer -= dt; if (explosions[ei].timer <= 0) explosions.splice(ei, 1); else expanding = true; }
      if (!pending && !expanding) { finish(explodeCount / BOMB_COUNT >= SUCCESS_PCT); return; }
    }

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < explosions.length; ei2++) { var ex = explosions[ei2]; ring(ex.x, ex.y, ex.r, C.f, (ex.timer / 0.6) * 0.7); }
    for (var bi = 0; bi < bombs.length; bi++) drawBomb(bombs[bi]);

    timeBar();
    txt(Math.ceil(Math.max(0, timeLeft)) + '', W / 2, 96, 44, C.g);
    txt(explodeCount + ' / ' + BOMB_COUNT, W / 2, 168, 44, C.b);
    txt(phase === 'aim' ? 'TAP WHERE TO IGNITE!' : 'CHAINING...', W / 2, H - 120, 44, phase === 'aim' ? C.c : C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
