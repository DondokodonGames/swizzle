// 774-fuse-box.js
// ヒューズボックス — 燃え広がるヒューズを、爆発する前にタップして消火せよ
// 操作: タップで消火（燃えているヒューズ上をタップ）
// 成功: 12本 消火  失敗: 3本 爆発 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配電盤） ──
  var C = { bg:'#090603', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PANEL = '#1c1008', FUSE_BASE = '#3a2a22', FUSE_WIRE = '#ff8800', BURNING = '#ff6600', BURN_HI = '#ffe600', SAFE = '#00ff41';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FUSE BOX';
  var HOW_TO_PLAY = 'TAP THE BURNING FUSES TO PUT THEM OUT BEFORE THEY REACH THE END';
  var MAX_TIME = 24;
  var NEEDED     = 12;       // 修正2: 30 → 12
  var MAX_EXPLODE = 3;       // 修正2: 10 → 3
  var FUSE_COLS = 4, FUSE_ROWS = 5, FUSE_COUNT = 20, MARGIN = snap(W * 0.065), FUSE_GAP_X = 12, FUSE_GAP_Y = 16;
  var FUSE_W = snap((W - MARGIN * 2 - FUSE_GAP_X * (FUSE_COLS - 1)) / FUSE_COLS), FUSE_H = 88, GRID_Y = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fuses, spawnTimer, extinguished, exploded, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0c0804');
  }

  function background() { game.draw.clear(C.bg); }

  function getFuseRect(idx) { var col = idx % FUSE_COLS, row = Math.floor(idx / FUSE_COLS); return { x: MARGIN + col * (FUSE_W + FUSE_GAP_X), y: GRID_Y + row * (FUSE_H + FUSE_GAP_Y), w: FUSE_W, h: FUSE_H }; }

  function lightFuse(idx) { if (fuses[idx].burning || fuses[idx].exploded || fuses[idx].extinguished) return; fuses[idx].burning = true; fuses[idx].progress = 0; game.audio.play('se_tap', 0.05); }

  function initGame() {
    fuses = []; for (var i = 0; i < FUSE_COUNT; i++) fuses.push({ burning: false, progress: 0, exploded: false, extinguished: false });
    spawnTimer = 0; extinguished = 0; exploded = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0;
    lightFuse(Math.floor(Math.random() * FUSE_COUNT));
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (extinguished * 350 + Math.ceil(timeLeft) * 120) : extinguished * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(MARGIN - 20, GRID_Y - 20, W - (MARGIN - 20) * 2, FUSE_ROWS * (FUSE_H + FUSE_GAP_Y) + 20, PANEL, 0.9);
    for (var i2 = 0; i2 < FUSE_COUNT; i2++) {
      var f2 = fuses[i2], r3 = getFuseRect(i2), cx = r3.x + r3.w / 2, cy = r3.y + r3.h / 2;
      game.draw.rect(r3.x, r3.y, r3.w, r3.h, f2.exploded ? '#3d0c0c' : (f2.extinguished ? '#0c1a0c' : FUSE_BASE), 0.85);
      if (f2.burning) {
        game.draw.rect(r3.x, r3.y + r3.h - 12, r3.w * f2.progress, 12, BURNING, 0.9);
        var tipX = r3.x + r3.w * f2.progress, flicker = 0.7 + 0.3 * Math.sin(elapsed * 20 + i2);
        pc(tipX, cy, 20 * flicker, BURN_HI, 0.8); pc(tipX - 4, cy - 8, 10 * flicker, C.g, 0.4);
        game.draw.line(r3.x, cy, tipX, cy, FUSE_WIRE, 8);
      } else if (f2.exploded) { pc(cx, cy, 22, C.a, 0.9); pc(cx, cy, 12, BURN_HI, 0.8); }
      else if (f2.extinguished) { txt('OK', cx, cy + 10, 34, SAFE); }
      else game.draw.line(r3.x + 8, cy, r3.x + r3.w - 8, cy, FUSE_WIRE, 6);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitIdx = -1;
    for (var i = 0; i < FUSE_COUNT; i++) { if (!fuses[i].burning) continue; var r = getFuseRect(i); if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) { hitIdx = i; break; } }
    if (hitIdx < 0) return;
    var f = fuses[hitIdx]; f.burning = false; f.extinguished = true; extinguished++; flash = 0.14; flashCol = C.b; resultText = 'OUT!'; resultTimer = 0.25; game.audio.play('se_tap', 0.1);
    var r2 = getFuseRect(hitIdx);
    for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.3, col: SAFE }); }
    if (extinguished >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fuses) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRISIS AVERTED!' : 'BLOWN OUT', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(extinguished >= NEEDED); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.55, 1.2 - extinguished * 0.03);
      if (spawnTimer <= 0) {
        spawnTimer = spawnRate; var available = [];
        for (var i = 0; i < FUSE_COUNT; i++) if (!fuses[i].burning && !fuses[i].exploded && !fuses[i].extinguished) available.push(i);
        if (available.length > 0) { lightFuse(available[Math.floor(Math.random() * available.length)]); if (extinguished > 6 && Math.random() < 0.3) { var av2 = []; for (var j = 0; j < FUSE_COUNT; j++) if (!fuses[j].burning && !fuses[j].exploded && !fuses[j].extinguished) av2.push(j); if (av2.length > 0) lightFuse(av2[Math.floor(Math.random() * av2.length)]); } }
      }
      var burnSpeed = Math.min(0.7, 0.22 + extinguished * 0.015);
      for (var k = 0; k < FUSE_COUNT; k++) {
        var fk = fuses[k]; if (!fk.burning) continue; fk.progress += burnSpeed * dt;
        if (fk.progress >= 1.0) {
          fk.burning = false; fk.exploded = true; exploded++; flash = 0.35; flashCol = C.a; resultText = 'BOOM!'; resultTimer = 0.42; game.audio.play('se_failure', 0.4);
          var re = getFuseRect(k); for (var pe = 0; pe < 8; pe++) { var pea = Math.random() * Math.PI * 2; particles.push({ x: re.x + re.w / 2, y: re.y + re.h / 2, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: C.a }); }
          if (exploded >= MAX_EXPLODE) { finish(false); return; }
        }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 350 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.955), 46, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(extinguished + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < exploded ? C.a : '#0c0804');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
