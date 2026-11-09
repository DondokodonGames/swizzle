// I-3DS-0003v2-sportsday-basket-arc.js
// 運動会の高かご入れ — 大きく上下に振れる腕の高さを読んで放ち、弧の頂点をかごの高さに合わせて紅白玉を入れる
// 操作: 腕はゆっくり上下に振れ続ける。画面をタップした瞬間に玉を放つ。腕が高い時ほど高く遠く、低い時ほど低く近く飛ぶ。毎回かごの高さと位置が変わるので、そのかごに落ちる弧になる腕の高さで放つ
// 終わり: 6投のうち4個をかごに入れればCLEAR。3個外した時点でGAME OVER
// @mechanic: trajectory
// @theme: sportsday_high_basket_toss
// 世界観: 秋の運動会の校庭で、玉入れ係の子が先生の立て替える高いかごを見上げ、腕の振りの高さで弧を読んで紅白玉を放り上げ、かごへ落とし込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 入った玉の数・ぴったり入った数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル、上下に情報と遊びを分ける
  var STYLE = { bg: ['#bfe6ff', '#fff4d6', '#e8c9a0'], main: ['#ff7f8f', '#7fc8a8', '#ffd27f'], accent: ['#ffffff', '#5a6fd8'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], dirt: STYLE.bg[2], red: STYLE.main[0], mint: STYLE.main[1], gold: STYLE.main[2],
    white: STYLE.accent[0], blue: STYLE.accent[1], ink: '#4a4060', bad: '#ff5a6a', net: '#9a8ac8',
  };

  var GAME_TITLE = 'HIGH BASKET';
  var THROWS = 6, NEEDED = 4;
  var TIME_LIMIT = 20;
  var G = 2600, VX = 380, V0 = 1600, V1 = 2300;
  var SH = { x: 300, y: 1380 };
  var ARM = 130;
  var GROUND = Math.round(H * 0.8);
  var BW = 90, BD = 100, BR = 16;

  // 毎投かごの位置・高さと腕の振りの速さが変わる(後半ほど振りが速い)
  var PLAN = [
    { bx: 800, rim: 760, T: 2.4 }, { bx: 680, rim: 900, T: 2.4 }, { bx: 800, rim: 620, T: 2.0 },
    { bx: 680, rim: 1040, T: 2.0 }, { bx: 800, rim: 900, T: 1.7 }, { bx: 680, rim: 900, T: 1.7 },
  ];
  var DEMO_PLAN = [{ bx: 800, rim: 760, T: 2.4 }, { bx: 680, rim: 900, T: 2.4 }];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var plan, ti, phase, pt, swingT, ball, trail, bk, inCount, missCount, perfects, score, readyT, over, won, outroT, stopT, focus, playT, pile, mood, apexMark;

  function initGame() {
    plan = PLAN; ti = 0; inCount = 0; missCount = 0; perfects = 0; score = 0;
    readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0; pile = []; mood = 0; apexMark = null;
    bk = { bx: plan[0].bx, rim: plan[0].rim, fromX: 900, fromRim: 1100 };
    startThrow(0);
  }

  function startThrow(i) {
    ti = i;
    var p = plan[i];
    bk.fromX = bk.bx; bk.fromRim = bk.rim; bk.toX = p.bx; bk.toRim = p.rim;
    phase = 'move'; pt = 0; swingT = 0; ball = null; trail = [];
  }

  function armS() { var p = plan[ti]; return (1 - Math.cos(2 * Math.PI * swingT / p.T)) / 2; }
  function armAngle(s) { return (-150 + s * 190) * Math.PI / 180; }
  function handPos(s) { var a = armAngle(s); return { x: SH.x + ARM * Math.cos(a), y: SH.y - ARM * Math.sin(a) }; }

  function release(demo) {
    var s = armS();
    var hp = handPos(s);
    ball = { x: hp.x, y: hp.y, vx: VX, vy: -(V0 + (V1 - V0) * s), done: false, apex: hp.y, bounce: 0 };
    trail = [];
    phase = 'fly'; pt = 0;
    game.audio.play('se_jump', 0.35);
    game.audio.tone(500 + s * 500, 0.1, { wave: 'triangle', volume: 0.08, slide: 300 });
  }

  function judge(ok, why, demo) {
    ball.done = true;
    if (ok) {
      inCount++;
      var near = Math.abs(ball.x - bk.bx) < 32;
      if (near) perfects++;
      score += near ? 150 : 100;
      pile.push({ dx: ball.x - bk.bx, c: pile.length % 2 === 0 ? C.red : C.white });
      mood = 1;
      game.feedback.good(bk.bx, bk.rim - 40, { text: near ? 'PERFECT' : 'GOOD', color: C.red, size: near ? 60 : 50 });
      if (!demo && inCount === 3) {
        game.fx.popup('あと1個!', W / 2, H * 0.3, { color: C.blue, size: 56 });
        game.audio.play('se_milestone', 0.45);
      }
      phase = 'after'; pt = 0;
    } else {
      missCount++;
      mood = -1;
      focus = { x: ball.x, y: ball.y };
      stopT = 0.4;
      game.feedback.bad(ball.x, ball.y, { text: 'MISS', shake: demo ? 5 : 10 });
      game.audio.tone(160, 0.12, { wave: 'square', volume: 0.08 });
      if (why === 'bonk') { ball.vx *= -0.4; ball.vy = Math.abs(ball.vy) * 0.3 + 200; }
      phase = 'after'; pt = 0;
    }
  }

  // 玉の飛行と判定(本番もデモも同じ)
  function stepBall(dt, demo) {
    if (!ball) return;
    var px = ball.x, py = ball.y;
    ball.vy += G * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y < ball.apex) ball.apex = ball.y;
    if (trail.length === 0 || Math.abs(trail[trail.length - 1].x - ball.x) + Math.abs(trail[trail.length - 1].y - ball.y) > 34) trail.push({ x: ball.x, y: ball.y });
    if (ball.done) {
      if (ball.inBasket && ball.y > bk.rim + BD - 24) { ball.y = bk.rim + BD - 24; ball.vy = 0; }
      if (ball.y > GROUND) { ball.y = GROUND; ball.vy = 0; ball.vx = 0; }
      return;
    }
    if (!apexMark && ball.vy > 0) apexMark = { x: px, y: ball.apex, t: 1.2 };
    var bx = bk.bx, rim = bk.rim;
    // 下からかごの底に当たる / 横腹に当たる
    if (ball.vy < 0 && py > rim + BD && ball.y <= rim + BD && Math.abs(ball.x - bx) < BW + BR) { judge(false, 'bonk', demo); return; }
    var side = bx - BW;
    if ((px - side) * (ball.x - side) <= 0 && ball.y > rim && ball.y < rim + BD) { judge(false, 'bonk', demo); return; }
    if (ball.vy > 0 && py < rim && ball.y >= rim) {
      if (Math.abs(ball.x - bx) < BW - BR) { judge(true, 'in', demo); ball.inBasket = true; ball.vx = 0; ball.vy = 120; return; }
      if (Math.abs(ball.x - bx) < BW + BR) { judge(false, 'bonk', demo); return; }
    }
    if (ball.y > GROUND || ball.x > W + 60) judge(false, 'ground', demo);
  }

  // 1投の進行。戻り値: 次の投へ進むか
  function stepThrow(dt, demo) {
    pt += dt;
    if (phase === 'move') {
      var k = Math.min(1, pt / 0.5);
      var e = k * k * (3 - 2 * k);
      bk.bx = bk.fromX + (bk.toX - bk.fromX) * e;
      bk.rim = bk.fromRim + (bk.toRim - bk.fromRim) * e;
      if (pt >= 0.5) { phase = 'aim'; pt = 0; swingT = 0; game.audio.tone('E6', 0.12, { wave: 'square', volume: 0.06 }); }
    } else if (phase === 'aim') {
      swingT += dt;
      if (swingT > plan[ti].T + 0.3) {
        // 放たずに一周 → 玉を取り落とす
        var hp = handPos(armS());
        ball = { x: hp.x, y: hp.y, vx: 0, vy: 0, done: false, apex: hp.y, bounce: 0 };
        judge(false, 'drop', demo);
      }
    } else if (phase === 'fly') {
      stepBall(dt, demo);
    } else if (phase === 'after') {
      stepBall(dt, demo);
      if (pt > 0.45) return true;
    }
    return false;
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(bk.bx, bk.rim, { color: C.red, count: 30, speed: 460 });
      game.fx.burst(bk.bx, bk.rim, { color: C.white, count: 24, speed: 380 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) return;
    if (phase !== 'aim') { game.audio.tone(240, 0.03, { wave: 'triangle', volume: 0.04 }); return; }
    release(false);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }
  function puff(x, y, r, col) {
    game.draw.circle(x, y, r + 8, C.white);
    game.draw.circle(x, y, r, col);
  }

  var KID_A = ['...rrrr...', '..rrrrrr..', '..ffffff..', '.ffeffeff.', '..ffmmff..', '...ffff...', '..wwwwww..', '.wwwwwwww.', '..wwwwww..', '..bbbbbb..', '..ff..ff..', '..kk..kk..'];
  var KID_B = ['...rrrr...', '..rrrrrr..', '..ffffff..', '.ffeffeff.', '..ffoof...', '...ffff...', '..wwwwww..', '.wwwwwwww.', '..wwwwww..', '..bbbbbb..', '.ff....ff.', '.kk....kk.'];
  var TEACHER = ['..hhhh..', '.hhhhhh.', '.ssssss.', '.sesses.', '..swws..', '.tttttt.', 'tttttttt', '.tttttt.', '.pp..pp.', '.kk..kk.'];

  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND, [[0, C.sky], [0.75, C.sky2], [1, '#fff8e8']]);
    // 雲と校舎
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 300 + t * 20) % (W + 300)) - 150;
      puff(cx, 330 + (c % 2) * 70, 50, '#ffffff');
      puff(cx + 60, 320 + (c % 2) * 70, 40, '#ffffff');
    }
    game.draw.rect(60, GROUND - 420, 520, 300, '#f0e6f8');
    game.draw.rect(60, GROUND - 440, 520, 26, '#d8c8e8');
    for (var w = 0; w < 4; w++) for (var r = 0; r < 2; r++) game.draw.rect(90 + w * 125, GROUND - 390 + r * 130, 90, 80, '#bfe0f8');
    game.draw.rect(250, GROUND - 520, 140, 100, '#f0e6f8');
    game.draw.circle(320, GROUND - 470, 34, C.white);
    game.draw.line(320, GROUND - 470, 320, GROUND - 494, C.ink, 4);
    game.draw.line(320, GROUND - 470, 338, GROUND - 470, C.ink, 4);
    // 万国旗の綱
    for (var f = 0; f < 14; f++) {
      var fx = f * 80 + 20, fy = 280 + Math.sin(f * 0.45) * 30 + 30;
      game.draw.line(fx, fy, fx + 80, 280 + Math.sin((f + 1) * 0.45) * 30 + 30, C.ink, 2);
      var fc = [C.red, C.mint, C.gold, C.blue][f % 4];
      game.draw.rect(fx + 24, fy + 2, 30, 34 + Math.sin(t * 5 + f) * 3, fc);
    }
    // 校庭
    game.draw.gradient(GROUND, H, [[0, C.dirt], [1, '#d6b488']]);
    game.draw.rect(0, GROUND + 70, W, 8, C.white, 0.8);
    game.draw.rect(0, GROUND + 230, W, 8, C.white, 0.8);
  }

  function drawBasket(hl) {
    var bx = bk.bx, rim = bk.rim;
    // ポール
    game.draw.rect(bx - 12, rim + BD, 24, GROUND - rim - BD, '#c8c0d8');
    game.draw.rect(bx - 12, rim + BD, 8, GROUND - rim - BD, '#ffffff', 0.6);
    // かご(網)
    if (hl) game.draw.rect(bx - BW - 20, rim - 20, BW * 2 + 40, BD + 40, C.white, 0.6);
    game.draw.rect(bx - BW * 0.6, rim + 10, BW * 1.2, BD - 10, '#ffffff', 0.45);
    game.draw.rect(bx - BW - 6, rim - 6, BW * 2 + 12, 16, C.white);
    game.draw.rect(bx - BW, rim, BW * 2, 10, C.red);
    for (var i = 0; i <= 6; i++) {
      var lx = bx - BW + (i * BW * 2) / 6;
      game.draw.line(lx, rim + 10, bx - BW * 0.55 + (i * BW * 1.1) / 6, rim + BD, C.net, 4);
    }
    for (var j = 1; j < 4; j++) {
      var yy = rim + 10 + j * (BD - 10) / 4;
      var half = BW - (BW * 0.45) * (j / 4);
      game.draw.line(bx - half, yy, bx + half, yy, C.net, 3);
    }
    // 入った玉
    for (var p = 0; p < pile.length; p++) {
      var q = pile[p];
      game.draw.circle(bx + Math.max(-40, Math.min(40, q.dx * 0.5)) + (p % 3 - 1) * 22, rim + BD - 22 - Math.floor(p / 3) * 22, BR, q.c);
    }
    // 合図の高さ: かごの縁の高さに立つ小旗
    game.draw.line(bx + BW + 30, rim + 6, bx + BW + 30, rim - 60, C.ink, 4);
    game.draw.rect(bx + BW + 30, rim - 60, 44, 30, C.gold);
  }

  function drawKid() {
    var t = game.time.elapsed;
    var s = state === S.RESULT ? 0.5 : armS();
    var hop = mood > 0 ? Math.abs(Math.sin(t * 10)) * 26 : 0;
    var droop = mood < 0 ? 10 : 0;
    var kx = SH.x - 10, ky = SH.y + 50 - hop + droop;
    game.draw.rect(kx - 60, GROUND - 6, 120, 12, C.ink, 0.15);
    // 振れる腕と玉
    var hp = handPos(s);
    hp.y -= hop;
    game.draw.line(SH.x, SH.y - hop, hp.x, hp.y, '#f2c8a0', 22);
    var holding = phase === 'aim' || phase === 'move';
    if (holding && !over) {
      game.draw.circle(hp.x, hp.y, BR + 4, C.white);
      game.draw.circle(hp.x, hp.y, BR, C.red);
      // 腕の振りの速さを残像で見せる
      var sPrev = Math.max(0, Math.min(1, s - 0.08));
      var pp = handPos(sPrev);
      game.draw.circle(pp.x, pp.y - hop, BR - 4, C.red, 0.25);
    }
    var fr = mood < 0 ? KID_A : (Math.floor(t * 3) % 2 === 0 ? KID_A : KID_B);
    game.draw.sprite(fr, { r: C.red, f: '#f2c8a0', e: C.ink, m: mood < 0 ? '#8a4a5a' : '#ff5a7a', o: '#ff5a7a', w: C.white, b: C.blue, k: C.ink }, kx, ky, 14, { anchor: 'center' });
    // 足元の玉かご(残りの球数)
    var left = THROWS - ti - (ball && phase !== 'move' && phase !== 'aim' ? 1 : 0);
    game.draw.rect(60, GROUND - 40, 150, 70, '#b88a5a');
    for (var b = 0; b < Math.max(0, left); b++) game.draw.circle(80 + (b % 4) * 34, GROUND - 46 - Math.floor(b / 4) * 26, BR, b % 2 ? C.white : C.red);
    // 先生(笛で合図)
    var tx = 960, ty = GROUND - 70 + Math.sin(t * 2) * 3;
    game.draw.sprite(TEACHER, { h: '#5a4a3a', s: '#f2c8a0', e: C.ink, w: '#e8e8f0', t: C.mint, p: C.blue, k: C.ink }, tx, ty, 12, { anchor: 'center', flipX: true });
    if (phase === 'move' && Math.floor(t * 10) % 2 === 0) puff(tx - 60, ty - 70, 14, C.gold);
  }

  function drawBallLayer() {
    for (var i = 0; i < trail.length; i++) game.draw.circle(trail[i].x, trail[i].y, 6, C.blue, 0.35);
    if (apexMark) {
      game.draw.line(apexMark.x - 50, apexMark.y, apexMark.x + 50, apexMark.y, C.blue, 4);
      game.draw.circle(apexMark.x, apexMark.y, 8, C.blue);
    }
    if (ball && phase !== 'aim') {
      var hl = focus && stopT > 0;
      if (hl) game.draw.circle(ball.x, ball.y, BR * 3, C.white, 0.7);
      game.draw.circle(ball.x, ball.y, (BR + 4) * (hl ? 1.5 : 1), C.white);
      game.draw.circle(ball.x, ball.y, BR * (hl ? 1.5 : 1), C.red);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.white, 0.75);
    game.draw.rect(0, 226, W, 6, C.blue, 0.4);
    label('SCORE ' + score, 250, 80, 46, C.blue);
    for (var i = 0; i < THROWS; i++) {
      var used = i < ti || (i === ti && phase !== 'move' && phase !== 'aim');
      game.draw.circle(130 + i * 70, 165, 24, C.ink, 0.2);
      game.draw.circle(130 + i * 70, 162, 22, used ? '#d8d0e0' : (i % 2 ? C.white : C.red));
    }
    label(inCount + ' / ' + NEEDED, 820, 90, 56, C.red);
    for (var k = 0; k < NEEDED; k++) game.draw.circle(730 + k * 60, 170, 20, k < inCount ? C.red : '#e8e0f0');
  }

  function drawScene() {
    drawYard();
    drawBasket(focus && stopT > 0 && !ball);
    drawKid();
    drawBallLayer();
  }

  // ---- ATTRACT: 本物の投げで2投(1投目は良い高さで入る、2投目は腕が低すぎて届かない) ----
  var demo = { t: 0, press: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || plan !== DEMO_PLAN) {
      initGame(); plan = DEMO_PLAN; readyT = 0; startThrow(0); bk.bx = DEMO_PLAN[0].bx; bk.rim = DEMO_PLAN[0].rim;
    }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else if (stepThrow(dt, true)) {
      if (ti === 0) startThrow(1);
      else { pile = []; inCount = 0; missCount = 0; startThrow(0); }
    }
    if (phase === 'aim') {
      // 1投目: 腕が中ほどへ上がる途中(入る高さ)で放つ / 2投目: 低すぎる位置で放つ
      var want = ti === 0 ? 0.69 : 0.25;
      if (swingT >= want) { demo.press = 0.2; release(true); }
    }
    if (demo.press > 0) demo.press -= dt;
    if (apexMark) { apexMark.t -= dt; if (apexMark.t <= 0) apexMark = null; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(W * 0.55, H * 0.9 - (demo.press > 0 ? 0 : 50), { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.white, 0.75);
      label(GAME_TITLE, W / 2, 105, 86 + Math.sin(t * 3) * 3, C.red);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.blue);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.96, 48, C.red);
      else label('TAP TO START', W / 2, H * 0.96, 44, C.blue);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.22, C.white, 0.8);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 96, won ? C.red : C.blue);
      label('SCORE ' + score, W / 2, H * 0.42, 52, C.ink);
      label(inCount + ' / ' + THROWS + '  PERFECT ' + perfects, W / 2, H * 0.465, 38, C.ink);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.5, 46, C.red);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.5, 36, C.ink);
      if (!won) label('あと' + Math.max(1, NEEDED - inCount) + '個!', W / 2, H * 0.55, 48, C.red);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.96, 36, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (apexMark) { apexMark.t -= dt; if (apexMark.t <= 0) apexMark = null; }
    if (over) {
      outroT -= dt;
      if (ball) stepBall(dt, false);
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { inBasket: inCount, perfect: perfects, missed: missCount };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        focus = null;
        if (missCount > THROWS - NEEDED) finish(false);
      }
    } else {
      playT += dt;
      if (stepThrow(dt, false)) {
        if (ti + 1 >= THROWS || playT > TIME_LIMIT) finish(inCount >= NEEDED);
        else startThrow(ti + 1);
      }
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 100, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2],
    ], { tempo: 138, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
