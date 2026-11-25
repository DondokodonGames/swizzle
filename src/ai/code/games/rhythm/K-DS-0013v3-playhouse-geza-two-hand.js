// K-DS-0013v3-playhouse-geza-two-hand.js
// 芝居小屋の下座囃子 — 左手で跳ねる笛の節に合わせて鉦を刻み、右手で拍の頭ごとに太鼓を打って、一人で舞台の見得を支える
// 操作: 画面の左半分=鉦、右半分=太鼓(押した瞬間で判定)。左右2本の道を札が上から降りてきて、下の判定線に重なる時に押す。左の道(金の鉦札)は笛の跳ねる8分(拍の2/3あと、長短の跳ね)、右の道(赤の太鼓札)は拍の頭。道の横線は太い線=拍の頭、細い線=跳ねの位置。逆の手・拍外れ・打ち損じはMISS(札の無い時の空打ちは罰なし)。最後の見得の拍は両手同時
// 終わり: 前奏1小節+5小節(100BPM・約14秒・31打)を打ち切ればCLEAR。MISS3回でGAME OVER
// @mechanic: coop_2zone
// @theme: playhouse_geza_two_hand
// 世界観: 地方の芝居小屋の下座で、囃子方が一人で鉦と太鼓を兼ね、跳ねる笛に合わせて左手で鉦を、右手で拍の頭の太鼓を打って舞台の役者の見得を支える
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・鉦と太鼓それぞれの成功数・最大コンボ)
// スタイル: 8bit HOME

(function(game) {
  var STYLE = { bg: ['#000000', '#503000'], main: ['#a81000', '#f8b800', '#fcfcfc'], accent: ['#00a800', '#0058f8'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 赤・金・白+黒(差し色に緑)。16px角の粗いドット、床と客席はタイル反復、札は上から下への1方向スクロール
  var C = {
    blk: STYLE.bg[0], brown: STYLE.bg[1],
    red: STYLE.main[0], gold: STYLE.main[1], cream: STYLE.main[2],
    green: STYLE.accent[0], blue: STYLE.accent[1],
    wood: '#ac7c00', skin: '#fca044', grey: '#7c7c7c'
  };

  var GAME_TITLE = 'GEZA DUO';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SW = 2 / 3;               // 跳ねる8分の位置(拍の2/3あと)
  var WIN_P = 0.06, WIN_G = 0.13, WIN_M = 0.22;
  var LIVES = 3;
  // 譜面: R=太鼓(拍の頭) / L=鉦(跳ねの裏)。最後の23拍は両手同時の見得
  var CHART_R = [4, 5, 6, 7, 8, 10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  var CHART_L = [8, 9, 10, 11, 12, 14, 16, 17, 18, 20, 21, 22];
  var SONG_END = 24;
  var DEMO_R = [1, 2, 3, 4, 5, 6, 7];
  var DEMO_L = [1, 2, 4, 6];
  var DEMO_FAIL_B = 4 + SW;     // ゴーストがここで逆の手(太鼓)を打ってMISSする
  var DEMO_END = 8;
  var DEMO_CYCLE = DEMO_END * SPB + 1.3;

  var LANE = { L: 290, R: 790 };
  var LANE_W = 330;
  var TOP_Y = 800, JUDGE_Y = 1460;
  var PXB = 330;                // 1拍あたりの落下距離
  var BTN = { L: { x: 270, y: 1690 }, R: { x: 810, y: 1690 } };
  var MAN = { x: 540, y: 1690 };

  // 伴奏(自作): 3連の格子で跳ねる笛、1・3拍の三味線風ベース、2・4拍の拍子木
  var ROOTS = ['G2', 'C3', 'D3', 'G2'];
  var FLUTE = [
    ['G5', 0, 'A5', 'B5', 0, 'A5', 'G5', 0, 'E5', 'D5', 0, 'E5'],
    ['E5', 0, 'G5', 'A5', 0, 'G5', 'E5', 0, 'D5', 'G5', 0, 'A5']
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, ev: [], ei: 0, pl: 0, pr: 0 };

  // ── スプライト ─────────────────────────────────────────
  var ACTOR_A = [
    '...kkkkkk...',
    '..kkkkkkkk..',
    '..kccccccck.',
    '..crcrrcrc..',
    '..cccccccc..',
    '...ccrrcc...',
    '.gggggggggg.',
    'gggrgggrgggg',
    'cgggggggggc.',
    '..gggggggg..',
    '..ggg..ggg..',
    '..kk....kk..'
  ];
  var ACTOR_B = ACTOR_A.slice();
  ACTOR_B[6] = 'cgggggggggg.';
  ACTOR_B[8] = '.ggggggggggc';
  ACTOR_B[11] = '.kk......kk.';
  var ACTOR_MIE = ACTOR_A.slice();
  ACTOR_MIE[3] = '..crrcrrcrc.';
  ACTOR_MIE[6] = 'cggggggggggc';
  ACTOR_MIE[7] = '.ggrgggrggg.';
  ACTOR_MIE[8] = '..gggggggg..';
  ACTOR_MIE[11] = 'kk........kk';
  var ACTOR_OOPS = ACTOR_A.slice();
  ACTOR_OOPS[3] = '..ckcckcc...';
  ACTOR_OOPS[5] = '....crrc....';
  var ACTOR_PAL = { k: C.blk, c: C.cream, r: C.red, g: C.green };

  var MAN_A = [
    '....kkkk....',
    '...kkkkkk...',
    '...ssssss...',
    '...sksksk...',
    '...ssssss...',
    '....ssss....',
    '.bbbbbbbbbb.',
    'sbbbbbbbbbbs',
    's.bbbbbbbb.s',
    '..bbbbbbbb..',
    '.bbbbbbbbbb.',
    'bbbbbbbbbbbb'
  ];
  var MAN_L = MAN_A.slice();
  MAN_L[7] = '.bbbbbbbbbbs';
  MAN_L[8] = 'sbbbbbbbbb.s';
  var MAN_R = MAN_A.slice();
  MAN_R[7] = 'sbbbbbbbbbb.';
  MAN_R[8] = 's.bbbbbbbbbs';
  var MAN_PAL = { k: C.blk, s: C.skin, b: C.blue };

  var KANE = [
    '...kkkk...',
    '.kkggggkk.',
    '.kgggggggk',
    'kggcggggk.',
    'kgggggggk.',
    'kgggggggk.',
    'kgggggggk.',
    '.kgggggk..',
    '..kkkkk...'
  ];
  var KANE_PAL = { k: C.blk, g: C.gold, c: C.cream };
  var DRUM = [
    '..kkkkkk..',
    '.kcccccck.',
    'kcccccccck',
    'krrrrrrrrk',
    'krgrrrrgrk',
    'krrrrrrrrk',
    'krgrrrrgrk',
    'krrrrrrrrk',
    '.kkkkkkkk.'
  ];
  var DRUM_PAL = { k: C.blk, c: C.cream, r: C.red, g: C.gold };

  // ── 小道具 ─────────────────────────────────────────────
  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.blk, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var notes = [], i;
    var cr = isDemo ? DEMO_R : CHART_R, cl = isDemo ? DEMO_L : CHART_L;
    for (i = 0; i < cr.length; i++) notes.push({ b: cr[i], lane: 'R' });
    for (i = 0; i < cl.length; i++) notes.push({ b: cl[i] + SW, lane: 'L' });
    if (!isDemo) notes.push({ b: 23, lane: 'L', mie: true });
    notes.sort(function(a, b) { return a.b - b.b; });
    for (i = 0; i < notes.length; i++) { notes[i].st = 'wait'; notes[i].fx = 0; }
    return {
      demo: isDemo, notes: notes, end: isDemo ? DEMO_END : SONG_END,
      bp: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, okL: 0, okR: 0,
      stop: 0, stopNote: null, pulse: 0, litL: 0, litR: 0, oops: 0, joy: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var bar = 0; bar < 2; bar++) {
      for (var k = 0; k < 4; k++) {
        var a = FLUTE[bar][k * 3], b = FLUTE[bar][k * 3 + 2];
        notes.push([a || 'R', SW]);
        notes.push([b || 'R', 1 - SW]);
      }
    }
    for (var j = 0; j < 4; j++) { bass.push([ROOTS[j], 1]); bass.push(['R', 1]); }
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.04, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 3連の格子(1拍=3ステップ)で伴奏を刻む
  function playStep(s) {
    var pos = s % 12, bar = Math.floor(s / 12);
    var root = ROOTS[bar % 4];
    if (pos === 0 || pos === 6) game.audio.tone(root, SPB * 0.8, { wave: 'triangle', volume: 0.15 });
    if (pos === 3 || pos === 9) game.audio.tone(2200, 0.03, { wave: 'square', volume: 0.05, slide: -1200 });
    if (pos % 3 === 2) game.audio.tone(4000, 0.015, { wave: 'square', volume: 0.015 });
    var f = FLUTE[bar % 2][pos];
    if (f) game.audio.tone(f, (pos % 3 === 0 ? SW : 1 - SW) * SPB * 0.85, { wave: 'square', volume: pos % 3 === 2 ? 0.055 : 0.035 });
  }

  function soundOf(lane, v) {
    if (lane === 'L') {
      game.audio.tone(1800, 0.05, { wave: 'square', volume: v });
      game.audio.tone(2700, 0.09, { wave: 'square', volume: v * 0.5 });
    } else {
      game.audio.tone(110, 0.16, { wave: 'sine', volume: v * 2.4, slide: -50 });
    }
  }

  function nearest(lane) {
    var best = null, bd = 99;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st !== 'wait' || n.lane !== lane) continue;
      var d = (R.bp - n.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = n; }
    }
    return { n: best, d: bd };
  }

  // 片手の一打(押した瞬間で判定)
  function strike(lane) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    if (lane === 'L') R.litL = 0.12; else R.litR = 0.12;
    var own = nearest(lane);
    if (own.n && Math.abs(own.d) <= WIN_G) {
      var n = own.n;
      n.st = 'ok'; n.fx = 0;
      var grade = Math.abs(own.d) <= WIN_P ? 'PERFECT' : 'GOOD';
      R.combo++;
      if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      if (lane === 'L') R.okL++; else R.okR++;
      if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 8; }
      else { R.good++; R.score += 50 + R.combo * 4; }
      soundOf(lane, 0.07);
      game.feedback.good(LANE[lane], JUDGE_Y - 90, { text: grade, color: grade === 'PERFECT' ? C.gold : C.cream, count: grade === 'PERFECT' ? 14 : 8, sound: 'se_tap', volume: 0.2 });
      if (n.mie) { R.joy = 2; game.fx.burst(540, 500, { color: C.gold, count: 26, speed: 520 }); }
      if (!R.demo && R.combo % 8 === 0) {
        game.fx.popup('x' + R.combo, 540, 560, { color: C.gold, size: 96 });
        game.audio.play('se_milestone', 0.5);
      }
      return grade;
    }
    var other = nearest(lane === 'L' ? 'R' : 'L');
    if (other.n && Math.abs(other.d) <= WIN_G) { soundOf(lane, 0.05); missNote(other.n); return 'miss'; }
    if (own.n && Math.abs(own.d) <= WIN_M) { soundOf(lane, 0.05); missNote(own.n); return 'miss'; }
    soundOf(lane, 0.03);
    return 'air';
  }

  function missNote(n) {
    n.st = 'miss'; n.fx = 0;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopNote = n; R.oops = 1.2;
    game.audio.tone(98, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -30 });
  }

  function releaseStop() {
    var n = R.stopNote;
    R.stopNote = null;
    game.feedback.bad(LANE[n.lane], JUDGE_Y - 90, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.joy = 3;
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, 420 + (i % 2) * 220, { color: [C.gold, C.red, C.cream, C.green, C.gold][i], count: 22, speed: 540 });
      game.fx.flash(C.gold, 0.2);
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.gold, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.litL = Math.max(0, R.litL - dt);
    R.litR = Math.max(0, R.litR - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    for (var q = 0; q < R.notes.length; q++) if (R.notes[q].st !== 'wait' && R.notes[q] !== R.stopNote) R.notes[q].fx += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('G5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.bp += dt / SPB;
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 3 + 1e-6);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st === 'wait' && (R.bp - n.b) * SPB > WIN_G) { missNote(n); return; }
    }
    if (!R.demo && R.bp >= R.end + 0.3) endRun(true);
  }

  // ATTRACT: 2つのゴーストハンドが実ロジックで打つ(右手で拍の頭、左手で跳ねの裏。1度だけ鉦の札で太鼓を打ってMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true);
      demo.ev = []; demo.ei = 0;
      for (var i = 0; i < R.notes.length; i++) {
        var n = R.notes[i];
        var lane = Math.abs(n.b - DEMO_FAIL_B) < 0.01 ? 'R' : n.lane;
        demo.ev.push({ b: n.b, lane: lane });
      }
    }
    demo.pl = Math.max(0, demo.pl - dt);
    demo.pr = Math.max(0, demo.pr - dt);
    if (R.stop > 0) return;
    while (demo.ei < demo.ev.length && R.bp >= demo.ev[demo.ei].b) {
      var ev = demo.ev[demo.ei++];
      strike(ev.lane);
      if (ev.lane === 'L') demo.pl = 0.12; else demo.pr = 0.12;
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawStage() {
    var e = game.time.elapsed;
    // 背景: 金茶の市松タイル
    game.draw.gradient(0, H, [[0, C.brown], [1, C.blk]]);
    for (var ty = 240; ty < 700; ty += 64) {
      for (var tx = 0; tx < W; tx += 64) game.draw.rect(tx, ty, 64, 64, ((tx + ty) / 64) % 2 ? C.wood : C.brown);
    }
    // 舞台の額縁と引き幕(黒・柿・緑の縦縞)
    game.draw.rect(0, 232, W, 32, C.red);
    for (var s = 0; s < 6; s++) {
      var col = [C.blk, C.red, C.green][s % 3];
      game.draw.rect(s * 32, 264, 32, 480, col);
      game.draw.rect(W - 192 + s * 32, 264, 32, 480, col);
    }
    // 床板
    game.draw.rect(192, 640, W - 384, 104, C.wood);
    for (var fx = 192; fx < W - 192; fx += 64) game.draw.rect(fx, 640, 8, 104, C.brown);
    // 役者
    var frame = R.oops > 0 ? ACTOR_OOPS : (R.joy > 0 ? ACTOR_MIE : (Math.floor(Math.max(0, R.bp)) % 2 === 0 ? ACTOR_A : ACTOR_B));
    var bob = R.oops > 0 ? snap(Math.sin(e * 30) * 8) : -snap(R.pulse * 16);
    game.draw.sprite(frame, ACTOR_PAL, 540, 560 + bob, 16, { anchor: 'center' });
    // 客席の頭(タイル反復、拍で揺れる)
    for (var hx = 32; hx < W; hx += 64) game.draw.rect(hx - 24, 744 + ((hx / 64) % 2 ? -snap(R.pulse * 8) : 0), 48, 40, C.blk);
    game.draw.rect(0, 784, W, 8, C.red);
  }

  function noteY(b) { return JUDGE_Y - (b - R.bp) * PXB; }

  function drawLanes() {
    var e = game.time.elapsed;
    for (var k in LANE) {
      var x = LANE[k];
      var lit = k === 'L' ? R.litL : R.litR;
      game.draw.rect(x - LANE_W / 2, TOP_Y, LANE_W, JUDGE_Y - TOP_Y + 24, C.blk, 0.85);
      if (lit > 0) game.draw.rect(x - LANE_W / 2, TOP_Y, LANE_W, JUDGE_Y - TOP_Y + 24, k === 'L' ? C.gold : C.red, 0.25);
      game.draw.rect(x - LANE_W / 2 - 8, TOP_Y, 8, JUDGE_Y - TOP_Y + 24, k === 'L' ? C.gold : C.red);
      game.draw.rect(x + LANE_W / 2, TOP_Y, 8, JUDGE_Y - TOP_Y + 24, k === 'L' ? C.gold : C.red);
    }
    // 跳ねの格子: 太い線=拍の頭、細い線=2/3の跳ね
    var b0 = Math.floor(R.bp) - 1;
    for (var b = b0; b < b0 + 4; b++) {
      var y1 = snap(noteY(b)), y2 = snap(noteY(b + SW));
      for (var kk in LANE) {
        var lx = LANE[kk] - LANE_W / 2;
        if (y1 >= TOP_Y && y1 <= JUDGE_Y + 16) game.draw.rect(lx, y1 - 4, LANE_W, 8, C.cream, 0.6);
        if (y2 >= TOP_Y && y2 <= JUDGE_Y + 16) game.draw.rect(lx + 40, y2 - 2, LANE_W - 80, 4, C.gold, 0.5);
      }
    }
    // 判定線
    game.draw.rect(LANE.L - LANE_W / 2, JUDGE_Y - 8, LANE_W, 16, C.gold, 0.6 + R.pulse * 0.4);
    game.draw.rect(LANE.R - LANE_W / 2, JUDGE_Y - 8, LANE_W, 16, C.red, 0.6 + R.pulse * 0.4);
    // 札
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st === 'ok' && n.fx > 0.2) continue;
      if (n.st === 'miss' && n !== R.stopNote && n.fx > 0.3) continue;
      var y = n.st === 'ok' ? JUDGE_Y : noteY(n.b);
      if (y < TOP_Y - 40 || y > JUDGE_Y + 140) continue;
      var hl = n === R.stopNote;
      var fl = hl && Math.floor(e * 20) % 2 === 0;
      var px = hl ? 14 : (n.st === 'ok' ? 10 + n.fx * 30 : 10);
      var pal = n.lane === 'L' ? KANE_PAL : DRUM_PAL;
      if (fl) pal = { k: C.cream, g: C.cream, c: C.cream, r: C.cream };
      game.draw.sprite(n.lane === 'L' ? KANE : DRUM, pal, LANE[n.lane], snap(y), px, { anchor: 'center', alpha: n.st === 'ok' ? Math.max(0, 1 - n.fx / 0.2) : 1 });
      if (n.mie && n.st === 'wait') game.draw.rect(LANE.L, snap(y) - 4, LANE.R - LANE.L, 8, C.gold, 0.8);
    }
    game.draw.rect(0, TOP_Y - 16, W, 16, C.red);
  }

  function drawBooth() {
    var e = game.time.elapsed;
    game.draw.rect(0, JUDGE_Y + 40, W, H - JUDGE_Y - 40, C.brown);
    for (var y = JUDGE_Y + 56; y < H; y += 48) game.draw.rect(0, y, W, 8, C.blk, 0.5);
    var pl = state === S.ATTRACT ? demo.pl : R.litL, pr = state === S.ATTRACT ? demo.pr : R.litR;
    // 鉦(左)と太鼓(右)
    game.draw.rect(BTN.L.x - 150, BTN.L.y - 150, 300, 300, C.blk, 0.6);
    game.draw.rect(BTN.R.x - 150, BTN.R.y - 150, 300, 300, C.blk, 0.6);
    game.draw.sprite(KANE, KANE_PAL, BTN.L.x, BTN.L.y + (pl > 0 ? 8 : 0), pl > 0 ? 26 : 24, { anchor: 'center' });
    game.draw.sprite(DRUM, DRUM_PAL, BTN.R.x, BTN.R.y + (pr > 0 ? 8 : 0), pr > 0 ? 26 : 24, { anchor: 'center' });
    if (pl > 0) game.draw.rect(BTN.L.x - 150, BTN.L.y - 150, 300, 300, C.gold, 0.25);
    if (pr > 0) game.draw.rect(BTN.R.x - 150, BTN.R.y - 150, 300, 300, C.red, 0.25);
    // 囃子方(両手で兼ねる)
    var frame = pl > 0 ? MAN_L : (pr > 0 ? MAN_R : MAN_A);
    game.draw.sprite(frame, MAN_PAL, MAN.x, MAN.y - snap(R.pulse * 8) + snap(Math.sin(e * 2.5) * 4), 14, { anchor: 'center' });
    game.draw.line(MAN.x - 70, MAN.y - 20, BTN.L.x + 70, BTN.L.y - 60, C.wood, pl > 0 ? 16 : 10);
    game.draw.line(MAN.x + 70, MAN.y - 20, BTN.R.x - 70, BTN.R.y - 60, C.wood, pr > 0 ? 16 : 10);
  }

  function drawWorld() {
    drawStage();
    drawLanes();
    drawBooth();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.blk, 0.14);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.blk);
    txt('SCORE ' + R.score, 40, 74, 46, C.cream, 'left');
    txt('BEST ' + game.best, W - 40, 74, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.rect(W - 112 - i * 80, 120, 48, 64, on ? C.red : C.grey);
      game.draw.rect(W - 112 - i * 80, 136, 48, 8, C.blk);
      game.draw.rect(W - 104 - i * 80, 112, 32, 8, C.blk);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 150, 52, C.gold, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / R.end));
    game.draw.rect(40, 206, W - 80, 16, C.brown);
    game.draw.rect(40, 206, snap((W - 80) * progress), 16, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 1100, 120, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.25, W, H * 0.33, C.blk, 0.9);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, R.ok ? C.gold : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, C.cream);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.42, 34, C.gold);
    var totL = 0, totR = 0;
    for (var i = 0; i < R.notes.length; i++) { if (R.notes[i].lane === 'L') totL++; else totR++; }
    game.draw.sprite(KANE, KANE_PAL, W / 2 - 300, H * 0.457, 8, { anchor: 'center' });
    txt(R.okL + '/' + totL, W / 2 - 170, H * 0.465, 40, C.gold);
    game.draw.sprite(DRUM, DRUM_PAL, W / 2 + 60, H * 0.457, 8, { anchor: 'center' });
    txt(R.okR + '/' + totR, W / 2 + 190, H * 0.465, 40, C.red);
    txt('x' + R.maxCombo, W / 2, H * 0.51, 44, C.cream);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.55, 54, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.55, 42, C.cream);
    if (!R.ok) {
      var left = 0;
      for (var k = 0; k < R.notes.length; k++) if (R.notes[k].st === 'wait') left++;
      txt('あと' + left + '打', W / 2, H * 0.58, 46, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 8;
    game.draw.rect(0, 0, W, 232, C.blk);
    game.draw.text(GAME_TITLE, W / 2 + 8, 108 + bob, { size: 116, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 100 + bob, { size: 116, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 200, 40, C.cream);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cream);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || !R || R.over) return;
    var lane = x < W / 2 ? 'L' : 'R';
    var res = strike(lane);
    if (res === 'air') game.fx.burst(BTN[lane].x, BTN[lane].y, { color: lane === 'L' ? C.gold : C.red, count: 4, speed: 120 });
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(BTN.L.x, BTN.L.y - 40 + (demo.pl > 0 ? 24 : 0), { press: demo.pl > 0, scale: 14 });
      game.draw.hand(BTN.R.x, BTN.R.y - 40 + (demo.pr > 0 ? 24 : 0), { press: demo.pr > 0, scale: 14 });
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, kane: R.okL, taiko: R.okR, maxCombo: R.maxCombo };
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
