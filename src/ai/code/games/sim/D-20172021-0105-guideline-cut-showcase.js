// D-20172021-0105-guideline-cut-showcase.js
// ガイドライン・カットショーケース — 台の上の素材に浮かぶ波打つ点線をナイフでなぞり、きれいな一太刀を見せる
// 操作: 左端から右端まで、表示された点線からなるべく外れないよう指でなぞり続ける
// 終わり: 右端まで到達し一致率が基準以上なら成功。時間切れや一致率不足なら失敗
// @mechanic: trace
// @theme: guideline_cut_showcase
// 世界観: 職人が台の上の素材に浮かぶ切り筋を見せながら、刃をその線ぴったりになぞって一太刀で仕上げる工程を披露する
// 残るもの: 正誤(CLEAR/GAME OVER) + 一致率
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 白背景+パキッとした2色、太い角丸ボタン風UI
  var C = {
    bg: '#ffffff', bg2: '#eef3ff', mat: '#d8dce8', matDark: '#b8c0d8',
    guide: '#ff6a3d', trail: '#2b6bff',
    good: '#22c58a', bad: '#ff4d5e', gold: '#ffb400', ink: '#12203a', white: '#ffffff',
  };

  var GAME_TITLE = 'CUT SHOWCASE';
  var TRACE_Y = H * 0.5;
  var X0 = W * 0.14, X1 = W * 0.86;
  var TIME_LIMIT = 12;
  var TOL = 70;
  var NEED_MATCH = 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a1020', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARTISAN_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function guideY(x) {
    var t = (x - X0) / (X1 - X0);
    return TRACE_Y + 130 * Math.sin(t * Math.PI * 2.4) * (0.4 + 0.6 * t);
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.32, W, H * 0.36, C.mat);
  }

  var reachedX, matchSum, matchCount, dragging, curX, curY, roundClock;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    reachedX = X0; matchSum = 0; matchCount = 0; dragging = false;
    curX = X0; curY = guideY(X0); roundClock = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function updateDrag(x, y) {
    curX = Math.max(X0, Math.min(X1, x));
    curY = y;
    if (curX > reachedX) reachedX = curX;
    var gy = guideY(curX);
    var dist = Math.abs(y - gy);
    var m = Math.max(0, 1 - dist / TOL);
    matchSum += m; matchCount++;
    if (m > 0.75) {
      if (Math.random() < 0.15) game.audio.tone(700, 0.03, { wave: 'sine', volume: 0.04 });
    } else if (m < 0.2 && Math.random() < 0.06) {
      game.feedback.bad(curX, curY, { text: null });
    }
    var pct = (reachedX - X0) / (X1 - X0);
    if (pct >= 0.5 && !milestoneShown) {
      milestoneShown = true;
      game.fx.popup('NICE', W / 2, TRACE_Y - 200, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (pct >= 0.99) finishTrace();
  }

  function finishTrace() {
    if (finished) return;
    var avg = matchCount > 0 ? matchSum / matchCount : 0;
    ok = avg >= NEED_MATCH;
    finished = true; hitStop = 0.25;
    if (ok) {
      game.feedback.good(curX, curY, { text: 'GOOD', color: C.good });
      game.fx.burst(curX, curY, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(curX, curY, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (x < X0 + 60) { dragging = true; game.audio.play('se_tap', 0.1); updateDrag(x, y); }
    else { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_bad', 0.2); }
  });
  game.onMove(function(x, y) { if (dragging && state === S.PLAYING && !finished) updateDrag(x, y); });
  game.onRelease(function(x, y) { dragging = false; if (!finished) game.audio.play('se_tap', 0.05); });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene(rX, cx, cy, isDrag) {
    var steps = 40;
    for (var i = 0; i < steps; i++) {
      var t = i / steps;
      var x = X0 + t * (X1 - X0);
      if (x > rX + 4) break;
      if (i % 2 === 0) game.draw.circle(x, guideY(x), 5, C.guide);
    }
    for (var j = 0; j < steps; j++) {
      var t2 = j / steps;
      var x2 = X0 + t2 * (X1 - X0);
      if (x2 <= rX + 4) continue;
      if (j % 2 === 0) game.draw.circle(x2, guideY(x2), 4, C.guide, 0.35);
    }
    if (isDrag) game.draw.circle(cx, cy, 18, C.trail);
    game.draw.rect(X0 - 40, H * 0.32 - 10, 6, H * 0.36 + 20, C.matDark);
    game.draw.rect(X1 + 34, H * 0.32 - 10, 6, H * 0.36 + 20, C.matDark);
    var af = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(ARTISAN_F[af], { '#': C.ink }, W * 0.5, H * 0.18, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: X0, gy: guideY(X0), press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    var speed = (X1 - X0) / 4.2;
    var nx = Math.min(X1, demo.gx + speed * dt);
    demo.gx = nx; demo.gy = guideY(nx);
    demo.press = true;
    if (!dragging) dragging = true;
    updateDrag(demo.gx, demo.gy);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (reachedX === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene(reachedX, demo.gx, demo.gy, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.12, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.16, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      var avgPct = Math.round((matchCount > 0 ? matchSum / matchCount : 0) * 100);
      drawScene(reachedX, curX, curY, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.12, 46, ok ? C.good : C.bad);
      txt(avgPct + '%', W / 2, H * 0.17, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.21, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var avg = Math.round((matchCount > 0 ? matchSum / matchCount : 0) * 100);
        if (ok) game.end.success(avg, { match: avg });
        else game.end.failure({ match: avg });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) finishTrace();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(reachedX, curX, curY, dragging);

    var pctNow = Math.round(((reachedX - X0) / (X1 - X0)) * 100);
    txt(pctNow + ' / ' + 100, W / 2, H * 0.08, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 200, W - 120, 16, '#00000022', 1);
    game.draw.rect(60, 200, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.guide);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.4]], { tempo: 132, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
