// K-DS-0034v2-marble-shop-rubber-bed.js
// ビー玉はじき台 — 段々の冷まし棚を拍ごとに一段ずつ転げ落ちてくるビー玉を数えながら受け台のゴムを引き絞り、玉が台に触れる拍の頭でちょうど放して打ち返す。2小節ごとにテンポが上がる
// 操作: 画面のどこでも押して下へ引くと受け台のゴムが伸びる(十分に引くと台の柱が光り構えの音)。玉は棚を拍ごとに一段ずつ落ち(コツ・コツ・コツと3回鳴る)、4つ目の拍の頭で受け台に触れる。その瞬間に指を離して打ち返す(拍の頭からのずれでPERFECT/GOOD)。玉が無い時の空撃ちは罰なし。引きが足りない・早離しで台がゆるんだまま・離し遅れはMISS
// 終わり: 8小節(84→98→112→126BPMと2小節ごとに加速、加速の2拍前に歯車と上昇音で予告・約19秒・14玉)を乗り切ればCLEAR。MISS 3回でGAME OVER
// @mechanic: slingshot
// @theme: glass_marble_rubber_bed
// 世界観: ガラス玉工房の冷まし棚で、玉職人が段々の棚を拍ごとに転げ落ちてくるビー玉を、ゴム張りの受け台で打ち返して上の受け箱へ戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ・到達テンポ)
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var STYLE = { bg: ['#34423a', '#5d6b52', '#9c9a70'], main: ['#e2d6a8', '#86a596', '#c98a58'], accent: ['#dc6448', '#f0cf68'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 日焼けした液晶の低彩度・少色。太く単純な形で密度を抑え、細かい液晶の格子を薄く重ねる
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], bg2: STYLE.bg[2],
    cream: STYLE.main[0], sage: STYLE.main[1], clay: STYLE.main[2],
    red: STYLE.accent[0], yel: STYLE.accent[1],
    ink: '#1e2620', wood: '#7a5a3c', woodDk: '#4e3a28', glass: '#9fc7c4', glassHi: '#eef4e4',
    rubber: '#a8503c', steel: '#56625c', good: '#a8d878', white: '#f4f0dc'
  };

  var GAME_TITLE = 'MARBLE BOUNCE';
  var STAGES = [84, 98, 112, 126];
  var STAGE_BEATS = 8;
  var SONG_BEATS = STAGES.length * STAGE_BEATS;
  var WIN_P = 0.07, WIN_G = 0.15;
  var LIVES = 3;
  var LEADB = 3.5;            // 玉は台に触れる3.5拍前に窯の口から出る(予告)
  // 玉が受け台に触れる拍(各小節の1・3拍目)。加速の切り替わりの拍にも着く
  var LANDS = [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
  var DEMO_LANDS = [4, 6, 8];
  var DEMO_BEATS = 9;
  var DEMO_CYCLE = DEMO_BEATS * 60 / STAGES[0] + 1.3;
  var MAXPULL = 260, MINPULL = 0.45;
  var MR = 30;

  // 段々棚: 着地点 A と転がり落ちる縁 E
  var HOP = { x: 890, y: 372 };
  var A = [{ x: 880, y: 470 }, { x: 330, y: 720 }, { x: 760, y: 970 }];
  var E = [{ x: 420, y: 510 }, { x: 690, y: 760 }, { x: 440, y: 1010 }];
  var BED_X = 540, BED_Y = 1250;
  var POST_L = 360, POST_R = 720;
  var BOX = { x: 170, y: 330 };
  var BIN = { x: 960, y: 1360 };
  var PAD = { x: 540, y: 1540 };

  // 伴奏(8分刻み・2小節で一巡)。0 は休符
  var LEAD = ['C5', 0, 'E5', 'G5', 'A5', 0, 'G5', 0, 'F5', 0, 'A5', 'C6', 'G5', 0, 'E5', 0];
  var BASS = ['C3', 'G2', 'A2', 'E2', 'F2', 'C3', 'G2', 'G2'];
  var CLINK = ['G5', 'B5', 'D6'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: PAD.x + 160, gy: PAD.y + 120, released: false };

  // ── スプライト(玉職人: ゴーグルと前掛け) ─────────────
  var SMITH_A = [
    '...hhhh...',
    '..hhhhhh..',
    '..gGggGg..',
    '..ssssss..',
    '...smms...',
    '..aaaaaa..',
    '.saaaaaas.',
    's.aaaaaa.s',
    '..aaaaaa..',
    '..aa..aa..',
    '..bb..bb..',
    '.bbb..bbb.'
  ];
  var SMITH_B = SMITH_A.slice();
  SMITH_B[6] = 'saaaaaaaas';
  SMITH_B[7] = '..aaaaaa..';
  SMITH_B[11] = 'bbb....bbb';
  var SMITH_PULL = SMITH_A.slice();
  SMITH_PULL[4] = '...sees...';
  SMITH_PULL[6] = '.saaaaaas.';
  SMITH_PULL[7] = '.saaaaaas.';
  SMITH_PULL[8] = '.saaaaaas.';
  var SMITH_OOPS = SMITH_A.slice();
  SMITH_OOPS[2] = '..gsggsg..';
  SMITH_OOPS[4] = '...soos...';
  SMITH_OOPS[5] = 's.aaaaaa.s';
  SMITH_OOPS[6] = 's.aaaaaa.s';
  var SMITH_PAL = { h: C.woodDk, g: C.ink, G: C.glass, s: '#d8b08a', m: C.woodDk, e: C.ink, o: C.ink, a: C.clay, b: C.steel };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function ring(cx, cy, r, col, w) {
    var n = 24, px = cx + r, py = cy;
    for (var i = 1; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      game.draw.line(px, py, x, y, col, w);
      px = x; py = y;
    }
  }

  function stageOf(bp) { return Math.max(0, Math.min(STAGES.length - 1, Math.floor(bp / STAGE_BEATS))); }
  function spbAt(bp) { return 60 / STAGES[stageOf(bp)]; }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var lands = isDemo ? DEMO_LANDS : LANDS;
    var ms = [];
    for (var i = 0; i < lands.length; i++) {
      ms.push({ L: lands[i], st: 'wait', x: HOP.x, y: HOP.y, clink: 0, at: 0, fx: 0, fy: 0, seed: i * 1.37 });
    }
    return {
      demo: isDemo, ms: ms, bp: 0, beatIdx: -1, stepIdx: -1, stage: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, returned: 0,
      pull: null, depth: 0, armed: false, snap: 0,
      stop: 0, stopM: null, pulse: 0, oops: 0, announce: 0, tempoPop: 0,
      shelfFlash: [0, 0, 0], boxFlash: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD.length; i++) notes.push([LEAD[i] || 'R', 0.5]);
    for (var j = 0; j < BASS.length; j++) bass.push([BASS[j], 1]);
    game.audio.melody(notes, { tempo: STAGES[0], wave: 'square', volume: 0.04, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏: 4分のキック(1・3拍目を強く)、8分裏のガラス鈴、ベース、リード
  function playStep(s) {
    var spb = spbAt(R.bp);
    var m = LEAD[s % 16];
    if (m) game.audio.tone(m, spb * 0.4, { wave: 'square', volume: 0.045 });
    if (s % 2 === 0) {
      var b = (s / 2) % 8;
      game.audio.tone(BASS[b], spb * 0.8, { wave: 'triangle', volume: 0.09 });
      game.audio.tone(b % 2 === 0 ? 120 : 96, 0.07, { wave: 'square', volume: b % 2 === 0 ? 0.09 : 0.05, slide: -70 });
    } else {
      game.audio.tone(2600, 0.03, { wave: 'triangle', volume: 0.03 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    if (b % STAGE_BEATS === STAGE_BEATS - 2 && b + 2 < SONG_BEATS) {
      // 加速の予告(2拍前): 窯の歯車が回り、上昇音
      R.announce = 2;
      if (!R.demo) {
        game.audio.tone(380, 0.32, { wave: 'square', volume: 0.06, slide: 520 });
        game.audio.tone(570, 0.32, { wave: 'triangle', volume: 0.05, slide: 760 });
      }
    }
    if (b > 0 && b % STAGE_BEATS === 0 && b < SONG_BEATS) {
      R.stage = stageOf(b);
      R.tempoPop = 1;
      if (!R.demo) {
        game.audio.play('se_powerup', 0.5);
        game.fx.popup(String(STAGES[R.stage]), W / 2, 620, { color: C.yel, size: 110 });
      }
    }
  }

  function bedCenter() {
    var y = BED_Y + (R.pull ? R.depth * 0.75 : 0);
    if (R.snap > 0) y -= Math.sin((1 - R.snap / 0.25) * Math.PI) * 46;
    return { x: BED_X, y: y };
  }

  // 拍位置から玉の位置を出す(棚に着くのは必ず拍の頭)
  function runPos(m) {
    var rel = R.bp - (m.L - LEADB);
    if (rel < 0.5) {
      var t = Math.max(0, rel / 0.5);
      return { x: HOP.x + (A[0].x - HOP.x) * t, y: HOP.y + (A[0].y - HOP.y) * t * t };
    }
    var k = Math.floor(rel - 0.5);
    var bc = bedCenter();
    if (k >= 3) return { x: bc.x, y: bc.y - MR };
    var u = rel - 0.5 - k;
    var a = A[k], e = E[k];
    var nx = k < 2 ? A[k + 1] : { x: bc.x, y: bc.y - MR };
    if (u < 0.6) {
      var s = u / 0.6;
      s = s * (0.45 + 0.55 * s);
      return { x: a.x + (e.x - a.x) * s, y: a.y + (e.y - a.y) * s };
    }
    var t2 = (u - 0.6) / 0.4;
    return { x: e.x + (nx.x - e.x) * t2, y: e.y + (nx.y - e.y) * t2 * t2 };
  }

  function beginPull(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0 || R.pull) return false;
    R.pull = { x0: x, y0: y, x: x, y: y };
    R.depth = 0; R.armed = false;
    return true;
  }
  // 戻り値: 1=構え完了の瞬間 / 0=変化なし
  function movePull(x, y) {
    if (!R || !R.pull) return 0;
    R.pull.x = x; R.pull.y = y;
    R.depth = Math.max(0, Math.min(MAXPULL, y - R.pull.y0));
    if (!R.armed && R.depth >= MAXPULL * MINPULL) { R.armed = true; return 1; }
    if (R.armed && R.depth < MAXPULL * MINPULL * 0.8) R.armed = false;
    return 0;
  }
  function releasePull() {
    if (!R || !R.pull) return 'none';
    var depth = R.depth / MAXPULL;
    R.pull = null; R.depth = 0; R.armed = false; R.snap = 0.25;
    if (R.stop > 0 || R.over) return 'none';
    var best = null, bd = 1e9;
    for (var i = 0; i < R.ms.length; i++) {
      var m = R.ms[i];
      if (m.st !== 'run') continue;
      var d = (R.bp - m.L) * spbAt(m.L);
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = m; }
    }
    if (!best || Math.abs(bd) > WIN_G) return 'whiff';
    if (depth < MINPULL) { missMarble(best); return 'weak'; }
    var grade = Math.abs(bd) <= WIN_P ? 'PERFECT' : 'GOOD';
    hitMarble(best, grade);
    return grade;
  }

  function hitMarble(m, grade) {
    var bc = bedCenter();
    m.st = 'up'; m.at = 0; m.fx = bc.x; m.fy = bc.y - MR;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    R.returned++;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + R.stage * 25; }
    else { R.good++; R.score += 50 + R.combo * 5 + R.stage * 10; }
    game.feedback.good(BED_X, BED_Y - 150, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(BED_X, BED_Y - 20, { color: C.glassHi, count: 12, speed: 380 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone('C6', 0.08, { wave: 'square', volume: 0.07 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, 860, { color: C.yel, size: 70 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missMarble(m) {
    var p = runPos(m);
    m.st = 'stop'; m.fx = p.x; m.fy = p.y;
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.45; R.stopM = m; R.oops = 1.3;
    R.pull = null; R.depth = 0; R.armed = false;
    if (!R.demo) game.audio.tone(150, 0.28, { wave: 'sawtooth', volume: 0.1, slide: -70 });
  }

  function releaseStop() {
    var m = R.stopM;
    R.stopM = null;
    if (!m) return;
    m.st = 'off'; m.at = 0;
    game.feedback.bad(m.fx, m.fy - 90, { text: 'MISS' });
    game.fx.burst(m.fx, m.fy, { color: C.red, count: 10, speed: 260 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    R.pull = null; R.depth = 0;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      game.fx.burst(BOX.x, BOX.y, { color: C.yel, count: 26, speed: 480 });
      game.fx.burst(BED_X, BED_Y, { color: C.glassHi, count: 26, speed: 520 });
      game.fx.burst(HOP.x, HOP.y, { color: C.clay, count: 20, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.yel, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function animMarbles(dt) {
    for (var i = 0; i < R.ms.length; i++) {
      var m = R.ms[i];
      if (m.st === 'up') {
        m.at += dt;
        if (m.at >= 0.75) {
          m.st = 'gone'; R.boxFlash = 1;
          game.audio.tone('E6', 0.05, { wave: 'triangle', volume: R.demo ? 0.03 : 0.06 });
        }
      } else if (m.st === 'off') {
        m.at += dt;
        if (m.at >= 0.7) m.st = 'gone';
      }
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    R.snap = Math.max(0, R.snap - dt);
    R.boxFlash = Math.max(0, R.boxFlash - dt * 2);
    R.tempoPop = Math.max(0, R.tempoPop - dt);
    for (var f = 0; f < 3; f++) R.shelfFlash[f] = Math.max(0, R.shelfFlash[f] - dt * 3);
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    animMarbles(dt);
    if (R.over) return;
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('G4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    var spb = spbAt(R.bp);
    R.bp += dt / spb;
    if (R.announce > 0) R.announce = Math.max(0, R.announce - dt / spb);
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.ms.length; i++) {
      var m = R.ms[i];
      if (m.st === 'wait' && R.bp >= m.L - LEADB) {
        m.st = 'run';
        if (!R.demo) game.audio.tone('C6', 0.05, { wave: 'triangle', volume: 0.05 });
      }
      if (m.st !== 'run') continue;
      var rel = R.bp - (m.L - LEADB);
      var lk = Math.floor(rel - 0.5);
      while (m.clink <= lk && m.clink < 3) {
        // 棚に着いた拍: コツ・コツ・コツと音程が上がって数える
        R.shelfFlash[m.clink] = 1;
        game.audio.tone(CLINK[m.clink], 0.06, { wave: 'triangle', volume: R.demo ? 0.03 : 0.08 });
        m.clink++;
      }
      if ((R.bp - m.L) * spbAt(m.L) > WIN_G) { missMarble(m); return; }
    }
    if (!R.demo && R.bp >= SONG_BEATS + 0.5) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2玉は拍の頭で放して打ち返し、3玉目は1拍早く放してゆるんだ台に落としMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; demo.released = false; startAttractBgm(); }
    var nx = null, idx = -1;
    for (var i = 0; i < R.ms.length; i++) {
      if (R.ms[i].st === 'wait' || R.ms[i].st === 'run') { nx = R.ms[i]; idx = i; break; }
    }
    if (nx && R.stop <= 0) {
      var dB = nx.L - R.bp;
      var failCase = idx === 2;
      if (!R.pull && dB > 0 && dB < 1.6 && !(failCase && demo.released)) beginPull(PAD.x, PAD.y);
      if (R.pull) {
        var k = Math.max(0, Math.min(1, (1.6 - dB) / 0.9));
        movePull(PAD.x, PAD.y + MAXPULL * 0.95 * k);
        if (dB <= (failCase ? 1.0 : 0)) { releasePull(); if (failCase) demo.released = true; }
      }
    }
    var tx = R.pull ? R.pull.x : PAD.x + 160, ty = R.pull ? R.pull.y : PAD.y + 120;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 14);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 14);
    demo.press = !!R.pull;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.55, C.bg1], [1, C.bg2]]);
    // 遠景: 工房の奥の棚と窓(低彩度の太い形)
    game.draw.rect(60, 250, 960, 1140, C.bg0, 0.35);
    for (var r = 0; r < 4; r++) game.draw.rect(60, 420 + r * 260, 960, 16, C.woodDk, 0.35);
    game.draw.rect(430, 260, 220, 140, C.sage, 0.25 + 0.05 * Math.sin(e * 0.8));
    game.draw.rect(536, 260, 8, 140, C.bg0, 0.4);
    // 床
    game.draw.rect(0, 1400, W, 520, C.woodDk, 0.55);
    game.draw.rect(0, 1400, W, 10, C.wood);
  }

  function drawKiln() {
    var e = game.time.elapsed;
    // 冷まし窯の口(玉の出口)
    game.draw.rect(HOP.x - 110, 244, 220, 96, C.steel);
    game.draw.rect(HOP.x - 110, 244, 220, 16, C.sage);
    game.draw.rect(HOP.x - 50, 336, 100, 22, C.steel);
    var glow = 0.45 + 0.2 * Math.sin(e * 3) + R.pulse * 0.2;
    game.draw.rect(HOP.x - 40, 352, 80, 14, C.clay, glow);
    // 歯車(加速の予告で回る)
    var gx = HOP.x - 180, gy = 300, rot = e * (R.announce > 0 ? 9 : 0.6);
    game.draw.circle(gx, gy, 36, C.steel);
    for (var t = 0; t < 6; t++) {
      var a = rot + t * Math.PI / 3;
      game.draw.line(gx, gy, gx + Math.cos(a) * 50, gy + Math.sin(a) * 50, R.announce > 0 ? C.yel : C.sage, 14);
    }
    game.draw.circle(gx, gy, 14, C.ink);
    if (R.announce > 0 && Math.floor(e * 8) % 2 === 0) {
      // 上向きの山形(▲)の点滅
      for (var c = 0; c < 2; c++) {
        var cy = gy + 30 - c * 44, cx = gx - 110;
        game.draw.line(cx - 34, cy + 20, cx, cy - 10, C.yel, 10);
        game.draw.line(cx, cy - 10, cx + 34, cy + 20, C.yel, 10);
      }
    }
  }

  function drawBox() {
    // 受け箱(戻した玉が溜まる)
    var fl = R.boxFlash;
    game.draw.rect(BOX.x - 120, BOX.y - 40, 240, 110, fl > 0 ? C.cream : C.wood);
    game.draw.rect(BOX.x - 120, BOX.y - 40, 240, 16, C.woodDk);
    game.draw.rect(BOX.x - 120, BOX.y + 54, 240, 16, C.woodDk);
    var n = Math.min(14, R.returned);
    for (var i = 0; i < n; i++) {
      var cx = BOX.x - 95 + (i % 7) * 32, cy = BOX.y - 50 - Math.floor(i / 7) * 26;
      game.draw.circle(cx, cy, 15, C.glass);
      game.draw.circle(cx - 5, cy - 5, 5, C.glassHi);
    }
  }

  function drawShelves() {
    for (var k = 0; k < 3; k++) {
      var a = A[k], e = E[k];
      var dx = a.x - e.x, dy = a.y - e.y, len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len, uy = dy / len;
      var x1 = a.x + ux * 70, y1 = a.y + uy * 70 + MR + 10;
      var x2 = e.x - ux * 20, y2 = e.y - uy * 20 + MR + 10;
      var col = R.shelfFlash[k] > 0.3 ? C.cream : C.wood;
      game.draw.line(x1, y1 + 10, x2, y2 + 10, C.woodDk, 26);
      game.draw.line(x1, y1, x2, y2, col, 22);
      // 奥側の止め板
      game.draw.rect(x1 - 10, y1 - 70, 20, 80, C.woodDk);
      // 棚の番号の点(何段目か=何拍目か)
      var sgn = ux > 0 ? -1 : 1;
      for (var d = 0; d <= k; d++) game.draw.circle(x1 + sgn * (30 + d * 26), y1 + 40, 8, R.shelfFlash[k] > 0.3 ? C.yel : C.sage);
    }
  }

  function nextMarble() {
    for (var i = 0; i < R.ms.length; i++) if (R.ms[i].st === 'run') return R.ms[i];
    return null;
  }

  function drawBed() {
    var bc = bedCenter();
    var nx = nextMarble();
    var dB = nx ? nx.L - R.bp : 99;
    // 迫る輪: 玉が台に触れる拍の頭で閉じる
    if (nx && dB < 1.2 && dB > -0.3 && R.stop <= 0) {
      var rr = 70 + Math.max(0, dB) / 1.2 * 200;
      var warn = dB < 1 && !R.armed && Math.floor(game.time.elapsed * 10) % 2 === 0;
      ring(BED_X, BED_Y, rr, warn ? C.red : C.yel, 8);
    }
    // 柱
    var postCol = R.armed ? C.good : C.steel;
    game.draw.rect(POST_L - 22, BED_Y - 20, 44, 170, C.ink);
    game.draw.rect(POST_R - 22, BED_Y - 20, 44, 170, C.ink);
    game.draw.rect(POST_L - 16, BED_Y - 14, 32, 160, postCol);
    game.draw.rect(POST_R - 16, BED_Y - 14, 32, 160, postCol);
    game.draw.circle(POST_L, BED_Y - 14, 26, R.armed ? C.yel : C.sage);
    game.draw.circle(POST_R, BED_Y - 14, 26, R.armed ? C.yel : C.sage);
    // ゴム(中央が引いた分だけ下がる)
    game.draw.line(POST_L, BED_Y - 6, bc.x - 40, bc.y, C.ink, 22);
    game.draw.line(POST_R, BED_Y - 6, bc.x + 40, bc.y, C.ink, 22);
    game.draw.line(bc.x - 44, bc.y, bc.x + 44, bc.y, C.ink, 26);
    game.draw.line(POST_L, BED_Y - 6, bc.x - 40, bc.y, C.rubber, 14);
    game.draw.line(POST_R, BED_Y - 6, bc.x + 40, bc.y, C.rubber, 14);
    game.draw.line(bc.x - 40, bc.y, bc.x + 40, bc.y, C.rubber, 18);
  }

  function drawMarble(x, y, r, body, face, sp) {
    game.draw.circle(x, y + r * 0.85, r * 0.8, C.ink, 0.25);
    game.draw.circle(x, y, r + 5, C.ink);
    game.draw.circle(x, y, r, body);
    // 回る筋
    var a = sp;
    game.draw.circle(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.32, C.clay);
    game.draw.circle(x - r * 0.35, y - r * 0.38, r * 0.22, C.glassHi);
    if (face) {
      game.draw.rect(x - 11, y - 4, 6, 10, C.ink);
      game.draw.rect(x + 5, y - 4, 6, 10, C.ink);
    }
  }

  function drawMarbles() {
    var e = game.time.elapsed;
    for (var i = 0; i < R.ms.length; i++) {
      var m = R.ms[i];
      if (m.st === 'run') {
        var p = runPos(m);
        drawMarble(p.x, p.y, MR, C.glass, true, p.x / MR);
      } else if (m.st === 'stop') {
        var white = Math.floor(e * 20) % 2 === 0;
        drawMarble(m.fx, m.fy, MR * 1.4, white ? C.white : C.red, true, 0);
      } else if (m.st === 'up') {
        var t = Math.min(1, m.at / 0.75);
        var x = m.fx + (BOX.x - m.fx) * t;
        var y = m.fy + (BOX.y - 60 - m.fy) * t - Math.sin(t * Math.PI) * 420;
        drawMarble(x, y, MR * (1 - t * 0.4), C.glass, false, t * 12);
      } else if (m.st === 'off') {
        var t2 = Math.min(1, m.at / 0.7);
        var ox = m.fx + (BIN.x - m.fx) * t2;
        var oy = m.fy + (BIN.y - 40 - m.fy) * t2 - Math.sin(t2 * Math.PI) * 120;
        drawMarble(ox, oy, MR, C.sage, false, ox / MR);
      }
    }
  }

  function drawBin() {
    game.draw.rect(BIN.x - 80, BIN.y - 40, 160, 90, C.steel);
    game.draw.rect(BIN.x - 90, BIN.y - 50, 180, 16, C.sage);
    for (var i = 0; i < Math.min(3, R.miss); i++) game.draw.circle(BIN.x - 40 + i * 40, BIN.y - 56, 16, C.sage);
  }

  function drawSmith() {
    var e = game.time.elapsed;
    var bob = R.pulse * 8;
    var frame = R.oops > 0 ? SMITH_OOPS : (R.pull ? SMITH_PULL : (Math.floor(Math.max(0, R.beatIdx) + (R.demo ? e * 1.4 : 0)) % 2 === 0 ? SMITH_A : SMITH_B));
    game.draw.circle(170, 1395, 80, C.ink, 0.25);
    game.draw.sprite(frame, SMITH_PAL, 170, 1300 - bob, 16, { anchor: 'center' });
  }

  function drawPullGuide() {
    var e = game.time.elapsed;
    // 親指ゾーン: 下へ引く溝と山形(▼)
    game.draw.rect(PAD.x - 20, PAD.y - 10, 40, MAXPULL + 40, C.ink, 0.45);
    for (var c = 0; c < 3; c++) {
      var cy = PAD.y + 60 + c * 70 + ((e * 60) % 70);
      var col = R.armed ? C.good : C.cream;
      game.draw.line(PAD.x - 60, cy - 24, PAD.x, cy + 12, col, 10);
      game.draw.line(PAD.x, cy + 12, PAD.x + 60, cy - 24, col, 10);
    }
    var hy = PAD.y + (R.pull ? R.depth : 0);
    game.draw.circle(PAD.x, hy, 46, C.ink);
    game.draw.circle(PAD.x, hy, 38, R.armed ? C.good : C.rubber);
    // 引きの深さ(構えに必要な線)
    var my = PAD.y + MAXPULL * MINPULL;
    game.draw.rect(PAD.x - 90, my - 4, 180, 8, R.armed ? C.good : C.yel, 0.8);
  }

  function drawLcd() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, C.ink, 0.06);
  }

  function drawWorld() {
    drawBg();
    drawKiln();
    drawBox();
    drawShelves();
    drawBin();
    drawBed();
    drawMarbles();
    drawSmith();
    drawPullGuide();
    drawLcd();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 36, C.yel, 'right');
    for (var i = 0; i < LIVES; i++) drawMarble(W - 70 - i * 70, 150, 22, i < R.lives ? C.glass : C.steel, false, 0);
    // 拍ランプ(1小節4つ。1・3拍目は大きい)
    var inBar = R.ready > 0 ? -1 : ((R.beatIdx % 4) + 4) % 4;
    for (var b = 0; b < 4; b++) {
      var big = b % 2 === 0;
      var lit = b === inBar && R.pulse > 0.2;
      game.draw.circle(110 + b * 90, 150, big ? 28 : 20, lit ? C.yel : C.ink);
      game.draw.circle(110 + b * 90, 150, big ? 20 : 13, lit ? C.cream : C.steel);
    }
    // テンポ段の目盛り(4段)
    for (var s = 0; s < STAGES.length; s++) {
      var on = s <= R.stage;
      var x = 440 + s * 98;
      game.draw.rect(x, 130, 86, 40, on ? (s === R.stage && R.tempoPop > 0 ? C.yel : C.clay) : C.ink);
      game.draw.text(String(STAGES[s]), x + 43, 150, { size: 26, color: on ? C.ink : C.steel, bold: true, align: 'center' });
    }
    var progress = Math.min(1, R.bp / SONG_BEATS);
    game.draw.rect(40, 200, W - 80, 14, C.ink);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.good);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, 1140, 44, C.yel);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 640, 110, C.yel);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.24, W, H * 0.32, C.ink, 0.8);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 96, R.ok ? C.good : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.36, 62, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.41, 34, C.cream);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.45, 34, C.cream);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.5, 50, C.yel);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.5, 42, C.yel);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.ms.length; i++) if (R.ms[i].st === 'wait' || R.ms[i].st === 'run') left++;
      txt('あと' + Math.max(1, left) + '個', W / 2, H * 0.54, 46, C.yel);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, 110 + 6 + bob, { size: 96, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 110 + bob, { size: 96, color: C.clay, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 106 + bob, { size: 96, color: C.yel, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 200, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 50, C.yel);
    else txt('INSERT COIN', W / 2, H * 0.95, 42, C.white);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (beginPull(x, y)) game.audio.tone(300, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    if (movePull(x, y) === 1) {
      game.audio.tone('A5', 0.07, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(PAD.x, PAD.y + R.depth, { color: C.good, count: 5, speed: 140 });
    }
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var res = releasePull();
    if (res === 'whiff') {
      game.audio.play('se_jump', 0.3);
      game.fx.burst(BED_X, BED_Y, { color: C.rubber, count: 6, speed: 160 });
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
      animMarbles(dt);
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 42, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo, returned: R.returned, bpm: STAGES[R.stage] };
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
