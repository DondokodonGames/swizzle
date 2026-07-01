// 066-heat-seeker.js
// ヒートシーカー — 熱源に向かって自動追尾するミサイルをスワイプで撃ち落とす
// 操作: スワイプ方向にシールドを展開（上下左右から選ぶ）
// 成功: 1機撃墜  失敗: 3機が基地に到達 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'HEAT SEEKER';
  var HOW_TO_PLAY = 'SWIPE TO RAISE THE SHIELD';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 10 → 1
  var MAX_HIT = 3;
  var BASE_X = W / 2, BASE_Y = H * 0.78, BASE_R = 90, MISSILE_R = 32, SHIELD_R = 200;   // 修正1: 基地を下部
  var SHIELD_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, SHIELD_DURATION = 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var missiles, shield, kills, hits, timeLeft, done, killFlash, spawnTimer, stars;

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

  function spawnMissile() {
    var side = Math.floor(Math.random() * 3), x, y, speed = 300 + kills * 20;
    if (side === 0) { x = Math.random() * W; y = -40; }
    else if (side === 1) { x = -40; y = Math.random() * H * 0.6; }
    else { x = W + 40; y = Math.random() * H * 0.6; }
    var dx = BASE_X - x, dy = BASE_Y - y, dist = Math.sqrt(dx * dx + dy * dy);
    missiles.push({ x: x, y: y, vx: dx / dist * speed, vy: dy / dist * speed, trail: [] });
  }
  function initGame() { missiles = []; shield = null; kills = 0; hits = 0; timeLeft = MAX_TIME; done = false; killFlash = 0; spawnTimer = 0.5; stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), s: 8 * Math.ceil(Math.random() * 2), ph: Math.floor(Math.random() * 4) }); spawnMissile(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (kills * 300 + Math.ceil(timeLeft) * 40) : kills * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || !SHIELD_DIRS[dir]) return;
    shield = { dir: dir, timer: SHIELD_DURATION }; game.audio.play('se_tap', 0.5);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: 追尾ミサイルから拠点を守る防空基地。スワイプ方向にシールドを張る。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < stars.length; i++) { var st = stars[i], a = Math.floor(game.time.elapsed * 3 + st.ph) % 2 === 0 ? 0.8 : 0.3; game.draw.rect(st.x, st.y, st.s, st.s, C.c, a); }
    game.draw.rect(0, BASE_Y + 60, W, H, '#0a0a22');
  }

  function drawScene() {
    for (var j = 0; j < missiles.length; j++) {
      var m = missiles[j];
      for (var tr = 0; tr < m.trail.length; tr++) game.draw.rect(snap(m.trail[tr].x) - 8, snap(m.trail[tr].y) - 8, 16, 16, C.f, (1 - tr / m.trail.length) * 0.5);
      drawPixelCircle(m.x, m.y, MISSILE_R, C.e, 1); game.draw.rect(snap(m.x) - 8, snap(m.y) - 8, 12, 12, C.g);
    }
    if (shield && shield.timer > 0) {
      var sa = shield.timer / SHIELD_DURATION, sv = SHIELD_DIRS[shield.dir];
      drawPixelCircle(BASE_X + sv[0] * SHIELD_R, BASE_Y + sv[1] * SHIELD_R, 70 * sa, C.b, sa);
    }
    if (killFlash > 0) drawPixelCircle(BASE_X, BASE_Y, BASE_R + 24, C.c, killFlash / 0.2 * 0.5);
    drawPixelCircle(BASE_X, BASE_Y, BASE_R, C.a, 1); drawPixelCircle(BASE_X, BASE_Y, BASE_R * 0.5, C.b, 1);
    // 方向ガイド
    var arr = [['up', W / 2, BASE_Y - 260, '↑'], ['left', BASE_X - 260, BASE_Y, '←'], ['right', BASE_X + 260, BASE_Y, '→']];
    for (var a = 0; a < arr.length; a++) txt(arr[a][3], arr[a][1], arr[a][2], 52, shield && shield.dir === arr[a][0] ? C.b : '#333366');
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!missiles) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.21, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.57, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.64, 42, '#888888');
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
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnMissile(); spawnTimer = Math.max(0.5, 1.2 - kills * 0.05); }
      if (shield && shield.timer > 0) { shield.timer -= dt; if (shield.timer <= 0) shield = null; }
      for (var i = missiles.length - 1; i >= 0; i--) {
        var m = missiles[i];
        var dx = BASE_X - m.x, dy = BASE_Y - m.y, dist = Math.sqrt(dx * dx + dy * dy) || 1, speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        m.vx = m.vx * 0.92 + dx / dist * speed * 0.08; m.vy = m.vy * 0.92 + dy / dist * speed * 0.08;
        m.x += m.vx * dt; m.y += m.vy * dt; m.trail.unshift({ x: m.x, y: m.y }); if (m.trail.length > 6) m.trail.pop();
        if (shield && shield.timer > 0) {
          var sv = SHIELD_DIRS[shield.dir], mAng = Math.atan2(m.y - BASE_Y, m.x - BASE_X), sAng = Math.atan2(sv[1], sv[0]);
          var ad = Math.abs(mAng - sAng); if (ad > Math.PI) ad = Math.PI * 2 - ad;
          if (ad < Math.PI * 0.6 && dist < SHIELD_R + MISSILE_R + 60) { kills++; killFlash = 0.2; game.audio.play('se_tap', 0.8); missiles.splice(i, 1); if (kills >= NEEDED) { finish(true); return; } continue; }
        }
        if (dist < BASE_R + MISSILE_R) { hits++; game.audio.play('se_failure', 0.7); missiles.splice(i, 1); if (hits >= MAX_HIT) { finish(false); return; } }
      }
      if (killFlash > 0) killFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SHOT DOWN ' + kills + ' / ' + NEEDED, W / 2, 96, 48, C.c);
    for (var h = 0; h < MAX_HIT; h++) game.draw.rect(W / 2 + (h - 1) * 64 - 20, 150, 40, 40, h < hits ? C.e : '#330000');
    txt('SWIPE TO SHIELD!', W / 2, H - 60, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
