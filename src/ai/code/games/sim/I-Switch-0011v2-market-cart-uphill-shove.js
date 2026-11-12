// I-Switch-0011v2-market-cart-uphill-shove.js
// 青果市場の坂押し — 野菜を積んだ荷車の左右の取っ手を押し分け、くねる坂道から外さず、段差で荷を落とさない勢いで店先まで押し上げる
// 操作: 画面の左半分を押している間は左の取っ手だけ押して荷車が左へ向きを変えながら進み、右半分で右へ。左右同時に押すとまっすぐ強く押し上げる。どちらも離すと坂を少しずつ転がり戻る。道の縁に寄ると縁が赤く光る。黄色と黒の段差を速すぎる勢い(速さ計の赤い所)で越えると荷が1つ跳ね落ちる
// 終わり: 22秒以内に坂の上の店先まで押し上げればCLEAR。道から外れる/段差で荷を落とすのが合わせて3回でGAME OVER(時間切れも)
// @mechanic: push_out
// @theme: market_cart_uphill_shove
// 世界観: 朝の青果市場で、仲買人が野菜を山積みにした荷車を、露店の並ぶくねった坂道から外さず段差で荷をこぼさないように押し分けて、坂の上の店先まで押し上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し上げた距離%・ゆっくり越えた段差数・残った荷
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、背景2〜3層(地面+露店+日よけ)、暗色輪郭+ハイライト
  var STYLE = { bg: ['#c8a878', '#a88858', '#6a8a3a'], main: ['#e84838', '#f8c838', '#48a848'], accent: ['#ffffff', '#20182a'] };
  var C = {
    ground: STYLE.bg[0], ground2: STYLE.bg[1], grass: STYLE.bg[2], red: STYLE.main[0], yellow: STYLE.main[1], green: STYLE.main[2],
    white: STYLE.accent[0], ink: STYLE.accent[1], stone: '#d8c8b0', stone2: '#b8a888', wood: '#8a5a30', wood2: '#5a3818', blue: '#3878d8', orange: '#f88838',
  };

  var GAME_TITLE = 'MARKET SHOVE';
  var TIME_LIMIT = 22;
  var LIVES = 3;
  var D_GOAL = 4200;
  var RW = 175, CART_HALF = 62;
  var CART_Y = Math.round(H * 0.66);
  var SAFE_V = 290, MAX_V = 430;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var d, x, th, v, hold, bumps, playT, lives, score, slowBumps, readyT, stopT, focus, invT, over, won, outroT, edgeWarn, warnT, milestone, mood, cargo;

  function initGame() {
    d = 0; x = W / 2; th = 0; v = 0; hold = [false, false]; playT = 0; lives = LIVES; score = 0; slowBumps = 0;
    readyT = 0.8; stopT = 0; focus = null; invT = 0; over = false; won = false; outroT = 0; edgeWarn = 0; warnT = 0; milestone = false; mood = 0;
    cargo = [C.green, C.orange, C.red];
    bumps = [];
    for (var bd = 700; bd < D_GOAL - 300; bd += game.random(520, 700)) bumps.push({ d: bd, passed: false, flash: 0 });
  }

  // くねる道の中心(上へ行くほど曲がりが強い)
  function roadX(dd) {
    var k = Math.min(1, Math.max(0, dd) / D_GOAL);
    return W / 2 + Math.sin(dd / 520) * (60 + 150 * k) + Math.sin(dd / 210 + 1.3) * 30 * k;
  }
  function screenY(dd) { return CART_Y - (dd - d); }

  // ---- 進行(本番もデモも同じ)。戻り値: {kind:'edge'|'bump', ...} or null ----
  function stepWorld(dt, demo) {
    playT += dt;
    var thrust = 0, turn = 0;
    if (hold[0] && hold[1]) thrust = 420;
    else if (hold[0]) { thrust = 230; turn = -1.5; }
    else if (hold[1]) { thrust = 230; turn = 1.5; }
    th += turn * dt * Math.min(1, 0.3 + Math.abs(v) / 200);
    th = Math.max(-1.1, Math.min(1.1, th));
    v += (thrust - 70 - 0.8 * v) * dt;
    v = Math.max(-170, Math.min(MAX_V, v));
    x += Math.sin(th) * v * dt;
    d += Math.cos(th) * v * dt;
    if (d < 0) { d = 0; v = Math.max(0, v); }
    if (invT > 0) invT -= dt;
    // 道の縁の予告(赤く光る+ゴトゴト音)
    var off = Math.abs(x - roadX(d)) - (RW - CART_HALF);
    edgeWarn = off > -40 ? Math.min(1, (off + 40) / 40) : 0;
    if (edgeWarn > 0) {
      warnT -= dt;
      if (warnT <= 0) { warnT = 0.18; game.audio.tone(120, 0.06, { wave: 'square', volume: 0.05 }); }
    }
    if (off > 0 && invT <= 0) return { kind: 'edge' };
    for (var i = 0; i < bumps.length; i++) {
      var b = bumps[i];
      if (b.flash > 0) b.flash -= dt;
      if (!b.passed && d >= b.d) {
        b.passed = true;
        if (v > SAFE_V && invT <= 0) return { kind: 'bump', b: b };
        slowBumps++;
        b.flash = 0.4;
        if (!demo) score += 150;
        game.feedback.good(x, CART_Y - 140, { text: 'NICE', color: C.yellow, size: 48, sound: 'se_coin', volume: 0.3, count: 8 });
      }
    }
    return null;
  }

  function onFail(ev, demo) {
    stopT = 0.45; invT = 1.2; mood = -1;
    if (ev.kind === 'edge') {
      focus = { kind: 'edge' };
      game.feedback.bad(x, CART_Y, { text: 'MISS', shake: demo ? 6 : 14 });
      // 道へ戻して止める
      x = roadX(d) + (x > roadX(d) ? 1 : -1) * (RW - CART_HALF - 50);
      th = 0; v = 0;
    } else {
      ev.b.flash = 0.8;
      focus = { kind: 'bump', item: cargo[cargo.length - 1] || C.white };
      game.feedback.bad(x, CART_Y - 60, { text: 'MISS', shake: demo ? 6 : 14 });
      v *= 0.4;
    }
    game.audio.play('se_break', 0.4);
    if (!demo) {
      lives--;
      cargo.pop();
      if (lives <= 0) finish(false);
    }
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      score += 1000 + lives * 300 + Math.max(0, Math.round((TIME_LIMIT - playT) * 50));
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(x, CART_Y - 100, { color: C.yellow, count: 30, speed: 460 });
      game.fx.burst(x, CART_Y - 100, { color: C.red, count: 24, speed: 380 });
      game.fx.flash(C.white, 0.25);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力: 左右の取っ手を押す(押している間ずっと力がかかる) ----
  game.onTap(function(x0, y0) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(px, py) {
    if (state !== S.PLAYING) return;
    if (over || readyT > 0 || stopT > 0) { game.audio.play('se_tap', 0.08); return; }
    game.audio.tone(px < W / 2 ? 330 : 392, 0.05, { wave: 'square', volume: 0.05 });
    game.fx.burst(px < W / 2 ? W * 0.25 : W * 0.75, H * 0.88, { color: C.yellow, count: 5, speed: 150 });
  });

  function readTouches() {
    hold = [false, false];
    var tl = game.touches || [];
    for (var i = 0; i < tl.length; i++) if (tl[i].y > 230) hold[tl[i].x < W / 2 ? 0 : 1] = true;
  }

  // ---- 描画 ----
  function label(str, lx, ly, sz, col) {
    game.draw.text(str, lx + 4, ly + 5, { size: sz, color: C.ink, bold: true, align: 'center' });
    game.draw.text(str, lx, ly, { size: sz, color: col, bold: true, align: 'center' });
  }

  var MAN_A = ['..hhhh..', '.hhhhhh.', '..ffff..', '.bbbbbb.', 'abbbbbba', 'a.bbbb.a', '..pppp..', '..p..p..', '.kk..kk.'];
  var MAN_B = ['..hhhh..', '.hhhhhh.', '..ffff..', '.bbbbbb.', 'abbbbbba', 'a.bbbb.a', '..pppp..', '..p..p..', '..kk.kk.'];
  var MAN_PAL = { h: '#f0f0e0', f: '#e8b888', b: C.blue, a: '#e8b888', p: '#5a4a3a', k: C.ink };
  var STALL = ['rrwwrrwwrr', 'rrwwrrwwrr', '.y......y.', '.y.gg.o.y.', '.yggoooyy.', '.wwwwwwww.'];

  function drawMarket() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.grass], [1, '#4a6a2a']]);
    for (var y = 0; y < H; y += 20) {
      var dd = d + (CART_Y - y);
      var rx = roadX(dd);
      var band = Math.floor(dd / 60) % 2 === 0;
      // 地面(露店の並ぶ土の路肩)
      game.draw.rect(rx - RW - 150, y, 150, 20, band ? C.ground : C.ground2);
      game.draw.rect(rx + RW, y, 150, 20, band ? C.ground : C.ground2);
      // 石畳の道
      game.draw.rect(rx - RW, y, RW * 2, 20, band ? C.stone : C.stone2);
      game.draw.rect(rx - RW - 10, y, 10, 20, C.ink);
      game.draw.rect(rx + RW, y, 10, 20, C.ink);
      if (Math.floor(dd / 20) % 3 === 0) game.draw.rect(rx - RW + ((Math.floor(dd / 60) % 2) ? 40 : 100), y + 4, 60, 4, C.stone2);
    }
    // 道の縁の警告
    if (edgeWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      for (var yy = CART_Y - 260; yy < CART_Y + 140; yy += 20) {
        var rx2 = roadX(d + (CART_Y - yy));
        var side = x > roadX(d) ? 1 : -1;
        game.draw.rect(rx2 + side * RW - (side > 0 ? 0 : 14), yy, 14, 20, C.red);
      }
    }
    // 露店(両脇、スクロール)
    var off = d % 420;
    for (var sy = -420 + off; sy < H + 200; sy += 420) {
      var sd = d + (CART_Y - sy);
      var srx = roadX(sd);
      game.draw.sprite(STALL, { r: C.red, w: C.white, y: C.wood, g: C.green, o: C.orange }, srx - RW - 120, sy, 14, { anchor: 'center' });
      game.draw.sprite(STALL, { r: C.blue, w: C.white, y: C.wood, g: C.yellow, o: C.red }, srx + RW + 120, sy + 200, 14, { anchor: 'center' });
    }
    // 段差(黄黒の縞)
    for (var i = 0; i < bumps.length; i++) {
      var b = bumps[i];
      var by = screenY(b.d);
      if (by < -40 || by > H + 40) continue;
      var bx = roadX(b.d);
      for (var s = 0; s < 7; s++) game.draw.rect(bx - RW + s * (RW * 2 / 7), by - 14, RW * 2 / 7, 28, s % 2 ? C.ink : C.yellow);
      if (b.flash > 0) game.draw.rect(bx - RW, by - 20, RW * 2, 40, C.white, Math.min(0.8, b.flash * 2));
    }
    // 坂の上の店先(ゴール)
    var gy = screenY(D_GOAL);
    if (gy > -260) {
      var gx = roadX(D_GOAL);
      game.draw.rect(gx - 300, gy - 260, 600, 260, C.wood);
      game.draw.rect(gx - 320, gy - 300, 640, 60, C.red);
      for (var a = 0; a < 8; a++) game.draw.rect(gx - 320 + a * 80, gy - 300, 40, 60, C.white);
      game.draw.rect(gx - 120, gy - 160, 240, 160, C.wood2);
      if (Math.floor(t * 4) % 2 === 0) game.draw.circle(gx, gy - 200, 26, C.yellow);
    }
  }

  // 荷車(上から見た図)を向きに合わせて線で描く
  function drawCart() {
    var t = game.time.elapsed;
    if (invT > 0 && stopT <= 0 && Math.floor(t * 14) % 2 === 0) return;
    var sx = Math.sin(th), cy = Math.cos(th);
    var fx = x + sx * 90, fy = CART_Y - cy * 90;
    var bx = x - sx * 90, by = CART_Y + cy * 90;
    var jig = v > SAFE_V ? Math.sin(t * 40) * 3 : 0;
    game.draw.line(bx + 8, by + 8, fx + 8, fy + 8, C.ink, CART_HALF * 2 + 16);
    game.draw.line(bx, by, fx, fy, C.ink, CART_HALF * 2 + 10);
    game.draw.line(bx, by, fx, fy, C.wood, CART_HALF * 2);
    game.draw.line(bx + cy * 30, by + sx * 30, fx + cy * 30, fy + sx * 30, C.wood2, 8);
    game.draw.line(bx - cy * 30, by - sx * 30, fx - cy * 30, fy - sx * 30, C.wood2, 8);
    // 車輪
    for (var w = -1; w <= 1; w += 2) game.draw.circle(x + cy * w * (CART_HALF + 10), CART_Y + sx * w * (CART_HALF + 10), 20, C.ink);
    // 荷(残っている分だけ)
    for (var i = 0; i < cargo.length; i++) {
      var k = (i - 1) * 50;
      game.draw.circle(x + sx * k + jig, CART_Y - cy * k, 40, C.ink);
      game.draw.circle(x + sx * k + jig, CART_Y - cy * k, 34, cargo[i]);
      game.draw.circle(x + sx * k - 10 + jig, CART_Y - cy * k - 10, 10, C.white, 0.6);
    }
    // 取っ手(左右)と押している手
    var hx = x - sx * 130, hy = CART_Y + cy * 130;
    for (var s = 0; s < 2; s++) {
      var side = s === 0 ? -1 : 1;
      var gx = hx + cy * side * 55, gy = hy + sx * side * 55;
      game.draw.line(x - sx * 90 + cy * side * 55, CART_Y + cy * 90 + sx * side * 55, gx, gy, C.wood2, 14);
      game.draw.circle(gx, gy, 18, hold[s] ? C.yellow : C.ink);
    }
    var fr = Math.floor(t * (Math.abs(v) > 40 ? 10 : 3)) % 2 ? MAN_A : MAN_B;
    game.draw.sprite(fr, MAN_PAL, hx, hy + 70, 13, { anchor: 'center' });
    // 落ちた荷のハイライト
    if (focus && stopT > 0) {
      if (focus.kind === 'bump') {
        var ly = CART_Y - 80 - (0.45 - stopT) * 300;
        game.draw.circle(x + 120, ly, 70, C.white, 0.85);
        game.draw.circle(x + 120, ly, 52, focus.item);
      } else {
        game.draw.circle(x, CART_Y, 150, C.white, 0.35);
      }
    }
  }

  function drawPads() {
    for (var s = 0; s < 2; s++) {
      var px = s === 0 ? W * 0.25 : W * 0.75, py = H * 0.88;
      game.draw.circle(px, py + 10, 112, C.ink);
      game.draw.circle(px, py, 112, hold[s] ? C.yellow : C.white);
      game.draw.rect(px - 70, py - 18, 140, 36, C.wood2);
      game.draw.rect(px - 70, py - 18, 140, 10, C.wood);
      // 押した側へ曲がる弧の矢印
      var dir = s === 0 ? -1 : 1;
      for (var a = 0; a < 4; a++) game.draw.circle(px + dir * a * 22, py - 50 - a * a * 6 + a * 10, 10, C.red);
    }
  }

  function drawSpeed() {
    // 速さ計(赤い所で段差を越えると荷が落ちる)
    var mx = 960, my0 = 360, mh = 600;
    game.draw.rect(mx - 30, my0 - 6, 60, mh + 12, C.ink);
    game.draw.rect(mx - 24, my0, 48, mh * (1 - SAFE_V / MAX_V), C.red);
    game.draw.rect(mx - 24, my0 + mh * (1 - SAFE_V / MAX_V), 48, mh * SAFE_V / MAX_V, C.green);
    var vv = Math.max(0, v) / MAX_V;
    game.draw.rect(mx - 40, my0 + mh * (1 - vv) - 8, 80, 16, C.white);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.88);
    var progress = Math.min(1, d / D_GOAL);
    label(Math.round(progress * 100) + ' / ' + 100, 220, 100, 60, C.white);
    label('SCORE ' + score, 220, 182, 36, C.yellow);
    var items = [C.green, C.orange, C.red];
    for (var i = 0; i < LIVES; i++) {
      game.draw.circle(640 + i * 100, 66, 36, C.white);
      game.draw.circle(640 + i * 100, 66, 30, i < lives ? items[i] : '#555');
    }
    var timeLeft = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(560, 130, 440, 24, '#333');
    game.draw.rect(560, 130, 440 * timeLeft, 24, timeLeft < 0.25 ? C.red : C.green);
    game.draw.rect(560, 172, 440, 18, '#333');
    game.draw.rect(560, 172, 440 * progress, 18, C.yellow);
  }

  function drawScene() {
    drawMarket();
    drawCart();
    drawPads();
    drawSpeed();
  }

  // ---- ATTRACT: 実ロジックで取っ手を押し分けて坂を上り、段差の前で緩める。最後に速いまま段差を越えて荷を落として見せる ----
  var demo = { t: 0, hs: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (demo.t <= dt || cyc < dt) { initGame(); readyT = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; return; }
    var look = d + 200;
    var want = Math.atan2(roadX(look) - x, 200);
    var nextB = null;
    for (var i = 0; i < bumps.length; i++) if (!bumps[i].passed) { nextB = bumps[i]; break; }
    var slow = nextB && nextB.d - d < 260 && cyc < 6.8;
    hold = [false, false];
    if (th > want + 0.08) hold[0] = true;
    else if (th < want - 0.08) hold[1] = true;
    else if (!slow || v < SAFE_V - 80) { hold[0] = true; hold[1] = true; }
    var ev = stepWorld(dt, true);
    if (ev) onFail(ev, true);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      if (hold[0] && hold[1]) demo.hs = Math.floor(t * 3) % 2;
      else if (hold[0]) demo.hs = 0;
      else if (hold[1]) demo.hs = 1;
      game.draw.hand(demo.hs === 0 ? W * 0.25 : W * 0.75, H * 0.88, { press: hold[demo.hs], scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.88);
      label(GAME_TITLE, W / 2, 105, 88 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.42, 52, C.red);
      else label('TAP TO START', W / 2, H * 0.42, 46, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.26, W, H * 0.24, C.ink, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 100, won ? C.green : C.red);
      label('SCORE ' + score, W / 2, H * 0.38, 54, C.white);
      label(Math.round(Math.min(1, d / D_GOAL) * 100) + ' / 100  NICE ' + slowBumps, W / 2, H * 0.425, 38, C.yellow);
      if (won && score > game.best) label('NEW RECORD', W / 2, H * 0.47, 48, C.yellow);
      else label('BEST ' + Math.max(game.best, won ? score : 0), W / 2, H * 0.47, 36, C.white);
      if (!won) label('あと' + Math.max(1, Math.round((D_GOAL - d) / 100)) + 'm!', W / 2, H * 0.23, 60, C.yellow);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.54, 36, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      hold = [false, false];
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { pct: Math.round(Math.min(1, d / D_GOAL) * 100), slowBumps: slowBumps, cargo: lives };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_jump', 0.3);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      readTouches();
      var before = d;
      var ev = stepWorld(dt, false);
      if (ev) onFail(ev, false);
      if (!milestone && before < D_GOAL / 2 && d >= D_GOAL / 2) {
        milestone = true;
        game.fx.popup('50 / 100', W / 2, H * 0.36, { color: C.yellow, size: 70 });
        game.audio.play('se_milestone', 0.45);
      }
      if (!over && d >= D_GOAL) finish(true);
      else if (!over && playT >= TIME_LIMIT) finish(false);
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.yellow);
    if (over && !won && lives > 0) label('TIME UP', W / 2, H * 0.42, 96, C.red);
    if (over && won) label('FINISH', W / 2, H * 0.42, 100, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 1], ['G4', 1],
    ], { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 1], ['D3', 1], ['C3', 1], ['D3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
