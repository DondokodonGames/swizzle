// 723-star-connect.js
// スターコネクト — 番号を記憶し、光る星を順番通りにタップして星座を描く
// 操作: 提示中に番号を覚え、1番から順に星をタップ。線でつながり星座が完成
// 成功: 5星座 完成  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、星空） ──
  var C = { bg:'#01020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var STAR = '#e2e8f0', STAR_HI = '#ffe600', STAR_DONE = '#00ff9f', LINE = '#3355ff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STAR CONNECT';
  var HOW_TO_PLAY = 'MEMORIZE THE NUMBERS · TAP THE STARS IN ORDER TO DRAW THE CONSTELLATION';
  var MAX_TIME = 28;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_ERR  = 3;          // 修正2: 6 → 3
  var STAR_R = 36, REVEAL_DUR = 1.2, PLAY_X0 = 80, PLAY_Y0 = 340, PLAY_W = W - 160, PLAY_H = H * 0.50;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, nextIdx, connectedLines, revealTimer, revealing, round, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer, bgStars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#03040f');
  }

  function background() { game.draw.clear(C.bg); for (var bsi = 0; bsi < bgStars.length; bsi++) { bgStars[bsi].ph += 0.016; var bAlpha = 0.3 + 0.2 * Math.sin(bgStars[bsi].ph); game.draw.rect(snap(bgStars[bsi].x), snap(bgStars[bsi].y), bgStars[bsi].r, bgStars[bsi].r, STAR, bAlpha); } }

  function newConstellation() {
    round++; var count = Math.min(6, 3 + Math.floor(round / 2)); stars = []; connectedLines = []; nextIdx = 0; revealing = true; revealTimer = REVEAL_DUR;
    var placed = [];
    for (var i = 0; i < count; i++) {
      var ok = false, sx, sy, tries = 0;
      while (!ok && tries < 200) { tries++; sx = PLAY_X0 + STAR_R + Math.random() * (PLAY_W - STAR_R * 2); sy = PLAY_Y0 + STAR_R + Math.random() * (PLAY_H - STAR_R * 2); ok = true; for (var j = 0; j < placed.length; j++) { var dx2 = sx - placed[j].x, dy2 = sy - placed[j].y; if (dx2 * dx2 + dy2 * dy2 < (STAR_R * 3) * (STAR_R * 3)) { ok = false; break; } } }
      placed.push({ x: sx, y: sy, num: i + 1, tapped: false, phase: Math.random() * Math.PI * 2 });
    }
    stars = placed; waitTimer = 0;
  }

  function initGame() { round = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; bgStars = []; for (var bs = 0; bs < 60; bs++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16, ph: Math.random() * Math.PI * 2 }); newConstellation(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 700 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var li = 0; li < connectedLines.length; li++) { var ln = connectedLines[li]; game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, LINE, 4); }
    for (var si2 = 0; si2 < stars.length; si2++) {
      var st = stars[si2], pulse = 0.88 + 0.12 * Math.sin(st.phase * 2);
      pc(st.x, st.y, STAR_R * pulse, st.tapped ? STAR_DONE : STAR, st.tapped ? 0.9 : 0.75);
      if (revealing || st.tapped || st.num === nextIdx + 1) txt(st.num + '', st.x, st.y + 14, 44, st.tapped ? C.g : STAR_HI);
      if (st.num === nextIdx + 1 && !revealing) ring(st.x, st.y, STAR_R + 16, STAR_HI, 0.3 + 0.15 * Math.sin(elapsed * 5));
    }
    var phStr = revealing ? 'MEMORIZE!' : 'NEXT ' + (nextIdx + 1);
    txt(phStr, W / 2, PLAY_Y0 - 60, 44, revealing ? STAR_HI : STAR_DONE);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || revealing || waitTimer > 0) return;
    var hit = -1;
    for (var i = 0; i < stars.length; i++) { if (stars[i].tapped) continue; var dx = tx - stars[i].x, dy = ty - stars[i].y; if (dx * dx + dy * dy < (STAR_R + 20) * (STAR_R + 20)) { hit = i; break; } }
    if (hit < 0) return;
    if (stars[hit].num === nextIdx + 1) {
      if (nextIdx > 0) { var prev = null; for (var pi = 0; pi < stars.length; pi++) if (stars[pi].num === nextIdx) { prev = stars[pi]; break; } if (prev) connectedLines.push({ x1: prev.x, y1: prev.y, x2: stars[hit].x, y2: stars[hit].y }); }
      stars[hit].tapped = true; nextIdx++; game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: stars[hit].x, y: stars[hit].y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: STAR_HI }); }
      if (nextIdx >= stars.length) {
        flash = 0.4; flashCol = C.b; resultText = 'CONSTELLATION!'; resultTimer = 0.7; game.audio.play('se_success', 0.65);
        for (var p2 = 0; p2 < 12; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.50, vx: Math.cos(pa2) * 260, vy: Math.sin(pa2) * 260, life: 0.6, col: STAR_HI }); }
        if (round >= NEEDED) { finish(true); return; }
        waitTimer = 1.0;
      }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG ORDER!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STARGAZER!' : 'LOST IN SPACE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (revealing) { revealTimer -= dt; if (revealTimer <= 0) revealing = false; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newConstellation(); }
      for (var si = 0; si < stars.length; si++) if (!stars[si].tapped) stars[si].phase += dt * 1.5;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#03040f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
