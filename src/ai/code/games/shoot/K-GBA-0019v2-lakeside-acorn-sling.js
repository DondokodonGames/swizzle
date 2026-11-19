// K-GBA-0019v2-lakeside-acorn-sling.js
// 湖畔どんぐりスリング — 張り綱の灯りが刻む拍を数えながら投てき器を引き絞り、大きな赤い灯りの拍でちょうど放して枝の輪へ木の実を通す
// 操作: 画面のどこでも押して下へ引くとゴムが伸びる(引く長さ=届く高さ。右のゲージで光っている輪と同じ色の帯に合わせる)。大きな赤い灯りがともる拍の頭で指を離す。前半は各小節の4拍目、後半は2拍目と4拍目
// 終わり: 8小節(約19秒)を乗り切ればCLEAR。拍ずれ・高さ違い・放し忘れのMISSが3回でGAME OVER
// @mechanic: slingshot
// @theme: lakeside_camp_acorn_sling
// 世界観: 湖畔のキャンプ場。ボーイスカウトの少年がゴムの投てき器を構え、張り綱の灯りが刻む拍に合わせて木の実を枝に吊った輪へ通す
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 90s BIG SPRITE

(function(game) {
  var STYLE = { bg: ['#2b2350', '#d9784a', '#f2b766'], main: ['#c9b27a', '#3f5a2a', '#7a4a22'], accent: ['#e8402a', '#ffd34a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大なスカウト少年、足元に楕円の床影、背景は湖畔の横1層で構えと間合いを見せる
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], sky2: STYLE.bg[2],
    khaki: STYLE.main[0], green: STYLE.main[1], wood: STYLE.main[2],
    red: STYLE.accent[0], gold: STYLE.accent[1],
    ink: '#1c140c', white: '#fff6e0', hill: '#33405a', lake: '#3a5f8a', lakeHi: '#9cc0e0',
    grass0: '#4f7a34', grass1: '#2a4420', bark: '#5a3a1e', barkHi: '#7c5430', leaf: '#2c5428', leafHi: '#477a36',
    skin: '#f2c08a', skinSh: '#c98f5a', rope: '#e2d2a8', dim: '#6a5a6e', good: '#8af06a', bad: '#ff5a4a',
    tent: '#d8823a', tentSh: '#9a5424'
  };
  var BAND_COL = ['#3fa7e0', '#6ad04a', '#f0603a'];

  var GAME_TITLE = 'ACORN SLING';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 8;
  var SONG_BEATS = BARS * 4;
  var WIN_P = 0.07, WIN_G = 0.15, CATCH = 0.32;
  var LIVES = 3;
  // 放す拍(表拍の頭)。前半4小節は4拍目、後半4小節は2拍目と4拍目
  var SHOTS = [3, 7, 11, 15, 17, 19, 21, 23, 25, 27, 29, 31];
  var DEMO_SHOTS = [3, 7, 11];
  var DEMO_BANDS = [1, 2, 0];
  var DEMO_CYCLE = 12 * SPB + 1.2;
  var MAXPULL = 360;
  var BAND_EDGE = [70, 170, 270];
  var BAND_MID = [120, 220, 320];

  // 輪(低・中・高)。引く長さの帯と色で対応
  var RINGS = [
    { x: 790, y: 1050 },
    { x: 700, y: 810 },
    { x: 770, y: 570 }
  ];
  var RING_RX = 62, RING_RY = 80;
  var KID_X = 290, KID_Y = 1500, KID_PX = 24;
  var HAND_X = 560, HAND_Y = 1420;
  var POUCH_X = 548, POUCH_Y = 1318;
  var GAUGE_X = 900, GAUGE_TOP = 1380, GAUGE_BOT = 1760;
  var LANTERN_X = [150, 330, 510, 690];
  var ROPE_Y = 262;

  // 伴奏(8分刻み、4小節で一巡)。0 は休符
  var MEL = ['G4', 0, 'B4', 'D5', 'E5', 0, 'D5', 0, 'C5', 0, 'E5', 'G5', 'E5', 0, 'D5', 0,
             'B4', 0, 'D5', 'G5', 'A5', 0, 'G5', 0, 'E5', 'D5', 'C5', 0, 'D5', 0, 0, 0];
  var BASS = ['G2', 'G2', 'D3', 'D3', 'C3', 'C3', 'G2', 'G2', 'E2', 'E2', 'B2', 'B2', 'C3', 'D3', 'G2', 'G2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, gx: POUCH_X, gy: POUCH_Y + 200 };

  // ── スプライト ─────────────────────────────────────────
  var KID_BASE = [
    '.....OOOOOO.....',
    '....OHHHHHHO....',
    '....OHHHHHHO....',
    '...OhhhhhhhhO...',
    '.OOHHHHHHHHHHOO.',
    '....OSSSSSSSO...',
    '....OSSESSESO...',
    '....OSSSSSSSO...',
    '....OSSSMMSSO...',
    '.....OSSSSSO....',
    '....ORRRRRRRO...',
    '...OKKKRRRKKKO..',
    '..OKKKKKRKKKKKO.',
    '..OKKKKKKKKKKKO.',
    '...OKKKKKKKKKO..',
    '....OKKKKKKKO...',
    '....OkkkkkkkO...',
    '....OGGGGGGGO...',
    '....OGGGOGGGO...',
    '....OSSO.OSSO...',
    '....OWWO.OWWO...',
    '....OWWO.OWWO...',
    '...OBBBO.OBBBO..',
    '...OOOOO.OOOOO..'
  ];
  function kidFrame(r6, r8, r9) {
    var f = KID_BASE.slice();
    if (r6) f[6] = r6;
    if (r8) f[8] = r8;
    if (r9) f[9] = r9;
    return f;
  }
  var KID_A = kidFrame();
  var KID_BLINK = kidFrame('....OSSOSSOSO...');
  var KID_PULL = kidFrame(null, '....OSSWWWSSO...');
  var KID_OOPS = kidFrame('....OSEESEESO...', '....OSSMMMSSO...', '.....OSMMMSO....');
  var KID_PAL = {
    O: C.ink, H: '#7a6a34', h: '#3d3418', S: C.skin, E: C.ink, M: '#8a3a2a', W: '#f4efe0',
    R: C.red, K: C.khaki, k: '#9c8650', G: C.green, B: '#4a2e18'
  };
  var LANTERN = [
    '..ddd..',
    '.lLLLl.',
    'lLLLLLl',
    'dLLLLLd',
    'lLLLLLl',
    'dLLLLLd',
    'lLLLLLl',
    '.lLLLl.',
    '..ddd..'
  ];
  var ACORN = [
    '.ccc.',
    'ccccc',
    '.aaa.',
    'aaaaa',
    'aaaaa',
    '.aaa.'
  ];
  var ACORN_PAL = { c: '#5a3a1a', a: '#c8843a' };
  var PINE = [
    '..#..',
    '.###.',
    '..#..',
    '.###.',
    '#####',
    '.###.',
    '#####',
    '..#..'
  ];
  var TENT = [
    '....o....',
    '...ooo...',
    '..ooooo..',
    '.ooookooo',
    'ooookkkoo',
    'oookkkkko'
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    var n = 10;
    for (var i = 0; i < n; i++) {
      var y0 = -ry + (i / n) * ry * 2, y1 = y0 + ry * 2 / n;
      var ym = (y0 + y1) / 2;
      var hw = rx * Math.sqrt(Math.max(0, 1 - (ym * ym) / (ry * ry)));
      game.draw.rect(cx - hw, cy + y0, hw * 2, y1 - y0 + 1, col, a);
    }
  }
  function ringLine(cx, cy, rx, ry, col, w) {
    var n = 22, px = cx + rx, py = cy;
    for (var i = 1; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      game.draw.line(px, py, x, y, col, w);
      game.draw.circle(x, y, w / 2, col);
      px = x; py = y;
    }
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function bandOf(p) { return p < BAND_EDGE[0] ? -1 : (p < BAND_EDGE[1] ? 0 : (p < BAND_EDGE[2] ? 1 : 2)); }
  function pouchPos(p) { return { x: POUCH_X - p * 0.3, y: POUCH_Y + p * 0.95 }; }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var list = isDemo ? DEMO_SHOTS : SHOTS;
    var shots = [], prev = -1, prev2 = -1;
    for (var i = 0; i < list.length; i++) {
      var b;
      if (isDemo) b = DEMO_BANDS[i];
      else {
        b = Math.floor(game.random(0, 3)) % 3;
        if (b === prev && b === prev2) b = (b + 1) % 3;
      }
      prev2 = prev; prev = b;
      shots.push({ beat: list[i], band: b, st: 'wait' });
    }
    return {
      demo: isDemo, shots: shots, songT: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, pull: null, nut: null,
      stop: 0, stopShot: null, pulse: 0, sway: 0, oops: 0, kick: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MEL.length; i++) notes.push([MEL[i] || 'R', 0.5]);
    for (var j = 0; j < BASS.length; j++) bass.push([BASS[j], 1]);
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏: 8分でメロ、4分でベース+拍木
  function playStep(s) {
    var m = MEL[s % 32];
    if (m) game.audio.tone(m, SPB * 0.42, { wave: 'triangle', volume: 0.06 });
    if (s % 2 === 0) {
      var b = (s / 2) % 16;
      game.audio.tone(BASS[b], SPB * 0.7, { wave: 'square', volume: 0.045 });
      game.audio.tone(b % 4 === 0 ? 1500 : 1050, 0.03, { wave: 'square', volume: 0.04 });
    }
  }

  function pendingShotAt(beat) {
    for (var i = 0; i < R.shots.length; i++) if (R.shots[i].beat === beat && R.shots[i].st === 'wait') return R.shots[i];
    return null;
  }
  function nextShot() {
    for (var i = 0; i < R.shots.length; i++) if (R.shots[i].st === 'wait') return R.shots[i];
    return null;
  }

  function onBeat(b) {
    R.pulse = 1; R.sway = 1;
    if (R.demo) return;
    if (pendingShotAt(b)) game.audio.tone('E6', 0.12, { wave: 'square', volume: 0.07 });
    else if (pendingShotAt(b + 1)) game.audio.tone('B5', 0.05, { wave: 'triangle', volume: 0.06 });
  }

  function beginPull(y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return false;
    R.pull = { y0: y, p: 0, band: -1 };
    return true;
  }
  function setPull(p) {
    if (!R.pull) return 0;
    R.pull.p = clamp(p, 0, MAXPULL);
    var b = bandOf(R.pull.p);
    if (b > R.pull.band) { R.pull.band = b; return b + 1; }
    R.pull.band = b;
    return 0;
  }

  function launchNut(tx, ty, after) {
    var pp = pouchPos(R.pull ? R.pull.p : 0);
    R.nut = { sx: pp.x, sy: pp.y, ex: tx, ey: ty, t: 0, dur: 0.24, after: after };
    R.kick = 0.25;
  }

  function releasePull() {
    if (!R || !R.pull) return 'none';
    if (R.stop > 0 || R.over) { R.pull = null; return 'none'; }
    var band = bandOf(R.pull.p);
    if (band < 0) { R.pull = null; return 'weak'; }
    var best = null, bestD = 1e9;
    for (var i = 0; i < R.shots.length; i++) {
      var s = R.shots[i];
      if (s.st !== 'wait') continue;
      var d = R.songT - s.beat * SPB;
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = s; }
    }
    var ring = RINGS[band];
    if (!best || Math.abs(bestD) > CATCH) {
      launchNut(ring.x, ring.y - RING_RY - 20, 'bounce');
      R.pull = null;
      R.combo = 0;
      return 'stray';
    }
    var target = RINGS[best.band];
    if (Math.abs(bestD) > WIN_G) {
      launchNut(target.x + 40, target.y + (bestD < 0 ? -RING_RY - 70 : RING_RY + 70), 'fall');
      R.pull = null;
      missShot(best);
      return 'miss';
    }
    if (band !== best.band) {
      launchNut(ring.x - RING_RX, ring.y - RING_RY * 0.6, 'bounce');
      R.pull = null;
      missShot(best);
      return 'miss';
    }
    launchNut(target.x, target.y, 'through');
    R.pull = null;
    hitShot(best, Math.abs(bestD) <= WIN_P ? 'PERFECT' : 'GOOD');
    return 'hit';
  }

  function hitShot(s, grade) {
    s.st = 'hit';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    var rg = RINGS[s.band];
    game.feedback.good(rg.x, rg.y, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 18 : 10 });
    game.fx.burst(rg.x, rg.y, { color: BAND_COL[s.band], count: 14, speed: 380 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone('G6', 0.08, { wave: 'square', volume: 0.06 });
    if (!R.demo && R.combo % 4 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.24, { color: C.gold, size: 66 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missShot(s) {
    s.st = 'miss';
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopShot = s; R.oops = 1.1;
    if (!R.demo) game.audio.tone(150, 0.26, { wave: 'sawtooth', volume: 0.1, slide: -70 });
  }

  function releaseStop() {
    var s = R.stopShot;
    R.stopShot = null;
    if (!s) return;
    var rg = RINGS[s.band];
    game.feedback.bad(rg.x, rg.y, { text: 'MISS' });
    game.fx.burst(rg.x, rg.y, { color: C.leafHi, count: 12, speed: 260 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8; R.pull = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(RINGS[i].x, RINGS[i].y, { color: BAND_COL[i], count: 22, speed: 460 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepNut(dt) {
    var n = R.nut;
    if (!n) return;
    n.t += dt;
    if (n.t > n.dur + 0.6) R.nut = null;
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.sway = Math.max(0, R.sway - dt * 2.2);
    R.oops = Math.max(0, R.oops - dt);
    R.kick = Math.max(0, R.kick - dt);
    stepNut(dt);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('D5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.shots.length; i++) {
      var s = R.shots[i];
      if (s.st === 'wait' && R.songT > s.beat * SPB + WIN_G) { missShot(s); return; }
    }
    if (!R.demo && R.songT >= SONG_BEATS * SPB) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2本成功、3本目は引きすぎて高さ違いのMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) R = newRun(true);
    var nx = nextShot();
    if (nx && R.stop <= 0) {
      var until = nx.beat * SPB - R.songT;
      var idx = R.shots.indexOf(nx);
      var wantP = BAND_MID[idx === 2 ? 2 : nx.band];
      if (!R.pull && until < SPB * 2.3 && until > 0) beginPull(POUCH_Y);
      if (R.pull) {
        var k = clamp((SPB * 2.3 - until) / (SPB * 1.3), 0, 1);
        setPull(wantP * k);
        if (until <= 0) releasePull();
      }
    }
    var pp = pouchPos(R.pull ? R.pull.p : 0);
    var tx = R.pull ? pp.x : POUCH_X - 40, ty = R.pull ? pp.y : POUCH_Y + 200;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 16);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 16);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, 1000, [[0, C.sky0], [0.62, C.sky1], [1, C.sky2]]);
    game.draw.circle(300, 930, 90, '#ffe2a0', 0.9);
    game.draw.circle(300, 930, 130, '#ffd080', 0.25);
    // 対岸の丘と松林(横1層)
    for (var i = 0; i < 9; i++) game.draw.circle(60 + i * 130, 1010 + (i % 2) * 20, 110, C.hill);
    game.draw.rect(0, 990, W, 40, C.hill);
    for (var p = 0; p < 7; p++) game.draw.sprite(PINE, { '#': '#26303e' }, 40 + p * 165, 960 + (p % 3) * 14, 14, { anchor: 'center' });
    // 湖面
    game.draw.gradient(1030, 1240, [[0, C.lake], [1, '#24405e']]);
    for (var k = 0; k < 6; k++) {
      var wy = 1060 + k * 30, wx = ((e * (30 + k * 8) + k * 170) % (W + 300)) - 150;
      game.draw.rect(wx, wy, 120 + k * 10, 4, C.lakeHi, 0.45);
      game.draw.rect(300 - 50 + Math.sin(e * 2 + k) * 10, wy + 6, 100 - k * 12, 4, '#ffd080', 0.35);
    }
    // 岸と草地
    game.draw.gradient(1240, H, [[0, C.grass0], [1, C.grass1]]);
    game.draw.sprite(TENT, { o: C.tent, k: C.tentSh }, 120, 1190, 18, { anchor: 'center' });
    for (var g = 0; g < 14; g++) game.draw.rect(30 + g * 78, 1252 + (g % 3) * 22, 8, 22, '#6a9a46');
  }

  function drawTree() {
    var e = game.time.elapsed;
    game.draw.rect(930, 380, 64, 880, C.bark);
    game.draw.rect(930, 380, 16, 880, C.barkHi);
    for (var i = 0; i < 3; i++) {
      var rg = RINGS[i];
      var by = rg.y - RING_RY - 70;
      game.draw.line(940, by + 20, rg.x - 40, by, C.bark, 22);
      game.draw.line(rg.x, by, rg.x, rg.y - RING_RY, C.rope, 4);
    }
    game.draw.circle(990, 300, 150, C.leaf);
    game.draw.circle(880, 360, 110, C.leaf);
    game.draw.circle(960, 260, 90, C.leafHi, 0.6 + 0.1 * Math.sin(e * 1.5));
  }

  function drawRings() {
    var nx = R.over ? null : nextShot();
    var e = game.time.elapsed;
    for (var i = 0; i < 3; i++) {
      var rg = RINGS[i];
      var stopHere = R.stopShot && R.stopShot.band === i;
      var sc = stopHere ? 1.3 : 1 + R.pulse * 0.06;
      var isTarget = nx && nx.band === i;
      var col = BAND_COL[i];
      if (stopHere) {
        col = Math.floor(e * 20) % 2 === 0 ? C.white : C.bad;
      } else if (isTarget) {
        var until = nx.beat * SPB - R.songT;
        game.draw.circle(rg.x, rg.y, RING_RY + 30, col, 0.18 + R.pulse * 0.15);
        // 迫る輪: 放す拍の頭で輪と重なる
        if (until < SPB * 2 && until > -0.05) {
          var k = Math.max(0, until) / (SPB * 2);
          ringLine(rg.x, rg.y, RING_RX * (1 + k * 1.6), RING_RY * (1 + k * 1.6), C.gold, 5);
        }
      }
      ringLine(rg.x, rg.y, RING_RX * sc, RING_RY * sc, C.ink, 20);
      ringLine(rg.x, rg.y, RING_RX * sc, RING_RY * sc, isTarget || stopHere ? col : C.dim, 12);
      // 輪の色リボン
      game.draw.rect(rg.x - 10, rg.y - RING_RY * sc - 14, 20, 26, BAND_COL[i]);
    }
  }

  function drawLanterns() {
    var e = game.time.elapsed;
    var prevX = 40, prevY = ROPE_Y;
    for (var x = 120; x <= 920; x += 80) {
      var y = ROPE_Y + Math.sin(((x - 40) / 880) * Math.PI) * 26;
      game.draw.line(prevX, prevY, x, y, C.rope, 4);
      prevX = x; prevY = y;
    }
    var bar = R.beatIdx < 0 ? 0 : Math.floor(R.beatIdx / 4);
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % 4;
    for (var i = 0; i < 4; i++) {
      var beat = bar * 4 + i;
      var cue = !!pendingShotAt(beat);
      for (var j = 0; j < R.shots.length; j++) if (R.shots[j].beat === beat) cue = true;
      var lx = LANTERN_X[i];
      var ly = ROPE_Y + Math.sin(((lx - 40) / 880) * Math.PI) * 26 + 62;
      var sway = Math.sin(e * 3 + i) * 4 + R.sway * 10 * (i % 2 === 0 ? 1 : -1);
      var lit = i === inBar;
      var warn = cue && i === inBar + 1 && Math.floor(e * 10) % 2 === 0;
      var px = cue ? 15 : 10;
      var body = cue ? (lit ? '#ff6a3a' : (warn ? '#ff9a5a' : '#8a3a2a')) : (lit ? C.gold : '#7a6a4a');
      if (lit) game.draw.circle(lx + sway, ly, cue ? 110 : 70, cue ? C.red : C.gold, 0.25 + R.pulse * 0.25);
      game.draw.line(lx, ly - 70, lx + sway, ly - 30, C.rope, 3);
      game.draw.sprite(LANTERN, { d: '#2a1a10', l: cue ? '#c8402a' : '#b89a4a', L: body }, lx + sway, ly, px, { anchor: 'center' });
    }
  }

  function drawKid() {
    var e = game.time.elapsed;
    var p = R.pull ? R.pull.p : 0;
    var lean = -p * 0.05 + (R.kick > 0 ? R.kick * 24 : 0);
    var bob = Math.sin(e * 3.2) * 4;
    ellipse(KID_X + 10, 1792, 210, 30, '#000000', 0.32);
    var frame = R.oops > 0 ? KID_OOPS : (R.pull ? KID_PULL : (Math.floor(e * 1.4) % 5 === 0 ? KID_BLINK : KID_A));
    game.draw.sprite(frame, KID_PAL, KID_X + lean, KID_Y + bob, KID_PX, { anchor: 'center' });
    var sh1x = 196 + lean, sh2x = 400 + lean, shy = 1490 + bob;
    var hx = HAND_X + lean * 0.4, hy = HAND_Y + bob * 0.5;
    var pp = pouchPos(p);
    pp.x += lean * 0.4;
    // 前の腕(投てき器を持つ)
    game.draw.line(sh2x, shy, hx, hy, C.ink, 40);
    game.draw.line(sh2x, shy, hx, hy, C.khaki, 28);
    // 投てき器
    game.draw.line(hx, hy + 30, hx, hy - 50, C.ink, 20);
    game.draw.line(hx, hy - 50, hx - 38, hy - 112, C.ink, 18);
    game.draw.line(hx, hy - 50, hx + 38, hy - 112, C.ink, 18);
    game.draw.line(hx, hy + 30, hx, hy - 50, C.wood, 12);
    game.draw.line(hx, hy - 50, hx - 38, hy - 112, C.wood, 10);
    game.draw.line(hx, hy - 50, hx + 38, hy - 112, C.wood, 10);
    game.draw.circle(hx, hy, 24, C.ink);
    game.draw.circle(hx, hy, 18, C.skin);
    // ゴム(引く強さで色が帯の色になる)
    var band = bandOf(p);
    var rub = band >= 0 ? BAND_COL[band] : '#c86a5a';
    game.draw.line(hx - 38, hy - 112, pp.x, pp.y, rub, 8);
    game.draw.line(hx + 38, hy - 112, pp.x, pp.y, rub, 8);
    // 後ろの腕(玉を引く)
    game.draw.line(sh1x, shy, pp.x - 10, pp.y + 10, C.ink, 40);
    game.draw.line(sh1x, shy, pp.x - 10, pp.y + 10, C.khaki, 28);
    game.draw.circle(pp.x, pp.y, 26, C.ink);
    game.draw.circle(pp.x, pp.y, 20, C.skin);
    if (!R.nut || R.nut.t > R.nut.dur) game.draw.sprite(ACORN, ACORN_PAL, pp.x + 4, pp.y - 26, 6, { anchor: 'center' });
  }

  function drawNut() {
    var n = R.nut;
    if (!n) return;
    var u = Math.min(1, n.t / n.dur);
    var x = n.sx + (n.ex - n.sx) * u;
    var y = n.sy + (n.ey - n.sy) * u - Math.sin(u * Math.PI) * 160;
    if (n.t > n.dur) {
      var a = n.t - n.dur;
      if (n.after === 'through') { x = n.ex + a * 900; y = n.ey + a * a * 900; }
      else if (n.after === 'bounce') { x = n.ex - a * 260; y = n.ey - 260 * a + 1600 * a * a; }
      else { x = n.ex + a * 300; y = n.ey + 1400 * a * a; }
    }
    for (var t = 1; t <= 3; t++) game.draw.circle(x - t * 18, y + t * 10, 10 - t * 2, C.white, 0.3);
    game.draw.sprite(ACORN, ACORN_PAL, x, y, 7, { anchor: 'center' });
  }

  function drawGauge() {
    var nx = R.over ? null : nextShot();
    var e = game.time.elapsed;
    var scale = (GAUGE_BOT - GAUGE_TOP) / MAXPULL;
    game.draw.rect(GAUGE_X - 46, GAUGE_TOP - 16, 92, GAUGE_BOT - GAUGE_TOP + 32, C.ink, 0.7);
    for (var i = 0; i < 3; i++) {
      var y0 = GAUGE_BOT - (i < 2 ? BAND_EDGE[i + 1] : MAXPULL) * scale;
      var y1 = GAUGE_BOT - BAND_EDGE[i] * scale;
      var hot = nx && nx.band === i;
      var a = hot ? (0.75 + 0.25 * Math.sin(e * 12)) : 0.35;
      game.draw.rect(GAUGE_X - 34, y0 + 3, 68, y1 - y0 - 6, BAND_COL[i], a);
      if (hot) {
        game.draw.rect(GAUGE_X - 46, y0, 8, y1 - y0, C.white);
        game.draw.rect(GAUGE_X + 38, y0, 8, y1 - y0, C.white);
      }
    }
    game.draw.rect(GAUGE_X - 34, GAUGE_BOT - BAND_EDGE[0] * scale, 68, BAND_EDGE[0] * scale, '#3a2e2a');
    var p = R.pull ? R.pull.p : 0;
    var my = GAUGE_BOT - p * scale;
    game.draw.rect(GAUGE_X - 56, my - 5, 112, 10, C.white);
    game.draw.sprite(ACORN, ACORN_PAL, GAUGE_X - 80, my, 6, { anchor: 'center' });
  }

  function drawWorld() {
    drawBg();
    drawTree();
    drawRings();
    drawLanterns();
    drawKid();
    drawNut();
    drawGauge();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.sprite(ACORN, on ? ACORN_PAL : { c: '#3a3040', a: '#5a5060' }, W - 70 - i * 64, 150, 8, { anchor: 'center' });
    }
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 40, C.gold, 'left');
    var progress = Math.min(1, R.songT / (SONG_BEATS * SPB));
    game.draw.rect(40, 200, W - 80, 14, C.ink, 0.6);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.36, 100, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.34, C.ink, 0.78);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 34, C.khaki);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.43, 34, C.khaki);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.48, 50, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.48, 40, C.gold);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS * SPB - R.songT) / (4 * SPB)));
      txt('あと' + left + '小節', W / 2, H * 0.52, 44, C.gold);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, H * 0.06 + 6 + bob, { size: 100, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, H * 0.06 + bob, { size: 100, color: C.red, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 3, H * 0.06 + bob - 4, { size: 100, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, H * 0.105, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (beginPull(y)) game.audio.tone(300, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var up = setPull(y - R.pull.y0);
    if (up > 0) game.audio.tone(260 + up * 130, 0.05, { wave: 'triangle', volume: 0.07 });
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var res = releasePull();
    if (res === 'weak') {
      game.audio.tone(140, 0.08, { wave: 'square', volume: 0.06 });
      game.fx.burst(POUCH_X, POUCH_Y, { color: C.khaki, count: 5, speed: 120 });
    } else if (res !== 'none') {
      game.audio.play('se_jump', 0.35);
      if (res === 'stray') game.fx.burst(POUCH_X, POUCH_Y, { color: C.dim, count: 6, speed: 160 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: !!R.pull, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo };
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
