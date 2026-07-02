// 355-tempo-tap.js
// テンポタップ — 一定BPMのビートに合わせ、判定バーの針が中央に来た瞬間にタップし続けるリズム
// 操作: ビートのタイミング（針が中央）でタップ
// 成功: 6回ジャストで叩く  失敗: 3回大きくズレる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、メトロノーム） ──
  var C = { bg:'#050210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TEMPO TAP';
  var HOW_TO_PLAY = 'TAP ON THE BEAT · WHEN THE NEEDLE HITS CENTER';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BPM = 90, BEAT = 60 / 90, PERFECT = 0.08, GOOD = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gameTime, hits, misses, combo, timeLeft, done, particles, pulses, tapAnim, fbText, fbCol, beatFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.d, beatFlash * 0.1); }

  function phase() { return (gameTime % BEAT) / BEAT; }
  function toBeat() { var p = gameTime % BEAT; return p < BEAT / 2 ? p : p - BEAT; }

  function initGame() { gameTime = 0; hits = 0; misses = 0; combo = 0; timeLeft = MAX_TIME; done = false; particles = []; pulses = []; tapAnim = 0; fbText = ''; fbCol = C.g; beatFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + combo * 80 + Math.ceil(timeLeft) * 100) : hits * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTarget() {
    var CY = snap(H * 0.42), ph = phase(), rp = 1 - ph, rr = 160 + rp * 60;
    for (var pu = 0; pu < pulses.length; pu++) ring(W / 2, CY, pulses[pu].r, C.d, pulses[pu].life * 0.5);
    ring(W / 2, CY, rr, C.d, 0.3 + rp * 0.4);
    ring(W / 2, CY, 80, C.b, 0.4);
    pc(W / 2, CY, 40, C.e, 0.8); pc(W / 2, CY, 24, C.g, 0.9);
    if (tapAnim > 0) ring(W / 2, CY, 44 + (1 - tapAnim) * 60, fbCol, tapAnim);
    // 判定バー
    var bw = snap(W * 0.5), bx = snap(W / 2 - bw / 2), by = snap(H * 0.66);
    game.draw.rect(bx, by, bw, 24, '#161028', 0.9);
    game.draw.rect(snap(W / 2 - GOOD / BEAT * bw), by, snap(GOOD / BEAT * bw * 2), 24, C.c, 0.3);
    game.draw.rect(snap(W / 2 - PERFECT / BEAT * bw), by, snap(PERFECT / BEAT * bw * 2), 24, C.b, 0.5);
    game.draw.rect(snap(bx + ph * bw) - 4, by - 8, 8, 40, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var diff = Math.abs(toBeat());
    if (diff < PERFECT) { hits++; combo++; fbText = 'PERFECT!'; fbCol = C.b; tapAnim = 0.6; game.audio.play('se_tap', 0.6); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.42, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); } if (hits >= NEEDED) { finish(true); return; } }
    else if (diff < GOOD) { hits++; combo++; fbText = 'GOOD'; fbCol = C.c; tapAnim = 0.5; game.audio.play('se_tap', 0.4); if (hits >= NEEDED) { finish(true); return; } }
    else { misses++; combo = 0; fbText = 'MISS'; fbCol = C.a; tapAnim = 0.5; game.audio.play('se_failure', 0.25); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      gameTime += dt; background(); drawTarget();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'IN THE GROOVE!' : 'OFF BEAT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameTime += dt;
      if (timeLeft <= 0) { finish(hits >= NEEDED); return; }
      if (tapAnim > 0) tapAnim -= dt * 2.5; if (beatFlash > 0) beatFlash -= dt * 4;
      if (phase() < 0.05 && (!pulses.length || pulses[pulses.length - 1].born < gameTime - BEAT * 0.9)) { pulses.push({ r: 20, born: gameTime, life: 1.0 }); beatFlash = 0.3; }
      for (var pu = pulses.length - 1; pu >= 0; pu--) { pulses[pu].r += 300 * dt; pulses[pu].life -= dt * 2.5; if (pulses[pu].life <= 0) pulses.splice(pu, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTarget();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(BPM + ' BPM', W / 2, snap(H * 0.60), 40, '#667');
    if (tapAnim > 0) txt(fbText, W / 2, snap(H * 0.74), 56, fbCol);
    if (combo > 2) txt(combo + ' COMBO', W / 2, snap(H * 0.79), 42, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
