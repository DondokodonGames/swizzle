// 504-jump-rope.js
// なわとび — 回ってくる縄が足元を通る瞬間にタップでジャンプして跳び越える
// 操作: 縄が地面に来るタイミングでタップ（早すぎ/遅すぎると引っかかる）
// 成功: 8回 連続で跳ぶ  失敗: 3回 引っかかる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋上の縄跳び） ──
  var C = { bg:'#050510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'JUMP ROPE';
  var HOW_TO_PLAY = 'TAP TO JUMP JUST AS THE ROPE SWEEPS THE GROUND';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_HIT  = 3;          // 修正2: 5 → 3
  var GROUND_Y = snap(H * 0.72), CX = snap(W / 2), ROPE_LEN = 300;
  var JUMP_VY = -720, GRAVITY = 1900;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ropeAngle, ropeSpeed, player, jumps, hits, combo, timeLeft, done, particles, hitFlash, lastGround, comboText, comboTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0f172a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#0f172a', 0.9); }

  function initGame() { ropeAngle = 0; ropeSpeed = 1.9; player = { y: GROUND_Y - 60, vy: 0, jumping: false }; jumps = 0; hits = 0; combo = 0; timeLeft = MAX_TIME; done = false; particles = []; hitFlash = 0; lastGround = false; comboText = ''; comboTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (jumps * 500 + combo * 100 + Math.ceil(timeLeft) * 100) : jumps * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var r1x = CX - ROPE_LEN / 2, r2x = CX + ROPE_LEN / 2, prevX = r1x, prevY = GROUND_Y;
    for (var ri = 1; ri <= 20; ri++) { var t = ri / 20, px = r1x + (r2x - r1x) * t, py = GROUND_Y + Math.sin(ropeAngle + t * Math.PI) * (ROPE_LEN * 0.4); pline(prevX, prevY, px, py, C.f, 0.9, 6); prevX = px; prevY = py; }
    pc(r1x, GROUND_Y, 16, C.c, 0.8); pc(r2x, GROUND_Y, 16, C.c, 0.8);
    pc(CX, GROUND_Y, 22, C.d, 0.3);
    var pcol = hitFlash > 0 ? C.a : C.b; pc(CX, player.y, 36, pcol, 0.9); pc(CX - 12, player.y - 12, 10, C.g, 0.4);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!player.jumping) { player.vy = JUMP_VY; player.jumping = true; game.audio.play('se_tap', 0.4); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      ropeAngle += 1.9 * Math.PI * 2 * dt; if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.18, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'SKIP MASTER!' : 'TRIPPED UP', W / 2, H * 0.20, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.27, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.33, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt * 3; if (comboTimer > 0) comboTimer -= dt;
      ropeSpeed = 1.9 + jumps * 0.06; ropeAngle += ropeSpeed * Math.PI * 2 * dt;
      if (player.jumping) { player.vy += GRAVITY * dt; player.y += player.vy * dt; if (player.y >= GROUND_Y - 60) { player.y = GROUND_Y - 60; player.vy = 0; player.jumping = false; } }
      var atGround = Math.sin(ropeAngle) > 0.85;
      if (atGround && !lastGround) {
        if (!player.jumping) { hits++; hitFlash = 0.7; combo = 0; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: player.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 100, life: 0.4, col: C.a }); } if (hits >= MAX_HIT) { finish(false); return; } }
        else { jumps++; combo++; if (combo >= 4) { comboText = combo + ' COMBO'; comboTimer = 0.8; game.audio.play('se_success', 0.5); } for (var pi2 = 0; pi2 < 4; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: CX, y: GROUND_Y, vx: Math.cos(a2) * 100, vy: Math.sin(a2) * 80 - 60, life: 0.3, col: C.c }); } if (jumps >= NEEDED) { finish(true); return; } }
      }
      lastGround = atGround;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (comboTimer > 0) txt(comboText, W / 2, snap(H * 0.82), 56, C.c);
    else if (Math.sin(ropeAngle - Math.PI * 0.4) > 0.5) txt('JUMP!', W / 2, snap(H * 0.82), 52, C.b);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(jumps + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0f172a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
