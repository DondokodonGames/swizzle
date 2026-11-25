// J-3DSDSDSTOP10-0016-paper-doll-screen-dash.js
// 紙人形の屏風くぐり — 長い回廊を走る紙の人形が、迫る障子の切り抜き穴に合わせて体を縦長・横長に伸ばして通り抜ける
// 操作: 上下にドラッグすると人形が縦長(上)/横長(下)に伸び縮みする(上半分/下半分のタップでも一段変わる)。穴に収まる形で障子に届けば通過
// 終わり: 障子12枚を抜ければCLEAR(残り時間がタイム)。形が合わず3回破る/時間切れでGAME OVER
// @mechanic: gap_fit
// @theme: paper_doll_corridor_run
// 世界観: 夕暮れの長い寺の回廊を、命を吹き込まれた紙の人形が駆け抜け、次々に迫る障子の切り抜き穴に合わせて体を細く高く・低く広く伸ばし、破らずに奥の間まで一番乗りを目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 通り抜けた枚数・ぴったり(PERFECT)数・ゴールタイム
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、接地影で位置を示す
  var STYLE = {
    bg: ['#ffb870', '#ffe2b0', '#6b3f1d'],
    main: ['#f7f1e1', '#8b5a2b', '#5b3a1e'],
    accent: ['#e0433a', '#3aa3e0'],
  };
  var SKY1 = '#ff9f5a', SKY2 = '#ffe2b0', WOOD = '#8b5a2b', WOOD2 = '#a36b36', DARK = '#5b3a1e', PAPER = '#f7f1e1';
  var SEAL = '#e0433a', BLUEI = '#3aa3e0', GOLD = '#ffd23a', INK = '#2a1a0c';

  var GAME_TITLE = 'PAPER DASH';
  var TIME_LIMIT = 20;
  var NEEDED = 12;
  var STRIKES = 3;
  var VPX = W / 2, VPY = Math.round(H * 0.34);
  var FLOOR_Y = Math.round(H * 0.72);
  var AREA = 170 * 170;
  var R_MIN = 0.3, R_MAX = 3.3;
  var TARGETS = [0.38, 0.6, 1.0, 1.7, 2.8];

  var FACE = ['.kk.kk.', '.......', '..rrr..', '...r...'];
  var FACE_PAL = { k: INK, r: SEAL };
  var LANTERN = ['.dd.', 'yyyy', 'yyyy', 'yyyy', '.dd.'];
  var LANTERN_PAL = { d: DARK, y: GOLD };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var q = null;

  function sign(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function initGame() {
    q = {
      ratio: 1, walls: [], spawnT: 0.4, spawned: 0, passed: 0, perfect: 0, strikes: 0,
      speed: 1, run: 0, lastTarget: 1, clock: 0, torn: 0,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, hl: null,
      finished: false, done: false, ok: false, endWait: 0, dragY: null, mile: false,
    };
  }

  function dollSize(r) { return { w: Math.sqrt(AREA / r), h: Math.sqrt(AREA * r) }; }

  function slack() { return Math.max(1.12, 1.22 - q.passed * 0.01); }

  function spawnWall() {
    var t;
    do { t = TARGETS[Math.floor(Math.random() * TARGETS.length)]; } while (t === q.lastTarget);
    q.lastTarget = t;
    var d = dollSize(t), sl = slack();
    q.walls.push({ p: 0, target: t, sl: sl, hw: d.w * sl, hh: d.h * sl, done: false, fit: false, fade: 0 });
    q.spawned++;
  }

  function approachTime() { return Math.max(1.35, 2.1 - q.passed * 0.06); }

  function setRatio(r) {
    q.ratio = Math.max(R_MIN, Math.min(R_MAX, r));
  }

  function scaleAt(p) { return 1 / (1 + (1 - p) * 9); }

  function judgeWall(wl) {
    wl.done = true;
    var d = dollSize(q.ratio);
    var fits = d.w <= wl.hw && d.h <= wl.hh;
    var cx = VPX, cy = FLOOR_Y - d.h / 2;
    if (fits) {
      q.passed++; q.run++;
      wl.fit = true;
      var snug = Math.abs(Math.log(q.ratio / wl.target)) < 0.12;
      if (snug) q.perfect++;
      game.feedback.good(cx, cy - d.h / 2 - 40, { text: snug ? 'PERFECT' : 'GOOD', color: snug ? GOLD : BLUEI, count: 12 });
      if (q.passed === NEEDED / 2 && !q.mile) {
        q.mile = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(q.passed + ' / ' + NEEDED, W / 2, VPY - 80, { color: GOLD, size: 64 });
      }
      if (q.passed >= NEEDED) { q.finished = true; q.ok = true; q.hitStop = 0.3; q.hl = wl; finish(); }
    } else {
      q.strikes++; q.run = 0; q.torn = 0.6;
      q.hitStop = 0.4; q.hl = wl;
      game.audio.play('se_break', 0.5);
      game.feedback.bad(cx, cy, { text: 'MISS', color: SEAL });
      if (q.strikes >= STRIKES) { q.finished = true; q.ok = false; finish(); }
    }
  }

  function finish() {
    if (q.done) return;
    q.done = true; q.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(q.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function advance(dt) {
    if (q.hitStop > 0) { q.hitStop -= dt; return; }
    if (q.torn > 0) q.torn -= dt;
    q.clock += dt;
    if (q.finished) return;
    q.spawnT -= dt;
    if (q.spawnT <= 0 && q.spawned < NEEDED + STRIKES) {
      spawnWall();
      q.spawnT = Math.max(0.95, 1.5 - q.passed * 0.04);
    }
    var at = approachTime();
    for (var i = 0; i < q.walls.length; i++) {
      var wl = q.walls[i];
      wl.p += dt / at;
      if (!wl.done && wl.p >= 1) { judgeWall(wl); if (q.hitStop > 0) break; }
      if (wl.done) wl.fade += dt;
    }
    q.walls = q.walls.filter(function (w2) { return w2.fade < 0.35; });
  }

  // ── 描画 ─────────────────────────────────────────
  function drawCorridor() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FLOOR_Y, [[0, SKY1], [0.7, SKY2], [1, '#fff3da']]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.3));
    // 床(奥へ収束する板目。横1pxストリップの代わりに帯で塗る)
    for (var s = 0; s < 18; s++) {
      var y0 = VPY + (H - VPY) * Math.pow(s / 18, 2);
      var y1 = VPY + (H - VPY) * Math.pow((s + 1) / 18, 2);
      var scroll = Math.floor(q.clock * 6 * q.speed + s) % 2;
      game.draw.rect(0, y0, W, y1 - y0 + 1, scroll ? WOOD : WOOD2);
    }
    for (var k = -4; k <= 4; k++) game.draw.line(VPX, VPY, VPX + k * 300, H, DARK, 3);
    // 柱と提灯(奥ほど小さい)
    for (var c = 0; c < 5; c++) {
      var ph = ((c / 5) + q.clock * 0.35) % 1;
      var sc = scaleAt(ph);
      var off = 620 * sc;
      var top = VPY - 700 * sc, bot = VPY + (FLOOR_Y - VPY) * sc;
      game.draw.rect(VPX - off - 30 * sc, top, 60 * sc, bot - top, DARK);
      game.draw.rect(VPX + off - 30 * sc, top, 60 * sc, bot - top, DARK);
      game.draw.sprite(LANTERN, LANTERN_PAL, VPX - off + 60 * sc, top + 120 * sc + Math.sin(t * 2 + c) * 6 * sc, Math.max(2, 18 * sc), { anchor: 'center' });
      game.draw.sprite(LANTERN, LANTERN_PAL, VPX + off - 60 * sc, top + 120 * sc + Math.cos(t * 2 + c) * 6 * sc, Math.max(2, 18 * sc), { anchor: 'center' });
    }
  }

  function drawWall(wl) {
    var sc = scaleAt(Math.min(1, wl.p));
    var bot = VPY + (FLOOR_Y - VPY) * sc;
    var ww = 1040 * sc, wh = 1150 * sc;
    var left = VPX - ww / 2, top = bot - wh;
    var hw = wl.hw * sc, hh = wl.hh * sc;
    var hl = VPX - hw / 2, ht = bot - hh;
    var hot = q.hl === wl && q.hitStop > 0;
    var paper = hot ? '#ffffff' : PAPER;
    var alpha = wl.done ? Math.max(0, 1 - wl.fade / 0.35) : 1;
    if (wl.done && wl.fit) return;
    // 穴の周りの4枚
    game.draw.rect(left, top, ww, ht - top, paper, alpha);
    game.draw.rect(left, ht, hl - left, bot - ht, paper, alpha);
    game.draw.rect(hl + hw, ht, left + ww - hl - hw, bot - ht, paper, alpha);
    // 桟(格子)
    var fr = Math.max(1, 10 * sc);
    for (var gx = 1; gx < 6; gx++) {
      var xx = left + gx * ww / 6;
      if (xx < hl || xx > hl + hw) game.draw.line(xx, top, xx, bot, DARK, fr * 0.5);
      else game.draw.line(xx, top, xx, ht, DARK, fr * 0.5);
    }
    for (var gy = 1; gy < 6; gy++) {
      var yy = top + gy * wh / 6;
      if (yy < ht) game.draw.line(left, yy, left + ww, yy, DARK, fr * 0.5);
      else { game.draw.line(left, yy, hl, yy, DARK, fr * 0.5); game.draw.line(hl + hw, yy, left + ww, yy, DARK, fr * 0.5); }
    }
    game.draw.line(left, top, left + ww, top, DARK, fr);
    game.draw.line(left, top, left, bot, DARK, fr);
    game.draw.line(left + ww, top, left + ww, bot, DARK, fr);
    // 穴の縁(近づくほど明るく点滅して予告)
    var near = wl.p > 0.6 && !wl.done && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var edge = near ? GOLD : SEAL;
    game.draw.line(hl, ht, hl + hw, ht, edge, fr);
    game.draw.line(hl, ht, hl, bot, edge, fr);
    game.draw.line(hl + hw, ht, hl + hw, bot, edge, fr);
  }

  function drawDoll() {
    var t = game.time.elapsed;
    var d = dollSize(q.ratio);
    var run = Math.sin(q.clock * 16) * 6;
    var x = VPX + Math.sin(t * 1.7) * 4, bot = FLOOR_Y + Math.abs(run) * 0.5;
    game.draw.circle(x, FLOOR_Y + 14, d.w * 0.55, INK, 0.25);
    var torn = q.torn > 0;
    game.draw.rect(x - d.w / 2 - 5, bot - d.h - 5, d.w + 10, d.h + 10, INK);
    game.draw.rect(x - d.w / 2, bot - d.h, d.w, d.h, torn ? '#ffd0c8' : '#ffffff');
    game.draw.line(x - d.w / 2, bot - d.h * 0.45, x + d.w / 2, bot - d.h * 0.45, SEAL, 6);
    // 足(走り)
    game.draw.line(x - d.w * 0.2, bot, x - d.w * 0.2 + run, bot + 26, INK, 8);
    game.draw.line(x + d.w * 0.2, bot, x + d.w * 0.2 - run, bot + 26, INK, 8);
    var fs = Math.max(6, Math.min(16, d.w / 9));
    game.draw.sprite(FACE, FACE_PAL, x, bot - d.h * 0.72, fs, { anchor: 'center' });
    if (torn) game.draw.line(x - d.w / 2, bot - d.h, x + d.w / 3, bot - d.h * 0.3, SEAL, 5);
  }

  function nextWall() {
    var best = null;
    for (var i = 0; i < q.walls.length; i++) if (!q.walls[i].done && (!best || q.walls[i].p > best.p)) best = q.walls[i];
    return best;
  }

  function drawGauge() {
    // 右端の形ゲージ: 今の形(白)と次の穴の許容帯(金)
    var gx = W - 90, gt = Math.round(H * 0.3), gb = Math.round(H * 0.68);
    function yOf(r) { return gb - (Math.log(r / R_MIN) / Math.log(R_MAX / R_MIN)) * (gb - gt); }
    game.draw.rect(gx - 22, gt - 10, 44, gb - gt + 20, INK, 0.6);
    var nw = nextWall();
    if (nw) {
      var lo = nw.target / (nw.sl * nw.sl), hi = nw.target * nw.sl * nw.sl;
      game.draw.rect(gx - 18, yOf(hi), 36, yOf(lo) - yOf(hi), GOLD, 0.8);
    }
    game.draw.rect(gx - 30, yOf(q.ratio) - 7, 60, 14, '#ffffff');
  }

  function scoreOf() { return q.passed * 200 + q.perfect * 80 + (q.ok ? Math.round(q.timeLeft * 100) : 0); }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, INK, 0.75);
    sign(q.passed + ' / ' + NEEDED, 210, 90, 60, PAPER);
    for (var s = 0; s < STRIKES; s++) game.draw.rect(W - 300 + s * 80, 66, 50, 50, s < q.strikes ? SEAL : '#6b5a48');
    var frac = Math.max(0, q.timeLeft / TIME_LIMIT);
    var low = q.timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 162, W - 120, 22, '#6b5a48');
    game.draw.rect(60, 162, (W - 120) * frac, 22, low ? SEAL : GOLD);
    // 親指ゾーン: 上下ドラッグの溝
    var zy = Math.round(H * 0.84);
    game.draw.rect(W / 2 - 60, zy - 120, 120, 240, INK, 0.35);
    game.draw.rect(W / 2 - 46, zy - 106 + (1 - Math.log(q.ratio / R_MIN) / Math.log(R_MAX / R_MIN)) * 180, 92, 32, PAPER);
  }

  function drawResult() {
    game.draw.rect(90, 620, W - 180, 520, INK, 0.9);
    sign(q.ok ? 'CLEAR' : 'GAME OVER', W / 2, 720, 92, q.ok ? GOLD : SEAL);
    sign(q.passed + ' / ' + NEEDED, W / 2, 840, 64, PAPER);
    sign(q.ok ? (TIME_LIMIT - q.timeLeft).toFixed(2) + '秒' : 'PERFECT ' + q.perfect, W / 2, 930, 46, BLUEI);
    var sc = scoreOf();
    if (q.ok && sc > game.best) sign('NEW RECORD', W / 2, 1015, 52, GOLD);
    else if (!q.ok) sign('あと' + (NEEDED - q.passed) + '枚!', W / 2, 1015, 52, GOLD);
    sign('BEST ' + Math.max(game.best, q.ok ? sc : 0), W / 2, 1090, 36, PAPER);
  }

  function drawScene() {
    drawCorridor();
    var sorted = q.walls.slice().sort(function (a, c) { return a.p - c.p; });
    for (var i = 0; i < sorted.length; i++) if (sorted[i].p < 1) drawWall(sorted[i]);
    drawDoll();
    for (var j = 0; j < sorted.length; j++) if (sorted[j].p >= 1) drawWall(sorted[j]);
    drawGauge();
  }

  // ── ATTRACT: AI が同じ setRatio で次の穴へ形を寄せる(終盤で1枚わざと遅れて破る)──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.8;
    if (cyc < dt || demo.t <= dt) { initGame(); q.ready = 0; q.spawnT = 0.1; }
    var nw = nextWall();
    demo.press = false;
    if (nw && nw.p > 0.35 && !(cyc > 4.6 && cyc < 6.2)) {
      var goal = nw.target;
      var nr = q.ratio * Math.exp(Math.max(-2.2 * dt, Math.min(2.2 * dt, Math.log(goal / q.ratio))));
      if (Math.abs(Math.log(goal / q.ratio)) > 0.03) demo.press = true;
      setRatio(nr);
    }
    var zy = H * 0.84;
    demo.gy = zy - 90 + (1 - Math.log(q.ratio / R_MIN) / Math.log(R_MAX / R_MIN)) * 180;
    demo.gx = W / 2 + 20;
    advance(dt);
    q.timeLeft = Math.max(0, TIME_LIMIT - q.clock);
    if (q.done) { q.done = false; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); music();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (q.ready > 0 || q.done) { game.audio.play('se_tap', 0.1); return; }
    // タップは一段ずつ: 上半分=縦長へ、下半分=横長へ
    setRatio(q.ratio * (y < H * 0.5 ? 1.45 : 1 / 1.45));
    game.audio.tone(y < H * 0.5 ? 'A5' : 'D5', 0.05, { wave: 'triangle', volume: 0.05 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    q.dragY = y;
    game.audio.play('se_tap', 0.12);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || q.dragY === null || q.finished) return;
    var dy = y - q.dragY;
    q.dragY = y;
    var before = q.ratio;
    setRatio(q.ratio * Math.exp(-dy * 0.006));
    if (Math.floor(Math.log(before) * 8) !== Math.floor(Math.log(q.ratio) * 8)) game.audio.tone(300 + q.ratio * 120, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function () { if (state === S.PLAYING) { q.dragY = null; game.audio.tone('G4', 0.03, { wave: 'sine', volume: 0.02 }); } });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!q) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 225, INK, 0.75);
      sign(GAME_TITLE, W / 2, H * 0.045, 84, GOLD);
      sign('HI-SCORE ' + game.best, W / 2, 170, 34, PAPER);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) sign('► 100円 投入 ◄', W / 2, H * 0.94, 48, GOLD);
      else sign('INSERT COIN', W / 2, H * 0.94, 42, PAPER);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) sign('TAP TO CONTINUE', W / 2, H * 0.965, 38, PAPER);
      return;
    }

    if (q.done) {
      q.endWait -= dt;
      if (q.hitStop > 0) q.hitStop -= dt;
      if (q.endWait <= 0) {
        state = S.RESULT;
        var stats = { passed: q.passed, perfect: q.perfect, strikes: q.strikes, time: Math.round((TIME_LIMIT - q.timeLeft) * 100) / 100 };
        if (q.ok) game.end.success(scoreOf(), stats);
        else game.end.failure(stats);
      }
    } else if (q.ready > 0) {
      q.ready -= dt;
      if (q.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (q.hitStop <= 0) q.timeLeft -= dt;
      if (q.timeLeft <= 0 && !q.finished) {
        q.timeLeft = 0; q.finished = true; q.ok = false; q.hitStop = 0.4;
        game.feedback.bad(VPX, FLOOR_Y - 200, { text: 'TIME UP' });
        finish();
      } else {
        advance(dt);
      }
    }

    drawScene();
    drawHud();
    if (q.ready > 0) sign(q.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, GOLD);
    if (q.done) drawResult();
  });

  function music() {
    game.audio.melody(
      [['D5', 0.5], ['E5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 1], ['A4', 1]],
      { tempo: 160, wave: 'triangle', volume: 0.06, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] }
    );
  }

  game.onStart(function () {
    music();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
