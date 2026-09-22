// K-DS-0046-formation-step-call.js
// フォーメーションステップコール — 号令に合わせ、隊列と足並みを揃えて左右交互に足を踏み出す
// 操作: 号令の光と足アイコンに合わせ、左足の合図なら画面左側、右足の合図なら画面右側をタップ
// 終わり: 規定歩数(10歩)を隊列と揃えて踏めば成功。3歩乱せば失敗
// @mechanic: alternate_tap
// @theme: drill_formation_march
// 世界観: 広場での隊列訓練。号令係の合図に合わせ、周囲の隊員と足並みを揃えて左右交互に足を踏み出す一員
// 残るもの: 正誤(CLEAR/GAME OVER) + 揃えて踏めた歩数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: #0f380f〜#9bbc0f の4階調モノクロ液晶、画面枠、残像感
  var C = {
    d0: '#0f380f', d1: '#306230', d2: '#8bac0f', d3: '#9bbc0f',
    bad: '#0f380f', frame: '#0a2a0a',
  };

  var GAME_TITLE = 'STEP CALL';
  var TOTAL = 10;
  var MISS_LIMIT = 3;
  var ROW_Y = H * 0.42;
  var BEAT0 = 0.92;
  var WINDOW = 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARCHER_L = ['.##.', '####', '.##.', '#..#'];
  var MARCHER_R = ['.##.', '####', '.##.', '..#.', '.#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.d3], [1, C.d2]]);
    for (var i = 0; i < 18; i++) game.draw.rect(0, i * (H / 18), W, 2, C.d2, 0.4);
    game.draw.rect(0, 0, W, 24, C.frame);
    game.draw.rect(0, H - 24, W, 24, C.frame);
    game.draw.rect(0, 0, 20, H, C.frame);
    game.draw.rect(W - 20, 0, 20, H, C.frame);
  }

  var steps, idx, hits, misses, done, endWait, finished;
  var ready, hitStop, shake, beatT, bobPhase, squad;

  function gapFor(n) { return Math.max(0.52, BEAT0 - n * 0.035); }

  function buildSteps() {
    var out = [];
    var side = 'L';
    for (var i = 0; i < TOTAL; i++) { out.push(side); side = side === 'L' ? 'R' : 'L'; }
    return out;
  }

  function initGame() {
    steps = buildSteps(); idx = 0; hits = 0; misses = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; beatT = 0; bobPhase = 0;
    squad = [
      { dx: -260, off: 0.05 }, { dx: -130, off: -0.03 }, { dx: 0, off: 0 }, { dx: 130, off: 0.04 }, { dx: 260, off: -0.02 },
    ];
  }

  function curSide() { return idx < steps.length ? steps[idx] : null; }

  function resolveMiss() {
    misses++;
    hitStop = 0.28;
    game.feedback.bad(W / 2, ROW_Y, { text: 'MISS' });
    shake = 0.2;
    game.audio.play('se_bad', 0.4);
    idx++;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }

  function resolveHit(side) {
    hits++;
    hitStop = 0.06;
    var px = side === 'L' ? W * 0.28 : W * 0.72;
    game.feedback.good(px, ROW_Y + 260, { text: 'GOOD', color: C.d0 });
    game.fx.burst(px, ROW_Y + 260, { color: C.d1, count: 10, speed: 240 });
    game.audio.play('se_good', 0.35);
    if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, ROW_Y - 200, { color: C.d0, size: 38 });
    idx++;
    if (idx >= TOTAL) { ok = true; finished = true; finish(); }
  }

  function tapSide(side) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var need = curSide();
    if (need === null) return;
    var dist = Math.abs(beatT - gapPointer());
    if (side === need && dist <= WINDOW) resolveHit(side);
    else if (side === need) { game.audio.play('se_tap', 0.15); }
    else { resolveMiss(); }
  }

  function gapPointer() { return curGap; }
  var curGap = 0;

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    tapSide(x < W / 2 ? 'L' : 'R');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawSquad(bob) {
    for (var i = 0; i < squad.length; i++) {
      var m = squad[i];
      var bounce = Math.sin((bob + m.off) * Math.PI * 2) * 10;
      game.draw.circle(W / 2 + m.dx, ROW_Y + 90, 30, C.d2, 0.6);
      game.draw.sprite(bob % 1 < 0.5 ? MARCHER_L : MARCHER_R, { '#': C.d0 }, W / 2 + m.dx, ROW_Y - bounce, 12, { anchor: 'center' });
    }
  }

  function drawCueLane() {
    game.draw.rect(0, H * 0.72, W / 2 - 4, H * 0.2, C.d2, 0.35);
    game.draw.rect(W / 2 + 4, H * 0.72, W / 2 - 4, H * 0.2, C.d2, 0.35);
    game.draw.line(W / 2, H * 0.72, W / 2, H * 0.92, C.d0, 4);
    var need = curSide();
    if (need) {
      var glow = Math.floor(game.time.elapsed * 6) % 2 === 0;
      var zx = need === 'L' ? W * 0.25 : W * 0.75;
      game.draw.circle(zx, H * 0.82, glow ? 70 : 58, C.d0, glow ? 0.4 : 0.2);
      txt(need, zx, H * 0.82 + 16, 60, C.d0, 'center');
    }
  }

  var demo = { t: 0, gx: W * 0.25, gy: H * 0.82, press: false, side: 'L', idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { demo.idx = 0; hits = 0; misses = 0; idx = 0; }
    beatT += dt;
    bobPhase += dt * 1.5;
    var gap = 0.7;
    curGap = gap;
    demo.press = false;
    if (beatT >= gap) {
      beatT = 0;
      var need = steps[demo.idx % steps.length];
      demo.side = need;
      demo.gx = need === 'L' ? W * 0.25 : W * 0.75;
      demo.press = true;
      game.feedback.good(demo.gx, ROW_Y + 260, { text: 'GOOD', color: C.d0, sound: 'se_good', volume: 0.25 });
      idx = demo.idx % steps.length;
      hits++;
      demo.idx++;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (steps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCueLane();
      drawSquad(bobPhase);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.d0);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 22, C.d1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.65, 36, C.d0);
      } else {
        txt('INSERT COIN', W / 2, H * 0.65, 26, C.d1);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSquad(bobPhase);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, C.d0);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.16, 30, C.d1);
      if (!ok) txt('あと' + (TOTAL - hits) + '歩!', W / 2, H * 0.21, 24, C.d0);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 24, C.d1);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL, misses: misses });
        else game.end.failure({ hits: hits, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); beatT = 0; curGap = gapFor(idx); }
    } else if (!finished) {
      beatT += dt;
      bobPhase += dt * 1.5;
      curGap = gapFor(idx);
      if (beatT > curGap + WINDOW) resolveMiss();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCueLane();
    if (!finished) drawSquad(bobPhase);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.d0);
    game.draw.rect(60, 130, W - 120, 16, C.d1, 0.5);
    game.draw.rect(60, 130, (W - 120) * (hits / TOTAL), 16, C.d0);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 80 - m * 40, 100, 12, m < misses ? C.d0 : C.d2, 0.8);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.d0);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['C4', 0.25], ['G4', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
