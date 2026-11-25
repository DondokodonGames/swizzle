// K-DS-0038v3-rainy-slope-shoeshine-walk.js
// 雨の坂道の靴磨き — 指を鳴らす裏拍ごとに一歩ずつ石畳の坂を上り、拍の頭に来る段差と水たまりは指を弾き上げて跳び越える
// 操作: 拍の頭で伴奏のベースが鳴り、その裏(拍のまん中)ごとに画面を軽く押して離す=指を鳴らして一歩上る(裏からのずれでPERFECT/GOOD)。段差や水たまりの手前の拍は、その拍の頭で指を上へ弾く=跳び越える(0.7秒前から赤い印が点滅し、段差はコツコツ・水たまりはポチャンと予告)。下の帯に次の動き(丸=押して離す・矢印=上へ弾く)が拍の目盛りといっしょに流れてくる。違う動き・拍外れ・押し漏らしはMISS(足を滑らせる/水たまりに踏み込む)。何もない拍の頭で押すと空振りで連続が切れる
// 終わり: 前奏1小節(少年のお手本)+7小節(100BPM・32拍・約19秒)を上り切って坂の上の家の戸口に着けばCLEAR。MISS 4回で傘が飛ばされてGAME OVER
// @mechanic: camera_run
// @theme: rainy_cobble_slope_shoeshine_walk
// 世界観: 雨の夜の港町の石畳の坂道で、傘を差した靴磨きの少年が指を鳴らしながら一歩ずつ上り、段差や水たまりを跳び越えて坂の上の家へ帰る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・上った歩数・跳び越えた数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: VOXEL BLOCK
var STYLE = { bg: ['#080a1c', '#1a2246', '#2a2a50'], main: ['#9a9ab8', '#62627e', '#3c3c58'], accent: ['#e84a5a', '#ffd27a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 石畳の坂も家も立方体の積み上げ。上面/左面/右面を3明度で塗り分け、影は落とさない
  var C = {
    ink: '#06060e', top: STYLE.main[0], left: STYLE.main[1], right: STYLE.main[2],
    red: STYLE.accent[0], lamp: STYLE.accent[1], white: '#f4f4ff', water: ['#3a6ab0', '#22487e', '#16345e'],
    panel: '#0c0e22', rain: '#9ab0e066'
  };

  var GAME_TITLE = 'RAIN STEPS';
  var BPM = 100;
  var SPB = 60 / BPM;
  var TOTAL_BEATS = 32;          // 前奏1小節 + 7小節
  var JUDGE_FROM = 4;
  var TIME_LIMIT = 20;           // 32拍 × 0.6秒 = 19.2秒
  var READY_T = 0.8;
  var LEAD = 0.06;
  var PERFECT_W = 0.05, GOOD_W = 0.11, OFF_W = 0.2;
  var TELE_T = 0.7;
  var MISS_MAX = 4;
  var MOVE_T = 0.16, JUMP_T = 0.28;
  var FLICK_PX = 70;
  var PLAY_OB = [6, 9, 12, 14, 17, 20, 22, 25, 27, 29];   // 段差/水たまりを跳ぶ拍(頭)
  var DEMO_BEATS = 14, DEMO_OB = { 6: 'puddle', 9: 'curb', 12: 'puddle' }, DEMO_FAIL_B = 12;

  // 等角の投影
  var A = 56, RISE = 24, SX0 = 360, SY0 = 1160;

  // ---- スプライト(右上へ向かって歩く少年。傘は赤) ----
  var BOY_TOP = [
    '....rrrr....', '..rrrrrrrr..', '.rrrrrrrrrr.', 'rRrrRrrRrrRr', '.......k....', '...hhhhk....',
    '..hhhhhk....', '...ssesk....', '...ssssk....', '..bbbbsk....', '.bbbbbbk....', '.bbbbbb.....',
    'xxbbbbb.....', 'xx.pppp.....'
  ];
  var BOY_A = BOY_TOP.concat(['...pp.pp....', '...oo..oo...']);
  var BOY_B = BOY_TOP.concat(['....ppp.....', '....ooo.....']);
  var BOY_JUMP = BOY_TOP.concat(['...pppp.....', '...oooo.....', '............']);
  var BOY_SNAP = BOY_A.slice();
  BOY_SNAP[7] = '.s.ssesk....';
  BOY_SNAP[8] = 's..ssssk....';
  var BOY_SLIP = BOY_TOP.slice(0, 7).concat(['...sxsxk....', '...ssssk....', '..bbbbsk....', 'bbbbbbbk....', '.bbbbbb.....', 'xxbbbbb.....', 'xx.pppp.....', '..pp...pp...', '.oo.....oo..']);
  BOY_SLIP[3] = 'rRrrRrrRrrRr';
  var BOY_PAL = { r: STYLE.accent[0], R: '#a02a3a', k: '#2a2a3a', h: '#6a4a2a', s: '#f0b890', e: '#101018', b: '#4a6a8a', x: '#8a5a2a', p: '#3a3a4a', o: '#1a1010' };
  var WHITE_PAL = {};
  (function() { for (var k in BOY_PAL) WHITE_PAL[k] = '#ffffff'; })();
  var ARROW_UP = ['...##...', '..####..', '.######.', '########', '...##...', '...##...', '...##...'];
  var UMB = ['.rrrr.', 'rrrrrr', '...k..', '...k..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, endBeats, moves, obst, nTiles, moveTotal, clock, readyT, realT, schedB, beatN, hitStop;
  var pend, camI, score, combo, maxCombo, perfects, goods, misses, done, jumps, jumpTotal;
  var over, won, outroT, prevBest, snapT, slipT, flashT, beatPulse, splash, halfDone, combo10;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }

  function buildMoves() {
    moves = []; obst = {}; jumpTotal = 0; moveTotal = 0;
    var obMap = {};
    if (demoMode) obMap = DEMO_OB;
    else for (var i = 0; i < PLAY_OB.length; i++) obMap[PLAY_OB[i]] = game.random(0, 1) < 0.5 ? 'curb' : 'puddle';
    var p = 0;
    for (var b = 0; b < endBeats; b++) {
      if (b >= JUDGE_FROM && obMap[b]) {
        obst[p + 1] = obMap[b];
        moves.push({ t: b * SPB, kind: 'jump', from: p, to: p + 2, b: b, res: '', teled: false, ob: obMap[b] });
        p += 2; jumpTotal++; moveTotal++;
      }
      var auto = b < JUDGE_FROM;
      moves.push({ t: (b + 0.5) * SPB, kind: auto ? 'auto' : 'step', from: p, to: p + 1, b: b, res: auto ? 'auto' : '' });
      p += 1;
      if (!auto) moveTotal++;
    }
    nTiles = p;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    buildMoves();
    clock = demoMode ? -0.3 : -0.08; readyT = demoMode ? 0 : READY_T; realT = 0; schedB = 0; beatN = -1; hitStop = 0;
    pend = null; camI = 0; score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; done = 0; jumps = 0;
    over = false; won = false; outroT = 0; prevBest = game.best;
    snapT = 0; slipT = 0; flashT = 0; beatPulse = 0; splash = []; halfDone = false; combo10 = false;
  }

  function sfx(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナル、Dマイナー): 頭にベース、裏に和音の刻み。少年の指が裏を鳴らす ----
  var LEAD_N = [
    ['D5', 'F5'], ['A4', 'R'], ['Bb4', 'A4'], ['G4', 'R'], ['F4', 'A4'], ['D5', 'R'], ['C5', 'Bb4'], ['A4', 'R'],
    ['Bb4', 'D5'], ['F5', 'R'], ['E5', 'D5'], ['C5', 'R'], ['A4', 'C5'], ['E5', 'R'], ['D5', 'C#5'], ['D5', 'R']
  ];
  var ROOT = ['D2', 'Bb1', 'G1', 'A1'];
  var STAB = ['F4', 'D4', 'Bb3', 'C#4'];
  function playBeat(b) {
    if (demoMode) return;
    var bar = Math.floor(b / 4) % 4;
    var ln = LEAD_N[b % LEAD_N.length];
    game.audio.melody([[ln[0], 0.5], [ln[1], 0.5]], { tempo: BPM, wave: 'square', volume: 0.024, bass: [[ROOT[bar], 0.45], ['R', 0.55]], bassWave: 'triangle', bassVolume: 0.15 });
    game.audio.melody([['R', 0.5], [STAB[bar], 0.18], ['R', 0.32]], { tempo: BPM, wave: 'triangle', volume: 0.05 });
    if (b < JUDGE_FROM) game.audio.melody([['R', 0.5], [2800, 0.06], ['R', 0.44]], { tempo: BPM, wave: 'square', volume: 0.035 });
  }

  // ---- 拍クロック(1本だけ) ----
  function moveAt(t) {
    var last = null;
    for (var i = 0; i < moves.length; i++) { if (moves[i].t <= t) last = moves[i]; else break; }
    return last;
  }
  function boyPos() {
    var mv = moveAt(clock);
    if (!mv) return { p: 0, h: 0, mv: null, f: 1 };
    var dur = mv.kind === 'jump' ? JUMP_T : MOVE_T;
    var f = clamp((clock - mv.t) / dur, 0, 1);
    var p = mv.from + (mv.to - mv.from) * ease(f);
    var h = mv.kind === 'jump' && mv.res !== 'miss' ? Math.sin(Math.PI * f) * 90 : Math.sin(Math.PI * f) * 12;
    return { p: p, h: h, mv: mv, f: f };
  }

  function stepRun(dt) {
    clock += dt;
    while (schedB < endBeats && clock >= schedB * SPB - LEAD) { playBeat(schedB); schedB++; }
    while (beatN + 1 < endBeats && clock >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    if (pend && !pend.done && clock - pend.t > 0.28) { pend.done = true; act('tap', pend.t, pend.x, pend.y); if (over || hitStop > 0) return; }
    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      if (mv.kind === 'jump' && !mv.teled && clock >= mv.t - TELE_T) {
        mv.teled = true;
        if (mv.ob === 'curb') { sfx(190, 0.05, { wave: 'square', volume: 0.06 }); sfx(150, 0.05, { wave: 'square', volume: 0.05 }); }
        else sfx('A6', 0.12, { wave: 'sine', volume: 0.06, slide: -500 });
      }
      if (mv.res || mv.t > clock) continue;
      if (pend && !pend.done && Math.abs(pend.t - mv.t) <= GOOD_W) continue;
      if (clock > mv.t + GOOD_W + 0.03) { missMove(mv, 'skip'); if (over || hitStop > 0) return; }
    }
    if (clock >= endBeats * SPB + 0.2 && !over) {
      if (!demoMode) finish(misses < MISS_MAX);
      else over = true;
    }
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function act(kind, t, x, y) {
    var best = null, bd = 9;
    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      if (mv.res) continue;
      var d = Math.abs(t - mv.t);
      if (d < bd) { bd = d; best = mv; }
    }
    if (!best || bd > OFF_W) {
      combo = 0;
      if (!demoMode) game.feedback.bad(x, y, { text: null, shake: 2, volume: 0.15 });
      return 'whiff';
    }
    if (bd > GOOD_W) { missMove(best, 'off'); return 'miss'; }
    if ((best.kind === 'jump' ? 'flick' : 'tap') !== kind) { missMove(best, kind === 'tap' ? 'trip' : 'over'); return 'miss'; }
    var w = bd <= PERFECT_W ? 'PERFECT' : 'GOOD';
    best.res = w;
    done++; combo++; if (combo > maxCombo) maxCombo = combo;
    if (w === 'PERFECT') perfects++; else goods++;
    score += (w === 'PERFECT' ? 100 : 60) + Math.min(15, combo) * 10 + (kind === 'flick' ? 50 : 0);
    var bp = boyScreen(best.to - 0.5, 0);
    if (kind === 'flick') {
      jumps++;
      if (!demoMode) game.audio.play('se_jump', 0.3);
    } else {
      snapT = 0.14;
      sfx(2800, 0.035, { wave: 'square', volume: 0.06, slide: -2000 });
      sfx(best.b % 2 ? 'A5' : 'D6', 0.08, { wave: 'triangle', volume: 0.05 });
    }
    if (demoMode) game.fx.popup(w, bp.x + 60, bp.y - 170, { color: C.lamp, size: 46 });
    else game.feedback.good(bp.x + 60, bp.y - 170, { text: w, color: w === 'PERFECT' ? C.lamp : C.white, size: w === 'PERFECT' ? 54 : 44, count: kind === 'flick' ? 14 : 8, volume: 0.1 });
    if (!demoMode && !halfDone && done >= Math.ceil(moveTotal / 2)) {
      halfDone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, 520, { color: C.lamp, size: 90 });
    }
    if (!demoMode && combo === 10 && !combo10) {
      combo10 = true;
      game.fx.popup('10 COMBO', W / 2, 640, { color: C.white, size: 70 });
      game.audio.play('se_powerup', 0.35);
    }
    return 'hit';
  }

  function missMove(mv, why) {
    mv.res = 'miss';
    misses++; combo = 0;
    hitStop = 0.4; flashT = 0.4; slipT = 0.7;
    var obTile = mv.kind === 'jump' ? mv.from + 1 : mv.to;
    var bp = boyScreen(obTile + 0.5, 0);
    var wet = mv.kind === 'jump' && mv.ob === 'puddle';
    for (var k = 0; k < 8; k++) splash.push({ x: bp.x + game.random(-40, 40), y: bp.y - game.random(0, 20), vx: game.random(-160, 160), vy: game.random(-320, -120), t: 0, col: wet ? C.water[0] : C.top });
    sfx(wet ? 160 : 110, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -60 });
    if (demoMode) { game.fx.popup('MISS', bp.x, bp.y - 200, { color: C.red, size: 58 }); game.fx.shake(4, 0.2); }
    else game.feedback.bad(bp.x, bp.y - 200, { text: 'MISS', shake: 12, flashColor: wet ? '#6aa0ff' : C.white });
    if (!demoMode && misses >= MISS_MAX) { game.audio.play('se_break', 0.3); finish(false); }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.2;
    if (ok) {
      score += (MISS_MAX - misses) * 200 + jumps * 30;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(640 + (i % 3) * 120, 560 + Math.floor(i / 3) * 140, { color: i % 2 ? C.lamp : C.red, count: 16, speed: 380 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepRun(dt);
    var bp = boyPos();
    camI += (bp.p - camI) * Math.min(1, dt * 9);
  }

  // ---- 入力: 押して離す=一歩 / 上へ弾く=跳ぶ(判定は押した瞬間の時刻) ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0 || clock < 0 || hitStop > 0 || y < 230) return;
    if (pend && !pend.done) { pend.done = true; act('tap', pend.t, pend.x, pend.y); }
    pend = { t: clock, x: x, y: y, id: id, done: false };
    pressFx = 0.12;
    game.audio.tone(880, 0.02, { wave: 'square', volume: 0.025 });
  });
  game.onMove(function(x, y, id) {
    if (!pend || pend.done || pend.id !== id || state !== S.PLAYING) return;
    if (pend.y - y > FLICK_PX) {
      pend.done = true;
      var r = act('flick', pend.t, x, y);
      flickFx = 0.25;
      if (r === 'whiff') game.audio.tone(300, 0.06, { wave: 'triangle', volume: 0.04 });
    }
  });
  game.onRelease(function(x, y, id) {
    if (!pend || pend.id !== id || state !== S.PLAYING) return;
    if (!pend.done) {
      pend.done = true;
      var r = act('tap', pend.t, x, y);
      if (r === 'whiff') game.audio.tone(240, 0.05, { wave: 'triangle', volume: 0.04 });
    }
    pend = null;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.cyc = 0; return; }
  });
  var pressFx = 0, flickFx = 0;

  // ---- 等角の描画 ----
  function zc() { return camI * RISE; }
  function P(i, j, z) {
    var di = i - camI, dj = j - 1;
    return { x: SX0 + (di - dj) * A, y: SY0 - (di + dj) * A / 2 - (z - zc()) };
  }
  function boyScreen(i, h) { return P(i, 1, elevBase(i) + h); }
  function elevBase(i) { return Math.max(0, i - 0.5) * RISE; }
  function elev(i) {
    var e = i * RISE;
    if (obst[i] === 'curb') e += 40;
    if (obst[i] === 'puddle') e -= 6;
    return e;
  }
  // 凸多角形を縦8pxの帯で塗る(回転・多角形塗りは無いので帯で作る)
  function poly(pts, col) {
    var minX = 1e9, maxX = -1e9, i;
    for (i = 0; i < pts.length; i++) { if (pts[i].x < minX) minX = pts[i].x; if (pts[i].x > maxX) maxX = pts[i].x; }
    minX = Math.max(-8, Math.floor(minX)); maxX = Math.min(W + 8, maxX);
    for (var x = minX; x < maxX; x += 8) {
      var cx = Math.min(x + 4, maxX - 0.5), lo = 1e9, hi = -1e9;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        if (p.x === q.x) continue;
        if ((cx - p.x) * (cx - q.x) > 0) continue;
        var yy = p.y + (cx - p.x) / (q.x - p.x) * (q.y - p.y);
        if (yy < lo) lo = yy;
        if (yy > hi) hi = yy;
      }
      lo = Math.max(230, lo); hi = Math.min(1440, hi);
      if (hi > lo) game.draw.rect(x, lo, Math.min(8, maxX - x), hi - lo + 1, col);
    }
  }
  function box(i0, j0, si, sj, zt, zb, cols) {
    var a = P(i0, j0, zt), b = P(i0 + si, j0, zt), c = P(i0 + si, j0 + sj, zt), d = P(i0, j0 + sj, zt);
    if (Math.max(a.x, b.x, c.x, d.x) < -20 || Math.min(a.x, b.x, c.x, d.x) > W + 20) return null;
    var ab = P(i0, j0, zb), bb = P(i0 + si, j0, zb), db = P(i0, j0 + sj, zb);
    poly([a, d, db, ab], cols[1]);
    poly([a, b, bb, ab], cols[2]);
    poly([a, b, c, d], cols[0]);
    return { a: a, b: b, c: c, d: d };
  }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(230, 1440, [[0, STYLE.bg[0]], [0.55, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 遠くの港の灯り(右下、ゆっくり流れる)
    for (var i = 0; i < 26; i++) {
      var lx = ((i * 173 - camI * 10) % 1300 + 1300) % 1300 - 100;
      var ly = 980 + (i * 97) % 380;
      game.draw.rect(lx, ly, 10, 10, i % 3 ? C.lamp : '#ff9a6a', 0.35 + 0.25 * Math.sin(t * 2 + i));
      game.draw.rect(lx, ly + 18, 10, 26, C.lamp, 0.08);
    }
    // 遠い丘の家並み(立方体のシルエット)
    for (var h = 0; h < 10; h++) {
      var hx = ((h * 150 - camI * 6) % 1500 + 1500) % 1500 - 200;
      var hh = 80 + (h * 53) % 90;
      game.draw.rect(hx, 380 - hh, 120, hh + 60, '#141a36');
      game.draw.rect(hx + 30, 400 - hh, 16, 16, '#3a3a5a');
    }
  }

  function drawHouses() {
    var k0 = Math.floor((camI - 10) / 4), k1 = Math.floor((camI + 16) / 4);
    for (var k = k1; k >= k0; k--) {
      var i0 = k * 4;
      if (i0 + 3 < 0) continue;
      var e = Math.max(0, i0) * RISE;
      var hgt = 150 + ((k * 7 + 21) % 3) * 50;
      var wallc = k % 2 ? ['#6a5a7a', '#4a3e5a', '#30283e'] : ['#7a6a5a', '#5a4a3e', '#3a3028'];
      box(i0, 2.4, 3, 2.2, e + hgt, e - 260, wallc);
      box(i0 + 0.2, 2.5, 2.6, 2.0, e + hgt + 34, e + hgt, ['#5a2a3a', '#3e1a28', '#2a1018']);
      // 窓(右面=通りに向いた面)
      for (var wi = 0; wi < 2; wi++) {
        for (var wz = 0; wz < 2; wz++) {
          var lit = (k + wi + wz) % 3 !== 0;
          var wp = P(i0 + 0.7 + wi * 1.4, 2.4, e + 60 + wz * 70);
          if (wp.y < 240 || wp.y > 1430) continue;
          game.draw.rect(wp.x - 14, wp.y - 30, 28, 34, lit ? C.lamp : '#1a1a2a');
          if (lit) game.draw.rect(wp.x - 14, wp.y - 30, 28, 34, '#ffffff', 0.15 + beatPulse * 0.1);
        }
      }
      // 街灯(柱は細い立方体、頭は光る立方体)
      var li = i0 + 2.2, le = elevBase(li);
      box(li, 2.05, 0.16, 0.16, le + 150, le, ['#4a4a5a', '#3a3a48', '#2a2a36']);
      var lt = box(li - 0.1, 1.95, 0.36, 0.36, le + 182, le + 150, [C.lamp, '#d8a050', '#b88040']);
      if (lt) game.draw.circle(lt.a.x, lt.a.y, 60 + beatPulse * 16, C.lamp, 0.12);
    }
  }

  function drawStreet() {
    var i0 = Math.floor(camI) - 9, i1 = Math.floor(camI) + 14;
    var t = game.time.elapsed;
    for (var i = i1; i >= i0; i--) {
      if (i < -6) continue;
      if (i > nTiles) {
        if (i === nTiles + 1) drawHome(i);
        continue;
      }
      var e = elev(i), ob = obst[i];
      var cols = [i % 2 ? C.top : '#8e8eac', C.left, C.right];
      if (ob === 'puddle') cols = [C.water[0], C.left, C.right];
      if (ob === 'curb') cols = ['#b4b4cc', '#7a7a96', '#4c4c68'];
      var mv = obMove(i);
      var tele = mv && !mv.res && clock >= mv.t - TELE_T && clock < mv.t + 0.1;
      var flash = mv && mv.res === 'miss' && hitStop > 0;
      if (flash) cols = ['#ffffff', '#ffffff', '#ffffff'];
      var q = box(i, 0, 1, 2, e, e - 240, cols);
      if (!q) continue;
      // 石畳の目地
      var g1 = P(i + 0.5, 0, e), g2 = P(i + 0.5, 2, e);
      if (!ob) game.draw.line(g1.x, g1.y, g2.x, g2.y, C.left, 3);
      if (ob === 'puddle') {
        for (var r = 0; r < 3; r++) {
          var rp = P(i + 0.3 + r * 0.25, 0.5 + r * 0.45, e);
          var rr = ((t * 1.3 + r * 0.33) % 1);
          game.draw.circle(rp.x, rp.y, 6 + rr * 22, '#bcd4ff', 0.5 * (1 - rr));
        }
      }
      if (tele && Math.floor(t * 10) % 2 === 0) {
        var mk = P(i + 0.5, 1, e + 120);
        game.draw.rect(mk.x - 16, mk.y - 16, 32, 32, C.red);
        game.draw.rect(mk.x - 6, mk.y + 22, 12, 12, C.red);
        game.draw.line(q.a.x, q.a.y, q.b.x, q.b.y, C.red, 5);
        game.draw.line(q.a.x, q.a.y, q.d.x, q.d.y, C.red, 5);
      }
    }
  }
  function obMove(tile) {
    for (var i = 0; i < moves.length; i++) if (moves[i].kind === 'jump' && moves[i].from + 1 === tile) return moves[i];
    return null;
  }

  function drawHome(i) {
    var e = (nTiles + 1) * RISE;
    box(i, -0.2, 2.4, 2.4, e + 210, e - 240, ['#8a6a5a', '#6a4e40', '#4a362c']);
    box(i + 0.1, -0.1, 2.2, 2.2, e + 250, e + 210, ['#5a2a3a', '#3e1a28', '#2a1018']);
    var dp = P(i, 1, e);
    game.draw.rect(dp.x - 34, dp.y - 120, 52, 110, C.lamp);
    game.draw.circle(dp.x - 8, dp.y - 60, 80 + Math.sin(game.time.elapsed * 3) * 8, C.lamp, 0.15);
  }

  function drawBoy() {
    var bp = boyPos();
    var i = bp.p + 0.5;
    var base = elevBase(i);
    if (bp.mv && bp.mv.kind === 'jump' && bp.mv.res !== 'miss') base = bp.mv.from * RISE + (bp.mv.to - bp.mv.from) * RISE * ease(bp.f);
    var s = P(i, 1, base + bp.h);
    var art;
    if (slipT > 0) art = BOY_SLIP;
    else if (bp.mv && bp.mv.kind === 'jump' && bp.f < 1 && bp.mv.res !== 'miss') art = BOY_JUMP;
    else if (snapT > 0) art = BOY_SNAP;
    else art = (beatN + 100) % 2 ? BOY_A : BOY_B;
    var fl = flashT > 0 && hitStop > 0 && Math.floor(flashT * 20) % 2 === 0;
    var px = hitStop > 0 ? 10 : 9;
    game.draw.sprite(art, fl ? WHITE_PAL : BOY_PAL, s.x, s.y - art.length * px / 2 + 4, px, { anchor: 'center' });
    if (snapT > 0) {
      for (var k = 0; k < 5; k++) {
        var a = -Math.PI / 2 + (k - 2) * 0.5;
        var hx = s.x - 50, hy = s.y - 76;
        game.draw.line(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14, hx + Math.cos(a) * (30 + snapT * 120), hy + Math.sin(a) * (30 + snapT * 120), C.lamp, 4);
      }
    }
    return s;
  }

  function drawRain(dt) {
    var t = game.time.elapsed;
    for (var k = 0; k < 64; k++) {
      var x = ((k * 137 - t * 260) % 1180 + 1180) % 1180 - 50;
      var y = 230 + ((k * 211 + t * 1500) % 1210);
      game.draw.line(x, y, x - 14, y + 44, C.rain, 3);
    }
    for (var i = splash.length - 1; i >= 0; i--) {
      var sp = splash[i];
      sp.t += dt;
      if (sp.t > 0.6) { splash.splice(i, 1); continue; }
      game.draw.rect(sp.x + sp.vx * sp.t, sp.y + sp.vy * sp.t + 600 * sp.t * sp.t, 12, 12, sp.col);
    }
  }

  // ---- 親指ゾーン: 次の動きの帯(目盛り=拍の頭、丸=裏で押して離す、矢印=頭で上へ弾く) ----
  var LX = 200, LPX = 420, LY = 1520;
  function drawLane() {
    game.draw.gradient(1440, H, [[0, '#10122a'], [1, '#04040c']]);
    game.draw.rect(0, 1440, W, 8, C.left);
    game.draw.rect(0, LY - 52, W, 104, '#05060f');
    for (var b = Math.max(0, beatN - 1); b <= Math.min(endBeats, beatN + 6); b++) {
      var hx = LX + (b * SPB - clock) * LPX;
      if (hx < -20 || hx > W + 20) continue;
      game.draw.rect(hx - 3, LY - 46, 6, 92, b % 4 === 0 ? '#8a8aa8' : '#3a3a58');
    }
    for (var i = 0; i < moves.length; i++) {
      var mv = moves[i];
      var x = LX + (mv.t - clock) * LPX;
      if (x < -40 || x > W + 40) continue;
      var col = mv.res === 'miss' ? '#5a2a3a' : (mv.res && mv.res !== 'auto' ? '#4a4a68' : (mv.kind === 'auto' ? '#6a6a8a' : C.white));
      if (mv.kind === 'jump') game.draw.sprite(ARROW_UP, { '#': mv.res ? col : C.red }, x, LY, 9, { anchor: 'center' });
      else { game.draw.circle(x, LY, mv.kind === 'auto' ? 12 : 20, col); game.draw.circle(x, LY, 8, '#05060f'); }
    }
    game.draw.rect(LX - 4, LY - 56, 8, 112, C.lamp);
    // 大きな押し場所の印(丸=押して離す / 矢印=上へ弾く)。次の動きの方が光る
    var nx = nextMove();
    var wantJump = nx && nx.kind === 'jump' && clock >= nx.t - 0.5;
    var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    var tc = !wantJump && running() ? C.white : '#3a3a58';
    game.draw.circle(300, 1745, 110 + (pressFx > 0 ? 14 : 0), tc, 0.18);
    game.draw.circle(300, 1745, 60, tc);
    game.draw.circle(300, 1745, 34, '#10122a');
    game.draw.sprite(ARROW_UP, { '#': wantJump ? (on ? C.red : '#ff8a8a') : '#3a3a58' }, 780, 1730 - (flickFx > 0 ? 40 : 0), 22, { anchor: 'center' });
  }
  function nextMove() {
    for (var i = 0; i < moves.length; i++) if (!moves[i].res && moves[i].t > clock - GOOD_W) return moves[i];
    return null;
  }
  function running() { return clock >= 0 && !over; }

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawScene(dt) {
    drawSky();
    drawHouses();
    drawStreet();
    drawBoy();
    drawRain(dt);
    drawLane();
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.08);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.panel);
    game.draw.rect(0, 222, W, 8, C.left);
    label('SCORE ' + score, 44, 90, 50, C.white, 'left');
    label('BEST ' + prevBest, 44, 158, 32, C.lamp, 'left');
    label(done + ' / ' + moveTotal, W - 44, 92, 50, C.lamp, 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.sprite(UMB, { r: i < MISS_MAX - misses ? C.red : '#3a3a58', k: '#8a8aa8' }, W - 300 + i * 70, 168, 9, { anchor: 'center' });
    if (combo >= 2) label('x' + combo, W / 2, 160, 40, C.white);
    var progress = clamp(camI / Math.max(1, nTiles), 0, 1);
    game.draw.rect(0, 214, W, 8, '#1a1a30');
    game.draw.rect(0, 214, W * progress, 8, C.lamp);
  }

  function drawResult(t) {
    var y0 = H * 0.25, hh = H * 0.37;
    game.draw.rect(60, y0, W - 120, hh, C.panel, 0.94);
    game.draw.rect(60, y0, W - 120, 10, won ? C.lamp : C.red);
    game.draw.rect(60, y0 + hh - 10, W - 120, 10, C.left);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.lamp : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, C.white);
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, C.white);
    label(maxCombo + ' COMBO', W / 2, H * 0.455, 42, C.lamp);
    label(jumps + ' / ' + jumpTotal, W / 2, H * 0.5, 44, '#bcd4ff');
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 54, C.lamp);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, C.lamp);
    if (!won) label('あと' + Math.max(1, nTiles - Math.round(camI)) + '歩', W / 2, H * 0.22, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.white);
  }

  // ---- ATTRACT: 実ロジックで裏ごとに押して離し、頭の水たまり・段差は上へ弾く。12拍目の水たまりは押してしまい踏み込む ----
  var demo = { t: 0, x: 300, y: 1745, press: 0, cyc: 0 };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.6;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.cyc++; demo.press = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (flickFx > 0) flickFx -= dt;
    tickWorld(dt);
    var nx = nextMove();
    var tx = 300, ty = 1745;
    if (nx) {
      var fail = nx.b === DEMO_FAIL_B && nx.kind === 'jump';
      var jumpIt = nx.kind === 'jump' && !fail;
      if (jumpIt && clock > nx.t - 0.45) { tx = 780; ty = 1800; }
      if (hitStop <= 0 && clock >= nx.t - 0.01 && !nx.res) {
        if (jumpIt) { act('flick', clock, 780, 1700); flickFx = 0.25; demo.press = 0.2; demo.flick = 0.2; }
        else { act('tap', clock, 300, 1745); demo.press = 0.12; pressFx = 0.12; }
      }
    }
    if (demo.flick > 0) { demo.flick -= dt; tx = 780; ty = 1640; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 14);
    demo.y += (ty - demo.y) * Math.min(1, dt * (demo.flick > 0 ? 22 : 14));
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    if (snapT > 0) snapT -= dt;
    if (slipT > 0 && hitStop <= 0) slipT -= dt;
    if (flashT > 0) flashT -= dt;
    if (pressFx > 0) pressFx -= dt;
    if (state === S.PLAYING && flickFx > 0) flickFx -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, demo.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.panel);
      game.draw.rect(0, 222, W, 8, C.left);
      label(GAME_TITLE, W / 2, 116 + Math.sin(t * 3) * 4, 92, Math.floor(t * 3) % 2 ? C.lamp : C.white);
      label('HI-SCORE ' + game.best, W / 2, 196, 36, '#bcd4ff');
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.lamp);
      else label('TAP TO START', W / 2, H * 0.975, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (over) {
      outroT -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, steps: done, jumps: jumps, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      tickWorld(dt);
      if (!over && realT > READY_T + TIME_LIMIT + 2) finish(misses < MISS_MAX);
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) {
      game.draw.rect(0, H * 0.4, W, 170, C.panel, 0.85);
      label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 118, 110, C.lamp);
    }
    if (over && outroT > 1.4) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? C.lamp : C.red);
    else if (over) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
