// I-DS-0028-cloth-tear-line.js
// 反物まっすぐ裂き — 両手の指で布の両端をつまみ、織り目の線に沿ってまっすぐ引き裂く
// 操作: 左手側と右手側、それぞれの指で同時に外側へドラッグして布を左右に引き裂く
// 終わり: 規定枚数(3枚)を織り目からはみ出さず裂ければ成功。斜めに裂けたら失敗
// @mechanic: coop_2zone
// @theme: weaving_workshop
// 世界観: 反物を扱う織物工房。職人見習いが、織り目の線通りに布を両手で正確に引き裂いて仕分ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 裂けた枚数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白地に黒の単色、ハーフトーンのみで濃淡を表現
  var C = {
    bg: '#f2efe8', bg2: '#e4ded0', ink: '#1a1712', cloth: '#faf7ef', clothLine: '#c8c0ac',
    good: '#1a1712', bad: '#1a1712', gold: '#1a1712', white: '#1a1712', paper: '#ffffff',
  };

  var GAME_TITLE = 'CLOTH TEAR';
  var TOTAL = 3;
  var CY = H * 0.46;
  var CX0 = W * 0.5, TEAR_Y = CY;
  var NEED = 260; // 中心からの必要引き裂き距離

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, torn, milestoneShown;
  var ready, hitStop, shake;
  var leftX, rightX, leftActive, rightActive, leftId, rightId, tearProgress, strayY;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#ffffff', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_SPRITE = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 1, '#00000008');
  }

  function drawCloth() {
    game.draw.rect(W * 0.08, CY - 130, W * 0.84, 260, C.cloth, 1);
    for (var i = 1; i < 6; i++) {
      game.draw.line(W * 0.08 + i * (W * 0.84 / 6), CY - 130, W * 0.08 + i * (W * 0.84 / 6), CY + 130, C.clothLine, 2);
    }
    game.draw.line(W * 0.08, CY, W * 0.92, CY, C.ink, 3);
    // 裂け目
    var lx = CX0 - tearProgress, rx = CX0 + tearProgress;
    if (tearProgress > 4) {
      game.draw.rect(lx, CY - 130, tearProgress * 2, 14, C.bg, 1);
      game.draw.line(lx, CY - 6 + strayY, rx, CY - 6 - strayY, C.ink, 4);
    }
  }

  function initGame() {
    torn = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    milestoneShown = false;
    leftX = CX0 - 40; rightX = CX0 + 40; leftActive = false; rightActive = false;
    leftId = null; rightId = null; tearProgress = 0; strayY = 0;
  }

  function evalTear() {
    var spanL = CX0 - leftX, spanR = rightX - CX0;
    tearProgress = Math.min(spanL, spanR);
    strayY = Math.abs(spanL - spanR) * 0.4;
    if (Math.abs(spanL - spanR) > 90 && tearProgress > 60) {
      finished = true; ok = false; hitStop = 0.3;
      game.feedback.bad(CX0, CY, { text: 'RIP!' });
      shake = 0.3;
      game.audio.play('se_break', 0.4);
      finish();
      return;
    }
    if (tearProgress >= NEED) {
      torn++;
      game.feedback.good(CX0, CY, { text: 'CLEAN!', color: C.good });
      game.fx.burst(CX0, CY, { color: C.ink, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && torn >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX0, CY - 200, { color: C.ink, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (torn >= TOTAL) {
        finished = true; ok = true; hitStop = 0.12;
        game.audio.play('se_success', 0.5);
        finish();
      } else {
        leftX = CX0 - 40; rightX = CX0 + 40; leftActive = false; rightActive = false;
        leftId = null; rightId = null; tearProgress = 0; strayY = 0;
      }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (x < CX0 && !leftActive) { leftActive = true; leftId = id; leftX = x; game.audio.play('se_tap', 0.06); }
    else if (x >= CX0 && !rightActive) { rightActive = true; rightId = id; rightX = x; game.audio.play('se_tap', 0.06); }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || finished) return;
    if (leftActive && id === leftId) { leftX = Math.min(CX0 - 4, x); evalTear(); }
    else if (rightActive && id === rightId) { rightX = Math.max(CX0 + 4, x); evalTear(); }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId) { leftActive = false; leftId = null; }
    if (id === rightId) { rightActive = false; rightId = null; }
    if (!finished && tearProgress > 8 && tearProgress < NEED) {
      game.feedback.bad(x, y, { text: '' });
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX0 - 40, gy: CY, gx2: CX0 + 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { torn = 0; tearProgress = 0; strayY = 0; }
    var p = Math.min(1, cyc / 3.0);
    tearProgress = p * NEED;
    leftX = CX0 - tearProgress; rightX = CX0 + tearProgress;
    demo.gx = leftX; demo.gy = CY; demo.gx2 = rightX;
    demo.press = cyc < 3.0;
    if (p >= 1 && torn === 0) {
      torn = 1;
      game.fx.burst(CX0, CY, { color: C.ink, count: 10, speed: 260 });
      game.audio.play('se_good', 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (torn === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCloth();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCloth();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, C.ink);
      txt(torn + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.ink);
      if (!ok) txt('あと' + (TOTAL - torn) + '枚!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(torn, { torn: torn, total: TOTAL });
        else game.end.failure({ torn: torn, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCloth();
    if (!finished) {
      game.draw.sprite(HAND_SPRITE, { '#': C.ink }, leftX, CY - 60, 9, { anchor: 'center' });
      game.draw.sprite(HAND_SPRITE, { '#': C.ink }, rightX, CY - 60, 9, { anchor: 'center' });
    }

    txt(torn + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.clothLine, 0.6);
    game.draw.rect(60, 150, (W - 120) * (torn / TOTAL), 16, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 104, wave: 'square', volume: 0.04, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
