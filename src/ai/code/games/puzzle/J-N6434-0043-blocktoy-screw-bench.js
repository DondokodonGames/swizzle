// J-N6434-0043-blocktoy-screw-bench.js
// ブロック玩具のねじ締め台 — 飛び出たねじの山の数だけ正確に回して面一に締め、3段のブロック人形を時間内に組み上げる
// 操作: 光っているねじをタップすると1回転ぶん沈む。ねじ山が全部沈んだらそこで止める(余計に回すと板が割れる)
// 終わり: 3段(ねじ6本)を組み上げればCLEAR。締めすぎで2回割る/時間切れでGAME OVER
// @mechanic: count_exact
// @theme: blocktoy_screw_bench
// 世界観: 積み木細工の工房で組立係のブロック職人が、土台・胴・頭の3段を下から順にねじ留めし、出荷ベルが鳴る前に歩くブロック人形を1体組み上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 締めたねじの本数と残り時間のスコア
// スタイル: VOXEL BLOCK
var STYLE = { bg: ['#2d3b55', '#4f6d8f'], main: ['#e8b04a', '#c3813a', '#8a5426'], accent: ['#4fd18b', '#ff5a4f'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg1: '#2d3b55', bg2: '#4f6d8f', desk: '#8a5426', deskT: '#c3813a', deskL: '#6b3f1c',
    woodT: '#f4cf7a', woodF: '#e8b04a', woodS: '#b87c32',
    blueT: '#8fd0ff', blueF: '#4aa3e8', blueS: '#2c6fa8',
    redT: '#ff9d8a', redF: '#ef6a52', redS: '#a83a2c',
    steel: '#d7dde6', steelD: '#8792a3', good: '#4fd18b', bad: '#ff5a4f', gold: '#ffd24a', ink: '#141a26', white: '#ffffff',
  };

  var GAME_TITLE = 'SCREW BENCH';
  var TIME_LIMIT = 18;
  var NEEDED = 6;
  var MAX_CRACKS = 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // 3段: 下から土台・胴・頭。各段にねじ2本
  var PARTS = [
    { y: H * 0.7, w: 620, h: 150, t: C.woodT, f: C.woodF, s: C.woodS },
    { y: H * 0.56, w: 480, h: 200, t: C.blueT, f: C.blueF, s: C.blueS },
    { y: H * 0.43, w: 360, h: 170, t: C.redT, f: C.redF, s: C.redS },
  ];

  var WORKER_A = [
    '..hhhh..',
    '..hhhh..',
    '..ffff..',
    '..fkfk..',
    '.bbbbbb.',
    'fbbbbbbf',
    '..bbbb..',
    '..b..b..',
    '..d..d..',
  ];
  var WORKER_B = [
    '..hhhh..',
    '..hhhh..',
    '..ffff..',
    '..fkfk..',
    '.bbbbbbf',
    'fbbbbbb.',
    '..bbbb..',
    '..b..b..',
    '.d....d.',
  ];
  var WORKER_PAL = { h: C.gold, f: '#f2c9a0', k: C.ink, b: C.blueS, d: C.ink };
  var DRIVER = ['..rr..', '..rr..', '..rr..', '...s..', '...s..', '...s..', '...s..', '...s..'];
  var FACE = ['k....k', 'kk..kk', '......', '.wwww.', '.w..w.'];
  var CRACK = ['k...k.', '.k.k..', '..k...', '.k.k..', 'k...k.'];
  var BELL = ['..gg..', '.gggg.', '.gggg.', 'gggggg', '..kk..'];

  var stage, screws, cracks, done, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var dropAnim, workerKick, score, crackMarks;

  function makeScrews(si) {
    var p = PARTS[si];
    var lo = si === 0 ? 2 : 3, hi = si === 0 ? 3 : 5;
    var a = Math.floor(game.random(lo, hi + 0.99));
    var b = Math.floor(game.random(lo, hi + 0.99));
    if (a === b) b = a === hi ? a - 1 : a + 1;
    return [
      { x: W / 2 - p.w / 2 + 60, y: p.y - 10, left: a, total: a, spin: 0, glow: 0, over: 0 },
      { x: W / 2 + p.w / 2 - 60, y: p.y - 10, left: b, total: b, spin: 0, glow: 0, over: 0 },
    ];
  }

  function initGame() {
    stage = 0; screws = makeScrews(0); cracks = 0; done = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0; dropAnim = 0; workerKick = 0; score = 0; crackMarks = [];
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // ボクセル: 上面/正面/側面の3明度
  function voxel(cx, cy, w, h, top, front, side) {
    var d = 34;
    game.draw.rect(cx - w / 2 + d, cy - h / 2 - d, w, d, top);
    game.draw.rect(cx + w / 2, cy - h / 2 - d + 6, d, h, side);
    game.draw.rect(cx - w / 2, cy - h / 2, w, h, front);
    for (var gx = cx - w / 2 + 40; gx < cx + w / 2; gx += 80) game.draw.rect(gx, cy - h / 2, 4, h, side, 0.35);
  }

  function screwHit(x, y) {
    for (var i = 0; i < screws.length; i++) {
      var s = screws[i];
      if (Math.hypot(x - s.x, y - (s.y - s.left * 26)) < 105) return s;
    }
    return null;
  }

  function turnScrew(s, demoMode) {
    workerKick = 0.15;
    if (s.left > 0) {
      s.left--; s.spin++; s.glow = 0.2;
      game.audio.tone(220 + (s.total - s.left) * 90, 0.07, { wave: 'square', volume: 0.08 });
      game.audio.play('se_tap', 0.18);
      if (s.left === 0) {
        done++;
        score += 100;
        game.feedback.good(s.x, s.y - 60, { text: 'GOOD', color: C.good, count: 10 });
        if (screws[0].left === 0 && screws[1].left === 0) partDone(demoMode);
      }
    } else {
      // 締めすぎ: 板が割れる
      s.over = 0.5; cracks++;
      crackMarks.push({ x: s.x + 50, y: s.y + 20, st: stage });
      game.audio.play('se_break', 0.4);
      if (!demoMode && cracks >= MAX_CRACKS) {
        focus = s; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
      } else {
        game.feedback.bad(s.x, s.y - 60, { text: 'MISS' });
        if (demoMode && cracks >= MAX_CRACKS) cracks = 0;
      }
    }
  }

  function partDone(demoMode) {
    stage++;
    if (stage >= PARTS.length) {
      if (!demoMode) { focus = { toy: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true; score += Math.round(timeLeft * 20); }
      return;
    }
    game.audio.play('se_milestone', 0.4);
    game.fx.popup('NICE', W / 2, PARTS[stage].y - 200, { color: C.gold, size: 64 });
    screws = makeScrews(stage);
    dropAnim = 0.3;
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.bg1], [0.7, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    // 奥の棚(ボクセルの積み木在庫)
    for (var i = 0; i < 6; i++) {
      var bx = 90 + i * 180, by = H * 0.17 + Math.sin(game.time.elapsed * 1.2 + i) * 4;
      voxel(bx, by, 90, 70, i % 2 ? C.blueT : C.woodT, i % 2 ? C.blueF : C.woodF, i % 2 ? C.blueS : C.woodS);
    }
    // 作業台
    game.draw.rect(0, H * 0.76, W, 40, C.deskT);
    game.draw.rect(0, H * 0.76 + 40, W, H * 0.24, C.desk);
    for (var gy = H * 0.8; gy < H; gy += 60) game.draw.rect(0, gy, W, 6, C.deskL, 0.5);
    // 出荷ベル
    var ring = timeLeft !== undefined && timeLeft < 4 ? Math.sin(game.time.elapsed * 30) * 8 : Math.sin(game.time.elapsed * 2) * 3;
    game.draw.sprite(BELL, { g: C.gold, k: C.ink }, W * 0.9 + ring, H * 0.14, 14, { anchor: 'center' });
  }

  function drawToy() {
    var sway = Math.sin(game.time.elapsed * 1.5) * 3;
    var maxShow = Math.min(stage, PARTS.length - 1);
    for (var i = 0; i <= maxShow; i++) {
      var p = PARTS[i];
      var dy = (i === stage && dropAnim > 0) ? -dropAnim * 900 : 0;
      var hl = focus && focus.toy;
      voxel(W / 2 + sway * (i + 1) * 0.3, p.y + p.h / 2 + dy, p.w, p.h, hl ? C.white : p.t, p.f, p.s);
      if (i === 2) game.draw.sprite(FACE, { k: C.ink, w: C.white }, W / 2 + sway, p.y + p.h / 2 + dy, 16, { anchor: 'center' });
      if (i === 1) game.draw.circle(W / 2 + sway * 0.6, p.y + p.h / 2 + dy, 26, Math.floor(game.time.elapsed * 3) % 2 ? C.gold : C.good);
    }
    for (var c = 0; c < crackMarks.length; c++) {
      var cm = crackMarks[c];
      if (cm.st <= maxShow) game.draw.sprite(CRACK, { k: C.ink }, cm.x, cm.y, 12, { anchor: 'center' });
    }
    if (hitStop > 0 && focus && focus.toy) game.draw.circle(W / 2, H * 0.55, 420, C.white, 0.25 + 0.2 * Math.sin(game.time.elapsed * 30));
  }

  function drawScrews(active) {
    if (stage >= PARTS.length) return;
    var dy = dropAnim > 0 ? -dropAnim * 900 : 0;
    for (var i = 0; i < screws.length; i++) {
      var s = screws[i];
      var top = s.y - s.left * 26 + dy;
      var hl = focus === s;
      var jitter = s.over > 0 ? Math.sin(game.time.elapsed * 60) * 8 : 0;
      // 軸(ねじ山=残り回数)
      for (var b = 0; b < s.left; b++) {
        game.draw.rect(s.x - 22 + jitter, s.y - (b + 1) * 26 + dy, 44, 20, C.steel);
        game.draw.rect(s.x - 22 + jitter, s.y - (b + 1) * 26 + 14 + dy, 44, 6, C.steelD);
      }
      // 頭
      var ready2 = s.left > 0 && active;
      var blink = ready2 && Math.floor(game.time.elapsed * 5) % 2 === 0;
      if (blink || hl) game.draw.circle(s.x + jitter, top - 16, hl ? 96 : 64, C.white, hl ? 0.8 : 0.5);
      game.draw.circle(s.x + jitter, top - 16, 52, s.left === 0 ? C.good : (s.over > 0 ? C.bad : C.steelD));
      game.draw.circle(s.x + jitter, top - 20, 46, s.left === 0 ? '#9ff0c2' : C.steel);
      // 溝の向きが回転ごとに変わる
      var ang = s.spin * Math.PI / 4;
      var ex = Math.cos(ang) * 34, ey = Math.sin(ang) * 34;
      game.draw.line(s.x - ex + jitter, top - 20 - ey, s.x + ex + jitter, top - 20 + ey, C.ink, 12);
      if (s.glow > 0) game.draw.circle(s.x, top - 20, 70, C.gold, s.glow * 2);
    }
  }

  function drawWorker(pose) {
    var bob = Math.sin(game.time.elapsed * 3) * 5;
    var sway = Math.cos(game.time.elapsed * 1.7) * 4;
    var frame = workerKick > 0 || Math.floor(game.time.elapsed * 2) % 2 ? WORKER_B : WORKER_A;
    if (pose === 'down') {
      game.draw.sprite(WORKER_A, WORKER_PAL, W * 0.18, H * 0.9, 16, { anchor: 'center', flipY: true });
      return;
    }
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 7)) * 70 : 0;
    game.draw.sprite(frame, WORKER_PAL, W * 0.18 + sway, H * 0.87 + bob + jump, 16, { anchor: 'center' });
    game.draw.sprite(DRIVER, { r: C.bad, s: C.steel }, W * 0.3 + sway, H * 0.86 + bob + jump - (workerKick > 0 ? 30 : 0), 12, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.11, C.ink, 0.6);
    for (var i = 0; i < NEEDED; i++) {
      var filled = i < done;
      game.draw.circle(W * 0.08 + i * 78, H * 0.045, 28, filled ? C.good : C.steelD);
      game.draw.line(W * 0.08 + i * 78 - 18, H * 0.045, W * 0.08 + i * 78 + 18, H * 0.045, C.ink, 6);
    }
    txt(done + '/' + NEEDED, W * 0.72, H * 0.045, 54, C.white);
    for (var k = 0; k < MAX_CRACKS; k++) game.draw.sprite(CRACK, { k: k < cracks ? C.bad : C.steelD }, W * 0.88 + k * 70, H * 0.045, 9, { anchor: 'center' });
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.093, W - 120, 22, C.ink);
    game.draw.rect(60, H * 0.093, (W - 120) * frac, 22, low ? C.bad : C.gold);
  }

  // ── ATTRACTデモ: 1本目はぴったり、2本目はわざと1回締めすぎて割る ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, next: 0, count: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.next = 0.6; demo.count = 0; }
    timeLeft -= dt * 0.5;
    if (dropAnim > 0) dropAnim = Math.max(0, dropAnim - dt);
    workerKick = Math.max(0, workerKick - dt);
    for (var i = 0; i < screws.length; i++) { screws[i].glow = Math.max(0, screws[i].glow - dt); screws[i].over = Math.max(0, screws[i].over - dt); }
    var target = null;
    for (var j = 0; j < screws.length; j++) if (screws[j].left > 0) { target = screws[j]; break; }
    if (!target && stage >= PARTS.length) { demo.press = false; return; }
    var aimS = target || screws[1];
    var tx = aimS.x, ty = aimS.y - aimS.left * 26 - 10;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 12);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 12);
    demo.next -= dt;
    demo.press = demo.next < 0.1;
    if (demo.next <= 0 && dropAnim <= 0 && Math.hypot(tx - demo.gx, ty - demo.gy) < 40) {
      demo.next = 0.22;
      demo.count++;
      if (target) turnScrew(target, true);
      // 胴の段で1回だけ締めすぎの失敗例を見せる
      if (stage === 1 && screws[0].left === 0 && screws[0].over <= 0 && demo.count < 40 && !demo.shown) { demo.shown = true; turnScrew(screws[0], true); }
    }
    if (cyc < dt * 2) demo.shown = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished || ready > 0.3 || dropAnim > 0) return;
    var s = screwHit(x, y);
    if (s) {
      turnScrew(s, false);
    } else {
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: C.steel, count: 3, speed: 140 });
    }
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(W / 2, H * 0.45, { text: 'CLEAR', color: C.gold, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      var fx0 = focus && focus.x !== undefined ? focus.x : W / 2;
      game.feedback.bad(fx0, H * 0.5, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.4);

    if (state === S.ATTRACT) {
      if (screws === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawToy();
      drawScrews(true);
      drawWorker('');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.ink, 0.55);
      txt(GAME_TITLE, W / 2, H * 0.045, 78, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBg(pulse);
      drawToy();
      drawWorker(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.35, { color: C.gold, count: 3 });
      game.draw.rect(0, H * 0.22, W, H * 0.2, C.ink, 0.65);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.26, 100, ok ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.32, 56, C.white);
      if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.38, 48, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.38, 42, C.white);
      if (!ok) txt('あと' + (NEEDED - done) + '本!', W / 2, H * 0.62, 50, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40, C.white);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { screws: done, cracks: cracks });
        else game.end.failure({ screws: done, cracks: cracks });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      if (dropAnim > 0) dropAnim = Math.max(0, dropAnim - dt);
      workerKick = Math.max(0, workerKick - dt);
      for (var i = 0; i < screws.length; i++) { screws[i].glow = Math.max(0, screws[i].glow - dt); screws[i].over = Math.max(0, screws[i].over - dt); }
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.3, { color: C.bad, size: 80 });
      }
    }

    drawBg(pulse);
    drawToy();
    drawScrews(!finished && ready <= 0);
    drawWorker('');
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['D5', 0.5], ['G4', 1.5], [0, 0.5],
    ], { tempo: 138, wave: 'triangle', volume: 0.07, loop: true, bass: [['G2', 2], ['C3', 2], ['D3', 2], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
