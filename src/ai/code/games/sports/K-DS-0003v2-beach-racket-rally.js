// K-DS-0003v2-beach-racket-rally.js
// 砂浜のラケット打ち上げ — 跳ねる8分(スイング)で弾む球の落下点へ、指で子どもを走らせてラケットを先回りさせ、拍の頭で受けて打ち上げ続ける
// 操作: 画面を押したまま指を動かすと、子ども(ラケット)が指の少し上の砂の上へついてくる。球を打ち上げた瞬間に次の落下点の輪が砂に出る(外側の輪は拍の頭で閉じる)。球は跳ねる8分の裏で一度砂に弾み、次の拍の頭で輪の上に落ちてくる。そのとき輪の中にいれば打ち上げ(中心で拍ちょうどならPERFECT、遅れて滑り込むとGOOD)。間に合わなければ球を落としてMISS。高く上がる球(紫の輪)は2拍先の遠い所に落ちる
// 終わり: 7小節(約17秒・22球)を打ち上げ続けて MISS 2回以内ならCLEAR(最後の球は空へ打ち上げる)。MISS 3回でGAME OVER
// @mechanic: drag_follow
// @theme: beach_racket_rally
// 世界観: 夏の砂浜で、日焼けした子がラケットひとつで跳ねる球を追いかけ、スイングの拍に乗って一度も落とさずに空へ打ち上げ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最大連続・打ち上げた数
// スタイル: MODE7 PSEUDO
var STYLE = { bg: ['#2f8fe0', '#a8dcff', '#1c6aa8'], main: ['#f3d89c', '#e3bf78', '#ff5a5a'], accent: ['#fff36a', '#b46aff'] };

(function (game) {
  // MODE7 PSEUDO: 地平線から下を横ストリップに分け、奥ほど横方向を圧縮した砂の市松を描く。地平線から上は空グラデと海
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    sky: STYLE.bg[0], skyL: STYLE.bg[1], sea: STYLE.bg[2],
    sand: STYLE.main[0], sand2: STYLE.main[1], racket: STYLE.main[2],
    ball: STYLE.accent[0], lob: STYLE.accent[1],
    ink: '#1a1830', white: '#ffffff', foam: '#e8f8ff', haze: '#cfe9f7', shadow: '#a88a50',
    sun: '#ffd84a', coral: '#ff7a5a', good: '#3ad08a', red: '#ff4a5a', hud: '#0f3a66'
  };

  var GAME_TITLE = 'SAND RALLY';
  var BPM = 100;
  var SPB = 60 / BPM;
  var SWING = 2 / 3;               // 跳ねる8分: 拍の頭から2/3が裏
  var TIME_LIMIT = 17;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.16;
  var R_HIT = 50, R_PERF = 26;     // 砂の上の受け半径(ワールド単位)
  var MISS_MAX = 3;
  var HIT_STOP = 0.35;
  var HZ = 560, FOC = 700, KF = 210000, CELL = 60;   // 地平線 / 焦点 / カメラ高さ×焦点 / 市松の一辺
  var Z_NEAR = 270, Z_FAR = 520, XMAX = 150;
  var H_RACKET = 66;
  // [拍, 横(-1..1), 奥(0..1)]。先頭はサーブ(判定なし)。拍が2つ空くのは高い球
  var CHART = [[3, 0, 0.3], [4, 0, 0.3], [5, 0.25, 0.35], [6, -0.05, 0.3], [7, 0.3, 0.45], [8, -0.25, 0.4], [9, 0.1, 0.2],
    [10, -0.3, 0.3], [11, 0.15, 0.55], [12, -0.35, 0.5], [14, 0.55, 0.15], [15, 0.25, 0.35], [16, 0.55, 0.6], [17, 0.1, 0.45],
    [18, -0.4, 0.3], [20, -0.65, 0.8], [21, -0.25, 0.55], [22, -0.6, 0.25], [23, 0, 0.4], [24, 0.5, 0.3], [26, 0.7, 0.75],
    [27, 0.25, 0.6], [28, -0.2, 0.35]];
  var TG = [];
  for (var ci = 0; ci < CHART.length; ci++) TG.push({ b: CHART[ci][0], T: CHART[ci][0] * SPB, X: CHART[ci][1] * XMAX, Z: Z_NEAR + CHART[ci][2] * (Z_FAR - Z_NEAR) });
  var LAST = TG.length - 1;
  var TOTAL = LAST;
  var SONG_BEATS = TG[LAST].b;

  // 伴奏(オリジナル)。跳ねる8分 = 2/3拍 + 1/3拍、ベースは4分で歩く
  var MEL = [
    [['F4', 0.667], ['A4', 0.333], ['C5', 0.667], ['A4', 0.333], ['F4', 0.667], ['A4', 0.333], ['C5', 1]],
    [['D5', 0.667], ['C5', 0.333], ['A4', 0.667], ['F4', 0.333], ['G4', 1], ['A4', 1]],
    [['Bb4', 0.667], ['A4', 0.333], ['G4', 0.667], ['F4', 0.333], ['E4', 1], ['G4', 1]],
    [['A4', 0.667], ['C5', 0.333], ['F5', 0.667], ['E5', 0.333], ['D5', 0.667], ['C5', 0.333], ['A4', 1]],
    [['Bb4', 1.667], ['A4', 0.333], ['G4', 0.667], ['A4', 0.333], ['Bb4', 1]],
    [['C5', 0.667], ['D5', 0.333], ['C5', 0.667], ['A4', 0.333], ['F4', 1], ['A4', 1]],
    [['G4', 0.667], ['A4', 0.333], ['Bb4', 0.667], ['C5', 0.333], ['D5', 0.667], ['E5', 0.333], ['F5', 1]],
    [['F5', 2]]
  ];
  var BASS = [['F2', 'A2', 'C3', 'A2'], ['F2', 'A2', 'C3', 'D3'], ['Bb2', 'D3', 'C3', 'C3'], ['F2', 'A2', 'C3', 'A2'],
    ['Bb2', 'D3', 'F3', 'D3'], ['F2', 'A2', 'C3', 'A2'], ['C3', 'E3', 'G3', 'C3'], ['F2', 'F2', 'F2', 'F2']];

  // ---- ドット絵 ----
  var KID = ['........rrr.', '.......rrrrr', '.......rrrrr', '........rrr.', '.........w..', '...hhhh..s..', '..hhhhhh.s..',
    '..hssssh.s..', '..sksskss...', '..ssssss....', '...smms.....', '..tttttt....', '.stttttt....', '.s.tttt.....',
    '...bbbb.....', '...bbbb.....', '...s..s.....', '..ss..ss....'];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var KID_RUN = variant(KID, { 16: '..s....s....', 17: '.ss....ss...' });
  var KID_SWING = variant(KID, { 0: '.....rrr....', 1: '....rrrrr...', 2: '....rrrrr...', 3: '.....rrr....', 4: '......ww....', 5: '...hhhhs....', 6: '..hhhhhhs...', 7: '..hssssh....', 10: '...sooss....' });
  var KID_OOPS = variant(KID, { 8: '..sxssxss...', 10: '...sooss....' });
  var KPAL = { r: C.racket, w: '#b07040', h: '#3a2a1a', s: '#e8885a', k: C.ink, x: C.ink, m: '#a02a2a', o: C.ink, t: '#3ad0e0', b: '#ffd23a' };
  var GULL = [['#.....#', '.#...#.', '..###..'], ['.......', '##.#.##', '..###..']];
  var PARASOL = ['....pppp....', '..pwpwpwpw..', '.pwpwpwpwpw.', 'pppppppppppp', '.....ss.....', '.....ss.....', '.....ss.....',
    '.....ss.....', '.....ss.....', '.....ss.....'];
  var PPAL = { p: '#ff5a7a', w: '#ffffff', s: '#8a6a4a' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, andT, lastAnd, swingT, smashT;
  var kid, finger, moving, serveFrom, cur, res, missBall, puffs;
  var score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; andT = 0; lastAnd = -1; swingT = 0; smashT = 0;
    kid = { X: TG[0].X, Z: TG[0].Z }; finger = null; moving = false; serveFrom = null;
    cur = 1; res = []; missBall = null; puffs = [];
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 投影(MODE7の床) ----
  function proj(X, Z, h) { var s = FOC / Z; return { x: 540 + X * s, y: HZ + KF / Z - h * s, s: s }; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ---- 拍クロック(1本だけ) ----
  function playBar(b) {
    if (!armed || b >= MEL.length) return;
    var bl = [];
    for (var i = 0; i < 4; i++) bl.push([BASS[b][i], 1]);
    game.audio.melody(MEL[b], { tempo: BPM, wave: 'square', volume: 0.035 * vol(), bass: bl, bassWave: 'triangle', bassVolume: 0.1 * vol() });
  }
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }
  function onBeat(k) {
    if (k > SONG_BEATS) return;
    lampT = 1;
    tone(4200, 0.02, { wave: 'square', volume: 0.018 * vol() });
    if (k < TG[0].b) tone('C5', 0.05, { wave: 'square', volume: 0.05 * vol() });     // ラケットの上で球をポンポン(カウント)
    if (k === TG[0].b) { serveFrom = { X: kid.X, Z: kid.Z }; swingT = 0.2; tone('G5', 0.07, { wave: 'square', volume: 0.06 * vol() }); }
  }
  function onAnd(k) {
    andT = 1;
    tone(5200, 0.012, { wave: 'square', volume: 0.012 * vol() });
    // 次の拍で受ける球は、この裏で一度砂に弾む
    for (var i = 1; i < TG.length; i++) {
      if (TG[i].b === k + 1) {
        var b = bouncePt(i - 1);
        puffs.push({ X: b.X, Z: b.Z, t: 0.4 });
        tone(170, 0.05, { wave: 'sine', volume: 0.09 * vol() });
        tone(2400, 0.02, { wave: 'sawtooth', volume: 0.015 * vol() });
      }
    }
  }

  function segStart(i) { return i === 0 ? (serveFrom || TG[0]) : TG[i]; }
  function bouncePt(i) {
    var A = segStart(i), B = TG[i + 1];
    return { X: A.X + (B.X - A.X) * 0.85, Z: A.Z + (B.Z - A.Z) * 0.85 };
  }
  function ballAt(T) {
    if (!running && !over) return { X: kid.X, Z: kid.Z, h: H_RACKET + Math.abs(Math.sin(T * 4)) * 30 };
    if (T < TG[0].T) return { X: kid.X, Z: kid.Z, h: H_RACKET + Math.abs(Math.sin((T / SPB) * Math.PI)) * 34 };
    var i = 0;
    while (i < LAST && TG[i + 1].T <= T) i++;
    if (i >= LAST) {
      var L = TG[LAST];
      return { X: L.X, Z: L.Z, h: res[LAST] === 'miss' ? 0 : H_RACKET + (T - L.T) * 1100 };
    }
    var A = segStart(i), B = TG[i + 1];
    var t0 = TG[i].T, Tb = B.T - SPB * (1 - SWING);
    var lob = B.T - t0 > SPB * 1.5;
    var bp = bouncePt(i);
    if (T < Tb) {
      var u = (T - t0) / (Tb - t0);
      return { X: A.X + (bp.X - A.X) * u, Z: A.Z + (bp.Z - A.Z) * u, h: H_RACKET * (1 - u) + 4 * (lob ? 380 : 170) * u * (1 - u) };
    }
    var v = (T - Tb) / (B.T - Tb);
    return { X: bp.X + (B.X - bp.X) * v, Z: bp.Z + (B.Z - bp.Z) * v, h: H_RACKET * v + 4 * 36 * v * (1 - v) };
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    if (beatT >= SPB * SWING && lastAnd !== beatN) { lastAnd = beatN; onAnd(beatN); }
    songT = beatN * SPB + beatT;
    if (nextBar < MEL.length && songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    // 受けの判定: 拍の頭で輪の中にいれば打ち上げ。遅れて滑り込んでもGOOD窓までは受けられる
    while (cur <= LAST && songT >= TG[cur].T) {
      var tg = TG[cur];
      var dx = kid.X - tg.X, dz = kid.Z - tg.Z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d <= R_HIT) { hitBall(cur, songT - tg.T, d); cur++; continue; }
      if (songT > tg.T + GOOD_W) { missBallAt(cur); cur++; if (over) return; continue; }
      break;
    }
    if (!demoMode && !over && cur > LAST && songT > TG[LAST].T + GOOD_W) finish(misses < MISS_MAX);
  }

  function hitBall(i, off, d) {
    var perfect = off <= PERFECT_W && d <= R_PERF;
    res[i] = perfect ? 'perfect' : 'good';
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    swingT = 0.22;
    var lob = i < LAST && TG[i + 1].T - TG[i].T > SPB * 1.5;
    var p = proj(TG[i].X, TG[i].Z, H_RACKET);
    tone(perfect ? 'E6' : 'C6', 0.07, { wave: 'square', volume: 0.07 * vol() });
    if (perfect) {
      perfects++; score += 100 + Math.min(combo, 10) * 10 + (lob ? 50 : 0);
      game.feedback.good(p.x, p.y - 60, { text: 'PERFECT', color: C.ball, size: 52, count: 12, volume: armed ? 0.2 : 0.001 });
    } else {
      goods++; score += 50 + (lob ? 50 : 0);
      game.feedback.good(p.x, p.y - 60, { text: 'GOOD', color: C.white, size: 46, count: 7, volume: armed ? 0.16 : 0.001 });
    }
    if (!demoMode && combo === 10) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(combo + ' COMBO', W / 2, 400, { color: C.ball, size: 76 });
    }
    if (i === LAST) {
      smashT = 1.5;
      game.audio.play('se_jump', 0.4);
      game.fx.burst(p.x, p.y, { color: C.ball, count: 24, speed: 420 });
      if (!demoMode) finish(misses < MISS_MAX);
    }
  }

  function missBallAt(i) {
    res[i] = 'miss';
    misses++; combo = 0;
    hitStop = HIT_STOP;
    missBall = { X: TG[i].X, Z: TG[i].Z };
    puffs.push({ X: TG[i].X, Z: TG[i].Z, t: 0.6 });
    var p = proj(TG[i].X, TG[i].Z, 0);
    tone(110, 0.15, { wave: 'sine', volume: 0.12 * vol() });
    game.feedback.bad(p.x, p.y - 80, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
    else if (!demoMode && i === LAST) finish(misses < MISS_MAX);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += hits * 20;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(300, 700), { color: i % 2 ? C.ball : C.coral, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.ball, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力(指の少し上の砂の上へ子どもがついてくる) ----
  function setFinger(x, y) { finger = { x: x, y: y }; }
  function stepKid(dt) {
    if (!finger) { moving = false; return; }
    var ty = clamp(finger.y - 170, HZ + KF / 560, HZ + KF / 250);
    var z = KF / (ty - HZ);
    var X = clamp((finger.x - 540) * z / FOC, -190, 190);
    var k = 1 - Math.exp(-22 * dt);
    var nx = kid.X + (X - kid.X) * k, nz = kid.Z + (z - kid.Z) * k;
    moving = Math.abs(nx - kid.X) + Math.abs(nz - kid.Z) > 0.6;
    kid.X = nx; kid.Z = nz;
  }
  var lastStep = 0;
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    setFinger(x, y);
    game.fx.burst(x, y, { color: C.white, count: 4, speed: 120 });
    game.audio.tone(330, 0.04, { wave: 'triangle', volume: 0.05 });
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !finger) return;
    setFinger(x, y);
    if (game.time.elapsed - lastStep > 0.12) { lastStep = game.time.elapsed; game.audio.tone(1800, 0.012, { wave: 'triangle', volume: 0.012 }); }
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (finger && !over) game.audio.tone(250, 0.03, { wave: 'triangle', volume: 0.03 });
    finger = null;
  });
  game.onTap(function (x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function drawSky(t) {
    game.draw.gradient(236, HZ, [[0, C.sky], [0.75, C.skyL], [1, C.haze]]);
    game.draw.circle(860, 330, 70, C.sun, 0.35);
    game.draw.circle(860, 330, 48, C.sun);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 18) % 1400) - 160, cy = 300 + c * 50;
      game.draw.circle(cx, cy, 34, C.white, 0.9); game.draw.circle(cx + 40, cy - 12, 42, C.white, 0.9); game.draw.circle(cx + 86, cy, 30, C.white, 0.9);
    }
    var gx = ((t * 70) % 1300) - 100;
    game.draw.sprite(GULL[Math.floor(t * 4) % 2], { '#': C.ink }, gx, 420 + Math.sin(t * 2) * 14, 6, { anchor: 'center' });
    // 海(地平線のすぐ手前)。波頭のストリップが寄せては返す
    game.draw.rect(0, 500, W, 30, C.sea);
    game.draw.rect(0, 530, W, 20, '#2a86c8');
    for (var w = 0; w < 9; w++) {
      var wx = ((w * 140 + Math.sin(t * 1.3 + w) * 40) % 1260) - 90;
      game.draw.rect(wx, 528 + Math.sin(t * 2 + w) * 3, 70, 4, C.foam, 0.8);
    }
    var surf = 548 + Math.sin(t * 1.6) * 5;
    game.draw.rect(0, surf, W, HZ + 6 - surf, C.foam, 0.85);
  }

  function drawFloor() {
    // 横ストリップごとに奥行きzを求め、zで行の色を、横はzに比例して圧縮したマス幅で市松を描く
    var y = HZ + 6;
    while (y < H) {
      var step = y < 820 ? 3 : (y < 1200 ? 5 : 8);
      var z = KF / (y + step * 0.5 - HZ);
      var row = Math.floor(z / CELL);
      var even = row % 2 === 0;
      game.draw.rect(0, y, W, step, even ? C.sand : C.sand2);
      var cw = CELL * FOC / z;
      if (cw >= 14) {
        var first = Math.floor(((0 - 540) * z / FOC) / CELL);
        for (var cx = first; ; cx++) {
          var sx = 540 + cx * cw;
          if (sx > W) break;
          if ((((cx + row) % 2) + 2) % 2 === 1) game.draw.rect(sx, y, cw + 1, step, even ? C.sand2 : C.sand);
        }
      }
      var haze = z / 2600;
      if (haze > 0.25) game.draw.rect(0, y, W, step, C.haze, Math.min(0.75, (haze - 0.25) * 0.9));
      y += step;
    }
  }

  function groundOval(X, Z, rw, col, a) {
    var p = proj(X, Z, 0), ry = Math.max(3, rw * p.s * (300 / Z));
    for (var i = -2; i <= 2; i++) {
      var f = 1 - Math.abs(i) * 0.25;
      game.draw.rect(p.x - rw * p.s * f, p.y + i * ry * 0.4 - ry * 0.2, rw * p.s * 2 * f, ry * 0.4, col, a);
    }
  }
  function groundRing(X, Z, r, col, n, dotR, a) {
    var p = proj(X, Z, 0), rx = r * p.s, ry = rx * (300 / Z) * 0.9;
    for (var i = 0; i < n; i++) {
      var an = i / n * Math.PI * 2;
      game.draw.circle(p.x + Math.cos(an) * rx, p.y + Math.sin(an) * ry, dotR * p.s, col, a);
    }
  }

  function drawProps(t) {
    var pp = proj(-260, 760, 0);
    game.draw.sprite(PARASOL, PPAL, pp.x, pp.y - 5 * 10 * pp.s * 0.6, 10 * pp.s * 0.6, { anchor: 'center' });
    var cp = proj(250, 680, 0);
    game.draw.rect(cp.x - 30 * cp.s, cp.y - 30 * cp.s, 60 * cp.s, 30 * cp.s, '#d8b06a');
    game.draw.rect(cp.x - 16 * cp.s, cp.y - 52 * cp.s, 32 * cp.s, 22 * cp.s, '#d8b06a');
    game.draw.rect(cp.x - 3 * cp.s, cp.y - 74 * cp.s, 3 * cp.s, 22 * cp.s, C.ink);
    game.draw.rect(cp.x, cp.y - 74 * cp.s, 14 * cp.s, 8 * cp.s, C.racket);
  }

  function drawTargets(t) {
    if (!running || cur > LAST) return;
    var tg = TG[cur];
    var prevT = cur > 0 ? TG[cur - 1].T : 0;
    var D = Math.max(SPB, tg.T - prevT);
    var lob = tg.T - prevT > SPB * 1.5;
    var left = clamp((tg.T - songT) / D, 0, 1);
    var col = lob ? C.lob : C.coral;
    groundOval(tg.X, tg.Z, R_HIT, col, 0.25);
    groundRing(tg.X, tg.Z, R_HIT, col, 18, 4, 0.95);
    groundRing(tg.X, tg.Z, R_HIT * (1 + 1.8 * left), C.white, 22, 3, 0.85);
    groundOval(tg.X, tg.Z, R_PERF * 0.5, col, 0.8);
  }

  function drawKid(t) {
    var p = proj(kid.X, kid.Z, 0);
    var px = 4.1 * p.s;
    groundOval(kid.X, kid.Z, 22, C.shadow, 0.5);
    var spr = KID;
    if (hitStop > 0) spr = KID_OOPS;
    else if (swingT > 0) spr = KID_SWING;
    else if (moving && Math.floor(t * 10) % 2 === 0) spr = KID_RUN;
    var hop = swingT > 0 ? Math.sin(swingT / 0.22 * Math.PI) * 6 * p.s : Math.abs(Math.sin(t * 5)) * 2;
    game.draw.sprite(spr, KPAL, p.x - 2.5 * px, p.y - 9 * px - hop, px, { anchor: 'center' });
  }

  function drawBall(t) {
    var b;
    if (hitStop > 0 && missBall) b = { X: missBall.X, Z: missBall.Z, h: 6 };
    else if (smashT > 0 && cur > LAST && res[LAST] !== 'miss') { var L = TG[LAST]; b = { X: L.X, Z: L.Z, h: H_RACKET + (1.5 - smashT) * 1100 }; }
    else b = ballAt(songT);
    var p = proj(b.X, b.Z, b.h);
    var sh = Math.max(0.15, 0.55 - b.h / 900);
    groundOval(b.X, b.Z, 14 * Math.max(0.5, 1 - b.h / 800), C.shadow, sh);
    var r = 13 * p.s;
    if (hitStop > 0 && missBall) {
      var g = 1 + (1 - hitStop / HIT_STOP) * 0.6;
      game.draw.circle(p.x, p.y, r * 2.6 * g, C.white, 0.7 * hitStop / HIT_STOP);
      r *= 1.4;
    }
    game.draw.circle(p.x, p.y, r + 3, C.ink);
    game.draw.circle(p.x, p.y, r, C.ball);
    game.draw.circle(p.x - r * 0.35, p.y - r * 0.35, r * 0.35, C.white);
    game.draw.line(p.x - r, p.y, p.x + r, p.y, C.coral, Math.max(2, r * 0.18));
  }

  function drawPuffs(dt) {
    for (var i = puffs.length - 1; i >= 0; i--) {
      var f = puffs[i];
      f.t -= dt;
      if (f.t <= 0) { puffs.splice(i, 1); continue; }
      var p = proj(f.X, f.Z, 0);
      for (var k = 0; k < 4; k++) game.draw.circle(p.x + (k - 1.5) * 16 * p.s * (1.2 - f.t), p.y - (0.6 - f.t) * 40 * p.s, 7 * p.s, C.white, f.t);
    }
  }

  function drawScene(t, dt) {
    drawSky(t);
    drawFloor();
    drawProps(t);
    drawTargets(t);
    drawPuffs(dt);
    var bz = ballAt(songT).Z;
    if (bz > kid.Z) { drawBall(t); drawKid(t); } else { drawKid(t); drawBall(t); }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.hud);
    game.draw.rect(0, 230, W, 6, C.ball);
    label('SCORE ' + score, 56, 86, 50, C.ball, 'left');
    label('BEST ' + prevBest, 56, 146, 30, C.skyL, 'left');
    label(hits + ' / ' + TOTAL, W - 56, 86, 54, C.white, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var mx = W - 200 + m * 62;
      game.draw.circle(mx, 140, 20, C.ink);
      game.draw.circle(mx, 140, 16, m < misses ? C.red : '#2a5a86');
    }
    // 跳ねる8分のランプ(長い拍 + 短い裏)
    var pos = running ? beatN % 4 : -1;
    for (var j = 0; j < 4; j++) {
      var lx = 330 + j * 120;
      var onB = j === pos && lampT > 0, onA = j === pos && andT > 0 && beatT >= SPB * SWING;
      game.draw.circle(lx, 200, j === 0 ? 17 : 13, onB ? C.ball : '#2a5a86');
      game.draw.circle(lx + 54, 200, 7, onA ? C.coral : '#2a5a86');
    }
    var progress = Math.min(1, songT / (SONG_BEATS * SPB));
    game.draw.rect(0, 230, W * progress, 6, C.coral);
  }

  // ---- ATTRACT: 実ロジックで 落下点へ先回りして打ち上げ → 1球わざと出遅れて落とす → また追いつく ----
  var DEMO_BEATS = 12;
  var DEMO_FAIL = 5;
  var demo = { t: 0, fx: 540, fy: 1500 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB);
    if (cyc < dt || demo.t <= dt) {
      initGame(true);
      var p0 = proj(kid.X, kid.Z, 0); demo.fx = p0.x; demo.fy = p0.y + 170;
    }
    stepPlay(dt);
    if (cur <= LAST) {
      var tg = TG[cur], p = proj(tg.X, tg.Z, 0);
      var late = cur === DEMO_FAIL && songT < tg.T + 0.2;
      if (!late) {
        var k = 1 - Math.exp(-9 * dt);
        demo.fx += (p.x - demo.fx) * k; demo.fy += (p.y + 170 - demo.fy) * k;
      }
    }
    setFinger(demo.fx, demo.fy);
    stepKid(dt);
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (andT > 0) andT -= dt * 5;
    if (swingT > 0) swingT -= dt;
    if (smashT > 0) smashT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t, dt);
      game.draw.hand(demo.fx, demo.fy, { press: true, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.hud);
      game.draw.rect(0, 230, W, 6, C.ball);
      label(GAME_TITLE, W / 2, 112, 88 + Math.sin(t * 3) * 3, C.ball);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, C.skyL);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 46, C.racket);
      else label('TAP TO START', W / 2, H * 0.955, 42, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t, dt);
      drawHud();
      game.draw.rect(90, H * 0.19, W - 180, H * 0.31, C.hud, 0.9);
      game.draw.rect(90, H * 0.19, W - 180, 8, C.ball);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 100, won ? C.ball : C.red);
      label('SCORE ' + score, W / 2, H * 0.31, 60, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.355, 34, C.skyL);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.405, 54, C.ball);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.405, 42, C.skyL);
      if (!won) label('あと' + Math.max(1, TOTAL - hits) + '球!', W / 2, H * 0.46, 52, C.coral);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, hits: hits, total: TOTAL, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      stepKid(dt);
      if (readyT <= 0) startClock();
    } else {
      stepKid(dt);
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
    }

    drawScene(t, dt);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.ball);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.ball);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
