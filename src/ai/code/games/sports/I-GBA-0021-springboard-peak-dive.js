// I-GBA-0021-springboard-peak-dive.js
// スプリングボードピークダイブ — 弾む板の反発が最大になる瞬間を見計らってボタンを押し、跳躍を決める
// 操作: 板の反発ゲージが上下するのを見て、頂点に来た瞬間にタップする
// 終わり: 頂点付近でタップできれば成功。ズレて押せば失敗
// @mechanic: timing_one_shot
// @theme: springboard_peak_launch
// 世界観: 屋外プールの飛び込み板。上下に弾む板の反発力が最大になる一瞬を狙い澄まして跳ね上がるダイバー
// 残るもの: 正誤(CLEAR/GAME OVER) + 頂点とのズレ精度%
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 淡いパステルの疑似アイソメ、平行四辺形のプール床
  var C = {
    bg: '#bfe8f2', bg2: '#8fd0e2', pool: '#3aa0c4', poolDark: '#1f6a86',
    board: '#e8e0c8', boardDark: '#b0a480', needle: '#ff5a6a',
    good: '#3ac26a', bad: '#e63946', gold: '#ffd23f', white: '#ffffff', ink: '#12222a',
  };

  var GAME_TITLE = 'PEAK DIVE';
  var CX = W * 0.5, GY = H * 0.48, GW = 620;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var gaugeT, speed, accuracy, done, endWait, finished;
  var ready, hitStop, shake, milestoneFired;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.72, W, H * 0.3, C.pool);
    game.draw.rect(0, H * 0.72, W, 16, C.poolDark);
  }

  function gaugeVal() {
    // 0..1..0 三角波(0.5が頂点)
    var p = (Math.sin(gaugeT * speed) + 1) / 2;
    return p;
  }

  function initGame() {
    gaugeT = 0; speed = 2.6; accuracy = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneFired = false;
  }

  function resolvePress() {
    if (ready > 0 || finished || done) return;
    var v = gaugeVal();
    var diff = Math.abs(1 - v); // 1が頂点
    accuracy = Math.max(0, Math.round(100 - diff * 220));
    if (diff < 0.12) {
      ok = true; hitStop = 0.1;
      game.feedback.good(CX, GY - 260, { text: 'PERFECT', color: C.good });
      game.fx.burst(CX, GY - 260, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_good', 0.4);
    } else {
      ok = false; hitStop = 0.3;
      game.feedback.bad(CX, GY - 260, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
    }
    finished = true;
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.1); resolvePress(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawGauge(v, blinkPeak) {
    game.draw.rect(CX - GW / 2, GY, GW, 28, C.boardDark);
    game.draw.rect(CX - GW / 2, GY, GW * v, 28, C.gold);
    game.draw.line(CX + GW / 2 - 6, GY - 14, CX + GW / 2 - 6, GY + 42, C.good, 8);
    if (blinkPeak) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.line(CX + GW / 2 - 6, GY - 30, CX + GW / 2 - 6, GY + 58, C.bad, 6);
    }
    var boardY = GY - 60 - v * 70;
    game.draw.rect(CX - 130, boardY, 260, 22, C.boardDark);
    game.draw.rect(CX - 124, boardY - 6, 248, 14, C.board);
  }

  function drawDiver(v) {
    var boardY = GY - 60 - v * 70;
    game.draw.sprite(DIVER, { '#': C.gold }, CX, boardY - 60, 24, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX + GW / 2, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { gaugeT = 0; }
    gaugeT += dt;
    var v = gaugeVal();
    var near = Math.abs(1 - v) < 0.13;
    demo.press = near;
    if (near && !demo._fired) {
      demo._fired = true;
      game.feedback.good(CX, GY - 260, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (v < 0.3) demo._fired = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var v = gaugeVal();
      drawGauge(v, v > 0.75);
      drawDiver(v);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.poolDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDiver(1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(accuracy + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(accuracy, { accuracy: accuracy }); else game.end.failure({ accuracy: accuracy });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      gaugeT += dt;
      if (!milestoneFired && gaugeVal() > 0.9) {
        milestoneFired = true;
        game.fx.popup('GOOD', CX, GY - 200, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.35);
      }
      if (gaugeVal() < 0.2) milestoneFired = false;
    }
    if (shake > 0) shake -= dt;

    bg();
    var v2 = gaugeVal();
    drawGauge(v2, v2 > 0.75);
    drawDiver(v2);

    txt(accuracy > 0 ? accuracy + '%' : '--', W / 2, H * 0.06, 32, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
