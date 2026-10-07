// I-GBA-0018v2-ice-stone-flick.js
// 氷上の石はじき — 指で弾く速さで強さを決め、凍った湖に描かれた輪の中へ平たい石をぴたりと止める
// 操作: 手前の石に指を置いて前へ弾く。弾く速さ=石の勢い、弾く向き=滑る向き。石が止まった位置が輪の中なら成功
// 終わり: 5個の石のうち3個を輪の中に止めれば成功。3個外す/時間切れで失敗
// @mechanic: flick_launch
// @theme: frozen_lake_stone_flick
// 世界観: 冬の凍った湖で、村の子どもが平たい石を指で弾き、氷に描かれた輪がだんだん遠く小さくなる中で3個を輪の中に止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に止めた数と中心からの近さ
// スタイル: NEO-RETRO

(function(game) {
  var STYLE = { bg: ['#1e2447', '#3b4f8f', '#a8d8f0'], main: ['#eaf6ff', '#6f8fc8'], accent: ['#ff3d7f', '#ffd23f'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'ICE FLICK';
  var TIME_LIMIT = 18;
  var STONES = 5;
  var NEEDED = 3;
  var SX = W / 2;
  var SY = H * 0.80;
  var LAKE_TOP = H * 0.20;
  var FRICTION = 820;
  var POWER = 0.42;
  var MAX_V = 2300;
  var RINGS = [
    { x: 0.50, y: 0.54, r: 130 }, { x: 0.36, y: 0.46, r: 118 }, { x: 0.66, y: 0.39, r: 106 },
    { x: 0.44, y: 0.32, r: 96 }, { x: 0.60, y: 0.27, r: 88 },
  ];

  var SCREEN = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var screen = SCREEN.ATTRACT;

  var stone = { x: SX, y: SY, vx: 0, vy: 0, spin: 0, phase: 'ready', wait: 0, verdict: '' };
  var grab = null;
  var shot = 0, inRing = 0, misses = 0, points = 0, clock = TIME_LIMIT, intro = 0, stopT = 0, exitT = 0;
  var live = false, win = false;

  var KID_A = ['..rrrr..', '.rrrrrr.', '..ssss..', '..s..s..', '..ssss..', '.bbbbbb.', 'bbbbbbbb', 'b.bbbb.b', '..b..b..', '.bb..bb.'];
  var KID_B = ['..rrrr..', '.rrrrrr.', '..ssss..', '..s..s..', '..ssss..', '.bbbbbbb', 'bbbbbb.b', 'b.bbbb..', '..b..b..', '.bb..bb.'];
  var KID_PAL = { 'r': '#ff3d7f', 's': '#ffd9b8', 'b': '#3b4f8f' };
  var STONE_A = ['..####..', '.#oooo#.', '#oo##oo#', '.#oooo#.', '..####..'];
  var STONE_B = ['..####..', '.#o##o#.', '#oooooo#', '.#o##o#.', '..####..'];
  var STONE_PAL = { '#': '#3a3a4a', 'o': '#8a8aa0' };
  var PINE = ['...#...', '..###..', '.#####.', '..###..', '.#####.', '#######', '...t...'];

  function show(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: STYLE.bg[0], bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function ring() { var r = RINGS[Math.min(shot, STONES - 1)]; return { x: W * r.x, y: H * r.y, r: r.r }; }

  function placeStone() {
    stone.x = SX; stone.y = SY; stone.vx = 0; stone.vy = 0; stone.phase = 'ready'; stone.wait = 0; stone.verdict = '';
  }

  function resetLake() { shot = 0; inRing = 0; misses = 0; placeStone(); grab = null; }

  function startRun() {
    resetLake();
    points = 0; clock = TIME_LIMIT; intro = 0.8; stopT = 0; exitT = 0;
    live = false; win = false;
  }

  function launch(vx, vy, loud) {
    var sp = Math.min(MAX_V, Math.hypot(vx, vy) * POWER);
    var len = Math.hypot(vx, vy) || 1;
    stone.vx = vx / len * sp; stone.vy = vy / len * sp;
    stone.phase = 'slide';
    if (loud) {
      game.audio.play('se_jump', 0.3);
      game.audio.tone(180 + sp * 0.45, 0.25, { wave: 'triangle', volume: 0.1, slide: -120 });
    }
  }

  // 実判定: 止まった位置 → 'perfect' | 'good' | 'miss'
  function judgeStone() {
    if (stone.y < LAKE_TOP) return 'miss';
    var rg = ring();
    var d = Math.hypot(stone.x - rg.x, stone.y - rg.y);
    if (d <= rg.r * 0.33) return 'perfect';
    if (d <= rg.r) return 'good';
    return 'miss';
  }

  function settle(loud) {
    var v = judgeStone();
    stone.verdict = v; stone.phase = 'show'; stone.wait = v === 'miss' ? 0.9 : 0.7;
    if (v === 'miss') misses++; else inRing++;
    if (!loud) return;
    var rg = ring();
    if (v === 'miss') {
      game.feedback.bad(stone.x, Math.max(LAKE_TOP, stone.y), { text: 'MISS', shake: 10 });
    } else {
      var close = Math.max(0, 1 - Math.hypot(stone.x - rg.x, stone.y - rg.y) / rg.r);
      points += Math.round(100 + close * 200);
      game.feedback.good(stone.x, stone.y, { text: v === 'perfect' ? 'PERFECT' : 'GOOD', color: v === 'perfect' ? STYLE.accent[1] : STYLE.main[0], count: v === 'perfect' ? 24 : 12 });
      if (inRing < NEEDED) { game.fx.popup(inRing + ' / ' + NEEDED, W / 2, H * 0.16, { color: STYLE.accent[0], size: 50 }); game.audio.play('se_milestone', 0.4); }
    }
  }

  // 実ロジック: 石の滑走と次の石。戻り値 'done' | 'fail' | null
  function slideStep(dt, loud) {
    stone.spin += dt * Math.hypot(stone.vx, stone.vy) * 0.01;
    if (stone.phase === 'slide') {
      var sp = Math.hypot(stone.vx, stone.vy);
      var ns = Math.max(0, sp - FRICTION * dt);
      if (sp > 0) { stone.vx *= ns / sp; stone.vy *= ns / sp; }
      stone.x += stone.vx * dt; stone.y += stone.vy * dt;
      if (stone.x < 70 || stone.x > W - 70) { stone.vx = -stone.vx * 0.5; stone.x = Math.max(70, Math.min(W - 70, stone.x)); if (loud) game.audio.tone('G3', 0.06, { wave: 'square', volume: 0.08 }); }
      if (stone.y > SY + 40) { stone.y = SY + 40; stone.vy = 0; }
      if (ns <= 0 || stone.y < LAKE_TOP) settle(loud);
    } else if (stone.phase === 'show') {
      stone.wait -= dt;
      if (stone.wait <= 0) {
        if (inRing >= NEEDED) return 'done';
        if (misses > STONES - NEEDED) return 'fail';
        shot++;
        placeStone();
      }
    }
    return null;
  }

  function endGame(ok) {
    live = false; win = ok; stopT = ok ? 0.4 : 0.5;
    game.audio.stopBgm();
    if (ok) {
      points += Math.round(clock * 15);
      game.feedback.good(W / 2, H * 0.45, { text: 'CLEAR', color: STYLE.accent[1], count: 30 });
      game.audio.play('se_success', 0.5);
    } else {
      game.feedback.bad(stone.x, stone.y, { text: clock <= 0 ? 'TIME UP' : 'MISS', shake: 14 });
      game.audio.play('se_failure', 0.45);
    }
  }

  game.onTap(function(x, y) {
    if (screen === SCREEN.ATTRACT) { game.audio.play('se_coin', 0.5); screen = SCREEN.PLAYING; startRun(); return; }
    if (screen === SCREEN.RESULT) { screen = SCREEN.ATTRACT; startRun(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (screen !== SCREEN.PLAYING || !live) return;
    if (stone.phase !== 'ready' || y < H * 0.55) {
      game.audio.play('se_tap', 0.1);
      game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 70 });
      return;
    }
    grab = { pts: [{ x: x, y: y, t: game.time.elapsed }] };
    game.audio.play('se_tap', 0.3);
    game.fx.burst(stone.x, stone.y, { color: STYLE.main[0], count: 6, speed: 120 });
  });

  game.onMove(function(x, y) {
    if (!grab) return;
    grab.pts.push({ x: x, y: y, t: game.time.elapsed });
    if (grab.pts.length > 8) grab.pts.shift();
    if (game.random(0, 1) < 0.2) game.fx.burst(x, y, { color: STYLE.accent[1], count: 1, speed: 40 });
  });

  game.onRelease(function(x, y) {
    if (!grab) return;
    var now = game.time.elapsed;
    grab.pts.push({ x: x, y: y, t: now });
    var first = grab.pts[0];
    for (var i = grab.pts.length - 1; i >= 0; i--) { if (now - grab.pts[i].t > 0.1) { first = grab.pts[i]; break; } }
    var dtS = Math.max(0.016, now - first.t);
    var vx = (x - first.x) / dtS, vy = (y - first.y) / dtS;
    grab = null;
    if (screen !== SCREEN.PLAYING || !live || stone.phase !== 'ready') return;
    if (vy > -150) {
      game.audio.tone('C3', 0.08, { wave: 'square', volume: 0.08 });
      game.fx.popup('·', stone.x, stone.y - 80, { color: STYLE.main[0], size: 30 });
      return;
    }
    launch(vx, vy, true);
  });

  // ── ATTRACT ゴースト実演: 必要な初速を逆算して launch() → slideStep() で実際に滑らせる。偶数周の2投目は強すぎて輪を越える ──
  var demo = { t: 0, gx: SX, gy: SY, press: false, clock: 0, strong: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) {
      resetLake();
      demo.clock = 0;
      demo.strong = Math.floor(demo.t / 10) % 2 === 1;
    }
    var rg = ring();
    var dx = rg.x - SX, dy = rg.y - SY, dist = Math.hypot(dx, dy);
    if (stone.phase === 'ready') {
      demo.clock += dt;
      if (demo.clock < 0.6) { demo.gx = SX; demo.gy = SY + 10; demo.press = false; }
      else if (demo.clock < 0.75) {
        var k = (demo.clock - 0.6) / 0.15;
        demo.press = true; demo.gx = SX + dx / dist * 180 * k; demo.gy = SY + dy / dist * 180 * k;
      } else {
        var need = Math.sqrt(2 * FRICTION * dist) / POWER;
        if (demo.strong && shot === 1) need *= 1.3;
        launch(dx / dist * need, dy / dist * need, false);
        demo.press = false; demo.clock = 0;
      }
    }
    var r = slideStep(dt, false);
    if (r) resetLake();
  }

  // ── 描画 ──
  function drawLake(highlight) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.16, STYLE.bg[1]], [0.2, STYLE.bg[2]], [1, '#d8f0ff']]);
    // 遠景の村と松(大きいドット)
    for (var i = 0; i < 7; i++) {
      var px = 60 + i * 160, sway = Math.sin(t * 1.2 + i) * 3;
      game.draw.sprite(PINE, { '#': '#2c5a6a', 't': '#5a3a2a' }, px + sway, H * 0.165, 14, { anchor: 'center' });
    }
    game.draw.rect(W * 0.7, H * 0.13, 150, 70, '#ff3d7f', 0.8);
    game.draw.rect(W * 0.7 - 16, H * 0.12, 182, 20, STYLE.main[0], 1);
    // 雪の粒
    for (var s = 0; s < 18; s++) {
      var fy = (s * 97 + t * 60) % (H * 0.2);
      game.draw.rect((s * 131 + Math.sin(t + s) * 20) % W, fy, 8, 8, '#ffffff', 0.7);
    }
    // 氷面のひび・光の筋
    for (var c = 0; c < 6; c++) game.draw.rect(0, H * (0.24 + c * 0.1), W, 4, '#ffffff', 0.18);
    // 輪
    var rg = ring();
    var hot = highlight;
    game.draw.circle(rg.x, rg.y, rg.r + 10, hot ? '#ffffff' : STYLE.accent[0], 1);
    game.draw.circle(rg.x, rg.y, rg.r - 8, '#c8e8f8', 1);
    game.draw.circle(rg.x, rg.y, rg.r * 0.33 + 8, STYLE.accent[1], 1);
    game.draw.circle(rg.x, rg.y, rg.r * 0.33 - 6, '#c8e8f8', 1);
    game.draw.circle(rg.x, rg.y, 10, STYLE.accent[0], 1);
    // 投げ場
    game.draw.rect(SX - 160, SY - 10, 320, 12, STYLE.main[1], 0.6);
  }

  function drawStone(highlight) {
    var fr = Math.floor(stone.spin) % 2 === 0 ? STONE_A : STONE_B;
    game.draw.rect(stone.x - 44, stone.y + 18, 88, 10, '#000000', 0.15);
    if (highlight) game.draw.circle(stone.x, stone.y, 90, '#ffffff', 0.6);
    game.draw.sprite(fr, STONE_PAL, stone.x, stone.y, highlight ? 16 : 12, { anchor: 'center' });
    if (stone.phase === 'slide') game.draw.rect(stone.x - 4, stone.y + 30, 8, 60, '#ffffff', 0.5);
  }

  function drawKid(pressing) {
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(pressing ? KID_B : KID_A, KID_PAL, W * 0.2, H * 0.86 + bob, 16, { anchor: 'center' });
    // 残りの石
    for (var i = 0; i < STONES; i++) {
      var used = i < shot || (i === shot && stone.phase !== 'ready');
      game.draw.sprite(STONE_A, STONE_PAL, W * 0.62 + i * 76, H * 0.93, 7, { anchor: 'center', alpha: used ? 0.25 : 1 });
    }
  }

  function drawHud() {
    show(inRing + ' / ' + NEEDED, W / 2, 96, 52, STYLE.main[0]);
    for (var m = 0; m < STONES - NEEDED + 1; m++) game.draw.rect(W / 2 - 60 + m * 46, 128, 34, 12, m < misses ? STYLE.accent[0] : '#6f8fc8', 1);
    var bw = W - 160;
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 170, bw, 16, STYLE.bg[0], 1);
    game.draw.rect(80, 170, bw * Math.max(0, clock / TIME_LIMIT), 16, low ? STYLE.accent[0] : STYLE.main[0], 1);
    show(String(points), W - 120, 96, 32, STYLE.accent[1]);
  }

  game.onUpdate(function(dt) {
    if (screen === SCREEN.ATTRACT) {
      stepDemo(dt);
      drawLake(stone.phase === 'show' && stone.verdict === 'miss');
      drawStone(stone.phase === 'show' && stone.verdict === 'miss');
      drawKid(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      show(GAME_TITLE, W / 2, H * 0.06 + bob, 68, STYLE.accent[0]);
      show('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.105, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) show('► 100円 投入 ◄', W / 2, H * 0.975, 38, STYLE.accent[0]);
      else show('INSERT COIN', W / 2, H * 0.975, 30, STYLE.bg[0]);
      return;
    }

    if (screen === SCREEN.RESULT) {
      drawLake(!win);
      drawStone(false);
      drawKid(false);
      show(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 68, win ? STYLE.accent[1] : STYLE.accent[0]);
      show(inRing + ' / ' + NEEDED, W / 2, H * 0.115, 40, STYLE.main[0]);
      show('SCORE ' + points, W / 2, H * 0.30, 40, STYLE.bg[0]);
      if (!win) show('あと' + (NEEDED - inRing) + '個!', W / 2, H * 0.34, 36, STYLE.accent[0]);
      show('BEST ' + Math.round(game.best || 0), W / 2, H * 0.38, 28, STYLE.bg[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) show('TAP TO CONTINUE', W / 2, H * 0.975, 30, STYLE.bg[0]);
      return;
    }

    // ── PLAYING ──
    if (exitT > 0) {
      exitT -= dt;
      if (exitT <= 0) {
        screen = SCREEN.RESULT;
        var stats = { inRing: inRing, stones: shot + 1 };
        if (win) game.end.success(points, stats); else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) exitT = 1.0;
    } else if (intro > 0) {
      intro -= dt;
      if (intro <= 0) { live = true; game.audio.play('se_tap', 0.35); }
    } else if (live) {
      clock -= dt;
      var r = slideStep(dt, true);
      if (r === 'done') endGame(true);
      else if (r === 'fail') endGame(false);
      else if (clock <= 0) { clock = 0; endGame(false); }
    }

    var hl = (stone.phase === 'show' && stone.verdict === 'miss') || (stopT > 0 && !win);
    drawLake(hl);
    drawStone(hl);
    drawKid(!!grab);
    if (grab && grab.pts.length > 1) {
      var a = grab.pts[0], b = grab.pts[grab.pts.length - 1];
      game.draw.line(a.x, a.y, b.x, b.y, STYLE.accent[1], 8);
    }
    drawHud();
    if (intro > 0) show(intro > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 88, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.25], ['A4', 0.25], ['G4', 0.5], ['E4', 0.5], ['D4', 1]], { tempo: 112, wave: 'triangle', volume: 0.05, loop: true });
    screen = SCREEN.ATTRACT;
    startRun();
  });
})(game);
