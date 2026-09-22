// K-DS-0030-driver-tighten-cue.js
// スクリュー・タクト — レールを流れる部品を、ゲージの針が緑ゾーンに来た瞬間にドライバーで締める
// 操作: 部品ごとに円形ゲージの光点が回る。光点が緑ゾーンにある間にタップして締める
// 終わり: 規定個数(6個)全てを正しいタイミングで締めれば成功。1回でもタイミングを外せば失敗
// @mechanic: timing_one_shot
// @theme: assembly_line_torque
// 世界観: 小さな組立工場のライン。流れてくる部品のネジを、円形ゲージの光点が最良点に来た瞬間だけドライバーで締める係
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく締めた個数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI
  var C = {
    bg: '#08140c', bg2: '#04100a', grid: '#0e2a1a', line: '#2ecf7a',
    part: '#c9d2c4', partEdge: '#6a7a6e', gauge: '#123a24', gaugeEdge: '#2ecf7a',
    zone: '#ffd400', needle: '#ffffff',
    good: '#39ff6a', bad: '#ff4d5e', gold: '#ffe066', white: '#eafff0', ink: '#03140a',
  };

  var GAME_TITLE = 'TORQUE CUE';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.46, R = 210;
  var ZONE_A = -0.5, ZONE_B = 0.3; // ラジアン範囲(緑ゾーン、上基準からの角度オフセット)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var done, endWait, finished, ready, hitStop, shake;
  var hits, round, ang, angSpeed, resolved, sparkT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PART_SPRITE = ['.####.', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 12; i++) game.draw.line(0, i * (H / 12), W, i * (H / 12), C.grid, 1);
    for (var j = 0; j < 8; j++) game.draw.line(j * (W / 8), 0, j * (W / 8), H, C.grid, 1);
  }

  function initRound(speedMul) {
    ang = -Math.PI / 2 - 1.6; angSpeed = 2.1 * speedMul;
    resolved = false;
  }

  function initGame() {
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    hits = 0; round = 0; sparkT = 0;
    initRound(1);
  }

  function inZone(a) {
    var rel = ((a + Math.PI / 2 + Math.PI) % (Math.PI * 2)) - Math.PI; // -pi/2 基準に正規化
    return rel >= ZONE_A && rel <= ZONE_B;
  }

  function tryTighten() {
    if (resolved || ready > 0 || done || finished) return;
    if (inZone(ang)) {
      resolved = true; hits++;
      sparkT = 0.25; hitStop = 0.08;
      game.feedback.good(CX, CY, { text: 'GOOD', color: C.gold });
      game.fx.burst(CX, CY, { color: C.line, count: 16, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - 260, { color: C.gold, size: 38 });
      round++;
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      initRound(1 + round * 0.08);
    } else {
      resolved = true;
      hitStop = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); tryTighten(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepRound(dt) {
    if (resolved) return;
    ang += angSpeed * dt;
    if (ang > Math.PI * 1.5) {
      // 一周してゾーンを逃した -> 失敗
      resolved = true;
      hitStop = 0.3;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawGauge() {
    game.draw.circle(CX, CY, R + 18, C.gaugeEdge, 0.25);
    game.draw.circle(CX, CY, R, C.gauge, 0.9);
    // 緑ゾーンの弧(短い線分の連なりで近似)
    var steps = 16;
    for (var i = 0; i <= steps; i++) {
      var a = -Math.PI / 2 + ZONE_A + (ZONE_B - ZONE_A) * (i / steps);
      var x1 = CX + Math.cos(a) * (R - 26), y1 = CY + Math.sin(a) * (R - 26);
      var x2 = CX + Math.cos(a) * (R + 4), y2 = CY + Math.sin(a) * (R + 4);
      game.draw.line(x1, y1, x2, y2, C.zone, 6);
    }
    game.draw.sprite(PART_SPRITE, { '#': C.part }, CX, CY, 20, { anchor: 'center' });
    if (!resolved) {
      var nx = CX + Math.cos(ang) * (R - 6), ny = CY + Math.sin(ang) * (R - 6);
      game.draw.line(CX, CY, nx, ny, C.needle, 6);
      game.draw.circle(nx, ny, 12, C.needle);
    }
    if (sparkT > 0) game.draw.circle(CX, CY, R * 0.7, C.gold, sparkT);
  }

  var demo = { t: 0, gx: CX, gy: CY - R + 30, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.9;
    if (cyc < dt || demo.t <= dt) { hits = 0; round = 0; initRound(1); }
    if (!resolved) {
      ang += angSpeed * dt * 0.8;
      var nx = CX + Math.cos(ang) * (R - 6), ny = CY + Math.sin(ang) * (R - 6);
      demo.gx = nx; demo.gy = ny;
      if (inZone(ang)) {
        resolved = true; hits++; sparkT = 0.25; demo.press = true;
        game.feedback.good(CX, CY, { text: 'GOOD', color: C.gold });
        game.audio.play('se_good', 0.22);
      } else if (ang > Math.PI * 1.5) { resolved = true; }
    } else {
      demo.press = false;
      if (cyc > 2.3) { round++; initRound(1); }
    }
  }

  game.onUpdate(function(dt) {
    if (sparkT > 0) sparkT -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGauge();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.10, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + TOTAL : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGauge();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.15, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '個!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGauge();

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.5], ['C3', 0.5], ['G3', 0.5], ['C4', 0.5]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
