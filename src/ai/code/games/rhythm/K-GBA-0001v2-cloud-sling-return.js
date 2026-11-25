// K-GBA-0001v2-cloud-sling-return.js
// 雲返しスリング — 漂い寄る綿雲が打点の輪に着く拍の頭で、引き絞ったゴム腕を放して空へ打ち返す
// 操作: 指を置いて引くとゴム腕が伸び、引いた向きの反対(左/中/右レーン)へ飛ぶ。雲が打点の輪に着く拍の頭で指を離す
// 終わり: 8小節(約17秒)を乗り切ればCLEAR。綿雲を3つ観測所へ素通しさせるとGAME OVER
// @mechanic: slingshot
// @theme: sky_station_cloud_sling
// 世界観: 雲海の上の気象観測所。ゴム仕掛けの腕を持つ整備ロボットが、拍に乗って漂い寄る綿雲の塊を空へ押し返す
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面は横ストリップのベタ塗り、輪郭は line、頂点ジッター、遠景はフォグで潰す
  var STYLE = { bg: ['#2c4a7c', '#7ea6d0', '#cfdce8'], main: ['#f4f6fa', '#a9b8cc', '#e89a3c'], accent: ['#ff5a4a', '#4ef0c0'] };
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], fog: STYLE.bg[2],
    cloud: STYLE.main[0], cloudSh: STYLE.main[1], robo: STYLE.main[2],
    bad: STYLE.accent[0], good: STYLE.accent[1],
    gold: '#ffd84a', ink: '#141c30', steel: '#6c7a92', steelDk: '#3a445a', rubber: '#e2507e',
    wall: '#8c98ac', wallDk: '#5c667c', dome: '#c6d0dc', domeHi: '#e8eef4', white: '#ffffff'
  };

  var GAME_TITLE = 'CLOUD SLING';
  var BPM = 112;
  var SPB = 60 / BPM;
  var BARS = 8;
  var SONG_BEATS = BARS * 4;
  var LEAD = 2;                 // 雲は着く2拍前に現れる(予告)
  var WIN_P = 0.07, WIN_G = 0.15;
  var LIVES = 3;
  var LANES = [W * 0.22, W * 0.5, W * 0.78];
  var SPAWN_Y = H * 0.15, STRIKE_Y = H * 0.45;
  var RX = W * 0.5, RY = H * 0.58;
  var PAD_X = W * 0.5, PAD_Y = H * 0.8;
  var MAXPULL = 320, MINPULL = 0.4;
  // [着く拍, レーン]。表拍(1・3拍目)に着く。終盤は2・4拍目にも着いて詰まる
  var CHART = [[2, 1], [4, 1], [6, 0], [8, 2], [10, 1], [12, 0], [14, 2], [16, 1], [18, 2], [20, 0], [22, 1], [24, 0], [26, 2], [27, 1], [28, 0], [30, 2], [31, 1]];
  var DEMO_CHART = [[2, 1], [4, 0], [6, 2]];
  var DEMO_BEATS = 9;
  // 伴奏(8分刻みのステップ)。0 は休符
  var MEL = ['E5', 0, 'G5', 0, 'A5', 0, 'G5', 'E5', 'D5', 0, 'E5', 0, 'G5', 0, 'C5', 0];
  var BASS = ['C3', 'C3', 'G2', 'G2', 'A2', 'A2', 'F2', 'G2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, gx: PAD_X, gy: PAD_Y };

  // 整備ロボット(Y字に上げた腕の間にゴムを張る)
  var ROBO_A = [
    '.....y.....',
    '.....d.....',
    'd.ooooooo.d',
    'd.oeeoeeo.d',
    'dd.ooooo.dd',
    '.ddddddddd.',
    '..ooooooo..',
    '..ooddooo..',
    '..ooooooo..',
    '...d...d...',
    '..dd...dd..'
  ];
  var ROBO_B = [
    '.....y.....',
    '.....d.....',
    'd.ooooooo.d',
    'd.oeeoeeo.d',
    'dd.ooooo.dd',
    '.ddddddddd.',
    '..ooooooo..',
    '..oooddoo..',
    '..ooooooo..',
    '..d.....d..',
    '.dd.....dd.'
  ];
  var ROBO_PULL = [
    '.....y.....',
    '.....d.....',
    'd.ooooooo.d',
    'd.oddoddo.d',
    'dd.ooooo.dd',
    '.ddddddddd.',
    '..ooooooo..',
    '..ooddooo..',
    '..ooooooo..',
    '..dd...dd..',
    '.dd.....dd.'
  ];
  var ROBO_OOPS = [
    '.....y.....',
    '.....d.....',
    'd.ooooooo.d',
    'd.oeoooeo.d',
    'dd.oeeeo.dd',
    '.ddddddddd.',
    '..ooooooo..',
    '..ooddooo..',
    '..ooooooo..',
    '...d...d...',
    '..dd...dd..'
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // 凸多角形を横ストリップで塗る(yMax 指定で上側だけ塗る=光の面)
  function fillPoly(pts, col, yMax) {
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < pts.length; i++) {
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    if (yMax !== undefined && yMax < maxY) maxY = yMax;
    for (var y = Math.floor(minY); y <= maxY; y += 2) {
      var xl = 1e9, xr = -1e9;
      for (var j = 0; j < pts.length; j++) {
        var a = pts[j], b = pts[(j + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          var x = a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
          if (x < xl) xl = x;
          if (x > xr) xr = x;
        }
      }
      if (xr > xl) game.draw.rect(xl, y, xr - xl, 2, col);
    }
  }
  function edgePoly(pts, col, w) {
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      game.draw.line(a[0], a[1], b[0], b[1], col, w);
    }
  }
  function ringPts(cx, cy, r, n, sq) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.PI / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sq || 1)]);
    }
    return pts;
  }

  function newRun(isDemo) {
    var chart = isDemo ? DEMO_CHART : CHART;
    var clouds = [];
    for (var i = 0; i < chart.length; i++) {
      clouds.push({ beat: chart[i][0], lane: chart[i][1], st: 'wait', y: SPAWN_Y, p: 0, vy: 0, flash: 0, seed: i * 1.7 + 0.4 });
    }
    return {
      demo: isDemo, clouds: clouds, songT: 0, beatIdx: -1, stepIdx: -1,
      ready: isDemo ? 0 : 0.8, lives: LIVES, score: 0, combo: 0, maxCombo: 0,
      perfect: 0, good: 0, miss: 0, pull: null, lastStep: 0,
      shotT: 0, shotLane: 1, pulse: 0, fog: 0, oops: 0,
      stop: 0, stopCloud: null, over: false, ok: false, endWait: 0
    };
  }

  function startAttractBgm() {
    game.audio.melody([
      ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['C5', 0.5], ['R', 0.5]
    ], {
      tempo: BPM, wave: 'square', volume: 0.05, loop: true,
      bass: [['C3', 1], ['C3', 1], ['G2', 1], ['G2', 1], ['A2', 1], ['A2', 1], ['F2', 1], ['G2', 1]]
    });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 拍クロックから鳴らす伴奏: 表拍にキック、1・3拍目を強く
  function playStep(s) {
    var m = MEL[s % 16];
    if (m) game.audio.tone(m, SPB * 0.4, { wave: 'square', volume: 0.05 });
    if (s % 2 === 0) {
      var b = (s / 2) % 8;
      game.audio.tone(BASS[b], SPB * 0.8, { wave: 'triangle', volume: 0.09 });
      game.audio.tone(b % 2 === 0 ? 120 : 95, 0.07, { wave: 'square', volume: b % 2 === 0 ? 0.09 : 0.05, slide: -70 });
    }
  }

  function pullInfo(p) {
    var dx = p.x - p.x0, dy = p.y - p.y0;
    var len = Math.min(MAXPULL, Math.sqrt(dx * dx + dy * dy));
    var power = len / MAXPULL;
    var sx = -dx, sy = -dy;                       // 発射は引いた向きの反対
    var ang = Math.atan2(sx, -sy) * 180 / Math.PI; // 0=真上 / 負=左
    var lane = ang < -20 ? 0 : (ang > 20 ? 2 : 1);
    var valid = power >= MINPULL && sy < 0 && Math.abs(ang) < 80;
    return { power: power, lane: lane, valid: valid, dx: dx, dy: dy, len: len };
  }

  function beginPull(x, y) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return false;
    R.pull = { x0: x, y0: y, x: x, y: y };
    R.lastStep = 0;
    return true;
  }
  function movePull(x, y) {
    if (!R || !R.pull) return 0;
    R.pull.x = x; R.pull.y = y;
    var step = Math.floor(pullInfo(R.pull).power * 3);
    if (step > R.lastStep) { R.lastStep = step; return step; }
    return 0;
  }
  function releasePull() {
    if (!R || !R.pull) return 'none';
    var info = pullInfo(R.pull);
    R.pull = null;
    if (R.stop > 0 || !info.valid) return 'weak';
    R.shotLane = info.lane; R.shotT = 0.24;
    var best = null, bestD = 1e9;
    for (var i = 0; i < R.clouds.length; i++) {
      var c = R.clouds[i];
      if (c.lane !== info.lane || c.st !== 'fly') continue;
      var d = R.songT - c.beat * SPB;
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = c; }
    }
    if (!best || Math.abs(bestD) > WIN_G) return 'whiff';
    var grade = Math.abs(bestD) <= WIN_P ? 'PERFECT' : 'GOOD';
    hitCloud(best, grade);
    return grade;
  }

  function hitCloud(c, grade) {
    c.st = 'back'; c.vy = -1500; c.flash = 0.2;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    var x = LANES[c.lane];
    game.feedback.good(x, STRIKE_Y, { text: grade, color: grade === 'PERFECT' ? C.gold : C.good, count: grade === 'PERFECT' ? 18 : 10 });
    game.fx.burst(x, STRIKE_Y, { color: C.cloud, count: 14, speed: 360, gravity: -200 });
    if (!R.demo && grade === 'PERFECT') game.audio.tone('C6', 0.08, { wave: 'square', volume: 0.07 });
    if (!R.demo && R.combo > 0 && R.combo % 6 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.3, { color: C.gold, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function missCloud(c) {
    c.st = 'stop';
    R.combo = 0; R.miss++; R.lives--;
    R.stop = 0.42; R.stopCloud = c; c.flash = 0.42; R.oops = 1.2;
    if (!R.demo) game.audio.tone(170, 0.25, { wave: 'sawtooth', volume: 0.1, slide: -80 });
  }

  function releaseStop() {
    var c = R.stopCloud;
    R.stopCloud = null;
    if (!c) return;
    c.st = 'gone';
    var x = LANES[c.lane];
    game.feedback.bad(x, c.y, { text: 'MISS' });
    game.fx.burst(x, H * 0.62, { color: C.fog, count: 22, speed: 420 });
    R.fog = 0.9;
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8; R.pull = null;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 3; i++) game.fx.burst(LANES[i], H * 0.3, { color: i === 1 ? C.gold : C.good, count: 24, speed: 480 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.2, { color: C.gold, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pulse = Math.max(0, R.pulse - dt * 3);
    R.shotT = Math.max(0, R.shotT - dt);
    R.fog = Math.max(0, R.fog - dt);
    R.oops = Math.max(0, R.oops - dt);
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
    var bi = Math.floor(R.songT / SPB);
    while (R.beatIdx < bi) { R.beatIdx++; R.pulse = 1; }
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; if (!R.demo) playStep(R.stepIdx); }
    for (var i = 0; i < R.clouds.length; i++) {
      var c = R.clouds[i];
      var tArr = c.beat * SPB;
      if (c.flash > 0) c.flash -= dt;
      if (c.st === 'wait' && R.songT >= tArr - LEAD * SPB) {
        c.st = 'fly';
        // 予告音: レーンごとに音程が違う
        if (!R.demo) game.audio.tone(['C6', 'E6', 'G6'][c.lane], 0.05, { wave: 'triangle', volume: 0.06 });
      }
      if (c.st === 'fly') {
        c.p = (R.songT - (tArr - LEAD * SPB)) / (LEAD * SPB);
        c.y = SPAWN_Y + (STRIKE_Y - SPAWN_Y) * c.p;
        if (R.songT > tArr + WIN_G) { missCloud(c); return; }
      } else if (c.st === 'back') {
        c.vy -= 900 * dt;
        c.y += c.vy * dt;
        if (c.y < -260) c.st = 'gone';
      }
    }
    if (!R.demo && R.songT >= SONG_BEATS * SPB) endRun(true);
  }

  // ATTRACT: 実ロジックをゴーストが遊ぶ(2つ打ち返し、3つ目は見送って失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB + 0.6);
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.press = false; }
    var next = null;
    for (var i = 0; i < R.clouds.length; i++) {
      if (R.clouds[i].st === 'wait' || R.clouds[i].st === 'fly') { next = R.clouds[i]; break; }
    }
    if (next && next !== R.clouds[2]) {
      var dtA = next.beat * SPB - R.songT;
      var pullX = [160, 0, -160][next.lane];
      if (!R.pull && dtA > 0 && dtA < SPB * 0.95 && R.stop <= 0) beginPull(PAD_X, PAD_Y);
      if (R.pull) {
        var k = Math.max(0, Math.min(1, (SPB * 0.95 - dtA) / (SPB * 0.5)));
        movePull(PAD_X + pullX * k, PAD_Y + 260 * k);
        if (dtA <= 0) releasePull();
      }
    }
    var tx = R.pull ? R.pull.x : PAD_X + 150, ty = R.pull ? R.pull.y : PAD_Y + 110;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 14);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 14);
    demo.press = !!R.pull;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBand(y0, amp, col, speed, seed, yBottom) {
    var e = game.time.elapsed;
    var prevX = -60, prevY = y0 + Math.sin(seed) * amp;
    for (var x = 60; x <= W + 120; x += 120) {
      var yy = y0 + Math.sin(seed + x * 0.013 + e * speed) * amp;
      fillPoly([[prevX, prevY], [x, yy], [x, yBottom], [prevX, yBottom]], col);
      prevX = x; prevY = yy;
    }
  }

  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky0], [0.55, C.sky1], [1, C.fog]]);
    // 遠景の雲海(フォグで潰す)
    drawBand(H * 0.55, 26, '#b4c6da', 0.3, 1.2, H * 0.62);
    game.draw.rect(0, H * 0.5, W, H * 0.14, C.fog, 0.35 + 0.05 * Math.sin(e * 1.4));
    // レーンのガイド
    for (var i = 0; i < 3; i++) {
      game.draw.line(LANES[i], SPAWN_Y, LANES[i], STRIKE_Y, C.white, 4);
    }
  }

  function drawStation() {
    var bx = W * 0.5, by = H * 0.69;
    fillPoly([[bx - 220, by], [bx + 160, by], [bx + 160, by + 170], [bx - 220, by + 170]], C.wall);
    fillPoly([[bx + 160, by], [bx + 230, by - 30], [bx + 230, by + 140], [bx + 160, by + 170]], C.wallDk);
    for (var w = 0; w < 4; w++) game.draw.rect(bx - 190 + w * 88, by + 50, 46, 40, C.steelDk);
    var dome = [];
    for (var i = 0; i <= 8; i++) {
      var a = Math.PI + (i / 8) * Math.PI;
      dome.push([bx - 30 + Math.cos(a) * 180, by + Math.sin(a) * 150]);
    }
    fillPoly(dome, C.dome);
    fillPoly(dome, C.domeHi, by - 95);
    edgePoly(dome, C.steelDk, 3);
    game.draw.line(bx - 30, by - 150, bx - 30, by, C.steelDk, 12);
  }

  function drawCloud(c) {
    var x = LANES[c.lane];
    var white = c.st === 'stop' && Math.floor(game.time.elapsed * 20) % 2 === 0;
    var r = (70 + 32 * Math.min(1, c.p)) * (c.st === 'stop' ? 1.35 : 1) * (1 + R.pulse * 0.05);
    var e = game.time.elapsed;
    var pts = [];
    for (var i = 0; i < 9; i++) {
      var a = (i / 9) * Math.PI * 2;
      var rr = r * (0.8 + 0.2 * Math.sin(c.seed * 3 + i * 2.3));
      pts.push([x + Math.cos(a) * rr + Math.sin(e * 23 + i * 1.7) * 2, c.y + Math.sin(a) * rr * 0.68 + Math.cos(e * 19 + i * 2.1) * 2]);
    }
    if (c.st === 'stop') {
      fillPoly(pts, white ? C.white : C.bad);
    } else {
      fillPoly(pts, C.cloudSh);
      fillPoly(pts, c.flash > 0 ? C.white : C.cloud, c.y + r * 0.05);
    }
    edgePoly(pts, C.steel, 3);
    // 綿雲の顔
    var blink = Math.floor(e * 1.3 + c.seed) % 4 === 0;
    game.draw.rect(x - r * 0.32, c.y - r * 0.12, 12, blink ? 4 : 16, C.ink);
    game.draw.rect(x + r * 0.32 - 12, c.y - r * 0.12, 12, blink ? 4 : 16, C.ink);
  }

  function drawStrikeMarks() {
    for (var i = 0; i < 3; i++) {
      var soon = null;
      for (var j = 0; j < R.clouds.length; j++) {
        var c = R.clouds[j];
        if (c.lane === i && c.st === 'fly') { soon = c; break; }
      }
      var base = 104 + R.pulse * 10;
      var col = C.white;
      if (soon) {
        var dtA = soon.beat * SPB - R.songT;
        // 迫る輪: 着く拍で打点の輪と重なる
        var ar = 104 + Math.max(0, dtA) / (LEAD * SPB) * 220;
        edgePoly(ringPts(LANES[i], STRIKE_Y, ar, 8, 0.7), C.gold, 4);
        if (dtA < SPB && Math.floor(game.time.elapsed * 10) % 2 === 0) col = C.bad;
      }
      if (R.pull) {
        var info = pullInfo(R.pull);
        if (info.lane === i) col = info.valid ? C.good : C.bad;
      }
      edgePoly(ringPts(LANES[i], STRIKE_Y, base, 8, 0.7), col, 6);
    }
  }

  function drawRobot() {
    var e = game.time.elapsed;
    var bob = Math.sin(e * 4) * 4;
    var frame = R.oops > 0 ? ROBO_OOPS : (R.pull ? ROBO_PULL : (Math.floor(e * 3) % 2 === 0 ? ROBO_A : ROBO_B));
    var pal = { o: C.robo, d: C.steelDk, e: C.good, y: R.pulse > 0.4 ? C.gold : C.steel };
    var pL = [RX - 62, RY - 32 + bob], pR = [RX + 62, RY - 32 + bob];
    var fx = RX, fy = RY - 40 + bob;
    if (R.pull) {
      var info = pullInfo(R.pull);
      var k = info.len / Math.max(1, Math.sqrt(info.dx * info.dx + info.dy * info.dy) || 1);
      fx = RX + info.dx * k * 0.55; fy = RY - 40 + info.dy * k * 0.55;
      // 照準の点線
      var sx = -info.dx, sy = -info.dy;
      if (sy < -1) {
        var tLen = (STRIKE_Y - (RY - 40)) / sy;
        for (var d = 1; d <= 6; d++) {
          var q = d / 6;
          game.draw.circle(RX + sx * tLen * q, RY - 40 + sy * tLen * q, 8, info.valid ? C.good : C.bad);
        }
      }
    } else if (R.shotT > 0) {
      var tt = 1 - R.shotT / 0.24;
      var out = tt < 0.5 ? tt * 2 : (1 - tt) * 2;
      fx = RX + (LANES[R.shotLane] - RX) * out;
      fy = (RY - 40) + (STRIKE_Y + 40 - (RY - 40)) * out;
    }
    game.draw.sprite(frame, pal, RX, RY + 20 + bob, 12, { anchor: 'center' });
    game.draw.line(pL[0], pL[1], fx, fy, C.rubber, 10);
    game.draw.line(pR[0], pR[1], fx, fy, C.rubber, 10);
    edgePoly(ringPts(fx, fy, 30, 6, 1), C.steelDk, 6);
    fillPoly(ringPts(fx, fy, 26, 6, 1), C.robo);
  }

  function drawPad() {
    var glow = 0.5 + 0.5 * Math.sin(game.time.elapsed * 5);
    edgePoly(ringPts(PAD_X, PAD_Y, 120 + glow * 10, 8, 0.6), C.white, 4);
  }

  function drawWorld() {
    drawBg();
    for (var i = 0; i < R.clouds.length; i++) {
      var c = R.clouds[i];
      if (c.st === 'fly' || c.st === 'back' || c.st === 'stop') drawCloud(c);
    }
    drawStrikeMarks();
    drawStation();
    drawRobot();
    drawBand(H * 0.76, 22, '#e2eaf2', 0.6, 3.1, H);
    drawPad();
    if (R.fog > 0) game.draw.rect(0, H * 0.55, W, H * 0.45, C.white, R.fog * 0.5);
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 70, 44, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 70, 34, C.gold, 'right');
    for (var i = 0; i < LIVES; i++) {
      var on = i < R.lives;
      fillPoly(ringPts(W - 70 - i * 64, 150, 22, 6, 0.8), on ? C.domeHi : C.steelDk);
    }
    // 拍ランプ(1小節4つ。1・3拍目は大きい)
    var inBar = R.ready > 0 ? -1 : ((R.beatIdx % 4) + 4) % 4;
    for (var b = 0; b < 4; b++) {
      var big = b % 2 === 0;
      var lit = b === inBar && R.pulse > 0.2;
      game.draw.circle(W / 2 - 150 + b * 100, 150, big ? 24 : 16, lit ? C.gold : C.steelDk);
    }
    var progress = Math.min(1, R.songT / (SONG_BEATS * SPB));
    game.draw.rect(40, 200, W - 80, 14, C.steelDk);
    game.draw.rect(40, 200, (W - 80) * progress, 14, C.good);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.51, 40, C.gold);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.34, 96, C.gold);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.22, W, H * 0.32, C.ink, 0.75);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.28, 92, R.ok ? C.good : C.bad);
    txt('SCORE ' + R.score, W / 2, H * 0.35, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.4, 34, C.cloud);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.44, 34, C.cloud);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.49, 48, C.gold);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.49, 40, C.gold);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS * SPB - R.songT) / (4 * SPB)));
      txt('あと' + left + '小節', W / 2, H * 0.53, 44, C.gold);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, H * 0.07 + 6 + bob, { size: 104, color: C.ink, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, H * 0.07 + bob, { size: 104, color: C.robo, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2 - 2, H * 0.07 + bob - 4, { size: 104, color: C.gold, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, H * 0.115, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, C.gold);
    else txt('INSERT COIN', W / 2, H * 0.95, 40, C.white);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (beginPull(x, y)) game.audio.tone(330, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var step = movePull(x, y);
    if (step > 0) game.audio.tone(220 + step * 110, 0.04, { wave: 'triangle', volume: 0.06 });
  });
  game.onRelease(function() {
    if (state !== S.PLAYING || !R || !R.pull) return;
    var res = releasePull();
    if (res === 'whiff') {
      game.audio.play('se_jump', 0.35);
      game.fx.burst(LANES[R.shotLane], STRIKE_Y, { color: C.fog, count: 6, speed: 160 });
    } else if (res === 'weak') {
      game.audio.tone(160, 0.08, { wave: 'square', volume: 0.06 });
      game.fx.burst(RX, RY - 40, { color: C.rubber, count: 5, speed: 120 });
    }
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
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
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
