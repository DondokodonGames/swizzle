// J-Switch-0010-saltpan-sailcart-bump.js
// 塩の台地の帆走車ぶつけ — 止まった自分の帆走車を指ではじいて滑らせ、台地に居座る相手の車にぶつけて縁の外へ落とす。強すぎると自分が落ちる
// 操作: 自分の車が止まって光っている間に、指を置いて進ませたい方向へはじく。はじく速さで勢いが決まる(社内メモ。画面には出さない)
// 終わり: 相手の車を4台落とせばCLEAR。自分が2回落ちる/時間切れでGAME OVER
// @mechanic: flick_launch
// @theme: saltpan_sailcart_bumper
// 世界観: 干上がった塩湖に残る丸い塩の台地で、帆走車乗りの見習いが自分の車をはじいて滑らせ、台地に居座るほかの帆走車を縁から塩原へ突き落とす。夕風の大会で最後まで台地に残るための一押し勝負
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とした台数・連続落とし(NICE)数・自分の落下回数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 面はストリップ塗りの疑似3D、キャラは奥行きで縮む板ポリ(スプライト)
  var STYLE = { bg: ['#ff9a7a', '#ffd9a0', '#f4ecdc'], main: ['#e8e2d2', '#b8ae98', '#8a7e6a'], accent: ['#ffcc33', '#ff4a5a'] };
  var C = {
    sky1: '#6a4a9a', sky2: STYLE.bg[0], sky3: STYLE.bg[1], pan: '#e6dccb', panD: '#c8baa2', mesaTop: STYLE.main[0],
    mesaTop2: '#f6f1e6', mesaSide: STYLE.main[2], mesaSide2: '#6c604e', crack: STYLE.main[1], far: '#b0708a',
    me: STYLE.accent[0], bad: STYLE.accent[1], rivalA: '#4a8aff', rivalB: '#8a5ad8', rivalC: '#2abf9a', body: '#6a4a3a',
    wheel: '#2a2020', skin: '#ffd0a0', ink: '#1e1424', white: '#ffffff', good: '#5ae08a'
  };

  var GAME_TITLE = 'SALTPAN BUMP';
  var TIME_LIMIT = 18;
  var NEEDED = 4;
  var LIVES = 2;
  var CX = W / 2, CY = H * 0.5, RX = 430, RY = 250;
  var R = 0.14;
  var RETAIN = 0.55;
  var DECEL = 0.4;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var CART = [
    ['......m.....', '.....sm.....', '....ssm.....', '...sssm.....', '..ssssm.....', '.sssssm.....', 'ssssssm.dd..', '......m.dd..', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '.kk......kk.'],
    ['......m.....', '......ms....', '....sssm....', '...ssssm....', '..sssssm....', '.ssssssm....', 'sssssssmdd..', '......m.dd..', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '..kk....kk..']
  ];
  var MESA_FAR = ['....mmmm....', '..mmmmmmmm..', 'mmmmmmmmmmmm'];

  var phase, readyT, timeLeft, lives, outs, combo, nices, falls, me, rivals, spawned, idleT, stopT, outroT, win, flick, focus, respawnT, lastHitT, halfShown;

  function mkRival(x, y, col) { return { x: x, y: y, vx: 0, vy: 0, col: col, fall: 0, lunge: 0, lungeCd: game.random(1.6, 3.2), dx: 0, dy: 0, drop: 0, wob: game.random(0, 6) }; }

  function initGame() {
    phase = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; lives = LIVES; outs = 0; combo = 0; nices = 0; falls = 0;
    me = { x: 0, y: 0.6, vx: 0, vy: 0, fall: 0 };
    rivals = [mkRival(-0.45, -0.3, C.rivalA), mkRival(0.1, -0.55, C.rivalB), mkRival(0.5, -0.1, C.rivalC)];
    spawned = 3; idleT = 0; stopT = 0; outroT = 0; win = false; flick = null; focus = null; respawnT = 0; lastHitT = 0; halfShown = false;
  }

  function sx(x) { return CX + x * RX; }
  function sy(y) { return CY + y * RY; }
  function depth(y) { return 0.72 + 0.28 * (y + 1) / 2; }
  function speed(o) { return Math.sqrt(o.vx * o.vx + o.vy * o.vy); }
  function ready() { return me.fall === 0 && respawnT <= 0 && speed(me) < 0.22; }

  function slide(o, dt) {
    o.x += o.vx * dt; o.y += o.vy * dt;
    var k = Math.pow(RETAIN, dt);
    o.vx *= k; o.vy *= k;
    var sp = speed(o);
    if (sp > 0) { var d = Math.min(sp, DECEL * dt); o.vx -= o.vx / sp * d; o.vy -= o.vy / sp * d; }
  }

  function bump(a, b, mb, isDemo) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d >= R * 2 || d === 0) return false;
    var nx = dx / d, ny = dy / d;
    var rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    var over = R * 2 - d;
    a.x -= nx * over / 2; a.y -= ny * over / 2; b.x += nx * over / 2; b.y += ny * over / 2;
    if (rel <= 0) return false;
    var j = (1.9 * rel) / (1 + mb);
    a.vx -= j * mb * nx; a.vy -= j * mb * ny;
    b.vx += j * nx; b.vy += j * ny;
    if (!isDemo && rel > 0.3) { game.audio.play('se_break', 0.25); game.fx.shake(8, 0.15); }
    return true;
  }

  function doFlick(vx, vy, isDemo) {
    if (!ready() || phase !== 'play') return false;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp < 0.15) return false;
    if (sp > 1.9) { vx *= 1.9 / sp; vy *= 1.9 / sp; }
    me.vx = vx; me.vy = vy; idleT = 0; combo = 0;
    if (!isDemo) game.audio.play('se_jump', 0.35);
    return true;
  }

  function stepArena(dt, isDemo) {
    lastHitT += dt;
    if (respawnT > 0) {
      respawnT -= dt;
      if (respawnT <= 0) { me = { x: 0, y: 0.6, vx: 0, vy: 0, fall: 0 }; }
    }
    if (me.fall > 0) me.fall += dt;
    else if (respawnT <= 0) slide(me, dt);
    if (ready()) idleT += dt;

    var mass = 1 + outs * 0.1;
    for (var i = 0; i < rivals.length; i++) {
      var r = rivals[i];
      if (r.drop > 0) { r.drop -= dt; continue; }
      if (r.fall > 0) { r.fall += dt; continue; }
      // ゆっくり中央へ戻ろうとする
      if (speed(r) < 0.3) { r.vx += -r.x * 0.25 * dt; r.vy += -r.y * 0.25 * dt; }
      // 突進(0.7秒の予告のあと自分めがけて)
      if (r.lunge > 0) {
        r.lunge -= dt;
        if (r.lunge <= 0) {
          var len = Math.max(0.01, Math.sqrt(r.dx * r.dx + r.dy * r.dy));
          r.vx = r.dx / len * 1.05; r.vy = r.dy / len * 1.05;
          r.lungeCd = game.random(2.6, 4);
          if (!isDemo) game.audio.tone('G2', 0.18, { wave: 'sawtooth', volume: 0.05, slide: -40 });
        }
      } else if (me.fall === 0 && respawnT <= 0) {
        r.lungeCd -= dt * (idleT > 3 ? 3 : 1);
        if (r.lungeCd <= 0 && speed(r) < 0.3) {
          r.lunge = 0.7; r.dx = me.x - r.x; r.dy = me.y - r.y;
          if (!isDemo) game.audio.tone('C5', 0.08, { wave: 'square', volume: 0.04 });
        }
      }
      slide(r, dt);
    }
    for (var a = 0; a < rivals.length; a++) {
      var ra = rivals[a];
      if (ra.fall > 0 || ra.drop > 0) continue;
      if (me.fall === 0 && respawnT <= 0 && bump(me, ra, mass, isDemo)) lastHitT = 0;
      for (var b = a + 1; b < rivals.length; b++) {
        var rb = rivals[b];
        if (rb.fall > 0 || rb.drop > 0) continue;
        bump(ra, rb, 1, isDemo);
      }
    }
    // 縁から落ちたか
    for (var q = 0; q < rivals.length; q++) {
      var rq = rivals[q];
      if (rq.fall === 0 && rq.drop <= 0 && rq.x * rq.x + rq.y * rq.y > 1.02) { rq.fall = 0.001; knocked(rq, isDemo); }
    }
    rivals = rivals.filter(function(o) { return o.fall < 0.9; });
    if (me.fall === 0 && respawnT <= 0 && me.x * me.x + me.y * me.y > 1.02) { me.fall = 0.001; iFell(isDemo); }
    if (me.fall > 0.8 && respawnT <= 0 && phase === 'play') { me.fall = 0; respawnT = 0.4; me.x = 0; me.y = 0.6; }
  }

  function knocked(r, isDemo) {
    outs++;
    var chain = lastHitT < 1.6;
    if (chain) combo++;
    if (isDemo) { game.fx.burst(sx(r.x), sy(r.y), { color: C.white, count: 12, speed: 260 }); return; }
    game.audio.play('se_coin', 0.45);
    if (combo >= 2) { nices++; game.feedback.good(sx(r.x), sy(r.y) - 80, { text: 'NICE', color: C.me, count: 18 }); }
    else game.feedback.good(sx(r.x), sy(r.y) - 80, { text: 'GOOD', color: C.good, count: 10 });
    if (!halfShown && outs === NEEDED / 2) {
      halfShown = true; game.audio.play('se_milestone', 0.5);
      game.fx.popup(outs + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.me, size: 72 });
    }
    if (outs >= NEEDED) { focus = { x: r.x, y: r.y }; finish(true, isDemo); return; }
    if (spawned < NEEDED + 1) {
      spawned++;
      var nx = me.x > 0 ? -0.4 : 0.4;
      var nr = mkRival(nx, -0.4, [C.rivalA, C.rivalB, C.rivalC][spawned % 3]);
      nr.drop = 0.9;
      rivals.push(nr);
    }
  }

  function iFell(isDemo) {
    falls++;
    if (isDemo) return;
    lives--;
    focus = { x: me.x, y: me.y };
    game.feedback.bad(sx(me.x), sy(me.y) - 60, { text: 'MISS', color: C.bad });
    if (lives <= 0) finish(false, false);
    else { phase = 'hit'; stopT = 0.45; }
  }

  function finish(ok, isDemo) {
    if (isDemo) return;
    win = ok; phase = 'stop'; stopT = 0.55;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(C.me, 0.25); game.audio.play('se_success', 0.6); }
    else game.audio.play('se_failure', 0.6);
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || phase !== 'play') return;
    flick = { x: x, y: y, t: game.time.elapsed };
    if (ready()) game.audio.play('se_tap', 0.25);
    else game.audio.tone('D3', 0.05, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !flick) return;
    var f = flick; flick = null;
    if (phase !== 'play') return;
    var ft = Math.max(0.07, game.time.elapsed - f.t);
    var ok = doFlick((x - f.x) / RX / ft * 0.3, (y - f.y) / RY / ft * 0.3, false);
    if (!ok) game.fx.burst(sx(me.x), sy(me.y), { color: C.panD, count: 5, speed: 90 });
  });

  // ── ATTRACT デモ(近い相手をはじく。3発目は強すぎて自分が落ちる) ─────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, n: 0, aimT: 0, fx: 0, fy: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.n = 0; demo.aimT = 0.6; }
    if (rivals.length === 0 || outs >= 3) { initGame(); phase = 'play'; }
    stepArena(dt, true);
    var mx = sx(me.x), my = sy(me.y);
    if (ready()) {
      demo.aimT -= dt;
      var tgt = null, best = 9;
      for (var i = 0; i < rivals.length; i++) {
        var r = rivals[i];
        if (r.fall > 0 || r.drop > 0) continue;
        var d = Math.abs(r.x - me.x) + Math.abs(r.y - me.y);
        if (d < best) { best = d; tgt = r; }
      }
      if (tgt) {
        var over = demo.n % 3 === 1;
        demo.fx = (tgt.x - me.x) * RX; demo.fy = (tgt.y - me.y) * RY;
        var p = demo.aimT > 0 ? 0 : Math.min(1, -demo.aimT / 0.12);
        demo.gx = mx + demo.fx * 0.35 * p; demo.gy = my + 40 + demo.fy * 0.35 * p;
        demo.press = demo.aimT < 0.2;
        if (demo.aimT < -0.12) {
          var dl = Math.max(0.01, Math.sqrt((tgt.x - me.x) * (tgt.x - me.x) + (tgt.y - me.y) * (tgt.y - me.y)));
          var ux = (tgt.x - me.x) / dl, uy = (tgt.y - me.y) / dl;
          if (over) { var ox = ux * 0.87 - uy * 0.5; uy = ux * 0.5 + uy * 0.87; ux = ox; }
          var v0 = over ? 1.9 : Math.min(1.8, 0.9 + dl * 0.7);
          doFlick(ux * v0, uy * v0, true);
          demo.n++; demo.aimT = 0.7;
        }
      }
    } else {
      demo.press = false;
      demo.gx += (mx - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (my + 60 - demo.gy) * Math.min(1, dt * 4);
    }
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.2, C.sky2], [0.32, C.sky3], [0.33, C.panD], [1, C.pan]]);
    game.draw.circle(W * 0.22, H * 0.27, 90, '#fff2c0', 0.7 + 0.1 * Math.sin(t));
    for (var m = 0; m < 4; m++) game.draw.sprite(MESA_FAR, { m: C.far }, W * (0.1 + m * 0.28) + Math.sin(t * 0.3 + m) * 4, H * 0.31, 22 - m * 3, { anchor: 'center', alpha: 0.8 });
    // 塩原の遠近グリッド
    for (var g = 0; g < 10; g++) {
      var gy = H * 0.33 + Math.pow(g / 10, 1.8) * H * 0.67;
      game.draw.rect(0, gy, W, 3, C.panD, 0.6);
    }
    for (var v = -6; v <= 6; v++) game.draw.line(W / 2 + v * 30, H * 0.33, W / 2 + v * 260, H, C.panD, 2);
    // 台地の側面と天面(横ストリップ)
    for (var yy = -RY; yy <= RY + 60; yy += 4) {
      var k = Math.min(1, Math.abs(yy) / RY);
      var hw = RX * Math.sqrt(Math.max(0, 1 - k * k));
      if (yy > 0) game.draw.rect(CX - hw, CY + yy, hw * 2, 64, yy % 16 < 8 ? C.mesaSide : C.mesaSide2);
    }
    for (var y2 = -RY; y2 <= RY; y2 += 4) {
      var k2 = y2 / RY;
      var hw2 = RX * Math.sqrt(Math.max(0, 1 - k2 * k2));
      game.draw.rect(CX - hw2, CY + y2, hw2 * 2, 4, Math.floor((y2 + RY) / 40) % 2 ? C.mesaTop : C.mesaTop2);
    }
    // 塩の割れ目と縁の輝き
    for (var c = 0; c < 7; c++) {
      var a1 = c * 0.9, rr = 0.55;
      game.draw.line(sx(Math.cos(a1) * 0.2), sy(Math.sin(a1) * 0.2), sx(Math.cos(a1) * rr), sy(Math.sin(a1) * rr), C.crack, 3);
    }
    var glow = 0.35 + 0.25 * Math.sin(t * 4);
    for (var e = 0; e < 32; e++) {
      var ang = e / 32 * Math.PI * 2, ang2 = (e + 1) / 32 * Math.PI * 2;
      game.draw.line(sx(Math.cos(ang)), sy(Math.sin(ang)), sx(Math.cos(ang2)), sy(Math.sin(ang2)), C.bad, 5);
    }
    game.draw.rect(0, 0, W, H, C.sky2, 0.03 + glow * 0.04);
  }

  function drawCart(o, col, isMe) {
    var t = game.time.elapsed;
    if (o.drop > 0) {
      var sh = 1 - o.drop / 0.9;
      game.draw.circle(sx(o.x), sy(o.y) + 10, 50 * sh, C.ink, 0.3);
      game.draw.sprite(CART[0], { s: col, m: C.body, d: C.skin, b: C.body, k: C.wheel }, sx(o.x), sy(o.y) - o.drop * 900, 9, { anchor: 'center' });
      return;
    }
    var dp = depth(o.y);
    var fallY = o.fall > 0 ? o.fall * o.fall * 900 : 0;
    var px = 9 * dp;
    var x = sx(o.x), y = sy(o.y) - 40 * dp + fallY;
    if (o.fall === 0) game.draw.circle(sx(o.x), sy(o.y) + 12, 58 * dp, C.ink, 0.25);
    if (o.lunge > 0 && Math.floor(t * 14) % 2 === 0) {
      game.draw.line(sx(o.x), sy(o.y), sx(o.x + o.dx * 0.8), sy(o.y + o.dy * 0.8), C.bad, 10);
      game.draw.circle(x, y, 80 * dp, C.bad, 0.35);
    }
    if (isMe && ready() && phase !== 'stop') game.draw.circle(sx(o.x), sy(o.y) + 8, 78 * dp + Math.sin(t * 8) * 6, C.white, 0.35);
    if (focus && phase === 'stop' && Math.abs(focus.x - o.x) < 0.01 && Math.floor(t * 12) % 2 === 0) game.draw.circle(x, y, 120, C.white, 0.5);
    var fr = speed(o) > 0.3 ? Math.floor(t * 10) % 2 : Math.floor(t * 2 + o.x * 3) % 2;
    game.draw.sprite(CART[fr], { s: o.lunge > 0 ? C.bad : col, m: C.body, d: C.skin, b: isMe ? '#b0482a' : C.body, k: C.wheel }, x + Math.sin(t * 3 + (o.wob || 0)) * 3, y + Math.sin(t * 4 + (o.wob || 1)) * 3, px, { anchor: 'center', alpha: o.fall > 0 ? Math.max(0, 1 - o.fall) : 1, flipX: o.vx < -0.05 });
  }

  function drawCarts() {
    var list = rivals.slice();
    list.push(me);
    list.sort(function(a, b) { return a.y - b.y; });
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === me) { if (respawnT <= 0) drawCart(me, C.me, true); }
      else drawCart(o, o.col, false);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.7);
    txt(outs + ' / ' + NEEDED, W / 2, 88, 66, C.me);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, C.white, 'left');
    for (var l = 0; l < LIVES; l++) game.draw.sprite(CART[0], { s: l < lives ? C.me : '#5a4a5a', m: C.body, d: C.skin, b: C.body, k: C.wheel }, W - 90 - l * 110, 88, 6, { anchor: 'center' });
    game.draw.rect(60, 172, W - 120, 20, '#4a3a4a');
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.bad : C.me);
    // 親指ゾーン: はじく台(自分が止まっている間だけ光る)
    var rd = ready() && phase === 'play';
    game.draw.rect(80, H * 0.86, W - 160, 150, rd ? C.me : '#8a7e6a', rd ? 0.25 + 0.1 * Math.sin(game.time.elapsed * 6) : 0.15);
    game.draw.sprite(CART[Math.floor(game.time.elapsed * 3) % 2], { s: rd ? C.me : '#8a7e6a', m: C.body, d: C.skin, b: C.body, k: C.wheel }, W / 2, H * 0.9, 8, { anchor: 'center' });
    for (var s = 0; s < NEEDED; s++) game.draw.circle(W * 0.3 + s * 140, H * 0.965, 22, s < outs ? C.me : '#8a7e6a');
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function scoreNow() { return outs * 250 + nices * 120 + lives * 100 + Math.round(timeLeft * 10); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawCarts();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 225, C.ink, 0.7);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, C.me);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.me);
      else txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawCarts();
      if (win) for (var f = 0; f < 12; f++) game.draw.rect((f * 173 + t * 260) % W, (f * 211 + t * 330) % (H * 0.8), 14, 24, f % 2 ? C.me : C.rivalC);
      game.draw.rect(0, H * 0.14, W, H * 0.2, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 96, win ? C.me : C.bad);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.25, 46, C.white);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.3, 42, C.me);
      else if (!win) txt('あと' + Math.max(1, NEEDED - outs) + '台!', W / 2, H * 0.3, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.3, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepArena(dt, false);
      if (phase === 'play' && timeLeft <= 0) {
        timeLeft = 0; focus = { x: me.x, y: me.y };
        game.feedback.bad(W / 2, H * 0.45, { text: 'TIME UP', color: C.bad });
        finish(false, false);
      }
    } else if (phase === 'hit') {
      stopT -= dt;
      if (me.fall > 0) me.fall += dt;
      if (stopT <= 0) { phase = 'play'; me.fall = 0; respawnT = 0.5; me.x = 0; me.y = 0.6; me.vx = 0; me.vy = 0; }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'outro'; outroT = 1.3; }
    } else if (phase === 'outro') {
      outroT -= dt;
      for (var i = 0; i < rivals.length; i++) if (rivals[i].fall > 0) rivals[i].fall += dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { knocked: outs, nice: nices, falls: falls };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawCarts(); drawHud();
    if (phase === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, C.me);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.26, W, 150, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 92, win ? C.me : C.bad);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['D4', 0.5], ['F4', 0.5], ['A4', 1], ['G4', 0.5], ['F4', 0.5], ['E4', 1],
      ['F4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5], ['D4', 1]
    ], { tempo: 124, wave: 'square', volume: 0.04, loop: true, bass: [['D2', 2], ['C2', 2], ['A1', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
