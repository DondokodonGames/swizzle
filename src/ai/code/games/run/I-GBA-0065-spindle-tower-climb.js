// I-GBA-0065-spindle-tower-climb.js
// スピンドルタワークライム — 灯台内部の巻き上げ機を回し続け、日暮れ前に灯室まで昇る
// 操作: 画面下のクランクの上で指を円を描くように回し続け、籠を巻き上げる。突風の予告中も回し続けて耐える
// 終わり: 制限時間内に籠が頂上に到達すれば成功。時間切れなら失敗
// @mechanic: camera_climb
// @theme: lighthouse_winch_climb
// 世界観: 灯台の内部シャフト。灯守りが手動の巻き上げクランクを回し、日没までに灯室まで籠を昇らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した高さ%
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、輪郭線なし、タイル反復背景
  var C = {
    bg: '#0a1830', bg2: '#050c1a', shaftLight: '#1e3a5c', shaftDark: '#12233c',
    lift: '#e8b23a', liftDark: '#a87a1e', crank: '#8a94a0', crankDark: '#4a5460',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eaf2ff', ink: '#050a12',
  };

  var GAME_TITLE = 'TOWER WINCH';
  var DUR = 20;
  var ROTS_NEEDED = 7.5; // 頂上到達に必要な累積回転数
  var PIVOT_X = W * 0.5, PIVOT_Y = H * 0.83, CRANK_R = 150;
  var GUST_T = [6.5, 12, 16.5];
  var GUST_THRESH = Math.PI * 1.1; // 予告中に必要な累積回転(ラジアン)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var climbHeight, dragId, lastA, timeLeft, gustIdx, gustWarnAccum, frameRot, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 14; i++) game.draw.rect(0, i * (H / 14), W, 2, C.shaftDark, 0.5);
    game.draw.rect(W * 0.5 - 6, H * 0.10, 12, H * 0.68, C.shaftLight);
  }

  function drawTower(h) {
    var topY = H * 0.14, botY = H * 0.78;
    var y = botY - (botY - topY) * h;
    game.draw.rect(W * 0.5 - 90, H * 0.10, 180, 20, C.crankDark);
    game.draw.line(W * 0.5, H * 0.20, W * 0.5, y, C.shaftLight, 6);
    game.draw.rect(W * 0.5 - 70, y - 40, 140, 60, C.liftDark);
    game.draw.rect(W * 0.5 - 62, y - 34, 124, 48, C.lift);
    game.draw.sprite(KEEPER, { '#': C.white }, W * 0.5, y - 60, 14, { anchor: 'center' });
    return y;
  }

  function drawCrank(ang, warn) {
    game.draw.circle(PIVOT_X, PIVOT_Y, CRANK_R + 14, C.crankDark);
    game.draw.circle(PIVOT_X, PIVOT_Y, CRANK_R - 20, C.crank);
    var hx = PIVOT_X + Math.cos(ang) * CRANK_R, hy = PIVOT_Y + Math.sin(ang) * CRANK_R;
    game.draw.line(PIVOT_X, PIVOT_Y, hx, hy, C.crankDark, 16);
    game.draw.circle(hx, hy, 24, warn ? C.bad : C.gold);
  }

  function initGame() {
    climbHeight = 0; dragId = null; lastA = 0; timeLeft = DUR;
    gustIdx = 0; gustWarnAccum = 0; frameRot = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function applyRotation(deltaAbs) {
    frameRot += deltaAbs;
    climbHeight = Math.min(1, climbHeight + deltaAbs / (Math.PI * 2 * ROTS_NEEDED));
  }

  function normAngle(d) {
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var d = Math.hypot(x - PIVOT_X, y - PIVOT_Y);
    if (d < 60 || d > CRANK_R + 90) return;
    dragId = id; lastA = Math.atan2(y - PIVOT_Y, x - PIVOT_X);
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || dragId === null || id !== dragId || finished) return;
    var a = Math.atan2(y - PIVOT_Y, x - PIVOT_X);
    var delta = normAngle(a - lastA);
    lastA = a;
    applyRotation(Math.abs(delta));
    if (Math.random() < 0.1) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function(x, y, id) { if (id === dragId) dragId = null; });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (climbHeight === undefined) initGame();
      bg();
      stepDemo(dt);
      var yA = drawTower(climbHeight);
      drawCrank(demo.a, demo.warn);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTower(climbHeight);
      drawCrank(0, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(Math.round(climbHeight * 100) + '%', W / 2, H * 0.10, 30, C.gold);
      if (!ok && climbHeight > 0.85) txt('あと少し!', W / 2, H * 0.14, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 24, C.white);
      return;
    }

    frameRot = 0;
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(climbHeight * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      var elapsed = DUR - timeLeft;
      if (!milestoneShown && climbHeight >= 0.5) {
        milestoneShown = true;
        game.fx.popup('50%', W / 2, H * 0.4, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (gustIdx < GUST_T.length) {
        var gt = GUST_T[gustIdx];
        if (elapsed >= gt - 0.6 && elapsed < gt) {
          gustWarnAccum += frameRot;
        } else if (elapsed >= gt) {
          if (gustWarnAccum > GUST_THRESH) {
            game.feedback.good(PIVOT_X, PIVOT_Y - CRANK_R - 60, { text: 'GOOD', color: C.good, size: 26 });
          } else {
            climbHeight = Math.max(0, climbHeight - 0.09);
            shake = 0.2;
            game.feedback.bad(PIVOT_X, PIVOT_Y - CRANK_R - 60, { text: 'MISS' });
          }
          gustIdx++; gustWarnAccum = 0;
        }
      }
      if (dragId === null) climbHeight = Math.max(0, climbHeight - 0.018 * dt);
      if (climbHeight >= 1) {
        ok = true; finished = true; hitStop = 0.15;
        game.fx.burst(PIVOT_X, PIVOT_Y - CRANK_R - 40, { color: C.gold, count: 18, speed: 380 });
        finish();
      } else if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, H * 0.4, { text: 'MISS' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTower(climbHeight);
    var gustWarn = gustIdx < GUST_T.length && (DUR - timeLeft) >= GUST_T[gustIdx] - 0.6 && (DUR - timeLeft) < GUST_T[gustIdx] && Math.floor(game.time.elapsed * 8) % 2 === 0;
    drawCrank(lastA, gustWarn);

    txt(Math.round(climbHeight * 100) + '%', W / 2, H * 0.04, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: PIVOT_X + CRANK_R, gy: PIVOT_Y, press: false, a: 0, warn: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { climbHeight = 0; demo.a = 0; milestoneShown = false; }
    if (cyc < 3.2) {
      demo.a += dt * 5.2;
      demo.press = true;
      demo.warn = false;
      applyRotation(dt * 5.2);
    } else if (cyc < 3.8) {
      demo.warn = Math.floor(game.time.elapsed * 8) % 2 === 0;
      demo.press = false;
    } else {
      demo.press = false;
      demo.warn = false;
    }
    demo.gx = PIVOT_X + Math.cos(demo.a) * CRANK_R;
    demo.gy = PIVOT_Y + Math.sin(demo.a) * CRANK_R;
    if (!milestoneShown && climbHeight >= 0.5) { milestoneShown = true; game.fx.popup('50%', W / 2, H * 0.4, { color: C.gold, size: 40 }); }
  }

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 118, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
