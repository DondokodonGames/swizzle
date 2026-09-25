// D-20132016-0085-monster-fit-strike.js
// モンスター・フィット・ストライク — 敵陣形の隙間に合う獣の型を選び、次々と撃ち込む
// 操作: 上に出る隙間の輪郭を見て、左右どちらの獣の型が一致するかを瞬時にタップ
// 終わり: 規定回数中、既定数以上を正しく合わせられれば成功。届かなければ失敗
// @mechanic: gap_fit
// @theme: shape_beast_formation
// 世界観: 異形の獣を操る調教師が、獣の姿を戦闘フォーメーションの型にぴったり合わせて敵陣へ次々と叩き込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中した型合わせ数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 明るい面+濃い縁取り、2段影のセル調
  var C = {
    bg: '#1c2438', bg2: '#141a2a', panel: '#2a3550', panelEdge: '#3f4d70',
    gap: '#ffd400', gapDim: '#8a7000', good: '#4dff8a', bad: '#ff4d5e',
    left: '#48c0ff', right: '#ff7a48', gold: '#ffd400', white: '#f4f8ff', ink: '#0a0c14',
  };

  var GAME_TITLE = 'FIT STRIKE';
  var WAVES = 6, NEED = 4;
  var ROUND_TIME = 2.3;

  var SHAPES = [
    ['##.', '##.', '...'],
    ['.#.', '###', '.#.'],
    ['#..', '##.', '.##'],
    ['###', '#..', '#..'],
    ['.##', '.#.', '##.'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BEAST = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff05');
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function pick2Shapes() {
    var a = Math.floor(game.random(0, SHAPES.length));
    var b;
    do { b = Math.floor(game.random(0, SHAPES.length)); } while (b === a);
    var correctSide = Math.random() < 0.5 ? 'left' : 'right';
    return { gap: SHAPES[a], leftShape: correctSide === 'left' ? SHAPES[a] : SHAPES[b], rightShape: correctSide === 'right' ? SHAPES[a] : SHAPES[b], correctSide: correctSide };
  }

  var wave, hits, roundT, roundDone, waveGap, cur;
  var done, endWait, finished;
  var ready, hitStop, shake, flashSide;

  function initGame() {
    wave = 0; hits = 0; roundT = 0; roundDone = false; waveGap = 0;
    cur = pick2Shapes();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashSide = null;
  }

  function nextWave() {
    wave++;
    if (wave >= WAVES) {
      finished = true;
      ok = hits >= NEED;
      hitStop = ok ? 0.12 : 0.3;
      if (ok) {
        game.feedback.good(W * 0.5, H * 0.35, { text: 'CLEAR', color: C.good });
        game.fx.burst(W * 0.5, H * 0.35, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
      } else {
        game.feedback.bad(W * 0.5, H * 0.35, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_failure', 0.4);
      }
      finish();
      return;
    }
    roundT = 0; roundDone = false; waveGap = 0; flashSide = null;
    cur = pick2Shapes();
  }

  function resolvePick(side, x, y) {
    if (roundDone || finished || ready > 0 || done) return;
    roundDone = true;
    var correct = side === cur.correctSide;
    flashSide = { side: side, correct: correct };
    if (correct) {
      hits++;
      hitStop = 0.1;
      game.feedback.good(x, y, { text: 'GOOD' });
      game.audio.play('se_good', 0.35);
      if (hits === 3) { game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
    } else {
      hitStop = 0.2;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.18;
      game.audio.play('se_bad', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    if (y < H * 0.72) return;
    var side = x < W * 0.5 ? 'left' : 'right';
    game.audio.play('se_tap', 0.15);
    resolvePick(side, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawGapPanel(shape) {
    var cx = W * 0.5, cy = H * 0.32, px = 46;
    game.draw.rect(cx - 130, cy - 130, 260, 260, C.panel);
    game.draw.rect(cx - 130, cy - 130, 260, 4, C.panelEdge);
    game.draw.sprite(shape, { '#': C.gap }, cx, cy, px, { anchor: 'center' });
  }

  function drawCandidate(side, shape, highlight) {
    var cx = side === 'left' ? W * 0.27 : W * 0.73;
    var cy = H * 0.82;
    var col = side === 'left' ? C.left : C.right;
    if (highlight) col = highlight.correct ? C.good : C.bad;
    game.draw.circle(cx, cy, 150, C.ink, 0.35);
    game.draw.sprite(shape, { '#': col }, cx, cy - 4 + Math.sin(game.time.elapsed * 2 + (side === 'left' ? 0 : 2)) * 5, 34, { anchor: 'center' });
    game.draw.sprite(BEAST, { '#': col }, cx, cy - 120, 16, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.6;
    if (cyc < dt || demo.t <= dt) { cur = pick2Shapes(); flashSide = null; }
    if (cyc < 0.7) {
      var p = cyc / 0.7;
      demo.gx = W * 0.5 + (cur.correctSide === 'left' ? -1 : 1) * (W * 0.23) * p;
      demo.gy = H * 0.58 + (H * 0.24) * p;
      demo.press = false;
      flashSide = null;
    } else if (cyc < 1.1) {
      demo.press = true;
      if (!flashSide) {
        flashSide = { side: cur.correctSide, correct: true };
        game.fx.burst(demo.gx, demo.gy, { color: C.gold, count: 10, speed: 260 });
        game.audio.play('se_good', 0.2);
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGapPanel(cur.gap);
      drawCandidate('left', cur.leftShape, flashSide && flashSide.side === 'left' ? flashSide : null);
      drawCandidate('right', cur.rightShape, flashSide && flashSide.side === 'right' ? flashSide : null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
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
      drawGapPanel(cur.gap);
      drawCandidate('left', cur.leftShape, null);
      drawCandidate('right', cur.rightShape, null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + WAVES, W / 2, H * 0.13, 30, C.gold);
      if (!ok && NEED - hits <= 1) txt('あと1体!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: WAVES }); else game.end.failure({ hits: hits, total: WAVES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && !roundDone) {
      roundT += dt;
      if (roundT >= ROUND_TIME) {
        roundDone = true;
        hitStop = 0.15;
        game.feedback.bad(W * 0.5, H * 0.6, { text: 'MISS' });
        game.audio.play('se_bad', 0.25);
      }
    } else if (!finished && roundDone) {
      waveGap += dt;
      if (waveGap >= 0.35) nextWave();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGapPanel(cur.gap);
    drawCandidate('left', cur.leftShape, flashSide && flashSide.side === 'left' ? flashSide : null);
    drawCandidate('right', cur.rightShape, flashSide && flashSide.side === 'right' ? flashSide : null);

    txt(hits + ' / ' + WAVES, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (wave / WAVES), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['E5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
