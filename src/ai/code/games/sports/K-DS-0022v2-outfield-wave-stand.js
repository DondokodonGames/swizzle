// K-DS-0022v2-outfield-wave-stand.js
// 外野席ウェーブ待ち — 三拍子の場内オルガンに乗って外野席の列を1拍に1席ずつ伝ってくる立ち上がりの波を我慢して待ち、自分の番の拍でだけ立つ
// 操作: 画面のどこでもタップで立ち上がる(下の丸いバッジが反応)。波は1拍に1席ずつ手前の端の自分へ近づき、隣の人が立った次の拍の頭が自分の番(ずれでPERFECT/GOOD)。番以外で立つと「ひとりだけ立つ」MISS、番の直前の早立ちもMISS。居眠り客で波が途切れた回は立たずに我慢するとNICE。番を逃すとMISS
// 終わり: 9小節(三拍子27拍・約14.5秒)を乗り切ればCLEAR(判定点+我慢ボーナス+残りライフ)。MISS 3回でGAME OVER
// @mechanic: cooldown_tap
// @theme: ballpark_outfield_wave
// 世界観: 野球場の外野席で、列の端に座る観客の一人が、三拍子の場内オルガンに乗って横一列を伝ってくるウェーブの自分の番を待ち、その拍でだけ立ち上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・我慢できた回数・最大コンボ
// スタイル: 80s ISO

(function(game) {
  var STYLE = { bg: ['#4aa8e0', '#bfe8f8'], main: ['#3f9a3a', '#c83a2a', '#2a3c86'], accent: ['#ffd23a', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの座席段と芝。奥ほど小さくしない(等角)。立ち上がった高さは足元の影との距離で示す
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], grass: STYLE.main[0], seatR: STYLE.main[1], seatB: STYLE.main[2],
    gold: STYLE.accent[0], white: STYLE.accent[1],
    grassD: '#2f7a2c', grassL: '#58b04a', seatRD: '#8a2418', seatBD: '#1a2656', seatRL: '#e05a44', seatBL: '#4058b0',
    concrete: '#cfc6b4', concreteD: '#8a8478', track: '#b0784a', ink: '#141a2a', skin: '#f2c08a',
    board: '#1c2e22', lampOff: '#3a4c40', good: '#7cf07a', bad: '#ff4a3a', wall: '#24603a', dim: '#6a7088', zz: '#a8c8ff'
  };

  var GAME_TITLE = 'WAVE STAND';
  var BPM = 112, SPB = 60 / BPM, BEATS_IN_BAR = 3, BARS = 9, SONG_BEATS = BARS * BEATS_IN_BAR;
  var TIME_LIMIT = 14.5;               // 9小節 × 三拍子 × 0.536秒
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.14;
  var LIVES = 3;
  var P = 10;                          // 自分の席(中段の列の手前の端)
  // 波の予定: t=自分の番の拍、d=何席手前から始まるか、z=居眠り客の位置(自分から何席手前。そこで波が途切れる)
  var PLAN = [
    { t: 3, d: 2 }, { t: 6, d: 2 }, { t: 9, d: 3 }, { t: 11, d: 3 }, { t: 14, d: 4, z: 1 },
    { t: 16, d: 4 }, { t: 18, d: 5 }, { t: 20, d: 5, z: 2 }, { t: 23, d: 3 }, { t: 25, d: 2 }
  ];
  var DEMO_PLAN = [{ t: 3, d: 2 }, { t: 6, d: 3, z: 1 }, { t: 8, d: 2 }];
  var DEMO_BEATS = 9;
  var DEMO_CYCLE = DEMO_BEATS * SPB + 1.4;

  // 場内オルガンのワルツ(オリジナル): 1拍目にベース、2・3拍目に和音を短く。旋律は拍ごと
  var PROG = ['C', 'C', 'F', 'G', 'C', 'A', 'D', 'G', 'C'];
  var ROOT = { C: 'C3', F: 'F2', G: 'G2', A: 'A2', D: 'D3' };
  var STAB = { C: ['E4', 'G4'], F: ['A4', 'C5'], G: ['B3', 'D4'], A: ['C#4', 'E4'], D: ['F#4', 'A4'] };
  var MEL = ['G4', 'C5', 'E5', 'G5', 'E5', 'C5', 'A4', 'C5', 'F5', 'D5', 'B4', 'G4', 'C5', 'E5', 'G5',
             'A5', 'E5', 'C#5', 'D5', 'F#5', 'A5', 'G5', 'D5', 'B4', 'C5', 'G4', 'C5'];
  var WAVE_NOTES = ['C6', 'A5', 'G5', 'E5', 'D5', 'C5'];

  // 等角の座席: i=列の席番号(0..10)、j=段(0=後ろの高い段 / 1=自分の段 / 2=前の段)
  var HW = 76, HH = 38, STEP = 46, OX = 170, OY = 560;
  function iso(i, j) { return { x: OX + (i - j) * HW, y: OY + (i + j) * HH - (2 - j) * STEP }; }
  var BX = 540, BY = Math.round(H * 0.86), BR = 118;   // 親指ゾーンのバッジ

  // ── スプライト ─────────────────────────────────────────
  var FAN_SIT = [
    '...hhhh...', '..hhhhhh..', '..skssks..', '..ssssss..', '...smms...',
    '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pppppp..'
  ];
  var FAN_UP = [
    's..hhhh..s', 'c.hhhhhh.c', 'c.skssks.c', 'c.ssssss.c', 'cc.skks.cc', '.cccccccc.',
    '..cccccc..', '..cccccc..', '..pppppp..', '..pp..pp..', '..pp..pp..', '..kk..kk..'
  ];
  var FAN_DOZE = [
    '...hhhh...', '..hhhhhh..', '..kksskk..', '..ssssss..', '...ssks...',
    '..cccccc..', '.sccccccs.', '.sccccccs.', '..cccccc..', '..pppppp..'
  ];
  var FAN_OOPS = [
    '...hhhh...', '..hhhhhh..', '..skssks..', '..ssssss..', '...skks...', '..cccccc..',
    '.sccccccs.', '.sccccccs.', '..cccccc..', '..pppppp..', '..pp..pp..', '..kk..kk..'
  ];
  var SHIRTS = ['#f4f0e6', '#e0503a', '#3a5ac8', '#2aa88a'];
  var HAIRS = ['#3a2a1a', '#6a4a2a', '#2a2a3a', '#8a5a2a'];
  var FAN_PALS = [];
  for (var fp = 0; fp < 4; fp++) FAN_PALS.push({ h: HAIRS[fp], s: C.skin, k: C.ink, m: '#c8402a', c: SHIRTS[fp], p: '#3a3a4a' });
  var ME_PAL = { h: C.gold, s: C.skin, k: C.ink, m: '#c8402a', c: C.white, p: C.seatB };
  var WHITE_PAL = { h: '#fff', s: '#fff', k: '#fff', m: '#fff', c: '#fff', p: '#fff' };
  var CLOUD = ['..wwww....', '.wwwwwww..', 'wwwwwwwwww', '.wwwwwwww.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, cyc: 0, ti: 0, plan: [3, 8], press: 0, gx: BX, gy: BY + 40 };

  function txt(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ── 進行 ───────────────────────────────────────────────
  function newRun(isDemo) {
    var plan = isDemo ? DEMO_PLAN : PLAN;
    var heads = [], i, k;
    for (i = 0; i < plan.length; i++) heads.push({ t: plan[i].t, d: plan[i].d, z: plan[i].z || 0, st: 'wait', dead: false, doze: 0 });
    // 居眠り客が目を閉じる拍: 波が途切れる2拍前から(その席を別の波が通るならその後)。最短でも0.8秒前に見える
    for (i = 0; i < heads.length; i++) {
      var h = heads[i];
      if (!h.z) continue;
      var fb = h.t - h.z, ds = fb - 2;
      for (k = 0; k < heads.length; k++) {
        if (k === i) continue;
        var pb = heads[k].t - h.z;
        if (heads[k].t - heads[k].d <= pb && pb < fb && pb + 0.5 > ds) ds = pb + 0.5;
      }
      h.doze = ds;
    }
    return {
      demo: isDemo, heads: heads, songBeats: isDemo ? DEMO_BEATS : SONG_BEATS,
      clock: isDemo ? -0.3 : -READY_T, beatIdx: isDemo ? -1 : -2,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, held: 0,
      stop: 0, flash: 0, me: 0, oops: 0, warn: 0, pulse: 0, fizz: 0, cheer: 0, cheerSeat: -1,
      over: false, ok: false, endWait: 0, prevBest: game.best
    };
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    game.audio.stopBgm();
    if (state === S.PLAYING) {
      // カウントインの呼び込み(オルガンの上がる2音)
      game.audio.melody([['G4', 0.5], ['C5', 0.5], ['E5', 1]], { tempo: BPM * 2, wave: 'triangle', volume: 0.07 });
    }
  }

  function organ(b) {
    var bar = Math.floor(b / BEATS_IN_BAR), k = b % BEATS_IN_BAR;
    var ch = PROG[Math.min(PROG.length - 1, bar)];
    var v = R.demo ? 0.4 : 1;
    if (k === 0) game.audio.tone(ROOT[ch], SPB * 0.9, { wave: 'triangle', volume: 0.13 * v });
    else {
      game.audio.tone(STAB[ch][0], SPB * 0.3, { wave: 'square', volume: 0.035 * v });
      game.audio.tone(STAB[ch][1], SPB * 0.3, { wave: 'square', volume: 0.03 * v });
    }
    game.audio.tone(MEL[b % MEL.length], SPB * 0.8, { wave: 'sine', volume: 0.05 * v });
  }

  function onBeat(b) {
    R.pulse = 1;
    if (b < 0) {
      if (!R.demo) game.audio.tone(b === -1 ? 'G5' : 'C5', 0.07, { wave: 'square', volume: 0.07 });
      return;
    }
    if (b >= R.songBeats) return;
    organ(b);
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (h.st !== 'wait') continue;
      var sp = h.t - h.d;
      if (b < sp || b >= h.t) continue;
      if (h.z && b >= h.t - h.z) {
        if (b === h.t - h.z && !h.dead) {
          // 居眠り客のところで波が途切れる
          h.dead = true; R.fizz = 0.8;
          var q = iso(P - h.z, 1);
          game.fx.burst(q.x, q.y - 70, { color: C.zz, count: 6, speed: 120 });
          game.audio.tone(330, 0.22, { wave: 'sawtooth', volume: R.demo ? 0.02 : 0.07, slide: -180 });
        }
        continue;
      }
      var remain = h.t - b;
      // 波が1席進むごとに音程が上がる。自分の番の1拍前は高い2音で予告
      game.audio.tone(WAVE_NOTES[Math.min(5, remain - 1)], 0.09, { wave: 'square', volume: R.demo ? 0.02 : 0.06 });
      if (b === sp) { R.cheer = 0.5; R.cheerSeat = P - h.d; }
      if (remain === 1) {
        R.warn = SPB;
        if (!R.demo) game.audio.tone('E6', 0.05, { wave: 'triangle', volume: 0.06, slide: 300 });
      }
    }
  }

  function pendingHead() {
    var best = null;
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (h.st === 'wait' && (!best || h.t < best.t)) best = h;
    }
    return best;
  }

  // 立ち上がる(本番の指も ATTRACT のゴーストも同じ関数)
  function standUp() {
    if (!R || R.over || R.stop > 0 || R.clock < -0.05) return 'locked';
    R.me = 1;
    var best = null, bd = 1e9;
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (h.st !== 'wait') continue;
      var d = R.clock - h.t * SPB;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = h; }
    }
    if (best && Math.abs(bd) <= GOOD_W && !best.z) { hitHead(best, Math.abs(bd) <= PERFECT_W ? 'PERFECT' : 'GOOD'); return 'hit'; }
    // 途切れた回に立つ / 番の直前に早立ち → その回は台無し
    if (best && (Math.abs(bd) <= GOOD_W || (bd < 0 && -bd <= SPB * 1.05))) best.st = 'miss';
    missMe();
    return 'miss';
  }

  function hitHead(h, grade) {
    h.st = 'hit';
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + Math.min(8, R.combo) * 10; }
    else { R.good++; R.score += 50 + Math.min(8, R.combo) * 5; }
    var q = iso(P, 1);
    game.feedback.good(q.x, q.y - 150, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, size: grade === 'PERFECT' ? 54 : 44, count: grade === 'PERFECT' ? 16 : 8, volume: R.demo ? 0.04 : 0.5 });
    game.fx.burst(q.x, q.y - 60, { color: C.gold, count: 10, speed: 300 });
    if (!R.demo) {
      game.audio.tone('C6', 0.12, { wave: 'triangle', volume: 0.09 });
      if (R.combo % 4 === 0) {
        game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.3, { color: C.gold, size: 70 });
        game.audio.play('se_milestone', 0.5);
      }
    }
  }

  function holdHead(h) {
    h.st = 'held';
    R.held++; R.score += 150;
    var q = iso(P, 1);
    game.fx.popup('NICE', q.x - 40, q.y - 170, { color: C.zz, size: R.demo ? 54 : 64 });
    if (!R.demo) { game.audio.play('se_coin', 0.35); game.fx.burst(BX, BY, { color: C.zz, count: 10, speed: 220 }); }
  }

  function missMe() {
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.flash = 0.42; R.oops = 1.2; R.me = 0;
    if (!R.demo) game.audio.tone(150, 0.26, { wave: 'sawtooth', volume: 0.1, slide: -70 });
  }

  function releaseStop() {
    var q = iso(P, 1);
    game.feedback.bad(q.x, q.y - 150, { text: 'MISS', shake: R.demo ? 3 : 10, volume: R.demo ? 0.03 : 0.6 });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    if (ok) R.score += R.lives * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 11; i++) { var q = iso(i, 1); game.fx.burst(q.x, q.y - 80, { color: i % 2 ? C.gold : C.white, count: 10, speed: 360 }); }
      game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5]], { tempo: BPM * 2, wave: 'square', volume: 0.06 });
    }
    if (R.score > R.prevBest && R.prevBest > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.22, { color: C.gold, size: 76 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.flash = Math.max(0, R.flash - dt);
    R.oops = Math.max(0, R.oops - dt);
    R.warn = Math.max(0, R.warn - dt);
    R.fizz = Math.max(0, R.fizz - dt);
    R.cheer = Math.max(0, R.cheer - dt);
    R.me = Math.max(0, R.me - dt * 1.6);
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    var was = R.clock;
    R.clock += dt;
    if (!R.demo && was < -0.35 && R.clock >= -0.35) game.audio.play('se_tap', 0.4);
    var bi = Math.floor(R.clock / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; onBeat(R.beatIdx); }
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (h.st === 'wait' && R.clock > h.t * SPB + GOOD_W) {
        if (h.z) holdHead(h);
        else { h.st = 'miss'; missMe(); return; }
      }
    }
    if (!R.demo && (R.clock >= R.songBeats * SPB + 0.1 || R.clock > TIME_LIMIT + 0.5)) endRun(R.lives > 0);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ。奇数周=番で立ち・途切れは我慢・次も番で立つ / 偶数周=最後に1拍早く立ってMISS
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) {
      R = newRun(true); demo.cyc++; demo.ti = 0;
      demo.plan = demo.cyc % 2 === 1 ? [3, 8] : [3, 7.3];
    }
    stepRun(dt);
    if (demo.ti < demo.plan.length && R.stop <= 0 && R.clock >= demo.plan[demo.ti] * SPB - 0.004) {
      standUp(); demo.ti++; demo.press = 0.18;
    }
    demo.press = Math.max(0, demo.press - dt);
    var hover = R.fizz > 0 ? Math.sin(game.time.elapsed * 18) * 26 : 0;
    demo.gx += (BX + 30 + hover - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (BY + 50 - (demo.press > 0 ? 20 : 0) - demo.gy) * Math.min(1, dt * 12);
  }

  // ── 描画 ───────────────────────────────────────────────
  function diamond(cx, cy, hw, hh, col, a) {
    for (var y = -hh; y < hh; y += 4) {
      var w = hw * (1 - Math.abs(y + 2) / hh);
      if (w > 0) game.draw.rect(cx - w, cy + y, w * 2, 4.5, col, a);
    }
  }
  function faceL(cx, cy, h, col) { for (var x = 0; x < HW; x += 4) game.draw.rect(cx - HW + x, cy + (x / HW) * HH, 4.5, h, col); }
  function faceR(cx, cy, h, col) { for (var x = 0; x < HW; x += 4) game.draw.rect(cx + x, cy + HH - (x / HW) * HH, 4.5, h, col); }

  function drawSky() {
    var e = game.time.elapsed;
    game.draw.gradient(0, 760, [[0, C.sky0], [1, C.sky1]]);
    for (var c = 0; c < 3; c++) {
      var cx = ((e * (14 + c * 6) + c * 400) % (W + 300)) - 150;
      game.draw.sprite(CLOUD, { w: C.white }, cx, 270 + c * 70, 12, { anchor: 'center', alpha: 0.85 });
    }
    // 照明塔(等角の柱)
    for (var t = 0; t < 2; t++) {
      var lx = t === 0 ? 110 : 960, ly = t === 0 ? 300 : 360;
      game.draw.rect(lx - 6, ly, 12, 420, C.concreteD);
      game.draw.rect(lx - 50, ly - 60, 100, 60, C.ink);
      for (var r = 0; r < 2; r++) for (var q = 0; q < 4; q++) game.draw.rect(lx - 44 + q * 24, ly - 54 + r * 28, 18, 20, C.white, 0.7 + 0.3 * Math.sin(e * 3 + q + r));
    }
  }

  function drawBoard() {
    var bx = 250, by = 250, bw = 580, bh = 190;
    game.draw.rect(bx - 10, by - 10, bw + 20, bh + 20, C.concreteD);
    game.draw.rect(bx, by, bw, bh, C.board);
    game.draw.rect(bx + bw / 2 - 8, by + bh + 10, 16, 120, C.concreteD);
    // 三拍子のランプ(1拍目が大きい)
    var cur = R.clock >= 0 && R.beatIdx < R.songBeats ? ((R.beatIdx % 3) + 3) % 3 : -1;
    for (var k = 0; k < 3; k++) {
      var lx = bx + 150 + k * 140, s = k === 0 ? 34 : 24;
      var on = k === cur;
      if (on) game.draw.circle(lx, by + 62, s + 14 + R.pulse * 10, C.gold, 0.3);
      game.draw.circle(lx, by + 62, s, on ? C.gold : C.lampOff);
    }
    // 波の進み具合(今回の回数ぶんの丸)
    var n = R.heads.length;
    for (var i = 0; i < n; i++) {
      var h = R.heads[i];
      var col = h.st === 'hit' ? C.gold : (h.st === 'held' ? C.zz : (h.st === 'miss' ? C.bad : C.lampOff));
      game.draw.circle(bx + bw / 2 - (n - 1) * 26 + i * 52, by + 148, 16, col);
    }
  }

  function drawField() {
    game.draw.gradient(700, H, [[0, C.grassL], [1, C.grassD]]);
    // 等角の芝目(段の並びと平行な帯)
    for (var k = -6; k < 14; k++) {
      var y0 = 700 + k * 110;
      game.draw.line(-200, y0, 1300, y0 + 750, k % 2 === 0 ? C.grass : C.grassL, 52);
    }
    // 警告帯(外野フェンスの手前)
    game.draw.line(-120, frontLine(-120) + 86, 1200, frontLine(1200) + 86, C.track, 70);
  }
  // スタンドの塊: 奥の壁(後段の背)から手前のフェンス(前段の面の下)まで
  function backLine(x) { return OY - 2 * STEP - HH + (x - OX) * 0.5; }
  function frontLine(x) { return OY + 2 * HH + (x - (OX - 3 * HW)) * 0.5; }
  function drawMass() {
    for (var x = 0; x < W; x += 6) {
      var top = backLine(x) - 130, bot = frontLine(x) + STEP + 4;
      game.draw.rect(x, top, 6.5, 22, C.concreteD);
      game.draw.rect(x, top + 22, 6.5, bot - top - 22, C.concrete);
    }
    game.draw.line(0, backLine(0) - 130, W, backLine(W) - 130, C.ink, 4);
    game.draw.line(0, backLine(0) - 60, W, backLine(W) - 60, C.seatRD, 10);
  }

  // 波が通る自分の段だけ赤、前後の段は青
  function seatCol(i, j) {
    if (j === 1) return i % 2 === 0 ? [C.seatR, C.seatRD, C.seatRL] : [C.seatRL, C.seatRD, C.seatR];
    return (i + j) % 2 === 0 ? [C.seatB, C.seatBD, C.seatBL] : [C.seatBD, C.seatBD, C.seatB];
  }

  // 席 k の観客の立ち上がり量(0..1)。波の頭が通る拍の頭で最大
  function seatLift(k) {
    if (k === P) return 0;
    var b = R.clock / SPB, best = 0;
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (k < P - h.d) continue;
      if (h.z && k >= P - h.z) continue;
      var x = b - (h.t - (P - k));
      var v = x < -0.1 ? 0 : (x < 0 ? 1 + x / 0.1 : (x < 0.45 ? 1 : 1 - (x - 0.45) / 0.55));
      if (v > best) best = v;
    }
    return clamp(best, 0, 1);
  }
  function dozing(k) {
    var b = R.clock / SPB;
    for (var i = 0; i < R.heads.length; i++) {
      var h = R.heads[i];
      if (h.z && P - h.z === k && b >= h.doze && b < h.t - h.z + 1.2) return true;
    }
    return false;
  }

  function drawFan(i, j, x, y) {
    var e = game.time.elapsed;
    var pal = FAN_PALS[(i * 7 + j * 3) % 4];
    var lift = j === 1 ? seatLift(i) : 0;
    var bob = Math.sin(e * 3 + i * 1.3 + j) * 2 + (j !== 1 ? R.pulse * 3 : 0);
    diamond(x, y, 30 * (1 - lift * 0.35), 15 * (1 - lift * 0.35), C.ink, 0.35);
    if (j === 1 && dozing(i)) {
      game.draw.sprite(FAN_DOZE, pal, x, y - 34 + Math.sin(e * 2) * 3, 6, { anchor: 'center' });
      for (var z = 0; z < 3; z++) {
        var ph = (e * 0.9 + z / 3) % 1;
        game.draw.circle(x + 26 + ph * 30, y - 80 - ph * 70, 5 + ph * 8, C.zz, 0.9 - ph * 0.7);
      }
      game.draw.circle(x, y - 110, 30 + Math.sin(e * 10) * 4, C.zz, 0.18);
      return;
    }
    if (lift > 0.05) {
      game.draw.sprite(FAN_UP, pal, x, y - 40 - lift * 34, 6, { anchor: 'center' });
      if (R.cheer > 0 && i === R.cheerSeat) game.draw.circle(x, y - 110, 44, C.gold, 0.35);
    } else {
      game.draw.sprite(FAN_SIT, pal, x, y - 34 + bob, 6, { anchor: 'center', alpha: j === 1 ? 1 : 0.8 });
    }
  }

  function drawMe(x, y) {
    var e = game.time.elapsed;
    var flash = R.flash > 0;
    var up = R.me > 0.05 || R.oops > 0;
    var lift = R.oops > 0 ? 0.8 : R.me;
    var warn = R.warn > 0;
    if (warn) game.draw.circle(x, y - 60, 70 + (1 - R.warn / SPB) * 40, C.gold, 0.25 + 0.25 * Math.sin(e * 30));
    game.draw.circle(x, y - 60, 56, C.gold, 0.15);
    diamond(x, y, 30 * (1 - lift * 0.35), 15 * (1 - lift * 0.35), C.ink, 0.4);
    var spr = R.oops > 0 ? FAN_OOPS : (up ? FAN_UP : FAN_SIT);
    var px = flash ? 8 : 6;
    var yy = up ? y - 40 - lift * 34 : y - 34 + Math.sin(e * 3) * 2;
    if (flash) game.draw.circle(x, yy, 70, C.white, 0.6);
    game.draw.sprite(spr, flash ? WHITE_PAL : ME_PAL, x, yy, px, { anchor: 'center' });
  }

  function drawStands() {
    // 奥から手前へ(i+j の小さい順)
    for (var s = 0; s <= 12; s++) {
      for (var j = 0; j <= 2; j++) {
        var i = s - j;
        if (i < 0 || i > 10) continue;
        var q = iso(i, j), col = seatCol(i, j);
        if (j === 1 && i === P) col = [C.gold, '#a8801a', '#ffe680'];
        faceL(q.x, q.y, STEP + 4, j === 2 ? C.wall : C.concreteD);
        faceR(q.x, q.y, STEP + 4, C.concrete);
        diamond(q.x, q.y, HW, HH, col[0]);
        diamond(q.x, q.y + 4, HW * 0.55, HH * 0.55, col[2], 0.5);
        if (j === 2) game.draw.line(q.x - HW, q.y + STEP + 2, q.x, q.y + HH + STEP + 2, C.gold, 5);
        if (j === 1 && i < P) game.draw.line(q.x - HW * 0.5, q.y + HH * 0.5 + 2, q.x + HW * 0.5, q.y + HH * 1.5 + 2, C.gold, 3);
        if (j === 1 && i === P) drawMe(q.x, q.y);
        else drawFan(i, j, q.x, q.y);
      }
    }
  }

  function drawBadge() {
    var e = game.time.elapsed;
    var h = R.over ? null : pendingHead();
    var b = R.clock / SPB;
    var now = h && !h.dead && Math.abs(R.clock - h.t * SPB) <= GOOD_W;
    game.draw.circle(BX, BY + 10, BR + 14, C.ink, 0.5);
    game.draw.circle(BX, BY, BR + 10, now ? C.gold : C.concreteD);
    game.draw.circle(BX, BY, BR, now ? '#fff2b0' : C.seatB);
    // 席までの残り(1拍に1つ点く)
    if (h && b >= h.t - h.d - 0.01) {
      for (var k = 0; k < h.d; k++) {
        var ang = Math.PI * (1.15 + 0.7 * (k + 0.5) / h.d);
        var px = BX + Math.cos(ang) * (BR + 44), py = BY + Math.sin(ang) * (BR + 44);
        var lit = b >= h.t - h.d + k;
        game.draw.circle(px, py, 18, h.dead ? C.dim : (lit ? C.gold : C.lampOff));
      }
    }
    var spr = R.oops > 0 ? FAN_OOPS : (R.me > 0.05 ? FAN_UP : FAN_SIT);
    if (h && h.dead && h.st === 'wait') {
      game.draw.sprite(FAN_DOZE, FAN_PALS[1], BX, BY + 6, 10, { anchor: 'center', alpha: 0.9 });
      game.draw.line(BX - 70, BY - 70, BX + 70, BY + 70, C.zz, 10);
    } else {
      game.draw.sprite(spr, R.flash > 0 ? WHITE_PAL : ME_PAL, BX, BY + 6 - (R.me > 0.05 ? 16 : Math.sin(e * 3) * 3), 10, { anchor: 'center' });
    }
  }

  function drawWorld() {
    drawSky();
    drawField();
    drawMass();
    drawBoard();
    drawStands();
    drawBadge();
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.ink, 0.82);
    game.draw.rect(0, 222, W, 6, C.gold);
    txt('SCORE ' + R.score, 40, 72, 46, C.white, 'left');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      game.draw.sprite(FAN_SIT, on ? ME_PAL : WHITE_PAL, W - 70 - i * 74, 70, 5, { anchor: 'center', alpha: on ? 1 : 0.25 });
    }
    var done = 0;
    for (var k = 0; k < R.heads.length; k++) if (R.heads[k].st !== 'wait') done++;
    txt(done + ' / ' + R.heads.length, W / 2, 150, 40, C.gold);
    if (R.combo >= 2) txt(R.combo + ' COMBO', 40, 150, 38, C.gold, 'left');
    var progress = clamp(R.clock / (R.songBeats * SPB), 0, 1);
    game.draw.rect(40, 192, W - 80, 14, C.white, 0.25);
    game.draw.rect(40, 192, (W - 80) * progress, 14, C.gold);
    if (R.clock < 0 && !R.over) {
      game.draw.rect(0, H * 0.45, W, H * 0.08, C.ink, 0.75);
      txt(R.clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.505, 96, C.gold);
    }
  }

  function drawResult() {
    game.draw.rect(0, H * 0.2, W, H * 0.38, C.ink, 0.8);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.265, 96, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.335, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.385, 34, C.concrete);
    txt('NICE ' + R.held + '   COMBO ' + R.maxCombo, W / 2, H * 0.43, 36, C.zz);
    if (R.ok && R.score > R.prevBest && R.prevBest > 0) txt('NEW RECORD', W / 2, H * 0.485, 54, C.gold);
    else txt('BEST ' + Math.max(R.prevBest, R.ok ? R.score : 0), W / 2, H * 0.485, 42, C.gold);
    if (!R.ok) {
      var left = 0;
      for (var i = 0; i < R.heads.length; i++) if (R.heads[i].st === 'wait') left++;
      txt('あと' + Math.max(1, left) + '波', W / 2, H * 0.54, 48, C.gold);
    }
  }

  function drawAttractHud() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 2.4) * 6;
    game.draw.rect(0, 0, W, 226, C.ink, 0.82);
    game.draw.text(GAME_TITLE, W / 2 + 6, 104 + bob, { size: 96, color: C.seatRD, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, 98 + bob, { size: 96, color: C.gold, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, 94 + bob, { size: 96, color: '#fff6c0', bold: true, align: 'center' });
    txt('HI-SCORE ' + game.best, W / 2, 186, 38, C.white);
    if (Math.floor(e * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 48, C.gold);
    else txt('TAP TO START', W / 2, H * 0.975, 42, C.white);
  }

  // ── 入力 ───────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; demo.cyc = 0; return; }
    var res = standUp();
    if (res === 'locked') {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(BX, BY, { color: C.concrete, count: 4, speed: 90 });
    } else if (res === 'hit') {
      game.audio.play('se_jump', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      R.pulse = Math.max(0, R.pulse - dt * 3);
      drawWorld();
      drawHud();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
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
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, held: R.held, maxCombo: R.maxCombo };
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
