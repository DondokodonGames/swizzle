// K-GBA-0022v2-theater-pit-flat-brush.js
// 奈落の書き割り払い — 食い気味の拍で落ちてくる書き割りの板を、届く拍ぎりぎりまで引きつけてから払いのける。早すぎても遅すぎても差が数字で出る
// 操作: 左右どちらかのレーンを板が落ちてくる。板の下端が点線(払い棒の高さ)に届く瞬間に、その側(画面の左半分/右半分)を押して払う。届く寸前ほど高得点。早すぎは「あと○秒」、遅すぎは「+○秒」の差が出てMISS
// 終わり: 8小節(約17秒)を乗り切ればCLEAR。早払い・遅払い・払い損ね(小道具箱に落ちる)のMISSが3回でGAME OVER
// @mechanic: near_miss
// @theme: theater_pit_flat_brush
// 世界観: 紙吹雪の舞う劇場の奈落で、裏方が上の吊り元から食い気味の拍で落ちてくる書き割りの板を、小道具箱の寸前まで引きつけて長い払い棒で払いのける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・一番ぎりぎりで払えた差(秒)・最大コンボ
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドットだけで描き、画面の帯ごとにセロハンの単色を重ねる。矩形波の単音、無音の間が緊張
  var STYLE = { bg: ['#050505', '#121212'], main: ['#f2f2f2', '#8a8a8a', '#3a3a3a'], accent: ['#ffb030', '#60ff90', '#50d8ff'] };
  var C = { bg0: STYLE.bg[0], bg1: STYLE.bg[1], white: STYLE.main[0], grey: STYLE.main[1], dim: STYLE.main[2], amber: STYLE.accent[0], green: STYLE.accent[1], cyan: STYLE.accent[2], red: '#ff4d4d' };
  // セロハン帯: HUD=琥珀 / 吊り元〜落下帯=白 / 舞台下=緑 / 親指ゾーン=水色
  var BAND1 = 232, BAND2 = H * 0.52, BAND3 = H * 0.76;
  function bandCol(y) { return y < BAND1 ? C.amber : (y < BAND2 ? C.white : (y < BAND3 ? C.green : C.cyan)); }

  var GAME_TITLE = 'PIT BRUSH';
  var BPM = 120;
  var SPB = 60 / BPM;
  var TIME_LIMIT = 17;                 // 8小節 + 1拍 = 33拍 = 16.5秒
  var LEAD = 2;                        // 落ち始めから届くまで2拍(その前に半拍ぶら下がって揺れる)
  var WIN_PE = 0.06, WIN_PL = 0.05, WIN_GE = 0.14, WIN_GL = 0.09;
  var EARLY_ZONE = 0.6, CRASH = 0.3;
  var LIVES = 3;
  var LANES = [W * 0.27, W * 0.73];
  var LOFT_Y = H * 0.13, REACH_Y = H * 0.6, CRATE_Y = H * 0.665;
  var DOT = 26, FW = 10, FH = 7;
  var FLAT_TOP0 = LOFT_Y + 24;
  // [届く拍, レーン]。x.5 は次の強拍を食う(シンコペーション)
  var CHART = [[4, 0], [6, 1], [8, 0], [9.5, 1], [11, 0], [13.5, 1], [15.5, 0], [16, 1], [17.5, 0], [19, 1],
    [20.5, 0], [21.5, 1], [23.5, 0], [24, 1], [25.5, 0], [27.5, 1], [28.5, 0], [29.5, 1], [30.5, 0], [31.5, 1]];
  var DEMO_CHART = [[4, 0], [5.5, 1], [7.5, 0], [9, 1]];
  var DEMO_PRESS = [-0.02, -0.26, -0.01, 0.0];   // ゴーストの押すずれ(2枚目はわざと早い=差の表示の実演)
  var DEMO_CYCLE = 11 * SPB + 1.2;
  var BASS = ['C3', 'C3', 'A2', 'G2'];
  // 書き割りの絵柄(白ドット)
  var ART = [
    ['....xx....', '...xxxx...', '..xxxxxx..', '.xxxxxxxx.', '...xxxx...', '....xx....', '....xx....'],
    ['....x.....', '...xxx....', '..xxxxx...', '.xxxxxxx..', '.x.xx.xx..', '.x.xx.xx..', 'xxxxxxxxxx'],
    ['......xx..', '.....xxxx.', '......xx..', 'xx........', 'xxxx..xx..', 'xxxxxxxxxx', 'xxxxxxxxxx']
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: W * 0.5, gy: H * 0.86 };
  var confetti = [];
  for (var ci = 0; ci < 46; ci++) confetti.push({ x: (ci * 233) % W, y: (ci * 397) % H, v: 40 + (ci % 7) * 14, s: 6 + (ci % 3) * 3 });

  // 裏方(帽子・払い棒を握る)。w=明 d=暗
  var HAND_A = ['...wwww...', '..wwwwww..', '...dwwd...', '...wwww...', '..dwwwwd..', '.wwwwwwww.', 'w.wwddww.w', 'w.wwwwww.w', '..ww..ww..', '..ww..ww..', '..w....w..', '.ww....ww.'];
  var HAND_B = ['...wwww...', '..wwwwww..', '...dwwd...', '...wwww...', '..dwwwwd..', '.wwwwwwww.', 'w.wwddww.w', 'w.wwwwww.w', '..ww..ww..', '..ww..ww..', '.w......w.', 'ww......ww'];
  var HAND_SWING = ['....wwww..', '...wwwwww.', '....dwwd..', '....wwww..', '...dwwwwww', '..wwwwww..', '.wwwddww..', 'w.wwwwww..', '..ww..ww..', '..ww...ww.', '..w.....w.', '.ww.....ww'];
  var HAND_OOPS = ['..wwww....', '.wwwwww...', 'w..wddw..w', 'w..wwww..w', '.w.dwwd.w.', '..wwwwww..', '..wwddww..', '..wwwwww..', '..ww..ww..', '..ww..ww..', '..w....w..', '.ww....ww.'];
  var PAL_HAND = { w: C.green, d: '#1f5a32' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.bg0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function newRun(isDemo) {
    var chart = isDemo ? DEMO_CHART : CHART;
    var flats = [];
    for (var i = 0; i < chart.length; i++) {
      flats.push({ T: chart[i][0], lane: chart[i][1], art: i % ART.length, st: 'wait', flash: 0, vx: 0, vy: 0, ox: 0, oy: 0, plan: isDemo ? DEMO_PRESS[i] : 0 });
    }
    var lastT = chart[chart.length - 1][0];
    return {
      demo: isDemo, flats: flats, songT: 0, beatIdx: -1, stepIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, closest: -1,
      swing: null, gap: null, pulse: 0, oops: 0, padFlash: [0, 0],
      stop: 0, stopFlat: null, over: false, ok: false, endWait: 0,
      endBeat: Math.ceil(lastT) + 1.5, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
  }

  // ── 板の位置 ──────────────────────────────────────────
  function flatBottom(f, t) {
    var tArr = f.T * SPB, t0 = tArr - LEAD * SPB;
    var top0 = FLAT_TOP0 + FH * DOT;
    if (t < t0) return top0 + Math.sin(t * 30) * 3;
    var p = (t - t0) / (LEAD * SPB);
    if (p <= 1) return top0 + (REACH_Y - top0) * Math.pow(p, 1.6);
    return REACH_Y + (t - tArr) * 520;           // 届いた後は小道具箱へ沈み込む(遅い)
  }

  // ── 音(拍クロック駆動の食い気味グルーヴ。矩形波の単音+隙間) ─────
  function playStep(st, vol) {
    var bar = Math.floor(st / 8), s8 = st % 8;
    var bn = BASS[bar % 4];
    game.audio.tone(3000, 0.015, { wave: 'square', volume: 0.01 * vol });
    if (s8 === 0) { game.audio.tone(90, 0.1, { wave: 'square', volume: 0.09 * vol, slide: -40 }); game.audio.tone(bn, SPB * 0.4, { wave: 'square', volume: 0.06 * vol }); }
    if (s8 === 3 || s8 === 7) game.audio.tone(bn, SPB * 0.6, { wave: 'square', volume: 0.06 * vol });   // 食いのベース
    if (s8 === 5) game.audio.tone(90, 0.08, { wave: 'square', volume: 0.07 * vol, slide: -40 });
    if (s8 === 2 || s8 === 6) game.audio.tone(330, 0.05, { wave: 'square', volume: 0.04 * vol, slide: -200 });
  }

  function onBeat(b) { R.pulse = 1; }

  // ── 判定 ──────────────────────────────────────────────
  // 戻り値: 'PERFECT'|'GOOD'|'early'|'late'|'whiff'|'none'
  function swing(lane) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.swing = { lane: lane, t: 0.2 };
    R.padFlash[lane] = 0.15;
    var now = R.songT, best = null, bestE = 1e9;
    for (var i = 0; i < R.flats.length; i++) {
      var f = R.flats[i];
      if (f.lane !== lane || (f.st !== 'fall' && f.st !== 'hang')) continue;
      var e = now - f.T * SPB;
      if (e > -EARLY_ZONE && e <= CRASH && Math.abs(e) < Math.abs(bestE)) { best = f; bestE = e; }
    }
    if (!best) return 'whiff';
    R.gap = { lane: lane, y: Math.min(flatBottom(best, now), CRATE_Y), e: bestE, t: 1.0 };
    if (bestE >= -WIN_PE && bestE <= WIN_PL) { hitFlat(best, 'PERFECT', bestE); return 'PERFECT'; }
    if (bestE >= -WIN_GE && bestE <= WIN_GL) { hitFlat(best, 'GOOD', bestE); return 'GOOD'; }
    missFlat(best, bestE < 0 ? 'early' : 'late', bestE);
    return bestE < 0 ? 'early' : 'late';
  }

  function hitFlat(f, grade, e) {
    f.st = 'hit'; f.baseY = flatBottom(f, R.songT);
    f.vx = (f.lane === 0 ? -1 : 1) * 900; f.vy = -500; f.ox = 0; f.oy = 0;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var add = grade === 'PERFECT' ? 100 + Math.round(50 * (1 - Math.abs(e) / WIN_PE)) : 50;
    add += R.combo * 10;
    if (grade === 'PERFECT') R.perfect++; else R.good++;
    if (R.closest < 0 || Math.abs(e) < R.closest) R.closest = Math.abs(e);
    R.score += add;
    var x = LANES[f.lane];
    game.feedback.good(x, REACH_Y - 60, { text: grade, color: grade === 'PERFECT' ? C.amber : C.white, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.popup('+' + add, x, REACH_Y + 70, { color: C.green, size: 42 });
    game.audio.tone(grade === 'PERFECT' ? 'E6' : 'C6', 0.07, { wave: 'square', volume: R.demo ? 0.04 : 0.08 });
    if (!R.demo && R.combo > 0 && R.combo % 5 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.3, { color: C.amber, size: 68 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missFlat(f, kind, e) {
    f.st = 'miss'; f.flash = 0.45; f.kind = kind; f.err = e;
    f.baseY = Math.min(flatBottom(f, R.songT), CRATE_Y + 30); f.missT = R.songT;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopFlat = f; R.oops = 1.3;
    game.audio.tone(kind === 'crash' ? 120 : 180, 0.3, { wave: 'square', volume: R.demo ? 0.05 : 0.1, slide: -60 });
  }

  function releaseStop() {
    var f = R.stopFlat;
    R.stopFlat = null;
    if (!f) return;
    var x = LANES[f.lane];
    game.feedback.bad(x, CRATE_Y, { text: 'MISS' });
    if (f.kind === 'early') game.fx.popup('あと' + (-f.err).toFixed(2) + '秒', x, REACH_Y - 150, { color: C.amber, size: 50 });
    else if (f.kind === 'late') game.fx.popup('+' + f.err.toFixed(2) + '秒', x, REACH_Y - 150, { color: C.red, size: 50 });
    else game.fx.burst(x, CRATE_Y, { color: C.green, count: 16, speed: 360 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.7;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) game.audio.melody([['C5', 0.5], ['R', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM, wave: 'square', volume: 0.06 });
    else game.audio.melody([['G4', 0.5], ['R', 0.5], ['E4', 0.5], ['C4', 2]], { tempo: BPM, wave: 'square', volume: 0.06 });
    if (R.score > R.prevBest && R.score > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.amber, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    var e = game.time.elapsed;
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    R.padFlash[0] = Math.max(0, R.padFlash[0] - dt); R.padFlash[1] = Math.max(0, R.padFlash[1] - dt);
    if (R.swing) { R.swing.t -= dt; if (R.swing.t <= 0) R.swing = null; }
    if (R.gap) { R.gap.t -= dt; if (R.gap.t <= 0) R.gap = null; }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; playStep(R.stepIdx, R.demo ? 0.45 : 1); }
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    for (var i = 0; i < R.flats.length; i++) {
      var f = R.flats[i];
      var tArr = f.T * SPB;
      if (f.flash > 0) f.flash = Math.max(0, f.flash - dt);
      if (f.st === 'wait' && R.songT >= tArr - (LEAD + 0.5) * SPB) {
        f.st = 'hang';
        game.audio.tone(f.lane === 0 ? 'A5' : 'E6', 0.05, { wave: 'square', volume: R.demo ? 0.03 : 0.06 });   // 吊り元がきしむ予告
      }
      if (f.st === 'hang' && R.songT >= tArr - LEAD * SPB) f.st = 'fall';
      if (f.st === 'fall' && R.songT > tArr + CRASH) { missFlat(f, 'crash', CRASH); return; }
      if (f.st === 'hit') {
        f.vy += 1800 * dt; f.ox += f.vx * dt; f.oy += f.vy * dt;
        if (f.oy > 900) f.st = 'gone';
      }
      if (f.st === 'miss' && R.songT > tArr + CRASH + SPB) f.st = 'gone';
    }
    for (var c = 0; c < confetti.length; c++) {
      confetti[c].y += confetti[c].v * dt;
      confetti[c].x += Math.sin(e * 2 + c) * 20 * dt;
      if (confetti[c].y > H) confetti[c].y = 232;
    }
    if (!R.demo && (R.songT >= R.endBeat * SPB || R.songT >= TIME_LIMIT)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(届く寸前で払う / 早すぎて差が出る失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; demo.pt = 0; }
    var next = null;
    for (var i = 0; i < R.flats.length; i++) {
      var f = R.flats[i];
      if (f.st === 'wait' || f.st === 'hang' || f.st === 'fall') { next = f; break; }
    }
    if (next && R.stop <= 0 && R.songT >= next.T * SPB + next.plan) {
      swing(next.lane);
      demo.pt = 0.18;
    }
    demo.pt = Math.max(0, (demo.pt || 0) - dt);
    demo.press = demo.pt > 0;
    var lane = next ? next.lane : 0;
    var tx = LANES[lane], ty = H * 0.865 + (demo.press ? 0 : -40 + Math.sin(demo.t * 5) * 10);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 10);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 10);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg0], [1, C.bg1]]);
    // 吊り元のバトンと滑車
    for (var x = 40; x < W; x += 32) game.draw.rect(x, LOFT_Y - 10, 18, 8, bandCol(LOFT_Y));
    for (var l = 0; l < 2; l++) {
      game.draw.circle(LANES[l], LOFT_Y - 6, 18, C.grey);
      game.draw.circle(LANES[l], LOFT_Y - 6, 8, C.bg0);
      for (var y = LOFT_Y + 20; y < REACH_Y; y += 40) game.draw.rect(LANES[l] - 2, y, 4, 14, C.dim);
    }
    // 払い棒の届く線(点線)
    for (var l2 = 0; l2 < 2; l2++) {
      for (var dx = -170; dx <= 170; dx += 34) game.draw.rect(LANES[l2] + dx - 8, REACH_Y - 4, 16, 8, bandCol(REACH_Y));
    }
    // 小道具箱
    for (var k = 0; k < 2; k++) {
      var cx = LANES[k], hit = false;
      for (var i = 0; i < R.flats.length; i++) if (R.flats[i].lane === k && R.flats[i].flash > 0) hit = true;
      var col = hit && Math.floor(e * 20) % 2 ? C.white : bandCol(CRATE_Y);
      game.draw.rect(cx - 110, CRATE_Y, 220, 8, col);
      game.draw.rect(cx - 110, CRATE_Y + 112, 220, 8, col);
      game.draw.rect(cx - 110, CRATE_Y, 8, 120, col);
      game.draw.rect(cx + 102, CRATE_Y, 8, 120, col);
      game.draw.line(cx - 104, CRATE_Y + 6, cx + 104, CRATE_Y + 114, col, 6);
      game.draw.line(cx + 104, CRATE_Y + 6, cx - 104, CRATE_Y + 114, col, 6);
    }
    // 舞台の床(奈落の天井)
    for (var fx = 0; fx < W; fx += 24) game.draw.rect(fx, H * 0.75, 14, 6, bandCol(H * 0.74));
    // 紙吹雪
    for (var c = 0; c < confetti.length; c++) {
      var p = confetti[c];
      var on = Math.floor(e * 6 + c) % 3 !== 0;
      game.draw.rect(p.x, p.y, p.s, on ? p.s : 2, bandCol(p.y), 0.7);
    }
  }

  function drawFlat(f) {
    if (f.st === 'wait' || f.st === 'gone') return;
    var bot = flatBottom(f, R.songT);
    if (f.st === 'hit') bot = f.baseY;
    if (f.st === 'miss') bot = R.stopFlat === f ? f.baseY : Math.min(CRATE_Y + 30, f.baseY + (R.songT - f.missT) * 900);
    var white = f.flash > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0;
    var scale = f.flash > 0 ? 1.15 : 1;
    var d = DOT * scale;
    var x0 = LANES[f.lane] - (FW * d) / 2 + f.ox, y0 = bot - FH * d + f.oy;
    // 吊りロープ
    if (f.st === 'hang' || f.st === 'fall') {
      game.draw.line(LANES[f.lane] - 80, LOFT_Y, x0 + 50, y0, C.dim, 3);
      game.draw.line(LANES[f.lane] + 80, LOFT_Y, x0 + FW * d - 50, y0, C.dim, 3);
    }
    if (white) game.draw.rect(x0 - 8, y0 - 8, FW * d + 16, FH * d + 16, C.white);
    else game.draw.rect(x0, y0, FW * d, FH * d, '#262626');
    // 枠
    for (var x = 0; x < FW; x++) {
      game.draw.rect(x0 + x * d + 4, y0 - 10, d - 8, 6, white ? C.bg0 : bandCol(y0));
      game.draw.rect(x0 + x * d + 4, y0 + FH * d + 4, d - 8, 6, white ? C.bg0 : bandCol(y0 + FH * d));
    }
    var art = ART[f.art];
    for (var r = 0; r < FH; r++) {
      var yy = y0 + r * d;
      var col = white ? C.bg0 : bandCol(yy + d / 2);
      for (var c = 0; c < FW; c++) {
        if (art[r].charAt(c) === 'x') game.draw.rect(x0 + c * d + 3, yy + 3, d - 6, d - 6, col);
        else if ((r + c) % 3 === 0) game.draw.rect(x0 + c * d + d / 2 - 2, yy + d / 2 - 2, 4, 4, col, 0.5);
      }
    }
  }

  function drawGap() {
    if (!R.gap) return;
    var g = R.gap;
    var x = LANES[g.lane] + (g.lane === 0 ? 200 : -200);
    var y1 = Math.min(g.y, REACH_Y), y2 = Math.max(g.y, REACH_Y);
    var col = Math.abs(g.e) <= WIN_PE ? C.amber : (g.e < 0 ? C.white : C.red);
    for (var y = y1; y <= y2; y += 14) game.draw.rect(x - 4, y, 8, 8, col, Math.min(1, g.t * 2));
    game.draw.rect(x - 22, y1 - 3, 44, 6, col, Math.min(1, g.t * 2));
    game.draw.rect(x - 22, y2 - 3, 44, 6, col, Math.min(1, g.t * 2));
  }

  function drawHand() {
    var e = game.time.elapsed;
    var hx = W * 0.5, hy = H * 0.665;
    var sw = R.swing;
    var frame = R.oops > 0 ? HAND_OOPS : (sw ? HAND_SWING : (Math.floor(e * BPM / 60) % 2 === 0 ? HAND_A : HAND_B));
    game.draw.sprite(frame, PAL_HAND, hx, hy - R.pulse * 8, 13, { anchor: 'center', flipX: !!(sw && sw.lane === 0) });
    // 払い棒
    var tipX = hx + 30, tipY = hy - 200;
    if (sw) {
      var k = 1 - sw.t / 0.2;
      var dir = sw.lane === 0 ? -1 : 1;
      tipX = hx + dir * (120 + 250 * Math.sin(Math.min(1, k * 1.4) * Math.PI / 2));
      tipY = REACH_Y - 20 + (1 - k) * -60;
    }
    game.draw.line(hx + (sw && sw.lane === 0 ? -30 : 30), hy - 10, tipX, tipY, C.green, 10);
    game.draw.rect(tipX - 26, tipY - 10, 52, 20, C.green);
  }

  function drawPads() {
    for (var l = 0; l < 2; l++) {
      var x = LANES[l], y = H * 0.865, on = R.padFlash[l] > 0;
      var soon = false;
      for (var i = 0; i < R.flats.length; i++) {
        var f = R.flats[i];
        if (f.lane === l && f.st === 'fall' && f.T * SPB - R.songT < SPB * 0.6) soon = true;
      }
      var col = on ? C.white : C.cyan;
      game.draw.rect(x - 190, y - 90, 380, 10, col, soon ? 1 : 0.5);
      game.draw.rect(x - 190, y + 80, 380, 10, col, soon ? 1 : 0.5);
      game.draw.rect(x - 190, y - 90, 10, 180, col, soon ? 1 : 0.5);
      game.draw.rect(x + 180, y - 90, 10, 180, col, soon ? 1 : 0.5);
      if (on) game.draw.rect(x - 180, y - 80, 360, 160, C.cyan, 0.25);
      // 払う向きの印(外向きの3本線)
      var dir = l === 0 ? -1 : 1;
      for (var s = 0; s < 3; s++) game.draw.rect(x + dir * (s * 40 - 20) - 12, y - 30 + s * 10, 24, 60 - s * 20, col, 0.8);
    }
  }

  function drawOverlay() {
    // セロハンの帯(ごく薄く全面に重ねる)
    game.draw.rect(0, 0, W, BAND1, C.amber, 0.07);
    game.draw.rect(0, BAND2, W, BAND3 - BAND2, C.green, 0.05);
    game.draw.rect(0, BAND3, W, H - BAND3, C.cyan, 0.06);
    for (var y = 0; y < H; y += 6) game.draw.rect(0, y, W, 2, C.bg0, 0.22);
  }

  function drawWorld() {
    drawBg();
    for (var i = 0; i < R.flats.length; i++) drawFlat(R.flats[i]);
    drawGap();
    drawHand();
    drawPads();
  }

  // 拍の物差し: 1小節を8分で8マス。大きい点=拍、小さい点=裏。今の小節に届く板の位置に印
  function drawRuler(y) {
    var x0 = W / 2 - 280, stepW = 80;
    var bar = R.beatIdx < 0 ? 0 : Math.floor(R.beatIdx / 4);
    var cur = R.ready > 0 ? -1 : Math.floor(R.songT / (SPB / 2)) - bar * 8;
    for (var s = 0; s < 8; s++) {
      var big = s % 2 === 0;
      var x = x0 + s * stepW;
      var lit = s === cur;
      game.draw.rect(x - (big ? 14 : 8), y - (big ? 14 : 8), big ? 28 : 16, big ? 28 : 16, lit ? C.white : C.dim);
    }
    for (var i = 0; i < R.flats.length; i++) {
      var f = R.flats[i];
      if (f.st === 'gone' || f.st === 'hit' || f.st === 'miss') continue;
      var rel = f.T - bar * 4;
      if (rel < 0 || rel >= 4) continue;
      var xx = x0 + rel * 2 * stepW;
      game.draw.rect(xx - 10, y - 46, 20, 20, rel % 1 !== 0 ? C.amber : C.white);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, BAND1, C.bg0, 0.6);
    txt('SCORE ' + R.score, 40, 56, 44, C.amber, 'left');
    txt('BEST ' + game.best, W - 40, 56, 34, C.amber, 'right');
    var done = 0;
    for (var i = 0; i < R.flats.length; i++) if (R.flats[i].st === 'hit' || R.flats[i].st === 'miss' || R.flats[i].st === 'gone') done++;
    txt(done + ' / ' + R.flats.length, 40, 128, 36, C.amber, 'left');
    drawRuler(150);
    for (var l = 0; l < LIVES; l++) game.draw.rect(W - 80 - l * 56, 112, 36, 36, l < R.lives ? C.amber : C.dim);
    var progress = Math.min(1, R.songT / (R.endBeat * SPB));
    game.draw.rect(40, 206, W - 80, 12, C.dim);
    game.draw.rect(40, 206, (W - 80) * progress, 12, C.amber);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.555, 40, C.green);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.white);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.36, C.bg0, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 96, R.ok ? C.white : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 36, C.grey);
    txt('MAX COMBO ' + R.maxCombo, W / 2 - 30, H * 0.435, 34, C.grey, 'right');
    if (R.closest >= 0) {
      game.draw.rect(W / 2 + 10, H * 0.435 - 22, 8, 44, C.amber);
      game.draw.rect(W / 2 + 10, H * 0.435 - 22, 30, 8, C.amber);
      game.draw.rect(W / 2 + 10, H * 0.435 + 14, 30, 8, C.amber);
      txt(R.closest.toFixed(2) + '秒', W / 2 + 56, H * 0.435, 40, C.amber, 'left');
    }
    if (R.score > R.prevBest && R.score > 0) txt('NEW RECORD', W / 2, H * 0.49, 52, C.amber);
    else txt('BEST ' + Math.max(R.prevBest, R.score), W / 2, H * 0.49, 44, C.amber);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.flats.length; i++) if (R.flats[i].st === 'wait' || R.flats[i].st === 'hang' || R.flats[i].st === 'fall') left++;
      txt('あと' + Math.max(1, left) + '枚', W / 2, H * 0.545, 46, C.red);
    } else if (R.prevBest > R.score) {
      txt('あと' + (R.prevBest - R.score) + '点', W / 2, H * 0.545, 46, C.white);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.rect(0, 0, W, BAND1, C.bg0, 0.6);
    game.draw.text(GAME_TITLE, W / 2 + 6, 86 + 6 + bob, { size: 112, color: '#5a3a00', bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 86 + bob, { size: 112, color: C.amber, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 186, 40, C.amber);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.cyan);
    else txt('INSERT COIN', W / 2, H * 0.955, 44, C.cyan);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var lane = x < W / 2 ? 0 : 1;
    var res = swing(lane);
    if (res === 'whiff') {
      game.audio.tone(520, 0.05, { wave: 'square', volume: 0.04, slide: -300 });
      game.fx.burst(LANES[lane], REACH_Y, { color: C.grey, count: 4, speed: 140 });
    } else if (res === 'early' || res === 'late') {
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      drawAttractHud();
      drawRuler(268);
      drawOverlay();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 44, C.cyan);
      drawOverlay();
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, closest: R.closest, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
    drawOverlay();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
