// K-GBA-0019v3-rooftop-seed-drop.js
// 屋上ガーデン種まき — 跳ねるリズムで左右に往復する鉢が、種のじょうごの真下を通る拍の頭で種玉を落とす
// 操作: 画面のどこでも押すとじょうごから種玉が落ちる(押した瞬間で判定)。鉢は右へゆったり(長)・左へすばやく(短)往復し、じょうごの真下を跳ねる8分の頭で通る。縁が光って縮む輪が重なる通過の瞬間に押す
// 終わり: 6小節(約15秒)を乗り切ればCLEAR。外し・落とし忘れのMISSが3回でGAME OVER。光っていない通過で押すとじょうごが空になって少し押せない
// @mechanic: drop_timing
// @theme: rooftop_garden_seed_drop
// 世界観: 高層ビルの屋上庭園。梁にまたがる園芸係が、レールを跳ねるように往復する植木鉢の真上から種玉を落として植えていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ)と下の花壇に並んだ芽
// スタイル: HYPERCASUAL 3D

(function(game) {
  var STYLE = { bg: ['#f7f9fc', '#e2edf4', '#cfe0d8'], main: ['#ff8a5c', '#4fc49a', '#ffcf5a'], accent: ['#3a7bff', '#ff4a6a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白に近い背景、単色の丸い塊、真下に柔らかい影。当たりは見た目どおり(じょうごの真下=判定点)
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], floor: STYLE.bg[2],
    pot: STYLE.main[0], mint: STYLE.main[1], seed: STYLE.main[2],
    blue: STYLE.accent[0], bad: STYLE.accent[1],
    potHi: '#ffb08c', potSh: '#e0663c', soil: '#7a4e36', city: '#c9d6e2', cityHi: '#dbe5ee',
    beam: '#ffffff', ink: '#2e3a48', grey: '#9aa8b6', white: '#ffffff', gold: '#ffb300', good: '#22b07a'
  };

  var GAME_TITLE = 'SEED DROP';
  var BPM = 96;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;          // 跳ねる8分: 裏は拍の2/3の位置
  var BARS = 6;
  var SONG_BEATS = BARS * 4;
  var WIN_P = 0.06, WIN_G = 0.12, CATCH = 0.2;
  var LIVES = 3;
  var LEAD = 0.7;             // 光る縁と縮む輪の予告
  var RELOAD = 0.36;
  // [拍, 0=表(頭) / 1=跳ねた裏]。前半は表、3小節目は裏だけ、後半は長短のペア
  var CHART = [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
    [8, 1], [9, 1], [10, 1], [11, 1],
    [12, 0], [12, 1], [14, 0], [14, 1],
    [16, 0], [16, 1], [17, 0], [18, 0], [18, 1], [19, 0],
    [20, 0], [20, 1], [21, 0], [21, 1], [22, 0], [22, 1], [23, 0]];
  var DEMO_CHART = [[1, 0], [2, 0], [3, 1], [4, 0], [4, 1], [6, 0]];
  var DEMO_CYCLE = 8 * SPB + 1.2;

  var DROP_X = W * 0.5, HOPPER_Y = 900, RIM_Y = 1080, FLOOR_Y = 1250;
  var AMP_LONG = 300, AMP_SHORT = 150;
  var BED_COLS = 7, BED_X0 = 150, BED_DX = 130, BED_Y0 = 1530, BED_DY = 96;

  // 伴奏(跳ねる8分: 1拍に[表, 裏]の2音、2小節で一巡)
  var MEL = ['C5', 'E5', 'G5', 0, 'A5', 'G5', 'E5', 0, 'F5', 'A5', 'G5', 'E5', 'D5', 0, 'C5', 0];
  var BASS = ['C3', 'E3', 'G3', 'A3', 'F2', 'A2', 'G2', 'B2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, gx: W * 0.62, gy: 1600, press: 0, done: {} };

  var GARDENER = [
    '....hhhh....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '..bbbbbbbb..',
    '.bbbbbbbbbb.',
    '.bbebbbbebb.',
    '.bbbbbbbbbb.',
    '.bbbbmmbbbb.',
    '..bbbbbbbb..',
    '...bbbbbb...'
  ];
  var GARDENER_LOOK = GARDENER.slice();
  GARDENER_LOOK[5] = '.bbbbbbbbbb.';
  GARDENER_LOOK[6] = '.bbebbbbebb.';
  var GARDENER_BLINK = GARDENER.slice();
  GARDENER_BLINK[5] = '.bbhbbbbhbb.';
  var GARDENER_OOPS = GARDENER.slice();
  GARDENER_OOPS[5] = '.beebbbbeeb.';
  GARDENER_OOPS[7] = '.bbbmmmmbbb.';
  var G_PAL = { h: '#ffd36a', b: C.mint, e: C.ink, m: '#d0506a' };
  var SPROUT_A = [
    '.ll..',
    'lll.l',
    '..lll',
    '..s..',
    '..s..'
  ];
  var SPROUT_B = [
    '..ll.',
    'l.lll',
    'lll..',
    '..s..',
    '..s..'
  ];
  var FLOWER = [
    '.fff.',
    'ffcff',
    '.fff.',
    'l.s.l',
    '.lsl.'
  ];
  var S_PAL = { l: C.mint, s: '#2e9a72', f: '#ff7aa0', c: C.seed };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#00000022', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function ellipse(cx, cy, rx, ry, col, a) {
    var n = Math.max(8, Math.min(40, Math.round(ry / 5)));
    for (var i = 0; i < n; i++) {
      var y0 = -ry + (i / n) * ry * 2, y1 = y0 + ry * 2 / n;
      var ym = (y0 + y1) / 2;
      var hw = rx * Math.sqrt(Math.max(0, 1 - (ym * ym) / (ry * ry)));
      game.draw.rect(cx - hw, cy + y0, hw * 2, y1 - y0 + 1, col, a);
    }
  }
  function ringLine(cx, cy, rx, ry, col, w) {
    var n = 24, px = cx + rx, py = cy;
    for (var i = 1; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      var x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      game.draw.line(px, py, x, y, col, w);
      px = x; py = y;
    }
  }

  // 鉢の位置: 拍の頭と跳ねた裏(2/3)でじょうごの真下を通る。右へ長く、左へ短く振れる
  function potX(t) {
    var ph = (t / SPB) % 1;
    if (ph < 0) ph += 1;
    if (ph < SWING) return DROP_X + Math.sin(Math.PI * ph / SWING) * AMP_LONG;
    return DROP_X - Math.sin(Math.PI * (ph - SWING) / (1 - SWING)) * AMP_SHORT;
  }
  function noteT(n) { return (n.beat + (n.half ? SWING : 0)) * SPB; }
  function stepT(s) { return (Math.floor(s / 2) + (s % 2 ? SWING : 0)) * SPB; }

  function newRun(isDemo) {
    var chart = isDemo ? DEMO_CHART : CHART;
    var notes = [];
    for (var i = 0; i < chart.length; i++) notes.push({ beat: chart[i][0], half: chart[i][1], st: 'wait', idx: i });
    return {
      demo: isDemo, notes: notes, songT: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, seeds: [], bed: [], reload: 0,
      stop: 0, stopNote: null, pulse: 0, step8: 0, oops: 0, look: 0, potPop: 0,
      over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    var notes = [], bass = [];
    for (var i = 0; i < MEL.length; i++) notes.push([MEL[i] || 'R', i % 2 === 0 ? SWING : 1 - SWING]);
    for (var j = 0; j < BASS.length; j++) bass.push([BASS[j], 1]);
    game.audio.melody(notes, { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: bass });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏: 跳ねる8分のハイハット+メロ、4分のウォーキングベース
  function playStep(s) {
    var on = s % 2 === 0;
    var m = MEL[s % 16];
    if (m) game.audio.tone(m, SPB * (on ? 0.5 : 0.25), { wave: 'triangle', volume: 0.06 });
    game.audio.tone(on ? 2400 : 3000, 0.025, { wave: 'square', volume: on ? 0.035 : 0.025 });
    if (on) {
      var b = (s / 2) % 8;
      game.audio.tone(BASS[b], SPB * 0.8, { wave: 'sine', volume: 0.11 });
    }
  }

  function nearestNote() {
    var best = null, bestD = 1e9;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st !== 'wait') continue;
      var d = R.songT - noteT(n);
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = n; }
    }
    return { n: best, d: bestD };
  }

  // 押した瞬間に種玉を落とす。戻り値は判定
  function dropSeed() {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    if (R.reload > 0) return 'empty';
    var px = potX(R.songT);
    var q = nearestNote();
    var seed = { x: DROP_X, y: HOPPER_Y, t: 0, tx: px, mode: 'fall' };
    R.seeds.push(seed);
    R.look = 0.25;
    if (!q.n || Math.abs(q.d) > CATCH) {
      seed.mode = 'bounce';
      R.reload = RELOAD; R.combo = 0;
      return 'stray';
    }
    if (Math.abs(q.d) > WIN_G) {
      seed.mode = 'bounce';
      missNote(q.n);
      return 'miss';
    }
    seed.mode = 'in';
    hitNote(q.n, Math.abs(q.d) <= WIN_P ? 'PERFECT' : 'GOOD');
    return 'hit';
  }

  function hitNote(n, grade) {
    n.st = 'hit';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    R.bed.push({ idx: n.idx, kind: grade === 'PERFECT' ? 2 : 1, t: 0 });
    R.potPop = 0.3;
    game.feedback.good(DROP_X, RIM_Y - 60, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 16 : 9 });
    game.fx.burst(DROP_X, RIM_Y, { color: C.mint, count: 10, speed: 300 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone('E6', 0.07, { wave: 'sine', volume: 0.08 });
    if (!R.demo && R.combo % 6 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, 460, { color: C.blue, size: 66 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missNote(n) {
    n.st = 'miss';
    R.combo = 0; R.miss++; R.lives--;
    R.bed.push({ idx: n.idx, kind: 0, t: 0 });
    R.stop = 0.4; R.stopNote = n; R.oops = 1.0;
    if (!R.demo) game.audio.tone(180, 0.24, { wave: 'sawtooth', volume: 0.09, slide: -90 });
  }

  function releaseStop() {
    var n = R.stopNote;
    R.stopNote = null;
    if (!n) return;
    game.feedback.bad(potX(R.songT), RIM_Y - 40, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 4; i++) game.fx.burst(BED_X0 + i * BED_DX * 2, BED_Y0 + 120, { color: i % 2 ? '#ff7aa0' : C.mint, count: 20, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepSeeds(dt) {
    for (var i = R.seeds.length - 1; i >= 0; i--) {
      var s = R.seeds[i];
      s.t += dt;
      if (s.mode === 'in') {
        var u = Math.min(1, s.t / 0.1);
        s.x = DROP_X + (potX(R.songT) - DROP_X) * u;
        s.y = HOPPER_Y + (RIM_Y - HOPPER_Y) * u;
        if (s.t > 0.12) R.seeds.splice(i, 1);
      } else {
        if (s.t < 0.1) { s.y = HOPPER_Y + (RIM_Y - 30 - HOPPER_Y) * (s.t / 0.1); }
        else { var a = s.t - 0.1; s.x = DROP_X - a * 380; s.y = RIM_Y - 30 - a * 500 + a * a * 2600; }
        if (s.t > 0.8) R.seeds.splice(i, 1);
      }
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.step8 = Math.max(0, R.step8 - dt * 5);
    R.oops = Math.max(0, R.oops - dt);
    R.look = Math.max(0, R.look - dt);
    R.potPop = Math.max(0, R.potPop - dt);
    for (var b = 0; b < R.bed.length; b++) R.bed[b].t += dt;
    stepSeeds(dt);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('G4', 0.08, { wave: 'sine', volume: 0.1 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    if (R.reload > 0) {
      R.reload -= dt;
      if (R.reload <= 0 && !R.demo) game.audio.tone('A5', 0.04, { wave: 'sine', volume: 0.06 });
    }
    R.songT += dt;
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    while (stepT(R.stepIdx + 1) <= R.songT) { R.stepIdx++; R.step8 = 1; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st === 'wait' && R.songT > noteT(n) + WIN_G) { missNote(n); return; }
    }
    if (!R.demo && R.songT >= SONG_BEATS * SPB) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(5つ成功、最後は早押しで縁に弾かれるMISS)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.done = {}; }
    demo.press = Math.max(0, demo.press - dt);
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st !== 'wait' || demo.done[i] || R.stop > 0) continue;
      var tapAt = noteT(n) + (i === R.notes.length - 1 ? -0.16 : 0);
      if (R.songT >= tapAt) { demo.done[i] = true; dropSeed(); demo.press = 0.18; }
      break;
    }
    var bob = Math.sin(demo.t * 4) * 12;
    demo.gx += (W * 0.62 - demo.gx) * Math.min(1, dt * 8);
    demo.gy = 1600 + bob - (demo.press > 0 ? 18 : 0);
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, FLOOR_Y, [[0, C.bg0], [1, C.bg1]]);
    // 遠景のビル群(淡い単色の塊)
    var bx = [40, 170, 290, 640, 770, 900, 990];
    var bh = [380, 520, 300, 460, 340, 560, 260];
    for (var i = 0; i < bx.length; i++) {
      game.draw.rect(bx[i], FLOOR_Y - 60 - bh[i], 110, bh[i], i % 2 ? C.city : C.cityHi);
      game.draw.rect(bx[i] + 14, FLOOR_Y - 40 - bh[i], 82, 10, C.white, 0.6);
    }
    for (var c = 0; c < 3; c++) {
      var cx = ((e * (18 + c * 6) + c * 400) % (W + 300)) - 150;
      ellipse(cx, 420 + c * 90, 90, 26, C.white, 0.9);
    }
    // 屋上の床
    game.draw.gradient(FLOOR_Y - 60, H, [[0, C.floor], [1, '#b8cfc4']]);
    game.draw.rect(0, FLOOR_Y - 60, W, 10, C.white, 0.7);
    // 花壇(下の親指ゾーン)
    ellipse(W / 2, BED_Y0 + 150, 500, 230, '#a9c4b6', 0.6);
  }

  function drawRail() {
    ellipse(W / 2 + 75, RIM_Y + 158, 360, 16, '#000000', 0.08);
    game.draw.rect(DROP_X - AMP_SHORT - 110, RIM_Y + 134, AMP_LONG + AMP_SHORT + 220, 16, C.grey);
    game.draw.circle(DROP_X - AMP_SHORT - 110, RIM_Y + 142, 14, C.grey);
    game.draw.circle(DROP_X + AMP_LONG + 110, RIM_Y + 142, 14, C.grey);
    // 判定点(じょうごの真下)の印
    ellipse(DROP_X, RIM_Y + 142, 46, 12, C.blue, 0.35 + R.step8 * 0.4);
  }

  function drawPot() {
    var x = potX(R.songT);
    var stopHere = !!R.stopNote;
    var sc = stopHere ? 1.3 : 1 + R.potPop * 0.25;
    var flash = stopHere && Math.floor(game.time.elapsed * 20) % 2 === 0;
    var nx = null;
    for (var i = 0; i < R.notes.length; i++) if (R.notes[i].st === 'wait') { nx = R.notes[i]; break; }
    var glow = nx && !R.over && noteT(nx) - R.songT < LEAD;
    // 柔らかい影
    ellipse(x, RIM_Y + 130, 120 * sc, 22, '#000000', 0.14);
    var topW = 210 * sc, botW = 150 * sc, hgt = 130 * sc;
    var body = flash ? C.white : C.pot;
    for (var k = 0; k < 13; k++) {
      var u = k / 13;
      var w = topW + (botW - topW) * u;
      game.draw.rect(x - w / 2, RIM_Y + u * hgt, w, hgt / 13 + 1, body);
    }
    game.draw.rect(x - topW * 0.32, RIM_Y + 18, 16 * sc, hgt * 0.7, C.white, flash ? 0 : 0.35);
    ellipse(x, RIM_Y, topW / 2 + 6, 26 * sc, flash ? C.white : (glow ? C.blue : C.potSh));
    ellipse(x, RIM_Y, topW / 2 - 10, 18 * sc, flash ? C.white : C.soil);
    if (R.potPop > 0) game.draw.sprite(SPROUT_A, S_PAL, x, RIM_Y - 40 - R.potPop * 60, 12, { anchor: 'center' });
  }

  function drawApproach() {
    if (R.over) return;
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st !== 'wait') continue;
      var until = noteT(n) - R.songT;
      if (until > LEAD) break;
      if (until < -0.05) continue;
      var k = Math.max(0, until) / LEAD;
      ringLine(DROP_X, RIM_Y, 110 + k * 260, 28 + k * 66, n.half ? '#7aa8ff' : C.blue, 8);
    }
  }

  function drawHopper() {
    var e = game.time.elapsed;
    // 梁
    game.draw.rect(0, 640, W, 40, C.beam);
    game.draw.rect(0, 676, W, 10, C.grey, 0.3);
    // じょうご
    var empty = R.reload > 0;
    for (var k = 0; k < 10; k++) {
      var w = 220 - k * 16;
      game.draw.rect(DROP_X - w / 2, 690 + k * 18, w, 19, empty ? '#c7d2dc' : C.white);
    }
    game.draw.rect(DROP_X - 34, 870, 68, 34, empty ? '#c7d2dc' : C.white);
    ellipse(DROP_X, 690, 112, 18, C.grey, 0.5);
    if (!empty) {
      for (var s = 0; s < 3; s++) game.draw.circle(DROP_X - 40 + s * 40, 702, 20, C.seed);
    }
    // 園芸係(梁にまたがる)
    var bob = Math.sin(e * 5) * 4 - R.pulse * 8;
    var frame = R.oops > 0 ? GARDENER_OOPS : (R.look > 0 ? GARDENER_LOOK : (Math.floor(e * 1.2) % 6 === 0 ? GARDENER_BLINK : GARDENER));
    ellipse(DROP_X + 170, 640, 90, 12, '#000000', 0.12);
    game.draw.sprite(frame, G_PAL, DROP_X + 170, 560 + bob, 16, { anchor: 'center' });
    game.draw.line(DROP_X + 110, 600 + bob, DROP_X + 60, 690, C.mint, 18);
  }

  function drawSeeds() {
    for (var i = 0; i < R.seeds.length; i++) {
      var s = R.seeds[i];
      ellipse(s.x, FLOOR_Y + 40, 18, 5, '#000000', 0.1);
      game.draw.circle(s.x, s.y, 22, C.seed);
      game.draw.circle(s.x - 7, s.y - 7, 7, C.white, 0.7);
    }
  }

  function drawBeatLamps() {
    var inBar = R.beatIdx < 0 || R.ready > 0 ? -1 : R.beatIdx % 4;
    var stepIn = R.stepIdx < 0 ? -1 : R.stepIdx % 2;
    for (var i = 0; i < 4; i++) {
      var x = 150 + i * 230;
      var litOn = i === inBar && stepIn === 0;
      var litAnd = i === inBar && stepIn === 1;
      game.draw.circle(x, 300, 30 + (litOn ? R.pulse * 10 : 0), litOn ? C.blue : '#d3dde6');
      game.draw.circle(x + 230 * SWING, 300, 16 + (litAnd ? R.step8 * 6 : 0), litAnd ? '#7aa8ff' : '#dfe7ee');
    }
  }

  function drawBed() {
    var e = game.time.elapsed;
    var total = R.notes.length;
    for (var i = 0; i < total; i++) {
      var c = i % BED_COLS, r = Math.floor(i / BED_COLS);
      var x = BED_X0 + c * BED_DX, y = BED_Y0 + r * BED_DY;
      ellipse(x, y + 26, 44, 14, '#8a6a4e', 0.5);
    }
    for (var j = 0; j < R.bed.length; j++) {
      var b = R.bed[j];
      var cc = b.idx % BED_COLS, rr = Math.floor(b.idx / BED_COLS);
      var bx = BED_X0 + cc * BED_DX, by = BED_Y0 + rr * BED_DY;
      var pop = Math.min(1, b.t / 0.2);
      if (b.kind === 0) {
        game.draw.line(bx - 16, by + 10, bx + 16, by + 34, C.bad, 6);
        game.draw.line(bx + 16, by + 10, bx - 16, by + 34, C.bad, 6);
      } else {
        var spr = b.kind === 2 ? FLOWER : (Math.floor(e * 2 + j) % 2 ? SPROUT_A : SPROUT_B);
        game.draw.sprite(spr, S_PAL, bx, by - 6 * pop, 8 + 4 * pop, { anchor: 'center' });
      }
    }
  }

  function drawWorld() {
    drawBg();
    drawBeatLamps();
    drawRail();
    drawApproach();
    drawPot();
    drawHopper();
    drawSeeds();
    drawBed();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 46, C.ink, 'left');
    txt('BEST ' + game.best, W - 40, 70, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.circle(W - 70 - i * 64, 150, 22, on ? C.pot : '#d3dde6');
    }
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 40, C.blue, 'left');
    var progress = Math.min(1, R.songT / (SONG_BEATS * SPB));
    game.draw.rect(40, 200, W - 80, 14, '#d3dde6');
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.mint);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, 470, 100, C.blue);
  }

  function drawResult() {
    game.draw.rect(60, H * 0.2, W - 120, H * 0.33, C.white, 0.92);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.33, 60, C.ink);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.38, 34, C.ink);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.42, 34, C.ink);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.47, 50, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.47, 40, C.gold);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS * SPB - R.songT) / (4 * SPB)));
      txt('あと' + left + '小節', W / 2, H * 0.51, 44, C.blue);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    ellipse(W / 2, H * 0.075 + 70, 300, 16, '#000000', 0.08);
    game.draw.text(GAME_TITLE, W / 2 + 5, H * 0.06 + 7 + bob, { size: 112, color: C.potSh, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, H * 0.06 + bob, { size: 112, color: C.pot, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, H * 0.11, 40, C.ink);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.blue);
    else txt('INSERT COIN', W / 2, H * 0.965, 40, C.ink);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || !R) return;
    var res = dropSeed();
    if (res === 'empty') {
      game.audio.tone(120, 0.05, { wave: 'square', volume: 0.05 });
    } else if (res === 'stray') {
      game.audio.play('se_tap', 0.4);
      game.fx.burst(DROP_X, RIM_Y - 30, { color: C.grey, count: 6, speed: 160 });
    } else if (res !== 'none') {
      game.audio.tone(res === 'hit' ? 880 : 300, 0.05, { wave: 'sine', volume: 0.08, slide: res === 'hit' ? -300 : -120 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
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
