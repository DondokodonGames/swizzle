// J-N6434-0002-thaw-lake-courier.js
// 雪解け湖の配達 — 割れ始めた氷盤を1段ずつ跳び渡り、足元が沈む前に対岸の小屋まで郵便袋を届ける
// 操作: 画面の左/中/右をタップすると、その列の1段先の氷盤へ跳ぶ。ひびの入った氷盤や水面へ跳ぶと落ちる
// 終わり: 対岸(12段目)に着けばCLEAR。水に落ちる/足元の氷が沈む/時間切れでGAME OVER
// @mechanic: camera_climb
// @theme: thaw_lake_floe_courier
// 世界観: 春先の凍った湖で郵便配達人が、ひび割れて流れ出した氷盤を1枚ずつ跳び移り、対岸の灯台小屋へ郵便袋を届けきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った段数と拾った小包の数
// スタイル: 90s HANDHELD COLOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 低彩度・少色、小画面前提の太い形、密度を抑える
  var HC = {
    water1: '#2e5a78', water2: '#1e3f58', ice: '#d8e8e0', ice2: '#a8c4c0', crack: '#48606a',
    shore: '#8ca070', shore2: '#687c50', coat: '#c85a48', bag: '#d8b060', skin: '#e8c8a0',
    ink: '#18242c', white: '#f0f4e8', red: '#d04838', gold: '#e8c050'
  };

  var GAME_TITLE = 'THAW COURIER';
  var TIME_LIMIT = 15;
  var ROWS = 12;
  var ROW_GAP = 250;
  var COL_X = [W * 0.2, W * 0.5, W * 0.8];
  var FLOE_W = 250, FLOE_H = 110;
  var BASE_Y = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var COURIER = [
    [
      '..kkk...',
      '..sss...',
      '.ccccb..',
      'c.cccbb.',
      '..cccbb.',
      '..k.k...',
      '.k...k..',
      '........'
    ],
    [
      '..kkk...',
      '..sss...',
      'c.ccccb.',
      '.ccccbb.',
      '..cccbb.',
      '.k...k..',
      'k.....k.',
      '........'
    ]
  ];
  var PARCEL = ['bbbbbb', 'bkbbkb', 'kkkkkk', 'bkbbkb', 'bbbbbb'];
  var HUT = ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwwwww.', '.wwddww.', '.wwddww.', '.wwddww.'];
  var DUCK = ['.hh.', 'hhhb', '.hhh'];

  var rows, cur, col, hop, standT, camY, timeLeft, ready, hitStop, endWait, done, ok, why, parcels, sinkFlash, warned;

  function makeRows() {
    rows = [];
    for (var r = 0; r <= ROWS; r++) {
      if (r === 0 || r === ROWS) { rows.push({ floes: [1, 1, 1], cracked: [0, 0, 0], parcel: -1, shore: true }); continue; }
      var floes = [0, 0, 0], cracked = [0, 0, 0];
      var safe = Math.floor(game.random(0, 3));
      floes[safe] = 1;
      for (var c = 0; c < 3; c++) {
        if (c === safe) continue;
        var roll = Math.random();
        if (roll < 0.35) { floes[c] = 1; cracked[c] = r > 2 ? 1 : 0; }
        else if (roll < 0.6) floes[c] = 1;
      }
      var parcel = Math.random() < 0.3 ? safe : -1;
      rows.push({ floes: floes, cracked: cracked, parcel: parcel, shore: false, drift: game.random(0, 6.28) });
    }
  }

  function crackLimit() { return Math.max(1.1, 2.0 - cur * 0.07); }

  function initGame() {
    makeRows();
    cur = 0; col = 1; hop = null; standT = 0; camY = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    parcels = 0; sinkFlash = 0; warned = false;
  }

  function rowY(r) { return BASE_Y - (r * ROW_GAP - camY); }
  function floeX(r, c) { var row = rows[r]; return COL_X[c] + (row && !row.shore ? Math.sin(game.time.elapsed * 1.2 + row.drift) * 14 : 0); }

  // 跳躍の開始。着地時の結果は landHop が返す
  function startHop(c) {
    hop = { from: col, to: c, t: 0, dur: 0.22 };
  }
  function landHop() {
    col = hop.to; cur++; hop = null; standT = 0; warned = false;
    var row = rows[cur];
    if (!row.floes[col]) return 'water';
    if (row.cracked[col]) return 'cracked';
    if (row.parcel === col) { row.parcel = -1; parcels++; return 'parcel'; }
    if (cur >= ROWS) return 'shore';
    return 'ok';
  }

  function stepWorld(dt) {
    var target = cur * ROW_GAP;
    camY += (target - camY) * Math.min(1, dt * 7);
    if (sinkFlash > 0) sinkFlash -= dt;
    if (hop) {
      hop.t += dt;
      if (hop.t >= hop.dur) return landHop();
      return null;
    }
    if (cur > 0 && cur < ROWS) {
      standT += dt;
      if (!warned && standT > crackLimit() * 0.55) { warned = true; return 'warn'; }
      if (standT >= crackLimit()) return 'sink';
    }
    return null;
  }

  function playerPos() {
    if (hop) {
      var k = hop.t / hop.dur;
      var x = floeX(cur, hop.from) + (floeX(cur + 1, hop.to) - floeX(cur, hop.from)) * k;
      var y = rowY(cur) + (rowY(cur + 1) - rowY(cur)) * k - Math.sin(k * Math.PI) * 90;
      return { x: x, y: y };
    }
    return { x: floeX(cur, col), y: rowY(cur) };
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: HC.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || HC.white, bold: true, align: 'center' });
  }

  function drawLake() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, HC.water1], [1, HC.water2]]);
    for (var i = 0; i < 14; i++) {
      var wy = ((i * 150 + camY * 0.5 + t * 20) % (H + 100)) - 50;
      game.draw.rect(((i * 311) % W) - 60 + Math.sin(t + i) * 30, wy, 120, 6, HC.ice2, 0.25);
    }
    // 水鳥(常時漂う)
    for (var d = 0; d < 2; d++) {
      var dx = ((t * 35 + d * 520) % (W + 120)) - 60;
      game.draw.sprite(DUCK, { h: HC.white, b: HC.gold }, dx, H * 0.4 + d * 300 + Math.sin(t * 2 + d) * 8, 8, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, HC.white, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawFloe(x, y, cracked, danger, flash) {
    var col_ = flash ? HC.white : HC.ice;
    game.draw.rect(x - FLOE_W / 2 + 20, y - FLOE_H / 2, FLOE_W - 40, FLOE_H, col_);
    game.draw.rect(x - FLOE_W / 2, y - FLOE_H / 2 + 20, FLOE_W, FLOE_H - 40, col_);
    game.draw.rect(x - FLOE_W / 2 + 20, y + FLOE_H / 2 - 14, FLOE_W - 40, 14, HC.ice2);
    if (cracked || danger > 0) {
      var blink = cracked && Math.floor(game.time.elapsed * 6) % 2 === 0;
      var cc = blink ? HC.red : HC.crack;
      game.draw.line(x - 80, y - 30, x - 10, y + 10, cc, 8);
      game.draw.line(x - 10, y + 10, x + 40, y - 20, cc, 8);
      game.draw.line(x + 40, y - 20, x + 90, y + 30, cc, 8);
      if (danger > 0.8) game.draw.line(x - 40, y + 40, x + 10, y - 40, HC.red, 8);
    }
  }

  function drawRows() {
    for (var r = Math.max(0, cur - 2); r <= Math.min(ROWS, cur + 6); r++) {
      var y = rowY(r);
      if (y < -200 || y > H + 200) continue;
      var row = rows[r];
      if (row.shore) {
        game.draw.rect(0, y - 90, W, 180, HC.shore);
        game.draw.rect(0, y + 70, W, 20, HC.shore2);
        if (r === ROWS) game.draw.sprite(HUT, { r: HC.red, w: HC.white, d: HC.ink }, W * 0.5, y - 150, 18, { anchor: 'center' });
        continue;
      }
      for (var c = 0; c < 3; c++) {
        if (!row.floes[c]) continue;
        var standing = r === cur && c === col && !hop;
        var danger = standing ? standT / crackLimit() : 0;
        var sinkY = standing && danger > 0.55 ? Math.sin(game.time.elapsed * 30) * 4 : 0;
        drawFloe(floeX(r, c), y + sinkY, row.cracked[c], danger, sinkFlash > 0 && standing);
        if (row.parcel === c) game.draw.sprite(PARCEL, { b: HC.bag, k: HC.ink }, floeX(r, c), y - 20 + Math.sin(game.time.elapsed * 4) * 6, 10, { anchor: 'center' });
      }
    }
  }

  function drawCourier() {
    var p = playerPos();
    var fr = hop ? 1 : Math.floor(game.time.elapsed * 3) % 2 === 0 ? 0 : 1;
    game.draw.rect(p.x - 40, rowY(hop ? cur + (hop.t / hop.dur > 0.5 ? 1 : 0) : cur) + 30, 80, 12, HC.ink, 0.3);
    var pal = sinkFlash > 0 ? { k: HC.white, s: HC.white, c: HC.white, b: HC.white } : { k: HC.ink, s: HC.skin, c: HC.coat, b: HC.bag };
    game.draw.sprite(COURIER[fr], pal, p.x, p.y - 50 + (hop ? 0 : Math.sin(game.time.elapsed * 4) * 3), sinkFlash > 0 ? 20 : 15, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 210, HC.ink, 0.55);
    txt(cur + ' / ' + ROWS, W * 0.5, 70, 52);
    game.draw.sprite(PARCEL, { b: HC.bag, k: HC.ink }, W * 0.12, 70, 8, { anchor: 'center' });
    txt('x' + parcels, W * 0.22, 72, 40, HC.gold);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, W - 160, 20, HC.water2);
    game.draw.rect(80, 150, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 20, low ? HC.red : HC.gold);
    // 進捗(右端の縦バー)
    game.draw.rect(W - 40, H * 0.25, 16, H * 0.45, HC.water2);
    game.draw.rect(W - 40, H * 0.7 - H * 0.45 * (cur / ROWS), 16, H * 0.45 * (cur / ROWS), HC.gold);
  }

  // ── ATTRACT: 安全な氷盤を選んで跳ぶ(成功)→ 最後にひび割れ氷盤へ跳んで落ちる(失敗)を実ロジックで
  var demo = { t: 0, clock: 0, gx: W / 2, gy: H * 0.5, press: false, sunk: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.2;
    if (cyc < dt || demo.t <= dt) { makeRows(); cur = 0; col = 1; hop = null; standT = 0; camY = 0; parcels = 0; demo.sunk = 0; demo.clock = 0.5; }
    if (demo.sunk > 0) { demo.sunk -= dt; sinkFlash = 0.1; return; }
    var r = stepWorld(dt);
    if (r === 'water' || r === 'cracked') { demo.sunk = 5; game.fx.burst(playerPos().x, playerPos().y, { color: HC.white, count: 14 }); game.fx.popup('MISS', playerPos().x, playerPos().y - 140, { color: HC.red, size: 50 }); }
    if (r === 'parcel') game.fx.popup('NICE', playerPos().x, playerPos().y - 140, { color: HC.gold, size: 44 });
    demo.clock -= dt;
    demo.press = demo.clock < 0.1;
    if (demo.clock <= 0 && !hop && cur < ROWS) {
      var next = rows[cur + 1], pick = -1;
      var wantFail = cyc > 3.6;
      for (var c = 0; c < 3; c++) {
        if (wantFail && next.floes[c] && next.cracked[c]) pick = c;
        if (!wantFail && next.floes[c] && !next.cracked[c] && pick < 0) pick = c;
      }
      if (pick < 0) for (var c2 = 0; c2 < 3; c2++) if (!next.floes[c2]) pick = c2;
      if (pick < 0) pick = 0;
      startHop(pick);
      demo.gx = COL_X[pick]; demo.gy = rowY(cur + 1);
      demo.clock = 0.55;
    }
  }

  function fall(reason) {
    why = reason; ok = false; hitStop = 0.5; sinkFlash = 0.5;
    game.fx.flash(HC.white, 0.15);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0 || hop || cur >= ROWS) { game.fx.burst(x, y, { color: HC.ice2, count: 2, speed: 60 }); return; }
    var c = x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2);
    startHop(c);
    game.audio.play('se_jump', 0.3);
    game.fx.burst(floeX(cur, col), rowY(cur), { color: HC.ice, count: 5, speed: 140 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (rows === undefined) initGame();
      stepDemo(dt);
      drawLake(); drawRows(); drawCourier();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 72, HC.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.1, 34);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, HC.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 40);
      return;
    }

    if (state === S.RESULT) {
      drawLake(); drawRows(); drawCourier();
      var score = cur * 50 + parcels * 80 + (ok ? Math.ceil(timeLeft) * 10 : 0);
      game.draw.rect(0, H * 0.28, W, H * 0.3, HC.ink, 0.7);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.33, 96, ok ? HC.gold : HC.red);
      txt(cur + ' / ' + ROWS, W / 2, H * 0.39, 52);
      txt('SCORE ' + score, W / 2, H * 0.44, 40, HC.ice);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.49, 44, HC.gold);
      else if (!ok) txt('あと' + (ROWS - cur) + '段!', W / 2, H * 0.49, 44);
      txt('BEST ' + game.best, W / 2, H * 0.53, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { rows: cur, parcels: parcels };
        if (ok) game.end.success(cur * 50 + parcels * 80 + Math.ceil(timeLeft) * 10, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        var pp = playerPos();
        if (ok) { game.feedback.good(pp.x, pp.y - 100, { text: 'CLEAR', color: HC.gold, count: 26 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(pp.x, pp.y, { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      var r = stepWorld(dt);
      var p = playerPos();
      if (r === 'ok') {
        game.audio.play('se_tap', 0.25);
        game.fx.burst(p.x, p.y, { color: HC.ice, count: 6 });
        if (cur === Math.floor(ROWS / 2)) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと' + (ROWS - cur) + '段!', p.x, p.y - 180, { color: HC.gold, size: 48 }); }
      } else if (r === 'parcel') {
        game.feedback.good(p.x, p.y - 80, { text: 'NICE', color: HC.gold, sound: 'se_coin' });
      } else if (r === 'shore') {
        ok = true; why = 'clear'; hitStop = 0.45; sinkFlash = 0.3;
      } else if (r === 'water' || r === 'cracked') {
        fall(r);
      } else if (r === 'warn') {
        game.audio.tone('B3', 0.18, { wave: 'square', volume: 0.05, slide: -20 });
      } else if (r === 'sink') {
        fall('sink');
      } else if (timeLeft <= 0) {
        timeLeft = 0; fall('time');
      }
    }

    drawLake(); drawRows(); drawCourier(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, HC.gold);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E5', 0.5], ['D5', 0.5], ['B4', 1], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 2]],
      { tempo: 124, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 2], ['G2', 2], ['D2', 2], ['E2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
