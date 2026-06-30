// 040-meteor-shield.js
// メテオシールド — 迫りくる隕石を盾で弾いて惑星を守る防衛戦
// 操作: スワイプで盾を上下左右に向ける
// 成功: 5秒守り切る  失敗: 3回直撃

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'SWIPE TO AIM THE SHIELD';
  var MAX_TIME = 5;          // 修正2: 生存系 20s → 5s
  var cx = W / 2, cy = H / 2, PLANET_R = 140, SHIELD_R = 280, SHIELD_LEN = 280, METEOR_R = 44, METEOR_SPEED = 360;
  var DIRS = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var shieldAngle, meteors, spawnTimer, lives, timeLeft, done, hitFlash, stars;

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
    var ang = Math.random() * Math.PI * 2, dist = Math.max(W, H);
    var mx = cx + Math.cos(ang) * dist, my = cy + Math.sin(ang) * dist;
    var ta = Math.atan2(cy - my, cx - mx) + (Math.random() - 0.5) * 0.4;
    meteors.push({ x: mx, y: my, vx: Math.cos(ta) * METEOR_SPEED, vy: Math.sin(ta) * METEOR_SPEED, r: METEOR_R + Math.random() * 16 });
  }
  function initGame() {
    shieldAngle = -Math.PI / 2; meteors = []; spawnTimer = 1.0; lives = 3; timeLeft = MAX_TIME; done = false; hitFlash = 0;
    stars = [];
    for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 * Math.ceil(Math.random() * 2), ph: Math.floor(Math.random() * 4) });
    spawnMeteor();
  }

  function shieldBlocks(m) {
    var mAngle = Math.atan2(m.y - cy, m.x - cx), diff = mAngle - shieldAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) < Math.PI / 4;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + lives * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (DIRS[dir] !== undefined) { shieldAngle = DIRS[dir]; game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i], a = Math.floor(game.time.elapsed * 4 + st.ph) % 2 === 0 ? 0.9 : 0.3;
      game.draw.rect(st.x, st.y, st.s, st.s, C.c, a);
    }
  }

  function drawScene() {
    for (var mi = 0; mi < meteors.length; mi++) drawPixelCircle(meteors[mi].x, meteors[mi].y, meteors[mi].r, C.f, 1);
    // 盾
    var shX = cx + Math.cos(shieldAngle) * SHIELD_R, shY = cy + Math.sin(shieldAngle) * SHIELD_R;
    var perp = shieldAngle + Math.PI / 2, half = SHIELD_LEN / 2;
    for (var seg = -5; seg <= 5; seg++) {
      var t = seg / 5;
      drawPixelCircle(shX + Math.cos(perp) * half * t, shY + Math.sin(perp) * half * t, 20, C.b, 1);
    }
    // 惑星
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.e, hitFlash / 0.5 * 0.2);
    drawPixelCircle(cx, cy, PLANET_R, C.a, 1);
    drawPixelCircle(cx - 30, cy - 30, PLANET_R * 0.3, C.b, 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!meteors) initGame();
      background();
      shieldAngle = game.time.elapsed * 1.5;
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.12, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
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
      if (timeLeft <= 0) { finish(true); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnMeteor(); spawnTimer = Math.max(0.4, 1.0 - (MAX_TIME - timeLeft) * 0.1); }
      for (var i = meteors.length - 1; i >= 0; i--) {
        var m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt;
        var dist = Math.sqrt((m.x - cx) * (m.x - cx) + (m.y - cy) * (m.y - cy));
        if (dist < SHIELD_R + m.r && dist > SHIELD_R - m.r * 0.5 && shieldBlocks(m)) {
          var oa = Math.atan2(m.y - cy, m.x - cx); m.vx = Math.cos(oa) * METEOR_SPEED; m.vy = Math.sin(oa) * METEOR_SPEED;
          game.audio.play('se_tap', 0.8); continue;
        }
        if (dist < PLANET_R + m.r) { meteors.splice(i, 1); lives--; hitFlash = 0.5; game.audio.play('se_failure', 0.8); if (lives <= 0) { finish(false); return; } continue; }
        if (dist > Math.max(W, H) * 1.5) meteors.splice(i, 1);
      }
      if (hitFlash > 0) hitFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    for (var lv = 0; lv < 3; lv++)
      game.draw.rect(W / 2 + (lv - 1) * 64 - 20, 150, 40, 40, lv < lives ? C.f : '#330000');
    txt('SWIPE TO AIM!', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
