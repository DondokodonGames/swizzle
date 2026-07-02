// 270-chain-reaction.js
// チェーンリアクション — 限られたタップで泡を爆発させ、隣へ次々広がる連鎖爆発で一掃する
// 操作: タップで泡を爆発（爆風が隣の泡を巻き込む）
// 成功: 15個消す  失敗: タップ5回使い切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、連鎖泡） ──
  var C = { bg:'#03010a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUB = [C.d, C.e, C.a, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP A BUBBLE · THE BLAST CHAINS TO NEIGHBORS';
  var MAX_TIME = 15;
  var NEEDED   = 15;          // 修正2: 60 → 15
  var MAX_TAPS = 5;          // 修正2: 15 → 5
  var TOP = 240, BOT = H - 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, explosions, popped, tapsLeft, chainCount, bestChain, chainTimer, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0130');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubbles() { bubbles = []; for (var i = 0; i < 40; i++) bubbles.push({ x: snap(game.random(80, W - 80)), y: snap(game.random(TOP + 40, BOT - 40)), r: 34 + Math.random() * 20, col: BUB[Math.floor(Math.random() * BUB.length)], vx: game.random(-30, 30), vy: game.random(-30, 30), exploding: false, fired: false, et: 0 }); }

  function boom(x, y, r, chain) { explosions.push({ x: x, y: y, r: 0, maxR: r * 2.6, speed: r * 5 }); popped++; if (chain) { chainCount++; if (chainCount > bestChain) bestChain = chainCount; } else chainCount = 1; chainTimer = 0.5; for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.4 }); } game.audio.play('se_success', 0.3); }

  function initGame() { spawnBubbles(); explosions = []; popped = 0; tapsLeft = MAX_TAPS; chainCount = 0; bestChain = 0; chainTimer = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 100 + tapsLeft * 300 + bestChain * 100) : popped * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tapsLeft <= 0) return;
    var best = -1, bd = 90; for (var i = 0; i < bubbles.length; i++) { if (bubbles[i].exploding) continue; var d = Math.hypot(x - bubbles[i].x, y - bubbles[i].y); if (d < bubbles[i].r + 30 && d < bd) { bd = d; best = i; } }
    if (best < 0) return;
    tapsLeft--; bubbles[best].exploding = true; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); for (var i = 0; i < bubbles.length; i++) pc(bubbles[i].x, bubbles[i].y, bubbles[i].r, bubbles[i].col, 0.7);
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN CLEAR!' : 'FIZZLED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(popped >= NEEDED); return; }
      if (chainTimer > 0) chainTimer -= dt; else chainCount = 0;
      for (var bi = 0; bi < bubbles.length; bi++) {
        var b = bubbles[bi];
        if (b.exploding) { b.et += dt; if (b.et >= 0.05 && !b.fired) { b.fired = true; boom(b.x, b.y, b.r, false); } continue; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x - b.r < 40) { b.x = 40 + b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W - 40) { b.x = W - 40 - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < TOP) { b.y = TOP + b.r; b.vy = Math.abs(b.vy); } if (b.y + b.r > BOT) { b.y = BOT - b.r; b.vy = -Math.abs(b.vy); }
      }
      for (var ei = explosions.length - 1; ei >= 0; ei--) {
        var ex = explosions[ei]; ex.r += ex.speed * dt; if (ex.r >= ex.maxR) { explosions.splice(ei, 1); continue; }
        for (var bj = bubbles.length - 1; bj >= 0; bj--) { var b2 = bubbles[bj]; if (b2.exploding) continue; if (Math.hypot(b2.x - ex.x, b2.y - ex.y) < ex.r + b2.r * 0.5) { boom(b2.x, b2.y, b2.r, true); bubbles.splice(bj, 1); } }
      }
      for (var bk = bubbles.length - 1; bk >= 0; bk--) if (bubbles[bk].exploding && bubbles[bk].fired) bubbles.splice(bk, 1);
      if (popped >= NEEDED) { finish(true); return; }
      var anyExp = false; for (var q = 0; q < bubbles.length; q++) if (bubbles[q].exploding) anyExp = true;
      if (tapsLeft <= 0 && explosions.length === 0 && !anyExp) { finish(popped >= NEEDED); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi4 = 0; bi4 < bubbles.length; bi4++) { var b4 = bubbles[bi4]; if (b4.exploding) continue; pc(b4.x, b4.y, b4.r, b4.col, 0.75); pc(b4.x - b4.r * 0.3, b4.y - b4.r * 0.3, b4.r * 0.2, C.g, 0.4); }
    for (var ei2 = 0; ei2 < explosions.length; ei2++) ring(explosions[ei2].x, explosions[ei2].y, explosions[ei2].r, C.c, (1 - explosions[ei2].r / explosions[ei2].maxR) * 0.8);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.c, particles[pp2].life * 2);
    if (chainTimer > 0 && chainCount > 1) txt(chainCount + ' CHAIN!', W / 2, H * 0.84, 54, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ti = 0; ti < MAX_TAPS; ti++) game.draw.rect(snap(W / 2 + (ti - (MAX_TAPS - 1) / 2) * 48) - 8, 224, 16, 16, ti < tapsLeft ? C.c : '#1a0130');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
