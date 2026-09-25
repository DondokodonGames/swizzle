// D-20172021-0068-dough-batch-exact-count.js
// ドウ・バッチ・イグザクトカウント — 計量台のベルをちょうど規定回数だけ鳴らして生地を仕込む
// 操作: 左の「計量」を連打して生地を加える。ちょうど規定数に達したら右の「封入」をタップして仕込みを終える
// 終わり: 封入時の個数が規定数と一致すれば成功。数を超える、または一致せず封入すれば失敗
// @mechanic: count_exact
// @theme: dough_batch_exact_count
// 世界観: 下町の焼き菓子職人見習いが、計量台のベルをちょうど規定回数だけ鳴らして生地を過不足なく仕込み、窯入れ前に封を閉じる
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕込んだ個数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下2分割
  var STYLE = { bg: ['#fff0f5', '#ffe0ec'], main: ['#ffb6c1', '#ffe4a3'], accent: ['#ff8fab', '#7ec8a9'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], bowl: '#fff8fa', bowlEdge: '#ff8fab',
    dough: '#f4d7a8', doughDark: '#c99a5a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffb84d', ink: '#7a4a55', white: '#ffffff',
    addBtn: '#ffb6c1', sealBtn: '#7ec8a9',
  };

  var GAME_TITLE = 'DOUGH BATCH';
  var CX = W * 0.5, BOWL_Y = H * 0.4;
  var ADD_X = W * 0.28, SEAL_X = W * 0.72, BTN_Y = H * 0.82, BTN_R = 130;
  var TIME_LIMIT = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BAKER = ['.##.', '####', '.##.', '#..#'];
  var DOUGH = ['.##.', '####', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.sprite(BAKER, { '#': C.ink }, W * 0.85, H * 0.14, 9, { anchor: 'center' });
  }

  var target, count, busted, timeLeft, done, endWait, finished, ready, hitStop, shake, popT;

  function initGame() {
    target = 6 + Math.floor(game.random(0, 4)); // 6..9
    count = 0; busted = false; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; popT = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBowl() {
    game.draw.circle(CX, BOWL_Y + 140, 260, C.bowlEdge);
    game.draw.circle(CX, BOWL_Y + 130, 240, C.bowl);
    var cols = 5;
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / cols), colI = i % cols;
      var px = CX - (cols - 1) * 40 / 2 + colI * 40;
      var py = BOWL_Y + 100 - row * 38;
      game.draw.sprite(DOUGH, { '#': busted && i === count - 1 ? C.bad : C.dough }, px, py, 10, { anchor: 'center' });
    }
    // ADDボタン
    game.draw.circle(ADD_X, BTN_Y, BTN_R, C.addBtn);
    game.draw.circle(ADD_X, BTN_Y, BTN_R - 14, '#ffffff', 0.3);
    txt('+', ADD_X, BTN_Y + 24, 60, C.ink);
    // SEALボタン
    var sealGlow = count > 0 && !busted;
    game.draw.circle(SEAL_X, BTN_Y, BTN_R, sealGlow ? C.sealBtn : '#c8c8c8');
    game.draw.circle(SEAL_X, BTN_Y, BTN_R - 14, '#ffffff', 0.3);
    game.draw.sprite(['##.##', '#####', '.###.'], { '#': '#ffffff' }, SEAL_X, BTN_Y, 16, { anchor: 'center' });
  }

  function doAdd(x, y) {
    if (busted || count >= target + 3) return;
    count++;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y, { color: C.dough, count: 8, speed: 260 });
    if (count === target) game.fx.popup('NICE', CX, BOWL_Y - 40, { color: C.gold, size: 32 });
    if (count > target) {
      busted = true;
      ok = false; finished = true;
      hitStop = 0.3; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  function doSeal(x, y) {
    if (busted || count === 0) return;
    if (count === target) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.audio.play('se_success', 0.5);
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && hitStop <= 0 && !finished) {
      var dAdd = Math.hypot(x - ADD_X, y - BTN_Y);
      var dSeal = Math.hypot(x - SEAL_X, y - BTN_Y);
      if (dAdd <= BTN_R) doAdd(x, y);
      else if (dSeal <= BTN_R) doSeal(x, y);
    }
  });

  var demo = { t: 0, gx: ADD_X, gy: BTN_Y, press: false, nextAddAt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.nextAddAt = 0; }
    var addStep = 2.0 / target;
    if (cyc < 2.0) {
      demo.gx = ADD_X; demo.gy = BTN_Y;
      var inStep = cyc % addStep;
      demo.press = inStep < addStep * 0.4;
      if (count < target && cyc >= demo.nextAddAt) {
        doAdd(ADD_X, BTN_Y);
        demo.nextAddAt += addStep;
      }
    } else if (cyc < 2.3) {
      var t2 = (cyc - 2.0) / 0.3;
      demo.gx = ADD_X + (SEAL_X - ADD_X) * t2;
      demo.gy = BTN_Y;
      demo.press = false;
    } else if (cyc < 2.45) {
      demo.press = true;
      if (!finished && count === target) doSeal(SEAL_X, BTN_Y);
    } else {
      demo.gx = SEAL_X; demo.gy = BTN_Y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (count === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBowl();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBowl();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(count + ' / ' + target, W / 2, H * 0.14, 28, C.gold);
      if (!ok && Math.abs(count - target) === 1) txt('あと1個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(count, { count: count, target: target });
        else game.end.failure({ count: count, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, BOWL_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBowl();

    txt(count + ' / ' + target, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#ffffff', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
