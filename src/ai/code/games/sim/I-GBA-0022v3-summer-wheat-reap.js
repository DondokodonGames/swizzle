// I-GBA-0022v3-summer-wheat-reap.js
// サマーウィートリープ — 風に揺れる麦の穂を、素早い一振りの線でまとめて刈り取って束ねる
// 操作: 画面を素早くなぞると鎌の軌跡になり、横切った麦の茎をまとめて刈る。ゆっくりなぞると刃が鈍って刈れない。畑の石を横切ると刃が欠ける
// 終わり: 制限時間終了時に30本以上刈れていればCLEAR、足りなければGAME OVER
// @mechanic: slice
// @theme: summer_wheat_reaper
// 世界観: 真夏の麦畑で、刈り手が風に揺れる麦の穂を鎌の一振りでまとめて刈り、畑に埋もれた石を避けながら夕立の前に束を積み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 刈った本数・一振りの最多本数
// スタイル: MODERN AD-GAME
var STYLE = { bg: ['#4fc3ff', '#b8ecff', '#ffd84a'], main: ['#ff9f1c', '#1a1a2e'], accent: ['#ffffff', '#ff3d5a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TIME_LIMIT = 14;
  var NEEDED = 30;
  var SWIFT = 0.38;
  var ROWS = [H * 0.36, H * 0.49, H * 0.62];
  var STALK_H = 190;

  var EAR = ['.y.', 'yYy', 'yYy', 'yYy', '.y.'];
  var EAR_GOLD = ['.o.', 'oOo', 'oOo', 'oOo', '.o.'];
  var REAPER_A = [
    '....hhhhh....',
    '..hhhhhhhhh..',
    '....sssss....',
    '....sesee....',
    '....sssss....',
    '...rrrrrrr.m.',
    '..rrrrrrrrrm.',
    '..s.rrrrr..mm',
    '....bbbbb..m.',
    '....b...b....',
    '...kk...kk...',
  ];
  var REAPER_B = [
    '....hhhhh....',
    '..hhhhhhhhh..',
    '....sssss....',
    '....sesee....',
    '....sssss....',
    'mm.rrrrrrr...',
    '.mrrrrrrrrr..',
    '..m.rrrrr..s.',
    '....bbbbb....',
    '....b...b....',
    '...kk...kk...',
  ];
  var REAPER_PAL = { h: '#ffd84a', s: '#ffc08a', e: '#1a1a2e', r: '#ff3d5a', b: '#2a5cff', k: '#1a1a2e', m: '#d8e4f0' };
  var SHEAF = ['.yyy.', 'yyyyy', '.rrr.', '.yyy.', 'yyyyy'];
  var STONE = ['.gggg.', 'gGGggg', 'gGgggd', 'ggggdd', '.dddd.'];

  var stage = 'ATTRACT';
  var stalks = [], stones = [], trail = [], sheaves = 0;
  var drag, secs, reaped, best1, bonusCount, freezeCue, ended, endWait, cleared, total, record, countIn, swingT, patchN;

  function sowPatch() {
    stalks = []; stones = [];
    for (var r = 0; r < ROWS.length; r++) {
      var n = 11;
      for (var i = 0; i < n; i++) {
        var gold = (i + r * 4 + patchN * 3) % 13 === 5;
        stalks.push({ x: 110 + i * 86 + (r % 2) * 40, y: ROWS[r], ph: i * 0.5 + r, cut: false, grow: 0.4 + i * 0.02, gold: gold, fly: 0, vx: 0, vy: 0 });
      }
    }
    var spots = [[0.3, 1], [0.7, 0], [0.5, 2], [0.2, 2], [0.8, 1]];
    var a = spots[patchN % spots.length], b = spots[(patchN + 2) % spots.length];
    stones.push({ x: W * a[0], y: ROWS[a[1]] - STALK_H * 0.5, warn: 0.7, r: 44 });
    if (patchN > 0) stones.push({ x: W * b[0], y: ROWS[b[1]] - STALK_H * 0.5, warn: 1.2, r: 44 });
    patchN++;
  }

  function freshField() {
    patchN = 0; sowPatch();
    trail = []; drag = null; sheaves = 0;
    secs = TIME_LIMIT; reaped = 0; best1 = 0; bonusCount = 0; freezeCue = null;
    ended = false; endWait = 0; cleared = false; total = 0; record = false; countIn = 0.8; swingT = 0;
  }

  function big(s, x, y, size, color) {
    game.draw.text(s, x - 4, y, { size: size, color: STYLE.main[1], bold: true, align: 'center' });
    game.draw.text(s, x + 4, y, { size: size, color: STYLE.main[1], bold: true, align: 'center' });
    game.draw.text(s, x, y + 5, { size: size, color: STYLE.main[1], bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function headOf(s) {
    var sway = Math.sin(game.time.elapsed * 2.2 + s.ph) * 22;
    var h = STALK_H * (1 - s.grow);
    return { x: s.x + sway, y: s.y - h };
  }

  function cross(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    var d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    var d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    var d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }

  function nearSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    var u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
    return Math.hypot(px - (ax + vx * u), py - (ay + vy * u));
  }

  // ── 鎌の軌跡(実プレイとデモで共通) ────────────────────────────────────────
  function bladeDown(x, y) {
    drag = { x: x, y: y, t: 0, cutN: 0, dull: false, chipped: false };
    trail = [{ x: x, y: y, a: 1 }];
    game.audio.play('se_tap', 0.2);
  }

  function bladeMove(x, y, real) {
    if (!drag || drag.chipped) return;
    var ax = drag.x, ay = drag.y;
    drag.x = x; drag.y = y;
    trail.push({ x: x, y: y, a: 1 });
    if (drag.t > SWIFT) {
      if (!drag.dull) { drag.dull = true; game.audio.tone('D3', 0.08, { wave: 'triangle', volume: 0.06 }); }
      return;
    }
    for (var s = 0; s < stones.length; s++) {
      var st = stones[s];
      if (st.warn <= 0 && nearSeg(st.x, st.y, ax, ay, x, y) < st.r) {
        drag.chipped = true;
        freezeCue = { t: 0.4, x: st.x, y: st.y, real: real };
        game.audio.play('se_break', 0.45);
        return;
      }
    }
    for (var i = 0; i < stalks.length; i++) {
      var k = stalks[i];
      if (k.cut || k.grow > 0.05) continue;
      var hd = headOf(k);
      if (cross(ax, ay, x, y, k.x, k.y, hd.x, hd.y)) {
        k.cut = true; k.fly = 0.6; k.vx = (x - ax) * 4; k.vy = -500; k.fx = hd.x; k.fy = hd.y;
        drag.cutN++;
        var worth = k.gold ? 3 : 1;
        game.audio.tone(520 + drag.cutN * 70, 0.05, { wave: 'square', volume: 0.07 });
        game.fx.popup('+' + worth, hd.x, hd.y - 30, { color: k.gold ? STYLE.main[0] : STYLE.accent[0], size: k.gold ? 54 : 40 });
        if (real) {
          reaped += worth;
          if (k.gold) bonusCount++;
          if (reaped >= NEEDED / 2 && reaped - worth < NEEDED / 2) {
            game.fx.popup('NICE', W * 0.5, H * 0.24, { color: STYLE.main[0], size: 80 });
            game.audio.play('se_milestone', 0.45);
          }
        }
      }
    }
  }

  function bladeUp(real) {
    if (!drag) return;
    var d = drag; drag = null;
    swingT = 0.25;
    if (d.chipped) return;
    if (d.cutN > 0) {
      var tail = trail[trail.length - 1];
      game.feedback.good(tail.x, tail.y, { text: d.cutN >= 6 ? 'PERFECT' : d.cutN >= 3 ? 'GREAT' : 'GOOD', color: STYLE.main[0], count: 6 + d.cutN * 2 });
      game.audio.play('se_coin', 0.35);
      if (real) { best1 = Math.max(best1, d.cutN); total += d.cutN * d.cutN * 10; sheaves++; }
    } else {
      game.audio.tone('A2', 0.08, { wave: 'triangle', volume: 0.07 });
      game.fx.popup('MISS', d.x, d.y - 40, { color: '#8899aa', size: 40 });
    }
    var left = 0;
    for (var i = 0; i < stalks.length; i++) if (!stalks[i].cut) left++;
    if (left < 5) sowPatch();
  }

  function fieldTick(dt) {
    if (drag) drag.t += dt;
    swingT = Math.max(0, swingT - dt);
    for (var i = 0; i < stalks.length; i++) {
      var k = stalks[i];
      if (k.grow > 0) k.grow = Math.max(0, k.grow - dt * 1.6);
      if (k.cut && k.fly > 0) { k.fly -= dt; k.vy += 1600 * dt; k.fx += k.vx * dt * 0.2; k.fy += k.vy * dt * 0.3; }
    }
    for (var s = 0; s < stones.length; s++) {
      if (stones[s].warn > 0) {
        stones[s].warn -= dt;
        if (stones[s].warn <= 0) game.audio.tone('G2', 0.1, { wave: 'square', volume: 0.06 });
      }
    }
    for (var t = trail.length - 1; t >= 0; t--) {
      trail[t].a -= dt * 3.5;
      if (trail[t].a <= 0) trail.splice(t, 1);
    }
  }

  function chipResolve(real) {
    game.feedback.bad(freezeCue.x, freezeCue.y, { text: 'MISS', shake: 16 });
    if (real) secs = Math.max(0.1, secs - 1);
    freezeCue = null;
  }

  function wrapUp() {
    if (ended) return;
    ended = true; endWait = 1.2;
    cleared = reaped >= NEEDED;
    total += reaped * 20;
    record = cleared && total > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.5);
  }

  // ── 描画 ─────────────────────────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.3, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(W * 0.8, H * 0.1, 90 + Math.sin(t * 2) * 6, '#fff3a0');
    game.draw.circle(W * 0.8, H * 0.1, 140, '#fff3a0', 0.3);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 25) % (W + 300)) - 150;
      game.draw.circle(cx, H * 0.17 + c * 20, 60, '#ffffff');
      game.draw.circle(cx + 60, H * 0.17 + c * 20 + 10, 46, '#ffffff');
    }
    game.draw.gradient(H * 0.26, H, [[0, '#ffe066'], [0.6, STYLE.bg[2]], [1, '#e8a830']]);
    for (var r = 0; r < 12; r++) game.draw.rect(0, H * 0.28 + r * 110, W, 8, '#e0b030', 0.5);
  }

  function drawStalks() {
    for (var i = 0; i < stalks.length; i++) {
      var k = stalks[i];
      var hd = headOf(k);
      if (k.cut) {
        if (k.fly > 0) game.draw.sprite(EAR, { y: '#ffe066', Y: '#c88a1a' }, k.fx, k.fy - 30, 10, { anchor: 'center', alpha: k.fly / 0.6 });
        game.draw.line(k.x, k.y, k.x, k.y - 26, STYLE.main[1], 12);
        game.draw.line(k.x, k.y, k.x, k.y - 26, '#c8a040', 6);
        continue;
      }
      game.draw.line(k.x, k.y, hd.x, hd.y, STYLE.main[1], 12);
      game.draw.line(k.x, k.y, hd.x, hd.y, k.gold ? '#ffcc33' : '#d8b848', 6);
      game.draw.sprite(k.gold ? EAR_GOLD : EAR, k.gold ? { o: '#ff9f1c', O: '#fff3a0' } : { y: '#ffe066', Y: '#c88a1a' }, hd.x, hd.y - 36, 15, { anchor: 'center' });
    }
  }

  function drawStones() {
    for (var s = 0; s < stones.length; s++) {
      var st = stones[s];
      if (st.warn > 0) {
        if (Math.floor(game.time.elapsed * 12) % 2 === 0) {
          game.draw.circle(st.x, st.y, st.r + 10, STYLE.accent[1], 0.35);
          game.draw.line(st.x - 30, st.y - 30, st.x + 30, st.y + 30, STYLE.accent[0], 6);
          game.draw.line(st.x + 30, st.y - 30, st.x - 30, st.y + 30, STYLE.accent[0], 6);
        }
        continue;
      }
      game.draw.circle(st.x, st.y + 30, st.r, STYLE.main[1], 0.3);
      game.draw.sprite(STONE, { g: '#9aa4b0', G: '#dfe6ee', d: '#5a6470' }, st.x, st.y, 15, { anchor: 'center' });
    }
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      var col = drag && drag.dull ? '#8899aa' : STYLE.accent[0];
      game.draw.line(a.x, a.y, b.x, b.y, STYLE.main[1], 22 * b.a);
      game.draw.line(a.x, a.y, b.x, b.y, col, 12 * b.a);
    }
  }

  function drawReaper() {
    var art = swingT > 0 ? REAPER_B : REAPER_A;
    var bob = Math.sin(game.time.elapsed * 4) * 5;
    game.draw.circle(W * 0.5, H * 0.87, 90, STYLE.main[1], 0.2);
    game.draw.sprite(art, REAPER_PAL, W * 0.5, H * 0.8 + bob, 16, { anchor: 'center' });
    var n = Math.min(10, sheaves);
    for (var s = 0; s < n; s++) game.draw.sprite(SHEAF, { y: '#ffe066', r: STYLE.accent[1] }, W * 0.72 + (s % 5) * 56, H * 0.86 - Math.floor(s / 5) * 70, 11, { anchor: 'center' });
  }

  function drawScene() {
    drawField();
    drawStones();
    drawStalks();
    drawTrail();
    drawReaper();
    if (freezeCue) {
      var k = 0.4 - freezeCue.t;
      game.draw.circle(freezeCue.x, freezeCue.y, 50 + k * 220, '#ffffff', 0.6);
      game.draw.sprite(STONE, { g: '#ffffff', G: '#ffffff', d: '#dfe6ee' }, freezeCue.x, freezeCue.y, 19, { anchor: 'center' });
    }
  }

  // ── ATTRACT: 素早い一振りで一列刈る成功 + 石を横切って刃が欠ける失敗 ─────────
  var demo = { t: 0, gx: W * 0.1, gy: ROWS[1] - 90, press: false, s: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { freshField(); countIn = 0; for (var q = 0; q < stones.length; q++) stones[q].warn = 0; demo.s = 0; }
    fieldTick(dt);
    if (freezeCue) { freezeCue.t -= dt; if (freezeCue.t <= 0) chipResolve(false); }
    var y1 = ROWS[2] - 90;
    var st = stones[0];
    if (cyc > 0.6 && cyc < 0.9) {
      var u = (cyc - 0.6) / 0.3;
      demo.gx = W * 0.08 + u * W * 0.84; demo.gy = y1;
      if (demo.s === 0) { bladeDown(demo.gx, demo.gy); demo.s = 1; } else bladeMove(demo.gx, demo.gy, false);
      demo.press = true;
    } else if (cyc >= 0.9 && demo.s === 1) {
      bladeUp(false); demo.s = 2; demo.press = false;
    } else if (cyc > 2.2 && cyc < 2.45) {
      var v = (cyc - 2.2) / 0.25;
      demo.gx = st.x - 260 + v * 520; demo.gy = st.y;
      if (demo.s === 2) { bladeDown(demo.gx, demo.gy); demo.s = 3; } else bladeMove(demo.gx, demo.gy, false);
      demo.press = true;
    } else if (cyc >= 2.45 && demo.s === 3) {
      bladeUp(false); demo.s = 4; demo.press = false;
    } else if (cyc < 0.6) {
      demo.gx = W * 0.08; demo.gy = y1; demo.press = false;
    } else if (cyc > 1.4 && cyc < 2.2) {
      demo.gx += ((st.x - 260) - demo.gx) * Math.min(1, dt * 6); demo.gy += (st.y - demo.gy) * Math.min(1, dt * 6);
    }
  }

  game.onPress(function (x, y) {
    if (stage !== 'PLAYING' || ended) return;
    if (countIn > 0 || freezeCue) { game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.04 }); return; }
    bladeDown(x, y);
  });
  game.onMove(function (x, y) {
    if (stage !== 'PLAYING' || ended || !drag) return;
    bladeMove(x, y, true);
    if (Math.random() < 0.05) game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function (x, y) {
    if (stage !== 'PLAYING') return;
    if (drag) bladeUp(true);
    else game.fx.burst(x, y, { color: STYLE.accent[0], count: 2, speed: 60 });
  });
  game.onTap(function (x, y) {
    if (stage === 'ATTRACT') { game.audio.play('se_coin', 0.5); stage = 'PLAYING'; freshField(); return; }
    if (stage === 'RESULT') { game.audio.play('se_tap', 0.3); stage = 'ATTRACT'; freshField(); demo.t = 0; }
  });

  game.onUpdate(function (dt) {
    if (stage === 'ATTRACT') {
      if (!stalks.length) freshField();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      big('WHEAT SWEEP', W * 0.5, H * 0.07, 84, STYLE.main[0]);
      big('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.12, 38, STYLE.accent[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W * 0.5, H * 0.95, 48, STYLE.main[0]);
      else big('INSERT COIN', W * 0.5, H * 0.95, 40, STYLE.accent[0]);
      return;
    }
    if (stage === 'RESULT') {
      drawScene();
      game.draw.rect(80, H * 0.2, W - 160, 540, STYLE.main[1], 0.8);
      big(cleared ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.26, 104, cleared ? STYLE.main[0] : STYLE.accent[1]);
      big(reaped + ' / ' + NEEDED, W * 0.5, H * 0.33, 66, STYLE.accent[0]);
      big('SCORE ' + total, W * 0.5, H * 0.38, 48, STYLE.accent[0]);
      big('COMBO ' + best1, W * 0.5, H * 0.42, 40, STYLE.main[0]);
      if (record) big('NEW RECORD', W * 0.5, H * 0.46, 54, STYLE.main[0]);
      else big('BEST ' + (game.best || 0), W * 0.5, H * 0.46, 42, STYLE.accent[0]);
      if (!cleared) big('あと' + (NEEDED - reaped) + '本!', W * 0.5, H * 0.5, 48, STYLE.accent[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W * 0.5, H * 0.94, 40, STYLE.accent[0]);
      return;
    }

    if (ended) {
      endWait -= dt;
      if (endWait <= 0) {
        stage = 'RESULT';
        var st = { reaped: reaped, bestSwing: best1, gold: bonusCount };
        if (cleared) game.end.success(total, st); else game.end.failure(st);
      }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (freezeCue) {
      freezeCue.t -= dt;
      if (freezeCue.t <= 0) chipResolve(true);
    } else {
      fieldTick(dt);
      secs -= dt;
      if (secs <= 0) {
        secs = 0; drag = null;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: STYLE.accent[1], size: 84 });
        wrapUp();
      }
    }

    drawScene();
    big(reaped + ' / ' + NEEDED, W * 0.5, 80, 62, STYLE.accent[0]);
    var fr = Math.max(0, secs / TIME_LIMIT);
    game.draw.rect(76, 146, W - 152, 28, STYLE.main[1]);
    game.draw.rect(80, 150, (W - 160) * fr, 20, secs < 4 ? STYLE.accent[1] : STYLE.main[0]);
    if (countIn > 0) big(countIn > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.45, 110, STYLE.main[0]);
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 2],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: true });
    stage = 'ATTRACT';
    freshField();
  });
})(game);
