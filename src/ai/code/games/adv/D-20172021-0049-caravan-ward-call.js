// D-20172021-0049-caravan-ward-call.js
// キャラバンウォードコール — 荒野の隊商を率いる指揮官が、迫る魔物の弱点属性を見極めて仲間に的確な号令を選ぶ
// 操作: 現れた魔物の属性アイコンを見て、それに打ち勝つ属性の号令ボタンをタップする(3回連続で判断)
// 終わり: 3回中2回以上正しく号令できれば成功。届かなければ失敗
// @mechanic: judge
// @theme: caravan_ward_call
// 世界観: 荒野を渡る隊商を率いる旅の指揮官が、仲間を編成した護衛隊とともに、行く手を阻む魔物の弱点属性を見極めて的確な号令を放つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 号令成功数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 輪郭は line、面は横1pxストリップ塗り。頂点ジッターとフォグ
  var C = {
    bg1: '#3a2a1a', bg2: '#1a120a', fog: '#5a4a3a',
    dune: '#7a5a34', duneDark: '#4a3620',
    fire: '#ff5a3a', water: '#3aa0ff', wind: '#4ae08a',
    enemy: '#8a4fbf', good: '#39e07a', bad: '#ff4d5e', gold: '#ffd54a', ink: '#f0e0c8', white: '#ffffff',
  };

  var GAME_TITLE = 'WARD CALL';
  var ROUNDS = 3;
  var DECIDE_TIME = 2.3;
  var TIME_LIMIT = ROUNDS * DECIDE_TIME + 1.3;
  var NEEDED = 2;
  var ATTRS = ['FIRE', 'WATER', 'WIND'];
  var BEATEN_BY = { WIND: 'FIRE', WATER: 'WIND', FIRE: 'WATER' };
  var BTN_Y = H * 0.85, BTN_R = 100;
  var BTNS = { FIRE: { x: W * 0.22, y: BTN_Y, r: BTN_R }, WATER: { x: W * 0.5, y: BTN_Y, r: BTN_R }, WIND: { x: W * 0.78, y: BTN_Y, r: BTN_R } };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ICON = {
    FIRE: ['..#..', '.###.', '#####', '.###.', '..#..'],
    WATER: ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'],
    WIND: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  };
  var ENEMY_SPR = ['#.#.#', '#####', '.###.', '#...#'];

  function colOf(attr) { return attr === 'FIRE' ? C.fire : attr === 'WATER' ? C.water : C.wind; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 6; i++) {
      var y = H * 0.55 + i * 40;
      game.draw.rect(0, y, W, 6, i % 2 === 0 ? C.dune : C.duneDark, 0.5);
    }
    game.draw.rect(0, H * 0.10, W, H * 0.08, C.fog, 0.15);
  }

  function drawButtons(lastResult) {
    for (var k = 0; k < ATTRS.length; k++) {
      var a = ATTRS[k], b = BTNS[a];
      var glow = lastResult && lastResult.cmd === a ? (lastResult.good ? C.good : C.bad) : colOf(a);
      game.draw.circle(b.x, b.y, b.r + 10, glow, 0.35);
      game.draw.circle(b.x, b.y, b.r, colOf(a), 0.85);
      game.draw.sprite(ICON[a], { '#': C.white }, b.x, b.y, 12, { anchor: 'center' });
    }
  }

  function drawEnemy(attr) {
    var bob = Math.sin(game.time.elapsed * 3) * 10;
    game.draw.circle(W * 0.5, H * 0.38 + bob, 90, colOf(attr), 0.3);
    game.draw.sprite(ENEMY_SPR, { '#': C.enemy }, W * 0.5, H * 0.38 + bob, 34, { anchor: 'center' });
    var blink = Math.floor(game.time.elapsed * 5) % 2 === 0;
    if (blink) game.draw.sprite(ICON[attr], { '#': colOf(attr) }, W * 0.5, H * 0.24, 16, { anchor: 'center' });
  }

  var roundIdx, curAttr, roundClock, correctCount, lastResult, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function newRound() {
    curAttr = ATTRS[Math.floor(Math.random() * ATTRS.length)];
    roundClock = 0;
    lastResult = null;
  }

  function initGame() {
    roundIdx = 0; correctCount = 0; halfCalled = false;
    newRound();
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolveRound(cmd) {
    var correct = BEATEN_BY[curAttr];
    var good = cmd === correct;
    lastResult = { cmd: cmd, good: good };
    var b = BTNS[cmd] || { x: W * 0.5, y: H * 0.6 };
    if (good) {
      correctCount++;
      game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
      game.fx.burst(b.x, b.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.35);
      hitStop = 0.15;
    } else {
      game.feedback.bad(b.x, b.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      hitStop = 0.2; shake = 0.16;
    }
    if (!halfCalled && roundIdx >= 1) { halfCalled = true; game.fx.popup('NICE', W * 0.5, H * 0.30, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.25); }
    roundIdx++;
    if (roundIdx >= ROUNDS) { ok = correctCount >= NEEDED; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      for (var k = 0; k < ATTRS.length; k++) {
        var a = ATTRS[k], b = BTNS[a];
        if (Math.hypot(x - b.x, y - b.y) <= b.r * 1.2) { game.audio.play('se_tap', 0.15); resolveRound(a); return; }
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTNS.FIRE.x, gy: BTNS.FIRE.y, press: false, resolved: false };
  function resetDemo() { initGame(); demo.resolved = false; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { resetDemo(); }
    var target = BTNS[BEATEN_BY[curAttr]];
    if (cyc < 1.6) {
      var t2 = cyc / 1.6;
      demo.gx = W * 0.5 + (target.x - W * 0.5) * t2;
      demo.gy = H * 0.6 + (target.y - H * 0.6) * t2;
      demo.press = false;
      demo.resolved = false;
    } else if (cyc < 1.8) {
      demo.press = true;
      if (!demo.resolved) { demo.resolved = true; resolveRound(BEATEN_BY[curAttr]); }
    } else {
      demo.gx = target.x; demo.gy = target.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundIdx === undefined) initGame();
      stepDemo(dt);
      bg();
      drawEnemy(curAttr);
      drawButtons(lastResult);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEnemy(curAttr);
      drawButtons(lastResult);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(correctCount + ' / ' + ROUNDS, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEEDED - correctCount) + '回!', W / 2, H * 0.19, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correctCount, { correct: correctCount, rounds: ROUNDS });
        else game.end.failure({ correct: correctCount, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= DECIDE_TIME) resolveRound('__NONE__');
    }

    var shakeX = 0;
    if (shake > 0) { shake -= dt; shakeX = (Math.random() - 0.5) * 14 * shake; }

    bg();
    drawEnemy(curAttr);
    drawButtons(lastResult);
    txt(correctCount + ' / ' + ROUNDS, W * 0.5, H * 0.065, 30, C.white);
    var pct = Math.max(0, 1 - roundClock / DECIDE_TIME);
    game.draw.rect(70, 150, W - 140, 16, '#1a120a', 1);
    game.draw.rect(70, 150, (W - 140) * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 108, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
