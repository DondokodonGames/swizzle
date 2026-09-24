// D-20092012-0020-drift-relay.js
// ドリフトリレー — 夜間の高架道を疾走する配送ドローン便が、連続カーブを片流れの重心操作で駆け抜ける
// 操作: カーブの引っ張られる側と逆の親指ゾーンを繰り返しタップして重心を戻し続ける
// 終わり: 規定カーブ数を重心オーバーせずに抜ければ成功。重心が振り切れたら失敗
// @mechanic: balance
// @theme: elevated_night_courier
// 世界観: 夜の高架配送路。荷物ドローン便のパイロットが、連続するカーブで機体の傾きを保ちながら終点まで走り抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けたカーブ数
// スタイル: MODE7 PSEUDO
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色 + 地平グラデ。横1pxストリップで床を圧縮描画し、市松で速度感を出す
  var C = {
    sky1: '#1a1040', sky2: '#3a2060', road: '#2a2438', roadAlt: '#342c46',
    edge: '#ff5fb0', accent: '#40e0ff', good: '#4dff9a', bad: '#ff4d5e',
    gold: '#ffd23f', white: '#f4f0ff', ink: '#0a0714',
  };

  var GAME_TITLE = 'DRIFT RELAY';
  var CX = W * 0.5;
  var HORIZON = H * 0.34;
  var CORNERS_TOTAL = 4;
  var GAP_DUR = 0.6, ACTIVE_DUR = 3.0;
  var PULL_RATE = 42; // per second, magnitude balance grows during active phase
  var CORRECT_STEP = 27;
  var WRONG_STEP = 14;
  var CRASH_LIMIT = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var balance, cornersCleared, corner, scroll, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRONE = ['..##..', '.####.', '##..##', '.####.', '..##..'];

  function newCorner() {
    return { dir: Math.random() < 0.5 ? -1 : 1, phase: 'gap', t: 0 };
  }

  function initGame() {
    balance = 0; cornersCleared = 0; corner = newCorner(); scroll = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, HORIZON, [[0, C.sky2], [1, C.sky1]]);
    game.draw.circle(W * 0.78, HORIZON * 0.45, 90, C.accent, 0.12);
  }

  // 疑似3D床: 横ストリップで奥行き圧縮 + カーブ方向へセンターをずらす
  function drawRoad(curveAmt) {
    var STRIPS = 46;
    for (var i = 0; i < STRIPS; i++) {
      var t0 = i / STRIPS, t1 = (i + 1) / STRIPS;
      var y0 = HORIZON + (H - HORIZON) * (t0 * t0);
      var y1 = HORIZON + (H - HORIZON) * (t1 * t1);
      var rw = 40 + (W * 0.9) * (t0 * t0);
      var cxAt = CX + curveAmt * (1 - t0) * (1 - t0) * 260;
      var checker = Math.floor(scroll * 0.6 + t0 * 22) % 2 === 0;
      game.draw.rect(cxAt - rw / 2, y0, rw, Math.max(2, y1 - y0), checker ? C.road : C.roadAlt);
      game.draw.rect(cxAt - rw / 2 - 6, y0, 6, Math.max(2, y1 - y0), C.edge, 0.8);
      game.draw.rect(cxAt + rw / 2, y0, 6, Math.max(2, y1 - y0), C.edge, 0.8);
    }
  }

  function drawVehicle(bal) {
    var lean = (bal / CRASH_LIMIT) * 130;
    var wob = Math.sin(game.time.elapsed * 6) * 4;
    game.draw.circle(CX + lean, H * 0.86 + 26, 70, C.ink, 0.35);
    game.draw.sprite(DRONE, { '#': C.gold }, CX + lean + wob * 0.2, H * 0.84, 24, { anchor: 'center' });
  }

  function cornerArrow(dir, on) {
    if (!on) return;
    var x = CX + dir * 300;
    txt(dir < 0 ? '<' : '>', x, HORIZON * 0.7, 70, C.bad);
  }

  function applyTap(side, x, y) {
    game.audio.play('se_tap', 0.15);
    var correct = side === -corner.dir;
    if (correct) {
      balance -= corner.dir * CORRECT_STEP;
      game.feedback.good(x, y, { text: 'GOOD', color: C.good, size: 30 });
    } else {
      balance += corner.dir * WRONG_STEP;
      game.feedback.bad(x, y, { text: 'MISS', size: 26 });
    }
  }

  function tickCorner(dt) {
    corner.t += dt;
    if (corner.phase === 'gap') {
      if (corner.t >= GAP_DUR) { corner.phase = 'active'; corner.t = 0; }
      return;
    }
    // active: passive pull toward crash edge
    balance += corner.dir * PULL_RATE * dt;
    if (Math.abs(balance) >= CRASH_LIMIT) {
      balance = corner.dir * CRASH_LIMIT;
      ok = false; finished = true; hitStop = 0.4;
      game.feedback.bad(CX + corner.dir * 130, H * 0.84, { text: 'MISS', size: 30 });
      game.fx.shake(20, 0.35); shake = 0.35;
      game.audio.play('se_bad', 0.5);
      finish();
      return;
    }
    if (corner.t >= ACTIVE_DUR) {
      cornersCleared++;
      balance *= 0.35;
      if (cornersCleared === Math.ceil(CORNERS_TOTAL / 2)) {
        game.fx.popup('NICE', CX, H * 0.4, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.4);
      }
      if (cornersCleared >= CORNERS_TOTAL) {
        ok = true; finished = true; finish();
        return;
      }
      corner = newCorner();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished && !done) {
      var side = x < CX ? -1 : 1;
      applyTap(side, x, y);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX - 260, gy: H * 0.9, press: false, corner: null, phase: 'gap', tt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { balance = 0; cornersCleared = 0; demo.corner = newCorner(); demo.corner.dir = (Math.floor(demo.t / 3.6) % 2 === 0) ? -1 : 1; demo.tt = 0; }
    demo.tt += dt;
    corner = demo.corner;
    if (demo.corner.phase === 'gap') {
      if (demo.tt >= GAP_DUR) { demo.corner.phase = 'active'; demo.tt = 0; }
    } else {
      balance += demo.corner.dir * PULL_RATE * dt;
      var side = -demo.corner.dir;
      var correctAt = 0.7;
      if (demo.tt > correctAt && demo.tt < correctAt + 0.15 && !demo.corner._fixed) {
        demo.corner._fixed = true;
        balance -= demo.corner.dir * CORRECT_STEP * 2.4;
        demo.gx = CX + side * 300; demo.press = true;
        game.feedback.good(demo.gx, H * 0.9, { text: 'GOOD', color: C.good, size: 30 });
        game.audio.play('se_tap', 0.15);
      } else if (demo.tt > correctAt + 0.3) {
        demo.press = false;
      }
    }
    if (Math.abs(balance) >= CRASH_LIMIT) balance = demo.corner.dir * CRASH_LIMIT * 0.9;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (balance === undefined) initGame();
      bg();
      stepDemo(dt);
      scroll += dt * 20;
      var curveAmt = corner.phase === 'active' ? corner.dir : corner.dir * 0.25;
      drawRoad(curveAmt);
      cornerArrow(corner.dir, corner.phase === 'gap' && Math.floor(game.time.elapsed * 6) % 2 === 0);
      drawVehicle(balance);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.10, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRoad(0);
      drawVehicle(balance);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cornersCleared + ' / ' + CORNERS_TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (CORNERS_TOTAL - cornersCleared) + 'カーブ!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cornersCleared, { corners: cornersCleared, total: CORNERS_TOTAL });
        else game.end.failure({ corners: cornersCleared, total: CORNERS_TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickCorner(dt);
    }
    if (shake > 0) shake -= dt;

    scroll += dt * 20;
    bg();
    var curveAmt2 = (!finished && corner.phase === 'active') ? corner.dir : corner.dir * 0.25;
    drawRoad(curveAmt2);
    cornerArrow(corner.dir, !finished && corner.phase === 'gap' && Math.floor(game.time.elapsed * 6) % 2 === 0);
    drawVehicle(balance);

    txt(cornersCleared + ' / ' + CORNERS_TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(W * 0.15, H * 0.16, W * 0.7, 18, C.ink, 0.5);
    var barX = W * 0.5 + (balance / CRASH_LIMIT) * (W * 0.35);
    game.draw.rect(W * 0.15, H * 0.16, W * 0.7, 18, C.roadAlt);
    game.draw.circle(barX, H * 0.16 + 9, 14, Math.abs(balance) > 70 ? C.bad : C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
