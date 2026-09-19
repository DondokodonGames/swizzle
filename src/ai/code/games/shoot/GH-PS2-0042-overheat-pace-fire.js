// GH-PS2-0042-overheat-pace-fire.js
// オーバーヒートペース — 銃身が焼き切れる前に、間隔を空けてタップで迎撃する
// 操作: 画面のどこでもタップで自動照準射撃。連打すると銃身が過熱して撃てなくなる
// 終わり: 防衛ラインが3回破られると失敗。制限時間まで守り切れば成功
// @mechanic: cooldown_tap
// @theme: barrier_turret
// 世界観: 荒野の防衛柵。旧式タレットは銃身が熱くなるとロックする。迫る機体を、連打せず間を置いて狙い撃つしかない
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃墜数のスコア
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s VECTOR: 黒地に発光する線画のみ。塗りを使わない(最小限の塗りは可視性のため例外)
  var C = {
    bg: '#02040a', grid: '#0a2438', line: '#2dffea', lineDim: '#0f6a5e',
    enemy: '#ff2d55', enemyGlow: '#ff8ca6', gold: '#ffd400',
    good: '#2dffea', bad: '#ff2d55', white: '#eafffb', ink: '#000000', heat: '#ff9a2d',
  };

  var GAME_TITLE = 'OVERHEAT PACE';
  var MAX_TIME = 13;
  var BARRIER_Y = H * 0.62;
  var SPAWN_Y = H * 0.16;
  var HEAT_MAX = 100, HEAT_PER_SHOT = 34, COOL_RATE = 42;
  var LIVES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var enemies, heat, overheated, kills, lives, combo, totalTime, done, endWait, finished, ok, spawnTimer;
  var ready, hitStop, shake, muzzleT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHIP = ['..#..', '.###.', '#####', '.#.#.'];

  function scanBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#01030a']]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), C.grid, 1);
    for (var j = 0; j < 6; j++) game.draw.line(j * (W / 6), 0, j * (W / 6), H, C.grid, 1);
    game.draw.line(0, BARRIER_Y, W, BARRIER_Y, C.lineDim, 5);
  }

  function initGame() {
    enemies = []; heat = 0; overheated = false; kills = 0; lives = LIVES; combo = 0;
    totalTime = 0; done = false; endWait = 0; finished = false; ok = false; spawnTimer = 0.4;
    ready = 0.8; hitStop = 0; shake = 0; muzzleT = 0;
  }

  function spawnEnemy() {
    var golden = Math.random() < 0.12;
    enemies.push({
      x: 120 + Math.random() * (W - 240), y: SPAWN_Y, t: 0,
      speed: 0.11 + Math.random() * 0.06 + totalTime * 0.006, gold: golden, warned: false,
    });
  }

  function nearestEnemy() {
    var best = null, bd = 1e9;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var d = BARRIER_Y - e.y;
      if (d >= 0 && d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function fire(x, y) {
    muzzleT = 0.08;
    if (overheated) {
      game.feedback.bad(x, y, { text: 'HOT' });
      game.audio.play('se_bad', 0.35);
      return;
    }
    heat = Math.min(HEAT_MAX, heat + HEAT_PER_SHOT);
    if (heat >= HEAT_MAX) overheated = true;
    var target = nearestEnemy();
    if (target) {
      enemies.splice(enemies.indexOf(target), 1);
      kills++; combo++;
      hitStop = 0.06;
      var mult = target.gold ? 3 : 1;
      var gained = 100 * mult;
      game.feedback.good(target.x, target.y, { text: target.gold ? 'GOLD x3' : (combo % 6 === 0 ? 'PERFECT' : 'HIT'), color: target.gold ? C.gold : C.good });
      game.fx.burst(target.x, target.y, { color: target.gold ? C.gold : C.line, count: 14, speed: 380 });
      game.audio.play('se_break', 0.45);
      if (kills === 8) { game.fx.popup(kills + ' KILLS', W / 2, H * 0.24, { color: C.gold, size: 48 }); game.audio.play('se_milestone', 0.5); }
      finalScoreLive(gained);
    } else {
      game.audio.play('se_tap', 0.2);
    }
  }

  var liveScore = 0;
  function finalScoreLive(g) { liveScore += g; }

  function breach(e) {
    lives--;
    combo = 0;
    hitStop = 0.35; shake = 0.32;
    game.feedback.bad(e.x, BARRIER_Y, { text: 'BREACH' });
    game.fx.flash(C.bad, 0.22);
    game.audio.play('se_bad', 0.5);
    if (lives <= 0) { ok = false; finished = true; finish(); }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = liveScore + lives * 50;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    if (done || ready > 0 || finished) return;
    fire(x, y);
  });

  function drawEnemy(e) {
    var scale = 0.5 + 0.6 * Math.min(1, e.t);
    var warn = e.t > 0.75 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.sprite(SHIP, { '#': e.gold ? C.gold : (warn ? C.white : C.enemy) }, e.x, e.y, 16 * scale, { anchor: 'center' });
    game.draw.circle(e.x, e.y, 30 * scale, e.gold ? C.gold : C.enemyGlow, 0.18);
  }

  function drawTurret(hotFrac) {
    var tx = W / 2, ty = H * 0.86;
    game.draw.line(tx - 60, ty, tx + 60, ty, C.line, 8);
    game.draw.circle(tx, ty, 34, C.bg);
    game.draw.circle(tx, ty, 34, C.line, 0.5);
    game.draw.rect(tx - 70, ty + 40, 140, 14, C.grid);
    game.draw.rect(tx - 70, ty + 40, 140 * hotFrac, 14, overheated ? C.bad : C.heat);
    if (muzzleT > 0) game.draw.circle(tx, ty - 40, 40, C.white, muzzleT * 4);
  }

  // ── ATTRACT ゴースト実演: 実際の fire() を使い、連打→過熱失敗→間隔を空けた成功を見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { enemies = []; heat = 0; overheated = false; kills = 0; lives = LIVES; spawnTimer = 0; liveScore = 0; }
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = 1.0; }
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      e.t += 0.16 * dt / 0.016 * 0.016;
      e.y = SPAWN_Y + (BARRIER_Y - SPAWN_Y) * Math.min(1, e.t);
    }
    demo.press = false;
    if (Math.abs(cyc - 0.4) < dt) { fire(W / 2, H * 0.5); demo.press = true; }
    if (Math.abs(cyc - 0.6) < dt) { fire(W / 2, H * 0.5); demo.press = true; } // 連打→過熱の失敗例
    if (Math.abs(cyc - 2.4) < dt) { fire(W / 2, H * 0.5); demo.press = true; } // 冷めてから成功
    if (overheated && heat < HEAT_MAX * 0.5) overheated = false;
    heat = Math.max(0, heat - COOL_RATE * dt);
    if (heat <= 0) overheated = false;
    for (var j = enemies.length - 1; j >= 0; j--) if (enemies[j].t >= 1) enemies.splice(j, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (enemies === undefined) initGame();
      scanBg();
      stepDemo(dt);
      for (var i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
      drawTurret(heat / HEAT_MAX);
      if (muzzleT > 0) muzzleT -= dt;
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 34, demo.gy + Math.sin(game.time.elapsed * 2.5) * 34, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 50, C.white);
      txt('BEST ' + String(game.best).padStart(4, '0'), W / 2, H * 0.135, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      scanBg();
      for (var k = 0; k < enemies.length; k++) drawEnemy(enemies[k]);
      drawTurret(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt('SCORE ' + String(finalScore).padStart(5, '0'), W / 2, H * 0.15, 32, C.white);
      txt(kills + ' KILLS', W / 2, H * 0.20, 26, C.gold);
      if (!ok && lives === 0 && kills >= 5) txt('あと少し!', W / 2, H * 0.25, 28, C.gold);
      var best = Math.max(game.best, finalScore);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.30, 28, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { kills: kills }); else game.end.failure({ score: finalScore, kills: kills });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { ok = true; finished = true; finish(); }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = Math.max(0.42, 0.9 - totalTime * 0.03); }
      heat = Math.max(0, heat - COOL_RATE * dt);
      if (overheated && heat <= HEAT_MAX * 0.35) overheated = false;
      for (var e2i = enemies.length - 1; e2i >= 0; e2i--) {
        var e2 = enemies[e2i];
        e2.t += e2.speed * dt;
        e2.y = SPAWN_Y + (BARRIER_Y - SPAWN_Y) * Math.min(1, e2.t);
        if (e2.t >= 1) { enemies.splice(e2i, 1); breach(e2); }
      }
    }
    if (shake > 0) shake -= dt;
    if (muzzleT > 0) muzzleT -= dt;

    scanBg();
    for (var e3 = 0; e3 < enemies.length; e3++) drawEnemy(enemies[e3]);
    drawTurret(heat / HEAT_MAX);

    txt('SCORE ' + String(liveScore).padStart(5, '0'), W / 2, 100, 34, C.white);
    for (var l = 0; l < LIVES; l++) game.draw.circle(W - 70 - l * 46, 100, 14, l < lives ? C.good : C.grid, l < lives ? 1 : 0.5);
    txt(Math.round(totalTime) + ' / ' + MAX_TIME, W * 0.18, 100, 26, C.white, 'left');

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 70, C.gold);
    if (overheated && Math.floor(game.time.elapsed * 6) % 2 === 0) game.draw.rect(0, H * 0.30, W, 50, C.bad, 0.18);
  });

  game.onStart(function() {
    game.audio.melody(
      [['A3', 0.2], ['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['D4', 0.2], ['C4', 0.2]],
      { tempo: 140, wave: 'sawtooth', volume: 0.05, loop: true, bass: [['A2', 0.4], ['E2', 0.4]], bassWave: 'square', bassVolume: 0.05 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
