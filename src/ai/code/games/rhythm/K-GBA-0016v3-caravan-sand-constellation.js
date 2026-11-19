// K-GBA-0016v3-caravan-sand-constellation.js
// 砂の星座なぞり — 砂に浮かぶ星座の線を、1拍に1区間ずつ拍と同じ速さで杖先でなぞる。途中で三拍子と四拍子が入れ替わる
// 操作: 最初の1小節で左端の星に指を置いて待つ。あとは指を離さず、次の星の光の輪が縮みきる拍の頭ちょうどにその星を通るよう線をなぞる。拍の頭からのずれでPERFECT/GOOD。早すぎ・遅れ・線からはみ出しはその星でMISS(MISSの次の星は線の外から直接向かってよい)。三拍子→四拍子→三拍子と切り替わる(前の拍でランタンが赤く点滅し、太鼓の刻みと星の色と並ぶランタンの数が変わる)
// 終わり: 20個の星を通し終えて MISS 2回以内ならCLEAR(判定の点+小節まるごと成功ボーナス)。MISS 3回でGAME OVER
// @mechanic: trace
// @theme: caravan_sand_constellation
// 世界観: 砂漠の隊商の天幕で、隊長の枠太鼓の拍に合わせ、見習いの星読みが砂の上に浮かぶ星座の線を杖先でなぞり写す。太鼓が三拍子から四拍子へ、また三拍子へと移る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・通した星の数
// スタイル: 80s ISO

(function(game) {
  // 80s ISO: 菱形グリッドの砂床、等角(奥でも小さくしない)、高さは星の真下の影との距離で示す。6〜8色
  var STYLE = { bg: ['#2a1430', '#5a2238', '#7a3a3a'], main: ['#e8c27a', '#3a8fb7', '#f2e6c9'], accent: ['#ffd23f', '#ff5e5b'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = {
    tent: STYLE.bg[0], tent2: STYLE.bg[1], tent3: STYLE.bg[2],
    sand: STYLE.main[0], teal: STYLE.main[1], pale: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    sand2: '#d4a95e', sandLine: '#b8894a', ink: '#1a0c18', shadow: '#8a5a32',
  };

  var GAME_TITLE = 'SAND STARS';
  var BPM = 116;
  var SPB = 60 / BPM;
  // 小節: 助走(3) | 三拍子×2 | 四拍子×2 | 三拍子×2
  var BAR_STARTS = [0, 3, 6, 9, 13, 17, 20, 23];
  var METER = [3, 3, 3, 4, 4, 3, 3];
  var TOTAL_BEATS = 23;
  var LAST = 20;                     // 星k(1..20)は 2+k 拍目の頭に通る。星0は始点
  var TIME_LIMIT = 13;
  var PERFECT_W = 0.08;
  var GOOD_W = 0.18;
  var TOL = 85;                      // 線からのはみ出し許容(px)
  var R_HIT = 80;
  var MISS_MAX = 3;
  var HIT_STOP = 0.35;
  var LIFT = 40;                     // 星が砂から浮いている高さ(影との距離)

  // 菱形格子の点(u, v)。x = 540 + 75u, y = 450 + 37.5v(2:1の等角)
  var LATT = [[-6, 8], [-4, 4], [-2, 8], [0, 4], [2, 8], [4, 4], [6, 8], [4, 12], [2, 10], [0, 14], [-2, 12],
    [-4, 10], [-6, 10], [-4, 8], [-2, 6], [1, 9], [3, 5], [5, 9], [3, 11], [1, 7], [-1, 11]];
  var P = [];
  for (var li = 0; li < LATT.length; li++) P.push({ gx: 540 + 75 * LATT[li][0], gy: 450 + 37.5 * LATT[li][1], x: 540 + 75 * LATT[li][0], y: 450 + 37.5 * LATT[li][1] - LIFT });

  // 伴奏(オリジナル)。三拍子は 三角波+ズン・チャ・チャ、四拍子は 矩形波+4つ打ち
  var MEL = [
    [['D5', 2], ['A4', 1]],
    [['D5', 1], ['Eb5', 1], ['F#5', 1]],
    [['G5', 1.5], ['F#5', 0.5], ['Eb5', 1]],
    [['D5', 0.5], ['F#5', 0.5], ['A5', 1], ['G5', 0.5], ['F#5', 0.5], ['Eb5', 1]],
    [['D5', 1], ['C5', 0.5], ['Bb4', 0.5], ['A4', 1], ['D5', 1]],
    [['A4', 1], ['Bb4', 1], ['C5', 1]],
    [['D5', 3]],
  ];
  var BASS3 = [['D3', 1], ['A3', 1], ['A3', 1]];
  var BASS4 = [['D3', 1], ['D3', 1], ['A2', 1], ['D3', 1]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextMel, readyT, hitStop;
  var cur, res, segOK, relaxed, pen, fx, fy, trail, lampHit, warnT, switchFx, drumT, raiseT, flashStar;
  var score, combo, maxCombo, perfects, goods, misses, hits, barBonus, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.5 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }
  function barOf(k) { for (var b = BAR_STARTS.length - 2; b >= 0; b--) if (k >= BAR_STARTS[b]) return b; return 0; }
  function starBeat(k) { return 2 + k; }
  function sectionCol(bar) { return METER[bar] === 4 ? C.teal : C.gold; }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextMel = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0;
    cur = 1; res = []; segOK = false; relaxed = false;
    pen = false; fx = P[0].x; fy = P[0].y; trail = [];
    lampHit = [0, 0, 0, 0]; warnT = 0; switchFx = 0; drumT = 0; raiseT = 0; flashStar = -1;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0; barBonus = 0;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function playBar(b) {
    if (!armed || b >= METER.length) return;
    var four = METER[b] === 4;
    game.audio.melody(MEL[b], { tempo: BPM, wave: four ? 'square' : 'triangle', volume: (four ? 0.035 : 0.05) * (demoMode ? 0.6 : 1), bass: four ? BASS4 : BASS3, bassVolume: demoMode ? 0.035 : 0.06 });
  }

  // ---- 拍クロック(1本だけ。小節ごとに拍子が変わる)----
  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextMel = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= TOTAL_BEATS) return;
    var bar = barOf(k), pos = k - BAR_STARTS[bar], meter = METER[bar];
    lampHit[pos] = 1; drumT = 0.12;
    // 太鼓: 三拍子=ドン・タ・タ / 四拍子=ドン・タ・ドン・タ
    var doum = pos === 0 || (meter === 4 && pos === 2);
    if (doum) tone(pos === 0 ? 98 : 110, 0.16, { wave: 'sine', volume: (pos === 0 ? 0.24 : 0.16) * vol() });
    else tone(1700, 0.03, { wave: 'square', volume: 0.025 * vol() });
    if (pos === 0 && bar >= 1 && METER[bar] !== METER[bar - 1]) {
      // 拍子の切り替わり本番
      switchFx = 1;
      if (armed) game.audio.play('se_powerup', 0.4 * vol());
      game.fx.popup(meter + '/4', W / 2, 520, { color: sectionCol(bar), size: 96 });
      game.fx.flash(sectionCol(bar), 0.12);
    }
    if (pos === meter - 1 && bar + 1 < METER.length && METER[bar + 1] !== meter) {
      // 1拍前の予告: ランタンが赤く点滅し、太鼓の連打
      warnT = SPB;
      tone(220, 0.08, { wave: 'square', volume: 0.07 * vol(), slide: 220 });
      tone(330, 0.2, { wave: 'square', volume: 0.05 * vol(), slide: 330 });
    }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (nextMel < METER.length && songT >= BAR_STARTS[nextMel] * SPB - 0.06) { playBar(nextMel); nextMel++; }
    traceStep();
    if (!demoMode && !over && cur > LAST) finish(misses < MISS_MAX);
  }

  function project(a, b, x, y) {
    var vx = b.x - a.x, vy = b.y - a.y;
    var l2 = vx * vx + vy * vy;
    var u = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / l2));
    var px = a.x + vx * u, py = a.y + vy * u;
    return { u: u, d: Math.sqrt((x - px) * (x - px) + (y - py) * (y - py)) };
  }

  function traceStep() {
    if (cur > LAST || over) return;
    var bt = starBeat(cur) * SPB;
    var A = P[cur - 1], B = P[cur];
    if (songT > bt + GOOD_W) { missStar('late'); return; }
    if (!pen) return;
    var db = Math.sqrt((fx - B.x) * (fx - B.x) + (fy - B.y) * (fy - B.y));
    if (relaxed) {
      if (db < 50) arrive(songT - bt);
      return;
    }
    if (!segOK) return;
    var pr = project(A, B, fx, fy);
    if (pr.u >= 0.95 && db < R_HIT) { arrive(songT - bt); return; }
    if (pr.d > TOL) missStar('stray');
  }

  function arrive(off) {
    var k = cur;
    if (off < -GOOD_W) { missStar('rush'); segOK = true; relaxed = false; return; }
    res[k] = Math.abs(off) <= PERFECT_W ? 'perfect' : 'good';
    hits++; combo++; raiseT = 0.3;
    if (combo > maxCombo) maxCombo = combo;
    var p = P[k];
    if (res[k] === 'perfect') {
      perfects++; score += 100 + Math.min(combo, 8) * 10;
      game.feedback.good(p.x, p.y - 70, { text: 'PERFECT', color: C.gold, size: 48, count: 12, volume: armed ? 0.22 : 0.001 });
    } else {
      goods++; score += 50;
      game.feedback.good(p.x, p.y - 70, { text: 'GOOD', color: C.pale, size: 42, count: 6, volume: armed ? 0.18 : 0.001 });
    }
    // 小節の星を全部通せたらボーナス
    var bar = barOf(starBeat(k));
    if (starBeat(k) === BAR_STARTS[bar + 1] - 1) {
      var all = true;
      for (var j = 1; j <= k; j++) if (barOf(starBeat(j)) === bar && res[j] === 'miss') all = false;
      if (all) { barBonus++; score += 100; game.fx.burst(p.x, p.y, { color: sectionCol(bar), count: 20, speed: 380 }); }
    }
    if (!demoMode && hits === 10 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + LAST, W / 2, 420, { color: C.gold, size: 76 });
    }
    cur++; segOK = true; relaxed = false;
  }

  function missStar(why) {
    var k = cur;
    res[k] = 'miss';
    misses++; combo = 0;
    hitStop = HIT_STOP; flashStar = k;
    var p = P[k];
    game.feedback.bad(why === 'stray' ? fx : p.x, (why === 'stray' ? fy : p.y) - 60, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    cur++;
    relaxed = why !== 'rush'; segOK = why === 'rush';
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false;
    game.audio.stopBgm();
    if (ok) {
      score += hits * 20 + barBonus * 50;
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(200, 880), game.random(500, 1000), { color: i % 2 ? C.gold : C.teal, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 420, { color: C.gold, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    pen = true; fx = x; fy = y; trail = [];
    var from = P[Math.min(LAST, cur) - 1];
    var near = Math.sqrt((x - from.x) * (x - from.x) + (y - from.y) * (y - from.y)) < R_HIT;
    segOK = near || relaxed;
    if (near) { game.audio.tone(880, 0.06, { wave: 'triangle', volume: 0.09 }); game.fx.burst(x, y, { color: C.gold, count: 6, speed: 160 }); }
    else game.audio.play('se_tap', 0.15);
  });
  var lastScratch = 0;
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pen) return;
    fx = x; fy = y;
    trail.push([x, y, game.time.elapsed]);
    if (game.time.elapsed - lastScratch > 0.09) { lastScratch = game.time.elapsed; game.audio.tone(2400, 0.012, { wave: 'triangle', volume: 0.01 }); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (pen && !over && running) game.audio.tone(294, 0.05, { wave: 'triangle', volume: 0.05 });
    pen = false; segOK = false;
  });
  game.onTap(function(x, y) {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function isoPt(i, j) { return { x: 540 + 75 * (i - j), y: 450 + 37.5 * (i + j) }; }

  var STAR = ['..y..', '.yYy.', 'yYWYy', '.yYy.', '..y..'];
  var APPR = ['...iiiiii...', '..iiiiiiii..', '..iIIiiiii..', '..ffffffff..', '..fkffffkf..', '..ffffffff..', '...ffmmff...',
    '..rrrrrrrr..', '.rrrrrrrrrr.', '.frrrrrrrrr.', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '..rrrrrrrr..', '.bbbb..bbbb.'];
  function variant(base, rows) { var o = base.slice(); for (var k in rows) o[+k] = rows[k]; return o; }
  var APPR_O = variant(APPR, { 6: '...ffooff...' });
  var APPR_SHOCK = variant(APPR, { 4: '..fWffffWf..', 6: '...ffooff...' });
  var APAL = { i: C.teal, I: '#7ac8e8', f: '#e8b07a', k: C.ink, W: '#ffffff', m: C.red, o: C.ink, r: C.red, b: '#5a3020' };
  var MASTER = ['....wwwwww....', '...wwwwwwww...', '..wwwwwwwwww..', '...ffffffff...', '...fkffffkf...', '...ffffffff...', '...hhffffhh...',
    '....hhhhhh....', '..cccccccccc..', '.cccccccccccc.', '.cccccccccccc.', '.cccccccccccc.', '..cccccccccc..', '..bbb....bbb..'];
  var MASTER_B = variant(MASTER, { 4: '...fhffffhf...' });
  var MPAL = { w: C.pale, f: '#c8905a', k: C.ink, h: '#3a2a2a', c: C.teal, b: '#5a3020' };
  var CAMEL = ['..........hh....', '.........hhhh...', '...bb....hhk....', '..bbbb...hh.....', '.bbbbbbbbhh.....', 'bbbbbbbbbbb.....',
    'bbbbbbbbbbb.....', '.bbbbbbbbb......', '.ll..ll..ll.....'];
  var CPAL = { h: '#c89050', b: '#c89050', k: C.ink, l: '#8a5a32' };

  function drawTent(t) {
    game.draw.gradient(0, H, [[0, C.tent], [0.45, C.tent2], [1, C.tent]]);
    // 天幕の縞(奥の壁)
    for (var s = 0; s < 12; s++) game.draw.rect(s * 90, 236, 90, 250, s % 2 ? C.tent3 : C.tent2);
    game.draw.rect(0, 236, W, 10, C.gold, 0.7);
    game.draw.rect(40, 236, 26, 560, '#3a1a10');
    game.draw.rect(W - 66, 236, 26, 560, '#3a1a10');
    // 砂の菱形の床(横ストリップで塗る)
    for (var y = 450; y < 1050; y += 6) {
      var hw = 600 * (1 - Math.abs(y + 3 - 750) / 300);
      game.draw.rect(540 - hw, y, hw * 2, 6, (Math.floor(y / 6) % 2) ? C.sand : C.sand2);
    }
    // 菱形グリッド
    for (var k = 0; k <= 8; k++) {
      var a = isoPt(k, 0), b = isoPt(k, 8), c = isoPt(0, k), d = isoPt(8, k);
      game.draw.line(a.x, a.y, b.x, b.y, C.sandLine, 2);
      game.draw.line(c.x, c.y, d.x, d.y, C.sandLine, 2);
    }
    // 吊りランタン(この小節の拍の数だけ並ぶ)
    var bar = running ? barOf(Math.min(beatN, TOTAL_BEATS - 1)) : 1;
    var meter = METER[bar];
    var warn = warnT > 0 && Math.floor(t * 14) % 2 === 0;
    var span = meter === 4 ? 150 : 180;
    for (var i = 0; i < meter; i++) {
      var lx = W / 2 - span * (meter - 1) / 2 + i * span;
      var on = running && (beatN - BAR_STARTS[bar]) === i ? Math.max(0, lampHit[i]) : 0;
      var col = warn ? C.red : sectionCol(bar);
      game.draw.line(lx, 246, lx, 300, '#3a1a10', 3);
      if (on > 0) game.draw.circle(lx, 330, 44 + on * 20, col, 0.25 * on);
      game.draw.rect(lx - (i === 0 ? 24 : 18), 300, i === 0 ? 48 : 36, i === 0 ? 64 : 52, '#3a1a10');
      game.draw.rect(lx - (i === 0 ? 18 : 12), 306, i === 0 ? 36 : 24, i === 0 ? 52 : 40, col, 0.35 + on * 0.65);
    }
  }

  function segCol(k) {
    if (res[k] === 'miss') return C.red;
    if (res[k]) return C.gold;
    return null;
  }

  function drawStars(t) {
    var bar = barOf(Math.min(starBeat(Math.min(cur, LAST)), TOTAL_BEATS - 1));
    var inBar = running ? beatN - BAR_STARTS[barOf(Math.min(beatN, TOTAL_BEATS - 1))] : 0;
    var barLen = METER[barOf(Math.min(beatN, TOTAL_BEATS - 1))];
    var fadeNext = running ? Math.max(0, Math.min(1, (inBar + beatT / SPB) - (barLen - 1))) : 0;
    // 影(高さの手がかり)と線
    for (var k = 0; k <= LAST; k++) {
      var kb = barOf(starBeat(k));
      var vis = kb <= bar ? 1 : (kb === bar + 1 ? fadeNext : 0);
      if (k === 0) vis = 1;
      if (vis <= 0) continue;
      if (kb < bar - 1 && k > 0) vis = 0.25;
      var p = P[k];
      game.draw.rect(p.gx - 22, p.gy - 5, 44, 10, C.shadow, 0.6 * vis);
      if (k > 0) {
        var a = P[k - 1];
        var sc = segCol(k);
        if (sc) game.draw.line(a.x, a.y, p.x, p.y, sc, sc === C.red ? 5 : 10);
        else if (k === cur) game.draw.line(a.x, a.y, p.x, p.y, C.pale, 12);
        else game.draw.line(a.x, a.y, p.x, p.y, sectionCol(kb), 4);
      }
    }
    // 星(浮かんでいる)
    for (var j = 0; j <= LAST; j++) {
      var jb = barOf(starBeat(j));
      var v2 = jb <= bar ? 1 : (jb === bar + 1 ? fadeNext : 0);
      if (j === 0) v2 = 1;
      if (v2 <= 0) continue;
      var q = P[j];
      var down = j > 0 && starBeat(j) === BAR_STARTS[jb];
      var col = res[j] === 'miss' ? C.red : (res[j] ? C.gold : sectionCol(jb));
      var fl = flashStar === j && hitStop > 0;
      if (fl) game.draw.circle(q.x, q.y, 50 + (1 - hitStop / HIT_STOP) * 60, '#ffffff', 0.7);
      game.draw.circle(q.x, q.y, (down ? 30 : 22) * (fl ? 1.5 : 1), col, 0.35 * v2);
      game.draw.sprite(STAR, { y: col, Y: C.pale, W: '#ffffff' }, q.x, q.y + Math.sin(t * 3 + j) * 3, (down ? 13 : 10) * (fl ? 1.5 : 1), { anchor: 'center', alpha: v2 });
    }
    // 次の星の光の輪(拍の頭で縮みきる)
    if (running && cur <= LAST) {
      var B = P[cur];
      var left = starBeat(cur) * SPB - songT;
      var rr = 30 + 150 * Math.max(0, Math.min(1, left / SPB));
      var ac = sectionCol(barOf(starBeat(cur)));
      game.draw.circle(B.x, B.y, rr, ac, 0.18);
      for (var s = 0; s < 16; s++) {
        var an = s / 16 * Math.PI * 2;
        game.draw.circle(B.x + Math.cos(an) * rr, B.y + Math.sin(an) * rr * 0.5, 5, ac, 0.9);
      }
      if (relaxed) game.draw.circle(B.x, B.y, 50, C.red, 0.25 + 0.15 * Math.sin(t * 10));
    }
    // 始点の脈(助走中)
    if ((!running || beatN < 3) && cur === 1) {
      var pulse = 0.5 + 0.5 * Math.sin(t * 8);
      game.draw.circle(P[0].x, P[0].y, 46 + pulse * 18, C.gold, 0.3);
    }
  }

  function drawPen(t) {
    var now = game.time.elapsed;
    while (trail.length && now - trail[0][2] > 0.3) trail.shift();
    for (var i = 1; i < trail.length; i++) game.draw.line(trail[i - 1][0], trail[i - 1][1], trail[i][0], trail[i][1], C.pale, 6);
    if (pen) {
      game.draw.circle(fx, fy, 22, C.gold, 0.5);
      game.draw.circle(fx, fy, 10, '#ffffff');
    }
  }

  function drawCrew(t) {
    // 手前の敷物(菱形)
    for (var y = 1150; y < 1430; y += 6) {
      var hw = 520 * (1 - Math.abs(y + 3 - 1290) / 140);
      game.draw.rect(540 - hw, y, hw * 2, 6, (Math.floor(y / 12) % 2) ? C.red : '#c84848');
    }
    game.draw.sprite(CAMEL, CPAL, 540, 1180 + Math.sin(t * 1.2) * 2, 10, { anchor: 'center' });
    game.draw.rect(480, 1238, 140, 12, C.shadow, 0.5);
    // 見習いの星読み(杖)
    var ay = 1300 + (hitStop > 0 ? 0 : Math.sin(t * 2.5) * 3);
    var spr = hitStop > 0 ? APPR_SHOCK : (raiseT > 0 ? APPR_O : APPR);
    game.draw.rect(190, ay + 66, 120, 14, C.shadow, 0.6);
    game.draw.sprite(spr, APAL, 250, ay, 10, { anchor: 'center' });
    var tipY = raiseT > 0 ? ay - 150 : ay - 100;
    game.draw.line(305, ay + 20, 330, tipY, '#8a5a32', 8);
    game.draw.circle(330, tipY, raiseT > 0 ? 18 : 12, C.gold, raiseT > 0 ? 1 : 0.7);
    // 隊長(枠太鼓)
    var my = 1300 + Math.sin(t * 2.1 + 1) * 3;
    game.draw.rect(770, my + 66, 140, 14, C.shadow, 0.6);
    game.draw.sprite(drumT > 0 ? MASTER_B : MASTER, MPAL, 840, my, 10, { anchor: 'center' });
    game.draw.circle(740, my + 10, 58, '#5a3020');
    game.draw.circle(740, my + 10, 50, drumT > 0 ? C.pale : C.sand);
    if (drumT > 0) game.draw.circle(740, my + 10, 80, C.gold, 0.25);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    game.draw.rect(0, 226, W, 4, C.gold);
    label('SCORE ' + score, 60, 98, 50, C.pale, 'left');
    label('BEST ' + prevBest, 60, 168, 30, C.sand, 'left');
    label(hits + ' / ' + LAST, W - 60, 98, 52, C.gold, 'right');
    for (var m = 0; m < MISS_MAX; m++) game.draw.rect(W - 250 + m * 66, 146, 40, 32, m < misses ? C.red : '#4a2a3a');
    var bar = running ? barOf(Math.min(beatN, TOTAL_BEATS - 1)) : 1;
    label(METER[bar] + '/4', W * 0.56, 120, 56, warnT > 0 ? C.red : sectionCol(bar));
    var progress = Math.min(1, songT / (TOTAL_BEATS * SPB));
    game.draw.rect(0, 222, W * progress, 6, C.teal);
  }

  function drawScene(t) {
    drawTent(t);
    drawStars(t);
    drawPen(t);
    drawCrew(t);
    if (switchFx > 0) game.draw.rect(0, 236, W, 12, C.pale, switchFx);
  }

  // ---- ATTRACT: 実ロジックで 星を拍どおりに通す → 4つ目の星で線からはみ出してMISS → 戻って続け、四拍子への切り替わりまで ----
  var demo = { t: 0, press: false };
  var DEMO_LEN = 12.4 * SPB;
  function pathAt(s) {
    if (s <= 0) return { x: P[0].x, y: P[0].y, nx: 0, ny: 0 };
    var i = Math.min(LAST - 1, Math.floor(s)), u = Math.min(1, s - i);
    var a = P[i], b = P[i + 1];
    var vx = b.x - a.x, vy = b.y - a.y, l = Math.sqrt(vx * vx + vy * vy);
    return { x: a.x + vx * u, y: a.y + vy * u, nx: -vy / l, ny: vx / l };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); }
    var s = (songT + dt) / SPB - 2;
    var p = pathAt(s);
    var off = 0;
    if (s > 3.3 && s < 3.6) off = (s - 3.3) / 0.3;
    else if (s >= 3.6 && s < 4.0) off = 1;
    else if (s >= 4.0 && s < 4.7) off = 1 - (s - 4.0) / 0.7;
    fx = p.x + p.nx * off * 170; fy = p.y + p.ny * off * 170;
    if (!pen && songT > SPB * 0.6) { pen = true; segOK = true; }
    if (pen) { trail.push([fx, fy, game.time.elapsed]); }
    demo.press = pen;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (warnT > 0) warnT -= dt;
    if (switchFx > 0) switchFx -= dt * 2;
    if (drumT > 0) drumT -= dt;
    if (raiseT > 0) raiseT -= dt;
    for (var i = 0; i < 4; i++) if (lampHit[i] > 0) lampHit[i] -= dt * 3;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(fx, fy + 6, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 112, 86 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 188, 34, C.sand);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.89, 46, C.gold);
      else label('TAP TO START', W / 2, H * 0.89, 42, C.pale);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      game.draw.rect(60, H * 0.27, W - 120, H * 0.31, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, H * 0.385, 58, C.pale);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.43, 34, C.sand);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 52, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.48, 40, C.sand);
      if (!won) label('あと' + Math.max(1, LAST - hits) + '個!', W / 2, H * 0.53, 50, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.89, 40, C.pale);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, stars: hits, perfect: perfects, good: goods, miss: misses, fullBars: barBonus, maxCombo: maxCombo };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 110, C.gold);
    if (over && won) label('FINISH', W / 2, H * 0.58, 100, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
