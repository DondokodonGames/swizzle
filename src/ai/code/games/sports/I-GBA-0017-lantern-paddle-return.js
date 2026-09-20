// I-GBA-0017-lantern-paddle-return.js
// ランタンパドルリターン — 夜市の灯りボールが届く瞬間にパドルを振って打ち返す
// 操作: 灯りボールがパドルに届く直前でタップして振り返す
// 終わり: 規定回数(5回)連続で打ち返せれば成功。タイミングを外せば失敗
// @mechanic: reaction_duel
// @theme: night_market_lantern_rally
// 世界観: 夜市の屋台芸。光る紙提灯ボールを相手台から打ち返され続け、届く瞬間だけパドルを振ってラリーを続ける露天芸人
// 残るもの: 正誤(CLEAR/GAME OVER) + 連続リターン数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 深い紺の夜市背景に暖色の提灯、中間色多め
  var C = {
    bg: '#0e1230', bg2: '#1c2452', stall: '#3a2a1a', stallDark: '#241708',
    lantern: '#ffb347', lanternGlow: '#7a4a12', paddle: '#e0b23a',
    good: '#5fe685', bad: '#ff5a5a', gold: '#ffe14d', white: '#f6f1e0', ink: '#0a0810',
  };

  var GAME_TITLE = 'LANTERN RALLY';
  var TOTAL = 5;
  var CX = W * 0.5, PY = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var rally, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;
  var ball, round;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER = ['.##.', '####', '.##.', '#.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 3; i++) {
      game.draw.circle(W * (0.2 + i * 0.3), H * 0.16, 46, C.lanternGlow, 0.5);
      game.draw.circle(W * (0.2 + i * 0.3), H * 0.16, 30, C.lantern, 0.9);
    }
    game.draw.rect(0, PY + 60, W, 40, C.stallDark);
    game.draw.rect(0, PY + 40, W, 20, C.stall);
  }

  function newBall() {
    var dur = Math.max(0.65, 1.05 - round * 0.05);
    return { t: 0, dur: dur, resolved: false, telegraphed: false };
  }

  function initGame() {
    rally = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    round = 0; ball = newBall();
  }

  function resolveSwing() {
    if (!ball || ball.resolved || ready > 0 || done || finished) return;
    var p = ball.t / ball.dur;
    var good = p > 0.72 && p < 1.02;
    ball.resolved = true;
    if (good) {
      rally++;
      hitStop = 0.1;
      game.feedback.good(CX, PY - 200, { text: 'NICE', color: C.good });
      game.fx.burst(CX, PY - 200, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && rally === Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, PY - 320, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (rally >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      ball = newBall();
    } else {
      hitStop = 0.35;
      game.feedback.bad(CX, PY - 200, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveSwing();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b) {
    if (!b) return;
    var p = Math.min(1, b.t / b.dur);
    var y = H * 0.18 + p * (PY - 220 - H * 0.18);
    if (p > 0.45) {
      var blink = Math.floor(game.time.elapsed * 11) % 2 === 0;
      if (blink) game.draw.circle(CX, PY - 200, 90, C.bad, 0.25);
    }
    game.draw.circle(CX, y, 34, C.lanternGlow, 0.6);
    game.draw.circle(CX, y, 24, C.lantern);
  }

  function drawPerformer(swing) {
    game.draw.sprite(PERFORMER, { '#': C.gold }, CX, PY, 24, { anchor: 'center' });
    game.draw.line(CX + 30, PY - 10, CX + 30 + (swing ? 70 : 40), PY - (swing ? 60 : 10), C.paddle, 14);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, swing: false, k: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.k = newBall(); demo.k.dur = 1.0; demo.swing = false; }
    demo.k.t += dt;
    ball = demo.k; round = 0;
    var p = demo.k.t / demo.k.dur;
    if (p > 0.78 && p < 0.92 && !demo.k.telegraphed) {
      demo.k.telegraphed = true;
      demo.swing = true;
      demo.press = true;
      game.feedback.good(CX, PY - 200, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.swing = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBall(ball);
      drawPerformer(demo.swing);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPerformer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(rally + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - rally) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(rally, { rally: rally, total: TOTAL });
        else game.end.failure({ rally: rally, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      if (ball.t / ball.dur >= 1.05 && !ball.resolved) {
        ball.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, PY - 200, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBall(ball);
    drawPerformer(false);

    txt(rally + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (rally / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
