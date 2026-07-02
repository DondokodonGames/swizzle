// 392-spinning-tops.js
// コマ対決 — 回転するコマをスワイプで弾き、相手のコマをリングの外へ押し出すバトル
// 操作: スワイプでコマを弾く方向と強さを決める
// 成功: 相手を3回 場外へ  失敗: 自分が3回 場外 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、闘技場） ──
  var C = { bg:'#0e0a20', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPINNING TOPS';
  var HOW_TO_PLAY = 'SWIPE TO LAUNCH YOUR TOP · KNOCK THE RIVAL OUT';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var ARENA_X = snap(W / 2), ARENA_Y = snap(H * 0.48), ARENA_R = 340;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, enemy, pWins, eWins, timeLeft, done, particles, phase, resetTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

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

  function background() { game.draw.clear(C.bg); pc(ARENA_X, ARENA_Y, ARENA_R, '#1a1040', 0.9); ring(ARENA_X, ARENA_Y, ARENA_R, C.d, 0.7); pc(ARENA_X, ARENA_Y, 18, C.d, 0.3); }

  function resetRound() { player = { x: W / 2 - 80, y: H * 0.48, vx: 0, vy: 0, spin: 6 + Math.random() * 4, r: 44 }; enemy = { x: W / 2 + 80, y: H * 0.48, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, spin: 6 + Math.random() * 4, r: 44 }; phase = 'ready'; }

  function initGame() { pWins = 0; eWins = 0; timeLeft = MAX_TIME; done = false; particles = []; resetTimer = 0; resetRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (pWins * 700 + Math.ceil(timeLeft) * 100) : pWins * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function sparks(x, y, col, n) { for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * (150 + Math.random() * 200), vy: Math.sin(a) * (150 + Math.random() * 200), life: 0.6, col: col }); } }

  function drawTop(t, col) { var sp = game.time.elapsed * t.spin; pc(t.x, t.y, t.r, col, 0.9); pline(t.x, t.y, t.x + Math.cos(sp) * t.r * 0.7, t.y + Math.sin(sp) * t.r * 0.7, C.g, 0.9, 5); pc(t.x, t.y, 10, C.g, 0.9); }

  // ── 入力 ──
  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || phase !== 'ready') return;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 20) return;
    var speed = Math.min(len * 2.5, 700); player.vx = dx / len * speed; player.vy = dy / len * speed; phase = 'playing'; game.audio.play('se_tap', 0.4);
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawTop(enemy, C.f); drawTop(player, C.e);
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
      txt(resultSuccess ? 'CHAMPION!' : 'DEFEATED', W / 2, H * 0.30, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.44, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.56, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'playing') {
        player.x += player.vx * dt; player.y += player.vy * dt; player.vx *= (1 - 0.8 * dt); player.vy *= (1 - 0.8 * dt); player.spin *= (1 - 0.5 * dt);
        enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; enemy.vx *= (1 - 0.7 * dt); enemy.vy *= (1 - 0.7 * dt);
        var dx = enemy.x - player.x, dy = enemy.y - player.y, dist = Math.hypot(dx, dy);
        if (dist < player.r + enemy.r && dist > 0) { sparks((player.x + enemy.x) / 2, (player.y + enemy.y) / 2, C.c, 8); game.audio.play('se_tap', 0.6); var nx = dx / dist, ny = dy / dist, rvx = player.vx - enemy.vx, rvy = player.vy - enemy.vy, dot = rvx * nx + rvy * ny; if (dot > 0) { player.vx -= dot * nx * 1.5; player.vy -= dot * ny * 1.5; enemy.vx += dot * nx * 1.5; enemy.vy += dot * ny * 1.5; } var ov = (player.r + enemy.r - dist) / 2; player.x -= nx * ov; player.y -= ny * ov; enemy.x += nx * ov; enemy.y += ny * ov; }
        var pd = Math.hypot(player.x - ARENA_X, player.y - ARENA_Y), ed = Math.hypot(enemy.x - ARENA_X, enemy.y - ARENA_Y);
        if (pd > ARENA_R) { eWins++; sparks(player.x, player.y, C.e, 15); game.audio.play('se_failure', 0.5); if (eWins >= NEEDED) { finish(false); return; } phase = 'reset'; resetTimer = 1.0; }
        else if (ed > ARENA_R) { pWins++; sparks(enemy.x, enemy.y, C.f, 15); game.audio.play('se_success', 0.5); if (pWins >= NEEDED) { finish(true); return; } phase = 'reset'; resetTimer = 1.0; }
        if (ed > ARENA_R - 10 && ed > 0) { var enx = (enemy.x - ARENA_X) / ed, eny = (enemy.y - ARENA_Y) / ed, edot = enemy.vx * enx + enemy.vy * eny; if (edot > 0) { enemy.vx -= edot * enx * 1.8; enemy.vy -= edot * eny * 1.8; } }
      }
      if (phase === 'reset') { resetTimer -= dt; if (resetTimer <= 0) resetRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTop(enemy, C.f); drawTop(player, C.e);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);
    if (phase === 'ready') txt('SWIPE TO LAUNCH', W / 2, snap(H * 0.84), 44, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(pWins + ' vs ' + eWins, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < NEEDED; wi++) game.draw.rect(snap(W / 2 + (wi - (NEEDED - 1) / 2) * 56) - 10, 224, 20, 20, wi < pWins ? C.e : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
