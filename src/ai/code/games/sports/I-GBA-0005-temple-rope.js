// I-GBA-0005-temple-rope.js
// テンプルロープ — 境内で回る大縄が足元を通る瞬間に合わせて跳ぶ、一発勝負の奉納芸
// 操作: 回る縄が足元の当たりゾーンに入っている間にタップして跳ぶ
// 終わり: 規定回数(4回)跳び続ければ成功。縄が足に当たれば(タイミングを外せば)失敗
// @mechanic: timing_window
// @theme: shrine_rope_jump
// 世界観: 山あいの神社の境内。奉納の大縄跳びを一人で演じる舞い手が、回り続ける縄を跳び越え続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び越えた回数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 塗りを使わず線だけ。draw.line を太さ違いで重ねて発光。黒地
  var C = {
    bg: '#050505', line: '#ffb020', lineDim: '#5a3d0e', glow: '#ffd97a',
    good: '#39ff8f', bad: '#ff3d3d', gold: '#ffd400', white: '#ffffff', ink: '#000000',
  };

  var GAME_TITLE = 'TEMPLE ROPE';
  var TOTAL = 4;
  var FOOT_Y = H * 0.72;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var jumped, done, endWait, finished, ready, hitStop, shake;
  var round, ropeAngle, ropeSpeed, jumpT, telegraphed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER_STAND = ['.##.', '####', '.##.', '#..#'];
  var DANCER_JUMP = ['.##.', '####', '.##.', '....'];

  function bg() {
    game.draw.gradient(0, H, [[0, '#050505'], [0.6, '#0a0a0a'], [1, '#020202']]);
    for (var i = 0; i < 4; i++) game.draw.line(0, H * (0.15 + i * 0.18), W, H * (0.15 + i * 0.18), '#151515', 2);
    game.draw.line(0, FOOT_Y + 40, W, FOOT_Y + 40, C.lineDim, 4);
    game.draw.line(0, FOOT_Y + 40, W, FOOT_Y + 40, C.line, 1.5);
  }

  function newRope() {
    return Math.max(1.1, 2.0 - round * 0.15);
  }

  function initGame() {
    jumped = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    round = 0; ropeAngle = -Math.PI / 2; ropeSpeed = 2 * Math.PI / newRope(); jumpT = 0; telegraphed = false;
  }

  // 縄は左右の支点を軸に鉛直面で回る円運動。足元を通るのは角度が下(PI/2)付近
  function ropeNearFoot() {
    var a = ((ropeAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    var d = Math.abs(a - Math.PI / 2);
    return Math.min(d, 2 * Math.PI - d);
  }

  function drawRope() {
    var a = ropeAngle;
    var rx = 320, ry = 360;
    var x1 = CX - 60, x2 = CX + 60;
    var swing = Math.sin(a);
    var topY = FOOT_Y - ry * 0.5 - Math.abs(Math.cos(a)) * 80;
    var botY = FOOT_Y + swing * ry * 0.42;
    game.draw.line(x1, topY, CX, botY, C.lineDim, 6);
    game.draw.line(CX, botY, x2, topY, C.lineDim, 6);
    game.draw.line(x1, topY, CX, botY, C.line, 2.5);
    game.draw.line(CX, botY, x2, topY, C.line, 2.5);
    var near = ropeNearFoot();
    if (near < 0.55) {
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (blink) game.draw.line(x1 - 20, FOOT_Y + 40, x2 + 20, FOOT_Y + 40, C.bad, 5);
    }
  }

  function drawDancer(jumping) {
    var y = jumping ? FOOT_Y - 60 : FOOT_Y;
    game.draw.sprite(jumping ? DANCER_JUMP : DANCER_STAND, { '#': C.glow }, CX, y, 24, { anchor: 'center' });
  }

  function attemptJump() {
    if (finished || ready > 0 || done) return;
    game.audio.play('se_tap', 0.06);
    var near = ropeNearFoot();
    var success = near < 0.7;
    hitStop = success ? 0.1 : 0.3;
    jumpT = 0.25;
    if (success) {
      jumped++;
      game.feedback.good(CX, FOOT_Y, { text: 'JUMP', color: C.good });
      game.fx.burst(CX, FOOT_Y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_jump', 0.35);
      if (jumped === Math.ceil(TOTAL / 2)) { game.fx.popup(jumped + ' / ' + TOTAL, CX, H * 0.3, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (jumped >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; ropeSpeed = 2 * Math.PI / newRope();
    } else {
      game.feedback.bad(CX, FOOT_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptJump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, angle: -Math.PI / 2, spd: 2.4, jumpT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.angle = -Math.PI / 2; }
    demo.angle += demo.spd * dt;
    ropeAngle = demo.angle;
    var a = ((demo.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    var near = Math.min(Math.abs(a - Math.PI / 2), 2 * Math.PI - Math.abs(a - Math.PI / 2));
    if (near < 0.15 && !demo.jumped) {
      demo.jumped = true; demo.press = true; demo.jumpT = 0.25;
      game.feedback.good(CX, FOOT_Y, { text: 'JUMP', color: C.good });
      game.audio.play('se_jump', 0.25);
    }
    if (near > 0.9) demo.jumped = false;
    if (demo.jumpT > 0) { demo.jumpT -= dt; } else demo.press = false;
    jumpT = demo.jumpT;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawRope();
      drawDancer(jumpT > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDancer(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(jumped + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - jumped) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(jumped, { jumped: jumped, total: TOTAL });
        else game.end.failure({ jumped: jumped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      ropeAngle += ropeSpeed * dt;
      var near = ropeNearFoot();
      if (near < 0.06 && jumpT <= 0) {
        // 見切れず縄に当たった
        hitStop = 0.3;
        game.feedback.bad(CX, FOOT_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (jumpT > 0) jumpT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawRope();
    drawDancer(jumpT > 0);

    txt(jumped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink);
    game.draw.rect(60, 150, (W - 120) * (jumped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 132, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
