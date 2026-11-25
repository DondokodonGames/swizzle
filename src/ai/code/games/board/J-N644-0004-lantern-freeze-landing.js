// J-N644-0004-lantern-freeze-landing.js
// ランタンフリーズランディング — 灯りが揺れている間は動かず我慢し、消えた瞬間だけ足場へ飛び乗る
// 操作: 灯りが灯っている(揺れる)間はタップ禁止。灯りが消えた瞬間にタップして足場へ飛び乗る
// 終わり: 3回連続で正しいタイミングで飛び乗れれば成功。早すぎ/遅すぎのタップが1回でもあれば失敗
// @mechanic: freeze
// @theme: lantern_freeze_landing
// 世界観: 夜市の軽業師が、揺れるランタンの灯りが消えた一瞬だけを見極めて、縮んでいく次の足場へ飛び乗り続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛び乗れた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側は明暗2色だけ
  var C = {
    bg: '#2a1b3d', bg2: '#1a0f28', outline: '#100816',
    lit: '#ffd166', litDark: '#e0a83a', dim: '#5a4a70',
    plat: '#f2f0ff', platDark: '#b9b2d9',
    good: '#5ce08a', bad: '#ff5c7a', gold: '#ffd166', ink: '#f2f0ff',
  };

  var GAME_TITLE = 'LANTERN LEAP';
  var TIME_LIMIT = 11;
  var NEEDED = 3;
  var CX = W * 0.5, CY = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.outline, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERF_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, 0, W, H, C.outline, 0.15);
  }

  var P = { WANDER: 0, WINDOW: 1 };
  var round, phase, phaseT, wanderDur, done, endWait, finished, ready, hitStop, shake, halfCalled, platR;

  function newRound() {
    phase = P.WANDER; phaseT = 0;
    wanderDur = game.random(1.1, 1.9);
    platR = 190 - round * 40;
  }

  function initGame() {
    round = 0; newRound();
    done = false; endWait = 0; finished = false; halfCalled = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptTap(x, y) {
    if (finished) return;
    if (phase === P.WINDOW) {
      round++;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_jump', 0.4);
      if (round === Math.ceil(NEEDED / 2) && !halfCalled) {
        halfCalled = true;
        game.fx.popup('NICE', x, y - 130, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (round >= NEEDED) {
        ok = true; finished = true; hitStop = 0.2;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        newRound();
      }
    } else {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepPlay(dt) {
    phaseT += dt;
    if (phase === P.WANDER && phaseT >= wanderDur) {
      phase = P.WINDOW; phaseT = 0;
      game.audio.play('se_powerup', 0.25);
    } else if (phase === P.WINDOW && phaseT >= 0.7) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  }

  function drawScene() {
    var telegraph = phase === P.WANDER && (wanderDur - phaseT) < 0.6;
    var lit = phase === P.WANDER;
    var flick = telegraph && Math.floor(game.time.elapsed * 14) % 2 === 0;
    var col = (lit && !flick) ? C.lit : (phase === P.WINDOW ? C.dim : C.litDark);
    game.draw.circle(CX, CY - 260, platR * 0.7, col, 0.5);
    game.draw.circle(CX, CY - 260, 40, lit ? C.lit : C.dim);
    game.draw.circle(CX, CY + 250, platR, C.platDark);
    game.draw.circle(CX, CY + 250, platR - 14, C.plat);
    var bx = CX + (lit ? Math.sin(game.time.elapsed * 5) * 60 : 0);
    game.draw.sprite(PERF_SPRITE, { '#': C.outline }, bx, CY + 100, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: CY + 250, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (cyc < 1.6) { phase = P.WANDER; phaseT = cyc; wanderDur = 1.6; demo.press = false; }
    else if (cyc < 2.3) {
      phase = P.WINDOW; phaseT = cyc - 1.6; demo.press = cyc > 2.15;
      if (demo.press && round < NEEDED) {
        round++;
        game.feedback.good(CX, CY + 100, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    } else { phase = P.WANDER; phaseT = 0; demo.press = false; }
    demo.gx = CX; demo.gy = CY + 100;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(round + ' / ' + NEEDED, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - round) + '回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, needed: NEEDED });
        else game.end.failure({ round: round, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(round + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    game.draw.rect(60, 150, tbW, 16, C.outline, 0.4);
    game.draw.rect(60, 150, tbW * Math.max(0, round / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F4', 0.3], ['A4', 0.3], ['C5', 0.3], ['F5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
