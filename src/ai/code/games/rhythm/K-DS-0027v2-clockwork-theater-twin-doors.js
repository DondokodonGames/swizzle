// K-DS-0027v2-clockwork-theater-twin-doors.js
// からくり劇場の二つ扉 — 跳ねる拍で刻む二本の針が、拍の頭で二つの扉の印を同時に指した瞬間だけ、二本指で両方の扉を同時に叩いて人形を二体いっしょに出す
// 操作: 文字盤の金の針(時計回り)と水色の針(反時計回り)が、跳ねる8分(長・短)で半目盛りずつ跳んで進む。拍の頭で二本の針がそれぞれ別の扉の印を指したら、その二つの扉を二本指で同時に押す(拍の頭からのずれでPERFECT/GOOD)。針が扉を指す1拍前に、その扉のランプが針の色で灯る。灯ったのが一つだけ・二本の針が同じ扉を指すときは押さない。一つだけ押す・違う扉・拍外れ・見送りはMISS
// 終わり: 前奏1小節+7小節(100BPM・約19秒・合図10回)を終えてMISS 3回以内ならCLEAR(判定の点×連続ボーナス)。MISS 4回でゼンマイが切れてGAME OVER
// @mechanic: pinch_zone
// @theme: clockwork_theater_twin_doors
// 世界観: 夜の広場に立つ仕掛け時計の人形劇場で、二体の人形を操る係が、跳ねる拍で進む二本の針が二つの扉の印に重なった瞬間だけ両手で同時に扉を開けて人形を踊り出させる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大コンボ・開けた扉の組数
// スタイル: 80s NEON

(function(game) {
  var STYLE = { bg: ['#03031a', '#0c0a36', '#1a0b3a'], main: ['#00f0ff', '#ff3cc8', '#ffe23c'], accent: ['#ff8a1e', '#ffffff'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒のグラデ + シアン/マゼンタ/イエロー/白。太い暗色線の上に細い明色線を重ねた疑似グロー。点滅で合図
  var NEON = {
    cyan: ['#06424e', STYLE.main[0]], mag: ['#4e0a40', STYLE.main[1]], gold: ['#4e420a', STYLE.main[2]],
    white: ['#2c2c52', STYLE.accent[1]], orange: ['#4e2a06', STYLE.accent[0]]
  };
  var C = { ink: '#03031a', red: '#ff3c5a', panel: '#0a0828' };

  var GAME_TITLE = 'TWIN DOORS';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;           // 跳ねる8分: 長(2/3拍) + 短(1/3拍)
  var HOP = 0.1;               // 半目盛りの跳び(拍単位)
  var LEAD = 0.06;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var PAIR_T = 0.12;           // 二本指が「同時」とみなされる間隔
  var TOTAL_BEATS = 32;        // 前奏1小節 + 7小節
  var JUDGE_FROM = 4;
  var MISS_MAX = 4;
  var DEMO_BEATS = 16;
  var DEMO_SINGLE = 9;         // デモはこの合図で片方の扉だけ押してMISSを見せる
  var PAUSE = { 12: 1, 16: 1, 20: 1, 22: 1 }; // 水色の針が休む拍(位相がずれて合図の型が変わる)

  var CX = 540, CY = 905, DIAL_R = 190, DOOR_R = 420, DOOR_W = 220, DOOR_H = 250;
  var BULB_Y = 318;

  // 4つの扉の人形(太鼓・踊り子・小鳥・熊)
  var P_DRUM = ['..rrrr..', '.rrrrrr.', '..ssss..', '..sese..', '..ssss..', '.bbbbbb.', 'sbbyybbs', '.bwwwwb.', '.wwwwww.', '..b..b..'];
  var P_DANCE = ['...pp...', '..pppp..', '..ssss..', '..sese..', '..ssss..', 's.pppp.s', '.pppppp.', 'pppppppp', '...ss...', '..s..s..'];
  var P_BIRD = ['..yyy...', '.yyyyy..', 'yyeyyyoo', 'yyyyyy..', '.yyyyy..', '..yyyy.y', '...yyyyy', '....yy..', '....o...', '...o.o..'];
  var P_BEAR = ['.bb..bb.', '.bbbbbb.', 'bbbbbbbb', 'bbebbebb', 'bbbssbbb', '.bbsrsb.', '..bbbb..', '.bbbbbb.', 'bb.bb.bb', '.bb..bb.'];
  var PUPPETS = [P_DRUM, P_DANCE, P_BIRD, P_BEAR];
  var PAL_PUP = [
    { r: STYLE.main[1], s: '#ffd0b0', e: C.ink, b: STYLE.main[0], y: STYLE.main[2], w: '#ffffff' },
    { p: STYLE.main[1], s: '#ffd0b0', e: C.ink },
    { y: STYLE.main[2], e: C.ink, o: STYLE.accent[0] },
    { b: '#c08040', e: C.ink, s: '#f0d0a0', r: STYLE.main[1] }
  ];
  // 人形を操る係(両腕の構え)
  var OP_IDLE = ['..cccc..', '.cccccc.', '..ssss..', '..sese..', '..ssss..', '.mmmmmm.', 's.mmmm.s', 's.mmmm.s', '..kkkk..', '..k..k..'];
  var OP_UP = ['s.cccc.s', 's.cccc.s', 's.ssss.s', 's.sese.s', '.mssssm.', '.mmmmmm.', '..mmmm..', '..mmmm..', '..kkkk..', '.k....k.'];
  var OP_OOPS = ['..cccc..', '.cccccc.', '..ssss..', '.seesee.', '..ssss..', 'smmmmmms', '..mmmm..', '..mmmm..', '..kkkk..', '.k....k.'];
  var PAL_OP = { c: STYLE.main[1], s: '#ffd0b0', e: C.ink, m: '#3a2a8a', k: '#1a1450' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, endBeats, running, songT, beatN, schedB, readyT, hitStop, flashT, beatPulse;
  var bHead, info, judged, pend, doorOpen, doorFlash, rings, score, perfects, goods, misses, combo, maxCombo, opened, cueTotal;
  var over, won, outroT, prevBest, milestone, armsT, oopsT;

  function mod8(v) { return ((v % 8) + 8) % 8; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function ease(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
  function doorOf(slot) { return slot % 2 ? (slot - 1) / 2 : -1; }   // 斜めの目盛り1/3/5/7 = 扉0..3
  function slotAng(s) { return -Math.PI / 2 + s * Math.PI / 4; }
  function doorPos(d) { var a = slotAng(d * 2 + 1); return { x: CX + Math.cos(a) * DOOR_R, y: CY + Math.sin(a) * DOOR_R }; }

  // 拍 b の頭で二本の針が指す目盛りと、その拍の種類(合図/片方だけ/同じ扉)
  function buildInfo() {
    bHead = [4];
    for (var b = 1; b <= TOTAL_BEATS + 1; b++) bHead[b] = bHead[b - 1] - (PAUSE[b] ? 0 : 1);
    info = []; cueTotal = 0;
    for (var k = 0; k <= TOTAL_BEATS; k++) {
      var sa = mod8(k), sb = mod8(bHead[k]);
      var da = doorOf(sa), db = doorOf(sb);
      var kind = 'none';
      if (k >= JUDGE_FROM && k < endBeats) {
        if (da >= 0 && db >= 0) kind = da !== db ? 'cue' : 'same';
        else if (da >= 0 || db >= 0) kind = 'single';
      }
      if (kind === 'cue') cueTotal++;
      info.push({ da: da, db: db, kind: kind });
    }
  }
  function hopFrac(fr) { return 0.5 * ease((fr - (SWING - HOP)) / HOP) + 0.5 * ease((fr - (1 - HOP)) / HOP); }
  function handA(t) { var b = Math.floor(t), fr = t - b; return b + hopFrac(fr); }
  function handB(t) {
    var b = Math.floor(t), fr = t - b;
    if (b < 0) return bHead[0];
    var moving = !PAUSE[b + 1];
    return bHead[Math.min(b, bHead.length - 1)] - (moving ? hopFrac(fr) : 0);
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    endBeats = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    running = false; songT = 0; beatN = 0; schedB = 0;
    readyT = demoMode ? 0 : 0.8;
    hitStop = 0; flashT = 0; beatPulse = 0;
    buildInfo();
    judged = {}; pend = null; doorOpen = [0, 0, 0, 0]; doorFlash = [0, 0, 0, 0]; rings = [];
    score = 0; perfects = 0; goods = 0; misses = 0; combo = 0; maxCombo = 0; opened = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; armsT = 0; oopsT = 0;
    if (demoMode) startClock();
  }

  function startClock() { running = true; songT = 0; beatN = 0; schedB = 0; beatPulse = 1; }

  function sfxTone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  // ---- 伴奏(オリジナルのシャッフル: 歩くベース + 長短の刻み、2・4拍目を強く) ----
  var PROG = [
    { walk: ['F2', 'A2', 'C3', 'D3'], stab: ['A4', 'C5'] },
    { walk: ['F2', 'A2', 'C3', 'Eb3'], stab: ['A4', 'Eb5'] },
    { walk: ['Bb2', 'D3', 'F3', 'G3'], stab: ['Ab4', 'D5'] },
    { walk: ['F2', 'A2', 'C3', 'A2'], stab: ['A4', 'C5'] },
    { walk: ['Bb2', 'D3', 'F3', 'D3'], stab: ['Ab4', 'D5'] },
    { walk: ['F2', 'C3', 'A2', 'C3'], stab: ['C5', 'F5'] },
    { walk: ['C3', 'E3', 'G3', 'Bb3'], stab: ['Bb4', 'E5'] },
    { walk: ['F2', 'A2', 'C3', 'F3'], stab: ['A4', 'F5'] }
  ];
  function playBeatMusic(b) {
    if (demoMode) return;
    var ch = PROG[Math.floor(b / 4) % PROG.length], i = b % 4;
    var back = i % 2 === 1;
    game.audio.melody([[ch.stab[0], SWING], [ch.stab[1], 1 - SWING]], { tempo: BPM, wave: 'square', volume: back ? 0.05 : 0.025, bass: [[ch.walk[i], 0.85], ['R', 0.15]], bassWave: 'triangle', bassVolume: 0.13 });
  }

  // ---- 拍クロック(1本だけ) ----
  function stepPlay(dt) {
    if (!running) return;
    songT += dt;
    while (schedB < endBeats && songT >= schedB * SPB - LEAD) { playBeatMusic(schedB); schedB++; }
    while (songT >= (beatN + 1) * SPB) { beatN++; beatPulse = 1; }
    if (pend && songT - pend.t > PAIR_T) { var p = pend; pend = null; resolveSingle(p); if (over) return; }
    // 見送った合図: 二体とも閉じた扉にぶつかる
    for (var b = Math.max(JUDGE_FROM, beatN - 1); b <= beatN; b++) {
      if (!info[b] || info[b].kind !== 'cue' || judged[b]) continue;
      if (songT > b * SPB + GOOD_W + PAIR_T + 0.02) {
        judged[b] = 'skip';
        missAt([info[b].da, info[b].db]);
        if (over) return;
      }
    }
    if (songT >= endBeats * SPB + 0.1) {
      running = false;
      if (!demoMode && !over) finish(misses < MISS_MAX);
    }
  }

  function doorAt(x, y) {
    for (var d = 0; d < 4; d++) {
      var p = doorPos(d);
      if (Math.abs(x - p.x) < DOOR_W / 2 + 30 && Math.abs(y - p.y) < DOOR_H / 2 + 30) return d;
    }
    return -1;
  }
  function cueNear(t, win) {
    var b = Math.round(t / SPB);
    if (info[b] && info[b].kind === 'cue' && !judged[b] && Math.abs(t - b * SPB) <= win) return b;
    return -1;
  }

  function missAt(doors) {
    misses++; combo = 0; oopsT = 0.7;
    hitStop = 0.36; flashT = 0.36;
    var mx = 0, my = 0, n = 0;
    for (var i = 0; i < doors.length; i++) if (doors[i] >= 0) { doorFlash[doors[i]] = 0.4; var p = doorPos(doors[i]); mx += p.x; my += p.y; n++; }
    if (!n) { mx = CX; my = CY; n = 1; }
    mx /= n; my /= n;
    sfxTone(130, 0.3, { wave: 'sawtooth', volume: 0.05, slide: -50 });
    if (demoMode) { game.fx.popup('MISS', mx, my - 60, { color: C.red, size: 60 }); game.fx.shake(5, 0.2); }
    else game.feedback.bad(mx, my - 60, { text: 'MISS', shake: 10 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function resolvePair(d1, d2, t) {
    var b = cueNear(t, GOOD_W);
    var near = cueNear(t, 0.3);
    if (b >= 0 && d1 >= 0 && d2 >= 0 && d1 !== d2) {
      var I = info[b];
      if ((d1 === I.da && d2 === I.db) || (d1 === I.db && d2 === I.da)) {
        var a = Math.abs(t - b * SPB);
        var w = a <= PERFECT_W ? 'PERFECT' : 'GOOD';
        judged[b] = w;
        doorOpen[d1] = 0.55; doorOpen[d2] = 0.55;
        combo++; if (combo > maxCombo) maxCombo = combo;
        opened++; armsT = 0.4;
        score += Math.round((w === 'PERFECT' ? 100 : 50) * (1 + Math.floor(combo / 4) * 0.5));
        if (w === 'PERFECT') perfects++; else goods++;
        var p1 = doorPos(d1), p2 = doorPos(d2);
        var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        if (demoMode) game.fx.popup(w, mx, my, { color: STYLE.main[2], size: 54 });
        else game.feedback.good(mx, my, { text: w, color: STYLE.main[2], size: w === 'PERFECT' ? 58 : 48, count: 14, volume: 0.15 });
        game.fx.burst(p1.x, p1.y, { color: STYLE.main[0], count: 10, speed: 300 });
        game.fx.burst(p2.x, p2.y, { color: STYLE.main[1], count: 10, speed: 300 });
        sfxTone(['C6', 'E6', 'G6', 'Bb5'][d1], 0.16, { wave: 'square', volume: 0.05 });
        sfxTone(['C5', 'E5', 'G5', 'Bb4'][d2], 0.16, { wave: 'triangle', volume: 0.08 });
        if (!demoMode && combo === 5 && !milestone) {
          milestone = true;
          game.audio.play('se_milestone', 0.5);
          game.fx.popup('5 COMBO', CX, CY, { color: STYLE.main[0], size: 80 });
        }
        return;
      }
    }
    if (d1 < 0 && d2 < 0 && near < 0) { game.audio.play('se_tap', 0.15); return; }
    if (near >= 0) judged[near] = 'miss';
    missAt([d1, d2]);
  }

  function resolveSingle(p) {
    if (p.door < 0 && cueNear(p.t, 0.3) < 0) { game.audio.play('se_tap', 0.15); return; }
    var near = cueNear(p.t, 0.3);
    if (near >= 0) judged[near] = 'miss';
    missAt([p.door]);
  }

  function pressAt(x, y, id) {
    if (!running || hitStop > 0 || over) return;
    var d = doorAt(x, y);
    rings.push({ x: x, y: y, t: 0.3 });
    if (songT < (JUDGE_FROM - 0.5) * SPB) return;   // 前奏の間はまだ合図が無い
    if (pend && pend.id !== id && songT - pend.t <= PAIR_T) {
      var p = pend; pend = null;
      resolvePair(p.door, d, (p.t + songT) / 2);
      return;
    }
    if (pend) { var q = pend; pend = null; resolveSingle(q); if (over || hitStop > 0) return; }
    pend = { t: songT, x: x, y: y, id: id, door: d };
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 2.3; running = false; pend = null;
    if (ok) {
      score += (MISS_MAX - 1 - misses) * 100;
      game.audio.play('se_success', 0.55);
      for (var d = 0; d < 4; d++) { doorOpen[d] = 2.0; var p = doorPos(d); game.fx.burst(p.x, p.y, { color: d % 2 ? STYLE.main[1] : STYLE.main[0], count: 18, speed: 420 }); }
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function tickWorld(dt) {
    if (hitStop > 0) { hitStop -= dt; return; }
    stepPlay(dt);
    for (var d = 0; d < 4; d++) { if (doorOpen[d] > 0) doorOpen[d] -= dt; if (doorFlash[d] > 0) doorFlash[d] -= dt; }
    for (var i = rings.length - 1; i >= 0; i--) { rings[i].t -= dt; if (rings[i].t <= 0) rings.splice(i, 1); }
    if (armsT > 0) armsT -= dt;
    if (oopsT > 0) oopsT -= dt;
  }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    game.audio.tone(doorAt(x, y) >= 0 ? 660 : 440, 0.03, { wave: 'square', volume: 0.03 });
    pressAt(x, y, id);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画(ネオン) ----
  function glow(x1, y1, x2, y2, pair, w) {
    game.draw.line(x1, y1, x2, y2, pair[0], w * 3);
    game.draw.line(x1, y1, x2, y2, pair[1], w);
  }
  function ring(x, y, r, pair, w, segs) {
    var n = segs || 40;
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < n; i++) {
        var a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2;
        game.draw.line(x + Math.cos(a1) * r, y + Math.sin(a1) * r, x + Math.cos(a2) * r, y + Math.sin(a2) * r, pair[pass], pass ? w : w * 3);
      }
    }
  }
  function box(x, y, w, h, pair, lw) {
    glow(x, y, x + w, y, pair, lw); glow(x + w, y, x + w, y + h, pair, lw);
    glow(x + w, y + h, x, y + h, pair, lw); glow(x, y + h, x, y, pair, lw);
  }
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#2a0a3a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawStage() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var s = 0; s < 40; s++) {
      var sx = (s * 137) % W, sy = 250 + (s * 211) % 1150;
      if ((s + Math.floor(t * 3)) % 7) game.draw.rect(sx, sy, 4, 4, '#4a4a8a');
    }
    // 劇場の枠と幕
    for (var c = 0; c < 5; c++) {
      game.draw.rect(c * 22, 380, 18, 1000, c % 2 ? '#3a0a3a' : '#22062a');
      game.draw.rect(W - 18 - c * 22, 380, 18, 1000, c % 2 ? '#3a0a3a' : '#22062a');
    }
    box(110, 400, W - 220, 980, NEON.mag, 4);
    for (var k = 0; k < 15; k++) {
      var on = (k + Math.floor(t * 4)) % 2 === 0;
      game.draw.circle(130 + k * 58.6, 400, 9, on ? STYLE.main[2] : '#4e420a');
    }
    // 舞台の床
    game.draw.rect(0, 1380, W, 120, '#120a30');
    glow(0, 1382, W, 1382, NEON.cyan, 3);
    for (var g = 0; g < 10; g++) glow(540 + (g - 4.5) * 60, 1500, 540 + (g - 4.5) * 240, H, NEON.mag, 1);
    game.draw.rect(0, 1500, W, H - 1500, '#08061e', 0.55);
  }

  function lampState(d) {
    // 次に来る拍の頭で針が指す扉が、その1拍前から針の色で灯る
    var nb = Math.round(songT / SPB + 0.5 - 0.0001);
    var cb = Math.round(songT / SPB);
    var res = { a: false, b: false };
    var cand = [nb];
    if (Math.abs(songT - cb * SPB) <= GOOD_W) cand.push(cb);
    for (var i = 0; i < cand.length; i++) {
      var I = info[cand[i]];
      if (!I || I.kind === 'none' || judged[cand[i]]) continue;
      if (I.da === d) res.a = true;
      if (I.db === d) res.b = true;
    }
    return res;
  }

  function drawDoor(d) {
    var p = doorPos(d), t = game.time.elapsed;
    var x = p.x - DOOR_W / 2, y = p.y - DOOR_H / 2;
    var fl = doorFlash[d] > 0 && hitStop > 0;
    var sc = fl ? 1.1 : 1;
    var w = DOOR_W * sc, h = DOOR_H * sc;
    x = p.x - w / 2; y = p.y - h / 2;
    var open = doorOpen[d] > 0 ? ease(Math.min(1, doorOpen[d] / 0.15)) : 0;
    game.draw.rect(x, y, w, h, '#160a3a');
    // 人形
    if (open > 0 || fl) {
      var pop = (1 - open) * 40;
      game.draw.rect(x + 10, y + 10, w - 20, h - 20, '#2a1660');
      game.draw.sprite(PUPPETS[d], PAL_PUP[d], p.x, p.y + 10 + pop + Math.sin(t * 18) * (open > 0 ? 6 : 0), 15, { anchor: 'center' });
    }
    // 扉の二枚の板(開くと左右へ畳まれる)
    var leaf = (w / 2 - 6) * (1 - open);
    if (leaf > 2) {
      game.draw.rect(x + 6, y + 6, leaf, h - 12, fl ? '#ffffff' : '#3a1a6a');
      game.draw.rect(x + w - 6 - leaf, y + 6, leaf, h - 12, fl ? '#ffffff' : '#3a1a6a');
      if (!fl) {
        game.draw.circle(x + 6 + leaf - 14, p.y, 7, STYLE.main[2]);
        game.draw.circle(x + w - 6 - leaf + 14, p.y, 7, STYLE.main[2]);
      }
    }
    var L = running ? lampState(d) : { a: false, b: false };
    var blink = Math.floor(t * 10) % 2 === 0;
    var frame = fl ? NEON.white : (L.a && L.b ? NEON.white : (L.a ? NEON.gold : (L.b ? NEON.cyan : NEON.mag)));
    box(x, y, w, h, frame, (L.a || L.b) && blink ? 6 : 4);
    // ランプ(金=金の針、水色=水色の針)
    game.draw.circle(p.x - 34, y - 30, 20, L.a ? STYLE.main[2] : '#2a2a10');
    game.draw.circle(p.x + 34, y - 30, 20, L.b ? STYLE.main[0] : '#0a2a30');
    if (L.a && blink) game.draw.circle(p.x - 34, y - 30, 32, STYLE.main[2], 0.3);
    if (L.b && blink) game.draw.circle(p.x + 34, y - 30, 32, STYLE.main[0], 0.3);
  }

  function drawDial() {
    var bt = songT / SPB;
    game.draw.circle(CX, CY, DIAL_R + 10, '#0c0826');
    ring(CX, CY, DIAL_R, NEON.cyan, 4, 48);
    ring(CX, CY, DIAL_R - 26, NEON.mag, 2, 48);
    for (var s = 0; s < 8; s++) {
      var a = slotAng(s);
      var r1 = s % 2 ? DIAL_R - 42 : DIAL_R - 20;
      glow(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1, CX + Math.cos(a) * (DIAL_R - 6), CY + Math.sin(a) * (DIAL_R - 6), s % 2 ? NEON.gold : NEON.white, s % 2 ? 5 : 2);
      if (s % 2) glow(CX + Math.cos(a) * (DIAL_R + 8), CY + Math.sin(a) * (DIAL_R + 8), CX + Math.cos(a) * (DOOR_R - 150), CY + Math.sin(a) * (DOOR_R - 150), NEON.mag, 1);
    }
    var aA = slotAng(handA(bt)), aB = slotAng(handB(bt));
    glow(CX, CY, CX + Math.cos(aB) * (DIAL_R - 58), CY + Math.sin(aB) * (DIAL_R - 58), NEON.cyan, 8);
    game.draw.circle(CX + Math.cos(aB) * (DIAL_R - 58), CY + Math.sin(aB) * (DIAL_R - 58), 14, STYLE.main[0]);
    glow(CX, CY, CX + Math.cos(aA) * (DIAL_R - 30), CY + Math.sin(aA) * (DIAL_R - 30), NEON.gold, 6);
    game.draw.circle(CX + Math.cos(aA) * (DIAL_R - 30), CY + Math.sin(aA) * (DIAL_R - 30), 12, STYLE.main[2]);
    game.draw.circle(CX, CY, 22 + beatPulse * 8, STYLE.main[1]);
    game.draw.circle(CX, CY, 10, '#ffffff');
  }

  // 拍の電球: 1小節の跳ねる8分(頭=大、裏=小、裏は2/3拍の位置)
  function drawBulbs() {
    var bt = songT / SPB, bar = Math.floor(bt / 4), inBar = bt - bar * 4;
    for (var i = 0; i < 4; i++) {
      var hx = 180 + i * 200, ax = hx + 200 * SWING;
      var onHead = running && inBar >= i && inBar < i + SWING;
      var onAnd = running && inBar >= i + SWING && inBar < i + 1;
      game.draw.circle(hx, BULB_Y, onHead ? 30 + beatPulse * 8 : 24, onHead ? (i % 2 ? STYLE.main[1] : STYLE.main[0]) : '#1c1a48');
      if (i % 2) ring(hx, BULB_Y, 36, NEON.mag, 1, 20);
      game.draw.circle(ax, BULB_Y + 8, onAnd ? 15 : 11, onAnd ? '#ffffff' : '#1c1a48');
    }
  }

  function drawOperator(demoHands) {
    var t = game.time.elapsed;
    var art = oopsT > 0 ? OP_OOPS : (armsT > 0 || demoHands ? OP_UP : OP_IDLE);
    var fl = flashT > 0 && Math.floor(flashT * 20) % 2 === 0;
    var x = 540 + Math.sin(songT / SPB * Math.PI) * 14;
    game.draw.sprite(art, fl ? { c: '#fff', s: '#fff', e: '#fff', m: '#fff', k: '#fff' } : PAL_OP, x, 1440 - beatPulse * 8 + Math.sin(t * 2) * 3, 13, { anchor: 'center' });
    glow(x - 52, 1380, 257, 1340, NEON.white, 1);
    glow(x + 52, 1380, 823, 1340, NEON.white, 1);
  }

  function drawScene(demoHands) {
    drawStage();
    for (var d = 0; d < 4; d++) drawDoor(d);
    drawDial();
    drawBulbs();
    drawOperator(demoHands);
    for (var i = 0; i < rings.length; i++) ring(rings[i].x, rings[i].y, 70 - rings[i].t * 120, NEON.white, 2, 16);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.panel, 0.9);
    glow(0, 228, W, 228, NEON.mag, 2);
    label('SCORE ' + score, 60, 96, 54, STYLE.main[0], 'left');
    label('BEST ' + prevBest, 60, 168, 32, STYLE.main[2], 'left');
    label(opened + ' / ' + cueTotal, W - 60, 100, 54, STYLE.main[1], 'right');
    for (var i = 0; i < MISS_MAX; i++) game.draw.circle(W - 300 + i * 64, 176, 20, i < misses ? C.red : '#2a2a50');
    game.draw.rect(0, 222, W * Math.min(1, songT / (endBeats * SPB)), 6, STYLE.main[2]);
  }

  function drawResult(t) {
    game.draw.rect(70, H * 0.25, W - 140, H * 0.36, C.panel, 0.94);
    box(70, H * 0.25, W - 140, H * 0.36, won ? NEON.cyan : NEON.mag, 3);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? STYLE.main[0] : C.red);
    label('SCORE ' + score, W / 2, H * 0.37, 58, '#ffffff');
    label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.415, 34, STYLE.main[0]);
    label(maxCombo + ' COMBO', W / 2, H * 0.455, 40, STYLE.main[2]);
    label(opened + ' / ' + cueTotal, W / 2, H * 0.5, 44, STYLE.main[1]);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.55, 50, STYLE.main[2]);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.55, 40, STYLE.main[2]);
    if (!won) label('あと' + Math.max(1, cueTotal - opened) + '組', W / 2, H * 0.22, 60, C.red);
    if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.59, 36, '#ffffff');
  }

  // ---- ATTRACT: 実ロジックで灯った二つの扉を二本指で同時に押す。9拍目は片方だけ押してMISS ----
  var demo = { t: 0, l: { x: 300, y: 1550 }, r: { x: 780, y: 1550 }, press: 0, done: {} };
  var DEMO_LEN = DEMO_BEATS * SPB + 1.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.press = 0; demo.done = {}; }
    if (demo.press > 0) demo.press -= dt;
    tickWorld(dt);
    var tl = { x: 300, y: 1560 }, tr = { x: 780, y: 1560 };
    if (running && hitStop <= 0) {
      var nb = Math.round(songT / SPB + 0.5 - 0.0001);
      var cb = Math.round(songT / SPB);
      var I = info[cb] && info[cb].kind === 'cue' && !judged[cb] ? info[cb] : (info[nb] && info[nb].kind === 'cue' ? info[nb] : null);
      var b = I === info[cb] ? cb : nb;
      if (I) {
        var pa = doorPos(I.da), pb = doorPos(I.db);
        var left = pa.x < pb.x || (pa.x === pb.x && pa.y < pb.y) ? pa : pb, right = left === pa ? pb : pa;
        tl = { x: left.x, y: left.y + 40 }; tr = { x: right.x, y: right.y + 40 };
        if (b === DEMO_SINGLE) tr = { x: 780, y: 1560 };
        if (!judged[b] && !demo.done[b] && songT >= b * SPB - 0.008) {
          demo.done[b] = true;
          pressAt(pa.x, pa.y + 40, 'g1');
          if (b !== DEMO_SINGLE) pressAt(pb.x, pb.y + 40, 'g2');
          demo.press = 0.18;
        }
      }
    }
    demo.l.x += (tl.x - demo.l.x) * Math.min(1, dt * 10); demo.l.y += (tl.y - demo.l.y) * Math.min(1, dt * 10);
    demo.r.x += (tr.x - demo.r.x) * Math.min(1, dt * 10); demo.r.y += (tr.y - demo.r.y) * Math.min(1, dt * 10);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (flashT > 0) flashT -= dt;
    if (beatPulse > 0) beatPulse = Math.max(0, beatPulse - dt * 5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.press > 0);
      game.draw.hand(demo.l.x, demo.l.y, { press: demo.press > 0, scale: 14 });
      game.draw.hand(demo.r.x, demo.r.y, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.panel, 0.9);
      label(GAME_TITLE, W / 2, 112, 86 + Math.sin(t * 3) * 3, Math.floor(t * 4) % 2 ? STYLE.main[1] : STYLE.main[0]);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 192, 36, STYLE.main[2]);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1720, 50, STYLE.main[2]);
      else label('TAP TO START', W / 2, 1720, 46, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      drawResult(t);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      tickWorld(dt);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo, pairs: opened };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      tickWorld(dt);
    }

    drawScene(false);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, STYLE.main[2]);
    if (over && outroT > 1.5) label(won ? 'FINISH' : 'GAME OVER', W / 2, H * 0.47, 100, won ? STYLE.main[0] : C.red);
    else if (over || state === S.RESULT) drawResult(t);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
