// 025-orbit-catch.js
// 軌道キャッチ — 重力圏を周回する隕石を正確なタイミングで捕獲する
// 操作: タップで発射口から捕獲ビームを出す
// 成功: 軌道上の隕石を1個捕獲  失敗: 3回ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP A METEOR TO CATCH';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var cx = W / 2, cy = H * 0.46, ORBIT_R = 460;   // 修正1: 軌道を拡大して縦域を活用
  var METEOR_R = 52, METEOR_SPEED = 1.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var meteors, beamActive, beamAngle, beamTimer, score, misses, timeLeft, done, feedback, feedbackOk, stars;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
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

  function spawnMeteor() {
    meteors.push({ angle: Math.random() * Math.PI * 2, dir: Math.random() < 0.5 ? 1 : -1,
      speed: METEOR_SPEED * (0.8 + Math.random() * 0.5), alive: true });
  }

  function initGame() {
    meteors = []; beamActive = false; beamAngle = 0; beamTimer = 0;
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false;
    stars = [];
    for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 * Math.ceil(Math.random() * 2), ph: Math.floor(Math.random() * 4) });
    spawnMeteor(); spawnMeteor();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || beamActive) return;
    var tapAngle = Math.atan2(y - cy, x - cx);
    var hitIdx = -1, bestDiff = Math.PI * 0.2;
    for (var i = 0; i < meteors.length; i++) {
      if (!meteors[i].alive) continue;
      var diff = Math.abs(meteors[i].angle - tapAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < bestDiff) { bestDiff = diff; hitIdx = i; }
    }
    beamActive = true; beamAngle = tapAngle; beamTimer = 0.35; feedback = 0.4;
    if (hitIdx >= 0) {
      meteors[hitIdx].alive = false; score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) finish(true);
      else setTimeout(function() { spawnMeteor(); }, 500);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i], a = Math.floor(game.time.elapsed * 4 + st.ph) % 2 === 0 ? 0.9 : 0.3;
      game.draw.rect(st.x, st.y, st.s, st.s, C.c, a);
    }
  }

  // ── ドット絵スプライト: 隕石（岩塊＋クレーター＋炎の尾）──
  function drawMeteor(x, y, ang, dir) {
    var bx = snap(x), by = snap(y);
    // 進行方向と逆に炎の尾
    game.draw.rect(snap(bx - Math.cos(ang) * dir * 40) - 8, snap(by - Math.sin(ang) * dir * 40) - 8, 16, 16, C.d, 0.6);
    game.draw.rect(bx - METEOR_R, by - METEOR_R + 8, METEOR_R * 2, METEOR_R * 2 - 16, C.f); // 岩塊
    game.draw.rect(bx - METEOR_R + 8, by - METEOR_R, METEOR_R * 2 - 16, METEOR_R * 2, C.f);
    game.draw.rect(bx - 16, by - 16, 16, 16, C.d, 0.6);   // クレーター
    game.draw.rect(bx + 8, by + 4, 12, 12, C.d, 0.5);
    game.draw.rect(bx - METEOR_R + 8, by - METEOR_R + 8, 12, 12, C.g, 0.4); // ハイライト
  }

  function drawScene() {
    // 軌道リング（ドット）
    for (var d = 0; d < 48; d++) {
      var a = (d / 48) * Math.PI * 2;
      game.draw.rect(snap(cx + Math.cos(a) * ORBIT_R) - 4, snap(cy + Math.sin(a) * ORBIT_R) - 4, 8, 8, C.a, 0.6);
    }
    // 惑星（本体＋大陸＋ハイライト）
    drawPixelCircle(cx, cy, 96, C.a, 1);
    drawPixelCircle(cx, cy, 96, C.e, 0.0);
    game.draw.rect(snap(cx) - 48, snap(cy) - 8, 40, 32, C.b, 0.5);
    game.draw.rect(snap(cx) + 8, snap(cy) - 40, 32, 24, C.b, 0.5);
    game.draw.rect(snap(cx) - 40, snap(cy) - 40, 24, 16, C.g, 0.4);
    // 隕石（岩塊＋クレーター＋尾）
    for (var m = 0; m < meteors.length; m++) {
      var met = meteors[m]; if (!met.alive) continue;
      drawMeteor(cx + Math.cos(met.angle) * ORBIT_R, cy + Math.sin(met.angle) * ORBIT_R, met.angle, met.dir);
    }
    // ビーム
    if (beamActive) {
      var ex = cx + Math.cos(beamAngle) * (ORBIT_R + METEOR_R), ey = cy + Math.sin(beamAngle) * (ORBIT_R + METEOR_R);
      game.draw.line(cx, cy, ex, ey, C.b, 10);
      if (feedbackOk) drawPixelCircle(ex, ey, 56, C.f, beamTimer / 0.35 * 0.8);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!meteors) initGame();
      background();
      meteors[0].angle += dt; if (meteors[1]) meteors[1].angle -= dt;
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.92, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < meteors.length; i++) if (meteors[i].alive) meteors[i].angle += meteors[i].dir * meteors[i].speed * dt;
      if (beamTimer > 0) beamTimer -= dt; else { beamActive = false; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) {
      if (feedbackOk) txt('CATCH!', W / 2, H * 0.8, 88, C.f);
      else txt('MISS', W / 2, H * 0.8, 80, C.e);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt('TAP THE METEOR!', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
