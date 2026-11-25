// K-DS-0019-stage-step-stomp.js
// ステージステップ — 光る左右のパネルを、一定のビートに合わせて交互に踏み鳴らす
// 操作: ビートに合わせて光ったパネル(左右交互)をタップして踏む
// 終わり: 規定歩数(10歩)を踏み切れば成功。3回リズムを外せば失敗
// @mechanic: alternate_tap
// @theme: stage_light_step_floor
// 世界観: 発光床のダンスステージ。左右のパネルが交互に光り、踏み手はビートに合わせて足を踏み鳴らしステップを刻む
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏み切った歩数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#120a1c', bg2: '#0a0614', panelL: '#2a1a3a', panelR: '#1a2a3a',
    accent: '#ff3d9a', accent2: '#3dd4ff', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'STEP STOMP';
  var TOTAL = 10;
  var MISS_LIMIT = 3;
  var LX = W * 0.28, RX = W * 0.72, FOOT_Y = H * 0.6;
  var PANEL_W = 260, PANEL_H = 360;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER = ['..##..', '.####.', '..##..', '.#..#.', '#....#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.12 + i * 40, W, 2, '#ffffff05');
  }

  var side, steps, misses, interval, beatT, litSide, glowT, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    side = -1; steps = 0; misses = 0; interval = 0.85; beatT = 0; litSide = 1; glowT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function tryStep(x, y) {
    if (ready > 0 || done || finished || hitStop > 0) return;
    var tappedSide = x < W * 0.5 ? -1 : 1;
    var p = beatT / interval;
    var win = p >= 0.65 && p <= 1.05;
    game.audio.play('se_tap', 0.06);
    if (win && tappedSide === litSide) {
      steps++;
      hitStop = 0.08;
      shake = 0.1;
      var golden = steps % 5 === 0;
      game.feedback.good(tappedSide < 0 ? LX : RX, FOOT_Y, { text: golden ? 'PERFECT' : 'GOOD', color: golden ? C.gold : C.good });
      game.audio.play(golden ? 'se_milestone' : 'se_good', 0.3);
      interval = Math.max(0.55, interval - 0.015);
      if (steps >= Math.ceil(TOTAL / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup(steps + ' / ' + TOTAL, W / 2, H * 0.3, { color: C.gold, size: 38 });
      }
      if (steps >= TOTAL) { ok = true; finished = true; finish(); return; }
      litSide *= -1; beatT = 0;
    } else {
      misses++;
      hitStop = 0.25;
      shake = 0.22;
      game.feedback.bad(tappedSide < 0 ? LX : RX, FOOT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tryStep(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawScene(litSideLocal, glow) {
    bg();
    game.draw.rect(LX - PANEL_W / 2, FOOT_Y - PANEL_H / 2, PANEL_W, PANEL_H, C.panelL, litSideLocal === -1 ? 0.5 + glow * 0.5 : 0.7);
    game.draw.rect(RX - PANEL_W / 2, FOOT_Y - PANEL_H / 2, PANEL_W, PANEL_H, C.panelR, litSideLocal === 1 ? 0.5 + glow * 0.5 : 0.7);
    game.draw.rect(LX - PANEL_W / 2, FOOT_Y - PANEL_H / 2, PANEL_W, 10, litSideLocal === -1 ? C.accent : '#ffffff20');
    game.draw.rect(RX - PANEL_W / 2, FOOT_Y - PANEL_H / 2, PANEL_W, 10, litSideLocal === 1 ? C.accent2 : '#ffffff20');
    game.draw.sprite(DANCER, { '#': C.white }, W / 2, H * 0.28, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LX, gy: FOOT_Y, press: false, lit: 1, bt: 0, iv: 0.85, steps: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demo.lit = 1; demo.bt = 0; demo.iv = 0.85; demo.steps = 0; }
    demo.bt += dt;
    var p = demo.bt / demo.iv;
    demo.press = p >= 0.65 && p <= 0.85;
    if (p >= 1) {
      demo.bt = 0; demo.lit *= -1; demo.steps++;
    }
    demo.gx = demo.lit < 0 ? LX : RX; demo.gy = FOOT_Y;
    litSide = demo.lit; steps = Math.min(TOTAL, demo.steps);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.lit, demo.press ? 1 : 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(steps + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - steps <= 2) txt('あと' + (TOTAL - steps) + '歩!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, total: TOTAL, misses: misses });
        else game.end.failure({ steps: steps, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT / interval >= 1.2) {
        misses++;
        hitStop = 0.25;
        shake = 0.22;
        game.feedback.bad(litSide < 0 ? LX : RX, FOOT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        beatT = 0; litSide *= -1;
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
      }
    }
    if (shake > 0) shake -= dt;

    var p = beatT / interval;
    var glow = p >= 0.55 ? Math.min(1, (p - 0.55) / 0.45) : 0;
    drawScene(litSide, glow);

    txt(steps + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (steps / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['G4', 0.25], ['C4', 0.25], ['G4', 0.25]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
