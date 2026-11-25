// D-20222026-0035-shadow-corridor-still.js
// シャドウコリドー・スティル — 番人が振り返る廊下を、目を離した隙にだけ忍び足で進む
// 操作: 番人が背を向けている間だけタップして一歩進む。振り返っている間は指を触れない
// 終わり: 振り返られずに規定歩数進めば成功。見られている間に触れる/時間切れは失敗
// @mechanic: freeze
// @theme: shadow_corridor_still
// 世界観: 薄暗い回廊を抜けたい侵入者が、番人が振り返る一瞬だけ息を止め、背を向けた隙にだけ忍び足を進める
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ歩数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: セピア〜灰の低彩度単色階調のみ。アクセントは危険色1色に絞る
  var C = {
    bg: '#2a2620', bg2: '#161410', wall: '#3a3428', wallDk: '#201c16',
    guard: '#9a9080', guardAlert: '#ff4d5e', hero: '#c8bca0',
    good: '#8ac878', bad: '#ff4d5e', gold: '#e8d078', ink: '#eee6d4',
  };

  var GAME_TITLE = 'CORRIDOR STILL';
  var MAX_TIME = 13;
  var NEEDED = 5;
  var SAFE_LEN = 1.5, TELE_LEN = 0.55, LOOK_LEN = 1.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0806', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARD_AWAY_S = ['.##.', '####', '.##.', '.##.'];
  var GUARD_LOOK_S = ['.##.', '#..#', '####', '.##.'];
  var HERO_S = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.12);
    for (var i = 0; i < 3; i++) game.draw.rect(W * (0.1 + i * 0.32), H * 0.16, 60, H * 0.5, C.wallDk, 0.4);
  }

  var phase, phaseT, steps, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function setPhase(p) { phase = p; phaseT = 0; }

  function initGame() {
    steps = 0; roundClock = 0; halfCalled = false;
    setPhase('safe');
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  var GX = W * 0.5, GY = H * 0.32;
  var HY = H * 0.8;

  function drawScene() {
    bg();
    var danger = phase === 'look';
    var tele = phase === 'tele';
    game.draw.sprite(danger ? GUARD_LOOK_S : GUARD_AWAY_S, { '#': danger ? C.guardAlert : C.guard }, GX, GY, 24, { anchor: 'center' });
    if (tele) {
      var f = 1 - phaseT / TELE_LEN;
      game.draw.circle(GX, GY, 120 + f * 40, C.guardAlert, 0.25 * (1 - f));
    }
    var hx = W * 0.2 + (W * 0.6) * Math.min(1, steps / NEEDED);
    game.draw.sprite(HERO_S, { '#': C.hero }, hx, HY, 20, { anchor: 'center' });
  }

  function tapStep(x, y) {
    if (phase === 'safe') {
      steps += 1;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.hero, count: 12, speed: 260 });
      game.audio.play('se_tap', 0.25);
      if (steps === Math.ceil(NEEDED * 0.5)) {
        game.fx.popup('NICE', W * 0.5, H * 0.5, { color: C.gold, size: 30 });
        game.audio.play('se_milestone', 0.3);
      }
      if (steps >= NEEDED) {
        finished = true; ok = true; hitStop = 0.3;
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(GX, GY, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tapStep(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function tickPhase(dt) {
    phaseT += dt;
    if (phase === 'safe' && phaseT >= SAFE_LEN) { setPhase('tele'); game.audio.play('se_tap', 0.1); }
    else if (phase === 'tele' && phaseT >= TELE_LEN) setPhase('look');
    else if (phase === 'look' && phaseT >= LOOK_LEN) setPhase('safe');
  }

  var demo = { t: 0, gx: W * 0.7, gy: HY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    tickPhase(dt);
    var hx = W * 0.2 + (W * 0.6) * Math.min(1, steps / NEEDED);
    demo.gx = hx; demo.gy = HY;
    demo.press = phase === 'safe' && Math.floor(phaseT * 2) % 2 === 0 && phaseT > 0.3;
    if (demo.press && Math.floor(phaseT * 2) !== Math.floor((phaseT - dt) * 2) && !finished) tapStep(hx, HY);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundClock === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(steps + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - steps) + '歩!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, needed: NEEDED });
        else game.end.failure({ steps: steps, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      tickPhase(dt);
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', W * 0.5, H * 0.5, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(GX, GY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(steps + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.wallDk, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4], ['D4', 0.8]], { tempo: 88, wave: 'triangle', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
