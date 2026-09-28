// J-GC4-0023-ruins-guardian-shot.js
// 遺跡の門番シュート — 蔓の鞠を指で引いて放ち、左右に揺さぶる石の門番の脇を抜いてアーチ門へ蹴り込む
// 操作: 鞠を押さえて後ろへ引き、離すと引いた向きの反対へ飛ぶ(引くほど強い)。門の上の角の光る輪は高得点
// 終わり: 制限時間内に4本決めればCLEAR。時間切れでGAME OVER(門番に止められる/外す/届かないはMISS)
// @mechanic: slingshot
// @theme: ruins_guardian_goal
// 世界観: 密林の奥の古い遺跡の中庭で、村の子が蔓で編んだ鞠を引き絞って放ち、アーチ門の前を気まぐれに行き来する苔むした石の門番の隙を突いて門をくぐらせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた本数・角の輪に通した数のスコア
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var STYLE = { bg: ['#1e3a2a', '#3a6a44', '#8ab070'], main: ['#8a8a78', '#5a5a4a'], accent: ['#ffd84a', '#ff6a3a'] };
  var C = {
    jungle0: '#12261a', jungle1: '#1e3a2a', floor: '#8a9a6a', floorDark: '#6a7a50', stone: '#9a9a86', stoneDark: '#5a5a4a',
    moss: '#4a8a3a', ink: '#fff6dc', good: '#7ae07a', bad: '#ff5a4a', gold: '#ffd84a', ball: '#c89a3a', shadow: '#1a2014'
  };

  var GAME_TITLE = 'RUINS SHOT';
  var TIME_LIMIT = 16;
  var NEEDED = 4;
  var BALL_X0 = W / 2;
  var BALL_Y0 = Math.round(H * 0.76);
  var GOAL_Y = Math.round(H * 0.3);
  var GOAL_HALF = 250;
  var KEEPER_Y = Math.round(H * 0.36);
  var KEEPER_HALF = 105;
  var MAX_PULL = 300;
  var HUD_Y = Math.round(H * 0.06);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GUARDIAN = [
    ['...mmmm...', '..ssssss..', '.ssksskss.', '.ssssssss.', 'mssddddssm', 'ssssssssss', 'ss.ssss.ss', 'ss.ssss.ss', '...ss.ss..', '..sss.sss.'],
    ['...mmmm...', '..ssssss..', '.ssksskss.', '.ssssssss.', 'mssddddssm', 'ssssssssss', 'ss.ssss.ss', 'ss.ssss.ss', '..ss..ss..', '.sss..sss.']
  ];
  var GUARD_PAL = { m: '#4a8a3a', s: '#9a9a86', k: '#ffd84a', d: '#5a5a4a' };
  var KID = [
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '.gggggg.', 'gggggggg', '..bb.bb.', '.bb...bb'],
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fkfk..', '.gggggg.', 'gggggggg', '..bb.bb.', '..bb.bb.']
  ];
  var KID_PAL = { h: '#3a2414', f: '#d8a070', k: '#12261a', g: '#ff6a3a', b: '#5a3a24' };
  var BALLSPR = ['.vvvv.', 'vwvvwv', 'vvwwvv', 'vvwwvv', 'vwvvwv', '.vvvv.'];
  var BALL_PAL = { v: '#c89a3a', w: '#7a5a1a' };

  var ball, aiming, aimX, aimY, aimT, keeper, goals, rings, shots, timeLeft, resultT, resultKind, flashT;
  var ready, hitStop, finished, done, endWait, ok, milestone;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: '#0a140c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function resetBall() { ball = { x: BALL_X0, y: BALL_Y0, vx: 0, vy: 0, moving: false, done: false }; }

  function initGame() {
    resetBall(); aiming = false; aimX = BALL_X0; aimY = BALL_Y0; aimT = 0;
    keeper = { x: W / 2, dir: 1, speed: 250, turnT: 1.0, lean: 0 };
    goals = 0; rings = 0; shots = 0; timeLeft = TIME_LIMIT; resultT = 0; resultKind = ''; flashT = 0;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false; milestone = false;
  }

  function pullVec() {
    var dx = BALL_X0 - aimX, dy = BALL_Y0 - aimY;
    var len = Math.hypot(dx, dy);
    if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; len = MAX_PULL; }
    return { dx: dx, dy: dy, len: len };
  }

  // 実ロジック: 放つ
  function launch(isDemo) {
    if (!aiming) return false;
    aiming = false;
    var pv = pullVec();
    if (pv.len < 40) { game.audio.play('se_tap', 0.15); return false; }
    ball.vx = pv.dx * 5.2; ball.vy = pv.dy * 5.2; ball.moving = true; shots++;
    game.audio.play('se_jump', 0.45);
    game.fx.burst(BALL_X0, BALL_Y0, { color: C.floor, count: 8, speed: 200 });
    return true;
  }

  function settle(kind, isDemo) {
    ball.moving = false; ball.done = true; resultKind = kind; resultT = 0.7;
    if (kind === 'goal' || kind === 'ring') {
      goals++;
      if (kind === 'ring') rings++;
      flashT = 0.3;
      game.feedback.good(ball.x, GOAL_Y - 60, { text: kind === 'ring' ? 'PERFECT' : 'GOOD', color: kind === 'ring' ? C.gold : C.good, count: 18 });
      if (!isDemo && goals === 2 && !milestone) {
        milestone = true;
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(goals + ' / ' + NEEDED, W / 2, H * 0.47, { color: C.gold, size: 64 });
      }
      keeper.speed = 250 + goals * 60;
      if (!isDemo && goals >= NEEDED) { winGame(); }
    } else {
      game.feedback.bad(ball.x, Math.max(GOAL_Y, ball.y) - 40, { text: 'MISS', color: C.bad, shake: kind === 'save' ? 10 : 4 });
      if (kind === 'save') game.audio.play('se_break', 0.35);
    }
  }

  function stepWorld(dt, isDemo) {
    // 門番: 左右に行き来し、ときどき急に折り返す(フェイント)
    keeper.turnT -= dt;
    if (keeper.turnT <= 0) { keeper.dir = -keeper.dir; keeper.turnT = game.random(0.45, 1.3); }
    keeper.x += keeper.dir * keeper.speed * dt;
    if (keeper.x < W / 2 - GOAL_HALF + 60) { keeper.x = W / 2 - GOAL_HALF + 60; keeper.dir = 1; }
    if (keeper.x > W / 2 + GOAL_HALF - 60) { keeper.x = W / 2 + GOAL_HALF - 60; keeper.dir = -1; }
    keeper.lean = keeper.dir;
    if (aiming) {
      aimT += dt;
      if (aimT > 2.5 && !isDemo) launch(false); // 引きっぱなしは2.5秒で自動で放つ
    }
    if (ball.moving) {
      var py = ball.y;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      var keep = Math.pow(0.6, dt);
      ball.vx *= keep; ball.vy *= keep;
      if (py > KEEPER_Y && ball.y <= KEEPER_Y && Math.abs(ball.x - keeper.x) < KEEPER_HALF) {
        ball.y = KEEPER_Y; ball.vy = Math.abs(ball.vy) * 0.3; ball.vx *= 0.3;
        settle('save', isDemo);
      } else if (py > GOAL_Y && ball.y <= GOAL_Y) {
        var off = ball.x - W / 2;
        if (Math.abs(off) < GOAL_HALF) {
          var ring = Math.abs(Math.abs(off) - 190) < 55;
          settle(ring ? 'ring' : 'goal', isDemo);
        } else settle('wide', isDemo);
      } else if (ball.x < -40 || ball.x > W + 40 || ball.y > H) {
        settle('wide', isDemo);
      } else if (Math.hypot(ball.vx, ball.vy) < 140) {
        settle('short', isDemo);
      }
    }
    if (ball.done) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      resultT -= dt;
      if (resultT <= 0 && !finished) { resetBall(); resultKind = ''; }
    }
    if (flashT > 0) flashT -= dt;
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    game.feedback.good(W / 2, GOAL_Y, { text: 'CLEAR', color: C.gold, count: 30, flashColor: '#fff6dc' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    if (finished) return;
    finished = true; ok = false; hitStop = 0.5;
    game.feedback.bad(keeper.x, KEEPER_Y - 100, { text: 'TIME UP', color: C.bad, shake: 10 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function scoreNow() { return goals * 250 + rings * 200 + (ok ? Math.round(timeLeft * 20) : 0); }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.jungle0], [0.25, C.jungle1], [0.3, C.floorDark], [1, C.floor]]);
    game.draw.rect(0, 0, W, H, C.gold, 0.02 + 0.02 * Math.sin(t * 1.4));
    // 密林の葉(奥)
    for (var i = 0; i < 10; i++) {
      game.draw.circle(i * 120 + Math.sin(t * 0.8 + i) * 10, H * 0.23 + (i % 3) * 20, 90, i % 2 ? '#24482e' : '#2e5a38');
    }
    // 床の石畳
    for (var r = 0; r < 12; r++) game.draw.rect(0, GOAL_Y + 40 + r * 110, W, 4, C.floorDark);
    // アーチ門
    var gl = W / 2 - GOAL_HALF, gr = W / 2 + GOAL_HALF;
    game.draw.rect(gl - 60, GOAL_Y - 260, 60, 280, C.stoneDark);
    game.draw.rect(gr, GOAL_Y - 260, 60, 280, C.stoneDark);
    game.draw.rect(gl - 60, GOAL_Y - 300, gr - gl + 120, 60, C.stone);
    game.draw.rect(gl - 60, GOAL_Y - 300, gr - gl + 120, 12, C.moss);
    game.draw.rect(gl, GOAL_Y - 240, gr - gl, 260, '#0a140c', 0.75);
    // 角の輪(黄金ターゲット)
    for (var s = -1; s <= 1; s += 2) {
      var rx = W / 2 + s * 190;
      game.draw.circle(rx, GOAL_Y - 120, 60, C.gold, 0.25 + 0.15 * Math.sin(t * 5));
      game.draw.circle(rx, GOAL_Y - 120, 42, '#0a140c', 0.8);
    }
    game.draw.line(gl, GOAL_Y, gr, GOAL_Y, C.ink, 6);
    // 門番(大きいスプライト+床影)
    game.draw.rect(keeper.x - 110, KEEPER_Y + 92, 220, 26, C.shadow, 0.35);
    game.draw.sprite(GUARDIAN[Math.floor(t * 4) % 2], GUARD_PAL, keeper.x, KEEPER_Y - 20 + Math.sin(t * 3) * 6, 24, { anchor: 'center', flipX: keeper.lean < 0 });
    // 狙いの点線(最初の1/3だけ)
    if (aiming) {
      var pv = pullVec();
      for (var d = 1; d <= 6; d++) {
        var k = d / 6 * 0.35;
        game.draw.circle(BALL_X0 + pv.dx * 3 * k, BALL_Y0 + pv.dy * 3 * k, 12 - d, C.ink, 0.8 - d * 0.1);
      }
      game.draw.line(BALL_X0, BALL_Y0, aimX, aimY, C.ball, 10);
      game.draw.circle(aimX, aimY, 26, C.gold, 0.6);
    }
    // 鞠と子
    var bs = ball.moving ? 12 + Math.max(0, (ball.y - GOAL_Y) / (BALL_Y0 - GOAL_Y)) * 4 : 16;
    game.draw.rect(ball.x - 40, ball.y + 36, 80, 14, C.shadow, 0.35);
    game.draw.sprite(BALLSPR, BALL_PAL, ball.x, ball.y - (ball.moving ? 20 : 0), bs, { anchor: 'center' });
    game.draw.rect(W * 0.3 - 80, BALL_Y0 + 140, 160, 22, C.shadow, 0.3);
    game.draw.sprite(KID[aiming ? 1 : Math.floor(t * 2) % 2], KID_PAL, W * 0.3, BALL_Y0 + 60 + Math.sin(t * 2.5) * 5, 22, { anchor: 'center' });
    if (flashT > 0) game.draw.rect(gl, GOAL_Y - 240, gr - gl, 260, '#ffffff', flashT * 2);
    if (resultKind === 'save' && resultT > 0.4) game.draw.circle(keeper.x, KEEPER_Y - 20, 150, '#ffffff', (resultT - 0.4) * 2);
  }

  function drawHud() {
    txt(goals + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + scoreNow(), W - 60, HUD_Y + 20, 40, C.gold, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 172, W - 120, 22, '#0a140c');
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C.bad : C.good);
  }

  // ---- ATTRACT デモ: 門番の逆側へ引いて放つ(3本に1本は門番に向けて止められる) ----
  var demo = { t: 0, gx: BALL_X0, gy: BALL_Y0, press: false, n: 0, stage: 0, st: 0, tx: 0, ty: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || goals >= NEEDED - 1) { initGame(); demo.stage = 0; demo.st = 0; }
    stepWorld(dt, true);
    demo.st += dt;
    if (demo.stage === 0 && !ball.moving && !ball.done && demo.st > 0.3) {
      demo.n++;
      var blocked = demo.n % 3 === 0;
      var goalX = blocked ? keeper.x : (keeper.x > W / 2 ? W / 2 - 190 : W / 2 + 190);
      // 目標へ向かうよう逆方向へ引く点を計算
      var vx = goalX - BALL_X0, vy = (GOAL_Y - 120) - BALL_Y0;
      var len = Math.hypot(vx, vy);
      demo.tx = BALL_X0 - vx / len * 260; demo.ty = BALL_Y0 - vy / len * 260;
      aiming = true; aimT = 0; aimX = BALL_X0; aimY = BALL_Y0;
      demo.stage = 1; demo.st = 0;
    } else if (demo.stage === 1) {
      aimX += (demo.tx - aimX) * Math.min(1, dt * 8);
      aimY += (demo.ty - aimY) * Math.min(1, dt * 8);
      if (demo.st > 0.7) { launch(true); demo.stage = 2; demo.st = 0; }
    } else if (demo.stage === 2 && !ball.moving && !ball.done) {
      demo.stage = 0; demo.st = 0;
    }
    demo.press = demo.stage === 1;
    demo.gx = demo.stage === 1 ? aimX : BALL_X0; demo.gy = demo.stage === 1 ? aimY : BALL_Y0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    if (!ball.moving && !ball.done && Math.hypot(x - BALL_X0, y - BALL_Y0) < 220) {
      aiming = true; aimT = 0; aimX = x; aimY = y;
      game.audio.play('se_tap', 0.35);
      game.fx.burst(x, y, { color: C.gold, count: 4, speed: 100 });
    } else {
      game.audio.play('se_tap', 0.1);
      game.fx.burst(x, y, { color: C.floor, count: 3, speed: 80 });
    }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !aiming) return;
    aimX = x; aimY = y;
    if (Math.random() < 0.08) game.audio.tone('C5', 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !aiming || finished) return;
    aimX = x; aimY = y;
    if (!launch(false)) game.fx.burst(BALL_X0, BALL_Y0, { color: C.floorDark, count: 3, speed: 60 });
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ball === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.09, 96, C.gold);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.135, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.97, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.4, W, H * 0.2, '#0a140c', 0.7);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 100, ok ? C.gold : C.bad);
      txt('SCORE ' + scoreNow() + '   PERFECT ' + rings, W / 2, H * 0.505, 44, C.ink);
      if (!ok && goals < NEEDED) txt('あと' + (NEEDED - goals) + '本!', W / 2, H * 0.555, 46, C.bad);
      else if (scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.555, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.555, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { goals: goals, rings: rings, shots: shots };
        if (ok) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['D4', 0.5], ['A4', 0.5], ['D4', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
      ['F4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['D5', 2]
    ], { tempo: 144, wave: 'sawtooth', volume: 0.04, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
