// 552-blob-merge.js
// ブロブマージ — 同色のブロブをタップで選んで合体させ、大きく育て切るとポップして消える
// 操作: ブロブをタップで選択 → 同色の別ブロブをタップで合体（規定サイズ超でポップ＝1消去）
// 成功: 5回 ポップ消去  失敗: 画面がブロブで埋まる or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ラボ培養槽） ──
  var C = { bg:'#0a0510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOB_COLS = [C.a, C.e, C.b, C.c];  // 合体色は内容そのもの

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BLOB MERGE';
  var HOW_TO_PLAY = 'TAP A BLOB THEN A SAME-COLOR BLOB TO MERGE · GROW IT TO POP';
  var MAX_TIME = 18;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_BLOBS = 14;        // 修正2: 18 → 14
  var POP_R = 110;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var blobs, selected, merged, timeLeft, done, particles, flash, nextSpawn;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#180a20');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBlob() {
    if (blobs.length >= MAX_BLOBS) return;
    var r = 44, x, y, at = 0;
    do { x = r + 40 + Math.random() * (W - 2 * r - 80); y = r + 300 + Math.random() * (H * 0.55 - 2 * r); var ok = true; for (var i = 0; i < blobs.length; i++) if (Math.hypot(x - blobs[i].x, y - blobs[i].y) < r + blobs[i].r + 20) { ok = false; break; } if (ok) break; at++; } while (at < 20);
    blobs.push({ x: x, y: y, r: r, colorIdx: Math.floor(Math.random() * BLOB_COLS.length), vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, wobble: Math.random() * Math.PI * 2, wobbleSpeed: 1.5 + Math.random() * 2 });
  }

  function initGame() { blobs = []; selected = -1; merged = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; nextSpawn = 1.6; for (var i = 0; i < 6; i++) spawnBlob(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (merged * 800 + Math.ceil(timeLeft) * 100) : merged * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i], col = BLOB_COLS[b.colorIdx], isSel = selected === i, wx = Math.sin(b.wobble) * b.r * 0.08, wy = Math.cos(b.wobble * 1.3) * b.r * 0.08;
      if (isSel) pc(b.x + wx, b.y + wy, b.r + 18, C.g, 0.2 + Math.sin(game.time.elapsed * 6) * 0.1);
      pc(b.x + wx, b.y + wy, b.r + 4, col, 0.2); pc(b.x + wx, b.y + wy, b.r, col, 0.9); pc(b.x + wx - b.r * 0.25, b.y + wy - b.r * 0.25, b.r * 0.3, C.g, 0.25);
      var sp = (b.r - 44) / (POP_R - 44); if (sp > 0.5) pc(b.x + wx, b.y + wy, b.r + 10, col, sp * 0.3);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tapped = -1;
    for (var i = blobs.length - 1; i >= 0; i--) if (Math.hypot(tx - blobs[i].x, ty - blobs[i].y) < blobs[i].r + 20) { tapped = i; break; }
    if (tapped === -1) { selected = -1; return; }
    if (selected === -1) { selected = tapped; game.audio.play('se_tap', 0.3); return; }
    if (selected === tapped) { selected = -1; return; }
    var sa = blobs[selected], sb = blobs[tapped];
    if (sa.colorIdx !== sb.colorIdx) { selected = tapped; game.audio.play('se_failure', 0.2); return; }
    var nr = Math.sqrt(sa.r * sa.r + sb.r * sb.r), nx = (sa.x * sa.r + sb.x * sb.r) / (sa.r + sb.r), ny = (sa.y * sa.r + sb.y * sb.r) / (sa.r + sb.r);
    if (nr >= POP_R) {
      merged++; flash = 0.3; game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: nx, y: ny, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.5, col: BLOB_COLS[sa.colorIdx] }); }
      var idxs = [selected, tapped].sort(function(a, b) { return b - a; }); blobs.splice(idxs[0], 1); blobs.splice(idxs[1], 1); selected = -1;
      if (merged >= NEEDED) { finish(true); return; }
    } else {
      var big = selected, small = tapped; if (sb.r > sa.r) { big = tapped; small = selected; }
      blobs[big].r = nr; blobs[big].x = nx; blobs[big].y = ny; blobs.splice(small, 1); selected = big > small ? big - 1 : big; game.audio.play('se_tap', 0.5);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blobs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL POPPED!' : 'OVERFLOW', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnBlob(); nextSpawn = Math.max(0.8, 1.6 - merged * 0.08); if (blobs.length >= MAX_BLOBS) { finish(false); return; } }
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.wobble += b.wobbleSpeed * dt; b.vx *= Math.pow(0.97, dt * 60); b.vy *= Math.pow(0.97, dt * 60);
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < 280) { b.y = 280 + b.r; b.vy = Math.abs(b.vy); } if (b.y + b.r > H * 0.92) { b.y = H * 0.92 - b.r; b.vy = -Math.abs(b.vy); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    var ratio = blobs.length / MAX_BLOBS; if (ratio > 0.7) game.draw.rect(0, 0, W, H, C.a, (ratio - 0.7) * 0.1);
    drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 8, snap(particles[pp2].y) - 8, 16, 16, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.g, flash * 0.1);

    // ブロブ充填バー
    game.draw.rect(80, H - 64, W - 160, 20, '#180a20', 0.6); game.draw.rect(80, H - 64, (W - 160) * ratio, 20, ratio > 0.7 ? C.a : C.e, 0.9);
    txt('BLOBS ' + blobs.length + '/' + MAX_BLOBS, W / 2, H - 30, 32, ratio > 0.7 ? C.a : C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(merged + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
