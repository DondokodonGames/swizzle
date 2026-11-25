// J-N6434-0015-gale-laundry-grab.js
// 嵐の干し場の洗濯物つかみ — 突風で逃げ回る洗濯物を追ってタップで掴み、雷の落ちる列には手を出さない
// 操作: 風に舞う洗濯物をタップして掴む。近くを空振りすると洗濯物は逃げる。点滅する予告線の列は雷が落ちて帯電するので触らない
// 終わり: 8枚掴めばCLEAR。帯電した列に触れるかTIME UPでGAME OVER
// @mechanic: chase
// @theme: storm_yard_laundry_rescue
// 世界観: 丘の上の洗濯屋で働く見習いアライグマが、雷雨の突風で舞い上がった預かり物の洗濯物を、落雷の列を見切りながら一枚ずつ掴み戻す
// 残るもの: 正誤(CLEAR/GAME OVER) + 掴んだ枚数と空振り数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var STYLE = { bg: ['#2a2826', '#4a4640', '#6a6258'], main: ['#b8ac98', '#e0d8c8'], accent: ['#f0e0a0', '#c85a48'] };
  var C = {
    sky1: '#23211f', sky2: '#4a4640', ground: '#3a3a30', grass: '#55563f', fog: '#8a8478',
    cloth: '#e0d8c8', sock: '#b8766a', shirt: '#8aa0b0', gold: '#f0d080', bolt: '#eef4ff',
    warn: '#f0e0a0', bad: '#c85a48', ink: '#1a1816', good: '#a8c890'
  };

  var TITLE = 'GALE LAUNDRY';
  var TIME_LIMIT = 16;
  var NEEDED = 8;
  var FIELD_TOP = H * 0.18, FIELD_BOT = H * 0.68;
  var COL_W = 190;
  var CATCH_R = 115;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SHEET = ['wwwwww', 'wwwwww', 'wwwwww', 'w.ww.w', '.w..w.'];
  var SOCK = ['.ss', '.ss', '.ss', 'sss', 'ss.'];
  var SHIRT = ['bb..bb', 'bbbbbb', '.bbbb.', '.bbbb.', '.bbbb.'];
  var CLOTH_PAL = { w: '#e0d8c8', s: '#b8766a', b: '#8aa0b0' };
  var GOLD_PAL = { w: '#f0d080', s: '#f0d080', b: '#f0d080' };
  var COON_A = [
    'g......g',
    'gg....gg',
    '.gggggg.',
    'gkkwwkkg',
    'gwkggkwg',
    '.gggggg.',
    '..gnng..',
    '.gg..gg.',
    'bbbbbbbb',
    '.bbbbbb.'
  ];
  var COON_B = [
    'g......g',
    'gg....gg',
    '.gggggg.',
    'gkkwwkkg',
    'gwkggkwg',
    'ggggggggg',
    'g.gnng..g',
    '.gg..gg.',
    'bbbbbbbb',
    '.bbbbbb.'
  ];
  var COON_PAL = { g: '#8a8478', k: '#2a2826', w: '#e0d8c8', n: '#1a1816', b: '#7a5a38' };
  var SHAPES = [SHEET, SOCK, SHIRT];

  var items, bolts, caught, whiffs, timeLeft, phase, phaseT, boltT, gustT, gx, gy, endOk, focusX, focusY, catchAnim, zapCol;
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, cd: 0, zapShown: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function spawnItem(gold) {
    return {
      x: game.random(W * 0.15, W * 0.85), y: game.random(FIELD_TOP + 60, FIELD_BOT - 60),
      vx: game.random(-220, 220), vy: game.random(-120, 120),
      shape: Math.floor(Math.random() * 3), gold: !!gold, ph: Math.random() * 6, dash: 0
    };
  }

  function initGame() {
    items = [];
    for (var i = 0; i < 4; i++) items.push(spawnItem(i === 3));
    bolts = []; caught = 0; whiffs = 0; timeLeft = TIME_LIMIT; phase = 'ready'; phaseT = 0.8;
    boltT = 1.2; gustT = 1; gx = 160; gy = 0; endOk = false; focusX = W / 2; focusY = H / 2; catchAnim = 0; zapCol = null;
  }

  function colDanger(x, charged) {
    for (var i = 0; i < bolts.length; i++) {
      var b = bolts[i];
      if (Math.abs(x - b.x) < COL_W / 2 && (charged ? b.stage >= 1 : true)) return b;
    }
    return null;
  }

  function stepWorld(dt, live) {
    var el = game.time.elapsed;
    gustT -= dt;
    if (gustT <= 0) { gustT = game.random(0.8, 1.4); gx = game.random(-260, 260); gy = game.random(-90, 90); }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var sp = it.gold ? 1.5 : 1;
      it.vx += (gx - it.vx) * Math.min(1, dt * 1.5);
      it.vy += (gy + Math.sin(el * 3 + it.ph) * 80 - it.vy) * Math.min(1, dt * 1.5);
      if (it.dash > 0) it.dash -= dt;
      var boost = it.dash > 0 ? 2.4 : 1;
      it.x += it.vx * sp * boost * dt; it.y += it.vy * sp * boost * dt;
      if (it.x < 70) { it.x = 70; it.vx = Math.abs(it.vx); }
      if (it.x > W - 70) { it.x = W - 70; it.vx = -Math.abs(it.vx); }
      if (it.y < FIELD_TOP) { it.y = FIELD_TOP; it.vy = Math.abs(it.vy); }
      if (it.y > FIELD_BOT) { it.y = FIELD_BOT; it.vy = -Math.abs(it.vy); }
      it.ph += dt * 5;
    }
    // 落雷: 予告(0.7s) → 落雷(0.3s) → 帯電(0.6s)
    boltT -= dt;
    if (boltT <= 0) {
      var n = caught >= 4 ? 2 : 1;
      for (var k = 0; k < n; k++) bolts.push({ x: game.random(COL_W / 2, W - COL_W / 2), t: 0, stage: 0 });
      boltT = Math.max(0.9, 1.6 - caught * 0.08);
      if (live) game.audio.tone('A2', 0.25, { wave: 'sawtooth', volume: 0.05, slide: -40 });
    }
    for (var j = bolts.length - 1; j >= 0; j--) {
      var b = bolts[j];
      b.t += dt;
      if (b.stage === 0 && b.t >= 0.7) {
        b.stage = 1;
        if (live) { game.audio.play('se_break', 0.4); game.fx.shake(8, 0.15); }
        for (var m = 0; m < items.length; m++) {
          if (Math.abs(items[m].x - b.x) < COL_W / 2) { game.fx.burst(items[m].x, items[m].y, { color: C.fog, count: 8, speed: 200 }); items[m] = spawnItem(Math.random() < 0.15); }
        }
      }
      if (b.stage === 1 && b.t >= 1.0) b.stage = 2;
      if (b.t >= 1.6) bolts.splice(j, 1);
    }
    if (catchAnim > 0) catchAnim -= dt;
  }

  // タップの判定(実プレイ・デモ共通)
  function grab(x, y, live) {
    var danger = colDanger(x, true);
    if (danger) { zapCol = danger; focusX = x; focusY = y; return 'zap'; }
    var best = -1, bd = CATCH_R;
    for (var i = 0; i < items.length; i++) {
      var d = Math.hypot(items[i].x - x, items[i].y - y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0) {
      var it = items[best];
      caught += it.gold ? 2 : 1; catchAnim = 0.3;
      if (live) {
        game.feedback.good(it.x, it.y - 60, { text: it.gold ? 'x2' : 'GOOD', color: it.gold ? C.gold : C.good, sound: 'se_coin' });
        if (caught >= 4 && caught - (it.gold ? 2 : 1) < 4) { game.fx.popup('あと' + (NEEDED - caught) + '枚!', W / 2, H * 0.72, { color: C.warn, size: 52 }); game.audio.play('se_milestone', 0.5); }
      }
      items[best] = spawnItem(Math.random() < 0.2);
      return 'catch';
    }
    whiffs++;
    for (var k = 0; k < items.length; k++) {
      var dx = items[k].x - x, dy = items[k].y - y, dd = Math.hypot(dx, dy);
      if (dd < 280) { items[k].vx = dx / dd * 420; items[k].vy = dy / dd * 300; items[k].dash = 0.35; }
    }
    return 'whiff';
  }

  function drawScene() {
    var el = game.time.elapsed;
    var flash = 0;
    for (var i = 0; i < bolts.length; i++) if (bolts[i].stage === 1) flash = 0.25;
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [0.62, C.grass], [1, C.ground]]);
    game.draw.rect(0, 0, W, H, C.bolt, flash + 0.03 + 0.03 * Math.sin(el * 1.3));
    // 遠景: 雲と洗濯屋の屋根
    for (var c = 0; c < 6; c++) {
      var cx = ((el * 25 + c * 240) % (W + 400)) - 200;
      game.draw.circle(cx, H * 0.14 + (c % 2) * 40, 160, '#5a564e', 0.5);
    }
    game.draw.rect(W * 0.06, H * 0.60, 220, 140, '#4a3a2a');
    game.draw.rect(W * 0.04, H * 0.58, 260, 30, '#6a4a30');
    game.draw.circle(W * 0.06 + 180, H * 0.65, 30, C.warn, 0.35 + 0.1 * Math.sin(el * 3));
    game.draw.line(0, H * 0.585, W, H * 0.60, '#2a2826', 5);
    // 雨
    for (var r = 0; r < 40; r++) {
      var rx = (r * 137 + el * 300) % W, ry = (r * 211 + el * 1500) % H;
      game.draw.line(rx, ry, rx - 12, ry + 40, C.fog, 2);
    }
    // 落雷の列
    for (var j = 0; j < bolts.length; j++) {
      var b = bolts[j];
      if (b.stage === 0) {
        var on = Math.floor(el * 14) % 2 === 0;
        game.draw.rect(b.x - COL_W / 2, FIELD_TOP - 40, COL_W, FIELD_BOT - FIELD_TOP + 140, C.warn, on ? 0.18 : 0.06);
        for (var d = 0; d < 12; d++) game.draw.rect(b.x - 4, FIELD_TOP - 40 + d * 80, 8, 40, C.warn, on ? 0.9 : 0.3);
      } else if (b.stage === 1) {
        var zx = b.x;
        for (var s = 0; s < 10; s++) {
          var y1 = s * H * 0.07, nx = b.x + game.random(-50, 50);
          game.draw.line(zx, y1, nx, y1 + H * 0.07, C.bolt, 16);
          zx = nx;
        }
        game.draw.circle(b.x, FIELD_BOT, 160, C.bolt, 0.35);
      } else {
        game.draw.rect(b.x - COL_W / 2, FIELD_TOP - 40, COL_W, FIELD_BOT - FIELD_TOP + 140, C.bolt, 0.12 + 0.1 * Math.sin(el * 40));
      }
    }
    // 洗濯物
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var fl = Math.sin(it.ph) > 0;
      if (it.gold) game.draw.circle(it.x, it.y, 90, C.gold, 0.18);
      game.draw.circle(it.x, it.y + 110, 40, '#000000', 0.18);
      game.draw.sprite(SHAPES[it.shape], it.gold ? GOLD_PAL : CLOTH_PAL, it.x, it.y, 18, { anchor: 'center', flipX: fl });
    }
    // 主役
    game.draw.sprite(catchAnim > 0 ? COON_B : COON_A, COON_PAL, W / 2, H * 0.80 + Math.sin(el * 3) * 6, 16, { anchor: 'center' });
    // ビネット
    game.draw.rect(0, 0, 60, H, '#000000', 0.3);
    game.draw.rect(W - 60, 0, 60, H, '#000000', 0.3);
    game.draw.rect(0, H - 80, W, 80, '#000000', 0.3);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.085, '#000000', 0.45);
    txt(Math.min(caught, NEEDED) + ' / ' + NEEDED, W * 0.5, H * 0.04, 58, C.cloth);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, H * 0.075, W - 120, 14, '#1a1816');
    game.draw.rect(60, H * 0.075, (W - 120) * frac, 14, frac < 0.25 ? C.bad : C.warn);
    for (var i = 0; i < NEEDED; i++) game.draw.rect(40 + i * 30, H * 0.03, 20, 34, i < caught ? C.cloth : '#3a3834');
  }

  function scoreOf() { return caught * 120 + Math.round(timeLeft * 30) - whiffs * 10; }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.24, '#000000', 0.7);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, endOk ? C.gold : C.bad);
    txt(Math.min(caught, NEEDED) + ' / ' + NEEDED + '   MISS ' + whiffs, W / 2, H * 0.42, 44, C.cloth);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.49, 54, C.gold);
    else if (!endOk) txt('あと' + (NEEDED - caught) + '枚!', W / 2, H * 0.49, 54, C.warn);
    else txt('BEST ' + game.best, W / 2, H * 0.49, 42, C.cloth);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.cd = 0.4; demo.zapShown = false; }
    stepWorld(dt, false);
    demo.cd -= dt;
    demo.press = demo.cd > 0.28;
    var tgt = null;
    for (var i = 0; i < items.length; i++) {
      if (!colDanger(items[i].x, false) && (!tgt || items[i].y > tgt.y)) tgt = items[i];
    }
    // 1周に1度、帯電した列に手を出す失敗例を見せる
    var zapB = null;
    for (var j = 0; j < bolts.length; j++) if (bolts[j].stage >= 1) zapB = bolts[j];
    if (!demo.zapShown && zapB && cyc > 3) {
      demo.gx = zapB.x; demo.gy = H * 0.45;
      if (demo.cd <= 0) { grab(demo.gx, demo.gy, false); demo.zapShown = true; demo.cd = 0.35; game.fx.flash('#eef4ff', 0.2); game.fx.burst(demo.gx, demo.gy, { color: C.bad, count: 10 }); }
      return;
    }
    if (!tgt) return;
    demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 7);
    demo.gy += (tgt.y - demo.gy) * Math.min(1, dt * 7);
    if (demo.cd <= 0 && Math.hypot(tgt.x - demo.gx, tgt.y - demo.gy) < 60) {
      if (grab(demo.gx, demo.gy, false) === 'catch') game.fx.burst(demo.gx, demo.gy, { color: C.good, count: 8 });
      demo.cd = 0.45;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.2);
    var r = grab(x, y, true);
    if (r === 'zap') {
      endOk = false; phase = 'stop'; phaseT = 0.5;
      game.fx.flash('#eef4ff', 0.25);
    } else if (r === 'whiff') {
      game.audio.tone('D3', 0.08, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(x, y, { color: C.fog, count: 5, speed: 150 });
    }
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!items) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 86, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.105, 40, C.cloth);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.92, 52, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.92, 46, C.cloth);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 44, C.cloth);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepWorld(dt, true);
      if (caught >= NEEDED) { endOk = true; phase = 'stop'; phaseT = 0.45; focusX = W / 2; focusY = H * 0.78; }
      else if (timeLeft <= 0) { timeLeft = 0; endOk = false; phase = 'stop'; phaseT = 0.45; focusX = items[0].x; focusY = items[0].y; }
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.gold, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#f0e0a0', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (phaseT <= 0) {
        state = S.RESULT;
        if (endOk) game.end.success(scoreOf(), { caught: caught, whiffs: whiffs });
        else game.end.failure({ caught: caught, whiffs: whiffs, zapped: zapCol ? 1 : 0 });
        return;
      }
    }

    drawScene(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 90 + (0.5 - phaseT) * 160, C.bolt, 0.5);
      if (zapCol && !endOk) game.draw.rect(zapCol.x - COL_W / 2, 0, COL_W, H, C.bolt, 0.35);
      game.draw.sprite(endOk ? COON_B : SHEET, endOk ? COON_PAL : CLOTH_PAL, focusX, focusY, 20, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 1],
      ['F3', 0.5], ['A3', 0.5], ['C4', 0.5], ['F4', 0.5], ['E4', 2]
    ], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['A1', 2], ['A1', 2], ['F1', 2], ['E1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
