// GH-DS-0033-hallway-hold-still.js
// ホールドスティル — 監視の目が向いている間は触れず、逸れた隙に指で押して進む
// 操作: 画面を押し続けると前進する。監視灯が赤くなったら指を離して静止する
// 終わり: 廊下の突き当り(進行度100%)まで進めば成功。見られている間に触れると即座に失敗
// @mechanic: freeze
// @theme: sentry_hallway
// 世界観: 無人の警備区画。天井の監視灯が周期的に振り返る。灯が赤い間は空気すら動かせない、逸れた隙にだけ進める
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // HD POST 3D: 低彩度・褐色寄り。ブルーム(半透明円の重ね)とビネットでコントラストを潰す
  var C = {
    bg1: '#25201c', bg2: '#141210', wallA: '#3a332c', wallB: '#2a251f',
    floor1: '#332c24', floor2: '#221d17', pillar: '#4a4136',
    eyeSafe: '#4a9a6a', eyeWarn: '#d9a53d', eyeDanger: '#e0483a',
    runner: '#c9b08a', runnerDark: '#7a6448',
    good: '#7de8a0', bad: '#ff5a4a', gold: '#ffd400', white: '#f2ece2', ink: '#0a0806',
  };

  var GAME_TITLE = 'HOLD STILL';
  var TIME_LIMIT = 14;
  var SENTRY_Y = H * 0.30;
  var GOAL_Y = H * 0.30;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  // phase: 'safe' | 'warn' | 'watch'
  var progress, phase, phaseT, caught, perfect, totalTime, done, endWait, finished, ok;
  var ready, hitStop, shake, walkFrame, walkAnimT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_A = ['.##.', '####', '.##.', '#..#'];
  var RUN_B = ['.##.', '####', '.##.', '.##.'];
  var CAUGHT_S = ['.##.', '####', '#.#.', '..#.'];

  function hallwayBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, '#0c0a08']]);
    // 奥へ収束する壁(疑似奥行き)
    for (var i = 0; i < 7; i++) {
      var t = i / 7;
      var y = SENTRY_Y + 60 + t * (H * 0.42);
      var inset = t * W * 0.30;
      game.draw.rect(inset, y, W - inset * 2, 6, C.pillar, 0.35);
    }
    game.draw.rect(0, SENTRY_Y + 40, W, H * 0.46, C.floor1);
    game.draw.rect(0, SENTRY_Y + 40, W, 8, C.floor2);
    // ブルーム(光のにじみ)
    game.draw.circle(W / 2, SENTRY_Y - 60, 240, C.pillar, 0.10);
    // ビネット
    game.draw.rect(0, 0, W, H * 0.10, '#000000', 0.35);
    game.draw.rect(0, H * 0.92, W, H * 0.08, '#000000', 0.4);
  }

  function drawSentry() {
    var col = phase === 'watch' ? C.eyeDanger : (phase === 'warn' ? C.eyeWarn : C.eyeSafe);
    var pulse = phase === 'watch' ? (Math.floor(game.time.elapsed * 8) % 2 === 0 ? 1 : 0.65) : 1;
    game.draw.circle(W / 2, SENTRY_Y - 90, 70, C.pillar);
    game.draw.circle(W / 2, SENTRY_Y - 90, 40, col, pulse);
    game.draw.circle(W / 2, SENTRY_Y - 90, 16, C.ink, 0.6);
    game.draw.circle(W / 2, SENTRY_Y - 90, 90, col, 0.12);
  }

  function drawRunner(y, frame, isCaught) {
    var x = W / 2;
    game.draw.circle(x, y + 40, 30, '#000000', 0.3);
    game.draw.sprite(isCaught ? CAUGHT_S : frame, { '#': isCaught ? C.bad : C.runner, '.': null }, x, y - 30, 20, { anchor: 'center' });
  }

  function initGame() {
    progress = 0; phase = 'safe'; phaseT = 2.0; caught = false; perfect = true;
    totalTime = 0; done = false; endWait = 0; finished = false; ok = false;
    ready = 0.8; hitStop = 0; shake = 0; walkFrame = 0; walkAnimT = 0;
  }

  function setPhase(p, dur) { phase = p; phaseT = dur; }

  function advancePhase() {
    if (phase === 'safe') { setPhase('warn', 0.55 + Math.random() * 0.15); }
    else if (phase === 'warn') { setPhase('watch', 1.0 + Math.random() * 0.8); game.audio.play('se_bad', 0.15); }
    else {
      setPhase('safe', 1.4 + Math.random() * 1.3);
      if (!caught) game.feedback.good(W / 2, SENTRY_Y - 90, { text: null, sound: 'se_good', count: 4 });
    }
  }

  function getCaught() {
    if (caught || done) return;
    caught = true; perfect = false; ok = false; finished = true;
    hitStop = 0.4; shake = 0.35;
    game.fx.flash(C.bad, 0.25);
    game.feedback.bad(W / 2, SENTRY_Y + 40, { text: 'CAUGHT' });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = Math.round(progress);
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function() {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (phase === 'watch') { getCaught(); return; }
    game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT ゴースト実演: 実際の phase/advancePhase を流用し、隙を見て進む例+捕まる例を見せる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.88, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { progress = 0; setPhase('safe', 2.0); caught = false; }
    phaseT -= dt;
    if (phaseT <= 0) advancePhase();
    var holding = phase !== 'watch' && cyc < 4.4;
    if (cyc > 4.6 && cyc < 5.0) holding = true; // あえて危険中に押す失敗デモ
    demo.press = holding;
    if (holding && phase !== 'watch') { progress = Math.min(100, progress + 26 * dt); }
    if (holding && phase === 'watch' && !caught && cyc > 4.6) { caught = true; hitStop = 0.3; game.feedback.bad(W / 2, SENTRY_Y + 40, { text: 'CAUGHT' }); game.audio.play('se_bad', 0.3); }
    if (cyc > 5.5 && caught) { caught = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      hallwayBg();
      stepDemo(dt);
      drawSentry();
      var gy = GOAL_Y + 40 + (H * 0.60) * (1 - progress / 100);
      drawRunner(gy, walkFrame ? RUN_B : RUN_A, caught);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 52, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.135, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      hallwayBg();
      drawSentry();
      var gy2 = GOAL_Y + 40 + (H * 0.60) * (1 - progress / 100);
      drawRunner(gy2, RUN_A, caught);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(Math.round(progress) + ' / ' + 100, W / 2, H * 0.15, 30, C.white);
      if (ok && perfect) txt('PERFECT', W / 2, H * 0.20, 28, C.gold);
      if (!ok && progress >= 80) txt('あと少し!', W / 2, H * 0.20, 28, C.gold);
      var best = Math.max(game.best, finalScore);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.25, 28, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { perfect: perfect }); else game.end.failure({ progress: finalScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= TIME_LIMIT) { ok = false; finished = true; finish(); }
      phaseT -= dt;
      if (phaseT <= 0) advancePhase();
      if (phase !== 'watch' && game.input.pressing) {
        progress = Math.min(100, progress + 24 * dt);
        walkAnimT += dt;
        if (walkAnimT > 0.12) { walkAnimT = 0; walkFrame = walkFrame ? 0 : 1; }
      } else if (phase === 'watch' && game.input.pressing) {
        getCaught();
      }
      if (progress >= 100 && !finished) { ok = true; finished = true; finish(); }
      if (Math.floor(progress / 25) > Math.floor((progress - 0.001) / 25) && progress > 1 && progress < 100) {
        game.fx.popup(Math.round(progress) + '%', W / 2, H * 0.22, { color: C.gold, size: 42 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    if (shake > 0) shake -= dt;

    hallwayBg();
    drawSentry();
    var gy3 = GOAL_Y + 40 + (H * 0.60) * (1 - progress / 100);
    if (!finished || caught) drawRunner(gy3, walkFrame ? RUN_B : RUN_A, caught);

    game.draw.rect(60, 50, W - 120, 22, C.ink, 0.55);
    game.draw.rect(60, 50, (W - 120) * (progress / 100), 22, C.good);
    txt(Math.round(progress) + ' / ' + 100, W / 2, 116, 32, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 72, C.gold);
  });

  game.onStart(function() {
    game.audio.melody(
      [['D3', 0.6], ['R', 0.3], ['F3', 0.5], ['R', 0.4], ['D3', 0.6], ['R', 0.6]],
      { tempo: 80, wave: 'triangle', volume: 0.06, loop: true, bass: [['D2', 1.2], ['A1', 1.2]], bassWave: 'sine', bassVolume: 0.05 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
