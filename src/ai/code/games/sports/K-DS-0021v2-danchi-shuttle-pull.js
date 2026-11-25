// K-DS-0021v2-danchi-shuttle-pull.js
// 団地の公園の羽根つき返し — 食い気味の拍(8分の裏)で飛んでくる妹の羽根を、打点の輪ぎりぎりまで引きつけて打ち返す。打点との差が「あと○cm」と線で出る
// 操作: 妹が拍の頭で羽根を打つと、1拍半(高い球は2拍半)後の8分の裏で手前の左右どちらかの打点の輪に届く(地面の影と輪の点滅で0.6秒前から予告)。届く側(画面の左半分/右半分)を押すとその側へ振って打ち返す。輪に近いほど高得点で、輪の手前0.03秒以内は「ぎりぎり」ボーナス。0.16秒より早い空振り・逆側を振る・輪を過ぎて0.05秒を超える(地面に落ちる)とMISS
// 終わり: 8本(約14秒)を打ち返し終えればCLEAR(判定の点+近さの点+ぎりぎりボーナス)。MISS3回でGAME OVER
// @mechanic: near_miss
// @theme: danchi_park_shuttle_pull
// 世界観: 夕方の団地の公園で、姉が妹の打ってくる羽根を食い気味の拍に合わせて打点ぎりぎりまで引きつけ、何cm手前で打ち返せたかを数えながらラリーを続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・一番近く引きつけた距離(cm)
// スタイル: 2000s BILLBOARD 3D
var STYLE = { bg: ['#f6a35c', '#c96a8a', '#5a4a8c'], main: ['#e8573f', '#3f8fd8', '#f5d04a'], accent: ['#ffffff', '#41c47a'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 物は板(sprite)のまま距離で px を変え、真下に接地影。奥のものほど彩度を落とす
  var C = {
    sky0: STYLE.bg[2], sky1: STYLE.bg[1], sky2: STYLE.bg[0],
    red: STYLE.main[0], blue: STYLE.main[1], yellow: STYLE.main[2],
    white: STYLE.accent[0], green: STYLE.accent[1],
    grass: '#6f9a54', grassD: '#557c40', dirt: '#c9a777', dirtD: '#b08f62', ink: '#2a2238',
    skin: '#f3c9a0', hair: '#3a2a26', cork: '#e07a3a', far: '#9a8fa8', farD: '#7e7690',
  };

  var GAME_TITLE = 'SHUTTLE PULL';
  var BPM = 120;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.06;
  var GOOD_W = 0.16;
  var LATE_W = 0.05;
  var WHIFF_W = 0.34;
  var SPEED_CM = 700;   // 打点の手前での羽根の速さ(cm/秒)
  var MISS_MAX = 3;

  // 妹は拍の頭で打つ。羽根は1.5拍(高い球は2.5拍)飛ぶので、届くのは必ず8分の裏(食い)
  var FLIGHT = [1.5, 1.5, 1.5, 2.5, 1.5, 1.5, 2.5, 1.5];
  var SIDE = [1, -1, 1, 1, -1, 1, -1, -1];
  var SHOTS = [];
  (function buildRally() {
    var L = 2;
    for (var i = 0; i < FLIGHT.length; i++) {
      SHOTS.push({ L: L, A: L + FLIGHT[i], side: SIDE[i] });
      L = L + FLIGHT[i] + 1.5;
    }
  })();
  var LAST_A = SHOTS[SHOTS.length - 1].A;
  var TIME_LIMIT = (LAST_A + 2) * SPB;

  // 公園の歌(オリジナル)。8分の裏に重心を置いた食いのフレーズ
  var BARS = [
    { n: [['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['R', 0.5]], b: [['C3', 1.5], ['G2', 1], ['C3', 1.5]] },
    { n: [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['A5', 1], ['R', 0.5]], b: [['F2', 1.5], ['C3', 1], ['F2', 1.5]] },
    { n: [['A5', 0.5], ['G5', 1], ['E5', 1], ['D5', 1], ['C5', 0.5]], b: [['A2', 1.5], ['E3', 1], ['A2', 1.5]] },
    { n: [['D5', 1.5], ['E5', 1], ['G5', 1.5]], b: [['G2', 1.5], ['D3', 1], ['G2', 1.5]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, nextBar, halfDone;
  var cur, res, hitStop, flashT, flashX, flashY, swingT, swingSide, sisSwingT, info;
  var score, perfects, goods, misses, bestGap, nearMissCm, over, won, outroT, prevBest, milestone, streak;

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 1; halfDone = false;
    readyT = isDemo ? 0 : 0.8;
    cur = 0; res = []; hitStop = 0; flashT = 0; flashX = 0; flashY = 0; swingT = 0; swingSide = 1; sisSwingT = 0; info = null;
    score = 0; perfects = 0; goods = 0; misses = 0; bestGap = -1; nearMissCm = -1;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false; streak = 0;
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1; halfDone = false;
    playBar(0);
    onBeat(0);
  }

  function playBar(i) {
    var v = demoMode ? 0.5 : 1;
    var bar = BARS[i % BARS.length];
    game.audio.melody(bar.n, { tempo: BPM, wave: 'square', volume: 0.045 * v, bass: bar.b, bassWave: 'triangle', bassVolume: 0.08 * v });
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    halfDone = false;
    var v = demoMode ? 0.5 : 1;
    if (b % 2 === 0) game.audio.tone(100, 0.1, { wave: 'triangle', volume: 0.18 * v, slide: -40 });
    else game.audio.tone(1900, 0.03, { wave: 'square', volume: 0.03 * v });
    for (var i = 0; i < SHOTS.length; i++) {
      if (SHOTS[i].L === b) {
        sisSwingT = 0.25;
        // 妹の打球音(ここから1.5拍/2.5拍後の裏で届く)
        game.audio.tone(880, 0.05, { wave: 'square', volume: 0.1 * v });
        game.audio.tone(1320, 0.08, { wave: 'triangle', volume: 0.05 * v, slide: -300 });
      }
    }
  }
  function onHalf(b) {
    var v = demoMode ? 0.5 : 1;
    // 裏拍のハイハット(届く裏は少し強く)
    var arrive = false;
    for (var i = 0; i < SHOTS.length; i++) if (SHOTS[i].A === b + 0.5) arrive = true;
    game.audio.tone(2600, 0.025, { wave: 'square', volume: (arrive ? 0.05 : 0.02) * v });
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    if (!halfDone && beatT >= SPB * 0.5) { halfDone = true; onHalf(beatN); }
    songT = beatN * SPB + beatT;
    if (songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    // 輪を過ぎても打たない → 地面に落ちる
    if (cur < SHOTS.length && songT > SHOTS[cur].A * SPB + LATE_W) {
      var p = shuttlePos(SHOTS[cur], SHOTS[cur].A * SPB + LATE_W + 0.25);
      missNow('drop', p.x, p.gy);
    }
    if (!demoMode && !over && cur >= SHOTS.length && songT > (LAST_A + 1.2) * SPB) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  // ---- 疑似3D(板 + 距離でスケール) ----
  var HZ = Math.round(H * 0.36), GK = 1000, U = 380, CX = W / 2;
  function proj(wx, z, h) {
    var s = U / z;
    return { x: CX + wx * s, y: HZ + GK / z - h * s, gy: HZ + GK / z, s: s };
  }
  var SIS = { wx: 0.1, z: 4.2 };
  var HIT_Z = 1.45, HIT_H = 1.1, HIT_X = 0.75;

  function shuttlePos(sh, t) {
    var tL = sh.L * SPB, tA = sh.A * SPB;
    var p = (t - tL) / (tA - tL);
    var wx, z, h;
    if (p <= 1) {
      wx = SIS.wx + (sh.side * HIT_X - SIS.wx) * p;
      z = SIS.z + (HIT_Z - SIS.z) * p;
      h = 1.4 + (HIT_H - 1.4) * p + Math.sin(p * Math.PI) * (tA - tL > 1 ? 2.6 : 1.6);
    } else {
      var q = Math.min(1, (p - 1) * 3);
      wx = sh.side * HIT_X * (1 + q * 0.2);
      z = HIT_Z - q * 0.35;
      h = HIT_H * (1 - q);
    }
    var pr = proj(wx, z, h);
    pr.p = p; pr.z = z;
    return pr;
  }

  function judgeGap(off) {
    var gap = Math.max(0, -off);
    return gap <= PERFECT_W ? 'PERFECT' : 'GOOD';
  }

  function missNow(why, x, y) {
    res[cur] = 'miss';
    cur++;
    misses++; streak = 0;
    hitStop = 0.42; flashT = 0.42; flashX = x; flashY = y;
    game.feedback.bad(x, y - 140, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function swingAction(side) {
    if (!running || hitStop > 0) return 'none';
    swingT = 0.22; swingSide = side;
    if (cur >= SHOTS.length) return 'air';
    var sh = SHOTS[cur];
    var tA = sh.A * SPB;
    var off = songT - tA;
    if (songT < sh.L * SPB || off < -WHIFF_W) return 'air';  // まだ羽根が来ていない素振り
    var pos = shuttlePos(sh, songT);
    var gapCm = Math.round(Math.max(0, -off) * SPEED_CM);
    var ring = proj(sh.side * HIT_X, HIT_Z, HIT_H);
    if (side !== sh.side) {
      info = { x: pos.x, y: pos.y, rx: ring.x, ry: ring.y, cm: -1, t: 0.8, ok: false };
      missNow('side', pos.x, pos.y);
      return 'miss';
    }
    if (off < -GOOD_W) {
      info = { x: pos.x, y: pos.y, rx: ring.x, ry: ring.y, cm: gapCm, t: 0.9, ok: false };
      if (nearMissCm < 0 || gapCm < nearMissCm) nearMissCm = gapCm;
      missNow('early', pos.x, pos.y);
      return 'miss';
    }
    var w = judgeGap(off);
    var gap = Math.max(0, -off);
    var pts = 50 + Math.round(80 * (1 - gap / GOOD_W)) + (gap <= 0.03 ? 50 : 0);
    score += pts; streak++;
    if (w === 'PERFECT') perfects++; else goods++;
    if (bestGap < 0 || gapCm < bestGap) bestGap = gapCm;
    res[cur] = w;
    cur++;
    info = { x: pos.x, y: pos.y, rx: ring.x, ry: ring.y, cm: gapCm, t: 0.9, ok: true };
    game.feedback.good(pos.x, pos.y - 120, { text: w, color: w === 'PERFECT' ? C.yellow : C.blue, size: w === 'PERFECT' ? 58 : 48, count: 12, volume: 0.25 });
    if (gap <= 0.03) game.fx.burst(pos.x, pos.y, { color: C.yellow, count: 18, speed: 380 });
    if (!demoMode && streak === 4 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup('NICE', W / 2, H * 0.3, { color: C.yellow, size: 96 });
    }
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(150, W - 150), game.random(H * 0.3, H * 0.6), { color: i % 2 ? C.yellow : C.red, count: 20, speed: 420 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力(左半分=左へ振る / 右半分=右へ振る) ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var r = swingAction(x < W / 2 ? -1 : 1);
    if (r === 'air') game.audio.tone(240, 0.06, { wave: 'sine', volume: 0.06, slide: -80 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }
  function shadow(x, y, w, a) {
    for (var i = -3; i <= 3; i++) game.draw.circle(x + i * w * 0.09, y, w * (0.17 - Math.abs(i) * 0.03), C.ink, (a || 0.22) * 0.6);
  }

  var BLOCKS = [{ wx: -2.6, w: 2.2, h: 2.6 }, { wx: 0.4, w: 2.6, h: 3.2 }, { wx: 3.3, w: 2.0, h: 2.4 }];
  var TREES = [{ wx: -1.9, z: 7.5 }, { wx: 2.1, z: 6.8 }, { wx: -0.7, z: 9 }];

  function drawPark() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HZ, [[0, C.sky0], [0.55, C.sky1], [1, C.sky2]]);
    game.draw.circle(W * 0.78, HZ - 40, 70, C.yellow, 0.6);
    // 団地(遠景・彩度を落とす)
    for (var i = 0; i < BLOCKS.length; i++) {
      var b = BLOCKS[i], z = 14, s = U / z;
      var x0 = CX + (b.wx - b.w / 2) * s, top = HZ + GK / z - b.h * s * 2.2;
      game.draw.rect(x0, top, b.w * s, HZ + GK / z - top, C.far);
      for (var r = 0; r < 7; r++) for (var c = 0; c < 6; c++) {
        var lit = (r * 7 + c * 3 + i) % 5 === 0;
        game.draw.rect(x0 + 8 + c * (b.w * s - 16) / 6, top + 10 + r * 26, (b.w * s - 16) / 6 - 8, 14, lit ? '#f4d68a' : C.farD, lit ? 0.9 : 0.7);
      }
    }
    // 地面
    game.draw.gradient(HZ, H, [[0, C.grassD], [0.4, C.grass], [1, '#88b066']]);
    for (var k = 0; k < 22; k++) {
      var zz = 6 - k * 0.22, pp = proj(0, zz, 0), half = 1.0 * pp.s;
      game.draw.rect(CX - half, pp.y, half * 2, (proj(0, zz - 0.22, 0).y - pp.y) + 1, k % 2 ? C.dirt : C.dirtD, 0.75);
    }
    // 真ん中の線(ひもの代わりの地面の線)
    var m = proj(0, 2.8, 0);
    game.draw.rect(CX - 1.3 * m.s, m.y - 3, 2.6 * m.s, 6, C.white, 0.7);
    // 木と遊具(板 + 接地影)
    for (var j = 0; j < TREES.length; j++) {
      var tr = TREES[j], p = proj(tr.wx, tr.z, 0);
      shadow(p.x, p.y, 1.4 * p.s, 0.18);
      game.draw.rect(p.x - 0.08 * p.s, p.y - 1.0 * p.s, 0.16 * p.s, 1.0 * p.s, '#6a5040');
      game.draw.circle(p.x, p.y - 1.3 * p.s, 0.55 * p.s, '#4f7a44', 0.85);
      game.draw.circle(p.x - 0.3 * p.s, p.y - 1.1 * p.s, 0.4 * p.s, '#5a8a4c', 0.85);
    }
    var sl = proj(2.4, 5.2, 0);
    shadow(sl.x, sl.y, 1.0 * sl.s, 0.18);
    game.draw.line(sl.x - 0.5 * sl.s, sl.y - 0.9 * sl.s, sl.x + 0.4 * sl.s, sl.y, '#c9705a', 0.12 * sl.s);
    game.draw.rect(sl.x - 0.58 * sl.s, sl.y - 0.95 * sl.s, 0.1 * sl.s, 0.95 * sl.s, '#8a8a9a');
  }

  var SISTER = [
    ['..hhhh..', '.hhhhhh.', 'hffffffh', 'hfeffefh', '.ffmmff.', '..pppp..', '.pppppp.', '.pppppp.', '..f..f..', '..b..b..'],
    ['..hhhh..', '.hhhhhh.', 'hffffffh', 'hfeffefh', '.ffoOff.', 'f.pppp..', '.pppppp.', '.pppppp.', '..f..f..', '.b....b.'],
  ];
  var SPAL = { h: C.hair, f: C.skin, e: C.ink, m: C.red, o: C.ink, O: C.ink, p: '#f08aa8', b: C.ink };
  var ME = [
    ['...hhhh.....', '..hhhhhh.hh.', '..hhhhhhhhh.', '..hhhhhh....', '...hhhh.....', '..tttttt....', '.tttttttt...', '.tttttttt...', '.tttttttt...', '..ssssss....', '..ssssss....', '..f....f....', '..f....f....', '.bb....bb...'],
    ['...hhhh.....', '..hhhhhh.hh.', '..hhhhhhhhh.', '..hhhhhh....', '...hhhh.....', '..tttttt....', '.tttttttt...', '.tttttttt...', '.tttttttt...', '..ssssss....', '..ssssss....', '.f......f...', '.f......f...', 'bb......bb..'],
  ];
  var MPAL = { h: C.hair, t: C.blue, s: '#2f3e66', f: C.skin, b: C.ink };
  var SHUTTLE = ['w.w.w', 'wwwww', '.www.', '..c..', '.ccc.'];

  function drawSister() {
    var p = proj(SIS.wx, SIS.z, 0);
    var px = 0.13 * p.s;
    shadow(p.x, p.y, 0.9 * p.s, 0.25);
    var sw = sisSwingT > 0;
    var bob = Math.sin(game.time.elapsed * 6) * 2;
    game.draw.sprite(SISTER[sw ? 1 : 0], SPAL, p.x, p.y - 5 * px + bob, px, { anchor: 'center' });
    var rx = p.x + (sw ? -0.3 : 0.3) * p.s, ry = p.y - (sw ? 1.4 : 1.1) * p.s;
    game.draw.line(p.x + 0.12 * p.s, p.y - 0.8 * p.s, rx, ry, '#c0c0d0', 4);
    game.draw.circle(rx, ry, 0.12 * p.s, C.white, 0.8);
  }

  function drawMe() {
    var p = proj(0, 1.15, 0);
    var white = flashT > 0 && res[cur - 1] === 'miss';
    var px = 0.08 * p.s;
    shadow(p.x, p.y, 1.1 * p.s, 0.28);
    var frame = Math.floor((running ? songT / SPB : game.time.elapsed * 2)) % 2;
    game.draw.sprite(ME[frame], MPAL, p.x, p.y - 7 * px, px, { anchor: 'center', alpha: white ? 0.6 : 1 });
    // ラケット: 押した側の打点の輪へ向けて振り抜く
    var side = swingT > 0 ? swingSide : 1;
    var sx = p.x + side * 3 * px, sy = p.y - 9.5 * px;
    var ring = proj(side * HIT_X, HIT_Z, HIT_H);
    var targ = Math.atan2(ring.y - sy, ring.x - sx);
    var k = swingT > 0 ? swingT / 0.22 : 0;
    var ang = swingT > 0 ? targ + k * 1.1 * side : targ + 0.5;
    var len = Math.min(6.5 * px, Math.sqrt((ring.x - sx) * (ring.x - sx) + (ring.y - sy) * (ring.y - sy)));
    var rx = sx + Math.cos(ang) * len, ry = sy + Math.sin(ang) * len;
    game.draw.line(sx, sy, rx, ry, '#c0c0d0', 10);
    game.draw.circle(rx, ry, 1.4 * px, '#ffffff', 0.35);
    game.draw.circle(rx, ry, 1.4 * px - 6, C.red, 0.25);
  }

  function drawRings() {
    var sh = SHOTS[Math.min(cur, SHOTS.length - 1)];
    var tA = sh.A * SPB;
    var inFlight = running && cur < SHOTS.length && songT >= sh.L * SPB;
    for (var sd = -1; sd <= 1; sd += 2) {
      var r = proj(sd * HIT_X, HIT_Z, HIT_H);
      var rr = 0.22 * r.s;
      var mine = inFlight && sh.side === sd;
      var warn = mine && tA - songT < 0.6 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      shadow(r.x, r.gy, 0.5 * r.s, 0.12);
      game.draw.circle(r.x, r.y, rr + 8, warn ? C.yellow : C.white, warn ? 0.6 : 0.25);
      game.draw.circle(r.x, r.y, rr, C.ink, 0.15);
      if (mine) {
        // 縮んで重なる輪(届く瞬間に打点の輪と同じ大きさ)
        var k = Math.max(0, (tA - songT) / ((sh.A - sh.L) * SPB));
        game.draw.circle(r.x, r.y, rr + 150 * k, C.yellow, 0.18);
      }
    }
  }

  function drawShuttles() {
    if (!running) return;
    for (var i = Math.max(0, cur - 1); i < Math.min(SHOTS.length, cur + 1); i++) {
      var sh = SHOTS[i];
      var t0 = sh.L * SPB;
      if (songT < t0) {
        // 妹の手もとで待つ羽根
        var hp = proj(SIS.wx + 0.25, SIS.z, 1.1);
        if (i === cur) game.draw.sprite(SHUTTLE, { w: C.white, c: C.cork }, hp.x, hp.y, 0.05 * hp.s, { anchor: 'center' });
        continue;
      }
      if (i < cur && res[i] !== 'miss') {
        // 打ち返した羽根が妹へ戻る
        var q = (songT - sh.A * SPB) / (1.5 * SPB);
        if (q < 0 || q > 1) continue;
        var a = proj(sh.side * HIT_X, HIT_Z, HIT_H), wx = sh.side * HIT_X + (SIS.wx - sh.side * HIT_X) * q;
        var z = HIT_Z + (SIS.z - HIT_Z) * q, h = HIT_H + (1.4 - HIT_H) * q + Math.sin(q * Math.PI) * 2.0;
        var bp = proj(wx, z, h);
        shadow(bp.x, bp.gy, 0.3 * bp.s, 0.2);
        game.draw.sprite(SHUTTLE, { w: C.white, c: C.cork }, bp.x, bp.y, 0.05 * bp.s, { anchor: 'center', flipY: true });
        continue;
      }
      if (i < cur) continue;
      var p = shuttlePos(sh, songT);
      shadow(p.x, p.gy, 0.35 * p.s, 0.3);
      game.draw.sprite(SHUTTLE, { w: C.white, c: C.cork }, p.x, p.y, 0.05 * p.s, { anchor: 'center' });
    }
    // ずれの線と「あと○cm」
    if (info && info.t > 0) {
      var col = info.ok ? C.yellow : C.red;
      game.draw.line(info.x, info.y, info.rx, info.ry, col, 6);
      game.draw.circle(info.rx, info.ry, 10, col);
      if (info.cm >= 0) label('あと' + info.cm + 'cm', (info.x + info.rx) / 2, Math.min(info.y, info.ry) - 40, 46, col);
    }
    if (flashT > 0) {
      var k2 = flashT / 0.42;
      game.draw.circle(flashX, flashY, 30 + (1 - k2) * 120, C.white, 0.8 * k2);
    }
  }

  function drawBeatStrip() {
    var y = Math.round(H * 0.155);
    var bar = Math.floor(beatN / 4);
    var pos8 = running ? Math.floor((songT / SPB) * 2) - bar * 8 : -1;
    game.draw.rect(0, y - 60, W, 120, C.ink, 0.4);
    for (var i = 0; i < 8; i++) {
      var x = 120 + i * 120;
      var head = i % 2 === 0;
      var lit = i === pos8;
      var r = head ? 26 : 16;
      game.draw.circle(x, y, r + 6, C.ink, 0.6);
      game.draw.circle(x, y, r, lit ? C.yellow : (head ? C.white : C.far), lit ? 1 : 0.6);
    }
    // 届く8分の裏に羽根の印(妹が打った瞬間から出る)
    for (var k = 0; k < SHOTS.length; k++) {
      var sh = SHOTS[k];
      if (k < cur || songT < sh.L * SPB) continue;
      var cell = sh.A * 2 - bar * 8;
      if (cell >= 0 && cell < 8) {
        var cx = 120 + cell * 120;
        game.draw.sprite(SHUTTLE, { w: C.white, c: C.cork }, cx, y - 2, 7, { anchor: 'center' });
        game.draw.line(cx + (sh.side > 0 ? 24 : -24), y + 34, cx + (sh.side > 0 ? 44 : -44), y + 34, C.yellow, 6);
      }
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.75);
    label('SCORE ' + score, 50, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 50, 168, 32, C.yellow, 'left');
    for (var i = 0; i < SHOTS.length; i++) {
      var x = W - 520 + i * 62, r = res[i];
      game.draw.circle(x, 80, 20, r === 'miss' ? C.red : (r ? C.yellow : '#55506a'));
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 210 + m * 66, 168, 18, m < misses ? C.red : '#55506a');
    label(Math.min(cur, SHOTS.length) + ' / ' + SHOTS.length, W - 270, 184, 40, C.white, 'right');
  }

  function drawScene() {
    drawPark();
    drawSister();
    drawMe();
    drawRings();
    drawShuttles();
    drawBeatStrip();
    // 親指ゾーン: 左右の振り分け
    game.draw.rect(0, H * 0.8, W / 2 - 6, H * 0.2, C.ink, swingT > 0 && swingSide < 0 ? 0.35 : 0.12);
    game.draw.rect(W / 2 + 6, H * 0.8, W / 2 - 6, H * 0.2, C.ink, swingT > 0 && swingSide > 0 ? 0.35 : 0.12);
    game.draw.circle(W * 0.25, H * 0.9, 44, C.white, 0.25);
    game.draw.circle(W * 0.75, H * 0.9, 44, C.white, 0.25);
  }

  // ---- ATTRACT: 実ロジックで1本目はぎりぎり、2本目は早めでGOOD、3本目は引きつけすぎて落とす ----
  var demo = { t: 0, x: W * 0.75, press: 0 };
  var DEMO_LEN = (SHOTS[2].A + 1.6) * SPB;
  var DEMO_AIM = [-0.02, -0.11, 0.12];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) initGame(true);
    if (running && cur < 3 && hitStop <= 0) {
      var sh = SHOTS[cur];
      demo.x += ((sh.side > 0 ? W * 0.75 : W * 0.25) - demo.x) * Math.min(1, dt * 6);
      if (songT + dt >= sh.A * SPB + DEMO_AIM[cur] && DEMO_AIM[cur] < LATE_W) { swingAction(sh.side); demo.press = 0.2; }
    }
    if (demo.press > 0) demo.press -= dt;
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (swingT > 0) swingT -= dt;
    if (sisSwingT > 0) sisSwingT -= dt;
    if (info && info.t > 0) info.t -= dt;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.x, H * 0.9, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.75);
      label(GAME_TITLE, W / 2, 110, 84 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.27, 56, C.yellow);
      else label('TAP TO START', W / 2, H * 0.27, 48, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.24, W, H * 0.34, C.ink, 0.82);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 100, won ? C.yellow : C.red);
      label('SCORE ' + score, W / 2, H * 0.37, 60, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.41, 36, C.blue);
      if (bestGap >= 0) {
        game.draw.sprite(SHUTTLE, { w: C.white, c: C.cork }, W / 2 - 110, H * 0.445 - 14, 8, { anchor: 'center' });
        label(bestGap + 'cm', W / 2 + 20, H * 0.445, 46, C.yellow);
      }
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.5, 54, C.red);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.5, 40, C.yellow);
      if (!won) label(nearMissCm >= 0 ? 'あと' + Math.max(1, nearMissCm - Math.round(GOOD_W * SPEED_CM)) + 'cm' : 'あと' + Math.max(1, SHOTS.length - cur) + '本', W / 2, H * 0.265, 52, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.55, 38, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, closestCm: bestGap };
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
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 120, C.yellow);
    if (over && won) label('FINISH', W / 2, H * 0.3, 110, C.yellow);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
