// K-GBA-0031v2-kitchen-pass-hand-signal.js
// 配膳口の手合図 — 巨大な給仕長が1拍前に出す手の合図を見分け、左・中央・右の窓口を拍の頭で叩いて皿を出す。拍型が行進→ワルツ→駆け足と途中で切り替わる
// 操作: 画面を左・中央・右の三列に分けて押す(下に三つの窓口)。給仕長が腕を伸ばした側(画面左へ伸ばせば左/右へ伸ばせば右/両手を挙げれば中央)の窓口を、腕を出した次の拍の頭(金の輪が閉じる瞬間)に押す。胸の前で腕を交差させた拍(赤い輪が点滅+低い予告音)は押さずに待つ。ずれでPERFECT/GOOD。窓口違い・拍外れ・押し逃し・交差の拍で押すとMISS
// 終わり: 前奏1小節+行進2小節(4拍子・1拍目と3拍目)+ワルツ2小節(3拍子・1拍目と3拍目)+駆け足2小節(4拍子・毎拍)の約14秒を乗り切ればCLEAR。拍型の切り替えは1小節前に呼び鈴の音と次の拍型の点列の点滅で予告。MISS3回でGAME OVER
// @mechanic: judge
// @theme: kitchen_pass_hand_signal
// 世界観: 大きな厨房の配膳口で、給仕が給仕長の手の合図を見分け、汁物・主菜・甘味の三つの窓口へ拍に乗って皿を出していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・待てた交差合図の数・最大コンボ)
// スタイル: 90s BIG SPRITE

(function(game) {
  var STYLE = { bg: ['#ffe2b0', '#f0a860', '#5a2e1c'], main: ['#26203a', '#fff6e6', '#e2402e'], accent: ['#ffd23f', '#2f9be0'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大な給仕長、足元の楕円影、背景は厨房の壁1層だけ
  var C = {
    wall0: STYLE.bg[0], wall1: STYLE.bg[1], wood: STYLE.bg[2],
    ink: STYLE.main[0], cream: STYLE.main[1], red: STYLE.main[2],
    gold: STYLE.accent[0], blue: STYLE.accent[1],
    grout: '#e9b878', copper: '#c86a3c', copperD: '#7a3a20', steel: '#c4ccd6', steelD: '#5c6674',
    hole: '#2a1610', skin: '#f4b890', good: '#3fd06a', bad: '#ff3a3a', woodL: '#7a4630'
  };
  var SEC_COL = [C.red, C.blue, C.gold];

  var GAME_TITLE = 'HATCH SIGNAL';
  var BPM = 112;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.14, WIN_M = 0.26;
  var LIVES = 3;
  // 拍型の並び(拍番号)。pat は小節内の打つ拍(1)と休む拍(0)
  var SECTIONS = [
    { from: 0, to: 4, meter: 4, pat: [1, 0, 1, 0], kind: 0 },
    { from: 4, to: 12, meter: 4, pat: [1, 0, 1, 0], kind: 0 },
    { from: 12, to: 18, meter: 3, pat: [1, 0, 1], kind: 1 },
    { from: 18, to: 26, meter: 4, pat: [1, 1, 1, 1], kind: 2 }
  ];
  var SONG_END = 26;
  var X_BEATS = { 15: true, 22: true };
  // デモ: 左・中央を正しく出し、交差の拍は待ち、最後は窓口を間違えてMISS
  var DEMO_CUES = [[2, 0], [4, 1], [6, 3], [8, 2]];
  var DEMO_FAIL_B = 8, DEMO_FAIL_W = 0;
  var DEMO_CYCLE = 10 * SPB + 1.3;

  var P = 26;
  var FEET = 1200;
  var BX = W / 2 - 8 * P;
  var TY = FEET - 22 * P;
  var HX = [180, 540, 900];
  var HATCH_Y = 1665;
  // 合図ごとの輪の中心(手袋の位置)
  var RING = [
    { x: BX - 8 * P + 1.5 * P, y: TY + 9.5 * P, r: 80 },
    { x: W / 2, y: TY + 0.5 * P, r: 210 },
    { x: BX + 13 * P + 9.5 * P, y: TY + 9.5 * P, r: 80 },
    { x: W / 2, y: TY + 12 * P, r: 150 }
  ];

  // 伴奏(自作)。0 は休符
  var MARCH_LEAD = ['C5', 0, 'F5', 0, 'A5', 'G5', 'F5', 0, 'E5', 0, 'G5', 0, 'C5', 0, 'E5', 0];
  var WALTZ_LEAD = ['A5', 0, 'G5', 'F5', 'D5', 0, 'E5', 0, 'C5', 0, 'D5', 'E5'];
  var RUSH_LEAD = ['F5', 'A5', 'C6', 'A5', 'Bb5', 'G5', 'E5', 'G5', 'A5', 'C6', 'F6', 'C6', 'G5', 'E5', 'C5', 'E5'];
  var ROOTS = [['F2', 'C3'], ['Bb2', 'C3'], ['F2', 'Bb2']];
  var NOTE_SET = {
    F2: { fifth: 'C3', oct: 'F3', ch: ['A3', 'C4'] },
    C3: { fifth: 'G2', oct: 'C4', ch: ['E3', 'G3'] },
    Bb2: { fifth: 'F2', oct: 'Bb3', ch: ['D4', 'F4'] }
  };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, x: 540, y: 1840, press: false, pressT: 0 };

  // ── スプライト ─────────────────────────────────────────
  var CHIEF_A = [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '....hssssssh....',
    '....ssessess....',
    '....ssssssss....',
    '....smmmmmms....',
    '.....smmmms.....',
    '......ssss......',
    '...kkkcbbckkk...',
    '..kkkkcbbckkkk..',
    '..kkkkcwwckkkk..',
    '..kkkkkcckkkkk..',
    '..kkkkkcckkkkk..',
    '..kkkkkkkkkkkk..',
    '...kkkkkkkkkk...',
    '...aaaaaaaaaa...',
    '...aaaaaaaaaa...',
    '...aaaaaaaaaa...',
    '...pppp..pppp...',
    '...pppp..pppp...',
    '...pppp..pppp...',
    '..oooo....oooo..'
  ];
  var CHIEF_B = CHIEF_A.slice();
  CHIEF_B[6] = '.....mmssmm.....';
  CHIEF_B[21] = '..oooo.....ooo..';
  var CHIEF_OOPS = CHIEF_A.slice();
  CHIEF_OOPS[3] = '....ssxssxss....';
  CHIEF_OOPS[6] = '.....ssrrss.....';
  var CHIEF_JOY = CHIEF_A.slice();
  CHIEF_JOY[3] = '....sseesees....';
  CHIEF_JOY[6] = '.....srrrrs.....';
  var CHIEF_PAL = { h: '#26203a', s: C.skin, e: C.ink, x: C.ink, m: '#4a2c1c', k: '#2e2844', c: C.cream, b: C.red, w: '#ffffff', a: C.cream, p: '#3c3452', o: '#120c18', r: C.red };
  var WHITE_PAL = { h: '#ffffff', s: '#ffffff', e: '#ffffff', x: '#ffffff', m: '#ffffff', k: '#ffffff', c: '#ffffff', b: '#ffffff', w: '#ffffff', a: '#ffffff', p: '#ffffff', o: '#ffffff', r: '#ffffff' };
  var ARM_SIDE = [
    '........gg.',
    'kkkkkkkcggg',
    'kkkkkkkcggg',
    '........gg.'
  ];
  var ARM_UP = ['.gg.', 'gggg', 'gggg', 'cccc', 'kkkk', 'kkkk', 'kkkk', 'kkkk', 'kkkk', 'kkkk'];
  var ARM_DOWN = ['kkk', 'kkk', 'kkk', 'kkk', 'kkk', 'ccc', 'ggg', 'ggg'];
  var ARM_X = [
    'gg......gg',
    'ggc....cgg',
    '..kk..kk..',
    '...kkkk...',
    '...kkkk...',
    '..kk..kk..',
    '.kk....kk.',
    'kk......kk'
  ];
  var ARM_PAL = { k: '#2e2844', c: C.cream, g: '#ffffff' };
  var DISH = [
    ['...s..s...', '....s..s..', 'oooooooooo', '.obbbbbbo.', '..obbbbo..', '...oooo...'],
    ['...mmmm...', '..mmmmmm..', '.wwmmmmww.', 'wwwwwwwwww', '.wwwwwwww.', '..........'],
    ['....cc....', '...yyyy...', '..yyyyyy..', '.yyyyyyyy.', 'wwwwwwwwww', '.wwwwwwww.']
  ];
  var DISH_PAL = { o: '#26203a', b: '#2f9be0', s: '#ffffff', m: '#a0522d', w: '#ffffff', y: '#ffd23f', c: '#e2402e' };
  var BELL = ['...gg...', '..gggg..', '.gggggg.', '.gggggg.', 'gggggggg', 'kkkkkkkk'];
  var BELL_PAL = { g: C.gold, k: C.steelD };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    for (var yy = -ry; yy <= ry; yy += 4) {
      var k = 1 - (yy * yy) / (ry * ry);
      if (k <= 0) continue;
      var hw = rx * Math.sqrt(k);
      game.draw.rect(cx - hw, cy + yy, hw * 2, 4, col, a);
    }
  }
  function ring(cx, cy, r, col, w) {
    var n = 30, px = cx + r, py = cy;
    for (var i = 1; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      game.draw.line(px, py, x, y, col, w);
      px = x; py = y;
    }
  }
  function sectionAt(b) {
    for (var i = SECTIONS.length - 1; i >= 0; i--) if (b >= SECTIONS[i].from) return i;
    return 0;
  }

  // ── 進行 ───────────────────────────────────────────────
  function buildCues(isDemo) {
    var cues = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_CUES.length; i++) cues.push({ b: DEMO_CUES[i][0], k: DEMO_CUES[i][1] });
    } else {
      var prev = -1, prev2 = -1;
      for (var s = 1; s < SECTIONS.length; s++) {
        var sec = SECTIONS[s];
        for (var b = sec.from; b < sec.to; b++) {
          if (!sec.pat[(b - sec.from) % sec.meter]) continue;
          var k = 3;
          if (!X_BEATS[b]) {
            k = Math.floor(game.random(0, 3)) % 3;
            if (k === prev && k === prev2) k = (k + 1 + Math.floor(game.random(0, 2))) % 3;
            prev2 = prev; prev = k;
          }
          cues.push({ b: b, k: k });
        }
      }
    }
    for (i = 0; i < cues.length; i++) { cues[i].st = 'wait'; cues[i].ghost = false; }
    return cues;
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, cues: buildCues(isDemo), bp: 0, beatIdx: -1, stepIdx: -1, sec: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, holds: 0,
      stop: 0, stopCue: null, stopWin: -1, pulse: 0, oops: 0, joy: 0, swap: 0,
      flash: [0, 0, 0], dishes: [], announce: -1, bell: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MARCH_LEAD.length; i++) notes.push([MARCH_LEAD[i] || 'R', 0.5]);
    for (var j = 0; j < 8; j++) {
      var root = ROOTS[0][Math.floor(j / 4)];
      bass.push([j % 2 === 0 ? root : NOTE_SET[root].fifth, 1]);
    }
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: bass, bassVolume: 0.06 });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏(8分刻み)。行進=ウンパ、ワルツ=ウンパッパ、駆け足=8分の刻み
  function playStep(s) {
    var b = Math.floor(s / 2), half = s % 2;
    var si = sectionAt(b), sec = SECTIONS[si];
    var pos = (b - sec.from) % sec.meter;
    var bar = Math.floor((b - sec.from) / sec.meter);
    var root = ROOTS[sec.kind][bar % 2];
    var ns = NOTE_SET[root];
    var d8 = SPB * 0.45;
    if (sec.kind === 0) {
      if (half === 0) game.audio.tone(pos % 2 === 0 ? root : ns.fifth, SPB * 0.4, { wave: 'triangle', volume: 0.14 });
      else { game.audio.tone(ns.ch[0], d8 * 0.6, { wave: 'square', volume: 0.03 }); game.audio.tone(ns.ch[1], d8 * 0.6, { wave: 'square', volume: 0.03 }); }
      if (half === 0 && pos % 2 === 1) game.audio.tone(1700, 0.07, { wave: 'square', volume: 0.04, slide: -1300 });
      if (si > 0) {
        var m = MARCH_LEAD[(bar % 2) * 8 + pos * 2 + half];
        if (m) game.audio.tone(m, d8, { wave: 'square', volume: 0.045 });
      }
    } else if (sec.kind === 1) {
      if (half === 0 && pos === 0) game.audio.tone(root, SPB * 0.9, { wave: 'triangle', volume: 0.15 });
      if (half === 0 && pos > 0) { game.audio.tone(ns.ch[0], SPB * 0.3, { wave: 'square', volume: 0.035 }); game.audio.tone(ns.ch[1], SPB * 0.3, { wave: 'square', volume: 0.035 }); }
      var wm = WALTZ_LEAD[(bar % 2) * 6 + pos * 2 + half];
      if (wm) game.audio.tone(wm, SPB * 0.8, { wave: 'triangle', volume: 0.07 });
    } else {
      game.audio.tone(half === 0 ? root : ns.oct, d8, { wave: 'sawtooth', volume: 0.04 });
      if (half === 0) game.audio.tone(120, 0.09, { wave: 'sine', volume: 0.16, slide: -70 });
      else game.audio.tone(2400, 0.03, { wave: 'square', volume: 0.025 });
      var rm = RUSH_LEAD[(bar % 2) * 8 + pos * 2 + half];
      if (rm) game.audio.tone(rm, d8, { wave: 'square', volume: 0.04 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    var si = sectionAt(b);
    if (si !== R.sec) {
      R.sec = si; R.announce = -1;
      if (si >= 2) {
        R.swap = 1;
        if (!R.demo) game.audio.play('se_powerup', 0.5);
      }
    }
    var sec = SECTIONS[si];
    // 切り替えの1小節前: 呼び鈴+次の拍型を点滅
    if (si >= 1 && si + 1 < SECTIONS.length && b === sec.to - sec.meter) {
      R.announce = si + 1; R.bell = 1;
      if (!R.demo) {
        game.audio.tone('E6', 0.35, { wave: 'triangle', volume: 0.12 });
        game.audio.tone('B6', 0.3, { wave: 'sine', volume: 0.06 });
      }
    }
    if (R.announce > 0 && b > sec.to - sec.meter && (b - sec.from) % sec.meter === Math.floor(sec.meter / 2)) {
      R.bell = 1;
      if (!R.demo) game.audio.tone('E6', 0.25, { wave: 'triangle', volume: 0.1 });
    }
    // 交差の合図の予告音(1拍前)
    for (var i = 0; i < R.cues.length; i++) {
      if (R.cues[i].b === b + 1 && R.cues[i].k === 3 && !R.demo) game.audio.tone(150, 0.16, { wave: 'square', volume: 0.08, slide: -40 });
    }
  }

  function upcomingCue() {
    for (var i = 0; i < R.cues.length; i++) {
      var c = R.cues[i];
      if (c.st === 'wait' && c.b > R.bp && c.b - R.bp <= 1.001) return c;
    }
    return null;
  }

  function pressWindow(w) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.flash[w] = 1;
    var best = null, bd = 99;
    for (var i = 0; i < R.cues.length; i++) {
      var c = R.cues[i];
      if (c.st !== 'wait') continue;
      var d = (R.bp - c.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = c; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'stray';
    if (best.k === 3) {
      if (Math.abs(bd) <= WIN_G) { missCue(best, w); return 'miss'; }
      return 'stray';
    }
    if (best.k !== w || Math.abs(bd) > WIN_G) { missCue(best, w); return 'miss'; }
    best.st = 'hit';
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; R.joy = 0.5; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    R.dishes.push({ w: w, t: 0 });
    game.feedback.good(HX[w], HATCH_Y - 220, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 16 : 9 });
    game.audio.tone(440 * Math.pow(2, Math.min(R.combo, 12) / 12), 0.08, { wave: 'square', volume: 0.06 });
    if (!R.demo && R.combo > 0 && R.combo % 5 === 0) {
      game.fx.popup('x' + R.combo, W / 2, 470, { color: C.gold, size: 96 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missCue(c, w) {
    c.st = 'miss';
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopCue = c; R.stopWin = w; R.oops = 1.2;
    game.audio.tone(120, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -50 });
  }

  function releaseStop() {
    var w = R.stopWin;
    R.stopCue = null; R.stopWin = -1;
    game.feedback.bad(w >= 0 ? HX[w] : W / 2, HATCH_Y - 220, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.joy = 3;
      for (var i = 0; i < 3; i++) game.fx.burst(HX[i], HATCH_Y, { color: [C.blue, C.red, C.gold][i], count: 24, speed: 520 });
      game.fx.burst(W / 2, 700, { color: C.cream, count: 30, speed: 600 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 520, { color: C.gold, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.2);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    R.swap = Math.max(0, R.swap - dt * 1.5);
    R.bell = Math.max(0, R.bell - dt * 3);
    for (var f = 0; f < 3; f++) R.flash[f] = Math.max(0, R.flash[f] - dt * 4);
    for (var d = R.dishes.length - 1; d >= 0; d--) { R.dishes[d].t += dt; if (R.dishes[d].t > 0.6) R.dishes.splice(d, 1); }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('C5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.cues.length; i++) {
      var c = R.cues[i];
      if (c.st !== 'wait' || (R.bp - c.b) * SPB <= WIN_G) continue;
      if (c.k === 3) {
        // 交差の拍を押さずに待てた
        c.st = 'held'; R.holds++; R.combo++;
        if (R.combo > R.maxCombo) R.maxCombo = R.combo;
        R.score += 60;
        game.feedback.good(W / 2, RING[3].y - 220, { text: 'NICE', color: C.blue, count: 6 });
      } else {
        missCue(c, c.k);
        return;
      }
    }
    if (!R.demo && R.bp >= SONG_END + 0.3) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(左・中央は拍の頭で正しく、交差は待ち、最後は窓口違いでMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.pressT = 0; }
    var nx = null;
    for (var i = 0; i < R.cues.length; i++) if (R.cues[i].st === 'wait') { nx = R.cues[i]; break; }
    var tx = W / 2, ty = 1850;
    if (nx && R.stop <= 0) {
      var target = nx.k === 3 ? -1 : (nx.b === DEMO_FAIL_B ? DEMO_FAIL_W : nx.k);
      if (target >= 0 && R.bp >= nx.b - 0.9) { tx = HX[target]; ty = HATCH_Y + 40; }
      if (target >= 0 && R.bp >= nx.b && !nx.ghost) {
        nx.ghost = true;
        pressWindow(target);
        demo.pressT = 0.2;
      }
    } else if (R.stop > 0 && R.stopWin >= 0) { tx = HX[R.stopWin]; ty = HATCH_Y + 40; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 12);
    demo.y += (ty - demo.y) * Math.min(1, dt * 12);
    demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, 1240, [[0, C.wall0], [1, C.wall1]]);
    for (var row = 0; row < 12; row++) {
      var y = 240 + row * 84;
      game.draw.rect(0, y, W, 4, C.grout, 0.7);
      var off = row % 2 ? 0 : 60;
      for (var x = off; x < W; x += 120) game.draw.rect(x, y, 4, 84, C.grout, 0.7);
    }
    // 吊り下げた銅鍋の列(遠景1層)
    game.draw.rect(0, 470, W, 10, C.copperD);
    var pans = [70, 190, 890, 1010];
    for (var i = 0; i < pans.length; i++) {
      var sw = Math.sin(e * 1.5 + i) * 6;
      game.draw.line(pans[i], 480, pans[i] + sw, 540, C.copperD, 6);
      game.draw.circle(pans[i] + sw, 590, 52, C.copperD);
      game.draw.circle(pans[i] + sw, 586, 44, C.copper);
      game.draw.rect(pans[i] + sw - 30, 570, 22, 10, C.cream, 0.35);
    }
    // 両脇の鍋から立つ湯気
    for (var s = 0; s < 6; s++) {
      var ph = (e * 0.6 + s / 6) % 1;
      var sx = (s % 2 ? 110 : 970) + Math.sin(e * 2 + s) * 20;
      game.draw.circle(sx, 1080 - ph * 380, 20 + ph * 26, C.cream, 0.35 * (1 - ph));
    }
    game.draw.rect(30, 1060, 160, 100, C.steelD);
    game.draw.rect(890, 1060, 160, 100, C.steelD);
    game.draw.rect(40, 1050, 140, 16, C.steel);
    game.draw.rect(900, 1050, 140, 16, C.steel);
    // 床(拍で目地が光る)
    game.draw.rect(0, 1150, W, 270, C.woodL);
    for (var p = 0; p < 6; p++) game.draw.rect(0, 1170 + p * 42, W, 3, C.wood, 0.6);
    game.draw.rect(0, 1150, W, 6, C.gold, 0.15 + R.pulse * 0.4);
  }

  function drawChief(pose) {
    var e = game.time.elapsed;
    var bob = -R.pulse * 14 + Math.sin(e * 2.4) * 3;
    var ty = TY + bob;
    var fl = R.stop > 0 && Math.floor(e * 20) % 2 === 0;
    ellipse(W / 2, FEET + 10, 250 + R.pulse * 24, 34, C.ink, 0.32);
    var frame = R.oops > 0 ? CHIEF_OOPS : (R.joy > 0 ? CHIEF_JOY : (Math.floor(R.bp) % 2 === 0 ? CHIEF_A : CHIEF_B));
    var ap = fl ? WHITE_PAL : ARM_PAL;
    if (pose === 1) {
      game.draw.sprite(ARM_UP, ap, BX, ty - P, P);
      game.draw.sprite(ARM_UP, ap, BX + 12 * P, ty - P, P);
    }
    game.draw.sprite(frame, fl ? WHITE_PAL : CHIEF_PAL, BX, ty, P);
    if (pose === 0) {
      game.draw.sprite(ARM_SIDE, ap, BX - 8 * P, ty + 8 * P, P, { flipX: true });
      game.draw.sprite(ARM_DOWN, ap, BX + 13 * P, ty + 9 * P, P);
    } else if (pose === 2) {
      game.draw.sprite(ARM_SIDE, ap, BX + 13 * P, ty + 8 * P, P);
      game.draw.sprite(ARM_DOWN, ap, BX, ty + 9 * P, P);
    } else if (pose === 3) {
      game.draw.sprite(ARM_X, ap, BX + 3 * P, ty + 8 * P, P);
    } else if (pose !== 1) {
      game.draw.sprite(ARM_DOWN, ap, BX, ty + 9 * P, P);
      game.draw.sprite(ARM_DOWN, ap, BX + 13 * P, ty + 9 * P, P);
    }
  }

  function currentPose() {
    if (R.stop > 0 && R.stopCue) return R.stopCue.k;
    if (R.over) return R.ok ? 1 : -1;
    var c = upcomingCue();
    return c ? c.k : -1;
  }

  function drawCueRing() {
    if (R.stop > 0 || R.ready > 0 || R.over) return;
    var c = upcomingCue();
    if (!c) return;
    var u = Math.max(0, c.b - R.bp);
    var g = RING[c.k];
    var e = game.time.elapsed;
    var col = c.k === 3 ? (Math.floor(e * 12) % 2 ? C.bad : C.cream) : C.gold;
    ring(g.x, g.y, g.r, col, 4);
    ring(g.x, g.y, g.r + u * 260, col, 12);
    if (c.k === 3) {
      game.draw.rect(0, 0, 24, H, C.bad, 0.35);
      game.draw.rect(W - 24, 0, 24, H, C.bad, 0.35);
    }
  }

  function drawHatches() {
    var e = game.time.elapsed;
    game.draw.rect(0, 1420, W, H - 1420, C.wood);
    game.draw.rect(0, 1400, W, 34, C.steel);
    game.draw.rect(0, 1428, W, 8, C.steelD);
    for (var i = 0; i < 3; i++) {
      var x = HX[i], y = HATCH_Y;
      var hl = R.stop > 0 && R.stopWin === i;
      var sc = hl ? 1.14 : 1 + R.flash[i] * 0.05;
      var w = 290 * sc, h = 300 * sc;
      var fl = hl && Math.floor(e * 20) % 2 === 0;
      game.draw.rect(x - w / 2 - 16, y - h / 2 - 16, w + 32, h + 32, fl ? '#ffffff' : C.steelD);
      game.draw.rect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, fl ? '#ffffff' : C.steel);
      game.draw.rect(x - w / 2, y - h / 2, w, h, C.hole);
      game.draw.rect(x - w / 2, y - h / 2, w, h, C.gold, 0.06 + R.flash[i] * 0.35);
      game.draw.rect(x - w / 2 + 12, y + h / 2 - 60, w - 24, 14, C.steelD);
      game.draw.sprite(DISH[i], DISH_PAL, x, y + 10, 16, { anchor: 'center', alpha: 0.85 });
    }
    for (var d = 0; d < R.dishes.length; d++) {
      var ds = R.dishes[d];
      var k = ds.t / 0.6;
      game.draw.sprite(DISH[ds.w], DISH_PAL, HX[ds.w], HATCH_Y - 40 - k * 260, 20 - k * 8, { anchor: 'center', alpha: 1 - k });
    }
  }

  function drawLamps() {
    var e = game.time.elapsed;
    var sec = SECTIONS[R.sec];
    var n = sec.meter, gap = 150;
    var x0 = W / 2 - (n - 1) * gap / 2, y = 300;
    var pos = R.beatIdx >= sec.from && R.ready <= 0 ? (R.beatIdx - sec.from) % n : -1;
    var col = SEC_COL[sec.kind];
    game.draw.rect(x0 - 100, y - 62, (n - 1) * gap + 200, 124, C.ink, 0.6);
    game.draw.rect(x0 - 100, y - 62, (n - 1) * gap + 200, 8, col, 0.6 + R.swap * 0.4);
    for (var i = 0; i < n; i++) {
      var x = x0 + i * gap, lit = i === pos;
      if (sec.pat[i]) {
        game.draw.circle(x, y, lit ? 42 + R.pulse * 10 : 32, col, lit ? 1 : 0.55);
        game.draw.circle(x, y, 14, C.cream, lit ? 0.95 : 0.35);
      } else {
        game.draw.circle(x, y, lit ? 20 : 13, C.cream, lit ? 0.9 : 0.35);
      }
    }
    if (R.swap > 0) ring(W / 2, y, 140 + (1 - R.swap) * 300, col, 8);
    if (R.announce > 0) {
      var ns = SECTIONS[R.announce];
      var blink = Math.floor(e * 6) % 2 === 0;
      var ncol = SEC_COL[ns.kind];
      var ng = 90, nx0 = W / 2 - (ns.meter - 1) * ng / 2, ny = 420;
      game.draw.rect(nx0 - 70, ny - 40, (ns.meter - 1) * ng + 140, 80, C.ink, blink ? 0.7 : 0.4);
      for (var j = 0; j < ns.meter; j++) {
        if (ns.pat[j]) game.draw.circle(nx0 + j * ng, ny, 22, ncol, blink ? 1 : 0.5);
        else game.draw.circle(nx0 + j * ng, ny, 9, C.cream, blink ? 0.9 : 0.4);
      }
      game.draw.line(W / 2 - 24, 356, W / 2, 378, ncol, 8);
      game.draw.line(W / 2 + 24, 356, W / 2, 378, ncol, 8);
      game.draw.sprite(BELL, BELL_PAL, nx0 + (ns.meter - 1) * ng + 120, ny - R.bell * 24, 9, { anchor: 'center' });
    }
  }

  function drawWorld() {
    drawBg();
    drawLamps();
    drawChief(currentPose());
    drawCueRing();
    drawHatches();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.88);
    txt('SCORE ' + R.score, 40, 66, 46, C.cream, 'left');
    txt('BEST ' + game.best, W - 40, 66, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      var x = W - 80 - i * 80;
      game.draw.circle(x, 148, 28, on ? '#ffffff' : C.steelD, on ? 1 : 0.5);
      game.draw.circle(x, 148, 16, on ? C.red : C.ink, on ? 1 : 0.5);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 148, 52, C.gold, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(40, 200, W - 80, 14, C.steelD);
    game.draw.rect(40, 200, (W - 80) * progress, 14, SEC_COL[SECTIONS[R.sec].kind]);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 1000, 120, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.34, C.ink, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.cream);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.gold);
    txt('NICE ' + R.holds + '   x' + R.maxCombo, W / 2, H * 0.45, 36, C.gold);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 54, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, C.cream);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.cues.length; i++) if (R.cues[i].st === 'wait' && R.cues[i].k !== 3) left++;
      txt('あと' + left + '皿', W / 2, H * 0.545, 48, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 2.2) * 8;
    game.draw.rect(0, 0, W, 232, C.ink, 0.85);
    game.draw.text(GAME_TITLE, W / 2 + 6, 104 + bob, { size: 112, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 98 + bob, { size: 112, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 196, 40, C.cream);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cream);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var w = x < W / 3 ? 0 : (x < W * 2 / 3 ? 1 : 2);
    var res = pressWindow(w);
    if (res === 'stray' || res === 'none') {
      game.audio.tone(330, 0.04, { wave: 'square', volume: 0.06 });
      game.fx.burst(HX[w], HATCH_Y, { color: C.steel, count: 4, speed: 140 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      stepRun(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.cream);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, holds: R.holds, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
