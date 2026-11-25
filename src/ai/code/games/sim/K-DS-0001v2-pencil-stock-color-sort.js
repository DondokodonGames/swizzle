// K-DS-0001v2-pencil-stock-color-sort.js
// 鉛筆の色分け棚卸し — 倉庫の奥から拍ごとに流れてくる色違いの箱へ、手元の筒から同じ色の鉛筆束をつまんで運び、箱が手前の線に着く拍の頭で離して入れる
// 操作: 画面下の4つの筒(赤・青・緑・黄)から鉛筆束を押さえてつまみ、左右2本のベルトの手前(黄色い線)へドラッグ。同じ色の箱がその線に着く拍の頭(縮む輪が閉じる瞬間)に指を離して入れる。ベルトの外で離すと束は筒に戻る。違う色・拍外れ・入れ損ねた空箱はMISS
// 終わり: 前奏1小節+7小節(96BPM・約20秒・15箱)を捌き切ればCLEAR。MISS3回でGAME OVER
// @mechanic: drag_sort
// @theme: pencil_stock_color_sort
// 世界観: 文房具店の倉庫で、棚卸し係が奥から流れてくる色ごとの箱へ、同じ色の鉛筆を拍に乗って振り分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・詰めた箱数・最大コンボ)
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var STYLE = { bg: ['#2c3e5c', '#6a86a8', '#c8b48c'], main: ['#e8483c', '#3c78e8', '#48b85c'], accent: ['#f4c430', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 箱も人も板(sprite)のまま距離でpxを変え、真下に楕円の接地影。奥ほど霧色を重ねて彩度を落とす
  var C = {
    ceil: STYLE.bg[0], wall: STYLE.bg[1], floor: STYLE.bg[2],
    red: STYLE.main[0], blue: STYLE.main[1], green: STYLE.main[2],
    yel: STYLE.accent[0], white: STYLE.accent[1],
    fog: '#a8b8cc', belt: '#3a4250', beltD: '#22262e', beltL: '#5a6474', shelf: '#7a5a3a', shelfD: '#4a3420',
    desk: '#b08050', deskD: '#7a5432', ink: '#141820', good: '#40e070', bad: '#ff3a30', dim: '#5a6070'
  };
  var COLS = [C.red, C.blue, C.green, C.yel];

  var GAME_TITLE = 'PENCIL STOCK';
  var BPM = 96;
  var SPB = 60 / BPM;
  var WIN_P = 0.08, WIN_G = 0.16, WIN_M = 0.36;
  var LIVES = 3;
  // 箱が手前の線に着く拍(すべて拍の頭)。後半は1拍差で続く組が混ざる
  var ARRIVALS = [5, 7, 9, 11, 13, 15, 17, 19, 20, 22, 24, 25, 27, 29, 30];
  var SONG_END = 32;
  // デモ: [拍, レーン, 色]。3箱目はわざと違う色を入れてMISS
  var DEMO_BOXES = [[3, 0, 0], [5, 1, 1], [7, 0, 3]];
  var DEMO_FAIL_B = 7, DEMO_FAIL_COL = 2;
  var DEMO_CYCLE = 8.6 * SPB + 1.4;

  var VX = 540, HY = 520, FY = 1230;
  var LANE_FX = [330, 750];
  var ZONE_Y = FY - 80;
  var CUP_X = [170, 410, 670, 910], CUP_Y = 1700;
  var LEAD = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5', 'C6', 'B5', 'A5', 'G5', 'E5', 'G5'];
  var ROOTS = ['C3', 'A2', 'F2', 'G2'];
  var FIFTHS = { C3: 'G2', A2: 'E3', F2: 'C3', G2: 'D3' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, x: 540, y: 1800, press: false };

  // ── スプライト ─────────────────────────────────────────
  var BOX = [
    'oooooooooooo',
    'oIIIIIIIIIIo',
    'oMMMMMMMMMMo',
    'oMMwwwwwwMMo',
    'oMMwPPPPwMMo',
    'oMMwwwwwwMMo',
    'oMMMMMMMMMMo',
    'oDDDDDDDDDDo',
    'oooooooooooo'
  ];
  function boxPal(col, dark) { return { o: C.ink, I: '#2a1c10', M: col, D: dark, w: C.white, P: col }; }
  var BOX_PAL = [boxPal(C.red, '#a02a20'), boxPal(C.blue, '#24489a'), boxPal(C.green, '#2a7a3a'), boxPal(C.yel, '#b08a10')];
  var BOX_WHITE = { o: C.white, I: C.white, M: C.white, D: C.white, w: C.white, P: C.white };
  var PENCILS = [
    '.k...k...k.',
    '.w...w...w.',
    'www.www.www',
    'PPP.PPP.PPP',
    'PPP.PPP.PPP',
    'PPP.PPP.PPP',
    'BBBBBBBBBBB',
    'PPP.PPP.PPP',
    'PPP.PPP.PPP',
    'eee.eee.eee'
  ];
  function penPal(col) { return { k: '#333333', w: '#f0d0a0', P: col, B: C.white, e: '#ff9cb0' }; }
  var PEN_PAL = [penPal(C.red), penPal(C.blue), penPal(C.green), penPal(C.yel)];
  var CLERK_A = [
    '...cccccc...',
    '..cccccccc..',
    '.ccccccccccc',
    '...ssssss...',
    '...sesses...',
    '...ssssss...',
    '....smms....',
    '..aaaaaaaa..',
    '.aaaaaaaaaa.',
    '.aaaaaaabbbs',
    '.saaaaaabwbs',
    '..aaaaaabbb.',
    '..aaaaaaaa..',
    '..pppppppp..',
    '..ppp..ppp..',
    '..ppp..ppp..',
    '..ppp..ppp..',
    '.kkkk..kkkk.'
  ];
  var CLERK_B = CLERK_A.slice();
  CLERK_B[3] = '............';
  CLERK_B[4] = '...ssssss...';
  CLERK_B[5] = '...sesses...';
  CLERK_B[6] = '...ssssss...';
  CLERK_B[0] = '............';
  CLERK_B[1] = '...cccccc...';
  CLERK_B[2] = '..cccccccc..';
  var CLERK_JOY = CLERK_A.slice();
  CLERK_JOY[6] = '...srrrrs...';
  CLERK_JOY[8] = 'saaaaaaaaaas';
  var CLERK_OOPS = CLERK_A.slice();
  CLERK_OOPS[4] = '...sxssxs...';
  CLERK_OOPS[6] = '....sOOs....';
  var CLERK_PAL = { c: C.yel, s: '#f0b890', e: C.ink, x: C.ink, m: '#b04030', r: '#d03020', O: '#401010', a: C.green, b: C.shelf, w: C.white, p: '#2a3a5a', k: C.ink };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function shadow(cx, cy, rx, ry, a) {
    var step = Math.max(2, Math.round(ry / 5));
    for (var yy = -ry; yy <= ry; yy += step) {
      var k = 1 - (yy * yy) / (ry * ry);
      if (k <= 0) continue;
      var hw = rx * Math.sqrt(k);
      game.draw.rect(cx - hw, cy + yy, hw * 2, step, C.ink, a);
    }
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
  // 奥行き u(拍)→ 画面上の大きさ s
  function depthScale(u) { return u >= 0 ? 1 / (1 + u * 0.55) : 1 - u * 0.3; }
  function proj(lane, u) {
    var s = depthScale(u);
    return { x: VX + (LANE_FX[lane] - VX) * s, y: HY + (FY - HY) * s, s: s };
  }

  // ── 進行 ───────────────────────────────────────────────
  function buildBoxes(isDemo) {
    var list = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_BOXES.length; i++) list.push({ b: DEMO_BOXES[i][0], lane: DEMO_BOXES[i][1], col: DEMO_BOXES[i][2] });
    } else {
      var p1 = -1, p2 = -1;
      for (i = 0; i < ARRIVALS.length; i++) {
        var pool = i < 4 ? 3 : 4;
        var c = Math.floor(game.random(0, pool)) % pool;
        if (c === p1 && c === p2) c = (c + 1) % pool;
        p2 = p1; p1 = c;
        list.push({ b: ARRIVALS[i], lane: Math.floor(game.random(0, 2)) % 2, col: c });
      }
    }
    for (i = 0; i < list.length; i++) { list[i].st = 'wait'; list[i].t = 0; }
    return list;
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, boxes: buildBoxes(isDemo), bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, packed: 0,
      held: null, back: null, hover: -1,
      stop: 0, stopBox: null, pulse: 0, oops: 0, joy: 0, zoneFlash: [0, 0],
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD.length; i++) notes.push([LEAD[i], 1]);
    for (var j = 0; j < 16; j++) {
      var root = ROOTS[Math.floor(j / 4) % 4];
      bass.push([j % 2 === 0 ? root : FIFTHS[root], 1]);
    }
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: bass, bassVolume: 0.07 });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 表拍の伴奏: 毎拍のキックとベース、1・3拍の和音、4分のリード、8分のハイハット
  function playStep(s) {
    var b = Math.floor(s / 2), half = s % 2;
    var bar = Math.floor(b / 4), pos = b % 4;
    var root = ROOTS[bar % 4];
    if (half === 0) {
      game.audio.tone(130, 0.1, { wave: 'sine', volume: 0.17, slide: -80 });
      game.audio.tone(pos % 2 === 0 ? root : FIFTHS[root], SPB * 0.8, { wave: 'triangle', volume: 0.13 });
      if (pos % 2 === 0) game.audio.tone(root.replace(/[0-9]/, '4'), SPB * 1.4, { wave: 'square', volume: 0.025 });
      if (bar >= 1) game.audio.tone(LEAD[(b - 4) % 16], SPB * 0.7, { wave: 'square', volume: 0.04 });
    } else {
      game.audio.tone(3200, 0.02, { wave: 'square', volume: 0.018 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
  }

  function zoneAt(x, y) {
    for (var i = 0; i < 2; i++) {
      var dx = x - LANE_FX[i], dy = y - ZONE_Y;
      if (dx * dx + dy * dy < 190 * 190) return i;
    }
    return -1;
  }
  function cupAt(x, y) {
    if (y < CUP_Y - 200) return -1;
    for (var i = 0; i < 4; i++) if (Math.abs(x - CUP_X[i]) < 120) return i;
    return -1;
  }

  function grab(x, y) {
    if (!R || R.over || R.ready > 0 || R.held) return -1;
    var c = cupAt(x, y);
    if (c < 0) return -1;
    R.held = { col: c, x: x, y: y - 90 };
    R.back = null;
    return c;
  }
  function dragTo(x, y) {
    if (!R || !R.held) return -1;
    R.held.x = x; R.held.y = y - 90;
    return zoneAt(R.held.x, R.held.y);
  }
  // 指を離した: 線の上なら判定。戻り値 'back' / 'wrong' / 'off' / PERFECT / GOOD
  function release() {
    if (!R || !R.held) return 'none';
    var h = R.held;
    R.held = null; R.hover = -1;
    var lane = zoneAt(h.x, h.y);
    if (lane < 0 || R.stop > 0 || R.over) { R.back = { col: h.col, x: h.x, y: h.y, t: 0 }; return 'back'; }
    var best = null, bd = 99;
    for (var i = 0; i < R.boxes.length; i++) {
      var bx = R.boxes[i];
      if (bx.st !== 'wait' || bx.lane !== lane) continue;
      var d = (R.bp - bx.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = bx; }
    }
    if (!best || Math.abs(bd) > WIN_M) { R.back = { col: h.col, x: h.x, y: h.y, t: 0 }; return 'back'; }
    best.given = h.col;
    if (best.col !== h.col) { missBox(best); return 'wrong'; }
    if (Math.abs(bd) > WIN_G) { missBox(best); return 'off'; }
    best.st = 'fill'; best.t = 0;
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    R.combo++; R.packed++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; R.joy = 0.6; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    R.zoneFlash[lane] = 1;
    game.feedback.good(LANE_FX[lane], ZONE_Y - 230, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(LANE_FX[lane], ZONE_Y - 40, { color: COLS[h.col], count: 12, speed: 360 });
    game.audio.tone(523 * Math.pow(2, Math.min(R.combo, 12) / 12), 0.09, { wave: 'triangle', volume: 0.08 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup('x' + R.combo, W / 2, 760, { color: C.yel, size: 100 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missBox(bx) {
    bx.st = 'miss'; bx.t = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopBox = bx; R.oops = 1.2;
    game.audio.tone(140, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var bx = R.stopBox;
    R.stopBox = null;
    if (bx) game.feedback.bad(LANE_FX[bx.lane], ZONE_Y - 230, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    R.held = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.joy = 3;
      for (var i = 0; i < 4; i++) game.fx.burst(CUP_X[i], CUP_Y - 100, { color: COLS[i], count: 20, speed: 520 });
      game.fx.burst(W / 2, ZONE_Y - 100, { color: C.white, count: 26, speed: 600 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 640, { color: C.yel, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.2);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    for (var z = 0; z < 2; z++) R.zoneFlash[z] = Math.max(0, R.zoneFlash[z] - dt * 3);
    if (R.back) { R.back.t += dt; if (R.back.t > 0.3) R.back = null; }
    for (var q = 0; q < R.boxes.length; q++) if (R.boxes[q].st !== 'wait' && R.boxes[q] !== R.stopBox) R.boxes[q].t += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('E5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.boxes.length; i++) {
      var bx = R.boxes[i];
      if (bx.st === 'wait' && (R.bp - bx.b) * SPB > WIN_G) { bx.given = -1; missBox(bx); return; }
    }
    if (!R.demo && R.bp >= SONG_END + 0.3) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで遊ぶ(赤→左、青→右は拍の頭で入れ、3箱目の黄色に緑を入れてMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; }
    var nx = null;
    for (var i = 0; i < R.boxes.length; i++) if (R.boxes[i].st === 'wait') { nx = R.boxes[i]; break; }
    var tx = W / 2, ty = 1840;
    if (nx && R.stop <= 0) {
      var col = nx.b === DEMO_FAIL_B ? DEMO_FAIL_COL : nx.col;
      var zx = LANE_FX[nx.lane], zy = ZONE_Y + 90;
      if (!R.held) {
        if (R.bp >= nx.b - 1.7) { tx = CUP_X[col]; ty = CUP_Y; }
        if (R.bp >= nx.b - 1.2 && Math.abs(demo.x - CUP_X[col]) < 30 && Math.abs(demo.y - CUP_Y) < 30) grab(CUP_X[col], CUP_Y);
      } else {
        var k = Math.max(0, Math.min(1, (R.bp - (nx.b - 1.2)) / 0.8));
        var e = k * k * (3 - 2 * k);
        tx = CUP_X[col] + (zx - CUP_X[col]) * e;
        ty = CUP_Y + (zy - CUP_Y) * e;
        dragTo(tx, ty);
        demo.x = tx; demo.y = ty;
        if (R.bp >= nx.b) release();
      }
    } else if (R.stop > 0 && R.stopBox) { tx = LANE_FX[R.stopBox.lane]; ty = ZONE_Y + 90; }
    if (!R.held) {
      demo.x += (tx - demo.x) * Math.min(1, dt * 9);
      demo.y += (ty - demo.y) * Math.min(1, dt * 9);
    }
    demo.press = !!R.held;
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    game.draw.gradient(0, HY, [[0, C.ceil], [1, C.wall]]);
    game.draw.gradient(HY, H, [[0, C.fog], [0.35, C.floor], [1, '#8a7050']]);
    // 天井の灯(拍で点く4灯が手前、奥は霧に沈む)
    for (var d = 5; d >= 1; d--) {
      var s = 1 / (1 + d * 0.55);
      var y = HY - 300 * s;
      for (var side = -1; side <= 1; side += 2) {
        game.draw.rect(VX + side * 380 * s - 40 * s, y, 80 * s, 14 * s, C.white, 0.5 * s + 0.15);
      }
    }
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % 4;
    for (var i = 0; i < 4; i++) {
      var lx = 330 + i * 140, lit = i === inBar;
      game.draw.line(lx, 236, lx, 282, C.ink, 4);
      game.draw.rect(lx - 46, 282, 92, 26, C.ink);
      game.draw.rect(lx - 40, 304, 80, 12, lit ? C.yel : C.dim, lit ? 1 : 0.6);
      if (lit) game.draw.circle(lx, 330, 50 + R.pulse * 20, C.yel, 0.18 + R.pulse * 0.2);
    }
    // 両側の棚(板のまま距離で縮め、奥ほど霧色を重ねる)
    for (var dd = 6; dd >= 0; dd--) {
      var sc = 1 / (1 + dd * 0.55);
      var gy = HY + (FY + 200 - HY) * sc;
      for (var sd = -1; sd <= 1; sd += 2) {
        var cx = VX + sd * 640 * sc, w = 260 * sc, h = 620 * sc;
        game.draw.rect(cx - w / 2, gy - h, w, h, C.shelfD);
        for (var r = 0; r < 4; r++) {
          var ry = gy - h + r * h / 4;
          game.draw.rect(cx - w / 2, ry + h / 4 - 10 * sc, w, 10 * sc, C.shelf);
          for (var bxi = 0; bxi < 3; bxi++) game.draw.rect(cx - w / 2 + 14 * sc + bxi * (w - 28 * sc) / 3, ry + 26 * sc, (w - 40 * sc) / 3, h / 4 - 44 * sc, COLS[(r + bxi + dd) % 4], 0.85);
        }
        game.draw.rect(cx - w / 2, gy - h, w, h, C.fog, Math.min(0.7, (1 - sc) * 0.9));
      }
    }
  }

  function drawBelts() {
    var yTop = HY + (FY - HY) * depthScale(6);
    for (var y = yTop; y < FY + 70; y += 6) {
      var s = (y - HY) / (FY - HY);
      for (var l = 0; l < 2; l++) {
        var cx = VX + (LANE_FX[l] - VX) * s, hw = 140 * s;
        game.draw.rect(cx - hw - 10 * s, y, hw * 2 + 20 * s, 6, C.beltD);
        game.draw.rect(cx - hw, y, hw * 2, 6, C.belt);
      }
    }
    // 拍ごとに手前の線へ届く桟
    var f = R.bp - Math.floor(R.bp);
    for (var k = 0; k < 7; k++) {
      var u = k + 1 - f;
      var sc = depthScale(u);
      var yy = HY + (FY - HY) * sc;
      for (var l2 = 0; l2 < 2; l2++) {
        var x = VX + (LANE_FX[l2] - VX) * sc, w2 = 140 * sc;
        game.draw.rect(x - w2, yy, w2 * 2, Math.max(2, 6 * sc), C.beltL);
      }
    }
    // 霧で奥を沈める
    game.draw.rect(0, HY, W, (FY - HY) * 0.3, C.fog, 0.35);
    // 手前の線と入れ口
    for (var z = 0; z < 2; z++) {
      var fx = LANE_FX[z];
      var hov = R.hover === z;
      game.draw.rect(fx - 160, FY - 6, 320, 14, C.yel, 0.7 + R.pulse * 0.3);
      game.draw.rect(fx - 160, FY + 8, 320, 6, C.ink, 0.5);
      if (hov || R.zoneFlash[z] > 0) game.draw.circle(fx, ZONE_Y, 170, hov ? C.white : C.yel, 0.12 + R.zoneFlash[z] * 0.25);
    }
  }

  function drawClerk() {
    var s = depthScale(0.6);
    var gx = VX + 470 * s, gy = HY + (FY - HY) * s;
    var frame = R.oops > 0 ? CLERK_OOPS : (R.joy > 0 ? CLERK_JOY : (Math.floor(R.bp) % 2 === 0 ? CLERK_A : CLERK_B));
    var px = 13 * s;
    shadow(gx, gy, 90 * s, 18 * s, 0.35);
    game.draw.sprite(frame, CLERK_PAL, gx, gy - 9 * px - R.pulse * 8, px, { anchor: 'center' });
    // 左奥の検品台に立つ同僚の板(遠くて霧に沈む)
    var s2 = depthScale(3.2);
    var gx2 = VX - 470 * s2, gy2 = HY + (FY - HY) * s2;
    shadow(gx2, gy2, 90 * s2, 18 * s2, 0.3);
    game.draw.sprite(CLERK_A, CLERK_PAL, gx2, gy2 - 9 * 13 * s2, 13 * s2, { anchor: 'center', flipX: true });
    game.draw.rect(gx2 - 90 * s2, gy2 - 240 * s2, 180 * s2, 240 * s2, C.fog, 0.5);
  }

  function boxDrawPos(bx) {
    if (bx.st === 'wait') return proj(bx.lane, bx.b - R.bp);
    var p = proj(bx.lane, 0);
    if (bx === R.stopBox) return p;
    if (bx.st === 'fill') { p.x += (bx.lane ? 1 : -1) * bx.t * 900; p.y += bx.t * 80; }
    else { p.y += bx.t * bx.t * 2200; }
    return p;
  }

  function drawBox(bx) {
    var e = game.time.elapsed;
    var p = boxDrawPos(bx);
    var alpha = bx.st === 'wait' || bx === R.stopBox ? 1 : Math.max(0, 1 - bx.t / 0.55);
    if (alpha <= 0) return;
    var stopHere = bx === R.stopBox;
    var px = 16 * p.s * (stopHere ? 1.22 : 1);
    var fl = stopHere && Math.floor(e * 20) % 2 === 0;
    var wob = bx.st === 'wait' ? Math.sin(e * 8 + bx.b) * 2 * p.s : 0;
    shadow(p.x, p.y + 2, 110 * p.s, 24 * p.s, 0.32 * alpha);
    var cy = p.y - 4.5 * px + wob;
    game.draw.sprite(BOX, fl ? BOX_WHITE : BOX_PAL[bx.col], p.x, cy, px, { anchor: 'center', alpha: alpha });
    if (bx.st === 'fill' || (stopHere && bx.given >= 0)) {
      var gc = bx.st === 'fill' ? bx.col : bx.given;
      game.draw.sprite(PENCILS, PEN_PAL[gc], p.x, cy - 6.5 * px, px * 0.75, { anchor: 'center', alpha: alpha });
    }
    if (bx.st === 'wait') {
      var u = bx.b - R.bp;
      game.draw.rect(p.x - 6 * px, cy - 4.5 * px, 12 * px, 9 * px, C.fog, Math.min(0.65, (1 - p.s) * 0.85));
      if (u <= 1.25 && u > -0.3) ring(LANE_FX[bx.lane], ZONE_Y, 96 + Math.max(0, u) * 170, Math.floor(e * 10) % 2 ? C.yel : C.white, 8);
    }
  }

  function drawDesk() {
    game.draw.rect(0, 1450, W, H - 1450, C.desk);
    game.draw.rect(0, 1450, W, 18, C.deskD);
    for (var g = 0; g < 4; g++) game.draw.rect(0, 1530 + g * 100, W, 3, C.deskD, 0.4);
    for (var i = 0; i < 4; i++) {
      var x = CUP_X[i];
      var take = R.held && R.held.col === i;
      shadow(x, CUP_Y + 120, 110, 22, 0.35);
      game.draw.sprite(PENCILS, PEN_PAL[i], x, CUP_Y - 90 + (take ? 30 : 0), 13, { anchor: 'center' });
      game.draw.rect(x - 95, CUP_Y - 30, 190, 150, COLS[i]);
      game.draw.rect(x - 95, CUP_Y - 30, 190, 22, C.white, 0.35);
      game.draw.rect(x - 95, CUP_Y + 100, 190, 20, C.ink, 0.35);
      game.draw.rect(x - 60, CUP_Y + 20, 120, 50, C.white, 0.9);
      game.draw.rect(x - 44, CUP_Y + 34, 88, 22, COLS[i]);
    }
  }

  function drawHeld() {
    if (R.back) {
      var k = R.back.t / 0.3;
      var bx = R.back.x + (CUP_X[R.back.col] - R.back.x) * k, by = R.back.y + (CUP_Y - 90 - R.back.y) * k;
      game.draw.sprite(PENCILS, PEN_PAL[R.back.col], bx, by, 13, { anchor: 'center', alpha: 1 - k * 0.5 });
    }
    if (!R.held) return;
    shadow(R.held.x, R.held.y + 120, 70, 16, 0.3);
    game.draw.sprite(PENCILS, PEN_PAL[R.held.col], R.held.x, R.held.y, 15, { anchor: 'center' });
  }

  function drawWorld() {
    drawBg();
    drawBelts();
    drawClerk();
    var order = R.boxes.slice().sort(function(a, b) { return (b.b - a.b); });
    for (var i = 0; i < order.length; i++) {
      var bx = order[i];
      if (bx.st === 'wait' && bx.b - R.bp > 6) continue;
      drawBox(bx);
    }
    drawDesk();
    drawHeld();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.85);
    txt('SCORE ' + R.score, 40, 66, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 66, 34, C.yel, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      var x = W - 80 - i * 70;
      game.draw.rect(x - 12, 120, 24, 60, on ? C.yel : C.dim, on ? 1 : 0.5);
      game.draw.rect(x - 12, 112, 24, 10, on ? '#f0d0a0' : C.dim, on ? 1 : 0.5);
      game.draw.rect(x - 4, 100, 8, 12, on ? '#333333' : C.dim, on ? 1 : 0.5);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 150, 52, C.yel, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(40, 204, W - 80, 14, C.dim);
    game.draw.rect(40, 204, (W - 80) * progress, 14, C.yel);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 900, 120, C.yel);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.33, C.ink, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.yel);
    txt(R.packed + '/' + ARRIVALS.length + '   x' + R.maxCombo, W / 2, H * 0.45, 40, C.yel);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 54, C.yel);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, C.white);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.boxes.length; i++) if (R.boxes[i].st === 'wait') left++;
      txt('あと' + left + '箱', W / 2, H * 0.545, 48, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 2.2) * 8;
    game.draw.rect(0, 0, W, 232, C.ink, 0.85);
    game.draw.text(GAME_TITLE, W / 2 + 6, 104 + bob, { size: 108, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 98 + bob, { size: 108, color: C.yel, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 196, 40, C.white);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.yel);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var c = grab(x, y);
    if (c >= 0) game.audio.tone([392, 440, 494, 523][c], 0.06, { wave: 'square', volume: 0.07 });
    else game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    var z = dragTo(x, y);
    if (z !== R.hover) {
      R.hover = z;
      if (z >= 0) game.audio.tone(z ? 880 : 784, 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    dragTo(x, y);
    var res = release();
    if (res === 'back') {
      game.audio.tone(260, 0.07, { wave: 'triangle', volume: 0.07, slide: -60 });
      game.fx.burst(x, y - 90, { color: C.dim, count: 5, speed: 120 });
    } else if (res === 'PERFECT') {
      game.audio.tone('C7', 0.05, { wave: 'square', volume: 0.05 });
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, packed: R.packed, maxCombo: R.maxCombo };
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
