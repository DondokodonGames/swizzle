// D-20132016-0073-sigil-knight-exact-strike.js
// シジルナイト・エグザクトストライク — 墓所の番人に挑む聖印の剣士が、残り体力にぴったり届く一撃を刻む
// 操作: 番人をタップして斬りつける。残り体力の数だけ刻んだら、追撃せず手を止めて封印する
// 終わり: 体力とちょうど同じ回数で止められれば封印成功。数え違えて叩きすぎれば逆襲を受けて失敗
// @mechanic: count_exact
// @theme: sigil_knight_exact_strike
// 世界観: 墓所に挑む聖印の剣士が、一度きりの決着で番人の残り体力にぴったり届く回数だけ剣を振るい、過たず封印を刻む
// 残るもの: 正誤(CLEAR/GAME OVER) + 刻んだ回数 / 目標回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値+朱一色のみ、ディザで階調を作る
  var C = {
    bg: '#0a0a0c', ink: '#f2f0ea', dim: '#3a3a3e', red: '#d8283a',
    good: '#f2f0ea', bad: '#d8283a', gold: '#f2f0ea', white: '#f2f0ea',
  };

  var GAME_TITLE = 'EXACT STRIKE';
  var CX = W * 0.5, GY = H * 0.42;
  var N_MIN = 4, N_MAX = 6;
  var LOCK_WINDOW = 0.65;
  var HIT_TIMEOUT = 3.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARDIAN_FRAMES = [
    ['.####.', '##..##', '######', '#.##.#', '##..##'],
    ['.####.', '##..##', '######', '#.##.#', '.#..#.'],
  ];
  var KNIGHT_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];

  var N, hits, phase, lockT, hitT, lastHitFlash;
  var finished, done, endWait, hitStop, shake, ready;

  function initGame() {
    N = N_MIN + Math.floor(game.random(0, N_MAX - N_MIN + 1));
    hits = 0; phase = 'strike'; lockT = 0; hitT = 0; lastHitFlash = 0;
    finished = false; done = false; endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#161618'], [1, C.bg]]);
    for (var i = 0; i < 10; i++) {
      game.draw.rect(0, i * (H / 10), W, (H / 10) * 0.5, '#ffffff', 0.02);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawGuardian(danger) {
    var bobY = Math.sin(game.time.elapsed * 2.1) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.5) * 4;
    var flashOn = lastHitFlash > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0;
    var col = flashOn ? C.red : (danger ? C.red : C.ink);
    game.draw.sprite(GUARDIAN_FRAMES[Math.floor(game.time.elapsed * 2.5) % 2], { '#': col }, CX + swayX, GY + bobY, 18, { anchor: 'center' });
  }

  function drawKnight() {
    var bobY = Math.sin(game.time.elapsed * 2.4 + 1) * 4;
    game.draw.sprite(KNIGHT_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.dim }, W * 0.18, H * 0.62 + bobY, 13, { anchor: 'center' });
  }

  function drawPips() {
    var gap = (W * 0.6) / N;
    var gx = W * 0.2;
    for (var i = 0; i < N; i++) {
      var struck = i < hits;
      game.draw.circle(gx + gap * i + gap / 2, H * 0.58, 16, struck ? C.dim : C.ink, struck ? 0.3 : 1);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveResult(success) {
    if (finished) return;
    finished = true;
    ok = success;
    hitStop = success ? 0.16 : 0.4;
    if (success) {
      game.feedback.good(CX, GY, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, GY, { color: C.ink, count: 20, speed: 400 });
      game.audio.play('se_break', 0.5);
    } else {
      game.feedback.bad(CX, GY, { text: 'MISS' });
      shake = 0.35;
      game.audio.play('se_bad', 0.4);
    }
    finish();
  }

  function strike() {
    if (phase !== 'strike' || finished || ready > 0) return;
    if (hits >= N) { resolveResult(false); return; } // 過剰打撃=逆襲
    hits++;
    hitT = 0; lastHitFlash = 0.2;
    game.audio.play('se_tap', 0.2);
    game.feedback.good(CX, GY, { text: 'GOOD', color: C.good, size: 20 });
    game.audio.play('se_correct', 0.25);
    if (hits === Math.ceil(N / 2)) { game.fx.popup('あと' + (N - hits) + '!', CX, GY - 180, { color: C.ink, size: 30 }); game.audio.play('se_milestone', 0.3); }
    if (hits === N) { phase = 'lock'; lockT = 0; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'strike') strike();
    else if (phase === 'lock') {
      // 封印待ちに追撃してしまうと過剰打撃
      game.audio.play('se_tap', 0.1);
      resolveResult(false);
    }
  });

  var demo = { t: 0, gx: CX, gy: GY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var stepDur = 3.0 / N;
    if (cyc < 3.0) {
      var idx = Math.floor(cyc / stepDur);
      if (idx > hits && idx <= N && phase === 'strike') {
        demo.gx = CX; demo.gy = GY; demo.press = true;
        strike();
      } else if ((cyc % stepDur) > stepDur * 0.5) {
        demo.press = false;
      }
    } else if (cyc < 3.0 + LOCK_WINDOW + 0.4) {
      demo.press = false;
      if (phase === 'lock' && !finished) {
        lockT += dt;
        if (lockT >= LOCK_WINDOW) resolveResult(true);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (N === undefined) initGame();
      bg();
      stepDemo(dt);
      drawKnight();
      drawGuardian(hits >= N - 1);
      drawPips();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawKnight();
      drawGuardian(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + N, W / 2, H * 0.14, 32, C.ink);
      if (!ok && hits === N) txt('あと少し!', W / 2, H * 0.19, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { hits: hits, target: N };
        if (ok) game.end.success(hits, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      hitT += dt;
      if (phase === 'strike' && hitT >= HIT_TIMEOUT) {
        resolveResult(false);
      } else if (phase === 'lock') {
        lockT += dt;
        if (lockT >= LOCK_WINDOW) resolveResult(true);
      }
    }
    if (shake > 0) shake -= dt;
    if (lastHitFlash > 0) lastHitFlash -= dt;

    bg();
    drawKnight();
    if (!finished) drawGuardian(hits >= N - 1); else drawGuardian(false);
    drawPips();
    txt(hits + ' / ' + N, W / 2, H * 0.06, 32, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['A3', 0.3], ['C4', 0.3], ['E4', 0.6]], { tempo: 118, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
