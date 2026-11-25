// K-GBA-0020v3-baggage-claim-tag-sort.js
// 乗り継ぎ札の仕分け — 拍ごとにベルトで届く三色の合図札つきの鞄を、次の拍の頭で同じ色の棚へ置く。2小節ごとにテンポが上がる
// 操作: ベルトの終点(中央の台)に着いた鞄を押さえて同じ色・形の札の棚(水色○=左/桃色△=右/黄色□=下)へドラッグし、着いた次の拍の頭で指を離して置く(縮む輪が閉じる瞬間)。棚の外で離すと鞄は台に戻る。早置き・遅置き・違う色の棚・置き忘れは鞄が落ちてMISS
// 終わり: 8小節(約18秒、84→100→116→132と2小節ごとに加速、加速の2拍前に矢印と上昇音で予告)を乗り切ればCLEAR。MISSが3回でGAME OVER
// @mechanic: drag_sort
// @theme: transfer_desk_tag_sort
// 世界観: 国際線到着ロビーの手荷物受け取り場。乗り継ぎ係が、ベルトで拍ごとに流れてくる色札つきの鞄を行き先ごとの乗り継ぎ棚へ並べていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ・到達テンポ)
// スタイル: 80s NEON

(function(game) {
  var STYLE = { bg: ['#05001a', '#140040', '#2a0060'], main: ['#00f0ff', '#ff2bd6', '#ffe600'], accent: ['#ffffff', '#ff7a00'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒のグラデに、シアン/マゼンタ/イエロー/白の発光線。外側に薄い同色を重ねた疑似グローと点滅
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], bg2: STYLE.bg[2],
    cyan: STYLE.main[0], mag: STYLE.main[1], yel: STYLE.main[2],
    white: STYLE.accent[0], orange: STYLE.accent[1],
    grid: '#3a1070', dark: '#0a0420', bad: '#ff3050', good: '#40ff9a', dim: '#4a3a70'
  };
  var TAG_COL = [C.cyan, C.mag, C.yel];

  var GAME_TITLE = 'TAG SORT';
  var STAGES = [84, 100, 116, 132];
  var STAGE_BEATS = 8;
  var SONG_BEATS = STAGES.length * STAGE_BEATS;
  var WIN_P = 0.07, WIN_G = 0.15;
  var LIVES = 3;
  var LEADB = 2;              // 鞄はベルトの上端に着く2拍前に現れる(予告)
  // 鞄が台に着く拍。置くのは次の拍の頭
  // 後半ほどテンポが速く、2〜3段目は連続して届く組が混ざる
  var ARRIVALS = [1, 3, 5, 7, 9, 11, 12, 14, 17, 18, 20, 21, 23, 25, 27, 29, 31];
  var DEMO_ARR = [1, 3, 5];
  var DEMO_TAGS = [0, 2, 1];
  var DEMO_CYCLE = 7 * 60 / STAGES[0] + 1.4;

  var PAD_X = 540, PAD_Y = 1110, BELT_TOP = 380;
  var SHELVES = [
    { x: 200, y: 1110, w: 270, h: 230 },
    { x: 880, y: 1110, w: 270, h: 230 },
    { x: 540, y: 1560, w: 300, h: 220 }
  ];

  // 伴奏(8分刻み、2小節で一巡)。0 は休符
  var LEAD = ['E5', 0, 'A5', 0, 'G5', 'E5', 0, 'D5', 'C5', 0, 'F5', 0, 'E5', 'C5', 0, 'A4'];
  var ROOTS = ['A2', 'F2', 'C3', 'G2'];
  var OCT = ['A3', 'F3', 'C4', 'G3'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, x: 760, y: 1650, press: false };

  // ── スプライト ─────────────────────────────────────────
  var AGENT_A = [
    '...cccc...',
    '..cccccc..',
    '...ssss...',
    '...sees...',
    '...ssss...',
    '..wwwwww..',
    '.wwwttwww.',
    'sww.tt.ww.',
    's.wwwwww..',
    '..wwwwww..',
    '..nn..nn..',
    '..nn..nn..',
    '.kkk..kkk.'
  ];
  var AGENT_B = AGENT_A.slice();
  AGENT_B[5] = '..wwwwwws.';
  AGENT_B[6] = '.wwwttwwws';
  AGENT_B[7] = '.ww.tt.ww.';
  AGENT_B[8] = '..wwwwww..';
  var AGENT_OOPS = AGENT_A.slice();
  AGENT_OOPS[3] = '...soos...';
  AGENT_OOPS[5] = 's.wwwwww.s';
  AGENT_OOPS[6] = 'swwwttwwws';
  var AGENT_PAL = { c: C.cyan, s: '#ffc0a0', e: C.dark, o: C.dark, w: C.mag, t: C.yel, n: '#5a4aa0', k: C.white };
  var TAG_SPR = [
    ['.##.', '#..#', '#..#', '.##.'],
    ['..#..', '.#.#.', '#...#', '#####'],
    ['####', '#..#', '#..#', '####']
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  // 疑似グローの枠(外側に薄い同色を重ねる)
  function glowRect(x, y, w, h, col, t, bright) {
    var a = bright === undefined ? 1 : bright;
    game.draw.rect(x - 6, y - 6, w + 12, t + 12, col, 0.18 * a);
    game.draw.rect(x - 6, y + h - t - 6, w + 12, t + 12, col, 0.18 * a);
    game.draw.rect(x - 6, y - 6, t + 12, h + 12, col, 0.18 * a);
    game.draw.rect(x + w - t - 6, y - 6, t + 12, h + 12, col, 0.18 * a);
    game.draw.rect(x, y, w, t, col, a);
    game.draw.rect(x, y + h - t, w, t, col, a);
    game.draw.rect(x, y, t, h, col, a);
    game.draw.rect(x + w - t, y, t, h, col, a);
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

  function stageOf(bp) { return Math.max(0, Math.min(STAGES.length - 1, Math.floor(bp / STAGE_BEATS))); }
  function spbAt(bp) { return 60 / STAGES[stageOf(bp)]; }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var arr = isDemo ? DEMO_ARR : ARRIVALS;
    var bags = [], prev = -1, prev2 = -1;
    for (var i = 0; i < arr.length; i++) {
      var t;
      if (isDemo) t = DEMO_TAGS[i];
      else {
        t = Math.floor(game.random(0, 3)) % 3;
        if (t === prev && t === prev2) t = (t + 1) % 3;
      }
      prev2 = prev; prev = t;
      bags.push({ arr: arr[i], tag: t, st: 'wait', held: false, hx: PAD_X, hy: PAD_Y, shelf: -1, fall: 0 });
    }
    return {
      demo: isDemo, bags: bags, bp: 0, beatIdx: -1, stepIdx: -1, stage: 0,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, drops: 0, held: null,
      shelfBags: [[], [], []], shelfFlash: [0, 0, 0],
      stop: 0, stopBag: null, pulse: 0, oops: 0, announce: 0, tempoPop: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < LEAD.length; i++) notes.push([LEAD[i] || 'R', 0.5]);
    for (var j = 0; j < 8; j++) bass.push([ROOTS[Math.floor(j / 2) % 4], 0.5], [OCT[Math.floor(j / 2) % 4], 0.5]);
    game.audio.melody(notes, { tempo: STAGES[0], wave: 'square', volume: 0.04, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏: 8分のベース・アルペジオ、4分のキック、2・4拍のスネア、リード
  function playStep(s) {
    var spb = spbAt(R.bp);
    var bar = Math.floor(s / 8);
    var root = s % 2 === 0 ? ROOTS[bar % 4] : OCT[bar % 4];
    game.audio.tone(root, spb * 0.4, { wave: 'sawtooth', volume: 0.04 });
    var m = LEAD[s % 16];
    if (m) game.audio.tone(m, spb * 0.42, { wave: 'square', volume: 0.04 });
    if (s % 2 === 0) {
      game.audio.tone(110, 0.08, { wave: 'sine', volume: 0.14, slide: -60 });
      if (s % 4 === 2) game.audio.tone(1800, 0.06, { wave: 'square', volume: 0.04, slide: -1200 });
    }
  }

  function onBeat(b) {
    R.pulse = 1;
    if (b % STAGE_BEATS === STAGE_BEATS - 2 && b + 2 < SONG_BEATS) {
      // 加速の予告(2拍前): 上昇音+矢印の点滅
      R.announce = 2;
      if (!R.demo) {
        game.audio.tone(400, 0.3, { wave: 'square', volume: 0.06, slide: 500 });
        game.audio.tone(600, 0.3, { wave: 'triangle', volume: 0.05, slide: 700 });
      }
    }
    if (b > 0 && b % STAGE_BEATS === 0 && b < SONG_BEATS) {
      R.stage = stageOf(b);
      R.tempoPop = 1;
      if (!R.demo) {
        game.audio.play('se_powerup', 0.5);
        game.fx.popup(String(STAGES[R.stage]), 260, 620, { color: C.orange, size: 96 });
      }
    }
  }

  function bagPos(b) {
    if (b.held) return { x: b.hx, y: b.hy - 70 };
    var k = (b.arr - R.bp) / LEADB;
    if (k > 0) return { x: PAD_X, y: PAD_Y - k * (PAD_Y - BELT_TOP) };
    return { x: PAD_X, y: PAD_Y };
  }

  function grab(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0 || R.held) return false;
    for (var i = 0; i < R.bags.length; i++) {
      var b = R.bags[i];
      if (b.st !== 'wait' || R.bp < b.arr - 0.25) continue;
      var p = bagPos(b);
      var dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy < 170 * 170) {
        b.held = true; b.hx = x; b.hy = y; R.held = b;
        return true;
      }
    }
    return false;
  }
  function drag(x, y) {
    if (!R || !R.held) return -1;
    R.held.hx = x; R.held.hy = y;
    return shelfAt(x, y - 70);
  }
  function shelfAt(x, y) {
    for (var i = 0; i < SHELVES.length; i++) {
      var s = SHELVES[i];
      if (x > s.x - s.w / 2 - 40 && x < s.x + s.w / 2 + 40 && y > s.y - s.h / 2 - 40 && y < s.y + s.h / 2 + 40) return i;
    }
    return -1;
  }

  // 指を離した: 棚の上なら置いて判定。戻り値は判定
  function drop(x, y) {
    if (!R || !R.held) return 'none';
    var b = R.held;
    R.held = null; b.held = false;
    var sh = shelfAt(x, y - 70);
    if (sh < 0) return 'back';
    var d = (R.bp - (b.arr + 1)) * spbAt(R.bp);
    b.shelf = sh;
    if (sh !== b.tag) { missBag(b); return 'wrong'; }
    var s = SHELVES[sh];
    if (Math.abs(d) <= WIN_G) {
      b.st = 'placed';
      R.shelfBags[sh].push(b.tag);
      R.shelfFlash[sh] = 1;
      var grade = Math.abs(d) <= WIN_P ? 'PERFECT' : 'GOOD';
      R.combo++;
      if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10 + R.stage * 20; }
      else { R.good++; R.score += 50 + R.combo * 5 + R.stage * 10; }
      game.feedback.good(s.x, s.y - 150, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, count: grade === 'PERFECT' ? 16 : 9 });
      game.fx.burst(s.x, s.y, { color: TAG_COL[sh], count: 12, speed: 340 });
      if (!R.demo && R.combo % 5 === 0) {
        game.fx.popup(R.combo + ' COMBO', W / 2, 860, { color: C.cyan, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      return grade;
    }
    // 拍外れの置き: 鞄は棚に収まらず落ちる
    missBag(b);
    return 'off';
  }

  function missBag(b) {
    b.st = 'miss';
    if (b.held) { b.held = false; R.held = null; }
    R.combo = 0; R.miss++; R.drops++; R.lives--;
    R.stop = 0.42; R.stopBag = b; R.oops = 1.1;
    if (!R.demo) game.audio.tone(130, 0.28, { wave: 'sawtooth', volume: 0.1, slide: -70 });
  }

  function releaseStop() {
    var b = R.stopBag;
    R.stopBag = null;
    if (!b) return;
    b.fall = 0.001;
    var p = b.shelf >= 0 ? SHELVES[b.shelf] : { x: PAD_X, y: PAD_Y };
    game.feedback.bad(p.x, p.y - 150, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    if (R.held) { R.held.held = false; R.held = null; }
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(SHELVES[i].x, SHELVES[i].y, { color: TAG_COL[i], count: 22, speed: 480 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.yel, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.oops = Math.max(0, R.oops - dt);
    R.tempoPop = Math.max(0, R.tempoPop - dt);
    for (var f = 0; f < 3; f++) R.shelfFlash[f] = Math.max(0, R.shelfFlash[f] - dt * 2);
    for (var q = 0; q < R.bags.length; q++) if (R.bags[q].fall > 0) R.bags[q].fall += dt;
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
    var spb = spbAt(R.bp);
    R.bp += dt / spb;
    if (R.announce > 0) R.announce = Math.max(0, R.announce - dt / spb);
    var bi = Math.floor(R.bp);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    var si = Math.floor(R.bp * 2);
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.bags.length; i++) {
      var b = R.bags[i];
      if (b.st === 'wait' && (R.bp - (b.arr + 1)) * spb > WIN_G) { b.shelf = -1; missBag(b); return; }
    }
    if (!R.demo && R.bp >= SONG_BEATS + 0.5) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2つは拍の頭で正しい棚へ、3つ目は違う色の棚に置いてMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; }
    var nx = null, idx = -1;
    for (var i = 0; i < R.bags.length; i++) if (R.bags[i].st === 'wait') { nx = R.bags[i]; idx = i; break; }
    var tx = 760, ty = 1650;
    if (nx && R.stop <= 0) {
      var target = idx === 2 ? 0 : nx.tag;
      var sh = SHELVES[target];
      if (!R.held) {
        if (R.bp >= nx.arr - 0.6) { tx = PAD_X; ty = PAD_Y + 40; }
        if (R.bp >= nx.arr && Math.abs(demo.x - PAD_X) < 40) { grab(PAD_X, PAD_Y + 40); }
      } else {
        var k = Math.max(0, Math.min(1, (R.bp - nx.arr) / 0.55));
        var e = k * k * (3 - 2 * k);
        tx = PAD_X + (sh.x - PAD_X) * e;
        ty = PAD_Y + 40 + (sh.y + 70 - PAD_Y - 40) * e;
        drag(tx, ty);
        if (R.bp >= nx.arr + 1) drop(tx, ty);
      }
    }
    var sp = R.held ? 40 : 10;
    demo.x += (tx - demo.x) * Math.min(1, dt * sp);
    demo.y += (ty - demo.y) * Math.min(1, dt * sp);
    if (R.held) { demo.x = R.held.hx; demo.y = R.held.hy; }
    demo.press = !!R.held;
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg0], [0.5, C.bg1], [1, C.bg2]]);
    // 遠景の滑走路の灯(点滅)
    for (var i = 0; i < 12; i++) {
      var on = Math.floor(e * 4 + i * 0.5) % 4 === 0;
      game.draw.circle(60 + i * 88, 330, on ? 7 : 4, i % 2 ? C.cyan : C.mag, on ? 1 : 0.4);
    }
    // 床のパース格子
    var vy = 880;
    for (var g = -6; g <= 6; g++) game.draw.line(540 + g * 40, vy, 540 + g * 260, H, C.grid, 3);
    var scroll = (R.bp % 1);
    for (var h = 0; h < 9; h++) {
      var u = (h + scroll) / 9;
      var y = vy + (H - vy) * u * u;
      game.draw.rect(0, y, W, 3, C.grid);
    }
  }

  function drawTempo() {
    var e = game.time.elapsed;
    var st = R.stage;
    var x = 230, y = 620;
    glowRect(x - 150, y - 150, 300, 230, C.orange, 6, 0.8 + R.pulse * 0.2);
    // 段の目盛り
    for (var i = 0; i < STAGES.length; i++) {
      var lit = i <= st;
      game.draw.rect(x - 120 + i * 62, y + 30, 50, 22, lit ? C.orange : C.dim, lit ? 1 : 0.6);
    }
    txt(String(STAGES[st]), x, y - 60, 96 + R.tempoPop * 30, C.white);
    // 加速予告の矢印
    if (R.announce > 0 && Math.floor(e * 10) % 2 === 0) {
      for (var c = 0; c < 3; c++) {
        var cx = x + 170 + c * 34;
        game.draw.line(cx, y - 100, cx + 26, y - 70, C.yel, 8);
        game.draw.line(cx + 26, y - 70, cx, y - 40, C.yel, 8);
      }
      if (st + 1 < STAGES.length) txt(String(STAGES[st + 1]), x, y - 175, 44, C.yel);
    }
  }

  function drawBeatLamps() {
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % 4;
    for (var i = 0; i < 4; i++) {
      var x = 700 + i * 90, lit = i === inBar;
      var col = R.announce > 0 ? C.yel : (i === 0 ? C.mag : C.cyan);
      game.draw.circle(x, 300, lit ? 34 + R.pulse * 8 : 22, col, lit ? 0.3 : 0.12);
      game.draw.circle(x, 300, lit ? 20 : 14, col, lit ? 1 : 0.35);
    }
  }

  function drawBelt() {
    var e = game.time.elapsed;
    var x0 = PAD_X - 110, w = 220;
    game.draw.rect(x0, BELT_TOP - 40, w, PAD_Y - BELT_TOP + 40, C.dark, 0.85);
    // ベルトの桟(拍に合わせて流れる)
    var phase = (R.bp % 1);
    for (var k = 0; k < 8; k++) {
      var y = BELT_TOP - 40 + ((k + phase) / 8) * (PAD_Y - BELT_TOP + 40);
      game.draw.rect(x0 + 10, y, w - 20, 4, C.dim);
    }
    // 側灯の追いかけ点滅
    for (var j = 0; j < 9; j++) {
      var yy = BELT_TOP - 20 + j * 82;
      var on = (Math.floor(R.bp * 4) - j + 64) % 4 === 0;
      game.draw.circle(x0 - 14, yy, on ? 9 : 5, C.cyan, on ? 1 : 0.4);
      game.draw.circle(x0 + w + 14, yy, on ? 9 : 5, C.mag, on ? 1 : 0.4);
    }
    glowRect(x0, BELT_TOP - 40, w, PAD_Y - BELT_TOP + 40, C.cyan, 4, 0.7);
    // 台
    game.draw.circle(PAD_X, PAD_Y, 140, C.white, 0.08 + R.pulse * 0.12);
    ring(PAD_X, PAD_Y, 130, C.white, 5);
  }

  function drawShelves() {
    var e = game.time.elapsed;
    var hover = R.held ? shelfAt(R.held.hx, R.held.hy - 70) : -1;
    for (var i = 0; i < 3; i++) {
      var s = SHELVES[i];
      var col = TAG_COL[i];
      var stopHere = R.stopBag && R.stopBag.shelf === i;
      game.draw.rect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, C.dark, 0.8);
      var br = 0.55 + R.shelfFlash[i] * 0.45 + (hover === i ? 0.45 : 0);
      glowRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, stopHere && Math.floor(e * 20) % 2 === 0 ? C.white : col, 6, Math.min(1, br));
      // 棚板
      game.draw.rect(s.x - s.w / 2 + 14, s.y + 20, s.w - 28, 6, col, 0.5);
      game.draw.sprite(TAG_SPR[i], { '#': col }, s.x, s.y - s.h / 2 - 34, 10, { anchor: 'center' });
      // 並んだ鞄
      var list = R.shelfBags[i];
      for (var k = 0; k < Math.min(list.length, 8); k++) {
        var bx = s.x - s.w / 2 + 40 + (k % 4) * ((s.w - 80) / 3);
        var by = k < 4 ? s.y + 0 : s.y + 80;
        game.draw.rect(bx - 22, by - 26, 44, 34, col, 0.75);
        game.draw.rect(bx - 8, by - 34, 16, 8, col, 0.75);
      }
    }
  }

  function drawBag(b) {
    var p = bagPos(b);
    var col = TAG_COL[b.tag];
    var e = game.time.elapsed;
    var stopHere = R.stopBag === b;
    var sc = stopHere ? 1.3 : 1;
    if (b.st === 'miss' && b.fall > 0) {
      if (b.fall > 0.7) return;
      if (b.shelf >= 0) p = { x: SHELVES[b.shelf].x, y: SHELVES[b.shelf].y };
      p = { x: p.x + b.fall * 200, y: p.y + b.fall * b.fall * 1800 };
    } else if (stopHere && b.shelf >= 0) {
      p = { x: SHELVES[b.shelf].x, y: SHELVES[b.shelf].y - 10 };
    }
    var flash = stopHere && Math.floor(e * 20) % 2 === 0;
    var wob = b.held ? 0 : Math.sin(e * 6 + b.arr) * 3;
    var bw = 150 * sc, bh = 110 * sc;
    game.draw.rect(p.x - bw / 2 - 8, p.y - bh / 2 - 8, bw + 16, bh + 16, col, 0.2);
    game.draw.rect(p.x - bw / 2, p.y - bh / 2 + wob, bw, bh, flash ? C.white : C.dark);
    glowRect(p.x - bw / 2, p.y - bh / 2 + wob, bw, bh, flash ? C.white : col, 6, 1);
    game.draw.rect(p.x - 30 * sc, p.y - bh / 2 - 24 * sc + wob, 60 * sc, 10, col);
    game.draw.rect(p.x - 30 * sc, p.y - bh / 2 - 24 * sc + wob, 8, 24 * sc, col);
    game.draw.rect(p.x + 22 * sc, p.y - bh / 2 - 24 * sc + wob, 8, 24 * sc, col);
    game.draw.rect(p.x - 6, p.y - bh / 2 + wob, 12, bh, col, 0.35);
    // 札
    game.draw.rect(p.x + bw / 2 - 10, p.y - 10 + wob, 62, 62, C.dark);
    game.draw.sprite(TAG_SPR[b.tag], { '#': col }, p.x + bw / 2 + 21, p.y + 21 + wob, 10, { anchor: 'center' });
    // 置く拍への縮む輪
    if (b.held) {
      var until = b.arr + 1 - R.bp;
      if (until > -0.1) ring(p.x, p.y, 100 + Math.max(0, until) * 150, C.yel, 6);
    } else if (b.st === 'wait' && R.bp >= b.arr) {
      var u2 = b.arr + 1 - R.bp;
      ring(PAD_X, PAD_Y, 100 + Math.max(0, u2) * 150, Math.floor(e * 10) % 2 ? C.yel : C.orange, 6);
    }
  }

  function drawAgent() {
    var e = game.time.elapsed;
    var beatUp = Math.floor(R.bp) % 2 === 0;
    var frame = R.oops > 0 ? AGENT_OOPS : (beatUp ? AGENT_A : AGENT_B);
    var bob = -R.pulse * 10;
    game.draw.circle(860, 820, 110, C.mag, 0.08);
    game.draw.sprite(frame, AGENT_PAL, 860, 690 + bob, 16, { anchor: 'center' });
    game.draw.rect(780, 800, 160, 8, C.cyan, 0.5);
  }

  function drawWorld() {
    drawBg();
    drawTempo();
    drawBeatLamps();
    drawAgent();
    drawBelt();
    drawShelves();
    var held = null;
    for (var i = R.bags.length - 1; i >= 0; i--) {
      var b = R.bags[i];
      if (b.held) { held = b; continue; }
      if (b.st === 'wait' && R.bp >= b.arr - LEADB) drawBag(b);
      else if (b.st === 'miss' && (b.fall > 0 || R.stopBag === b)) drawBag(b);
    }
    if (held) drawBag(held);
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 34, C.yel, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      var x = W - 80 - i * 74;
      game.draw.rect(x - 24, 136, 48, 34, on ? C.mag : C.dim, on ? 1 : 0.5);
      game.draw.rect(x - 10, 126, 20, 10, on ? C.mag : C.dim, on ? 1 : 0.5);
    }
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 40, C.cyan, 'left');
    var progress = Math.min(1, R.bp / SONG_BEATS);
    game.draw.rect(40, 200, W - 80, 14, C.dark);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.cyan);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 900, 100, C.yel);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.34, C.dark, 0.85);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 34, C.cyan);
    txt('MAX COMBO ' + R.maxCombo + '   ' + STAGES[R.stage], W / 2, H * 0.43, 34, C.cyan);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.48, 50, C.yel);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.48, 40, C.yel);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS - R.bp) / 4));
      txt('あと' + left + '小節', W / 2, H * 0.52, 44, C.mag);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 2.2) * 8;
    var flick = Math.floor(e * 8) % 9 === 0;
    game.draw.text(GAME_TITLE, W / 2, 120 + bob, { size: 124, color: C.mag, bold: true, align: 'center' });
    if (!flick) game.draw.text(GAME_TITLE, W / 2 - 4, 114 + bob, { size: 124, color: C.cyan, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 215, 40, C.white);
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
    if (grab(x, y)) game.audio.tone(520, 0.05, { wave: 'square', volume: 0.07 });
    else game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    var prev = R.held.hover;
    var sh = drag(x, y);
    if (sh !== prev) {
      R.held.hover = sh;
      if (sh >= 0) game.audio.tone([660, 880, 990][sh], 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || !R.held) return;
    var res = drop(x, y);
    if (res === 'back') {
      game.audio.tone(240, 0.06, { wave: 'triangle', volume: 0.06 });
      game.fx.burst(PAD_X, PAD_Y, { color: C.dim, count: 5, speed: 120 });
    } else if (res === 'off') {
      game.audio.tone(200, 0.08, { wave: 'square', volume: 0.06 });
    } else if (res === 'PERFECT') {
      game.audio.tone('A6', 0.06, { wave: 'square', volume: 0.06 });
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, drops: R.drops, maxCombo: R.maxCombo, tempo: STAGES[R.stage] };
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
