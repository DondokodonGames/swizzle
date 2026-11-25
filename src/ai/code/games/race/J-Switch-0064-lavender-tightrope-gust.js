// J-Switch-0064-lavender-tightrope-gust.js
// ラベンダー谷の綱渡り — 押している間だけ綱の上を進み、赤い吹き流しが騒いだら指を離してしゃがみ、横風をやり過ごして向こうの塔まで渡る
// 操作: 画面のどこでも押し続けると前へ歩く。赤い吹き流しと風の筋が出たら離してしゃがむ(横風の最中に歩いていると落ちる)。金色の吹き流しは追い風で、そのとき歩くと速く進む。何もせず3秒止まるとふらついて少し戻される(社内メモ。画面には出さない)
// 終わり: 向こうの塔に着けばCLEAR(早いほど高得点)。横風の中を歩いて落ちる/時間切れでGAME OVER
// @mechanic: freeze
// @theme: lavender_tightrope_gust
// 世界観: ラベンダー畑の谷の香り祭りで、見習いの綱渡り芸人が、谷をはさんで向かい合う二つの香油蒸留所の煙突塔に張られた綱を、山から吹き下ろす横風の合間だけ進み、追い風に乗って一番乗りで向こうの塔の鐘を鳴らす
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡りきった時間・やり過ごした横風の数・追い風に乗った回数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るい背景・原色+白縁・光の柱と祝祭演出
  var STYLE = { bg: ['#6ad8ff', '#ffb0e0', '#fff4b0'], main: ['#ff3a6a', '#3a8aff', '#3ac86a'], accent: ['#ffd400', '#ffffff'] };
  var C = {
    sky1: '#6ad8ff', sky2: '#ffb0e0', sky3: '#fff4b0', red: '#ff3a6a', blue: '#3a8aff', green: '#3ac86a',
    vine: '#2a9a4a', grape: '#9a6ae8', gold: '#ffd400', white: '#ffffff', ink: '#1a1030', tower: '#f0d0a0', roof: '#e8404a', bad: '#ff2a4a'
  };

  var GAME_TITLE = 'GUST ROPE WALK';
  var TIME_LIMIT = 14;
  var SPEED = 1 / 5.6;
  var WARN_T = 0.7;
  var GRACE = 0.08;
  var IDLE_LIMIT = 3;
  var ROPE_Y = H * 0.46;
  var L_X = W * 0.12, R_X = W * 0.88;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, dist, holding, gust, nextGust, gustN, dodged, rides, idleT, walkT, fall, hitStop, outro, ok, endFx, ms, bell;

  // ── sprites ─────────────────────────────────────────────────────
  var WALKER = [
    ['...rrr...', '..rrrrr..', '..sksks..', '..sssss..', '...bbb...', '..bbbbb..', '..bbbbb..', '...b.b...', '..w...w..'],
    ['...rrr...', '..rrrrr..', '..sksks..', '..sssss..', '...bbb...', '..bbbbb..', '..bbbbb..', '...b.b...', '...w.w...'],
    ['.........', '...rrr...', '..rrrrr..', '..sksks..', '..sssss..', '.bbbbbbb.', '..bbbbb..', '..ww.ww..', '.........']
  ];
  var LAVENDER = ['.p.p.', 'ppppp', '.ppp.', '..g..', '..g..'];
  var BELL = ['..yy..', '.yyyy.', '.yyyy.', 'yyyyyy', '..kk..'];
  var PAL_W = { r: C.red, s: '#ffd8b8', k: C.ink, b: C.blue, w: C.white };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; dist = 0; holding = false;
    gust = { st: 'calm', t: 0, tail: false, dir: 1 }; nextGust = 1.0; gustN = 0; dodged = 0; rides = 0;
    idleT = 0; walkT = 0; fall = 0; hitStop = 0; outro = 0; ok = false; endFx = false; ms = 0; bell = 0;
  }

  function walkerPos() {
    var t = game.time.elapsed;
    var x = L_X + (R_X - L_X) * Math.min(1, dist);
    var sag = Math.sin(Math.PI * Math.min(1, dist)) * 60;
    var push = gust.st === 'blow' ? Math.sin(t * 20) * 8 : 0;
    return { x: x + push, y: ROPE_Y + sag - 70 + fall * fall * 900 };
  }

  // ── 風と歩み(実プレイ・デモ共用)──────────────────────────────
  function tick(dt, demo) {
    if (bell > 0) bell -= dt;
    if (fall > 0) { fall += dt; return; }
    if (gust.st === 'calm') {
      nextGust -= dt;
      if (nextGust <= 0) {
        gust.st = 'warn'; gust.t = WARN_T; gust.dir = Math.random() < 0.5 ? -1 : 1;
        gust.tail = gustN >= 2 && Math.random() < 0.3;
        if (!demo) game.audio.tone(gust.tail ? 'E6' : 'A5', 0.1, { wave: 'square', volume: 0.05, slide: gust.tail ? 200 : -200 });
      }
    } else if (gust.st === 'warn') {
      gust.t -= dt;
      if (gust.t <= 0) { gust.st = 'blow'; gust.t = 0.75 + Math.random() * 0.3; gust.age = 0; }
    } else if (gust.st === 'blow') {
      gust.t -= dt; gust.age += dt;
      if (!gust.tail && holding && gust.age > GRACE) { knock(demo); return; }
      if (gust.tail && holding && !gust.rode) {
        gust.rode = true; rides++;
        if (!demo) { game.audio.play('se_powerup', 0.4); game.fx.popup('x2', walkerPos().x, walkerPos().y - 120, { color: C.gold, size: 56 }); }
      }
      if (gust.t <= 0) {
        if (!gust.tail) {
          dodged++;
          var wp = walkerPos();
          if (demo) game.fx.burst(wp.x, wp.y, { color: C.green, count: 6, speed: 150 });
          else game.feedback.good(wp.x, wp.y - 130, { text: 'NICE', color: C.green, count: 8, volume: 0.3 });
        }
        gust.st = 'calm'; gust.rode = false; gustN++;
        nextGust = Math.max(0.7, 1.5 - gustN * 0.12) + Math.random() * 0.6;
      }
    }
    if (holding) {
      var boost = gust.st === 'blow' && gust.tail ? 2.2 : 1;
      dist += SPEED * boost * dt; walkT += dt * boost; idleT = 0;
      if (dist >= 0.5 && ms === 0) {
        ms = 1;
        if (!demo) { game.audio.play('se_milestone', 0.45); game.fx.popup('50%', W / 2, H * 0.3, { color: C.blue, size: 64 }); }
      }
      if (dist >= 1) { dist = 1; if (demo) { bell = 0.8; initDemoRun(); } else win(); }
    } else if (gust.st === 'calm') {
      idleT += dt;
      if (idleT > IDLE_LIMIT) {
        idleT = 0; dist = Math.max(0, dist - 0.05);
        var p = walkerPos();
        if (demo) game.fx.burst(p.x, p.y, { color: C.bad, count: 6, speed: 140 });
        else game.feedback.bad(p.x, p.y - 130, { text: 'MISS', color: C.bad, shake: 6 });
      }
    } else idleT = 0;
  }

  function knock(demo) {
    fall = 0.001; holding = false;
    var p = walkerPos();
    if (demo) { game.fx.burst(p.x, p.y, { color: C.bad, count: 10, speed: 200 }); return; }
    endRun(false);
  }

  function win() {
    bell = 1.2;
    game.audio.play('se_coin', 0.6);
    endRun(true);
  }

  function endRun(v) {
    if (phase === 'stop') return;
    ok = v; phase = 'stop'; hitStop = 0.55; endFx = false; holding = false;
    game.audio.stopBgm();
  }

  function score() { return ok ? Math.round(timeLeft * 100) + dodged * 50 + rides * 80 : Math.round(dist * 500); }

  // ── input ───────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase !== 'play') { game.audio.tone('C4', 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    holding = true;
    game.audio.play('se_tap', 0.2);
    game.fx.burst(W / 2, H * 0.86, { color: C.blue, count: 4, speed: 90 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'play' && holding) game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.04 });
    holding = false;
  });

  // ── demo(横風の予告で離し、追い風で歩く。1周に1回は横風の中を歩いて落ちる)─
  var demo = { t: 0, react: 0, careless: false, press: false };
  var DEMO_CYC = 12;
  function initDemoRun() {
    dist = 0; fall = 0; gust = { st: 'calm', t: 0, tail: false, dir: 1 }; nextGust = 0.8; ms = 0; idleT = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.careless = false; demo.fell = false; }
    if (fall > 0.9) { initDemoRun(); }
    var careless = !demo.fell && gustN === 3;
    if (gust.st === 'calm') holding = fall === 0;
    else if (gust.st === 'warn') { demo.react += dt; if (demo.react > 0.2 && !careless && !gust.tail) holding = false; }
    else if (gust.st === 'blow') { holding = gust.tail || careless; if (careless && fall > 0) demo.fell = true; }
    if (gust.st !== 'warn') demo.react = 0;
    if (fall > 0) { holding = false; demo.fell = true; }
    tick(dt, true);
    demo.press = holding;
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.45, C.sky2], [0.75, C.sky3], [1, '#c8f0a0']]);
    // 光の柱
    for (var i = 0; i < 5; i++) {
      var lx = ((i * 260 + t * 60) % (W + 300)) - 150;
      game.draw.rect(lx, 0, 70, H * 0.8, C.white, 0.12 + 0.06 * Math.sin(t * 2 + i));
    }
    // 雲
    for (var c = 0; c < 5; c++) {
      var cx = ((c * 280 + t * 25) % (W + 300)) - 150, cy = 320 + (c % 3) * 70;
      game.draw.circle(cx, cy, 60, C.white, 0.85); game.draw.circle(cx + 60, cy + 10, 48, C.white, 0.85); game.draw.circle(cx - 55, cy + 12, 42, C.white, 0.85);
    }
    // 谷とラベンダー畑の畝
    for (var r = 0; r < 9; r++) {
      var ry = H * 0.62 + r * 60;
      game.draw.rect(0, ry, W, 26, C.vine, 0.75 - r * 0.04);
      for (var g = 0; g < 8; g++) game.draw.sprite(LAVENDER, { g: C.green, p: C.grape }, ((g * 150 + r * 70) % W) + 40, ry + 10 + Math.sin(t * 2 + g + r) * 2, 6, { anchor: 'center' });
    }
    // 塔(左右)
    [L_X, R_X].forEach(function(tx, side) {
      game.draw.rect(tx - 70, ROPE_Y - 20, 140, H * 0.8 - ROPE_Y, C.white);
      game.draw.rect(tx - 62, ROPE_Y - 12, 124, H * 0.8 - ROPE_Y, C.tower);
      for (var k = 0; k < 4; k++) game.draw.rect(tx - 25, ROPE_Y + 60 + k * 150, 50, 70, C.blue, 0.6);
      game.draw.rect(tx - 90, ROPE_Y - 70, 180, 50, C.white);
      game.draw.rect(tx - 82, ROPE_Y - 62, 164, 34, C.roof);
      // 吹き流し(風の予告)
      var col = gust.st === 'calm' ? C.white : (gust.tail ? C.gold : C.red);
      var wave = gust.st === 'calm' ? 0.2 : (gust.st === 'warn' ? 1 : 1.6);
      game.draw.line(tx, ROPE_Y - 70, tx, ROPE_Y - 200, C.ink, 6);
      for (var f = 0; f < 6; f++) {
        var fx = tx + gust.dir * (f * 26) * (gust.st === 'calm' ? 0.4 : 1);
        var fy = ROPE_Y - 190 + f * 4 + Math.sin(t * (8 + wave * 10) + f) * (6 + wave * 10);
        game.draw.rect(fx - 12, fy, 24, 16, col);
      }
      if (side === 1) {
        var bw = bell > 0 ? Math.sin(t * 30) * 8 : Math.sin(t * 2) * 2;
        game.draw.sprite(BELL, { y: C.gold, k: C.ink }, tx + bw, ROPE_Y - 110, 9, { anchor: 'center' });
      }
    });
    // 綱
    for (var s = 0; s < 20; s++) {
      var a = s / 20, b = (s + 1) / 20;
      game.draw.line(L_X + (R_X - L_X) * a, ROPE_Y + Math.sin(Math.PI * a) * 60, L_X + (R_X - L_X) * b, ROPE_Y + Math.sin(Math.PI * b) * 60, '#8a5a2a', 8);
    }
    // 風の筋
    if (gust.st !== 'calm') {
      var blow = gust.st === 'blow';
      var wc = gust.tail ? C.gold : C.red;
      for (var w = 0; w < (blow ? 10 : 4); w++) {
        var wy = ROPE_Y - 260 + w * 60 + Math.sin(t * 3 + w) * 20;
        var span = blow ? 300 : 120;
        var wx = gust.dir > 0 ? ((t * (blow ? 1400 : 500) + w * 170) % (W + span)) - span : W - (((t * (blow ? 1400 : 500) + w * 170) % (W + span)) - span);
        if (gust.st === 'warn' && Math.floor(t * 10) % 2 === 0) continue;
        game.draw.line(wx, wy, wx + span * gust.dir, wy, wc, blow ? 8 : 5);
      }
    }
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.5));
  }

  function drawWalker() {
    var t = game.time.elapsed;
    var p = walkerPos();
    var crouch = !holding && fall === 0;
    var fr = crouch ? 2 : (holding ? Math.floor(t * 8) % 2 : 0);
    var tilt = (gust.st === 'blow' ? gust.dir * 30 : 0) + Math.sin(t * 2.2) * 12;
    var hl = phase === 'stop' && hitStop > 0;
    if (hl) game.draw.circle(p.x, p.y, 120, ok ? C.gold : C.white, 0.5 + 0.3 * Math.sin(t * 30));
    game.draw.line(p.x - 150, p.y + 10 + tilt, p.x + 150, p.y + 10 - tilt, C.ink, 8);
    game.draw.circle(p.x - 150, p.y + 10 + tilt, 12, C.red);
    game.draw.circle(p.x + 150, p.y + 10 - tilt, 12, C.blue);
    game.draw.sprite(WALKER[fr], PAL_W, p.x, p.y + (crouch ? 10 : 0) + Math.sin(t * 5) * 2, hl ? 16 : 12, { anchor: 'center' });
  }

  function drawPad() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.white, 0.35);
    var r = 130 + (holding ? 0 : 6 * Math.sin(t * 3));
    game.draw.circle(W / 2, H * 0.87, r + 12, C.white);
    game.draw.circle(W / 2, H * 0.87, r, holding ? C.blue : '#9ac8ff');
    game.draw.sprite(WALKER[holding ? Math.floor(t * 8) % 2 : 2], PAL_W, W / 2, H * 0.87, 10, { anchor: 'center' });
    // 進み具合
    game.draw.rect(80, H * 0.79, W - 160, 16, C.ink, 0.25);
    game.draw.rect(80, H * 0.79, (W - 160) * dist, 16, C.green);
    game.draw.sprite(BELL, { y: C.gold, k: C.ink }, W - 80, H * 0.79 + 8, 5, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.white, 0.75);
    game.draw.rect(0, 222, W, 6, C.red);
    txt(Math.floor(dist * 100) + '%', W / 2, 90, 68, C.red);
    txt(timeLeft.toFixed(1), 70, 90, 52, C.blue, 'left');
    if (dodged > 0) txt('x' + dodged, W - 70, 90, 44, C.green, 'right');
    var lowT = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, C.ink, 0.2);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? C.bad : C.blue);
  }

  function startTheme() {
    game.audio.melody([['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['A4', 0.5], ['F#4', 0.5], ['A4', 0.5], ['G4', 1], ['D4', 1]],
      { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['G2', 2], ['C2', 2], ['D2', 2], ['G2', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawScene(); drawWalker(); drawPad();
      game.draw.hand(W / 2 + 20, H * 0.87 + 20, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.white, 0.75);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.2) * 6, 72, C.red);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.blue);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.red);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.blue);
      return;
    }

    if (state === S.RESULT) {
      drawScene(); drawWalker();
      game.draw.rect(0, H * 0.14, W, H * 0.2, C.white, 0.8);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.18, 96, ok ? C.red : C.ink);
      txt(ok ? (TIME_LIMIT - timeLeft).toFixed(1) : Math.floor(dist * 100) + '%', W / 2, H * 0.24, 56, C.blue);
      txt('SCORE ' + score() + '   BEST ' + (game.best || 0), W / 2, H * 0.29, 36, C.ink);
      if (!ok && dist >= 0.8) txt('あと' + Math.ceil((1 - dist) * 100) + '%!', W / 2, H * 0.62, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 38, C.ink);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); holding = game.touches && game.touches.length > 0; }
    } else if (phase === 'play') {
      tick(dt, false);
      if (phase === 'play') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endRun(false); }
      }
    } else if (phase === 'stop') {
      if (fall > 0) fall += dt * 0.3;
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          var p = walkerPos();
          if (ok) {
            game.feedback.good(R_X, ROPE_Y - 200, { text: 'CLEAR', color: C.red, count: 30 });
            game.audio.play('se_success', 0.6);
          } else {
            game.feedback.bad(p.x, Math.min(H * 0.7, p.y) - 120, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.2;
        }
      } else {
        if (fall > 0) fall += dt;
        outro -= dt;
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { progress: Math.floor(dist * 100), dodged: dodged, tailwinds: rides, time: +(TIME_LIMIT - timeLeft).toFixed(1) };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    }

    drawScene(); drawWalker(); drawPad(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.red);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);
