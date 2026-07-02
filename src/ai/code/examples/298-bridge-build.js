// 298-bridge-build.js
// 橋を架けろ — タップで橋を伸ばし、もう一度タップで固定。対岸にぴったり届く長さを見極める
// 操作: タップで伸ばし開始、もう一度タップで固定して倒す
// 成功: 3本の橋を渡りきる  失敗: 3回落下 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、渓谷の橋） ──
  var C = { bg:'#0a1628', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', plat:'#3a4a66' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BRIDGE BUILD';
  var HOW_TO_PLAY = 'TAP TO GROW · TAP AGAIN TO DROP · REACH THE LEDGE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_FALL = 3;
  var PLAT_Y = snap(H * 0.58), PLAT_H = snap(H * 0.30), GROW = 460;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftX, leftW, gap, rightX, rightW, bridgeLen, maxLen, phase, fallA, manX, crossed, falls, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, wide) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); for (var i = 0; i <= n; i++) { var w = wide || 8; game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1628');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, PLAT_Y, '#0f2040', 0.6); game.draw.rect(0, PLAT_Y + PLAT_H, W, H, C.d, 0.15); }

  function newRound() {
    leftW = snap(180 + Math.random() * 80); leftX = 40; gap = snap(200 + Math.random() * 320); rightX = leftX + leftW + gap; rightW = snap(140 + Math.random() * 100);
    bridgeLen = 0; maxLen = gap + rightW + 120; phase = 'idle'; fallA = 0; manX = leftX + leftW / 2; fbText = '';
  }

  function initGame() { crossed = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; fbTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (crossed * 500 + Math.ceil(timeLeft) * 80) : crossed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(leftX, PLAT_Y, leftW, PLAT_H, C.plat, 0.95); game.draw.rect(leftX, PLAT_Y, leftW, 12, C.e, 0.5);
    if (rightX < W + 200) { game.draw.rect(rightX, PLAT_Y, Math.min(rightW, W - rightX), PLAT_H, C.plat, 0.95); game.draw.rect(rightX, PLAT_Y, Math.min(rightW, W - rightX), 12, C.b, 0.6); }
    if (bridgeLen > 0) {
      var bx = leftX + leftW, by = PLAT_Y, ex = bx + bridgeLen * Math.sin(fallA), ey = by + bridgeLen * (1 - Math.cos(fallA));
      pline(bx, by, ex, ey, C.f, 0.95, 18); pline(bx, by, ex, ey, C.c, 0.6, 6);
    }
    // マン（ピクセル人形）
    var mx = snap(manX), my = PLAT_Y;
    pc(mx, my - 60, 18, C.b, 0.95); game.draw.rect(mx - 5, my - 44, 10, 30, C.b, 0.9);
    var sw = Math.floor(game.time.elapsed * 8) % 2 ? 10 : -10;
    game.draw.rect(mx - 12 + sw, my - 14, 8, 20, C.b, 0.9); game.draw.rect(mx + 4 - sw, my - 14, 8, 20, C.b, 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'idle') { phase = 'growing'; bridgeLen = 0; }
    else if (phase === 'growing') { phase = 'falling'; fallA = 0; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (leftW === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CROSSED!' : 'FELL DOWN', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
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
      if (phase === 'growing') { bridgeLen += GROW * dt; if (bridgeLen > maxLen) { bridgeLen = maxLen; phase = 'falling'; fallA = 0; } }
      else if (phase === 'falling') {
        fallA += dt * 3.2;
        if (fallA >= Math.PI / 2) {
          fallA = Math.PI / 2;
          var endX = leftX + leftW + bridgeLen;
          if (endX >= rightX && endX <= rightX + rightW) { phase = 'walking'; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 1.0; game.audio.play('se_success', 0.4); }
          else {
            falls++; fbText = endX > rightX + rightW ? 'TOO LONG!' : 'TOO SHORT!'; fbCol = C.a; fbTimer = 1.0; game.audio.play('se_failure', 0.5);
            for (var pk = 0; pk < 8; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: endX, y: PLAT_Y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.6, col: C.a }); }
            if (falls >= MAX_FALL) { finish(false); return; }
            phase = 'reset';
            setTimeout(function() { if (!done) newRound(); }, 900);
          }
        }
      } else if (phase === 'walking') {
        manX += 380 * dt;
        if (manX >= rightX + rightW / 2) {
          crossed++;
          for (var ck = 0; ck < 10; ck++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: manX, y: PLAT_Y - 60, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200 - 40, life: 0.7, col: C.b }); }
          if (crossed >= NEEDED) { finish(true); return; }
          phase = 'reset';
          setTimeout(function() { if (!done) newRound(); }, 500);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.42), 56, fbCol);
    if (phase === 'idle') txt('TAP TO GROW', W / 2, snap(H * 0.50), 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(crossed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#0a1628');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
