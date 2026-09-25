// D-20222026-0030-caravan-forge-rush.js
// キャラバンフォージラッシュ — 自動で進む隊商が野営する一瞬に、槌を叩いて資源を鍛え上げる
// 操作: 野営中の鍛冶台を連打して、規定量まで一気に資源を鍛え上げる
// 終わり: 時間内に規定量まで鍛えれば成功。届かなければ失敗
// @mechanic: mash
// @theme: caravan_forge_rush
// 世界観: 荒野を渡る隊商の鍛冶番が、野営のわずかな間だけ槌を振るい、次の出発までに資源を鍛え上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 鍛えた量
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 低彩度の面を粗い矩形ブロックで構成、輪郭は使わない
  var C = {
    bg: '#5a4a38', bg2: '#3a3020', dune: '#7a6448', duneDk: '#4a3a28',
    forge: '#3a2a1c', ember: '#ff8a3c', emberDim: '#a04a1c',
    smith: '#c8985a', good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#241a10',
  };

  var GAME_TITLE = 'FORGE RUSH';
  var MAX_TIME = 11;
  var NEEDED = 26;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#150e08', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_S = ['.##.', '####', '.##.', '#..#'];
  var CART_S = ['#....#', '######', '.#..#.'];

  var scroll;
  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
    scroll = (scroll + 0) % W;
    for (var i = -1; i < 4; i++) {
      var dx = ((game.time.elapsed * 40 + i * 340) % (W + 340)) - 170;
      game.draw.rect(dx, H * 0.62, 220, 60, C.duneDk, 0.4);
    }
    game.draw.sprite(CART_S, { '#': C.duneDk }, W * 0.15, H * 0.74, 14, { anchor: 'center' });
  }

  var amount, taps, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    amount = 0; taps = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var FX = W * 0.5, FY = H * 0.5, FR = 190;

  function drawScene() {
    bg();
    var glow = 0.35 + 0.25 * Math.sin(game.time.elapsed * 10);
    game.draw.circle(FX, FY, FR, C.forge);
    game.draw.circle(FX, FY, FR * 0.7, C.ember, glow * Math.min(1, amount / NEEDED + 0.15));
    game.draw.sprite(SMITH_S, { '#': C.smith }, FX, FY - FR - 60, 22, { anchor: 'center' });
    game.draw.rect(W * 0.5 - 220, H * 0.78, 440, 20, C.duneDk, 0.5);
    game.draw.rect(W * 0.5 - 220, H * 0.78, 440 * Math.min(1, amount / NEEDED), 20, C.gold);
  }

  function tapForge(x, y) {
    amount += 1;
    taps += 1;
    game.feedback.good(x, y, { text: '', color: C.ember, count: 3 });
    game.fx.burst(FX, FY, { color: C.ember, count: 8, speed: 220 });
    game.audio.play('se_tap', 0.18);
    if (amount === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', FX, FY - FR - 20, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (amount >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(FX, FY, { text: 'GOOD', color: C.good });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var d = Math.hypot(x - FX, y - FY);
      if (d < FR + 40) tapForge(x, y);
      else { game.audio.play('se_tap', 0.1); game.feedback.bad(x, y, { text: 'MISS' }); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: FX, gy: FY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.gx = FX + Math.sin(demo.t * 3) * 20; demo.gy = FY;
    if (cyc < 3.0) {
      demo.press = Math.floor(demo.t * 6) % 2 === 0;
      if (demo.press && Math.floor(demo.t * 6) !== Math.floor((demo.t - dt) * 6) && !finished) tapForge(FX, FY);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, '#f4ecd8');
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, '#f4ecd8');
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(amount + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - amount) + '!', W / 2, H * 0.18, 22, '#f4ecd8');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, '#f4ecd8');
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(amount, { amount: amount, taps: taps });
        else game.end.failure({ amount: amount, taps: taps });
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
        game.audio.play('se_milestone', 0.2);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = amount >= NEEDED; hitStop = 0.25; shake = ok ? 0 : 0.2;
        if (!ok) game.feedback.bad(FX, FY, { text: 'MISS' });
        game.audio.play(ok ? 'se_success' : 'se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(amount + ' / ' + NEEDED, W / 2, H * 0.06, 28, '#f4ecd8');
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.duneDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.2], ['F3', 0.2], ['A3', 0.2], ['D4', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
