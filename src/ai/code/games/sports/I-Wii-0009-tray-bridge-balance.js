// I-Wii-0009-tray-bridge-balance.js
// トレイブリッジ・バランス — 傾く吊り橋の上でスープトレイを水平に保ち、渡りきる
// 操作: トレイが傾いた側と逆のボタン(左/右)を押して重心を戻す。時間いっぱい保てば成功
// 終わり: 制限時間(18秒)保てば成功。傾きが限界を超えて皿が落ちれば失敗
// @mechanic: balance
// @theme: rope_bridge_tray_carrier
// 世界観: 渓谷の吊り橋を渡る給仕ロボット。強風にあおられるたびトレイの傾きを戻し、スープをこぼさず対岸まで運ぶ
// 残るもの: 正誤(CLEAR/GAME OVER) + 保てた秒数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、祝祭の光の柱
  var C = {
    skyTop: '#6fd8ff', skyBot: '#bff3ff', canyon: '#c98a4a', canyonDark: '#9a6230',
    rope: '#5a3a1a', tray: '#ffffff', trayEdge: '#ff6a3d', bowl: '#ff9a2e', soup: '#ffd23d',
    bot: '#3da8ff', botDark: '#1a6fc4', bad: '#ff3355', good: '#2ee87a',
    gold: '#ffcc00', white: '#ffffff', ink: '#1a1005',
  };

  var GAME_TITLE = 'TRAY BRIDGE';
  var DURATION = 18;
  var TILT_MAX = 42;
  var CX = W * 0.5, TRAY_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var timeLeft, tilt, tiltVel, maxTiltSeen, done, endWait, finished;
  var ready, hitStop, shake, halfShown;
  var gustTimer, gustDir, gustTelegraph, gustActive, gustPower;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.####.', '######', '.####.', '.#..#.'];

  function bg() {
    game.draw.gradient(0, TRAY_Y + 60, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.gradient(TRAY_Y + 60, H - (TRAY_Y + 60), [[0, C.canyon], [1, C.canyonDark]]);
    for (var i = 0; i < 6; i++) {
      game.draw.circle(80 + i * 190, H * 0.15, 30, C.white, 0.5);
    }
    game.draw.line(0, TRAY_Y + 210, W, TRAY_Y + 210, C.rope, 10);
  }

  function newGust() {
    gustTimer = game.random(1.6, 2.6);
    gustDir = Math.random() < 0.5 ? -1 : 1;
    gustTelegraph = false;
    gustActive = 0;
    gustPower = game.random(46, 70);
  }

  function initGame() {
    timeLeft = DURATION; tilt = 0; tiltVel = 0; maxTiltSeen = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
    newGust();
  }

  function physicsStep(dt) {
    if (gustActive > 0) {
      tiltVel += gustDir * gustPower * dt;
      gustActive -= dt;
    } else {
      gustTimer -= dt;
      if (gustTimer <= 0.6 && !gustTelegraph) gustTelegraph = true;
      if (gustTimer <= 0) { gustActive = 0.5; gustTimer = 999; }
    }
    tilt += tiltVel * dt;
    tiltVel *= 0.95;
    if (tilt > TILT_MAX) tilt = TILT_MAX;
    if (tilt < -TILT_MAX) tilt = -TILT_MAX;
    if (Math.abs(tilt) > maxTiltSeen) maxTiltSeen = Math.abs(tilt);
  }

  function resolveTap(side) {
    if (ready > 0 || done || finished) return;
    var neededSide = tilt > 2 ? 'left' : (tilt < -2 ? 'right' : null);
    if (neededSide === null || side === neededSide) {
      tiltVel += (side === 'left' ? -1 : 1) * 30;
      game.feedback.good(side === 'left' ? W * 0.22 : W * 0.78, H * 0.82, { text: 'GOOD', color: C.good, size: 22 });
      game.audio.play('se_tap', 0.15);
    } else {
      tiltVel += (tilt > 0 ? 1 : -1) * 14;
      game.feedback.bad(side === 'left' ? W * 0.22 : W * 0.78, H * 0.82, { text: '', size: 18 });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x < CX ? 'left' : 'right');
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTray(tiltDeg) {
    var lift = tiltDeg * 3.4;
    game.draw.line(CX - 220, TRAY_Y + lift * 0.5, CX + 220, TRAY_Y - lift * 0.5, C.trayEdge, 20);
    game.draw.line(CX - 220, TRAY_Y + lift * 0.5, CX + 220, TRAY_Y - lift * 0.5, C.tray, 12);
    var bowlX = CX - tiltDeg * 2.2;
    game.draw.circle(bowlX, TRAY_Y - 24, 46, C.bowl);
    game.draw.circle(bowlX, TRAY_Y - 30, 34, C.soup);
  }

  function drawBot() {
    game.draw.sprite(BOT_SPRITE, { '#': C.bot }, CX, H * 0.66, 22, { anchor: 'center' });
  }

  function drawButtons() {
    game.draw.circle(W * 0.22, H * 0.82, 90, C.botDark, 0.5);
    game.draw.circle(W * 0.78, H * 0.82, 90, C.botDark, 0.5);
    game.draw.circle(W * 0.22, H * 0.82, 70, C.white, 0.9);
    game.draw.circle(W * 0.78, H * 0.82, 70, C.white, 0.9);
  }

  function drawGustWarn() {
    if (gustTelegraph && gustActive <= 0) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        var wx = gustDir < 0 ? W * 0.12 : W * 0.88;
        game.draw.circle(wx, TRAY_Y, 50, C.bad, 0.5);
      }
    }
  }

  var demo = { t: 0, gx: W * 0.22, gy: H * 0.82, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) {
      timeLeft = DURATION; tilt = 0; tiltVel = 0; newGust();
      gustTimer = 1.0; gustDir = 1;
    }
    physicsStep(dt);
    if (gustTelegraph && !demo.reacted) {
      demo.reacted = true;
      var side = tilt >= 0 ? 'left' : 'right';
      demo.gx = side === 'left' ? W * 0.22 : W * 0.78;
      demo.press = true;
      tiltVel += (side === 'left' ? -1 : 1) * 30;
      game.feedback.good(demo.gx, H * 0.82, { text: 'GOOD', color: C.good, size: 22 });
      game.audio.play('se_tap', 0.1);
    }
    if (gustActive <= 0 && gustTimer > 0.6) { demo.reacted = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGustWarn();
      drawTray(tilt);
      drawBot();
      drawButtons();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 24, C.trayEdge);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.trayEdge);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTray(0);
      drawBot();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(Math.ceil(DURATION - timeLeft) + ' / ' + DURATION, W / 2, H * 0.13, 30, C.trayEdge);
      if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var held = Math.round(DURATION - timeLeft);
        if (ok) game.end.success(held, { heldSec: held, maxTilt: Math.round(maxTiltSeen) });
        else game.end.failure({ heldSec: held, maxTilt: Math.round(maxTiltSeen) });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      physicsStep(dt);
      timeLeft -= dt;
      if (!halfShown && timeLeft <= DURATION / 2) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.26, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (Math.abs(tilt) >= TILT_MAX) {
        finished = true; ok = false;
        hitStop = 0.4; shake = 0.35;
        game.feedback.bad(CX, TRAY_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (timeLeft <= 0) {
        finished = true; ok = true;
        hitStop = 0.15;
        game.feedback.good(CX, TRAY_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, TRAY_Y, { color: C.gold, count: 18, speed: 350 });
        game.audio.play('se_good', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGustWarn();
    drawTray(finished ? tilt : tilt);
    drawBot();
    drawButtons();

    txt(Math.max(0, Math.ceil(timeLeft)) + ' / ' + DURATION, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.35);
    game.draw.rect(60, 150, (W - 120) * ((DURATION - timeLeft) / DURATION), 16, C.trayEdge);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.trayEdge);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
