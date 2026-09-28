// J-N6434-0054-crackline-floe-crossing.js
// ひびよみ氷渡り — 目の前の氷板のうち、ひびが「走っている」方を見抜き、止まっている方へ跳んで対岸へ
// 操作: 前方に並ぶ氷板のどれかをタップして跳び移る(ひびが伸び続けている板は割れる)
// 終わり: 6枚渡って対岸に着けば成功。割れる板を選ぶ/迷って足元が割れる/時間切れで失敗
// @mechanic: judge
// @theme: thawing_moat_crackline
// 世界観: 春先の凍った堀を、氷切り職人の見習いが夜明け前に渡る。ひびの長さではなく伸びていくかどうかを読み、割れない氷板だけを選んで対岸の小屋へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った枚数・PERFECT数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + 帯状のカラーセロハン(上=琥珀、中=水色)
  var STYLE = { bg: ['#07090d', '#141a24'], main: ['#f2f2f2', '#9aa3ad'], accent: ['#7fe7ff', '#ffb347'] };
  var C = { ice: '#e9eef2', iceDim: '#8d98a3', crack: '#07090d', white: '#ffffff', cyan: '#7fe7ff', amber: '#ffb347', bad: '#ff5a5a', good: '#8dff9c' };

  var GAME_TITLE = 'CRACKLINE';
  var TIME_LIMIT = 13;
  var NEEDED = 6;
  var DECIDE = [2.6, 2.4, 2.2, 2.0, 1.85, 1.7];
  var ROW_GAP = H * 0.25;
  var CUR_Y = H * 0.79;
  var SLAB_H = 170;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var step, rows, curX, decideT, hop, timeLeft, ready, hitStop, finished, ok, done, endWait;
  var perfects, score, breakSlab, creakT, scroll, curSlab;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  var CUTTER_A = ['..hhh..', '.hhhhh.', '..fff..', '.bbbbb.', 'b.bbb.b', '..b.b..', '.bb.bb.'];
  var CUTTER_B = ['..hhh..', '.hhhhh.', '..fff..', 'bbbbbbb', '..bbb..', '..b.b..', '..b.b..'];
  var CUTTER_PAL = { h: '#ffb347', f: '#f2f2f2', b: '#e9eef2' };
  var HUT = ['...ww...', '..wwww..', '.wwwwww.', 'wwwwwwww', '.w.ww.w.', '.w.dd.w.', '.wwddww.'];
  var HUT_PAL = { w: '#e9eef2', d: '#ffb347' };
  var HERON_A = ['..ww', '.ww.', 'www.', '.ww.', '.w..', '.w..'];
  var HERON_B = ['.ww.', '.ww.', 'www.', '.ww.', '..w.', '.w..'];

  // ひびの折れ線を作る(板の中心からの相対座標)
  function makeCrack(w, h, fromLeft) {
    var pts = [];
    var n = 6;
    var y0 = game.random(-h * 0.3, h * 0.3);
    for (var i = 0; i <= n; i++) {
      var f = i / n;
      var x = (fromLeft ? -1 : 1) * (w / 2) * (1 - 2 * f);
      pts.push([x, y0 + game.random(-h * 0.32, h * 0.32) * (i === 0 || i === n ? 0.4 : 1)]);
    }
    return pts;
  }

  function makeRow(idx) {
    var n = idx >= 3 ? 3 : 2;
    var xs = n === 2 ? [320, 760] : [200, 540, 880];
    var w = n === 2 ? 290 : 240;
    var doomed = Math.floor(game.random(0, n));
    if (doomed >= n) doomed = n - 1;
    var slabs = [];
    for (var i = 0; i < n; i++) {
      var cracks = [];
      if (i === doomed) {
        cracks.push({ pts: makeCrack(w, SLAB_H, game.random(0, 1) < 0.5), grow: true, p0: 0.12 + idx * 0.02, p: 0.12 });
      } else {
        var decoy = 0.3 + Math.min(0.45, idx * 0.08) + game.random(0, 0.1);
        cracks.push({ pts: makeCrack(w, SLAB_H, game.random(0, 1) < 0.5), grow: false, p0: decoy, p: decoy });
        if (idx >= 2) cracks.push({ pts: makeCrack(w * 0.6, SLAB_H * 0.6, game.random(0, 1) < 0.5), grow: false, p0: 0.5, p: 0.5 });
      }
      slabs.push({ x: xs[i] + game.random(-18, 18), w: w, doomed: i === doomed, cracks: cracks, wob: game.random(0, 6) });
    }
    return slabs;
  }

  function initGame() {
    step = 0; curX = W / 2; decideT = 0; hop = null; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0; perfects = 0; score = 0; breakSlab = null; creakT = 0; scroll = 0;
    curSlab = { x: W / 2, w: 300, cracks: [], wob: 1 };
    rows = [[curSlab], makeRow(0)];
  }

  function drawCrack(cx, cy, cr, thick) {
    var pts = cr.pts;
    var total = pts.length - 1;
    var upto = cr.p * total;
    for (var i = 0; i < total; i++) {
      if (i >= upto) break;
      var f = Math.min(1, upto - i);
      var ax = cx + pts[i][0], ay = cy + pts[i][1];
      var bx = cx + pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f;
      var by = cy + pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      game.draw.line(ax, ay, bx, by, C.crack, thick);
      if (i + 1 > upto - 1 && cr.grow && cr.p < 1) game.draw.circle(bx, by, 5 + Math.random() * 3, C.white, 0.9);
    }
  }

  function drawSlab(s, y, t, dim) {
    var wob = Math.sin(t * 1.7 + s.wob) * 3;
    var hw = s.w / 2, hh = SLAB_H / 2;
    // 横ストリップで塗る(ドット感のため2px間隔)
    for (var yy = -hh; yy < hh; yy += 6) {
      var inset = Math.abs(yy) > hh - 18 ? 14 : 0;
      game.draw.rect(s.x - hw + inset, y + yy + wob, s.w - inset * 2, 4, dim ? C.iceDim : C.ice, dim ? 0.5 : 0.95);
    }
    if (!dim) for (var c = 0; c < s.cracks.length; c++) drawCrack(s.x, y + wob, s.cracks[c], s.cracks[c].grow ? 7 : 6);
  }

  // 選ぶ — プレイもデモもここを通る
  function choose(i, live) {
    if (hop || finished) return;
    var s = rows[1][i];
    var early = decideT < DECIDE[Math.min(step, DECIDE.length - 1)] * 0.45;
    hop = { fromX: curX, idx: i, t: 0, good: !s.doomed };
    if (live) game.audio.play('se_jump', 0.4);
    if (!s.doomed) {
      if (early) perfects++;
      score += early ? 150 : 100;
      if (live) game.feedback.good(s.x, CUR_Y - ROW_GAP - 60, { text: early ? 'PERFECT' : 'GOOD', color: early ? C.cyan : C.good });
    }
  }

  function failAt(x, y) {
    finished = true; ok = false; hitStop = 0.5;
    breakSlab = { x: x, y: y, t: 0 };
  }

  function stepPlay(dt, live) {
    if (hop) {
      hop.t += dt;
      scroll = Math.min(1, hop.t / 0.4);
      if (hop.t >= 0.4) {
        var s = rows[1][hop.idx];
        curX = s.x; curSlab = s;
        if (!hop.good) {
          hop = null; scroll = 0;
          rows = [[curSlab], []];
          failAt(curX, CUR_Y);
          if (live) game.audio.play('se_break', 0.6);
          return;
        }
        step++;
        hop = null; scroll = 0; decideT = 0;
        for (var q = 0; q < curSlab.cracks.length; q++) curSlab.cracks[q].grow = false;
        if (live && step === 3) { game.audio.play('se_milestone', 0.5); game.fx.popup(step + ' / ' + NEEDED, W / 2, H * 0.36, { color: C.amber, size: 60 }); }
        if (step >= NEEDED) {
          finished = true; ok = true; hitStop = 0.4;
          score += Math.round(timeLeft * 30);
          if (live) game.feedback.good(curX, CUR_Y - 40, { text: 'CLEAR', color: C.good, count: 26 });
          return;
        }
        rows = [[curSlab], makeRow(step)];
      }
      return;
    }
    decideT += dt;
    var lim = DECIDE[Math.min(step, DECIDE.length - 1)];
    var row = rows[1];
    for (var i = 0; i < row.length; i++) {
      for (var c = 0; c < row[i].cracks.length; c++) {
        var cr = row[i].cracks[c];
        if (cr.grow) cr.p = Math.min(1, cr.p0 + (1 - cr.p0) * (decideT / (lim * 0.85)));
      }
    }
    if (live) {
      creakT -= dt;
      if (creakT <= 0) { creakT = 0.32; game.audio.tone(140 + Math.random() * 40, 0.06, { wave: 'square', volume: 0.03 }); }
      if (decideT > lim - 0.7 && Math.floor(decideT * 10) % 3 === 0) game.audio.tone(90, 0.05, { wave: 'sawtooth', volume: 0.04 });
      if (decideT >= lim) { failAt(curX, CUR_Y); game.audio.play('se_break', 0.6); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0 || hop) { game.audio.play('se_tap', 0.1); return; }
    var ry = CUR_Y - ROW_GAP;
    for (var i = 0; i < rows[1].length; i++) {
      var s = rows[1][i];
      if (Math.abs(x - s.x) < s.w / 2 + 24 && Math.abs(y - ry) < SLAB_H / 2 + 60) {
        game.audio.play('se_tap', 0.3);
        choose(i, true);
        return;
      }
    }
    game.fx.burst(x, y, { color: C.iceDim, count: 4, speed: 90 });
    game.audio.play('se_tap', 0.08);
  });

  // ── ATTRACT: AI が本物の choose/stepPlay で3枚正解 → 4枚目で割れる板を踏む ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, picks: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.picks = 0; }
    if (finished) {
      if (breakSlab) breakSlab.t += dt;
      demo.press = false;
      return;
    }
    stepPlay(dt, false);
    if (!hop && rows && rows[1]) {
      var wantBad = demo.picks >= 3;
      var target = 0;
      for (var i = 0; i < rows[1].length; i++) if (rows[1][i].doomed === wantBad) target = i;
      var ts = rows[1][target];
      var ty = CUR_Y - ROW_GAP;
      var k = Math.min(1, decideT / 0.8);
      demo.gx = curX + (ts.x - curX) * k;
      demo.gy = CUR_Y + (ty - CUR_Y) * k + 40;
      demo.press = decideT > 0.75;
      if (decideT > 0.9) { choose(target, false); demo.picks++; }
    }
  }

  function drawScene(t) {
    var pulse = 0.05 + 0.04 * Math.sin(t * 1.2);
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.55, '#0c121b'], [1, STYLE.bg[0]]]);
    // 水面のドット(遠景)
    for (var j = 0; j < 60; j++) {
      var dx = (j * 173 + t * 12 * (j % 3 + 1)) % W;
      var dy = H * 0.15 + ((j * 97) % Math.floor(H * 0.8));
      game.draw.rect(dx, dy, 6, 6, C.iceDim, 0.25 + 0.15 * Math.sin(t * 2 + j));
    }
    // 対岸(ゴールが近づくと降りてくる)
    var shoreY = CUR_Y - ROW_GAP * (NEEDED - step + 0.9) + scroll * ROW_GAP;
    if (shoreY > -120) {
      game.draw.rect(0, shoreY - 60, W, 130, C.iceDim, 0.5);
      game.draw.sprite(HUT, HUT_PAL, W * 0.72, shoreY - 40, 14, { anchor: 'center' });
    }
    // 遠景の見物サギ(演出AI)
    game.draw.sprite(Math.floor(t * 1.6) % 2 ? HERON_A : HERON_B, { w: '#9aa3ad' }, 70, H * 0.3 + Math.sin(t) * 8, 12, { anchor: 'center' });
    var off = scroll * ROW_GAP;
    // 先の列(シルエット)
    game.draw.rect(W * 0.3, CUR_Y - ROW_GAP * 2 + off - 40, W * 0.4, 80, C.iceDim, 0.18);
    // 選択肢の列
    if (rows) {
      for (var i = 0; i < rows[1].length; i++) drawSlab(rows[1][i], CUR_Y - ROW_GAP + off, t, false);
    }
    // 足元の板(割れたら左右に分かれて沈む)
    if (!breakSlab) drawSlab(curSlab, CUR_Y + off, t, false);
    var lim = DECIDE[Math.min(step, DECIDE.length - 1)];
    if (!finished && !hop && decideT > lim - 0.7 && Math.floor(t * 12) % 2 === 0) {
      game.draw.line(curX - 120, CUR_Y + off, curX + 110, CUR_Y + off + 30, C.bad, 8);
    }
    // セロハン帯
    game.draw.rect(0, H * 0.43, W, H * 0.2, C.cyan, 0.08 + pulse * 0.4);
    game.draw.rect(0, 0, W, H * 0.12, C.amber, 0.08);
  }

  function drawCutter(t) {
    var px = curX, py = CUR_Y - 110;
    if (hop) {
      var s = rows[1][hop.idx];
      var k = Math.min(1, hop.t / 0.4);
      px = hop.fromX + (s.x - hop.fromX) * k;
      py = CUR_Y - 110 - Math.sin(k * Math.PI) * 120;
    }
    var fr = Math.floor(t * 3) % 2 ? CUTTER_A : CUTTER_B;
    if (breakSlab) {
      var k2 = breakSlab.t;
      game.draw.circle(breakSlab.x, breakSlab.y, 90 + k2 * 160, C.white, Math.max(0, 0.8 - k2));
      game.draw.rect(breakSlab.x - 150 - k2 * 90, breakSlab.y - 50, 130, 100, C.ice, Math.max(0, 1 - k2));
      game.draw.rect(breakSlab.x + 20 + k2 * 90, breakSlab.y - 50, 130, 100, C.ice, Math.max(0, 1 - k2));
      py += k2 * 120;
    }
    game.draw.sprite(fr, CUTTER_PAL, px + Math.sin(t * 2.3) * 3, py + Math.sin(t * 3.1) * 4, 14, { anchor: 'center' });
  }

  function drawHud() {
    txt(step + ' / ' + NEEDED, W / 2, 80, 64, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 18, C.iceDim, 0.5);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowTime ? C.bad : C.amber);
    if (!finished && !hop) {
      var lim = DECIDE[Math.min(step, DECIDE.length - 1)];
      var r = Math.max(0, 1 - decideT / lim);
      game.draw.rect(W / 2 - 220, H * 0.9, 440, 20, C.iceDim, 0.4);
      game.draw.rect(W / 2 - 220, H * 0.9, 440 * r, 20, r < 0.3 ? C.bad : C.cyan);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (rows === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawCutter(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 76, C.white);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.11, 34, C.amber);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 46, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.95, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(0, H * 0.34, W, H * 0.3, '#000000', 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.good : C.bad);
      txt(step + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.47, 42, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 46, C.amber);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.59, 44, C.cyan);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      } else {
        txt('あと' + (NEEDED - step) + '枚!', W / 2, H * 0.53, 50, C.amber);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.59, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { floes: step, perfect: perfects }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ floes: step, perfect: perfects }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (breakSlab) breakSlab.t += dt;
      if (hitStop <= 0) {
        if (!ok) game.feedback.bad(curX, CUR_Y - 80, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepPlay(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; failAt(curX, CUR_Y); game.audio.play('se_break', 0.6); }
    } else if (breakSlab) {
      breakSlab.t += dt;
    }

    drawScene(t);
    drawCutter(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, C.amber);
  });

  function music() {
    game.audio.melody([['E4', 1], ['G4', 0.5], ['B4', 0.5], ['A4', 1], ['E4', 1], ['D4', 0.5], ['F#4', 0.5], ['E4', 2]], { tempo: 100, wave: 'triangle', volume: 0.05, loop: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
