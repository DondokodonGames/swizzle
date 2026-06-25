// 042-wave-ride.js
// ウェーブライド — 波に乗って障害物をくぐり抜ける波乗りの爽快感
// 操作: タップで波の上に乗る/外れる（2ポジション切り替え）
// 成功: 20秒生存  失敗: 岩に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020c18',
    deepSea: '#051828',
    wave:    '#0ea5e9',
    waveHi:  '#7dd3fc',
    foam:    '#e0f2fe',
    player:  '#fbbf24',
    playerHi:'#fef3c7',
    rock:    '#44403c',
    rockHi:  '#78716c',
    good:    '#22c55e',
    danger:  '#ef4444',
    ui:      '#475569'
  };

  var WAVE_SPEED = 2.2;     // wave phase speed
  var SCROLL_SPEED = 360;   // background scroll speed
  var PLAYER_R = 44;
  var ROCK_W = 80, ROCK_H = 100;

  // Player position: 0 = on wave (high), 1 = in trough (low)
  var onWave = true;  // true = riding wave crest, false = in trough

  // Wave function at x=W*0.25 (player position)
  var wavePhase = 0;
  function getWaveY(x, phase) {
    return H * 0.5 + Math.sin(x / 180 + phase) * 120 + Math.sin(x / 90 + phase * 1.7) * 50;
  }

  var PLAYER_X = W * 0.22;

  var rocks = [];
  var rockSpawnTimer = 2.0;
  var scrollX = 0;

  var timeLeft = 20;
  var done = false;
  var hitFlash = 0;

  function spawnRock() {
    // Rock spawns at right edge, at wave crest OR trough
    var atCrest = Math.random() < 0.5;
    rocks.push({ x: W + ROCK_W, atCrest: atCrest, hit: false });
  }

  game.onTap(function(x, y) {
    if (done) return;
    onWave = !onWave;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300); }, 300);
        return;
      }
    }

    wavePhase += WAVE_SPEED * dt;
    scrollX += SCROLL_SPEED * dt;

    // Rock spawning
    rockSpawnTimer -= dt;
    if (rockSpawnTimer <= 0) {
      spawnRock();
      rockSpawnTimer = 0.9 + Math.random() * 1.0;
    }

    // Move rocks
    for (var i = rocks.length - 1; i >= 0; i--) {
      rocks[i].x -= SCROLL_SPEED * dt;
      if (rocks[i].x < -ROCK_W * 2) rocks.splice(i, 1);
    }

    // Player Y based on wave
    var crestY = getWaveY(PLAYER_X, wavePhase) - 60;
    var troughY = getWaveY(PLAYER_X, wavePhase) + 80;
    var playerY = onWave ? crestY : troughY;

    // Collision check
    for (var j = 0; j < rocks.length; j++) {
      var rock = rocks[j];
      var rockY = rock.atCrest ? getWaveY(rock.x, wavePhase) - 50 : getWaveY(rock.x, wavePhase) + 70;

      var dx = PLAYER_X - rock.x;
      var dy = playerY - rockY;
      if (Math.abs(dx) < (PLAYER_R + ROCK_W / 2) * 0.75 &&
          Math.abs(dy) < (PLAYER_R + ROCK_H / 2) * 0.7) {
        done = true;
        hitFlash = 1.0;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    if (hitFlash > 0) hitFlash -= dt * 3;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.deepSea, 0.7);

    // Background ocean depth lines
    for (var d = 0; d < 6; d++) {
      var lineY = H * 0.35 + d * 60;
      game.draw.rect(0, lineY, W, 3, '#0a2040', 0.4);
    }

    // Wave surface (multiple passes for depth)
    for (var wx = 0; wx <= W + 40; wx += 40) {
      var wy1 = getWaveY(wx + (scrollX % 360), wavePhase);
      var wy2 = getWaveY(wx + 40 + (scrollX % 360), wavePhase);
      // Wave body (fill below)
      game.draw.line(wx, wy1, wx + 40, wy2, C.wave, 8);
      // Foam on crest
      if (wy1 < wy2 - 10) {
        game.draw.circle(wx + 8, wy1, 12, C.foam, 0.5);
      }
    }

    // Water body below wave
    for (var wy = 0; wy < 12; wy++) {
      var wLineY = getWaveY(W / 2 + (scrollX % 360), wavePhase) + wy * 40;
      if (wLineY < H) {
        game.draw.rect(0, wLineY, W, 40, C.wave, 0.04 + wy * 0.02);
      }
    }

    // Rocks
    for (var r = 0; r < rocks.length; r++) {
      var rock2 = rocks[r];
      var ry = rock2.atCrest ?
        getWaveY(rock2.x, wavePhase) - 50 :
        getWaveY(rock2.x, wavePhase) + 70;

      // Shadow
      game.draw.rect(rock2.x - ROCK_W/2 + 8, ry + 12, ROCK_W, ROCK_H, '#000', 0.4);
      // Rock body
      game.draw.rect(rock2.x - ROCK_W/2, ry - ROCK_H/2, ROCK_W, ROCK_H, C.rock);
      game.draw.rect(rock2.x - ROCK_W/2 + 12, ry - ROCK_H/2 + 12, ROCK_W - 24, ROCK_H * 0.3, C.rockHi, 0.4);
    }

    // Player (surfer)
    var crestY2 = getWaveY(PLAYER_X, wavePhase) - 60;
    var troughY2 = getWaveY(PLAYER_X, wavePhase) + 80;
    var py3 = onWave ? crestY2 : troughY2;

    // Surfboard
    game.draw.rect(PLAYER_X - 60, py3 + PLAYER_R - 16, 120, 20, '#f97316');
    game.draw.rect(PLAYER_X - 48, py3 + PLAYER_R - 12, 96, 12, '#fb923c');

    // Player body
    game.draw.circle(PLAYER_X, py3, PLAYER_R + 8, C.playerHi, 0.2);
    game.draw.circle(PLAYER_X, py3, PLAYER_R, C.player);
    game.draw.circle(PLAYER_X, py3 - 20, PLAYER_R * 0.45, C.playerHi, 0.7);

    // Position indicator
    if (onWave) {
      game.draw.text('波上', W * 0.05, py3 - 60, { size: 36, color: C.waveHi });
    } else {
      game.draw.text('波谷', W * 0.05, py3 - 60, { size: 36, color: C.deepSea });
    }

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.3);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#020c18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wave : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップで波乗り切替！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    spawnRock();
  });
})(game);
