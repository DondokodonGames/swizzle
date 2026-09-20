// I-Wii-0010-glowwell-pump-relay.js
// グロウウェル・ポンプリレー — 左右のハンドルを交互に押して発光水をくみ上げ、渇きの影が届く前に満たす
// 操作: 左右のポンプハンドルを交互にタップする。同じ側を連続で押すと空振りになる
// 終わり: 制限時間内に水位を満タンにできれば成功。渇きの影が井戸に届けば失敗
// @mechanic: alternate_tap
// @theme: drought_well_relay
// 世界観: 荒野の井戸守り。左右のハンドルを交互に押して発光水をくみ上げ、忍び寄る渇きの影が届く前に水位計を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + くみ上げた水位%
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白 + 帯の単色(琥珀)。ほぼ白黒、アクセントは琥珀一色のみ
  var C = {
    bg: '#0a0a08', bg2: '#141410', amber: '#ffb000', amberDim: '#7a5500',
    white: '#f4f2ea', dim: '#4a4a44', ink: '#050504',
  };

  var GAME_TITLE = 'PUMP RELAY';
  var DURATION = 10;
  var NEEDED = 10;
  var CX = W * 0.5, WELL_Y = H * 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var timeLeft, waterLevel, correctCount, lastSide, done, endWait, finished;
  var ready, hitStop, shake, halfShown, handleKick;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WELL_SPRITE = ['####', '#..#', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.circle(40 + (i * 97) % W, 60 + Math.floor(i / 5) * 30, 3, C.white, 0.5);
    game.draw.rect(0, H * 0.85, W, H * 0.015, C.amberDim, 0.6);
  }

  function initGame() {
    timeLeft = DURATION; waterLevel = 0; correctCount = 0; lastSide = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false; handleKick = { left: 0, right: 0 };
  }

  function resolveTap(side) {
    if (ready > 0 || done || finished) return;
    handleKick[side] = 1;
    if (side !== lastSide) {
      lastSide = side;
      correctCount++;
      waterLevel = Math.min(1, correctCount / NEEDED);
      game.feedback.good(side === 'left' ? W * 0.2 : W * 0.8, H * 0.8, { text: '', size: 18 });
      game.audio.play('se_coin', 0.35);
      if (!halfShown && waterLevel >= 0.5) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.28, { color: C.amber, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (waterLevel >= 1) {
        finished = true; ok = true; hitStop = 0.15;
        game.feedback.good(CX, WELL_Y, { text: 'CLEAR', color: C.amber });
        game.fx.burst(CX, WELL_Y, { color: C.amber, count: 18, speed: 340 });
        game.audio.play('se_good', 0.4);
        finish();
      }
    } else {
      game.feedback.bad(side === 'left' ? W * 0.2 : W * 0.8, H * 0.8, { text: '', size: 18 });
      game.audio.play('se_bad', 0.25);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x < CX ? 'left' : 'right');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawWell() {
    game.draw.sprite(WELL_SPRITE, { '#': C.white }, CX, WELL_Y, 26, { anchor: 'center' });
    game.draw.rect(CX - 44, WELL_Y - 6, 88, 12, C.ink, 0.7);
    game.draw.rect(CX - 44, WELL_Y + (1 - waterLevel) * -6 + 6 - waterLevel * 80, 88, waterLevel * 80, C.amber, 0.85);
  }

  function drawHandles() {
    var lk = Math.max(0, handleKick.left), rk = Math.max(0, handleKick.right);
    game.draw.rect(W * 0.2 - 70, H * 0.8 - 50 + lk * 14, 140, 100, C.dim, 0.6);
    game.draw.rect(W * 0.8 - 70, H * 0.8 - 50 + rk * 14, 140, 100, C.dim, 0.6);
    game.draw.rect(W * 0.2 - 50, H * 0.8 - 30 + lk * 14, 100, 60, C.amber, 0.9 - lk * 0.3);
    game.draw.rect(W * 0.8 - 50, H * 0.8 - 30 + rk * 14, 100, 60, C.amber, 0.9 - rk * 0.3);
  }

  function drawDroughtShadow(t) {
    var p = Math.max(0, Math.min(1, 1 - t / DURATION));
    var y = H * 0.62 - p * H * 0.25;
    var a = 0.15 + p * 0.35;
    if (p > 0.82) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) a = 0.7;
    }
    game.draw.circle(CX, y + H * 0.25, 140, C.amberDim, a);
  }

  var demo = { t: 0, gx: W * 0.2, gy: H * 0.8, press: false, side: 'left' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { timeLeft = DURATION; waterLevel = 0; correctCount = 0; lastSide = null; }
    demo.tapClock = (demo.tapClock || 0) + dt;
    if (demo.tapClock >= 0.32) {
      demo.tapClock = 0;
      demo.side = demo.side === 'left' ? 'right' : 'left';
      demo.gx = demo.side === 'left' ? W * 0.2 : W * 0.8;
      demo.press = true;
      correctCount++;
      waterLevel = Math.min(1, correctCount / NEEDED);
      game.feedback.good(demo.gx, H * 0.8, { text: '', size: 18 });
      game.audio.play('se_coin', 0.2);
      handleKick[demo.side] = 1;
    } else {
      demo.press = demo.tapClock < 0.08;
    }
    timeLeft -= dt;
    if (timeLeft < 0) timeLeft = DURATION;
  }

  game.onUpdate(function(dt) {
    if (handleKick) { handleKick.left *= 0.88; handleKick.right *= 0.88; }
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDroughtShadow(timeLeft);
      drawWell();
      drawHandles();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.amber);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.amber);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWell();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.white);
      txt(Math.round(waterLevel * 100) + ' / 100', W / 2, H * 0.13, 30, C.amber);
      if (!ok) txt('あと' + (100 - Math.round(waterLevel * 100)) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(waterLevel * 100);
        if (ok) game.end.success(pct, { pct: pct, taps: correctCount });
        else game.end.failure({ pct: pct, taps: correctCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false;
        hitStop = 0.4; shake = 0.35;
        game.feedback.bad(CX, WELL_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawDroughtShadow(timeLeft);
    drawWell();
    drawHandles();

    txt(Math.round(waterLevel * 100) + ' / 100', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DURATION), 16, C.amber);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.amber);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['A3', 0.25], ['E4', 0.25], ['E4', 0.25]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
