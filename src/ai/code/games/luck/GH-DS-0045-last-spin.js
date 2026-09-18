// GH-DS-0045-last-spin.js
// ラストスピン — 止まる前に賭ける。賭け直しは1回だけ
// 操作: タップで賭ける(1回目)。もう一度タップで賭け直す(2回目、最後)
// 終わり: 玉が止まった位置の配当が出る。当たり外れと配当が残る
// @mechanic: near_miss
// @theme: night_wheel
// 世界観: 深夜のカウンター。回るホイールに玉を投げ込み、自分の色の枠に止まれば勝ち。惜しい所で止まることが多い
// 残るもの: 配当(WIN/LOSE)+ 結果文字(stats.label)。当たった枠の色と外れた枠の色が画面に残る
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // SKEUOMORPH: 現実の質感を模す。金属の縁、艶、影
  var C = {
    felt1: '#0d3d2a', felt2: '#082a1c', rimOut: '#8a6a2a', rimIn: '#c9a33f',
    red: '#b8202a', black: '#141414', gold: '#ffd400', silver: '#d8d8d8',
    ball: '#f4f4f0', shadow: '#000000', good: '#4dff7a', bad: '#ff3d5e', white: '#ffffff', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'LAST SPIN';
  var SEGMENTS = 12;   // 交互に赤/黒。自分の色は赤
  var MY_COLOR = 0;    // 0=赤

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, resultLabel = '';

  var angle, spinSpeed, bets, ballAngle, ballPhase, landSeg, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.08); }

  var CX = W / 2, CY = H * 0.42, R = 300;

  // チップ(賭けの目印)
  var CHIP = ['.####.', '##..##', '#.##.#', '#.##.#', '##..##', '.####.'];
  var CHIP_PAL = { '#': C.gold };

  function feltBg() {
    game.draw.gradient(0, H, [[0, '#1a1a22'], [0.5, '#0e0e14'], [1, '#06060a']]);
    game.draw.circle(CX, CY, R + 90, C.rimOut);
    game.draw.circle(CX, CY, R + 70, C.rimIn);
    game.draw.circle(CX, CY, R + 60, C.felt2);
  }

  // ホイールをセグメントに分けて描く(円は扇形の重ね塗りで近似: 短い矩形を回転せず、極座標で点を打つ)
  function drawWheel() {
    for (var i = 0; i < SEGMENTS; i++) {
      var a0 = angle + (i / SEGMENTS) * Math.PI * 2;
      var a1 = angle + ((i + 1) / SEGMENTS) * Math.PI * 2;
      var col = i % 2 === MY_COLOR ? C.red : C.black;
      // 扇形を細い三角ストリップで近似
      var steps = 6;
      for (var s = 0; s < steps; s++) {
        var t0 = a0 + (a1 - a0) * (s / steps);
        var t1 = a0 + (a1 - a0) * ((s + 1) / steps);
        var x0 = CX + Math.cos(t0) * R, y0 = CY + Math.sin(t0) * R;
        var x1 = CX + Math.cos(t1) * R, y1 = CY + Math.sin(t1) * R;
        game.draw.line(CX, CY, (x0 + x1) / 2, (y0 + y1) / 2, col, R * (Math.PI * 2 / SEGMENTS) * 1.15);
      }
    }
    game.draw.circle(CX, CY, R, C.ink, 0);
    game.draw.circle(CX, CY, 60, C.rimIn);
    game.draw.circle(CX, CY, 40, C.rimOut);
    // 目印の縁
    for (var m = 0; m < SEGMENTS; m++) {
      var am = angle + (m / SEGMENTS) * Math.PI * 2;
      game.draw.line(CX + Math.cos(am) * (R - 60), CY + Math.sin(am) * (R - 60), CX + Math.cos(am) * R, CY + Math.sin(am) * R, C.silver, 3);
    }
  }

  function drawBall() {
    var r = ballPhase === 'in' ? R - 40 : R + 30;
    var x = CX + Math.cos(ballAngle) * r, y = CY + Math.sin(ballAngle) * r;
    game.draw.circle(x, y + 6, 14, C.shadow, 0.4);
    game.draw.circle(x, y, 16, C.ball);
    game.draw.circle(x - 5, y - 5, 6, '#ffffff', 0.9);
  }

  function drawPointer() {
    game.draw.line(CX, CY - R - 96, CX - 22, CY - R - 50, C.gold, 8);
    game.draw.line(CX, CY - R - 96, CX + 22, CY - R - 50, C.gold, 8);
  }

  function initGame() {
    angle = 0; spinSpeed = 5.2; bets = 0; ballAngle = -Math.PI / 2; ballPhase = 'out';
    landSeg = -1; done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0;
  }

  function currentSegUnderPointer() {
    // ポインタは真上(-PI/2)。角度からどのセグメントが今そこにあるか
    var rel = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
    return Math.floor(rel / (Math.PI * 2 / SEGMENTS)) % SEGMENTS;
  }

  function placeBet() {
    if (done || bets >= 2) return;
    bets++;
    game.audio.play('se_tap', 0.5);
    game.feedback.good(CX, CY - R - 130, { text: bets === 1 ? 'BET' : 'LAST BET', color: C.gold });
    if (bets >= 2 || spinSpeed < 0.6) settle();
  }

  function settle() {
    landSeg = currentSegUnderPointer();
    var win = landSeg % 2 === MY_COLOR;
    var near = false;
    // 惜しい判定: 隣のセグメントの境界に近い
    var rel = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
    var within = rel % (Math.PI * 2 / SEGMENTS);
    var segW = Math.PI * 2 / SEGMENTS;
    if (within < segW * 0.12 || within > segW * 0.88) near = true;

    done = true;
    finalScore = win ? 500 : 0;
    resultLabel = win ? (near ? 'ギリギリ WIN' : 'WIN') : (near ? '惜しい' : 'LOSE');
    game.audio.stopBgm();
    if (win) { game.audio.play('se_success'); game.feedback.good(CX, CY, { text: 'WIN', color: C.gold }); game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 460 }); }
    else { game.audio.play('se_failure'); game.feedback.bad(CX, CY, { text: 'LOSE' }); shake = 0.4; game.fx.flash(C.bad, 0.25); }
    hitStop = 0.3;
    endWait = 1.6;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (ready > 0 || hitStop > 0) return;
    placeBet();
  });

  // ── ATTRACT ゴースト実演: 1回目のタップの後、玉が惜しい所で外れる。回り直して2回目で当たる ──
  var demo = { t: 0, gx: CX, gy: H * 0.78, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    angle += 3.0 * dt;
    ballAngle -= 3.6 * dt;
    var cyc = demo.t % 4.0;
    demo.press = (cyc > 1.0 && cyc < 1.2) || (cyc > 3.0 && cyc < 3.2);
    if (cyc > 1.0 && cyc < 1.03) game.feedback.good(CX, CY - R - 130, { text: 'BET', color: C.gold });
    if (cyc > 3.0 && cyc < 3.03) { game.feedback.good(CX, CY, { text: 'WIN', color: C.gold }); game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 360 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      feltBg();
      stepDemo(dt);
      drawWheel();
      drawBall();
      drawPointer();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 80, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.14, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.red);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 38, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      feltBg();
      drawWheel();
      drawBall();
      drawPointer();
      txt(resultLabel, W / 2, H * 0.72, 72, finalScore > 0 ? C.gold : C.bad);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.80, 54, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.85, 40, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.91, 46, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.91, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: resultLabel, bets: bets, seg: landSeg }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      spinSpeed = Math.max(0, spinSpeed - dt * 0.55);
      angle += spinSpeed * dt;
      ballAngle -= (spinSpeed * 0.9 + 0.6) * dt;
      if (spinSpeed <= 0 && bets < 2) { placeBet(); if (!done) settle(); }
      else if (spinSpeed <= 0 && bets >= 2 && !done) settle();
    }
    if (shake > 0) shake -= dt;

    feltBg();
    drawWheel();
    drawBall();
    drawPointer();

    txt(bets === 0 ? 'BET' : bets === 1 ? 'LAST BET' : '', W / 2, H * 0.72, 54, C.gold);
    for (var chip = 0; chip < bets; chip++) game.draw.sprite(CHIP, CHIP_PAL, W / 2 - 40 + chip * 80, H * 0.78, 6, { anchor: 'center' });
    txt(bets + ' / 2', W * 0.14, 168, 44, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 90, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6], ['R', 0.3], ['A4', 0.3], ['F4', 0.3]],
      { tempo: 100, wave: 'triangle', volume: 0.07, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
