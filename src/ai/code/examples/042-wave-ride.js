// 042-wave-ride.js
// ウェーブライド — 波に乗って障害物をくぐり抜ける波乗りの爽快感
// 操作: タップで波の上に乗る/外れる（2ポジション切り替え）
// 成功: 5秒生存  失敗: 岩に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'WAVE RIDE';
  var HOW_TO_PLAY = 'TAP TO SWITCH CREST/TROUGH';
  var MAX_TIME = 5;          // 修正2: 生存系 20s → 5s
  var WAVE_SPEED = 2.2, SCROLL_SPEED = 400, PLAYER_R = 48, ROCK_W = 96, ROCK_H = 120;
  var PLAYER_X = W * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var onWave, wavePhase, rocks, rockSpawnTimer, scrollX, timeLeft, done, hitFlash;

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

  function getWaveY(x, phase) { return H * 0.55 + Math.sin(x / 180 + phase) * 160 + Math.sin(x / 90 + phase * 1.7) * 70; }

  function initGame() {
    onWave = true; wavePhase = 0; rocks = []; rockSpawnTimer = 1.2; scrollX = 0; timeLeft = MAX_TIME; done = false; hitFlash = 0;
    spawnRock();
  }
  function spawnRock() { rocks.push({ x: W + ROCK_W, atCrest: Math.random() < 0.5 }); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 300 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    onWave = !onWave; game.audio.play('se_tap', 0.5);
  });

  // 世界観: 大海原のサーフィン。波の山と谷を切り替えて岩を避ける。
  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, H, C.a, 0.25);   // 深い海
    for (var d = 0; d < 6; d++) game.draw.rect(0, H * 0.35 + d * 80, W, 3, C.a, 0.3);
    // 波面
    for (var wx = 0; wx <= W + 40; wx += 40) {
      var wy1 = getWaveY(wx + (scrollX % 360), wavePhase), wy2 = getWaveY(wx + 40 + (scrollX % 360), wavePhase);
      game.draw.line(wx, wy1, wx + 40, wy2, C.b, 10);
      if (wy1 < wy2 - 10) game.draw.rect(snap(wx) - 6, snap(wy1) - 6, 16, 16, C.c, 0.6);  // 泡
    }
  }

  function drawSurfer(x, y) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - 64, by + PLAYER_R - 16, 128, 20, C.f);          // サーフボード
    drawPixelCircle(bx, by, PLAYER_R, C.d, 1);                          // 体
    game.draw.rect(bx - 16, by - 12, 12, 12, '#000000');               // 目
    game.draw.rect(bx + 4,  by - 12, 12, 12, '#000000');
    game.draw.rect(bx - 12, by + 12, 24, 6, '#000000');               // 口
  }

  function drawRocks() {
    for (var r = 0; r < rocks.length; r++) {
      var rk = rocks[r], ry = rk.atCrest ? getWaveY(rk.x, wavePhase) - 70 : getWaveY(rk.x, wavePhase) + 90;
      var bx = snap(rk.x), by = snap(ry);
      game.draw.rect(bx - ROCK_W / 2 + 8, by - ROCK_H / 2 + 8, ROCK_W - 16, ROCK_H - 16, '#555577'); // 岩
      game.draw.rect(bx - ROCK_W / 2, by - ROCK_H / 2 + 16, ROCK_W, ROCK_H - 32, '#555577');
      game.draw.rect(bx - 16, by - 16, 16, 16, C.c, 0.3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rocks) initGame();
      background();
      drawSurfer(PLAYER_X, getWaveY(PLAYER_X, game.time.elapsed * WAVE_SPEED) - 70);
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 36, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
    var playerY = onWave ? getWaveY(PLAYER_X, wavePhase) - 70 : getWaveY(PLAYER_X, wavePhase) + 90;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      wavePhase += WAVE_SPEED * dt; scrollX += SCROLL_SPEED * dt;
      rockSpawnTimer -= dt;
      if (rockSpawnTimer <= 0) { spawnRock(); rockSpawnTimer = 0.7 + Math.random() * 0.7; }
      for (var i = rocks.length - 1; i >= 0; i--) { rocks[i].x -= SCROLL_SPEED * dt; if (rocks[i].x < -ROCK_W * 2) rocks.splice(i, 1); }
      for (var j = 0; j < rocks.length; j++) {
        var rk = rocks[j], ry = rk.atCrest ? getWaveY(rk.x, wavePhase) - 70 : getWaveY(rk.x, wavePhase) + 90;
        if (Math.abs(PLAYER_X - rk.x) < (PLAYER_R + ROCK_W / 2) * 0.7 && Math.abs(playerY - ry) < (PLAYER_R + ROCK_H / 2) * 0.7) { hitFlash = 1.0; finish(false); return; }
      }
      if (hitFlash > 0) hitFlash -= dt * 3;
    }

    // ---- draw ----
    background();
    drawRocks();
    drawSurfer(PLAYER_X, playerY);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.e, hitFlash * 0.3);
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt(onWave ? 'ON CREST' : 'IN TROUGH', W / 2, H - 120, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
