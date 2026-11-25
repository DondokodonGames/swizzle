// I-GBA-0051-eye-freeze-sneak.js
// アイフリーズスニーク — 見張りの目が閉じている間だけタップして進み、開いている間は指一本触れず耐える
// 操作: 目が閉じている合図の時だけタップして一歩進む。目が開いたら何もタップしない
// 終わり: 規定歩数(6歩)進みきれば成功。目が開いている間にタップしたら即失敗
// @mechanic: freeze
// @theme: watchtower_eye_sneak
// 世界観: 一枚絵の見張り塔。塔の上で巨大な目が開閉を繰り返す中、閉じた隙だけ足音を殺して奥へ進む忍び手
// 残るもの: 正誤(CLEAR/GAME OVER) + 進んだ歩数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白地に黒インク一色、面は走査線ハッチングで表現。差し色は危険信号の赤のみ
  var C = {
    bg: '#eae5d6', bg2: '#e0dac8', ink: '#141210', paper: '#f4f0e2',
    danger: '#c23a2e', good: '#2e6a3a', gold: '#8a6a20', white: '#f4f0e2', accentInk: '#141210',
  };

  var GAME_TITLE = 'EYE FREEZE';
  var TOTAL = 6;
  var SAFE_T = 0.75, WARN_T = 0.5, WATCH_T = 0.85;
  var CYCLE = SAFE_T + WARN_T + WATCH_T;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WALKER = ['.#.', '###', '.#.', '#.#'];
  var EYE_OPEN = ['#######', '#..#..#', '#.###.#', '#..#..#', '#######'];
  var EYE_SHUT = ['.......', '.......', '#######', '.......', '.......'];

  var cycleT, phase, usedThisSafe, steps;
  var done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function initGame() {
    cycleT = 0; phase = 'SAFE'; usedThisSafe = false; steps = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function updatePhase(dt) {
    cycleT += dt;
    if (phase === 'SAFE' && cycleT >= SAFE_T) { phase = 'WARN'; cycleT = 0; }
    else if (phase === 'WARN' && cycleT >= WARN_T) { phase = 'WATCH'; cycleT = 0; }
    else if (phase === 'WATCH' && cycleT >= WATCH_T) { phase = 'SAFE'; cycleT = 0; usedThisSafe = false; }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 14; i++) game.draw.line(0, i * (H / 14), W, i * (H / 14), C.ink, 0.03);
  }

  function drawEye(ph) {
    var frame = ph === 'WATCH' ? EYE_OPEN : (ph === 'WARN' ? (Math.floor(game.time.elapsed * 10) % 2 === 0 ? EYE_OPEN : EYE_SHUT) : EYE_SHUT);
    var col = ph === 'WATCH' ? C.danger : C.ink;
    game.draw.rect(W * 0.5 - 220, H * 0.22, 440, 260, C.paper);
    game.draw.rect(W * 0.5 - 220, H * 0.22, 440, 8, C.ink);
    game.draw.sprite(frame, { '#': col }, W / 2, H * 0.34, 30, { anchor: 'center' });
  }

  function drawPath(s) {
    var y = H * 0.62;
    game.draw.rect(W * 0.1, y, W * 0.8, 14, C.ink, 0.5);
    for (var i = 0; i <= TOTAL; i++) {
      var x = W * 0.1 + (W * 0.8) * (i / TOTAL);
      game.draw.circle(x, y + 7, 8, i <= s ? C.good : C.ink, i <= s ? 1 : 0.3);
    }
    var px = W * 0.1 + (W * 0.8) * (s / TOTAL);
    game.draw.sprite(WALKER, { '#': C.ink }, px, y - 60, 16, { anchor: 'center' });
  }

  function tapAction(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'WATCH') {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(x, y, { text: 'CAUGHT' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
      return;
    }
    if (usedThisSafe) {
      game.fx.popup('', x, y, { color: C.ink, size: 1 });
      return;
    }
    usedThisSafe = true;
    steps++;
    game.feedback.good(x, y, { text: 'STEP', color: C.good, size: 24 });
    game.audio.play('se_good', 0.3);
    if (!halfShown && steps >= Math.ceil(TOTAL / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', W / 2, H * 0.5, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.4);
    }
    if (steps >= TOTAL) { ok = true; finished = true; hitStop = 0.12; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapAction(x, y);
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var full = CYCLE * 3 + 0.8;
    var cyc = demo.t % full;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    updatePhase(dt);
    demo.press = false;
    if (phase === 'SAFE' && !usedThisSafe && cycleT > SAFE_T * 0.4) {
      demo.press = true;
      tapDemoAdvance();
    }
  }
  function tapDemoAdvance() {
    if (usedThisSafe) return;
    usedThisSafe = true;
    steps++;
    game.feedback.good(W / 2, H * 0.62, { text: 'STEP', color: C.good, size: 20 });
    game.audio.play('se_good', 0.15);
    if (steps >= TOTAL) { steps = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (steps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawEye(phase);
      drawPath(steps);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawEye('SAFE');
      drawPath(steps);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.danger);
      txt(steps + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - steps) + '歩!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, total: TOTAL });
        else game.end.failure({ steps: steps, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updatePhase(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawEye(phase);
    drawPath(steps);

    txt(steps + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.6], ['A3', 0.6]], { tempo: 90, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
