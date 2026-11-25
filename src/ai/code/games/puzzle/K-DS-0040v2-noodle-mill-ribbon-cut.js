// K-DS-0040v2-noodle-mill-ribbon-cut.js
// 製麺所の宙打ち一筆切り — 拍ごとに宙に浮かぶ生地の帯の切り点を、表拍の順に指を離さず一筆の線で結んで麺に切り分ける
// 操作: 職人が作業台から生地の帯を宙へ放ると、帯に番号つきの切り点が並ぶ。次の点のまわりの輪が縮んで閉じる拍の頭(表拍)ちょうどに、その点へ指を入れる(押して入る・なぞって入る、どちらでも可)。1番から指を離さず次の点へなぞって入ると、その間の生地が1本の麺に切れる。点に入るのが拍の頭ちょうどでPERFECT、少しずれるとGOOD。先走り(拍より早く点に入る)・遅れ・入らずに拍を過ぎるとMISSで生地が破れる。途中で指を離すとその間は切れない(MISSにはならない)。点の外を押しても罰なし
// 終わり: 116BPM・前奏1小節+8小節(36拍・約19秒)。3点の帯×4本→7点の帯×2本(得点2倍)を切り終えればCLEAR。MISS4回でGAME OVER
// @mechanic: connect
// @theme: noodle_mill_ribbon_stroke_cut
// 世界観: 下町の製麺所の作業台で、ねじり鉢巻きの麺打ち職人が宙に放り上げた生地の帯を、拍に合わせた一筆の切り線で順に麺へ切り分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・切った麺の本数・PERFECT/GOOD/MISS数・最大連続
// スタイル: MODERN AD-GAME
var STYLE = { bg: ['#ffe9b8', '#ff9f5a'], main: ['#fff6e0', '#f2c46d', '#2b1a12'], accent: ['#ff3d6e', '#1fd1c1'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字、3秒で伝わる画面
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], dough: STYLE.main[0], crust: STYLE.main[1], ink: STYLE.main[2],
    pink: STYLE.accent[0], teal: STYLE.accent[1], white: '#ffffff', gold: '#ffd23a', wood: '#d98a4a',
    woodDk: '#9a5428', noodle: '#ffe27a', grey: '#b8a890', sky: '#7fd8ff'
  };

  var GAME_TITLE = 'NOODLE LINE';
  var BPM = 116;
  var SPB = 60 / BPM;
  // [最初の点の拍, 点の数]。前奏1小節(0〜3拍)のあと、各帯は「点の数 + 休み1拍」
  var PLAN = [[4, 3], [8, 3], [12, 3], [16, 3], [20, 7], [28, 7]];
  var TOTAL_BEATS = 36;
  var DEMO_PLAN = [[2, 3], [6, 4]];
  var DEMO_BEATS = 11;
  var DEMO_LAYOUT = [
    [[300, 620], [560, 830], [800, 600]],
    [[250, 1170], [460, 960], [700, 1130], [880, 900]]
  ];
  var TIME_LIMIT = 19;            // 36拍 × 0.517秒 ≒ 18.6秒
  var READY_T = 0.8;
  var PERFECT_W = 0.07, GOOD_W = 0.15, ARM_W = SPB * 0.45;
  var R = 86;                     // 点に「入った」とみなす半径
  var LIVES = 4;

  // 伴奏(オリジナル)。表拍に1音ずつ、明るい五音の刻み
  var LEAD = ['E5', 'G5', 'A5', 'G5', 'C6', 'A5', 'G5', 'E5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5'];
  var BASS = ['C3', 'C3', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2'];

  // ---- スプライト(麺打ち職人: ねじり鉢巻き・藍の前掛け) ----
  var MAKER_PAL = { k: '#2b1a12', h: '#3a2418', w: '#ffffff', r: '#ff3d6e', s: '#ffc89a', e: '#2b1a12', m: '#d0453a', t: '#ffffff', a: '#3a3f8f', b: '#ffc89a' };
  var MAKER_IDLE = [
    '...kkkkkk...',
    '..khhhhhhk..',
    '.kwrwwrwwrk.',
    '.kssssssssk.',
    '.ksessssesk.',
    '.kssssssssk.',
    '.ksssmmsssk.',
    '..kssssssk..',
    '.kttttttttk.',
    'kbktaaaatkbk',
    'kbktaaaatkbk',
    '.s.kaaaak.s.',
    '...kaaaak...',
    '...kakkak...',
    '...kk..kk...',
    '..kkk..kkk..'
  ];
  var MAKER_TOSS = [
    's..kkkkkk..s',
    'b.khhhhhhk.b',
    'bkwrwwrwwrkb',
    'bksssssssskb',
    'bksessssesbk',
    '.kssssssssk.',
    '.kssmmmmssk.',
    '..kssssssk..',
    '.kttttttttk.',
    '..ktaaaatk..',
    '..ktaaaatk..',
    '...kaaaak...',
    '...kaaaak...',
    '...kakkak...',
    '...kk..kk...',
    '..kkk..kkk..'
  ];
  var MAKER_OOPS = [
    '...kkkkkk...',
    '..khhhhhhk..',
    '.kwrwwrwwrk.',
    'bkssssssssk.',
    'bksekssekskb',
    '.bssssssssb.',
    '.ksssmmsssk.',
    '..kssssssk..',
    '.kttttttttk.',
    '..ktaaaatk..',
    '..ktaaaatk..',
    '...kaaaak...',
    '...kaaaak...',
    '...kakkak...',
    '...kk..kk...',
    '..kkk..kkk..'
  ];
  var SCRAPER = ['kkkkkkk', 'kwwwwwk', 'kwwwwwk', '.kaaak.', '.kaaak.', '..kkk..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var strips, pts, nextIdx, clock, endT, score, combo, maxCombo, nPerfect, nGood, nMiss, cutCount, totalSeg;
  var hitStop, hitObj, over, won, outroT, lastCue, lastBeat, demoMode, prevBest, resultT, realT;
  var beatPulse, pressing, strokeId, trail, puffs, cheerT, oopsT, milestoneDone, popT;

  function layoutPoints(n) {
    for (var tries = 0; tries < 40; tries++) {
      var out = [];
      var x = game.random(240, 840), y = game.random(500, 1180);
      out.push([x, y]);
      var ang = game.random(0, Math.PI * 2);
      var ok = true;
      for (var i = 1; i < n && ok; i++) {
        var placed = false;
        for (var k = 0; k < 24 && !placed; k++) {
          var a = ang + game.random(-1.5, 1.5);
          var d = n > 4 ? game.random(200, 260) : game.random(240, 310);
          var nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
          if (nx < 150 || nx > 930 || ny < 440 || ny > 1270) continue;
          var clash = false;
          for (var j = 0; j < out.length - 1; j++) {
            if (Math.hypot(nx - out[j][0], ny - out[j][1]) < R * 2.4) clash = true;
          }
          if (clash) continue;
          out.push([nx, ny]); x = nx; y = ny; ang = a; placed = true;
        }
        if (!placed) ok = false;
      }
      if (ok) return out;
    }
    var fb = [];
    for (var q = 0; q < n; q++) fb.push([q % 2 ? 820 : 260, 480 + q * (n > 4 ? 125 : 300)]);
    return fb;
  }

  function initRun(demo) {
    demoMode = !!demo;
    var plan = demo ? DEMO_PLAN : PLAN;
    strips = []; pts = []; totalSeg = 0;
    for (var s = 0; s < plan.length; s++) {
      var start = plan[s][0], n = plan[s][1];
      var base = demo ? DEMO_LAYOUT[s] : layoutPoints(n);
      var st = {
        idx: s, start: start, n: n, pts: [], cut: [], tossed: false, fallAt: -1, clean: false,
        tossT: (start - 2) * SPB, arriveT: (start - 1) * SPB, lastT: (start + n - 1) * SPB,
        seed: s * 1.7 + 0.4, double: n > 4
      };
      for (var k = 0; k < n; k++) {
        var p = { st: st, k: k, bx: base[k][0], by: base[k][1], t: (start + k) * SPB, res: 0, inside: false, stroke: -1 };
        st.pts.push(p); pts.push(p);
        if (k > 0) { st.cut.push(false); totalSeg++; }
      }
      strips.push(st);
    }
    endT = (demo ? DEMO_BEATS : TOTAL_BEATS) * SPB;
    clock = demo ? -0.3 : -READY_T;
    nextIdx = 0; score = 0; combo = 0; maxCombo = 0; nPerfect = 0; nGood = 0; nMiss = 0; cutCount = 0;
    hitStop = 0; hitObj = null; over = false; won = false; outroT = 0; lastCue = -1; lastBeat = -1;
    prevBest = game.best; resultT = 0; realT = 0;
    beatPulse = 0; pressing = false; strokeId = 0; trail = []; puffs = []; cheerT = 0; oopsT = 0;
    milestoneDone = false; popT = 0;
  }

  // ---- 帯の位置(放り上げ → ふわふわ漂う → 切り終えたら落ちる) ----
  function stripOffset(st) {
    var x = Math.sin(clock * 1.1 + st.seed * 2.3) * 20;
    var y = Math.sin(clock * 1.7 + st.seed) * 26;
    if (clock < st.arriveT) {
      var k = Math.max(0, Math.min(1, (clock - st.tossT) / (st.arriveT - st.tossT)));
      var u = 1 - k;
      y += u * u * 1150;
    }
    if (st.fallAt >= 0) {
      var ft = clock - st.fallAt;
      y += ft * ft * 2600;
    }
    return { x: x, y: y };
  }
  function ptPos(p) {
    var o = stripOffset(p.st);
    return { x: p.bx + o.x, y: p.by + o.y };
  }
  function stripVisible(st) {
    if (clock < st.tossT) return false;
    if (st.fallAt >= 0 && clock - st.fallAt > 0.7) return false;
    return true;
  }

  // ---- 拍クロック(1本) ----
  function cueBeats() {
    var total = demoMode ? DEMO_BEATS : TOTAL_BEATS;
    for (var n = lastCue + 1; n < total; n++) {
      if (clock + 0.06 < n * SPB) break;
      lastCue = n;
      if (!demoMode) playBeat(n);
    }
  }
  function playBeat(n) {
    var lead = n < 4 ? 'R' : LEAD[n % 16];
    var dbl = n >= 20;
    game.audio.melody([[lead, 0.5], [dbl ? LEAD[(n + 3) % 16] : 'R', 0.5]], {
      tempo: BPM, wave: 'square', volume: 0.032,
      bass: [[BASS[n % 8], 0.8], ['R', 0.2]], bassWave: 'triangle', bassVolume: 0.12
    });
    // 麺棒で台を叩く拍の音(小節頭は高く)
    game.audio.tone(n % 4 === 0 ? 'C6' : 'G5', 0.03, { wave: 'square', volume: n % 4 === 0 ? 0.04 : 0.025 });
  }
  function onBeat(n) {
    beatPulse = 1;
  }

  function stepRun(dt) {
    clock += dt;
    cueBeats();
    var bi = Math.floor(clock / SPB);
    while (lastBeat < bi) { lastBeat++; onBeat(lastBeat); }
    for (var s = 0; s < strips.length; s++) {
      var st = strips[s];
      if (!st.tossed && clock >= st.tossT) {
        st.tossed = true; popT = 0.3;
        if (!demoMode) game.audio.play('se_jump', 0.25);
        if (!demoMode && st.double && !milestoneDone) {
          milestoneDone = true;
          game.fx.popup('BONUS x2', W / 2, 400, { color: C.pink, size: 76 });
          game.audio.play('se_milestone', 0.45);
        }
      }
      var last = st.pts[st.n - 1];
      if (st.fallAt < 0 && last.res && clock > st.lastT + SPB * 0.45) st.fallAt = clock;
    }
    if (over) return;
    // 拍を過ぎても入らなかった点は破れる
    var p = pts[nextIdx];
    if (p && clock > p.t + GOOD_W) { tear(p, 'late'); return; }
    if (!demoMode && clock >= endT + 0.1) finishRun(true);
  }

  // ---- 判定(本番の指もATTRACTのゴーストも同じ関数) ----
  function probe(x, y, isPress) {
    var p = pts[nextIdx];
    if (!p || over) return null;
    var pos = ptPos(p);
    var inside = Math.hypot(x - pos.x, y - pos.y) <= R;
    if (!inside) { p.inside = false; return null; }
    if (p.inside && !isPress) return null;     // 入りっぱなし(新しい「入り」ではない)
    p.inside = true;
    var d = clock - p.t;
    if (d < -ARM_W) return null;                // まだ点が生きていない(待ち伏せは拍で破れる)
    if (d < -GOOD_W) { tear(p, 'early'); return 'early'; }
    if (d > GOOD_W) { tear(p, 'late'); return 'late'; }
    return hitPoint(p, Math.abs(d) <= PERFECT_W ? 1 : 2);
  }

  function hitPoint(p, grade) {
    var pos = ptPos(p);
    var st = p.st;
    p.res = grade; p.stroke = strokeId;
    nextIdx++;
    combo++; maxCombo = Math.max(maxCombo, combo);
    if (grade === 1) nPerfect++; else nGood++;
    var mul = st.double ? 2 : 1;
    var gain = ((grade === 1 ? 120 : 70) + Math.min(10, combo) * 10) * mul;
    score += gain;
    game.feedback.good(pos.x, pos.y, {
      text: grade === 1 ? 'PERFECT' : 'GOOD', color: grade === 1 ? C.pink : C.teal, size: grade === 1 ? 58 : 48,
      count: grade === 1 ? 16 : 9, volume: demoMode ? 0.04 : 0.2
    });
    game.fx.popup('+' + gain, pos.x + 90, pos.y - 110, { color: C.gold, size: 44 });
    // 同じ一筆で前の点から入ってきた → その間の生地が麺に切れる
    if (p.k > 0) {
      var prev = st.pts[p.k - 1];
      if ((prev.res === 1 || prev.res === 2) && prev.stroke === strokeId && pressing) {
        st.cut[p.k - 1] = true; cutCount++;
        score += 50 * mul;
        if (!demoMode) game.audio.tone(1900, 0.09, { wave: 'sawtooth', volume: 0.04, slide: -1100 });
        var pp = ptPos(prev);
        game.fx.burst((pp.x + pos.x) / 2, (pp.y + pos.y) / 2, { color: C.noodle, count: 10, speed: 260 });
      }
    }
    if (!demoMode && combo > 0 && combo % 6 === 0) game.fx.popup('COMBO x' + combo, W / 2, 330, { color: C.teal, size: 60 });
    // 帯を1本残らず切った
    if (p.k === st.n - 1) {
      var all = true;
      for (var i = 0; i < st.cut.length; i++) if (!st.cut[i]) all = false;
      if (all) {
        st.clean = true; cheerT = 0.8;
        score += 300 * mul;
        if (!demoMode) {
          game.fx.popup('NICE', W / 2, 520, { color: C.gold, size: 92 });
          game.audio.play('se_powerup', 0.4);
        }
      }
    }
    return grade === 1 ? 'perfect' : 'good';
  }

  function tear(p, why) {
    p.res = 3;
    nextIdx++;
    nMiss++; combo = 0;
    hitStop = 0.4; hitObj = p; oopsT = 0.9;
    var pos = ptPos(p);
    game.feedback.bad(pos.x, pos.y, { text: 'MISS', color: C.pink, flashColor: C.white, shake: demoMode ? 3 : 12, volume: demoMode ? 0.03 : 0.6 });
    for (var k = 0; k < 8; k++) puffs.push({ x: pos.x, y: pos.y, vx: game.random(-260, 260), vy: game.random(-300, 60), t: 0, c: C.dough });
    if (!demoMode && nMiss >= LIVES) { game.audio.play('se_break', 0.35); finishRun(false); }
  }

  function fingerDown(x, y) {
    pressing = true; strokeId++;
    trail = [{ x: x, y: y, t: game.time.elapsed }];
    var r = probe(x, y, true);
    if (!r) {
      // 点の外を押した: 打ち粉が舞うだけ(罰なし)
      for (var k = 0; k < 4; k++) puffs.push({ x: x, y: y, vx: game.random(-120, 120), vy: game.random(-160, -40), t: 0, c: C.white });
    }
    return r;
  }
  function fingerMove(x, y) {
    if (!pressing) return;
    trail.push({ x: x, y: y, t: game.time.elapsed });
    if (trail.length > 40) trail.shift();
    return probe(x, y, false);
  }
  function fingerUp() {
    if (!pressing) return;
    pressing = false;
    if (pts[nextIdx]) pts[nextIdx].inside = false;
  }

  function finishRun(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.7;
    if (pressing) pressing = false;
    if (demoMode) return;
    game.audio.stopBgm();
    if (ok) {
      score += (LIVES - nMiss) * 200 + 400;
      for (var i = 0; i < 8; i++) game.fx.burst(200 + (i % 4) * 230, 600 + Math.floor(i / 4) * 360, { color: i % 2 ? C.gold : C.pink, count: 18, speed: 420 });
      game.fx.flash(C.white, 0.2);
      game.audio.play('se_success', 0.55);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, cut: cutCount, perfect: nPerfect, good: nGood, miss: nMiss, maxCombo: maxCombo };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT && resultT > 0.6) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; demo.cyc = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || y < 230) return;
    var r = fingerDown(x, y);
    if (!r) game.audio.tone(520, 0.04, { wave: 'triangle', volume: 0.06 });   // 点の外: 打ち粉の音だけ
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0) return;
    var r = fingerMove(x, y);
    if (r === 'perfect' || r === 'good') game.audio.tone(1320, 0.03, { wave: 'square', volume: 0.04 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    fingerUp();
    if (!over) game.audio.tone(330, 0.04, { wave: 'sine', volume: 0.05 });
  });

  // ---- 描画ヘルパー(太い縁取り) ----
  function label(str, x, y, sz, col, align) {
    var a = align || 'center';
    var o = Math.max(3, Math.round(sz / 14));
    game.draw.text(str, x - o, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x + o, y, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y - o, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y + o + 2, { size: sz, color: C.ink, bold: true, align: a });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: a });
  }
  function ring(x, y, r, col, w) {
    var n = 32;
    for (var i = 0; i < n; i += 1) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      game.draw.line(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, col, w);
    }
  }
  function blob(x, y, r, fill) {
    game.draw.circle(x, y, r + 7, C.ink);
    game.draw.circle(x, y, r, fill);
  }

  // ---- 描画 ----
  function drawMill() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 1440, [[0, C.bg0], [0.55, '#ffd49a'], [1, C.bg1]]);
    // 窓(朝の光)と干し場の竿にかかった麺
    for (var w = 0; w < 2; w++) {
      var wx = 90 + w * 560;
      game.draw.rect(wx - 8, 262, 356, 236, C.ink);
      game.draw.rect(wx, 270, 340, 220, C.sky);
      game.draw.rect(wx, 270, 340, 60, C.white, 0.35);
      game.draw.rect(wx + 166, 270, 8, 220, C.ink);
    }
    for (var r = 0; r < 2; r++) {
      var ry = 560 + r * 380;
      game.draw.rect(0, ry - 6, W, 12, C.woodDk, 0.55);
      for (var nx = 30; nx < W; nx += 26) {
        var len = 90 + ((nx * 7 + r * 13) % 50);
        game.draw.line(nx, ry, nx + Math.sin(t * 1.5 + nx) * 4, ry + len, '#fff0bf', 6);
      }
    }
    // 湯気
    for (var s = 0; s < 6; s++) {
      var sy = 1380 - ((t * 90 + s * 130) % 700);
      var sx = 920 + Math.sin(t + s) * 30;
      game.draw.circle(sx, sy, 34 + s * 3, C.white, 0.22 * (sy - 680) / 700);
    }
  }

  function drawTable() {
    game.draw.rect(0, 1432, W, 16, C.ink);
    game.draw.gradient(1448, H, [[0, C.wood], [1, C.woodDk]]);
    for (var g = 0; g < 5; g++) game.draw.rect(0, 1500 + g * 90, W, 4, C.woodDk, 0.5);
    // 打ち粉
    for (var f = 0; f < 18; f++) game.draw.circle(120 + ((f * 157) % 860), 1480 + ((f * 61) % 90), 6, C.white, 0.5);
    // 麺ざる(切った麺がたまる)
    var bx = 820, by = 1700;
    game.draw.circle(bx, by, 172, C.ink);
    game.draw.circle(bx, by, 162, '#e6b86a');
    game.draw.circle(bx, by, 128, '#c8954a');
    for (var i = 0; i < 6; i++) game.draw.line(bx - 150, by - 100 + i * 40, bx + 150, by - 100 + i * 40, '#b07a38', 4);
    var pile = Math.min(24, cutCount);
    for (var n = 0; n < pile; n++) {
      var a = n * 2.4, rr = 30 + (n % 5) * 18;
      var cx = bx + Math.cos(a) * rr, cy = by + Math.sin(a) * rr * 0.6;
      game.draw.line(cx - 50, cy, cx + 50, cy + Math.sin(a) * 16, C.ink, 18);
      game.draw.line(cx - 50, cy, cx + 50, cy + Math.sin(a) * 16, C.noodle, 10);
    }
  }

  function drawMaker() {
    var t = game.time.elapsed;
    var spr = MAKER_IDLE;
    if (oopsT > 0) spr = MAKER_OOPS;
    else if (popT > 0 || cheerT > 0) spr = MAKER_TOSS;
    var bob = beatPulse * 10;
    var x = 270, y = 1690 - bob;
    game.draw.circle(x, 1880, 120, C.ink, 0.25);
    game.draw.sprite(spr, MAKER_PAL, x, y, 15, { anchor: 'center' });
    // スケッパー(生地を切る板)
    var sx = x + 140, sy = y + 30 - beatPulse * 20;
    game.draw.sprite(SCRAPER, { k: C.ink, w: '#dfe6ee', a: C.pink }, sx, sy, 10, { anchor: 'center' });
    if (cheerT > 0) {
      for (var s = 0; s < 5; s++) {
        var a = t * 4 + s * 1.25;
        game.draw.circle(x + Math.cos(a) * 150, y - 120 + Math.sin(a) * 40, 12, C.gold);
      }
    }
  }

  function drawStrip(st) {
    if (!stripVisible(st)) return;
    var P = [];
    for (var k = 0; k < st.n; k++) P.push(ptPos(st.pts[k]));
    // 帯の両端(生地の耳)
    var d0x = P[0].x - P[1].x, d0y = P[0].y - P[1].y, l0 = Math.hypot(d0x, d0y) || 1;
    var dnx = P[st.n - 1].x - P[st.n - 2].x, dny = P[st.n - 1].y - P[st.n - 2].y, ln = Math.hypot(dnx, dny) || 1;
    var e0 = { x: P[0].x + d0x / l0 * 70, y: P[0].y + d0y / l0 * 70 };
    var e1 = { x: P[st.n - 1].x + dnx / ln * 70, y: P[st.n - 1].y + dny / ln * 70 };
    game.draw.line(e0.x, e0.y, P[0].x, P[0].y, C.ink, 80);
    game.draw.line(e1.x, e1.y, P[st.n - 1].x, P[st.n - 1].y, C.ink, 80);
    for (var i = 0; i < st.n - 1; i++) {
      if (!st.cut[i]) game.draw.line(P[i].x, P[i].y, P[i + 1].x, P[i + 1].y, C.ink, 84);
    }
    game.draw.line(e0.x, e0.y, P[0].x, P[0].y, C.dough, 64);
    game.draw.line(e1.x, e1.y, P[st.n - 1].x, P[st.n - 1].y, C.dough, 64);
    for (var j = 0; j < st.n - 1; j++) {
      var a = P[j], b = P[j + 1];
      if (st.cut[j]) {
        // 切れた麺(細く、白い切り口が光る)
        game.draw.line(a.x, a.y, b.x, b.y, C.ink, 26);
        game.draw.line(a.x, a.y, b.x, b.y, C.noodle, 14);
        game.draw.line(a.x, a.y - 30, b.x, b.y - 30, C.ink, 20);
        game.draw.line(a.x, a.y - 30, b.x, b.y - 30, C.noodle, 10);
        game.draw.line(a.x, a.y + 30, b.x, b.y + 30, C.ink, 20);
        game.draw.line(a.x, a.y + 30, b.x, b.y + 30, C.noodle, 10);
      } else {
        game.draw.line(a.x, a.y, b.x, b.y, C.dough, 64);
        game.draw.line(a.x, a.y - 18, b.x, b.y - 18, C.white, 8);
      }
    }
    // 切り点
    for (var q = 0; q < st.n; q++) drawPoint(st.pts[q], P[q]);
  }

  function drawPoint(p, pos) {
    var isNext = pts[nextIdx] === p && !over;
    var flash = hitStop > 0 && hitObj === p;
    if (flash) {
      game.draw.circle(pos.x, pos.y, 110, C.white, 0.6);
      blob(pos.x, pos.y, 64, C.white);
      return;
    }
    if (p.res === 1 || p.res === 2) {
      blob(pos.x, pos.y, 34, C.teal);
      game.draw.line(pos.x - 16, pos.y, pos.x - 4, pos.y + 14, C.white, 9);
      game.draw.line(pos.x - 4, pos.y + 14, pos.x + 18, pos.y - 14, C.white, 9);
      return;
    }
    if (p.res === 3) {
      blob(pos.x, pos.y, 34, C.grey);
      game.draw.line(pos.x - 18, pos.y - 18, pos.x + 18, pos.y + 18, C.ink, 9);
      game.draw.line(pos.x + 18, pos.y - 18, pos.x - 18, pos.y + 18, C.ink, 9);
      return;
    }
    var lead = (p.t - clock) / SPB;
    if (isNext) {
      // 狙う点: 白縁 + 明滅 + 縮む輪(輪が点の縁に重なる瞬間が拍の頭)
      var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      game.draw.circle(pos.x, pos.y, R, C.white, 0.18);
      ring(pos.x, pos.y, R, C.white, 4);
      game.draw.circle(pos.x, pos.y, 56 + beatPulse * 6, C.white);
      blob(pos.x, pos.y, 44 + beatPulse * 4, blink ? C.pink : '#ff6f93');
      if (lead < 1.3 && lead > -0.4) {
        var rr = R + Math.max(0, lead) * 170;
        ring(pos.x, pos.y, rr + 5, C.ink, 14);
        ring(pos.x, pos.y, rr, C.gold, 8);
      }
      label(String(p.k + 1), pos.x, pos.y + 2, 46, C.white);
    } else {
      blob(pos.x, pos.y, 38, C.crust);
      label(String(p.k + 1), pos.x, pos.y + 2, 38, C.white);
    }
  }

  function drawTrail() {
    var now = game.time.elapsed;
    var pts2 = [];
    for (var i = 0; i < trail.length; i++) if (now - trail[i].t < 0.25) pts2.push(trail[i]);
    for (var j = 1; j < pts2.length; j++) game.draw.line(pts2[j - 1].x, pts2[j - 1].y, pts2[j].x, pts2[j].y, C.ink, 26);
    for (var k = 1; k < pts2.length; k++) game.draw.line(pts2[k - 1].x, pts2[k - 1].y, pts2[k].x, pts2[k].y, C.white, 14);
    if (pressing && trail.length) {
      var e = trail[trail.length - 1];
      blob(e.x, e.y, 16, C.white);
    }
  }

  function drawPuffs(dt) {
    for (var i = puffs.length - 1; i >= 0; i--) {
      var f = puffs[i];
      f.t += dt;
      if (f.t > 0.6) { puffs.splice(i, 1); continue; }
      f.vy += 900 * dt;
      game.draw.circle(f.x + f.vx * f.t, f.y + f.vy * f.t, 14 * (1 - f.t), f.c, 0.8 - f.t);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white);
    game.draw.rect(0, 222, W, 10, C.ink);
    label('SCORE ' + score, 40, 74, 50, C.pink, 'left');
    if (combo >= 2) label('x' + combo, 40, 160, 46, C.teal, 'left');
    // 残りの生地玉(MISSで減る)
    for (var i = 0; i < LIVES; i++) {
      var on = i < LIVES - nMiss;
      blob(270 + i * 62, 160, 22, on ? C.dough : C.grey);
    }
    // 帯の進み具合
    for (var s = 0; s < strips.length; s++) {
      var st = strips[s];
      var done = st.pts[st.n - 1].res > 0;
      var x0 = 560 + s * 62, w = st.double ? 52 : 40;
      game.draw.rect(x0 - 4, 146, w + 8, 30, C.ink);
      game.draw.rect(x0, 150, w, 22, done ? (st.clean ? C.gold : C.teal) : C.dough);
    }
    // 拍のランプ(4つ、今の拍が光る)
    var cur = lastBeat >= 0 ? lastBeat % 4 : -1;
    for (var b = 0; b < 4; b++) {
      var lit = b === cur;
      blob(760 + b * 76, 70, lit ? 26 + beatPulse * 8 : 22, lit ? (b === 0 ? C.pink : C.gold) : '#f3e3c0');
    }
  }

  function drawScene(dt) {
    drawMill();
    for (var s = 0; s < strips.length; s++) drawStrip(strips[s]);
    drawTrail();
    drawPuffs(dt);
    drawTable();
    drawMaker();
  }

  function drawResult(showTap) {
    var y0 = H * 0.25, hh = H * 0.42;
    game.draw.rect(40 - 10, y0 - 10, W - 60, hh + 20, C.ink);
    game.draw.rect(40, y0, W - 80, hh, C.white);
    game.draw.rect(40, y0, W - 80, 24, won ? C.teal : C.pink);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 104, won ? C.gold : C.pink);
    label('SCORE ' + score, W / 2, H * 0.38, 64, C.pink);
    label('PERFECT ' + nPerfect + '  GOOD ' + nGood + '  MISS ' + nMiss, W / 2, H * 0.43, 36, C.teal);
    label(cutCount + ' / ' + totalSeg, W / 2, H * 0.475, 58, C.gold);
    label('COMBO ' + maxCombo, W / 2, H * 0.515, 40, C.teal);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.56, 64, C.gold);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.56, 46, C.pink);
    if (!won) label('あと' + Math.max(1, totalSeg - cutCount) + '本!', W / 2, H * 0.61, 54, C.pink);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.71, 40, C.white);
  }

  // ---- ATTRACT: 実ロジックで3点の帯→4点の帯。偶数周は最後の点に遅れて入って破る ----
  var demo = { t: 0, cyc: 0, next: 0, x: 540, y: 1300, down: false };
  var DEMO_CYC = DEMO_BEATS * SPB + 0.3 + 1.1;
  function ghostStep(dt) {
    var i = demo.next;
    var p = pts[i];
    if (p) {
      var late = (demo.cyc % 2 === 0 && i === pts.length - 1) ? 0.32 : 0;
      var tArr = p.t + late;
      var pos = ptPos(p);
      if (p.k === 0) {
        demo.x += (pos.x - demo.x) * Math.min(1, dt * 7);
        demo.y += (pos.y - demo.y) * Math.min(1, dt * 7);
        if (clock >= tArr) { demo.x = pos.x; demo.y = pos.y; fingerDown(pos.x, pos.y); demo.next++; }
      } else if (pressing) {
        var prev = p.st.pts[p.k - 1];
        var pp = ptPos(prev);
        var ux = pos.x - pp.x, uy = pos.y - pp.y, L = Math.hypot(ux, uy) || 1;
        ux /= L; uy /= L;
        var ex = pos.x - ux * R * 0.8, ey = pos.y - uy * R * 0.8;
        var t0 = prev.t + 0.05, k = Math.max(0, Math.min(1, (clock - t0) / (tArr - t0)));
        demo.x = pp.x + (ex - pp.x) * k; demo.y = pp.y + (ey - pp.y) * k;
        if (clock >= tArr) { demo.x = pos.x; demo.y = pos.y; demo.next++; }
        fingerMove(demo.x, demo.y);
      } else {
        demo.next++;
      }
    }
    // 帯の最後の点を過ぎたら指を離す
    if (pressing) {
      var lastHit = pts[demo.next - 1];
      if (lastHit && lastHit.k === lastHit.st.n - 1 && clock > lastHit.t + SPB * 0.3) fingerUp();
    }
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initRun(true); demo.cyc++; demo.next = 0; }
    if (hitStop > 0) { hitStop -= dt; return; }
    if (clock < endT + 0.2) stepRun(dt);
    ghostStep(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);
    cheerT = Math.max(0, cheerT - dt); oopsT = Math.max(0, oopsT - dt); popT = Math.max(0, popT - dt);

    if (state === S.ATTRACT) {
      if (!strips) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(demo.x, demo.y, { press: pressing, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.white);
      game.draw.rect(0, 222, W, 10, C.ink);
      label(GAME_TITLE, W / 2, 100 + Math.sin(t * 3) * 6, 96, C.pink);
      label('HI-SCORE ' + game.best, W / 2, 186, 38, C.teal);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else label('TAP TO START', W / 2, H * 0.965, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    realT += dt;
    if (!over && realT >= READY_T + TIME_LIMIT + 2.5) { hitStop = 0; finishRun(nMiss < LIVES); }
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; resultT = 0; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(dt);
    drawHud();
    if (clock < 0) {
      game.draw.rect(0, H * 0.42 - 10, W, 190, C.ink);
      game.draw.rect(0, H * 0.42, W, 170, C.white);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42 + 88, 110, C.pink);
    }
    // 最初の点だけ、ゴーストの手を薄く重ねる
    if (!over && pts.length && !pts[0].res && clock > pts[0].t - SPB * 1.5) {
      var p0 = ptPos(pts[0]);
      game.draw.hand(p0.x, p0.y, { press: clock >= pts[0].t - 0.05, scale: 12, alpha: 0.5 });
    }
    if (over && hitStop <= 0 && outroT < 0.9) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0; demo.cyc = 0;
  });
})(game);
