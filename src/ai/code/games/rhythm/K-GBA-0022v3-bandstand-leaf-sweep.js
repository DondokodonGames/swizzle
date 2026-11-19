// K-GBA-0022v3-bandstand-leaf-sweep.js
// 野外音楽堂の葉払い — 楽団が表拍を刻む合間、裏拍ごとに四方から吹き込む落ち葉の束を、来た方へ払い返して譜面台を守る
// 操作: 譜面台の上下左右から落ち葉の束が飛んでくる。束が譜面台の輪に届く裏拍の頭で、束が来た方向(左から来たら左、上から来たら上)へ画面を払う(スワイプ)。向き違い・拍外れはMISS
// 終わり: 7小節(約15秒)を乗り切ればCLEAR。向き違い・早払い・払い損ね(譜面台に積もる)のMISSが3回でGAME OVER
// @mechanic: swipe_direction
// @theme: bandstand_leaf_sweep_back
// 世界観: 落ち葉の舞う秋の公園の野外音楽堂で、譜面番の少女が、町の楽団の演奏中に四方から裏拍で吹き込む落ち葉の束をはたきで来た方へ払い返し、譜面台を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 全体を褐色〜灰に寄せた低彩度。灯りにブルーム(半透明円の重ね)、四辺にビネット。コントラストを意図的に潰す
  var STYLE = { bg: ['#3a3029', '#6b5845', '#2a221c'], main: ['#b89a72', '#8a6e52', '#d8c3a0'], accent: ['#d9822b', '#ffd98a'] };
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], ground: STYLE.bg[2],
    wood: STYLE.main[0], woodDk: STYLE.main[1], pale: STYLE.main[2],
    leaf: STYLE.accent[0], gold: STYLE.accent[1],
    leafDk: '#8a4e22', red: '#d0564a', ink: '#1a1410', floor: '#7a6450', roof: '#5e4a3c', roofHi: '#8a7058'
  };

  var GAME_TITLE = 'LEAF SWEEP';
  var BPM = 116;
  var SPB = 60 / BPM;
  var TIME_LIMIT = 15;                 // 7小節+1拍 = 29拍 ≒ 15秒
  var WIN_P = 0.07, WIN_G = 0.15, EARLY_ZONE = 0.35;
  var LIVES = 3;
  var LEAD = 2;                        // 吹き込んでから輪に届くまで2拍
  var CX = W * 0.5, CY = H * 0.46;
  var RING = 150, SPAWN = 620;
  var DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  var OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
  // [届く拍(すべて裏拍 x.5), 来る方向]
  var CHART = [[4.5, 'left'], [6.5, 'right'], [8.5, 'up'], [10.5, 'down'],
    [12.5, 'left'], [13.5, 'up'], [15.5, 'right'], [16.5, 'down'], [17.5, 'left'], [18.5, 'right'], [19.5, 'up'],
    [20.5, 'right'], [21.5, 'down'], [22.5, 'left'], [23.5, 'up'], [24.5, 'left'], [25.5, 'right'], [27.5, 'down']];
  var DEMO_CHART = [[4.5, 'left'], [6.5, 'up'], [8.5, 'right'], [10.5, 'down']];
  var DEMO_WRONG = 2;                  // 3束目はわざと逆へ払う失敗例
  var DEMO_CYCLE = 12 * SPB + 1.2;
  var BASS = ['D3', 'A2', 'Bb2', 'A2'];
  var MEL = ['F5', 'A5', 'D6', 'A5', 'G5', 'E5', 'C#5', 'E5', 'F5', 'D5', 'Bb4', 'D5', 'E5', 'C#5', 'A4', 'R'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: CX, gy: H * 0.86 };
  var swipe = null;
  var drift = [];
  for (var di = 0; di < 22; di++) drift.push({ x: (di * 211) % W, y: 240 + (di * 331) % (H - 240), s: 10 + (di % 4) * 4, v: 50 + (di % 5) * 18 });

  // 落ち葉の束(2コマでざわつく)
  var BUNDLE_A = ['..ll....', '.lLll.l.', 'lLLlllL.', '.llLLll.', 'lLllLLll', '.lLlll..', '..l.Ll..', '....l...'];
  var BUNDLE_B = ['...l.l..', '.llLll..', '.lLLlLl.', 'llLLlll.', '.lLlLLll', 'lllLll..', '.l..Ll..', '...l....'];
  var PAL_LEAF = { l: C.leaf, L: C.leafDk };
  var PAL_LEAF_FLASH = { l: '#fff4dc', L: '#fff4dc' };
  // 譜面番の少女。h=髪 s=肌 e=目 c=上着 f=マフラー k=靴
  var GIRL_A = ['..hhhhh...', '.hhhhhhh..', '.hsssssh..', '.hsesesh..', '..sssss...', '.ffffffc..', 'cccffcccc.', 'c.ccccc.c.', 's.ccccc.s.', '..ccccc...', '..k...k...', '.kk...kk..'];
  var GIRL_B = ['..hhhhh...', '.hhhhhhh..', '.hsssssh..', '.hsesesh..', '..sssss...', '.ffffffc..', 'cccffcccc.', 'c.ccccc.c.', 's.ccccc.s.', '..ccccc...', '.k.....k..', 'kk.....kk.'];
  var GIRL_SWING = ['..hhhhh...', '.hhhhhhh..', '.hsssssh..', '.hsesesh..', '..sssss...', '.fffffffcs', 'cccffccc..', 'c.ccccc...', 's.ccccc...', '..ccccc...', '..k...k...', '.kk...kk..'];
  var GIRL_OOPS = ['.hhhhh....', 'hhhhhhh...', 'hsssssh.s.', 'hseesesh.c', '.sssss..c.', 'ffffffcc..', '.ccffccc..', '..ccccc...', '..ccccc...', '..ccccc...', '..k...k...', '.kk...kk..'];
  var PAL_GIRL = { h: '#4a3426', s: '#e0c4a4', e: C.ink, c: '#7c5a6a', f: C.leaf, k: C.ink };
  // 楽団(チューバ・太鼓)
  var TUBA_A = ['..yyy...', '.yy.yy..', '.y...y..', '..yyy...', '..sss...', '.ccccc..', '.ccccc..', '..c.c...'];
  var TUBA_B = ['..yyy...', '.yy.yy..', '.y...y..', '..yyy...', '..sss...', '.ccccc..', '.ccccc..', '.c...c..'];
  var DRUM_A = ['..sss...', '..sss...', '.ccccc..', 'wwwwwww.', 'wwwwwww.', 'wwwwwww.', '..c.c...', '..c.c...'];
  var DRUM_B = ['..sss.s.', '..sss.c.', '.ccccc..', 'wwwwwww.', 'wwwwwww.', 'wwwwwww.', '.c...c..', '.c...c..'];
  var PAL_BAND = { y: '#c8a860', s: '#d8bc9c', c: '#4e4a58', w: '#bfae94' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function bloom(x, y, r, col) {
    game.draw.circle(x, y, r * 2.4, col, 0.07);
    game.draw.circle(x, y, r * 1.5, col, 0.13);
    game.draw.circle(x, y, r, col, 0.5);
  }

  function newRun(isDemo) {
    var chart = isDemo ? DEMO_CHART : CHART;
    var bs = [];
    for (var i = 0; i < chart.length; i++) bs.push({ T: chart[i][0], from: chart[i][1], st: 'wait', flash: 0, back: 0, seed: i * 1.3 });
    return {
      demo: isDemo, bs: bs, songT: 0, beatIdx: -1, stepIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, pile: 0,
      flick: null, pulse: 0, offPulse: 0, oops: 0, gust: null,
      stop: 0, stopB: null, over: false, ok: false, endWait: 0,
      endBeat: Math.ceil(chart[chart.length - 1][0]) + 1, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    swipe = null;
  }

  function bundlePos(b, t) {
    var d = DIRS[b.from];
    var tArr = b.T * SPB;
    var dist;
    if (b.st === 'back') dist = RING + b.back * 1700;
    else {
      var p = (t - (tArr - LEAD * SPB)) / (LEAD * SPB);
      dist = SPAWN - (SPAWN - RING) * p;
      if (dist < 40) dist = 40;
    }
    return { x: CX + d[0] * dist, y: CY + d[1] * dist };
  }

  // ── 音(楽団は表拍=ブン、裏拍は空けて払いの音で埋める) ──────
  function playStep(st, vol) {
    var bar = Math.floor(st / 8), s8 = st % 8;
    if (st % 2 === 0) {
      game.audio.tone(BASS[bar % 4], SPB * 0.55, { wave: 'triangle', volume: 0.12 * vol });
      if (s8 === 0 || s8 === 4) game.audio.tone(80, 0.12, { wave: 'sine', volume: 0.14 * vol, slide: -30 });
      var m = MEL[(st / 2) % 16];
      if (m !== 'R') game.audio.tone(m, SPB * 0.45, { wave: 'square', volume: 0.025 * vol });
    } else {
      game.audio.tone(5200, 0.02, { wave: 'square', volume: 0.008 * vol });   // 裏はかすかな刻みだけ
    }
  }

  function onBeat(b) { R.pulse = 1; }

  // ── 判定 ──────────────────────────────────────────────
  // 戻り値: 'PERFECT'|'GOOD'|'wrong'|'early'|'whiff'|'none'
  function doSwipe(dir) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.flick = { dir: dir, t: 0.22 };
    var now = R.songT, best = null, bestE = 1e9;
    for (var i = 0; i < R.bs.length; i++) {
      var b = R.bs[i];
      if (b.st !== 'fly') continue;
      var e = now - b.T * SPB;
      if (e >= -EARLY_ZONE && e <= WIN_G && Math.abs(e) < Math.abs(bestE)) { best = b; bestE = e; }
    }
    if (!best) return 'whiff';
    if (dir !== best.from) { missB(best, 'wrong'); return 'wrong'; }
    if (Math.abs(bestE) <= WIN_P) { hitB(best, 'PERFECT'); return 'PERFECT'; }
    if (Math.abs(bestE) <= WIN_G) { hitB(best, 'GOOD'); return 'GOOD'; }
    missB(best, 'early');
    return 'early';
  }

  function hitB(b, grade) {
    var p = bundlePos(b, R.songT);
    b.st = 'back'; b.back = 0;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    var add = (grade === 'PERFECT' ? 100 : 60) + R.combo * 10;
    if (grade === 'PERFECT') R.perfect++; else R.good++;
    R.score += add;
    game.feedback.good(p.x, p.y, { text: grade, color: grade === 'PERFECT' ? C.gold : C.pale, count: grade === 'PERFECT' ? 16 : 10 });
    game.fx.burst(p.x, p.y, { color: C.leaf, count: 12, speed: 420 });
    game.fx.popup('+' + add, CX, CY + 220, { color: C.pale, size: 42 });
    game.audio.tone(grade === 'PERFECT' ? 'A5' : 'F5', 0.08, { wave: 'triangle', volume: R.demo ? 0.05 : 0.1 });   // 払いの「パッ」
    if (!R.demo && R.combo > 0 && R.combo % 4 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.27, { color: C.gold, size: 66 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missB(b, kind) {
    b.st = 'miss'; b.flash = 0.45; b.kind = kind; b.missPos = bundlePos(b, R.songT);
    R.combo = 0; R.miss++; R.lives--; R.pile++;
    R.stop = 0.45; R.stopB = b; R.oops = 1.3;
    game.audio.tone(kind === 'wrong' ? 220 : 150, 0.3, { wave: 'sawtooth', volume: R.demo ? 0.05 : 0.1, slide: -80 });
  }

  function releaseStop() {
    var b = R.stopB;
    R.stopB = null;
    if (!b) return;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    game.fx.burst(CX, CY, { color: C.leafDk, count: 18, speed: 300 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.7;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) game.audio.melody([['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['D6', 1.5]], { tempo: BPM, wave: 'triangle', volume: 0.07, bass: [['D3', 1.5], ['A2', 1.5]] });
    else game.audio.melody([['A4', 0.5], ['F4', 0.5], ['D4', 2]], { tempo: BPM, wave: 'triangle', volume: 0.06 });
    if (ok) for (var i = 0; i < 4; i++) game.fx.burst(CX + (i - 1.5) * 220, H * 0.36, { color: i % 2 ? C.gold : C.leaf, count: 18, speed: 420 });
    if (R.score > R.prevBest && R.score > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.offPulse = Math.max(0, R.offPulse - dt * 3);
    R.oops = Math.max(0, R.oops - dt);
    if (R.flick) { R.flick.t -= dt; if (R.flick.t <= 0) R.flick = null; }
    if (R.gust) { R.gust.t -= dt; if (R.gust.t <= 0) R.gust = null; }
    for (var d = 0; d < drift.length; d++) {
      drift[d].y += drift[d].v * dt; drift[d].x += Math.sin(game.time.elapsed * 1.3 + d) * 30 * dt;
      if (drift[d].y > H) drift[d].y = 240;
    }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('A4', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) {
      R.stepIdx++;
      if (R.stepIdx % 2 === 1) R.offPulse = 1;
      playStep(R.stepIdx, R.demo ? 0.45 : 1);
    }
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    for (var i = 0; i < R.bs.length; i++) {
      var b = R.bs[i];
      var tArr = b.T * SPB;
      if (b.flash > 0) b.flash = Math.max(0, b.flash - dt);
      if (b.st === 'wait' && R.songT >= tArr - LEAD * SPB) {
        b.st = 'fly';
        R.gust = { from: b.from, t: 0.6 };
        game.audio.tone(b.from === 'up' || b.from === 'down' ? 900 : 600, 0.25, { wave: 'triangle', volume: R.demo ? 0.025 : 0.05, slide: -400 });   // 風の予告
      }
      if (b.st === 'fly' && R.songT > tArr + WIN_G) { missB(b, 'reach'); return; }
      if (b.st === 'back') { b.back += dt; if (b.back > 0.5) b.st = 'gone'; }
      if (b.st === 'miss' && R.songT > tArr + WIN_G + SPB) b.st = 'gone';
    }
    if (!R.demo && (R.songT >= R.endBeat * SPB || R.songT >= TIME_LIMIT)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(裏拍の頭で来た方へ払う / 3束目はわざと逆へ払う失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; demo.anim = null; }
    var next = null, idx = -1;
    for (var i = 0; i < R.bs.length; i++) {
      if (R.bs[i].st === 'wait' || R.bs[i].st === 'fly') { next = R.bs[i]; idx = i; break; }
    }
    var baseX = CX, baseY = H * 0.86;
    if (next && R.stop <= 0) {
      var dir = idx === DEMO_WRONG ? OPP[next.from] : next.from;
      var tArr = next.T * SPB;
      if (!demo.anim && R.songT >= tArr - 0.12) demo.anim = { dir: dir, t: 0 };
      if (demo.anim && !demo.anim.fired && R.songT >= tArr) { doSwipe(demo.anim.dir); demo.anim.fired = true; }
    }
    var tx = baseX, ty = baseY + Math.sin(demo.t * 4) * 10;
    if (demo.anim) {
      demo.anim.t += dt;
      var k = Math.min(1, demo.anim.t / 0.22);
      var v = DIRS[demo.anim.dir];
      tx = baseX + v[0] * 200 * k; ty = baseY + v[1] * 160 * k;
      demo.press = k < 1;
      if (demo.anim.t > 0.4) demo.anim = null;
    } else demo.press = false;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 22);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 22);
  }

  // ── 描画 ──────────────────────────────────────────────
  function ellipse(x, y, rx, ry, col, a) {
    for (var yy = -ry; yy < ry; yy += 4) {
      var hw = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(x - hw, y + yy, hw * 2, 4, col, a);
    }
  }

  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.3, C.sky1], [0.62, '#5a4836'], [1, C.ground]]);
    // 遠景の木立(低彩度の塊 + 霞)
    for (var i = 0; i < 7; i++) {
      var tx = i * 170 + 20, ty = H * 0.3 + (i % 2) * 30;
      game.draw.rect(tx + 46, ty + 40, 16, 160, '#3e3128');
      game.draw.circle(tx + 54, ty + 10, 90, i % 2 ? '#7e5a36' : '#6a5038', 0.9);
      game.draw.circle(tx + 30, ty + 40, 60, '#8a6440', 0.6);
    }
    game.draw.rect(0, H * 0.28, W, H * 0.2, '#9a8670', 0.18);
    // 街灯(ブルーム)
    for (var l = 0; l < 2; l++) {
      var lx = l === 0 ? 70 : W - 70;
      game.draw.rect(lx - 6, H * 0.28, 12, H * 0.42, '#2e2620');
      bloom(lx, H * 0.28, 22 + Math.sin(e * 3 + l) * 2, C.gold);
    }
  }

  function drawStand() {
    var e = game.time.elapsed;
    // 舞台の床(楕円の積み重ね)
    ellipse(CX, H * 0.6, 470, 120, '#5a4838');
    ellipse(CX, H * 0.585, 460, 112, C.floor);
    // 奥の柱と楽団
    for (var c = 0; c < 4; c++) {
      var px = CX - 380 + c * 253;
      game.draw.rect(px - 14, H * 0.2, 28, H * 0.37, C.woodDk);
      game.draw.rect(px - 14, H * 0.2, 8, H * 0.37, C.wood);
    }
    var f = R.pulse > 0.5 ? 1 : 0;
    game.draw.sprite(f ? TUBA_B : TUBA_A, PAL_BAND, CX - 260, H * 0.53 - R.pulse * 6, 9, { anchor: 'center' });
    game.draw.sprite(f ? DRUM_B : DRUM_A, PAL_BAND, CX + 260, H * 0.53 - R.pulse * 6, 9, { anchor: 'center' });
    if (R.pulse > 0.6) bloom(CX + 260, H * 0.53, 30, C.pale);
    // 屋根(台形を横帯で塗る)
    var top = 240, bot = H * 0.21;
    for (var y = top; y < bot; y += 4) {
      var k = (y - top) / (bot - top);
      var hw = 120 + k * 400;
      game.draw.rect(CX - hw, y, hw * 2, 4, k < 0.15 ? C.roofHi : C.roof);
    }
    game.draw.rect(CX - 530, bot, 1060, 18, C.woodDk);
    for (var g = 0; g < 9; g++) bloom(CX - 480 + g * 120, bot + 26, 8 + (Math.floor(e * 2 + g) % 3 === 0 ? 2 : 0), C.gold);
  }

  function drawMusicStand() {
    // 輪(裏拍で光る)
    var rr = RING + R.offPulse * 10;
    for (var a = 0; a < 24; a++) {
      var an = (a / 24) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(an) * rr, CY + Math.sin(an) * rr, 7, R.offPulse > 0.3 ? C.gold : C.pale, R.offPulse > 0.3 ? 0.9 : 0.4);
    }
    if (R.offPulse > 0.3) bloom(CX, CY, 40, C.gold);
    // 譜面台と積もった葉
    game.draw.rect(CX - 6, CY, 12, 160, '#2e2620');
    game.draw.rect(CX - 80, CY - 70, 160, 100, C.pale);
    game.draw.rect(CX - 80, CY - 70, 160, 10, '#f0e2c4');
    for (var s = 0; s < 5; s++) game.draw.rect(CX - 64, CY - 48 + s * 16, 128, 3, '#6a5a4a');
    for (var p = 0; p < R.pile; p++) game.draw.sprite(BUNDLE_A, PAL_LEAF, CX - 50 + p * 50, CY + 20 - p * 8, 6, { anchor: 'center' });
  }

  function drawGirl() {
    var e = game.time.elapsed;
    var fl = R.flick;
    var frame = R.oops > 0 ? GIRL_OOPS : (fl ? GIRL_SWING : (Math.floor(e * BPM / 60) % 2 === 0 ? GIRL_A : GIRL_B));
    var gx = CX, gy = CY + 240 - R.pulse * 6;
    game.draw.sprite(frame, PAL_GIRL, gx, gy, 12, { anchor: 'center', flipX: !!(fl && fl.dir === 'left') });
    // はたき
    var hx = gx + 50, hy = gy - 20, tx = gx + 90, ty = gy - 130;
    if (fl) {
      var v = DIRS[fl.dir], k = 1 - fl.t / 0.22;
      hx = gx + (v[0] !== 0 ? v[0] * 50 : 40); hy = gy - 20;
      tx = CX + v[0] * (RING + 40) * k + (v[0] === 0 ? 60 : 0);
      ty = CY + v[1] * (RING + 40) * k + (v[1] === 0 ? 30 : 0);
    }
    game.draw.line(hx, hy, tx, ty, '#6a4a30', 8);
    game.draw.circle(tx, ty, 22, C.pale, 0.9);
    game.draw.circle(tx, ty, 12, C.gold, 0.8);
  }

  function drawBundles() {
    var e = game.time.elapsed;
    // 風の予告: 吹き込む側の縁が光る
    if (R.gust) {
      var gv = DIRS[R.gust.from], a = R.gust.t / 0.6;
      for (var s = 0; s < 6; s++) {
        var off = (s - 2.5) * 70;
        var sx = CX + gv[0] * 470 + (gv[0] === 0 ? off : 0), sy = CY + gv[1] * 520 + (gv[1] === 0 ? off : 0);
        game.draw.line(sx, sy, sx - gv[0] * 140, sy - gv[1] * 140, C.pale, 6);
        game.draw.circle(sx, sy, 10, C.gold, a);
      }
    }
    for (var i = 0; i < R.bs.length; i++) {
      var b = R.bs[i];
      if (b.st === 'wait' || b.st === 'gone') continue;
      var p = b.st === 'miss' ? (R.stopB === b ? b.missPos : { x: CX, y: CY }) : bundlePos(b, R.songT);
      if (b.st === 'fly') {
        var v = DIRS[b.from];
        for (var t = 1; t <= 4; t++) game.draw.circle(p.x + v[0] * t * 34, p.y + v[1] * t * 34, 12 - t * 2, C.pale, 0.35 - t * 0.06);
      }
      var white = b.flash > 0 && Math.floor(e * 20) % 2 === 0;
      var px = b.flash > 0 ? 15 : 12;
      var fr = Math.floor(e * 8 + b.seed) % 2 === 0 ? BUNDLE_A : BUNDLE_B;
      game.draw.sprite(fr, white ? PAL_LEAF_FLASH : PAL_LEAF, p.x, p.y, px, { anchor: 'center', alpha: b.st === 'back' ? Math.max(0, 1 - b.back * 2) : 1 });
    }
  }

  function drawPad() {
    var x = CX, y = H * 0.86;
    var next = null;
    for (var i = 0; i < R.bs.length; i++) if (R.bs[i].st === 'fly') { next = R.bs[i]; break; }
    var keys = ['up', 'down', 'left', 'right'];
    for (var k = 0; k < 4; k++) {
      var v = DIRS[keys[k]];
      var lit = next && next.from === keys[k] && next.T * SPB - R.songT < SPB * 0.6;
      var on = R.flick && R.flick.dir === keys[k];
      var col = on ? C.gold : (lit ? C.pale : C.woodDk);
      for (var s = 0; s < 3; s++) {
        var d = 70 + s * 34, w = 46 - s * 12;
        game.draw.rect(x + v[0] * d - w / 2, y + v[1] * d - w / 2, w, w, col, 0.85);
      }
    }
    game.draw.circle(x, y, 30, C.woodDk, 0.8);
  }

  function drawDrift() {
    for (var d = 0; d < drift.length; d++) {
      var p = drift[d];
      game.draw.rect(p.x, p.y, p.s, p.s * 0.6, d % 3 ? C.leaf : C.leafDk, 0.55);
    }
  }

  function drawPost() {
    // ビネット(四辺に黒の半透明を重ねる)
    for (var i = 0; i < 3; i++) {
      var w = 70 + i * 60, a = 0.16;
      game.draw.rect(0, 0, w, H, '#000000', a);
      game.draw.rect(W - w, 0, w, H, '#000000', a);
      game.draw.rect(0, H - w, W, w, '#000000', a);
      game.draw.rect(0, 232, W, w * 0.6, '#000000', a * 0.6);
    }
    game.draw.rect(0, 0, W, H, '#6b5845', 0.08);   // 褐色に寄せてコントラストを潰す
  }

  function drawWorld() {
    drawBg();
    drawStand();
    drawDrift();
    drawMusicStand();
    drawGirl();
    drawBundles();
    drawPad();
    drawPost();
  }

  // 拍の物差し: 大きい点=表拍(楽団)、金の小さい点=裏拍(払う拍)
  function drawRuler(y) {
    var x0 = W / 2 - 280, stepW = 80;
    var bar = R.beatIdx < 0 ? 0 : Math.floor(R.beatIdx / 4);
    var cur = R.ready > 0 ? -1 : Math.floor(R.songT / (SPB / 2)) - bar * 8;
    for (var s = 0; s < 8; s++) {
      var on = s % 2 === 0, lit = s === cur;
      var x = x0 + s * stepW;
      if (on) game.draw.circle(x, y, 16, lit ? C.pale : '#4a3e34');
      else game.draw.circle(x, y, 11, lit ? C.gold : '#7a5a2a');
    }
    for (var i = 0; i < R.bs.length; i++) {
      var b = R.bs[i];
      if (b.st !== 'wait' && b.st !== 'fly') continue;
      var rel = b.T - bar * 4;
      if (rel < 0 || rel >= 4) continue;
      var bx = x0 + rel * 2 * stepW;
      game.draw.sprite(BUNDLE_A, PAL_LEAF, bx, y - 40, 3, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 232, C.ink, 0.55);
    txt('SCORE ' + R.score, 40, 56, 44, C.pale, 'left');
    txt('BEST ' + game.best, W - 40, 56, 34, C.gold, 'right');
    var done = 0;
    for (var i = 0; i < R.bs.length; i++) if (R.bs[i].st !== 'wait' && R.bs[i].st !== 'fly') done++;
    txt(done + ' / ' + R.bs.length, 40, 128, 36, C.pale, 'left');
    drawRuler(150);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(BUNDLE_A, l < R.lives ? { l: C.gold, L: C.leaf } : { l: '#4a3e34', L: '#3a3029' }, W - 70 - l * 64, 128, 5, { anchor: 'center' });
    var progress = Math.min(1, R.songT / (R.endBeat * SPB));
    game.draw.rect(40, 204, W - 80, 14, '#3a3029');
    game.draw.rect(40, 204, (W - 80) * progress, 14, C.leaf);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.66, 40, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.34, 100, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.21, W, H * 0.34, C.ink, 0.85);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 96, R.ok ? C.gold : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.34, 62, C.pale);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.39, 36, C.wood);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.435, 36, C.wood);
    if (R.score > R.prevBest && R.score > 0) txt('NEW RECORD', W / 2, H * 0.485, 52, C.gold);
    else txt('BEST ' + Math.max(R.prevBest, R.score), W / 2, H * 0.485, 44, C.gold);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.bs.length; i++) if (R.bs[i].st === 'wait' || R.bs[i].st === 'fly') left++;
      txt('あと' + Math.max(1, left) + '束', W / 2, H * 0.53, 46, C.red);
    } else if (R.prevBest > R.score) {
      txt('あと' + (R.prevBest - R.score) + '点', W / 2, H * 0.53, 46, C.pale);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.rect(0, 0, W, 232, C.ink, 0.55);
    bloom(W / 2, 86 + bob, 120, C.gold);
    game.draw.text(GAME_TITLE, W / 2 + 6, 86 + 6 + bob, { size: 112, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 86 + bob, { size: 112, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, 186, 40, C.pale);
    drawRuler(278);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 50, C.gold);
    else txt('TAP TO START', W / 2, H * 0.955, 44, C.pale);
  }

  // ── 入力 ──────────────────────────────────────────────
  function dirOf(dx, dy) {
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }
  function swipeFeedback(res) {
    if (res === 'whiff') {
      game.audio.tone(700, 0.06, { wave: 'triangle', volume: 0.04, slide: -300 });
      game.fx.burst(CX, CY + 160, { color: C.pale, count: 4, speed: 120 });
    } else if (res === 'wrong' || res === 'early') {
      game.audio.play('se_tap', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    swipe = { x0: x, y0: y, fired: false };
    game.audio.tone(260, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !swipe || swipe.fired) return;
    var dx = x - swipe.x0, dy = y - swipe.y0;
    if (dx * dx + dy * dy >= 60 * 60) {
      swipe.fired = true;
      var res = doSwipe(dirOf(dx, dy));
      swipeFeedback(res);
      if (res !== 'none') game.audio.tone(1200, 0.05, { wave: 'triangle', volume: 0.04, slide: -700 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !swipe) return;
    if (!swipe.fired) {
      var dx = x - swipe.x0, dy = y - swipe.y0;
      if (dx * dx + dy * dy >= 30 * 30) {
        var res = doSwipe(dirOf(dx, dy));
        swipeFeedback(res);
        game.audio.tone(1200, 0.05, { wave: 'triangle', volume: 0.04, slide: -700 });
      }
    }
    swipe = null;
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
      drawWorld();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 44, C.pale);
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
