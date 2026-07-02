// 244-number-bounce.js
// ナンバーバウンス — 跳ね回る数字ボールを 1 から順にタップして捕まえる瞬発暗算
// 操作: 数字を昇順にタップ
// 成功: 1〜6を順にタップ  失敗: 順番ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、数字の弾幕） ──
  var C = { bg:'#020510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER BOUNCE';
  var HOW_TO_PLAY = 'TAP THE NUMBERS IN ORDER 1 TO 6';
  var MAX_TIME = 15;
  var TOTAL    = 6;           // 修正2: 20 → 6
  var TOP = 300, BOT = H - 200, BALL_R = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, nextTarget, timeLeft, done, fbText, fbCol, fbTimer, particles;

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
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); }

  function initBalls() {
    balls = [];
    for (var i = 1; i <= TOTAL; i++) { var ang = Math.random() * Math.PI * 2, sp = 100 + Math.random() * 120; balls.push({ n: i, x: snap(game.random(BALL_R, W - BALL_R)), y: snap(game.random(TOP + BALL_R, BOT - BALL_R)), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, tapped: false, flash: 0 }); }
  }

  function drawBall(b) {
    if (b.tapped) { if (b.flash > 0) pc(b.x, b.y, BALL_R * (1 + b.flash), C.b, b.flash * 0.5); return; }
    var isNext = b.n === nextTarget, col = isNext ? C.b : C.e;
    var r = isNext ? BALL_R + Math.floor(game.time.elapsed * 6) % 2 * 6 : BALL_R;
    pc(b.x, b.y, r, col, 0.9); pc(b.x - 16, b.y - 16, 10, C.g, 0.6);
    txt(b.n + '', b.x, b.y + 18, isNext ? 60 : 50, '#000');
  }

  function initGame() { initBalls(); nextTarget = 1; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (TOTAL * 300 + Math.ceil(timeLeft) * 60) : (nextTarget - 1) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || fbTimer > 0.15) return;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i]; if (b.tapped) continue;
      if ((x - b.x) * (x - b.x) + (y - b.y) * (y - b.y) < (BALL_R + 12) * (BALL_R + 12)) {
        if (b.n === nextTarget) { b.tapped = true; b.flash = 0.5; nextTarget++; game.audio.play('se_tap', 0.4); for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4 }); } if (nextTarget > TOTAL) { finish(true); return; } }
        else { fbText = 'WRONG ORDER'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.4); }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); for (var i = 0; i < balls.length; i++) drawBall(balls[i]);
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT!' : 'MISSTEP', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
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
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i]; if (b.tapped) { if (b.flash > 0) b.flash -= dt; continue; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); } if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
        if (b.y - BALL_R < TOP) { b.y = TOP + BALL_R; b.vy = Math.abs(b.vy); } if (b.y + BALL_R > BOT) { b.y = BOT - BALL_R; b.vy = -Math.abs(b.vy); }
      }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < balls.length; i2++) drawBall(balls[i2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2.5);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.85, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('NEXT ' + nextTarget + '  (' + (nextTarget - 1) + '/' + TOTAL + ')', W / 2, 168, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
