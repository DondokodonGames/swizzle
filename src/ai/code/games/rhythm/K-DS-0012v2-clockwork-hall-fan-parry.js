// K-DS-0012v2-clockwork-hall-fan-parry.js
// からくり座敷の扇払い — 仕掛け人形が拍ごとに繰り出す三つの動き(上からの団扇の振り下ろし・床を払う大扇・ばね板の押し出し)を見極め、拍の頭で扇を下・上・横へ払って受け流す。拍型が途中で二度切り替わる
// 操作: 画面のどこでも指を払う。人形の右腕の団扇が高く振り上がったら下へ、足元の大扇が引かれたら上へ、胸のばね板が縮んだら左右どちらかへ、その動きが手前の受け輪に届く拍の頭で払う。上の拍札(4拍→3拍→4拍の裏)と人形の胸の歯車で拍が見える。鉦が鳴って拍札の縁の色が変わると次の小節から拍型が変わる。向き違い・早すぎ・遅すぎ・払い損ねはMISS(動きの無い時の空払いは罰なし)
// 終わり: 前奏1小節+三つの拍型(4拍子の表→3拍子→4拍子の裏、120BPM・約15秒・16本)を受け切ればCLEAR。MISS3回でGAME OVER
// @mechanic: swipe_direction
// @theme: clockwork_hall_fan_parry
// 世界観: からくり屋敷の試練の間で、扇を手にした挑戦者が、仕掛け人形の繰り出す団扇の腕・床を払う大扇・ばね仕掛けの押し板を、拍に合わせて扇で受け流していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・拍型ごとの受け数・最大コンボ)
// スタイル: 90s BIG SPRITE

(function(game) {
  var STYLE = { bg: ['#4a2c1a', '#1c0f08'], main: ['#c8783a', '#f2e0b8', '#2c5aa8'], accent: ['#ffd040', '#e83828'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大な人形、床に楕円影、背景は障子の1層。間合い(人形→受け輪→挑戦者)で見せる
  var C = {
    wallT: STYLE.bg[0], wallB: STYLE.bg[1],
    wood: STYLE.main[0], paper: STYLE.main[1], indigo: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    woodD: '#6e3a1a', woodL: '#eaa868', ink: '#140a04', skin: '#f6cca0', face: '#fff2e0',
    floorA: '#7a4a24', floorB: '#5c3418', white: '#ffffff'
  };
  var SEC_COL = ['#5aa8ff', '#ffb030', '#ff5c7c'];

  var GAME_TITLE = 'FAN PARRY';
  var BPM = 120;
  var SPB = 60 / BPM;
  var WIN_P = 0.07, WIN_G = 0.14, WIN_M = 0.3;
  var LIVES = 3;
  var LEAD = 1.3;      // 動きの予告(拍)。120BPMで0.65秒前から振りかぶる
  var SW_TH = 60;      // 払いと認める指の移動量
  // 拍型: 4拍子の表 → 3拍子 → 4拍子の裏
  var PLAY_SECS = [
    { from: 0, to: 12, meter: 4, off: false },
    { from: 12, to: 21, meter: 3, off: false },
    { from: 21, to: 29, meter: 4, off: true }
  ];
  var PLAY_HITS = [4, 6, 8, 10, 11, 12, 14, 15, 17, 18, 20, 21.5, 23.5, 24.5, 25.5, 27.5];
  var SONG_END = 29;
  var DEMO_SECS = [
    { from: 0, to: 8, meter: 4, off: false },
    { from: 8, to: 14, meter: 3, off: false }
  ];
  var DEMO_HITS = [[2, 'H'], [4, 'L'], [6, 'T'], [8, 'H'], [10, 'L'], [11, 'T']];
  var DEMO_FAIL_B = 10;
  var DEMO_CYCLE = 12.5 * SPB + 1.4;

  var CP = { x: 540, y: 1290 };        // 受け輪
  var DOLL_X = 540, DOLL_Y = 800, DOLL_PX = 28;
  var HERO_X = 540, HERO_Y = 1640;
  var GH = { x: 540, y: 1600 };        // ゴーストが払い始める位置

  // 伴奏(自作・陽音階)。拍型ごとに刻みと旋律が変わる
  var ROOTS = ['D3', 'G2', 'A2', 'D3'];
  var LEAD_A = ['D5', 0, 'E5', 0, 'G5', 0, 'A5', 'G5', 'E5', 0, 'D5', 0, 'B4', 0, 'D5', 0];
  var LEAD_B = ['A5', 0, 0, 0, 'G5', 0, 'E5', 0, 0, 0, 'D5', 0];
  var LEAD_C = [0, 'E5', 0, 'G5', 0, 'A5', 0, 'G5', 0, 'D5', 0, 'E5', 0, 'B4', 0, 'D5'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var sw = null;
  var demo = { t: 0, x: GH.x, y: GH.y, press: false, sh: null, gd: 'down' };

  // ── スプライト ─────────────────────────────────────────
  var DOLL_A = [
    '....kkkkkkkk....',
    '...kkkkkkkkkk...',
    '...kffffffffk...',
    '...kfeeffeefk...',
    '...kffffffffk...',
    '...kfrffffrfk...',
    '.....ffmmff.....',
    '.....tttttt.....',
    '..owwwwwwwwwwo..',
    '.owwwwggggwwwwo.',
    '.owwwwggggwwwwo.',
    '.owwwwggggwwwwo.',
    '..owwwwwwwwwwo..',
    '..tttttttttttt..',
    '..hhhhhhhhhhhh..',
    '.hhhhhhhhhhhhhh.',
    '.hhhhhhhhhhhhhh.',
    'hhhhhhhhhhhhhhhh',
    'bbbbbbbbbbbbbbbb',
    '.b..b..bb..b..b.'
  ];
  var DOLL_B = DOLL_A.slice();
  DOLL_B[3] = '...kffffffffk...';
  DOLL_B[4] = '...kfeeffeefk...';
  var DOLL_JOLT = DOLL_A.slice();
  DOLL_JOLT[3] = '...kfeefeeffk...';
  DOLL_JOLT[6] = '.....ffmmmf.....';
  var DOLL_SMUG = DOLL_A.slice();
  DOLL_SMUG[3] = '...kfffffeffk...';
  DOLL_SMUG[4] = '...kfeefffffk...';
  var DOLL_PAL = { k: C.ink, f: C.face, e: C.ink, r: '#ff9a9a', m: C.red, t: C.gold, o: C.woodD, w: C.wood, g: C.woodD, h: C.red, b: C.woodD };

  var HERO_A = [
    '....kkkk....',
    '...kkkkkk...',
    '...kkrrkk...',
    '....kkkk....',
    '.....ss.....',
    '..iiiiiiii..',
    '.iiiiwwiiii.',
    '.iiiiwwiiii.',
    '.siiiwwiiis.',
    '..iiiiiiii..',
    '..hhhhhhhh..',
    '..hhhhhhhh..',
    '..hhh..hhh..',
    '..kkk..kkk..'
  ];
  var HERO_B = HERO_A.slice();
  HERO_B[8] = '..iiiwwiiis.';
  HERO_B[12] = '..hhh..hhh..';
  HERO_B[13] = '.kkk....kkk.';
  var HERO_PAL = { k: C.ink, r: C.red, s: C.skin, i: C.indigo, w: C.paper, h: '#24305a' };

  // ── 小道具 ─────────────────────────────────────────────
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function ring(cx, cy, r, col, w, a) {
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      game.draw.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, col, w);
    }
    if (a) game.draw.circle(cx, cy, r, col, a);
  }
  function ellipseShadow(cx, cy, rx, ry, a) {
    for (var i = -5; i <= 5; i++) {
      var k = Math.sqrt(1 - (i / 6) * (i / 6));
      game.draw.rect(cx - rx * k, cy + i * ry / 6 - ry / 12, rx * 2 * k, ry / 6 + 1, '#000000', a);
    }
  }
  function sensu(x, y, ang, r, paper, edge, spread) {
    var n = 10;
    for (var i = 0; i <= n; i++) {
      var a = ang + (i / n - 0.5) * spread;
      game.draw.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, i % 2 ? paper : C.paper, r * 0.2);
    }
    for (var j = 0; j <= n; j++) {
      var a2 = ang + (j / n - 0.5) * spread;
      game.draw.circle(x + Math.cos(a2) * r, y + Math.sin(a2) * r, r * 0.08, edge);
      game.draw.line(x, y, x + Math.cos(a2) * r * 0.9, y + Math.sin(a2) * r * 0.9, C.woodD, 3);
    }
    game.draw.circle(x, y, r * 0.1, edge);
  }
  function uchiwa(x, y, r, col) {
    game.draw.circle(x, y, r + 8, C.ink);
    game.draw.circle(x, y, r, C.paper);
    game.draw.circle(x, y, r * 0.55, col);
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      game.draw.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, C.woodL, 3);
    }
  }
  function arrowIcon(x, y, dir, len, col, w) {
    var v = dirVec(dir), nx = -v.y, ny = v.x;
    var tx = x + v.x * len / 2, ty = y + v.y * len / 2;
    game.draw.line(x - v.x * len / 2, y - v.y * len / 2, tx, ty, col, w);
    game.draw.line(tx, ty, tx - v.x * len * 0.4 + nx * len * 0.3, ty - v.y * len * 0.4 + ny * len * 0.3, col, w);
    game.draw.line(tx, ty, tx - v.x * len * 0.4 - nx * len * 0.3, ty - v.y * len * 0.4 - ny * len * 0.3, col, w);
  }
  function dirVec(d) {
    if (d === 'up') return { x: 0, y: -1 };
    if (d === 'down') return { x: 0, y: 1 };
    if (d === 'left') return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }
  function dirOk(t, d) {
    if (t === 'H') return d === 'down';
    if (t === 'L') return d === 'up';
    return d === 'left' || d === 'right';
  }
  function lerp(a, b, k) { return a + (b - a) * k; }

  // ── 進行 ───────────────────────────────────────────────
  function buildHits(isDemo) {
    var hits = [], i;
    if (isDemo) {
      for (i = 0; i < DEMO_HITS.length; i++) hits.push({ b: DEMO_HITS[i][0], t: DEMO_HITS[i][1] });
    } else {
      // 最初の3本は三つの動きを1回ずつ。以後は1.6拍以内に同じ動きを続けない
      var first = ['H', 'L', 'T'];
      for (i = 2; i > 0; i--) {
        var j = Math.floor(game.random(0, i + 1)) % (i + 1);
        var tmp = first[i]; first[i] = first[j]; first[j] = tmp;
      }
      var types = ['H', 'L', 'T'];
      for (i = 0; i < PLAY_HITS.length; i++) {
        var t = i < 3 ? first[i] : types[Math.floor(game.random(0, 3)) % 3];
        if (i > 0 && hits[i - 1].t === t && PLAY_HITS[i] - hits[i - 1].b < 1.6) t = types[(types.indexOf(t) + 1 + Math.floor(game.random(0, 2)) % 2) % 3];
        hits.push({ b: PLAY_HITS[i], t: t });
      }
    }
    for (i = 0; i < hits.length; i++) { hits[i].st = 'wait'; hits[i].fx = 0; hits[i].creak = false; hits[i].dir = 'down'; }
    return hits;
  }

  function newRun(isDemo) {
    var secs = isDemo ? DEMO_SECS : PLAY_SECS;
    return {
      demo: isDemo, secs: secs, hits: buildHits(isDemo), bp: 0, beatIdx: -1, stepIdx: -1, annIdx: 0, secDone: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, secOk: [0, 0, 0], secMiss: [0, 0, 0],
      stop: 0, stopHit: null, pulse: 0, wobble: 0, jolt: 0, ann: 0, annSec: 0,
      fanDir: null, fanT: 0, over: false, ok: false, endWait: 0
    };
  }

  function secIdx(bp) {
    for (var i = 0; i < R.secs.length; i++) if (bp < R.secs[i].to) return i;
    return R.secs.length - 1;
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD_A.length; i++) notes.push([LEAD_A[i] || 'R', 0.5]);
    for (var b = 0; b < 4; b++) { bass.push([ROOTS[b], 1]); bass.push(['R', 1]); }
    game.audio.melody(notes, { tempo: BPM, wave: 'square', volume: 0.035, loop: true, bass: bass });
  }

  function initGame() {
    sw = null;
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  function playStep(s) {
    var b = s / 2;
    var si = secIdx(b), sec = R.secs[si];
    var rel = b - sec.from;
    var bar = Math.floor(rel / sec.meter);
    var p2 = Math.round((rel - bar * sec.meter) * 2);
    var head = p2 % 2 === 0;
    var root = ROOTS[bar % 4];
    var kick = function(v) { game.audio.tone(120, 0.09, { wave: 'sine', volume: v, slide: -70 }); };
    var clack = function(v) { game.audio.tone(1250, 0.03, { wave: 'square', volume: v, slide: -600 }); };
    if (sec.meter === 3) {
      if (p2 === 0) { kick(0.16); game.audio.tone(root, SPB * 0.9, { wave: 'triangle', volume: 0.15 }); }
      if (p2 === 2 || p2 === 4) clack(0.06);
    } else if (!sec.off) {
      if (p2 === 0 || p2 === 4) { kick(0.16); game.audio.tone(root, SPB * 0.8, { wave: 'triangle', volume: 0.14 }); }
      if (head) clack(0.05);
    } else {
      if (head) kick(0.12);
      else { clack(0.08); game.audio.tone(root, SPB * 0.4, { wave: 'triangle', volume: 0.14 }); }
    }
    var lead = si === 0 ? LEAD_A : (si === 1 ? LEAD_B : LEAD_C);
    var len = sec.meter * 2;
    var m = b >= 4 ? lead[(bar % 2) * len + p2] : 0;
    if (m) game.audio.tone(m, SPB * 0.42, { wave: 'square', volume: 0.04 });
  }

  function announce(i) {
    R.ann = 1.6; R.annSec = i;
    game.audio.tone(196, 0.7, { wave: 'triangle', volume: R.demo ? 0.06 : 0.13, slide: -12 });
    game.audio.tone(587, 0.45, { wave: 'square', volume: R.demo ? 0.015 : 0.035, slide: -20 });
    game.fx.burst(DOLL_X, DOLL_Y + 14, { color: SEC_COL[i], count: 14, speed: 300 });
  }

  function creak(h) {
    var f = h.t === 'H' ? 520 : (h.t === 'L' ? 260 : 380);
    game.audio.tone(f, 0.09, { wave: 'sawtooth', volume: R.demo ? 0.025 : 0.05, slide: 160 });
  }

  function judgeSwipe(dir) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    var best = null, bd = 99;
    for (var i = 0; i < R.hits.length; i++) {
      var h = R.hits[i];
      if (h.st !== 'wait') continue;
      var d = (R.bp - h.b) * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = h; }
    }
    if (!best || Math.abs(bd) > WIN_M) return 'air';
    if (Math.abs(bd) > WIN_G || !dirOk(best.t, dir)) { missHit(best, dir); return 'miss'; }
    best.st = 'ok'; best.fx = 0; best.dir = dir;
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    var si = secIdx(best.b);
    R.secOk[si]++;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + si * 20; }
    else { R.good++; R.score += 50 + R.combo * 5 + si * 10; }
    R.jolt = 0.5;
    game.feedback.good(CP.x, CP.y - 130, { text: grade, color: grade === 'PERFECT' ? C.gold : C.paper, count: grade === 'PERFECT' ? 18 : 10 });
    game.fx.burst(CP.x, CP.y, { color: SEC_COL[si], count: 12, speed: 420 });
    var up = Math.pow(2, Math.min(R.combo, 12) / 12);
    game.audio.tone(880 * up, 0.05, { wave: 'square', volume: 0.06 });
    game.audio.tone(1320 * up, 0.08, { wave: 'triangle', volume: 0.06, slide: 200 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup('x' + R.combo, CP.x, CP.y - 260, { color: C.gold, size: 96 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missHit(h, dir) {
    h.st = 'miss'; h.fx = 0; h.dir = dir || 'down';
    R.combo = 0; R.miss++; R.lives--;
    R.secMiss[secIdx(h.b)]++;
    R.stop = 0.42; R.stopHit = h; R.wobble = 1.2;
    game.audio.tone(110, 0.3, { wave: 'sawtooth', volume: 0.1, slide: -40 });
  }

  function releaseStop() {
    R.stopHit = null;
    game.feedback.bad(CP.x, CP.y - 130, { text: 'MISS' });
    game.fx.burst(HERO_X, HERO_Y - 60, { color: C.paper, count: 8, speed: 160 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    sw = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.jolt = 3;
      for (var i = 0; i < 5; i++) game.fx.burst(140 + i * 200, 700 + (i % 2) * 380, { color: [C.gold, SEC_COL[0], SEC_COL[1], SEC_COL[2], C.paper][i], count: 22, speed: 560 });
      game.fx.flash(C.gold, 0.2);
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.gold, size: 80 });
      game.audio.play('se_milestone', 0.6);
    }
  }

  // ── 指の払い ───────────────────────────────────────────
  function swStart(x, y) { sw = { x0: x, y0: y, used: false }; }
  function swDir(dx, dy) { return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  function swMove(x, y) {
    if (!sw || sw.used) return '';
    var dx = x - sw.x0, dy = y - sw.y0;
    if (dx * dx + dy * dy < SW_TH * SW_TH) return '';
    sw.used = true;
    var d = swDir(dx, dy);
    R.fanDir = d; R.fanT = 0.3;
    return judgeSwipe(d);
  }
  function swEnd(x, y) {
    if (!sw) return '';
    var res = '';
    if (!sw.used) {
      var dx = x - sw.x0, dy = y - sw.y0;
      if (dx * dx + dy * dy >= 30 * 30) {
        sw.used = true;
        var d = swDir(dx, dy);
        R.fanDir = d; R.fanT = 0.3;
        res = judgeSwipe(d);
      } else res = 'tap';
    }
    sw = null;
    return res;
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.wobble = Math.max(0, R.wobble - dt);
    R.jolt = Math.max(0, R.jolt - dt);
    R.ann = Math.max(0, R.ann - dt);
    R.fanT = Math.max(0, R.fanT - dt);
    for (var q = 0; q < R.hits.length; q++) if (R.hits[q].st !== 'wait' && R.hits[q] !== R.stopHit) R.hits[q].fx += dt;
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
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var a = R.annIdx + 1; a < R.secs.length; a++) {
      if (R.bp >= R.secs[a].from - 2) { R.annIdx = a; announce(a); }
    }
    while (R.secDone < R.secs.length - 1 && R.bp >= R.secs[R.secDone].to) {
      if (!R.demo && R.secMiss[R.secDone] === 0) {
        game.fx.popup('NICE', W / 2, 470, { color: SEC_COL[R.secDone], size: 84 });
        game.audio.play('se_milestone', 0.45);
      }
      R.secDone++;
    }
    for (var i = 0; i < R.hits.length; i++) {
      var h = R.hits[i];
      if (h.st !== 'wait') continue;
      if (!h.creak && R.bp >= h.b - LEAD) { h.creak = true; creak(h); }
      if ((R.bp - h.b) * SPB > WIN_G) { missHit(h, null); return; }
    }
    if (!R.demo && R.bp >= SONG_END + 0.3) endRun(true);
  }

  // ATTRACT: ゴーストが実ロジックで払う(下・上・横を正しく → 3拍子へ切り替わって下 → 大扇に下へ払ってMISS → 横)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); sw = null; demo.sh = null; demo.x = GH.x; demo.y = GH.y; }
    var SPEED = 320;
    var v, disp;
    if (demo.sh) {
      v = dirVec(demo.gd);
      disp = SW_TH + (R.bp - demo.sh.b) * SPEED;
      demo.x = GH.x + v.x * disp; demo.y = GH.y + v.y * disp;
      demo.press = true;
      if (R.stop > 0) return;
      if (disp < 230) swMove(demo.x, demo.y);
      else { swEnd(demo.x, demo.y); demo.sh = null; }
      return;
    }
    demo.press = false;
    var h = null;
    for (var i = 0; i < R.hits.length; i++) if (R.hits[i].st === 'wait') { h = R.hits[i]; break; }
    if (h && R.stop <= 0) {
      var gd = h.b === DEMO_FAIL_B ? 'down' : (h.t === 'H' ? 'down' : (h.t === 'L' ? 'up' : (h.b % 2 ? 'left' : 'right')));
      disp = SW_TH + (R.bp - h.b) * SPEED;
      if (disp >= 0) {
        demo.sh = h; demo.gd = gd;
        v = dirVec(gd);
        demo.x = GH.x + v.x * disp; demo.y = GH.y + v.y * disp;
        swStart(GH.x, GH.y);
        demo.press = true;
        return;
      }
    }
    demo.x += (GH.x - demo.x) * Math.min(1, dt * 8);
    demo.y += (GH.y - demo.y) * Math.min(1, dt * 8);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawRoom() {
    var si = secIdx(Math.max(0, R.bp));
    game.draw.gradient(0, H, [[0, C.wallT], [0.55, C.wallB], [0.56, C.floorA], [1, C.floorB]]);
    // 障子(1層)
    for (var i = 0; i < 5; i++) {
      var x = 20 + i * 212;
      game.draw.rect(x, 250, 196, 680, C.woodD);
      game.draw.rect(x + 12, 262, 172, 656, C.paper, 0.78);
      for (var gx = 1; gx < 3; gx++) game.draw.rect(x + 12 + gx * 57, 262, 6, 656, C.woodD, 0.8);
      for (var gy = 1; gy < 6; gy++) game.draw.rect(x + 12, 262 + gy * 109, 172, 6, C.woodD, 0.8);
    }
    // 拍型の色に灯る行灯
    var glow = 0.18 + R.pulse * 0.25;
    for (var l = 0; l < 2; l++) {
      var lx = l === 0 ? 110 : 970;
      game.draw.circle(lx, 960, 150, SEC_COL[si], glow * 0.5);
      game.draw.circle(lx, 960, 90, SEC_COL[si], glow);
      game.draw.rect(lx - 40, 900, 80, 120, C.paper);
      game.draw.rect(lx - 40, 900, 80, 120, SEC_COL[si], 0.25 + R.pulse * 0.3);
      game.draw.rect(lx - 46, 890, 92, 14, C.woodD);
      game.draw.rect(lx - 46, 1016, 92, 14, C.woodD);
    }
    // 床板(奥へ詰まる板目)
    game.draw.rect(0, 1050, W, 10, C.ink, 0.5);
    for (var p = 0; p < 9; p++) {
      var y = 1060 + p * p * 11 + p * 20;
      if (y > H) break;
      game.draw.rect(0, y, W, 4, C.floorB, 0.8);
    }
  }

  function activeHit(t) {
    var res = null;
    for (var i = 0; i < R.hits.length; i++) {
      var h = R.hits[i];
      if (h.t !== t) continue;
      if (h.st === 'wait' && R.bp >= h.b - LEAD) return h;
      if (h === R.stopHit) return h;
      if (h.st !== 'wait' && h.fx < 0.4) res = h;
    }
    return res;
  }

  // 動きの先端位置(p: 0=振りかぶり始め / 0.6=構え切り / 1=受け輪に届く拍の頭)
  var REST = { H: { x: 760, y: 980 }, L: { x: 360, y: 1080 }, T: { x: 540, y: 900 } };
  var TOP = { H: { x: 720, y: 430 }, L: { x: 160, y: 1110 }, T: { x: 540, y: 860 } };
  function tipAt(h) {
    var t = h.t;
    if (h.st === 'wait' || h === R.stopHit) {
      var p = h.st === 'wait' ? Math.max(0, Math.min(1, 1 - (h.b - R.bp) / LEAD)) : 1;
      if (p < 0.6) {
        var k = p / 0.6;
        k = 1 - (1 - k) * (1 - k);
        return { x: lerp(REST[t].x, TOP[t].x, k), y: lerp(REST[t].y, TOP[t].y, k), p: p };
      }
      var k2 = (p - 0.6) / 0.4;
      k2 = k2 * k2;
      return { x: lerp(TOP[t].x, CP.x, k2), y: lerp(TOP[t].y, CP.y + (t === 'L' ? 40 : 0), k2), p: p };
    }
    var f = Math.min(1, h.fx / 0.4);
    if (h.st === 'ok') {
      var v = dirVec(h.dir);
      return { x: CP.x + v.x * f * 300, y: CP.y + v.y * f * 300, p: 1, a: 1 - f };
    }
    return { x: lerp(CP.x, REST[t].x, f), y: lerp(CP.y, REST[t].y, f), p: 1, a: 1 - f * 0.5 };
  }

  function drawDevice(t) {
    var h = activeHit(t);
    var tip = h ? tipAt(h) : { x: REST[t].x, y: REST[t].y, p: 0 };
    var e = game.time.elapsed;
    var hl = h && h === R.stopHit;
    var fl = hl && Math.floor(e * 20) % 2 === 0;
    var sc = hl ? 1.3 : 1;
    var warn = h && h.st === 'wait' && tip.p < 0.62 && Math.floor(e * 12) % 2 === 0;
    var tipCol = fl ? C.white : (warn ? C.white : null);
    if (t === 'H') {
      var sx = DOLL_X + 6.5 * DOLL_PX, sy = DOLL_Y - 1.5 * DOLL_PX;
      game.draw.line(sx, sy, tip.x, tip.y, C.ink, 30);
      game.draw.line(sx, sy, tip.x, tip.y, C.wood, 18);
      game.draw.circle(sx, sy, 22, C.woodD);
      uchiwa(tip.x, tip.y, 62 * sc, tipCol || C.gold);
    } else if (t === 'L') {
      var bx = DOLL_X - 5 * DOLL_PX, by = DOLL_Y + 9.5 * DOLL_PX;
      game.draw.line(bx, by, tip.x, tip.y, C.ink, 22);
      game.draw.line(bx, by, tip.x, tip.y, C.woodL, 12);
      var ang = Math.atan2(tip.y - by, tip.x - bx);
      if (!h) ang = Math.PI * 0.85;
      sensu(tip.x, tip.y, ang, 110 * sc, tipCol || C.red, C.gold, h ? 2.2 : 0.6);
    } else {
      var cx = DOLL_X, cy = DOLL_Y + 0.5 * DOLL_PX;
      var shake = h && h.st === 'wait' && tip.p < 0.6 ? Math.sin(e * 60) * 6 : 0;
      var n = 8, len = tip.y - cy;
      for (var i = 0; i < n; i++) {
        var y0 = cy + len * i / n, y1 = cy + len * (i + 1) / n;
        game.draw.line(cx + (i % 2 ? -26 : 26) + shake, y0, cx + (i % 2 ? 26 : -26) + shake, y1, C.ink, 14);
        game.draw.line(cx + (i % 2 ? -26 : 26) + shake, y0, cx + (i % 2 ? 26 : -26) + shake, y1, C.gold, 7);
      }
      var depth = 0.6 + Math.max(0, (tip.y - 860) / 430) * 0.8;
      var pw = 150 * depth * sc, ph = 70 * depth * sc;
      game.draw.rect(tip.x - pw / 2 - 8 + shake, tip.y - ph / 2 - 8, pw + 16, ph + 16, C.ink);
      game.draw.rect(tip.x - pw / 2 + shake, tip.y - ph / 2, pw, ph, tipCol || C.woodL);
      game.draw.rect(tip.x - pw / 2 + shake, tip.y - ph / 2, pw, ph * 0.25, C.paper, 0.6);
    }
  }

  function drawDoll() {
    var e = game.time.elapsed;
    var si = secIdx(Math.max(0, R.bp));
    var sec = R.secs[si];
    ellipseShadow(DOLL_X, DOLL_Y + 10.5 * DOLL_PX, 300, 70, 0.4);
    var frame = R.jolt > 0 ? DOLL_JOLT : (R.wobble > 0 ? DOLL_SMUG : (Math.floor(R.bp) % 4 === 3 ? DOLL_B : DOLL_A));
    var bob = Math.round((-R.pulse * 10 + Math.sin(e * 2.4) * 5) / 4) * 4;
    var sway = R.jolt > 0 ? Math.sin(e * 50) * 8 : 0;
    game.draw.sprite(frame, DOLL_PAL, DOLL_X + sway, DOLL_Y + bob, DOLL_PX, { anchor: 'center' });
    // 胸の歯車: 歯の数=1小節の拍数、1拍で1歯回る
    var gx = DOLL_X + sway, gy = DOLL_Y + 0.5 * DOLL_PX + bob;
    var rot = (Math.max(0, R.bp) - sec.from) / sec.meter * Math.PI * 2;
    game.draw.circle(gx, gy, 64, C.ink);
    game.draw.circle(gx, gy, 54, SEC_COL[si], 0.85);
    for (var i = 0; i < sec.meter; i++) {
      var a = rot + (i / sec.meter) * Math.PI * 2 - Math.PI / 2;
      game.draw.circle(gx + Math.cos(a) * 70, gy + Math.sin(a) * 70, 16, i === 0 ? C.gold : C.woodL);
    }
    if (sec.off) game.draw.circle(gx, gy, 20, C.ink); else game.draw.circle(gx, gy, 20, C.paper);
    game.draw.circle(gx, gy - 6, 8 + R.pulse * 8, C.white, 0.7);
  }

  function drawHero() {
    var e = game.time.elapsed;
    ellipseShadow(HERO_X, HERO_Y + 120, 140, 34, 0.45);
    var wob = R.wobble > 0 ? Math.sin(e * 26) * 22 * R.wobble : 0;
    var frame = Math.floor(Math.max(0, R.bp)) % 2 === 0 ? HERO_A : HERO_B;
    game.draw.sprite(frame, HERO_PAL, HERO_X + wob, HERO_Y + Math.round(Math.sin(e * 3) * 2) * 4, 18, { anchor: 'center' });
    // 扇: 払った向きへ振り抜く
    var fx = HERO_X + 120 + wob, fy = HERO_Y - 120, ang = -Math.PI * 0.6;
    if (R.fanT > 0 && R.fanDir) {
      var v = dirVec(R.fanDir), k = 1 - R.fanT / 0.3;
      fx = lerp(CP.x, CP.x + v.x * 140, k); fy = lerp(CP.y + 70, CP.y + 70 + v.y * 140, k);
      ang = Math.atan2(v.y, v.x);
      game.draw.line(HERO_X + 90, HERO_Y - 60, fx, fy, C.skin, 22);
    } else if (R.wobble > 0) {
      ang = Math.PI * 0.4;
      fx = HERO_X + 150 + wob; fy = HERO_Y - 40;
    }
    sensu(fx, fy, ang, 110, C.indigo, C.gold, 1.6);
  }

  function drawCatch() {
    var si = secIdx(Math.max(0, R.bp));
    var r = 100 + R.pulse * 26;
    ring(CP.x, CP.y, r, SEC_COL[si], 10, 0.12 + R.pulse * 0.15);
    ring(CP.x, CP.y, 40, C.paper, 6, 0);
  }

  function drawStrip() {
    if (R.ready > 0) return;
    var bp = Math.max(0, R.bp);
    var si = secIdx(bp), sec = R.secs[si];
    var rel = bp - sec.from, bar = Math.floor(rel / sec.meter);
    var barStart = sec.from + bar * sec.meter;
    var x0 = 70, x1 = 1010, y = 330, cw = (x1 - x0) / sec.meter;
    var e = game.time.elapsed;
    var border = SEC_COL[si];
    if (R.ann > 0 && R.annSec !== si && Math.floor(e * 8) % 2 === 0) border = SEC_COL[R.annSec];
    game.draw.rect(x0 - 14, y - 74, x1 - x0 + 28, 148, border);
    game.draw.rect(x0 - 4, y - 64, x1 - x0 + 8, 128, C.ink);
    var cur = Math.floor(bp - barStart);
    for (var i = 0; i < sec.meter; i++) {
      var lit = i === cur;
      game.draw.rect(x0 + i * cw + 8, y - 56, cw - 16, 112, lit ? SEC_COL[si] : '#3a2414', lit ? 0.55 : 1);
      game.draw.circle(x0 + (i + 0.5) * cw, y + 44, i === 0 ? 10 : 7, C.paper);
      if (sec.off) game.draw.circle(x0 + (i + 1) * cw, y + 44, 7, C.red);
    }
    // 次の拍型の予告(縁の点)
    if (R.ann > 0 && R.annSec !== si) {
      var ns = R.secs[R.annSec];
      for (var d = 0; d < ns.meter; d++) game.draw.circle(x1 - 30 - d * 34, y - 92, 12, SEC_COL[R.annSec]);
    }
    for (var k = 0; k < R.hits.length; k++) {
      var h = R.hits[k];
      if (h.b < barStart || h.b >= barStart + sec.meter) continue;
      var hx = x0 + (h.b - barStart + 0.5) * cw;
      var dim = h.st === 'ok' ? 0.35 : 1;
      if (h.st === 'miss') { game.draw.circle(hx, y, 26, C.red, 0.6); continue; }
      if (h.t === 'H') { game.draw.circle(hx, y - 24, 26, C.gold, dim); game.draw.line(hx, y - 4, hx, y + 20, C.woodL, 8); }
      else if (h.t === 'L') { sensu(hx, y + 24, -Math.PI / 2, 44, C.red, C.gold, 1.6); }
      else { game.draw.rect(hx - 34, y - 16, 68, 32, C.woodL, dim); game.draw.rect(hx - 34, y - 16, 68, 8, C.paper, dim); }
      // 最初の拍型だけ払う向きの手がかりを添える
      if ((si === 0 || R.demo) && h.st === 'wait') arrowIcon(hx + 50, y, h.t === 'H' ? 'down' : (h.t === 'L' ? 'up' : 'right'), 40, C.paper, 7);
    }
    var px = x0 + (bp - barStart + 0.5) * cw;
    if (px > x1) px -= sec.meter * cw;
    game.draw.rect(px - 4, y - 64, 8, 128, C.white, 0.85);
  }

  function drawWorld() {
    drawRoom();
    drawStrip();
    drawDoll();
    drawCatch();
    drawDevice('L');
    drawDevice('T');
    drawDevice('H');
    drawHero();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.92);
    txt('SCORE ' + R.score, 40, 74, 48, C.paper, 'left');
    txt('BEST ' + game.best, W - 40, 74, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      sensu(W - 90 - i * 100, 172, -Math.PI / 2, 40, i < R.lives ? C.indigo : '#3a2a20', i < R.lives ? C.gold : '#3a2a20', 1.8);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 158, 54, C.gold, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / SONG_END));
    game.draw.rect(40, 206, W - 80, 14, '#3a2414');
    for (var s = 0; s < PLAY_SECS.length; s++) {
      var a = PLAY_SECS[s].from / SONG_END, b = Math.min(progress, PLAY_SECS[s].to / SONG_END);
      if (b > a) game.draw.rect(40 + (W - 80) * a, 206, (W - 80) * (b - a), 14, SEC_COL[s]);
    }
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, CP.y - 40, 120, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.25, W, H * 0.34, C.ink, 0.88);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, R.ok ? C.gold : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, C.paper);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.42, 34, C.gold);
    var tots = [0, 0, 0];
    for (var i = 0; i < R.hits.length; i++) tots[secIdx(R.hits[i].b)]++;
    for (var s = 0; s < 3; s++) {
      var sx = W / 2 + (s - 1) * 280;
      game.draw.rect(sx - 110, H * 0.445, 220, 70, SEC_COL[s], 0.3);
      txt(R.secOk[s] + '/' + tots[s], sx, H * 0.465, 40, SEC_COL[s]);
    }
    txt('x' + R.maxCombo, W / 2, H * 0.51, 44, C.paper);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.55, 54, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.55, 42, C.paper);
    if (!R.ok) {
      var left = 0;
      for (var k = 0; k < R.hits.length; k++) if (R.hits[k].st === 'wait') left++;
      txt('あと' + left + '本', W / 2, H * 0.58, 46, C.red);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.round(Math.sin(e * 2.2) * 2) * 4;
    game.draw.rect(0, 0, W, 232, C.ink, 0.92);
    game.draw.text(GAME_TITLE, W / 2 + 8, 108 + bob, { size: 112, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 100 + bob, { size: 112, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 200, 40, C.paper);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.paper);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R || R.over) return;
    swStart(x, y);
    game.audio.tone(700, 0.03, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !sw) return;
    var res = swMove(x, y);
    if (res === 'air') {
      game.fx.burst(CP.x, CP.y, { color: C.paper, count: 5, speed: 140 });
      game.audio.tone(900, 0.06, { wave: 'triangle', volume: 0.06, slide: -500 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || R.over || !sw) return;
    var res = swEnd(x, y);
    if (res === 'air' || res === 'tap') {
      if (res === 'tap') { R.fanDir = 'up'; R.fanT = 0.15; }
      game.fx.burst(x, y, { color: C.paper, count: 4, speed: 100 });
      game.audio.tone(res === 'air' ? 900 : 600, 0.05, { wave: 'triangle', volume: 0.05, slide: -300 });
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.paper);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, straight: R.secOk[0], waltz: R.secOk[1], offbeat: R.secOk[2] };
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
