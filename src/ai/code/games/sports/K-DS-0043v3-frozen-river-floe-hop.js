// K-DS-0043v3-frozen-river-floe-hop.js
// 氷板の拍渡り — 乗った氷板が沈んで浮き上がる、その一点の拍だけを狙って次の板へ踏み込む。小さい板は1拍、大きい板は2拍で浮き戻る。伴奏が消える吹雪の2小節も拍を数えて踏む
// 操作: 画面のどこでもタップすると次の氷板へ踏み込む(1枚につき1回だけ)。乗った板は沈んで、小さい板なら次の拍、大きい板なら2拍後の頭にいちばん上まで浮き戻る(板のまわりの角括弧が閉じきる瞬間)。その拍の頭からのずれでPERFECT/GOOD。早すぎ(板がまだ沈んでいる)・遅れ・踏まずに見送るとMISSで長靴に水がはねる(少女は身震いして次の板へよじ登る)。3〜4小節目は吹雪で伴奏と拍ランプと角括弧が消え、板も雪に隠れる(直前の拍で風の唸りと雪雲で予告)。板の大きさだけを頼りに拍を数えて踏む(吹雪の間は得点2倍)
// 終わり: 112BPM・前奏1小節+6小節(28拍・15秒・17回踏み込み)で向こう岸に着けばCLEAR。MISS3回でGAME OVER
// @mechanic: timing_one_shot
// @theme: frozen_river_floe_crossing
// 世界観: 冬の凍った川で、赤い頭巾の少女が背負った薪を対岸の小屋へ届けるため、浮き沈みする氷板が浮き戻る拍の一点を狙って一枚ずつ踏み渡る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・渡った板の数・吹雪の中で踏めた数・PERFECT/GOOD/MISS数・最大連続
// スタイル: 8bit HOME
var STYLE = { bg: ['#0c1a4a', '#1a3a8a'], main: ['#e8f0ff', '#7ab8ff', '#000000'], accent: ['#d83030', '#f8b800'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8の粗いドット、輪郭線なし。背景はタイル反復、川は一方向へ流れる
  var C = {
    deep: STYLE.bg[0], water: STYLE.bg[1], ice: STYLE.main[0], iceSh: STYLE.main[1], blk: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1], wood: '#a85a20', pine: '#1e8a3a', pineDk: '#0e5a24', wet: '#3a6ad8'
  };

  var GAME_TITLE = 'FLOE HOP';
  var BPM = 112;
  var SPB = 60 / BPM;              // 0.536秒
  var TIME_LIMIT = 15;             // 28拍
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.15;
  var LIVES = 3;
  // 氷板ごとの浮き戻りの拍数(小さい板=1 / 大きい板=2)。前奏4拍のあと、4拍目の頭に岸から最初の板へ
  var PERIODS = [2, 2, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 2, 1, 1, 2];
  var FX = [540, 390, 650, 480, 700, 400, 600, 330, 560, 720, 470, 620, 380, 560, 700, 520];
  var BREAK = [12, 20];            // 伴奏が抜ける拍(3〜4小節目)
  var DEMO_PERIODS = [2, 1, 1, 2, 2];
  var DEMO_BREAK = [8, 12];
  var DEMO_EARLY = 3;              // デモはこの踏み込みを早まって水をはねる例
  var FIRST = 4;
  var GAP = 200;                   // 板と板の間隔(縦)
  var ANCHOR_Y = 1120;             // 少女を置く画面の高さ

  // ── 8bitドット絵 ─────────────────────────────────
  var PAL = { r: C.red, R: '#901818', w: C.ice, s: '#f8b888', k: C.blk, b: C.wood, B: '#683010', c: C.wet };
  var PAL_FLASH = { r: '#ffffff', R: '#ffffff', w: '#ffffff', s: '#ffffff', k: '#ffffff', b: '#ffffff', B: '#ffffff', c: '#ffffff' };
  var GIRL = [
    '....rrrr....',
    '...rrrrrr...',
    '..rrwwwwrr..',
    '..rwsksksr..',
    '..rwsssswr..',
    '...rrrrrr...',
    '.bbRrrrrRbb.',
    '.bBrrrrrrBb.',
    '..rrrrrrrr..',
    '..rrrrrrrr..',
    '..RrrrrrrR..',
    '...kk..kk...',
    '...kk..kk...',
    '..kkk..kkk..'
  ];
  var GIRL_LOW = [
    '............',
    '............',
    '....rrrr....',
    '...rrrrrr...',
    '..rrwwwwrr..',
    '..rwsksksr..',
    '..rwsssswr..',
    '.bbRrrrrRbb.',
    '.bBrrrrrrBb.',
    '..rrrrrrrr..',
    '..RrrrrrrR..',
    '..kkk..kkk..',
    '.kkk....kkk.',
    '............'
  ];
  var GIRL_JUMP = [
    's...rrrr...s',
    'r..rrrrrr..r',
    'r.rrwwwwrr.r',
    '.rrwsksksrr.',
    '..rwsssswr..',
    '...rrrrrr...',
    '.bbRrrrrRbb.',
    '.bBrrrrrrBb.',
    '..rrrrrrrr..',
    '..RrrrrrrR..',
    '...kkkkkk...',
    '..kk....kk..',
    '............',
    '............'
  ];
  var GIRL_WET = [
    '....rrrr....',
    '...rrrrrr...',
    '..rrwwwwrr..',
    '..rwkksskr..',
    '..rwsssswr..',
    '...rrrrrr...',
    '.bbRrrrrRbb.',
    '.bBrrrrrrBb.',
    '.srrrrrrrrs.',
    '..RrrrrrrR..',
    '..rrrrrrrr..',
    '...cc..cc...',
    '...cc..cc...',
    '..ccc..ccc..'
  ];
  var PINE = [
    '....gg....',
    '...gwgg...',
    '..gggggg..',
    '...gggw...',
    '..gwgggg..',
    '.gggggggg.',
    '..ggwggg..',
    '.gggggggw.',
    'gggggggggg',
    '....bb....',
    '....bb....'
  ];
  var HUT = [
    '.....rrrrrr.....',
    '....rrrrrrrr....',
    '...rrrrrrrrrr...',
    '..rrrrrrrrrrrr..',
    '.rrrrrrrrrrrrrr.',
    'wwwwwwwwwwwwwwww',
    '.bbbbbbbbbbbbbb.',
    '.bbyybbbbbbkkbb.',
    '.bbyybbbbbbkkbb.',
    '.bbbbbbbbbbkkbb.',
    '.bbbbbbbbbbkkbb.'
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var run = null;

  function newRun(isDemo) {
    var per = isDemo ? DEMO_PERIODS : PERIODS;
    var jumps = [], b = FIRST;
    for (var i = 0; i <= per.length; i++) {
      jumps.push({ i: i, b: b, t: b * SPB, res: 0 });
      if (i < per.length) b += per[i];
    }
    var floes = [];
    for (var k = 0; k < per.length; k++) floes.push({ k: k + 1, p: per[k], x: FX[k % FX.length], y: -k * GAP, big: per[k] === 2 });
    var br = isDemo ? DEMO_BREAK : BREAK;
    return {
      demo: isDemo, jumps: jumps, floes: floes, per: per, nF: per.length, brk: br, endB: b,
      farY: -per.length * GAP - 40, nearY: GAP + 40,
      clock: isDemo ? -0.2 : -READY_T, realT: 0, cueB: -1, lastBeat: -1, next: 0,
      pos: 0, jumpFrom: 0, jumpT: -1, pendJump: -1, camY: GAP + 40,
      score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, crossed: 0, inBreak: 0,
      hitStop: 0, flash: 0, wetT: 0, pendingBad: null, beatPulse: 0, splash: [], snowA: 0, warned: false,
      over: false, won: false, outroT: 0, prevBest: game.best, ended: false, cheer: 0, backAnnounced: false, lastTapT: -9
    };
  }

  function isBreak(b) { return b >= run.brk[0] && b < run.brk[1]; }
  function beep(f, d, o) { if (!run.demo) game.audio.tone(f, d, o); }

  // ── 拍クロック(1本)。伴奏はチップチューン(矩形波の旋律+三角波のベース)。吹雪の拍は伴奏なし ──
  var MELO = ['A4', 'C5', 'E5', 'C5', 'D5', 'F5', 'E5', 'C5', 'B4', 'D5', 'G5', 'E5', 'A4', 'E5', 'C5', 'A4'];
  var BASSL = ['A2', 'A2', 'F2', 'F2', 'G2', 'G2', 'E2', 'E2'];
  function cueAudio() {
    for (var b = run.cueB + 1; b <= run.endB; b++) {
      if (run.clock + 0.06 < b * SPB) break;
      run.cueB = b;
      if (run.demo || isBreak(b) || b >= run.endB) continue;
      var lead = b < FIRST ? (b % 4 === 0 ? 'A5' : 'E5') : MELO[b % 16];
      game.audio.melody([[lead, 0.5], [b < FIRST ? 'R' : MELO[(b + 7) % 16], 0.5]], {
        tempo: BPM, wave: 'square', volume: 0.04,
        bass: [[BASSL[Math.floor(b / 2) % 8], 0.7], ['R', 0.3]], bassWave: 'triangle', bassVolume: 0.13
      });
    }
  }
  function onBeat(b) {
    run.beatPulse = 1;
    if (isBreak(b)) return;
    // 小太鼓役の短い矩形波(小節頭は低く)
    beep(b % 4 === 0 ? 220 : 1600, b % 4 === 0 ? 0.06 : 0.02, { wave: 'square', volume: b % 4 === 0 ? 0.07 : 0.03 });
    if (b === run.brk[1] && !run.demo) {
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('NICE', W / 2, 600, { color: C.gold, size: 84 });
    }
  }

  // ── 氷板の沈み(0=いちばん上 / 1=いちばん沈む)。乗った拍から次の踏み込みの拍まで一往復 ──
  function sinkOf(k) {
    var j0 = run.jumps[k - 1], j1 = run.jumps[k];
    var c = run.clock;
    if (c < j0.t) return 0;
    if (c <= j1.t) return Math.sin(Math.PI * (c - j0.t) / (j1.t - j0.t));
    var a = c - j1.t;
    return a < 0.6 ? Math.sin(a * 14) * 0.15 * (1 - a / 0.6) : 0;
  }

  function posXY(p) {
    if (p <= 0) return { x: 540, y: run.nearY };
    if (p > run.nF) return { x: 540, y: run.farY };
    var f = run.floes[p - 1];
    return { x: f.x, y: f.y + sinkOf(p) * 18 * (run.snowA > 0.5 ? 0 : 1) };
  }

  // ── 判定(本番の指もATTRACTのゴーストも同じ関数) ──────────────
  function tapJump() {
    var j = run.jumps[run.next];
    if (!j || run.over || run.hitStop > 0 || run.pendJump >= 0) return 'none';
    var d = run.clock - j.t;
    if (run.clock - run.lastTapT < 0.12) return 'none';
    if (run.next === 0 && d < -SPB) return 'none';                // 前奏の早押しは数えない
    if (run.next > 0 && run.clock < run.jumps[run.next - 1].t + 0.12) return 'none';
    run.lastTapT = run.clock;
    if (d < -GOOD_W) { missJump(j, 'early'); return 'miss'; }
    if (d > GOOD_W) { missJump(j, 'late'); return 'miss'; }
    var grade = Math.abs(d) <= PERFECT_W ? 1 : 2;
    j.res = grade;
    run.next++;
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
    if (grade === 1) run.perfect++; else run.good++;
    var brk = isBreak(j.b);
    if (brk) run.inBreak++;
    var gain = ((grade === 1 ? 100 : 60) + Math.min(10, run.combo) * 10) * (brk ? 2 : 1);
    run.score += gain;
    startJump();
    // 踏み込み音は連続で高くなる(吹雪の中でも鳴る)
    beep(392 + Math.min(12, run.combo) * 40, 0.06, { wave: 'square', volume: 0.07 });
    var to = posXY(run.pos + 1);
    game.feedback.good(to.x, sy(to.y) - 150, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.gold : C.iceSh, size: grade === 1 ? 54 : 46,
      count: grade === 1 ? 12 : 7, volume: run.demo ? 0 : 0.16
    });
    if (!run.demo && brk) game.fx.popup('+' + gain, to.x + 110, sy(to.y) - 220, { color: C.ice, size: 40 });
    return grade === 1 ? 'perfect' : 'good';
  }

  function startJump() {
    run.jumpFrom = run.pos;
    run.pos = Math.min(run.nF + 1, run.pos + 1);
    run.jumpT = 0;
    if (run.pos <= run.nF) run.crossed = run.pos;
    beep(500, 0.08, { wave: 'square', volume: 0.05, slide: 400 });
  }

  function missJump(j, why) {
    j.res = 3;
    run.next++;
    run.miss++; run.combo = 0;
    run.hitStop = 0.4; run.flash = 0.4; run.wetT = 1.0;
    run.pendJump = 1;
    var p = posXY(run.pos);
    run.pendingBad = { x: p.x, y: sy(p.y) - 150 };
    for (var i = 0; i < 12; i++) run.splash.push({ x: p.x + game.random(-60, 60), y: p.y, vx: game.random(-200, 200), vy: -game.random(300, 600), t: 0 });
    beep(why === 'early' ? 160 : 120, 0.2, { wave: 'square', volume: 0.09, slide: -60 });
  }

  function flushBad() {
    if (!run.pendingBad) return;
    var pb = run.pendingBad;
    run.pendingBad = null;
    game.feedback.bad(pb.x, pb.y, { text: 'MISS', color: C.red, flashColor: C.ice, shake: run.demo ? 3 : 12, volume: run.demo ? 0 : 0.5 });
    if (!run.demo && run.miss >= LIVES) { finishRun(false); run.pendJump = -1; return; }
    if (run.pendJump >= 0) { run.pendJump = -1; startJump(); }
  }

  function sy(wy) { return wy - run.camY + ANCHOR_Y; }

  function stepRun(dt) {
    run.clock += dt;
    cueAudio();
    var bi = Math.floor(run.clock / SPB);
    while (run.lastBeat < bi && run.lastBeat < run.endB) { run.lastBeat++; onBeat(run.lastBeat); }
    // 吹雪の予告(1拍前に風の唸り)
    if (!run.warned && run.clock >= (run.brk[0] - 1) * SPB) {
      run.warned = true;
      beep(180, 0.5, { wave: 'sawtooth', volume: 0.05, slide: 220 });
    }
    if (run.over) return;
    var j = run.jumps[run.next];
    if (j && run.clock > j.t + GOOD_W) { missJump(j, 'late'); return; }
    if (!j && run.jumpT < 0 && run.pos > run.nF && !run.demo) finishRun(run.miss < LIVES);
  }

  function finishRun(ok) {
    if (run.over) return;
    run.over = true; run.won = ok; run.outroT = 2.2;
    if (run.demo) return;
    game.audio.stopBgm();
    if (ok) {
      run.score += (LIVES - run.miss) * 150 + 300;
      run.cheer = 2.2;
      for (var i = 0; i < 6; i++) game.fx.burst(180 + i * 145, 420 + (i % 2) * 100, { color: i % 2 ? C.gold : C.red, count: 18, speed: 420 });
      game.fx.flash(C.ice, 0.25);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: run.score, floes: run.crossed, inBreak: run.inBreak, perfect: run.perfect, good: run.good, miss: run.miss, maxCombo: run.maxCombo };
    if (run.won) game.end.success(run.score, stats); else game.end.failure(stats);
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; run = newRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; run = newRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || y < 230) return;
    var r = tapJump();
    if (r === 'none') game.audio.tone(300, 0.03, { wave: 'triangle', volume: 0.04 });
  });

  // ── 描画(8x8ドット単位) ─────────────────────────
  var P8 = 8;
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.blk, bold: true, align: a, font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a, font: 'monospace' });
  }
  function block(x, y, w, h, col) {
    game.draw.rect(Math.round(x / P8) * P8, Math.round(y / P8) * P8, Math.round(w / P8) * P8, Math.round(h / P8) * P8, col);
  }

  function drawRiver() {
    var t = game.time.elapsed;
    game.draw.gradient(230, H, [[0, C.deep], [1, C.water]]);
    // 波のタイル(一方向へ流れる)
    var off = (t * 40) % 64;
    var oy = ((-run.camY % 64) + 64) % 64;
    for (var ry = 230 - 64 + oy; ry < H; ry += 64) {
      for (var rx = -64 + off; rx < W; rx += 64) {
        var row = Math.round((ry - oy) / 64);
        var sx = rx + (row % 2) * 32;
        game.draw.rect(sx, ry + 24, 16, 8, C.iceSh, 0.35);
        game.draw.rect(sx + 16, ry + 16, 8, 8, C.iceSh, 0.35);
      }
    }
  }

  function drawBank(wy, top) {
    var y = sy(wy);
    if (top) {
      if (y < 230 - 40) return;
      block(0, 230, W, y - 230 + 40, C.ice);
      for (var i = 0; i < 18; i++) block((i * 136) % W, y - 40 - (i % 3) * 64, 16, 8, C.iceSh);
      game.draw.sprite(HUT, { r: C.red, w: C.ice, b: C.wood, y: C.gold, k: C.blk }, 540, y - 140, P8 * 1.5, { anchor: 'center' });
      var smk = (game.time.elapsed * 30) % 60;
      block(620, y - 260 - smk, 24, 24, C.iceSh);
      block(600, y - 320 - smk, 16, 16, C.iceSh);
      game.draw.sprite(PINE, { g: C.pine, w: C.ice, b: C.wood }, 180, y - 120, P8 * 1.4, { anchor: 'center' });
      game.draw.sprite(PINE, { g: C.pineDk, w: C.ice, b: C.wood }, 900, y - 110, P8 * 1.4, { anchor: 'center' });
    } else {
      if (y > H + 40) return;
      block(0, y - 40, W, H - y + 40, C.ice);
      for (var k = 0; k < 18; k++) block((k * 152) % W, y + (k % 3) * 64, 16, 8, C.iceSh);
      game.draw.sprite(PINE, { g: C.pine, w: C.ice, b: C.wood }, 120, y + 30, P8 * 1.4, { anchor: 'center' });
      game.draw.sprite(PINE, { g: C.pineDk, w: C.ice, b: C.wood }, 960, y + 50, P8 * 1.4, { anchor: 'center' });
    }
  }

  function drawFloe(f, hidden) {
    var s = hidden ? 0 : sinkOf(f.k);
    var y = sy(f.y);
    if (y < 180 || y > H + 80) return;
    var w = f.big ? 224 : 136, h = 56;
    var x = f.x - w / 2;
    var sinkPx = s * 18;
    var top = Math.round((y - h / 2 + sinkPx) / P8) * P8;
    // 段々の角(ドット)
    block(x + 8, top, w - 16, 8, C.ice);
    block(x, top + 8, w, h - 16, s > 0.55 ? C.iceSh : C.ice);
    block(x + 8, top + h - 8, w - 16, 8, C.iceSh);
    block(x + 16, top + 16, 24, 8, '#ffffff');
    // 沈んだ分だけ水がかぶる
    if (s > 0.2) block(x - 8, top + h - 16 - s * 24, w + 16, 8 + s * 24, C.water);
    // 浮き戻りの一瞬のきらめき
    if (s < 0.08 && run.next < run.jumps.length && run.pos === f.k && !hidden) {
      block(f.x + w / 2 - 24, top - 16, 8, 8, C.gold);
      block(f.x + w / 2 - 32, top - 8, 24, 8, C.gold);
    }
  }

  // 角括弧: 浮き戻りの拍の頭へ向かって閉じていく(吹雪の間は消える)
  function drawBracket() {
    if (run.snowA > 0.5 || run.pos < 1 || run.pos > run.nF || run.over) return;
    var j = run.jumps[run.pos];
    var j0 = run.jumps[run.pos - 1];
    if (!j || run.next !== run.pos) return;
    var f = run.floes[run.pos - 1];
    var k = Math.max(0, Math.min(1, (j.t - run.clock) / (j.t - j0.t)));
    var w = (f.big ? 224 : 136) / 2 + 16 + k * 130;
    var y = sy(f.y);
    var col = k < 0.15 ? C.gold : C.ice;
    for (var s = -1; s <= 1; s += 2) {
      var x = f.x + s * w;
      block(x - 4, y - 56, 8, 112, col);
      block(s < 0 ? x - 4 : x - 20, y - 56, 24, 8, col);
      block(s < 0 ? x - 4 : x - 20, y + 48, 24, 8, col);
    }
  }

  function drawGirl() {
    var a = posXY(run.jumpFrom), b = posXY(run.pos);
    var x, y, spr = GIRL;
    if (run.jumpT >= 0 && run.jumpT < 0.22) {
      var u = run.jumpT / 0.22;
      x = a.x + (b.x - a.x) * u;
      y = a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * 90;
      spr = GIRL_JUMP;
    } else {
      x = b.x; y = b.y;
      if (run.pos >= 1 && run.pos <= run.nF && sinkOf(run.pos) > 0.5 && run.snowA < 0.5) spr = GIRL_LOW;
    }
    if (run.wetT > 0 && run.jumpT < 0) spr = GIRL_WET;
    if (run.cheer > 0) spr = GIRL_JUMP;
    var shiver = run.wetT > 0 ? Math.sin(game.time.elapsed * 60) * 4 : 0;
    var px = run.flash > 0 ? 10 : 8;
    var feet = sy(y) - 24;
    block(x - 40, feet - 4, 80, 8, C.blk);
    game.draw.sprite(spr, run.flash > 0 ? PAL_FLASH : PAL, x + shiver, feet - 7 * px, px, { anchor: 'center' });
  }

  function drawSplash(dt) {
    for (var i = run.splash.length - 1; i >= 0; i--) {
      var s = run.splash[i];
      s.t += dt;
      if (s.t > 0.8) { run.splash.splice(i, 1); continue; }
      s.vy += 1400 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      block(s.x, sy(s.y), 16, 16, s.t < 0.3 ? C.ice : C.iceSh);
    }
  }

  function drawSnow(dt) {
    var want = run.clock >= (run.brk[0] - 0.4) * SPB && run.clock < (run.brk[1] - 0.1) * SPB && !run.over ? 1 : 0;
    run.snowA += (want - run.snowA) * Math.min(1, dt * 6);
    if (run.snowA < 0.02) return;
    var t = game.time.elapsed;
    game.draw.rect(0, 230, W, H - 230, '#c8d8f0', 0.72 * run.snowA);
    for (var i = 0; i < 70; i++) {
      var x = ((i * 157 + t * (300 + (i % 5) * 60)) % (W + 80)) - 40;
      var y = 230 + ((i * 263 + t * 220) % (H - 230));
      block(x, y, 8, 8, '#ffffff');
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.blk);
    game.draw.rect(0, 222, W, 8, C.iceSh);
    label('SCORE ' + run.score, 40, 88, 46, C.ice, 'left');
    if (run.combo >= 2) label('x' + run.combo, 40, 168, 40, C.gold, 'left');
    // 残り(MISSで消える薪)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - run.miss;
      block(W - 100 - i * 80, 56, 56, 24, on ? C.wood : '#303030');
      block(W - 100 - i * 80, 80, 56, 8, on ? '#683010' : '#202020');
    }
    // 拍ランプ(4つ)。吹雪の間は消える
    var dark = run.snowA > 0.5;
    var cur = run.lastBeat >= 0 ? run.lastBeat % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var lit = b === cur && !dark;
      block(560 + b * 96, 144, 64, 56, lit ? (b === 0 ? C.red : C.gold) : '#202838');
    }
    // 渡った板
    var prog = Math.min(1, run.crossed / run.nF);
    block(40, 200, 960 * prog, 8, C.iceSh);
  }

  function drawScanlines() {
    for (var s = 230; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.12);
  }

  function drawScene(dt) {
    var gy = run.pos <= 0 ? run.nearY : run.pos > run.nF ? run.farY : run.floes[run.pos - 1].y;
    run.camY += (gy - run.camY) * Math.min(1, dt * 4);
    drawRiver();
    drawBank(run.farY, true);
    drawBank(run.nearY, false);
    for (var i = 0; i < run.floes.length; i++) drawFloe(run.floes[i], false);
    drawBracket();
    drawSplash(dt);
    drawSnow(dt);
    // 吹雪の間は板の大きさだけが輪郭で見える
    if (run.snowA > 0.3) {
      for (var k = 0; k < run.floes.length; k++) {
        var f = run.floes[k];
        var y = sy(f.y);
        if (y < 200 || y > H) continue;
        var w = f.big ? 224 : 136;
        block(f.x - w / 2, y - 28, w, 8, C.iceSh);
        block(f.x - w / 2, y + 20, w, 8, C.iceSh);
      }
    }
    drawGirl();
    drawScanlines();
  }

  function drawResult(showTap) {
    var y0 = H * 0.27, hh = H * 0.4;
    block(48, y0, W - 96, hh, C.blk);
    block(64, y0 + 16, W - 128, hh - 32, C.deep);
    label(run.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, run.won ? C.gold : C.red);
    label('SCORE ' + run.score, W / 2, H * 0.4, 58, C.ice);
    label(run.crossed + ' / ' + run.nF, W / 2, H * 0.455, 62, C.iceSh);
    label('x2 ' + run.inBreak, W / 2, H * 0.5, 40, C.ice);
    label('PERFECT ' + run.perfect + '  GOOD ' + run.good + '  MISS ' + run.miss, W / 2, H * 0.54, 32, C.ice);
    if (run.won && run.score > run.prevBest) label('NEW RECORD', W / 2, H * 0.59, 60, C.gold);
    else label('BEST ' + Math.max(run.prevBest, run.won ? run.score : 0), W / 2, H * 0.59, 44, C.gold);
    if (!run.won) label('あと' + Math.max(1, run.nF + 1 - run.crossed) + '枚!', W / 2, H * 0.635, 50, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.71, 38, C.ice);
  }

  // ── ATTRACT: 実ロジックで5枚+岸。4回目の踏み込みだけ早まって水をはねる例 ──
  var demo = { t: 0, press: 0 };
  var DEMO_CYC = 0;
  function ghost(dt) {
    demo.press = Math.max(0, demo.press - dt);
    var j = run.jumps[run.next];
    if (!j || run.hitStop > 0 || run.pendJump >= 0) return;
    var at = j.t - (j.i === DEMO_EARLY ? 0.26 : 0);
    if (run.clock + dt / 2 >= at) { demo.press = 0.18; tapJump(); }
  }
  function stepDemo(dt) {
    demo.t += dt;
    if (!DEMO_CYC) DEMO_CYC = run.endB * SPB + 2.0;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { run = newRun(true); }
    if (run.jumpT >= 0) { run.jumpT += dt; if (run.jumpT >= 0.22) run.jumpT = -1; }
    if (run.hitStop > 0) { run.hitStop -= dt; if (run.hitStop <= 0) flushBad(); return; }
    if (run.clock < run.endB * SPB + 1.0) stepRun(dt);
    ghost(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (!run) run = newRun(true);
    run.beatPulse = Math.max(0, run.beatPulse - dt * 4);
    run.flash = Math.max(0, run.flash - dt);
    run.wetT = Math.max(0, run.wetT - dt);
    run.cheer = Math.max(0, run.cheer - dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(540, 1640, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.blk);
      game.draw.rect(0, 222, W, 8, C.iceSh);
      label(GAME_TITLE, W / 2, 104 + Math.sin(t * 3) * 6, 96, C.ice);
      label('HI-SCORE ' + game.best, W / 2, 190, 38, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.95, 46, C.gold);
      else label('TAP TO START', W / 2, H * 0.95, 42, C.blk);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ── PLAYING ──
    run.realT += dt;
    if (run.jumpT >= 0) { run.jumpT += dt; if (run.jumpT >= 0.22) run.jumpT = -1; }
    if (!run.over && run.realT >= READY_T + TIME_LIMIT + 2.5) { run.hitStop = 0; run.pendingBad = null; finishRun(run.miss < LIVES); }
    if (run.hitStop > 0) {
      run.hitStop -= dt;
      if (run.hitStop <= 0) flushBad();
    } else if (run.over) {
      run.outroT -= dt;
      if (run.outroT <= 0 && !run.ended) { run.ended = true; state = S.RESULT; endGame(); }
    } else {
      var wasReady = run.clock < -0.35;
      stepRun(dt);
      if (wasReady && run.clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(dt);
    drawHud();
    if (run.clock < 0) {
      block(0, H * 0.42, W, 176, C.blk);
      label(run.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 120, 110, C.gold);
    }
    if (run.over && run.hitStop <= 0 && run.outroT < 1.4) drawResult(state === S.RESULT);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    run = newRun(true);
    demo.t = 0;
  });
})(game);
