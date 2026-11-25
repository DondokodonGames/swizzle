// D-20222026-0032-outpost-shield-tally.js
// アウトポスト・シールドタリー — 敵前哨基地の防壁灯をちょうど数えきる回数だけ叩き、撃破信号を送る
// 操作: 表示された防壁灯の残り数をちょうど0にするまで、ストライクボタンをタップする。多く叩きすぎると失敗
// 終わり: ちょうど0で止められれば成功。押しすぎ/時間切れで失敗
// @mechanic: count_exact
// @theme: outpost_shield_tally
// 世界観: 近未来の前哨基地を無人機で叩く指揮官が、演出だけで描かれる敵防壁灯の残り数をちょうど読み切って撃破信号を送る
// 残るもの: 正誤(CLEAR/GAME OVER) + 押した回数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深いコントラストと冷色グレア。面は矩形の重ねでハイライトのみ強調
  var C = {
    bg: '#0c141e', bg2: '#060a10', panel: '#16222e', panelLine: '#2a3e50',
    base: '#3a5468', baseDk: '#1c2a34', shield: '#3cc8ff', shieldDim: '#1a4a5a',
    good: '#3cc8ff', bad: '#ff4d5e', gold: '#ffd24d', ink: '#e6f2ff',
  };

  var GAME_TITLE = 'SHIELD TALLY';
  var MAX_TIME = 19;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#040608', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BASE_S = ['######', '#....#', '#.##.#', '######'];
  var DRONE_S = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, C.shield, pulse * 0.12);
    var dx = W * (0.2 + 0.6 * ((Math.sin(game.time.elapsed * 0.8) + 1) / 2));
    game.draw.sprite(DRONE_S, { '#': C.shield }, dx, H * 0.2, 12, { anchor: 'center' });
  }

  var target, remain, taps, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    target = 5 + Math.floor(Math.random() * 4); // 5..8
    remain = target; taps = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var BX = W * 0.5, BY = H * 0.38;
  var BTN_X = W * 0.5, BTN_Y = H * 0.82, BTN_R = 150;

  function drawScene() {
    bg();
    game.draw.circle(BX, BY, 220, C.baseDk, 0.5);
    game.draw.sprite(BASE_S, { '#': C.base }, BX, BY, 26, { anchor: 'center' });
    var cols = Math.min(target, 8);
    for (var i = 0; i < target; i++) {
      var col = (i % cols); var row = Math.floor(i / cols);
      var lx = BX - (cols - 1) * 26 + col * 52;
      var ly = BY - 160 + row * 44;
      var lit = i < remain;
      game.draw.circle(lx, ly, 18, lit ? C.shield : C.shieldDim, lit ? 0.9 : 0.4);
    }
    game.draw.circle(BTN_X, BTN_Y, BTN_R, C.panel);
    game.draw.circle(BTN_X, BTN_Y, BTN_R * 0.7, C.shield, 0.25);
    txt(String(remain), BTN_X, BTN_Y + 18, 64, C.gold);
  }

  function strike(x, y) {
    if (remain <= 0) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    taps += 1;
    remain -= 1;
    game.feedback.good(x, y, { text: remain === 0 ? 'GOOD' : '', color: C.good });
    game.fx.burst(BX, BY, { color: C.shield, count: 14, speed: 320 });
    game.audio.play('se_tap', 0.25);
    if (remain === Math.ceil(target * 0.5)) {
      game.fx.popup('NICE', BX, BY - 200, { color: C.gold, size: 28 });
      game.audio.play('se_milestone', 0.3);
    }
    if (remain === 0) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var d = Math.hypot(x - BTN_X, y - BTN_Y);
      if (d < BTN_R) strike(x, y);
      else { game.audio.play('se_tap', 0.1); game.feedback.bad(x, y, { text: 'MISS' }); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BTN_X, gy: BTN_Y, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gx = BTN_X; demo.gy = BTN_Y;
    var slot = 0.5;
    demo.press = (Math.floor(cyc / slot) % 2 === 0) && cyc < slot * target * 1.4;
    if (demo.press && Math.floor(cyc / slot) !== Math.floor((cyc - dt) / slot) && remain > 0 && !finished) {
      strike(BTN_X, BTN_Y);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 34, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt(taps + ' / ' + target, W / 2, H * 0.14, 24, C.gold);
      if (!ok && remain > 0) txt('あと' + remain + '!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(taps, { taps: taps, target: target });
        else game.end.failure({ taps: taps, target: target });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', BX, BY - 200, { color: C.gold, size: 26 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BX, BY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(taps + ' / ' + target, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.panelLine, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['G3', 0.2], ['B3', 0.2], ['E4', 0.4]], { tempo: 140, wave: 'sawtooth', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
