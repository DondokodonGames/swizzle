// 272-ladder-climb.js
// ラダークライム — はしごを左右の手で交互に掴んで登る、同じ手を続けて出すと滑り落ちる
// 操作: 左タップで左手、右タップで右手（交互に）
// 成功: 8段登る  失敗: 同じ手を連続で出す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、無限はしご） ──
  var C = { bg:'#0a0508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LADDER CLIMB';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT HANDS ALTERNATELY';
  var MAX_TIME = 15;
  var NEEDED   = 8;           // 修正2: 50 → 8
  var CX = snap(W / 2), CLIMB_Y = snap(H * 0.5), RUNG = 100, LADW = 200, TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lastHand, climbed, scroll, lean, bob, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1008');
  }

  function background() {
    game.draw.clear(C.bg);
    var LX1 = CX - LADW / 2, LX2 = CX + LADW / 2;
    game.draw.rect(LX1 - 10, TOP, 20, H - TOP, C.d, 0.8); game.draw.rect(LX2 - 10, TOP, 20, H - TOP, C.d, 0.8);
    var off = scroll % RUNG;
    for (var ri = -1; ri < (H - TOP) / RUNG + 2; ri++) { var ry = H - ri * RUNG + off - RUNG; if (ry > TOP && ry < H) game.draw.rect(LX1, snap(ry) - 8, LADW, 16, C.f, 0.8); }
  }

  function drawClimber() {
    var bx = CX + lean * 30, by = CLIMB_Y + bob;
    game.draw.rect(snap(bx) - 20, snap(by) - 50, 40, 80, C.b, 0.9);
    pc(bx, by - 70, 30, C.b, 0.9); game.draw.rect(snap(bx) + 8, snap(by) - 76, 8, 8, C.bg);
    var lax = bx - 30 + (lastHand === 'left' ? -26 : 0), lay = by - 30 + (lastHand === 'left' ? -18 : 0);
    var rax = bx + 30 + (lastHand === 'right' ? 26 : 0), ray = by - 30 + (lastHand === 'right' ? -18 : 0);
    pc(lax, lay, 14, C.e, 0.9); pc(rax, ray, 14, C.a, 0.9);
  }

  function initGame() { lastHand = null; climbed = 0; scroll = 0; lean = 0; bob = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (climbed * 300 + Math.ceil(timeLeft) * 60) : climbed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var side = x < W / 2 ? 'left' : 'right';
    if (side === lastHand) { fbText = 'SLIPPED!'; fbCol = C.a; finish(false); return; }
    lastHand = side; climbed++; bob = -20; lean = side === 'left' ? -0.4 : 0.4; scroll += RUNG; game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) { var ang = -Math.PI / 2 + game.random(-0.4, 0.4); particles.push({ x: CX + (side === 'left' ? -60 : 60), y: CLIMB_Y, vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, life: 0.4, col: side === 'left' ? C.e : C.a }); }
    if (climbed >= NEEDED) { finish(true); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      scroll = (scroll || 0); background(); drawClimber();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 46, C.g);
      }
      txt('◄ LEFT      RIGHT ►', W / 2, H * 0.96, 40, C.e);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TO THE TOP!' : 'FELL', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      lean *= (1 - dt * 4); bob += (0 - bob) * dt * 8;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawClimber();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    game.draw.rect(0, H - 150, W / 2, 150, C.e, lastHand === 'right' ? 0.12 : 0.05); game.draw.rect(W / 2, H - 150, W / 2, 150, C.a, lastHand === 'left' ? 0.12 : 0.05);
    txt('◄ LEFT', W * 0.25, H - 80, 40, lastHand === 'right' ? C.e : C.g); txt('RIGHT ►', W * 0.75, H - 80, 40, lastHand === 'left' ? C.a : C.g);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.7, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(climbed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
