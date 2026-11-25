// K-DS-0059-false-start-dash.js
// 助走突進ゲート — フェイントの合図を見切り、本物の合図が出た瞬間だけ助走から突進する
// 操作: 旗がフェイントで揺れても押さず我慢し、本物の発光合図が出た瞬間だけタップして突進する
// 終わり: 規定回数(5回)を全てフライングなく正しく突進できれば成功。フェイントで押すか反応が遅れれば失敗
// @mechanic: reaction_duel
// @theme: false_start_dash_gate
// 世界観: 跳躍競技のゲート前に立つ選手。旗手が繰り出すフェイントの構えを見切り、本物の発光合図が灯った瞬間だけ助走から一気に突進する
// 残るもの: 正誤(公認記録/フライング失格)+ 正しく飛び出せた回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体状の太いブロック、はっきりした面ごとの明暗差
  var C = {
    sky: '#7ac8e8', sky2: '#a8dcf0', track: '#c8985a', trackDark: '#a87840',
    gate: '#e8e0d0', gateDark: '#a89878', flagFake: '#ff9a3a', flagReal: '#4dff8a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fffaf0', ink: '#0a1420',
  };

  var GAME_TITLE = 'DASH GATE';
  var TOTAL = 5;
  var CX = W * 0.5, GATE_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, done, endWait, finished;
  var ready, hitStop, shake;
  var round, cue, runnerX, runnerDash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, GATE_Y + 60, [[0, C.sky], [1, C.sky2]]);
    game.draw.rect(0, GATE_Y + 60, W, H - GATE_Y - 60, C.trackDark);
    for (var i = 0; i < 6; i++) game.draw.rect(0, GATE_Y + 100 + i * 60, W, 10, C.track);
    game.draw.rect(CX - 8, GATE_Y - 160, 16, 220, C.gateDark);
  }

  function newCue(idx) {
    // フェイント回数はラウンドが進むほど増える
    var fakes = Math.min(3, 1 + Math.floor(idx / 2));
    return { phase: 'wait', t: 0, fakeLeft: fakes, nextT: 0.5 + Math.random() * 0.5, real: false };
  }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; cue = newCue(0); runnerX = W * 0.1; runnerDash = 0;
  }

  function react() {
    if (ready > 0 || done || hitStop > 0 || finished || !cue) return;
    game.audio.play('se_tap', 0.05);
    if (cue.phase === 'real') {
      cleared++;
      hitStop = 0.08;
      runnerDash = 1;
      game.feedback.good(CX, GATE_Y, { text: 'GO!', color: C.good });
      game.fx.burst(CX, GATE_Y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_jump', 0.4);
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, GATE_Y - 200, { color: C.gold, size: 40 });
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; cue = newCue(round);
    } else {
      // フェイントで飛び出した = フライング失格
      hitStop = 0.32;
      game.feedback.bad(CX, GATE_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) react();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateCue(c, dt) {
    c.t += dt;
    if (c.phase === 'wait' && c.t >= c.nextT) {
      c.t = 0;
      if (c.fakeLeft > 0) { c.phase = 'fake'; c.fakeLeft--; c.holdT = 0.28; }
      else { c.phase = 'real'; c.real = true; }
    } else if (c.phase === 'fake') {
      c.holdT -= dt;
      if (c.holdT <= 0) { c.phase = 'wait'; c.t = 0; c.nextT = 0.4 + Math.random() * 0.5; }
    } else if (c.phase === 'real') {
      c.holdT = (c.holdT || 0) + dt;
      if (c.holdT > 0.7 && !finished) {
        // 反応遅れ
        c.phase = 'expired';
        hitStop = 0.32;
        game.feedback.bad(CX, GATE_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawGateLight(c) {
    var lit = c.phase === 'fake' ? C.flagFake : (c.phase === 'real' ? C.flagReal : '#88888833');
    var blink = c.phase === 'real' ? true : (Math.floor(game.time.elapsed * 8) % 2 === 0);
    game.draw.circle(CX, GATE_Y - 150, 34, (c.phase !== 'wait' && blink) ? lit : '#88888833');
  }

  function drawRunner(x, dash) {
    var y = GATE_Y + 70 - dash * 20;
    game.draw.sprite(RUNNER, { '#': C.white }, x + dash * 120, y, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: GATE_Y - 150, press: false, c: null, rx: W * 0.1, rd: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.c = { phase: 'wait', t: 0, fakeLeft: 1, nextT: 0.6, real: false }; demo.reacted = false; demo.rx = W * 0.1; demo.rd = 0; }
    var c = demo.c;
    c.t += dt;
    if (c.phase === 'wait' && c.t >= c.nextT) {
      c.t = 0;
      if (c.fakeLeft > 0) { c.phase = 'fake'; c.fakeLeft--; c.holdT = 0.28; }
      else { c.phase = 'real'; }
    } else if (c.phase === 'fake') {
      c.holdT -= dt;
      if (c.holdT <= 0) { c.phase = 'wait'; c.t = 0; c.nextT = 0.45; }
    } else if (c.phase === 'real' && !demo.reacted) {
      demo.reacted = true;
      demo.press = true;
      demo.rd = 1;
      game.fx.burst(CX, GATE_Y, { color: C.gold, count: 12, speed: 300 });
      game.audio.play('se_jump', 0.2);
    }
    cue = c;
    runnerX = demo.rx; runnerDash = demo.rd;
    if (demo.rd > 0) demo.press = Math.floor(demo.t * 10) % 4 < 2;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGateLight(cue);
      drawRunner(runnerX, runnerDash);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRunner(runnerX, runnerDash);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateCue(cue, dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGateLight(cue);
    drawRunner(runnerX, finished ? runnerDash : 0);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000022', 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.26, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
