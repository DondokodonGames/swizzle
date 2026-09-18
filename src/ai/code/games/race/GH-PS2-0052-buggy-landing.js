// GH-PS2-0052-buggy-landing.js
// バギーランディング — 凸凹の道を跳ねる。着地の向きを合わせる
// 操作: 空中で回る針が水平(まん中)に来た瞬間にタップして着地の姿勢を合わせる
// 終わり: 3回ジャンプ。うまく着地できた回数が残る
// @mechanic: timing_window
// @theme: dune_jump
// 世界観: 暗い砂丘のコース。段差を跳ぶたび、機体が空中で回転する。針がまん中(水平)に来た瞬間だけ着地を合わせられる
// 残るもの: 正誤(CLEAR/GAME OVER) + 着地成功数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s PRE-RENDER: 暗め・金属質。粒状ノイズと擬似奥行き
  var C = {
    sky1: '#1a1410', sky2: '#0e0a08', dune1: '#3a2c1c', dune2: '#2a2014',
    buggy: '#c89a3a', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0e8d8', ink: '#0a0806',
  };

  var GAME_TITLE = 'BUGGY LANDING';
  var JUMPS = 3, AIR_TIME = 0.95, SPIN_SPEED = 5.2, SAFE_HALF = 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, landed = 0;

  var jumpIdx, airT, angle, resolved, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function grain() {
    for (var i = 0; i < 40; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.02); }
  }

  var CX = W / 2, DIAL_Y = H * 0.36, DIAL_R = 160;
  var BUGGY_SPRITE = ['.##.', '####', '#..#'];

  function duneBg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [1, '#050403']]);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.1 + i * 0.22), H * (0.62 + (i % 2) * 0.10), 160, i % 2 === 0 ? C.dune1 : C.dune2, 0.6);
    game.draw.rect(0, H * 0.80, W, H * 0.20, C.dune1);
    grain();
  }

  function normAngle() { return ((angle % 1) + 1) % 1; } // 0..1 = 0..360deg

  function drawDial() {
    game.draw.circle(CX, DIAL_Y, DIAL_R, C.ink, 0.5);
    game.draw.circle(CX, DIAL_Y, DIAL_R, C.gold, 0.0);
    // 安全ゾーン(上方向 = 水平)
    var a0 = -0.25 - SAFE_HALF, a1 = -0.25 + SAFE_HALF;
    for (var s = 0; s < 20; s++) {
      var t = a0 + (a1 - a0) * (s / 19);
      var px = CX + Math.cos(t * Math.PI * 2) * DIAL_R, py = DIAL_Y + Math.sin(t * Math.PI * 2) * DIAL_R;
      game.draw.circle(px, py, 8, C.good, 0.8);
    }
    var na = normAngle();
    var nx = CX + Math.cos((na - 0.25) * Math.PI * 2) * DIAL_R, ny = DIAL_Y + Math.sin((na - 0.25) * Math.PI * 2) * DIAL_R;
    game.draw.line(CX, DIAL_Y, nx, ny, C.white, 8);
    game.draw.circle(CX, DIAL_Y, 20, C.gold);
    game.draw.sprite(BUGGY_SPRITE, { '#': C.buggy }, CX, DIAL_Y, 18, { anchor: 'center' });
  }

  function newJump() {
    airT = AIR_TIME; angle = Math.random(); resolved = false;
  }

  function initGame() {
    jumpIdx = 0; landed = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newJump();
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0 || resolved) return;
    hitStop = 0.06;
    var na = normAngle();
    var d = na - (-0.25 + 1) % 1; d = ((d + 1.5) % 1) - 0.5;
    var ok2 = Math.abs(d) < SAFE_HALF;
    resolved = true;
    if (ok2) {
      landed++;
      game.feedback.good(CX, DIAL_Y, { text: 'CLEAN', color: C.good });
      game.fx.burst(CX, DIAL_Y, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      game.feedback.bad(CX, DIAL_Y, { text: 'CRASH' });
      shake = 0.15;
      game.audio.play('se_bad', 0.35);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = landed * 100;
    game.audio.stopBgm();
    game.audio.play(landed > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 針が緑の帯に来た瞬間だけタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.62, press: false, angle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.4;
    demo.angle = (cyc * SPIN_SPEED) % 1;
    angle = demo.angle;
    var na = normAngle();
    var d = ((na - (-0.25 + 1) % 1 + 1.5) % 1) - 0.5;
    demo.press = Math.abs(d) < SAFE_HALF && cyc > 0.2;
    if (demo.press && Math.abs(d) < SAFE_HALF * 0.6) { game.feedback.good(CX, DIAL_Y, { text: 'CLEAN', color: C.good }); game.fx.burst(CX, DIAL_Y, { color: C.gold, count: 10, speed: 300 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (jumpIdx === undefined) initGame();
      duneBg();
      stepDemo(dt);
      drawDial();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 52, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.13, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      duneBg();
      drawDial();
      txt(landed >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, landed >= 2 ? C.white : C.bad);
      txt('LANDED ' + landed + ' / ' + JUMPS, W / 2, H * 0.62, 42, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.68, 32, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.74, 34, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 34, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: landed + '/' + JUMPS }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      angle += dt * SPIN_SPEED;
      airT -= dt;
      if (airT <= 0) {
        if (!resolved) { game.feedback.bad(CX, DIAL_Y, { text: 'CRASH' }); shake = 0.1; game.audio.play('se_bad', 0.3); }
        jumpIdx++;
        if (jumpIdx >= JUMPS) finish();
        else { newJump(); game.fx.popup(jumpIdx + ' / ' + JUMPS, W / 2, H * 0.16, { color: C.gold, size: 42 }); }
      }
    }
    if (shake > 0) shake -= dt;

    duneBg();
    drawDial();

    game.draw.rect(60, 40, W - 120, 22, C.ink);
    game.draw.rect(60, 40, (W - 120) * (jumpIdx / JUMPS), 22, C.gold);
    txt(jumpIdx + ' / ' + JUMPS, W / 2, 104, 40, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
