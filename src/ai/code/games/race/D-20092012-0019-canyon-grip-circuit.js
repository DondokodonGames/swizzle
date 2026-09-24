// D-20092012-0019-canyon-grip-circuit.js
// キャニオン・グリップサーキット — 疑似3Dで流れる峡谷コースを、ドラッグ操舵とブレーキタップでコーナーを攻める
// 操作: 進行方向へ指をドラッグしてハンドルを切り、コーナー手前で画面下を短くタップしてブレーキをかける
// 終わり: 規定数(4コーナー)をコースアウトせず走り切れば成功。1回でも壁に接触すれば失敗
// @mechanic: guide_path
// @theme: canyon_grip_circuit
// 世界観: 岩壁に挟まれた峡谷の一本道サーキット。疑似3Dで流れる路面を、ハンドル操作とブレーキでコーナーごとに攻め抜くタイムアタック
// 残るもの: 正誤(CLEAR/GAME OVER) + 抜けたコーナー数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮。地平線から上は空グラデ
  var C = {
    sky1: '#ffb060', sky2: '#ff7a40', horizon: '#3a2a4a',
    roadA: '#5a5a68', roadB: '#4a4a58', rumbleA: '#ff3a3a', rumbleB: '#f0f0f0',
    wallA: '#8a5a3a', wallB: '#6a4228',
    car: '#3ad0ff', carDark: '#1a80b8', good: '#4dff8a', bad: '#ff4d5e',
    gold: '#ffe14a', white: '#ffffff', ink: '#140a10',
  };

  var GAME_TITLE = 'CANYON GRIP';
  var TOTAL = 4;
  var CX = W * 0.5;
  var HORIZON_Y = H * 0.34;
  var CAR_Y = H * 0.80;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CAR = ['.##.', '####', '####'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, HORIZON_Y, [[0, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, HORIZON_Y - 6, W, 10, C.horizon);
  }

  // MODE7擬似: 地平線からプレイヤーまでを横ストリップで走査し、奥ほど圧縮+カーブオフセット
  function drawRoad(curveNow, scroll) {
    var rows = 46;
    for (var i = 0; i < rows; i++) {
      var t = i / rows; // 0=地平線寄り, 1=手前
      var y = HORIZON_Y + (CAR_Y + 220 - HORIZON_Y) * (t * t);
      var rowH = 3 + t * 14;
      var perspective = 0.05 + t * t * 0.9;
      var roadHalfW = (60 + t * t * 620);
      var curveOffset = curveNow * (1 - t) * (1 - t) * 520 * -1;
      var stripeShift = (Math.floor((scroll * (0.2 + t * 1.4))) % 2 === 0);
      var rowColor = stripeShift ? C.roadA : C.roadB;
      var rumble = stripeShift ? C.rumbleA : C.rumbleB;
      var cx = CX + curveOffset;
      game.draw.rect(cx - roadHalfW - 24, y, roadHalfW * 2 + 48, rowH + 1, rumble);
      game.draw.rect(cx - roadHalfW, y, roadHalfW * 2, rowH + 1, rowColor);
      game.draw.rect(0, y, Math.max(0, cx - roadHalfW - 24), rowH + 1, C.wallA);
      game.draw.rect(cx + roadHalfW + 24, y, Math.max(0, W - (cx + roadHalfW + 24)), rowH + 1, C.wallB);
    }
  }

  var corners, cIdx, steer, brakeFlash, cleared, done, endWait, finished, scroll, curveNow;
  var ready, hitStop, shake, milestoneDone, carX, warnT;

  function buildCorners() {
    corners = [];
    for (var i = 0; i < TOTAL; i++) {
      corners.push({ dir: Math.random() < 0.5 ? -1 : 1, dist: 0, resolved: false, telegraphed: false, needBrake: true });
    }
  }

  function initGame() {
    buildCorners();
    cIdx = 0; cleared = 0; steer = 0; brakeFlash = 0; scroll = 0; curveNow = 0; carX = CX;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneDone = false; warnT = 0;
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    steer = Math.max(-1, Math.min(1, (x - carX) / 260));
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function() { steer *= 0.3; game.audio.play('se_tap', 0.03); });

  var braking = false;
  game.onHold(function(x, y, dur) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (y > H * 0.8) {
      braking = true;
      brakeFlash = 0.3;
      game.feedback.good(x, y, { text: 'BRAKE', color: C.good, count: 3 });
      game.audio.play('se_tap', 0.25);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.1); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function updateGame(dt) {
    var speed = braking ? 260 : 620;
    scroll += speed * dt * 0.01;
    braking = false;
    var c = corners[cIdx];
    if (!c) return;
    c.dist += speed * dt;
    var targetCurve = c.dist < 900 ? c.dir * Math.min(1, c.dist / 900) : c.dir;
    curveNow += (targetCurve - curveNow) * Math.min(1, dt * 3);
    if (c.dist > 500 && !c.telegraphed) { c.telegraphed = true; warnT = 0.7; }
    carX += steer * 460 * dt;
    carX = Math.max(CX - 320, Math.min(CX + 320, carX));
    var offBounds = Math.abs(carX - (CX - curveNow * 240)) > 230;
    if (c.dist > 1100 && !c.resolved) {
      c.resolved = true;
      if (offBounds) {
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(carX, CAR_Y, { text: 'HIT' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else {
        cleared++;
        hitStop = 0.08;
        game.feedback.good(carX, CAR_Y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.3);
        if (cleared === Math.ceil(TOTAL / 2) && !milestoneDone) {
          milestoneDone = true;
          game.fx.popup('HALFWAY!', W / 2, H * 0.42, { color: C.gold, size: 38 });
          game.audio.play('se_milestone', 0.35);
        }
        if (cleared >= TOTAL) { ok = true; finished = true; finish(); }
        else { cIdx++; curveNow = 0; }
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; }
    if (!finished) {
      var c = corners[cIdx];
      if (c && c.telegraphed && !c.resolved) {
        steer = c.dir * -0.9;
        demo.gx = carX + steer * 200;
        demo.press = true;
      } else {
        steer *= 0.9;
        demo.press = false;
      }
      updateGame(dt);
    }
    demo.gy = H * 0.9 + Math.sin(game.time.elapsed * 3) * 14;
    if (!demo.press) demo.gx = carX + Math.cos(game.time.elapsed * 2) * 20;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRoad(curveNow, scroll);
      drawCar();
      drawWarn();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawRoad(curveNow, scroll); drawCar();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + 'コーナー!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      updateGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (warnT > 0) warnT -= dt;
    if (brakeFlash > 0) brakeFlash -= dt;

    bg(); drawRoad(curveNow, scroll); drawCar(); drawWarn();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  function drawWarn() {
    var c = corners[cIdx];
    if (!c || !c.telegraphed || c.resolved) return;
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.text(c.dir < 0 ? '◄' : '►', CX + c.dir * 260, H * 0.42, { size: 70, color: blink ? C.bad : C.gold, align: 'center', bold: true });
  }

  function drawCar() {
    var bob = Math.sin(game.time.elapsed * 6) * 4;
    var lean = steer * 14;
    game.draw.circle(carX, CAR_Y + 40, 60, '#00000030');
    game.draw.sprite(CAR, { '#': C.car }, carX + lean, CAR_Y + bob, 20, { anchor: 'center' });
    if (brakeFlash > 0) game.draw.rect(carX - 46, CAR_Y + 44, 92, 14, C.bad, brakeFlash * 2);
  }

  game.onStart(function() {
    game.audio.melody([['E3', 0.25], ['G3', 0.25], ['B3', 0.25], ['E4', 0.35]], { tempo: 170, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
