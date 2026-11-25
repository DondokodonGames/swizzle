// I-GBA-0037v2-teppan-char-scrape.js
// 鉄板の焦げ削ぎ — 鉄板にこびりついた焦げの帯を、帯に沿った素早い一筆でへらを走らせて削ぎ落とす
// 操作: 焦げの帯の端から端まで、帯と同じ向きに素早く一直線になぞる。届かなかった分は焦げが残る。一直線に並んだ帯は一筆でまとめて削げる。赤いトゲの熱だまりを横切るとはねる
// 終わり: 3枚(帯3→4→5本)を14秒以内に削ぎ切ればCLEAR。熱だまりで3回はねる/時間切れでGAME OVER
// @mechanic: slice
// @theme: teppanyaki_closing_griddle_scrape
// 世界観: 鉄板焼き店の閉店後、料理人がへらを一気に走らせて鉄板の焦げの帯を削ぎ落とし、火の残る熱だまりを避けながら翌日の鉄板に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 削いだ帯の本数・まとめ削ぎの最大数・残り秒のスコア
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、輪郭線なし、粗いドット、タイル反復の背景
  var STYLE = { bg: ['#000000', '#1c1c48'], main: ['#7c7c7c', '#583000', '#fcfcfc'], accent: ['#f83800', '#fca044'] };
  var P = {
    black: STYLE.bg[0], tile: STYLE.bg[1], tile2: '#0c0c30', steel: STYLE.main[0], steelDk: '#3c3c3c', steelHi: '#bcbcbc',
    char: STYLE.main[1], white: STYLE.main[2], fire: STYLE.accent[0], ember: STYLE.accent[1], ok: '#58d854', wood: '#ac7c00',
  };

  var GAME_TITLE = 'TEPPAN SCRAPE';
  var TIME_LIMIT = 14;
  var NEEDED = 12;
  var MISS_MAX = 3;
  var GX0 = 80, GX1 = 1000, GY0 = Math.round(H * 0.25), GY1 = Math.round(H * 0.67);
  var BAND_W = 50;
  // 帯の型: [cx, cy, 角度, 長さ]。熱だまり: [x, y, 出現秒]
  var PLATES = [
    { bands: [[540, 640, 0.04, 560], [520, 880, -0.05, 600], [560, 1120, 0.03, 540]], hots: [] },
    { bands: [[300, 650, 0.45, 360], [780, 650, -0.45, 360], [540, 920, 0, 580], [880, 1130, Math.PI / 2, 290]], hots: [[540, 790, 0.9]] },
    { bands: [[290, 620, 0, 330], [790, 620, 0, 330], [305, 900, 0.35, 270], [775, 1071, 0.35, 270], [170, 1170, Math.PI / 2, 220]], hots: [[540, 620, 1.4], [540, 985, 3.2]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var plate, bands, hots, plateT, scraped, misses, combo, maxCombo, maxMulti, lastHit, score;
  var timeLeft, readyT, clearT, stopT, stopObj, fin, cleared, postT, warnT, swingT, burnT, cheerT, playT, finalScore;
  var stroke, trail;

  // 料理人(はちまき・白衣)。待機・振り抜き・はね・万歳
  var COOK_A = ['...wwww...', '..rrrrrr..', '..ffffff..', '..fkffkf..', '..ffffff..', '...ffff...', '.wwwwwwww.', 'wwwwwwwwww', 'w.wwwwww.w', '..ww..ww..'];
  var COOK_B = ['...wwww...', '..rrrrrr..', '..ffffff..', '..fkffkf..', '..ffffff..', '...ffff...', '.wwwwwwww.', 'wwwwwwwwww', 'w.wwwwww.w', '.ww....ww.'];
  var COOK_SW = ['...wwww...', '..rrrrrr..', '..ffffff..', '..fkffkf..', '..ffffff..', '...ffff..g', '.wwwwwwwgg', 'wwwwwwwww.', '..wwwwww..', '..ww..ww..'];
  var COOK_BURN = ['.r.wwww.r.', '..rrrrrr..', '..kfkfkf..', '..fkkfkk..', '..ffffff..', '...fkkf...', '.wwwwwwww.', 'wwwwwwwwww', 'w.wwwwww.w', '..ww..ww..'];
  var COOK_JOY = ['w..wwww..w', 'f.rrrrrr.f', '.fffffff..', '..fkffkf..', '..ffffff..', '...fkkf...', '.wwwwwwww.', '.wwwwwwww.', '..wwwwww..', '..ww..ww..'];
  var COOK_PAL = { w: '#fcfcfc', r: '#f83800', f: '#fca044', k: '#000000', g: '#bcbcbc' };
  var HERA = ['gggggg', 'gggggg', '..ww..', '..ww..', '..ww..'];
  var HERA_PAL = { g: '#bcbcbc', w: '#ac7c00' };

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: P.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function setupPlate(i, mirror) {
    var src = PLATES[i];
    bands = [];
    for (var b = 0; b < src.bands.length; b++) {
      var d = src.bands[b];
      var cx = mirror ? W - d[0] : d[0], a = mirror ? -d[2] : d[2];
      bands.push({ cx: cx + game.random(-14, 14), cy: d[1] + game.random(-10, 10), a: a, L: d[3], gone: false, flash: 0, seed: b * 7 + 3 });
    }
    hots = [];
    for (var h = 0; h < src.hots.length; h++) {
      var q = src.hots[h];
      hots.push({ x: mirror ? W - q[0] : q[0], y: q[1], at: q[2], t: -1, r: 62 });
    }
    plateT = 0; stroke = null; trail = [];
  }

  function initGame() {
    plate = 0; scraped = 0; misses = 0; combo = 0; maxCombo = 0; maxMulti = 0; lastHit = -9; score = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; clearT = 0; stopT = 0; stopObj = null; fin = false; cleared = false;
    postT = 0; warnT = 0; swingT = 0; burnT = 0; cheerT = 0; playT = 0; finalScore = 0;
    setupPlate(0, game.random(0, 1) < 0.5);
  }

  function bandsLeft() { var n = 0; for (var i = 0; i < bands.length; i++) if (!bands[i].gone) n++; return n; }

  // 熱だまりの状態: 0=未出現 1=予告(0.7秒) 2=熱い(2.4秒) 3=冷めた
  function hotState(h) {
    if (h.t < 0) return 0;
    if (h.t < 0.7) return 1;
    if (h.t < 3.1) return 2;
    return 3;
  }

  function segDist(px, py, x0, y0, x1, y1) {
    var vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy;
    var u = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / l2)) : 0;
    return Math.hypot(px - (x0 + vx * u), py - (y0 + vy * u));
  }

  // へらの一筆を判定して適用する(本番・デモ共通)
  function scrapeStroke(x0, y0, x1, y1, dur) {
    var len = Math.hypot(x1 - x0, y1 - y0);
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    swingT = 0.3;
    for (var h = 0; h < hots.length; h++) {
      if (hotState(hots[h]) === 2 && segDist(hots[h].x, hots[h].y, x0, y0, x1, y1) < hots[h].r) { spatter(hots[h]); return; }
    }
    if (len < 120) { game.audio.play('se_tap', 0.1); return; }
    if (dur > 0.5) {
      game.audio.tone('C3', 0.14, { wave: 'square', volume: 0.07, slide: -40 });
      game.fx.burst(x1, y1, { color: P.steelDk, count: 4, speed: 80 });
      combo = 0;
      return;
    }
    var dir = Math.atan2(y1 - y0, x1 - x0);
    var full = [], part = 0;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (b.gone) continue;
      var gap = Math.abs(((dir - b.a) % Math.PI + Math.PI) % Math.PI);
      gap = Math.min(gap, Math.PI - gap);
      if (gap > 0.32) continue;
      var ux = Math.cos(b.a), uy = Math.sin(b.a);
      var s0 = (x0 - b.cx) * ux + (y0 - b.cy) * uy, s1 = (x1 - b.cx) * ux + (y1 - b.cy) * uy;
      var p0 = Math.abs(-(x0 - b.cx) * uy + (y0 - b.cy) * ux), p1 = Math.abs(-(x1 - b.cx) * uy + (y1 - b.cy) * ux);
      if (p0 > 58 || p1 > 58) continue;
      var lo = Math.max(-b.L / 2, Math.min(s0, s1)), hi = Math.min(b.L / 2, Math.max(s0, s1));
      if (hi - lo <= 0) continue;
      var cov = (hi - lo) / b.L;
      if (cov >= 0.75) { full.push(b); continue; }
      if (cov < 0.2) continue;
      // 届いた分だけ削れる: 残りの長い側が焦げとして残る
      var left = lo + b.L / 2, right = b.L / 2 - hi;
      var keepL = left >= right;
      var nl = keepL ? left : right;
      var shift = keepL ? (-b.L / 2 + nl / 2) : (b.L / 2 - nl / 2);
      game.fx.burst(b.cx + ux * (lo + hi) / 2, b.cy + uy * (lo + hi) / 2, { color: P.char, count: 10, speed: 260 });
      b.cx += ux * shift; b.cy += uy * shift; b.L = nl; b.flash = 0.25;
      part++;
      if (b.L < 70) full.push(b);
    }
    if (full.length > 0) {
      var now = game.time.elapsed;
      combo = now - lastHit < 1.3 ? combo + 1 : 1;
      lastHit = now;
      if (combo > maxCombo) maxCombo = combo;
      if (full.length > maxMulti) maxMulti = full.length;
      var pts = 0;
      for (var f = 0; f < full.length; f++) {
        var fb = full[f];
        fb.gone = true; fb.flash = 0.4; scraped++;
        pts += 100 * full.length;
        for (var k = -1; k <= 1; k++) game.fx.burst(fb.cx + Math.cos(fb.a) * k * fb.L * 0.35, fb.cy + Math.sin(fb.a) * k * fb.L * 0.35, { color: k === 0 ? P.ember : P.char, count: 8, speed: 320 });
      }
      pts *= Math.min(3, combo);
      score += pts;
      game.feedback.good(mx, my, { text: full.length >= 2 ? 'x' + full.length : (combo >= 2 ? 'NICE' : 'GOOD'), color: P.ok, size: 60 });
      game.fx.popup('+' + pts, mx, my - 110, { color: P.white, size: 42 });
      if (full.length >= 2) game.audio.play('se_powerup', 0.3);
      if (bandsLeft() === 0) {
        clearT = 0.85; cheerT = 0.85;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup('NICE', W / 2, (GY0 + GY1) / 2, { color: P.ember, size: 90 });
      }
      return;
    }
    if (part > 0) { game.audio.tone('E4', 0.06, { wave: 'square', volume: 0.07 }); return; }
    game.audio.tone('A5', 0.05, { wave: 'triangle', volume: 0.04, slide: -300 });
  }

  function spatter(h) {
    misses++; combo = 0; burnT = 0.8;
    game.fx.burst(h.x, h.y, { color: P.fire, count: 20, speed: 440 });
    if (misses >= MISS_MAX) {
      stopT = 0.45; stopObj = { kind: 'hot', h: h, x: h.x, y: h.y };
      game.fx.flash('#ffffff', 0.12);
      game.audio.tone('D3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -80 });
      return;
    }
    game.feedback.bad(h.x, h.y, { text: 'MISS', color: P.fire, size: 58 });
  }

  function stepPlate(dt) {
    plateT += dt;
    for (var h = 0; h < hots.length; h++) {
      var q = hots[h];
      if (q.t < 0 && plateT >= q.at) { q.t = 0; game.audio.tone('B5', 0.07, { wave: 'square', volume: 0.07 }); game.audio.tone('F5', 0.09, { wave: 'square', volume: 0.06 }); }
      else if (q.t >= 0) q.t += dt;
    }
    for (var i = 0; i < bands.length; i++) if (bands[i].flash > 0) bands[i].flash -= dt;
    for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt; if (trail[tr].life <= 0) trail.splice(tr, 1); }
    if (swingT > 0) swingT -= dt;
    if (burnT > 0) burnT -= dt;
    if (cheerT > 0) cheerT -= dt;
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 5; i++) game.fx.burst(180 + i * 180, GY0 + 200 + (i % 2) * 300, { color: i % 2 ? P.ember : P.white, count: 20, speed: 520 });
      game.fx.flash(P.ember, 0.2);
    }
  }

  function resolveStop() {
    if (!stopObj) return;
    if (stopObj.kind === 'win') { ending(true); return; }
    game.feedback.bad(stopObj.x, stopObj.y, { text: stopObj.kind === 'time' ? 'TIME UP' : 'MISS', color: P.fire, size: 60 });
    ending(false);
  }

  // ---- 入力 ----
  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0 && clearT <= 0; }

  game.onPress(function(x, y) {
    if (!canPlay()) return;
    stroke = { x0: x, y0: y, t0: game.time.elapsed };
    trail.push({ x: x, y: y, life: 0.22 });
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (!stroke || !canPlay()) return;
    trail.push({ x: x, y: y, life: 0.22 });
    if (trail.length % 3 === 0) game.audio.tone('G6', 0.02, { wave: 'square', volume: 0.015, slide: -500 });
  });
  game.onRelease(function(x, y) {
    if (!stroke) return;
    var st = stroke; stroke = null;
    if (!canPlay()) { game.audio.play('se_tap', 0.05); return; }
    scrapeStroke(st.x0, st.y0, x, y, game.time.elapsed - st.t0);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function kitchen(t) {
    game.draw.gradient(0, H, [[0, P.tile2], [0.5, P.tile], [1, P.tile2]]);
    for (var ty = 0; ty < GY0 - 20; ty += 64) for (var tx = 0; tx < W; tx += 64) if (((tx + ty) / 64) % 2 === 0) game.draw.rect(tx, ty, 64, 64, P.black, 0.35);
    // 換気フード
    game.draw.rect(140, 236, 800, 120, P.steelDk);
    game.draw.rect(160, 356, 760, 24, P.steel);
    for (var v = 0; v < 8; v++) game.draw.rect(180 + v * 96, 260, 56, 12, P.black);
    // 湯気
    for (var s = 0; s < 5; s++) {
      var sy = GY0 - 30 - ((t * 60 + s * 40) % 120);
      game.draw.rect(200 + s * 170 + Math.sin(t * 2 + s) * 10, sy, 24, 24, P.steelHi, 0.25);
    }
  }

  function griddle(t) {
    game.draw.rect(GX0 - 24, GY0 - 24, GX1 - GX0 + 48, GY1 - GY0 + 80, P.black);
    game.draw.rect(GX0, GY0, GX1 - GX0, GY1 - GY0, P.steel);
    for (var gy = GY0; gy < GY1; gy += 48) game.draw.rect(GX0, gy, GX1 - GX0, 4, P.steelDk, 0.5);
    for (var gx = GX0; gx < GX1; gx += 96) game.draw.rect(gx, GY0, 4, GY1 - GY0, P.steelDk, 0.25);
    game.draw.rect(GX0, GY1, GX1 - GX0, 40, P.steelDk);
    game.draw.rect(GX0 + 20, GY1 + 12, GX1 - GX0 - 40, 14, P.black);
    // 台(木の縁)
    game.draw.rect(0, GY1 + 64, W, 40, P.wood);
    game.draw.rect(0, GY1 + 104, W, H, '#503000');
    for (var w = 0; w < 7; w++) game.draw.rect(0, GY1 + 150 + w * 80, W, 6, P.black, 0.35);
  }

  function drawBand(b, t) {
    if (b.gone && b.flash <= 0) return;
    var ux = Math.cos(b.a), uy = Math.sin(b.a);
    var x0 = b.cx - ux * b.L / 2, y0 = b.cy - uy * b.L / 2, x1 = b.cx + ux * b.L / 2, y1 = b.cy + uy * b.L / 2;
    if (b.gone) { game.draw.line(x0, y0, x1, y1, P.white, 18 * b.flash / 0.4); return; }
    var big = stopObj && stopT > 0 && stopObj.b === b;
    var wf = (b.flash > 0 && Math.floor(b.flash * 24) % 2 === 0) || (big && Math.floor(t * 16) % 2 === 0);
    var bw = big ? BAND_W * 1.4 : BAND_W;
    var pulse = 0.35 + Math.sin(t * 7) * 0.25;
    game.draw.line(x0, y0, x1, y1, P.white, bw + 16 + Math.sin(t * 7) * 4);
    game.draw.line(x0, y0, x1, y1, P.steel, bw + 6);
    game.draw.line(x0, y0, x1, y1, wf ? P.white : P.char, bw);
    var n = Math.max(2, Math.floor(b.L / 40));
    for (var i = 0; i <= n; i++) {
      var u = i / n - 0.5, off = ((b.seed * (i + 3)) % 5 - 2) * 6;
      var px = b.cx + ux * u * b.L - uy * off, py = b.cy + uy * u * b.L + ux * off;
      game.draw.rect(px - 8, py - 8, 16, 16, P.black);
      if ((i + b.seed) % 3 === 0) game.draw.rect(px - 4, py - 4, 8, 8, P.ember, pulse);
    }
  }

  function drawHot(h, t) {
    var st = hotState(h);
    if (st === 0 || st === 3) return;
    var big = stopObj && stopT > 0 && stopObj.h === h;
    var r = big ? h.r * 1.4 : h.r;
    if (st === 1) {
      if (Math.floor(t * 12) % 2 === 0) {
        for (var k = 0; k < 10; k++) {
          var a = k / 10 * Math.PI * 2;
          game.draw.rect(h.x + Math.cos(a) * r - 6, h.y + Math.sin(a) * r - 6, 12, 12, P.fire);
        }
      }
      return;
    }
    var fl = Math.sin(t * 20) * 6;
    for (var s = 0; s < 12; s++) {
      var sa = s / 12 * Math.PI * 2 + t;
      game.draw.line(h.x + Math.cos(sa) * r * 0.5, h.y + Math.sin(sa) * r * 0.5, h.x + Math.cos(sa) * (r + 16 + fl), h.y + Math.sin(sa) * (r + 16 + fl), P.fire, 12);
    }
    game.draw.circle(h.x, h.y, r * 0.8, big && Math.floor(t * 16) % 2 === 0 ? P.white : P.fire);
    game.draw.circle(h.x, h.y, r * 0.45, P.ember);
    game.draw.rect(h.x - 6, h.y - 6 - fl, 12, 12, P.white);
  }

  function drawTrail() {
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      game.draw.line(a.x, a.y, b.x, b.y, P.steelHi, 10 + b.life * 120);
      game.draw.line(a.x, a.y, b.x, b.y, P.white, 4 + b.life * 30);
    }
    if (trail.length) {
      var e = trail[trail.length - 1];
      game.draw.sprite(HERA, HERA_PAL, e.x, e.y + 26, 10, { anchor: 'center' });
    }
  }

  function drawCook(t) {
    var fr;
    if (burnT > 0) fr = COOK_BURN;
    else if (cheerT > 0 || (fin && cleared)) fr = COOK_JOY;
    else if (swingT > 0 || stroke) fr = COOK_SW;
    else fr = Math.floor(t * 2.5) % 2 ? COOK_A : COOK_B;
    var hop = cheerT > 0 ? -Math.abs(Math.sin(t * 14)) * 24 : 0;
    game.draw.rect(110, H * 0.905, 180, 20, P.black, 0.5);
    game.draw.sprite(fr, COOK_PAL, 200, H * 0.85 + hop, 18, { anchor: 'center' });
  }

  function drawHud(t) {
    var lowT = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(70, 34, W - 140, 32, P.black);
    game.draw.rect(78, 42, (W - 156) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowT ? P.fire : P.ember);
    out(scraped + ' / ' + NEEDED, W / 2, 116, 50, P.white);
    for (var p = 0; p < PLATES.length; p++) {
      var done = p < plate || (p === plate && clearT > 0) || (fin && cleared);
      game.draw.rect(90 + p * 70, 154, 50, 40, P.black);
      game.draw.rect(96 + p * 70, 160, 38, 28, done ? P.steelHi : (p === plate ? P.char : P.steelDk));
    }
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.rect(W - 130 - m * 66, 156, 40, 40, P.black);
      game.draw.rect(W - 124 - m * 66, 162, 28, 28, m < misses ? P.fire : P.steelDk);
    }
    out('' + score, W - 240, 116, 34, P.ember);
    for (var i = 0; i < bands.length; i++) game.draw.rect(W / 2 + 60 + i * 64, H * 0.86, 44, 22, bands[i].gone ? P.steelHi : P.char);
  }

  function drawScene(t) {
    kitchen(t);
    griddle(t);
    for (var i = 0; i < bands.length; i++) drawBand(bands[i], t);
    for (var h = 0; h < hots.length; h++) drawHot(hots[h], t);
    drawTrail();
    drawCook(t);
  }

  function scanlines() { for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, P.black, 0.12); }

  // ---- ATTRACT: 本物の scrapeStroke() で 1本削ぐ → 半端に削いで残す → 残りを削ぐ → 熱だまりを横切ってはねる ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, k: 0, sw: null };
  function bandEnds(b, ext) {
    var ux = Math.cos(b.a), uy = Math.sin(b.a), h = b.L / 2 + ext;
    return [b.cx - ux * h, b.cy - uy * h, b.cx + ux * h, b.cy + uy * h];
  }
  // k番目の実演ストローク [x0, y0, x1, y1](帯の今の位置から毎回計算)
  function demoLine(k) {
    if (k === 0) return bandEnds(bands[2], 30);
    var b = k === 3 ? bands[1] : bands[0], ux = Math.cos(b.a), uy = Math.sin(b.a), h = b.L / 2;
    if (k === 1) return [b.cx - ux * (h + 30), b.cy - uy * (h + 30), b.cx + ux * 10, b.cy + uy * 10];
    if (k === 2) return bandEnds(b, 30);
    return [b.cx + ux * (h + 10), b.cy + uy * (h + 10), b.cx - ux * (h + 190), b.cy - uy * (h + 190)];
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) {
      initGame(); readyT = 0; setupPlate(1, false);
      hots[0].at = 1.7;
      demo.k = 0; demo.sw = null;
    }
    stepPlate(dt);
    var plan = [0.35, 1.05, 1.65, 2.75];
    demo.press = false;
    if (!demo.sw && demo.k < plan.length && cyc > plan[demo.k]) {
      var e = demoLine(demo.k);
      demo.sw = { x0: e[0], y0: e[1], x1: e[2], y1: e[3], t: 0 };
      stroke = { x0: e[0], y0: e[1], t0: game.time.elapsed };
    }
    if (demo.sw) {
      var w = demo.sw;
      w.t += dt;
      var k = Math.min(1, w.t / 0.24);
      demo.gx = w.x0 + (w.x1 - w.x0) * k; demo.gy = w.y0 + (w.y1 - w.y0) * k;
      demo.press = true;
      trail.push({ x: demo.gx, y: demo.gy, life: 0.22 });
      if (k >= 1) {
        stroke = null;
        scrapeStroke(w.x0, w.y0, w.x1, w.y1, 0.24);
        demo.sw = null; demo.k++;
      }
    } else if (demo.k < plan.length) {
      var ne = demoLine(demo.k);
      demo.gx += (ne[0] - demo.gx) * Math.min(1, dt * 7);
      demo.gy += (ne[1] - demo.gy) * Math.min(1, dt * 7);
    } else {
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.78 - demo.gy) * Math.min(1, dt * 3);
    }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      out(GAME_TITLE, W / 2, H * 0.055, 84, P.ember);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.098, 38, P.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.955, 48, P.ember);
      else out('TAP TO START', W / 2, H * 0.955, 40, P.white);
      scanlines();
      return;
    }

    if (mode === S.RESULT) {
      stepPlate(dt);
      drawScene(t);
      game.draw.rect(90, H * 0.30, W - 180, 500, P.black, 0.85);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.34, 96, cleared ? P.ok : P.fire);
      out('SCORE ' + finalScore, W / 2, H * 0.40, 60, P.white);
      out(scraped + ' / ' + NEEDED + '   x' + maxMulti, W / 2, H * 0.45, 44, P.ember);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.50, 56, P.ember);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.50, 42, P.white);
      if (!cleared) out('あと' + (NEEDED - scraped) + '本!', W / 2, H * 0.27, 60, P.ember);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.955, 40, P.white);
      scanlines();
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { scraped: scraped, spatters: misses, maxMulti: maxMulti, maxCombo: maxCombo, plates: plate + (cleared ? 1 : 0) };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) resolveStop();
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (clearT > 0) {
      clearT -= dt;
      stepPlate(dt);
      if (clearT <= 0) {
        if (plate >= PLATES.length - 1) {
          stopT = 0.4; stopObj = { kind: 'win', x: W / 2, y: (GY0 + GY1) / 2 };
        } else {
          plate++;
          setupPlate(plate, game.random(0, 1) < 0.5);
          game.audio.play('se_jump', 0.3);
        }
      }
    } else {
      timeLeft -= dt; playT += dt;
      stepPlate(dt);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.08 }); }
      }
      if (timeLeft <= 0 && stopT <= 0) {
        timeLeft = 0; stroke = null;
        var rem = null;
        for (var i = 0; i < bands.length; i++) if (!bands[i].gone) { rem = bands[i]; break; }
        stopT = 0.45; stopObj = { kind: 'time', b: rem, x: rem ? rem.cx : W / 2, y: rem ? rem.cy : GY0 };
        game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 });
      }
    }

    drawScene(t);
    if (stopObj && stopObj.kind === 'win' && stopT > 0) game.draw.rect(GX0, GY0, GX1 - GX0, GY1 - GY0, P.white, 0.5 * stopT / 0.4);
    if (!fin && readyT <= 0 && plate === 0 && scraped === 0 && playT < 1.5 && !stroke) {
      var fb = bands[0], ee = bandEnds(fb, 20), u = (playT * 1.6) % 1;
      game.draw.hand(ee[0] + (ee[2] - ee[0]) * u, ee[1] + (ee[3] - ee[1]) * u, { press: true, scale: 12, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, (GY0 + GY1) / 2, 120, P.ember);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 1],
      ['A4', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 1],
    ], { tempo: 168, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 1], ['E2', 1], ['G2', 1], ['E2', 1], ['A2', 1], ['E2', 1], ['G2', 1], ['A2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
