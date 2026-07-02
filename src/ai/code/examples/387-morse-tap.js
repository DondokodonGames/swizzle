// 387-morse-tap.js
// モールスタップ — 表示された文字のモールス符号を、左=ドット・右=ダッシュで打ち込んで送信する
// 操作: 画面左タップ=・、右タップ=－、中央タップ=送信（無操作で自動送信）
// 成功: 3文字 正解  失敗: 3回 間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、通信室） ──
  var C = { bg:'#08061a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MORSE TAP';
  var HOW_TO_PLAY = 'LEFT = DOT  RIGHT = DASH  CENTER = SEND';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_WRONG = 3;
  var AUTO_SUBMIT = 2.0;

  var MORSE = { 'E': '.', 'T': '-', 'I': '..', 'A': '.-', 'N': '-.', 'M': '--' };
  var LETTERS = ['E', 'T', 'I', 'A', 'N', 'M'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, taps, correct, wrong, timeLeft, done, particles, flash, flashCol, fbText, autoTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function newTarget() { target = LETTERS[Math.floor(Math.random() * LETTERS.length)]; taps = []; autoTimer = 0; }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; fbText = ''; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 700 + Math.ceil(timeLeft) * 100) : correct * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function submit() {
    var ans = taps.join(''), want = MORSE[target]; autoTimer = 0;
    if (ans === want) {
      correct++; fbText = 'OK!'; flashCol = C.b; flash = 0.8; game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.42, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); }
      if (correct >= NEEDED) { finish(true); return; }
      newTarget();
    } else {
      wrong++; fbText = 'X  ' + (ans || '-'); flashCol = C.a; flash = 0.8; game.audio.play('se_failure', 0.4);
      taps = [];
      if (wrong >= MAX_WRONG) { finish(false); return; }
    }
  }

  function drawMorse(code, x, y, on) { var sx = x - (code.length * 50) / 2 + 25; for (var i = 0; i < code.length; i++) { var mx = sx + i * 50; if (code[i] === '.') pc(mx, y, 14, on, 0.9); else game.draw.rect(snap(mx) - 26, snap(y) - 9, 52, 18, on, 0.9); } }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (y > H * 0.68) {
      if (x < W / 3) { taps.push('.'); autoTimer = 0; game.audio.play('se_tap', 0.3); }
      else if (x > W * 2 / 3) { taps.push('-'); autoTimer = 0; game.audio.play('se_tap', 0.5); }
      else if (taps.length > 0) submit();
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 24, C.b);
      pc(W / 2 - 60, H * 0.44, 16, C.c, 0.9); game.draw.rect(snap(W / 2 + 20), snap(H * 0.44) - 10, 56, 20, C.e, 0.9);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MESSAGE SENT!' : 'GARBLED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (taps.length > 0) { autoTimer += dt; if (autoTimer >= AUTO_SUBMIT) submit(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    txt(target, W / 2, H * 0.28, 190, C.c);
    drawMorse(MORSE[target], W / 2, snap(H * 0.40), C.e);
    // 入力表示
    game.draw.rect(60, snap(H * 0.50), W - 120, 96, C.d, 0.4);
    if (taps.length === 0) txt('TAP TO INPUT', W / 2, snap(H * 0.50) + 56, 34, '#889');
    else drawMorse(taps.join(''), W / 2, snap(H * 0.50) + 48, C.c);
    if (taps.length > 0) game.draw.rect(60, snap(H * 0.62), (W - 120) * (autoTimer / AUTO_SUBMIT), 8, C.e, 0.7);

    // ボタン列
    var by = snap(H * 0.70), bh = snap(H * 0.20);
    game.draw.rect(0, by, W / 3, bh, C.d, 0.7); pc(W / 6, by + bh / 2, 26, C.c, 0.9);
    game.draw.rect(W / 3, by, W / 3, bh, C.d, 0.85); txt('SEND', W / 2, by + bh / 2 + 16, 48, C.b);
    game.draw.rect(W * 2 / 3, by, W / 3, bh, C.d, 0.7); game.draw.rect(snap(W * 5 / 6) - 40, by + bh / 2 - 12, 80, 24, C.e, 0.9);

    if (flash > 0) { game.draw.rect(0, 0, W, H, flashCol, flash * 0.1); txt(fbText, W / 2, snap(H * 0.64), 44, flashCol); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
