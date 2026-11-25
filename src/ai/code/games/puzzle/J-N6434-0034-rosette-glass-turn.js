// J-N6434-0034-rosette-glass-turn.js
// 円窓ガラスの絵合わせ — 勝手に回り続ける円窓の輪を指で円を描いて回し、絵のかけらを上の切り欠きへ1輪ずつそろえる
// 操作: 画面上で円を描くように指を回すと、光っている輪が同じ向きに回る。かけらが上の切り欠きに来たら指を離して固定(社内メモ。画面には出さない)
// 終わり: 4つの輪を全部そろえて花の絵が完成すれば成功。1輪ごとの持ち時間切れ3回/全体の時間切れで失敗
// @mechanic: rotate_gesture
// @theme: rosette_window_restore
// 世界観: 古い礼拝堂のステンドグラス修復職人が、からくり仕掛けで回り続ける円窓の輪を一つずつ指で回し止め、ばらばらになった花の絵を一枚にそろえ直す
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた輪の数・ぴったり固定(PERFECT)数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質、粒状ノイズと擬似奥行き(背景は1枚絵として)
  var STYLE = { bg: ['#120f1a', '#2a2233', '#4a3a3c'], main: ['#b9a58a', '#7d6a58', '#3a3036'], accent: ['#ffcf5a', '#e2465a'] };
  var C = { bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], brass: STYLE.main[0], bronze: STYLE.main[1], iron: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1], white: '#fff6e6', glassA: '#3fa0c8', glassB: '#8a4fb0', glassC: '#3fb07a', glassD: '#c8703f' };

  var GAME_TITLE = 'ROSETTE TURN';
  var TIME_LIMIT = 14;
  var RING_TIME = 3.6;
  var LIVES = 3;
  var TOL = 0.16, PERFECT_TOL = 0.06;
  var CX = W / 2, CY = H * 0.44;
  var RINGS = [
    { r0: 70, r1: 160, w: 0.9, frag: 'core' },
    { r0: 160, r1: 250, w: -1.25, frag: 'petal' },
    { r0: 250, r1: 340, w: 1.6, frag: 'leaf' },
    { r0: 340, r1: 430, w: -2.0, frag: 'wing' },
  ];
  var TOP = -Math.PI / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FRAG = {
    core: ['.##.', '#yy#', '#yy#', '.##.'],
    petal: ['.#..#.', '#p##p#', '#pppp#', '.#pp#.'],
    leaf: ['..##..', '.#gg#.', '#gggg#', '..##..'],
    wing: ['#....#', '#b..b#', '#bbbb#', '.#bb#.'],
  };
  var FRAG_PAL = { '#': '#fff6e6', 'y': '#ffcf5a', 'p': '#e86aa0', 'g': '#5ccf7a', 'b': '#5ab4ff' };
  var NOTCH = ['#####', '.###.', '..#..'];
  var CRAFTER = ['.###.', '#o#o#', '#####', '.#.#.', '##.##'];

  var rings, active, locks, perfects, misses, lives, timeLeft, ringLeft, ready, hitStop, finished, ok, done, endWait;
  var pressing, lastA, clickAcc, inTolT, turnMeter, grain;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a <= -Math.PI) a += Math.PI * 2;
    return a;
  }

  function initGame() {
    rings = [];
    for (var i = 0; i < RINGS.length; i++) {
      rings.push({ a: TOP + (i % 2 ? 1 : -1) * game.random(1.4, 2.6), locked: false, flash: 0 });
    }
    active = 0; locks = 0; perfects = 0; misses = 0; lives = LIVES;
    timeLeft = TIME_LIMIT; ringLeft = RING_TIME; ready = 0.8; hitStop = 0;
    finished = false; ok = false; done = false; endWait = 0;
    pressing = false; lastA = 0; clickAcc = 0; inTolT = 0; turnMeter = 0;
    grain = [];
    for (var g = 0; g < 60; g++) grain.push({ x: game.random(0, W), y: game.random(0, H), s: game.random(2, 5) });
  }

  function pressAt(x, y) {
    pressing = true;
    lastA = Math.atan2(y - CY, x - CX);
    clickAcc = 0;
  }

  function moveTo(x, y) {
    if (!pressing || active >= rings.length) return;
    if (Math.hypot(x - CX, y - CY) < 40) return;
    var a = Math.atan2(y - CY, x - CX);
    var da = wrap(a - lastA);
    lastA = a;
    rings[active].a += da;
    clickAcc += Math.abs(da);
    turnMeter = Math.min(1, turnMeter + Math.abs(da) * 0.4);
    if (clickAcc > 0.3) {
      clickAcc = 0;
      if (state === S.PLAYING) game.audio.tone(Math.abs(wrap(rings[active].a - TOP)) < TOL ? 'A5' : 'E5', 0.03, { wave: 'square', volume: 0.04 });
    }
  }

  function releaseAt() {
    if (!pressing) return true;
    pressing = false;
    if (active >= rings.length) return true;
    return tryLock();
  }

  function tryLock() {
    var rg = rings[active];
    var d = Math.abs(wrap(rg.a - TOP));
    var fx = CX, fy = CY - (RINGS[active].r0 + RINGS[active].r1) / 2;
    if (d <= TOL) {
      var perfect = d <= PERFECT_TOL;
      rg.a = TOP; rg.locked = true; rg.flash = 0.5;
      locks++; if (perfect) perfects++;
      game.feedback.good(fx, fy, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.glassC, size: 50, volume: 0.3 });
      game.audio.play('se_powerup', 0.25);
      active++; ringLeft = RING_TIME; inTolT = 0;
      if (locks === 2 && state === S.PLAYING) {
        game.fx.popup(locks + ' / ' + RINGS.length, W / 2, H * 0.14, { color: C.gold, size: 56 });
        game.audio.play('se_milestone', 0.4);
      }
      if (active >= rings.length && state === S.PLAYING) { finished = true; ok = true; hitStop = 0.5; }
      return true;
    }
    game.audio.play('se_tap', 0.12);
    return false;
  }

  function slip() {
    // 持ち時間切れ: 輪が外れて飛ぶ(MISS)
    var rg = rings[active];
    rg.a += (rg.a > TOP ? 1 : -1) * 1.8; rg.flash = 0.4;
    misses++; lives--; ringLeft = RING_TIME; inTolT = 0;
    game.feedback.bad(CX, CY - (RINGS[active].r0 + RINGS[active].r1) / 2, { text: 'MISS', shake: 12 });
    if (lives <= 0 && state === S.PLAYING) { finished = true; ok = false; hitStop = 0.55; }
  }

  function simulate(dt) {
    for (var i = 0; i < rings.length; i++) {
      var rg = rings[i];
      if (rg.flash > 0) rg.flash -= dt;
      if (!rg.locked) rg.a += RINGS[i].w * dt * (i === active ? 1 : 0.6);
    }
    turnMeter = Math.max(0, turnMeter - dt * 0.8);
    if (active >= rings.length) return;
    ringLeft -= dt;
    // 持ち続けたまま切り欠きで0.4秒こらえても固定
    if (pressing && Math.abs(wrap(rings[active].a - TOP)) <= TOL) {
      inTolT += dt;
      if (inTolT >= 0.4) { pressing = false; tryLock(); return; }
    } else inTolT = 0;
    if (ringLeft <= 0) slip();
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg3], [0.45, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.025 + 0.025 * Math.sin(t * 1.1));
    // 礼拝堂の柱(1枚絵の擬似奥行き)
    for (var p = 0; p < 2; p++) {
      var px = p ? W - 90 : 10;
      game.draw.rect(px, 180, 80, H * 0.62, C.iron, 0.9);
      game.draw.rect(px + 10, 180, 14, H * 0.62, C.bronze, 0.5);
    }
    for (var g = 0; g < grain.length; g++) {
      var gr = grain[g];
      game.draw.rect(gr.x, (gr.y + t * 12) % H, gr.s, gr.s, C.brass, 0.08 + 0.06 * Math.sin(t * 3 + g));
    }
    // 光の筋(ブルーム代わり)
    game.draw.rect(CX - 240 + Math.sin(t * 0.6) * 30, 0, 110, H * 0.8, C.white, 0.035);
  }

  function drawRose() {
    var t = game.time.elapsed;
    game.draw.circle(CX + 16, CY + 22, 470, '#000000', 0.4);
    game.draw.circle(CX, CY, 468, C.iron);
    game.draw.circle(CX, CY, 452, C.bronze);
    var glass = [C.glassA, C.glassB, C.glassC, C.glassD];
    for (var i = rings.length - 1; i >= 0; i--) {
      var R = RINGS[i], rg = rings[i];
      var isAct = i === active && !finished;
      game.draw.circle(CX, CY, R.r1, rg.locked ? '#3a2e36' : '#221b26');
      game.draw.circle(CX, CY, R.r1 - 6, isAct ? '#2f2640' : '#1a1520');
      var mid = (R.r0 + R.r1) / 2;
      var n = 8 + i * 4;
      for (var k = 0; k < n; k++) {
        var a = rg.a + (k + 0.5) * Math.PI * 2 / n;
        game.draw.circle(CX + Math.cos(a) * mid, CY + Math.sin(a) * mid, (R.r1 - R.r0) * 0.3, glass[(k + i) % 4], rg.locked ? 0.9 : 0.6);
      }
      if (isAct) {
        var pulse = 0.25 + 0.25 * Math.sin(t * 10);
        for (var e = 0; e < 36; e++) {
          var ea = e * Math.PI / 18;
          game.draw.circle(CX + Math.cos(ea) * R.r1, CY + Math.sin(ea) * R.r1, 5, C.white, pulse);
        }
      }
      // 絵のかけら
      var fx = CX + Math.cos(rg.a) * mid, fy = CY + Math.sin(rg.a) * mid;
      if (rg.flash > 0) game.draw.circle(fx, fy, 70, C.white, rg.flash);
      game.draw.sprite(FRAG[R.frag], FRAG_PAL, fx, fy, 13 + (isAct ? Math.sin(t * 8) * 1.5 : 0), { anchor: 'center' });
    }
    game.draw.circle(CX, CY, 70, C.iron);
    game.draw.circle(CX, CY, 30 + Math.sin(t * 3) * 3, C.brass);
    // 上の切り欠き(ゴール): 各輪のかけらの置き場所を淡く表示
    for (var j = 0; j < RINGS.length; j++) {
      if (rings[j].locked) continue;
      var my = CY - (RINGS[j].r0 + RINGS[j].r1) / 2;
      game.draw.sprite(FRAG[RINGS[j].frag], { '#': C.white, 'y': C.white, 'p': C.white, 'g': C.white, 'b': C.white }, CX, my, 13, { anchor: 'center', alpha: j === active ? 0.3 + 0.2 * Math.sin(t * 6) : 0.12 });
    }
    game.draw.sprite(NOTCH, { '#': C.gold }, CX, CY - 500 + Math.sin(t * 5) * 6, 14, { anchor: 'center' });
  }

  function drawBench() {
    // 親指ゾーン: 作業台と回転メーター
    var t = game.time.elapsed;
    var y0 = H * 0.78;
    game.draw.gradient(y0, H, [C.bronze, C.iron]);
    game.draw.rect(0, y0, W, 10, C.brass, 0.7);
    game.draw.sprite(CRAFTER, { '#': C.brass, 'o': C.gold }, 150, y0 + 130 + Math.sin(t * 3) * 6, 16, { anchor: 'center' });
    // 回転メーター(回した量)
    var mx = 300, mw = W - 420;
    game.draw.rect(mx, y0 + 110, mw, 30, '#1a1520');
    game.draw.rect(mx, y0 + 110, mw * turnMeter, 30, C.gold);
    for (var k = 0; k < 10; k++) game.draw.rect(mx + k * mw / 10, y0 + 104, 4, 42, C.iron);
    // 円を描くガイドの軌跡(アイコン的な弧の点列)
    for (var d = 0; d < 10; d++) {
      var a = t * 3 + d * 0.5;
      game.draw.circle(W / 2 + Math.cos(a) * 90, y0 + 280 + Math.sin(a) * 50, 8 - d * 0.6, C.brass, 0.6 - d * 0.05);
    }
  }

  function drawHud() {
    txt(locks + ' / ' + RINGS.length, W / 2, 66, 50, C.white);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 110, bw, 16, '#000000', 0.5);
    game.draw.rect(80, 110, bw * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.red : C.brass);
    if (active < rings.length) {
      var rl = Math.max(0, ringLeft / RING_TIME);
      game.draw.rect(80, 138, bw, 12, '#000000', 0.5);
      game.draw.rect(80, 138, bw * rl, 12, rl < 0.3 ? C.red : C.gold);
    }
    for (var i = 0; i < LIVES; i++) game.draw.sprite(FRAG.core, FRAG_PAL, 110 + i * 70, 196, 9, { anchor: 'center', alpha: i < lives ? 1 : 0.25 });
  }

  function drawScene() { drawBack(); drawRose(); drawBench(); }

  // ── ATTRACT ゴースト実演(実ロジック: 指で円を描いて輪を回し、切り欠きで離して固定) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, fa: 0, pause: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.pause = 0.3; demo.fa = Math.PI * 0.25; }
    simulate(dt);
    if (lives < 1) lives = LIVES;
    if (active >= rings.length) { initGame(); ready = 0; }
    var R = RINGS[active];
    var rad = (R.r0 + R.r1) / 2;
    if (demo.pause > 0) {
      demo.pause -= dt;
      demo.press = false;
      if (demo.pause <= 0) { pressAt(CX + Math.cos(demo.fa) * rad, CY + Math.sin(demo.fa) * rad); }
    } else {
      demo.press = true;
      var need = wrap(TOP - rings[active].a);
      var stepA = Math.max(-5 * dt, Math.min(5 * dt, need));
      demo.fa += stepA;
      moveTo(CX + Math.cos(demo.fa) * rad, CY + Math.sin(demo.fa) * rad);
      if (Math.abs(wrap(rings[active].a - TOP)) < 0.04) { releaseAt(); demo.pause = 0.45; demo.fa = Math.PI * 0.3 + active; }
    }
    var r2 = (RINGS[Math.min(active, RINGS.length - 1)].r0 + RINGS[Math.min(active, RINGS.length - 1)].r1) / 2;
    demo.gx = CX + Math.cos(demo.fa) * r2; demo.gy = CY + Math.sin(demo.fa) * r2;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    game.audio.play('se_tap', 0.08);
    pressAt(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    moveTo(x, y);
    if (pressing && Math.random() < 0.08) game.fx.burst(x, y, { color: C.gold, count: 2, speed: 80 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (!releaseAt()) game.audio.tone('C4', 0.04, { wave: 'triangle', volume: 0.04 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rings === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.05, 64, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.09, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = locks * 100 + perfects * 60 + (ok ? Math.ceil(timeLeft) * 15 : 0);
        var st = { rings: locks, perfect: perfects, miss: misses };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(CX, CY, { color: C.gold, count: 44, speed: 650 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.5;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
      }
    }

    drawScene();
    drawHud();
    if (finished && hitStop > 0) game.draw.circle(CX, CY, 470, '#ffffff', hitStop * 0.35);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 96, C.gold);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.44, 90, ok ? C.gold : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, '#000000', 0.5);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 96, ok ? C.gold : C.red);
    txt(locks + ' / ' + RINGS.length, W / 2, H * 0.33, 68, C.white);
    txt('PERFECT ' + perfects, W / 2, H * 0.39, 44, C.gold);
    var score = locks * 100 + perfects * 60 + (ok ? Math.ceil(timeLeft) * 15 : 0);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.45, 52, C.gold);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.45, 40, C.white);
    if (!ok) txt('あと' + (RINGS.length - locks) + '輪!', W / 2, H * 0.51, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['E4', 1], ['B4', 1], ['G4', 1], ['F#4', 1], ['E4', 1], ['D4', 1], ['E4', 2]], { tempo: 96, wave: 'sine', volume: 0.05, loop: true, bass: [['E2', 4], ['C2', 4]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
