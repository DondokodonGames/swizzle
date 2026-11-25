// I-3DS-0005v3-port-slope-melon-dodge.js
// 港町の急坂すいかよけ — 止まっている間だけ坂を上る少女を、押している間だけ横へ逃がし、跳ねて転がり落ちる西瓜をよける
// 操作: 画面の左半分を押し続けると左へ、右半分で右へ歩く(横に歩いている間は坂を上れない)。離すと止まって坂を上る。上端で赤い印が瞬いた所から西瓜が落ちてくる。両脇の家の壁に当たった西瓜は跳ね返って斜めに来る
// 終わり: 21秒以内に坂の上の家(40段)に着けばCLEAR。西瓜に3回当たって買い物袋の中身を全部落とす/時間切れでGAME OVER
// @mechanic: dodge
// @theme: port_slope_melon_dodge
// 世界観: 坂の多い港町の石畳の急坂で、買い物帰りの少女が、八百屋の荷車からこぼれて跳ねながら転がり落ちてくる西瓜をよけつつ、坂の上の家まで上っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 上った段数・かすめた数・残った買い物
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・太い縁取り・大きいアイコン・飛ぶ数字
  var STYLE = { bg: ['#3ab8f0', '#a8e8ff', '#e8d0a8'], main: ['#2ea84a', '#e83a4a', '#ffd23a'], accent: ['#ffffff', '#1a1a2a'] };
  var C = {
    sky: STYLE.bg[0], sky2: STYLE.bg[1], stone: STYLE.bg[2], rind: STYLE.main[0], flesh: STYLE.main[1], sun: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], wall: '#f2e2c8', roof: '#d8603a', sea: '#2a78c8', ok: '#5ae07a',
  };

  var GAME_TITLE = 'MELON SLOPE';
  var STEPS = 40, STEP_PX = 60;
  var LIVES = 3;
  var TIME_LIMIT = 21;
  var GIRL_Y = Math.round(H * 0.7);
  var WALL_L = 190, WALL_R = 890;
  var CLIMB = 190, WALK = 560, GIRL_R = 38;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var gx, sg, moving, melons, warns, spawnT, lives, grazes, score, readyT, over, won, outroT, stopT, focus, playT, invT, mood, milestone, moveDir;

  function initGame() {
    gx = W / 2; sg = 0; moving = 0; melons = []; warns = []; spawnT = 0.9; lives = LIVES; grazes = 0; score = 0;
    readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0; invT = 0; mood = 0; milestone = false; moveDir = 0;
  }

  function stepsUp() { return Math.min(STEPS, Math.floor(sg / STEP_PX)); }
  function stage() { var s = stepsUp(); return s < 12 ? 0 : (s < 26 ? 1 : 2); }

  // 予告(0.6秒)→ 上端から西瓜。段が上がるほど斜め・2個同時・大玉が混ざる
  function queueSpawn() {
    var st = stage();
    var aim = Math.max(WALL_L + 80, Math.min(WALL_R - 80, gx + game.random(-70, 70)));
    if (st === 0) warns.push({ x: aim, vx: 0, r: 56, v: 430, t: 0.6 });
    else if (st === 1) {
      var fromLeft = game.random(0, 1) < 0.5;
      warns.push({ x: fromLeft ? WALL_L + 70 : WALL_R - 70, vx: (fromLeft ? 1 : -1) * game.random(260, 340), r: 56, v: 470, t: 0.6 });
      if (game.random(0, 1) < 0.35) warns.push({ x: aim, vx: 0, r: 56, v: 470, t: 0.75 });
    } else {
      if (game.random(0, 1) < 0.4) warns.push({ x: aim, vx: 0, r: 82, v: 380, t: 0.6 });
      else warns.push({ x: aim, vx: 0, r: 56, v: 520, t: 0.6 });
      var fl = game.random(0, 1) < 0.5;
      warns.push({ x: fl ? WALL_L + 70 : WALL_R - 70, vx: (fl ? 1 : -1) * game.random(280, 360), r: 52, v: 520, t: 0.8 });
    }
    game.audio.tone(1200, 0.06, { wave: 'square', volume: 0.05 });
  }

  function spawnGap() { var st = stage(); return st === 0 ? 1.15 : (st === 1 ? 1.0 : 0.95); }

  // ---- 進行(本番もデモも同じ)。戻り値: 当たった西瓜 or null ----
  function stepWorld(dt, demo) {
    // 歩く/上る
    if (moveDir !== 0) {
      moving = Math.min(1, moving + dt * 8);
      gx += moveDir * WALK * dt;
      gx = Math.max(WALL_L + GIRL_R, Math.min(WALL_R - GIRL_R, gx));
    } else {
      moving = Math.max(0, moving - dt * 10);
      if (moving <= 0) sg += CLIMB * dt;
    }
    // 予告と出現
    spawnT -= dt;
    if (spawnT <= 0) { spawnT = spawnGap(); queueSpawn(); }
    for (var w = warns.length - 1; w >= 0; w--) {
      warns[w].t -= dt;
      if (warns[w].t <= 0) {
        var a = warns[w];
        melons.push({ x: a.x, s: sg + (GIRL_Y - 200) + a.r, vx: a.vx, v: a.v, r: a.r, hop: 0, passed: false, flash: 0 });
        warns.splice(w, 1);
      }
    }
    var hit = null;
    for (var i = melons.length - 1; i >= 0; i--) {
      var m = melons[i];
      var before = m.s;
      m.s -= m.v * dt;
      m.x += m.vx * dt;
      if (m.x < WALL_L + m.r) { m.x = WALL_L + m.r; m.vx = Math.abs(m.vx); game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.05 }); }
      if (m.x > WALL_R - m.r) { m.x = WALL_R - m.r; m.vx = -Math.abs(m.vx); game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.05 }); }
      if (Math.floor(before / STEP_PX) !== Math.floor(m.s / STEP_PX)) m.hop = 1;
      if (m.hop > 0) m.hop -= dt * 6;
      var sy = GIRL_Y - (m.s - sg);
      if (!m.passed && invT <= 0 && Math.abs(sy - GIRL_Y) < m.r + GIRL_R - 10 && Math.abs(m.x - gx) < m.r + GIRL_R - 10) { hit = m; }
      if (!m.passed && sy > GIRL_Y + m.r) {
        m.passed = true;
        if (Math.abs(m.x - gx) < m.r + GIRL_R + 90 && invT <= 0) {
          grazes++; score += 50;
          game.feedback.good(gx, GIRL_Y - 90, { text: 'NICE', color: C.sun, size: 48, sound: 'se_coin', volume: 0.3, count: 8 });
        }
      }
      if (sy > H + 120) melons.splice(i, 1);
    }
    return hit;
  }

  function onHit(m, demo) {
    m.flash = 1;
    focus = m;
    stopT = 0.45;
    invT = 1.2;
    mood = -1;
    game.feedback.bad(gx, GIRL_Y - 60, { text: 'MISS', shake: demo ? 6 : 14 });
    game.audio.play('se_break', 0.35);
    if (!demo) {
      lives--;
      if (lives <= 0) { over = true; won = false; outroT = 1.4; game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += lives * 200 + Math.max(0, Math.round((TIME_LIMIT - playT) * 30));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(gx, GIRL_Y - 80, { color: C.sun, count: 30, speed: 460 });
      game.fx.burst(gx, GIRL_Y - 80, { color: C.flesh, count: 24, speed: 380 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    game.audio.tone(x < W / 2 ? 440 : 520, 0.04, { wave: 'square', volume: 0.05 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 5, y + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  var GIRL_A = ['...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hfeffefh.', '..ffmmff..', '...ffff...', '..dddddd..', '.ddddddddb', '.dddddddbb', '..dddddd..', '..ff..ff..', '..kk..kk..'];
  var GIRL_B = ['...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hfeffefh.', '..ffmmff..', '...ffff...', '..dddddd..', '.ddddddddb', '.dddddddbb', '..dddddd..', '.ff....ff.', '.kk....kk.'];
  var GIRL_OUCH = ['...hhhh...', '..hhhhhh..', '.hhffffhh.', '.hf-ff-fh.', '..ffoof...', '...ffff...', '..dddddd..', 'fddddddddf', '..dddddd..', '..dddddd..', '.ff....ff.', '.kk....kk.'];
  var CART = ['....wwwwww', '...wggggggw', '..wggggggggw', 'wwwwwwwwwwww', '.kk......kk.'];

  function drawSlope() {
    var t = game.time.elapsed;
    game.draw.gradient(0, 600, [[0, C.sky], [1, C.sky2]]);
    // 遠景: 港の海と船(坂を上ると沈んで見える)
    var seaY = 420 + Math.min(200, sg * 0.08);
    game.draw.rect(0, seaY, W, 200, C.sea);
    for (var b = 0; b < 3; b++) {
      var bx = ((b * 400 + t * 30) % (W + 200)) - 100;
      game.draw.rect(bx, seaY + 30 + b * 40, 90, 20, C.white);
      game.draw.rect(bx + 30, seaY + 6 + b * 40, 8, 26, C.white);
    }
    // 石畳の坂(上るとスクロール)
    game.draw.gradient(230, H, [[0, '#d8c09a'], [1, C.stone]]);
    var off = sg % STEP_PX;
    for (var y = 230 - STEP_PX + off; y < H; y += STEP_PX) {
      game.draw.rect(WALL_L, y, WALL_R - WALL_L, 8, '#b89a70');
      for (var c = 0; c < 6; c++) game.draw.rect(WALL_L + c * 120 + ((Math.floor((y - off) / STEP_PX)) % 2) * 60, y + 8, 4, STEP_PX - 8, '#c8aa80');
    }
    // 両脇の家の壁(跳ね返る)
    var hoff = sg % 300;
    for (var side = 0; side < 2; side++) {
      var x0 = side === 0 ? 0 : WALL_R;
      game.draw.rect(x0, 230, WALL_L, H - 230, C.wall);
      game.draw.rect(side === 0 ? WALL_L - 14 : WALL_R, 230, 14, H - 230, C.ink);
      for (var hy = 230 - 300 + hoff; hy < H; hy += 300) {
        game.draw.rect(x0 + 40, hy + 40, 110, 90, '#7ac8f0');
        game.draw.rect(x0 + 40, hy + 40, 110, 12, C.roof);
        game.draw.rect(x0 + 60, hy + 160, 70, 60, side === 0 ? C.rind : C.flesh);
      }
    }
    // 坂の上: 家の門(ゴール)。近づくと見えてくる
    var goalY = GIRL_Y - (STEPS * STEP_PX - sg);
    if (goalY > 150) {
      game.draw.rect(WALL_L, goalY - 260, WALL_R - WALL_L, 260, C.wall);
      game.draw.rect(WALL_L - 20, goalY - 300, WALL_R - WALL_L + 40, 50, C.roof);
      game.draw.rect(480, goalY - 180, 120, 180, '#8a5a3a');
      game.draw.circle(580, goalY - 90, 10, C.sun);
    }
    // 上端の荷車(西瓜の出どころ)
    game.draw.sprite(CART, { w: '#8a5a3a', g: C.rind, k: C.ink }, 540 + Math.sin(t * 2) * 30, 262, 14, { anchor: 'center' });
  }

  function drawMelon(m) {
    var sy = GIRL_Y - (m.s - sg) - Math.max(0, m.hop) * 26;
    var hl = focus === m && stopT > 0;
    var r = m.r * (hl ? 1.35 : 1);
    game.draw.circle(m.x + 10, GIRL_Y - (m.s - sg) + m.r * 0.7, m.r * 0.8, C.ink, 0.2);
    game.draw.circle(m.x, sy, r + 6, C.ink);
    game.draw.circle(m.x, sy, r, hl ? C.white : C.rind);
    if (!hl) {
      var rot = (m.s / 40) % 6;
      for (var k = 0; k < 3; k++) {
        var sx = m.x - r * 0.6 + ((k * 2 + rot) % 6) * r * 0.24;
        game.draw.rect(sx, sy - r * 0.8, 8, r * 1.6, '#1a6a2a');
      }
      game.draw.circle(m.x - r * 0.35, sy - r * 0.35, r * 0.18, C.white, 0.6);
    }
  }

  function drawWarns() {
    var t = game.time.elapsed;
    for (var i = 0; i < warns.length; i++) {
      var a = warns[i];
      if (Math.floor(t * 12) % 2 === 0) {
        game.draw.circle(a.x, 320, a.r * 0.8, C.flesh, 0.85);
        game.draw.rect(a.x - 7, 290, 14, 40, C.white);
        game.draw.rect(a.x - 7, 340, 14, 12, C.white);
      }
      // 来る向きの点線
      for (var d = 1; d < 6; d++) {
        var px = a.x + (a.vx / a.v) * d * 70, py = 320 + d * 70;
        game.draw.circle(px, py, 8, C.flesh, 0.6);
      }
    }
  }

  function drawGirl() {
    var t = game.time.elapsed;
    var blink = invT > 0 && stopT <= 0 && Math.floor(t * 14) % 2 === 0;
    if (blink) return;
    var fr = mood < 0 ? GIRL_OUCH : (moving > 0 || moveDir !== 0 ? (Math.floor(t * 10) % 2 ? GIRL_A : GIRL_B) : (Math.floor(t * 5) % 2 ? GIRL_A : GIRL_B));
    var hop = mood > 0 ? Math.abs(Math.sin(t * 10)) * 24 : 0;
    game.draw.circle(gx, GIRL_Y + 70, 44, C.ink, 0.2);
    game.draw.sprite(fr, { h: '#5a3020', f: '#f2c8a0', e: C.ink, '-': C.ink, m: '#e84a5a', o: '#e84a5a', d: '#ff8ab0', b: C.sun, k: C.ink }, gx, GIRL_Y - hop, 15, { anchor: 'center', flipX: moveDir < 0 });
  }

  function drawPads() {
    for (var i = 0; i < 2; i++) {
      var dir = i === 0 ? -1 : 1;
      var px = i === 0 ? W * 0.22 : W * 0.78, py = H * 0.9;
      var on = moveDir === dir;
      game.draw.circle(px, py + 10, 120, C.ink);
      game.draw.circle(px, py, 120, on ? C.sun : C.white);
      for (var k = 0; k < 4; k++) game.draw.rect(px + dir * (k * 22 - 30) - 10, py - 12 - (3 - k) * 12, 20, 24 + (3 - k) * 24, C.ink);
    }
    // 止まっている間は上れる(上向きの印が光る)
    var climb = moveDir === 0 && moving <= 0;
    game.draw.circle(W / 2, H * 0.9, 56, climb ? C.ok : '#c8c8c8');
    for (var a = 0; a < 3; a++) game.draw.rect(W / 2 - 10 - a * 12, H * 0.9 - 30 + a * 14, 20 + a * 24, 12, C.ink);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.85);
    label(stepsUp() + ' / ' + STEPS, 240, 92, 64, C.white);
    label('SCORE ' + score, 240, 180, 36, C.sun);
    // 買い物袋の中身(ライフ)
    var items = [C.sun, C.flesh, C.ok];
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(640 + i * 90, 70, 34, C.white);
      game.draw.circle(640 + i * 90, 70, 28, i < lives ? items[i] : '#555');
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 140, 460, 22, '#333');
    game.draw.rect(560, 140, 460 * tk, 22, tk < 0.25 ? C.flesh : C.ok);
    game.draw.rect(560, 180, 460 * Math.min(1, sg / (STEPS * STEP_PX)), 14, C.sun);
  }

  function drawScene() {
    drawSlope();
    drawWarns();
    for (var i = 0; i < melons.length; i++) drawMelon(melons[i]);
    drawGirl();
    drawPads();
  }

  // ---- ATTRACT: 本物の西瓜を読んで横へ逃げ、止まって上る。最後に1つ当たって見せる ----
  var demo = { t: 0 };
  function threat() {
    var worst = null, best = 9;
    for (var i = 0; i < melons.length; i++) {
      var m = melons[i];
      var sy = GIRL_Y - (m.s - sg);
      if (m.passed || sy > GIRL_Y) continue;
      var tt = (GIRL_Y - sy) / (m.v + CLIMB);
      var px = m.x + m.vx * tt;
      if (px < WALL_L + m.r) px = 2 * (WALL_L + m.r) - px;
      if (px > WALL_R - m.r) px = 2 * (WALL_R - m.r) - px;
      if (tt < 1.0 && Math.abs(px - gx) < m.r + GIRL_R + 40 && tt < best) { best = tt; worst = px; }
    }
    return worst;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (demo.t <= dt || cyc < dt || readyT > 0) { initGame(); readyT = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    if (invT > 0) invT -= dt;
    var px = cyc < 5.5 ? threat() : null;
    moveDir = px === null ? 0 : (px > gx ? (gx - WALL_L > 140 ? -1 : 1) : (WALL_R - gx > 140 ? 1 : -1));
    if (cyc >= 5.5 && cyc < 5.5 + dt * 2) {
      // 失敗例: 真上から1玉
      melons.push({ x: gx, s: sg + 520, vx: 0, v: 430, r: 56, hop: 0, passed: false, flash: 0 });
    }
    var hit = stepWorld(dt, true);
    if (hit) onHit(hit, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      if (moveDir !== 0) game.draw.hand(moveDir < 0 ? W * 0.22 : W * 0.78, H * 0.9, { press: true, scale: 15 });
      else game.draw.hand(W * 0.5, H * 0.9 - 80, { press: false, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.85);
      label(GAME_TITLE, W / 2, 105, 88 + Math.sin(t * 3) * 3, C.sun);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.47, 52, C.flesh);
      else label('TAP TO START', W / 2, H * 0.47, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.3, W, H * 0.22, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 100, won ? C.ok : C.flesh);
      label('SCORE ' + score, W / 2, H * 0.42, 54, C.white);
      label(stepsUp() + ' / ' + STEPS + '  NICE ' + grazes, W / 2, H * 0.465, 38, C.sun);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.505, 48, C.sun);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.505, 36, C.white);
      if (!won) label('あと' + Math.max(1, STEPS - stepsUp()) + '段!', W / 2, H * 0.28, 52, C.sun);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.6, 36, C.white);
      return;
    }

    // ---- PLAYING: 押している側へ歩く ----
    moveDir = 0;
    if (!over && readyT <= 0 && stopT <= 0) {
      var tl = game.touches || [];
      for (var i = 0; i < tl.length; i++) if (tl[i].y > 230) moveDir = tl[i].x < W / 2 ? -1 : 1;
    }

    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { steps: stepsUp(), grazes: grazes, itemsLeft: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      if (invT > 0) invT -= dt;
      var before = stepsUp();
      var hit = stepWorld(dt, false);
      if (hit) onHit(hit, false);
      var now = stepsUp();
      if (now !== before) {
        score += 10 * (now - before);
        game.audio.tone(600 + now * 12, 0.03, { wave: 'triangle', volume: 0.04 });
        if (now === 20 && !milestone) { milestone = true; game.fx.popup('あと20段!', W / 2, H * 0.4, { color: C.sun, size: 64 }); game.audio.play('se_milestone', 0.45); }
      }
      if (!over && now >= STEPS) finish(true);
      else if (!over && playT >= TIME_LIMIT) { focus = null; finish(false); }
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 110, C.sun);
    if (over && !won && playT >= TIME_LIMIT) label('TIME UP', W / 2, H * 0.47, 96, C.flesh);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 2],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
