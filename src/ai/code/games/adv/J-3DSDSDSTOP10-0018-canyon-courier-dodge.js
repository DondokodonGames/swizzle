// J-3DSDSDSTOP10-0018-canyon-courier-dodge.js
// 赤岩峡谷の届け人 — 上から転がり落ちてくる回転草と跳ねる岩を、押した指の方へ横歩きしてかわし、崖上の見張り小屋まで登り切る
// 操作: 画面を押すとその横位置へ届け人が歩く(押しながら動かせば追いかける)。斜面の上に土煙が立った所から転がってくる
// 終わり: 見張り小屋まで一度も当たらずに登り切ればCLEAR。回転草か岩に当たったらGAME OVER
// @mechanic: dodge
// @theme: red_canyon_courier
// 世界観: 砂嵐のあとの赤岩峡谷で、見習いの届け人が水筒の包みを背負って岩の坂を登り、上の崖から風にあおられて転がり落ちてくる回転草や跳ねる岩を横歩きでかわしながら崖上の見張り小屋を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った距離%・すれすれ回避(NICE)数
// スタイル: 90s LOW POLY

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面ベタ塗り(横ストリップ)、輪郭は line、頂点ジッターとフォグ
  var STYLE = {
    bg: ['#e7a86a', '#f1d9ae', '#b0834e'],
    main: ['#fbeed5', '#dcb77e', '#7a5238'],
    accent: ['#d8412f', '#2f6fd8'],
  };
  var HAZE = '#f1d9ae', SAND = '#fbeed5', SAND2 = '#dcb77e', SHADE = '#b0834e', ROCK = '#7a5238', ROCK2 = '#553725';
  var JACKET = '#d8412f', PACK = '#2f6fd8', INK = '#1d2430', SPIRE = '#a4583a', GOLD = '#ffcc33';

  var GAME_TITLE = 'CANYON COURIER';
  var TIME_LIMIT = 18;
  var P_Y = Math.round(H * 0.72);
  var P_R = 38;
  var TOP_Y = Math.round(H * 0.13);
  var MARGIN = 90;
  var TELE = 0.7;

  var GUIDE_A = ['..hh..', '.hffh.', '..ff..', 'jjbbjj', 'jjbbjj', '.jjjj.', '.k..k.', 'kk..kk'];
  var GUIDE_B = ['..hh..', '.hffh.', '..ff..', 'jjbbjj', 'jjbbjj', '.jjjj.', '.k..k.', '.kk.k.'];
  var GUIDE_PAL = { h: '#6b3a1e', f: '#ffd2a8', j: JACKET, b: PACK, k: INK };
  var HUT = ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.wwwwww.', '.wdwwdw.', '.wwddww.'];
  var HUT_PAL = { r: '#8a3b2a', w: '#b98a5a', d: '#4a2a18' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var u = null;

  function lbl(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    u = {
      x: W / 2, tx: W / 2, walk: 0, rollers: [], teles: [], spawnT: 0.6, wave: 0,
      climbed: 0, grazes: 0, clock: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0, mile: false,
    };
  }

  // 次の落下を予告(土煙)→ TELE 秒後に転がり出す
  function queue(kind, x, vx) {
    u.teles.push({ kind: kind, x: x, vx: vx || 0, t: TELE });
    game.audio.tone('G2', 0.18, { wave: 'sawtooth', volume: 0.05, slide: -40 });
  }

  function spawnWave() {
    u.wave++;
    var lvl = Math.min(1, u.clock / TIME_LIMIT);
    var r = Math.random();
    if (u.wave <= 2 || r < 0.35) {
      queue('weed', MARGIN + Math.random() * (W - MARGIN * 2));
    } else if (r < 0.6) {
      var gap = MARGIN + 140 + Math.random() * (W - MARGIN * 2 - 280);
      queue('weed', Math.max(MARGIN, gap - 300));
      queue('weed', Math.min(W - MARGIN, gap + 300));
    } else if (r < 0.85) {
      queue('rock', Math.random() < 0.5 ? MARGIN + 40 : W - MARGIN - 40, (Math.random() < 0.5 ? -1 : 1) * (380 + lvl * 220));
    } else {
      queue('weed', u.x);
      queue('rock', W / 2, (Math.random() < 0.5 ? -1 : 1) * 460);
    }
  }

  function launch(tl) {
    u.rollers.push({ kind: tl.kind, x: tl.x, y: TOP_Y, vx: tl.vx, vy: 0, r: tl.kind === 'rock' ? 44 : 36, spin: 0, hop: 0, grazed: false });
    game.audio.play('se_tap', 0.2);
  }

  function hit(rl) {
    u.finished = true; u.ok = false;
    u.hitStop = 0.5; u.hl = rl;
    game.fx.flash('#ffffff', 0.25);
    game.feedback.bad(u.x, P_Y - 80, { text: 'MISS', color: JACKET });
    finish();
  }

  function finish() {
    if (u.done) return;
    u.done = true; u.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(u.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function sim(dt) {
    if (u.hitStop > 0) { u.hitStop -= dt; return; }
    if (u.finished) return;
    u.clock += dt;
    u.climbed = Math.min(1, u.clock / TIME_LIMIT);
    // 横歩き(最高速あり、瞬間移動しない)
    var dx = u.tx - u.x, maxStep = 1250 * dt;
    if (Math.abs(dx) > 2) { u.x += Math.max(-maxStep, Math.min(maxStep, dx)); u.walk += dt; }
    u.x = Math.max(MARGIN, Math.min(W - MARGIN, u.x));
    if (!u.mile && u.climbed >= 0.5) {
      u.mile = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('50%', u.x, P_Y - 160, { color: GOLD, size: 60 });
    }
    u.spawnT -= dt;
    if (u.spawnT <= 0) { spawnWave(); u.spawnT = Math.max(0.55, 1.15 - u.clock * 0.03); }
    for (var i = 0; i < u.teles.length; i++) {
      u.teles[i].t -= dt;
      if (u.teles[i].t <= 0) launch(u.teles[i]);
    }
    u.teles = u.teles.filter(function (t) { return t.t > 0; });
    var fall = 820 + u.clock * 26;
    for (var j = 0; j < u.rollers.length; j++) {
      var rl = u.rollers[j];
      rl.y += fall * dt * (rl.kind === 'rock' ? 0.9 : 1);
      rl.spin += dt * 9;
      if (rl.kind === 'weed') rl.r = Math.min(92, rl.r + dt * 32);
      else {
        rl.x += rl.vx * dt;
        if (rl.x < MARGIN || rl.x > W - MARGIN) { rl.vx = -rl.vx; rl.x = Math.max(MARGIN, Math.min(W - MARGIN, rl.x)); game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.04 }); }
        rl.hop = Math.abs(Math.sin(rl.spin * 0.6)) * 26;
      }
      var d = Math.hypot(rl.x - u.x, rl.y - P_Y);
      if (d < rl.r + P_R - 10) { hit(rl); return; }
      if (!rl.grazed && rl.y > P_Y && d < rl.r + P_R + 60) {
        rl.grazed = true; u.grazes++;
        game.fx.popup('NICE', u.x + (rl.x < u.x ? 110 : -110), P_Y - 90, { color: GOLD, size: 40 });
        game.audio.tone('A5', 0.06, { wave: 'triangle', volume: 0.05 });
      }
    }
    u.rollers = u.rollers.filter(function (r2) { return r2.y < H + 150; });
    if (u.clock >= TIME_LIMIT) {
      u.finished = true; u.ok = true; u.hitStop = 0.3;
      game.feedback.good(u.x, P_Y - 120, { text: 'CLEAR', color: GOLD, count: 30 });
      finish();
    }
  }

  // ── 描画 ─────────────────────────────────────────
  // 三角形を横ストリップで塗る(ローポリの面)
  function tri(x, yTop, w, h, col) {
    for (var y = 0; y < h; y += 6) {
      var ww = w * (y / h);
      game.draw.rect(x - ww / 2, yTop + y, ww, 6, col);
    }
  }

  function drawSlope() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#e7a86a'], [0.25, HAZE], [1, SAND]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.1));
    // 遠いメサ(ジッター)
    var j = Math.floor(t * 4) % 2 ? 1 : -1;
    tri(260 + j, 60, 700, 260, '#c98a5a');
    tri(820 - j, 90, 640, 230, '#d69d6a');
    // 見張り小屋(登るほど近づく)
    var hs = 6 + u.climbed * 10;
    game.draw.sprite(HUT, HUT_PAL, W / 2, TOP_Y - 20 + (1 - u.climbed) * -20, hs, { anchor: 'center' });
    // 斜面の段(スクロール)
    var off = (u.clock * 260) % 180;
    for (var s = -1; s < 12; s++) {
      var y = TOP_Y + s * 180 + off;
      game.draw.rect(0, y, W, 90, SAND2, 0.35);
      game.draw.line(0, y, W, y + 30, SHADE, 2);
    }
    // 両脇の赤岩の尖塔(ローポリ三角)
    for (var p = 0; p < 6; p++) {
      var py = ((p * 330 + u.clock * 260) % (H + 200)) - 100;
      tri(40, py, 110, 170, SPIRE);
      tri(W - 40, py + 160, 110, 170, SPIRE);
    }
    // 砂ぼこりのもや
    game.draw.rect(0, 0, W, TOP_Y + 80, HAZE, 0.35);
  }

  function drawRollers() {
    var t = game.time.elapsed;
    for (var i = 0; i < u.teles.length; i++) {
      var tl = u.teles[i];
      var k = 1 - tl.t / TELE;
      if (Math.floor(t * 14) % 2 === 0) {
        game.draw.circle(tl.x, TOP_Y + 10, 40 + k * 50, tl.kind === 'rock' ? ROCK : SHADE, 0.55);
        game.draw.line(tl.x, TOP_Y + 60, tl.x + tl.vx * 0.25, TOP_Y + 200, JACKET, 8);
      }
    }
    for (var j = 0; j < u.rollers.length; j++) {
      var rl = u.rollers[j];
      var big = u.hl === rl && u.hitStop > 0;
      var rr = big ? rl.r * 1.25 : rl.r;
      var cy = rl.y - rl.hop;
      game.draw.circle(rl.x, rl.y + rr * 0.7, rr * 0.9, SHADE, 0.45);
      if (rl.kind === 'weed') {
        game.draw.circle(rl.x, cy, rr, big ? '#e8c48a' : SAND2);
        game.draw.circle(rl.x + rr * 0.2, cy + rr * 0.25, rr * 0.7, SHADE, 0.6);
        game.draw.line(rl.x, cy, rl.x + Math.cos(rl.spin) * rr * 0.8, cy + Math.sin(rl.spin) * rr * 0.8, ROCK2, 5);
      } else {
        game.draw.circle(rl.x, cy, rr, big ? '#ffffff' : ROCK);
        game.draw.circle(rl.x - rr * 0.25, cy - rr * 0.25, rr * 0.5, ROCK2);
        game.draw.line(rl.x - Math.cos(rl.spin) * rr, cy - Math.sin(rl.spin) * rr, rl.x + Math.cos(rl.spin) * rr, cy + Math.sin(rl.spin) * rr, INK, 4);
      }
    }
  }

  function drawGuide() {
    var t = game.time.elapsed;
    var art = Math.floor(u.walk * 8 + t * 2) % 2 === 0 ? GUIDE_A : GUIDE_B;
    var bob = Math.sin(t * 3) * 4, sway = Math.sin(t * 1.9) * 3;
    game.draw.circle(u.x, P_Y + 44, 46, SHADE, 0.5);
    game.draw.sprite(art, GUIDE_PAL, u.x + sway, P_Y + bob, u.hitStop > 0 && !u.ok ? 17 : 13, { anchor: 'center' });
    // 目標位置の印(親指ゾーン)
    game.draw.line(u.tx, H * 0.83, u.tx, H * 0.83 + 60, JACKET, 6);
    game.draw.circle(u.tx, H * 0.83 + 70, 14, JACKET);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, INK, 0.55);
    lbl(Math.floor(u.climbed * 100) + '%', 170, 90, 64, SAND);
    lbl('NICE ' + u.grazes, W - 190, 90, 44, GOLD);
    var frac = Math.max(0, u.timeLeft / TIME_LIMIT);
    var low = u.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 165, W - 120, 22, ROCK2);
    game.draw.rect(60, 165, (W - 120) * frac, 22, low ? JACKET : PACK);
    // 親指ゾーン: 歩ける幅の砂の道
    game.draw.rect(MARGIN - 40, H * 0.86, W - MARGIN * 2 + 80, 16, SHADE, 0.7);
  }

  function scoreOf() { return Math.round(u.climbed * 1000) + u.grazes * 50; }

  function drawResult() {
    game.draw.rect(90, 640, W - 180, 500, INK, 0.88);
    lbl(u.ok ? 'CLEAR' : 'GAME OVER', W / 2, 740, 92, u.ok ? GOLD : JACKET);
    lbl(Math.floor(u.climbed * 100) + '%', W / 2, 860, 72, SAND);
    lbl('NICE ' + u.grazes, W / 2, 950, 44, GOLD);
    var sc = scoreOf();
    if (u.ok && sc > game.best) lbl('NEW RECORD', W / 2, 1030, 52, GOLD);
    else if (!u.ok) lbl('あと' + Math.max(1, Math.ceil((1 - u.climbed) * 100)) + '%!', W / 2, 1030, 52, SAND);
    lbl('BEST ' + Math.max(game.best, u.ok ? sc : 0), W / 2, 1105, 36, SAND2);
  }

  function drawScene() {
    drawSlope();
    drawRollers();
    drawGuide();
  }

  // ── ATTRACT: AI が同じ tx 操作で一番安全な横位置へ歩く(終盤は立ち止まって当たる)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false };
  function safest() {
    var best = u.x, bestScore = -1e9;
    for (var cx = MARGIN; cx <= W - MARGIN; cx += 45) {
      var sc = -Math.abs(cx - u.x) * 0.15;
      for (var i = 0; i < u.rollers.length; i++) {
        var rl = u.rollers[i];
        if (rl.y > P_Y + 40) continue;
        var eta = (P_Y - rl.y) / 900;
        var fx = rl.x + rl.vx * eta;
        var d = Math.abs(fx - cx) - rl.r - P_R;
        if (d < 80) sc -= (80 - d) * (eta < 0.8 ? 6 : 2);
      }
      for (var k = 0; k < u.teles.length; k++) if (Math.abs(u.teles[k].x - cx) < 140) sc -= 60;
      if (sc > bestScore) { bestScore = sc; best = cx; }
    }
    return best;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); u.ready = 0; u.spawnT = 0.3; }
    if (cyc < 4.9) {
      u.tx = safest();
      demo.press = Math.abs(u.tx - u.x) > 10;
    } else {
      demo.press = false;
      if (!u.finished && u.rollers.length === 0 && u.teles.length === 0) queue('weed', u.x);
    }
    demo.gx = u.tx; demo.gy = H * 0.86;
    sim(dt);
    u.timeLeft = Math.max(0, TIME_LIMIT - u.clock);
    if (u.done) { u.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); music();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || u.done) return;
    u.tx = Math.max(MARGIN, Math.min(W - MARGIN, x));
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || u.done) return;
    u.tx = Math.max(MARGIN, Math.min(W - MARGIN, x));
    if (Math.random() < 0.05) game.audio.tone('E5', 0.02, { wave: 'triangle', volume: 0.02 });
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!u) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 225, INK, 0.55);
      lbl(GAME_TITLE, W / 2, H * 0.045, 80, SAND);
      lbl('HI-SCORE ' + game.best, W / 2, 170, 34, GOLD);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) lbl('► 100円 投入 ◄', W / 2, H * 0.94, 48, JACKET);
      else lbl('INSERT COIN', W / 2, H * 0.94, 42, INK);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) lbl('TAP TO CONTINUE', W / 2, H * 0.95, 38, INK);
      return;
    }

    if (u.done) {
      u.endWait -= dt;
      if (u.hitStop > 0) u.hitStop -= dt;
      if (u.endWait <= 0) {
        state = S.RESULT;
        var stats = { climbed: Math.floor(u.climbed * 100), grazes: u.grazes };
        if (u.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (u.ready > 0) {
      u.ready -= dt;
      if (u.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      sim(dt);
      u.timeLeft = Math.max(0, TIME_LIMIT - u.clock);
    }

    drawScene();
    drawHud();
    if (u.ready > 0) lbl(u.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, JACKET);
    if (u.done) drawResult();
  });

  function music() {
    game.audio.melody(
      [['D4', 1], ['F4', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 1], ['E4', 0.5], ['G4', 0.5], ['A4', 1], ['D4', 2]],
      { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['D2', 4], ['A1', 4]] }
    );
  }

  game.onStart(function () {
    music();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
