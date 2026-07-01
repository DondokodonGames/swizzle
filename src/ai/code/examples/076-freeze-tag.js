// 076-freeze-tag.js
// フリーズタグ — 動き回る敵を全員タップして同時に凍らせる
// 操作: タップで敵を凍結、凍った敵は徐々に解凍する
// 成功: 全員同時に凍結状態にする  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'FREEZE TAG';
  var HOW_TO_PLAY = 'TAP ALL FOES TO FREEZE AT ONCE';
  var MAX_TIME = 20;
  var NUM_ENEMIES = 2;         // 修正2: 5体 → 2体（易化）
  var ENEMY_R = 56, FREEZE_TIME = 4.0;
  var MARGIN = 120, TOP = 260, BOT = H - 260;          // 修正1: 縦画面フルに配置

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var enemies, timeLeft, done, winFlash;

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

  function initGame() {
    enemies = [];
    for (var i = 0; i < NUM_ENEMIES; i++) {
      var speed = 150 + Math.random() * 100, ang = Math.random() * Math.PI * 2;
      enemies.push({
        x: MARGIN + Math.random() * (W - MARGIN * 2),
        y: TOP + Math.random() * (BOT - TOP),
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        frozen: 0, frozenMax: 0, jitter: Math.random() * Math.PI * 2
      });
    }
    timeLeft = MAX_TIME; done = false; winFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i], dx = x - e.x, dy = y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < ENEMY_R + 24) {
        e.frozen = FREEZE_TIME; e.frozenMax = FREEZE_TIME; game.audio.play('se_tap', 0.7);
        if (enemies.every(function(en) { return en.frozen > 0; })) { winFlash = 0.5; finish(true); }
        break;
      }
    }
  });

  // 敵モンスターのドット絵スプライト（多矩形）
  function drawMonster(cx, cy, frozen) {
    cx = snap(cx); cy = snap(cy);
    var body = frozen ? C.b : C.e, edge = frozen ? C.c : '#880000';
    // 胴体
    game.draw.rect(cx - 40, cy - 32, 80, 64, body);
    game.draw.rect(cx - 48, cy - 16, 16, 40, body);
    game.draw.rect(cx + 32, cy - 16, 16, 40, body);
    // ツノ
    game.draw.rect(cx - 32, cy - 48, 16, 16, edge);
    game.draw.rect(cx + 16, cy - 48, 16, 16, edge);
    // 足（ギザギザ）
    game.draw.rect(cx - 32, cy + 32, 16, 16, edge);
    game.draw.rect(cx + 16, cy + 32, 16, 16, edge);
    // 目
    game.draw.rect(cx - 24, cy - 16, 16, 16, C.c);
    game.draw.rect(cx + 8, cy - 16, 16, 16, C.c);
    game.draw.rect(cx - 20, cy - 12, 8, 8, '#000000');
    game.draw.rect(cx + 12, cy - 12, 8, 8, '#000000');
    // 口
    game.draw.rect(cx - 16, cy + 12, 32, 8, edge);
    if (frozen) { game.draw.rect(cx - 48, cy - 48, 12, 12, C.c, 0.8); game.draw.rect(cx + 36, cy + 24, 12, 12, C.c, 0.8); }
  }

  // 世界観: 雪原の追いかけっこ。逃げ回るモンスターを全員同時に凍らせる。
  function background() {
    game.draw.clear('#000011');
    if (winFlash > 0) game.draw.rect(0, 0, W, H, C.b, winFlash * 0.3);
    for (var i = 0; i < 30; i++) { var sx = snap((i * 191) % W), sy = snap((i * 271 + game.time.elapsed * 40) % H); game.draw.rect(sx, sy, 8, 8, C.c, 0.15); }
    game.draw.rect(0, snap(BOT) + 40, W, H - BOT - 40, '#001133');
    txt('SNOW FIELD', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var j = 0; j < enemies.length; j++) {
      var en = enemies[j], isFrozen = en.frozen > 0;
      if (isFrozen) {
        var ratio = en.frozen / en.frozenMax;
        drawPixelCircle(en.x, en.y, ENEMY_R + 12, C.b, ratio * 0.3);
        drawMonster(en.x, en.y, true);
        if (ratio < 0.35 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('!', en.x, en.y - ENEMY_R - 20, 48, C.a);
        txt(Math.ceil(en.frozen) + '', en.x, en.y + ENEMY_R + 40, 36, C.c);
      } else {
        drawMonster(en.x, en.y, false);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 30, C.c);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 68, C.g);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.91, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e.frozen > 0) { e.frozen -= dt; if (e.frozen < 0) e.frozen = 0; }
        else {
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x - ENEMY_R < MARGIN) { e.x = MARGIN + ENEMY_R; e.vx = Math.abs(e.vx); }
          if (e.x + ENEMY_R > W - MARGIN) { e.x = W - MARGIN - ENEMY_R; e.vx = -Math.abs(e.vx); }
          if (e.y - ENEMY_R < TOP) { e.y = TOP + ENEMY_R; e.vy = Math.abs(e.vy); }
          if (e.y + ENEMY_R > BOT) { e.y = BOT - ENEMY_R; e.vy = -Math.abs(e.vy); }
          e.jitter += dt * 1.5;
          if (Math.sin(e.jitter) > 0.98) {
            var spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy), a2 = Math.atan2(e.vy, e.vx) + (Math.random() - 0.5) * Math.PI;
            e.vx = Math.cos(a2) * spd; e.vy = Math.sin(a2) * spd;
          }
        }
      }
      if (winFlash > 0) winFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    var frozenCount = enemies.filter(function(e) { return e.frozen > 0; }).length;
    txt('FROZEN ' + frozenCount + ' / ' + NUM_ENEMIES, W / 2, 96, 48, frozenCount === NUM_ENEMIES ? C.b : C.c);
    for (var f = 0; f < NUM_ENEMIES; f++) game.draw.rect(W / 2 + (f - (NUM_ENEMIES - 1) / 2) * 64 - 20, 150, 40, 40, f < frozenCount ? C.b : '#330000');
    txt('FREEZE THEM ALL AT ONCE!', W / 2, H - 90, 42, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
