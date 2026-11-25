// J-Switch-0053-shipyard-crate-bot-sumo.js
// 造船所の箱ロボ押し出し — 左手の舵で向きを決め、右手で溜めて突進。暴走した箱ロボ3体を回転台の外へ弾き出す
// 操作: 左半分を押したまま指の方向へ舵を切る(押している間はゆっくり前進)。右半分を押して溜め、離すと向いている方へ突進。溜めすぎると空吹かしで弱い突進になる(社内メモ。画面には出さない)
// 終わり: 3体とも台の外へ落とせばCLEAR。自分が落ちる/時間切れでGAME OVER
// @mechanic: coop_2zone
// @theme: shipyard_bot_ring_out
// 世界観: 夜の造船所の巨大クレーンの回転台座の上で、見習い溶接工が自作の箱型ロボットを左手の舵と右手の突進レバーで操り、試運転中に暴走した他の作業ロボットを台座から海側の砂利へ弾き落として、朝番が来る前に騒ぎを収める
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とした台数・突進回数・残り時間
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で。等角っぽく積む
  var STYLE = { bg: ['#141a33', '#23305a', '#0a0e1e'], main: ['#c8d0dc', '#8a95a8', '#565f72'], accent: ['#ffb02e', '#ff4b3e'] };
  var C = {
    night: '#141a33', dusk: '#23305a', sea: '#0a2a3a', deep: '#0a0e1e',
    top: '#c8d0dc', mid: '#8a95a8', dark: '#565f72',
    amber: '#ffb02e', red: '#ff4b3e', cyan: '#5ee8ff', white: '#f4f7ff', ink: '#05070f', good: '#8dffb4', bad: '#ff3b5c'
  };

  var GAME_TITLE = 'CRATE BOT RING';
  var TIME_LIMIT = 25;
  var NEEDED = 3;
  var CX = W / 2, CY = H * 0.47, R = 400;
  var BOT_R = 58;
  var TURN = 7;
  var CREEP = 130;
  var CHARGE_T = 0.7, OVERHEAT = 2.5;
  var DIAL = { x: W * 0.24, y: H * 0.86 }, LEVER = { x: W * 0.76, y: H * 0.86 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var me, bots, knocked, dashes, phase, ready, timeLeft, hitStop, outro, ok, focus, endFx, milestone;
  var steerOn, steerAng, charging, charge, leftId, rightId, steerPt, aimBusy;

  // ── sprites(3明度の立方体)───────────────────────────────────
  var CUBE = [
    ['...tttt...', '.tttttttt.', 'tttttttttt', 'lltttttttr', 'llllrrrrrr', 'llllrrrrrr', 'llllrrrrrr', '.lllrrrrr.', '..llrrrr..'],
    ['...tttt...', '.tttttttt.', 'tttttttttt', 'lttttttttr', 'llllrrrrrr', 'llllrrrrrr', 'llllrrrrrr', '.lllrrrrr.', '..l.rr.r..']
  ];
  var WELDER = ['..hhh..', '.hhhhh.', '.kvvvk.', '..sss..', '.ooooo.', 'o.ooo.o', '..o.o..', '..k.k..'];
  var PAL_ME = { t: '#ffd27a', l: '#d9901c', r: '#a8640c' };
  var PAL_BOT = { t: C.top, l: C.mid, r: C.dark };
  var PAL_BOT_HOT = { t: '#ffb0a0', l: C.red, r: '#a8261c' };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function newBot(i) {
    var a = -Math.PI / 2 + (i - 1) * 1.2;
    return { x: CX + Math.cos(a) * R * 0.55, y: CY + Math.sin(a) * R * 0.55, vx: 0, vy: 0, mode: 'wander', t: 1 + i * 0.7,
      tx: CX, ty: CY, dir: 0, fall: 0, gone: false, flash: 0, m: [1, 1.25, 1.5][i], wary: 0, side: i % 2 ? 1 : -1 };
  }

  function initGame() {
    me = { x: CX, y: CY + R * 0.45, vx: 0, vy: 0, a: -Math.PI / 2, fall: 0, gone: false, flash: 0, m: 1.4 };
    bots = [newBot(0), newBot(1), newBot(2)];
    knocked = 0; dashes = 0; phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT;
    hitStop = 0; outro = 0; ok = false; focus = null; endFx = false; milestone = false;
    steerOn = false; steerAng = me.a; charging = false; charge = 0; leftId = null; rightId = null; steerPt = null; aimBusy = 0;
  }

  function angDiff(a, b) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // ── 両手の操作(実プレイ・デモ共用)──────────────────────────
  function releaseCharge(demo) {
    if (!charging) return;
    charging = false;
    var over = charge > 1.5;
    var p = over ? 0.25 : Math.min(1, charge);
    var sp = 480 + 1150 * p;
    me.vx += Math.cos(me.a) * sp; me.vy += Math.sin(me.a) * sp;
    dashes++;
    charge = 0;
    if (demo) { game.fx.burst(me.x - Math.cos(me.a) * 60, me.y - Math.sin(me.a) * 60, { color: C.amber, count: 6, speed: 160 }); return; }
    if (over) {
      game.feedback.bad(LEVER.x, LEVER.y - 190, { text: 'MISS', color: C.bad, shake: 6 });
    } else {
      game.audio.play('se_jump', 0.4);
      game.fx.burst(me.x - Math.cos(me.a) * 60, me.y - Math.sin(me.a) * 60, { color: C.amber, count: 10, speed: 220 });
    }
  }

  function controlStep(dt, demo) {
    if (steerOn) {
      var d = angDiff(me.a, steerAng);
      var step = TURN * dt;
      me.a += Math.abs(d) < step ? d : (d > 0 ? step : -step);
      var sp = Math.sqrt(me.vx * me.vx + me.vy * me.vy);
      if (sp < CREEP) { me.x += Math.cos(me.a) * CREEP * dt; me.y += Math.sin(me.a) * CREEP * dt; }
    }
    if (charging) {
      charge += dt / CHARGE_T;
      if (charge >= 1 && charge - dt / CHARGE_T < 1 && !demo) game.audio.play('se_powerup', 0.35);
      if (charge * CHARGE_T > OVERHEAT) { charge = 2; releaseCharge(demo); }
    }
  }

  // ── 物理 ──────────────────────────────────────────────────────
  function moveBody(b, dt) {
    b.vx *= Math.pow(0.5, dt); b.vy *= Math.pow(0.5, dt);
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 0) {
      var ns = Math.max(0, sp - 1100 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.flash > 0) b.flash -= dt;
  }

  function collide(a, b, demo) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 0 || d >= BOT_R * 2) return;
    var nx = dx / d, ny = dy / d;
    var ov = BOT_R * 2 - d;
    a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
    var va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny;
    if (va - vb <= 0) return;
    var ma = a.m || 1, mb = b.m || 1;
    var j = 1.8 * (va - vb) / (1 / ma + 1 / mb);
    var imp = j / mb;
    a.vx -= j / ma * nx; a.vy -= j / ma * ny; b.vx += j / mb * nx; b.vy += j / mb * ny;
    a.flash = 0.15; b.flash = 0.15;
    if (imp > 300) {
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      game.fx.burst(mx, my, { color: C.amber, count: demo ? 6 : 12, speed: 260 });
      if (!demo) { game.audio.play('se_break', 0.3); game.fx.shake(Math.min(14, imp / 80), 0.15); }
    }
  }

  function botStep(b, dt, demo) {
    if (b.gone || b.fall > 0) return;
    b.t -= dt;
    if (b.mode === 'wander') {
      // 狙われて溜められていると気づくと、横へよける(溜めすぎは読まれる)
      var ang = Math.atan2(b.y - me.y, b.x - me.x);
      var aimed = charging && Math.abs(angDiff(me.a, ang)) < 0.3 && Math.hypot(b.x - me.x, b.y - me.y) < 650;
      b.wary = aimed ? b.wary + dt : 0;
      if (b.wary > 0.35) {
        var toC = Math.atan2(CY - b.y, CX - b.x);
        var pa = ang + b.side * Math.PI / 2;
        if (Math.cos(pa - toC) < -0.2) b.side = -b.side;
        b.x += Math.cos(ang + b.side * Math.PI / 2) * 230 * dt; b.y += Math.sin(ang + b.side * Math.PI / 2) * 230 * dt;
      }
      var dx = b.tx - b.x, dy = b.ty - b.y, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > 20) { b.x += dx / dd * 90 * dt; b.y += dy / dd * 90 * dt; }
      else { var ra = Math.random() * Math.PI * 2, rr = Math.random() * R * 0.5; b.tx = CX + Math.cos(ra) * rr; b.ty = CY + Math.sin(ra) * rr; }
      if (b.t <= 0 && aimBusy <= 0 && !me.gone) {
        b.mode = 'aim'; b.t = 0.65; aimBusy = 1.2;
        b.dir = Math.atan2(me.y - b.y, me.x - b.x);
        if (!demo) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.05 });
      }
    } else if (b.mode === 'aim') {
      if (b.t <= 0) {
        b.mode = 'dash'; b.t = 0.6;
        b.vx += Math.cos(b.dir) * 1000; b.vy += Math.sin(b.dir) * 1000;
        if (!demo) game.audio.tone('D3', 0.12, { wave: 'sawtooth', volume: 0.05, slide: 80 });
      }
    } else if (b.mode === 'dash') {
      if (b.t <= 0) { b.mode = 'wander'; b.t = 1.4 + Math.random() * 1.2; b.tx = CX; b.ty = CY; }
    }
  }

  function edgeCheck(b, isMe, demo) {
    if (b.gone || b.fall > 0) return;
    var dx = b.x - CX, dy = b.y - CY;
    if (Math.sqrt(dx * dx + dy * dy) > R + 10) {
      b.fall = 0.5; b.vx *= 0.3; b.vy *= 0.3;
      if (isMe) {
        if (!demo) endRun(false);
      } else {
        knocked++;
        if (demo) { game.fx.burst(b.x, b.y, { color: C.cyan, count: 12, speed: 260 }); return; }
        game.feedback.good(b.x, b.y - 80, { text: knocked >= NEEDED ? 'CLEAR' : 'NICE', color: C.cyan, count: 16 });
        game.audio.play('se_milestone', 0.45);
        game.fx.popup(knocked + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.amber, size: 60 });
        if (knocked >= NEEDED) endRun(true);
      }
    }
  }

  function world(dt, demo) {
    if (aimBusy > 0) aimBusy -= dt;
    controlStep(dt, demo);
    var all = [me].concat(bots);
    for (var i = 0; i < bots.length; i++) botStep(bots[i], dt, demo);
    for (var k = 0; k < all.length; k++) {
      var b = all[k];
      if (b.gone) continue;
      if (b.fall > 0) { b.fall -= dt; b.x += b.vx * dt; b.y += b.vy * dt; if (b.fall <= 0) b.gone = true; continue; }
      moveBody(b, dt);
    }
    for (var p = 0; p < all.length; p++) for (var q = p + 1; q < all.length; q++) {
      if (all[p].gone || all[q].gone || all[p].fall > 0 || all[q].fall > 0) continue;
      collide(all[p], all[q], demo);
    }
    edgeCheck(me, true, demo);
    for (var j = 0; j < bots.length; j++) edgeCheck(bots[j], false, demo);
  }

  function endRun(win) {
    if (phase === 'stop') return;
    ok = win; phase = 'stop'; hitStop = 0.5; endFx = false;
    focus = win ? 'bots' : 'me';
    charging = false; steerOn = false;
    game.audio.stopBgm();
  }

  function score() { return knocked * 100 + (ok ? Math.round(timeLeft * 20) : 0); }

  // ── input(左右の手は touch id で分ける)──────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.4); state = S.ATTRACT; initGame(); demo.t = 0; startTheme(); return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || phase !== 'play') return;
    if (x < W / 2 && leftId === null) {
      leftId = id; steerPt = { x: x, y: y }; steerOn = true;
      steerAng = Math.atan2(y - DIAL.y, x - DIAL.x);
      game.audio.tone('E4', 0.03, { wave: 'triangle', volume: 0.04 });
      game.fx.burst(DIAL.x, DIAL.y, { color: C.cyan, count: 4, speed: 90 });
    } else if (x >= W / 2 && rightId === null) {
      rightId = id; charging = true; charge = 0;
      game.audio.play('se_tap', 0.25);
      game.fx.burst(LEVER.x, LEVER.y, { color: C.amber, count: 4, speed: 90 });
    }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || id !== leftId) return;
    steerPt = { x: x, y: y };
    if (Math.abs(x - DIAL.x) + Math.abs(y - DIAL.y) > 24) steerAng = Math.atan2(y - DIAL.y, x - DIAL.x);
    if (Math.random() < 0.04) game.audio.tone('E4', 0.02, { wave: 'triangle', volume: 0.02 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId) { leftId = null; steerOn = false; steerPt = null; game.audio.tone('C4', 0.03, { wave: 'triangle', volume: 0.03 }); }
    if (id === rightId) { rightId = null; releaseCharge(false); }
  });

  // ── demo(舵を最寄りの箱ロボへ向け、向きが合ったら溜めて突進)─────
  var demo = { t: 0, lx: DIAL.x, ly: DIAL.y, rx: LEVER.x, ry: LEVER.y, hold: 0 };
  var DEMO_CYC = 8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; bots[0].t = 0.3; demo.hold = 0; }
    if (me.gone) { initGame(); phase = 'play'; }
    var tgt = null, bd = 1e9;
    for (var i = 0; i < bots.length; i++) {
      var b = bots[i];
      if (b.gone || b.fall > 0) continue;
      var d = Math.hypot(b.x - me.x, b.y - me.y);
      if (d < bd) { bd = d; tgt = b; }
    }
    if (!tgt) { initGame(); phase = 'play'; tgt = bots[0]; }
    var want = Math.atan2(tgt.y - me.y, tgt.x - me.x);
    steerAng = want;
    var err = Math.abs(angDiff(me.a, want));
    steerOn = err > 0.12 && !charging;
    if (!charging && err < 0.2 && Math.hypot(me.vx, me.vy) < 200) { charging = true; charge = 0; demo.hold = 0.5; }
    if (charging) { demo.hold -= dt; if (demo.hold <= 0) releaseCharge(true); }
    world(dt, true);
    if (me.fall > 0) { me.fall = 0; me.x = CX; me.y = CY; me.vx = 0; me.vy = 0; }
    demo.lx = DIAL.x + Math.cos(steerAng) * 90; demo.ly = DIAL.y + Math.sin(steerAng) * 90;
  }

  // ── drawing ─────────────────────────────────────────────────────
  function drawYard() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.45, C.dusk], [0.75, C.sea], [1, C.deep]]);
    // 奥のクレーン(ブロックを積んだ塔)
    for (var c = 0; c < 3; c++) {
      var bx = 90 + c * 400, by = H * 0.24;
      for (var k = 0; k < 7; k++) {
        game.draw.rect(bx, by - k * 34, 40, 30, C.dark, 0.7);
        game.draw.rect(bx, by - k * 34, 40, 8, C.mid, 0.7);
      }
      game.draw.rect(bx - 60, by - 7 * 34, 260, 20, C.dark, 0.7);
      game.draw.circle(bx + 20, by - 7 * 34 - 10, 8, C.red, 0.5 + 0.5 * Math.sin(t * 3 + c));
    }
    // 溶接の火花(周囲の明滅)
    for (var s = 0; s < 6; s++) {
      var sx = 120 + s * 170, sy = H * 0.25 + Math.sin(t * 5 + s) * 10;
      if (Math.sin(t * 9 + s * 2) > 0.3) game.draw.circle(sx, sy, 6 + 4 * Math.sin(t * 20 + s), C.amber, 0.7);
    }
    game.draw.rect(0, 0, W, H, C.cyan, 0.015 + 0.015 * Math.sin(t * 1.4));
  }

  function drawArena() {
    var t = game.time.elapsed;
    game.draw.circle(CX, CY + 40, R + 40, C.ink, 0.6);
    game.draw.circle(CX, CY + 22, R + 20, C.dark);
    game.draw.circle(CX, CY, R + 20, C.mid);
    game.draw.circle(CX, CY, R, '#3a4356');
    game.draw.circle(CX, CY, R * 0.66, '#434d63');
    game.draw.circle(CX, CY, R * 0.33, '#3a4356');
    // 縁のブロック
    for (var i = 0; i < 28; i++) {
      var a = i / 28 * Math.PI * 2 + t * 0.05;
      var bx = CX + Math.cos(a) * (R + 6), by = CY + Math.sin(a) * (R + 6);
      game.draw.rect(bx - 16, by - 16, 32, 12, C.top);
      game.draw.rect(bx - 16, by - 4, 16, 18, C.mid);
      game.draw.rect(bx, by - 4, 16, 18, C.dark);
      if (i % 4 === 0) game.draw.rect(bx - 6, by - 14, 12, 8, C.amber, 0.5 + 0.4 * Math.sin(t * 4 + i));
    }
  }

  function drawBody(b, pal, isMe, hot) {
    if (b.gone) return;
    var t = game.time.elapsed;
    var sc = b.fall > 0 ? Math.max(0.2, b.fall / 0.5) : 1;
    var bob = Math.sin(t * 6 + b.x * 0.01) * 3;
    game.draw.circle(b.x, b.y + 36, BOT_R * sc, C.ink, 0.4);
    var hl = (focus === 'me' && isMe && hitStop > 0) || b.flash > 0;
    if (hl) game.draw.circle(b.x, b.y, BOT_R * 1.5 * sc, C.white, 0.5 + 0.3 * Math.sin(t * 30));
    var hx = Math.cos(isMe ? b.a : b.dir), hy = Math.sin(isMe ? b.a : b.dir);
    game.draw.sprite(CUBE[Math.floor(t * 6) % 2], hot ? PAL_BOT_HOT : pal, b.x, b.y + bob, 12 * sc, { anchor: 'center', alpha: b.fall > 0 ? 0.7 : 1 });
    if (isMe) {
      game.draw.line(b.x, b.y, b.x + hx * 90 * sc, b.y + hy * 90 * sc, C.amber, 12);
      game.draw.circle(b.x + hx * 90 * sc, b.y + hy * 90 * sc, 14, C.amber);
      game.draw.sprite(WELDER, { h: C.amber, k: C.ink, v: C.cyan, s: '#ffd4b0', o: '#3a6ad8' }, b.x, b.y - 70 + bob, 7 * sc, { anchor: 'center' });
      if (charging) game.draw.circle(b.x, b.y, BOT_R + 10 + Math.min(1, charge) * 30, charge > 1.5 ? C.red : C.amber, 0.25);
    } else {
      var eye = b.mode === 'aim' && Math.floor(t * 14) % 2 === 0 ? C.red : C.cyan;
      var ex = b.mode === 'wander' ? Math.cos(t + b.y) : hx, ey = b.mode === 'wander' ? Math.sin(t + b.x) : hy;
      game.draw.circle(b.x + ex * 30 * sc, b.y - 20 + ey * 20 * sc + bob, 10 * sc, eye);
    }
  }

  function drawActors() {
    var t = game.time.elapsed;
    for (var i = 0; i < bots.length; i++) {
      var b = bots[i];
      if (b.mode === 'aim' && !b.gone && b.fall <= 0) {
        // 突進の予告線
        for (var k = 1; k < 7; k++) {
          if ((k + Math.floor(t * 12)) % 2 === 0) continue;
          game.draw.circle(b.x + Math.cos(b.dir) * k * 60, b.y + Math.sin(b.dir) * k * 60, 10, C.red, 0.7);
        }
      }
    }
    for (var j = 0; j < bots.length; j++) drawBody(bots[j], PAL_BOT, false, bots[j].mode !== 'wander');
    drawBody(me, PAL_ME, true, false);
  }

  function drawControls() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.ink, 0.45);
    // 左: 舵のダイヤル
    game.draw.circle(DIAL.x, DIAL.y, 150, C.dark, 0.9);
    game.draw.circle(DIAL.x, DIAL.y, 132, steerOn ? '#2a4b66' : C.night);
    for (var k = 0; k < 8; k++) {
      var a = k / 8 * Math.PI * 2;
      game.draw.rect(DIAL.x + Math.cos(a) * 118 - 6, DIAL.y + Math.sin(a) * 118 - 6, 12, 12, C.mid);
    }
    game.draw.line(DIAL.x, DIAL.y, DIAL.x + Math.cos(me.a) * 110, DIAL.y + Math.sin(me.a) * 110, C.amber, 14);
    game.draw.circle(DIAL.x, DIAL.y, 26 + Math.sin(t * 3) * 3, C.cyan);
    // 右: 突進レバー(溜めゲージ)
    var cp = Math.min(1, charge);
    game.draw.circle(LEVER.x, LEVER.y, 150, C.dark, 0.9);
    game.draw.circle(LEVER.x, LEVER.y, 132, C.night);
    if (charging) game.draw.circle(LEVER.x, LEVER.y, 132 * cp, charge > 1.5 ? C.red : (cp >= 1 ? C.amber : '#b06a10'), cp >= 1 ? 0.7 + 0.25 * Math.sin(t * 20) : 0.8);
    game.draw.sprite(CUBE[0], PAL_ME, LEVER.x, LEVER.y + Math.sin(t * 2.4) * 5 + (charging ? 10 : 0), 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.7);
    txt(knocked + ' / ' + NEEDED, W / 2, 90, 68, C.amber);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 90, 52, C.white, 'left');
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(CUBE[0], i < knocked ? PAL_BOT : PAL_BOT_HOT, W - 250 + i * 80, 90, 5, { anchor: 'center', alpha: i < knocked ? 0.35 : 1 });
    var lowT = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 18, C.dark);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowT ? C.bad : C.cyan);
  }

  function startTheme() {
    game.audio.melody([['A3', 0.5], ['C4', 0.5], ['E4', 0.5], ['A4', 0.5], ['G4', 1], ['E4', 0.5], ['D4', 0.5], ['E4', 2]],
      { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: [['A1', 2], ['F1', 2], ['G1', 2], ['A1', 2]] });
  }

  // ── main loop ───────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawYard(); drawArena(); drawActors(); drawControls();
      game.draw.hand(demo.lx, demo.ly, { press: steerOn, scale: 12 });
      game.draw.hand(LEVER.x, LEVER.y + 30, { press: charging, scale: 12 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.7);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 96 + Math.sin(t * 2.2) * 6, 76, C.amber);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 184, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.975, 40, C.amber);
      else txt('INSERT COIN', W / 2, H * 0.975, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawYard(); drawArena(); drawActors();
      game.draw.rect(0, H * 0.22, W, H * 0.26, C.ink, 0.65);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.27, 96, ok ? C.amber : C.bad);
      txt(knocked + ' / ' + NEEDED, W / 2, H * 0.33, 56, C.white);
      txt('SCORE ' + score(), W / 2, H * 0.38, 44, C.white);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.42, 34, C.mid);
      if (!ok && knocked === NEEDED - 1) txt('あと1体!', W / 2, H * 0.6, 56, C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.9, 38, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      world(dt, false);
      if (phase === 'play') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endRun(false); }
      }
    } else if (phase === 'stop') {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0 && !endFx) {
          endFx = true;
          if (ok) {
            game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.amber, count: 26 });
            game.audio.play('se_success', 0.6);
          } else {
            game.feedback.bad(me.x, me.y - 100, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.bad });
            game.audio.play('se_failure', 0.6);
          }
          outro = 1.2;
        }
      } else {
        outro -= dt;
        for (var i = 0; i < bots.length; i++) if (bots[i].fall > 0) { bots[i].fall -= dt; if (bots[i].fall <= 0) bots[i].gone = true; }
        if (me.fall > 0) { me.fall -= dt; if (me.fall <= 0) me.gone = true; }
        if (outro <= 0) {
          state = S.RESULT;
          var stats = { knocked: knocked, dashes: dashes, timeLeft: Math.round(timeLeft) };
          if (ok) game.end.success(score(), stats); else game.end.failure(stats);
        }
      }
    }

    drawYard(); drawArena(); drawActors(); drawControls(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, CY, 96, C.amber);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
    startTheme();
  });
})(game);
