// D-20092012-0014-scrap-buggy-build.js
// スクラップバギー組立 — 廃品置き場のパーツを車体の空きスロットにドラッグしてはめ込み、完成させて発進させる
// 操作: 下段に並ぶパーツを、形が合う車体上のスロットまでドラッグして離す
// 終わり: 全スロットを制限時間内に正しく埋めれば成功。時間切れで未完成なら失敗
// @mechanic: gap_fit
// @theme: junkyard_vehicle_build
// 世界観: 廃品置き場の一角。バラバラのパーツを拾い集めた整備士が、車体の穴の形に合わせてはめ込み一台のバギーを組み上げる話
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しくはめたパーツ数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: くっきりした立方体的ブロック影、面ごとの明暗3段階
  var C = {
    bg: '#3a3f4a', bg2: '#23262e', ground: '#4a4030', chassis: '#8a8f9a', chassisDark: '#5a5f6a',
    slot: '#20232a', part: '#ffb02e', partDark: '#c07a10', wrong: '#ff4d5e',
    good: '#3fe06a', bad: '#ff4d5e', gold: '#ffe14d', white: '#f4f4f8', ink: '#14161c',
  };

  var GAME_TITLE = 'BUGGY BUILD';
  var TIME_LIMIT = 18;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // スロット定義: id, 形(丸/角/三角/ひし形), 車体上の位置
  var SLOT_DEFS = [
    { id: 0, shape: 'circle', x: W * 0.30, y: H * 0.42 },
    { id: 1, shape: 'circle', x: W * 0.70, y: H * 0.42 },
    { id: 2, shape: 'square', x: W * 0.5, y: H * 0.30 },
    { id: 3, shape: 'diamond', x: W * 0.5, y: H * 0.48 },
  ];
  var SHAPES = ['circle', 'square', 'diamond'];
  var TRAY_Y = H * 0.80;
  var PART_R = 68;

  function shapeColor(shape, filled) {
    return filled ? C.part : C.chassisDark;
  }
  function drawShape(shape, x, y, r, color) {
    if (shape === 'circle') { game.draw.circle(x, y, r, color); }
    else if (shape === 'square') { game.draw.rect(x - r, y - r, r * 2, r * 2, color); }
    else if (shape === 'diamond') {
      game.draw.rect(x - r * 0.75, y - r * 0.75, r * 1.5, r * 1.5, color);
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.ground);
    for (var i = 0; i < 6; i++) game.draw.rect(i * (W / 6), H * 0.86, 3, H * 0.14, '#00000020');
  }

  var MECHANIC = ['.##.', '####', '.##.', '#..#'];
  function drawMechanic() {
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    game.draw.sprite(MECHANIC, { '#': C.gold }, W * 0.86, H * 0.56 + bob, 12, { anchor: 'center' });
  }

  function drawChassis() {
    game.draw.rect(W * 0.16, H * 0.24, W * 0.68, H * 0.34, C.chassis, 0.9);
    game.draw.rect(W * 0.16, H * 0.24, W * 0.68, 8, C.white, 0.15);
    for (var i = 0; i < SLOT_DEFS.length; i++) {
      var s = SLOT_DEFS[i];
      drawShape(s.shape, s.x, s.y, PART_R * 0.62, filled[s.id] ? shapeColor(s.shape, true) : C.slot);
      if (!filled[s.id]) {
        var pulse = Math.floor(game.time.elapsed * 4) % 2 === 0;
        drawShape(s.shape, s.x, s.y, PART_R * 0.62 - (pulse ? 6 : 0), '#ffffff22');
      }
    }
  }

  var parts; // {shape, x, y, homeX, homeY, placed, dragging}

  function layoutParts() {
    parts = [];
    var shuffled = SLOT_DEFS.map(function(s) { return s.shape; });
    shuffled.push(SHAPES[Math.floor(game.random(0, 3)) % 3]); // decoy 1
    shuffled.push(SHAPES[Math.floor(game.random(0, 3)) % 3]); // decoy 2
    // シャッフル
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    var n = shuffled.length;
    var spacing = (W * 0.8) / n;
    for (var k = 0; k < n; k++) {
      var hx = W * 0.1 + spacing * (k + 0.5);
      parts.push({ shape: shuffled[k], x: hx, y: TRAY_Y, homeX: hx, homeY: TRAY_Y, placed: false, dragging: false });
    }
  }

  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.placed) continue;
      var r = p.dragging ? PART_R * 0.7 : PART_R * 0.62;
      drawShape(p.shape, p.x, p.y, r + 6, C.partDark);
      drawShape(p.shape, p.x, p.y, r, C.part);
    }
  }

  var filled, filledCount, done, endWait, finished, dragPart, milestoneShown;
  var ready, hitStop, shake, timeLeft, warned;

  function initGame() {
    filled = {}; filledCount = 0; done = false; endWait = 0; finished = false;
    dragPart = null; ready = 0.8; hitStop = 0; shake = 0; timeLeft = TIME_LIMIT;
    warned = false; milestoneShown = false;
    layoutParts();
  }

  function nearestSlotFor(p, x, y) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < SLOT_DEFS.length; i++) {
      var s = SLOT_DEFS[i];
      if (filled[s.id]) continue;
      var d = Math.hypot(x - s.x, y - s.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return { slot: best, dist: bestD };
  }

  function dropPart(p, x, y) {
    var r = nearestSlotFor(p, x, y);
    if (r.slot && r.dist < PART_R) {
      if (r.slot.shape === p.shape) {
        filled[r.slot.id] = true; filledCount++;
        p.placed = true;
        p.x = r.slot.x; p.y = r.slot.y;
        game.feedback.good(r.slot.x, r.slot.y, { text: 'GOOD', color: C.good });
        game.fx.burst(r.slot.x, r.slot.y, { color: C.gold, count: 16, speed: 340 });
        game.audio.play('se_milestone', 0.4);
        if (filledCount === Math.ceil(SLOT_DEFS.length / 2) && !milestoneShown) {
          milestoneShown = true;
          game.fx.popup(filledCount + ' / ' + SLOT_DEFS.length, W * 0.5, H * 0.2, { color: C.gold, size: 38 });
        }
        if (filledCount >= SLOT_DEFS.length) { ok = true; finished = true; finish(); }
      } else {
        game.feedback.bad(x, y, { text: 'MISS' });
        p.x = p.homeX; p.y = p.homeY;
      }
    } else {
      p.x = p.homeX; p.y = p.homeY;
    }
    p.dragging = false;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var best = null, bestD = 1e9;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.placed) continue;
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < PART_R && d < bestD) { bestD = d; best = p; }
    }
    if (best) { best.dragging = true; dragPart = best; game.audio.play('se_tap', 0.15); }
  });
  game.onMove(function(x, y) {
    if (dragPart) {
      dragPart.x = x; dragPart.y = y;
      if (Math.random() < 0.05) game.audio.play('se_tap', 0.02);
    }
  });
  game.onRelease(function(x, y) {
    if (dragPart) { dropPart(dragPart, x, y); dragPart = null; }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: TRAY_Y, press: false, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { filled = {}; filledCount = 0; layoutParts(); demo.idx = 0; }
    var step = cyc / (4.0 / (SLOT_DEFS.length + 1));
    var idx = Math.floor(step);
    var localT = step - idx;
    if (idx < SLOT_DEFS.length) {
      var slot = SLOT_DEFS[idx];
      var srcPart = null;
      for (var i = 0; i < parts.length; i++) { if (!parts[i].placed && parts[i].shape === slot.shape) { srcPart = parts[i]; break; } }
      if (srcPart) {
        if (localT < 0.15) { demo.gx = srcPart.homeX; demo.gy = srcPart.homeY; demo.press = false; }
        else if (localT < 0.85) {
          var p2 = (localT - 0.15) / 0.7;
          demo.gx = srcPart.homeX + (slot.x - srcPart.homeX) * p2;
          demo.gy = srcPart.homeY + (slot.y - srcPart.homeY) * p2;
          demo.press = true;
          srcPart.x = demo.gx; srcPart.y = demo.gy;
        } else if (!filled[slot.id]) {
          filled[slot.id] = true; filledCount++;
          srcPart.placed = true; srcPart.x = slot.x; srcPart.y = slot.y;
          game.feedback.good(slot.x, slot.y, { text: 'GOOD', color: C.good });
          game.audio.play('se_milestone', 0.25);
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (filled === undefined) initGame();
      bg();
      stepDemo(dt);
      drawChassis();
      drawMechanic();
      drawParts();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChassis();
      drawMechanic();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(filledCount + ' / ' + SLOT_DEFS.length, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (SLOT_DEFS.length - filledCount) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(filledCount, { filled: filledCount, total: SLOT_DEFS.length });
        else game.end.failure({ filled: filledCount, total: SLOT_DEFS.length });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!warned && timeLeft <= 3) warned = true;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, H * 0.4, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawChassis();
      drawMechanic();
    drawParts();

    txt(filledCount + ' / ' + SLOT_DEFS.length, W * 0.5, H * 0.045, 30, C.white);
    var timeBlink = warned && Math.floor(game.time.elapsed * 6) % 2 === 0;
    txt(Math.ceil(timeLeft) + 's', W * 0.85, H * 0.045, 28, timeBlink ? C.bad : C.white);
    game.draw.rect(60, 108, W - 120, 14, C.ink, 0.4);
    game.draw.rect(60, 108, (W - 120) * (filledCount / SLOT_DEFS.length), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
