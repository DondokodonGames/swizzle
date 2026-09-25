// D-20172021-0046-foundry-juggle-beat.js
// ファウンドリージャグルビート — 廃工場を根城にする拳闘士が、タメの明けた瞬間だけ拳を放ち敵を空中に打ち上げ続ける
// 操作: 中央のタメゲージが満タンに光った瞬間だけタップする。連打は不発になるので我慢して待つ
// 終わり: 規定回数を打ち上げ続けられれば成功。待てずに連打が続くか、拍を落とし過ぎれば失敗
// @mechanic: cooldown_tap
// @theme: foundry_juggle_beat
// 世界観: 廃工場を根城にする拳闘士が、間合いを計って一撃ごとにタメを作り、明けた瞬間の拳だけで敵を空中に打ち上げ続けてコンボを繋ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち上げ数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var C = {
    bg1: '#3a2418', bg2: '#1a0f0a', floor: '#241812', floorEdge: '#0f0906',
    fighter: '#e0965a', fighterDark: '#8a4a20', enemy: '#7a3fbf', enemyDark: '#4a2280',
    ring: '#ffb04a', ringDim: '#5a3a1a',
    good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#fff0d8', white: '#ffffff',
  };

  var GAME_TITLE = 'JUGGLE BEAT';
  var COOLDOWN = 1.05;
  var READY_WINDOW = 0.35;
  var REPEATS = 6;
  var TIME_LIMIT = REPEATS * (COOLDOWN + READY_WINDOW) + 1.3;
  var NEEDED = 4;
  var BTN = { x: W * 0.5, y: H * 0.83, r: 150 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIGHTER_A = ['..#..', '.###.', '#####', '.#.#.', '.#.#.'];
  var FIGHTER_B = ['..#..', '#####', '.###.', '.#.#.', '#...#'];
  var ENEMY_S = ['#.#.#', '#####', '.###.', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(0, H * 0.62, W, H * 0.30, C.floor, 1);
    game.draw.rect(0, H * 0.62, W, 8, C.floorEdge, 1);
    for (var i = 0; i < 4; i++) game.draw.rect(W * (0.1 + i * 0.28), H * 0.15, 40, H * 0.45, C.bg1, 0.6);
  }

  var cooldown, cycleIdx, hits, misses, whiffGuard, comboHeight, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function drawGauge() {
    var pct = 1 - Math.max(0, cooldown / COOLDOWN);
    var isReady = cooldown <= 0;
    game.draw.circle(BTN.x, BTN.y, BTN.r + 14, isReady ? C.ring : C.ringDim, isReady ? 0.7 : 0.4);
    game.draw.circle(BTN.x, BTN.y, BTN.r, C.fighterDark, 1);
    game.draw.circle(BTN.x, BTN.y, BTN.r * Math.max(0.15, pct), isReady ? C.ring : C.fighter, 1);
    var frame = Math.sin(game.time.elapsed * 6) > 0 ? FIGHTER_A : FIGHTER_B;
    game.draw.sprite(frame, { '#': C.ink }, BTN.x, BTN.y, 20, { anchor: 'center' });
  }

  function drawEnemy() {
    var y = H * 0.50 - comboHeight * 26;
    var bob = Math.sin(game.time.elapsed * 4) * 6;
    game.draw.circle(W * 0.5, H * 0.62, 44 * (1 - comboHeight * 0.05), '#000', 0.25);
    game.draw.sprite(ENEMY_S, { '#': C.enemy }, W * 0.5, y + bob, 34, { anchor: 'center' });
  }

  function initGame() {
    cooldown = COOLDOWN; cycleIdx = 0; hits = 0; misses = 0; whiffGuard = 0; comboHeight = 0;
    roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function land(success) {
    cycleIdx++;
    if (success) {
      hits++; comboHeight = Math.min(6, comboHeight + 1);
      game.feedback.good(W * 0.5, H * 0.5 - comboHeight * 26, { text: 'HIT', color: C.good });
      game.fx.burst(W * 0.5, H * 0.5 - comboHeight * 26, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.32);
      hitStop = 0.12;
      if (!halfCalled && hits >= Math.ceil(NEEDED / 2)) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= NEEDED && !finished) { ok = true; finished = true; finish(); }
    } else {
      misses++; comboHeight = 0;
      game.feedback.bad(BTN.x, BTN.y - 180, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.18; shake = 0.16;
    }
    cooldown = COOLDOWN;
  }

  function tryPunch() {
    if (whiffGuard > 0) return;
    if (cooldown <= 0 && cooldown > -READY_WINDOW) {
      land(true);
    } else {
      whiffGuard = 0.25;
      comboHeight = 0;
      game.feedback.bad(BTN.x, BTN.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      shake = 0.1;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { game.audio.play('se_tap', 0.05); tryPunch(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTN.x, gy: BTN.y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (COOLDOWN + READY_WINDOW + 0.4);
    if (cyc < dt || demo.t <= dt) resetDemo();
    cooldown = COOLDOWN - cyc;
    demo.gx = BTN.x; demo.gy = BTN.y;
    var pressAt = COOLDOWN + 0.08;
    demo.press = cyc > pressAt - 0.12 && cyc < pressAt + 0.12;
    if (cyc >= pressAt - dt && cyc < pressAt + dt) tryPunch();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cooldown === undefined) initGame();
      stepDemo(dt);
      bg();
      drawEnemy();
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.145, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEnemy();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.155, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - hits) + '発!', W / 2, H * 0.20, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (whiffGuard > 0) whiffGuard -= dt;

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses });
        else game.end.failure({ hits: hits, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      cooldown -= dt;
      if (cooldown <= -READY_WINDOW) land(false);
      if (roundClock >= TIME_LIMIT && !finished) {
        ok = hits >= NEEDED;
        finished = true;
        if (!ok) game.audio.play('se_failure', 0.3);
        finish();
      }
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 14 * shake; }

    bg();
    drawEnemy();
    drawGauge();
    txt(hits + ' / ' + NEEDED, W * 0.5, H * 0.065, 32, C.white);
    var barW = W - 140;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(70, 150, barW, 16, '#241812', 1);
    game.draw.rect(70, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['E3', 0.2], ['G3', 0.2], ['B3', 0.4]], { tempo: 120, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
