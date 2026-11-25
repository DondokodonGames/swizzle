// D-20132016-0074-ruinscout-cast-interrupt.js
// ルインスカウト・キャストインターラプト — 遺跡に潜む術者の詠唱の隙を読んで割り込む斥候の一戦
// 操作: 術者が力を溜める光を見て、光が弾ける合図の瞬間だけタップする。合図の前に押すと失敗
// 終わり: 3回のうち2回以上を正しい瞬間に割り込めれば成功。2回外せば失敗
// @mechanic: reaction_duel
// @theme: ruinscout_cast_interrupt
// 世界観: 古代遺跡を探る斥候が、封印の間で目覚めた術者との一度きりの対峙で、詠唱が弾ける刹那を読んで割り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 割り込めた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    bg: '#3a2c1a', bg2: '#5a4428', ruin: '#2a2014', ruinLit: '#7a5a30',
    scoutLit: '#e0b878', scoutDark: '#a07840', casterLit: '#8a4ad0', casterDark: '#4a1a8a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff2e0', ink: '#0a0602',
  };

  var GAME_TITLE = 'CAST INTERRUPT';
  var CX = W * 0.5;
  var TOTAL = 3;
  var REACT_WINDOW = 0.45;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SCOUT_FRAMES = [
    ['..##..', '.####.', '#.##.#', '.####.', '##..##'],
    ['..##..', '.####.', '#.##.#', '.####.', '.#..#.'],
  ];
  var CASTER_FRAMES = [
    ['.####.', '##..##', '.####.', '#.##.#', '##..##'],
    ['.####.', '##..##', '.####.', '#.##.#', '.#..#.'],
  ];

  var round, wins, losses, castT, castDelay, signalT, phase, resolved;
  var finished, done, endWait, hitStop, shake, ready;

  function newRound() {
    castT = 0; castDelay = 1.0 + game.random(0, 1.2); phase = 'charge'; signalT = 0; resolved = false;
  }

  function initGame() {
    round = 0; wins = 0; losses = 0; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.5, W, H * 0.16, C.ruin, 0.6);
    for (var i = 0; i < 4; i++) game.draw.rect(W * (0.1 + i * 0.25), H * 0.18, 18, H * 0.34, C.ruinLit, 0.5);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawFighters() {
    var bobY = Math.sin(game.time.elapsed * 2.2) * 5;
    var swayX = Math.cos(game.time.elapsed * 1.6) * 3;
    game.draw.sprite(SCOUT_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': C.scoutLit }, W * 0.28 + swayX, H * 0.45 + bobY, 15, { anchor: 'center' });
    var glowFrac = Math.min(1, castT / castDelay);
    var signalOn = phase === 'signal';
    var col = signalOn ? C.white : C.casterLit;
    game.draw.circle(W * 0.72, H * 0.4, 30 + glowFrac * 30, C.casterDark, 0.3 + glowFrac * 0.3);
    game.draw.sprite(CASTER_FRAMES[Math.floor(game.time.elapsed * 3) % 2], { '#': col }, W * 0.72 - swayX, H * 0.4 + bobY, 15, { anchor: 'center' });
  }

  function drawTension() {
    var gx = W * 0.2, gy = H * 0.8, gw = W * 0.6, gh = 34;
    var frac = phase === 'charge' ? Math.min(1, castT / castDelay) : 1;
    game.draw.rect(gx, gy, gw, gh, C.ink, 0.5);
    game.draw.rect(gx, gy, gw * frac, gh, phase === 'signal' ? C.gold : C.casterLit, 0.85);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveRound(success) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    hitStop = success ? 0.14 : 0.32;
    if (success) {
      wins++;
      game.feedback.good(W * 0.72, H * 0.4, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.72, H * 0.4, { color: C.gold, count: 16, speed: 380 });
      game.audio.play('se_good', 0.4);
      if (wins === 2) { game.fx.popup('あと1回!', CX, H * 0.22, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    } else {
      losses++;
      game.feedback.bad(W * 0.72, H * 0.4, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    round++;
    if (wins >= 2) { ok = true; finished = true; finish(); return; }
    if (losses >= 2) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = wins > losses; finished = true; finish(); return; }
  }

  function tryInterrupt() {
    if (state !== S.PLAYING || ready > 0 || finished || resolved) return;
    game.audio.play('se_tap', 0.1);
    if (phase === 'charge') { resolveRound(false); return; } // フライング
    if (phase === 'signal') { resolveRound(signalT <= REACT_WINDOW); return; }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tryInterrupt();
  });

  var demo = { t: 0, gx: W * 0.72, gy: H * 0.4, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    if (phase === 'charge') {
      castT += dt;
      if (castT >= castDelay) { phase = 'signal'; signalT = 0; }
    } else if (phase === 'signal') {
      signalT += dt;
      if (signalT > 0.12 && !resolved) {
        demo.gx = W * 0.72; demo.gy = H * 0.4; demo.press = true;
        resolveRound(true);
      }
    }
    if (resolved && cyc > 2.5) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFighters();
      drawTension();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFighters();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(wins + ' / ' + TOTAL, W / 2, H * 0.14, 32, C.gold);
      if (!ok && wins >= 1) txt('あと1回!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { wins: wins, losses: losses };
        if (ok) game.end.success(wins, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (phase === 'charge') {
        castT += dt;
        if (castT >= castDelay) { phase = 'signal'; signalT = 0; game.audio.play('se_powerup', 0.25); }
      } else if (phase === 'signal') {
        signalT += dt;
        if (signalT > REACT_WINDOW + 0.55 && !resolved) resolveRound(false);
      }
      if (resolved && hitStop <= 0 && !finished) { newRound(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFighters();
    if (!finished) drawTension();
    txt(wins + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.35], ['F4', 0.35], ['A4', 0.35], ['D5', 0.7]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
