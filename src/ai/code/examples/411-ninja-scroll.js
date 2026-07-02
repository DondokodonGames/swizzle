// 411-ninja-scroll.js
// 忍者の巻物 — 3レーンを瞬時に移動し、降ってくる手裏剣を紙一重でかわして生き延びる
// 操作: タップした側のレーンへ瞬間移動／スワイプで隣レーンへ
// 成功: 10秒 生き延びる  失敗: 3回 被弾

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の忍者屋敷） ──
  var C = { bg:'#0a0808', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NINJA SCROLL';
  var HOW_TO_PLAY = 'TAP OR SWIPE TO SWITCH LANES · DODGE THE SHURIKEN';
  var GOAL = 10;             // 修正2: 30秒 → 10秒
  var MAX_HITS = 3;
  var LANES = [snap(W * 0.2), snap(W * 0.5), snap(W * 0.8)], NINJA_Y = snap(H * 0.76);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, nx, ntx, dodge, shurikens, spawnTimer, hits, survived, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1414');
  }

  function background() { game.draw.clear(C.bg); for (var li = 0; li < 3; li++) game.draw.rect(LANES[li] - 1, 0, 2, H, C.d, 0.15); }

  function initGame() { lane = 1; nx = LANES[1]; ntx = LANES[1]; dodge = 0; shurikens = []; spawnTimer = 0.6; hits = 0; survived = 0; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 400 + (MAX_HITS - hits) * 500 + 1000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawShuriken(s) { for (var bl = 0; bl < 4; bl++) { var ba = s.rot + bl * Math.PI / 2; pline(s.x, s.y, s.x + Math.cos(ba) * 28, s.y + Math.sin(ba) * 28, C.g, 0.9, 6); } pc(s.x, s.y, 10, C.e, 0.9); pline(s.x, s.y - 8, s.x, s.y - 40, C.d, 0.4, 3); }

  function drawNinja() {
    if (dodge > 0) pc(nx, NINJA_Y, 28, C.c, dodge * 0.4);
    pc(nx, NINJA_Y, 40, C.d, 0.9); pc(nx, NINJA_Y - 22, 24, C.a, 0.9);
    game.draw.rect(snap(nx - 18), snap(NINJA_Y - 28), 36, 10, C.g, 0.9); pc(nx - 8, NINJA_Y - 22, 4, '#111', 0.9); pc(nx + 8, NINJA_Y - 22, 4, '#111', 0.9);
  }

  function move(l) { lane = l; ntx = LANES[lane]; dodge = 0.3; game.audio.play('se_tap', 0.3); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; move(x < W / 3 ? 0 : x < W * 2 / 3 ? 1 : 2);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') move(Math.max(0, lane - 1)); else if (d === 'right') move(Math.min(2, lane + 1));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!shurikens) initGame(); background(); drawShuriken({ x: W * 0.5, y: H * 0.4, rot: game.time.elapsed * 4 }); drawNinja();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'STRUCK DOWN', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (dodge > 0) dodge -= dt * 3;
      nx += (ntx - nx) * 14 * dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { var l = Math.floor(Math.random() * 3); shurikens.push({ x: LANES[l], y: -60, vy: 480 + Math.random() * 260, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() < 0.5 ? 1 : -1) * (3 + Math.random() * 5), hit: false }); spawnTimer = Math.max(0.4, 0.7 - survived * 0.02) * (0.7 + Math.random() * 0.6); }
      for (var si = shurikens.length - 1; si >= 0; si--) {
        var s = shurikens[si]; s.y += s.vy * dt; s.rot += s.rotSpeed * dt;
        if (!s.hit && Math.abs(s.x - nx) < 56 && Math.abs(s.y - NINJA_Y) < 56) { s.hit = true; hits++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: nx, y: NINJA_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.a }); } shurikens.splice(si, 1); if (hits >= MAX_HITS) { finish(false); return; } continue; }
        if (s.y > H + 60) shurikens.splice(si, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var si2 = 0; si2 < shurikens.length; si2++) drawShuriken(shurikens[si2]);
    drawNinja();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#1a1414');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
