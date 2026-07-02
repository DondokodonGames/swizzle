// 226-chain-reaction.js
// チェーンリアクション — たった1タップの爆発から、どれだけ多くの粒子を連鎖爆発に巻き込めるか
// 操作: 粒子をタップして爆発を起こす（1回のみ）
// 成功: 全体の50%以上を連鎖  失敗: 届かない

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、連鎖反応炉） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'ONE TAP · IGNITE THE BIGGEST CHAIN';
  var NUM = 40;               // 修正2: 80 → 40
  var TARGET_PCT = 50;        // 修正2: 80% → 50%
  var EXPLODE_R = 150, EXPLODE_SPEED = 0.06, TOP = 260, BOT = H - 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var particles, queue, explodeTimer, chainCount, phase, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function progressBar() {
    var pct = chainCount / NUM, filled = Math.round(pct * 12);
    for (var i = 0; i < 12; i++) { var target = i >= Math.floor(TARGET_PCT / 100 * 12); game.draw.rect(40 + i * 84, 20, 72, 40, i < filled ? (pct >= TARGET_PCT / 100 ? C.b : C.f) : (target ? '#2a0a12' : '#0a1420')); }
  }

  function background() { game.draw.clear(C.bg); }

  function initParticles() {
    particles = [];
    for (var i = 0; i < NUM; i++) particles.push({ x: snap(game.random(80, W - 80)), y: snap(game.random(TOP + 20, BOT - 20)), r: 22 + Math.random() * 14, exploded: false, exploding: false, t: 0, dur: 0.4 });
  }

  function ignite(idx) { var p = particles[idx]; if (p.exploded || p.exploding) return; p.exploding = true; p.t = 0; chainCount++; }

  function initGame() { initParticles(); queue = []; explodeTimer = 0; chainCount = 0; phase = 'aim'; done = false; }

  function finish() {
    if (done) return;
    done = true;
    var pct = Math.round(chainCount / NUM * 100), success = pct >= TARGET_PCT;
    resultSuccess = success; finalScore = success ? (chainCount * 100 + pct * 30) : chainCount * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (phase !== 'aim') return;
    var best = -1, bd = 140;
    for (var i = 0; i < particles.length; i++) { var d = Math.hypot(x - particles[i].x, y - particles[i].y); if (d < bd) { best = i; bd = d; } }
    if (best >= 0) { phase = 'exploding'; ignite(best); game.audio.play('se_tap', 0.8); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!particles) initGame(); background();
      for (var i = 0; i < particles.length; i++) pc(particles[i].x, particles[i].y, particles[i].r, C.e, 0.7);
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      var pct = Math.round(chainCount / NUM * 100);
      txt(resultSuccess ? 'BIG BANG!' : 'FIZZLED', W / 2, H * 0.32, 78, resultSuccess ? C.b : C.a);
      txt(chainCount + ' / ' + NUM + '  (' + pct + '%)', W / 2, H * 0.44, 52, C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (phase === 'exploding') {
      explodeTimer -= dt;
      if (explodeTimer <= 0 && queue.length > 0) { ignite(queue.shift()); explodeTimer = EXPLODE_SPEED; game.audio.play('se_tap', Math.min(1, 0.2 + chainCount * 0.02)); }
      var any = false;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (!p.exploding) continue; any = true; p.t += dt;
        if (p.t >= p.dur) { p.exploded = true; p.exploding = false;
          for (var ni = 0; ni < particles.length; ni++) { var q = particles[ni]; if (q.exploded || q.exploding) continue; if (Math.hypot(q.x - p.x, q.y - p.y) < EXPLODE_R + p.r && queue.indexOf(ni) < 0) queue.push(ni); }
        }
      }
      if (!any && queue.length === 0) { finish(); return; }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < particles.length; i2++) {
      var p2 = particles[i2];
      if (p2.exploded) pc(p2.x, p2.y, p2.r * 0.5, C.d, 0.4);
      else if (p2.exploding) { var prog = p2.t / p2.dur; ring(p2.x, p2.y, p2.r + prog * EXPLODE_R, C.a, (1 - prog) * 0.8); pc(p2.x, p2.y, p2.r, C.c, 0.9); }
      else pc(p2.x, p2.y, p2.r, C.e, 0.7 + 0.2 * (Math.floor(game.time.elapsed * 3 + i2) % 2));
    }

    progressBar();
    var pct2 = Math.round(chainCount / NUM * 100);
    txt(chainCount + ' / ' + NUM + '  (' + pct2 + '%)', W / 2, 100, 44, pct2 >= TARGET_PCT ? C.b : C.f);
    txt(phase === 'aim' ? 'TAP ONE TO IGNITE' : 'CHAIN GOAL ' + TARGET_PCT + '%', W / 2, 168, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
