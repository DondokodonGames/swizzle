// D-20092012-0061-tidepool-bite-reflex.js
// タイドプール・バイトリフレックス — 浮きが沈んだ瞬間を見切って即座に竿を上げ、魚を釣り上げる
// 操作: 浮きが水面下にクイッと沈んだ瞬間にタップして合わせる。沈む前のフェイントで押すと空振り
// 終わり: 1匹釣り上げれば成功。フェイントに引っかかる/合わせ損ねれば失敗
// @mechanic: reaction_duel
// @theme: tidepool_angler
// 世界観: 岩場の潮だまりで糸を垂らす釣り人。魚が餌をつつくフェイントの後、本当に食いつく一瞬だけ浮きが沈む。その刹那を見切って竿を上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 反応タイム(ms)
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル、上下に情報帯を分ける名残
  var C = {
    bg: '#bfe8f0', bg2: '#eaf9fb', water: '#8fd4e6', waterDeep: '#5cb8d0',
    rod: '#c98a5a', line: '#3a3a3a', bobber: '#ff6f91', bobberDip: '#c94060',
    fish: '#ffd166', fishDark: '#e0a030', good: '#39c77a', bad: '#ff5a6e',
    gold: '#ff9f1c', white: '#ffffff', ink: '#2a2a2a',
  };

  var GAME_TITLE = 'BITE REFLEX';
  var CX = W * 0.5, WATER_Y = H * 0.42, POOL_BOT = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var phase, phaseT, feints, feintCount, reactMs, dipT, caught, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ANGLER = ['.##.', '####', '.##.', '.##.'];
  var FISH = ['.####.', '########', '.######.'];

  function bg() {
    game.draw.gradient(0, WATER_Y, [[0, C.bg2], [1, C.bg]]);
    game.draw.gradient(WATER_Y, POOL_BOT - WATER_Y, [[0, C.water], [1, C.waterDeep]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 6; i++) {
      var ry = WATER_Y + 18 + (i * 12 + game.time.elapsed * 40) % (POOL_BOT - WATER_Y - 20);
      game.draw.line(CX - 300 + i * 30, ry, CX - 260 + i * 30, ry, C.waterDeep, 3);
    }
    game.draw.rect(0, POOL_BOT, W, H - POOL_BOT, '#d9c9a8');
  }

  function drawAngler() {
    var bob = Math.sin(game.time.elapsed * 1.6) * 5;
    game.draw.sprite(ANGLER, { '#': C.rod }, W * 0.2, H * 0.62 + bob, 22, { anchor: 'center' });
  }

  function drawBobber(y, dipping) {
    var by = y + Math.sin(game.time.elapsed * 3) * (dipping ? 0 : 4);
    game.draw.line(W * 0.22, H * 0.56, CX, WATER_Y - 20, C.line, 3);
    game.draw.circle(CX, WATER_Y - 20, 30, C.white, 0.5);
    game.draw.circle(CX, by, 22, dipping ? C.bobberDip : C.bobber);
    game.draw.circle(CX, by - 8, 8, C.white, 0.7);
  }

  function initGame() {
    phase = 'wait'; phaseT = 0.9 + game.random(0, 0.6);
    feints = Math.floor(game.random(0, 2)); feintCount = 0;
    reactMs = 0; dipT = 0; caught = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function onRod() {
    if (ready > 0 || finished) return;
    if (phase === 'feint') {
      // フェイント中に押した = 空振り
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(CX, WATER_Y - 20, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      finish();
    } else if (phase === 'bite') {
      finished = true; ok = true; caught = true; hitStop = 0.2;
      reactMs = Math.round(dipT * 1000);
      game.feedback.good(CX, WATER_Y - 20, { text: 'PERFECT', color: C.good });
      game.fx.burst(CX, WATER_Y - 20, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      game.audio.play('se_tap', 0.08);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onRod();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function updatePhase(dt) {
    if (finished) return;
    phaseT -= dt;
    if (phase === 'wait' && phaseT <= 0.6 && phaseT > 0.55) {
      game.fx.popup('!?', CX, WATER_Y - 80, { color: C.white, size: 30 });
    }
    if (phaseT <= 0) {
      if (phase === 'wait') {
        if (feintCount < feints) { phase = 'feint'; phaseT = 0.35; feintCount++; game.audio.play('se_tap', 0.1); }
        else { phase = 'bite'; phaseT = 0.55; dipT = 0; game.audio.play('se_milestone', 0.3); }
      } else if (phase === 'feint') {
        phase = 'wait'; phaseT = 0.7 + game.random(0, 0.5);
      } else if (phase === 'bite') {
        // 反応しきれず逃げられた
        finished = true; ok = false; hitStop = 0.3;
        game.feedback.bad(CX, WATER_Y - 20, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (phase === 'bite') dipT += dt;
  }

  var demo = { t: 0, gx: CX, gy: WATER_Y - 20, press: false, ph: 'wait', phT: 0.7 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.ph = 'wait'; demo.phT = 0.9; phase = 'wait'; }
    demo.phT -= dt;
    if (demo.phT <= 0) {
      if (demo.ph === 'wait') { demo.ph = 'bite'; demo.phT = 0.5; phase = 'bite'; }
      else if (demo.ph === 'bite') {
        demo.press = true; demo.gx = CX; demo.gy = WATER_Y - 20;
        game.feedback.good(CX, WATER_Y - 20, { text: 'PERFECT', color: C.good });
        game.audio.play('se_good', 0.2);
        demo.ph = 'done'; demo.phT = 1.0;
      } else { demo.press = false; demo.ph = 'wait'; demo.phT = 0.9; phase = 'wait'; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawAngler();
      drawBobber(WATER_Y, phase === 'bite');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + 'ms' : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawAngler();
      drawBobber(WATER_Y, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(ok ? reactMs + ' ms' : 'MISS', W / 2, H * 0.135, 30, C.gold);
      if (!ok) txt('あと0.1秒!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(reactMs, { reactMs: reactMs });
        else game.end.failure({ reactMs: reactMs });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      updatePhase(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawAngler();
    if (!finished || !caught) drawBobber(WATER_Y, phase === 'bite');
    else game.draw.sprite(FISH, { '#': C.fishDark }, CX, WATER_Y - 60, 14, { anchor: 'center' });

    txt((feintCount) + ' / ' + (feints + 1), W / 2, H * 0.06, 26, C.ink);
    txt(phase === 'feint' ? 'まだ!' : '', W / 2, H * 0.10, 26, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 110, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
