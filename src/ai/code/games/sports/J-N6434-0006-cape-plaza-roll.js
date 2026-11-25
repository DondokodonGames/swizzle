// J-N6434-0006-cape-plaza-roll.js
// 岬広場の寄せ玉 — 手元の鉄球を指で弾いて石畳の奥へ転がし、木の的玉のそばに止める。3投中2投を輪の中へ
// 操作: 鉄球から上へ素早くはじく。はじく速さで距離、斜めの向きで左右が決まる。旗のなびく向きに風で流される
// 終わり: 3投のうち2投を的玉の輪の中に止めればCLEAR。届かない/行き過ぎ/時間切れでGAME OVER
// @mechanic: flick_launch
// @theme: cape_plaza_jack_roll
// 世界観: 夕暮れの岬に残る古い石畳の広場で灯台守の孫が、海風に流されるのを読みながら鉄球を指ではじき、広場の奥の木の的玉へ3投で寄せきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 輪に入った投数と最も近い距離
// スタイル: MODE7 PSEUDO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色 + 地平グラデ。横1pxストリップを奥ほど圧縮し、地平線へ収束する床
  var M7 = {
    sky1: '#ff9a5a', sky2: '#ffd49a', sea: '#3a6a9a', tileA: '#c8a070', tileB: '#a87c50', line: '#f0dcb0',
    iron: '#4a5058', iron2: '#9aa4b0', wood: '#e0a040', wood2: '#a06020', ring: '#ffffff', good: '#60e0a0',
    bad: '#ff4a4a', ink: '#2a1a14', flag: '#e04a6a', gold: '#ffe060'
  };

  var GAME_TITLE = 'PLAZA ROLL';
  var TIME_LIMIT = 18;
  var THROWS = 3;
  var NEED_IN = 2;
  var HOR = H * 0.3;
  var Z0 = 4;
  var KPROJ = Z0 * (H * 0.8 - HOR);
  var DECEL = 10;
  var GOOD_R = 1.0, PERFECT_R = 0.4;
  var AIM_TIMEOUT = 3.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BALL = ['..iiii..', '.ihhiii.', 'ihhiiiii', 'iiiiiiii', 'iiiiiiid', 'iiiiiidd', '.iiiddd.', '..dddd..'];
  var JACK = ['.ww.', 'wwww', 'wwwd', '.dd.'];
  var KID = [
    ['..hh....', '.hhhh...', '.ffff...', '..ss....', '.sssss..', 's.sss.f.', '..s.s...', '.ss.ss..'],
    ['..hh....', '.hhhh...', '.ffff...', '..ss..f.', '.sssss..', 's.sss...', '..s.s...', '.ss.ss..']
  ];
  var FLAG = ['pfffff', 'pffff.', 'pfff..', 'p.....', 'p.....', 'p.....'];
  var GULL = ['w....w', '.w..w.', '..ww..'];

  var throwNo, phase, aimT, ball, rested, target, wind, inCount, bestD, timeLeft, ready, hitStop, endWait, done, ok, why, judgeT, press0, flashT;

  function newThrow() {
    phase = 'aim'; aimT = 0;
    ball = { x: 0, z: 0, vx: 0, vz: 0 };
    wind = game.random(-0.6, 0.6);
  }

  function initGame() {
    throwNo = 0; rested = []; inCount = 0; bestD = 99;
    target = { x: game.random(-1.2, 1.2), z: game.random(17, 21) };
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; endWait = 0; done = false; ok = false; why = '';
    judgeT = 0; press0 = null; flashT = 0;
    newThrow();
  }

  function proj(x, z) {
    var s = Z0 / (z + Z0);
    return { x: W / 2 + x * 300 * s, y: HOR + KPROJ / (z + Z0), s: s };
  }

  // フリック速度(px/s)から発射
  function launch(vxPx, vyPx) {
    var v = Math.max(0, -vyPx) / 90;
    ball.vz = Math.min(32, v);
    ball.vx = vxPx / 400;
    phase = 'roll';
  }

  // 転がり。止まったら距離を返す
  function stepBall(dt) {
    var sp = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
    if (sp > 0.05) {
      var dec = Math.min(sp, DECEL * dt);
      ball.vx -= (ball.vx / sp) * dec;
      ball.vz -= (ball.vz / sp) * dec;
      ball.vx += wind * dt * (sp > 1 ? 1 : 0);
      ball.x += ball.vx * dt;
      ball.z += ball.vz * dt;
      return null;
    }
    var dx = ball.x - target.x, dz = ball.z - target.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function txt(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: M7.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color || '#ffffff', bold: true, align: 'center' });
  }

  function drawFloor() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, M7.sky1], [1, M7.sky2]]);
    game.draw.rect(0, HOR - 40, W, 40, M7.sea);
    for (var w = 0; w < 8; w++) game.draw.rect(((w * 160 + t * 40) % (W + 100)) - 80, HOR - 28 + (w % 3) * 8, 60, 4, M7.sky2, 0.6);
    game.draw.circle(W * 0.72, HOR - 60, 70, M7.gold, 0.9);
    game.draw.rect(0, HOR - 60, W, 20, M7.sky1, 0.5);
    // 石畳(横ストリップを奥ほど圧縮)
    for (var y = HOR; y < H; y += 6) {
      var z = KPROJ / (y - HOR + 0.001) - Z0;
      var band = Math.floor(z / 1.5) % 2 === 0;
      game.draw.rect(0, y, W, 6, band ? M7.tileA : M7.tileB);
    }
    // 収束する縦の目地
    for (var k = -5; k <= 5; k++) {
      var a = proj(k * 1.2, 0), b = proj(k * 1.2, 60);
      game.draw.line(a.x, a.y, b.x, b.y, M7.line, 3);
    }
    // カモメ
    game.draw.sprite(GULL, { w: '#ffffff' }, ((t * 60) % (W + 100)) - 50, HOR - 160 + Math.sin(t * 2) * 12, 7, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, M7.sky2, 0.03 + 0.03 * Math.sin(t * 1.2));
  }

  function drawTarget() {
    var t = game.time.elapsed;
    var n = 28;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + t * 0.3;
      var p = proj(target.x + Math.cos(a) * GOOD_R, target.z + Math.sin(a) * GOOD_R);
      game.draw.circle(p.x, p.y, 7 * p.s + 2, M7.ring, 0.8);
      var q = proj(target.x + Math.cos(a) * PERFECT_R, target.z + Math.sin(a) * PERFECT_R);
      if (i % 2 === 0) game.draw.circle(q.x, q.y, 5 * q.s + 2, M7.gold, 0.9);
    }
    var jp = proj(target.x, target.z);
    game.draw.sprite(JACK, { w: M7.wood, d: M7.wood2 }, jp.x, jp.y - 10 * jp.s, Math.max(3, 30 * jp.s), { anchor: 'center' });
  }

  function drawBallAt(b, flash) {
    var p = proj(b.x, b.z);
    var px = Math.max(3, 34 * p.s);
    game.draw.circle(p.x, p.y + 2, px * 3.4, M7.ink, 0.25);
    game.draw.sprite(BALL, flash ? { i: '#ffffff', h: '#ffffff', d: '#ffffff' } : { i: M7.iron, h: M7.iron2, d: M7.ink }, p.x, p.y - px * 3, px, { anchor: 'center' });
  }

  function drawBalls() {
    for (var i = 0; i < rested.length; i++) drawBallAt(rested[i], false);
    if (phase !== 'done') drawBallAt(ball, flashT > 0);
  }

  function drawThrower() {
    var t = game.time.elapsed;
    var fr = phase === 'roll' ? 1 : 0;
    game.draw.sprite(KID[fr], { h: M7.ink, f: '#f4c090', s: M7.flag }, W * 0.2, H * 0.86 + Math.sin(t * 2.5) * 5, 16, { anchor: 'center' });
    // 風の旗(向きと長さで風を見せる)
    var fl = wind < 0;
    var sway = Math.sin(t * 8) * 4;
    game.draw.sprite(FLAG, { p: M7.ink, f: M7.flag }, W * 0.84 + sway * (fl ? -1 : 1), H * 0.36, Math.max(6, 6 + Math.abs(wind) * 6), { anchor: 'center', flipX: fl });
  }

  function drawHud() {
    for (var i = 0; i < THROWS; i++) {
      var col = i < rested.length ? (rested[i].inRing ? M7.good : M7.bad) : M7.iron2;
      game.draw.circle(W * 0.14 + i * 80, 90, 28, col);
    }
    txt(inCount + ' / ' + NEED_IN, W / 2, 90, 52);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, M7.ink, 0.5);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? M7.bad : M7.gold);
    if (phase === 'aim') {
      var left = Math.max(0, 1 - aimT / AIM_TIMEOUT);
      game.draw.rect(W / 2 - 120, H * 0.93, 240 * left, 10, M7.gold);
    }
  }

  // ── ATTRACT: ちょうどの強さではじいて輪に止める(成功)→ 強すぎて行き過ぎる(失敗)を実ロジックで
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, shot: 0 };
  function idealVz() { return Math.sqrt(2 * DECEL * target.z); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); wind = 0; demo.shot = 0; }
    var base = proj(0, 0);
    if (phase === 'aim' && demo.shot < 2) {
      var t0 = demo.shot === 0 ? 0.4 : 3.8;
      var k = Math.max(0, Math.min(1, (cyc - t0) / 0.25));
      demo.gx = base.x; demo.gy = base.y - k * 380; demo.press = cyc > t0 - 0.2 && k < 1;
      if (k >= 1) {
        var vz = demo.shot === 0 ? idealVz() : idealVz() * 1.3;
        launch(target.x * 300, -vz * 90); ball.vx = target.x * vz / target.z; demo.shot++;
      }
    } else if (phase === 'roll') {
      var d = stepBall(dt);
      if (d !== null) {
        var inR = d < GOOD_R;
        game.fx.popup(inR ? 'GOOD' : 'MISS', proj(ball.x, ball.z).x, proj(ball.x, ball.z).y - 80, { color: inR ? M7.good : M7.bad, size: 48 });
        rested.push({ x: ball.x, z: ball.z, inRing: inR });
        newThrow(); wind = 0;
      }
    }
  }

  function settle(d) {
    var inR = d < GOOD_R;
    var p = proj(ball.x, ball.z);
    rested.push({ x: ball.x, z: ball.z, inRing: inR });
    throwNo++;
    if (d < bestD) bestD = d;
    if (inR) {
      inCount++;
      game.feedback.good(p.x, p.y - 60, { text: d < PERFECT_R ? 'PERFECT' : 'GOOD', color: d < PERFECT_R ? M7.gold : M7.good });
      if (inCount === NEED_IN - 1) { game.audio.play('se_milestone', 0.4); game.fx.popup('あと1投!', W / 2, H * 0.24, { color: M7.gold, size: 50 }); }
    } else {
      game.feedback.bad(p.x, p.y - 60, { text: 'MISS', shake: 6 });
    }
    judgeT = 0.7; phase = 'judge';
  }

  function endRound(success, reason) { ok = success; why = reason; hitStop = 0.5; flashT = 0.4; game.fx.flash('#ffffff', 0.15); }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.fx.burst(x, y, { color: M7.line, count: 2, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || done || phase !== 'aim') return;
    press0 = { x: x, y: y, t: game.time.elapsed };
    game.audio.play('se_tap', 0.25);
    game.fx.burst(proj(0, 0).x, proj(0, 0).y - 40, { color: M7.iron2, count: 3, speed: 60 });
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || !press0 || phase !== 'aim' || done) { press0 = null; return; }
    var dtp = Math.max(0.04, game.time.elapsed - press0.t);
    var vx = (x - press0.x) / dtp, vy = (y - press0.y) / dtp;
    press0 = null;
    launch(vx, vy);
    if (ball.vz < 3) {
      game.feedback.bad(proj(0, 0).x, proj(0, 0).y - 100, { text: 'MISS', shake: 4 });
    } else {
      game.audio.play('se_jump', 0.35);
      game.fx.burst(proj(0, 0).x, proj(0, 0).y - 40, { color: M7.line, count: 8, speed: 200 });
    }
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (ball === undefined) initGame();
      stepDemo(dt);
      drawFloor(); drawTarget(); drawBalls(); drawThrower();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 76, M7.gold);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.1, 32);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 44, M7.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40);
      return;
    }

    if (state === S.RESULT) {
      drawFloor(); drawTarget(); drawBalls();
      var score = inCount * 100 + Math.max(0, Math.round((2 - bestD) * 50)) + (ok ? Math.ceil(timeLeft) * 5 : 0);
      game.draw.rect(0, H * 0.5, W, H * 0.3, M7.ink, 0.75);
      txt(ok ? 'CLEAR' : (why === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.55, 96, ok ? M7.good : M7.bad);
      txt(inCount + ' / ' + NEED_IN, W / 2, H * 0.61, 52);
      txt('SCORE ' + score, W / 2, H * 0.66, 40, M7.gold);
      if (ok && score > game.best) txt('NEW RECORD', W / 2, H * 0.71, 44, M7.gold);
      else if (!ok) txt('あと' + (bestD < 99 ? Math.max(0.1, bestD - GOOD_R).toFixed(1) : '?') + 'm!', W / 2, H * 0.71, 44);
      txt('BEST ' + game.best, W / 2, H * 0.76, 30);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 40);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { inRing: inCount, throws: throwNo, bestCm: Math.round(Math.min(bestD, 99) * 100) };
        if (ok) game.end.success(inCount * 100 + Math.max(0, Math.round((2 - bestD) * 50)) + Math.ceil(timeLeft) * 5, stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (flashT > 0) flashT -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2; game.audio.stopBgm();
        var tp = proj(target.x, target.z);
        if (ok) { game.feedback.good(tp.x, tp.y - 60, { text: 'CLEAR', color: M7.good, count: 26 }); game.audio.play('se_success', 0.5); }
        else { game.feedback.bad(tp.x, tp.y - 60, { text: why === 'time' ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.5); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      timeLeft -= dt;
      if (flashT > 0) flashT -= dt;
      if (phase === 'aim') {
        aimT += dt;
        if (aimT > AIM_TIMEOUT) {
          // はじかずに待ちすぎ: その投はMISS
          ball.vz = 0; ball.vx = 0; ball.z = 0;
          settle(99);
        }
      } else if (phase === 'roll') {
        var d = stepBall(dt);
        if (d !== null) settle(d);
      } else if (phase === 'judge') {
        judgeT -= dt;
        if (judgeT <= 0) {
          if (inCount >= NEED_IN) { flashT = 0.4; endRound(true, 'clear'); }
          else if (THROWS - throwNo < NEED_IN - inCount) endRound(false, 'short');
          else newThrow();
        }
      }
      if (!done && hitStop <= 0 && timeLeft <= 0) { timeLeft = 0; endRound(false, 'time'); }
    }

    drawFloor(); drawTarget(); drawBalls(); drawThrower(); drawHud();
    if (ready > 0) txt(ready > 0.3 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, M7.gold);
  });

  game.onStart(function () {
    game.audio.melody(
      [['F4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['F4', 0.5], ['G4', 0.5], ['A4', 2]],
      { tempo: 104, wave: 'triangle', volume: 0.055, loop: true, bass: [['F2', 2], ['D2', 2], ['Bb1', 2], ['C2', 2]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
