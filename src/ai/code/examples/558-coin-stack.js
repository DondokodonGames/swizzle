// 558-coin-stack.js
// コインスタック — 左右に揺れるアームからタイミングよくコインを落とし、ずれずに積み上げる
// 操作: タップでコインを落とす（真上あたりで落とすとまっすぐ乗る。ずれ過ぎると崩壊）
// 成功: 8枚 タワー完成  失敗: 3回 崩壊 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コイン積み台） ──
  var C = { bg:'#1a1008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN STACK';
  var HOW_TO_PLAY = 'TAP TO DROP A COIN FROM THE SWINGING ARM · STACK IT STRAIGHT';
  var MAX_TIME = 20;
  var NEEDED_HEIGHT = 8;     // 修正2: 20 → 8
  var MAX_COLLAPSE = 3;      // 修正2: 5 → 3
  var ARM_Y = snap(H * 0.16), ARM_LEN = W * 0.4, COIN_R = 48, PLAT_X = W / 2, PLAT_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var armOsc, fallingCoin, stack, completions, collapses, timeLeft, done, particles, flash, flashCol, collapseAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2d1a08');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, PLAT_Y, W, H - PLAT_Y, '#2d1a08', 0.8); }

  function armTipX() { return W / 2 + Math.sin(armOsc) * ARM_LEN; }

  function checkStack() { for (var i = 1; i < stack.length; i++) { var tx = 0; for (var j = 0; j <= i; j++) tx += stack[j].xOffset; if (Math.abs(tx) > COIN_R * 1.5 + (i - 1) * 4) return false; } return true; }

  function initGame() { armOsc = 0; fallingCoin = null; stack = []; completions = 0; collapses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; collapseAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completions * 2000 + stack.length * 100 + Math.ceil(timeLeft) * 100) : (completions * 500 + stack.length * 50);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var tip = armTipX();
    game.draw.line(W / 2, ARM_Y, tip, ARM_Y + 20, '#444444', 20);
    game.draw.rect(W / 2 - 8, ARM_Y - 80, 16, 80, '#666666', 0.9); pc(W / 2, ARM_Y, 22, '#666666', 0.9); pc(tip, ARM_Y + 20, 14, '#444444', 0.9);
    var cumX = PLAT_X;
    for (var si = 0; si < stack.length; si++) { cumX += stack[si].xOffset; var cy = PLAT_Y - (si + 0.5) * COIN_R * 1.8; pc(cumX + 6, cy + 6, COIN_R, '#92400e', 0.5); pc(cumX, cy, COIN_R, C.f, 0.95); pc(cumX - 10, cy - 12, COIN_R * 0.32, C.c, 0.4); }
    var hr = stack.length / NEEDED_HEIGHT;
    game.draw.rect(80, PLAT_Y - NEEDED_HEIGHT * COIN_R * 1.8, 16, NEEDED_HEIGHT * COIN_R * 1.8, '#374151', 0.4);
    game.draw.rect(80, PLAT_Y - hr * NEEDED_HEIGHT * COIN_R * 1.8, 16, hr * NEEDED_HEIGHT * COIN_R * 1.8, C.c, 0.8);
    if (fallingCoin) { pc(fallingCoin.x + 6, fallingCoin.y + 6, COIN_R, '#92400e', 0.4); pc(fallingCoin.x, fallingCoin.y, COIN_R, C.f, 0.95); pc(fallingCoin.x - 10, fallingCoin.y - 12, COIN_R * 0.32, C.c, 0.4); }
    else { var dropX = armTipX(); for (var dy = ARM_Y + 40; dy < PLAT_Y - stack.length * COIN_R * 1.8; dy += 24) game.draw.rect(snap(dropX) - 2, dy, 4, 12, C.f, 0.5); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!fallingCoin) { fallingCoin = { x: armTipX(), y: ARM_Y + 30, vy: 0 }; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.52, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER BUILT!' : 'TOPPLED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(completions >= 1); return; }
      if (flash > 0) flash -= dt * 2.5; if (collapseAnim > 0) collapseAnim -= dt * 2;
      armOsc += 1.5 * (1 + stack.length * 0.05) * dt;
      if (fallingCoin) {
        fallingCoin.vy += 900 * dt; fallingCoin.y += fallingCoin.vy * dt;
        var landY = PLAT_Y - stack.length * COIN_R * 1.8 - COIN_R;
        if (fallingCoin.y + COIN_R >= landY) {
          var xOff = fallingCoin.x - PLAT_X, sx = 0; for (var i = 0; i < stack.length; i++) sx += stack[i].xOffset;
          stack.push({ xOffset: xOff - sx }); fallingCoin = null;
          if (!checkStack()) { collapses++; collapseAnim = 0.8; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.6); for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PLAT_X, y: PLAT_Y - stack.length * COIN_R, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280 - 80, life: 0.5, col: C.f }); } stack = []; if (collapses >= MAX_COLLAPSE) { finish(false); return; } }
          else { game.audio.play('se_tap', 0.4); if (stack.length >= NEEDED_HEIGHT) { completions++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9); for (var pi2 = 0; pi2 < 20; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: PLAT_X, y: PLAT_Y - NEEDED_HEIGHT * COIN_R, vx: Math.cos(a2) * 300, vy: Math.sin(a2) * 300 - 120, life: 0.6, col: C.c }); } finish(true); return; } }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 1.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 7, snap(particles[pp2].y) - 7, 14, 14, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (collapseAnim > 0) txt('COLLAPSE!', W / 2, H * 0.55, 72, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('HEIGHT ' + stack.length + ' / ' + NEEDED_HEIGHT, W / 2, 168, 46, C.c);
    for (var ci = 0; ci < MAX_COLLAPSE; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_COLLAPSE - 1) / 2) * 56) - 10, 224, 20, 20, ci < collapses ? C.a : '#2d1a08');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
