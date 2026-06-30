// 015-magnet-escape.js
// 磁石逃亡 — 引き寄せる力に逆らいながら脱出する緊張感
// 操作: スワイプで4方向に移動
// 成功: 5秒間磁石に吸い込まれずに生き延びる  失敗: 磁石に触れる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'MAGNET ESCAPE';
  var HOW_TO_PLAY = 'SWIPE TO DODGE';
  var MAX_TIME = 5;          // 修正2: 生存系 15s → 5s
  var PLAYER_R = 44, MOVE_STEP = 240;
  var TOP = 220, BOTTOM = H - 180;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var player, timeLeft, done, magnets, trailPts, magnetSpawnTimer;

  function snap(v) { return Math.round(v / 8) * 8; }
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
    player = { x: W / 2, y: H * 0.72 };  // 修正1: 縦下3分の1始動
    timeLeft = MAX_TIME; done = false; magnets = []; trailPts = []; magnetSpawnTimer = 1.2;
    spawnMagnet();
  }

  function spawnMagnet() {
    var edge = Math.floor(Math.random() * 4), mx, my;
    if (edge === 0) { mx = game.random(80, W - 80); my = TOP - 80; }
    else if (edge === 1) { mx = W + 80; my = game.random(TOP, BOTTOM); }
    else if (edge === 2) { mx = game.random(80, W - 80); my = BOTTOM + 80; }
    else { mx = -80; my = game.random(TOP, BOTTOM); }
    magnets.push({ x: mx, y: my, r: 56, isNorth: Math.random() < 0.5,
      vx: (W / 2 - mx) * 0.12, vy: (H / 2 - my) * 0.12, age: 0 });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 300 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left')  player.x = Math.max(PLAYER_R, player.x - MOVE_STEP);
    if (dir === 'right') player.x = Math.min(W - PLAYER_R, player.x + MOVE_STEP);
    if (dir === 'up')    player.y = Math.max(TOP + PLAYER_R, player.y - MOVE_STEP);
    if (dir === 'down')  player.y = Math.min(BOTTOM - PLAYER_R, player.y + MOVE_STEP);
    game.audio.play('se_tap', 0.4);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() { game.draw.clear(C.bg); }

  // ── ドット絵スプライト: U字マグネット（極の色＋N/S）と自機 ──
  function drawMagnet(x, y, isNorth) {
    var bx = snap(x), by = snap(y), col = isNorth ? C.e : C.a, oth = isNorth ? C.a : C.e;
    game.draw.rect(bx - 48, by - 48, 32, 72, col);     // 左脚
    game.draw.rect(bx + 16, by - 48, 32, 72, oth);     // 右脚
    game.draw.rect(bx - 48, by - 48, 96, 32, '#888888'); // 上の弧(金属)
    game.draw.rect(bx - 48, by + 24, 32, 24, C.g);     // 左極先端
    game.draw.rect(bx + 16, by + 24, 32, 24, C.g);     // 右極先端
    txt(isNorth ? 'N' : 'S', bx, by - 8, 36, C.g);
  }
  function drawMagnets() {
    for (var k = 0; k < magnets.length; k++) drawMagnet(magnets[k].x, magnets[k].y, magnets[k].isNorth);
  }
  function drawPlayerShip(x, y) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - 8,  by - 36, 16, 56, C.d);   // 機体
    game.draw.rect(bx - 36, by - 4,  72, 20, C.d);   // 翼
    game.draw.rect(bx - 12, by - 20, 24, 16, C.c);   // 窓
    game.draw.rect(bx - 8,  by + 20, 16, 12, C.f);   // 噴射
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawPlayerShip(W / 2, H / 2);
      drawMagnet(W / 2 + Math.cos(game.time.elapsed * 2) * 300, H / 2 + Math.sin(game.time.elapsed * 2) * 300, true);
      txt(GAME_TITLE,  W / 2, H * 0.2, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 44, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
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

      magnetSpawnTimer -= dt;
      if (magnetSpawnTimer <= 0 && magnets.length < 5) {
        spawnMagnet();
        magnetSpawnTimer = Math.max(1.0, 2.0 - (MAX_TIME - timeLeft) * 0.15);
      }

      for (var i = magnets.length - 1; i >= 0; i--) {
        var mg = magnets[i]; mg.age += dt;
        var dx = player.x - mg.x, dy = player.y - mg.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var force = 60000 / (dist * dist + 1000);
        mg.vx += (dx / dist) * force * dt; mg.vy += (dy / dist) * force * dt;
        mg.vx *= 0.98; mg.vy *= 0.98;
        mg.x += mg.vx * dt; mg.y += mg.vy * dt;
        if (dist < mg.r + PLAYER_R - 8) { finish(false); return; }
        if (mg.age > 12 || mg.x < -200 || mg.x > W + 200 || mg.y < -200 || mg.y > H + 200) magnets.splice(i, 1);
      }

      trailPts.unshift({ x: player.x, y: player.y });
      if (trailPts.length > 6) trailPts.pop();
    }

    // ---- draw ----
    background();
    for (var t = 0; t < trailPts.length; t++) {
      var tp = trailPts[t], ta = (1 - t / trailPts.length) * 0.4;
      game.draw.rect(snap(tp.x) - 12, snap(tp.y) - 12, 24, 24, C.f, ta);
    }
    drawMagnets();
    drawPlayerShip(player.x, player.y);
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt('SWIPE TO ESCAPE!', W / 2, H - 120, 48, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
