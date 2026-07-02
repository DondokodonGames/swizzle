// 380-ink-blot.js
// インクブロット — 用紙の上で広がるインクを、外周リングをはみ出す前にタップで止める
// 操作: 広がるインクをタップして止める（リングを越えるとはみ出し）
// 成功: 4回 止める  失敗: 3回 はみ出す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、製図台） ──
  var C = { bg:'#060614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', paper:'#101028' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'INK BLOT';
  var HOW_TO_PLAY = 'TAP THE SPREADING INK BEFORE IT CROSSES THE RING';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_OVER = 3;
  var PX = snap(W * 0.08), PY = snap(H * 0.30), PW = snap(W * 0.84), PH = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var blobs, stopped, over, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.18) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(PX - 6, PY - 6, PW + 12, PH + 12, C.d, 0.4); game.draw.rect(PX, PY, PW, PH, C.paper, 0.95); }

  function spawnBlob() {
    var x = snap(PX + 100 + Math.random() * (PW - 200)), y = snap(PY + 100 + Math.random() * (PH - 200));
    var maxR = Math.min(x - PX, PX + PW - x, y - PY, PY + PH - y) * 0.9;
    blobs.push({ x: x, y: y, r: 0, maxR: maxR, grow: 55 + Math.random() * 45, stopped: false, over: false, alpha: 1 });
  }

  function initGame() { blobs = []; stopped = 0; over = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (stopped * 500 + Math.ceil(timeLeft) * 100) : stopped * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBlobs() {
    for (var bi = 0; bi < blobs.length; bi++) {
      var b = blobs[bi]; if (b.alpha <= 0) continue;
      var col = b.over ? C.a : b.stopped ? C.e : C.g;
      pc(b.x, b.y, b.r, col, b.alpha * 0.85);
      if (!b.stopped && !b.over) { ring(b.x, b.y, b.maxR, b.r > b.maxR * 0.7 ? C.a : C.d, 0.6); }
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bd = 200;
    for (var i = 0; i < blobs.length; i++) { if (blobs[i].stopped || blobs[i].over) continue; var d = Math.hypot(x - blobs[i].x, y - blobs[i].y); if (d < blobs[i].r + 50 && d < bd) { bd = d; best = i; } }
    if (best >= 0) { var b = blobs[best]; b.stopped = true; stopped++; for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.e }); } game.audio.play('se_success', 0.4); if (stopped >= NEEDED) { finish(true); return; } }
    else game.audio.play('se_failure', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      pc(W / 2, H * 0.5, 60, C.g, 0.85); ring(W / 2, H * 0.5, 100, C.d, 0.6);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY HAND!' : 'BLOTTED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && blobs.length < 4) { spawnBlob(); spawnTimer = 1.0 + Math.random() * 0.8; }
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i];
        if (b.stopped) { b.alpha -= dt * 0.3; continue; }
        if (b.over) { b.alpha -= dt * 0.8; continue; }
        b.r += b.grow * dt;
        if (b.r >= b.maxR) { b.over = true; over++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.a }); } if (over >= MAX_OVER) { finish(false); return; } }
      }
      for (var i2 = blobs.length - 1; i2 >= 0; i2--) if (blobs[i2].alpha <= 0) blobs.splice(i2, 1);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBlobs();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(stopped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVER; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVER - 1) / 2) * 56) - 10, 224, 20, 20, oi < over ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
