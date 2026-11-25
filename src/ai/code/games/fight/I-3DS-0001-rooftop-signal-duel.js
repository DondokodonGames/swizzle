// I-3DS-0001-rooftop-signal-duel.js
// ルーフトップ・シグナル・デュエル — 屋上で睨み合う相手と、街灯が灯った瞬間だけ先にボタンを押す
// 操作: 街灯が緑に灯った瞬間にだけタップする。灯る前に押すとフライング
// 終わり: 灯った直後にタップできれば成功。フライングか遅れれば失敗
// @mechanic: reaction_duel
// @theme: rooftop_streetlamp_duel
// 世界観: 夜の屋上で睨み合う二人の影が、通りの街灯が緑に灯った刹那だけ先にボタンを叩いて決着をつける
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応した速さ(ms)
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 単色ネオン線画、黒背景に細い発光ライン
  var C = {
    bg: '#050508', bg2: '#0a0a12', line: '#2a2a3a', lamp: '#3a3a2a', lampOn: '#39ff5a',
    lampRed: '#ff3a3a', good: '#39ff5a', bad: '#ff3a3a', gold: '#ffd23f', white: '#e8e8f0', ink: '#000000',
  };

  var GAME_TITLE = 'SIGNAL DUEL';
  var CX = W * 0.5, LAMP_Y = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RIVAL_L = ['.##.', '####', '.##.', '#..#'];
  var RIVAL_R = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.line(0, H * 0.65 + i * 30, W, H * 0.65 + i * 30 - 20, C.line, 2);
  }

  var waitT, signalOn, signalAt, pressed, reactMs, done, endWait, finished, falseStart;
  var ready, hitStop, shake;

  function initGame() {
    waitT = 0; signalOn = false; signalAt = 0.9 + game.random(0, 1.6);
    pressed = false; reactMs = 0; falseStart = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function press(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hitStop > 0) return;
    pressed = true;
    if (!signalOn) {
      falseStart = true; ok = false; finished = true; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    reactMs = Math.round((waitT - signalAt) * 1000);
    ok = true; finished = true; hitStop = 0.2;
    game.feedback.good(x, y, { text: reactMs < 220 ? 'PERFECT' : 'GOOD', color: C.good });
    game.fx.burst(CX, LAMP_Y, { color: C.good, count: 16, speed: 320 });
    game.audio.play('se_good', 0.4);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    press(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene() {
    game.draw.circle(CX, LAMP_Y + 120, 40, C.line);
    game.draw.line(CX, LAMP_Y + 120, CX, LAMP_Y, C.line, 10);
    var lit = signalOn && !finished || (finished && ok);
    game.draw.circle(CX, LAMP_Y, 44, lit ? C.lampOn : (falseStart ? C.lampRed : C.lamp));
    game.draw.sprite(RIVAL_L, { '#': C.white }, W * 0.28, H * 0.66, 11, { anchor: 'center' });
    game.draw.sprite(RIVAL_R, { '#': C.gold }, W * 0.72, H * 0.66, 11, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.72, gy: H * 0.66, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { waitT = 0; signalOn = false; signalAt = 1.4; demo.pressed = false; }
    waitT = cyc;
    signalOn = waitT >= signalAt;
    if (signalOn && !demo.pressed) {
      demo.pressed = true; demo.press = true;
      game.feedback.good(CX, LAMP_Y, { text: 'GOOD', color: C.good, sound: false });
      game.audio.play('se_good', 0.15);
    }
    if (!signalOn) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 'ms' : '-'), W / 2, H * 0.12, 24, C.gold, 'center');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold, 'center');
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white, 'center');
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad, 'center');
      if (ok) txt(reactMs + 'ms', W / 2, H * 0.13, 30, C.gold, 'center');
      else txt(falseStart ? 'あと0.1秒!' : 'MISS', W / 2, H * 0.13, 28, C.white, 'center');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white, 'center');
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.max(1, 999 - reactMs), { reactMs: reactMs });
        else game.end.failure({ falseStart: falseStart });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      waitT += dt;
      if (!signalOn && waitT >= signalAt) {
        signalOn = true;
        game.audio.play('se_milestone', 0.35);
      }
      if (signalOn && waitT - signalAt > 0.9) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(CX, LAMP_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt((pressed ? 1 : 0) + ' / ' + 1, W / 2, H * 0.06, 32, C.white, 'center');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold, 'center');
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
