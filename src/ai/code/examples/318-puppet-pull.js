// 318-puppet-pull.js
// パペットプル — 糸で操る木の人形の腕を左右に振り、落ちてくるコインをキャッチする操り人形劇
// 操作: 左右スワイプで腕を振る、タップで中央に戻す
// 成功: 6コイン集める  失敗: 3コイン逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、人形劇場） ──
  var C = { bg:'#1a0a00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', wood:'#c06010' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PUPPET PULL';
  var HOW_TO_PLAY = 'SWIPE TO SWING ARMS · CATCH THE COINS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_MISS = 3;          // 修正2: 20 → 3
  var PX = snap(W / 2), PY = snap(H * 0.56);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var armL, armR, armTarget, bob, coins, collected, missed, timeLeft, done, spawnTimer, particles, catchAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, 140, H, '#241408', 0.9); game.draw.rect(W - 140, 0, 140, H, '#241408', 0.9); game.draw.rect(0, 0, W, 70, '#241408', 0.9); }

  function armTip(side) { var angle = side < 0 ? armL : armR, ax = PX + side * 120, ay = PY; return { x: ax + Math.cos(angle) * 90 * side, y: ay + Math.sin(angle) * 40 }; }

  function initGame() { armL = -0.3; armR = 0.3; armTarget = 0; bob = 0; coins = []; collected = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; catchAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 400 + Math.ceil(timeLeft) * 100) : collected * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPuppet() {
    var by = PY + Math.sin(bob) * 8;
    pline(PX, 0, PX, by - 110, C.c, 0.5, 4);
    pc(PX, by - 78, 40, C.wood, 0.95); pc(PX - 12, by - 86, 8, C.g, 0.9); pc(PX + 12, by - 86, 8, C.g, 0.9);
    game.draw.rect(snap(PX) - 22, snap(by - 40), 44, 80, C.wood, 0.95);
    var lt = armTip(-1), rt = armTip(1);
    pline(PX - 120, by, lt.x, lt.y, C.wood, 0.9, 16); pc(lt.x, lt.y, 20, C.f, 0.9);
    pline(PX + 120, by, rt.x, rt.y, C.wood, 0.9, 16); pc(rt.x, rt.y, 20, C.f, 0.9);
    pline(PX - 16, by + 40, PX - 30, by + 110, C.wood, 0.9, 16); pline(PX + 16, by + 40, PX + 30, by + 110, C.wood, 0.9, 16);
    if (catchAnim > 0) ring(PX, by, 80 * catchAnim, C.c, catchAnim * 0.5);
  }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function drawCoin(co) { pc(co.x, co.y, co.r, C.c, 0.95); pc(co.x - 8, co.y - 8, 8, C.g, 0.7); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    armTarget = 0;
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') armTarget = -1; else if (d === 'right') armTarget = 1;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!coins) initGame(); background(); drawPuppet();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BRAVO!' : 'CURTAINS', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      bob += dt * 3; if (catchAnim > 0) catchAnim -= dt * 2;
      var tL = armTarget === -1 ? -1.2 : -0.3, tR = armTarget === 1 ? 1.2 : 0.3;
      armL += (tL - armL) * dt * 8; armR += (tR - armR) * dt * 8;
      spawnTimer -= dt; if (spawnTimer <= 0) { coins.push({ x: snap(180 + Math.random() * (W - 360)), y: -30, vy: 220 + Math.random() * 80, r: 26 }); spawnTimer = 0.55 + Math.random() * 0.4; }
      var lt = armTip(-1), rt = armTip(1);
      for (var ci = coins.length - 1; ci >= 0; ci--) {
        var co = coins[ci]; co.y += co.vy * dt;
        if (Math.hypot(co.x - lt.x, co.y - lt.y) < 60 || Math.hypot(co.x - rt.x, co.y - rt.y) < 60) {
          collected++; catchAnim = 1; game.audio.play('se_success', 0.4);
          for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: co.x, y: co.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 60, life: 0.5, col: C.c }); }
          coins.splice(ci, 1); if (collected >= NEEDED) { finish(true); return; } continue;
        }
        if (co.y > H + 40) { coins.splice(ci, 1); missed++; game.audio.play('se_failure', 0.2); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ci2 = 0; ci2 < coins.length; ci2++) drawCoin(coins[ci2]);
    drawPuppet();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#2a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
