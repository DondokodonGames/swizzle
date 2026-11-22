// K-DS-0037v2-puppet-curtain-clapper.js
// 人形芝居の幕引き拍子木 — 左手で拍ごとに幕の綱を引き下ろし、右手で拍の頭に拍子木を打って場面を替える。三味線が抜ける2小節も拍を保つ
// 操作: 画面の左半分=幕の綱(上から下へなぞると1回引く。なぞりが一定距離を越えた瞬間で判定)、右半分=拍子木(押した瞬間で判定)。中段の拍の札は上段=拍子木、下段=綱。綱は毎拍、拍子木は札のある拍(小節の頭と3拍目、最後の小節は毎拍)。拍のずれでPERFECT/GOOD、ずれすぎ・打ち逃し・引き逃しはMISS(札の無い所の空打ちは罰なし)。綱を1回引くごとに幕が4分の1ずつ動き、奇数小節で閉じ、偶数小節で開くと場面が替わっている。3〜4小節目は三味線が抜け(直前の拍で三味線弾きがばちを上げ、下がる音で予告)、拍の光も薄くなるので自分で拍を保つ
// 終わり: 前奏1小節+6小節(96BPM・約17.5秒・36打)を通せばCLEAR(幕が3回閉じて開き、場面が3回替わる)。MISS4回でGAME OVER
// @mechanic: coop_2zone
// @theme: puppet_theater_curtain_clapper
// 世界観: 村の人形芝居の舞台裏で、黒衣の裏方が左手で幕の綱を拍ごとに引き、右手で拍の頭に拍子木を打って、三味線が止む間も拍を崩さずに場面を切り替える
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・綱と拍子木それぞれの成功数・最大コンボ)
// スタイル: 90s PRE-RENDER
var STYLE = { bg: ['#211812', '#0b0806'], main: ['#7a4f2a', '#c9a227', '#dcd3c0'], accent: ['#9e2b25', '#3d7a68'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗めの木と真鍮の金属質。背景は動かない1枚絵として描き込み、粒状ノイズ(薄い矩形)を散らす。キャラだけドットで動く
  var DARKWOOD = STYLE.bg[0], BLACK = STYLE.bg[1];
  var WOOD = STYLE.main[0], BRASS = STYLE.main[1], PAPER = STYLE.main[2];
  var VELVET = STYLE.accent[0], TEAL = STYLE.accent[1];
  var WOOD_HI = '#a8774a', BRASS_HI = '#f4e08a', STEEL = '#6b6f78', SHADOW = '#000000';

  var GAME_TITLE = 'CURTAIN CUE';
  var BPM = 96, SPB = 60 / BPM;
  var TIME_LIMIT = 17.5;               // 前奏1小節 + 6小節
  var PERFECT_W = 0.06, GOOD_W = 0.12, MISS_W = 0.3;
  var MISS_MAX = 4;
  var PULL_PX = 60;
  var R_PAT = { 1: [0, 2], 2: [0], 3: [0, 2], 4: [0], 5: [0, 2], 6: [0, 1, 2, 3] };
  var BREAKS = { 3: true, 4: true };
  var SONG_END = 28;
  var DEMO_R = { 1: [0, 2], 2: [0] };
  var DEMO_BREAKS = { 2: true };
  var DEMO_END = 12, DEMO_START = 2;
  var DEMO_FAIL_B = 9;                 // ゴーストがこの拍の綱を遅れて引きMISSする

  var ROPE_X = 150, PULLEY_Y = 286;
  var SX0 = 270, SX1 = 1000, SY0 = 300, SY1 = 760;
  var KURO_X = 520, KURO_Y = 1050;
  var MUSI_X = 880, MUSI_Y = 1030;
  var CELL_X = 240, CELL_W = 100, CELL_Y = Math.round(H * 0.655), CELL_H = 150;
  var CLAP_X = 800, CLAP_Y = Math.round(H * 0.875);

  // 伴奏(自作): 三味線風の8分の撥音と、小節頭の太鼓。拍ごとの断片を拍クロックから鳴らす
  var SHAMI = [
    [['E4', 0.5], ['F4', 0.5]], [['A4', 0.5], ['B4', 0.5]], [['C5', 0.5], ['B4', 0.5]], [['A4', 0.5], ['F4', 0.5]],
    [['E4', 0.5], ['A4', 0.5]], [['B4', 0.5], ['C5', 0.5]], [['E5', 0.5], ['C5', 0.5]], [['B4', 0.5], ['E4', 0.5]]
  ];
  var BASS = ['E2', 'E2', 'A2', 'B2', 'E2', 'A2', 'C3', 'B2'];

  // ---- スプライト ----
  var KURO = [
    '....kkkkkk....', '...kkkkkkkk...', '..kkggggggkk..', '..kgkgkgkgkk..', '..kkggggggkk..', '..kkgkgkgkkk..',
    '...kkkkkkkk...', '..kkkkkkkkkk..', '.kkkkkkkkkkkk.', 'kkkkkkkkkkkkkk', 'kk.kkkkkkkk.kk', '...kkkkkkkk...',
    '...kkkkkkkk...', '...kkkkkkkk...', '...kkk..kkk...', '..wwww..wwww..'
  ];
  var KURO_OOPS = KURO.slice();
  KURO_OOPS[3] = '..kwkgkgkwkk..';
  KURO_OOPS[5] = '..kkgwwwgkkk..';
  var PAL_K = { k: '#17141c', g: '#3d3d48', w: PAPER };
  var PAL_RIM = { k: '#5c4630', g: '#5c4630', w: '#5c4630' };
  var PAL_WHITE = { k: '#ffffff', g: '#ffffff', w: '#ffffff', s: '#ffffff', r: '#ffffff', y: '#ffffff', b: '#ffffff', n: '#ffffff' };
  var PUP_A = ['..kkkkkk..', '.kkkkkkkk.', '.kssssssk.', '..skssks..', '..ssssss..', '...srrs...', '..rrrrrr..',
    '.rrryyrrr.', 'srrrrrrrrs', '.rrrrrrrr.', '.rrrrrrrr.', '..rrrrrr..', '..rr..rr..', '..kk..kk..'];
  var PUP_B = PUP_A.slice();
  PUP_B[0] = '....kk....';
  for (var pi = 5; pi < 12; pi++) PUP_B[pi] = PUP_A[pi].replace(/r/g, 'b');
  var PUP_OOPS = PUP_A.slice();
  PUP_OOPS[3] = '..ssssss..';
  PUP_OOPS[4] = '..sskkss..';
  var PAL_P = { k: '#1a1410', s: '#f0d2b4', r: VELVET, y: BRASS, b: '#2f5a8a' };
  var MUSI = ['....kkkk....', '...kkkkkk...', '...ssssss...', '...skssks...', '...ssssss...', '....ssss....',
    '..nnnnnnnn..', '.nnnnnnnnnn.', 'nnnnnnnnnnnn', 'nnnnnnnnnnnn', '.nnnnnnnnnn.', '..nnnnnnnn..'];
  var PAL_MU = { k: '#1a1410', s: '#e0c09c', n: TEAL };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var grain = null;
  var drag = {};

  function newRun(isDemo) {
    var pat = isDemo ? DEMO_R : R_PAT;
    var lastBar = isDemo ? 2 : 6;
    var notes = [];
    for (var bar = 1; bar <= lastBar; bar++) {
      for (var k = 0; k < 4; k++) notes.push({ b: bar * 4 + k, lane: 'L', st: 'wait', fx: 0 });
      var rp = pat[bar] || [];
      for (var j = 0; j < rp.length; j++) notes.push({ b: bar * 4 + rp[j], lane: 'R', st: 'wait', fx: 0 });
    }
    return {
      demo: isDemo, notes: notes, end: isDemo ? DEMO_END : SONG_END, breaks: isDemo ? DEMO_BREAKS : BREAKS,
      bp: isDemo ? DEMO_START - 0.3 : 0, beatIdx: isDemo ? DEMO_START - 1 : -1,
      ready: isDemo ? 0 : 0.8, misses: 0, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, okL: 0, okR: 0, scenesDone: 0,
      stop: 0, stopNote: null, pulse: 0, ropeT: 0, clapT: 0, oops: 0, joy: 0, lift: 0,
      curtain: 0, curtainTo: 0, scene: 0, pendingScene: false, ropeOff: 0, ropeOffTo: 0,
      over: false, ok: false, endWait: 0, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    drag = {};
    if (!grain) {
      grain = [];
      for (var i = 0; i < 260; i++) grain.push({ x: Math.floor(game.random(0, W)), y: Math.floor(game.random(230, H)), a: game.random(0.03, 0.09), l: game.random(0, 1) < 0.5 });
    }
  }

  function barOf(b) { return Math.floor(b / 4); }
  function isBreak(bar) { return !!R.breaks[bar]; }
  function goalOf(bar) { return bar % 2 === 1 ? 1 : 0; }

  // 拍の頭ごと: 伴奏・幕の区切り・ブレイクの予告
  function onBeat(b) {
    R.pulse = 1;
    var bar = barOf(b), k = b % 4;
    var v = R.demo ? 0.35 : 1;
    if (k === 0 && bar >= 2 && bar - 1 <= (R.demo ? 2 : 6)) closeBar(bar - 1);
    if (b < R.end && !isBreak(bar)) {
      var idx = (bar * 4 + k) % 8;
      game.audio.melody(SHAMI[idx], { tempo: BPM, wave: 'square', volume: 0.045 * v, bass: [[BASS[idx], 1]], bassVolume: 0.07 * v, bassWave: 'triangle' });
      if (k === 0) game.audio.tone(70, 0.22, { wave: 'sine', volume: 0.3 * v, slide: -30 });
      if (k === 0 && isBreak(bar - 1)) { game.fx.burst(MUSI_X, MUSI_Y - 60, { color: BRASS, count: 14, speed: 320 }); game.audio.tone('E3', 0.4, { wave: 'sawtooth', volume: 0.06 * v }); }
    }
    // 次の小節が抜ける: 三味線弾きがばちを上げ、下がる音で予告(1拍前)
    if (k === 3 && isBreak(bar + 1) && !isBreak(bar)) {
      R.lift = SPB + 0.2;
      game.audio.tone(880, SPB * 0.9, { wave: 'triangle', volume: 0.07 * v, slide: -600 });
    }
  }

  // 小節の区切り: 幕を目標の位置にそろえ、閉じ切ったら場面を替える。全部合わせた小節はNICE
  function closeBar(bar) {
    var goal = goalOf(bar);
    R.curtainTo = goal;
    if (goal === 1) R.pendingScene = true;
    else R.scenesDone++;
    var all = true;
    for (var i = 0; i < R.notes.length; i++) if (barOf(R.notes[i].b) === bar && R.notes[i].st !== 'ok') all = false;
    if (all) {
      R.score += 200; R.joy = 0.9;
      game.fx.popup('NICE', (SX0 + SX1) / 2, SY0 + 120, { color: BRASS_HI, size: 80 });
      if (!R.demo) game.audio.play('se_powerup', 0.35);
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

  // 片手の一手(綱=L / 拍子木=R)。本番の指もATTRACTのゴーストも同じ関数
  function act(lane) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    if (lane === 'L') { R.ropeT = 0.2; R.ropeOffTo += 30; } else R.clapT = 0.14;
    var o = nearest(lane);
    if (o.n && Math.abs(o.d) <= GOOD_W) {
      var n = o.n;
      n.st = 'ok'; n.fx = 0;
      var grade = Math.abs(o.d) <= PERFECT_W ? 'PERFECT' : 'GOOD';
      R.combo++;
      if (R.combo > R.maxCombo) R.maxCombo = R.combo;
      if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 6; } else { R.good++; R.score += 50 + R.combo * 3; }
      var v = R.demo ? 0.3 : 1;
      if (lane === 'L') {
        R.okL++;
        R.ropeOffTo += 50;
        var goal = goalOf(barOf(n.b));
        R.curtainTo = Math.max(0, Math.min(1, R.curtainTo + (goal === 1 ? 0.25 : -0.25)));
        game.audio.tone(170, 0.14, { wave: 'sawtooth', volume: 0.05 * v, slide: 110 });
        game.feedback.good(ROPE_X + 90, 1120, { text: grade, color: grade === 'PERFECT' ? BRASS_HI : PAPER, count: grade === 'PERFECT' ? 12 : 7, sound: 'se_tap', volume: 0.15 * v });
      } else {
        R.okR++;
        game.audio.tone(2600, 0.03, { wave: 'square', volume: 0.12 * v });
        game.audio.tone(1750, 0.06, { wave: 'square', volume: 0.06 * v });
        game.feedback.good(CLAP_X, CLAP_Y - 200, { text: grade, color: grade === 'PERFECT' ? BRASS_HI : PAPER, count: grade === 'PERFECT' ? 12 : 7, sound: 'se_tap', volume: 0.15 * v });
      }
      if (!R.demo && R.combo % 8 === 0) {
        game.fx.popup('x' + R.combo, W / 2, 560, { color: BRASS_HI, size: 92 });
        game.audio.play('se_milestone', 0.45);
      }
      return grade;
    }
    if (o.n && Math.abs(o.d) <= MISS_W) { missNote(o.n); return 'miss'; }
    return 'air';
  }

  function missNote(n) {
    n.st = 'miss'; n.fx = 0;
    R.combo = 0; R.miss++; R.misses++;
    R.stop = 0.42; R.stopNote = n; R.oops = 1.2;
    game.audio.tone(98, 0.3, { wave: 'sawtooth', volume: R.demo ? 0.03 : 0.1, slide: -30 });
  }

  function releaseStop() {
    var n = R.stopNote;
    R.stopNote = null;
    if (n) game.feedback.bad(n.lane === 'L' ? ROPE_X + 90 : CLAP_X, n.lane === 'L' ? 1120 : CLAP_Y - 200, { text: 'MISS', shake: R.demo ? 3 : 12, volume: R.demo ? 0.05 : 0.6 });
    if (R.misses >= MISS_MAX && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.7;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      R.score += (MISS_MAX - R.misses) * 150;
      R.joy = 3;
      for (var i = 0; i < 5; i++) game.fx.burst(SX0 + 60 + i * 150, SY0 + 100 + (i % 2) * 180, { color: [BRASS_HI, VELVET, PAPER, TEAL, BRASS][i], count: 22, speed: 520 });
      game.fx.flash(BRASS, 0.18);
      if (R.score > R.prevBest && R.prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 640, { color: BRASS_HI, size: 80 });
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3.5);
    R.ropeT = Math.max(0, R.ropeT - dt);
    R.clapT = Math.max(0, R.clapT - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.joy = Math.max(0, R.joy - dt);
    R.lift = Math.max(0, R.lift - dt);
    R.curtain += (R.curtainTo - R.curtain) * Math.min(1, dt * 10);
    R.ropeOff += (R.ropeOffTo - R.ropeOff) * Math.min(1, dt * 14);
    if (R.pendingScene && R.curtain > 0.97) { R.scene = (R.scene + 1) % 4; R.pendingScene = false; }
    for (var q = 0; q < R.notes.length; q++) if (R.notes[q].st !== 'wait') R.notes[q].fx += dt;
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
    for (var i = 0; i < R.notes.length; i++) {
      var n = R.notes[i];
      if (n.st === 'wait' && (R.bp - n.b) * SPB > GOOD_W) { missNote(n); return; }
    }
    if (!R.demo && R.bp >= R.end + 0.3) endRun(true);
  }

  // ---- ATTRACT: 2つのゴーストハンドが実ロジックで遊ぶ(左手は綱をなぞり下ろし、右手は拍子木。抜けた小節で一度だけ綱を遅れて引いてMISS) ----
  var demo = { t: 0, ev: [], ei: 0, pl: 0, pr: 0 };
  var DEMO_CYC = (DEMO_END - DEMO_START + 0.3) * SPB + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true);
      demo.ev = []; demo.ei = 0;
      for (var i = 0; i < R.notes.length; i++) {
        var n = R.notes[i];
        demo.ev.push({ b: n.b + (n.lane === 'L' && n.b === DEMO_FAIL_B ? 0.3 : 0), lane: n.lane });
      }
      demo.ev.sort(function(a, b) { return a.b - b.b; });
    }
    demo.pr = Math.max(0, demo.pr - dt);
    if (R.stop > 0) return;
    while (demo.ei < demo.ev.length && R.bp >= demo.ev[demo.ei].b) {
      var ev = demo.ev[demo.ei++];
      act(ev.lane);
      if (ev.lane === 'R') demo.pr = 0.12;
    }
  }
  function demoLeftHandY() {
    // 綱の手: 拍の0.3拍前に上をつかみ、拍の頭で下まで引き下ろす
    for (var i = 0; i < demo.ev.length; i++) {
      var ev = demo.ev[i];
      if (ev.lane !== 'L') continue;
      var d = R.bp - ev.b;
      if (d >= -0.3 && d <= 0.08) {
        var p = Math.max(0, Math.min(1, (d + 0.3) / 0.3));
        return { y: 1500 + p * 220, press: true };
      }
    }
    return { y: 1470, press: false };
  }

  // ---- 描画 ----
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: SHADOW, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function metal(x, y, r) {
    game.draw.circle(x + 4, y + 6, r, SHADOW, 0.5);
    game.draw.circle(x, y, r, STEEL);
    game.draw.circle(x - r * 0.25, y - r * 0.3, r * 0.45, '#b8bcc6', 0.7);
    game.draw.circle(x, y, r * 0.25, '#2a2c32');
  }

  function drawScene(n) {
    var w = SX1 - SX0, h = SY1 - SY0;
    var cols = [['#5b7da8', '#c9d8e8'], ['#2f4a3a', '#7aa07c'], ['#141c3a', '#2c3e6a'], ['#3a1c2c', '#8a3a3a']][n];
    for (var i = 0; i < 8; i++) game.draw.rect(SX0, SY0 + i * h / 8, w, h / 8 + 1, i < 5 ? cols[0] : cols[1], 1);
    game.draw.rect(SX0, SY0 + h * 0.62, w, h * 0.38, cols[1]);
    if (n === 0) { // 村の家並み
      for (var k = 0; k < 3; k++) {
        var hx = SX0 + 90 + k * 230;
        game.draw.rect(hx, SY0 + 200, 150, 120, '#d8c7a4');
        for (var r = 0; r < 6; r++) game.draw.rect(hx - 20 + r * 14, SY0 + 200 - r * 14, 190 - r * 28, 14, '#4a3a2a');
        game.draw.rect(hx + 55, SY0 + 260, 40, 60, '#3a2a1a');
      }
    } else if (n === 1) { // 松の林
      for (var t2 = 0; t2 < 5; t2++) {
        var tx = SX0 + 70 + t2 * 150;
        game.draw.rect(tx + 30, SY0 + 160, 16, 180, '#4a3220');
        for (var r2 = 0; r2 < 4; r2++) game.draw.rect(tx - r2 * 6, SY0 + 110 + r2 * 34, 76 + r2 * 12, 26, '#1e3a26');
      }
    } else if (n === 2) { // 月夜の川
      game.draw.circle(SX0 + w * 0.72, SY0 + 110, 56, '#f4ecc8');
      game.draw.circle(SX0 + w * 0.72 - 14, SY0 + 98, 50, cols[0], 0.25);
      for (var r3 = 0; r3 < 6; r3++) game.draw.rect(SX0 + 40 + (r3 % 2) * 60, SY0 + h * 0.66 + r3 * 24, w - 140, 6, '#5a7ab8', 0.6);
    } else { // 祭りの提灯
      game.draw.line(SX0, SY0 + 90, SX1, SY0 + 130, '#2a1a10', 4);
      for (var l = 0; l < 7; l++) {
        game.draw.circle(SX0 + 60 + l * 100, SY0 + 120 + l * 6, 30, '#e8642a');
        game.draw.circle(SX0 + 60 + l * 100, SY0 + 120 + l * 6, 16, '#ffc860', 0.8);
      }
    }
    // 人形二体(拍で揺れる)
    var bob = -Math.round(R.pulse * 10);
    var tilt = R.oops > 0 ? Math.sin(game.time.elapsed * 30) * 8 : 0;
    var j = R.joy > 0 ? -Math.abs(Math.sin(game.time.elapsed * 12)) * 30 : 0;
    game.draw.sprite(R.oops > 0 ? PUP_OOPS : PUP_A, PAL_P, SX0 + w * 0.36 + tilt, SY1 - 120 + bob + j, 12, { anchor: 'center' });
    game.draw.sprite(PUP_B, PAL_P, SX0 + w * 0.64 - tilt, SY1 - 120 - bob + j, 12, { anchor: 'center', flipX: true });
    // 操り棒
    game.draw.line(SX0 + w * 0.36, SY1 - 30, SX0 + w * 0.36, SY1 + 10, '#2a1a10', 6);
    game.draw.line(SX0 + w * 0.64, SY1 - 30, SX0 + w * 0.64, SY1 + 10, '#2a1a10', 6);
  }

  function drawCurtain() {
    var w = SX1 - SX0, h = SY1 - SY0;
    var cw = Math.max(0, Math.min(1, R.curtain)) * w;
    if (cw < 2) { game.draw.rect(SX0, SY0, 18, h, VELVET); return; }
    var folds = Math.max(2, Math.round(cw / 44));
    for (var i = 0; i < folds; i++) {
      var fx = SX0 + i * cw / folds;
      game.draw.rect(fx, SY0, cw / folds + 1, h, i % 2 ? '#7d211c' : VELVET);
      game.draw.rect(fx + cw / folds * 0.2, SY0, 6, h, '#c8524a', 0.35);
    }
    game.draw.rect(SX0, SY1 - 30, cw, 30, BRASS);
    game.draw.rect(SX0, SY1 - 30, cw, 6, BRASS_HI);
    game.draw.rect(SX0 + cw - 10, SY0, 10, h, SHADOW, 0.5);
  }

  function drawBackstage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, DARKWOOD], [0.45, '#2c2018'], [0.7, DARKWOOD], [1, BLACK]]);
    // 板壁(縦板 + ハイライト)
    for (var x = 0; x < W; x += 90) {
      game.draw.rect(x, 230, 4, H * 0.62, SHADOW, 0.5);
      game.draw.rect(x + 6, 230, 3, H * 0.62, WOOD_HI, 0.12);
    }
    // 梁と滑車
    game.draw.rect(0, 252, W, 30, WOOD);
    game.draw.rect(0, 252, W, 5, WOOD_HI);
    game.draw.rect(0, 282, W, 8, SHADOW, 0.6);
    // 舞台の開口(裏から見た額縁)
    game.draw.rect(SX0 - 26, SY0 - 26, SX1 - SX0 + 52, SY1 - SY0 + 52, '#3a2616');
    game.draw.rect(SX0 - 26, SY0 - 26, SX1 - SX0 + 52, 6, WOOD_HI, 0.5);
    drawScene(R.scene);
    drawCurtain();
    // 幕の走るレール
    game.draw.rect(SX0 - 26, SY0 - 14, SX1 - SX0 + 52, 12, STEEL);
    game.draw.rect(SX0 - 26, SY0 - 14, SX1 - SX0 + 52, 3, '#c0c4cc');
    // 吊り行灯の明かり
    var glow = 0.08 + R.pulse * (isBreak(barOf(Math.floor(Math.max(0, R.bp)))) ? 0.02 : 0.08);
    game.draw.circle(KURO_X, 860, 260, BRASS, glow);
    game.draw.line(KURO_X, SY1 + 26, KURO_X, 820, '#2a1a10', 3);
    game.draw.rect(KURO_X - 30, 820, 60, 70, '#e8d8a8', 0.9);
    game.draw.rect(KURO_X - 30, 820, 60, 8, WOOD);
    // 床
    game.draw.rect(0, 1180, W, 60, '#2a1c12');
    game.draw.rect(0, 1180, W, 4, WOOD_HI, 0.3);
    // 粒状ノイズ
    for (var i = 0; i < grain.length; i++) {
      var g = grain[i];
      game.draw.rect(g.x, g.y, 3, 2, g.l ? '#ffffff' : SHADOW, g.a);
    }
  }

  function drawRope() {
    var lifting = (drag.L && !drag.L.done) || R.ropeT > 0;
    metal(ROPE_X, PULLEY_Y + 6, 30);
    game.draw.line(ROPE_X + 30, PULLEY_Y + 6, SX0 - 26, SY0 - 8, '#b89a6a', 8);
    game.draw.line(ROPE_X + 3, PULLEY_Y + 20, ROPE_X + 3, H, SHADOW, 30);
    game.draw.line(ROPE_X, PULLEY_Y + 20, ROPE_X, H, '#b89a6a', 24);
    var off = R.ropeOff % 70;
    for (var y = PULLEY_Y + 40 - 70 + off; y < H; y += 70) {
      game.draw.line(ROPE_X - 12, y, ROPE_X + 12, y + 18, '#7a5f3c', 6);
      game.draw.circle(ROPE_X, y + 34, 10, '#8f7148');
    }
    // つかみの握り(下の親指ゾーン)
    var gy = 1560 + (lifting ? 90 : 0);
    game.draw.rect(ROPE_X - 44, gy - 22, 88, 44, WOOD);
    game.draw.rect(ROPE_X - 44, gy - 22, 88, 8, WOOD_HI);
  }

  function drawKuroko() {
    var t = game.time.elapsed;
    var bob = -Math.round(R.pulse * 8) + Math.round(Math.sin(t * 2.4) * 3);
    var frame = R.oops > 0 ? KURO_OOPS : KURO;
    var white = R.stop > 0;
    var px = 12;
    var o = { anchor: 'center' };
    game.draw.sprite(frame, PAL_RIM, KURO_X - 5, KURO_Y + bob, px, o);
    game.draw.sprite(frame, PAL_RIM, KURO_X + 5, KURO_Y + bob, px, o);
    game.draw.sprite(frame, white ? PAL_WHITE : PAL_K, KURO_X, KURO_Y + bob, px, o);
    // 左腕(綱)と右腕(拍子木)
    var ly = R.ropeT > 0 ? 1090 : 980;
    game.draw.line(KURO_X - 70, KURO_Y - 30 + bob, ROPE_X + 14, ly, '#17141c', 18);
    var cx = 720, cy = R.clapT > 0 ? 1010 : 940;
    game.draw.line(KURO_X + 70, KURO_Y - 30 + bob, cx, cy, '#17141c', 18);
    game.draw.rect(cx - 10, cy - 60, 22, 70, WOOD);
    game.draw.rect(cx + 14, cy - 60 + (R.clapT > 0 ? 0 : -10), 22, 70, WOOD_HI);
    // 三味線弾き(抜ける前にばちを上げる)
    var lifted = R.lift > 0 || isBreak(barOf(Math.floor(Math.max(0, R.bp))));
    var mb = lifted ? 0 : -Math.round(R.pulse * 6);
    game.draw.sprite(MUSI, PAL_MU, MUSI_X, MUSI_Y + mb, 10, o);
    game.draw.line(MUSI_X - 80, MUSI_Y + 20, MUSI_X + 40, MUSI_Y - 70, '#3a2616', 8);
    game.draw.circle(MUSI_X - 70, MUSI_Y + 20, 26, '#e8d8b8');
    var bx = lifted ? MUSI_X + 60 : MUSI_X - 40, by = lifted ? MUSI_Y - 110 : MUSI_Y + 10 + mb;
    game.draw.line(MUSI_X + 40, MUSI_Y - 10, bx, by, '#e0c09c', 8);
    game.draw.rect(bx - 14, by - 18, 28, 22, '#e8e0c8');
    if (R.lift > 0 && Math.floor(t * 12) % 2 === 0) game.draw.circle(bx, by - 8, 30, BRASS_HI, 0.35);
  }

  function drawChart() {
    var t = game.time.elapsed;
    var cb = Math.max(0, barOf(Math.floor(Math.max(0, R.bp))));
    game.draw.rect(CELL_X - 20, CELL_Y - 20, CELL_W * 8 + 40, CELL_H + 40, SHADOW, 0.6);
    for (var i = 0; i < 8; i++) {
      var bar = cb + Math.floor(i / 4), k = i % 4, b = bar * 4 + k;
      var x = CELL_X + i * CELL_W + (i >= 4 ? 10 : 0);
      var brk = isBreak(bar);
      var cur = i < 4;
      game.draw.rect(x, CELL_Y, CELL_W - 8, CELL_H, brk ? '#120c0a' : (cur ? '#4a3420' : '#30221a'));
      game.draw.rect(x, CELL_Y, CELL_W - 8, 4, brk ? '#2a2020' : WOOD_HI, 0.6);
      if (brk && k === 0) {
        // 抜ける小節の印: 弦の切れた撥(斜線つきの撥)
        game.draw.rect(x + 8, CELL_Y + 8, 20, 14, PAPER, 0.4);
        game.draw.line(x + 4, CELL_Y + 28, x + 34, CELL_Y + 2, VELVET, 4);
      }
      for (var j = 0; j < R.notes.length; j++) {
        var n = R.notes[j];
        if (n.b !== b) continue;
        var col = n.st === 'ok' ? BRASS_HI : (n.st === 'miss' ? VELVET : PAPER);
        var fl = n === R.stopNote && Math.floor(t * 20) % 2 === 0;
        if (fl) col = '#ffffff';
        var sc = fl ? 1.3 : 1;
        if (n.lane === 'R') {
          game.draw.rect(x + 18, CELL_Y + 22, 24 * sc, 46 * sc, col);
          game.draw.rect(x + 48, CELL_Y + 22, 24 * sc, 46 * sc, col);
        } else {
          game.draw.line(x + 46, CELL_Y + 88, x + 46, CELL_Y + 140, col, 10 * sc);
          game.draw.circle(x + 46, CELL_Y + 114, 16 * sc, col);
        }
      }
    }
    // 拍の位置(抜ける小節では薄く)
    if (R.bp >= 0 && !R.over) {
      var p = R.bp - cb * 4;
      var brkNow = isBreak(cb);
      var cx = CELL_X + p * CELL_W - 4;
      game.draw.rect(cx - 3, CELL_Y - 16, 6, CELL_H + 32, BRASS_HI, brkNow ? 0.2 : 0.85);
      var k0 = Math.floor(p);
      if (k0 >= 0 && k0 < 4) game.draw.rect(CELL_X + k0 * CELL_W, CELL_Y - 16, CELL_W - 8, 8, BRASS, brkNow ? 0.15 : 0.4 + R.pulse * 0.6);
    }
  }

  function drawPads() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, BLACK, 0.55);
    game.draw.rect(W / 2 - 3, 1460, 6, H - 1480, WOOD, 0.8);
    // 左: 綱をなぞり下ろす向きの印
    var lp = (drag.L && !drag.L.done) ? 1 : 0.35;
    for (var i = 0; i < 3; i++) {
      var y = 1520 + ((t * 160 + i * 110) % 330);
      game.draw.line(ROPE_X + 110, y - 30, ROPE_X + 150, y, BRASS, 8);
      game.draw.line(ROPE_X + 190, y - 30, ROPE_X + 150, y, BRASS, 8);
    }
    game.draw.circle(ROPE_X + 150, 1500, 10, BRASS, lp);
    // 右: 拍子木の台
    var down = R.clapT > 0 || (state === S.ATTRACT && demo.pr > 0);
    game.draw.rect(CLAP_X - 190, CLAP_Y + 70, 380, 40, '#2a1c12');
    game.draw.rect(CLAP_X - 150, CLAP_Y - 60 + (down ? 30 : 0), 300, 64, WOOD);
    game.draw.rect(CLAP_X - 150, CLAP_Y - 60 + (down ? 30 : 0), 300, 10, WOOD_HI);
    game.draw.rect(CLAP_X - 150, CLAP_Y + 10, 300, 64, '#6a4424');
    game.draw.rect(CLAP_X - 150, CLAP_Y + 10, 300, 8, WOOD_HI, 0.6);
    game.draw.line(CLAP_X, CLAP_Y - 60 + (down ? 30 : 0), CLAP_X, CLAP_Y - 140, VELVET, 6);
    if (down) game.draw.circle(CLAP_X, CLAP_Y + 6, 150, BRASS_HI, 0.15);
  }

  function drawWorld() {
    drawBackstage();
    drawRope();
    drawKuroko();
    drawChart();
    drawPads();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, SHADOW, 0.1);
  }

  function drawHud() {
    game.draw.gradient(0, 230, [[0, '#2a2018'], [1, BLACK]]);
    game.draw.rect(0, 226, W, 4, BRASS);
    txt('SCORE ' + R.score, 40, 84, 50, PAPER, 'left');
    txt('BEST ' + game.best, W - 40, 84, 34, BRASS_HI, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      var on = i < MISS_MAX - R.misses;
      game.draw.circle(W - 70 - i * 64, 150, 22, on ? VELVET : '#3a3030');
      if (on) game.draw.circle(W - 76 - i * 64, 143, 8, '#e07a70', 0.7);
    }
    if (R.combo >= 2) txt('x' + R.combo, 40, 170, 50, BRASS_HI, 'left');
    var progress = Math.max(0, Math.min(1, R.bp / R.end));
    game.draw.rect(300, 140, 360, 18, '#3a2c22');
    game.draw.rect(300, 140, 360 * progress, 18, BRASS);
    game.draw.rect(300, 140, 360 * progress, 4, BRASS_HI);
    if (R.ready > 0) {
      game.draw.rect(80, H * 0.43, W - 160, 170, BLACK, 0.85);
      game.draw.rect(80, H * 0.43, W - 160, 6, BRASS);
      txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.43 + 122, 110, BRASS_HI);
    }
  }

  function drawResult(showTap) {
    game.draw.rect(60, H * 0.25, W - 120, H * 0.36, BLACK, 0.92);
    game.draw.rect(60, H * 0.25, W - 120, 8, R.ok ? BRASS : VELVET);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, R.ok ? BRASS_HI : '#e0584e');
    txt('SCORE ' + R.score, W / 2, H * 0.37, 62, PAPER);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.415, 34, BRASS_HI);
    var totL = 0, totR = 0, left = 0;
    for (var i = 0; i < R.notes.length; i++) { if (R.notes[i].lane === 'L') totL++; else totR++; if (R.notes[i].st === 'wait') left++; }
    game.draw.line(W / 2 - 300, H * 0.44, W / 2 - 300, H * 0.47, '#b89a6a', 14);
    txt(R.okL + '/' + totL, W / 2 - 170, H * 0.465, 42, PAPER);
    game.draw.rect(W / 2 + 40, H * 0.44, 18, 40, WOOD_HI);
    game.draw.rect(W / 2 + 64, H * 0.44, 18, 40, WOOD_HI);
    txt(R.okR + '/' + totR, W / 2 + 190, H * 0.465, 42, PAPER);
    txt('x' + R.maxCombo, W / 2, H * 0.51, 46, BRASS_HI);
    if (R.ok && R.score > R.prevBest) txt('NEW RECORD', W / 2, H * 0.555, 58, BRASS_HI);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, H * 0.555, 42, PAPER);
    if (!R.ok) txt('あと' + Math.max(1, left) + '打', W / 2, H * 0.595, 48, '#e0584e');
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.64, 36, PAPER);
  }

  function drawAttractHud() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 230, [[0, '#2a2018'], [1, BLACK]]);
    game.draw.rect(0, 226, W, 4, BRASS);
    var bob = Math.round(Math.sin(t * 2.2) * 6);
    txt(GAME_TITLE, W / 2 + 6, 116 + bob, 108, VELVET);
    game.draw.text(GAME_TITLE, W / 2, 110 + bob, { size: 108, color: BRASS_HI, bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 200, 38, PAPER);
    if (Math.floor(t * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 46, BRASS_HI);
    else txt('INSERT COIN', W / 2, H * 0.975, 42, PAPER);
  }

  // ---- 入力: 左半分=綱をなぞり下ろす / 右半分=拍子木 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || !R || R.over || y < 230) return;
    if (x < W / 2) {
      drag.L = { id: id, y0: y, done: false };
      game.audio.tone(240, 0.05, { wave: 'triangle', volume: 0.04 });
    } else {
      var res = act('R');
      if (res === 'air') { game.audio.tone(2200, 0.03, { wave: 'square', volume: 0.05 }); game.fx.burst(CLAP_X, CLAP_Y, { color: WOOD_HI, count: 4, speed: 120 }); }
    }
  });
  game.onMove(function(x, y, id) {
    var d = drag.L;
    if (!d || d.done || d.id !== id || state !== S.PLAYING) return;
    if (y - d.y0 >= PULL_PX) {
      d.done = true;
      var res = act('L');
      if (res === 'air') { game.audio.tone(150, 0.08, { wave: 'sawtooth', volume: 0.03, slide: 60 }); game.fx.burst(ROPE_X, 1560, { color: '#b89a6a', count: 4, speed: 120 }); }
    }
  });
  game.onRelease(function(x, y, id) {
    var d = drag.L;
    if (!d || d.id !== id) return;
    drag.L = null;
    if (d.done || state !== S.PLAYING) return;
    if (y - d.y0 >= PULL_PX * 0.5) {
      var res = act('L');
      if (res === 'air') game.audio.tone(150, 0.08, { wave: 'sawtooth', volume: 0.03, slide: 60 });
    } else {
      // 綱をつかんだだけ(引いていない)
      game.fx.burst(ROPE_X, 1560, { color: PAPER, count: 3, speed: 90 });
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld();
      var lh = demoLeftHandY();
      game.draw.hand(ROPE_X + 20, lh.y, { press: lh.press, scale: 14 });
      game.draw.hand(CLAP_X, CLAP_Y - 40 + (demo.pr > 0 ? 30 : 0), { press: demo.pr > 0, scale: 14 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      stepRun(dt);
      drawWorld();
      drawResult(true);
      return;
    }
    stepRun(dt);
    drawWorld();
    drawHud();
    // 前奏の小節だけ、左右の手の動きを薄く見せる
    if (!R.over && R.ready <= 0 && R.bp < 4) {
      var ph = R.bp - Math.floor(R.bp);
      game.draw.hand(ROPE_X + 20, 1500 + Math.min(1, ph / 0.3) * 220, { press: ph < 0.3, scale: 12, alpha: 0.55 });
      if (Math.floor(R.bp) % 2 === 0) game.draw.hand(CLAP_X, CLAP_Y - 40 + (ph < 0.15 ? 30 : 0), { press: ph < 0.15, scale: 12, alpha: 0.55 });
    }
    if (R.over) {
      drawResult(false);
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, rope: R.okL, clapper: R.okR, maxCombo: R.maxCombo, scenes: R.scenesDone };
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
