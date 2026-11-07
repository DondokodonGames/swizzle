// I-GBA-0062v2-newyear-kite-reel-mash.js
// 凧糸まきとり — 風に流されて伸びきった凧糸を、連打で巻き取って時間内に凧を手元へ引き寄せる
// 操作: 画面のどこでも連打すると糸巻きが回って糸が縮む。突風(草と旗がなびき風の筋が走る)の間は糸が引き出されるので叩き負けない。風が凪いだ瞬間は1打で倍巻ける
// 終わり: 3枚の凧をそれぞれ時間内に手元まで巻き取れればCLEAR。間に合わないたびに手袋を1つ失い、2つ失うとGAME OVER
// @mechanic: mash
// @theme: newyear_riverbank_kite_reel
// 世界観: 正月の河川敷で、鉢巻きの凧揚げ名人が、風に流されて伸びきった長い凧糸を糸巻きの連打で巻き取り、3枚の凧を順に手元へ引き寄せる
// 残るもの: 正誤(CLEAR/GAME OVER) + 巻き取った糸の長さ・連打数・FEVER中の打数・スコア
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var STYLE = { bg: ['#6ab4f0', '#a8d8f8', '#e8f4fc'], main: ['#e83a3a', '#2a4a9a', '#f8f0e0'], accent: ['#ffd23a', '#5aa84a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], AIR = STYLE.bg[1], HAZE = STYLE.bg[2];
  var CRIMSON = STYLE.main[0], INDIGO = STYLE.main[1], PAPER = STYLE.main[2];
  var GOLD = STYLE.accent[0], GRASS = STYLE.accent[1];
  var INK = '#14202c', WHITE = '#ffffff', RIVER = '#4a8ac8', BAMBOO = '#c8a050';

  var TITLE = 'KITE REEL';
  var TIME_LIMIT = 13.5;
  var GLOVES = 2;
  var STEP = 1.6;
  var REEL_X = W / 2, REEL_Y = H * 0.86;
  var ROUNDS = [
    { len: 20, time: 4.0, gusts: [], lulls: [] },
    { len: 30, time: 4.5, gusts: [{ at: 1.6, dur: 1.2, pow: 5 }], lulls: [{ at: 3.2, dur: 0.8 }] },
    { len: 38, time: 5.0, gusts: [{ at: 1.2, dur: 1.1, pow: 5.5 }, { at: 3.0, dur: 1.0, pow: 6 }], lulls: [{ at: 2.4, dur: 0.6 }, { at: 4.1, dur: 0.6 }] },
  ];
  var KITE_COLS = [CRIMSON, INDIGO, GRASS];

  var KITE = [
    ['rrrrrrrrr', 'rwwwwwwwr', 'rwkwwwkwr', 'rwwwwwwwr', 'rwwwmwwwr', 'rwwmmmwwr', 'rwwwwwwwr', 'rrrrrrrrr'],
    ['rrrrrrrrr', 'rwwwwwwwr', 'rwkkwkkwr', 'rwwwwwwwr', 'rwwmmmwwr', 'rwwwmwwwr', 'rwwwwwwwr', 'rrrrrrrrr'],
  ];
  var MASTER = [
    ['...hhhhh...', '..rrrrrrr..', '..hhhhhhh..', '...hhhhh...', '.aa.sss.aa.', '.aacccccaa.', '..ccwwwcc..', '..ccwwwcc..', '..ccccccc..', '..ccccccc..', '..gg...gg..', '..gg...gg..', '.bbb...bbb.'],
    ['...hhhhh...', '..rrrrrrr..', '..hhhhhhh..', '...hhhhh...', '..a.sss.aa.', '..acccccaa.', '..ccwwwcc..', '..ccwwwcc..', '..ccccccc..', '..ccccccc..', '..gg...gg..', '..gg...gg..', '.bbb...bbb.'],
    ['...hhhhh...', '..rrrrrrr..', '..hhhhhhh..', '...hhhhh...', 'a...sss...a', '.a.ccccc.a.', '..ccwwwcc..', '..ccwwwcc..', '..ccccccc..', '..ccccccc..', '..gg...gg..', '..gg...gg..', '.bbb...bbb.'],
  ];
  var M_PAL = { h: INK, r: CRIMSON, a: '#e8b890', s: '#e8b890', c: INDIGO, w: PAPER, g: '#5a5a6a', b: INK };
  var PAMPAS = ['.y.y.', 'y.y.y', '.yyy.', '..g..', '..g..', '..g..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, dist, rt, roundT, taps, feverTaps, reeled, gloves, score, lastTap, spin, wind, lull, phase, phT, warned;
  var ready, halt, over, won, endT, resT, sent, prevBest, mood, moodT, flyAway, caughtList;

  function cfg() { return ROUNDS[Math.min(ri, ROUNDS.length - 1)]; }

  function setupRound(i) {
    ri = i; dist = ROUNDS[i].len; rt = 0; roundT = ROUNDS[i].time; phase = 'reel'; phT = 0; warned = {}; flyAway = null;
  }

  function initGame() {
    setupRound(0);
    taps = 0; feverTaps = 0; reeled = 0; gloves = GLOVES; score = 0; lastTap = -9; spin = 0; wind = 0; lull = false;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
    mood = 0; moodT = 0; caughtList = [];
  }

  // ── 風(プレイ・デモ共通) ──
  function windAt(c, t) {
    var w = 0;
    for (var i = 0; i < c.gusts.length; i++) { var g = c.gusts[i]; if (t >= g.at && t < g.at + g.dur) w += g.pow; }
    return w;
  }
  function lullAt(c, t) {
    for (var i = 0; i < c.lulls.length; i++) { var l = c.lulls[i]; if (t >= l.at && t < l.at + l.dur) return true; }
    return false;
  }

  // ── ひと巻き(プレイ・デモ共通) ──
  function crank(vol) {
    var v = vol || 1;
    if (phase !== 'reel') { game.audio.tone(260, 0.03, { wave: 'sine', volume: 0.03 * v }); return; }
    var gap = game.time.elapsed - lastTap;
    lastTap = game.time.elapsed;
    var step = lull ? STEP * 2 : STEP;
    if (wind > 0) step *= 0.85;
    dist -= step; reeled += step; taps++;
    if (lull) feverTaps++;
    spin += 0.9;
    if (state === S.PLAYING) score += lull ? 20 : 10;
    mood = 0;
    var pitch = 300 + Math.min(10, Math.floor(1 / Math.max(0.05, gap))) * 40;
    game.audio.tone(pitch, 0.04, { wave: lull ? 'square' : 'triangle', volume: 0.07 * v });
    game.fx.burst(REEL_X, REEL_Y - 80, { color: lull ? GOLD : PAPER, count: lull ? 5 : 3, speed: 200 });
    if (dist <= 0) caught(v);
  }

  function caught(v) {
    dist = 0; phase = 'caught'; phT = 0.9;
    mood = 2; moodT = 0.9;
    game.feedback.good(REEL_X, H * 0.55, { text: roundT > 1.5 ? 'PERFECT' : 'GOOD', color: GOLD, count: 18, volume: 0.6 * v });
    if (state === S.PLAYING) {
      var bonus = 300 + Math.floor(roundT * 60);
      score += bonus; caughtList.push(true);
      game.fx.popup('+' + bonus, W / 2, H * 0.42, { color: WHITE, size: 64 });
      game.audio.play('se_milestone', 0.45);
    }
  }

  function nextRound() {
    if (ri >= ROUNDS.length - 1) { finish(caughtList.length > 0 && gloves > 0); return; }
    setupRound(ri + 1);
    game.audio.tone(392, 0.12, { wave: 'triangle', volume: 0.07, slide: 300 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += gloves * 150;
    mood = ok ? 2 : 1; moodT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.25 + (i % 2) * 0.1), { color: i % 2 ? GOLD : CRIMSON, count: 18, speed: 440 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { meters: Math.floor(reeled), taps: taps, fever: feverTaps, kites: caughtList.length, gloves: gloves };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    crank(1);
  });

  // ── 描画(板ポリの凧を距離で拡縮、真下に接地影) ──
  function far() { return Math.max(0, Math.min(1.25, dist / (cfg().len + 6))); }

  function kitePos() {
    var f = far();
    var y = H * 0.47 - f * H * 0.27 + (lull ? 30 : 0);
    var x = W / 2 + Math.sin(game.time.elapsed * 1.3) * 70 * f + wind * 22;
    if (phase === 'caught') { var k = 1 - phT / 0.9; x += (REEL_X - x) * k; y += (H * 0.62 - y) * k; }
    return { x: x, y: y, px: Math.round(6 + (1 - Math.min(1, f)) * 13), f: f };
  }

  function drawField() {
    game.draw.gradient(0, H, [[0, SKY], [0.3, AIR], [0.42, HAZE], [0.42, '#b8d8a0'], [0.5, RIVER], [0.56, RIVER], [0.56, '#a8c888'], [0.78, GRASS], [1, '#3a7a3a']]);
    // 遠景: 鉄橋と街(彩度を落とす)
    for (var b = 0; b < 8; b++) game.draw.rect(b * 140 + 10, H * 0.42 - 40 - (b * 37) % 50, 110, 40 + (b * 37) % 50, '#a0b4c4');
    game.draw.rect(0, H * 0.405, W, 12, '#8a9aaa');
    for (var a = 0; a < 7; a++) game.draw.line(a * 170, H * 0.405, a * 170 + 85, H * 0.38, '#8a9aaa', 6);
    // 遠くの凧(小さく淡く)
    for (var k = 0; k < 3; k++) {
      var kx = W * (0.15 + k * 0.35) + Math.sin(game.time.elapsed * 0.8 + k) * 20, ky = H * (0.17 + k * 0.03);
      game.draw.sprite(KITE[0], { r: '#d0a8a8', w: '#eef2f6', k: '#a0a8b0', m: '#d0a8a8' }, kx, ky, 3, { anchor: 'center' });
    }
    // 川面のきらめき
    for (var r = 0; r < 8; r++) game.draw.rect((r * 160 + game.time.elapsed * 30) % W, H * 0.52 + (r % 3) * 20, 50, 5, WHITE, 0.5);
    // 手前のススキと旗(距離で大きさが違う板)
    var sway = wind > 0 || gustSoon() ? Math.sin(game.time.elapsed * 18) * 6 + 6 : Math.sin(game.time.elapsed * 2) * 2;
    var rows = [[H * 0.6, 6, 0.6], [H * 0.68, 9, 0.8], [H * 0.77, 13, 1]];
    for (var q = 0; q < rows.length; q++) {
      var ry = rows[q][0], px = rows[q][1];
      for (var c = 0; c < 6; c++) {
        var cx = ((c * 210 + q * 90) % (W + 100)) - 30;
        if (Math.abs(cx - W / 2) < 150 && q === 2) continue;
        game.draw.rect(cx - px * 2, ry + px * 3, px * 4, px, INK, 0.15);
        game.draw.sprite(PAMPAS, { y: q < 1 ? '#e8e0c0' : '#f0e0a0', g: q < 1 ? '#a8b890' : '#7a9a5a' }, cx + sway * rows[q][2], ry, px, { anchor: 'center' });
      }
    }
    // のぼり旗(風の予告)
    for (var f = 0; f < 2; f++) {
      var fx = f === 0 ? W * 0.1 : W * 0.9, fy = H * 0.62;
      game.draw.line(fx, fy, fx, fy - 260, BAMBOO, 10);
      var flap = wind > 0 || gustSoon() ? 1 : 0.3;
      for (var s = 0; s < 4; s++) game.draw.rect(fx + 6, fy - 250 + s * 40, 70 + Math.sin(game.time.elapsed * 20 * flap + s) * 20 * flap, 34, s % 2 ? WHITE : CRIMSON);
    }
  }

  function gustSoon() {
    var c = cfg();
    for (var i = 0; i < c.gusts.length; i++) { var lead = c.gusts[i].at - rt; if (lead > 0 && lead < 0.6) return true; }
    return false;
  }

  function drawWindStreaks() {
    var soon = gustSoon();
    if (!(wind > 0 || soon)) return;
    for (var i = 0; i < 9; i++) {
      var sx = ((i * 157 + game.time.elapsed * (wind > 0 ? 1400 : 500)) % (W + 300)) - 200;
      var sy = H * 0.15 + i * 70;
      game.draw.line(sx, sy, sx + (wind > 0 ? 180 : 90), sy - 10, WHITE, wind > 0 ? 6 : 4);
    }
    if (soon && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.circle(70, H * 0.3, 44, CRIMSON);
      game.draw.rect(64, H * 0.3 - 28, 12, 34, WHITE);
      game.draw.rect(64, H * 0.3 + 14, 12, 12, WHITE);
    }
  }

  function drawKiteAndString(hl) {
    if (flyAway) {
      flyAway.x += 500 * game.time.delta; flyAway.y -= 300 * game.time.delta;
      game.draw.sprite(KITE[1], { r: KITE_COLS[ri % 3], w: PAPER, k: INK, m: INK }, flyAway.x, flyAway.y, 7, { anchor: 'center' });
      game.draw.line(REEL_X, REEL_Y - 40, REEL_X + 60, H * 0.6, INK, 3);
      return;
    }
    var p = kitePos();
    // 真下の接地影(河原の上)
    var sy = H * 0.6 + (1 - Math.min(1, p.f)) * H * 0.14;
    var sw = p.px * 6;
    for (var e = -2; e <= 2; e++) game.draw.rect(p.x - sw * (1 - Math.abs(e) * 0.25), sy + e * 5, sw * 2 * (1 - Math.abs(e) * 0.25), 5, INK, 0.12);
    // 糸(たるみ付き)
    var sx0 = REEL_X, sy0 = REEL_Y - 60, kb = p.y + p.px * 4;
    var sag = 40 + p.f * 80 + (lull ? 60 : 0) - wind * 8;
    var px0 = sx0, py0 = sy0;
    for (var k = 1; k <= 8; k++) {
      var t = k / 8;
      var x = sx0 + (p.x - sx0) * t, y = sy0 + (kb - sy0) * t + Math.sin(t * Math.PI) * sag;
      game.draw.line(px0, py0, x, y, lull ? GOLD : INK, hl ? 6 : 3);
      px0 = x; py0 = y;
    }
    // 尾
    for (var tl = 0; tl < 2; tl++) {
      var tx = p.x + (tl ? 1 : -1) * p.px * 3;
      game.draw.line(tx, kb, tx - wind * 10 + Math.sin(game.time.elapsed * 8 + tl) * p.px * 2, kb + p.px * 9, KITE_COLS[ri % 3], Math.max(3, p.px * 0.6));
    }
    var col = hl ? WHITE : KITE_COLS[ri % 3];
    var faded = p.f > 0.7;
    var fr = KITE[wind > 0 || hl ? 1 : 0];
    var sc = hl ? Math.round(p.px * (1 + hl * 0.4)) : p.px;
    if (hl) game.draw.circle(p.x, p.y, sc * 7, WHITE, hl * 0.6);
    game.draw.sprite(fr, { r: faded ? '#c87070' : col, w: faded ? '#f4f0ea' : PAPER, k: INK, m: CRIMSON }, p.x, p.y, sc, { anchor: 'center' });
  }

  function drawMaster() {
    var fr = moodT > 0 ? (mood === 2 ? 2 : 0) : (game.time.elapsed - lastTap < 0.12 ? 1 : 0);
    var lean = wind > 0 ? Math.sin(game.time.elapsed * 30) * 6 : 0;
    for (var e = -2; e <= 2; e++) game.draw.rect(W / 2 - 110 * (1 - Math.abs(e) * 0.25), H * 0.79 + e * 6, 220 * (1 - Math.abs(e) * 0.25), 6, INK, 0.12);
    game.draw.sprite(MASTER[fr], M_PAL, W / 2 + lean, H * 0.7, 18, { anchor: 'center' });
  }

  function drawReel() {
    // 親指ゾーン: 糸巻き(巻くほど糸が太る)
    var wound = Math.min(1, reeled / 90);
    var glow = phase === 'reel' && !over;
    game.draw.circle(REEL_X, REEL_Y, 170, lull ? GOLD : glow ? PAPER : '#c8c0b0', lull ? 0.5 : 0.25);
    game.draw.circle(REEL_X, REEL_Y, 140, BAMBOO);
    game.draw.circle(REEL_X, REEL_Y, 70 + wound * 50, '#f0e8d8');
    for (var r = 0; r < 4; r++) game.draw.circle(REEL_X, REEL_Y, 60 + wound * 50 - r * 12, '#d8d0c0', 0.5);
    game.draw.circle(REEL_X, REEL_Y, 34, '#8a6a30');
    for (var s = 0; s < 4; s++) {
      var a = spin + s * Math.PI / 2;
      game.draw.line(REEL_X, REEL_Y, REEL_X + Math.cos(a) * 140, REEL_Y + Math.sin(a) * 140, '#8a6a30', 10);
    }
    var ha = spin;
    game.draw.circle(REEL_X + Math.cos(ha) * 140, REEL_Y + Math.sin(ha) * 140, 26, CRIMSON);
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < ROUNDS.length; i++) {
      var got = i < caughtList.length ? caughtList[i] : null;
      game.draw.sprite(KITE[0], { r: got === null ? '#9ab0c4' : got ? KITE_COLS[i] : '#5a5a5a', w: PAPER, k: INK, m: INK }, 70 + i * 74, 96, 6, { anchor: 'center' });
    }
    big(Math.max(0, Math.ceil(dist)) + 'm', W / 2, 96, 66, WHITE);
    for (var g = 0; g < GLOVES; g++) {
      var gx = W - 90 - g * 90, c = g < gloves ? CRIMSON : '#7a8a9a';
      game.draw.rect(gx - 24, 76, 48, 46, c);
      game.draw.rect(gx - 34, 70, 14, 30, c);
    }
    var fr = Math.max(0, roundT / cfg().time);
    game.draw.rect(60, 176, W - 120, 22, INK, 0.5);
    game.draw.rect(60, 176, (W - 120) * fr, 22, roundT < 1.2 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? CRIMSON : GOLD);
    big(String(score), W / 2, 238, 40, PAPER);
  }

  // ── ATTRACT デモ: 連打で1枚巻き取る → 次の凧で突風が来て手を止めると糸が出ていく ──
  var DEMO_CFG = [
    { len: 20, time: 9, gusts: [], lulls: [] },
    { len: 20, time: 9, gusts: [{ at: 0.6, dur: 1.4, pow: 6 }], lulls: [] },
  ];
  var demo = { t: 0, press: 0, next: 0, part: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { ROUNDS_SAVE = null; ri = 0; dist = 20; rt = 0; phase = 'reel'; demo.part = 0; demo.next = 0.3; flyAway = null; mood = 0; moodT = 0; }
    var c = DEMO_CFG[demo.part];
    rt += dt;
    wind = windAt(c, rt); lull = lullAt(c, rt);
    if (phase === 'reel') {
      if (wind > 0) dist = Math.min(c.len + 8, dist + wind * dt);
      var mashing = demo.part === 0 || rt < 0.55;
      if (mashing && cyc >= demo.next) { demo.press = 0.07; demo.next = cyc + 0.14; crank(0.3); }
    } else if (phase === 'caught') {
      phT -= dt;
      if (phT <= 0) { demo.part = 1; dist = 20; rt = 0; phase = 'reel'; }
    }
    if (demo.press > 0) demo.press -= dt;
    if (moodT > 0) moodT -= dt;
  }
  var ROUNDS_SAVE = null;

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawField();
      drawWindStreaks();
      drawKiteAndString(0);
      drawMaster();
      drawReel();
      game.draw.hand(REEL_X + 60, REEL_Y - 20, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.07, 100, CRIMSON);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 40, INDIGO);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.97, 44, GOLD);
      else big('INSERT COIN', W / 2, H * 0.97, 38, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      if (moodT > 0) moodT -= dt;
      wind = 0; lull = false;
      drawField();
      drawMaster();
      drawReel();
      game.draw.rect(60, H * 0.13, W - 120, H * 0.24, INK, 0.75);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.175, 104, won ? GOLD : CRIMSON);
      big('SCORE ' + score, W / 2, H * 0.23, 56, WHITE);
      big(caughtList.filter(function (c) { return c; }).length + ' / ' + ROUNDS.length + '   ' + Math.floor(reeled) + 'm', W / 2, H * 0.275, 42, AIR);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.32, 58, GOLD);
      else big('BEST ' + Math.max(prevBest, score), W / 2, H * 0.32, 40, PAPER);
      if (!won) big('あと' + Math.max(1, Math.ceil(dist)) + 'm!', W / 2, H * 0.36, 58, CRIMSON);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.97, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (moodT > 0) moodT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        halt = null; gloves--; caughtList.push(false);
        var kp = kitePos();
        flyAway = { x: kp.x, y: kp.y };
        mood = 1; moodT = 0.8;
        game.feedback.bad(kp.x, kp.y + 60, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (gloves <= 0) finish(false);
        else { phase = 'lost'; phT = 0.9; }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (phase === 'caught' || phase === 'lost') {
      phT -= dt;
      if (moodT > 0) moodT -= dt;
      wind = 0; lull = false;
      if (phT <= 0) nextRound();
    } else {
      var c = cfg();
      rt += dt;
      roundT -= dt;
      var wasLull = lull;
      wind = windAt(c, rt); lull = lullAt(c, rt);
      if (lull && !wasLull) { game.fx.popup('FEVER', W / 2, H * 0.36, { color: GOLD, size: 72 }); game.audio.play('se_powerup', 0.35); }
      for (var g = 0; g < c.gusts.length; g++) {
        if (!warned[g] && rt >= c.gusts[g].at - 0.6) { warned[g] = true; game.audio.tone(200, 0.6, { wave: 'sawtooth', volume: 0.05, slide: 500 }); }
      }
      if (wind > 0) dist = Math.min(c.len + 8, dist + wind * dt);
      if (moodT > 0) moodT -= dt;
      if (roundT < 1.2 && Math.floor((roundT + dt) * 4) !== Math.floor(roundT * 4)) game.audio.tone(990, 0.04, { wave: 'square', volume: 0.05 });
      if (roundT <= 0) { roundT = 0; halt = { t: 0.5, max: 0.5 }; game.fx.flash(WHITE, 0.15); }
    }

    drawField();
    drawWindStreaks();
    if (phase === 'reel' || phase === 'caught' || flyAway) drawKiteAndString(hl);
    drawMaster();
    drawReel();
    drawHud();
    if (ri === 0 && taps === 0 && ready <= 0 && !over) game.draw.hand(REEL_X + 60, REEL_Y - 20, { press: Math.floor(game.time.elapsed * 6) % 2 === 0, scale: 13, alpha: 0.6 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, CRIMSON);
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 1.5], ['R', 0.5],
    ], { tempo: 132, wave: 'triangle', volume: 0.06, loop: true, bass: [['A2', 2], ['D3', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
