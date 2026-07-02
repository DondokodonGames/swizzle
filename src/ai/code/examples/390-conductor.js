// 390-conductor.js
// 指揮者 — オーケストラのビートに合わせて上下スワイプで指揮し、演奏を止めずに小節を重ねる
// 操作: ビートの瞬間に上下スワイプ（合えば精度上昇、外すと低下）
// 成功: 4小節 完奏  失敗: 精度が尽きて演奏停止 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コンサートホール） ──
  var C = { bg:'#0c0a1c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CONDUCTOR';
  var HOW_TO_PLAY = 'SWIPE UP/DOWN ON EACH BEAT · KEEP THE ORCHESTRA PLAYING';
  var MAX_TIME = 20;
  var TEMPO = 1.0, BEATS = 4, NEEDED_MEASURES = 4;   // 修正2: 30小節 → 4小節

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, measures, beatInM, accuracy, batonY, batonVY, timeLeft, done, particles, notes, beatFlash, lastSwing, musicians;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.b, beatFlash * 0.06); game.draw.rect(60, snap(H * 0.56), W - 120, snap(H * 0.4), '#150f28', 0.9); }

  function initMusicians() { musicians = []; for (var mi = 0; mi < 15; mi++) { var row = Math.floor(mi / 5), col = mi % 5; musicians.push({ x: snap(W * 0.14 + col * (W * 0.72 / 4)), y: snap(H * 0.62 + row * 90), phase: Math.random() * Math.PI * 2 }); } }

  function initGame() { beatTimer = 0; measures = 0; beatInM = 0; accuracy = 0.7; batonY = H * 0.44; batonVY = 0; timeLeft = MAX_TIME; done = false; particles = []; notes = []; beatFlash = 0; lastSwing = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(accuracy * 2000) + Math.ceil(timeLeft) * 100) : measures * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var mi = 0; mi < musicians.length; mi++) { var m = musicians[mi], wave = Math.sin(game.time.elapsed * 4 / TEMPO + m.phase) * 0.5 + 0.5; pc(m.x, m.y, 20, C.d, 0.85); pc(m.x, m.y - 8, 12, C.e, 0.8); if (wave > 0.7) pc(m.x, m.y, 26, C.g, wave * 0.2); }
    for (var ni = 0; ni < notes.length; ni++) { var n = notes[ni]; pc(n.x, n.y, 8 * n.life, C.a, n.life * 0.8); game.draw.rect(snap(n.x) + 4, snap(n.y) - 16 * n.life, 4, 16 * n.life, C.a, n.life * 0.8); }
    var bp = beatTimer / TEMPO, bxx = W / 2 + Math.sin(bp * Math.PI * 2) * 70;
    pc(bxx, snap(H * 0.40), 34, C.c, 0.85); pc(bxx, snap(H * 0.40), 22, C.g, 0.9);
    pline(bxx, H * 0.44, bxx + 70, batonY, C.g, 0.9, 8); pc(bxx + 70, batonY, 12, C.c, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || (d !== 'up' && d !== 'down')) return;
    var bp = (game.time.elapsed % TEMPO) / TEMPO, dist = Math.min(bp, 1 - bp), acc = Math.max(-0.2, 1 - dist * 4);
    lastSwing = game.time.elapsed;
    if (acc > 0.5) { accuracy = Math.min(1, accuracy + 0.06); beatFlash = 0.5; game.audio.play('se_tap', 0.4); for (var p = 0; p < 6; p++) { var m = musicians[Math.floor(Math.random() * musicians.length)]; notes.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, life: 0.8 }); } }
    else { accuracy = Math.max(0, accuracy - 0.12); game.audio.play('se_failure', 0.3); }
    batonVY = d === 'down' ? 400 : -400;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!musicians) { initMusicians(); initGame(); } background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'BRAVO!' : 'SILENCE', W / 2, H * 0.30, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.42, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.52, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (beatFlash > 0) beatFlash -= dt * 2;
      beatTimer += dt;
      if (beatTimer >= TEMPO) { beatTimer -= TEMPO; beatInM++; if (beatInM >= BEATS) { beatInM = 0; measures++; if (measures >= NEEDED_MEASURES) { finish(true); return; } } }
      if (game.time.elapsed - lastSwing > TEMPO * 1.5) accuracy = Math.max(0, accuracy - dt * 0.15);
      if (accuracy <= 0) { finish(false); return; }
      batonY += batonVY * dt; batonVY *= (1 - 5 * dt); batonY = Math.max(H * 0.30, Math.min(H * 0.52, batonY));
      for (var ni = notes.length - 1; ni >= 0; ni--) { notes[ni].x += notes[ni].vx * dt; notes[ni].y += notes[ni].vy * dt; notes[ni].life -= dt; if (notes[ni].life <= 0) notes.splice(ni, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    // ビートマーカー
    for (var bi = 0; bi < BEATS; bi++) { var bx = W / 2 - (BEATS - 1) * 46 + bi * 92, cur = bi === beatInM; pc(bx, snap(H * 0.30), cur ? 22 : 14, cur ? C.b : '#334', 0.9); }
    // 精度バー
    var aw = 500, ax = W / 2 - aw / 2, ay = snap(H * 0.35); game.draw.rect(ax, ay, aw, 20, '#1a1030', 0.8); game.draw.rect(ax, ay, aw * accuracy, 20, accuracy > 0.4 ? C.b : C.a, 0.9);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.c, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(measures + ' / ' + NEEDED_MEASURES, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initMusicians();
    initGame();
  });
})(game);
