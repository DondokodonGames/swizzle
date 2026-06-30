// 010-crack-seal.js
// ひびわれ封じ — じわじわ広がるひびを塞ぐ焦燥感
// 操作: ひびの中心をタップして封じる
// 成功: 5秒耐える  失敗: ひびが端まで広がる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'CRACK SEAL';
  var HOW_TO_PLAY = 'TAP CRACKS TO SEAL';
  var MAX_TIME = 5;          // 修正2: 生存系 15s → 5s
  var CRACK_LIMIT = 440;
  var TOP = 260, BOTTOM = H - 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var timeLeft, done, cracks, sealFx, spawnTimer, spawnCount;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step)
      for (var px = -r; px <= r; px += step)
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    timeLeft = MAX_TIME; done = false; cracks = []; sealFx = []; spawnTimer = 0.8; spawnCount = 0;
    spawnCrack();
  }

  function spawnCrack() {
    var tries = 0;
    while (tries < 20) {
      var cx = snap(game.random(120, W - 120));
      var cy = snap(game.random(TOP, BOTTOM));
      var tooClose = false;
      for (var i = 0; i < cracks.length; i++) {
        var dx = cx - cracks[i].x, dy = cy - cracks[i].y;
        if (dx * dx + dy * dy < 320 * 320) { tooClose = true; break; }
      }
      if (!tooClose) {
        cracks.push({ x: cx, y: cy, r: 24, speed: game.random(40, 70), sealed: false, sealTimer: 0,
          spokes: Math.floor(game.random(5, 8)) });
        return;
      }
      tries++;
    }
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 200 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = cracks.length - 1; i >= 0; i--) {
      var c = cracks[i];
      if (c.sealed) continue;
      var dx = x - c.x, dy = y - c.y, hit = Math.max(c.r + 40, 80);
      if (dx * dx + dy * dy <= hit * hit) {
        c.sealed = true; c.sealTimer = 0; c.r = Math.max(c.r - 80, 0);
        sealFx.push({ x: c.x, y: c.y, t: 0 });
        game.audio.play('se_tap', 0.8);
        return;
      }
    }
  });

  function drawCrack(c) {
    var col = c.sealed ? C.b : C.f;
    for (var b = 0; b < c.spokes; b++) {
      var ang = (b / c.spokes) * Math.PI * 2;
      var ex = c.x + Math.cos(ang) * c.r, ey = c.y + Math.sin(ang) * c.r;
      game.draw.line(c.x, c.y, ex, ey, col, c.sealed ? 6 : 8);
    }
    drawPixelCircle(c.x, c.y, 16, col, 1);
    if (!c.sealed && c.r / CRACK_LIMIT > 0.5 && Math.floor(game.time.elapsed * 8) % 2 === 0)
      drawPixelCircle(c.x, c.y, c.r * 0.5, C.a, 0.2);
  }

  // 世界観: 水圧がかかるダムの壁。広がるひびを塞いで決壊を防ぐ。
  function background() {
    game.draw.clear('#001028');
    // 壁の石組み（レンガ目地）
    for (var gy = 120; gy < H; gy += 120) {
      game.draw.rect(0, gy, W, 3, '#0a2244', 0.6);
      var off = ((gy / 120) % 2) ? 0 : 180;
      for (var gx = off; gx < W; gx += 360) game.draw.rect(snap(gx), gy, 3, 120, '#0a2244', 0.5);
    }
    // 上部の水位（青い圧）
    game.draw.rect(0, 80, W, 40, C.e, 0.4);
    txt('DAM WALL', W / 2, 60, 32, C.b);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var dr = 24 + ((game.time.elapsed * 80) % 200);
      drawCrack({ x: W / 2, y: H * 0.5, r: dr, sealed: false, spokes: 6 });
      txt(GAME_TITLE,  W / 2, H * 0.2, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.3, 44, C.e);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }

      spawnTimer -= dt;
      if (spawnTimer <= 0 && cracks.length < 4) {
        spawnCrack(); spawnCount++;
        spawnTimer = Math.max(1.2, 2.5 - spawnCount * 0.2);
      }

      for (var i = 0; i < cracks.length; i++) {
        var c = cracks[i];
        if (c.sealed) {
          c.sealTimer += dt;
          if (c.sealTimer > 2.5) { c.sealed = false; c.sealTimer = 0; c.speed *= 1.1; }
        } else {
          c.r += c.speed * dt;
          if (c.r >= CRACK_LIMIT) { finish(false); return; }
        }
      }
      for (var j = sealFx.length - 1; j >= 0; j--) { sealFx[j].t += dt; if (sealFx[j].t > 0.5) sealFx.splice(j, 1); }
    }

    // ---- draw ----
    background();
    for (var k = 0; k < cracks.length; k++) drawCrack(cracks[k]);
    for (var m = 0; m < sealFx.length; m++) {
      var fx = sealFx[m], p = fx.t / 0.5;
      drawPixelCircle(fx.x, fx.y, 60 + p * 100, C.b, (1 - p) * 0.7);
    }
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.g);
    txt('SEAL THE CRACKS!', W / 2, H - 120, 48, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
