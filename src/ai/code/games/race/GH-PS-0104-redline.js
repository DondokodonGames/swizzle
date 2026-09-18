// GH-PS-0104-redline.js
// レッドライン — 400m。回転計の緑帯でギアを上げる。早いと失速、遅いとオーバーレブ
// 操作: 合図でタップして発進、以後は回転計が緑帯に入った瞬間にタップしてシフトアップ(4回)
// 終わり: 400mを走り切るとタイムが残る。発進+4回のシフトそれぞれの判定(PERFECT/GOOD/MISS)も残る
// @mechanic: timing_one_shot
// @theme: night_strip
// 世界観: 深夜の直線。回転計の針だけを見る。緑帯を過ぎれば針が赤に張り付いて伸びない
// 残るもの: タイム(秒)と5回の判定。SCORE は速いほど高い(15.00s からの差)
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケールで、接地影で位置を示す
  var C = {
    sky1: '#070a1c', sky2: '#152046', road: '#2b2f3a', road2: '#1d2029', lane: '#f2f2f2',
    edge: '#ff8a1f', car: '#e63946', car2: '#8b1c25', win: '#9ad7ff', shadow: '#000000',
    green: '#4dff7a', red: '#ff3b3b', gold: '#ffd400', white: '#ffffff', ink: '#05060c', bad: '#ff3d5e',
  };

  var GAME_TITLE = 'REDLINE';
  var DIST = 400;
  var SHIFTS = 4;
  var BASE_TIME = 15.0;         // これより速いほど SCORE が高い

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var dist, speed, rpm, gear, time, launched, goT, judges, penalty, done, endWait;
  var ready, hitStop, shake, flashT, revLimit;

  var CAR = [
    '....RRRR....',
    '...RWWWWR...',
    '..RRWWWWRR..',
    '.RRRRRRRRRR.',
    'RRRRRRRRRRRR',
    'RRRRRRRRRRRR',
    '.KK.RRRR.KK.',
    '.KK......KK.',
  ];
  var CAR_COL = { R: C.car, W: C.win, K: '#111' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  var scroll = 0;
  function roadBg(dt) {
    game.draw.gradient(0, H, [[0, C.sky1], [0.36, C.sky2], [0.40, C.road2], [1, C.road]]);
    // 遠景の看板(ビルボード): 奥ほど小さく
    for (var b = 0; b < 4; b++) {
      var t = ((b / 4) + scroll * 0.2) % 1;
      var px = 4 + 18 * t;
      var yb = H * 0.38 + (H * 0.5) * t * t;
      var xb = b % 2 === 0 ? W * 0.10 - t * 200 : W * 0.90 + t * 200;
      game.draw.rect(xb - 10 * px / 2, yb - 8 * px, 10 * px, 6 * px, b % 2 === 0 ? C.edge : C.green, 0.85);
      game.draw.rect(xb - 1, yb - 2 * px, 3, 2 * px, C.lane);
    }
    // 路面の白線(奥に収束・流れる)
    for (var i = 0; i < 9; i++) {
      var s = ((i / 9) + scroll) % 1;
      var y = H * 0.40 + (H * 0.60) * s * s;
      var w = 8 + 40 * s;
      game.draw.rect(W / 2 - w / 2, y, w, 6 + 26 * s, C.lane, 0.9);
      game.draw.rect(W * 0.5 - (120 + 520 * s), y, 8 + 14 * s, 6 + 20 * s, C.edge, 0.9);
      game.draw.rect(W * 0.5 + (120 + 520 * s), y, 8 + 14 * s, 6 + 20 * s, C.edge, 0.9);
    }
  }

  function initGame() {
    dist = 0; speed = 0; rpm = 0.15; gear = 1; time = 0; launched = false; goT = 0;
    judges = []; penalty = 0; done = false; endWait = 0; revLimit = 0;
    ready = 0.8; hitStop = 0; shake = 0; flashT = 0; scroll = 0;
  }

  // 緑帯: rpm 0.78〜0.92。超えると赤(リミッター)で加速が鈍る
  var GREEN_LO = 0.78, GREEN_HI = 0.92;

  function judge(kind) {
    judges.push(kind);
    if (kind === 'PERFECT') { game.feedback.good(W / 2, H * 0.30, { text: 'PERFECT', color: C.gold }); game.fx.burst(W / 2, H * 0.30, { color: C.gold, count: 12, speed: 380 }); }
    else if (kind === 'GOOD') { game.feedback.good(W / 2, H * 0.30, { text: 'GOOD', color: C.green }); }
    else { game.feedback.bad(W / 2, H * 0.30, { text: 'MISS' }); shake = 0.25; }
  }

  function finish() {
    if (done) return;
    done = true;
    var t = time + penalty;
    finalScore = Math.max(0, Math.round((BASE_TIME - t) * 1000));
    game.audio.stopBgm();
    game.audio.play('se_success');
    endWait = 1.4;
  }

  function tap() {
    if (!launched) {
      if (goT <= 0) {
        // フライング: 1秒のペナルティ、発進はそのまま
        penalty += 1.0; judge('MISS'); flashT = 0.2;
      } else {
        var early = goT < 0.15 ? 'PERFECT' : goT < 0.4 ? 'GOOD' : 'MISS';
        judge(early);
        if (early === 'MISS') penalty += 0.4;
      }
      launched = true; speed = 40; rpm = 0.5;
      game.audio.play('se_jump', 0.6);
      return;
    }
    if (gear > SHIFTS) return;
    // シフトアップ: 針の位置で判定
    if (rpm >= GREEN_LO && rpm <= GREEN_HI) {
      var mid = (GREEN_LO + GREEN_HI) / 2;
      judge(Math.abs(rpm - mid) < 0.035 ? 'PERFECT' : 'GOOD');
      speed += 26;
    } else if (rpm < GREEN_LO) {
      judge('MISS'); speed -= 18; penalty += 0.3;   // 早い: 失速
    } else {
      judge('MISS'); penalty += 0.5;                // 遅い: 既にリミッターで伸びていない
    }
    gear++; rpm = 0.45;
    game.audio.play('se_break', 0.35);
    if (gear > SHIFTS) game.fx.popup(String(gear) + ' / ' + String(SHIFTS + 1), W / 2, H * 0.22, { color: C.gold, size: 60 });
  }

  function drawTach() {
    // 回転計(横バー)。緑帯と赤域。針の位置が全て
    var x = 90, y = H * 0.14, w = W - 180, h = 44;
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, C.ink);
    game.draw.rect(x, y, w, h, '#22252f');
    game.draw.rect(x + w * GREEN_LO, y, w * (GREEN_HI - GREEN_LO), h, C.green, 0.85);
    game.draw.rect(x + w * GREEN_HI, y, w * (1 - GREEN_HI), h, C.red, 0.85);
    var nx = x + w * Math.min(1, rpm);
    game.draw.rect(nx - 5, y - 16, 10, h + 32, revLimit > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0 ? C.red : C.white);
    txt(String(gear), x + w + 40, y + 22, 44, C.gold, 'left');
  }

  function drawCar() {
    // 自車は手前固定。速度で少し揺れる。接地影
    var jitter = launched ? (Math.random() * 2 - 1) * Math.min(6, speed * 0.04) : 0;
    var cx = W / 2 + jitter, cy = H * 0.86;
    game.draw.circle(cx, cy + 10, 150, C.shadow, 0.45);
    game.draw.sprite(CAR, CAR_COL, cx, cy, 22, { anchor: 'center' });
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0) return;
    tap();
  });

  // ── ATTRACT ゴースト実演: 針が緑帯に入った瞬間に手が落ちる。赤に入ると MISS ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.60, press: false, fired: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    rpm = 0.2 + cyc * 0.34;
    if (rpm > 1) rpm = 1;
    var inGreen = rpm >= GREEN_LO && rpm <= GREEN_HI;
    demo.press = inGreen;
    if (inGreen && !demo.fired) { demo.fired = true; game.feedback.good(W / 2, H * 0.30, { text: 'GOOD', color: C.green }); }
    if (cyc < 0.1) demo.fired = false;
    scroll = (scroll + dt * 0.6) % 1;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      roadBg(dt);
      stepDemo(dt);
      drawCar();
      drawTach();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.26, 84, C.edge);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.31, 40, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.66, 58, C.gold);
        txt('TAP TO START', W / 2, H * 0.71, 46, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.71, 40, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      roadBg(dt);
      drawCar();
      var t = time + penalty;
      txt('FINISH', W / 2, H * 0.24, 92, C.gold);
      txt(t.toFixed(2), W / 2, H * 0.34, 110, C.white);
      // 5回の判定を並べる(発進 + 4シフト)
      for (var j = 0; j < judges.length; j++) {
        var k = judges[j];
        var col = k === 'PERFECT' ? C.gold : k === 'GOOD' ? C.green : C.bad;
        game.draw.rect(W / 2 - 300 + j * 130, H * 0.44, 100, 100, col, 0.9);
        txt(k === 'MISS' ? 'MISS' : k === 'GOOD' ? 'GOOD' : 'PERFECT', W / 2 - 250 + j * 130, H * 0.52, 20, col);
      }
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.62, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.67, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.75, 54, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.75, 44, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.end.record(finalScore, { time: Math.round((time + penalty) * 100) / 100, judges: judges.join(','), label: (time + penalty).toFixed(2) + 's' });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); goT = 0.0001; }
    } else {
      if (!launched) {
        goT += dt;
        if (goT > 1.5) { launched = true; speed = 30; rpm = 0.5; judge('MISS'); penalty += 0.6; }   // 出遅れ
      } else {
        time += dt;
        // 回転が上がる。緑帯を超えるとリミッター(伸びない)
        var rise = gear <= SHIFTS ? 0.42 - gear * 0.03 : 0.2;
        rpm += rise * dt;
        if (rpm > 1) { rpm = 1; revLimit = 0.1; }
        if (revLimit > 0) revLimit -= dt;
        var accel = rpm >= 1 ? 4 : 18 + gear * 10;
        speed += accel * dt;
        dist += speed * dt * 0.28;
        scroll = (scroll + dt * speed * 0.004) % 1;
        if (dist >= DIST) finish();
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    roadBg(dt);
    drawCar();
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.red, 0.2);
    drawTach();

    // 距離バー(400m)
    var frac = Math.min(1, dist / DIST);
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, C.edge);
    txt('SCORE ' + String(Math.max(0, Math.round((BASE_TIME - time - penalty) * 1000))).padStart(6, '0'), W / 2, 102, 44, C.white);
    txt((time + penalty).toFixed(2), W / 2, H * 0.22, 64, C.white);
    // 残り距離
    var left = Math.max(0, Math.ceil(DIST - dist));
    if (left <= 100 && left > 0) txt('あと' + left + 'm', W / 2, H * 0.30, 46, C.gold);

    if (ready > 0) txt('READY?', W / 2, H * 0.50, 96, C.gold);
    else if (!launched && goT > 0 && goT < 0.6) txt('GO!', W / 2, H * 0.50, 110, C.green);

    scanlines();
  });

  game.onStart(function() {
    // 2000s: 速いシンセベース
    game.audio.melody(
      [['E4', 0.25], ['E4', 0.25], ['E5', 0.25], ['E4', 0.25], ['D4', 0.25], ['D4', 0.25], ['D5', 0.25], ['D4', 0.25]],
      { tempo: 150, wave: 'square', volume: 0.08, loop: true,
        bass: [['E2', 0.5], ['E2', 0.5], ['D2', 0.5], ['D2', 0.5]], bassWave: 'triangle', bassVolume: 0.1 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
