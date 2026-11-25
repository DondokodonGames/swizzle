// D-20132016-0047-gearwell-descent.js
// ギアウェル降下 — 止まった時計塔の縦穴を、歯車リングを指で回してマーブルを下まで導く
// 操作: 下の丸いダイヤルを指で円を描くように回し、今アクティブなリングの隙間を球の真下へ合わせる
// 終わり: 3枚のリングを全て通り抜け底に着けば成功。隙間が合わずリングに弾かれれば失敗
// @mechanic: rotate_gesture
// @theme: stalled_clocktower_shaft
// 世界観: 止まった時計塔の内部。歯車リングが並ぶ縦穴に落ちたマーブルを、リングを回して底の動力部まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したリング数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 面ごとに3明度、等角風の積み上げ。影を落とさず明度差だけで立体を出す
  var C = {
    bg1: '#1a140c', bg2: '#0e0a06', shaftTop: '#2a2014', shaftMid: '#221a10', shaftLow: '#171208',
    ring: '#8a6a3a', ringHi: '#c9a35a', ringLo: '#5a4322', gap: '#0e0a06',
    ball: '#ffd94a', ballHi: '#fff2b8', good: '#5affa0', bad: '#ff5a5a', gold: '#ffd400', white: '#f4ecdc', ink: '#0a0704',
  };

  var GAME_TITLE = 'GEARWELL';
  var RING_Y = [H * 0.34, H * 0.48, H * 0.62];
  var RING_AMPL = 210;
  var GAP_HALF = 78;
  var BALL_X = W * 0.5;
  var BALL_START_Y = H * 0.20;
  var BALL_END_Y = H * 0.72;
  var DIAL_X = W * 0.5, DIAL_Y = H * 0.84, DIAL_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var ballY, ballVy, ringAngle, activeRing, passed, done, endWait, finished, ready, hitStop, shake;
  var dialGrabAngle, dialGrabbing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MARBLE_SPRITE = ['.##.', '####', '.##.'];

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.025 + 0.025 * Math.sin(elapsed * 1.4));
    // 縦穴の壁(3明度の面で立体感)
    game.draw.rect(W * 0.5 - 260, H * 0.14, 520, H * 0.62, C.shaftMid);
    game.draw.rect(W * 0.5 - 260, H * 0.14, 60, H * 0.62, C.shaftTop);
    game.draw.rect(W * 0.5 + 200, H * 0.14, 60, H * 0.62, C.shaftLow);
    for (var i = 0; i < 10; i++) game.draw.rect(W * 0.5 - 260, H * 0.14 + i * (H * 0.062), 520, 2, '#00000030');
  }

  function ringGapX(i) {
    return W * 0.5 + Math.sin(ringAngle[i]) * RING_AMPL;
  }

  function drawRing(i, elapsed) {
    var y = RING_Y[i];
    var gx = ringGapX(i);
    var isActive = i === activeRing;
    var col = isActive ? C.ringHi : C.ring;
    var sway = isActive ? Math.sin(elapsed * 2.3) * 3 : 0;
    // リング本体: 左片+右片(隙間はgxを中心にGAP_HALF幅だけ空ける)
    var leftW = Math.max(0, (gx - GAP_HALF) - (W * 0.5 - 240));
    var rightStart = gx + GAP_HALF;
    var rightW = Math.max(0, (W * 0.5 + 240) - rightStart);
    game.draw.rect(W * 0.5 - 240, y - 20 + sway, leftW, 40, col);
    game.draw.rect(W * 0.5 - 240, y - 20 + sway, leftW, 12, C.ringHi);
    game.draw.rect(rightStart, y - 20 + sway, rightW, 40, col);
    game.draw.rect(rightStart, y - 20 + sway, rightW, 12, C.ringHi);
    if (isActive) {
      var blink = Math.floor(elapsed * 6) % 2 === 0;
      if (blink) game.draw.rect(gx - GAP_HALF, y - 26 + sway, GAP_HALF * 2, 6, C.gold, 0.8);
    }
    if (passed[i]) game.draw.rect(W * 0.5 - 240, y - 20, 480, 40, C.good, 0.12);
  }

  function initGame() {
    ballY = BALL_START_Y; ballVy = 260;
    ringAngle = [game.random(0, 6.28), game.random(0, 6.28), game.random(0, 6.28)];
    activeRing = 0; passed = [false, false, false];
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    dialGrabbing = false; dialGrabAngle = 0;
  }

  function onDialPress(x, y) {
    if (Math.hypot(x - DIAL_X, y - DIAL_Y) < DIAL_R + 60) {
      dialGrabbing = true;
      dialGrabAngle = Math.atan2(y - DIAL_Y, x - DIAL_X);
      game.audio.play('se_tap', 0.15);
    }
  }
  function onDialMove(x, y) {
    if (!dialGrabbing || state !== S.PLAYING || finished) return;
    var a = Math.atan2(y - DIAL_Y, x - DIAL_X);
    var delta = a - dialGrabAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    dialGrabAngle = a;
    if (activeRing < 3) {
      ringAngle[activeRing] += delta;
      if (Math.random() < 0.06) game.audio.play('se_tap', 0.03);
    }
  }
  function onDialRelease(x, y) { dialGrabbing = false; game.audio.play('se_tap', 0.08); }

  game.onPress(function(x, y) { if (state === S.PLAYING) { onDialPress(x, y); game.audio.play('se_tap', 0.1); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && dialGrabbing) { onDialMove(x, y); if (Math.random() < 0.08) game.audio.play('se_tap', 0.02); } });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { onDialRelease(x, y); game.audio.play('se_tap', 0.06); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    ballVy += dt * 90;
    ballY += ballVy * dt;
    var y = RING_Y[activeRing];
    if (activeRing < 3 && ballY >= y - 10) {
      var gx = ringGapX(activeRing);
      if (Math.abs(BALL_X - gx) < GAP_HALF - 14) {
        passed[activeRing] = true;
        hitStop = 0.15;
        game.feedback.good(BALL_X, y, { text: 'GOOD', color: C.good, sound: 'se_milestone', volume: 0.4 });
        game.fx.burst(BALL_X, y, { color: C.gold, count: 14, speed: 300 });
        activeRing++;
        if (activeRing >= 3) {
          ok = true; finished = true; finish();
        }
      } else {
        hitStop = 0.4; shake = 0.3;
        game.feedback.bad(BALL_X, y, { text: 'CLUNK' });
        ok = false; finished = true; finish();
      }
    }
    if (ballY >= BALL_END_Y && activeRing >= 3 && !finished) {
      ok = true; finished = true; finish();
    }
  }

  var demo = { t: 0, gx: DIAL_X, gy: DIAL_Y, press: false, ang: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) {
      ballY = BALL_START_Y; ballVy = 260; activeRing = 0; passed = [false, false, false];
      ringAngle = [1.4, 2.6, 0.6];
    }
    ballVy += dt * 90; ballY += ballVy * dt;
    if (activeRing < 3) {
      var targetAngle = Math.asin(Math.max(-0.98, Math.min(0.98, 0)));
      var cur = ringAngle[activeRing];
      var target = 0; // 隙間をBALL_X直下(sin=0)へ寄せる
      var diff = Math.sin(target) - Math.sin(cur);
      ringAngle[activeRing] += diff * Math.min(1, dt * 3.2);
      demo.ang = ringAngle[activeRing];
      demo.gx = DIAL_X + Math.cos(demo.t * 3) * (DIAL_R - 20);
      demo.gy = DIAL_Y + Math.sin(demo.t * 3) * (DIAL_R - 20);
      demo.press = true;
      var y = RING_Y[activeRing];
      if (ballY >= y - 10 && Math.abs(Math.sin(ringAngle[activeRing])) < 0.12) {
        passed[activeRing] = true; activeRing++;
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (ballY === undefined) initGame();
      stepDemo(dt);
      bg(el);
      for (var i = 0; i < 3; i++) drawRing(i, el);
      game.draw.sprite(MARBLE_SPRITE, { '#': C.ball }, BALL_X, ballY, 10, { anchor: 'center' });
      game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.ringLo, 0.5);
      game.draw.circle(DIAL_X, DIAL_Y, DIAL_R - 14, C.ring, 0.5);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      for (var r = 0; r < 3; r++) drawRing(r, el);
      game.draw.sprite(MARBLE_SPRITE, { '#': ok ? C.good : C.bad }, BALL_X, Math.min(ballY, BALL_END_Y), 10, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var cnt = passed.filter(function(p) { return p; }).length;
      txt(cnt + ' / ' + 3, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (3 - cnt) + '枚!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var cnt2 = passed.filter(function(p) { return p; }).length;
        if (ok) game.end.success(cnt2, { rings: cnt2 }); else game.end.failure({ rings: cnt2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg(el);
    for (var k = 0; k < 3; k++) drawRing(k, el);
    var flash = hitStop > 0 && Math.floor(hitStop * 30) % 2 === 0;
    game.draw.sprite(MARBLE_SPRITE, { '#': flash ? C.white : C.ball }, BALL_X, ballY, flash ? 13 : 10, { anchor: 'center' });

    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.ringLo, 0.6);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R - 14, C.ring, 0.6);
    game.draw.circle(DIAL_X + Math.cos(dialGrabAngle) * (DIAL_R - 30), DIAL_Y + Math.sin(dialGrabAngle) * (DIAL_R - 30), 18, C.gold);

    txt(activeRing + ' / ' + 3, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
