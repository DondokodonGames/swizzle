// D-20132016-0021-relic-gear-assembly.js
// レリックギア — 分解された機巧箱の歯車を、指でドラッグして正しい大きさ順の受け座へ並べ組み上げる
// 操作: 散らばった歯車を指でつまみ、下の受け座に大きい順(左から)へドラッグして並べる
// 終わり: 全ての歯車を正しい順で並べ終えれば成功。制限時間切れなら失敗
// @mechanic: drag_sort
// @theme: relic_gear_mechanism
// 世界観: 沈没船から引き上げられた機巧箱。バラバラになった歯車を大きさ順に受け座へ並べ直し、封じられた仕掛けを組み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 並べ終えた歯車数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き
  var C = {
    bg1: '#241d18', bg2: '#0e0a08', metal: '#8a7a5a', metalDark: '#4a3f2c',
    socket: '#332a20', socketLit: '#c9a24a',
    good: '#8fd48a', bad: '#e05a4a', gold: '#e0c060', white: '#e8ddc8', ink: '#0a0806',
  };

  var GAME_TITLE = 'RELIC GEAR';
  var N = 5; // 歯車数
  var MAX_TIME = 20;
  var SOCK_Y = H * 0.80;
  var GEAR_SIZES = []; // 5..9 相当の相対サイズ(降順が正解)
  for (var s = 0; s < N; s++) GEAR_SIZES.push(N - s); // [5,4,3,2,1]

  var GEAR_SPR = ['..#..', '.###.', '#####', '.###.', '..#..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var gears, sockets, placed, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, dragging, dragIdx, dragX, dragY, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 40; i++) {
      var nx = (i * 233) % W, ny = (i * 97) % (H * 0.6);
      game.draw.rect(nx, ny, 2, 2, '#ffffff', 0.04);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function sockX(i) { return W * (0.16 + i * (0.68 / (N - 1))); }

  function shuffledOrder() {
    var arr = [];
    for (var i = 0; i < N; i++) arr.push(i);
    for (var j = arr.length - 1; j > 0; j--) { var k = Math.floor(game.random(0, j + 1)); var t = arr[j]; arr[j] = arr[k]; arr[k] = t; }
    return arr;
  }

  function initGame() {
    var order = shuffledOrder();
    gears = [];
    for (var i = 0; i < N; i++) {
      var col = i % 2 === 0 ? W * 0.24 : W * 0.76;
      var row = Math.floor(i / 2);
      gears.push({ size: GEAR_SIZES[order[i]], x: col, y: H * 0.30 + row * H * 0.14, placedAt: -1, bx: game.random(0, 1) - 0.5, by: game.random(0, 1) - 0.5 });
    }
    sockets = [];
    for (var s2 = 0; s2 < N; s2++) sockets.push({ size: GEAR_SIZES[s2], filled: -1 });
    placed = 0; timeLeft = MAX_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; dragging = false; dragIdx = -1; milestoneShown = false;
  }

  function gearR(g) { return 24 + g.size * 12; }

  function drawGear(g, x, y) {
    var spin = (game.time.elapsed * 40 * (g.size % 2 === 0 ? 1 : -1)) % 360;
    game.draw.circle(x, y, gearR(g), C.metalDark);
    game.draw.circle(x, y, gearR(g) - 8, C.metal);
    game.draw.sprite(GEAR_SPR, { '#': C.metalDark }, x + Math.sin(spin * Math.PI / 180) * 2, y, Math.max(4, g.size + 2), { anchor: 'center' });
  }

  function drawSockets() {
    for (var i = 0; i < N; i++) {
      var x = sockX(i);
      var lit = sockets[i].filled >= 0;
      game.draw.circle(x, SOCK_Y, gearR({ size: sockets[i].size }) + 6, lit ? C.socketLit : C.socket);
      if (!lit) {
        var pulseA = 0.5 + 0.5 * Math.sin(game.time.elapsed * 3 + i);
        game.draw.circle(x, SOCK_Y, gearR({ size: sockets[i].size }) - 6, C.socket, pulseA * 0.4);
      }
    }
  }

  function gearAt(x, y) {
    for (var i = 0; i < gears.length; i++) {
      var g = gears[i];
      if (g.placedAt >= 0) continue;
      if (game.hit.circle(x, y, 1, g.x, g.y, gearR(g))) return i;
    }
    return -1;
  }

  function nearestSocket(x) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < N; i++) { var d = Math.abs(x - sockX(i)); if (d < bd) { bd = d; best = i; } }
    return best;
  }

  function tryPlace(idx, x, y) {
    var g = gears[idx];
    var si = nearestSocket(x);
    if (sockets[si].filled >= 0 || sockets[si].size !== g.size) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      shake = 0.12;
      return;
    }
    sockets[si].filled = idx;
    g.placedAt = si; g.x = sockX(si); g.y = SOCK_Y;
    placed++;
    hitStop = 0.1;
    game.feedback.good(x, y, { text: 'GOOD', color: C.good });
    game.fx.burst(sockX(si), SOCK_Y, { color: C.gold, count: 14, speed: 280 });
    game.audio.play('se_good', 0.4);
    if (placed === Math.ceil(N / 2) && !milestoneShown) { milestoneShown = true; game.fx.popup(placed + ' / ' + N, W * 0.5, H * 0.18, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
    if (placed >= N) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    var i = gearAt(x, y);
    if (i >= 0) { dragging = true; dragIdx = i; dragX = x; dragY = y; game.audio.play('se_tap', 0.06); }
  });
  game.onMove(function(x, y) { if (dragging) { dragX = x; dragY = y; gears[dragIdx].x = x; gears[dragIdx].y = y; } });
  game.onRelease(function(x, y) {
    if (!dragging) return;
    dragging = false;
    tryPlace(dragIdx, x, y);
    var g = gears[dragIdx];
    if (g.placedAt < 0) { /* 戻す */ }
    dragIdx = -1;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, idx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.idx = -1; }
    var phase = cyc % 1.3;
    if (demo.idx < 0) {
      for (var i = 0; i < gears.length; i++) if (gears[i].placedAt < 0) { demo.idx = i; break; }
    }
    if (demo.idx < 0) return;
    var g = gears[demo.idx];
    var si = -1;
    for (var s3 = 0; s3 < N; s3++) if (sockets[s3].filled < 0 && sockets[s3].size === g.size) { si = s3; break; }
    if (si < 0) { demo.idx = -1; return; }
    var tx = sockX(si), ty = SOCK_Y;
    if (phase < 0.5) { demo.press = false; demo.gx = g.x; demo.gy = g.y; }
    else if (phase < 1.1) {
      var t = (phase - 0.5) / 0.6;
      demo.press = true;
      demo.gx = g.x + (tx - g.x) * t; demo.gy = g.y + (ty - g.y) * t;
      g.x = demo.gx; g.y = demo.gy;
    } else if (!g.placedAt || g.placedAt < 0) {
      tryPlace(demo.idx, tx, ty);
      demo.idx = -1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gears === undefined) initGame();
      bg();
      stepDemo(dt);
      drawSockets();
      for (var i0 = 0; i0 < gears.length; i0++) drawGear(gears[i0], gears[i0].x, gears[i0].y);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawSockets();
      for (var i1 = 0; i1 < gears.length; i1++) drawGear(gears[i1], gears[i1].x, gears[i1].y);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(placed + ' / ' + N, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + (N - placed) + '個!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: N });
        else game.end.failure({ placed: placed, total: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; ok = false; finished = true; hitStop = 0.3; game.feedback.bad(W * 0.5, SOCK_Y, { text: 'MISS' }); shake = 0.25; finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSockets();
    for (var i2 = 0; i2 < gears.length; i2++) drawGear(gears[i2], gears[i2].x, gears[i2].y);

    txt(placed + ' / ' + N, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, H * 0.90, W - 120, 16, '#00000040');
    game.draw.rect(60, H * 0.90, (W - 120) * (timeLeft / MAX_TIME), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['A3', 0.4], ['D4', 0.4], ['F4', 0.8]], { tempo: 100, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
