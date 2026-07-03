// 564-shadow-chase.js
// シャドウチェイス — 上に浮かぶ影と同じ形・同じ位置に、自分をスワイプで動かして重ねる
// 操作: スワイプで移動、タップで形を切り替え。影のシルエットに形と位置を合わせると一致
// 成功: 一致 3回  失敗: 18秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵舞台） ──
  var C = { bg:'#0a0a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHAPES = 5;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW CHASE';
  var HOW_TO_PLAY = 'SWIPE TO MOVE · TAP TO CHANGE SHAPE · OVERLAP THE SHADOW';
  var MAX_TIME = 18;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var AREA_X = snap(W * 0.1), AREA_Y = snap(H * 0.24), AREA_W = snap(W * 0.8), AREA_H = snap(H * 0.56), CHAR = 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, shadow, completions, timeLeft, done, particles, flash, matchTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#14142a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(AREA_X, AREA_Y, AREA_W, AREA_H, '#0f0f2a', 0.8); game.draw.rect(AREA_X, AREA_Y + AREA_H * 0.5 - 1, AREA_W, 2, '#374151', 0.6); }

  function drawShape(cx, cy, size, shape, color, alpha) {
    if (shape === 0) game.draw.rect(cx - size, cy - size, size * 2, size * 2, color, alpha);
    else if (shape === 1) { pc(cx, cy - size, size * 0.8, color, alpha); pc(cx - size * 0.8, cy + size * 0.6, size * 0.8, color, alpha); pc(cx + size * 0.8, cy + size * 0.6, size * 0.8, color, alpha); }
    else if (shape === 2) { game.draw.rect(cx - size, cy - size * 0.5, size * 2, size, color, alpha); game.draw.rect(cx - size * 0.5, cy - size, size, size * 2, color, alpha); }
    else if (shape === 3) { game.draw.rect(cx - size, cy - size * 0.3, size * 2, size * 0.6, color, alpha); game.draw.rect(cx - size * 0.3, cy - size, size * 0.6, size * 2, color, alpha); }
    else { pc(cx, cy, size * 0.5, color, alpha); for (var si = 0; si < 5; si++) { var sa = si / 5 * Math.PI * 2 - Math.PI / 2; pc(cx + Math.cos(sa) * size * 0.9, cy + Math.sin(sa) * size * 0.9, size * 0.4, color, alpha); } }
  }

  function newShadow() { shadow.x = AREA_X + CHAR + Math.random() * (AREA_W - CHAR * 2); shadow.y = AREA_Y + CHAR + Math.random() * (AREA_H * 0.4 - CHAR); shadow.shape = Math.floor(Math.random() * SHAPES); player.shape = Math.floor(Math.random() * SHAPES); player.x = W / 2; player.y = AREA_Y + AREA_H * 0.75; }

  function checkMatch() { return Math.abs(player.x - shadow.x) < 60 && Math.abs(player.y - shadow.y) < 60 && player.shape === shadow.shape; }

  function initGame() { player = { x: W / 2, y: AREA_Y + AREA_H * 0.75, shape: 0 }; shadow = { x: W / 2, y: AREA_Y + AREA_H * 0.25, shape: 0 }; completions = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; matchTimer = 0; newShadow(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completions * 1000 + Math.ceil(timeLeft) * 100) : completions * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryMatch() {
    if (checkMatch()) {
      completions++; flash = 0.4; matchTimer = 0.8; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.5, col: C.b }); }
      if (completions >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) { newShadow(); matchTimer = 0; } }, 800);
    }
  }

  function drawScene() {
    txt('TARGET', AREA_X + 70, AREA_Y + 36, 26, '#556', 'center');
    txt('YOU', AREA_X + 60, AREA_Y + AREA_H * 0.5 + 36, 26, '#556', 'center');
    pc(shadow.x, shadow.y, 60 + Math.sin(game.time.elapsed * 4) * 10, C.d, 0.15); drawShape(shadow.x, shadow.y, CHAR * 0.6, shadow.shape, C.d, 0.7);
    var dist = Math.hypot(player.x - shadow.x, player.y - shadow.y), prox = Math.max(0, 1 - dist / 400), same = player.shape === shadow.shape, col = (same && prox > 0.3) ? C.b : C.f;
    pc(player.x, player.y, CHAR * 0.6 + 8, col, 0.15 + prox * 0.1); drawShape(player.x, player.y, CHAR * 0.6, player.shape, col, 0.9);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || matchTimer > 0) return;
    var sp = 200;
    if (dir === 'up') player.y -= sp; if (dir === 'down') player.y += sp; if (dir === 'left') player.x -= sp; if (dir === 'right') player.x += sp;
    player.x = Math.max(AREA_X + CHAR, Math.min(AREA_X + AREA_W - CHAR, player.x)); player.y = Math.max(AREA_Y + CHAR, Math.min(AREA_Y + AREA_H - CHAR, player.y));
    game.audio.play('se_tap', 0.2); tryMatch();
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || matchTimer > 0) return;
    player.shape = (player.shape + 1) % SHAPES; game.audio.play('se_tap', 0.15); tryMatch();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'TIME UP', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (matchTimer > 0) matchTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);
    if (matchTimer > 0) txt('MATCH!', W / 2, H * 0.5, 90, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completions + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
