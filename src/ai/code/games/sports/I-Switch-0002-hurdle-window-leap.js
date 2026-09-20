// I-Switch-0002-hurdle-window-leap.js
// ハードルウィンドウ — 足元の窓が開いた瞬間にボタンを押し、選手をハードルの上まで跳ばせる
// 操作: 迫るハードルの直前、足元の当たり判定窓が開いている間にボタンをタップして跳躍させる
// 終わり: 規定本数(5本)を全て跳び越えれば成功。1本でも窓を外せば失敗
// @mechanic: timing_window
// @theme: hurdle_sprint_track
// 世界観: 陸上競技場のトラックを疾走する選手。次々現れるハードルの直前、踏み切りの窓が開いた瞬間だけジャンプできる
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び越えた本数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの多色パレット、太い輪郭線、明快なグラデ空
  var C = {
    sky: '#7ec8ff', sky2: '#c8ecff', track: '#c8863a', trackLine: '#f0e0b0',
    hurdle: '#e04030', hurdleDark: '#902818', runner: '#2050c0', runnerAccent: '#ffd040',
    windowOn: '#3fff8a', windowOff: '#ff4d5e', gold: '#ffd400', good: '#4dff8a', bad: '#ff4d5e',
    white: '#ffffff', ink: '#101018',
  };

  var GAME_TITLE = 'HURDLE LEAP';
  var TOTAL = 5;
  var RUNNER_X = W * 0.28, GROUND_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, done, endWait, finished;
  var ready, hitStop, shake;
  var round, hurdle, jumpT, jumping;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_RUN = [
    ['.##.', '####', '.##.', '#.#.'],
    ['.##.', '####', '.##.', '.#.#'],
  ];
  var RUNNER_JUMP = ['.##.', '####', '##.#', '....'];

  function bg() {
    game.draw.gradient(0, GROUND_Y, [[0, C.sky2], [1, C.sky]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.track);
    for (var i = 0; i < 10; i++) {
      game.draw.rect(0, GROUND_Y + 40 + i * 60, W, 6, C.trackLine, 0.5);
    }
  }

  function newHurdle(r) {
    var dur = Math.max(0.9, 1.6 - r * 0.12);
    var winHalf = Math.max(0.06, 0.13 - r * 0.014);
    return { t: 0, dur: dur, winCenter: 0.72, winHalf: winHalf, telegraphed: false, resolved: false };
  }

  function initGame() {
    cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; jumping = false; jumpT = 0;
    hurdle = newHurdle(0);
  }

  function hurdleX(h) { return W + 160 - (W + 160 - RUNNER_X - 40) * Math.min(1, h.t / h.dur); }

  function resolveJump() {
    if (state !== S.PLAYING || ready > 0 || finished || !hurdle || hurdle.resolved) return;
    hurdle.resolved = true;
    var p = hurdle.t / hurdle.dur;
    var inWindow = Math.abs(p - hurdle.winCenter) <= hurdle.winHalf;
    if (inWindow) {
      cleared++;
      jumping = true; jumpT = 0;
      hitStop = 0.1;
      game.feedback.good(RUNNER_X, GROUND_Y - 60, { text: 'NICE', color: C.good });
      game.fx.burst(RUNNER_X, GROUND_Y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_jump', 0.4);
      if (cleared === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 40 });
      if (cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      hurdle = newHurdle(round);
      ready = 0.05;
    } else {
      hitStop = 0.35;
      game.feedback.bad(RUNNER_X, GROUND_Y - 30, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.1); resolveJump(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawHurdle(h) {
    if (!h) return;
    var x = hurdleX(h);
    var p = h.t / h.dur;
    // telegraph: 窓が開く0.5〜0.8秒前に予告点滅
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    var winStart = h.winCenter - h.winHalf, winEnd = h.winCenter + h.winHalf;
    if (p > winStart - 0.22 && p < winStart && blink) {
      game.draw.circle(RUNNER_X, GROUND_Y - 110, 18, C.windowOn, 0.5);
    }
    var inWin = p >= winStart && p <= winEnd;
    game.draw.rect(x - 10, GROUND_Y - 190, 20, 190, C.hurdleDark);
    game.draw.rect(x - 60, GROUND_Y - 190, 120, 22, inWin ? C.windowOn : C.hurdle);
    game.draw.rect(x - 60, GROUND_Y - 8, 120, 8, C.hurdleDark);
  }

  function drawRunner() {
    var frames = jumping ? [RUNNER_JUMP] : RUNNER_RUN;
    var idx = jumping ? 0 : Math.floor(game.time.elapsed * 8) % 2;
    var jy = 0;
    if (jumping) {
      jumpT += 0; // set in update
      var jp = Math.min(1, jumpT / 0.5);
      jy = -Math.sin(jp * Math.PI) * 150;
    }
    game.draw.sprite(frames[idx], { '#': C.runner }, RUNNER_X, GROUND_Y - 40 + jy, 20, { anchor: 'center' });
    game.draw.circle(RUNNER_X + 18, GROUND_Y - 70 + jy, 8, C.runnerAccent);
  }

  var demo = { t: 0, gx: RUNNER_X + 200, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      round = 0; hurdle = newHurdle(0); hurdle.dur = 1.6; jumping = false; jumpT = 0;
    }
    if (hurdle && !hurdle.resolved) {
      hurdle.t += dt;
      var p = hurdle.t / hurdle.dur;
      var winStart = hurdle.winCenter - hurdle.winHalf, winEnd = hurdle.winCenter + hurdle.winHalf;
      if (p >= winStart && p <= winEnd && !hurdle.telegraphed) {
        hurdle.telegraphed = true;
        hurdle.resolved = true;
        jumping = true; jumpT = 0;
        demo.press = true;
        game.feedback.good(RUNNER_X, GROUND_Y - 60, { text: 'NICE', color: C.good });
        game.audio.play('se_jump', 0.2);
      }
      if (p >= 1 && !hurdle.resolved) { hurdle.resolved = true; }
    } else if (jumping) {
      jumpT += dt;
      if (jumpT > 0.5) { jumping = false; hurdle = newHurdle(0); hurdle.dur = 1.6; demo.press = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawHurdle(hurdle && !hurdle.resolved ? hurdle : null);
      drawRunner();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
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
      drawRunner();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '本!', W / 2, H * 0.18, 26, C.ink);
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
      if (jumping) {
        jumpT += dt;
        if (jumpT > 0.5) jumping = false;
      } else if (hurdle && !hurdle.resolved) {
        hurdle.t += dt;
        if (hurdle.t / hurdle.dur >= 1) {
          hurdle.resolved = true;
          hitStop = 0.35;
          game.feedback.bad(RUNNER_X, GROUND_Y - 30, { text: 'MISS' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawHurdle(hurdle && !hurdle.resolved ? hurdle : null);
    drawRunner();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['D4', 0.25], ['E4', 0.25], ['G4', 0.5]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
