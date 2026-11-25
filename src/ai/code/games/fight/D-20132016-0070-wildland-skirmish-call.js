// D-20132016-0070-wildland-skirmish-call.js
// ワイルドランド・スカーミッシュコール — 荒野の一戦、敵の攻め手を読んで得意属性で迎え撃つ
// 操作: 敵が繰り出す属性を見て、それに勝る属性の札ゾーンをタップする
// 終わり: 3手のうち2手以上を制すれば部隊の勝利。2敗すれば壊滅
// @mechanic: judge
// @theme: wildland_skirmish_call
// 世界観: 荒野を行く傭兵小隊の一度きりの遭遇戦。隊長は敵部隊の得意技を見切り、火・水・風の三つ巴で応戦する
// 残るもの: 正誤(CLEAR/GAME OVER) + 制した手数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色高彩度、2〜3層の背景で奥行き
  var C = {
    bg: '#2a1a10', bg2: '#4a2c18', ridge: '#3a2416', ridge2: '#523018',
    fire: '#ff5a2e', water: '#2e9aff', wind: '#3aff8a',
    ally: '#e0a860', enemy: '#8a3a4a', gold: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', white: '#fff2e0', ink: '#0a0402',
  };
  var EL = ['fire', 'water', 'wind'];
  var EL_COLOR = { fire: C.fire, water: C.water, wind: C.wind };
  var BEATS = { fire: 'wind', water: 'fire', wind: 'water' }; // key が勝つ相手

  var GAME_TITLE = 'SKIRMISH CALL';
  var CX = W * 0.5;
  var TOTAL = 3;
  var ROUND_TIME = 2.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];
  var ENEMY_FRAMES = [
    ['.####.', '##..##', '.####.', '#.##.#', '##..##'],
    ['.####.', '##..##', '.####.', '#.##.#', '.#..#.'],
  ];

  var round, wins, losses, enemyEl, roundT, telegraphed, resolved, lastResult;
  var finished, done, endWait, hitStop, shake, ready;

  function newRound() {
    enemyEl = EL[Math.floor(game.random(0, 3))];
    roundT = 0; telegraphed = false; resolved = false; lastResult = null;
  }

  function initGame() {
    round = 0; wins = 0; losses = 0; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.5, W, H * 0.14, C.ridge2, 0.6);
    game.draw.rect(0, H * 0.58, W, H * 0.2, C.ridge, 0.7);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawFighters() {
    var bobY = Math.sin(game.time.elapsed * 2.2) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 3;
    game.draw.sprite(ALLY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.ally }, W * 0.28 + swayX, H * 0.42 + bobY, 15, { anchor: 'center' });
    var flash = telegraphed && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.sprite(ENEMY_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': flash ? C.gold : C.enemy }, W * 0.72 - swayX, H * 0.42 + bobY, 15, { anchor: 'center' });
    game.draw.circle(W * 0.72, H * 0.3, 26, EL_COLOR[enemyEl]);
  }

  function zoneX(el) { return { fire: W * 0.22, water: W * 0.5, wind: W * 0.78 }[el]; }

  function drawZones(allowInput) {
    var zy = H * 0.8, zw = 220, zh = 130;
    for (var i = 0; i < EL.length; i++) {
      var el = EL[i], x = zoneX(el);
      game.draw.rect(x - zw / 2, zy - zh / 2, zw, zh, C.ink, 0.5);
      game.draw.rect(x - zw / 2, zy - zh / 2, zw, zh, EL_COLOR[el], 0.35);
      game.draw.circle(x, zy, 34, EL_COLOR[el]);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveChoice(chosenEl) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var correct = BEATS[chosenEl] === enemyEl;
    hitStop = correct ? 0.14 : 0.35;
    lastResult = correct;
    if (correct) {
      wins++;
      game.feedback.good(zoneX(chosenEl), H * 0.8, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.72, H * 0.42, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (wins === 2) { game.fx.popup('あと1本!', CX, H * 0.24, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    } else {
      losses++;
      game.feedback.bad(zoneX(chosenEl), H * 0.8, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    round++;
    if (wins >= 2) { ok = true; finished = true; finish(); return; }
    if (losses >= 2) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = wins > losses; finished = true; finish(); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    var best = null, bestD = 1e9;
    for (var i = 0; i < EL.length; i++) {
      var d = Math.hypot(x - zoneX(EL[i]), y - H * 0.8);
      if (d < bestD) { bestD = d; best = EL[i]; }
    }
    if (bestD < 160) resolveChoice(best);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.8, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    roundT += dt;
    telegraphed = roundT > 1.0;
    if (cyc > 2.0 && !resolved) {
      var correctEl = null;
      for (var i = 0; i < EL.length; i++) if (BEATS[EL[i]] === enemyEl) correctEl = EL[i];
      demo.gx = zoneX(correctEl); demo.gy = H * 0.8; demo.press = true;
      resolved = true;
      game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.25);
    } else if (cyc < 2.0) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters();
      drawZones(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFighters();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(wins + ' / ' + TOTAL, W / 2, H * 0.14, 32, C.gold);
      if (!ok && wins >= 1) txt('あと1本!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { wins: wins, losses: losses };
        if (ok) game.end.success(wins, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      telegraphed = roundT > (ROUND_TIME - 0.7);
      if (roundT >= ROUND_TIME && !resolved) {
        // タイムアウト: 正解属性以外を選んだ扱いでミス確定
        var correctEl = null;
        for (var ci = 0; ci < EL.length; ci++) { if (BEATS[EL[ci]] === enemyEl) correctEl = EL[ci]; }
        var wrongEl = EL[0] === correctEl ? EL[1] : EL[0];
        resolveChoice(wrongEl);
      }
      if (resolved && hitStop <= 0 && !finished) { newRound(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters();
    if (!finished) drawZones(true);
    txt(wins + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.35], ['C4', 0.35], ['E4', 0.35], ['A4', 0.7]], { tempo: 120, wave: 'sawtooth', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
