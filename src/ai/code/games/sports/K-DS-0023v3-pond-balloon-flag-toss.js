// K-DS-0023v3-pond-balloon-flag-toss.js
// 水辺の水風船フラッグ当て — 跳ねる8分(タッ・カ)で綱をぴょんぴょん渡ってくる旗を数えながら水風船の投てき器を引き絞り、旗が真ん中の輪を通る跳ねの頭でちょうど放して当てる
// 操作: 画面のどこでも押して下へ引くとゴムが伸びる(下のゲージが満タンの帯に入ると構え完了の音)。旗は綱を跳ねる8分ごとに1跳びずつ進み、真ん中の輪に入った跳ねの頭で指を離す(ずれでPERFECT/GOOD)。早離し・遅すぎ・引きが足りない・旗を見送るとMISS
// 終わり: 9本の旗(7小節・約17秒)を投げ終えればCLEAR(判定点+コンボ+残りライフ)。MISS 3回でGAME OVER
// @mechanic: slingshot
// @theme: pond_water_balloon_flag_toss
// 世界観: 水辺の公園の水風船当て大会で、参加者がおもちゃの投てき器を引き絞り、池の上の綱を跳ねて渡る旗が輪を通る瞬間に水風船を当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・当てた旗の数・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: MODERN AD-GAME

(function(game) {
  var STYLE = { bg: ['#38c8ff', '#b8f0ff'], main: ['#1ec86a', '#00a8e8', '#ff3a6a'], accent: ['#ffd800', '#1a1030'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、大きいアイコン、飛ぶ数字。3秒で何をするか伝わる画面
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], grass: STYLE.main[0], pond: STYLE.main[1], flag: STYLE.main[2],
    yel: STYLE.accent[0], ink: STYLE.accent[1],
    grassD: '#12904a', pondD: '#0070b8', pondL: '#7ae0ff', white: '#ffffff', skin: '#ffc890', cap: '#ff6a00',
    shirt: '#7a3aff', balloon: '#ff3ad0', rope: '#f4e4c0', post: '#a8602a', good: '#2aff7a', bad: '#ff2a2a', dim: '#7a8aa8', tree: '#18a050'
  };

  var GAME_TITLE = 'SPLASH FLAG';
  var BPM = 100, SPB = 60 / BPM, BEATS = 28, SWING = 2 / 3;
  var TIME_LIMIT = 16.8;               // 7小節 × 4拍 × 0.6秒
  var READY_T = 0.8;
  var PERFECT_W = 0.05, GOOD_W = 0.12;
  var LIVES = 3;
  var SIGHT_X = 540, ROPE_Y = 700, DIST = 460;
  var MAXPULL = 300, READY_PULL = 190;
  // 旗: pass=輪を通る跳ね(2×拍+0 表 / +1 跳ねの裏)、n=何跳び前に現れるか、dir=進む向き
  var PLAN = [
    { pass: 8, n: 6, dir: 1 }, { pass: 16, n: 6, dir: -1 }, { pass: 23, n: 5, dir: 1 }, { pass: 28, n: 4, dir: -1 },
    { pass: 33, n: 5, dir: 1 }, { pass: 39, n: 4, dir: -1 }, { pass: 44, n: 3, dir: 1 }, { pass: 47, n: 3, dir: 1 },
    { pass: 52, n: 6, dir: 1 }
  ];
  var DEMO_PLAN = [{ pass: 4, n: 4, dir: 1 }, { pass: 9, n: 4, dir: -1 }];
  var DEMO_BEATS = 6;
  var DEMO_CYCLE = DEMO_BEATS * SPB + 1.2;

  // 伴奏(オリジナル): 跳ねる8分のシャッフル。表でベースと高い打ち物、裏(2/3拍)で短い刻み
  var WALK = ['C3', 'E3', 'G3', 'A3', 'F2', 'A2', 'C3', 'D3', 'G2', 'B2', 'D3', 'F3', 'C3', 'G2', 'A2', 'B2'];
  var MEL = ['G5', 'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5', 'F5', 'A5', 'C6', 'A5', 'G5', 'F5', 'D5', 'B4'];

  // ── スプライト ─────────────────────────────────────────
  var KID_IDLE = [
    '...cccccc...', '..cccccccc..', '.cccccccccc.', '..ssssssss..', '..sksssks...', '..ssssssss..',
    '...ssmmss...', '....pppp....', '..pppppppp..', '.spppppppps.', '.spppppppps.', '..pppppppp..',
    '..bbbbbbbb..', '..bbb..bbb..', '..bbb..bbb..', '.kkkk..kkkk.'
  ];
  var KID_PULL = [
    '...cccccc...', '..cccccccc..', '.cccccccccc.', '..ssssssss..', '..sksssks...', '..ssssssss..',
    '...sskkss...', '....pppp....', '..pppppppp..', '..pppppppp..', '..pppppppp..', '.spppppppps.',
    '.sbbbbbbbbs.', '..bbb..bbb..', '..bbb..bbb..', '.kkkk..kkkk.'
  ];
  var KID_YAY = [
    's..cccccc..s', 's.cccccccc.s', 'pccccccccccp', 'p.ssssssss.p', '.pskssskspp.', '..ssssssss..',
    '...smmmms...', '....pppp....', '..pppppppp..', '..pppppppp..', '..pppppppp..', '..pppppppp..',
    '..bbbbbbbb..', '..bbb..bbb..', '..bbb..bbb..', '.kkkk..kkkk.'
  ];
  var KID_OOPS = [
    '...cccccc...', '..cccccccc..', '.cccccccccc.', '..ssssssss..', '..skssskss..', '..ssssssss..',
    '...sskkss...', '....pppp....', '..pppppppp..', '.spppppppps.', 's.pppppppp.s', '..pppppppp..',
    '..bbbbbbbb..', '..bbb..bbb..', '..bbb..bbb..', '.kkkk..kkkk.'
  ];
  var KID_PAL = { c: C.cap, s: C.skin, k: C.ink, m: '#e0304a', p: C.shirt, b: '#2a3a8a' };
  var WHITE_PAL = { c: '#fff', s: '#fff', k: '#fff', m: '#fff', p: '#fff', b: '#fff' };
  var INK_PAL = { c: C.ink, s: C.ink, k: C.ink, m: C.ink, p: C.ink, b: C.ink };
  var FLAG = ['ffffffff', 'fwwfffff', 'fffffff.', 'ffffff..', 'fffff...', 'ffff....', 'fff.....'];
  var FLAG_PAL = { f: C.flag, w: C.white };
  var WET_PAL = { f: '#7a1a3a', w: C.pondL };
  var FLASH_PAL = { f: C.white, w: C.white };
  var BALLOON = ['..bb..', '.bbbb.', 'bbwbbb', 'bbbbbb', '.bbbb.', '..bb..', '..k...'];
  var BALLOON_PAL = { b: C.balloon, w: C.white, k: C.ink };
  var DUCK = ['..yy...', '.yyky..', '.yyyyoo', 'yyyyy..', 'yyyyyy.', '.yyyy..'];
  var DUCK_PAL = { y: C.yel, k: C.ink, o: C.cap };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, cyc: 0, fi: 0, plan: [], gx: 540, gy: 1560 };

  function txt(str, x, y, sz, col, align) {
    var o = { size: sz, color: C.ink, bold: true, align: align || 'center' };
    var d = Math.max(3, Math.round(sz / 14));
    game.draw.text(str, x - d, y, o); game.draw.text(str, x + d, y, o);
    game.draw.text(str, x, y - d, o); game.draw.text(str, x, y + d + 2, o);
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function blob(x, y, r, col) { game.draw.circle(x, y, r + 6, C.ink); game.draw.circle(x, y, r, col); }
  function box(x, y, w, h, col) { game.draw.rect(x - 6, y - 6, w + 12, h + 12, C.ink); game.draw.rect(x, y, w, h, col); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function hopBeat(h) { var b = Math.floor(h / 2); return b + (((h % 2) + 2) % 2) * SWING; }
  function hopTime(h) { return hopBeat(h) * SPB; }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var plan = isDemo ? DEMO_PLAN : PLAN, flags = [];
    for (var i = 0; i < plan.length; i++) flags.push({ pass: plan[i].pass, n: plan[i].n, dir: plan[i].dir, step: DIST / plan[i].n, st: 'wait', wetT: 0 });
    return {
      demo: isDemo, flags: flags, beats: isDemo ? DEMO_BEATS : BEATS,
      clock: isDemo ? -0.3 : -READY_T, hopIdx: isDemo ? -2 : -5,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, hits: 0,
      pull: null, shot: null, stop: 0, stopFlag: null, flash: 0, yay: 0, oops: 0, pulse: 0, hop: 0, warn: 0,
      over: false, ok: false, endWait: 0, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    game.audio.stopBgm();
    if (state === S.PLAYING) game.audio.melody([['G4', 0.67], ['C5', 0.33], ['E5', 0.67], ['G5', 0.33], ['C6', 1]], { tempo: BPM, wave: 'square', volume: 0.06 });
  }

  function onHop(h) {
    var b = Math.floor(h / 2), off = ((h % 2) + 2) % 2 === 1;
    R.hop = 1;
    if (!off) R.pulse = 1;
    if (h < 0) {
      if (!off && !R.demo) game.audio.tone(b === -1 ? 'G5' : 'C5', 0.07, { wave: 'square', volume: 0.07 });
      return;
    }
    if (b >= R.beats) return;
    var v = R.demo ? 0.35 : 1;
    if (!off) {
      game.audio.tone(WALK[b % WALK.length], SPB * 0.6, { wave: 'triangle', volume: 0.13 * v });
      game.audio.tone(1800, 0.04, { wave: 'square', volume: 0.03 * v });
    } else {
      game.audio.tone(1300, 0.025, { wave: 'square', volume: 0.025 * v });
    }
    game.audio.tone(MEL[h % MEL.length], SPB * (off ? 0.3 : 0.6), { wave: 'sine', volume: 0.04 * v });
    // 旗が輪に入る1跳び前から輪が光る(0.6秒前に予告音)
    for (var i = 0; i < R.flags.length; i++) {
      var f = R.flags[i];
      if (f.st !== 'wait') continue;
      var due = hopTime(f.pass) - hopTime(h);
      if (due > 0.45 && due < 0.75) { R.warn = due; if (!R.demo) game.audio.tone('E6', 0.06, { wave: 'triangle', volume: 0.05, slide: 200 }); }
    }
  }

  function beginPull(y) {
    if (!R || R.over || R.stop > 0 || R.clock < -0.05 || R.pull) return false;
    R.pull = { y0: y, p: 0, ready: false };
    return true;
  }
  function setPull(p) {
    if (!R.pull) return false;
    R.pull.p = clamp(p, 0, MAXPULL);
    if (!R.pull.ready && R.pull.p >= READY_PULL) { R.pull.ready = true; return true; }
    if (R.pull.p < READY_PULL) R.pull.ready = false;
    return false;
  }

  function nearestFlag() {
    var best = null, bd = 1e9;
    for (var i = 0; i < R.flags.length; i++) {
      var f = R.flags[i];
      if (f.st !== 'wait') continue;
      var d = R.clock - hopTime(f.pass);
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = f; }
    }
    return { f: best, d: bd };
  }

  // 放す(本番の指も ATTRACT のゴーストも同じ関数)
  function releasePull() {
    if (!R || !R.pull) return 'none';
    if (R.over || R.stop > 0) { R.pull = null; return 'none'; }
    var p = R.pull.p;
    R.pull = null;
    var nf = nearestFlag();
    if (p < READY_PULL) {
      // 引きが足りない: 手前の水面にぽちゃん
      R.shot = { t: 0, dur: 0.22, tx: SIGHT_X, ty: 1080, res: 'short' };
      if (nf.f && Math.abs(nf.d) <= 0.45) { nf.f.st = 'miss'; missAt(nf.f); return 'miss'; }
      return 'weak';
    }
    if (nf.f && Math.abs(nf.d) <= GOOD_W) {
      R.shot = { t: 0, dur: 0.18, tx: SIGHT_X, ty: ROPE_Y + 60, res: 'hit', f: nf.f };
      hitFlag(nf.f, Math.abs(nf.d) <= PERFECT_W ? 'PERFECT' : 'GOOD');
      return 'hit';
    }
    // 早離し・遅すぎ: 輪を素通りして池へ
    R.shot = { t: 0, dur: 0.24, tx: SIGHT_X + (nf.d < 0 ? 0 : 20), ty: ROPE_Y + 170, res: 'splash' };
    if (nf.f && Math.abs(nf.d) <= 0.45) nf.f.st = 'miss';
    missAt(nf.f && nf.f.st === 'miss' ? nf.f : null);
    return 'miss';
  }

  function hitFlag(f, grade) {
    f.st = 'hit'; f.wetT = 0.0001;
    R.hits++; R.combo++; R.yay = 0.6;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var pts = grade === 'PERFECT' ? 100 + Math.min(8, R.combo) * 10 : 60 + Math.min(8, R.combo) * 5;
    R.score += pts;
    if (grade === 'PERFECT') R.perfect++; else R.good++;
    game.feedback.good(SIGHT_X, ROPE_Y - 120, { text: grade, color: grade === 'PERFECT' ? C.yel : C.good, size: grade === 'PERFECT' ? 60 : 48, count: grade === 'PERFECT' ? 18 : 10, volume: R.demo ? 0.04 : 0.45 });
    game.fx.burst(SIGHT_X, ROPE_Y + 60, { color: C.pondL, count: 16, speed: 420 });
    game.fx.popup('+' + pts, SIGHT_X + 150, ROPE_Y - 40, { color: C.white, size: R.demo ? 44 : 56 });
    if (!R.demo) {
      game.audio.tone('C6', 0.1, { wave: 'square', volume: 0.06, slide: 300 });
      if (R.combo % 3 === 0) {
        game.fx.popup('COMBO x' + R.combo, W / 2, 470, { color: C.yel, size: 80 });
        game.audio.play('se_milestone', 0.5);
      }
    }
  }

  function missAt(f) {
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.flash = 0.42; R.stopFlag = f; R.oops = 1.1;
    if (!R.demo) game.audio.tone(140, 0.26, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    game.feedback.bad(SIGHT_X, ROPE_Y - 120, { text: 'MISS', shake: R.demo ? 3 : 12, volume: R.demo ? 0.03 : 0.6 });
    R.stopFlag = null;
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8; R.pull = null;
    if (ok) R.score += R.lives * 120;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, 520 + (i % 2) * 160, { color: i % 2 ? C.yel : C.balloon, count: 18, speed: 460 });
    if (R.score > R.prevBest && R.prevBest > 0) {
      game.fx.popup('NEW RECORD', W / 2, 560, { color: C.yel, size: 80 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 4);
    R.hop = Math.max(0, R.hop - dt * 6);
    R.flash = Math.max(0, R.flash - dt);
    R.yay = Math.max(0, R.yay - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.warn = Math.max(0, R.warn - dt);
    if (R.shot) { R.shot.t += dt; if (R.shot.t > R.shot.dur + 0.5) R.shot = null; }
    for (var j = 0; j < R.flags.length; j++) if (R.flags[j].wetT > 0) R.flags[j].wetT += dt;
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    var was = R.clock;
    R.clock += dt;
    if (!R.demo && was < -0.35 && R.clock >= -0.35) game.audio.play('se_tap', 0.4);
    while (hopTime(R.hopIdx + 1) <= R.clock) { R.hopIdx++; onHop(R.hopIdx); }
    for (var i = 0; i < R.flags.length; i++) {
      var f = R.flags[i];
      if (f.st === 'wait' && R.clock > hopTime(f.pass) + GOOD_W) { f.st = 'miss'; missAt(f); return; }
    }
    if (!R.demo && (R.clock >= R.beats * SPB + 0.1 || R.clock > TIME_LIMIT + 0.5)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ。旗の1拍半前に押して引き絞り、輪に入る跳ねで放す。偶数周の2本目は1跳び早く放してMISS
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true); demo.cyc++; demo.fi = 0;
      demo.plan = demo.cyc % 2 === 1 ? [0, 0] : [0, -1];
    }
    stepRun(dt);
    if (demo.fi < R.flags.length && R.stop <= 0) {
      var f = R.flags[demo.fi];
      if (f.st !== 'wait') demo.fi++;
      else {
        var rel = hopTime(f.pass + demo.plan[demo.fi]);
        var until = rel - R.clock;
        if (!R.pull && until < 0.95 && until > 0.1) beginPull(1500);
        if (R.pull) {
          setPull(clamp((0.95 - until) / 0.45, 0, 1) * 250);
          if (until <= 0) { releasePull(); demo.fi++; }
        }
      }
    }
    var pp = R.pull ? R.pull.p : 0;
    var tx = 540 + 40, ty = 1500 + pp;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 16);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 16);
  }

  // ── 描画 ───────────────────────────────────────────────
  function flagX(f, beatF) {
    // 跳ねるたびに1歩進む(跳ねの頭から0.12拍で移る)
    var h = R.hopIdx, x0, x1;
    var r1 = h - f.pass, r0 = r1 - 1;
    x1 = SIGHT_X + f.dir * r1 * f.step;
    x0 = SIGHT_X + f.dir * r0 * f.step;
    var since = beatF - hopBeat(h);
    var u = clamp(since / 0.12, 0, 1);
    return { x: x0 + (x1 - x0) * u, lift: Math.sin(u * Math.PI) * 26 };
  }

  function drawPark() {
    var e = game.time.elapsed;
    game.draw.gradient(230, 640, [[0, C.sky0], [1, C.sky1]]);
    for (var c = 0; c < 3; c++) {
      var cx = ((e * (18 + c * 8) + c * 360) % (W + 320)) - 160;
      blob(cx, 330 + c * 50, 44, C.white); blob(cx + 50, 320 + c * 50, 54, C.white); blob(cx + 105, 335 + c * 50, 40, C.white);
    }
    // 対岸の芝と木
    game.draw.rect(0, 560, W, 160, C.grass);
    game.draw.rect(0, 556, W, 8, C.ink);
    for (var t = 0; t < 6; t++) {
      var tx = 60 + t * 190 + (t % 2) * 30;
      game.draw.rect(tx - 10, 540, 20, 60, C.post);
      blob(tx, 510 + (t % 2) * 16, 58 + Math.sin(e * 1.6 + t) * 3, C.tree);
    }
    // 池
    game.draw.gradient(720, 1200, [[0, C.pond], [1, C.pondD]]);
    game.draw.rect(0, 716, W, 8, C.ink);
    for (var w = 0; w < 9; w++) {
      var wy = 790 + w * 46, wx = ((e * (40 + w * 9) + w * 230) % (W + 240)) - 120;
      game.draw.rect(wx, wy, 120 + (w % 3) * 30, 8, C.pondL, 0.6);
    }
    // 手前の芝
    game.draw.rect(0, 1200, W, H - 1200, C.grass);
    game.draw.rect(0, 1196, W, 10, C.ink);
    for (var g = 0; g < 18; g++) game.draw.rect(20 + g * 62, 1220 + (g % 3) * 26, 10, 26, C.grassD);
  }

  function drawRopeAndFlags() {
    var e = game.time.elapsed;
    var beatF = R.clock / SPB;
    // 綱と柱
    box(30, ROPE_Y - 120, 26, 240, C.post); box(W - 56, ROPE_Y - 120, 26, 240, C.post);
    game.draw.line(43, ROPE_Y - 110, W - 43, ROPE_Y - 110, C.ink, 12);
    game.draw.line(43, ROPE_Y - 110, W - 43, ROPE_Y - 110, C.rope, 6);
    // 真ん中の輪(照準)。旗が入る直前に光る
    var warn = R.warn > 0;
    var ringCol = warn && Math.floor(e * 14) % 2 === 0 ? C.white : C.yel;
    game.draw.rect(SIGHT_X - 8, ROPE_Y + 40, 16, 360, C.ink);
    game.draw.rect(SIGHT_X - 4, ROPE_Y + 40, 8, 360, C.post);
    for (var a = 0; a < 28; a++) {
      var ang = a / 28 * Math.PI * 2;
      game.draw.circle(SIGHT_X + Math.cos(ang) * 96, ROPE_Y - 40 + Math.sin(ang) * 96, 13, C.ink);
    }
    for (var b = 0; b < 28; b++) {
      var an = b / 28 * Math.PI * 2;
      game.draw.circle(SIGHT_X + Math.cos(an) * 96, ROPE_Y - 40 + Math.sin(an) * 96, 8, ringCol);
    }
    if (warn) game.draw.circle(SIGHT_X, ROPE_Y - 40, 130, C.yel, 0.18);
    // 旗
    for (var i = 0; i < R.flags.length; i++) {
      var f = R.flags[i];
      var first = f.pass - f.n;
      if (R.hopIdx < first) continue;
      var p = flagX(f, beatF);
      if (p.x < -40 || p.x > W + 40) continue;
      var y = ROPE_Y - 110 - p.lift;
      var stopHere = R.stop > 0 && R.stopFlag === f;
      var pal = stopHere ? FLASH_PAL : (f.st === 'hit' ? WET_PAL : FLAG_PAL);
      game.draw.line(p.x, y, p.x, y + 26, C.ink, 6);
      game.draw.rect(p.x - 10, y - 8, 20, 16, C.ink);
      game.draw.rect(p.x - 6, y - 4, 12, 8, C.white);
      var px = stopHere ? 15 : 12;
      game.draw.sprite(FLAG, { f: C.ink, w: C.ink }, p.x + (f.dir > 0 ? -4 : 4), y + 22 + 4, px + 1, { anchor: 'topleft', flipX: f.dir < 0 });
      game.draw.sprite(FLAG, pal, p.x, y + 24, px, { anchor: 'topleft', flipX: f.dir < 0 });
      if (f.st === 'hit' && f.wetT < 1) for (var d = 0; d < 3; d++) game.draw.circle(p.x + 20 + d * 26, y + 110 + ((f.wetT * 300 + d * 30) % 90), 7, C.pondL);
    }
  }

  function drawShot() {
    var s = R.shot;
    if (!s) return;
    var u = Math.min(1, s.t / s.dur);
    var sx = 540, sy = 1330;
    if (s.t <= s.dur) {
      var x = sx + (s.tx - sx) * u, y = sy + (s.ty - sy) * u - Math.sin(u * Math.PI) * 220;
      game.draw.sprite(BALLOON, BALLOON_PAL, x, y, 9 - u * 3, { anchor: 'center' });
    } else {
      var k = (s.t - s.dur) / 0.5;
      for (var i = 0; i < 8; i++) {
        var ang = i / 8 * Math.PI * 2;
        game.draw.circle(s.tx + Math.cos(ang) * k * 110, s.ty + Math.sin(ang) * k * 50 - k * 30, 12 * (1 - k) + 2, s.res === 'hit' ? C.balloon : C.pondL);
      }
    }
  }

  function drawKid() {
    var e = game.time.elapsed;
    var p = R.pull ? R.pull.p : 0;
    var ready = R.pull && R.pull.ready;
    // 投てき器(2本の柱とゴム)
    var lx = 400, rx = 680, ty = 1270;
    box(lx - 14, ty, 28, 190, C.post); box(rx - 14, ty, 28, 190, C.post);
    blob(lx, ty, 20, C.yel); blob(rx, ty, 20, C.yel);
    var px = 540, py = 1330 + p * 0.6;
    var band = ready ? C.good : C.balloon;
    game.draw.line(lx, ty, px, py, C.ink, 16); game.draw.line(rx, ty, px, py, C.ink, 16);
    game.draw.line(lx, ty, px, py, band, 8); game.draw.line(rx, ty, px, py, band, 8);
    if (!R.shot || R.shot.t > R.shot.dur) game.draw.sprite(BALLOON, BALLOON_PAL, px, py - 6, 9, { anchor: 'center' });
    // 狙いの点線(構え完了で輪まで伸びる)
    if (R.pull) {
      var n = ready ? 10 : 4;
      for (var i = 1; i <= n; i++) {
        var u = i / 10;
        game.draw.circle(px + (SIGHT_X - px) * u, py + (ROPE_Y - 40 - py) * u - Math.sin(u * Math.PI) * 220, 7, ready ? C.white : C.dim);
      }
    }
    // 参加者(ゴムの後ろ)
    var flash = R.flash > 0;
    var spr = R.oops > 0 ? KID_OOPS : (R.yay > 0 ? KID_YAY : (R.pull ? KID_PULL : KID_IDLE));
    var bob = R.pull ? 0 : Math.sin(e * 3) * 4 + R.pulse * 6;
    if (flash) game.draw.circle(540, 1500, 120, C.white, 0.6);
    game.draw.sprite(spr, INK_PAL, 540, 1470 + p * 0.5 + bob, 13, { anchor: 'center' });
    game.draw.sprite(spr, flash ? WHITE_PAL : KID_PAL, 540, 1466 + p * 0.5 + bob, 12, { anchor: 'center' });
  }

  function drawSwingRuler() {
    // 跳ねる8分の物差し(長・短)。アヒルが跳ねの頭ごとに着地する
    var y = 286, x0 = 120, bw = 210;
    box(x0 - 30, y - 34, 4 * bw + 40, 68, C.white);
    var b = Math.floor(R.clock / SPB), inBar = ((b % 4) + 4) % 4;
    for (var k = 0; k < 4; k++) {
      var bx = x0 + k * bw;
      var on = R.clock >= 0 && k === inBar;
      blob(bx, y, k === 0 ? 20 : 16, on ? C.flag : C.sky1);
      game.draw.circle(bx + bw * SWING, y, 10, on && R.clock / SPB - b >= SWING ? C.flag : C.dim);
    }
    var bf = R.clock / SPB, fb = Math.floor(bf), frac = bf - fb;
    var a0, a1, u;
    if (frac < SWING) { a0 = 0; a1 = SWING; u = frac / SWING; } else { a0 = SWING; a1 = 1; u = (frac - SWING) / (1 - SWING); }
    var dx = x0 + (((fb % 4) + 4) % 4) * bw + bw * (a0 + (a1 - a0) * u);
    if (dx > x0 + 3.9 * bw) dx = x0 + 3.9 * bw;
    var dy = y - 30 - Math.sin(u * Math.PI) * (a1 - a0 > 0.5 ? 46 : 24);
    game.draw.sprite(DUCK, DUCK_PAL, dx, dy, 7, { anchor: 'center' });
  }

  function drawGauge() {
    var gx = 960, gy0 = 1520, gy1 = 1820;
    box(gx - 34, gy0, 68, gy1 - gy0, C.ink);
    var sc = (gy1 - gy0) / MAXPULL;
    game.draw.rect(gx - 28, gy0 + 6, 56, (MAXPULL - READY_PULL) * sc - 6, C.good, 0.45);
    var p = R.pull ? R.pull.p : 0;
    game.draw.rect(gx - 28, gy1 - p * sc, 56, p * sc, R.pull && R.pull.ready ? C.good : C.balloon);
    game.draw.rect(gx - 44, gy0 + (MAXPULL - READY_PULL) * sc - 4, 88, 8, C.white);
    game.draw.sprite(BALLOON, BALLOON_PAL, gx, gy0 - 40, 8, { anchor: 'center' });
  }

  function drawWorld() {
    drawPark();
    drawRopeAndFlags();
    drawSwingRuler();
    drawKid();
    drawShot();
    drawGauge();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink);
    txt('SCORE ' + R.score, 40, 72, 48, C.yel, 'left');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BALLOON, i < R.lives ? BALLOON_PAL : { b: '#4a4a6a', w: '#6a6a8a', k: '#2a2a3a' }, W - 70 - i * 74, 70, 8, { anchor: 'center' });
    txt(R.hits + ' / ' + R.flags.length, W / 2, 150, 44, C.white);
    if (R.combo >= 2) txt('COMBO x' + R.combo, 40, 150, 38, C.good, 'left');
    var progress = clamp(R.clock / (R.beats * SPB), 0, 1);
    box(40, 196, W - 80, 14, '#3a3a5a');
    game.draw.rect(40, 196, (W - 80) * progress, 14, C.yel);
    if (R.clock < 0 && !R.over) txt(R.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, C.yel);
  }

  function drawResult() {
    box(70, H * 0.22, W - 140, H * 0.36, C.white);
    game.draw.rect(70, H * 0.22, W - 140, 16, R.ok ? C.good : C.bad);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.285, 100, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.35, 64, C.yel);
    txt('PERFECT ' + R.perfect + '  GOOD ' + R.good + '  MISS ' + R.miss, W / 2, H * 0.4, 36, C.white);
    txt(R.hits + ' / ' + R.flags.length + '   COMBO x' + R.maxCombo, W / 2, H * 0.445, 42, C.flag);
    if (R.ok && R.score > R.prevBest && R.prevBest > 0) txt('NEW RECORD', W / 2, H * 0.5, 60, C.yel);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, H * 0.5, 44, C.pond);
    if (!R.ok) txt('あと' + Math.max(1, R.flags.length - R.hits) + '本', W / 2, H * 0.55, 50, C.flag);
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    game.draw.rect(0, 0, W, 230, C.ink);
    var sc = 1 + Math.sin(e * 4) * 0.04;
    txt(GAME_TITLE, W / 2, 104, Math.round(100 * sc), Math.floor(e * 3) % 2 === 0 ? C.yel : C.balloon);
    txt('HI-SCORE ' + game.best, W / 2, 192, 38, C.white);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 48, C.yel);
    else txt('TAP TO START', W / 2, H * 0.975, 44, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (beginPull(y)) game.audio.tone(320, 0.05, { wave: 'square', volume: 0.06 });
    else game.fx.burst(x, y, { color: C.dim, count: 3, speed: 60 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    if (setPull(y - R.pull.y0)) game.audio.tone('G5', 0.06, { wave: 'triangle', volume: 0.07, slide: 400 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var res = releasePull();
    if (res === 'weak') {
      game.audio.tone(180, 0.1, { wave: 'square', volume: 0.06, slide: -80 });
      game.fx.burst(540, 1080, { color: C.pondL, count: 6, speed: 140 });
    } else if (res !== 'none') {
      game.audio.play('se_jump', 0.35);
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: !!R.pull, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawHud();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 42, C.white);
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
        var stats = { score: R.score, hits: R.hits, flags: R.flags.length, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    demo.t = 0; demo.cyc = 0;
  });
})(game);
