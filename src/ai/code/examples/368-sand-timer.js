// 368-sand-timer.js
// サンドタイマー — 砂時計を傾け、表示された目標秒ぴったりで砂を落としきる体内時計ゲーム
// 操作: タップで砂時計を逆さにして計測開始、落ちきったタイミングを狙う
// 成功: 3ラウンドこなす  失敗: 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、砂時計） ──
  var C = { bg:'#04081a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND TIMER';
  var HOW_TO_PLAY = 'TAP TO FLIP · STOP THE SAND AT THE TARGET TIME';
  var MAX_TIME = 18;
  var TARGETS  = [4, 6, 5];   // 修正2: 60s台 → 短い目標、5ラウンド → 3ラウンド
  var NEEDED   = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var round, target, topSand, botSand, flowRate, measuring, measureStart, timeLeft, done, particles, fbText, fbCol, fbTimer, roundScore;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1430');
  }

  function background() { game.draw.clear(C.bg); }

  function startRound() { target = TARGETS[round % TARGETS.length]; topSand = 1.0; botSand = 0.0; flowRate = 1.0 / target; measuring = false; measureStart = 0; }

  function initGame() { round = 0; roundScore = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (roundScore + Math.ceil(timeLeft) * 100) : roundScore;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function finishRound(measured) {
    var diff = Math.abs(measured - target), sc = Math.max(0, 500 - Math.round(diff * 120));
    roundScore += sc;
    if (diff < 0.6) { fbText = 'PERFECT! +' + sc; fbCol = C.b; game.audio.play('se_success', 0.6); }
    else if (diff < 1.4) { fbText = 'GOOD +' + sc; fbCol = C.c; game.audio.play('se_tap', 0.5); }
    else { fbText = 'OFF +' + sc; fbCol = C.a; game.audio.play('se_failure', 0.4); }
    fbTimer = 1.2;
    for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: fbCol }); }
    round++;
    if (round >= NEEDED) { finish(true); return; }
    setTimeout(function() { if (!done && state === S.PLAYING) startRound(); }, 1300);
  }

  function drawGlass(cx, cy) {
    var gW = 200, gH = 360, topY = cy - gH / 2, midY = cy, botY = cy + gH / 2;
    // 枠
    game.draw.rect(snap(cx - gW / 2 - 24), snap(topY - 34), gW + 48, 30, '#5c3a20', 0.95);
    game.draw.rect(snap(cx - gW / 2 - 24), snap(botY + 4), gW + 48, 30, '#5c3a20', 0.95);
    pline(cx - gW / 2 - 8, topY, cx - gW / 2 - 8, botY, '#5c3a20', 0.9, 10);
    pline(cx + gW / 2 + 8, topY, cx + gW / 2 + 8, botY, '#5c3a20', 0.9, 10);
    // ガラス輪郭
    pline(cx - gW / 2, topY, cx - 10, midY, C.e, 0.6, 4); pline(cx + gW / 2, topY, cx + 10, midY, C.e, 0.6, 4);
    pline(cx - 10, midY, cx - gW / 2, botY, C.e, 0.6, 4); pline(cx + 10, midY, cx + gW / 2, botY, C.e, 0.6, 4);
    // 上の砂（三角錐を段で）
    if (topSand > 0) { var th = topSand * (gH / 2 - 16); for (var y = 0; y < th; y += 8) { var w = (gW / 2) * (1 - y / (gH / 2 - 16)) * topSand + 8; game.draw.rect(snap(cx - w), snap(midY - 16 - y), snap(w * 2), 8, C.c, 0.9); } }
    // 下の砂（山盛り）
    if (botSand > 0) { var bh = botSand * (gH / 2 - 16); for (var y2 = 0; y2 < bh; y2 += 8) { var w2 = (gW / 2) * (y2 / (gH / 2 - 16)) * (0.4 + 0.6 * botSand) + 8; game.draw.rect(snap(cx - w2), snap(botY - 16 - y2), snap(w2 * 2), 8, C.f, 0.9); } }
    // 落ちる砂
    if (topSand > 0 && measuring) { pline(cx, midY - 8, cx, midY + snap(gH * 0.28), C.c, 0.8, 6); pc(cx, midY + snap(gH * 0.28), 8, C.c, 0.9); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || measuring) return;
    // 逆さにして計測開始
    var tmp = topSand; topSand = botSand === 0 ? 1.0 : botSand; botSand = tmp; topSand = 1.0; botSand = 0.0;
    measuring = true; measureStart = MAX_TIME - timeLeft; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGlass(W / 2, H * 0.5);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON TIME!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
      if (measuring && topSand > 0) { var flow = Math.min(flowRate * dt, topSand); topSand -= flow; botSand += flow; if (topSand <= 0) { measuring = false; finishRound((MAX_TIME - timeLeft) - measureStart); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGlass(W / 2, H * 0.5);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('TARGET  ' + target + 's', W / 2, snap(H * 0.74), 52, C.e);
    if (measuring) txt(((MAX_TIME - timeLeft) - measureStart).toFixed(1) + 's', W / 2, snap(H * 0.80), 56, C.c);
    else txt('TAP TO FLIP', W / 2, snap(H * 0.80), 44, C.g);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.86), 50, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
