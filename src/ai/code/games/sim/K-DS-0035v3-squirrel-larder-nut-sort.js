// K-DS-0035v3-squirrel-larder-nut-sort.js
// リスの貯蔵庫えりわけ — リスの番人が拍ごとに枝の葉皿へ投げる三種の木の実札を、次の拍の頭で根元の同じ印の穴へドラッグして納める。途中で4拍子→3拍子→4拍子と拍型が切り替わる
// 操作: 上の画面の葉皿に落ちた札(どんぐり=桃色/くるみ=若草色/松かさ=藤色)を押さえてつまみ、下の画面の同じ印・同じ色の穴の上まで運び、次の拍の頭(札のまわりの縮む輪が閉じる瞬間)に指を離して納める。拍の頭からのずれでPERFECT/GOOD。早すぎる離し・穴の外で離すと札は葉皿へ戻る(やり直せる)。違う穴・次の拍を過ぎても納められない札はMISS
// 終わり: 前奏1小節のあと、4拍子2小節(1・3拍目に札)→3拍子4小節(1・2拍目に札、続けて2枚)→4拍子2小節(1・2・3拍目に札、続けて3枚)の計18枚(100BPM・約19秒)。切り替わりの2拍前に拍ランプの数が点滅して変わり、鈴の合図が鳴る。18枚を納め切ればCLEAR、MISS 3回でGAME OVER
// @mechanic: drag_sort
// @theme: squirrel_larder_nut_sort
// 世界観: 森の大木の根元にある木の実の貯蔵庫で、リスの番人が枝の上から拍ごとに投げ下ろす三種の木の実を、根元の三つの穴へ種類ごとにしまい分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・納めた札の数・最大コンボ)
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var STYLE = { bg: ['#fde6ef', '#e2f1ff', '#f4efd6'], main: ['#ffb6a0', '#a6e6c6', '#c6b6f0'], accent: ['#ffffff', '#ff7896'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステルの淡い色、白縁の丸い形。画面を上下に分け、上で合図、下で遊ぶ(2画面の名残)
  var C = {
    pink: STYLE.bg[0], sky: STYLE.bg[1], cream: STYLE.bg[2],
    peach: STYLE.main[0], mint: STYLE.main[1], lav: STYLE.main[2],
    white: STYLE.accent[0], bad: STYLE.accent[1],
    ink: '#5a4a6e', inkSoft: '#9a8aae', gold: '#ffc84a', good: '#5ad8a0',
    bark: '#c8a080', barkDk: '#9a7458', leaf: '#8cd6a0', hole: '#4a3a52', shell: '#7a6a8a'
  };
  var NUT_COL = [C.peach, C.mint, C.lav];

  var GAME_TITLE = 'NUT LARDER';
  var BPM = 100;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.15;
  var LIVES = 3;
  // 区間: [開始拍, 1小節の拍数]。前奏(4)→A 4拍子→B 3拍子→C 4拍子
  var SECTIONS = [[0, 4], [4, 4], [12, 3], [24, 4]];
  var SEC_COL = [C.pink, C.pink, C.sky, C.cream];
  // 札が葉皿に着く拍。納めるのは次の拍の頭
  var APPEARS = [4, 6, 8, 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 26, 28, 29, 30];
  var SONG_END_B = 31.6;
  var DEMO_APPEARS = [2, 4, 6];
  var DEMO_TYPES = [0, 2, 1];
  var DEMO_TARGET = [0, 2, 0];          // 3枚目はわざと違う穴へ入れてMISSを見せる
  var DEMO_CYCLE = 8 * SPB + 1.6;

  var TRAY = { x: 650, y: 740 };
  var BASKET = { x: 400, y: 720 };
  var HOLES = [{ x: 200, y: 1230 }, { x: 540, y: 1230 }, { x: 880, y: 1230 }];
  var HOLE_R = 118;
  var CW = 150, CH = 170;

  // 伴奏の旋律(自作)。区間ごとに伴奏の刻みが変わる
  var MEL_A = ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 0];
  var MEL_B = ['E5', 0, 'G5', 'A5', 0, 'G5'];
  var MEL_C = ['G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'D5', 'E5'];
  var ROOTS = ['C3', 'F2', 'G2', 'C3'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, gx: TRAY.x, gy: TRAY.y + 200, press: false };

  // ── スプライト ─────────────────────────────────────────
  var SQ_A = [
    '.tt.....e.e.',
    'tttt...fffff',
    'ttttt.ffkfff',
    'tt.tt.fffffn',
    'tt..tffffff.',
    '.tt.ffwwfff.',
    '..ttfwwwwff.',
    '...tfwwwwf..',
    '....ffffff..',
    '....ff..ff..'
  ];
  var SQ_B = SQ_A.slice();
  SQ_B[0] = '........e.e.';
  SQ_B[1] = '.tt....fffff';
  SQ_B[2] = 'tttt..ffkfff';
  SQ_B[3] = 'ttttt.fffffn';
  SQ_B[4] = 'tt.ttffffff.';
  var SQ_TOSS = SQ_A.slice();
  SQ_TOSS[4] = 'tt..tffffffw';
  SQ_TOSS[5] = '.tt.ffwwffw.';
  var SQ_OOPS = SQ_A.slice();
  SQ_OOPS[2] = 'ttttt.ffxfff';
  SQ_OOPS[3] = 'tt.tt.ffffoo';
  var SQ_PAL = { t: '#d89a66', e: '#c8845a', f: '#eab07e', k: C.ink, x: C.ink, n: '#ff8aa0', o: C.bad, w: '#fff2dc' };

  var NUTS = [
    ['...s...', '.ccccc.', 'ccccccc', '.bbbbb.', '.bbbbb.', '..bbb..', '...b...'],
    ['..www..', '.ww.ww.', 'www.www', 'ww.w.ww', 'www.www', '.ww.ww.', '..www..'],
    ['...p...', '..ppp..', '.p.p.p.', '.ppppp.', 'p.p.p.p', '.ppppp.', '..p.p..']
  ];
  var NUT_PAL = { s: '#8a6448', c: '#a8805c', b: '#e8b07c', w: '#c89a6a', p: '#a87a58' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  // 丸角の四角(白縁つき)
  function rrect(x, y, w, h, r, col, alpha) {
    var a = alpha === undefined ? 1 : alpha;
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.rect(x, y + r, w, h - r * 2, col, a);
    game.draw.circle(x + r, y + r, r, col, a);
    game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a);
    game.draw.circle(x + w - r, y + h - r, r, col, a);
  }
  function framed(x, y, w, h, r, col, edge) {
    rrect(x - 8, y - 8, w + 16, h + 16, r + 8, edge || C.white);
    rrect(x, y, w, h, r, col);
  }
  function ring(cx, cy, r, col, w) {
    var n = 28, px = cx + r, py = cy;
    for (var i = 1; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      game.draw.line(px, py, x, y, col, w);
      px = x; py = y;
    }
  }

  function sectionAt(b) {
    var k = 0;
    for (var i = 0; i < SECTIONS.length; i++) if (b >= SECTIONS[i][0]) k = i;
    return k;
  }
  function barPos(b) {
    var k = sectionAt(b), s = SECTIONS[k];
    return { len: s[1], idx: (b - s[0]) % s[1], sec: k };
  }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var ap = isDemo ? DEMO_APPEARS : APPEARS;
    var cs = [], prev = -1;
    for (var i = 0; i < ap.length; i++) {
      var t;
      if (isDemo) t = DEMO_TYPES[i];
      else {
        t = Math.floor(game.random(0, 3)) % 3;
        if (t === prev && game.random(0, 1) < 0.6) t = (t + 1 + Math.floor(game.random(0, 2))) % 3;
      }
      prev = t;
      cs.push({ a: ap[i], d: ap[i] + 1, type: t, st: 'wait', hx: TRAY.x, hy: TRAY.y, fx: 0, fy: 0, at: 0, hole: -1 });
    }
    return {
      demo: isDemo, cs: cs, bp: 0, beatIdx: -1, stepIdx: -1, sec: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, stored: [0, 0, 0], held: null,
      holeFlash: [0, 0, 0], pulse: 0, toss: 0, oops: 0, announce: 0, nextLen: 4, lastHover: -1,
      stop: 0, stopC: null, over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MEL_A.length; i++) notes.push([MEL_A[i] || 'R', 0.5]);
    bass.push(['C3', 1], ['G3', 1], ['C3', 1], ['G3', 1]);
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏(8分): 区間ごとに刻みが変わる(4拍子の行進/3拍子のワルツ/4拍子の跳ね)
  function playStep(s) {
    var b = Math.floor(s / 2), half = s % 2;
    var bp = barPos(b);
    var bar = Math.floor((b - SECTIONS[bp.sec][0]) / bp.len);
    var root = ROOTS[bar % 4];
    if (bp.sec === 2) {
      if (!half) {
        if (bp.idx === 0) game.audio.tone(root, SPB * 0.9, { wave: 'triangle', volume: 0.11 });
        else game.audio.tone(bp.idx === 1 ? 'E4' : 'G4', SPB * 0.3, { wave: 'square', volume: 0.035 });
      }
      var mb = MEL_B[(bp.idx * 2 + half) % MEL_B.length];
      if (mb) game.audio.tone(mb, SPB * 0.4, { wave: 'triangle', volume: 0.045 });
    } else if (bp.sec === 3) {
      game.audio.tone(half ? 'C4' : root, SPB * 0.4, { wave: 'triangle', volume: 0.08 });
      if (!half && (bp.idx === 1 || bp.idx === 3)) game.audio.tone(1400, 0.05, { wave: 'square', volume: 0.04, slide: -800 });
      var mc = MEL_C[(bp.idx * 2 + half) % MEL_C.length];
      if (mc) game.audio.tone(mc, SPB * 0.4, { wave: 'square', volume: 0.035 });
    } else {
      if (!half) {
        if (bp.idx % 2 === 0) game.audio.tone(root, SPB * 0.8, { wave: 'triangle', volume: 0.11 });
        else game.audio.tone('G4', SPB * 0.25, { wave: 'square', volume: 0.035 });
      }
      var ma = MEL_A[(bp.idx * 2 + half) % MEL_A.length];
      if (ma && b >= 4) game.audio.tone(ma, SPB * 0.4, { wave: 'triangle', volume: 0.045 });
    }
    if (!half) game.audio.tone(bp.idx === 0 ? 900 : 700, 0.03, { wave: 'triangle', volume: bp.idx === 0 ? 0.06 : 0.035 });
  }

  function onBeat(b) {
    R.pulse = 1;
    // 区間の切り替わりの2拍前: 拍ランプの数が点滅して変わり、鈴の合図
    for (var i = 2; i < SECTIONS.length; i++) {
      if (b === SECTIONS[i][0] - 2) {
        R.announce = 2; R.nextLen = SECTIONS[i][1];
        if (!R.demo) {
          game.audio.tone('E6', 0.12, { wave: 'triangle', volume: 0.07 });
          game.audio.tone('G6', 0.12, { wave: 'triangle', volume: 0.05 });
        }
      }
      if (b === SECTIONS[i][0]) {
        R.sec = i;
        if (!R.demo) {
          game.audio.play('se_powerup', 0.5);
          game.fx.popup(SECTIONS[i][1] + '/4', W / 2, 560, { color: C.ink, size: 110 });
        }
      }
    }
  }

  function cardPos(c) {
    if (c.st === 'held') return { x: c.hx, y: c.hy - 60 };
    if (c.st === 'fall') {
      var t = Math.max(0, Math.min(1, R.bp - (c.a - 1)));
      return { x: BASKET.x + (TRAY.x - BASKET.x) * t, y: BASKET.y - 60 + (TRAY.y - BASKET.y + 60) * t - Math.sin(t * Math.PI) * 160 };
    }
    if (c.st === 'tray') {
      // 葉皿に複数あるときは少しずらして重ねる
      var n = 0;
      for (var i = 0; i < R.cs.length; i++) { if (R.cs[i] === c) break; if (R.cs[i].st === 'tray') n++; }
      return { x: TRAY.x + n * 34, y: TRAY.y - n * 20 };
    }
    return { x: c.fx, y: c.fy };
  }

  function grab(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0 || R.held) return false;
    var best = null;
    for (var i = 0; i < R.cs.length; i++) {
      var c = R.cs[i];
      var ok = c.st === 'tray' || (c.st === 'fall' && R.bp >= c.a - 0.3);
      if (!ok) continue;
      var p = cardPos(c);
      var dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy < 190 * 190 && (!best || c.a < best.a)) best = c;
    }
    if (!best) return false;
    best.st = 'held'; best.hx = x; best.hy = y; R.held = best;
    return true;
  }
  function dragTo(x, y) {
    if (!R || !R.held) return -1;
    R.held.hx = x; R.held.hy = y;
    return holeAt(x, y - 60);
  }
  function holeAt(x, y) {
    for (var i = 0; i < HOLES.length; i++) {
      var dx = x - HOLES[i].x, dy = y - HOLES[i].y;
      if (dx * dx + dy * dy < (HOLE_R + 50) * (HOLE_R + 50)) return i;
    }
    return -1;
  }

  // 指を離した: 戻り値は判定
  function release(x, y) {
    if (!R || !R.held) return 'none';
    var c = R.held;
    R.held = null;
    var h = holeAt(x, y - 60);
    if (h < 0) { c.st = 'tray'; return 'back'; }
    var d = (R.bp - c.d) * SPB;
    c.hole = h;
    if (h !== c.type) { missCard(c, x, y - 60); return 'wrong'; }
    if (d < -WIN_G) { c.st = 'tray'; return 'early'; }
    if (d > WIN_G) { missCard(c, x, y - 60); return 'late'; }
    var grade = Math.abs(d) <= WIN_P ? 'PERFECT' : 'GOOD';
    c.st = 'in'; c.at = 0; c.fx = HOLES[h].x; c.fy = HOLES[h].y;
    R.stored[h]++; R.holeFlash[h] = 1;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var bonus = R.sec === 2 ? 20 : (R.sec === 3 ? 40 : 0);
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + bonus; }
    else { R.good++; R.score += 50 + R.combo * 5 + bonus; }
    game.feedback.good(HOLES[h].x, HOLES[h].y - 190, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 14 : 8 });
    game.fx.burst(HOLES[h].x, HOLES[h].y, { color: NUT_COL[h], count: 12, speed: 320 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone(['C6', 'E6', 'G6'][h], 0.08, { wave: 'triangle', volume: 0.07 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, 1000, { color: C.gold, size: 68 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missCard(c, x, y) {
    if (c.st === 'held' || R.held === c) R.held = null;
    var p = x !== undefined ? { x: x, y: y } : cardPos(c);
    c.st = 'stop'; c.fx = p.x; c.fy = p.y;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopC = c; R.oops = 1.2;
    if (!R.demo) game.audio.tone(160, 0.28, { wave: 'sawtooth', volume: 0.09, slide: -70 });
  }

  function releaseStop() {
    var c = R.stopC;
    R.stopC = null;
    if (!c) return;
    c.st = 'out'; c.at = 0;
    game.feedback.bad(c.fx, c.fy - 120, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    if (R.held) { R.held.st = 'tray'; R.held = null; }
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(HOLES[i].x, HOLES[i].y, { color: NUT_COL[i], count: 24, speed: 480 });
      game.fx.burst(240, 660, { color: C.gold, count: 20, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function animCards(dt) {
    for (var i = 0; i < R.cs.length; i++) {
      var c = R.cs[i];
      if (c.st === 'in') { c.at += dt; if (c.at >= 0.35) c.st = 'gone'; }
      else if (c.st === 'out') { c.at += dt; if (c.at >= 0.7) c.st = 'gone'; }
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    R.toss = Math.max(0, R.toss - dt);
    for (var f = 0; f < 3; f++) R.holeFlash[f] = Math.max(0, R.holeFlash[f] - dt * 2.5);
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    animCards(dt);
    if (R.over) return;
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('E5', 0.08, { wave: 'triangle', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    if (R.announce > 0) R.announce = Math.max(0, R.announce - dt / SPB);
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.cs.length; i++) {
      var c = R.cs[i];
      if (c.st === 'wait' && R.bp >= c.a - 1) {
        // 番人が札を投げる(1拍かけて葉皿へ落ちる=予告)
        c.st = 'fall'; R.toss = 0.3;
        if (!R.demo) game.audio.tone(['A5', 'C6', 'E6'][c.type], 0.05, { wave: 'square', volume: 0.04, slide: 300 });
      }
      if (c.st === 'fall' && R.bp >= c.a) {
        c.st = 'tray';
        if (!R.demo) game.audio.play('se_tap', 0.25);
      }
      if ((c.st === 'tray' || c.st === 'held') && (R.bp - c.d) * SPB > WIN_G) { missCard(c); return; }
    }
    if (!R.demo && R.bp >= SONG_END_B) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2枚は同じ印の穴へ拍の頭で納め、3枚目は違う穴に入れてMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; startAttractBgm(); }
    var nx = null, idx = -1;
    for (var i = 0; i < R.cs.length; i++) {
      var st = R.cs[i].st;
      if (st === 'wait' || st === 'fall' || st === 'tray' || st === 'held') { nx = R.cs[i]; idx = i; break; }
    }
    var tx = TRAY.x + 120, ty = TRAY.y + 260;
    if (nx && R.stop <= 0) {
      var hole = HOLES[DEMO_TARGET[idx]];
      if (nx.st !== 'held' && R.bp >= nx.a - 0.05) grab(TRAY.x, TRAY.y);
      if (nx.st === 'held') {
        var k = Math.max(0, Math.min(1, (R.bp - nx.a) / 0.75));
        k = k * k * (3 - 2 * k);
        var hx = TRAY.x + (hole.x - TRAY.x) * k, hy = TRAY.y + (hole.y + 60 - TRAY.y) * k;
        dragTo(hx, hy);
        tx = hx; ty = hy;
        if (R.bp >= nx.d) release(hx, hy);
      } else {
        tx = TRAY.x + 40; ty = TRAY.y + 40;
      }
    }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 16);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 16);
    demo.press = !!R.held;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.pink], [0.5, C.sky], [1, C.cream]]);
    // 上の画面(合図): 森の梢
    var tint = SEC_COL[R.sec];
    framed(40, 240, W - 80, 660, 40, tint);
    rrect(40, 240, W - 80, 260, 40, C.sky, 0.7);
    rrect(40, 440, W - 80, 120, 40, C.sky, 0.35);
    for (var k = 0; k < 5; k++) {
      var bx = 120 + k * 210, by = 320 + (k % 2) * 40 + Math.sin(e * 1.2 + k) * 6;
      game.draw.circle(bx, by, 90, C.leaf, 0.35);
      game.draw.circle(bx + 50, by + 30, 60, C.leaf, 0.3);
    }
    // 枝
    rrect(60, 800, 960, 50, 25, C.bark);
    rrect(60, 800, 960, 18, 9, '#dcb898');
    // 蝶番(2画面のつなぎ目)
    rrect(380, 912, 320, 46, 23, C.white);
    rrect(396, 922, 288, 26, 13, C.inkSoft, 0.4);
    // 下の画面(遊び): 大木の根元
    framed(40, 970, W - 80, 470, 40, '#f8e8d4');
    rrect(40, 1080, W - 80, 360, 40, C.bark);
    for (var r = 0; r < 4; r++) game.draw.rect(80 + r * 250, 1100, 18, 320, C.barkDk, 0.35);
    // 親指ゾーン: 草むら
    for (var g = 0; g < 12; g++) {
      var gx = 40 + g * 90, gy = 1500 + (g % 3) * 30;
      game.draw.circle(gx, gy, 36, C.leaf, 0.5);
    }
  }

  function drawHoles() {
    for (var i = 0; i < 3; i++) {
      var h = HOLES[i];
      var fl = R.holeFlash[i];
      var hover = R.held && holeAt(R.held.hx, R.held.hy - 60) === i;
      game.draw.circle(h.x, h.y, HOLE_R + 16 + fl * 12, C.white);
      game.draw.circle(h.x, h.y, HOLE_R + 6, hover ? C.gold : NUT_COL[i]);
      game.draw.circle(h.x, h.y, HOLE_R - 14, C.hole);
      // しまった木の実が穴の底に積もる
      var n = Math.min(6, R.stored[i]);
      for (var k = 0; k < n; k++) game.draw.sprite(NUTS[i], NUT_PAL, h.x - 50 + (k % 3) * 50, h.y + 60 - Math.floor(k / 3) * 34, 5, { anchor: 'center' });
      // 穴の印(上に白縁の丸い札)
      game.draw.circle(h.x, h.y - HOLE_R - 30, 52, C.white);
      game.draw.circle(h.x, h.y - HOLE_R - 30, 44, NUT_COL[i]);
      game.draw.sprite(NUTS[i], NUT_PAL, h.x, h.y - HOLE_R - 30, 9, { anchor: 'center' });
    }
  }

  function drawCard(x, y, type, scale, white) {
    var w = CW * scale, h = CH * scale;
    framed(x - w / 2, y - h / 2, w, h, 26 * scale, white ? C.white : NUT_COL[type], white ? C.bad : C.white);
    game.draw.sprite(NUTS[type], NUT_PAL, x, y, 14 * scale, { anchor: 'center' });
  }

  function drawCards() {
    var e = game.time.elapsed;
    // 番人の籠の中の次の札(小さく予告)
    var q = 0;
    for (var i = 0; i < R.cs.length && q < 2; i++) {
      var c = R.cs[i];
      if (c.st === 'wait' && c.a - R.bp < 3) {
        drawCard(BASKET.x - 10 + q * 26, BASKET.y - 40 - q * 16, c.type, 0.45, false);
        q++;
      }
    }
    // 籠
    rrect(BASKET.x - 70, BASKET.y - 20, 140, 70, 30, C.barkDk);
    rrect(BASKET.x - 70, BASKET.y - 20, 140, 16, 8, '#e0c0a0');
    // 葉皿
    game.draw.circle(TRAY.x, TRAY.y + 50, 110, C.white);
    game.draw.circle(TRAY.x, TRAY.y + 50, 100, C.leaf);
    for (var j = 0; j < R.cs.length; j++) {
      var cc = R.cs[j];
      if (cc.st === 'fall' || cc.st === 'tray' || cc.st === 'held') {
        var p = cardPos(cc);
        var bob = cc.st === 'tray' ? Math.sin(e * 6 + j) * 6 : 0;
        // 縮む輪: 次の拍の頭(納める瞬間)で閉じる
        var dB = cc.d - R.bp;
        if (cc.st !== 'fall' && dB > -0.2 && dB < 1.05) {
          var rr = 100 + Math.max(0, dB) * 150;
          ring(p.x, p.y + bob, rr, dB < 0.3 ? C.bad : C.ink, 8);
        }
        drawCard(p.x, p.y + bob, cc.type, cc.st === 'held' ? 1.1 : 1, false);
      } else if (cc.st === 'stop') {
        var white = Math.floor(e * 20) % 2 === 0;
        drawCard(cc.fx, cc.fy, cc.type, 1.35, white);
      } else if (cc.st === 'in') {
        var t = Math.min(1, cc.at / 0.35);
        drawCard(cc.fx, cc.fy - 40 + t * 40, cc.type, 1 - t * 0.8, false);
      } else if (cc.st === 'out') {
        var t2 = Math.min(1, cc.at / 0.7);
        drawCard(cc.fx + t2 * 200, cc.fy + t2 * t2 * 500, cc.type, 1 - t2 * 0.4, false);
      }
    }
  }

  function drawKeeper() {
    var e = game.time.elapsed;
    var f = R.oops > 0 ? SQ_OOPS : (R.toss > 0 ? SQ_TOSS : (Math.floor(e * 2.5) % 2 === 0 ? SQ_A : SQ_B));
    var hop = R.pulse * 14;
    game.draw.circle(230, 800, 70, C.barkDk, 0.3);
    game.draw.sprite(f, SQ_PAL, 230, 720 - hop, 15, { anchor: 'center' });
  }

  function drawWorld() {
    drawBg();
    drawKeeper();
    drawHoles();
    drawCards();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.ink, 'left');
    txt('BEST ' + game.best, W - 40, 70, 36, '#e09a2a', 'right');
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(W - 70 - i * 70, 150, 30, C.white);
      game.draw.circle(W - 70 - i * 70, 150, 24, i < R.lives ? C.peach : '#e0d6e6');
      if (i < R.lives) game.draw.sprite(NUTS[0], NUT_PAL, W - 70 - i * 70, 150, 5, { anchor: 'center' });
    }
    // 拍ランプ: 1小節の拍数だけ並ぶ(切り替わりの2拍前から次の数で点滅)
    var cur = R.ready > 0 ? { len: 4, idx: -1 } : barPos(Math.max(0, R.beatIdx));
    var blinkNext = R.announce > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    var len = blinkNext ? R.nextLen : cur.len;
    for (var b = 0; b < len; b++) {
      var lit = !blinkNext && b === cur.idx && R.pulse > 0.2;
      var x = 100 + b * 100;
      game.draw.circle(x, 150, b === 0 ? 34 : 26, C.white);
      game.draw.circle(x, 150, b === 0 ? 26 : 19, blinkNext ? C.gold : (lit ? C.bad : '#e6dcef'));
    }
    game.draw.text(len + '/4', 100 + 4 * 100 + 20, 150, { size: 44, color: blinkNext ? C.bad : C.ink, bold: true, align: 'left' });
    var progress = Math.min(1, R.bp / SONG_END_B);
    rrect(40, 200, W - 80, 18, 9, C.white);
    rrect(44, 204, Math.max(10, (W - 88) * progress), 10, 5, C.good);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, 1000, 44, C.ink);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 520, 110, C.bad);
  }

  function drawResult() {
    framed(70, H * 0.24, W - 140, H * 0.32, 50, C.white, C.lav);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.ink);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.inkSoft);
    var st = R.stored[0] + R.stored[1] + R.stored[2];
    txt(st + ' / ' + R.cs.length + '   COMBO ' + R.maxCombo, W / 2, H * 0.45, 36, C.inkSoft);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 50, '#e09a2a');
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, '#e09a2a');
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.cs.length; i++) { var s = R.cs[i].st; if (s === 'wait' || s === 'fall' || s === 'tray' || s === 'held') left++; }
      txt('あと' + Math.max(1, left) + '枚', W / 2, H * 0.54, 46, C.bad);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, 110 + 6 + bob, { size: 108, color: C.white, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 110 + bob, { size: 108, color: '#d88a5a', bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 106 + bob, { size: 108, color: C.peach, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 200, 40, C.ink);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 50, C.bad);
    else txt('INSERT COIN', W / 2, H * 0.95, 42, C.ink);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    if (grab(x, y)) game.audio.tone(520, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    var h = dragTo(x, y);
    if (h >= 0 && R.lastHover !== h) game.audio.tone(['G5', 'B5', 'D6'][h], 0.04, { wave: 'triangle', volume: 0.05 });
    R.lastHover = h;
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    var res = release(x, y);
    R.lastHover = -1;
    if (res === 'back' || res === 'early') {
      game.audio.play('se_jump', 0.3);
      game.fx.burst(TRAY.x, TRAY.y, { color: C.leaf, count: 6, speed: 160 });
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
      return;
    }
    if (state === S.RESULT) {
      animCards(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 42, C.ink);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, stored: R.stored[0] + R.stored[1] + R.stored[2] };
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
