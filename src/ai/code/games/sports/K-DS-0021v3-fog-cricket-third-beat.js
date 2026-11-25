// K-DS-0021v3-fog-cricket-third-beat.js
// 霧のクリケット場 三拍目の一打 — 三拍子の1拍目に投げられ、2拍目に弾んだ球が打点の円に重なる3拍目の一点だけを狙って一度だけ振る。外れた球は見送る
// 操作: 画面のどこでも押すとバットを振る(1球につき1回だけ)。投手が1拍目(低い「ブン」)で投げ、2拍目(「チャッ」)で球が芝に弾み、3拍目(「チャッ」)で打点の円に重なる。3拍目の頭からのずれでPERFECT=6点/GOOD=4点。早振り・遅振り・振らずに見逃す(三柱門に当たる)はMISS。投手が外から投げた球は円の外を通る(投げた瞬間に円の外側に点線と鈍い音で予告)ので振らずに見送るとNICE、振るとMISS。4球目から霧が濃くなって球が途中まで見えず、7球目からは弾むまで見えない
// 終わり: 9球(三拍子10小節・約13秒)を終えてMISS2回以内ならCLEAR(得点+見送り)。MISS3回でGAME OVER
// @mechanic: timing_one_shot
// @theme: fog_cricket_third_beat
// 世界観: 霧の朝のクリケット場で、出番を待つ控えの打者が練習投手の三拍子の投球に合わせ、弾んだ球が打点の円に重なる三拍目の一球だけを待ち構えて打ち、外れた球は見送る
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・得点(6/4)・PERFECT/GOOD/MISS数・見送った数
// スタイル: 1BIT INK
var STYLE = { bg: ['#f2efe6', '#e6e2d6'], main: ['#151515', '#151515', '#f2efe6'], accent: ['#151515', '#f2efe6'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 墨と紙の2値。霧は紙色の網線で重ねて作り、線の太さで近さと力を見せる
  var INK = STYLE.main[0], PAPER = STYLE.bg[0], PAPER2 = STYLE.bg[1];

  var GAME_TITLE = 'FOG CRICKET';
  var BPM = 150;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.13;
  var MISS_MAX = 3;
  // 9球: S=円に重なる球(打つ) / W=外を通る球(見送る)。霧: 0=晴れ 1=途中まで見えない 2=弾むまで見えない
  var DELS = [];
  (function build() {
    var kinds = 'SSWSSWSWS';
    for (var i = 0; i < kinds.length; i++) {
      var wide = kinds.charAt(i) === 'W';
      var side = i % 2 ? 1 : -1;
      DELS.push({ t1: 3 * (i + 1), wide: wide, side: side, fog: i < 3 ? 0 : (i < 6 ? 1 : 2) });
    }
  })();
  var N = DELS.length;
  var END_BEAT = 3 * (N + 1);
  var TIME_LIMIT = END_BEAT * SPB + 1.0;

  // 朝の練習場のワルツ(オリジナル)。1小節 = 3拍
  var MEL = [
    [['A4', 1], ['D5', 1], ['F#5', 1]], [['E5', 2], ['D5', 1]], [['B4', 1], ['D5', 1], ['G5', 1]], [['F#5', 2], ['R', 1]],
    [['A4', 1], ['C#5', 1], ['E5', 1]], [['G5', 2], ['F#5', 1]], [['E5', 1], ['C#5', 1], ['A4', 1]], [['D5', 3]],
  ];
  var ROOT = ['D3', 'A2', 'G2', 'D3', 'A2', 'E3', 'A2', 'D3'];
  var PAH = [[370, 440], [330, 554], [392, 494], [370, 440], [330, 554], [392, 494], [330, 554], [370, 440]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, nextBar;
  var cur, shot, res, hitStop, flashT, swingT, lastBall, bailT, fogNow;
  var score, runs, perfects, goods, misses, leaves, nearOff, over, won, outroT, prevBest, milestone;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    readyT = isDemo ? 0 : 0.8;
    cur = 0; shot = []; res = []; hitStop = 0; flashT = 0; swingT = 0; lastBall = null; bailT = 0; fogNow = 0;
    score = 0; runs = 0; perfects = 0; goods = 0; misses = 0; leaves = 0; nearOff = -1;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function playBar(i) {
    var v = demoMode ? 0.5 : 1;
    game.audio.melody(MEL[i % MEL.length], { tempo: BPM, wave: 'triangle', volume: 0.06 * v, bass: [[ROOT[i % ROOT.length], 1], ['R', 2]], bassWave: 'triangle', bassVolume: 0.12 * v });
  }

  function delAtBeat(b) {
    for (var i = 0; i < N; i++) if (DELS[i].t1 === b) return DELS[i];
    return null;
  }

  // ---- 拍クロック(1本だけ・三拍子) ----
  function onBeat(b) {
    var v = demoMode ? 0.5 : 1;
    var pos = b % 3, bar = Math.floor(b / 3);
    if (pos === 0) game.audio.tone(98, 0.12, { wave: 'triangle', volume: 0.16 * v, slide: -30 });
    else {
      var ch = PAH[bar % PAH.length];
      game.audio.tone(ch[0], 0.07, { wave: 'square', volume: 0.025 * v });
      game.audio.tone(ch[1], 0.07, { wave: 'square', volume: 0.02 * v });
    }
    var d = delAtBeat(b);
    if (d) {
      // 投げた音: 円に来る球は高い「コッ」、外を通る球は鈍い「ドン」
      if (d.wide) game.audio.tone(140, 0.12, { wave: 'sine', volume: 0.16 * v });
      else game.audio.tone(1200, 0.04, { wave: 'square', volume: 0.08 * v });
    }
    if (pos === 1 && delAtBeat(b - 1)) game.audio.tone(700, 0.03, { wave: 'triangle', volume: 0.1 * v });
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    if (songT >= nextBar * 3 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    var tf = cur < N ? DELS[cur].fog : 2;
    fogNow += (tf - fogNow) * Math.min(1, dt * 2);
    while (cur < N && songT > (DELS[cur].t1 + 2) * SPB + GOOD_W) {
      if (shot[cur]) { cur++; continue; }
      var d = DELS[cur];
      if (d.wide) {
        res[cur] = 'leave'; leaves++; score += 10;
        lastBall = { i: cur, kind: 'leave', at: songT };
        var ep = ballPos(d, (d.t1 + 2) * SPB);
        game.feedback.good(ep.x, ep.y - 120, { text: 'NICE', color: INK, size: 46, count: 6, volume: 0.18 });
        cur++;
      } else {
        missNow('bowled');
      }
    }
    if (!demoMode && !over && songT > END_BEAT * SPB + 0.6) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  // ---- 投影(打者の背後から投手を見る) ----
  var HZ = Math.round(H * 0.3), GK = 1100, U = 420, CX = W / 2;
  var CIR_Z = 1.35, CIR_H = 0.7;
  function proj(wx, z, h) {
    var s = U / z;
    return { x: CX + wx * s, y: HZ + GK / z - h * s, gy: HZ + GK / z, s: s };
  }
  function ballPos(d, t) {
    var t1 = d.t1 * SPB, wx, z, h;
    var relX = d.wide ? d.side * 0.5 : d.side * 0.12;
    var bX = d.wide ? d.side * 0.62 : d.side * 0.06;
    var eX = d.wide ? d.side * 0.9 : 0;
    if (t < t1 + SPB) {
      var p = Math.max(0, (t - t1) / SPB);
      wx = relX + (bX - relX) * p; z = 7 - 4 * p; h = 2.1 * (1 - p) + 0.5 * Math.sin(p * Math.PI);
    } else if (t < t1 + 2 * SPB) {
      var q = (t - t1 - SPB) / SPB;
      wx = bX + (eX - bX) * q; z = 3 - (3 - CIR_Z) * q; h = CIR_H * q + 0.8 * Math.sin(q * Math.PI);
    } else {
      var r = Math.min(1, (t - t1 - 2 * SPB) / (SPB * 0.8));
      wx = eX * (1 + r * 0.3); z = CIR_Z - 0.4 * r; h = CIR_H * (1 - r * 0.5);
    }
    var pr = proj(wx, z, h);
    pr.z = z;
    return pr;
  }
  function fogZ(level) { return level < 0.5 ? 99 : (level < 1.5 ? 5 : 3.02); }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  var circle = proj(0, CIR_Z, CIR_H);

  function missNow(why) {
    res[cur] = 'miss';
    lastBall = { i: cur, kind: 'miss', at: songT };
    cur++;
    misses++;
    hitStop = 0.45; flashT = 0.45; bailT = 0.8;
    game.feedback.bad(CX, circle.y - 180, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function swingAction() {
    if (!running || hitStop > 0) return 'none';
    if (swingT > 0) return 'none';
    swingT = 0.3;
    if (cur >= N) return 'air';
    var d = DELS[cur];
    if (songT < d.t1 * SPB - 0.05) return 'air';       // まだ投げていない素振り
    shot[cur] = true;
    if (d.wide) { missNow('chase'); return 'miss'; }    // 外を通る球に手を出した
    var off = songT - (d.t1 + 2) * SPB;
    var w = judge(off);
    if (w === 'MISS') {
      var gap = Math.abs(off) - GOOD_W;
      if (nearOff < 0 || gap < nearOff) nearOff = gap;
      missNow(off < 0 ? 'early' : 'late');
      return 'miss';
    }
    var r = w === 'PERFECT' ? 6 : 4;
    runs += r; score += r * 10 + (w === 'PERFECT' ? 20 : 0);
    if (w === 'PERFECT') perfects++; else goods++;
    res[cur] = w;
    lastBall = { i: cur, kind: 'hit', at: songT, r: r };
    cur++;
    game.feedback.good(circle.x, circle.y - 150, { text: w, color: INK, size: w === 'PERFECT' ? 60 : 48, count: 12, volume: 0.25 });
    game.fx.popup(String(r), circle.x + 200, circle.y - 260, { color: INK, size: 120 });
    game.fx.burst(circle.x, circle.y, { color: INK, count: 14, speed: 360 });
    if (!demoMode && perfects + goods === 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(runs + '', W / 2, H * 0.36, { color: INK, size: 140 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(150, W - 150), game.random(H * 0.3, H * 0.6), { color: INK, count: 18, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = swingAction();
    if (r === 'air') game.audio.play('se_tap', 0.2);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    var bg = col === INK ? PAPER : INK;
    game.draw.text(str, x + 3, y + 3, { size: sz, color: bg, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  // 網点の影(市松のドット)
  function dotShadow(x, y, w) {
    for (var i = -3; i <= 3; i++) for (var j = 0; j < 2; j++) if ((i + j) % 2 === 0) game.draw.rect(x + i * w * 0.12 - 4, y + j * 8 - 4, 8, 6, INK);
  }

  var TREES = [];
  for (var ti = 0; ti < 9; ti++) TREES.push({ x: ti * 130 + 20, h: 60 + (ti * 37) % 70 });

  function drawGround() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, PAPER], [0.3, PAPER2], [1, PAPER]]);
    // 遠くの木立と小屋(霧で薄い)
    for (var i = 0; i < TREES.length; i++) {
      var tr = TREES[i];
      game.draw.circle(tr.x, HZ - tr.h * 0.6, tr.h * 0.55, INK);
      game.draw.rect(tr.x - 6, HZ - tr.h * 0.3, 12, tr.h * 0.3, INK);
    }
    game.draw.rect(760, HZ - 110, 200, 110, INK);
    for (var r = 0; r < 4; r++) game.draw.rect(740 + r * 10, HZ - 130 - r * 14, 240 - r * 20, 14, INK);
    game.draw.rect(800, HZ - 70, 30, 40, PAPER); game.draw.rect(890, HZ - 70, 30, 40, PAPER);
    // 芝の線刻(奥ほど細く・まばら)
    for (var k = 0; k < 26; k++) {
      var z = 9 - k * 0.32;
      if (z < 0.9) break;
      var p = proj(0, z, 0);
      var lw = Math.max(1, 6 / z);
      for (var g = -6; g <= 6; g++) {
        var gx = CX + (g * 0.9 + ((k % 2) ? 0.45 : 0)) * p.s;
        if (gx < -40 || gx > W + 40) continue;
        game.draw.line(gx - 0.12 * p.s, p.gy, gx + 0.12 * p.s, p.gy, INK, lw);
      }
    }
    // ピッチ(収束する2本の線)と打席の線
    var a = proj(-0.6, 8, 0), b = proj(-0.6, 1.0, 0), c = proj(0.6, 8, 0), d = proj(0.6, 1.0, 0);
    game.draw.line(a.x, a.gy, b.x, b.gy, INK, 5);
    game.draw.line(c.x, c.gy, d.x, d.gy, INK, 5);
    var cr = proj(-0.9, 1.25, 0), cr2 = proj(0.9, 1.25, 0);
    game.draw.line(cr.x, cr.gy, cr2.x, cr2.gy, INK, 7);
    var fc = proj(-0.5, 7, 0), fc2 = proj(0.5, 7, 0);
    game.draw.line(fc.x, fc.gy, fc2.x, fc2.gy, INK, 2);
    // 朝霧の中を飛ぶ鳥(遠景の動き)
    var bx = (t * 40) % (W + 200) - 100;
    game.draw.line(bx - 14, HZ - 160, bx, HZ - 150, INK, 3);
    game.draw.line(bx, HZ - 150, bx + 14, HZ - 160, INK, 3);
  }

  var BOWLER = [
    ['..kk..', '.kkkk.', '.kpkp.', '.kkkk.', '..kk..', 'kkkkkk', '.kkkk.', '.kkkk.', '.k..k.', 'kk..kk'],
    ['kk.kk.', '.kkkk.', '.kpkp.', '.kkkk.', '..kk..', '.kkkk.', '.kkkk.', '.kkkk.', '.k..k.', '.k..k.'],
  ];
  // 控えの打者(斜め後ろ姿・帽子のつばの下に目)
  var BATTER = [
    ['..kkkkk...', '.kkkkkkkk.', '..kkpkk...', '..kpppk...', '...kkk....', '.kkkkkkk..', 'kkkkkkkkk.', 'kkpkkkkkk.', 'kkkkkkkkk.', '.kkkkkkk..', '.kkkkkkk..', '.kk...kk..', '.kk...kk..', '.pp...pp..', '.kk...kk..', 'kkk...kkk.'],
  ];
  var IPAL = { k: INK, p: PAPER };
  var WPAL = { k: PAPER, p: INK };

  function drawBowler() {
    var d = DELS[Math.min(cur, N - 1)];
    var bx = running && cur < N && d.wide ? d.side * 0.5 : 0.1;
    var p = proj(bx, 7.2, 0);
    var px = 0.09 * p.s;
    var release = running && cur < N && songT >= d.t1 * SPB - SPB * 0.5 && songT < d.t1 * SPB + SPB * 0.6;
    var bob = release ? 0 : Math.sin(game.time.elapsed * 8) * 2;
    dotShadow(p.x, p.gy + 4, 0.5 * p.s);
    game.draw.sprite(BOWLER[release ? 1 : 0], IPAL, p.x, p.gy - 5 * px + bob, px, { anchor: 'center' });
  }

  function drawStumps() {
    var p = proj(0, 1.15, 0);
    var hh = 0.7 * p.s;
    var white = flashT > 0;
    var sc = white ? 1 + (flashT / 0.45) * 0.3 : 1;
    if (white) game.draw.rect(p.x - 80 * sc, p.gy - hh * sc - 30, 160 * sc, hh * sc + 40, INK);
    for (var i = -1; i <= 1; i++) game.draw.rect(p.x + i * 36 * sc - 7, p.gy - hh * sc, 14, hh * sc, white ? PAPER : INK);
    var lift = bailT > 0 ? (0.8 - bailT) * 300 : 0;
    game.draw.rect(p.x - 46 * sc - lift * 0.4, p.gy - hh * sc - 12 - lift, 40, 10, white ? PAPER : INK);
    game.draw.rect(p.x + 6 * sc + lift * 0.4, p.gy - hh * sc - 12 - lift * 0.8, 40, 10, white ? PAPER : INK);
  }

  function drawBatter() {
    var p = proj(-0.68, 1.2, 0);
    var px = 0.072 * p.s;
    var swing = swingT > 0 ? 1 - swingT / 0.3 : -1;
    dotShadow(p.x, p.gy + 6, 1.0 * p.s);
    game.draw.sprite(BATTER[0], IPAL, p.x, p.gy - 8 * px, px, { anchor: 'center' });
    // バット: 構え(肩の後ろ)→ 振り抜き(円を横切る)
    var hx = p.x + 3 * px, hy = p.gy - 9 * px;
    var ang = swing < 0 ? -2.3 + Math.sin(game.time.elapsed * 2) * 0.05 : -2.3 + swing * 3.0;
    var len = 9 * px;
    var ex = hx + Math.cos(ang) * len, ey = hy + Math.sin(ang) * len;
    game.draw.line(hx, hy, ex, ey, INK, 22);
    game.draw.line(hx, hy, hx + Math.cos(ang) * len * 0.3, hy + Math.sin(ang) * len * 0.3, PAPER, 6);
  }

  function drawCircle() {
    var d = DELS[Math.min(cur, N - 1)];
    var inPlay = running && cur < N && songT >= d.t1 * SPB - 0.05;
    var t3 = (d.t1 + 2) * SPB;
    var rr = 0.25 * circle.s;
    var blink = inPlay && !d.wide && t3 - songT < 0.8 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    if (blink) game.draw.circle(circle.x, circle.y, rr + 14, INK, 0.25);
    // 太い輪(近い = 太い線)
    for (var a = 0; a < 24; a++) {
      var a0 = (a / 24) * Math.PI * 2, a1 = ((a + 1) / 24) * Math.PI * 2;
      game.draw.line(circle.x + Math.cos(a0) * rr, circle.y + Math.sin(a0) * rr, circle.x + Math.cos(a1) * rr, circle.y + Math.sin(a1) * rr, INK, 8);
    }
    game.draw.line(circle.x - 14, circle.y, circle.x + 14, circle.y, INK, 3);
    game.draw.line(circle.x, circle.y - 14, circle.x, circle.y + 14, INK, 3);
    // 外を通る球の予告: 円の外側に点線
    if (inPlay && d.wide) {
      var ex = proj(d.side * 0.9, CIR_Z, CIR_H);
      for (var k = 0; k < 5; k++) game.draw.rect(ex.x - 6, ex.y - 120 + k * 50, 12, 26, INK);
    }
    // 3拍目に向かって縮む輪
    if (inPlay && !d.wide && songT < t3) {
      var k2 = Math.max(0, (t3 - songT) / (2 * SPB));
      var r2 = rr + k2 * 260;
      for (var b = 0; b < 16; b += 2) {
        var b0 = (b / 16) * Math.PI * 2, b1 = ((b + 1) / 16) * Math.PI * 2;
        game.draw.line(circle.x + Math.cos(b0) * r2, circle.y + Math.sin(b0) * r2, circle.x + Math.cos(b1) * r2, circle.y + Math.sin(b1) * r2, INK, 3);
      }
    }
  }

  function drawBall() {
    if (!running && !over) return;
    var fz = fogZ(fogNow);
    if (cur < N) {
      var d = DELS[cur];
      if (songT >= d.t1 * SPB) {
        var p = ballPos(d, songT);
        // 弾む点(2拍目)の印
        var bp = ballPos(d, (d.t1 + 1) * SPB);
        game.draw.line(bp.x - 0.2 * bp.s, bp.gy, bp.x + 0.2 * bp.s, bp.gy, INK, 3);
        if (p.z < fz) {
          dotShadow(p.x, p.gy, 0.25 * p.s);
          game.draw.circle(p.x, p.y, 0.07 * p.s + 4, INK);
          game.draw.circle(p.x - 0.02 * p.s, p.y - 0.02 * p.s, 0.025 * p.s, PAPER);
        }
      }
    }
    if (lastBall) {
      var dl = DELS[lastBall.i], dt = songT - lastBall.at;
      if (lastBall.kind === 'hit' && dt < 1.2) {
        // 打ち返した球は霧の奥へ高く
        var q = dt / 1.2;
        var hp = proj(0.3 + q * 1.2, CIR_Z + q * 8, CIR_H + Math.sin(q * Math.PI * 0.8) * 4 * (lastBall.r / 6));
        game.draw.circle(hp.x, hp.y, Math.max(4, 0.07 * hp.s), INK);
      } else if (lastBall.kind !== 'hit' && dt < 0.6) {
        var lp = ballPos(dl, songT);
        game.draw.circle(lp.x, lp.y, 0.07 * lp.s + 4, INK);
      }
    }
  }

  function drawFog() {
    var t = game.time.elapsed;
    var lv = fogNow;
    var bottom = lv < 0.5 ? HZ + 40 : HZ + GK / fogZ(Math.round(lv)) + 30 * lv;
    bottom = Math.min(bottom, HZ + GK / 3.02 + 20);
    var top = 0;
    for (var y = top; y < bottom; y += 6) {
      var depth = (bottom - y) / Math.max(1, bottom - top);
      var th = 1 + Math.min(4, Math.floor(depth * 6 + Math.sin(y * 0.05 + t) * 0.6));
      game.draw.rect(0, y, W, th, PAPER);
    }
    // 霧の縁は波打つ点の列
    for (var x = 0; x < W; x += 24) game.draw.rect(x, bottom + Math.sin(x * 0.02 + t * 1.5) * 8, 10, 4, PAPER);
  }

  function drawBeats() {
    var y = Math.round(H * 0.155);
    var pos = running ? beatN % 3 : -1;
    game.draw.rect(0, y - 70, W, 140, PAPER);
    game.draw.line(0, y + 70, W, y + 70, INK, 4);
    for (var i = 0; i < 3; i++) {
      var x = W / 2 - 260 + i * 260;
      var on = i === pos;
      var k = on ? 1 - beatT / SPB : 0;
      if (i === 2) {
        for (var a = 0; a < 16; a++) {
          var a0 = (a / 16) * Math.PI * 2, a1 = ((a + 1) / 16) * Math.PI * 2;
          game.draw.line(x + Math.cos(a0) * 40, y + Math.sin(a0) * 40, x + Math.cos(a1) * 40, y + Math.sin(a1) * 40, INK, on ? 12 : 5);
        }
        if (on) game.draw.circle(x, y, 22 + k * 10, INK);
      } else {
        var r = i === 0 ? 34 : 24;
        game.draw.circle(x, y, r + (on ? k * 12 : 0), INK);
        if (!on) game.draw.circle(x, y, r - 6, PAPER);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK);
    label('SCORE ' + score, 50, 96, 52, PAPER, 'left');
    label('BEST ' + prevBest, 50, 168, 32, PAPER, 'left');
    label(Math.min(cur + 1, N) + ' / ' + N, W - 60, 96, 52, PAPER, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var x = W - 300 + m * 90;
      for (var s2 = -1; s2 <= 1; s2++) game.draw.rect(x + s2 * 16 - 4, 140, 8, 50, m < misses ? '#6a6a6a' : PAPER);
      if (m < misses) game.draw.line(x - 30, 136, x + 30, 194, PAPER, 6);
    }
  }

  function scanlines() {
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 1, INK, 0.04);
  }

  function drawScene() {
    drawGround();
    drawBowler();
    drawFog();
    drawStumps();
    drawCircle();
    drawBall();
    drawBatter();
    drawBeats();
    scanlines();
  }

  // ---- ATTRACT: 実ロジックで1球目は三拍目ぴったり、2球目は早振りでMISS、3球目は外の球を見送る ----
  var demo = { t: 0, press: 0 };
  var DEMO_LEN = (DELS[2].t1 + 3) * SPB + 0.3;
  var DEMO_AIM = [0, -0.25, 99];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) initGame(true);
    if (running && cur < 3 && !shot[cur] && hitStop <= 0) {
      var d = DELS[cur];
      if (DEMO_AIM[cur] < 9 && songT + dt >= (d.t1 + 2) * SPB + DEMO_AIM[cur]) { swingAction(); demo.press = 0.2; }
    }
    if (demo.press > 0) demo.press -= dt;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (swingT > 0) swingT -= dt;
    if (bailT > 0) bailT -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W * 0.74, H * 0.83, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, INK);
      label(GAME_TITLE, W / 2, 110, 84 + Math.sin(t * 3) * 3, PAPER);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, PAPER);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 56, INK);
      else label('TAP TO START', W / 2, H * 0.955, 48, INK);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.24, W, H * 0.34, INK);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, PAPER);
      label('SCORE ' + score, W / 2, H * 0.37, 60, PAPER);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.41, 36, PAPER);
      game.draw.circle(W / 2 - 100, H * 0.445 - 14, 20, PAPER);
      label(runs + '  /  ' + leaves, W / 2 + 20, H * 0.445, 46, PAPER);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.5, 54, PAPER);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.5, 40, PAPER);
      if (!won) label(nearOff >= 0 ? 'あと' + Math.max(0.01, nearOff).toFixed(2) + '秒' : 'あと' + Math.max(1, N - cur) + '球', W / 2, H * 0.265, 52, PAPER);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 38, PAPER);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, runs: runs, perfect: perfects, good: goods, miss: misses, leaves: leaves };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.34, 120, INK);
    if (over && won) label('FINISH', W / 2, H * 0.34, 110, INK);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
