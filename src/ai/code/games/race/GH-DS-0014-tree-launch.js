// GH-DS-0014-tree-launch.js
// ツリーランチ — スタートの合図でクラッチを繋ぐ。早いとフライング、遅いと負け
// 操作: ランプが全部消えて緑になった瞬間にタップ
// 終わり: フライング=失敗、遅すぎ=失敗、ちょうど良ければ反応時間(ms)が残る
// @mechanic: timing_one_shot
// @theme: night_strip
// 世界観: 夜のドラッグ発進ライン。ランプが順に灯り、消えた瞬間が合図。早く押せばフライング、遅ければ相手に出し抜かれる
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応時間(ms、ラベル)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // NEO-RETRO: 限定4〜6色。大きいドット、1色だけ強い差し色
  var C = {
    bg1: '#12121a', bg2: '#0a0a10', amber: '#ff9a1a', green: '#39ff6a', off: '#2a2a34',
    accent: '#ff2a6a', white: '#f0f0f0', ink: '#05050a', bad: '#ff2a6a',
  };

  var GAME_TITLE = 'TREE LAUNCH';
  var GO_WINDOW = 500; // ms 以内なら成功

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, reactMs = 0, finalScore = 0, resultText = '';

  var lampsOn, phase, phaseT, goAt, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2;
  var LAMP_Y = [H * 0.30, H * 0.38, H * 0.46];

  function trackBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.78, W, 6, C.accent, 0.5);
    for (var i = 0; i < 6; i++) game.draw.rect(60 + i * 170, H * 0.80, 90, H * 0.16, C.off, 0.25);
    // ツリー本体(大きいドットの縦柱)
    game.draw.rect(CX - 90, H * 0.22, 180, H * 0.32, '#1a1a24');
  }

  function drawLamp(i, on, color) {
    game.draw.circle(CX, LAMP_Y[i], 60, on ? color : C.off, on ? 1 : 0.5);
    game.draw.circle(CX, LAMP_Y[i], 60, '#000000', 0.15);
    if (on) game.draw.circle(CX, LAMP_Y[i], 90, color, 0.18);
  }

  function initGame() {
    lampsOn = 0; phase = 'wait'; phaseT = 0.6 + Math.random() * 0.5; goAt = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function tapNow() {
    if (done || ready > 0 || finished) return;
    hitStop = 0.08;
    if (phase !== 'go') {
      finished = true; ok = false; resultText = 'FALSE START';
      game.feedback.bad(CX, LAMP_Y[1], { text: 'FALSE START' });
      shake = 0.3;
      game.audio.play('se_failure', 0.5);
      finish();
      return;
    }
    reactMs = Math.round((game.time.elapsed - goAt) * 1000);
    finished = true;
    if (reactMs > GO_WINDOW) {
      ok = false; resultText = reactMs + 'ms';
      game.feedback.bad(CX, LAMP_Y[1], { text: 'SLOW' });
      game.audio.play('se_failure', 0.4);
    } else {
      ok = true; resultText = reactMs + 'ms';
      finalScore = Math.max(0, 500 - reactMs);
      game.feedback.good(CX, LAMP_Y[1], { text: reactMs + 'ms', color: C.green });
      game.fx.burst(CX, LAMP_Y[1], { color: C.green, count: 16, speed: 380 });
      game.audio.play('se_success', 0.5);
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 消灯の瞬間だけタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.62, press: false, lampsOn: 0, phase: 'wait', phaseT: 1.0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    if (demo.phase === 'wait' && demo.phaseT <= 0) { demo.phase = 'amber'; demo.lampsOn = 1; demo.phaseT = 0.4; }
    else if (demo.phase === 'amber' && demo.phaseT <= 0) {
      demo.lampsOn++;
      if (demo.lampsOn > 3) { demo.phase = 'go'; demo.press = false; }
      else demo.phaseT = 0.4;
    }
    if (demo.phase === 'go') {
      demo.press = true;
      if (demo.t % 3 < 0.03) { game.feedback.good(CX, LAMP_Y[1], { text: 'GO', color: C.green }); game.fx.burst(CX, LAMP_Y[1], { color: C.green, count: 10, speed: 300 }); }
    }
    if (demo.phaseT < -1.0) { demo.phase = 'wait'; demo.phaseT = 1.0; demo.lampsOn = 0; demo.press = false; }
  }

  var CAR_SPRITE = ['.##.', '####', '####', '#..#'];
  var CAR_PAL = { '#': C.accent };

  function drawTree(lampsOnN, isGo) {
    for (var i = 0; i < 3; i++) drawLamp(i, isGo ? false : i < lampsOnN, C.amber);
    // 緑ランプ(下)
    game.draw.circle(CX, H * 0.56, 70, isGo ? C.green : C.off, isGo ? 1 : 0.5);
    if (isGo) game.draw.circle(CX, H * 0.56, 105, C.green, 0.2);
    game.draw.sprite(CAR_SPRITE, CAR_PAL, CX, H * 0.68, 18, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      trackBg();
      stepDemo(dt);
      drawTree(demo.lampsOn, demo.phase === 'go');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 58, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 'ms相当' : '-'), W / 2, H * 0.15, 28, C.amber);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 48, C.amber);
        txt('TAP TO START', W / 2, H * 0.95, 38, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      trackBg();
      drawTree(3, phase === 'go');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, ok ? C.green : C.bad);
      txt(resultText, W / 2, H * 0.66, 56, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.72, 34, C.amber);
      if (ok && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.78, 36, C.amber);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 34, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.end.record(finalScore, { label: resultText });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT -= dt;
      if (phase === 'wait' && phaseT <= 0) { phase = 'amber'; lampsOn = 1; phaseT = 0.42; game.audio.tone(440, 0.08, { wave: 'square', volume: 0.15 }); }
      else if (phase === 'amber' && phaseT <= 0) {
        lampsOn++;
        if (lampsOn > 3) { phase = 'go'; goAt = game.time.elapsed; game.audio.tone(880, 0.1, { wave: 'square', volume: 0.2 }); game.fx.popup('GO', CX, LAMP_Y[1], { color: C.green, size: 60 }); }
        else { phaseT = 0.42; game.audio.tone(440, 0.08, { wave: 'square', volume: 0.15 }); }
      }
    }
    if (shake > 0) shake -= dt;

    trackBg();
    drawTree(lampsOn, phase === 'go');

    txt(Math.min(3, lampsOn) + ' / ' + 3, W / 2, H * 0.09, 36, C.amber);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.70, 70, C.amber);
    txt('じっと 待つ', W / 2, H * 0.86, 30, C.off);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
