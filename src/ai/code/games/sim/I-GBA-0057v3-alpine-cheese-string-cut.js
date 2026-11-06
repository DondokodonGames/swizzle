// I-GBA-0057v3-alpine-cheese-string-cut.js
// チーズの糸切り — 大鍋から持ち上げた練りチーズに伸びる糸を、素早い一振りの線で断ち切って切り離す
// 操作: 伸びた糸を横切るように指を素早く払う(へらの一振り)。ゆっくりなぞると糸はたわむだけで切れない。持ち上げたチーズの塊そのものを払うと塊が欠けてしまう
// 終わり: 4回の持ち上げを終えた時点でチーズ輪が残っていればCLEAR。糸を切り切れずに塊が鍋へ戻る/塊を欠くとチーズ輪を1つ失い、3つ失うとGAME OVER
// @mechanic: slice
// @theme: alpine_cheese_string_cut
// 世界観: 山のチーズ工房で、髭のチーズ職人が銅の大鍋から木のフォークで持ち上げた練りチーズの、鍋へ伸びて垂れる糸をへらで一振りずつ断ち切って塊を切り離す
// 残るもの: 正誤(CLEAR/GAME OVER) + 切った糸の本数・一振りで複数切った回数・スコア
// スタイル: HD POST 3D

(function (game) {
  var STYLE = { bg: ['#211c18', '#3e342c', '#5e4f42'], main: ['#e3c26e', '#b07a44', '#8a7866'], accent: ['#fff0bf', '#c4553e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SOOT = STYLE.bg[0], BARN = STYLE.bg[1], BEAM = STYLE.bg[2];
  var CHEESE = STYLE.main[0], COPPER = STYLE.main[1], ASH = STYLE.main[2];
  var GLOW = STYLE.accent[0], EMBER = STYLE.accent[1];
  var CHEESE_DK = '#b8963e', COPPER_DK = '#5e3820', WOOD = '#7a5a3c', PAPER = '#f2e8d2';

  var TITLE = 'CHEESE CUT';
  var ROUNDS = [
    { n: 2, time: 3.0, sway: 10, cross: false },
    { n: 3, time: 3.0, sway: 22, cross: false },
    { n: 4, time: 3.0, sway: 30, cross: true },
    { n: 5, time: 3.2, sway: 40, cross: true },
  ];
  var TIME_LIMIT = 12.2;
  var WHEELS = 3;
  var CUT_SPEED = 1500;
  var VAT_Y = H * 0.64;
  var WARN_T = 0.7;

  var CHEF_HOLD = [
    '....cccc....', '...cccccc...', '...ssssss...', '...sesses...', '...smmmms...', 'aa..ssss....', '.aawwwwww...',
    '..avvwwvv...', '...vvwwvv...', '...vvvvvv...', '...vvvvvv...', '...pp..pp...', '...pp..pp...', '..bbb..bbb..',
  ];
  var CHEF_STRAIN = [
    '....cccc....', '...cccccc...', '...ssssss...', '...skssks...', '...smmmms...', '..a.ssss....', '.aawwwwww...',
    '..avvwwvv...', '...vvwwvv...', '...vvvvvv...', '...vvvvvv...', '...pp..pp...', '..pp...pp...', '..bbb..bbb..',
  ];
  var CHEF_JOY = [
    '....cccc....', '...cccccc...', '...ssssss...', '...sesses...', '...smttms...', 'a...ssss...a', '.awwwwwwwwa.',
    '...vvwwvv...', '...vvwwvv...', '...vvvvvv...', '...vvvvvv...', '...pp..pp...', '...pp..pp...', '..bbb..bbb..',
  ];
  var CHEF_PAL = { c: PAPER, s: '#d8b08a', e: '#2a1a10', k: '#2a1a10', m: '#5a3e28', a: '#d8b08a', w: PAPER, v: '#7e3426', p: '#3a3028', b: '#241a12', t: '#4a2018' };
  var LUMP = ['....yyyyyy....', '..yyyyyyyyyy..', '.yyyhhyyyyyyy.', 'yyyyyyyyyyyyyy', 'yyyyyyyyyyyyyy', '.yyyyyyyyyyyy.', '...yyyyyyyy...'];
  var LUMP_PX = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, strings, roundT, liftK, wheels, score, cutTotal, multiCuts, dulls, nicks, perfectRound;
  var ready, halt, interlude, over, won, endT, resT, sent, prevBest, stroke, trail, released, board, invul, warnTick, dropped;

  function lumpY() { return H * 0.34 - liftK * H * 0.08; }

  function setupRound(r) {
    var cfg = ROUNDS[r];
    strings = [];
    for (var i = 0; i < cfg.n; i++) {
      var j = cfg.cross ? (cfg.n - 1 - i + (i % 2)) % cfg.n : i;
      strings.push({
        tx: (i - (cfg.n - 1) / 2) * 62, bx: (j - (cfg.n - 1) / 2) * 140,
        ph: i * 1.7, amp: cfg.sway + i * 3, cut: -1, cutT: 0, cutY: 0, bend: 0,
      });
    }
    roundT = cfg.time; liftK = 0; released = 0; dropped = 0; perfectRound = true; warnTick = 0;
  }

  function initGame() {
    round = 0; setupRound(0);
    wheels = WHEELS; score = 0; cutTotal = 0; multiCuts = 0; dulls = 0; nicks = 0;
    ready = 0.8; halt = null; interlude = 0; over = false; won = false; endT = 0; resT = 0; sent = false;
    prevBest = game.best || 0; stroke = null; trail = []; board = []; invul = 0;
  }

  // 糸1本の折れ線(描画と当たり判定で共用)
  function stringPts(s) {
    var top = { x: W / 2 + s.tx, y: lumpY() + 64 };
    var bot = { x: W / 2 + s.bx, y: VAT_Y - 8 };
    var pts = [];
    var wob = Math.sin(game.time.elapsed * 2.2 + s.ph) * s.amp;
    for (var k = 0; k <= 8; k++) {
      var t = k / 8;
      var arc = Math.sin(t * Math.PI);
      pts.push({ x: top.x + (bot.x - top.x) * t + arc * (wob + s.bend), y: top.y + (bot.y - top.y) * t + arc * 26 });
    }
    return pts;
  }

  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
    var den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-6) return -1;
    var u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
    var v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
    if (u < 0 || u > 1 || v < 0 || v > 1) return -1;
    return v;
  }

  function uncut() {
    var n = 0;
    for (var i = 0; i < strings.length; i++) if (strings[i].cut < 0) n++;
    return n;
  }

  // ── へらの一振り(プレイ・デモ共通) ──
  function strokeBegin(x, y) {
    stroke = { x: x, y: y, pts: [{ x: x, y: y, t: game.time.elapsed }], cuts: 0, dull: false };
  }

  function strokeMove(x, y, vol) {
    if (!stroke) return;
    var v = vol || 1;
    var now = game.time.elapsed;
    stroke.pts.push({ x: x, y: y, t: now });
    while (stroke.pts.length > 2 && now - stroke.pts[0].t > 0.08) stroke.pts.shift();
    var o = stroke.pts[0];
    var speed = Math.hypot(x - o.x, y - o.y) / Math.max(0.016, now - o.t);
    trail.push({ x: x, y: y, t: now, fast: speed >= CUT_SPEED });
    var px = stroke.x, py = stroke.y;
    stroke.x = x; stroke.y = y;
    // 塊を払った(欠けた)
    var ly = lumpY();
    var hitLump = segHit(px, py, x, y, W / 2, ly - 60, W / 2, ly + 40) >= 0 || segHit(px, py, x, y, W / 2 - 140, ly, W / 2 + 140, ly) >= 0;
    if (invul <= 0 && speed >= CUT_SPEED && released <= 0 && dropped <= 0 && hitLump) {
      game.audio.tone(150, 0.18, { wave: 'sawtooth', volume: 0.12 * v, slide: -80 });
      game.fx.flash('#ffffff', 0.12);
      if (state === S.PLAYING) { nicks++; perfectRound = false; halt = { t: 0.35, max: 0.35, kind: 'nick' }; invul = 0.8; }
      stroke = null;
      return;
    }
    for (var i = 0; i < strings.length; i++) {
      var s = strings[i];
      if (s.cut >= 0) continue;
      var pts = stringPts(s);
      for (var k = 1; k < pts.length; k++) {
        var hv = segHit(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, px, py, x, y);
        if (hv < 0) continue;
        var tt = (k - 1 + hv) / 8;
        if (speed >= CUT_SPEED) {
          s.cut = tt; s.cutT = 0; s.cutY = pts[k - 1].y + (pts[k].y - pts[k - 1].y) * hv;
          stroke.cuts++; cutTotal++;
          var gain = 100 * stroke.cuts;
          score += gain;
          game.feedback.good(x, s.cutY, { text: stroke.cuts >= 2 ? 'x' + stroke.cuts : 'GOOD', color: GLOW, count: 10, volume: 0.5 * v });
          game.audio.tone(520 + stroke.cuts * 140, 0.06, { wave: 'square', volume: 0.06 * v });
          if (stroke.cuts === 2) multiCuts++;
        } else {
          // 遅い: 糸がたわむだけ
          s.bend += (x > px ? 1 : -1) * 70;
          if (!stroke.dull) {
            stroke.dull = true; dulls++; perfectRound = false;
            game.audio.tone(200, 0.16, { wave: 'triangle', volume: 0.1 * v, slide: 60 });
            game.fx.burst(x, y, { color: CHEESE, count: 4, speed: 120 });
          }
        }
        break;
      }
    }
    if (uncut() === 0 && released <= 0) roundClear();
  }

  function strokeEnd(vol) {
    if (!stroke) return;
    if (stroke.cuts === 0 && !stroke.dull) game.audio.tone(900, 0.05, { wave: 'sine', volume: 0.04 * (vol || 1), slide: -400 });
    stroke = null;
  }

  function roundClear() {
    released = 0.001;
    game.audio.play('se_milestone', state === S.PLAYING ? 0.4 : 0.15);
    if (state !== S.PLAYING) return;
    var bonus = Math.ceil(roundT * 60) + (perfectRound ? 200 : 0);
    score += bonus;
    board.push(true);
    game.fx.popup(perfectRound ? 'PERFECT' : 'NICE', W / 2, lumpY() - 130, { color: GLOW, size: 72 });
    game.fx.popup('+' + bonus, W / 2, lumpY() - 60, { color: CHEESE, size: 50 });
    if (round >= ROUNDS.length - 1) finish(true);
    else interlude = 0.9;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 5; i++) game.fx.burst(W * (0.1 + i * 0.2), H * 0.3 + (i % 2) * 120, { color: i % 2 ? GLOW : CHEESE, count: 16, speed: 440 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { strings: cutTotal, multi: multiCuts, dull: dulls, nicks: nicks, wheels: wheels };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING) return;
    if (over || halt || interlude > 0 || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    game.audio.tone(700, 0.03, { wave: 'sine', volume: 0.03 });
    strokeBegin(x, y);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !stroke) return;
    if (over || halt || interlude > 0) { stroke = null; game.audio.play('se_tap', 0.03); return; }
    strokeMove(x, y, 1);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (stroke) strokeEnd(1); else game.audio.tone(600, 0.02, { wave: 'sine', volume: 0.02 });
  });

  // ── 描画 ──
  function drawWorkshop() {
    game.draw.gradient(0, H, [[0, SOOT], [0.25, BARN], [0.6, BEAM], [0.78, '#3a2c22'], [1, SOOT]]);
    // 遠景: 小窓の向こうの山
    var wx = W * 0.08, wy = H * 0.15, ww = 250, wh = 230;
    game.draw.rect(wx - 14, wy - 14, ww + 28, wh + 28, '#2a2018');
    game.draw.gradient(wy, wy + wh, ['#8fa3a8', '#c9c0a8']);
    game.draw.rect(0, wy, wx, wh, BARN);
    game.draw.rect(wx + ww, wy, W - wx - ww, wh, BARN);
    for (var m = 0; m < 10; m++) {
      var mh = 30 + Math.abs(5 - m) * -6 + 80;
      game.draw.rect(wx + m * 25, wy + wh - mh, 26, mh, m % 3 === 0 ? '#6e7a78' : '#7e8a86');
    }
    game.draw.rect(wx + ww / 2 - 4, wy, 8, wh, '#2a2018');
    // 梁と熟成棚の輪
    for (var b = 0; b < 3; b++) game.draw.rect(0, H * (0.05 + b * 0.05), W, 26, '#2c221a');
    for (var r = 0; r < 4; r++) {
      var cx = W * 0.6 + r * 100, cy = H * 0.2;
      game.draw.circle(cx, cy, 44, CHEESE_DK);
      game.draw.circle(cx, cy, 34, '#c9a650');
    }
    game.draw.rect(W * 0.53, H * 0.2 + 46, W * 0.45, 16, WOOD);
  }

  function drawVat() {
    // 銅の大鍋(横1pxストリップを4px刻みで)
    for (var y = 0; y < 220; y += 4) {
      var k = y / 220;
      var hw = 420 - k * k * 150;
      var shade = y < 30 ? COPPER : y < 120 ? '#94582f' : COPPER_DK;
      game.draw.rect(W / 2 - hw, VAT_Y + y, hw * 2, 4, shade);
    }
    game.draw.rect(W / 2 - 420, VAT_Y + 6, 60, 120, '#c98a56', 0.35);
    // 溶けたチーズの面
    for (var d = -34; d <= 34; d += 4) {
      var hw2 = 390 * Math.sqrt(Math.max(0, 1 - (d / 36) * (d / 36)));
      game.draw.rect(W / 2 - hw2, VAT_Y + d, hw2 * 2, 4, d < -10 ? GLOW : CHEESE);
    }
    game.draw.line(W / 2 - 424, VAT_Y, W / 2 + 424, VAT_Y, '#d9945c', 10);
    // ブルーム: 湯気の発光
    for (var g = 0; g < 4; g++) game.draw.circle(W / 2 + Math.sin(game.time.elapsed + g) * 60, VAT_Y - 40 - g * 50, 120 + g * 40, GLOW, 0.05);
    // 炉の火
    for (var f = 0; f < 5; f++) game.draw.circle(W / 2 - 160 + f * 80, VAT_Y + 236 + Math.sin(game.time.elapsed * 9 + f) * 6, 28, EMBER, 0.6);
  }

  function drawStrings(hl) {
    var th = Math.max(5, 15 - liftK * 9);
    for (var i = 0; i < strings.length; i++) {
      var s = strings[i];
      var pts = stringPts(s);
      if (s.cut < 0) {
        for (var k = 1; k < pts.length; k++) {
          game.draw.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, CHEESE_DK, th + 4);
          game.draw.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, hl ? '#ffffff' : CHEESE, th);
        }
        // 狙う物: 糸の中ほどが明滅
        if (Math.floor(game.time.elapsed * 5 + i) % 2 === 0) game.draw.circle(pts[4].x, pts[4].y, th + 6, '#ffffff', 0.35);
      } else {
        // 切れた糸: 上は塊へ縮み、下は鍋へ落ちる
        var e = Math.min(1, s.cutT / 0.3);
        var up = s.cut * (1 - e), dn = s.cut + (1 - s.cut) * e;
        for (var q = 1; q < pts.length; q++) {
          var t0 = (q - 1) / 8, t1 = q / 8;
          if (t1 <= up) game.draw.line(pts[q - 1].x, pts[q - 1].y, pts[q].x, pts[q].y, CHEESE, th * (1 - e * 0.6));
          if (t0 >= dn) game.draw.line(pts[q - 1].x, pts[q - 1].y, pts[q].x, pts[q].y + e * 20, CHEESE_DK, th * (1 - e * 0.6));
        }
      }
    }
  }

  function drawLumpAndChef(hl, strain) {
    var ly = lumpY();
    var rx = released > 0 ? Math.min(1, released / 0.6) : 0;
    var slot = state === S.PLAYING ? Math.max(0, board.length - 1) : 0;
    var tx = W * 0.2 + slot * W * 0.2, ty = H * 0.835;
    var lx = W / 2 + rx * (tx - W / 2), lyy = ly + rx * (ty - ly) - Math.sin(rx * Math.PI) * 160;
    var fall = dropped > 0 ? Math.min(1, dropped / 0.5) : 0;
    lyy += fall * (VAT_Y - ly);
    var chefFr = released > 0 ? CHEF_JOY : strain ? CHEF_STRAIN : CHEF_HOLD;
    var shakeX = strain ? Math.sin(game.time.elapsed * 50) * 6 : 0;
    var cx = W * 0.84 + shakeX, cy = H * 0.5;
    for (var sh = -2; sh <= 2; sh++) game.draw.circle(cx + sh * 30, cy + 112, 26, '#000000', 0.25);
    game.draw.sprite(chefFr, CHEF_PAL, cx, cy + Math.sin(game.time.elapsed * 3) * 3, 16, { anchor: 'center' });
    if (released <= 0 && dropped <= 0) game.draw.line(cx - 90, cy - 60, lx + 60, lyy + 10, WOOD, 14);
    if (fall >= 1) return;
    var warn = !released && roundT < WARN_T && state === S.PLAYING && Math.floor(game.time.elapsed * 10) % 2 === 0;
    var sc = (hl ? 1 + hl * 0.25 : 1) * (1 - rx * 0.6);
    if (warn) game.draw.circle(lx, lyy, 190, EMBER, 0.35);
    game.draw.sprite(LUMP, { y: hl ? '#ffffff' : CHEESE, h: GLOW }, lx, lyy, Math.max(8, Math.round(LUMP_PX * sc)), { anchor: 'center', alpha: 1 - fall });
    for (var b = 0; b < 2; b++) game.draw.circle(lx - 40 + b * 90, lyy + 10, 34 * sc, GLOW, 0.06);
  }

  function drawBoard() {
    // 親指ゾーン: 切り離した塊を並べる木の台
    game.draw.rect(W * 0.08, H * 0.86, W * 0.84, 40, WOOD);
    game.draw.rect(W * 0.08, H * 0.86, W * 0.84, 8, '#9a7650');
    for (var i = 0; i < ROUNDS.length; i++) {
      var bx = W * 0.2 + i * W * 0.2, by = H * 0.835;
      if (i < board.length) game.draw.sprite(LUMP, { y: board[i] ? CHEESE : ASH, h: board[i] ? GLOW : ASH }, bx, by, 9, { anchor: 'center' });
      else game.draw.circle(bx, by + 10, 40, '#000000', 0.25);
    }
  }

  function drawTrail() {
    var now = game.time.elapsed;
    trail = trail.filter(function (p) { return now - p.t < 0.22; });
    for (var i = 1; i < trail.length; i++) {
      var a = 1 - (now - trail[i].t) / 0.22;
      if (Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y) > 400) continue;
      game.draw.line(trail[i - 1].x, trail[i - 1].y, trail[i].x, trail[i].y, trail[i].fast ? '#ffffff' : ASH, (trail[i].fast ? 14 : 6) * a + 2);
    }
  }

  function vignette() {
    for (var v = 0; v < 4; v++) {
      var t = 30 + v * 34;
      game.draw.rect(0, 0, W, t, '#000000', 0.09);
      game.draw.rect(0, H - t, W, t, '#000000', 0.09);
      game.draw.rect(0, 0, t, H, '#000000', 0.09);
      game.draw.rect(W - t, 0, t, H, '#000000', 0.09);
    }
  }

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var w = 0; w < WHEELS; w++) {
      var wx = 80 + w * 84;
      game.draw.circle(wx, 92, 32, w < wheels ? CHEESE : '#3a322a');
      game.draw.circle(wx, 92, 22, w < wheels ? '#c9a650' : '#2a241e');
    }
    txt(String(score), W / 2, 92, 64, PAPER);
    for (var r = 0; r < ROUNDS.length; r++) game.draw.rect(W - 300 + r * 64, 76, 44, 32, r < round ? CHEESE : r === round ? PAPER : '#3a322a');
    var fr = Math.max(0, roundT / ROUNDS[round].time);
    game.draw.rect(60, 188, W - 120, 22, '#000000', 0.55);
    game.draw.rect(60, 188, (W - 120) * fr, 22, roundT < WARN_T ? EMBER : CHEESE);
    var n = uncut();
    for (var i = 0; i < n; i++) game.draw.rect(W / 2 - (n - 1) * 24 + i * 48 - 5, 230, 10, 40, CHEESE);
  }

  // ── ATTRACT デモ: 速い一振りで切る / 遅い一振りはたわむだけ ──
  var demo = { t: 0, step: 0, gx: W * 0.3, gy: H * 0.5, press: false, s: null };
  var DEMO = [
    { at: 0.5, dur: 0.06, idx: 0 },
    { at: 1.1, dur: 0.75, idx: 1 },
    { at: 2.15, dur: 0.06, idx: 1 },
    { at: 2.75, dur: 0.06, idx: 2 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { setupRound(1); liftK = 0.3; demo.step = 0; demo.s = null; stroke = null; }
    if (released > 0) released += dt;
    var cur = DEMO[demo.step];
    if (!demo.s && cur && cyc >= cur.at) {
      var target = strings[cur.idx];
      var pts = stringPts(target);
      var y = pts[4].y;
      demo.s = { x0: pts[4].x - 55, x1: pts[4].x + 55, y: y, t0: cyc, dur: cur.dur };
      strokeBegin(demo.s.x0, y);
    }
    if (demo.s) {
      var k = Math.min(1, (cyc - demo.s.t0) / demo.s.dur);
      demo.gx = demo.s.x0 + (demo.s.x1 - demo.s.x0) * k;
      demo.gy = demo.s.y + Math.sin(k * Math.PI) * 10;
      demo.press = true;
      strokeMove(demo.gx, demo.gy, 0.35);
      if (k >= 1) { strokeEnd(0.35); demo.s = null; demo.step++; }
    } else {
      demo.press = false;
      var nx = DEMO[demo.step] ? stringPts(strings[DEMO[demo.step].idx])[4].x - 55 : W * 0.3;
      demo.gx += (nx - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (H * 0.5 - demo.gy) * Math.min(1, dt * 5);
    }
  }

  function tickStrings(dt) {
    for (var i = 0; i < strings.length; i++) {
      var s = strings[i];
      if (s.cut >= 0) s.cutT += dt;
      s.bend *= Math.max(0, 1 - dt * 3);
    }
    if (invul > 0) invul -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tickStrings(dt);
      drawWorkshop();
      drawVat();
      drawStrings(0);
      drawLumpAndChef(0, false);
      drawBoard();
      drawTrail();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      vignette();
      txt(TITLE, W / 2, H * 0.085, 100, GLOW);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 40, CHEESE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 44, GLOW);
      else txt('INSERT COIN', W / 2, H * 0.955, 38, PAPER);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      drawWorkshop();
      drawVat();
      drawLumpAndChef(0, !won);
      drawBoard();
      vignette();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, '#000000', 0.6);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 104, won ? GLOW : EMBER);
      txt('SCORE ' + score, W / 2, H * 0.22, 56, PAPER);
      txt(cutTotal + ' / ' + (2 + 3 + 4 + 5) + '   COMBO ' + multiCuts, W / 2, H * 0.265, 40, CHEESE);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.31, 58, GLOW);
      else txt('BEST ' + Math.max(prevBest, score), W / 2, H * 0.31, 40, ASH);
      if (!won) txt('あと' + Math.max(1, uncut()) + '本!', W / 2, H * 0.35, 56, EMBER);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 38, PAPER);
      return;
    }

    // ── PLAYING ──
    var hl = 0, frozen = false;
    if (over) {
      endT -= dt;
      if (released > 0) released += dt;
      if (dropped > 0) dropped += dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      frozen = true;
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var kind = halt.kind;
        halt = null; wheels--;
        game.feedback.bad(W / 2, lumpY() - 100, { text: 'MISS' });
        if (kind === 'drop') { board.push(false); dropped = 0.001; game.audio.play('se_break', 0.35); game.fx.burst(W / 2, VAT_Y, { color: CHEESE, count: 18, speed: 360 }); }
        if (wheels <= 0) finish(false);
        else if (kind === 'drop') { if (round >= ROUNDS.length - 1) finish(true); else interlude = 0.9; }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (interlude > 0) {
      interlude -= dt;
      if (released > 0) released += dt;
      if (dropped > 0) dropped += dt;
      if (interlude <= 0) {
        round++; setupRound(round);
        game.audio.tone(260, 0.2, { wave: 'triangle', volume: 0.08, slide: 200 });
      }
    } else {
      roundT -= dt;
      liftK = Math.min(1, 1 - roundT / ROUNDS[round].time);
      if (roundT < WARN_T) {
        warnTick -= dt;
        if (warnTick <= 0) { warnTick = 0.15; game.audio.tone(440, 0.05, { wave: 'square', volume: 0.05 }); }
      }
      if (roundT <= 0) {
        roundT = 0; stroke = null;
        halt = { t: 0.5, max: 0.5, kind: 'drop' };
        game.fx.flash('#ffffff', 0.15);
      }
    }
    if (!frozen) tickStrings(dt);

    drawWorkshop();
    drawVat();
    if (released <= 0 && dropped <= 0) drawStrings(halt && halt.kind === 'drop' ? hl : 0);
    drawLumpAndChef(hl, roundT < WARN_T && !released && !over);
    drawBoard();
    drawTrail();
    vignette();
    drawHud();
    if (round === 0 && ready <= 0 && cutTotal === 0 && roundT > ROUNDS[0].time - 0.9) {
      var p0 = stringPts(strings[0])[4];
      var kk = (game.time.elapsed * 2) % 1;
      game.draw.hand(p0.x - 160 + kk * 320, p0.y, { press: true, scale: 13, alpha: 0.6 });
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, GLOW);
  });

  game.onStart(function () {
    game.audio.melody([
      ['D4', 0.5], ['G4', 0.5], ['B4', 0.5], ['G4', 0.5], ['D5', 1], ['B4', 0.5], ['C5', 0.5],
      ['A4', 0.5], ['F#4', 0.5], ['D4', 0.5], ['F#4', 0.5], ['G4', 1.5], ['R', 0.5],
    ], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true, bass: [['G2', 1.5], ['D3', 0.5], ['G2', 1.5], ['D3', 0.5], ['D2', 1.5], ['A2', 0.5], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
