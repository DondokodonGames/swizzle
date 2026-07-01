// 161-number-drop.js
// 数字落下 — 落ちてくる数字を昇順にタップする、頭が追いつかない焦り
// 操作: タップで数字を選ぶ
// 成功: 1〜3を順番に全タップ  失敗: 順番を間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER DROP';
  var HOW_TO_PLAY = 'TAP NUMBERS IN ORDER 1-3';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var TOTAL   = 3;               // 修正2: 15 → 3
  var TOP    = 220;
  var NUM_R = 72, DROP_SPEED = 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var numbers, particles, nextTarget, score, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawNumber(n, isNext) {
    if (n.tapTimer > 0) { pc(n.x, n.y, NUM_R + 16, C.b, n.tapTimer * 1.5); return; }
    var col = isNext ? C.b : C.e;
    if (isNext) pc(n.x, n.y, NUM_R + 16, C.b, 0.2);
    pc(n.x, n.y, NUM_R, col, 1);
    pc(n.x, n.y, NUM_R - 12, C.g, 0.2);
    txt(n.n + '', n.x, n.y - 8, 64, C.g);
  }

  function initGame() {
    numbers = []; particles = [];
    for (var i = 1; i <= TOTAL; i++) {
      numbers.push({ n: i, x: snap(NUM_R + 60 + Math.random() * (W - (NUM_R + 60) * 2)), y: -NUM_R - Math.random() * H * 0.7, vy: DROP_SPEED + Math.random() * 60 + i * 8, tapped: false, tapTimer: 0 });
    }
    nextTarget = 1; score = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni];
      if (n.tapped) continue;
      if (Math.hypot(x - n.x, y - n.y) < NUM_R + 16) {
        if (n.n === nextTarget) {
          n.tapped = true; n.tapTimer = 0.4; nextTarget++; score++;
          feedbackOk = true; feedback = 0.2;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: n.x, y: n.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4 }); }
          if (score >= TOTAL) { finish(true); return; }
        } else { feedbackOk = false; feedback = 0.4; finish(false); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawNumber({ n: 1, x: W * 0.3, y: H * 0.4, tapTimer: 0 }, true);
      drawNumber({ n: 2, x: W * 0.6, y: H * 0.55, tapTimer: 0 }, false);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT ORDER!' : 'WRONG ORDER', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var ni = 0; ni < numbers.length; ni++) {
        var n = numbers[ni];
        if (n.tapTimer > 0) { n.tapTimer -= dt; continue; }
        if (!n.tapped) { n.y += n.vy * dt; if (n.y > H + NUM_R) { n.y = -NUM_R; n.x = snap(NUM_R + 60 + Math.random() * (W - (NUM_R + 60) * 2)); } }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ni2 = 0; ni2 < numbers.length; ni2++) { if (!numbers[ni2].tapped || numbers[ni2].tapTimer > 0) drawNumber(numbers[ni2], numbers[ni2].n === nextTarget); }
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 4, snap(particles[pp].y) - 4, 8, 8, C.b, particles[pp].life * 2.5);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + TOTAL, W / 2, 168, 48, C.b);
    txt('NEXT: ' + Math.min(nextTarget, TOTAL), W / 2, H - 120, 52, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
