// I-Switch-0010-twin-torch-juggler.js
// ツイン・トーチ・ジャグラー — 左右で独立して落ちてくる松明を、左手ゾーンと右手ゾーンで同時にキャッチし続ける
// 操作: 画面左半分は左手、右半分は右手。それぞれの松明が受け皿に来た瞬間、対応する側をタップしてキャッチする
// 終わり: 左右合計8回(各4回)キャッチすれば成功。どちらか1本でも落とせば失敗
// @mechanic: coop_2zone
// @theme: twin_torch_street_performer
// 世界観: 広場で芸を見せる大道芸人。左右の手にそれぞれ独立したリズムで松明が落ちてくる。両手とも落とさず回し続けるのが腕の見せ所
// 残るもの: 正誤(CLEAR/GAME OVER) + 合計キャッチ数
// スタイル: 90s BIG SPRITE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめのはっきりした形、濃い輪郭、彩度高めの暖色系アクセント
  var C = {
    bg: '#241226', bg2: '#140a18', stage: '#3a1c30', stageEdge: '#5c2c48',
    torch: '#ff9a3c', torchFlame: '#ffe14d', hand: '#ffd8a8', handDark: '#c98a4a',
    good: '#5cffb0', bad: '#ff5c6e', gold: '#ffd24d', white: '#ffffff', ink: '#0a060c',
  };

  var GAME_TITLE = 'TWIN TORCH';
  var EACH = 4;
  var LX = W * 0.28, RX = W * 0.72;
  var CATCH_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['.####.', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, CATCH_Y + 60, W, 10, C.stageEdge);
    game.draw.circle(LX, CATCH_Y + 90, 90, C.stage, 0.5);
    game.draw.circle(RX, CATCH_Y + 90, 90, C.stage, 0.5);
  }

  function newTorch(side, rnd) {
    return { t: 0, dur: Math.max(1.0, 1.6 - rnd * 0.08), telegraphed: false, resolved: false, side: side };
  }

  var left, right, leftCatch, rightCatch, done, endWait, finished, hitStop, shake, ready, rnd;

  function initGame() {
    leftCatch = 0; rightCatch = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; rnd = 0;
    left = newTorch('left', 0); right = newTorch('right', 0);
    right.t = -0.5; // 位相をずらして交互に危機が来るように
  }

  function torchY(t) {
    var p = Math.min(1, t.t / t.dur);
    return H * 0.24 + Math.abs(Math.sin(p * Math.PI)) * -1 * 0 + p * (CATCH_Y - H * 0.24);
  }

  function windowOpen(t) {
    var p = t.t / t.dur;
    return p > 0.7 && p < 1.0;
  }

  function catchSide(side) {
    if (ready > 0 || done || finished) return;
    var t = side === 'left' ? left : right;
    if (t.t < 0) return;
    if (!t.resolved && windowOpen(t)) {
      t.resolved = true;
      game.audio.play('se_good', 0.35);
      var x = side === 'left' ? LX : RX;
      game.feedback.good(x, CATCH_Y, { text: 'CATCH', color: C.good });
      if (side === 'left') { leftCatch++; } else { rightCatch++; }
      var total = leftCatch + rightCatch;
      if (total === EACH) { game.fx.popup('HALFWAY!', W / 2, CATCH_Y - 200, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.5); }
      if (leftCatch >= EACH && rightCatch >= EACH) { ok = true; finished = true; finish(); return; }
      rnd++;
      if (side === 'left') left = newTorch('left', rnd); else right = newTorch('right', rnd);
    } else {
      game.audio.play('se_tap', 0.1);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    catchSide(x < W * 0.5 ? 'left' : 'right');
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepTorch(t, dt, side) {
    if (t.t < 0) { t.t += dt; return null; }
    t.t += dt;
    var p = t.t / t.dur;
    if (!t.telegraphed && p > 0.55) t.telegraphed = true;
    if (p >= 1 && !t.resolved) return { drop: true };
    return null;
  }

  function drawTorch(t, side) {
    if (!t || t.t < 0) return;
    var x = side === 'left' ? LX : RX;
    var y = H * 0.22 + Math.min(1, t.t / t.dur) * (CATCH_Y - H * 0.22);
    var blink = t.telegraphed && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.line(x, y - 60, x, y + 10, C.torch, 14);
    game.draw.circle(x, y - 66, 22, blink ? C.gold : C.torchFlame);
  }

  var demo = { t: 0, gxL: LX, gxR: RX, gy: H * 0.86, pressL: false, pressR: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var rl = stepTorch(left, dt, 'left');
    var rr = stepTorch(right, dt, 'right');
    if (left.t >= 0 && windowOpen(left) && !left.resolved && left.t / left.dur > 0.78) {
      left.resolved = true; demo.pressL = true;
      game.feedback.good(LX, CATCH_Y, { text: 'CATCH', color: C.good });
      game.audio.play('se_good', 0.2);
      leftCatch = Math.min(EACH, leftCatch + 1);
      rnd++;
      left = newTorch('left', rnd % 4);
    } else demo.pressL = false;
    if (right.t >= 0 && windowOpen(right) && !right.resolved && right.t / right.dur > 0.78) {
      right.resolved = true; demo.pressR = true;
      game.feedback.good(RX, CATCH_Y, { text: 'CATCH', color: C.good });
      game.audio.play('se_good', 0.2);
      rightCatch = Math.min(EACH, rightCatch + 1);
      rnd++;
      right = newTorch('right', rnd % 4);
    } else demo.pressR = false;
    if (rl && rl.drop) left = newTorch('left', 0);
    if (rr && rr.drop) right = newTorch('right', 0);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (leftCatch === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTorch(left, 'left'); drawTorch(right, 'right');
      game.draw.sprite(PERFORMER, { '#': C.hand }, W * 0.5, CATCH_Y + 20, 30, { anchor: 'center' });
      game.draw.hand(demo.gxL, demo.gy, { press: demo.pressL, scale: 14 });
      game.draw.hand(demo.gxR, demo.gy, { press: demo.pressR, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(PERFORMER, { '#': ok ? C.hand : C.bad }, W * 0.5, CATCH_Y + 20, 30, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt((leftCatch + rightCatch) + ' / ' + (EACH * 2), W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (EACH * 2 - leftCatch - rightCatch) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var total = leftCatch + rightCatch;
        if (ok) game.end.success(total, { left: leftCatch, right: rightCatch }); else game.end.failure({ left: leftCatch, right: rightCatch });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var rl = stepTorch(left, dt, 'left');
      var rr = stepTorch(right, dt, 'right');
      if ((rl && rl.drop) || (rr && rr.drop)) {
        hitStop = 0.35;
        var side = rl && rl.drop ? 'left' : 'right';
        var x = side === 'left' ? LX : RX;
        game.feedback.bad(x, CATCH_Y, { text: 'DROP' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) { drawTorch(left, 'left'); drawTorch(right, 'right'); }
    game.draw.sprite(PERFORMER, { '#': finished && !ok ? C.bad : C.hand }, W * 0.5, CATCH_Y + 20, 30, { anchor: 'center' });

    txt((leftCatch + rightCatch) + ' / ' + (EACH * 2), W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, (W - 120) / 2 - 10, 16, C.ink, 0.5);
    game.draw.rect(60, 150, ((W - 120) / 2 - 10) * (leftCatch / EACH), 16, C.gold);
    game.draw.rect(W / 2 + 10, 150, (W - 120) / 2 - 10, 16, C.ink, 0.5);
    game.draw.rect(W / 2 + 10, 150, ((W - 120) / 2 - 10) * (rightCatch / EACH), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.5]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
