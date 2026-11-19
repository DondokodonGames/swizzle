// K-GBA-0016v2-ice-palace-ring-carve.js
// 氷の輪の三拍子 — 三拍子の1小節でちょうど1周、杖先で氷の輪を描き回し、一拍目ごとに輪の頂点を通って紋様を回し続ける
// 操作: 床の氷の輪の上に指(杖先)を置き、離さずに円を描き続ける。輪の頂点(大きな印)を三拍子の一拍目ちょうどに通るとPERFECT、少しずれるとGOOD。2拍目・3拍目は輪の小さな印を通るのが目安(合えば印が光る)。速すぎ・遅すぎ・止まる・逆回りはその一拍目でMISS。5周目の頂点で回る向きが逆になる(1小節前から矢印が点滅して予告)
// 終わり: 9周を回し終えて MISS 2回以内ならCLEAR(判定の点+拍どおりの印ボーナス)。MISS 3回でGAME OVER
// @mechanic: rotate_gesture
// @theme: ice_palace_ring_carve
// 世界観: 氷の宮殿の舞踏室で、氷細工師がワルツの三拍子に合わせて杖で床の氷の輪を削り回し、輪の中心の雪の紋様を一小節に一回転ずつ回し続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・回し切った周回数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  // 2010s FLAT MOBILE: 影もグラデも使わないベタ塗り数色。丸角・大きな余白・アイコン的な形。判定は色の変化で示す
  var STYLE = { bg: ['#dff4ff', '#dcf2fe'], main: ['#3fa9f5', '#ffffff', '#7ad0c4'], accent: ['#ff6f91', '#2d3a6b'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    wall: STYLE.bg[0], wall2: STYLE.bg[1],
    blue: STYLE.main[0], white: STYLE.main[1], mint: STYLE.main[2],
    pink: STYLE.accent[0], navy: STYLE.accent[1],
    floor: '#eaf8ff', tile: '#d4effc', ice: '#bfe6fa', iceDeep: '#9fd6f4', gold: '#ffc94d', red: '#ff5a6e', grey: '#a9bccb',
  };

  var GAME_TITLE = 'ICE WALTZ';
  var BPM = 132;
  var SPB = 60 / BPM;
  var BAR = 3;                    // 三拍子
  var BAR_LEN = BAR * SPB;        // 1小節 = 1周
  var LAPS = 9;                   // 1小節目は助走、2小節目の頭から9回の一拍目を判定
  var FLIP_SLOT = 5;              // 5周目の頂点で逆回りに切り替わる
  var TOTAL_BARS = LAPS + 1;
  var TIME_LIMIT = 14;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.17;
  var MISS_MAX = 3;
  var HIT_STOP = 0.42;
  var CX = W / 2, CY = H * 0.47, RR = 300;

  // ワルツ(オリジナル)。ズン・チャッ・チャッのベースと3拍のメロディを1小節ずつ鳴らす
  var MEL = [
    [['E5', 2], ['G5', 1]], [['F5', 1.5], ['E5', 0.5], ['D5', 1]], [['C5', 2], ['E5', 1]], [['D5', 3]],
    [['E5', 2], ['G5', 1]], [['A5', 1.5], ['G5', 0.5], ['F5', 1]], [['E5', 1], ['D5', 1], ['C5', 1]], [['B4', 2], ['D5', 1]],
    [['C5', 2], ['G4', 1]], [['C5', 3]],
  ];
  var B_C = [['C3', 1], ['G3', 1], ['G3', 1]], B_G = [['G2', 1], ['D3', 1], ['D3', 1]], B_F = [['F2', 1], ['C3', 1], ['C3', 1]];
  var BASSES = [B_C, B_G, B_C, B_G, B_C, B_F, B_C, B_G, B_C, B_C];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextMel, readyT, hitStop, flashT;
  var slots, pen, lastA, theta, lapDir, nextMark, travel, tipA, notchFx, beatGlow, flipWarn, flipFx, ringFx, wayFx;
  var score, combo, maxCombo, perfects, goods, misses, laps, paces, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.5 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function dirFor(slot) { return slot <= FLIP_SLOT ? 1 : -1; }
  var TAU = Math.PI * 2;
  var REACH = 0.15;               // 頂点の手前この角度まで来たら到達とみなす
  function wrap(d) { while (d > Math.PI) d -= Math.PI * 2; while (d <= -Math.PI) d += Math.PI * 2; return d; }
  function angOf(x, y) { var a = Math.atan2(x - CX, -(y - CY)); return a < 0 ? a + Math.PI * 2 : a; } // 頂点=0、時計回りが正

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextMel = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; flashT = 0;
    slots = [];
    for (var i = 0; i <= LAPS; i++) slots.push({ res: '' });
    pen = false; lastA = 0; theta = 0; lapDir = 1; nextMark = TAU; travel = 0; tipA = 0;
    notchFx = [0, 0, 0]; beatGlow = [0, 0, 0]; flipWarn = 0; flipFx = 0; ringFx = 0; wayFx = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; laps = 0; paces = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function playBar(b) {
    if (!armed || b >= TOTAL_BARS) return;
    game.audio.melody(MEL[b], { tempo: BPM, wave: 'triangle', volume: demoMode ? 0.03 : 0.05, bass: BASSES[b], bassVolume: demoMode ? 0.03 : 0.06 });
  }

  // ---- 拍クロック(1本だけ)----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextMel = 1;
    playBar(0);
    onBeat(0);
  }

  // まだ判定していない一番早い周の向き(5周目が済む/過ぎると逆回り)
  function nextSlot() { for (var b = 1; b <= LAPS; b++) if (!slots[b].res) return b; return LAPS; }
  function curDir() { return dirFor(nextSlot()); }
  // 今の周の進み具合 0..1(周の始まりの頂点から、回る向きに)
  function lapProg() {
    var p = lapDir * (theta - (nextMark - lapDir * TAU)) / TAU;
    return Math.max(0, Math.min(1, p));
  }
  // 杖先の位置から、回る向きに見て次の頂点を目標にする
  function anchor(dir) {
    lapDir = dir;
    var k = theta / TAU;
    nextMark = dir > 0 ? (Math.floor(k) + 1) * TAU : (Math.ceil(k) - 1) * TAU;
    travel = 0;
  }

  function onBeat(k) {
    var bar = Math.floor(k / BAR), pos = k % BAR;
    if (bar >= TOTAL_BARS) return;
    beatGlow[pos] = 1;
    if (pos === 0) {
      tone(131, 0.14, { wave: 'sine', volume: 0.22 * vol() });
      tone(1047, 0.03, { wave: 'triangle', volume: 0.05 * vol() });
      if (bar === FLIP_SLOT - 1) {
        // 1小節前の予告: 矢印が点滅し、くるりと回る音
        flipWarn = BAR_LEN;
        tone(659, 0.12, { wave: 'square', volume: 0.06 * vol(), slide: 330 });
      }
      if (bar === FLIP_SLOT) {
        flipFx = 1;
        if (armed) game.audio.play('se_powerup', 0.4 * vol());
        game.fx.flash(C.pink, 0.15);
        game.fx.burst(CX, CY, { color: C.pink, count: 22, speed: 420 });
      }
    } else {
      tone(784, 0.025, { wave: 'triangle', volume: 0.035 * vol() });
      // 2拍目・3拍目: 輪の印を拍どおりに通っているか(目安。MISSにはしない)
      if (pen) {
        var d = Math.abs(lapProg() - pos / 3);
        if (d < 0.12) {
          notchFx[pos] = 1; paces++; score += 20;
          tone(pos === 1 ? 1319 : 1568, 0.06, { wave: 'sine', volume: 0.08 * vol() });
        } else {
          notchFx[pos] = -1;
        }
      }
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (curDir() !== lapDir) anchor(curDir());
    var nb = Math.floor(beatN / BAR) + 1;
    if (nextMel === nb && nb < TOTAL_BARS && beatN % BAR === BAR - 1 && beatT >= SPB - 0.06) { playBar(nb); nextMel++; }
    for (var b = 1; b <= LAPS; b++) if (!slots[b].res && songT > b * BAR_LEN + GOOD_W) missSlot(b, 'late');
    if (!demoMode && !over && songT > LAPS * BAR_LEN + GOOD_W + 0.05) finish(misses < MISS_MAX);
  }

  function missSlot(b, why) {
    var sl = slots[b];
    if (sl.res) return;
    sl.res = 'miss';
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    if (why === 'way') wayFx = 0.6;
    var tx = CX + Math.sin(tipA) * RR, ty = CY - Math.cos(tipA) * RR;
    game.feedback.bad(tx, ty - 60, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  // 輪の頂点を通過した(入力とデモで共通)
  function lapCross() {
    if (!running || over) return 'none';
    var b = Math.round(songT / BAR_LEN);
    if (b < 1 || b > LAPS) return 'none';
    var sl = slots[b];
    if (sl.res) return 'none';
    var off = songT - b * BAR_LEN;
    if (Math.abs(off) > GOOD_W) { missSlot(b, 'pace'); return 'miss'; }
    laps++; combo++; ringFx = 1;
    if (combo > maxCombo) maxCombo = combo;
    if (Math.abs(off) <= PERFECT_W) {
      sl.res = 'perfect'; perfects++; score += 100 + Math.min(combo, 8) * 10;
      game.feedback.good(CX, CY - RR - 70, { text: 'PERFECT', color: C.blue, size: 54, count: 14, volume: armed ? 0.25 : 0.001 });
    } else {
      sl.res = 'good'; goods++; score += 50;
      game.feedback.good(CX, CY - RR - 70, { text: 'GOOD', color: C.mint, size: 46, count: 8, volume: armed ? 0.2 : 0.001 });
    }
    if (!demoMode && laps === 5 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(laps + ' / ' + LAPS, W / 2, CY, { color: C.pink, size: 80 });
    }
    return 'ok';
  }

  // 杖先の移動(角度を積算し、頂点の通過を拾う)
  function penDown(x, y) {
    var a = angOf(x, y);
    theta = Math.floor(theta / TAU) * TAU + a; lastA = a; tipA = a; pen = true;
    anchor(curDir());
  }
  function penMove(x, y) {
    var a = angOf(x, y);
    var d = wrap(a - lastA);
    lastA = a; tipA = a;
    theta += d; travel += d * lapDir;
    if (travel < -Math.PI * 0.6) { travel = 0; wayFx = 0.5; tone(147, 0.12, { wave: 'square', volume: 0.06 * vol() }); }
    if (lapDir * (theta - nextMark) >= -REACH && travel >= Math.PI * 0.4) {
      // 頂点に到達 = 1周。判定のあと、次の周の向きで次の頂点を目標にする
      var res = lapCross();
      var last = nextMark;
      lapDir = curDir();
      nextMark = last + lapDir * TAU;
      travel = 0;
      return res;
    }
    return 'none';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += laps * 30 + maxCombo * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1300), { color: i % 2 ? C.blue : C.pink, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, CY, { color: C.pink, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    var dist = Math.sqrt((x - CX) * (x - CX) + (y - CY) * (y - CY));
    if (dist > RR - 190 && dist < RR + 190) {
      penDown(x, y);
      game.audio.tone(523, 0.05, { wave: 'triangle', volume: 0.08 });
      game.fx.burst(x, y, { color: C.white, count: 6, speed: 160 });
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });
  var lastScrape = 0;
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pen || over) return;
    var res = penMove(x, y);
    if (res === 'ok') game.audio.tone(1760, 0.05, { wave: 'sine', volume: 0.08 });
    else if (game.time.elapsed - lastScrape > 0.08) { lastScrape = game.time.elapsed; game.audio.tone(2600, 0.012, { wave: 'triangle', volume: 0.012 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (pen && !over) game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.05 });
    pen = false;
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - 2 * r, h, col);
    game.draw.rect(x, y + r, w, h - 2 * r, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  var CARVER = ['....wwww....', '...wwwwww...', '..ffffffff..', '..fkffffkf..', '..ffffffff..', '...ffmmff...', '..bbbbbbbb..',
    '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.fbbbbbbbbf.', '..bbbbbbbb..', '..bb....bb..', '..bb....bb..', '.sss....sss.'];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var CARVER_B = variant(CARVER, { 11: '...bb..bb...', 12: '...bb..bb...', 13: '..sss..sss..' });
  var CARVER_OH = variant(CARVER, { 3: '..fofffffof.', 5: '...ffooff...' });
  var CPAL = { w: '#ffffff', f: '#ffd2b8', k: '#2d3a6b', m: '#ff6f91', o: '#2d3a6b', b: '#3fa9f5', s: '#2d3a6b' };
  var COUPLE = ['..hh....hh..', '..ff....ff..', '.dddd..ssss.', 'dddddddssss.', '.ddddddssss.', 'dddddd.s..s.', 'dddddd.s..s.'];
  var COUPLE_B = ['..hh....hh..', '..ff....ff..', '.dddd..ssss.', '.ddddddssss.', 'dddddddssss.', '.dddd..s..s.', 'dddddd.s..s.'];

  function drawRoom(t) {
    game.draw.gradient(0, H, [[0, C.wall], [1, C.wall2]]);
    // 窓(アーチ形のアイコン)
    for (var i = 0; i < 4; i++) {
      var wx = 120 + i * 250;
      var wy = H * 0.14;
      rrect(wx, wy, 150, 220, 75, C.white);
      rrect(wx + 14, wy + 14, 122, 192, 61, '#c7ecff');
      game.draw.rect(wx + 72, wy + 20, 6, 186, C.white);
    }
    // シャンデリア(丸のアイコン)
    var sw = Math.sin(t * 1.2) * 6;
    game.draw.rect(W / 2 - 3, 230, 6, 70, C.grey);
    game.draw.circle(W / 2 + sw * 0.2, 320, 44, C.gold);
    for (var c = -2; c <= 2; c++) game.draw.circle(W / 2 + c * 46 + sw * 0.2, 360, 14, c % 2 ? C.white : C.gold);
    // 床(ベタの市松)
    game.draw.rect(0, 540, W, H - 540, C.floor);
    for (var y = 540; y < H; y += 120) for (var x = (Math.floor(y / 120) % 2) * 120; x < W; x += 240) game.draw.rect(x, y, 120, 120, C.tile);
    // 踊る2人組(一拍目ではねる)
    var hop = beatGlow[0] > 0 ? beatGlow[0] * 14 : 0;
    var spots = [[120, 1560], [960, 1560], [120, 1760], [960, 1760]];
    for (var p = 0; p < spots.length; p++) {
      var fr = (Math.floor(beatN / BAR) + p) % 2 ? COUPLE : COUPLE_B;
      game.draw.sprite(fr, { h: C.navy, f: '#ffd2b8', d: p % 2 ? C.pink : C.mint, s: C.navy }, spots[p][0], spots[p][1] - hop, 9, { anchor: 'center', flipX: p % 2 === 1 });
    }
  }

  function ringPoint(a, r) { return { x: CX + Math.sin(a) * r, y: CY - Math.cos(a) * r }; }

  function drawRing(t) {
    var dir = curDir();
    var stop = hitStop > 0 && flashT > 0;
    // 氷の輪(白縁 + 氷の帯)
    game.draw.circle(CX, CY, RR + 62, ringFx > 0 ? C.blue : C.white);
    game.draw.circle(CX, CY, RR + 50, C.ice);
    game.draw.circle(CX, CY, RR - 50, C.white);
    game.draw.circle(CX, CY, RR - 62, C.floor);
    // 削った跡(今の周の進み具合)
    var prog = lapProg();
    if (state !== S.RESULT && (pen || state === S.ATTRACT)) {
      var n = Math.floor(prog * 60);
      for (var s = 0; s <= n; s++) {
        var pa = dir * (s / 60) * Math.PI * 2;
        var pp = ringPoint(pa, RR);
        game.draw.circle(pp.x, pp.y, 16, C.iceDeep);
      }
    }
    // 方向の矢印(予告中は逆向きが点滅)
    var showDir = dir;
    if (flipWarn > 0 && Math.floor(t * 8) % 2 === 0) showDir = -dir;
    var acol = flipWarn > 0 ? C.pink : C.blue;
    for (var q = 0; q < 6; q++) {
      var aa = (q + 0.5) * Math.PI / 3;
      var c1 = ringPoint(aa + showDir * 0.12, RR + 100);
      var lx = ringPoint(aa - showDir * 0.02, RR + 82), rx = ringPoint(aa - showDir * 0.02, RR + 118);
      game.draw.line(lx.x, lx.y, c1.x, c1.y, acol, 8);
      game.draw.line(rx.x, rx.y, c1.x, c1.y, acol, 8);
    }
    // 拍の印: 頂点(一拍目)と、回る向きに1/3・2/3周の小さな印
    for (var k = 0; k < 3; k++) {
      var na = dir * k * Math.PI * 2 / 3;
      var np = ringPoint(na, RR);
      var big = k === 0;
      var col = C.white;
      if (notchFx[k] > 0) col = C.mint;
      else if (notchFx[k] < 0) col = C.grey;
      if (beatGlow[k] > 0) game.draw.circle(np.x, np.y, (big ? 58 : 40) + beatGlow[k] * 18, big ? C.gold : C.white);
      game.draw.circle(np.x, np.y, big ? 48 : 30, big ? C.gold : C.navy);
      game.draw.circle(np.x, np.y, big ? 34 : 20, big ? C.white : col);
      if (big) game.draw.circle(np.x, np.y, 14, C.gold);
    }
    // 中心の雪の紋様(杖の周回と一緒に回る)
    var sc = stop ? 1.25 : 1;
    var ecol = stop ? C.white : C.blue;
    if (stop) game.draw.circle(CX, CY, 200 * sc, C.red);
    for (var e = 0; e < 6; e++) {
      var ea = theta + e * Math.PI / 3;
      var tip = { x: CX + Math.sin(ea) * 160 * sc, y: CY - Math.cos(ea) * 160 * sc };
      var mid = { x: CX + Math.sin(ea) * 95 * sc, y: CY - Math.cos(ea) * 95 * sc };
      game.draw.line(CX, CY, tip.x, tip.y, ecol, 16);
      var b1 = { x: mid.x + Math.sin(ea + 0.8) * 50 * sc, y: mid.y - Math.cos(ea + 0.8) * 50 * sc };
      var b2 = { x: mid.x + Math.sin(ea - 0.8) * 50 * sc, y: mid.y - Math.cos(ea - 0.8) * 50 * sc };
      game.draw.line(mid.x, mid.y, b1.x, b1.y, ecol, 12);
      game.draw.line(mid.x, mid.y, b2.x, b2.y, ecol, 12);
      game.draw.circle(tip.x, tip.y, 12, stop ? C.white : C.mint);
    }
    game.draw.circle(CX, CY, 44 * sc, stop ? C.white : C.mint);
    game.draw.circle(CX, CY, 22 * sc, C.white);
    if (wayFx > 0) game.draw.circle(CX, CY, 70, C.red);
    // 氷細工師(輪の外をすべって、杖先を輪に当てる)
    var cp = ringPoint(tipA, RR + 175);
    var tp = ringPoint(tipA, RR);
    var skate = Math.floor(t * 6) % 2 ? CARVER : CARVER_B;
    var spr = stop ? CARVER_OH : (pen || state === S.ATTRACT ? skate : CARVER);
    game.draw.line(cp.x, cp.y, tp.x, tp.y, C.navy, 8);
    game.draw.circle(tp.x, tp.y, 16, pen || state === S.ATTRACT ? C.pink : C.grey);
    game.draw.sprite(spr, CPAL, cp.x, cp.y + Math.sin(t * 5) * 3, 9, { anchor: 'center', flipX: tp.x < cp.x });
  }

  // 三拍子のカウント(1・2・3)
  function drawCount() {
    var y = H * 0.84;
    rrect(300, y - 70, 480, 140, 70, C.white);
    for (var i = 0; i < 3; i++) {
      var x = 390 + i * 150;
      var lit = running && beatN % BAR === i;
      var r = i === 0 ? 44 : 30;
      if (beatGlow[i] > 0) game.draw.circle(x, y, r + beatGlow[i] * 16, i === 0 ? C.gold : C.mint);
      game.draw.circle(x, y, r, lit ? (i === 0 ? C.gold : C.mint) : C.tile);
    }
  }

  function drawHud() {
    rrect(20, 16, W - 40, 200, 40, C.white);
    label('SCORE ' + score, 70, 100, 50, C.navy, 'left');
    label('BEST ' + prevBest, 70, 168, 30, C.blue, 'left');
    label(laps + ' / ' + LAPS, W - 70, 100, 54, C.navy, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 230 + m * 70, 160, 18, m < misses ? C.red : C.tile);
    var progress = Math.min(1, songT / (LAPS * BAR_LEN));
    game.draw.rect(60, 196, W - 120, 10, C.tile);
    game.draw.rect(60, 196, (W - 120) * progress, 10, C.blue);
  }

  function drawScene(t) {
    drawRoom(t);
    drawRing(t);
    drawCount();
  }

  // ---- ATTRACT: 実ロジックで 1小節1周(PERFECT×2)→3周目を急いで頂点を早く通過(MISS)→合わせ直し→5周目で逆回り ----
  var demo = { t: 0, hx: CX, hy: CY - RR, press: true };
  var DEMO_LEN = 6.3 * BAR_LEN;
  function demoAngle(tb) {
    var TAU = Math.PI * 2;
    if (tb < 2) return TAU * tb;
    if (tb < 2.75) return TAU * (2 + (tb - 2) / 0.75);
    if (tb < 4) return TAU * (3 + (tb - 2.75) / 1.25);
    if (tb < 5) return TAU * tb;
    return TAU * 5 - TAU * (tb - 5);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.started = false; }
    stepPlay(dt);
    var ang = demoAngle(songT / BAR_LEN);
    var p = ringPoint(ang, RR);
    if (!demo.started) { demo.started = true; penDown(p.x, p.y); }
    else penMove(p.x, p.y);
    demo.hx = p.x; demo.hy = p.y; demo.press = true;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (flipWarn > 0) flipWarn -= dt;
    if (flipFx > 0) flipFx -= dt * 2;
    if (ringFx > 0) ringFx -= dt * 4;
    if (wayFx > 0) wayFx -= dt;
    for (var i = 0; i < 3; i++) {
      if (beatGlow[i] > 0) beatGlow[i] -= dt * 4;
      if (notchFx[i] > 0) notchFx[i] = Math.max(0, notchFx[i] - dt * 2);
      else if (notchFx[i] < 0) notchFx[i] = Math.min(0, notchFx[i] + dt * 2);
    }

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      rrect(20, 16, W - 40, 200, 40, C.white);
      label(GAME_TITLE, W / 2, 112, 86 + Math.sin(t * 3) * 3, C.blue);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 186, 34, C.navy);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.pink);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.navy);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      rrect(70, 520, W - 140, 600, 50, C.white);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 650, 100, won ? C.blue : C.red);
      label('SCORE ' + score, W / 2, 750, 58, C.navy);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 830, 34, C.navy);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 920, 54, C.pink);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 920, 42, C.blue);
      if (!won) label('あと' + Math.max(1, LAPS - laps) + '周!', W / 2, 1010, 50, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.navy);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, laps: laps, perfect: perfects, good: goods, miss: misses, onBeatMarks: paces, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT + 1) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, CY + 36, 110, C.pink);
    if (over && won) label('FINISH', W / 2, CY + 36, 100, C.pink);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
