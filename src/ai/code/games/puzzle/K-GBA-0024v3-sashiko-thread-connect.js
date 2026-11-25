// K-GBA-0024v3-sashiko-thread-connect.js
// 刺し子の糸渡し — 師の針が1小節で拍ごとに刺した点の順を覚え、次の小節で同じ順に拍ごとに糸で結んで模様を仕上げる
// 操作: 師の小節では布の点が拍ごとに1つずつ光る(1拍目の点=糸の始点)。次の小節の頭までに始点を押さえ、指を離さずに2拍目・3拍目…の頭ちょうどに、光った順の次の点へ指を滑らせて糸を渡す。点に入るのが拍の頭ちょうどでPERFECT、少しずれるとGOOD。先走り・遅れ・拍の頭に違う点にいる・途中で指を離すとMISSで、その模様は糸が絡んで打ち切り。後の模様ほど師の糸の光が早く消え、最後は点が一瞬光るだけになる
// 終わり: 4つの模様(4小節の呼びかけと4小節の返し)を通し終えてMISS 2回以内ならCLEAR(PERFECT/GOODの点+仕上げボーナス)。MISS 3回でGAME OVER
// @mechanic: connect
// @theme: sashiko_thread_connect
// 世界観: 刺し子の工房で、弟子が師の針が刺した点を同じ順に糸で結んで模様を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・仕上げた模様の数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var STYLE = { bg: ['#6a4228', '#3a2214'], main: ['#1e2a5a', '#f4efe2', '#b8874e'], accent: ['#ffcc55', '#d8452e'] };
  // SKEUOMORPH: 木目の作業台・藍の木綿・革のHUDを gradient + 細線で。ボタンは上明・下暗 + 白ハイライトで厚み
  var C = {
    wood: STYLE.bg[0], woodD: STYLE.bg[1], woodL: '#8a5a36', grain: '#2a160c',
    indigo: STYLE.main[0], indigoL: '#2c3c78', cotton: STYLE.main[1], brass: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], leather: '#5a3420', leatherD: '#341c10',
    ink: '#120a06', white: '#ffffff', good: '#8ee8a0', shade: '#000000',
  };

  var GAME_TITLE = 'SASHIKO THREAD';
  var BPM = 96;
  var SPB = 60 / BPM;            // 1拍 0.625秒
  var BAR = 4;
  var TIME_LIMIT = 20;           // 8小節 = 32拍 × 0.625秒
  var PERFECT_W = 0.09;
  var GOOD_W = 0.18;
  var R_IN = 46;                 // 点に「入った」とみなす半径
  var R_ON = 74;                 // 点の上にいるとみなす半径
  var MISS_MAX = 3;

  var GX = [190, 423, 657, 890];
  var GY = [520, 753, 987, 1220];
  // 模様: 呼びかけ = 8r 拍目からの小節、返し = 8r+4 拍目からの小節。点 k は小節の k 拍目
  var ROUNDS = [
    [[0, 0], [1, 1], [2, 0]],
    [[3, 3], [2, 2], [2, 1], [3, 0]],
    [[0, 1], [2, 2], [1, 3], [3, 2]],
    [[3, 0], [1, 1], [0, 3], [2, 2]],
  ];
  function rCall(r) { return r * 8; }
  function rResp(r) { return r * 8 + 4; }
  function pt(r, k) { var g = ROUNDS[r][k]; return { x: GX[g[0]], y: GY[g[1]] }; }

  // 呼びかけ(師)と返し(弟子)の2小節で1周する伴奏(オリジナル)
  var TUNE = [['A4', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['A4', 2]];
  var BASS = [['A2', 2], ['E3', 2], ['C3', 2], ['A2', 2]];
  function startSong(quiet) {
    game.audio.melody(TUNE, { tempo: BPM, wave: 'triangle', volume: quiet ? 0.03 : 0.06, loop: true, bass: BASS, bassWave: 'sine', bassVolume: quiet ? 0.05 : 0.1 });
  }

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, hitStop, tangle, finger, rs, lastIn;
  var score, combo, maxCombo, perfects, goods, misses, rDone, over, won, outroT, prevBest, milestone, pierce;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; tangle = null; pierce = 0; lastIn = -1;
    finger = { down: false, x: W * 0.7, y: H * 0.86 };
    rs = [];
    for (var i = 0; i < ROUNDS.length; i++) rs.push({ phase: 'wait', anchored: false, next: 1, marks: [] });
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; rDone = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) { startClock(); startSong(true); }
  }

  // ---- 拍クロック(1本だけ) ----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    onBeat(0);
  }

  function onBeat(b) {
    var v = demoMode ? 0.4 : 1;
    var inCall = (b % 8) < 4;
    if (b % BAR === 0) game.audio.tone(inCall ? 147 : 196, 0.12, { wave: 'sine', volume: 0.22 * v });
    else game.audio.tone(inCall ? 1100 : 1320, 0.025, { wave: 'triangle', volume: 0.05 * v });
    var r = Math.floor(b / 8), k = b % 8;
    if (r < ROUNDS.length && k < ROUNDS[r].length) {
      // 師の針が刺す音
      pierce = 0.22;
      game.audio.tone(1760 - k * 180, 0.04, { wave: 'square', volume: 0.06 * v });
      game.audio.tone(880 - k * 90, 0.06, { wave: 'triangle', volume: 0.08 * v });
    }
    if (r < ROUNDS.length && k === 3) game.audio.tone(660, 0.05, { wave: 'triangle', volume: 0.06 * v, slide: 220 });  // 返しの小節が来る合図
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    for (var r = 0; r < ROUNDS.length; r++) {
      var s = rs[r];
      if (s.phase === 'wait' && songT >= rCall(r) * SPB) s.phase = 'call';
      if (s.phase === 'call' && songT >= rResp(r) * SPB) s.phase = 'resp';
      if (s.phase === 'resp') connectStep(r);
      if (over) return;
    }
    if (!demoMode && !over) {
      var all = true;
      for (var j = 0; j < rs.length; j++) if (rs[j].phase !== 'done' && rs[j].phase !== 'fail') all = false;
      if (all || songT >= TIME_LIMIT) finish(misses < MISS_MAX);
    }
  }

  function pointUnder(x, y, rad) {
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      if (Math.hypot(x - GX[i], y - GY[j]) < rad) return { i: i, j: j };
    }
    return null;
  }

  function connectStep(r) {
    var s = rs[r], n = ROUNDS[r].length - 1, t0 = rResp(r) * SPB;
    if (!s.anchored) {
      var p0 = pt(r, 0);
      if (finger.down && Math.hypot(finger.x - p0.x, finger.y - p0.y) < R_ON) {
        s.anchored = true; s.next = 1; lastIn = 0;
        game.audio.play('se_tap', demoMode ? 0.12 : 0.3);
        game.fx.burst(p0.x, p0.y, { color: C.cotton, count: 6, speed: 140 });
      } else if (songT > t0 + GOOD_W) { tangleMiss(r, finger.down ? finger.x : p0.x, finger.down ? finger.y : p0.y); return; }
      return;
    }
    if (!finger.down) { tangleMiss(r, finger.x, finger.y); return; }
    var tgt = pt(r, s.next), due = (rResp(r) + s.next) * SPB;
    var inTgt = Math.hypot(finger.x - tgt.x, finger.y - tgt.y) < R_IN;
    if (inTgt) {
      var off = songT - due, a = Math.abs(off);
      if (a <= PERFECT_W) {
        s.marks[s.next] = 2; perfects++; combo++;
        score += 100 + Math.min(combo, 10) * 10;
        game.feedback.good(tgt.x, tgt.y - 80, { text: 'PERFECT', color: C.gold, size: 46, count: 10, volume: demoMode ? 0.12 : 0.25 });
      } else if (a <= GOOD_W) {
        s.marks[s.next] = 1; goods++; combo++;
        score += 50 + Math.min(combo, 10) * 5;
        game.feedback.good(tgt.x, tgt.y - 80, { text: 'GOOD', color: C.good, size: 40, count: 6, volume: demoMode ? 0.1 : 0.2 });
      } else {
        tangleMiss(r, tgt.x, tgt.y); return;   // 先走り
      }
      if (combo > maxCombo) maxCombo = combo;
      game.audio.tone(523 + s.next * 120, 0.06, { wave: 'triangle', volume: demoMode ? 0.04 : 0.1 });
      s.next++;
      if (s.next > n) completeRound(r);
      return;
    }
    if (songT > due + GOOD_W) tangleMiss(r, finger.x, finger.y);   // 遅れ・違う点にいる
  }

  function tangleMiss(r, x, y) {
    var s = rs[r];
    if (s.phase !== 'resp') return;
    s.phase = 'fail';
    misses++; combo = 0;
    hitStop = 0.45; tangle = { x: x, y: y, t: 0.45 };
    game.feedback.bad(x, y - 80, { text: 'MISS', shake: demoMode ? 4 : 10, volume: demoMode ? 0.15 : 0.5 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function completeRound(r) {
    var s = rs[r];
    s.phase = 'done'; rDone++;
    var clean = true;
    for (var k = 1; k < ROUNDS[r].length; k++) if (s.marks[k] !== 2) clean = false;
    score += clean ? 250 : 120;
    var e = pt(r, ROUNDS[r].length - 1);
    game.fx.burst(e.x, e.y, { color: C.gold, count: 16, speed: 340 });
    if (!demoMode && rDone === 2 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('2 / ' + ROUNDS.length, W / 2, H * 0.2, { color: C.gold, size: 84 });
    }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += rDone * 150 + maxCombo * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 5; i++) game.fx.burst(game.random(200, 880), game.random(520, 1220), { color: i % 2 ? C.gold : C.cotton, count: 20, speed: 400 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over) return;
    finger.down = true; finger.x = x; finger.y = y;
    var on = pointUnder(x, y, R_ON);
    if (on) { game.audio.tone(1568, 0.03, { wave: 'square', volume: 0.06 }); game.fx.burst(GX[on.i], GY[on.j], { color: C.cotton, count: 4, speed: 100 }); }
    else game.audio.tone(220, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !finger.down) return;
    finger.x = x; finger.y = y;
    var on = pointUnder(x, y, R_IN);
    var id = on ? on.i * 4 + on.j : -1;
    if (id !== lastIn) { lastIn = id; if (on) game.audio.tone(1245, 0.02, { wave: 'triangle', volume: 0.03 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    finger.down = false;
    if (!over) game.audio.tone(330, 0.04, { wave: 'sine', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 質感の描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y - 1, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 上明・下暗のボタン(縦の段々で厚みを出す)
  function bevel(x, y, w, h, base, lit) {
    game.draw.rect(x - 4, y - 4, w + 8, h + 10, C.ink, 0.6);
    game.draw.rect(x, y, w, h, base);
    for (var i = 0; i < 6; i++) game.draw.rect(x, y + (h / 6) * i, w, h / 6, i < 3 ? C.white : C.shade, (i < 3 ? (3 - i) * 0.07 : (i - 2) * 0.06));
    game.draw.rect(x + 8, y + 6, w - 16, Math.max(4, h * 0.16), C.white, lit ? 0.75 : 0.4);
    if (lit) game.draw.rect(x, y, w, h, C.gold, 0.35);
  }
  function stitchLine(x1, y1, x2, y2, col, w, dash) {
    var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.floor(len / dash));
    for (var i = 0; i < n; i += 2) {
      var a = i / n, b = Math.min(1, (i + 1) / n);
      game.draw.line(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b, col, w);
    }
  }
  function thread(x1, y1, x2, y2, col) {
    game.draw.line(x1 + 3, y1 + 5, x2 + 3, y2 + 5, C.shade, 9);
    game.draw.line(x1, y1, x2, y2, col, 8);
    game.draw.line(x1 - 1, y1 - 2, x2 - 1, y2 - 2, C.white, 2);
  }

  var CLOTH = { x: 110, y: 440, w: 860, h: 860 };

  function drawTable() {
    game.draw.gradient(0, H, [[0, C.woodL], [0.5, C.wood], [1, C.woodD]]);
    for (var g = 0; g < 48; g++) {
      var y = g * 40 + 10;
      for (var s = 0; s < 9; s++) {
        var x0 = s * 128, x1 = x0 + 128;
        game.draw.line(x0, y + Math.sin(g * 1.3 + s * 0.9) * 8, x1, y + Math.sin(g * 1.3 + s * 0.9 + 0.9) * 8, C.grain, 2);
      }
    }
  }

  function drawCloth() {
    game.draw.rect(CLOTH.x + 14, CLOTH.y + 22, CLOTH.w, CLOTH.h, C.shade, 0.45);
    game.draw.rect(CLOTH.x, CLOTH.y, CLOTH.w, CLOTH.h, C.indigo);
    game.draw.rect(CLOTH.x, CLOTH.y, CLOTH.w, CLOTH.h * 0.5, C.indigoL, 0.35);
    for (var i = 0; i < CLOTH.w; i += 14) game.draw.line(CLOTH.x + i, CLOTH.y, CLOTH.x + i, CLOTH.y + CLOTH.h, C.white, 1);
    game.draw.rect(CLOTH.x, CLOTH.y, CLOTH.w, CLOTH.h, C.indigo, 0.82);
    for (var j = 0; j < CLOTH.h; j += 14) game.draw.line(CLOTH.x, CLOTH.y + j, CLOTH.x + CLOTH.w, CLOTH.y + j, C.shade, 1);
    var m = 26;
    stitchLine(CLOTH.x + m, CLOTH.y + m, CLOTH.x + CLOTH.w - m, CLOTH.y + m, C.cotton, 4, 18);
    stitchLine(CLOTH.x + m, CLOTH.y + CLOTH.h - m, CLOTH.x + CLOTH.w - m, CLOTH.y + CLOTH.h - m, C.cotton, 4, 18);
    stitchLine(CLOTH.x + m, CLOTH.y + m, CLOTH.x + m, CLOTH.y + CLOTH.h - m, C.cotton, 4, 18);
    stitchLine(CLOTH.x + CLOTH.w - m, CLOTH.y + m, CLOTH.x + CLOTH.w - m, CLOTH.y + CLOTH.h - m, C.cotton, 4, 18);
    // 仕上がった模様(刺し子の運針)
    for (var r = 0; r < ROUNDS.length; r++) {
      if (rs[r].phase !== 'done') continue;
      for (var k = 1; k < ROUNDS[r].length; k++) {
        var a = pt(r, k - 1), b = pt(r, k);
        stitchLine(a.x, a.y, b.x, b.y, C.cotton, 7, 22);
      }
    }
    // 針穴の点
    for (var x = 0; x < 4; x++) for (var y = 0; y < 4; y++) {
      game.draw.circle(GX[x], GY[y], 22, C.shade, 0.35);
      game.draw.circle(GX[x], GY[y], 16, C.cotton, 0.85);
      game.draw.circle(GX[x] - 4, GY[y] - 5, 5, C.white, 0.9);
    }
  }

  // 師の糸: 1・2つ目の模様は返しの頭まで残り、3つ目は最後の拍で消え、4つ目は刺した瞬間だけ光る
  function drawCall(r) {
    var s = rs[r];
    if (s.phase !== 'call') return;
    var t = game.time.elapsed, n = ROUNDS[r].length - 1;
    var into = (songT - rCall(r) * SPB) / SPB;
    var shown = Math.min(n, Math.floor(into + 0.0001));
    var keep = r < 2 ? 1 : (r === 2 ? Math.max(0, Math.min(1, 4 - into)) : 0);
    for (var k = 0; k <= shown; k++) {
      var p = pt(r, k);
      var age = into - k;
      var glow = r === 3 ? Math.max(0, 1 - age / 0.45) : Math.max(keep, Math.max(0, 1 - age / 0.45));
      if (glow <= 0) continue;
      game.draw.circle(p.x, p.y, 46, C.gold, 0.25 * glow);
      game.draw.circle(p.x, p.y, 28, C.gold, 0.9 * glow);
      game.draw.circle(p.x - 6, p.y - 7, 8, C.white, glow);
      if (k > 0 && r < 3) {
        var q = pt(r, k - 1);
        var ga = Math.min(glow, keep > 0 ? 1 : Math.max(0, 1 - age / 0.45));
        if (ga > 0) { game.draw.line(q.x, q.y, p.x, p.y, C.gold, 12); game.draw.line(q.x, q.y, p.x, p.y, C.white, 3); }
      }
    }
    // 師の針(拍の頭で次の点に刺さる)
    var cur = Math.min(n, Math.floor(into)), frac = into - Math.floor(into);
    var from = cur >= 0 ? pt(r, cur) : { x: 160, y: 300 };
    var to = cur + 1 <= n ? pt(r, cur + 1) : { x: CLOTH.x + CLOTH.w + 20, y: CLOTH.y - 60 };
    var u = frac < 0.55 ? 0 : Math.min(1, (frac - 0.55) / 0.45);
    var nx = from.x + (to.x - from.x) * u, ny = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 120;
    game.draw.sprite(NEEDLE, NEEDLE_PAL, nx + 34, ny - 34, 9, { anchor: 'center' });
    if (pierce > 0) game.draw.circle(from.x, from.y, 30 + (0.22 - pierce) * 200, C.white, pierce * 2);
    // 返しの小節の直前: 始点が脈打つ
    if (into >= 3) {
      var p0 = pt(r, 0);
      game.draw.circle(p0.x, p0.y, 40 + Math.sin(t * 20) * 6, C.red, 0.45);
    }
  }

  function drawResp(r) {
    var s = rs[r];
    if (s.phase !== 'resp') return;
    var n = ROUNDS[r].length - 1, t = game.time.elapsed;
    if (!s.anchored) {
      var p0 = pt(r, 0);
      game.draw.circle(p0.x, p0.y, 46 + Math.sin(t * 20) * 6, C.red, 0.55);
      return;
    }
    for (var k = 1; k < s.next; k++) {
      var a = pt(r, k - 1), b = pt(r, k);
      thread(a.x, a.y, b.x, b.y, C.cotton);
      game.draw.circle(b.x, b.y, 24, s.marks[k] === 2 ? C.gold : C.good, 0.9);
    }
    var last = pt(r, s.next - 1);
    game.draw.circle(last.x, last.y, 24, C.cotton, 0.9);
    if (finger.down) thread(last.x, last.y, finger.x, finger.y, C.cotton);
  }

  function drawTangle() {
    if (!tangle || tangle.t <= 0) return;
    var k = tangle.t / 0.45, big = 1 + (1 - k) * 0.6;
    var col = hitStop > 0.2 ? C.white : C.red;
    for (var i = 0; i < 7; i++) {
      var a = i * 0.9, r1 = 30 * big, r2 = 60 * big;
      game.draw.line(tangle.x + Math.cos(a) * r1, tangle.y + Math.sin(a) * r1, tangle.x + Math.cos(a + 2.4) * r2, tangle.y + Math.sin(a + 2.4) * r2, col, 6);
    }
    game.draw.circle(tangle.x, tangle.y, 22 * big, col, 0.9);
  }

  var NEEDLE = ['.......ss', '......ss.', '.....ss..', '....ss...', '...ss....', '..ss.....', '.ss......', 'ee.......', 'e........'];
  var NEEDLE_PAL = { s: '#e8eef4', e: '#8a96a4' };
  var MASTER = [
    ['...gggg...', '..gggggg..', '..gffffg..', '..feffef..', '...ffff...', '..iiiiii..', '.iiiwwiii.', 'iiiiwwiiii', 'ifiiiiiifi', 'iiiiiiiiii', '.iiiiiiii.'],
    ['...gggg...', '..gggggg..', '..gffffg..', '..feffef..', '...ffff..f', '..iiiiiiif', '.iiiwwiii.', 'iiiiwwiii.', 'ifiiiiiii.', 'iiiiiiiiii', '.iiiiiiii.'],
  ];
  var MASTER_PAL = { g: '#c8c8c0', f: '#e8b890', e: '#2a1a10', i: '#2a3a7a', w: '#f4efe2' };
  var PUPIL = [
    ['...kkkk...', '..kkkkkk..', '..kffffk..', '..feffef..', '...ffff...', '..aaaaaa..', '.aaawwaaa.', 'aaaawwaaaa', 'afaaaaaafa', 'aaaaaaaaaa', '.aaaaaaaa.'],
    ['...kkkk...', '..kkkkkk..', '..kffffk..', '..feffef..', 'f..ffff...', 'faaaaaaa..', '.aaawwaaa.', '.aaawwaaaa', '.aaaaaaafa', 'aaaaaaaaaa', '.aaaaaaaa.'],
  ];
  var PUPIL_PAL = { k: '#2a1a10', f: '#f0c098', e: '#2a1a10', a: '#c8452e', w: '#f4efe2' };

  function drawPeople() {
    var inCall = running ? (beatN % 8) < 4 : true;
    var t = game.time.elapsed;
    // 師(上)と弟子(下)。番の側が針/糸を持ち上げる
    bevel(40, 262, 230, 150, C.leather, inCall && running);
    game.draw.sprite(MASTER[inCall && running ? 1 : 0], MASTER_PAL, 155, 338 + Math.sin(t * 2) * 2, 12, { anchor: 'center' });
    bevel(W - 270, H * 0.835, 230, 150, C.leather, !inCall && running);
    game.draw.sprite(PUPIL[(!inCall && running) || finger.down ? 1 : 0], PUPIL_PAL, W - 155, H * 0.835 + 76 + Math.sin(t * 2.4) * 2, 12, { anchor: 'center' });
    // 糸巻き
    game.draw.circle(160, H * 0.875, 64, C.ink, 0.5);
    game.draw.circle(156, H * 0.87, 60, C.brass);
    game.draw.circle(156, H * 0.87, 44, C.cotton);
    for (var i = 0; i < 5; i++) game.draw.line(118, H * 0.87 - 30 + i * 15, 194, H * 0.87 - 30 + i * 15, '#d8d0bc', 2);
    game.draw.circle(156, H * 0.87, 10, C.brass);
  }

  // 拍ランプ: 左の4つ=師の小節、右の4つ=弟子の小節
  function drawBeatLamps() {
    var y = H * 0.735;
    var pos = running ? beatN % 8 : -1;
    for (var i = 0; i < 8; i++) {
      var x = 92 + i * 116 + (i >= 4 ? 40 : 0);
      var on = i === pos;
      bevel(x - 44, y - 34, 88, 68, i < 4 ? C.indigoL : C.red, on);
      if (i % 4 === 0) game.draw.circle(x, y, 10, C.white, on ? 1 : 0.5);
    }
  }

  function drawScene() {
    drawTable();
    drawCloth();
    for (var r = 0; r < ROUNDS.length; r++) { drawCall(r); drawResp(r); }
    drawTangle();
    drawBeatLamps();
    drawPeople();
  }

  function drawHud() {
    game.draw.gradient(0, 232, [[0, C.leather], [1, C.leatherD]]);
    stitchLine(20, 214, W - 20, 214, C.brass, 4, 16);
    label('SCORE ' + score, 54, 96, 52, C.cotton, 'left');
    label('BEST ' + prevBest, 54, 168, 32, C.brass, 'left');
    label(rDone + ' / ' + ROUNDS.length, W - 54, 96, 56, C.gold, 'right');
    for (var i = 0; i < MISS_MAX; i++) {
      game.draw.circle(W - 210 + i * 70, 160, 24, C.ink, 0.6);
      game.draw.circle(W - 210 + i * 70, 158, 20, i < misses ? C.red : C.brass);
      game.draw.circle(W - 216 + i * 70, 152, 6, C.white, 0.6);
    }
    var progress = Math.min(1, songT / TIME_LIMIT);
    game.draw.rect(0, 226, W, 6, C.ink);
    game.draw.rect(0, 226, W * progress, 6, C.gold);
  }

  // ---- ATTRACT: 実ロジックで1つ目を通し、2つ目は3点目でわざと違う点へ渡して糸を絡ませる ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = 16 * SPB + 0.8;
  var DEMO_WRONG = { r: 1, k: 2, x: GX[1], y: GY[1] };
  function demoTarget(r, k) {
    if (r === DEMO_WRONG.r && k === DEMO_WRONG.k) return { x: DEMO_WRONG.x, y: DEMO_WRONG.y };
    return pt(r, k);
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); }
    var r = Math.floor((songT + 0.0001) / (8 * SPB));
    if (r < ROUNDS.length) {
      var s = rs[r], into = (songT - rCall(r) * SPB) / SPB;
      if (s.phase === 'call') {
        var p0 = pt(r, 0);
        finger.down = into > 2.6;
        finger.x += (p0.x - finger.x) * Math.min(1, dt * 7);
        finger.y += (p0.y - finger.y) * Math.min(1, dt * 7);
      } else if (s.phase === 'resp') {
        var bt = (songT - rResp(r) * SPB) / SPB;    // 返しの小節の何拍目か
        var k = Math.max(1, Math.min(ROUNDS[r].length - 1, Math.floor(bt - 0.635) + 1));
        var a = demoTarget(r, k - 1), b = demoTarget(r, k);
        var u = Math.max(0, Math.min(1, (bt - (k - 1) - 0.635) / 0.5));
        u = u * u * (3 - 2 * u);
        finger.down = true; finger.x = a.x + (b.x - a.x) * u; finger.y = a.y + (b.y - a.y) * u;
      } else {
        finger.down = false;
        finger.x += (W * 0.7 - finger.x) * Math.min(1, dt * 3);
        finger.y += (H * 0.6 - finger.y) * Math.min(1, dt * 3);
      }
    }
    demo.press = finger.down;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (tangle && tangle.t > 0) tangle.t -= dt;
    if (pierce > 0) pierce -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      var hx = finger.down ? finger.x : finger.x + 40 + Math.sin(t * 3) * 10;
      var hy = finger.down ? finger.y : finger.y + 70 + Math.cos(t * 3) * 10;
      game.draw.hand(hx, hy, { press: demo.press, scale: 15 });
      game.draw.gradient(0, 232, [[0, C.leather], [1, C.leatherD]]);
      stitchLine(20, 214, W - 20, 214, C.brass, 4, 16);
      label(GAME_TITLE, W / 2, 108, 80 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 186, 36, C.cotton);
      bevel(W / 2 - 300, H * 0.785, 600, 96, C.red, Math.floor(t * 2) % 2 === 0);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.785 + 66, 50, C.white);
      else label('TAP TO START', W / 2, H * 0.785 + 64, 44, C.cotton);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.25, W, H * 0.34, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, H * 0.38, 56, C.cotton);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.425, 36, C.brass);
      label('COMBO ' + maxCombo + '   ' + rDone + ' / ' + ROUNDS.length, W / 2, H * 0.465, 36, C.good);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.515, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.515, 40, C.cotton);
      if (!won) label('あと' + Math.max(1, ROUNDS.length - rDone) + '個!', W / 2, H * 0.22, 60, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.57, 36, C.cotton);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, patterns: rDone, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) { startClock(); startSong(false); }
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.4, 110, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
