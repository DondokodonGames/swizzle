// I-3DS-0013-twin-seal-stones.js
// ツインシール — 古い社の巫女が左右の封印石を同時に押さえ続けて中央のひびを鎮める
// 操作: 左右に置かれた2つの石を2本の指で同時に押さえ続ける。片方だけだとひびが戻ってしまう
// 終わり: 制限時間内にひびを完全に鎮めれば成功。時間切れならば失敗
// @mechanic: pinch_zone
// @theme: shrine_twin_seal_stones
// 世界観: 山中の古い社、巫女が左右一対の封印石を両手で同時に押さえ続け、中央で広がる禍のひびを鎮める
// 残るもの: 正誤(CLEAR/TIME UP) + 鎮めた割合%
// スタイル: SKEUOMORPH
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 石・木の質感をストライプ+濃淡グラデーションで再現
  var C = {
    bg: '#241a12', bg2: '#160f0a', stone: '#5a4c3e', stoneEdge: '#3a3024', stoneLit: '#8a7458',
    crack: '#ff3d3d', crackDim: '#7a2020', seal: '#3ad6a0', good: '#3ad6a0', bad: '#ff3d3d',
    gold: '#e8c877', white: '#f4ead8', ink: '#140c08',
  };

  var GAME_TITLE = 'TWIN SEAL';
  var TIME_LIMIT = 12;
  var LX = W * 0.26, RX = W * 0.74, SY = H * 0.46;
  var STONE_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var crack, leftId, rightId, done, endWait, finished, milestoneShown, timeLeft;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MIKO = ['.###.', '#####', '.###.', '#.#.#', '#...#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff06');
  }

  function drawStone(x, held) {
    game.draw.circle(x, SY, STONE_R, C.stoneEdge);
    game.draw.circle(x, SY, STONE_R - 14, held ? C.stoneLit : C.stone);
    for (var s = 0; s < 5; s++) {
      game.draw.rect(x - STONE_R + 20, SY - STONE_R + 30 + s * 26, STONE_R * 2 - 40, 4, '#00000020');
    }
    game.draw.circle(x, SY, 22, held ? C.seal : C.crackDim);
  }

  function drawCrack() {
    var p = crack; // 0=鎮まった 1=最大
    game.draw.circle(W * 0.5, SY, 40 + p * 90, C.crackDim, 0.4);
    var blink = p > 0.6 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.circle(W * 0.5, SY, 30 + p * 70, blink ? C.crack : C.crackDim, 0.7);
  }

  function drawMiko() {
    game.draw.sprite(MIKO, { '#': C.gold }, W * 0.5, H * 0.70, 24, { anchor: 'center' });
  }

  function initGame() {
    crack = 1; leftId = null; rightId = null; milestoneShown = false; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function inStone(x, y, cx) {
    return Math.hypot(x - cx, y - SY) <= STONE_R;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    if (leftId === null && inStone(x, y, LX)) { leftId = id; game.audio.play('se_tap', 0.06); return; }
    if (rightId === null && inStone(x, y, RX)) { rightId = id; game.audio.play('se_tap', 0.06); return; }
  });

  game.onRelease(function(x, y, id) {
    if (id === leftId) { leftId = null; game.audio.play('se_tap', 0.03); }
    if (id === rightId) { rightId = null; game.audio.play('se_tap', 0.03); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx1: LX, gy1: SY, press1: false, gx2: RX, gy2: SY, press2: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { crack = 1; }
    var both = cyc > 0.6 && cyc < 3.2;
    demo.press1 = both; demo.press2 = both;
    if (both) {
      crack = Math.max(0, crack - dt * 0.42);
      if (crack <= 0 && !demo.doneCelebrate) {
        demo.doneCelebrate = true;
        game.feedback.good(W * 0.5, SY, { text: 'CLEAR', color: C.good });
        game.audio.play('se_good', 0.25);
      }
    } else {
      demo.doneCelebrate = false;
      crack = Math.min(1, crack + dt * 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (crack === undefined) initGame();
      bg();
      stepDemo(dt);
      drawStone(LX, demo.press1);
      drawStone(RX, demo.press2);
      drawCrack();
      drawMiko();
      game.draw.hand(demo.gx1, demo.gy1, { press: demo.press1, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy2, { press: demo.press2, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStone(LX, false);
      drawStone(RX, false);
      drawCrack();
      drawMiko();
      var pct = Math.round((1 - crack) * 100);
      txt(ok ? 'CLEAR' : 'TIME UP', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round((1 - crack) * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var bothHeld = leftId !== null && rightId !== null;
      var beforeC = crack;
      if (bothHeld) crack -= dt * 0.13;
      else crack += dt * 0.05;
      crack = Math.max(0, Math.min(1, crack));
      if (beforeC > 0.5 && crack <= 0.5 && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, SY - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (crack <= 0) {
        ok = true; finished = true; hitStop = 0.18;
        game.feedback.good(W * 0.5, SY, { text: 'CLEAR', color: C.good });
        game.fx.burst(W * 0.5, SY, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
      timeLeft -= dt;
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(W * 0.5, SY, { text: 'TIME UP' });
        shake = 0.3;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawStone(LX, leftId !== null);
    drawStone(RX, rightId !== null);
    drawCrack();
    drawMiko();

    txt(Math.round((1 - crack) * 100) + '%', W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.6], ['F4', 0.6], ['A4', 1.2]], { tempo: 90, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
