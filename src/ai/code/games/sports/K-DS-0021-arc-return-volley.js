// K-DS-0021-arc-return-volley.js
// アークリターン — 弧を描いて飛んでくる球を軌道を読んで打ち返す
// 操作: 左右いずれかから弧を描いて向かってくる球を、打点に来た瞬間にタップして打ち返す
// 終わり: 規定本数(5本)を全て打ち返せば成功。1本でも逃せば失敗
// @mechanic: trajectory
// @theme: arc_return_court
// 世界観: 夜間照明の屋外コート。独自デザインの選手が、弧を描いて次々飛んでくる球の軌道を読み、打点で正確に打ち返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返した本数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 擬似遠近の横縞コート、地平線から手前へ広がる帯
  var C = {
    sky: '#0e2a4a', sky2: '#173a5e', court: '#1c5c3a', courtLine: '#e8f4ea',
    ball: '#ffcf3a', ballGlow: '#5a4300', good: '#39ff8a', bad: '#ff3355',
    gold: '#ffe600', white: '#ffffff', ink: '#04140a',
  };

  var GAME_TITLE = 'ARC RETURN';
  var TOTAL = 5;
  var CX = W * 0.5, HITY = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var returned, thrown, done, endWait, finished;
  var ready, hitStop, shake, round, ball;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLAYER = ['.##.', '####', '.##.', '#.#.', '#.##'];

  function bg() {
    game.draw.gradient(0, H * 0.5, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.court);
    for (var i = 0; i < 9; i++) {
      var t = i / 8;
      var y = H * 0.5 + t * H * 0.5;
      game.draw.rect(0, y, W, 2, C.courtLine, 0.35 * (0.4 + t));
    }
    game.draw.line(CX, H * 0.5, CX, H, C.courtLine, 3);
  }

  function newBall() {
    var side = Math.random() < 0.5 ? -1 : 1;
    var n = Math.min(round, TOTAL - 1);
    return { side: side, t: 0, dur: Math.max(0.85, 1.5 - n * 0.12), resolved: false };
  }

  function initGame() {
    returned = 0; thrown = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0;
    ball = newBall();
  }

  function ballPos(b) {
    var p = Math.min(1, b.t / b.dur);
    var startX = b.side < 0 ? W * 0.08 : W * 0.92;
    var x = startX + (CX - startX) * p;
    // 弧: sin カーブで奥から手前へ
    var y = H * 0.28 + (HITY - H * 0.28) * p - Math.sin(p * Math.PI) * 90;
    var scale = 10 + p * 14;
    return { x: x, y: y, p: p, scale: scale };
  }

  function resolveHit() {
    if (finished || ready > 0 || done || ball.resolved) return;
    var pos = ballPos(ball);
    var win = Math.abs(pos.p - 0.86) < 0.16;
    game.audio.play('se_tap', 0.05);
    if (win) {
      ball.resolved = true;
      thrown++; returned++;
      hitStop = 0.1;
      game.feedback.good(pos.x, pos.y, { text: 'RETURN', color: C.good });
      game.fx.burst(pos.x, pos.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (returned === Math.ceil(TOTAL / 2)) game.fx.popup('NICE RALLY!', CX, HITY - 200, { color: C.gold, size: 38 });
      if (returned >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      ball = newBall();
    } else {
      failBall();
    }
  }

  function failBall() {
    ball.resolved = true;
    thrown++;
    hitStop = 0.3;
    var pos = ballPos(ball);
    game.feedback.bad(pos.x, pos.y, { text: 'MISS' });
    shake = 0.28;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveHit();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawBall(b) {
    if (!b || b.resolved) return;
    var pos = ballPos(b);
    if (pos.p > 0.62) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, HITY, 100, C.ball, 0.15);
    }
    game.draw.circle(pos.x, pos.y, pos.scale, C.ballGlow, 0.5);
    game.draw.circle(pos.x, pos.y, pos.scale * 0.7, C.ball);
  }

  function drawPlayer() {
    game.draw.sprite(PLAYER, { '#': C.gold }, CX, H * 0.78, 30, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, b: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt || !demo.b) {
      round = 0;
      demo.b = newBall();
      demo.b.dur = 1.4;
    }
    demo.b.t += dt;
    var pos = ballPos(demo.b);
    if (pos.p >= 0.86 && !demo.b.resolved) {
      demo.b.resolved = true;
      demo.press = true;
      game.feedback.good(pos.x, pos.y, { text: 'RETURN', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (pos.p >= 1) { demo.b = null; demo.press = false; }
    ball = demo.b || ball;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBall(ball);
      drawPlayer();
      game.draw.hand(CX, demo.gy, { press: demo.press, scale: 20 });
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
      drawPlayer();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(returned + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - returned) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(returned, { returned: returned, total: TOTAL });
        else game.end.failure({ returned: returned, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ball.t += dt;
      if (ball.t >= ball.dur && !ball.resolved) failBall();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPlayer();
    if (!finished) drawBall(ball);

    txt(returned + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (returned / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
