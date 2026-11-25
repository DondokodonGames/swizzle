// D-20222026-0025-elemental-strike-call.js
// エレメンタルストライクコール — 前衛に構える一党を率い、敵の纏う気を見切って相性の勝る一撃を叫ぶ
// 操作: 画面下の3つの技アイコンから、敵の色/意匠に相性で勝る技を1つタップする
// 終わり: 相性で勝る技を選べば成功。外れ/時間切れは失敗
// @mechanic: judge
// @theme: fantasy_party_elemental_command
// 世界観: 傭兵の一党を率いる隊長が、前衛に構えた仲間越しに敵の纏う気配を見極め、相性の勝る技をただ一度だけ叫ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 選んだ技
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 濃いめの彩度、太い輪郭無し、パレット限定4〜6色
  var C = {
    bg: '#2a1840', bg2: '#160c28', panel: '#3a2458', panelLine: '#5a3a80',
    flame: '#ff5a3c', flameDk: '#a02818', wave: '#3ca0ff', waveDk: '#1858a0',
    gale: '#5ce07a', galeDk: '#20903c',
    good: '#5ce07a', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f4ecff', panelText: '#f4ecff',
  };

  var ELEMS = ['flame', 'wave', 'gale'];
  // 三すくみ: flame beats gale, gale beats wave, wave beats flame
  var BEATS = { flame: 'gale', gale: 'wave', wave: 'flame' };
  function colorOf(e) { return e === 'flame' ? C.flame : e === 'wave' ? C.wave : C.gale; }
  function dkOf(e) { return e === 'flame' ? C.flameDk : e === 'wave' ? C.waveDk : C.galeDk; }

  var GAME_TITLE = 'STRIKE CALL';
  var MAX_TIME = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#100820', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ENEMY = ['.####.', '##..##', '######', '#.##.#', '.#..#.'];
  var ALLY = ['.##.', '####', '.##.', '#..#'];
  var FLAME_ICON = ['..#..', '.###.', '#####', '.###.'];
  var WAVE_ICON = ['#...#', '##.##', '.###.', '..#..'];
  var GALE_ICON = ['.#.#.', '#####', '.#.#.', '#####'];
  function iconOf(e) { return e === 'flame' ? FLAME_ICON : e === 'wave' ? WAVE_ICON : GALE_ICON; }

  var ZONE_Y = H * 0.84, ZONE_R = 110;
  function zoneX(i) { return W * (0.22 + i * 0.28); }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.4);
    // 隊列(パーティ)の飾り: 3人の仲間が前衛で構える。演出のみ、直接操作しない
    for (var i = 0; i < 3; i++) {
      var ax = W * (0.28 + i * 0.22);
      var ay = H * 0.58 + Math.sin(game.time.elapsed * 2 + i) * 6;
      game.draw.sprite(ALLY, { '#': i === 1 ? C.gold : '#d8c8ff' }, ax, ay, 12, { anchor: 'center' });
    }
  }

  var enemyElem, enemyIdx, chosen, correctIdx, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake, telegraph;

  function newRound() {
    enemyElem = ELEMS[Math.floor(Math.random() * ELEMS.length)];
    var order = ELEMS.slice().sort(function() { return Math.random() - 0.5; });
    enemyIdx = order;
    correctIdx = order.indexOf(BEATS[enemyElem]);
  }

  function initGame() {
    newRound();
    chosen = -1;
    roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; telegraph = 0;
  }

  function drawScene() {
    bg();
    var ex = W * 0.5, ey = H * 0.32;
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.circle(ex, ey + 60, 130, dkOf(enemyElem), 0.35);
    game.draw.sprite(ENEMY, { '#': colorOf(enemyElem) }, ex, ey + bob, 20, { anchor: 'center' });
    game.draw.sprite(iconOf(enemyElem), { '#': colorOf(enemyElem) }, ex, ey - 150, 14, { anchor: 'center' });
    if (telegraph > 0) {
      var tp = 1 - telegraph / 0.6;
      game.draw.circle(ex, ey + bob, 140 + tp * 40, colorOf(enemyElem), 0.25 * (1 - tp));
    }
    for (var i = 0; i < 3; i++) {
      var e = enemyIdx[i];
      var zx = zoneX(i);
      var picked = chosen === i;
      var col = picked ? (i === correctIdx ? C.good : C.bad) : C.panel;
      game.draw.circle(zx, ZONE_Y, ZONE_R, col);
      game.draw.circle(zx, ZONE_Y, ZONE_R, colorOf(e), 0.18);
      game.draw.sprite(iconOf(e), { '#': colorOf(e) }, zx, ZONE_Y, 16, { anchor: 'center' });
    }
  }

  function resolve(i, hx, hy) {
    chosen = i;
    finished = true;
    if (i === correctIdx) {
      ok = true; hitStop = 0.35;
      game.feedback.good(hx, hy, { text: 'GOOD', color: C.good, shake: 4 });
      game.fx.burst(hx, hy, { color: colorOf(BEATS[enemyElem]), count: 24, speed: 420 });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; hitStop = 0.4; shake = 0.3;
      game.feedback.bad(hx, hy, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      for (var i = 0; i < 3; i++) {
        var d = Math.hypot(x - zoneX(i), y - ZONE_Y);
        if (d < ZONE_R) { game.audio.play('se_tap', 0.2); resolve(i, x, y); return; }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: zoneX(0), gy: ZONE_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    telegraph = Math.max(0, 0.6 - cyc);
    if (cyc < 2.2) {
      demo.gx = W * 0.5; demo.gy = H * 0.6; demo.press = false;
    } else if (cyc < 2.9) {
      var t2 = (cyc - 2.2) / 0.7;
      demo.gx = W * 0.5 + (zoneX(correctIdx) - W * 0.5) * t2;
      demo.gy = H * 0.6 + (ZONE_Y - H * 0.6) * t2;
      demo.press = false;
    } else if (cyc < 3.05) {
      demo.press = true;
      if (chosen !== correctIdx) resolve(correctIdx, zoneX(correctIdx), ZONE_Y);
    } else {
      demo.gx = zoneX(correctIdx); demo.gy = ZONE_Y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      if (!ok) txt('あと1手!', W / 2, H * 0.14, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(1, { correct: 1 });
        else game.end.failure({ correct: 0 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (telegraph > 0) telegraph -= dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.32, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (roundClock >= MAX_TIME * 0.6 && telegraph <= 0 && roundClock < MAX_TIME * 0.6 + dt) {
        telegraph = 0.6;
        game.audio.play('se_tap', 0.15);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W * 0.5, H * 0.32, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.panelLine, 0.4);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
