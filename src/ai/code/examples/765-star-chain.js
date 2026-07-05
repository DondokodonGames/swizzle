// 765-star-chain.js
// スターチェーン — 数字の順番通りに星をタップして繋げ
// 操作: 1→2→3→4→5の順にタップ。順番を間違えると最初からやり直し
// 成功: 8チェーン 完成  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、星座） ──
  var C = { bg:'#020410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var STAR = '#ffe600', STAR_HI = '#fffbe0', STAR_DK = '#4a3a08', STAR_DONE = '#00ff9f', LINE = '#ff6600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STAR CHAIN';
  var HOW_TO_PLAY = 'TAP THE STARS IN NUMBER ORDER 1 TO 5 · A WRONG TAP RESETS THE CHAIN';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var STAR_COUNT = 5;
  var STAR_R = 56;
  var WAIT_DUR = 0.4;
  var AREA_TOP = H * 0.30, AREA_BOT = H * 0.82, AREA_LEFT = W * 0.12, AREA_RIGHT = W * 0.88;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stars, nextIdx, completed, waitTimer, score, errors, done, timeLeft, elapsed, connLines, flash, flashCol, resultText, resultTimer, bgStars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#060820');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var bsi = 0; bsi < bgStars.length; bsi++) { var bs = bgStars[bsi]; game.draw.rect(snap(bs.x), snap(bs.y), 6, 6, STAR_HI, 0.2 + 0.15 * Math.sin(elapsed * 1.5 + bsi)); }
  }

  function drawStar5(cx, cy, r, color) {
    cx = snap(cx); cy = snap(cy);
    for (var i = 0; i < 5; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      for (var t = 0; t < r; t += 10) { var w = (r - t) * 0.5; game.draw.rect(snap(cx + Math.cos(a) * t - w / 2), snap(cy + Math.sin(a) * t - w / 2), snap(w), snap(w), color, 0.9); }
    }
    pc(cx, cy, r * 0.42, color, 0.95);
  }

  function newRound() {
    stars = []; nextIdx = 0; completed = []; connLines = [];
    var attempts = 0;
    while (stars.length < STAR_COUNT && attempts < 200) {
      attempts++;
      var sx = AREA_LEFT + Math.random() * (AREA_RIGHT - AREA_LEFT), sy = AREA_TOP + Math.random() * (AREA_BOT - AREA_TOP), ok = true;
      for (var i = 0; i < stars.length; i++) { var dx = sx - stars[i].x, dy = sy - stars[i].y; if (Math.sqrt(dx * dx + dy * dy) < 220) { ok = false; break; } }
      if (ok) stars.push({ x: snap(sx), y: snap(sy), num: stars.length + 1, twinkle: Math.random() * Math.PI * 2 });
    }
  }

  function initGame() {
    score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0;
    bgStars = []; for (var i = 0; i < 40; i++) bgStars.push({ x: Math.random() * W, y: AREA_TOP + Math.random() * (AREA_BOT - AREA_TOP) });
    newRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var li = 0; li < connLines.length; li++) { var ln = connLines[li]; game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, LINE, 6); game.draw.line(ln.x1, ln.y1, ln.x2, ln.y2, STAR_HI, 2); }
    for (var si = 0; si < stars.length; si++) {
      var s = stars[si], isDone = completed.indexOf(si) >= 0, isNext = si === nextIdx;
      var col = isDone ? STAR_DONE : (isNext ? STAR : STAR_DK), r = STAR_R * (isNext ? (0.95 + 0.05 * Math.sin(elapsed * 5)) : 1.0);
      if (isNext) pc(s.x, s.y, r + 24, STAR, 0.12 + 0.08 * Math.sin(elapsed * 4));
      drawStar5(s.x, s.y, r, col);
      txt('' + s.num, s.x, s.y + 12, isNext ? 48 : 40, isDone ? C.bg : C.g);
    }
    if (nextIdx < STAR_COUNT && waitTimer <= 0) txt('NEXT  ' + stars[nextIdx].num, W / 2, snap(H * 0.88), 44, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0 || nextIdx >= STAR_COUNT) return;
    var hitIdx = -1, bestDist = Infinity;
    for (var i = 0; i < stars.length; i++) { var s = stars[i], dx = tx - s.x, dy = ty - s.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < STAR_R + 30 && dist < bestDist) { bestDist = dist; hitIdx = i; } }
    if (hitIdx < 0) return;
    if (hitIdx === nextIdx) {
      if (nextIdx > 0) connLines.push({ x1: stars[nextIdx - 1].x, y1: stars[nextIdx - 1].y, x2: stars[nextIdx].x, y2: stars[nextIdx].y });
      completed.push(nextIdx); nextIdx++; game.audio.play('se_tap', 0.1);
      if (nextIdx >= STAR_COUNT) {
        score++; flash = 0.25; flashCol = C.b; resultText = 'CHAIN!'; resultTimer = 0.5; game.audio.play('se_success', 0.7); waitTimer = WAIT_DUR;
        if (score >= NEEDED) { finish(true); return; }
      }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG ORDER!'; resultTimer = 0.42; game.audio.play('se_failure', 0.28);
      nextIdx = 0; completed = []; connLines = [];
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONSTELLATION!' : 'CHAIN BROKEN', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var si = 0; si < stars.length; si++) stars[si].twinkle += dt * (2 + si * 0.3);
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.24), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
