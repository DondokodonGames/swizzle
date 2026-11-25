// J-GC4-0019-chestnut-branch-grip.js
// 栗の木しがみつき — 大木が揺すられる直前に光る2つのこぶを2本指で同時につかみ、揺れに耐えて他の子を振り落とす
// 操作: 揺れの予告(葉がざわつき、こぶが2つ光る)の間に、2本の指で両方のこぶを押さえたまま揺れを迎える
// 終わり: 6回耐えればCLEAR。揺れの瞬間に2つともつかめていないと落ちてGAME OVER
// @mechanic: pinch_zone
// @theme: chestnut_tree_shake_hold
// 世界観: 秋の栗林の大木で、ムササビの子が揺すり合いの遊びに挑み、揺れのたびに枝のこぶを両手でつかんで耐え、ほかの枝の子たちを先に振り落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 耐えた回数・ぎりぎり早づかみのスコア
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒線、明暗2段の塗り
  var STYLE = { bg: ['#ffd9a0', '#ff9f68', '#b8604a'], main: ['#8a5530', '#5e3820'], accent: ['#ffe14a', '#ff4a5a'] };
  var C = {
    sky0: '#ffe9c0', sky1: '#ffb784', sky2: '#d9785a', line: '#1c1010', trunk: '#8a5530', trunkDark: '#5e3820',
    leaf: '#e8a030', leafDark: '#b86a1a', knot: '#ffe14a', knotDark: '#c9a020', good: '#4ad98a', bad: '#ff4a5a',
    ink: '#fff8ea', gold: '#ffe14a'
  };

  var GAME_TITLE = 'BRANCH GRIP';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var BRANCH_Y = Math.round(H * 0.5);
  var GRIP_R = 115;
  var HUD_Y = Math.round(H * 0.06);
  var THUMB_Y = Math.round(H * 0.84);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SQUIRREL = [
    ['.ll....ll.', '.lbbbbbbl.', 'lbwwbbwwbl', 'lbwkbbkwbl', 'lbbbnnbbbl', 'llbbbbbbll', 'lbbccccbbl', '.ll.ll.ll.'],
    ['.ll....ll.', '.lbbbbbbl.', 'lbwwbbwwbl', 'lbkwbbwkbl', 'lbbbnnbbbl', 'llbbbbbbll', 'lbbccccbbl', 'll..ll..ll']
  ];
  var SQ_PAL = { l: '#1c1010', b: '#b8804a', w: '#fff8ea', k: '#1c1010', n: '#ff8a8a', c: '#f0d0a0' };
  var RIVAL = ['.l..l.', 'llllll', 'lwllwl', 'llllll', '.llll.'];
  var CHESTNUT = ['..k..', '.kbk.', 'kbbbk', 'kbhbk', '.kkk.'];
  var CHESTNUT_PAL = { k: '#1c1010', b: '#8a4a20', h: '#d08a50' };

  var knots, shakeNo, phase, phaseT, teleT, held, survived, fastGrips, timeLeft, rivals, fallT, shakeAmt, nuts;
  var ready, hitStop, finished, done, endWait, ok, milestone, failKnot;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.line, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function placeKnots() {
    var spread = 170 + Math.min(4, shakeNo) * 40;
    var cx = W / 2 + game.random(-120, 120);
    knots = [
      { x: Math.max(120, cx - spread), y: BRANCH_Y + game.random(-30, 30), got: false },
      { x: Math.min(W - 120, cx + spread), y: BRANCH_Y + game.random(-30, 30), got: false }
    ];
  }

  function initGame() {
    shakeNo = 0; survived = 0; fastGrips = 0; timeLeft = TIME_LIMIT;
    phase = 'rest'; phaseT = 0.5; teleT = 0.75; held = 0; fallT = 0; shakeAmt = 0; nuts = [];
    rivals = [];
    for (var i = 0; i < NEEDED; i++) rivals.push({ x: 110 + (i % 3) * 430 + (i > 2 ? 200 : 0), y: H * (i > 2 ? 0.36 : 0.27), down: 0 });
    placeKnots();
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = false; failKnot = -1;
  }

  // 実ロジック: 指の位置(配列)でこぶを押さえているか判定
  function gripState(points) {
    var n = 0;
    for (var k = 0; k < knots.length; k++) {
      knots[k].got = false;
      for (var i = 0; i < points.length; i++) {
        if (Math.hypot(points[i].x - knots[k].x, points[i].y - knots[k].y) < GRIP_R) { knots[k].got = true; break; }
      }
      if (knots[k].got) n++;
    }
    return n;
  }

  function impact(points, isDemo) {
    var n = gripState(points);
    shakeAmt = 0.35;
    game.audio.play('se_break', 0.35);
    for (var i = 0; i < 5; i++) nuts.push({ x: game.random(80, W - 80), y: H * 0.2, vy: game.random(100, 400), t: 1.2 });
    if (n >= 2) {
      survived++;
      var fast = held > 0.35;
      if (fast) fastGrips++;
      var r = rivals[Math.min(rivals.length - 1, survived - 1)];
      r.down = 0.01;
      game.feedback.good(W / 2, BRANCH_Y - 200, { text: fast ? 'PERFECT' : 'GOOD', color: C.good, count: 14 });
      if (!isDemo && survived === 3 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(survived + ' / ' + NEEDED, W / 2, H * 0.4, { color: C.gold, size: 64 });
      }
      if (!isDemo && survived >= NEEDED) { winGame(); return; }
    } else {
      failKnot = knots[0].got ? 1 : 0;
      game.feedback.bad(knots[failKnot].x, knots[failKnot].y, { text: 'MISS', color: C.bad, shake: 14 });
      if (!isDemo) { fallT = 0.01; loseGame(); return; }
      fallT = 0.01;
    }
    shakeNo++;
    phase = 'shake'; phaseT = 0.3;
  }

  function stepWorld(dt, points, isDemo) {
    phaseT -= dt;
    if (phase === 'rest') {
      if (phaseT <= 0) {
        placeKnots();
        teleT = Math.max(0.55, 0.78 - shakeNo * 0.04);
        phase = 'tele'; phaseT = teleT; held = 0;
        game.audio.tone('D5', 0.08, { wave: 'square', volume: 0.05 });
      }
    } else if (phase === 'tele') {
      var n = gripState(points);
      if (n >= 2) held += dt; else held = 0;
      if (phaseT <= 0) impact(points, isDemo);
    } else if (phase === 'shake') {
      if (phaseT <= 0) { phase = 'rest'; phaseT = game.random(0.45, 0.75); failKnot = -1; }
    }
    if (shakeAmt > 0) shakeAmt -= dt;
    if (fallT > 0) fallT += dt;
    if (isDemo && fallT > 0.9) fallT = 0;
    for (var i = 0; i < rivals.length; i++) if (rivals[i].down > 0) rivals[i].down += dt;
    for (var j = nuts.length - 1; j >= 0; j--) {
      nuts[j].vy += 1400 * dt; nuts[j].y += nuts[j].vy * dt; nuts[j].t -= dt;
      if (nuts[j].t <= 0) nuts.splice(j, 1);
    }
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, BRANCH_Y - 160, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#fff8ea' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.55;
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.3;
    game.audio.stopBgm();
  }

  function scoreNow() { return survived * 150 + fastGrips * 60 + (ok ? Math.round(timeLeft * 20) : 0); }

  function outlinedCircle(x, y, r, col, dark) {
    game.draw.circle(x, y, r + 6, C.line);
    game.draw.circle(x, y, r, dark);
    game.draw.circle(x - r * 0.2, y - r * 0.2, r * 0.75, col);
  }

  function drawScene(points) {
    var t = game.time.elapsed;
    var sx = shakeAmt > 0 ? Math.sin(t * 70) * 26 * shakeAmt / 0.35 : 0;
    var tele = phase === 'tele';
    var rustle = tele ? Math.sin(t * 40) * 8 : 0;
    game.draw.gradient(0, H, [[0, C.sky0], [0.5, C.sky1], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(t * 1.4));
    // 葉の茂み(トゥーン: 輪郭→暗→明)
    for (var i = 0; i < 9; i++) {
      var lx = (i * 157) % W + sx * 0.6 + rustle * (i % 2 ? 1 : -1), ly = H * 0.16 + (i % 3) * 90 + Math.sin(t + i) * 6;
      outlinedCircle(lx, ly, 120, C.leaf, C.leafDark);
    }
    // 幹と上の枝(他の子たち)
    game.draw.rect(W / 2 - 96 + sx * 0.3, H * 0.2, 192, H * 0.8, C.line);
    game.draw.rect(W / 2 - 84 + sx * 0.3, H * 0.2, 168, H * 0.8, C.trunkDark);
    game.draw.rect(W / 2 - 84 + sx * 0.3, H * 0.2, 100, H * 0.8, C.trunk);
    for (var r = 0; r < rivals.length; r++) {
      var rv = rivals[r];
      var ry = rv.y + (rv.down > 0 ? rv.down * rv.down * 1400 : 0);
      if (rv.down > 1.2) continue;
      game.draw.rect(rv.x - 110 + sx * 0.5, rv.y + 40, 220, 26, C.line);
      game.draw.sprite(RIVAL, { l: '#3a2418', w: '#fff8ea' }, rv.x + sx * 0.5 + Math.sin(t * 2 + r) * 8, ry, 14, { anchor: 'center', alpha: 0.75 });
    }
    // 自分の枝
    game.draw.rect(0, BRANCH_Y - 34 + sx * 0.2, W, 68, C.line);
    game.draw.rect(0, BRANCH_Y - 26 + sx * 0.2, W, 52, C.trunkDark);
    game.draw.rect(0, BRANCH_Y - 26 + sx * 0.2, W, 26, C.trunk);
    // こぶ(予告中だけ光る)
    for (var k = 0; k < knots.length; k++) {
      var kn = knots[k];
      var lit = tele || phase === 'shake';
      var pulse = tele ? 1 + 0.15 * Math.sin(t * 20) : 1;
      if (lit) game.draw.circle(kn.x + sx * 0.2, kn.y, GRIP_R * pulse, kn.got ? C.good : C.knot, kn.got ? 0.4 : 0.25);
      outlinedCircle(kn.x + sx * 0.2, kn.y, 40, lit ? C.knot : C.trunk, lit ? C.knotDark : C.trunkDark);
      if (failKnot === k) game.draw.circle(kn.x, kn.y, 70, '#ffffff', 0.7);
    }
    // ムササビの子
    var fy = fallT > 0 ? fallT * fallT * 1600 : 0;
    game.draw.sprite(SQUIRREL[Math.floor(t * 4) % 2], SQ_PAL, W / 2 + sx * 0.4, BRANCH_Y - 80 + fy + Math.sin(t * 3) * 5, 18, { anchor: 'center', flipY: fallT > 0 });
    for (var n = 0; n < nuts.length; n++) game.draw.sprite(CHESTNUT, CHESTNUT_PAL, nuts[n].x, nuts[n].y, 10, { anchor: 'center' });
    // 指の位置
    for (var p = 0; p < points.length; p++) game.draw.circle(points[p].x, points[p].y, 30, '#ffffff', 0.45);
    // 親指ゾーン: 落ちた先の落ち葉の山と、つかんでいる数の表示(2つの手形)
    game.draw.rect(0, THUMB_Y - 80, W, H - THUMB_Y + 80, C.leafDark, 0.55);
    for (var h = 0; h < 2; h++) {
      var on = knots[h] && knots[h].got && (tele || phase === 'shake');
      outlinedCircle(W / 2 - 150 + h * 300, THUMB_Y + 20, 70, on ? C.good : C.leaf, on ? '#2a9a5a' : C.leafDark);
    }
  }

  function drawHud() {
    txt(survived + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.gold, 'right');
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(56, 166, W - 112, 30, C.line);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.good);
  }

  // ---- ATTRACT デモ: 2つの手がこぶへ向かう(3回に1回は片手が遅れて落ちる) ----
  var demo = { t: 0, a: { x: W * 0.3, y: THUMB_Y }, b: { x: W * 0.7, y: THUMB_Y }, n: 0, prevPhase: '' };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || survived >= NEEDED - 1) initGame();
    if (phase === 'tele' && demo.prevPhase !== 'tele') demo.n++;
    demo.prevPhase = phase;
    var slowB = demo.n % 3 === 0;
    var ta = phase === 'tele' || phase === 'shake' ? knots[0] : { x: W * 0.32, y: THUMB_Y };
    var tb = phase === 'tele' || phase === 'shake' ? (slowB && phase === 'tele' ? { x: W * 0.6, y: THUMB_Y - 200 } : knots[1]) : { x: W * 0.68, y: THUMB_Y };
    demo.a.x += (ta.x - demo.a.x) * Math.min(1, dt * 14); demo.a.y += (ta.y - demo.a.y) * Math.min(1, dt * 14);
    demo.b.x += (tb.x - demo.b.x) * Math.min(1, dt * 14); demo.b.y += (tb.y - demo.b.y) * Math.min(1, dt * 14);
    stepWorld(dt, [demo.a, demo.b], true);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    var near = false;
    for (var k = 0; k < knots.length; k++) if (Math.hypot(x - knots[k].x, y - knots[k].y) < GRIP_R) near = true;
    if (near && phase === 'tele') {
      game.audio.play('se_tap', 0.4);
      game.fx.burst(x, y, { color: C.knot, count: 6, speed: 140 });
    } else {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: C.leaf, count: 3, speed: 80 });
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (knots === undefined) initGame();
      stepDemo(dt);
      drawScene([]);
      game.draw.hand(demo.a.x, demo.a.y, { press: phase === 'tele', scale: 13 });
      game.draw.hand(demo.b.x, demo.b.y, { press: phase === 'tele', scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.1, 92, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.145, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    var pts = game.touches || [];

    if (state === S.RESULT) {
      drawScene([]);
      game.draw.rect(0, H * 0.12, W, H * 0.18, C.line, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 100, ok ? C.good : C.bad);
      txt('SCORE ' + scoreNow() + '   PERFECT ' + fastGrips, W / 2, H * 0.225, 44, C.gold);
      if (!ok && survived < NEEDED) txt('あと' + (NEEDED - survived) + '回!', W / 2, H * 0.27, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.27, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.27, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      else if (fallT > 0) fallT += dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { survived: survived, fastGrips: fastGrips };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, pts, false);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0;
        game.feedback.bad(W / 2, BRANCH_Y - 160, { text: 'TIME UP', color: C.bad, shake: 8 });
        loseGame();
      }
    }

    drawScene(pts);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 1],
      ['E4', 0.5], ['G4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 2]
    ], { tempo: 126, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
