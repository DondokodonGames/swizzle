// K-DS-0057-acrobat-pair-catch.js
// 宙返りキャッチ — 宙返りする相方を、飛び上がった瞬間から着地まで腕を構え続けて受け止める
// 操作: 相方が飛び上がったら指を押し続けて腕を構え、着地の瞬間ぴったりで離して受け止める
// 終わり: 規定回数(5回)を受け止めれば成功。1回でも早離し/遅離しで失敗
// @mechanic: hold_duration
// @theme: acrobat_pair_catch
// 世界観: 旅回りの曲芸団。宙返りする相方が飛び上がった瞬間から着地までの回転時間ぴったりに腕を構え続け、落下の瞬間に受け止める花形の二人技
// 残るもの: 正誤(拍手喝采/落下)+ 受け止めた回数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 落ち着いた中間色、柔らかいグラデ陰影、輪郭は控えめ
  var C = {
    bg: '#2a2438', bg2: '#181422', tent: '#4a3858', tentDark: '#302640',
    flyerA: '#e8a850', flyerB: '#5ac8d8', good: '#5adf8a', bad: '#ff5a68',
    gold: '#ffcf4d', white: '#f0e8f4', ink: '#100c18',
  };

  var GAME_TITLE = 'PAIR CATCH';
  var TOTAL = 5;
  var CX = W * 0.5, GROUND_Y = H * 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var caught, done, endWait, finished;
  var ready, hitStop, shake;
  var round, flip, holding, holdT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CATCHER = ['..##..', '.####.', '######', '.#..#.', '#....#'];
  var FLYER = ['.####.', '..##..', '.####.', '#.##.#', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, GROUND_Y + 30, W, H - GROUND_Y - 30, C.tentDark, 0.6);
    for (var i = 0; i < 4; i++) {
      game.draw.line(W * (0.1 + i * 0.28), H * 0.05, CX, GROUND_Y, C.tent, 6);
    }
  }

  function newFlip(idx) {
    return { dur: Math.max(1.0, 1.6 - idx * 0.08), t: 0, resolved: false };
  }

  function initGame() {
    caught = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; flip = newFlip(0); holding = false; holdT = 0;
  }

  function flyerY(f) {
    var p = Math.min(1, f.t / f.dur);
    var arc = Math.sin(p * Math.PI);
    return GROUND_Y - arc * 460;
  }

  function press() {
    if (ready > 0 || done || hitStop > 0 || finished || !flip || flip.resolved || holding) return;
    holding = true; holdT = 0;
  }

  function release() {
    if (!holding || done || hitStop > 0 || finished) return;
    holding = false;
    var p = flip.t / flip.dur;
    var atLanding = p > 0.82 && p < 1.02;
    flip.resolved = true;
    var fy = flyerY(flip);
    if (atLanding) {
      caught++;
      hitStop = 0.1;
      game.feedback.good(CX, GROUND_Y, { text: 'CATCH', color: C.good });
      game.fx.burst(CX, GROUND_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (caught === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, GROUND_Y - 300, { color: C.gold, size: 40 });
      if (caught >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; flip = newFlip(round);
    } else {
      hitStop = 0.3;
      game.feedback.bad(CX, fy, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) { game.audio.play('se_tap', 0.04); if (state === S.PLAYING) press(); });
  game.onRelease(function(x, y) { game.audio.play('se_tap', 0.03); if (state === S.PLAYING) release(); });

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

  function drawFlyer(f) {
    if (!f || f.resolved) { game.draw.sprite(FLYER, { '#': C.flyerB }, CX, GROUND_Y - 20, 20, { anchor: 'center' }); return; }
    var y = flyerY(f);
    var p = f.t / f.dur;
    var landing = p > 0.82;
    if (landing) {
      var blink = Math.floor(game.time.elapsed * 16) % 2 === 0;
      if (blink) game.draw.circle(CX, GROUND_Y - 20, 90, C.bad, 0.2);
    }
    game.draw.sprite(FLYER, { '#': C.flyerB }, CX, y, 20, { anchor: 'center' });
  }

  function drawCatcher(armsUp) {
    game.draw.sprite(CATCHER, { '#': C.flyerA }, CX, GROUND_Y + 40, 22, { anchor: 'center' });
    if (armsUp) game.draw.circle(CX, GROUND_Y - 10, 20, C.gold, 0.4);
  }

  var demo = { t: 0, gx: CX, gy: GROUND_Y - 10, press: false, f: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.f = newFlip(0); demo.f.dur = 1.3; demo.pressed = false; demo.released = false; }
    demo.f.t += dt;
    flip = demo.f;
    if (!demo.pressed && demo.f.t > 0.02) { demo.pressed = true; demo.press = true; }
    var p = demo.f.t / demo.f.dur;
    if (p > 0.82 && !demo.released) {
      demo.released = true;
      demo.press = false;
      game.fx.burst(CX, GROUND_Y, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 1) demo.f.resolved = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFlyer(demo.f);
      drawCatcher(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawFlyer(null);
      drawCatcher(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(caught + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - caught) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(caught, { caught: caught, total: TOTAL });
        else game.end.failure({ caught: caught, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      flip.t += dt;
      if (holding) holdT += dt;
      if (flip.t / flip.dur >= 1.08 && !flip.resolved) {
        // 離すのが遅すぎ(掴みっぱなしで地面に落ちた)
        flip.resolved = true;
        hitStop = 0.3;
        game.feedback.bad(CX, GROUND_Y, { text: 'MISS' });
        shake = 0.28;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawFlyer(flip); else drawFlyer(null);
    drawCatcher(holding);

    txt(caught + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (caught / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
