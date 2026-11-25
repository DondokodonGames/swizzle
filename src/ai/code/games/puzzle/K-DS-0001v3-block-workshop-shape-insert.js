// K-DS-0001v3-block-workshop-shape-insert.js
// 型抜き検品の裏拍差し — 拍の頭でガコンと検品台に届く木箱の穴の形を見て、合う形の木片を押さえて選び、裏拍で指を離して差し込む
// 操作: 画面下の4つの木片(丸・四角・三角・十字)のうち、検品台の箱の穴と同じ形を押さえる(押さえている間、木片は差し込み棒の下で待つ)。箱が止まった拍の裏(金の輪が閉じる瞬間、手拍子の音)で指を離すと差し込まれる。形違い・早すぎ・遅すぎ・差し忘れはMISS。2回ある木片の並べ替えは直前に台が揺れて予告
// 終わり: 前奏1小節+7小節(100BPM・約19秒・17箱)を検品し切ればCLEAR。MISS3回でGAME OVER
// @mechanic: gap_fit
// @theme: block_workshop_shape_insert
// 世界観: 積み木工房の検品台で、職人が拍ごとに流れてくる型抜きの箱の穴に、合う形の木片を裏拍で差し込んでいく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・差し込んだ数・最大コンボ)
// スタイル: MODERN AD-GAME

(function(game) {
  var STYLE = { bg: ['#30c8ff', '#b8f0ff', '#ffe27a'], main: ['#ff3b5c', '#2f6bff', '#ffc400'], accent: ['#22c55e', '#1a1030'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い黒縁・大きいアイコン・飛ぶ数字。3秒で「穴に合う形を入れる」と分かる画面
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], sun: STYLE.bg[2],
    red: STYLE.main[0], blue: STYLE.main[1], yel: STYLE.main[2],
    green: STYLE.accent[0], ink: STYLE.accent[1],
    white: '#ffffff', wood: '#f2b56b', woodD: '#c47a32', woodL: '#ffd59a', hole: '#3a1a08',
    belt: '#4a4f66', beltL: '#6a7090', steel: '#d0d6e6', bad: '#ff2a2a', good: '#22d36a'
  };
  var SHAPE_COL = [C.red, C.blue, C.yel, C.green];

  var GAME_TITLE = 'BLOCK FIT';
  var BPM = 100;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.15, WIN_M = 0.3;
  var LIVES = 3;
  // 箱が検品台に着く拍(差し込むのはその裏 +0.5)
  var ARRIVE = [4, 6, 8, 10, 12, 13, 15, 16, 18, 20, 21, 22, 24, 26, 27, 28, 30];
  var SHUFFLE_AT = [11, 23];
  var SONG_END = 32;
  var DEMO_BOXES = [[2, 0], [4, 2], [6, 1]];
  var DEMO_FAIL_B = 6, DEMO_FAIL_S = 3;
  var DEMO_CYCLE = 8 * SPB + 1.3;

  var CONV_Y = 1010, SLOT = 290, BOX = 230;
  var PUSH_Y = 760;
  var TRAY_X = [170, 410, 670, 910], TRAY_Y = 1660;
  var LEAD = [0, 'E5', 0, 'G5', 'A5', 0, 'G5', 'E5', 0, 'D5', 0, 'E5', 'C5', 0, 0, 'G4'];
  var ROOTS = ['A2', 'F2', 'C3', 'G2'];
  var CHORDS = { A2: ['A3', 'C4', 'E4'], F2: ['A3', 'C4', 'F4'], C3: ['G3', 'C4', 'E4'], G2: ['G3', 'B3', 'D4'] };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, x: 540, y: 1850, press: false };

  // ── スプライト ─────────────────────────────────────────
  var MAKER_A = [
    '..oooooooo..',
    '.oBBBBBBBBo.',
    'oBBwBBBBBBBo',
    'osssssssssso',
    'osseessseeso',
    'osseessseeso',
    'osssssssssso',
    'osspssssspso',
    'osssmmmmssso',
    '.osssssssso.',
    '..oooooooo..',
    '...oGGGGo...'
  ];
  var MAKER_B = MAKER_A.slice();
  MAKER_B[4] = 'osssssssssso';
  MAKER_B[5] = 'ossoosssooso';
  var MAKER_JOY = MAKER_A.slice();
  MAKER_JOY[5] = 'osssssssssso';
  MAKER_JOY[8] = 'ossmmmmmmsso';
  var MAKER_OOPS = MAKER_A.slice();
  MAKER_OOPS[4] = 'osesssssseso';
  MAKER_OOPS[5] = 'ossessssesso';
  MAKER_OOPS[8] = 'osssskksssso';
  var MAKER_PAL = { o: '#1a1030', B: '#ff3b5c', w: '#ffffff', s: '#ffc8a0', e: '#1a1030', p: '#ff8aa0', m: '#c0203a', k: '#1a1030', G: '#2f6bff' };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    var a = align || 'center';
    game.draw.text(str, x + 5, y + 6, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x - 3, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x + 3, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: a });
  }
  function tri(cx, cy, sz, col, a) {
    var top = cy - sz * 0.5, h = sz;
    for (var y = 0; y < h; y += 4) {
      var hw = (y / h) * sz * 0.58;
      game.draw.rect(cx - hw, top + y, hw * 2, 4, col, a);
    }
  }
  // 形: 0=丸 1=四角 2=三角 3=十字。黒縁 o ピクセル分だけ大きく先に描く
  function shape(kind, cx, cy, sz, col, ol, a) {
    var al = a === undefined ? 1 : a;
    var pass = ol > 0 ? 2 : 1;
    for (var p = 0; p < pass; p++) {
      var s = p === 0 && ol > 0 ? sz + ol * 2 : sz;
      var cc = p === 0 && ol > 0 ? C.ink : col;
      if (kind === 0) game.draw.circle(cx, cy, s * 0.5, cc, al);
      else if (kind === 1) game.draw.rect(cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9, cc, al);
      else if (kind === 2) tri(cx, cy + (p === 0 && ol > 0 ? ol * 0.3 : 0), s * 1.05, cc, al);
      else {
        game.draw.rect(cx - s * 0.17, cy - s * 0.5, s * 0.34, s, cc, al);
        game.draw.rect(cx - s * 0.5, cy - s * 0.17, s, s * 0.34, cc, al);
      }
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
  function smooth(k) { return k * k * (3 - 2 * k); }
  // ベルトの位置(拍)。拍の頭までの0.3拍で1枠進み、残りは止まる
  function beltPos(bp) {
    var K = Math.floor(bp + 0.3);
    if (bp < K) return K - 1 + smooth((bp - K + 0.3) / 0.3);
    return K;
  }

  // ── 進行 ───────────────────────────────────────────────
  function buildBoxes(isDemo) {
    var list = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_BOXES.length; i++) list.push({ b: DEMO_BOXES[i][0], k: DEMO_BOXES[i][1] });
    } else {
      var p1 = -1, p2 = -1;
      for (i = 0; i < ARRIVE.length; i++) {
        var pool = i < 4 ? 3 : 4;
        var k = Math.floor(game.random(0, pool)) % pool;
        if (k === p1 && k === p2) k = (k + 1) % pool;
        p2 = p1; p1 = k;
        list.push({ b: ARRIVE[i], k: k });
      }
    }
    for (i = 0; i < list.length; i++) { list[i].st = 'wait'; list[i].t = 0; list[i].wood = i % 3; }
    return list;
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, boxes: buildBoxes(isDemo), bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, fitted: 0,
      order: [0, 1, 2, 3], from: [0, 1, 2, 3], shuf: 0, shake: 0,
      armed: -1, plunge: null, jam: null,
      stop: 0, stopBox: null, pulse: 0, offPulse: 0, oops: 0, joy: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD.length; i++) notes.push([LEAD[i] || 'R', 0.5]);
    for (var j = 0; j < 8; j++) bass.push([ROOTS[Math.floor(j / 4) % 4], 0.5], ['R', 0.5]);
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: bass, bassVolume: 0.08 });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 裏拍の伴奏: 表はベースとキック(ガコン)、裏に和音の刻みと手拍子
  function playStep(s) {
    var b = Math.floor(s / 2), half = s % 2;
    var bar = Math.floor(b / 4);
    var root = ROOTS[bar % 4];
    if (half === 0) {
      game.audio.tone(root, SPB * 0.4, { wave: 'triangle', volume: 0.15 });
      game.audio.tone(110, 0.08, { wave: 'sine', volume: 0.15, slide: -60 });
    } else {
      var ch = CHORDS[root];
      for (var i = 0; i < 3; i++) game.audio.tone(ch[i], SPB * 0.22, { wave: 'square', volume: 0.028 });
      game.audio.tone(1900, 0.05, { wave: 'square', volume: 0.04, slide: -1500 });
    }
    if (bar >= 1) {
      var m = LEAD[s % 16];
      if (m) game.audio.tone(m, SPB * 0.4, { wave: 'triangle', volume: 0.06 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    for (var i = 0; i < SHUFFLE_AT.length; i++) {
      if (b === SHUFFLE_AT[i] - 1) { R.shake = 1; if (!R.demo) game.audio.tone(300, 0.25, { wave: 'square', volume: 0.06, slide: 300 }); }
      if (b === SHUFFLE_AT[i]) shuffleTray();
    }
  }

  function shuffleTray() {
    var o = R.order.slice();
    // 全ての木片が別の場所へ動く並びにする
    var n = o.length, rot = 1 + (Math.floor(game.random(0, 3)) % 3);
    var next = [];
    for (var i = 0; i < n; i++) next.push(o[(i + rot) % n]);
    if (game.random(0, 1) < 0.5) { var tmp = next[0]; next[0] = next[3]; next[3] = tmp; }
    R.from = [];
    for (var s = 0; s < n; s++) R.from.push(o.indexOf(next[s]));
    R.order = next; R.shuf = 1;
    if (!R.demo) game.audio.play('se_powerup', 0.4);
  }

  function slotAt(x, y) {
    if (y < TRAY_Y - 220) return -1;
    for (var i = 0; i < 4; i++) if (Math.abs(x - TRAY_X[i]) < 120) return i;
    return -1;
  }

  // 押さえる: 木片を選んで差し込み棒の下へ
  function arm(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return -1;
    var sl = slotAt(x, y);
    if (sl < 0) return -1;
    R.armed = R.order[sl];
    return R.armed;
  }

  // 離す: 差し込み判定
  function insert() {
    if (!R || R.armed < 0) return 'none';
    var k = R.armed;
    R.armed = -1;
    if (R.over || R.stop > 0) return 'none';
    var best = null, bd = 99;
    for (var i = 0; i < R.boxes.length; i++) {
      var bx = R.boxes[i];
      if (bx.st !== 'wait') continue;
      var d = (R.bp - (bx.b + 0.5)) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = bx; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'idle';
    if (best.k !== k) { R.jam = { k: k }; missBox(best); return 'wrong'; }
    if (Math.abs(bd) > WIN_G) { R.jam = { k: k }; missBox(best); return 'off'; }
    best.st = 'fit'; best.t = 0;
    R.plunge = { k: k, t: 0 };
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    R.combo++; R.fitted++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var pts = grade === 'PERFECT' ? 100 + R.combo * 10 : 50 + R.combo * 5;
    R.score += pts;
    if (grade === 'PERFECT') { R.perfect++; R.joy = 0.6; } else R.good++;
    game.feedback.good(540, CONV_Y - 250, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, count: grade === 'PERFECT' ? 18 : 10 });
    game.fx.popup('+' + pts, 760, CONV_Y - 120, { color: C.white, size: 64 });
    game.fx.burst(540, CONV_Y, { color: SHAPE_COL[k], count: 14, speed: 420 });
    game.audio.tone(330 * Math.pow(2, Math.min(R.combo, 12) / 12), 0.07, { wave: 'square', volume: 0.07 });
    if (!R.demo && R.combo % 4 === 0) {
      game.fx.popup('x' + R.combo, W / 2, 560, { color: C.yel, size: 120 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missBox(bx) {
    bx.st = 'miss'; bx.t = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopBox = bx; R.oops = 1.2;
    game.audio.tone(100, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -40 });
  }

  function releaseStop() {
    R.stopBox = null; R.jam = null;
    game.feedback.bad(540, CONV_Y - 250, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    R.armed = -1;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.joy = 3;
      for (var i = 0; i < 4; i++) game.fx.burst(TRAY_X[i], TRAY_Y - 60, { color: SHAPE_COL[i], count: 22, speed: 560 });
      game.fx.burst(540, CONV_Y, { color: C.white, count: 30, speed: 640 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 640, { color: C.yel, size: 84 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.offPulse = Math.max(0, R.offPulse - dt * 3.5);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    R.shuf = Math.max(0, R.shuf - dt * 3);
    R.shake = Math.max(0, R.shake - dt * 1.4);
    if (R.plunge) { R.plunge.t += dt; if (R.plunge.t > 0.2) R.plunge = null; }
    for (var q = 0; q < R.boxes.length; q++) if (R.boxes[q].st !== 'wait') R.boxes[q].t += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) {
      R.stepIdx++;
      if (R.stepIdx % 2 === 1) R.offPulse = 1;
      if (!R.demo) playStep(R.stepIdx);
    }
    for (var i = 0; i < R.boxes.length; i++) {
      var bx = R.boxes[i];
      if (bx.st === 'wait' && (R.bp - (bx.b + 0.5)) * SPB > WIN_G && R.armed < 0) { missBox(bx); return; }
      if (bx.st === 'wait' && (R.bp - (bx.b + 0.5)) * SPB > WIN_M) { missBox(bx); return; }
    }
    if (!R.demo && R.bp >= SONG_END) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで遊ぶ(丸・三角は表で押さえて裏で離し、3箱目の四角に十字を差してMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; }
    var nx = null;
    for (var i = 0; i < R.boxes.length; i++) if (R.boxes[i].st === 'wait') { nx = R.boxes[i]; break; }
    var tx = W / 2, ty = 1860;
    if (nx && R.stop <= 0) {
      var k = nx.b === DEMO_FAIL_B ? DEMO_FAIL_S : nx.k;
      var sl = R.order.indexOf(k);
      if (R.bp >= nx.b - 0.9) { tx = TRAY_X[sl]; ty = TRAY_Y + 20; }
      if (R.armed < 0 && R.bp >= nx.b - 0.2 && Math.abs(demo.x - tx) < 40) arm(TRAY_X[sl], TRAY_Y);
      if (R.armed >= 0 && R.bp >= nx.b + 0.5) insert();
    } else if (R.stop > 0) { tx = demo.x; ty = demo.y; }
    demo.x += (tx - demo.x) * Math.min(1, dt * 10);
    demo.y += (ty - demo.y) * Math.min(1, dt * 10);
    demo.press = R.armed >= 0;
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.55, C.sky1], [1, C.sun]]);
    // 放射の光(ゆっくり回る)
    var cx = 540, cy = 760;
    for (var i = 0; i < 14; i++) {
      var a = e * 0.15 + i * Math.PI / 7;
      game.draw.line(cx, cy, cx + Math.cos(a) * 1500, cy + Math.sin(a) * 1500, C.white, 70);
    }
    game.draw.rect(0, 0, W, H, C.sky0, 0.55);
    // 棚の積み木(遠景)
    for (var j = 0; j < 9; j++) shape(j % 4, 60 + j * 120, 470 + (j % 2) * 20, 56, SHAPE_COL[j % 4], 5, 0.35);
  }

  function drawBeatBar() {
    var y = 330;
    var b0 = Math.max(0, R.bp);
    var bar = Math.floor(b0 / 4);
    var cur = R.ready > 0 ? -1 : Math.floor(b0 * 2) % 8;
    game.draw.rect(50, y - 74, W - 100, 148, C.ink);
    game.draw.rect(58, y - 66, W - 116, 132, C.white);
    for (var i = 0; i < 8; i++) {
      var x = 130 + i * 117, lit = i === cur;
      if (i % 2 === 0) {
        game.draw.rect(x - 22, y - 22, 44, 44, C.ink);
        game.draw.rect(x - 16, y - 16, 32, 32, lit ? C.blue : C.steel);
      } else {
        var due = false;
        for (var k = 0; k < R.boxes.length; k++) if (R.boxes[k].b + 0.5 === bar * 4 + i / 2 && R.boxes[k].st !== 'miss') due = true;
        game.draw.circle(x, y, lit ? 46 : 38, C.ink);
        game.draw.circle(x, y, lit ? 38 : 30, lit ? C.yel : (due ? '#ffe9a0' : C.steel));
        if (due) ring(x, y, 52, C.red, 6);
      }
    }
  }

  function drawMaker() {
    var e = game.time.elapsed;
    var frame = R.oops > 0 ? MAKER_OOPS : (R.joy > 0 ? MAKER_JOY : (Math.floor(e * 1.3) % 5 === 0 ? MAKER_B : MAKER_A));
    var bob = -R.pulse * 12 + Math.sin(e * 2.6) * 4;
    game.draw.circle(170, 640, 130, C.white, 0.35);
    game.draw.sprite(frame, MAKER_PAL, 170, 620 + bob, 17, { anchor: 'center' });
    // 職人の手(拍の裏で上がる)
    var hy = 740 - R.offPulse * 30;
    game.draw.circle(300, hy, 34, C.ink);
    game.draw.circle(300, hy, 26, '#ffc8a0');
  }

  function drawPusher() {
    var e = game.time.elapsed;
    var plungeK = R.plunge ? Math.min(1, R.plunge.t / 0.1) : 0;
    var rodBot = PUSH_Y - 60 + plungeK * (CONV_Y - PUSH_Y - 40);
    game.draw.rect(500, 460, 80, 40, C.ink);
    game.draw.rect(522, 490, 36, rodBot - 490, C.ink);
    game.draw.rect(528, 490, 24, rodBot - 490, C.steel);
    game.draw.rect(470, rodBot - 10, 140, 34, C.ink);
    game.draw.rect(478, rodBot - 4, 124, 22, C.steel);
    if (R.armed >= 0) {
      var bob = Math.sin(e * 10) * 6;
      shape(R.armed, 540, PUSH_Y + 60 + bob, 150, SHAPE_COL[R.armed], 9);
    }
    if (R.plunge) {
      var py = PUSH_Y + 60 + (CONV_Y - PUSH_Y - 60) * plungeK;
      shape(R.plunge.k, 540, py, 150 - plungeK * 20, SHAPE_COL[R.plunge.k], 9, 1 - Math.max(0, R.plunge.t - 0.1) / 0.1);
    }
    if (R.jam) {
      var jx = 540 + (Math.floor(e * 30) % 2 ? 8 : -8);
      shape(R.jam.k, jx, CONV_Y - 150, 150, SHAPE_COL[R.jam.k], 9);
      game.draw.line(440, CONV_Y - 250, 640, CONV_Y - 50, C.bad, 16);
      game.draw.line(640, CONV_Y - 250, 440, CONV_Y - 50, C.bad, 16);
    }
  }

  function drawBox(bx, x, y, sc) {
    var e = game.time.elapsed;
    var stopHere = R.stopBox === bx;
    var s = BOX * sc * (stopHere ? 1.15 : 1);
    var fl = stopHere && Math.floor(e * 20) % 2 === 0;
    game.draw.rect(x - s / 2 + 10, y - s / 2 + 14, s, s, C.ink, 0.35);
    game.draw.rect(x - s / 2 - 8, y - s / 2 - 8, s + 16, s + 16, C.ink);
    game.draw.rect(x - s / 2, y - s / 2, s, s, fl ? C.white : [C.wood, C.woodL, '#f7c98a'][bx.wood]);
    game.draw.rect(x - s / 2, y + s / 2 - 26 * sc, s, 26 * sc, C.woodD, fl ? 0 : 1);
    game.draw.rect(x - s / 2 + 12, y - s / 2 + 10, s - 24, 10, C.white, fl ? 0 : 0.5);
    if (bx.st === 'fit') shape(bx.k, x, y - 6, s * 0.52, SHAPE_COL[bx.k], 7);
    else {
      shape(bx.k, x, y - 6, s * 0.56, C.hole, 0);
      shape(bx.k, x, y - 6 + 6, s * 0.46, '#5a2a10', 0);
    }
    if (bx.st === 'miss' && !stopHere) {
      game.draw.line(x - s * 0.3, y - s * 0.3, x + s * 0.3, y + s * 0.3, C.bad, 14);
      game.draw.line(x + s * 0.3, y - s * 0.3, x - s * 0.3, y + s * 0.3, C.bad, 14);
    }
  }

  function drawConveyor() {
    var e = game.time.elapsed;
    var bpos = beltPos(R.bp);
    // 台
    game.draw.rect(0, CONV_Y + 120, W, 70, C.ink);
    game.draw.rect(0, CONV_Y + 128, W, 54, C.belt);
    var off = (bpos * SLOT) % 60;
    for (var x = -off; x < W + 60; x += 60) game.draw.rect(x, CONV_Y + 134, 30, 42, C.beltL);
    for (var w = 0; w < 8; w++) {
      var wx = 70 + w * 135;
      game.draw.circle(wx, CONV_Y + 220, 30, C.ink);
      game.draw.circle(wx, CONV_Y + 220, 20, C.steel);
      var a = -bpos * 2 + w;
      game.draw.line(wx, CONV_Y + 220, wx + Math.cos(a) * 18, CONV_Y + 220 + Math.sin(a) * 18, C.ink, 6);
    }
    // 検品枠
    var pl = 0.5 + R.pulse * 0.5;
    game.draw.rect(540 - BOX / 2 - 34, CONV_Y - BOX / 2 - 34, 22, BOX + 68, C.ink);
    game.draw.rect(540 + BOX / 2 + 12, CONV_Y - BOX / 2 - 34, 22, BOX + 68, C.ink);
    game.draw.rect(540 - BOX / 2 - 28, CONV_Y - BOX / 2 - 28, 10, BOX + 56, C.yel, pl);
    game.draw.rect(540 + BOX / 2 + 18, CONV_Y - BOX / 2 - 28, 10, BOX + 56, C.yel, pl);
    // 箱
    for (var i = 0; i < R.boxes.length; i++) {
      var bx = R.boxes[i];
      var px = 540 + (bx.b - bpos) * SLOT;
      if (R.stopBox === bx) px = 540;
      if (px < -200 || px > W + 200) continue;
      drawBox(bx, px, CONV_Y, 1);
    }
    // 裏拍への縮む輪
    if (R.stop <= 0 && R.ready <= 0 && !R.over) {
      for (var j = 0; j < R.boxes.length; j++) {
        var b2 = R.boxes[j];
        if (b2.st !== 'wait') continue;
        var u = b2.b + 0.5 - R.bp;
        if (u <= 1.2 && u > -0.3) ring(540, CONV_Y - 6, 70 + Math.max(0, u) * 220, Math.floor(e * 10) % 2 ? C.yel : C.white, 12);
        break;
      }
    }
  }

  function drawTray() {
    var e = game.time.elapsed;
    var shake = R.shake > 0 ? Math.sin(e * 60) * 10 * R.shake : 0;
    game.draw.rect(30 + shake, TRAY_Y - 170, W - 60, 340, C.ink);
    game.draw.rect(40 + shake, TRAY_Y - 160, W - 80, 320, C.woodD);
    game.draw.rect(40 + shake, TRAY_Y - 160, W - 80, 18, C.woodL, 0.6);
    for (var i = 0; i < 4; i++) {
      var k = R.order[i];
      var fx = TRAY_X[R.from[i]];
      var x = fx + (TRAY_X[i] - fx) * (1 - R.shuf) + shake;
      var lift = R.shuf > 0 ? -Math.sin((1 - R.shuf) * Math.PI) * 80 : 0;
      game.draw.rect(TRAY_X[i] - 108 + shake, TRAY_Y - 108, 216, 216, C.hole, 0.5);
      if (R.armed === k) {
        shape(k, x, TRAY_Y + lift, 150, SHAPE_COL[k], 9, 0.25);
        continue;
      }
      var bob = Math.sin(e * 3 + i) * 5;
      shape(k, x, TRAY_Y + lift + bob, 150, SHAPE_COL[k], 9);
      game.draw.rect(x - 40, TRAY_Y + lift + bob - 50, 26, 12, C.white, 0.6);
    }
  }

  function drawWorld() {
    drawBg();
    drawBeatBar();
    drawMaker();
    drawConveyor();
    drawPusher();
    drawTray();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 240, C.ink, 0.9);
    txt('SCORE ' + R.score, 40, 66, 48, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 66, 36, C.yel, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      shape(i % 4, W - 80 - i * 86, 156, 54, on ? SHAPE_COL[i] : '#5a5470', 5);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 156, 60, C.yel, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(40, 212, W - 80, 18, '#3a3450');
    game.draw.rect(40, 212, (W - 80) * progress, 18, C.green);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 860, 130, C.yel);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.33, C.ink, 0.9);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 104, R.ok ? C.good : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 66, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 36, C.yel);
    txt(R.fitted + '/' + ARRIVE.length + '   x' + R.maxCombo, W / 2, H * 0.45, 42, C.yel);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 56, C.yel);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 44, C.white);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.boxes.length; i++) if (R.boxes[i].st === 'wait') left++;
      txt('あと' + left + '個', W / 2, H * 0.545, 50, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 2.2) * 8;
    var sc = 1 + Math.max(0, Math.sin(e * 4)) * 0.04;
    game.draw.rect(0, 0, W, 240, C.ink, 0.9);
    txt(GAME_TITLE, W / 2, 100 + bob, 128 * sc, C.yel);
    txt('BEST ' + game.best, W / 2, 205, 42, C.white);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 50, C.yel);
    else txt('INSERT COIN', W / 2, H * 0.965, 42, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var k = arm(x, y);
    if (k >= 0) {
      game.audio.tone([523, 587, 659, 784][k], 0.06, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(x, y, { color: SHAPE_COL[k], count: 5, speed: 160 });
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || R.armed < 0) return;
    var res = insert();
    if (res === 'idle' || res === 'none') {
      game.audio.tone(220, 0.06, { wave: 'triangle', volume: 0.07, slide: -60 });
      game.fx.burst(540, PUSH_Y + 60, { color: C.steel, count: 5, speed: 140 });
    } else if (res === 'PERFECT') {
      game.audio.tone('E7', 0.05, { wave: 'square', volume: 0.05 });
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 42, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, fitted: R.fitted, maxCombo: R.maxCombo };
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
