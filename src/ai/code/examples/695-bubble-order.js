// 695-bubble-order.js
// バブルオーダー — バブルを大きさの順番通りにタップする
// 操作: 小さい順（または大きい順）にバブルをすべてタップ。順番を間違えるとミス
// 成功: 5ラウンド クリア  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、バブル） ──
  var C = { bg:'#020e18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE ORDER';
  var HOW_TO_PLAY = 'TAP THE BUBBLES IN SIZE ORDER · SMALLEST TO LARGEST (OR REVERSE)';
  var MAX_TIME = 24;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var PLAY_Y0 = 300, PLAY_Y1 = snap(H * 0.88), MIN_R = 48, MAX_R = 170;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, order, nextIdx, round, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, tapFlash, tapFlashTimer, roundWait, roundDone;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030d18');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() {
    round++; order = round % 2 === 0 ? 'desc' : 'asc';
    var count = 3 + Math.min(2, Math.floor(round / 3)); var radii = [];
    for (var i = 0; i < count; i++) radii.push(MIN_R + Math.floor(Math.random() * (MAX_R - MIN_R)));
    radii.sort(function(a, b) { return a - b; });
    for (var j = 1; j < radii.length; j++) if (radii[j] - radii[j - 1] < 24) radii[j] = radii[j - 1] + 24;
    var placed = [], attempts = 0;
    for (var k = 0; k < count; k++) {
      var r = radii[k], ok = false, bx, by;
      while (!ok && attempts < 300) {
        attempts++; bx = r + 30 + Math.random() * (W - r * 2 - 60); by = PLAY_Y0 + r + 30 + Math.random() * (PLAY_Y1 - PLAY_Y0 - r * 2 - 60); ok = true;
        for (var m = 0; m < placed.length; m++) { var dx = bx - placed[m].x, dy = by - placed[m].y, minDist = r + placed[m].r + 20; if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; } }
      }
      placed.push({ x: bx, y: by, r: r, rank: k, tapped: false, phase: Math.random() * Math.PI * 2 });
    }
    bubbles = placed; nextIdx = 0; roundDone = false; roundWait = 0; tapFlash = -1;
  }

  function initGame() { round = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlash = -1; tapFlashTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 700 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var instText = order === 'asc' ? 'SMALLEST FIRST' : 'LARGEST FIRST', instCol = order === 'asc' ? C.e : C.c;
    txt(instText, W / 2, PLAY_Y0 - 56, 44, instCol);
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi];
      if (b.tapped) { ring(b.x, b.y, b.r + 16, C.b, 0.25); continue; }
      var pulse = 0.85 + 0.15 * Math.sin(b.phase * 2.5), isFlash = (bi === tapFlash && tapFlashTimer > 0);
      pc(b.x, b.y, b.r * pulse, isFlash ? C.g : C.e, isFlash ? 0.95 : 0.75);
      pc(b.x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.2, C.g, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || roundDone) return;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i]; if (b.tapped) continue;
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < (b.r + 20) * (b.r + 20)) {
        var expectedRank = (order === 'asc') ? nextIdx : (bubbles.length - 1 - nextIdx);
        if (b.rank === expectedRank) {
          b.tapped = true; tapFlash = i; tapFlashTimer = 0.25; game.audio.play('se_tap', 0.15);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: C.g }); }
          nextIdx++;
          var allTapped = true; for (var j = 0; j < bubbles.length; j++) if (!bubbles[j].tapped) { allTapped = false; break; }
          if (allTapped) {
            roundDone = true; flash = 0.35; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.7; game.audio.play('se_success', 0.7);
            if (round >= NEEDED) { finish(true); return; }
            roundWait = 0.9;
          }
        } else {
          errors++; flash = 0.4; flashCol = C.a; resultText = 'WRONG ORDER!'; resultTimer = 0.7; game.audio.play('se_failure', 0.35);
          if (errors >= MAX_ERR) { finish(false); return; }
          roundDone = true; roundWait = 0.9;
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SIZE MASTER!' : 'OUT OF ORDER', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlashTimer > 0) tapFlashTimer -= dt * 4;
      if (roundWait > 0 && roundDone) { roundWait -= dt; if (roundWait <= 0) newRound(); }
      for (var i = 0; i < bubbles.length; i++) if (!bubbles[i].tapped) bubbles[i].phase += dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 58, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#030d18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
