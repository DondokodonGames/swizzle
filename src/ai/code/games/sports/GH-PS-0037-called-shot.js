// GH-PS-0037-called-shot.js
// コールドショット — 狙った本数だけ倒す。10本倒すと失敗
// 操作: 振れる矢印が狙いに来た瞬間にタップして投げる
// 終わり: 3投。各投の「狙い」と「実際に倒した本数」が並んで残る。1投でも10本倒したら終わり
// @mechanic: trajectory
// @theme: polygon_lane
// 世界観: 角ばったレーン。的は10本のピン。求められるのは全部倒す力ではなく、言われた数だけ倒す精度
// 残るもの: 3投ぶんの「狙い vs 実際」。差が0なら PERFECT(300)、±1で GOOD(100)、それ以外 MISS。10本は GAME OVER
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s LOW POLY: 面ベタ塗り。輪郭は line、面は横1pxストリップ。頂点ジッター・フォグ
  var C = {
    fog: '#6f7f9a', sky: '#3b4a66', lane: '#b58a5a', lane2: '#8d6a44', gutter: '#4b4f5c',
    pin: '#e9e6dc', pin2: '#b9b3a4', pinBand: '#c62f3b', ball: '#2c5fd8', ball2: '#173a8a',
    gold: '#ffd400', good: '#4dff7a', bad: '#ff3d5e', white: '#ffffff', ink: '#101418',
  };

  var GAME_TITLE = 'CALLED SHOT';
  var THROWS = 3;
  var MAX_TIME = 18;
  var RACK_Y = H * 0.34;       // ピンの並ぶ奥
  var RELEASE_Y = H * 0.82;    // 投げる位置

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var throwNo, target, aim, aimDir, ball, pins, results, score, totalTime, done;
  var ready, hitStop, shake, waitNext;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  // 台形の面塗り(横1pxストリップ)。LOW POLY の面はこれで作る
  function trapezoid(xTopL, xTopR, yTop, xBotL, xBotR, yBot, color, alpha) {
    var rows = Math.max(1, Math.floor((yBot - yTop) / 4));
    for (var i = 0; i < rows; i++) {
      var t = i / rows;
      var y = yTop + (yBot - yTop) * t;
      var l = xTopL + (xBotL - xTopL) * t, r = xTopR + (xBotR - xTopR) * t;
      game.draw.rect(l, y, r - l, 5, color, alpha === undefined ? 1 : alpha);
    }
  }
  function jit() { return (Math.random() * 2 - 1) * 1.5; }

  function laneBg() {
    game.draw.gradient(0, H, [[0, C.sky], [0.30, C.fog], [0.33, C.gutter], [1, C.gutter]]);
    // レーン(奥へ収束する台形)。奥はフォグで薄く
    trapezoid(W * 0.36, W * 0.64, RACK_Y - 60, W * 0.08, W * 0.92, H, C.lane);
    trapezoid(W * 0.36, W * 0.64, RACK_Y - 60, W * 0.20, W * 0.80, H * 0.62, C.fog, 0.35);
    // 輪郭線(頂点ジッター)
    game.draw.line(W * 0.36 + jit(), RACK_Y - 60, W * 0.08, H, C.ink, 4);
    game.draw.line(W * 0.64 + jit(), RACK_Y - 60, W * 0.92, H, C.ink, 4);
    // 板目
    for (var i = 1; i < 6; i++) {
      var t = i / 6;
      game.draw.line(W * (0.36 + 0.28 * t), RACK_Y - 60, W * (0.08 + 0.84 * t), H, C.lane2, 2);
    }
  }

  function initGame() {
    throwNo = 0; results = []; score = 0; totalTime = 0; done = false; ball = null;
    ready = 0.8; hitStop = 0; shake = 0; waitNext = 0;
    newThrow();
  }

  function newThrow() {
    target = 2 + Math.floor(Math.random() * 7);   // 2〜8。10 は絶対に狙わせない
    aim = 0; aimDir = 1; ball = null;
    pins = [];
    for (var r = 0; r < 4; r++) for (var c = 0; c <= r; c++) pins.push({ r: r, c: c, up: true });
  }

  // ピンの画面位置(奥の三角形。ジッターは無し)
  function pinPos(p) {
    var x = W / 2 + (p.c - p.r / 2) * 54;
    var y = RACK_Y - p.r * 26;
    return { x: x, y: y };
  }

  function drawPin(p) {
    var q = pinPos(p);
    if (!p.up) { game.draw.rect(q.x - 18, q.y + 6, 36, 10, C.pin2, 0.8); return; }
    // 角ばったピン: 3つの台形 + 赤帯 + 輪郭
    trapezoid(q.x - 8, q.x + 8, q.y - 70, q.x - 18, q.x + 18, q.y - 30, C.pin);
    trapezoid(q.x - 18, q.x + 18, q.y - 30, q.x - 16, q.x + 16, q.y + 8, C.pin2);
    game.draw.rect(q.x - 17, q.y - 34, 34, 6, C.pinBand);
    game.draw.line(q.x - 8 + jit(), q.y - 70, q.x - 18, q.y - 30, C.ink, 2);
    game.draw.line(q.x + 8 + jit(), q.y - 70, q.x + 18, q.y - 30, C.ink, 2);
  }

  function drawTargetPins() {
    // 狙いの本数ぶんのピンを金で光らせる(先頭から)。これが「言われた数」
    for (var i = 0; i < pins.length; i++) {
      if (i < target) { var q = pinPos(pins[i]); game.draw.circle(q.x, q.y - 30, 30, C.gold, 0.35); }
    }
  }

  function knock(offset) {
    // 進入位置のずれ(0=中央)で倒れる本数が決まる。中央ほど多い。少しだけ揺れる
    var a = Math.abs(offset);
    var n = Math.round(10 * Math.max(0, 1 - a * 1.15) + (Math.random() * 1.2 - 0.6));
    n = Math.max(0, Math.min(10, n));
    // 倒れるピンを選ぶ(進入側から)
    var sorted = pins.slice().sort(function(p1, p2) {
      var d1 = Math.abs((p1.c - p1.r / 2) - offset * 2), d2 = Math.abs((p2.c - p2.r / 2) - offset * 2);
      return d1 - d2;
    });
    for (var i = 0; i < n; i++) sorted[i].up = false;
    return n;
  }

  function settle(n) {
    var diff = Math.abs(n - target);
    var kind = n === 10 ? 'STRIKE' : diff === 0 ? 'PERFECT' : diff === 1 ? 'GOOD' : 'MISS';
    results.push({ target: target, got: n, kind: kind });
    if (kind === 'STRIKE') {
      // 全部倒した = 言われた数を守れなかった
      hitStop = 0.4; shake = 0.5; game.fx.flash(C.bad, 0.3);
      game.feedback.bad(W / 2, RACK_Y, { text: 'MISS' });
      finish(false); return;
    }
    if (kind === 'PERFECT') { score += 300; game.feedback.good(W / 2, RACK_Y, { text: 'PERFECT', color: C.gold }); game.fx.burst(W / 2, RACK_Y, { color: C.gold, count: 16, speed: 420 }); }
    else if (kind === 'GOOD') { score += 100; game.feedback.good(W / 2, RACK_Y, { text: 'GOOD', color: C.good }); }
    else { game.feedback.bad(W / 2, RACK_Y, { text: 'MISS' }); shake = 0.25; }
    throwNo++;
    if (throwNo >= THROWS) {
      var goods = results.filter(function(r) { return r.kind !== 'MISS'; }).length;
      finish(goods >= 2);
    } else {
      waitNext = 1.1;
    }
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      var stats = { throws: results.map(function(r) { return r.target + ':' + r.got; }).join(',') };
      if (success) game.end.success(finalScore, stats); else game.end.failure(stats);
    }, 1600);
  }

  function release() {
    if (ball) return;
    ball = { t: 0, offset: aim, dur: 1.0 };
    game.audio.play('se_jump', 0.4);
  }

  function drawBall() {
    if (!ball) return;
    var t = Math.min(1, ball.t / ball.dur);
    var y = RELEASE_Y + (RACK_Y - RELEASE_Y) * t;
    var x = W / 2 + ball.offset * 240 * (1 - t) + ball.offset * 120 * t;   // 奥ほど中央に収束(レーン幅)
    var r = 48 - 30 * t;
    game.draw.circle(x, y + r * 0.6, r * 1.1, C.ink, 0.35);   // 接地影
    // 角ばった球: 上下2面
    game.draw.rect(x - r, y - r, r * 2, r, C.ball);
    game.draw.rect(x - r, y, r * 2, r, C.ball2);
    game.draw.line(x - r + jit(), y - r, x + r, y - r, C.ink, 2);
  }

  function drawAim() {
    if (ball) return;
    // 振れる矢印。狙いはこの位置で決まる
    var x = W / 2 + aim * 240;
    game.draw.line(W / 2, RELEASE_Y, x, RELEASE_Y - 260, C.white, 8);
    game.draw.circle(x, RELEASE_Y - 260, 22, C.white);
    game.draw.circle(W / 2, RELEASE_Y, 52, C.ball);
    game.draw.circle(W / 2, RELEASE_Y, 52, C.ink, 0.0);
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0 || hitStop > 0 || waitNext > 0) return;
    release();
  });

  // ── ATTRACT ゴースト実演: 矢印が端に来た時に投げると少なく倒れ、中央だと全部倒れる ──
  var demo = { t: 0, gx: W / 2, gy: RELEASE_Y + 120, press: false, fired: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    aim = Math.sin(demo.t * 2.4);
    if (ball) { ball.t += dt; if (ball.t >= ball.dur) { var n = knock(ball.offset); ball = null; var kind = n === 10 ? 'MISS' : Math.abs(n - target) <= 1 ? 'GOOD' : 'MISS'; if (kind === 'GOOD') game.feedback.good(W / 2, RACK_Y, { text: 'GOOD', color: C.good }); else game.feedback.bad(W / 2, RACK_Y, { text: 'MISS' }); } }
    if (cyc < 0.1 && !demo.fired) { demo.fired = true; }
    if (cyc > 1.0 && cyc < 1.05 && !ball) { for (var i = 0; i < pins.length; i++) pins[i].up = true; ball = { t: 0, offset: aim, dur: 1.0 }; }
    demo.press = cyc > 1.0 && cyc < 1.2;
    if (cyc > 3.0) demo.fired = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (throwNo === undefined) initGame();
      laneBg();
      stepDemo(dt);
      drawTargetPins();
      for (var i = 0; i < pins.length; i++) drawPin(pins[i]);
      drawAim();
      drawBall();
      txt(String(target), W / 2, RACK_Y - 200, 120, C.gold);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 84, C.white);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 40, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 58, C.gold);
        txt('TAP TO START', W / 2, H * 0.97, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 40, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      laneBg();
      for (var j = 0; j < pins.length; j++) drawPin(pins[j]);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.50, 92, resultSuccess ? C.gold : C.bad);
      // 残るもの: 各投の 狙い → 実際
      for (var k = 0; k < results.length; k++) {
        var rr = results[k], y = H * 0.58 + k * 90;
        var col = rr.kind === 'PERFECT' ? C.gold : rr.kind === 'GOOD' ? C.good : C.bad;
        txt(String(rr.target), W * 0.34, y, 60, C.white, 'right');
        game.draw.line(W * 0.40, y - 16, W * 0.58, y - 16, col, 6);
        txt(String(rr.got), W * 0.66, y, 60, col, 'left');
      }
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.86, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.91, 42, C.gold);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.96, 48, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else if (waitNext > 0) {
        waitNext -= dt;
        if (waitNext <= 0) newThrow();
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(results.filter(function(r) { return r.kind !== 'MISS'; }).length >= 2); return; }
        if (!ball) {
          aim += aimDir * dt * (1.6 + throwNo * 0.5);
          if (aim > 1) { aim = 1; aimDir = -1; } else if (aim < -1) { aim = -1; aimDir = 1; }
        } else {
          ball.t += dt;
          if (ball.t >= ball.dur) { var n = knock(ball.offset); ball = null; game.audio.play('se_break', 0.5); settle(n); }
        }
      }
      if (shake > 0) shake -= dt;
    }

    laneBg();
    drawTargetPins();
    for (var q = 0; q < pins.length; q++) drawPin(pins[q]);
    drawAim();
    drawBall();

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.good);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 102, 46, C.white);
    txt(throwNo + ' / ' + THROWS, W * 0.14, 168, 44, C.gold);
    // 狙いの数(大きく)
    txt(String(target), W / 2, RACK_Y - 200, 120, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 96, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['F4', 0.5], ['A4', 0.5], ['G4', 1]],
      { tempo: 112, wave: 'triangle', volume: 0.09, loop: true,
        bass: [['C2', 1], ['F2', 1], ['G2', 1], ['C2', 1]], bassWave: 'triangle', bassVolume: 0.08 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
