// I-GBA-0018v3-hayloft-cart-toss.js
// 干し草小屋の放り込み — 決まった弧で飛ぶ干し草の束を、行き来する荷車の籠が落下点に来るタイミングで放る
// 操作: タップで干し草を放る。弧と落下点は点線で見えている。籠がその時そこに来るよう、荷車の動きを読んで先に投げる
// 終わり: 8束のうち5束を籠に入れれば成功。束が尽きる/時間切れで失敗
// @mechanic: trajectory
// @theme: ranch_hayloft_cart_toss
// 世界観: 牧場の干し草小屋で、2階の戸口に立つ牧童が、ポニーに引かれて行き来する荷車の籠へ干し草の束を弧で放り込み、5つの籠を満たす
// 残るもの: 正誤(CLEAR/GAME OVER) + 入れた籠の数と投げた束の数
// スタイル: 8bit HOME

(function(game) {
  var STYLE = { bg: ['#5c94fc', '#a4e4fc', '#000000'], main: ['#ac7c00', '#f8d878'], accent: ['#f83800', '#00a800'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'HAY TOSS';
  var TIME_LIMIT = 18;
  var NEEDED = 5;
  var BALES = 8;
  var TX = W * 0.19;
  var TY = H * 0.33;
  var RIM_Y = H * 0.655;
  var GROUND = H * 0.70;
  var GRAV = 2200;
  var VY0 = -700;
  var BASE_LAND = W * 0.62;
  var TRACK = [W * 0.38, W * 0.92];
  var HALF_BASKET = 80;
  var SPEEDS = [260, 320, 380, 440, 500];
  var WINDS = [0, 0, 90, -110, 130];

  var ST = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var st = ST.ATTRACT;

  var cart = { x: TRACK[0], dir: 1, turnIn: -1, look: 0 };
  var bale = null;
  var FLIGHT = (-VY0 + Math.sqrt(VY0 * VY0 + 2 * GRAV * (RIM_Y - TY))) / GRAV;
  var filled = 0, thrown = 0, pts = 0, clock = TIME_LIMIT, countdown = 0, pause = 0, leave = 0, lastGap = null;
  var on = false, ok = false, throwAnim = 0;

  var HAND_A = ['..hhhh..', '.hhhhhh.', '..ssss..', '..s.s...', '..ssss..', '.rrrrrr.', 'r.rrrr.r', '..bbbb..', '..b..b..', '.bb..bb.'];
  var HAND_B = ['..hhhh..', '.hhhhhh.', '..ssss..', '..s.s...', 'r.ssss.r', '.rrrrrr.', '..rrrr..', '..bbbb..', '..b..b..', '.bb..bb.'];
  var HAND_PAL = { 'h': '#f8d878', 's': '#fcbcb0', 'r': '#fcfcfc', 'b': '#ac7c00' };
  var PONY_A = ['.......##', '......###', '#######..', '########.', '#.#..#.#.', '#.#..#.#.'];
  var PONY_B = ['.......##', '......###', '#######..', '########.', '.#.#.#.#.', '.#.#.#.#.'];
  var PONY_LOOK = ['##.......', '###......', '..#######', '.########', '.#.#..#.#', '.#.#..#.#'];
  var HAY = ['.yyyy.', 'yyyyyy', 'ybyyby', 'yyyyyy', '.yyyy.'];
  var BASKET = ['b.b.b.b.b.b', 'bbbbbbbbbbb', '.bbbbbbbbb.', '..bbbbbbb..'];
  var SOCK_A = ['rwrw', 'rwr.', 'rw..'];
  var SOCK_B = ['rwrw', '.wrw', '..rw'];

  function say(str, x, y, size, color) {
    game.draw.text(str, x + 4, y + 4, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function round() { return Math.min(filled, NEEDED - 1); }
  function landX() { return BASE_LAND + WINDS[round()]; }

  function moveCart(c, dt, spd) {
    if (c.look > 0) c.look -= dt;
    if (c.turnIn > 0) {
      c.turnIn -= dt;
      if (c.turnIn <= 0.5 && c.look <= 0 && c.turnIn > 0) c.look = c.turnIn;
      if (c.turnIn <= 0) { c.dir = -c.dir; c.turnIn = -1; }
    }
    c.x += c.dir * spd * dt;
    if (c.x > TRACK[1]) { c.x = TRACK[1]; c.dir = -1; }
    if (c.x < TRACK[0]) { c.x = TRACK[0]; c.dir = 1; }
  }

  function planFeint() {
    cart.turnIn = filled >= 2 ? game.random(1.2, 2.4) : -1;
  }

  function predictCart(T) {
    var c = { x: cart.x, dir: cart.dir, turnIn: cart.turnIn, look: cart.look };
    var spd = SPEEDS[round()];
    for (var t = 0; t < T; t += 1 / 60) moveCart(c, 1 / 60, spd);
    return c.x;
  }

  function resetYard() {
    cart.x = TRACK[0]; cart.dir = 1; cart.turnIn = -1; cart.look = 0;
    bale = null; filled = 0; thrown = 0; lastGap = null; throwAnim = 0;
  }

  function newRun() {
    resetYard();
    pts = 0; clock = TIME_LIMIT; countdown = 0.8; pause = 0; leave = 0;
    on = false; ok = false;
  }

  function toss(loud) {
    if (bale || thrown >= BALES) return false;
    var vx = (landX() - TX) / FLIGHT;
    bale = { x: TX, y: TY, vx: vx, vy: VY0, t: 0 };
    thrown++; throwAnim = 0.25;
    if (loud) game.audio.play('se_jump', 0.35);
    return true;
  }

  // 実ロジック: 束の飛行と着弾判定。戻り値 'in' | 'out' | null
  function flyBale(dt) {
    if (!bale) return null;
    bale.t += dt;
    bale.vy += GRAV * dt;
    bale.x += bale.vx * dt;
    bale.y += bale.vy * dt;
    if (bale.y >= RIM_Y) {
      var gap = bale.x - cart.x;
      lastGap = { x: bale.x, gap: gap, t: 0.8 };
      var res = Math.abs(gap) <= HALF_BASKET ? 'in' : 'out';
      bale = null;
      return res;
    }
    return null;
  }

  function onLand(res, loud) {
    if (res === 'in') {
      filled++;
      if (filled >= 2) planFeint();
      if (!loud) return;
      var acc = Math.max(0, 1 - Math.abs(lastGap.gap) / HALF_BASKET);
      pts += Math.round(100 + acc * 100);
      game.feedback.good(cart.x, RIM_Y - 60, { text: acc > 0.7 ? 'PERFECT' : 'GOOD', color: STYLE.main[1], count: acc > 0.7 ? 20 : 12 });
      game.audio.play('se_coin', 0.35);
      if (filled === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.22, { color: STYLE.main[1], size: 52 }); game.audio.play('se_milestone', 0.45); }
    } else if (loud) {
      game.feedback.bad(lastGap.x, RIM_Y, { text: 'MISS', shake: 8 });
    }
  }

  function wrap(win) {
    on = false; ok = win; pause = win ? 0.4 : 0.55;
    game.audio.stopBgm();
    if (win) { pts += Math.round(clock * 15) + (BALES - thrown) * 50; game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(cart.x, RIM_Y - 40, { text: clock <= 0 ? 'TIME UP' : 'MISS', shake: 12 }); game.audio.play('se_failure', 0.45); }
  }

  game.onTap(function(x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.5); st = ST.PLAYING; newRun(); return; }
    if (st === ST.RESULT) { st = ST.ATTRACT; newRun(); demo.t = 0; return; }
    if (!on) return;
    if (!toss(true)) {
      game.audio.play('se_tap', 0.12);
      game.fx.burst(x, y, { color: STYLE.main[1], count: 4, speed: 90 });
    }
  });

  // ── ATTRACT ゴースト実演: predictCart() で着弾時の籠位置を読み、toss()/flyBale() で実際に放る。偶数周の2投目は早投げで外す ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.85, press: 0, rash: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { resetYard(); demo.rash = Math.floor(demo.t / 9) % 2 === 1; }
    if (demo.press > 0) demo.press -= dt;
    if (throwAnim > 0) throwAnim -= dt;
    if (lastGap) { lastGap.t -= dt; if (lastGap.t <= 0) lastGap = null; }
    moveCart(cart, dt, SPEEDS[round()]);
    if (!bale && !lastGap) {
      var lead = demo.rash && thrown === 1 ? FLIGHT + 0.35 : FLIGHT;
      var fx = predictCart(lead);
      if (Math.abs(fx - landX()) < 22) { toss(false); demo.press = 0.22; }
    }
    var r = flyBale(dt);
    if (r) { onLand(r, false); if (r === 'out') demo.rash = false; }
    if (filled >= NEEDED || thrown >= BALES) resetYard();
  }

  // ── 描画(8bit: 8x8タイル反復・少色) ──
  function drawYard(highlight) {
    var t = game.time.elapsed;
    game.draw.gradient(0, GROUND, [STYLE.bg[0], STYLE.bg[1]]);
    // 雲
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + t * 30) % (W + 300)) - 150;
      game.draw.rect(cx, 240 + c * 60, 160, 32, '#fcfcfc', 1);
      game.draw.rect(cx + 32, 208 + c * 60, 96, 32, '#fcfcfc', 1);
    }
    // 遠くの柵
    for (var f = 0; f < 18; f++) game.draw.rect(f * 64, GROUND - 90, 12, 90, '#fcfcfc', 1);
    game.draw.rect(0, GROUND - 76, W, 10, '#fcfcfc', 1);
    game.draw.rect(0, GROUND - 40, W, 10, '#fcfcfc', 1);
    // 地面タイル
    for (var y = GROUND; y < H; y += 32) {
      for (var x = 0; x < W; x += 32) {
        game.draw.rect(x, y, 32, 32, ((x + y) / 32) % 2 === 0 ? '#00a800' : '#008800', 1);
      }
    }
    // 小屋(板タイル)
    for (var by = H * 0.22; by < GROUND; by += 32) {
      for (var bx = 0; bx < W * 0.28; bx += 64) game.draw.rect(bx, by, 60, 30, '#a81000', 1);
    }
    game.draw.rect(TX - 70, TY - 110, 140, 150, '#000000', 1);
    game.draw.rect(0, H * 0.22 - 24, W * 0.30, 24, '#fcfcfc', 1);
    // 吹き流し(風)
    var wind = WINDS[round()];
    var sock = Math.floor(t * (wind ? 10 : 3)) % 2 === 0 ? SOCK_A : SOCK_B;
    game.draw.rect(W * 0.95, H * 0.36, 8, GROUND - H * 0.36, '#fcfcfc', 1);
    game.draw.sprite(sock, { 'r': STYLE.accent[0], 'w': '#fcfcfc' }, W * 0.95 + (wind < 0 ? -64 : 8), H * 0.36, 16, { anchor: 'topleft', flipX: wind < 0 });
    // 予告: 弧の点線と落下点
    var lx = landX();
    var vx = (lx - TX) / FLIGHT;
    for (var k = 1; k < 14; k++) {
      var tt = FLIGHT * k / 14;
      var px = TX + vx * tt, py = TY + VY0 * tt + 0.5 * GRAV * tt * tt;
      if ((k + Math.floor(t * 6)) % 2 === 0) game.draw.rect(px - 6, py - 6, 12, 12, '#fcfcfc', 0.9);
    }
    var blink = Math.floor(t * 5) % 2 === 0;
    game.draw.rect(lx - 40, RIM_Y - 4, 80, 8, blink ? STYLE.accent[0] : '#fcfcfc', 1);
    game.draw.rect(lx - 4, RIM_Y - 40, 8, 80, blink ? STYLE.accent[0] : '#fcfcfc', 0.6);
    if (highlight) game.draw.rect(lx - 100, RIM_Y - 100, 200, 200, '#ffffff', 0.4);
  }

  function drawCart(highlight) {
    var walk = Math.floor(game.time.elapsed * 8) % 2 === 0;
    var face = cart.look > 0 ? PONY_LOOK : (walk ? PONY_A : PONY_B);
    var ponyX = cart.x + cart.dir * 170;
    game.draw.sprite(face, { '#': '#fcfcfc' }, ponyX, GROUND - 60, 14, { anchor: 'center', flipX: cart.dir < 0 });
    if (cart.look > 0 && Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.rect(ponyX - 8, GROUND - 170, 16, 40, STYLE.accent[0], 1);
    game.draw.line(cart.x, GROUND - 40, ponyX, GROUND - 60, '#000000', 6);
    if (highlight) game.draw.rect(cart.x - 110, RIM_Y - 60, 220, 140, '#ffffff', 0.5);
    game.draw.rect(cart.x - 100, GROUND - 60, 200, 40, '#ac7c00', 1);
    game.draw.circle(cart.x - 60, GROUND - 16, 24, '#000000', 1);
    game.draw.circle(cart.x + 60, GROUND - 16, 24, '#000000', 1);
    game.draw.sprite(BASKET, { 'b': '#f8d878' }, cart.x, RIM_Y + 18, 16, { anchor: 'center' });
    if (lastGap) {
      game.draw.line(lastGap.x, RIM_Y - 30, cart.x, RIM_Y - 30, Math.abs(lastGap.gap) <= HALF_BASKET ? STYLE.accent[1] : STYLE.accent[0], 6);
    }
  }

  function drawThrower() {
    var bob = Math.sin(game.time.elapsed * 3) * 3;
    game.draw.sprite(throwAnim > 0 ? HAND_B : HAND_A, HAND_PAL, TX - 20, TY - 40 + bob, 12, { anchor: 'center' });
    if (!bale && throwAnim <= 0 && thrown < BALES) game.draw.sprite(HAY, { 'y': '#f8d878', 'b': '#ac7c00' }, TX + 44, TY - 10 + bob, 10, { anchor: 'center' });
    if (bale) game.draw.sprite(HAY, { 'y': '#f8d878', 'b': '#ac7c00' }, bale.x, bale.y, 12, { anchor: 'center' });
  }

  function drawStock(pressing) {
    var y = H * 0.84;
    game.draw.rect(100, y - 90, W - 200, 180, '#000000', 1);
    game.draw.rect(108, y - 82, W - 216, 164, pressing ? '#ac7c00' : '#503000', 1);
    for (var i = 0; i < BALES; i++) {
      var used = i < thrown;
      game.draw.sprite(HAY, { 'y': used ? '#503000' : '#f8d878', 'b': '#000000' }, 190 + i * 100, y, 12, { anchor: 'center' });
    }
  }

  function drawHud() {
    say(filled + ' / ' + NEEDED, W / 2, 96, 52, '#fcfcfc');
    var bw = W - 160;
    var low = clock < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 160, bw, 20, '#000000', 1);
    game.draw.rect(84, 164, (bw - 8) * Math.max(0, clock / TIME_LIMIT), 12, low ? STYLE.accent[0] : '#fcfcfc', 1);
    say(String(pts), W - 120, 96, 32, STYLE.main[1]);
  }

  game.onUpdate(function(dt) {
    if (st === ST.ATTRACT) {
      stepDemo(dt);
      var dmiss = lastGap && Math.abs(lastGap.gap) > HALF_BASKET;
      drawYard(dmiss);
      drawCart(false);
      drawThrower();
      drawStock(demo.press > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2) * 6;
      say(GAME_TITLE, W / 2, H * 0.075 + bob, 68, STYLE.main[1]);
      say('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.12, 30, '#fcfcfc');
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.965, 38, STYLE.main[1]);
      else say('INSERT COIN', W / 2, H * 0.965, 30, '#fcfcfc');
      return;
    }

    if (st === ST.RESULT) {
      drawYard(false);
      drawCart(!ok);
      drawThrower();
      drawStock(false);
      say(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.085, 68, ok ? STYLE.main[1] : STYLE.accent[0]);
      say(filled + ' / ' + NEEDED, W / 2, H * 0.13, 40, '#fcfcfc');
      say('SCORE ' + pts, W / 2, H * 0.165, 32, '#fcfcfc');
      if (!ok) say('あと' + (NEEDED - filled) + '個!', W / 2, H * 0.20, 32, STYLE.main[1]);
      say('BEST ' + Math.round(game.best || 0), W / 2, H * 0.235, 26, '#fcfcfc');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.965, 30, '#fcfcfc');
      return;
    }

    // ── PLAYING ──
    if (throwAnim > 0) throwAnim -= dt;
    if (lastGap) { lastGap.t -= dt; if (lastGap.t <= 0) lastGap = null; }
    if (leave > 0) {
      leave -= dt;
      if (leave <= 0) {
        st = ST.RESULT;
        var stats = { filled: filled, thrown: thrown };
        if (ok) game.end.success(pts, stats); else game.end.failure(stats);
      }
    } else if (pause > 0) {
      pause -= dt;
      if (pause <= 0) leave = 1.0;
    } else if (countdown > 0) {
      countdown -= dt;
      if (countdown <= 0) { on = true; game.audio.play('se_tap', 0.35); }
    } else if (on) {
      clock -= dt;
      moveCart(cart, dt, SPEEDS[round()]);
      if (cart.look > 0 && cart.look + dt >= 0.5) game.audio.tone('D5', 0.12, { wave: 'square', volume: 0.06 });
      var r = flyBale(dt);
      if (r) onLand(r, true);
      if (filled >= NEEDED) wrap(true);
      else if (thrown >= BALES && !bale && !lastGap) wrap(false);
      else if (clock <= 0) { clock = 0; wrap(false); }
    }

    drawYard(false);
    drawCart(pause > 0 && !ok);
    drawThrower();
    drawStock(throwAnim > 0);
    drawHud();
    if (countdown > 0) say(countdown > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 88, STYLE.main[1]);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['F5', 0.5], ['D5', 0.5], ['E5', 0.25], ['C5', 0.25], ['D5', 0.25], ['B4', 0.25], ['C5', 1]], { tempo: 140, wave: 'square', volume: 0.045, loop: true, bass: true });
    st = ST.ATTRACT;
    newRun();
  });
})(game);
