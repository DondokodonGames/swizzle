// I-DS-0002-porthole-wipe.js
// ポートホール・ワイプ — 潜水艇の丸窓にびっしり付いた藻を、指でこすり続けて時間内に払い落とす
// 操作: 窓ガラスの上を指で素早く往復させてこする。動かし続けるほど藻が落ちる。止まっている間は落ちない
// 終わり: 時間内に窓を全部きれいにできれば成功。酸素(残り時間)が尽きれば失敗
// @mechanic: rub
// @theme: submarine_porthole_algae
// 世界観: 深海を進む小さな潜水艇。丸窓びっしりに藻が付いて外が見えない。乗員がガラスをこすって、窓の奥で光る深海魚を見つけようとする
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 窓の清掃到達度%
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: くっきり太縁+ベタ塗り2〜3階調、彩度高め
  var C = {
    seaTop: '#1a5a8a', seaBot: '#052034', hull: '#3a4a5a', hullDark: '#22303c',
    glass: '#0a2a3a', algae: '#3a7a3a', algaeDark: '#245024',
    fish: '#ffb347', fishDark: '#c47a1a', good: '#5dffb0', bad: '#ff4d5e',
    gold: '#ffe14d', white: '#ffffff', ink: '#04141c',
  };

  var GAME_TITLE = 'PORTHOLE WIPE';
  var PX0 = W * 0.20, PX1 = W * 0.80, PY0 = H * 0.28, PY1 = H * 0.62;
  var COLS = 8, ROWS = 6;
  var CW = (PX1 - PX0) / COLS, CH = (PY1 - PY0) / ROWS;
  var RUB_RADIUS = 95, WEAR_RATE = 2.6, TIME_LIMIT = 11, CLEAR_GOAL = 97;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, failReason = 'GAME OVER';

  var cells, clearedPct, lastX, lastY, hasLast, timeLeft, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake, wiperDir, wiperFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_A = ['..###.', '######', '..###.'];
  var FISH_B = ['..###.', '.#####', '..###.'];
  var WIPER_A = ['#.', '#.', '##'];
  var WIPER_B = ['.#', '.#', '##'];

  function seaBg() {
    game.draw.gradient(0, H, [[0, C.seaTop], [1, C.seaBot]]);
    game.draw.rect(0, H * 0.10, W, H * 0.80, C.hull);
    game.draw.rect(0, H * 0.10, W, 14, C.hullDark);
    for (var i = 0; i < 5; i++) game.draw.circle(90 + i * 220, H * 0.14, 8, C.hullDark);
  }

  function cellClamp(cx, cy) {
    var dx = Math.abs(cx - (PX0 + PX1) / 2) / ((PX1 - PX0) / 2);
    var dy = Math.abs(cy - (PY0 + PY1) / 2) / ((PY1 - PY0) / 2);
    return Math.hypot(dx, dy) <= 1.08;
  }

  function initGame() {
    cells = [];
    for (var r = 0; r < ROWS; r++) {
      cells[r] = [];
      for (var c = 0; c < COLS; c++) {
        var cx = PX0 + (c + 0.5) * CW, cy = PY0 + (r + 0.5) * CH;
        cells[r][c] = { x: cx, y: cy, wear: cellClamp(cx, cy) ? 0 : 1 };
      }
    }
    clearedPct = 0; hasLast = false; timeLeft = TIME_LIMIT; milestoneShown = false;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    ok = false; failReason = 'GAME OVER'; wiperDir = 0; wiperFlash = 0;
  }

  function drawPorthole() {
    game.draw.circle((PX0 + PX1) / 2, (PY0 + PY1) / 2, (PX1 - PX0) / 2 + 26, C.hullDark);
    game.draw.circle((PX0 + PX1) / 2, (PY0 + PY1) / 2, (PX1 - PX0) / 2 + 10, C.hull);
    game.draw.rect(PX0, PY0, PX1 - PX0, PY1 - PY0, C.glass);
    var fb = Math.floor(game.time.elapsed * 3) % 2 === 0 ? FISH_A : FISH_B;
    game.draw.sprite(fb, { '#': C.fishDark }, (PX0 + PX1) / 2 + 2, (PY0 + PY1) / 2 + 2, 20, { anchor: 'center' });
    game.draw.sprite(fb, { '#': C.fish }, (PX0 + PX1) / 2, (PY0 + PY1) / 2, 20, { anchor: 'center' });
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = cells[r][c];
        if (cell.wear < 0.98) {
          game.draw.rect(cell.x - CW / 2, cell.y - CH / 2, CW - 2, CH - 2, C.algae, (1 - cell.wear) * 0.9);
          if (cell.wear < 0.4) game.draw.rect(cell.x - CW / 2, cell.y - CH / 2, CW - 2, CH - 2, C.algaeDark, (1 - cell.wear) * 0.4);
        }
      }
    }
  }

  function drawWiper(x, y, flash) {
    var f = wiperDir >= 0 ? WIPER_A : WIPER_B;
    game.draw.sprite(f, { '#': flash > 0 ? C.white : C.gold }, x, y, 16, { anchor: 'center' });
  }

  function applyRub(x, y, dist) {
    var gain = WEAR_RATE * Math.min(1, dist / 26) * (1 / 60);
    var sum = 0, cnt = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cell = cells[r][c];
        var d = Math.hypot(cell.x - x, cell.y - y);
        if (d < RUB_RADIUS) cell.wear = Math.min(1, cell.wear + gain * (1 - d / RUB_RADIUS));
        sum += cell.wear; cnt++;
      }
    }
    clearedPct = cnt > 0 ? (sum / cnt) * 100 : 0;
  }

  function onRubMove(x, y) {
    if (done || ready > 0 || finished) return;
    if (hasLast) {
      var dist = Math.hypot(x - lastX, y - lastY);
      wiperDir = x >= lastX ? 1 : -1;
      if (dist > 4) applyRub(x, y, dist);
    }
    lastX = x; lastY = y; hasLast = true;
    if (!milestoneShown && clearedPct >= 50) {
      milestoneShown = true;
      game.fx.popup('50 / ' + 100, x, y - 70, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.4);
    }
    if (clearedPct >= CLEAR_GOAL) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst((PX0 + PX1) / 2, (PY0 + PY1) / 2, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    hasLast = false;
    game.audio.play('se_tap', 0.06);
    game.fx.burst(x, y, { color: C.white, count: 4, speed: 90 });
    lastX = x; lastY = y; hasLast = true;
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.1) game.audio.play('se_tap', 0.02);
    onRubMove(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: (PX0 + PX1) / 2, gy: PY0 + 20, press: false, dir: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    demo.press = cyc < 3.6;
    if (demo.press) {
      var sweepY = PY0 + 20 + (cyc % 0.9) * ((PY1 - PY0 - 40) / 0.9) * 0 + Math.sin(cyc * 5) * 0;
      var rowT = Math.min(1, cyc / 3.4);
      var y = PY0 + 20 + rowT * (PY1 - PY0 - 40);
      var x = (PX0 + PX1) / 2 + Math.sin(cyc * 16) * ((PX1 - PX0) / 2 - 20);
      if (hasLast) { var dist = Math.hypot(x - lastX, y - lastY); if (dist > 4) applyRub(x, y, dist); }
      lastX = x; lastY = y; hasLast = true;
      demo.gx = x; demo.gy = y;
    } else {
      hasLast = false;
    }
    if (!milestoneShown && clearedPct >= 50) { milestoneShown = true; game.audio.play('se_milestone', 0.25); }
    if (clearedPct >= CLEAR_GOAL) {
      game.feedback.good(demo.gx, demo.gy, { text: 'CLEAR', color: C.good });
      demo.t = -1.0;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cells === undefined) initGame();
      seaBg();
      if (demo.t >= 0) stepDemo(dt); else demo.t += dt;
      drawPorthole();
      drawWiper(demo.gx, demo.gy, 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.145, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      seaBg();
      drawPorthole();
      txt(ok ? 'CLEAR' : failReason, W / 2, H * 0.10, 46, ok ? C.good : C.bad);
      var pctR = Math.round(clearedPct);
      txt(pctR + ' / ' + 100, W / 2, H * 0.145, 30, C.gold);
      if (!ok && pctR >= 70) txt('あと少し!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(clearedPct);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false; failReason = 'TIME UP'; hitStop = 0.2; shake = 0.15;
        game.feedback.bad((PX0 + PX1) / 2, (PY0 + PY1) / 2, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    if (wiperFlash > 0) wiperFlash -= dt;

    seaBg();
    drawPorthole();
    if (!finished && hasLast) drawWiper(lastX, lastY, wiperFlash);

    txt(Math.round(clearedPct) + ' / ' + 100, W / 2, H * 0.08, 32, C.white);
    game.draw.rect(60, H * 0.68, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, H * 0.68, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, timeLeft < 3 ? C.bad : C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 120, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
