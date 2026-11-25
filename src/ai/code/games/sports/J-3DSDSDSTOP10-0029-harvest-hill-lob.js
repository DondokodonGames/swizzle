// J-3DSDSDSTOP10-0029-harvest-hill-lob.js
// 収穫丘の布玉投げ — 振りかぶる腕の強さで描かれる放物線の出だしを読み、風を足し引きして草地の的の中心に落とす
// 操作: 腕が振り子のように強弱を繰り返す。放物線の出だしの点線が的に届きそうな瞬間にタップして投げる
// 終わり: 5投の合計が200点以上なら成功。届かなければ失敗(時間切れも失敗)
// @mechanic: trajectory
// @theme: harvest_hill_lob
// 世界観: 収穫祭の丘で村の投げ手が、麦わらで編んだ草地の的へ布玉を弓なりに放り、向かい風と追い風を読みながら5投で高得点を狙う
// 残るもの: 正誤(CLEAR/GAME OVER) + 5投の合計点とPERFECT数
// スタイル: 2000s BILLBOARD 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きは sprite の px スケール、接地影で位置を示す
  var STYLE = { bg: ['#8fd3ff', '#d9f1ff', '#7cc05a'], main: ['#f2c14e', '#d9483b'], accent: ['#ffffff', '#3c6e2f'] };
  var COL = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], grass1: STYLE.bg[2], grass2: '#5fa243', far: '#a6d98a',
    straw: STYLE.main[0], red: STYLE.main[1], white: STYLE.accent[0], dark: STYLE.accent[1], ink: '#24331e', shadow: '#1d3316', gold: '#ffe066'
  };

  var GAME_TITLE = 'HARVEST LOB';
  var TIME_LIMIT = 18;
  var NEEDED = 5;             // 投げる数
  var PASS = 200;
  var HOR = H * 0.3, K = 1920, SC = 900;
  var FLY = 0.9, SWING = 1.25, AIM_WAIT = 3.0;
  var TARGET_Z = [8, 12, 6, 15, 10];
  var WIND = [0, 1, -1, 2, -2];
  var RINGS = [[0.6, 100, 'PERFECT'], [1.3, 50, 'GOOD'], [2.2, 20, 'NICE']];

  var THROWER_A = ['..hhh...', '.hhhhh..', '..sss...', '.bbbbb..', 'b.bbb.b.', '..bbb...', '..p.p...', '.pp.pp..'];
  var THROWER_UP = ['..hhh.a.', '.hhhhhaa', '..sss.b.', '.bbbbbb.', 'b.bbb...', '..bbb...', '..p.p...', '.pp.pp..'];
  var THROWER_REL = ['..hhh...', '.hhhhh..', '..sss...', 'bbbbbbba', '..bbb...', '..bbb...', '.p...p..', 'pp...pp.'];
  var PAL_THROWER = { h: '#7a4b2a', s: '#f0c8a0', b: COL.red, p: '#3a3a5a', a: '#f0c8a0' };
  var BALL = ['.yy.', 'yryy', 'yyry', '.yy.'];
  var PAL_BALL = { y: COL.straw, r: COL.red };
  var TREE = ['..ggg..', '.ggggg.', 'ggggggg', '.ggggg.', '...t...', '...t...'];
  var PAL_TREE = { g: COL.dark, t: '#6b4a2a' };
  var SOCK_A = ['p......', 'prrwwrr', 'prrwwr.', 'p......', 'p......'];
  var SOCK_B = ['p......', 'prrwwr.', 'prrwwrr', 'p......', 'p......'];
  var PAL_SOCK = { p: '#5a4a3a', r: COL.red, w: COL.white };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var throwN, total, perfects, phase, aimT, powerT, ball, marks, timeLeft, ready, finished, ok, hitStop, endWait, hl, resultT;
  var silent = false;

  function sign(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: 'rgba(0,0,0,0.35)', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function power() { var u = (powerT / SWING) % 2; return u < 1 ? u : 2 - u; }
  function landZ(p, wind) { return 2 + p * 20 + wind * 1.2; }
  function screenY(z, h) { return HOR + K / z - (h || 0) * SC / z; }

  function initGame() {
    throwN = 0; total = 0; perfects = 0; phase = 'aim'; aimT = 0; powerT = 0; ball = null; marks = [];
    timeLeft = TIME_LIMIT; ready = 0.8; finished = false; ok = false; hitStop = 0; endWait = 0; hl = null; resultT = 0;
  }

  function finishRound(success) {
    if (finished) return;
    finished = true; ok = success; hitStop = 0.45;
    var z = TARGET_Z[Math.min(throwN, NEEDED - 1)];
    hl = { x: W / 2, y: screenY(z), t: 0 };
    if (!silent) game.audio.stopBgm();
  }

  function launch(p) {
    if (finished || phase !== 'aim') return false;
    var wind = WIND[throwN];
    ball = { t: 0, z0: 1.6, z1: landZ(p, wind), top: 0.35 * (landZ(p, wind) - 1.6) + 0.6 };
    phase = 'fly';
    return true;
  }

  function judge() {
    var zt = TARGET_Z[throwN];
    var d = Math.abs(ball.z1 - zt);
    var pts = 0, word = 'MISS', i;
    for (i = 0; i < RINGS.length; i++) if (d <= RINGS[i][0]) { pts = RINGS[i][1]; word = RINGS[i][2]; break; }
    total += pts;
    marks.push({ z: ball.z1, n: throwN });
    var y = screenY(ball.z1);
    if (pts > 0) {
      if (pts === 100) perfects++;
      game.feedback.good(W / 2, y - 60, { text: word, color: pts === 100 ? COL.gold : COL.white, sound: silent ? 'se_tap' : (pts === 100 ? 'se_coin' : 'se_good'), volume: silent ? 0 : 0.5 });
      game.fx.popup('+' + pts, W / 2 + 150, y - 110, { color: COL.gold, size: 52 });
    } else {
      game.feedback.bad(W / 2, y - 40, { text: 'MISS', sound: silent ? 'se_tap' : 'se_bad', volume: silent ? 0 : 0.45 });
    }
    if (throwN === 2) { game.fx.popup(total + '', W / 2, H * 0.22, { color: COL.straw, size: 64 }); if (!silent) game.audio.play('se_milestone', 0.4); }
    phase = 'show'; resultT = 0.6;
  }

  function stepWorld(dt) {
    if (finished) return;
    if (phase === 'aim') {
      aimT += dt; powerT += dt;
      if (aimT >= AIM_WAIT) {
        // 待ちすぎ: 腕がすっぽ抜けて手前にぽとり
        launch(0.02);
        if (!silent) game.audio.tone('C3', 0.1, { wave: 'square', volume: 0.1 });
      }
    } else if (phase === 'fly') {
      ball.t += dt / FLY;
      if (ball.t >= 1) { ball.t = 1; judge(); }
    } else if (phase === 'show') {
      resultT -= dt;
      if (resultT <= 0) {
        throwN++; ball = null;
        if (throwN >= NEEDED) { finishRound(total >= PASS); return; }
        phase = 'aim'; aimT = 0; powerT = 0;
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────────
  function drawField() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HOR, [[0, COL.sky1], [1, COL.sky2]]);
    game.draw.rect(0, 0, W, HOR, COL.white, 0.04 + 0.04 * Math.sin(t * 1.3));
    // 雲(ビルボード)
    for (var c = 0; c < 3; c++) {
      var cx = (c * 420 + t * 20) % (W + 300) - 150;
      game.draw.circle(cx, HOR * 0.4 + c * 60, 60, COL.white, 0.85);
      game.draw.circle(cx + 60, HOR * 0.4 + c * 60 + 10, 46, COL.white, 0.85);
    }
    game.draw.rect(0, HOR - 30, W, 30, COL.far);
    game.draw.gradient(HOR, H, [[0, COL.far], [0.2, COL.grass1], [1, COL.grass2]]);
    // 距離の畝(奥ほど詰まる)
    for (var z = 3; z < 30; z += 3) game.draw.rect(0, screenY(z), W, Math.max(2, 30 / z), COL.shadow, 0.18);
    // 両脇の木(遠近でスケール)
    for (var tz = 4; tz < 30; tz += 5) {
      var s = Math.max(1, 90 / tz), y = screenY(tz);
      for (var side = -1; side <= 1; side += 2) {
        var x = W / 2 + side * (4.5 * SC / tz + 40);
        game.draw.rect(x - 3 * s, y - s, 6 * s, 2 * s, COL.shadow, 0.3);
        game.draw.sprite(TREE, PAL_TREE, x + Math.sin(t + tz) * s * 0.3, y - 3 * s, s, { anchor: 'center' });
      }
    }
  }

  function ellipse(cx, cy, rx, ry, color, alpha) {
    for (var dy = -ry; dy <= ry; dy += 3) {
      var hw = rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
      game.draw.rect(cx - hw, cy + dy, hw * 2, 3, color, alpha);
    }
  }

  function drawTarget() {
    var zt = TARGET_Z[Math.min(throwN, NEEDED - 1)];
    var y = screenY(zt);
    var cols = [COL.white, COL.red, COL.straw];
    for (var i = RINGS.length - 1; i >= 0; i--) {
      var rx = RINGS[i][0] * SC / zt, ry = rx * 0.3;
      ellipse(W / 2, y, rx, ry, cols[i], 1);
    }
    for (var m = 0; m < marks.length; m++) {
      var mk = marks[m];
      if (mk.n !== throwN && !(phase === 'show' && mk.n === throwN)) continue;
      var my = screenY(mk.z);
      game.draw.circle(W / 2, my, Math.max(6, 60 / mk.z), COL.ink, 0.8);
    }
  }

  function drawWind() {
    var w = WIND[Math.min(throwN, NEEDED - 1)];
    var t = game.time.elapsed;
    var fr = Math.floor(t * (3 + Math.abs(w) * 3)) % 2 ? SOCK_A : SOCK_B;
    var x = W * 0.84, y = HOR + 110;
    if (w === 0) game.draw.sprite(['p', 'p', 'p', 'p', 'p'], PAL_SOCK, x, y, 14, { anchor: 'center' });
    else game.draw.sprite(fr, PAL_SOCK, x, y, 14, { anchor: 'center', flipY: w < 0 });
    // 風の強さ: 矢印の数(奥=追い風/手前=向かい風)
    for (var i = 0; i < Math.abs(w); i++) {
      var ay = y + 90 + i * 40 + (w > 0 ? -1 : 1) * ((t * 60) % 20);
      game.draw.line(x - 30, ay + (w > 0 ? 14 : -14), x, ay, COL.white, 6);
      game.draw.line(x, ay, x + 30, ay + (w > 0 ? 14 : -14), COL.white, 6);
    }
  }

  function drawPreview() {
    if (phase !== 'aim' || finished) return;
    var p = power(), wind = WIND[throwN];
    var z1 = landZ(p, wind), top = 0.35 * (z1 - 1.6) + 0.6;
    for (var i = 1; i <= 9; i++) {
      var u = i * 0.05;
      var z = 1.6 + (z1 - 1.6) * u, h = 4 * top * u * (1 - u) + 0.9;
      game.draw.circle(W / 2, screenY(z, h), 10, COL.white, 0.9 - i * 0.07);
    }
  }

  function drawBall() {
    if (!ball) return;
    var u = ball.t;
    var z = ball.z0 + (ball.z1 - ball.z0) * u;
    var h = 4 * ball.top * u * (1 - u) + 0.9 * (1 - u);
    var s = Math.max(2, 70 / z);
    ellipse(W / 2, screenY(z), s * 2.2, s * 0.6, COL.shadow, 0.35);
    game.draw.sprite(BALL, PAL_BALL, W / 2, screenY(z, h), s, { anchor: 'center' });
  }

  function drawThrower() {
    var t = game.time.elapsed;
    var fr = phase === 'fly' && ball && ball.t < 0.3 ? THROWER_REL : phase === 'aim' && power() > 0.5 ? THROWER_UP : THROWER_A;
    var sway = phase === 'aim' ? (power() - 0.5) * 30 : Math.sin(t * 1.5) * 8;
    ellipse(W / 2 + 40, H * 0.86, 160, 30, COL.shadow, 0.35);
    game.draw.sprite(fr, PAL_THROWER, W / 2 + sway, H * 0.8 + Math.sin(t * 2) * 4, 26, { anchor: 'center' });
  }

  function drawHud() {
    sign(total + '', W / 2, H * 0.045, 60, COL.white);
    for (var i = 0; i < NEEDED; i++) {
      var used = i < throwN || (i === throwN && phase !== 'aim');
      game.draw.sprite(BALL, used ? { y: '#888', r: '#555' } : PAL_BALL, W * 0.3 + i * 110, H * 0.1, 12, { anchor: 'center' });
    }
    game.draw.rect(80, 230, W - 160, 12, COL.ink, 0.4);
    game.draw.rect(80, 230, (W - 160) * Math.min(1, total / PASS), 12, total >= PASS ? COL.gold : COL.straw);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, W - 160, 18, COL.ink, 0.4);
    game.draw.rect(80, 160, (W - 160) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? COL.red : COL.white);
    if (phase === 'aim' && aimT > AIM_WAIT - 0.8 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(W / 2, H * 0.8, 120, COL.red, 0.3);
  }

  function drawThumb() {
    game.draw.rect(0, H * 0.9, W, H * 0.1, COL.shadow, 0.3);
  }

  function drawHighlight(dt) {
    if (!hl) return;
    hl.t += dt;
    game.draw.circle(hl.x, hl.y, 80 + hl.t * 320, COL.white, Math.max(0, 0.6 - hl.t));
    game.draw.sprite(BALL, ok ? PAL_BALL : { y: '#ffffff', r: COL.red }, hl.x, hl.y - 60, 16 + hl.t * 12, { anchor: 'center' });
  }

  // ── ATTRACT ゴースト実演(実ロジック) ─────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.n++; throwN = demo.n % 3; powerT = 0.2; }
    silent = true;
    if (phase === 'aim') {
      var need = (TARGET_Z[throwN] - 2 - WIND[throwN] * 1.2) / 20;
      var sloppy = demo.n % 3 === 0 ? 0.12 : 0;         // 失敗例: 早投げ
      if (aimT > 0.4 && Math.abs(power() - (need - sloppy)) < 0.02) { launch(power()); demo.press = 0.2; }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gx = W / 2 + 120; demo.gy = H * 0.84;
    stepWorld(dt);
    if (phase === 'show' && resultT < 0.1) resultT = 0.1;   // デモは1投だけ見せる
    silent = false;
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) return;
    if (launch(power())) { game.audio.play('se_jump', 0.5); game.fx.burst(W / 2, H * 0.74, { color: COL.straw, count: 10, speed: 260 }); }
    else { game.audio.play('se_tap', 0.15); game.fx.burst(x, y, { color: COL.white, count: 3, speed: 80 }); }
  });

  // ── ループ(唯一の onUpdate) ───────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (throwN === undefined) initGame();
      stepDemo(dt);
      drawField(); drawTarget(); drawWind(); drawPreview(); drawBall(); drawThrower(); drawThumb();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      sign(GAME_TITLE, W / 2, H * 0.07, 80, COL.straw);
      sign('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 34, COL.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) sign('► 100円 投入 ◄', W / 2, H * 0.965, 44, COL.gold);
      else sign('INSERT COIN', W / 2, H * 0.965, 36, COL.white);
      return;
    }

    if (state === S.RESULT) {
      drawField(); drawThrower(); drawThumb();
      sign(ok ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.09, 100, ok ? COL.gold : COL.red);
      sign(total + ' / ' + PASS, W / 2, H * 0.15, 56, COL.white);
      sign('PERFECT ' + perfects, W / 2, H * 0.2, 42, COL.straw);
      if (ok && total > (game.best || 0)) sign('NEW RECORD', W / 2, H * 0.25, 48, COL.gold);
      else sign('BEST ' + (game.best || 0), W / 2, H * 0.25, 38, COL.white);
      if (!ok) sign('あと' + Math.max(1, PASS - total) + '点!', W / 2, H * 0.5, 66, COL.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) sign('TAP TO CONTINUE', W / 2, H * 0.965, 38, COL.white);
      return;
    }

    if (finished) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.feedback.good(hl.x, hl.y, { text: 'CLEAR', color: COL.gold, count: 26 }); game.audio.play('se_success', 0.6); }
          else { game.feedback.bad(hl.x, hl.y, { text: 'MISS' }); game.audio.play('se_failure', 0.5); }
          endWait = 1.1;
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { total: total, throws: throwN, perfects: perfects, pass: PASS };
          if (ok) game.end.success(total, stats);
          else game.end.failure(stats);
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 0) { timeLeft = 0; finishRound(false); }
      else stepWorld(dt);
    }

    drawField(); drawTarget(); drawWind(); drawPreview(); drawBall(); drawThrower(); drawThumb(); drawHud();
    if (finished) drawHighlight(dt);
    if (ready > 0) sign(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 110, COL.gold);
  });

  game.onStart(function () {
    game.audio.melody([['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 0.5], ['B4', 0.5], ['A4', 1], ['G4', 1]],
      { tempo: 126, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
