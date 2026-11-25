// D-20222026-0039-throng-lane-breach.js
// スロングレーンブリーチ — うねる隊道を指でなぞって群れを導き、門をくぐらせて色と数を増やし敵拠点へ雪崩れ込む
// 操作: 隊道の壁からはみ出さないよう、群れの先頭を指でなぞって奥の拠点まで導く
// 終わり: はみ出さずに拠点まで導けば成功。壁に触れる/時間切れで失敗
// @mechanic: guide_path
// @theme: throng_lane_breach
// 世界観: うねる隊道を率いる旗持ちが、演出だけで描かれる敵拠点へ向けて群れを導き、道中の門をくぐるたび数と色を増していく
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった門の数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#2a3a2a', bg2: '#16221a', lane: '#3a4e38', laneDk: '#1e2a1c', wallC: '#ff6a5a',
    crowdA: '#ffd24d', crowdB: '#4dd0ff', fort: '#6a5a4a', fortDk: '#3a2e24',
    good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#eef4ea',
  };

  var GAME_TITLE = 'LANE BREACH';
  var TOP_Y = H * 0.24, BOTTOM_Y = H * 0.86;
  var AMP = W * 0.22, FREQ = 0.0046;
  var HALF = 96;
  var MAX_TIME = 20;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a120a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CROWD_S = ['.#.', '###'];
  var FORT_S = ['#.##.#', '######', '#....#'];

  function centerXat(y) {
    return W * 0.5 + Math.sin((y - TOP_Y) * FREQ) * AMP;
  }

  var GATE_YS = [TOP_Y + (BOTTOM_Y - TOP_Y) * 0.36, TOP_Y + (BOTTOM_Y - TOP_Y) * 0.68];

  var progressY, gatesHit, crowdCount, crowdColor, roundClock;
  var done, endWait, finished, ready, hitStop, shake, cursorX, cursorY;

  function initGame() {
    progressY = TOP_Y; gatesHit = 0; crowdCount = 6; crowdColor = 0; roundClock = 0;
    cursorX = centerXat(TOP_Y); cursorY = TOP_Y;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.12);
  }

  function drawLane() {
    for (var y = TOP_Y; y <= BOTTOM_Y; y += 24) {
      var cx = centerXat(y);
      game.draw.rect(cx - HALF - 14, y, 10, 20, C.wallC, 0.7);
      game.draw.rect(cx + HALF + 4, y, 10, 20, C.wallC, 0.7);
    }
    for (var i = 0; i < GATE_YS.length; i++) {
      var gy = GATE_YS[i];
      var gc = centerXat(gy);
      var passed = progressY > gy;
      game.draw.rect(gc - HALF, gy - 10, HALF * 2, 20, (i % 2 === 0 ? C.crowdB : C.crowdA), passed ? 0.9 : 0.4);
    }
    game.draw.sprite(FORT_S, { '#': C.fort }, W * 0.5, BOTTOM_Y + 60, 18, { anchor: 'center' });
    var col = crowdColor === 0 ? C.crowdA : C.crowdB;
    var cx2 = centerXat(progressY);
    var n = Math.min(6, 3 + Math.floor(crowdCount / 3));
    for (var k = 0; k < n; k++) {
      game.draw.sprite(CROWD_S, { '#': col }, cx2 + (k - n / 2) * 22, progressY, 8, { anchor: 'center' });
    }
  }

  function checkGates() {
    for (var i = 0; i < GATE_YS.length; i++) {
      var gy = GATE_YS[i];
      if (progressY >= gy && progressY - (BOTTOM_Y - TOP_Y) / 200 < gy) {
        gatesHit += 1;
        crowdColor = i % 2;
        crowdCount += 2;
        game.fx.popup('NICE', centerXat(gy), gy - 60, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.3);
        game.fx.burst(centerXat(gy), gy, { color: col2(), count: 16, speed: 300 });
      }
    }
  }
  function col2() { return crowdColor === 0 ? C.crowdA : C.crowdB; }

  function onDrag(x, y) {
    if (finished || ready > 0) return;
    var cx = centerXat(y);
    if (Math.abs(x - cx) > HALF) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.25;
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (y > progressY) {
      progressY = y;
      checkGates();
      game.feedback.good(x, y, { text: '', color: C.good, count: 1 });
    }
    cursorX = x; cursorY = y;
    if (progressY >= BOTTOM_Y - 6) {
      finished = true; ok = true; hitStop = 0.3;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(W * 0.5, BOTTOM_Y + 60, { color: C.gold, count: 24, speed: 400 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onDrag(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: TOP_Y, press: true };
  function resetDemo() { initGame(); demo.gx = centerXat(TOP_Y); demo.gy = TOP_Y; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var targetY = TOP_Y + Math.min(1, cyc / 3.0) * (BOTTOM_Y - TOP_Y);
    demo.gy = targetY; demo.gx = centerXat(targetY);
    demo.press = cyc < 3.0;
    onDrag(demo.gx, demo.gy);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progressY === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLane();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.135, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawLane();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 42, ok ? C.good : C.bad);
      txt(gatesHit + ' / ' + GATE_YS.length, W / 2, H * 0.14, 24, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.18, 20, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { gates: gatesHit, crowd: crowdCount };
        if (ok) game.end.success(crowdCount, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(cursorX, cursorY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLane();
    if (!finished) game.draw.circle(cursorX, cursorY, 12, col2());

    txt(gatesHit + ' / ' + GATE_YS.length, W / 2, H * 0.06, 26, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.laneDk, 0.6);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.2], ['A3', 0.2], ['C4', 0.2], ['F4', 0.4]], { tempo: 138, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
