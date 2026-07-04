// 738-comet-hunt.js
// コメットハント — 夜空を横切る彗星をタップで撃墜する
// 操作: 飛んでくる彗星をタップ。画面外へ逃すとミス
// 成功: 12個 撃墜  失敗: 3個 逃す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、星空） ──
  var C = { bg:'#010108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COMET = '#00cfff', COMET_HI = '#ffffff', TAIL = '#3355ff', STARC = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COMET HUNT';
  var HOW_TO_PLAY = 'TAP THE STREAKING COMETS TO SHOOT THEM DOWN BEFORE THEY FLY OFF';
  var MAX_TIME = 22;
  var NEEDED     = 12;       // 修正2: 40 → 12
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var comets, bgStars, spawnTimer, score, escaped, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030310');
  }

  function background() { game.draw.clear(C.bg); for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) game.draw.rect(snap(bgStars[bsi2].x), snap(bgStars[bsi2].y), bgStars[bsi2].r, bgStars[bsi2].r, STARC, 0.35); }

  function spawnComet() {
    var fromLeft = Math.random() < 0.5, cx, cy, vx, vy, spd = 460 + Math.random() * 240 + score * 10, side = Math.random();
    if (side < 0.35) { cx = Math.random() * W; cy = -70; var ang = Math.PI * 0.35 + Math.random() * Math.PI * 0.3; vx = Math.cos(ang) * spd * (fromLeft ? 1 : -1); vy = Math.abs(Math.sin(ang) * spd); }
    else if (fromLeft) { cx = -80; cy = 250 + Math.random() * (H * 0.55); vx = (0.7 + Math.random() * 0.5) * spd; vy = (Math.random() - 0.4) * spd * 0.4; }
    else { cx = W + 80; cy = 250 + Math.random() * (H * 0.55); vx = -(0.7 + Math.random() * 0.5) * spd; vy = (Math.random() - 0.4) * spd * 0.4; }
    comets.push({ x: cx, y: cy, vx: vx, vy: vy, r: 22 + Math.random() * 14, tail: [] });
  }

  function initGame() { comets = []; bgStars = []; for (var bsi = 0; bsi < 60; bsi++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16 }); spawnTimer = 0.6; score = 0; escaped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnComet(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ci2 = 0; ci2 < comets.length; ci2++) {
      var cm2 = comets[ci2];
      for (var ti = 0; ti < cm2.tail.length; ti++) { var tf = 1 - ti / cm2.tail.length; pc(cm2.tail[ti].x, cm2.tail[ti].y, cm2.r * tf * 0.6, TAIL, tf * 0.55); }
      pc(cm2.x, cm2.y, cm2.r, COMET, 0.9); pc(cm2.x - cm2.r * 0.28, cm2.y - cm2.r * 0.28, cm2.r * 0.28, COMET_HI, 0.55);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i], dx = tx - c.x, dy = ty - c.y;
      if (dx * dx + dy * dy < (c.r + 32) * (c.r + 32)) {
        comets.splice(i, 1); score++; flash = 0.2; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.35; game.audio.play('se_tap', 0.1);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 260, vy: Math.sin(pa) * 260, life: 0.4, col: COMET_HI }); }
        if (score >= NEEDED) { finish(true); return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!comets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COMET SLAYER!' : 'THEY GOT AWAY', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var rate = Math.max(0.4, 0.85 - score * 0.02); if (spawnTimer <= 0) { spawnTimer = rate; if (comets.length < 7) spawnComet(); }
      for (var ci = comets.length - 1; ci >= 0; ci--) {
        var cm = comets[ci]; cm.tail.unshift({ x: cm.x, y: cm.y }); if (cm.tail.length > 14) cm.tail.pop(); cm.x += cm.vx * dt; cm.y += cm.vy * dt;
        if (cm.x < -160 || cm.x > W + 160 || cm.y > H + 160) {
          comets.splice(ci, 1); escaped++; flash = 0.22; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.35; game.audio.play('se_failure', 0.2);
          if (escaped >= MAX_ESCAPE) { finish(false); return; }
        }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.85), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#030310');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
