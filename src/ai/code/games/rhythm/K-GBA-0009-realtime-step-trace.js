// K-GBA-0009-realtime-step-trace.js
// リアルタイムステップトレース — 音頭のリズムに合わせて動く足型を、その場でなぞり続ける
// 操作: 円を巡って動く光る足型に指を重ね続け、輪から離れないよう最後までなぞる
// 終わり: 一周なぞりきれば成功。光る足型から指が離れすぎれば失敗
// @mechanic: trace
// @theme: circle_dance_festival
// 世界観: 縁日の輪踊り。音頭のリズムで巡る足型の光点を、今まさにその瞬間になぞって輪から遅れずついていく
// 残るもの: 正誤(CLEAR/GAME OVER) + なぞりきった進行度%
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単純な塗り、太い縁取り、視認性最優先の3色+アクセント2色
  var C = {
    bg: '#ffd85a', bg2: '#ffb830', ringOut: '#8a5a1a', ringIn: '#ffedb0',
    dot: '#ff5a3c', dotDark: '#a5301a', good: '#28c878', bad: '#e0304a',
    gold: '#ffffff', white: '#3a2408', ink: '#3a2408',
  };

  var GAME_TITLE = 'STEP TRACE';
  var CX = W * 0.5, CY = H * 0.5, R = 320;
  var DUR = 9.0;
  var TOL = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progress, done, endWait, finished, ready, hitStop, shake, offTime;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000055', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.circle(CX, CY, R + 40 - i * 2, C.ringOut, 0.06);
    game.draw.circle(CX, CY, R, C.ringIn, 0.5);
  }

  function targetPos(p) {
    var a = -Math.PI / 2 + p * Math.PI * 2;
    return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R * 0.9, a: a };
  }

  function initGame() {
    progress = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; offTime = 0;
  }

  function failTrace(x, y) {
    finished = true; ok = false; hitStop = 0.15;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.25;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onPress(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    var pos = targetPos(Math.min(1, progress / DUR));
    var dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist > TOL) { failTrace(x, y); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawPath(p) {
    game.draw.circle(CX, CY, R, C.ringOut, 0.35);
    var pos = targetPos(p);
    var lookAhead = targetPos(Math.min(1, p + 0.06));
    game.draw.circle(lookAhead.x, lookAhead.y, 30, C.dotDark, 0.4);
    game.draw.circle(pos.x, pos.y, 46, C.dotDark);
    game.draw.circle(pos.x, pos.y, 34, C.dot);
    game.draw.sprite(DANCER, { '#': C.white }, pos.x, pos.y - 70, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: 0, gy: 0, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var p = Math.min(1, (cyc / 3.2));
    var pos = targetPos(p);
    demo.gx = pos.x; demo.gy = pos.y; demo.press = cyc < 3.2;
    progress = p * DUR;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawPath(Math.min(1, progress / DUR));
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.dotDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.dotDark);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPath(Math.min(1, progress / DUR));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.round((progress / DUR) * 100) + ' / 100', W / 2, H * 0.13, 30, C.dotDark);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / DUR) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!game.input.pressing) {
        offTime += dt;
        if (offTime > 0.15) failTrace(CX, CY);
      } else {
        offTime = 0;
        var pos = targetPos(Math.min(1, progress / DUR));
        var dist = Math.hypot(game.input.x - pos.x, game.input.y - pos.y);
        if (dist > TOL) failTrace(game.input.x, game.input.y);
      }
      progress += dt;
      if (progress >= DUR) {
        progress = DUR; finished = true; ok = true; hitStop = 0.1;
        var fp = targetPos(1);
        game.feedback.good(fp.x, fp.y, { text: 'CLEAR', color: C.good });
        game.fx.burst(fp.x, fp.y, { color: C.dot, count: 18, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      } else if (Math.abs(progress - DUR * 0.5) < dt) {
        game.fx.popup('HALFWAY!', CX, CY - R - 40, { color: C.dotDark, size: 36 });
        game.audio.play('se_milestone', 0.3);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPath(Math.min(1, progress / DUR));

    txt(Math.round((progress / DUR) * 100) + ' / 100', W / 2, H * 0.08, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.dotDark);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.25], ['D5', 0.25]], { tempo: 112, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
