// I-Switch2-0014v2-bay-fishpen-yellowtail-netchase.js
// いけすブリ追い — 湾の養殖いけすの歩み板を若手が連続タップで走り回り、跳ね回って逃げるブリに追いついた瞬間に網ですくう
// 操作: いけすを囲む歩み板の上しか動けない。画面のどこかをタップすると、若手はその方向へ歩み板を一歩走る(連続タップで走り続ける)。水面の黒い影がブリの居場所で、影が止まると跳ねる。跳ねている間に若手が近く(網が届く距離)にいて、ブリをタップするとすくえる。遠くから網を振ると空振り。逃げたブリは若手から遠い側へ移る
// 終わり: 20秒以内に3尾(だんだん素早くなる)をすくえばCLEAR(早さの点)。時間切れでGAME OVER
// @mechanic: chase
// @theme: bay_fishpen_yellowtail_netchase
// 世界観: 朝の湾内に浮かぶ養殖いけすで、出荷用のブリを頼まれた養殖場の若手が、網を手に歩み板を走り回り、跳ね回って逃げるブリに追いついた瞬間にすくい上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・すくった数・空振り数・かかった秒数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドのクォータービュー。6〜8色のベタ、影の位置で高さを示す
  var STYLE = { bg: ['#0c2a4a', '#145a8a', '#1e7ab0'], main: ['#f0b040', '#c87830', '#e8e0c8'], accent: ['#ffffff', '#ff5a5a'] };
  var C = {
    deep: STYLE.bg[0], sea: STYLE.bg[1], sea2: STYLE.bg[2], plank: STYLE.main[0], plank2: STYLE.main[1], shirt: STYLE.main[2],
    white: STYLE.accent[0], red: STYLE.accent[1], ink: '#061020', net: '#2a9ad0', fish: '#6a8ab0', fish2: '#d8e8f0', ok: '#6ae08a', gold: '#ffe06a',
  };

  var GAME_TITLE = 'PEN NET CHASE';
  var TIME_LIMIT = 20;
  var GOAL = 3;
  var CX = W / 2, CY = Math.round(H * 0.5), RX = 420, RY = 210;
  var STEP = 0.2, REACH = 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var wa, fish, caught, whiffs, playT, readyT, stopT, score, over, won, outroT, milestone, prevBest, runT, runDir, netT, fishIdx;

  var FISH = [
    { leap: 0.9, wait: 1.3, speed: 1.6 }, { leap: 0.7, wait: 1.0, speed: 2.2 }, { leap: 0.55, wait: 0.8, speed: 2.8 },
  ];

  function ringPos(a, k) { k = k === undefined ? 1 : k; return { x: CX + Math.cos(a) * RX * k, y: CY + Math.sin(a) * RY * k }; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  function newFish(i) {
    var f = FISH[Math.min(i, FISH.length - 1)];
    return { a: wa + Math.PI, ta: wa + Math.PI, k: 0.72, st: 'swim', t: f.wait, leap: f.leap, wait: f.wait, speed: f.speed, h: 0, flash: 0 };
  }
  function initGame() {
    wa = Math.PI * 0.5; fishIdx = 0; fish = newFish(0); caught = 0; whiffs = 0; playT = 0; readyT = 0.8; stopT = 0; score = 0; over = false; won = false; outroT = 0;
    milestone = false; prevBest = game.best; runT = 0; runDir = 1; netT = 0;
  }

  // 魚: swim(影が目標へ動く)→ leap(跳ねる、すくえる)→ 逃げ先を決めて swim
  function stepFish(dt) {
    if (fish.flash > 0) fish.flash -= dt;
    if (fish.st === 'swim') {
      var d = angDiff(fish.ta, fish.a);
      var mv = Math.sign(d) * Math.min(Math.abs(d), fish.speed * dt);
      fish.a += mv;
      fish.t -= dt;
      if (Math.abs(d) < 0.05 && fish.t <= 0) { fish.st = 'leap'; fish.t = fish.leap; fish.h = 0; game.audio.tone(700, 0.08, { wave: 'triangle', volume: 0.06, slide: 300 }); game.fx.burst(ringPos(fish.a, fish.k).x, ringPos(fish.a, fish.k).y, { color: C.white, count: 8, speed: 220 }); }
    } else if (fish.st === 'leap') {
      fish.t -= dt;
      var u = 1 - fish.t / fish.leap;
      fish.h = Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) * 150;
      if (fish.t <= 0) {
        fish.st = 'swim';
        // 若手から遠い側へ逃げる
        fish.ta = wa + Math.PI + game.random(-0.9, 0.9);
        fish.t = fish.wait;
        game.fx.burst(ringPos(fish.a, fish.k).x, ringPos(fish.a, fish.k).y, { color: C.sea2, count: 10, speed: 200 });
        game.audio.tone(300, 0.08, { wave: 'triangle', volume: 0.05, slide: -200 });
      }
    }
  }

  function tapAt(x, y, demo) {
    var fp = ringPos(fish.a, fish.k);
    var nearFish = Math.hypot(x - fp.x, y - (fp.y - fish.h)) < 170 || Math.hypot(x - fp.x, y - fp.y) < 170;
    if (nearFish && fish.st === 'leap') {
      netT = 0.3;
      if (Math.abs(angDiff(fish.a, wa)) <= REACH) { scoop(demo); return; }
      whiffs++;
      game.feedback.bad(fp.x, fp.y - 120, { text: 'MISS', shake: demo ? 3 : 6 });
      game.audio.tone(200, 0.1, { wave: 'sawtooth', volume: 0.05, slide: -100 });
      return;
    }
    // 歩み板を一歩: タップした方向(中心からの角度)へ近い向きに
    var ta = Math.atan2((y - CY) / RY, (x - CX) / RX);
    var d = angDiff(ta, wa);
    if (Math.abs(d) < 0.08) return;
    runDir = d > 0 ? 1 : -1;
    wa += runDir * Math.min(STEP, Math.abs(d));
    runT = 0.22;
    game.audio.play('se_tap', 0.18);
    var wp = ringPos(wa);
    game.fx.burst(wp.x, wp.y + 40, { color: C.plank2, count: 3, speed: 90 });
  }

  function scoop(demo) {
    fish.st = 'caught'; fish.flash = 0.6; caught++; stopT = 0.6;
    var pts = 200 + Math.round(Math.max(0, TIME_LIMIT - playT) * 10);
    if (!demo) score += pts;
    var fp = ringPos(fish.a, fish.k);
    game.feedback.good(fp.x, fp.y - 160, { text: 'NICE', color: C.gold, size: 60, sound: 'se_coin', volume: 0.4, count: 20 });
    game.fx.popup('+' + pts, W / 2, H * 0.34, { color: C.gold, size: 60 });
    if (!demo && !milestone && caught >= 2) { milestone = true; game.audio.play('se_milestone', 0.5); game.fx.popup(caught + ' / ' + GOAL, W / 2, H * 0.28, { color: C.white, size: 80 }); }
  }

  function nextFish(demo) {
    fishIdx++;
    if (!demo && fishIdx >= GOAL) { finish(true); return; }
    fish = newFish(fishIdx);
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 6; i++) game.fx.burst(game.random(160, 920), game.random(300, 1000), { color: [C.gold, C.white, C.sea2][i % 3], count: 22, speed: 440 });
      game.fx.flash(C.white, 0.25);
    } else game.audio.play('se_failure', 0.5);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(200, 0.03, { wave: 'square', volume: 0.03 }); return; }
    tapAt(x, y, false);
  });

  // ---- 描画(クォータービュー) ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var WORKER = [
    ['...hhh...', '..hffh...', '..hfeh...', '...ff....', '..sssss..', '.s.sss.s.', 's..sss..s', '...sss...', '..bb.bb..', '..bb.bb..', '.oo...oo.'],
    ['...hhh...', '..hffh...', '..hfeh...', '...ff....', '..sssss..', '.s.sss.s.', 's..sss..s', '...sss...', '...bbb...', '..bb.bb..', '.oo...oo.'],
  ];
  var WPAL = { h: '#f0b040', f: '#e8b890', e: '#2a1a10', s: '#e8e0c8', b: '#2a3a5a', o: '#1a1a1a' };
  var YT = ['.....ff.....', '..fffffff.f.', 'wfffffffffff', 'wffffffffff.', '..fffffff.f.', '.....ff.....'];
  var YTPAL = { f: '#6a8ab0', w: '#d8e8f0' };

  function drawSea() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.deep], [0.5, C.sea], [1, C.sea2]]);
    // 菱形グリッド(いけすの網目)
    for (var i = -12; i <= 12; i++) {
      var o = i * 70;
      game.draw.line(CX + o - 700, CY - 350 + Math.sin(t + i) * 2, CX + o + 700, CY + 350, C.sea2, 2);
      game.draw.line(CX + o + 700, CY - 350, CX + o - 700, CY + 350 + Math.sin(t + i) * 2, C.sea2, 2);
    }
    // いけすの内側(少し暗い水)
    for (var k = 0; k < 24; k++) {
      var a0 = k / 24 * Math.PI * 2, a1 = (k + 1) / 24 * Math.PI * 2;
      var p0 = ringPos(a0, 0.86), p1 = ringPos(a1, 0.86);
      game.draw.line(p0.x, p0.y, p1.x, p1.y, C.deep, 20);
    }
    game.draw.circle(CX, CY + 2, 10, C.deep);
    // 遠景: 浮き玉と山
    for (var m = 0; m < 4; m++) game.draw.rect(60 + m * 280, 300 - m * 20, 200, 60, C.deep, 0.7);
    for (var b = 0; b < 6; b++) game.draw.circle(80 + b * 180, 330 + Math.sin(t * 2 + b) * 6, 14, C.red, 0.8);
  }

  function drawWalkway() {
    // 歩み板: 楕円の輪に沿って板を並べ、奥側を先に描く
    var n = 40;
    for (var k = 0; k < n; k++) {
      var a = -Math.PI / 2 + k / n * Math.PI * 2;
      var p = ringPos(a), q = ringPos(a, 0.92);
      var shade = Math.sin(a) > 0 ? C.plank : C.plank2;
      game.draw.rect(p.x - 34, p.y + 8, 68, 30, C.ink, 0.35);
      game.draw.line(p.x, p.y, q.x, q.y, shade, 26);
      game.draw.rect(p.x - 30, p.y - 10, 60, 20, shade);
      if (k % 5 === 0) { game.draw.rect(p.x - 8, p.y - 70, 16, 70, C.plank2); game.draw.circle(p.x, p.y - 76, 12, C.white); }
    }
  }

  function drawFish() {
    var fp = ringPos(fish.a, fish.k);
    if (fish.st === 'caught') return;
    // 影は水面、体は跳ねた高さ
    game.draw.circle(fp.x, fp.y, 56, C.ink, fish.st === 'leap' ? 0.55 : 0.5);
    game.draw.circle(fp.x, fp.y, 36, C.ink, 0.5);
    if (fish.st === 'swim' && fish.t < 0.35 && Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.circle(fp.x, fp.y, 70, C.white, 0.5);
    if (fish.st === 'leap') {
      var flip = Math.cos(fish.a) < 0;
      game.draw.sprite(YT, YTPAL, fp.x, fp.y - fish.h - 20, 9, { anchor: 'center', flipX: flip });
      for (var s = 0; s < 4; s++) game.draw.circle(fp.x - 30 + s * 20, fp.y + 6 + (s % 2) * 8, 6, C.white, 0.8);
    }
  }

  function drawWorker() {
    var t = game.time.elapsed;
    var p = ringPos(wa);
    var fr = runT > 0 ? WORKER[Math.floor(t * 12) % 2] : WORKER[0];
    game.draw.circle(p.x, p.y + 10, 40, C.ink, 0.4);
    game.draw.sprite(fr, WPAL, p.x, p.y - 60, 10, { anchor: 'center', flipX: Math.cos(wa) < 0 });
    // 網(届く範囲を弧で示す)
    var fp = ringPos(fish.a, fish.k);
    var inReach = Math.abs(angDiff(fish.a, wa)) <= REACH;
    var nx = netT > 0 ? fp.x : p.x + (Math.cos(wa) < 0 ? 60 : -60), ny = netT > 0 ? fp.y - 60 : p.y - 110;
    game.draw.line(p.x, p.y - 70, nx, ny, C.plank2, 8);
    game.draw.circle(nx, ny, 34, C.net, 0.4);
    game.draw.circle(nx, ny, 34, inReach ? C.white : C.net, 1);
    game.draw.circle(nx, ny, 26, C.sea, 0.6);
    if (inReach && fish.st === 'leap') game.draw.circle(fp.x, fp.y, 90, C.gold, 0.35 + 0.2 * Math.sin(t * 20));
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.82);
    label('SCORE ' + score, 270, 90, 56, C.white);
    label('MISS ' + whiffs, 270, 170, 36, C.red);
    for (var i = 0; i < GOAL; i++) {
      game.draw.circle(660 + i * 110, 90, 40, i < caught ? C.gold : '#333');
      game.draw.sprite(YT, i < caught ? YTPAL : { f: '#555', w: '#777' }, 660 + i * 110, 90, 5, { anchor: 'center' });
    }
    var tl = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 190, 460, 16, '#222');
    game.draw.rect(560, 190, 460 * tl, 16, tl < 0.25 ? C.red : C.sea2);
  }

  function drawScene() {
    drawSea();
    drawWalkway();
    if (Math.sin(fish.a) < Math.sin(wa)) { drawFish(); drawWorker(); } else { drawWorker(); drawFish(); }
  }

  // ---- ATTRACT: 実ロジックで影を追いかけ、跳ねた瞬間にすくう。周期の終わりに遠くから網を振って空振りも見せる ----
  var demo = { t: 0, cool: 0, hx: W / 2, hy: H * 0.8, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 12;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    demo.cool -= dt; demo.press -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0 && fish.st === 'caught') nextFish(true); return; }
    playT += dt;
    var fp = ringPos(fish.a, fish.k);
    var inReach = Math.abs(angDiff(fish.a, wa)) <= REACH;
    if (demo.cool <= 0) {
      if (fish.st === 'leap' && (inReach || cyc > 10.5)) { demo.hx = fp.x; demo.hy = fp.y - 60; tapAt(fp.x, fp.y - 60, true); demo.press = 0.15; demo.cool = 0.3; }
      else if (!inReach) { var tp = ringPos(fish.a + Math.sign(angDiff(fish.a, wa)) * 0.3); demo.hx = tp.x; demo.hy = tp.y; tapAt(tp.x, tp.y, true); demo.press = 0.12; demo.cool = 0.16; }
    }
    stepFish(dt);
    if (runT > 0) runT -= dt;
    if (netT > 0) netT -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.hx, demo.hy + 20, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.82);
      label(GAME_TITLE, W / 2, 105, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.84, 52, C.gold);
      else label('TAP TO START', W / 2, H * 0.84, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.27, C.ink, 0.88);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, won ? C.ok : C.red);
      label('SCORE ' + score, W / 2, H * 0.39, 54, C.white);
      label('MISS ' + whiffs + '  ' + Math.round(playT) + 's', W / 2, H * 0.435, 38, C.gold);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.485, 48, C.gold);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.485, 36, C.white);
      if (!won) label('あと' + (GOAL - caught) + '尾!', W / 2, H * 0.25, 56, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.565, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (runT > 0) runT -= dt;
    if (netT > 0) netT -= dt;
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, caught: caught, whiffs: whiffs, seconds: Math.round(playT) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.35);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0 && fish.st === 'caught') nextFish(false);
    } else {
      playT += dt;
      stepFish(dt);
      if (playT >= TIME_LIMIT) finish(false);
      else if (TIME_LIMIT - playT < 3 && Math.floor(playT * 4) !== Math.floor((playT - dt) * 4)) game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
    if (over && !won) label('TIME UP', W / 2, H * 0.42, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.gold);
  });

  game.onStart(function() {
    // 朝の漁場の掛け声(オリジナル): 跳ねるリズム
    game.audio.melody([
      ['E4', 0.25], ['G4', 0.25], ['A4', 0.5], ['B4', 0.5], ['A4', 0.25], ['G4', 0.25], ['E4', 1],
      ['D4', 0.25], ['E4', 0.25], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 1], ['B1', 1], ['D2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
