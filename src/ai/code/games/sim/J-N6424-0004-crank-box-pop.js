// J-N6424-0004-crank-box-pop.js
// クランクボックス・ポップ — 木箱のハンドルを回し続け、中のからくり人形が飛び出す絶妙な瞬間を狙って弾き出す
// 操作: 指で円を描くようにハンドルを回し続ける。光る帯にゲージが入った瞬間にもうひと押し回して弾き出す
// 終わり: 規定回数、光る帯の中で弾き出せば成功。的を外れたまま時間切れなら失敗
// @mechanic: rotate_gesture
// @theme: crank_box_pop
// 世界観: 玩具工房の見習い職人が、木箱のハンドルを回し続け、中のからくり人形が飛び出す絶妙なタイミングを狙って弾き出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 弾き出せた回数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 多色+光、パララックス、細かいアニメ
  var C = {
    bg: '#3a2a1a', bg2: '#221408', box: '#c08840', boxDark: '#8a5c28', boxLight: '#e0b070',
    dial: '#5a3e20', dialGlow: '#ffd400', doll: '#e04050', dollDark: '#a02030',
    good: '#3ad06a', bad: '#ff4d5e', gold: '#ffd400', ink: '#fff0d8', white: '#ffffff',
  };

  var GAME_TITLE = 'CRANK POP';
  var TARGET_POPS = 3;
  var TIME_LIMIT = 13;
  var ZONE_W = 0.22; // fraction of full turn

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#140a04', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DOLL_SPR = ['.##.', '####', '.##.', '#..#'];

  var CRANK_X = W * 0.5, CRANK_Y = H * 0.58, CRANK_R = 150;

  var angle, angleVel, zoneAngle, pops, popFlash, roundClock, halfCalled;
  var lastPointerAngle, dragging;
  var done, endWait, finished, ready, hitStop, shake;

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.2);
  }

  function drawBox() {
    game.draw.rect(CRANK_X - 220, H * 0.66, 440, 220, C.box);
    game.draw.rect(CRANK_X - 220, H * 0.66, 440, 20, C.boxLight, 0.5);
    game.draw.rect(CRANK_X - 220, H * 0.86 - 4, 440, 8, C.boxDark);
    if (popFlash > 0) {
      var t = 1 - popFlash / 0.4;
      var dollY = H * 0.66 - t * 220;
      game.draw.sprite(DOLL_SPR, { '#': C.doll }, CRANK_X, dollY, 20, { anchor: 'center' });
    }
  }

  function drawDial(a, zoneA) {
    game.draw.circle(CRANK_X, CRANK_Y, CRANK_R, C.dial);
    // zone wedge drawn as small arc segment using rotated rect strips
    var zoneStart = zoneA - ZONE_W * Math.PI;
    var zoneEnd = zoneA + ZONE_W * Math.PI;
    for (var s = zoneStart; s < zoneEnd; s += 0.05) {
      var zx = CRANK_X + Math.cos(s) * (CRANK_R - 14);
      var zy = CRANK_Y + Math.sin(s) * (CRANK_R - 14);
      game.draw.circle(zx, zy, 16, C.dialGlow, 0.8);
    }
    var hx = CRANK_X + Math.cos(a) * (CRANK_R - 14);
    var hy = CRANK_Y + Math.sin(a) * (CRANK_R - 14);
    game.draw.line(CRANK_X, CRANK_Y, hx, hy, C.boxLight, 14);
    game.draw.circle(hx, hy, 26, C.gold);
  }

  function initGame() {
    angle = 0; angleVel = 0; zoneAngle = Math.random() * Math.PI * 2; pops = 0; popFlash = 0;
    roundClock = 0; halfCalled = false; lastPointerAngle = null; dragging = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function angleDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  function beginTurn(x, y) {
    if (finished || ready > 0) return;
    dragging = true;
    lastPointerAngle = Math.atan2(y - CRANK_Y, x - CRANK_X);
    game.audio.play('se_tap', 0.05);
  }

  function moveTurn(x, y) {
    if (!dragging || finished) return;
    var a = Math.atan2(y - CRANK_Y, x - CRANK_X);
    var d = angleDiff(a, lastPointerAngle);
    angle += d;
    angleVel = d;
    lastPointerAngle = a;
    if (Math.random() < 0.08) game.audio.play('se_tap', 0.03);
    var norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var inZone = Math.abs(angleDiff(norm, zoneAngle)) < ZONE_W * Math.PI;
    if (inZone && Math.abs(d) > 0.12) {
      pops++;
      popFlash = 0.4;
      game.feedback.good(CRANK_X, CRANK_Y - 260, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.35);
      zoneAngle = Math.random() * Math.PI * 2;
      if (pops === Math.ceil(TARGET_POPS / 2)) {
        game.fx.popup('NICE', CRANK_X, CRANK_Y - 200, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
      if (pops >= TARGET_POPS) {
        ok = true; finished = true; hitStop = 0.25;
        game.feedback.good(CRANK_X, CRANK_Y - 260, { text: 'CLEAR', color: C.good });
        game.fx.burst(CRANK_X, CRANK_Y - 260, { color: C.gold, count: 22, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
  }

  function endTurn() {
    if (dragging) { dragging = false; game.audio.play('se_tap', 0.03); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); beginTurn(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    moveTurn(x, y);
  });
  game.onRelease(function() { if (state === S.PLAYING) { game.audio.play('se_tap', 0.03); endTurn(); } });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CRANK_X + CRANK_R, gy: CRANK_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var a = cyc * 3.0;
    demo.gx = CRANK_X + Math.cos(a) * (CRANK_R - 14);
    demo.gy = CRANK_Y + Math.sin(a) * (CRANK_R - 14);
    demo.press = true;
    angle = a;
    var norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (Math.abs(angleDiff(norm, zoneAngle)) < ZONE_W * Math.PI && Math.random() < 0.06) {
      pops++;
      popFlash = 0.4;
      game.feedback.good(CRANK_X, CRANK_Y - 260, { text: 'GOOD', color: C.good });
      game.audio.play('se_powerup', 0.2);
      zoneAngle = Math.random() * Math.PI * 2;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      stepDemo(dt);
      if (popFlash > 0) popFlash -= dt;
      bg();
      drawBox();
      drawDial(angle, zoneAngle);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBox();
      drawDial(angle, zoneAngle);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(pops + ' / ' + TARGET_POPS, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TARGET_POPS - pops) + '回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pops, { pops: pops, target: TARGET_POPS });
        else game.end.failure({ pops: pops, target: TARGET_POPS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', CRANK_X, CRANK_Y - 200, { color: C.gold, size: 30 });
      }
      if (roundClock >= TIME_LIMIT) {
        ok = pops >= Math.ceil(TARGET_POPS * 0.5);
        finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CRANK_X, CRANK_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (popFlash > 0) popFlash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBox();
    drawDial(angle, zoneAngle);

    txt(pops + ' / ' + TARGET_POPS, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, barW, 16, '#3a2a18', 1);
    game.draw.rect(60, 150, barW * pct, 16, pct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F#4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 120, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
