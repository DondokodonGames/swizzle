// I-Switch-0007v2-cape-windmill-gap.js
// 岬の風車くぐり — 奥から迫ってくる風車の回る羽根を正面に見て、羽根の面に届く瞬間に隙間が来る高さへ若鳥を合わせ、触れずにくぐり抜ける
// 操作: 画面のどこかを押して上下にずらすと、ずらした分だけ若鳥が上下する(指の位置ではなく動かした量)。前へは自動で飛ぶ。風車が手前に来た瞬間に羽根と軸に触れていなければ通過。隙間の真ん中ほど高得点
// 終わり: 10基の風車をくぐり抜ければCLEAR。羽根か軸に3回当たる/20秒で抜けきれなければGAME OVER
// @mechanic: gap_fit
// @theme: cape_windmill_gap
// 世界観: 白い風車の並ぶ岬の上を初めて渡る若い渡り鳥が、ゆっくり回る羽根と速く回る羽根の隙間の高さを見極めてくぐり抜け、群れの待つ沖の空へ向かう
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった基数・真ん中を抜けた数(PERFECT)・当たった数のスコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // HYPERCASUAL 3D: 白〜淡色の背景に単色の丸い塊、真下に柔らかい影、見た目どおりの当たり判定
  var STYLE = { bg: ['#eaf6ff', '#ffffff', '#d8eef8'], main: ['#ff6a5a', '#3a8aff', '#ffc83a'], accent: ['#2ad0a0', '#3a3a5a'] };
  var INK = STYLE.accent[1];

  var MILLS = 10, HITS = 3, TIME_LIMIT = 20;
  var BX = W / 2, TOP = H * 0.2, BOT = H * 0.66, BIRD_R = 30;
  var SAIL_W = 24, HUB_R = 50, HORIZON = H * 0.36, GROUND_NEAR = H * 0.8;
  var Z0 = 2000, FOCAL = 650, ZSPEED = 1300;
  var PLAN = [
    { dx: -170, n: 4, om: 0.9 }, { dx: 160, n: 4, om: -1.1 }, { dx: -130, n: 4, om: 1.4 }, { dx: 190, n: 5, om: -1.0 },
    { dx: -200, n: 4, om: 1.7 }, { dx: 140, n: 5, om: 1.3 }, { dx: -150, n: 4, om: -2.0 }, { dx: 180, n: 5, om: -1.6 },
    { dx: -120, n: 4, om: 2.2 }, { dx: 200, n: 5, om: 1.9 },
  ];

  var view = 'ATTRACT';
  var k = null;

  var BIRD_UP = ['w........w', 'ww......ww', '.ww.bb.ww.', '..wbbbbw..', '..beebeb..', '...bbbb...', '...byyb...', '....tt....'];
  var BIRD_MID = ['..........', '..........', '....bb....', 'wwwbbbbwww', '.wbeebebw.', '...bbbb...', '...byyb...', '....tt....'];
  var BIRD_DN = ['..........', '..........', '....bb....', '...bbbb...', '.wbeebebw.', 'ww.bbbb.ww', 'w..byyb..w', '....tt....'];
  var BIRD_PAL = { b: INK, w: '#5a6a8a', e: '#ffffff', y: STYLE.main[2], t: INK };
  var BIRD_HIT = { b: '#ffffff', w: '#ffffff', e: '#ffffff', y: '#ffffff', t: '#ffffff' };

  function freshSky() {
    var mills = [], at = 1.25;
    for (var i = 0; i < MILLS; i++) {
      var p = PLAN[i];
      mills.push({ hx: BX + p.dx, hubY: (TOP + BOT) / 2 + ((i % 3) - 1) * 40, r: 620, n: p.n, om: p.om, th: i * 0.9, at: at, passed: false, res: null, hl: 0 });
      at += Math.max(1.05, 1.6 - i * 0.06);
    }
    return {
      st: 'ready', readyT: 0.8, clock: TIME_LIMIT, t: 0,
      y: (TOP + BOT) / 2, ty: (TOP + BOT) / 2, flap: 0, tumble: 0,
      mills: mills, passed: 0, perfects: 0, hits: 0, chain: 0, score: 0, closest: 999,
      drag: null, pauseT: 0, stopT: 0, won: false, culprit: null, prevBest: 0, partyT: 0,
    };
  }

  function depthOf(m) { return (m.at - k.t) * ZSPEED; }
  function proj(z) { return FOCAL / (FOCAL + Math.max(0, z)); }
  function sailAngle(m, s, t) { return m.th + m.om * t + s * Math.PI * 2 / m.n; }

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
    var u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
    return Math.hypot(px - (ax + vx * u), py - (ay + vy * u));
  }

  // 羽根の面上での余裕(負なら接触)。羽根・軸・塔を見る
  function clearance(m, y, t) {
    var best = Math.hypot(BX - m.hx, y - m.hubY) - HUB_R - BIRD_R;
    for (var s = 0; s < m.n; s++) {
      var a = sailAngle(m, s, t);
      var d = segDist(BX, y, m.hx + Math.cos(a) * 50, m.hubY + Math.sin(a) * 50, m.hx + Math.cos(a) * m.r, m.hubY + Math.sin(a) * m.r) - SAIL_W - BIRD_R;
      if (d < best) best = d;
    }
    if (y > m.hubY && Math.abs(BX - m.hx) < 40 + BIRD_R) best = Math.min(best, -1);
    return best;
  }

  function centered(m, y, t) {
    var phi = Math.atan2(y - m.hubY, BX - m.hx);
    var step = Math.PI * 2 / m.n, best = 0;
    for (var s = 0; s < m.n; s++) {
      var rel = ((phi - sailAngle(m, s, t)) % step + step) % step;
      best = Math.max(best, 1 - Math.abs(rel / step - 0.5) * 2);
    }
    return best;
  }

  function cross(m) {
    m.passed = true;
    var c = clearance(m, k.y, k.t);
    if (c < 0) {
      k.hits++; k.chain = 0; m.res = 'hit'; m.hl = 0.5; k.tumble = 0.6;
      game.audio.play('se_break', 0.35);
      k.passed++;
      if (k.hits >= HITS) { k.st = 'stop'; k.stopT = 0.5; k.won = false; k.culprit = m; game.fx.flash('#ffffff', 0.15); return; }
      k.pauseT = 0.32; k.culprit = m;
      game.fx.flash('#ffffff', 0.1);
      return;
    }
    k.passed++;
    var cen = centered(m, k.y, k.t);
    var perfect = cen >= 0.6;
    if (perfect) { k.perfects++; k.chain++; } else k.chain = 0;
    var mult = k.chain >= 3 ? 2 : 1;
    k.score += (perfect ? 300 : 120) * mult;
    m.res = perfect ? 'perfect' : 'good';
    game.feedback.good(BX, k.y - 90, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.main[0] : STYLE.main[1], size: 50 });
    if (!perfect) game.fx.popup('あと' + Math.max(1, Math.round((0.6 - cen) * 100)) + '%', BX + 170, k.y - 40, { color: INK, size: 32 });
    if (mult > 1) game.fx.popup('x2', BX + 160, k.y - 140, { color: STYLE.main[0], size: 44 });
    if (k.passed === 5) { game.fx.popup('5 / ' + MILLS, W / 2, H * 0.17, { color: STYLE.main[1], size: 60 }); game.audio.play('se_milestone', 0.45); }
  }

  function advance(dt) {
    k.t += dt;
    k.clock -= dt;
    k.flap += dt;
    if (k.tumble > 0) k.tumble -= dt;
    k.y += (k.ty - k.y) * Math.min(1, dt * 12);
    for (var i = 0; i < k.mills.length; i++) {
      var m = k.mills[i];
      if (m.hl > 0) m.hl -= dt;
      if (!m.passed && depthOf(m) <= 0) { cross(m); if (k.st !== 'run' || k.pauseT > 0) return; }
      if (!m.passed && Math.abs(depthOf(m) - 700) < ZSPEED * dt) game.audio.tone(m.om > 0 ? 330 : 262, 0.06, { wave: 'triangle', volume: 0.04 });
    }
    if (k.passed >= MILLS) { k.st = 'stop'; k.stopT = 0.55; k.won = k.hits < HITS; return; }
    if (k.clock <= 0) {
      k.clock = 0; k.st = 'stop'; k.stopT = 0.5; k.won = false;
      for (var j = 0; j < k.mills.length; j++) if (!k.mills[j].passed) { k.culprit = k.mills[j]; break; }
      game.fx.flash('#ffffff', 0.12);
    }
  }

  function settle() {
    k.prevBest = game.best;
    var stats = { passed: k.passed, mills: MILLS, perfect: k.perfects, hits: k.hits };
    if (k.won) {
      k.score += (HITS - k.hits) * 200;
      game.feedback.good(BX, k.y - 120, { text: 'CLEAR', color: STYLE.main[0], size: 72 });
      game.audio.play('se_success', 0.6);
      game.end.success(k.score, stats);
    } else {
      game.feedback.bad(BX, k.y, { text: 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    view = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function drawCape() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HORIZON, [[0, '#cfe8f8'], [1, STYLE.bg[1]]]);
    game.draw.gradient(HORIZON, H, [[0, '#a8e0a0'], [0.5, '#8ad07a'], [1, '#6ab85a']]);
    game.draw.rect(0, HORIZON - 30, W, 30, '#8ac8e8');
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 330 - t * 30) % (W + 400) + W + 400) % (W + 400) - 200, cy = H * 0.1 + (c % 2) * 90;
      game.draw.circle(cx, cy, 60, '#ffffff', 0.95);
      game.draw.circle(cx + 64, cy + 8, 46, '#ffffff', 0.95);
    }
    // 奥へ流れる地面の筋(速度感)
    for (var r = 0; r < 10; r++) {
      var z = ((r * 260 - t * ZSPEED) % 2600 + 2600) % 2600;
      var s = proj(z);
      var gy = HORIZON + (GROUND_NEAR - HORIZON) * s;
      game.draw.rect(0, gy, W, 3 + 6 * s, '#ffffff', 0.25 * s + 0.05);
    }
  }

  function drawMill(m, hlStop) {
    var z = depthOf(m);
    if (z > Z0 || z < -200) return;
    var s = proj(z);
    var fade = z < 0 ? Math.max(0, 1 + z / 200) : 1;
    var hx = BX + (m.hx - BX) * s, hy = HORIZON + (m.hubY - HORIZON) * s;
    var gy = HORIZON + (GROUND_NEAR - HORIZON) * s;
    var white = m.hl > 0 || (hlStop && k.culprit === m);
    game.draw.circle(hx + 20 * s, gy, 90 * s, '#000000', 0.1 * fade);
    game.draw.rect(hx - 34 * s, hy, 68 * s, gy - hy, '#ffffff', 0.95 * fade);
    var col = white ? '#ffffff' : (m.om > 0 ? STYLE.main[0] : STYLE.main[1]);
    for (var q = 0; q < m.n; q++) {
      var a = sailAngle(m, q, k.t);
      var x1 = hx + Math.cos(a) * 50 * s, y1 = hy + Math.sin(a) * 50 * s, x2 = hx + Math.cos(a) * m.r * s, y2 = hy + Math.sin(a) * m.r * s;
      game.draw.line(x1 + 12 * s, y1 + 16 * s, x2 + 12 * s, y2 + 16 * s, 'rgba(0,0,0,0.1)', SAIL_W * 2 * s);
      game.draw.line(x1, y1, x2, y2, col, SAIL_W * 2 * s * (white && hlStop ? 1.3 : 1));
      game.draw.circle(x2, y2, SAIL_W * s, col, fade);
    }
    game.draw.circle(hx, hy, HUB_R * s, white ? '#ffffff' : INK, fade);
    game.draw.circle(hx - 14 * s, hy - 14 * s, 14 * s, '#ffffff', 0.5 * fade);
  }

  function drawBird(hl) {
    var t = game.time.elapsed;
    var f = Math.floor(k.flap * 10) % 4;
    var art = f === 0 ? BIRD_UP : f === 2 ? BIRD_DN : BIRD_MID;
    var down = view === 'RESULT' && !k.won;
    var gy = GROUND_NEAR;
    game.draw.circle(BX, gy, 34, '#000000', 0.12);
    var wob = k.tumble > 0 ? Math.sin(t * 40) * 14 : 0;
    game.draw.sprite(art, hl ? BIRD_HIT : BIRD_PAL, BX + wob, k.y, hl ? 13 : 10, { anchor: 'center', flipY: down || k.tumble > 0.3 });
    if (k.drag && view === 'PLAYING') game.draw.circle(BX, k.y, BIRD_R + 18, STYLE.accent[0], 0.2);
  }

  function drawPad() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.84, W, H * 0.16, '#ffffff', 0.6);
    var p = (k.y - TOP) / (BOT - TOP);
    game.draw.rect(W - 110, H * 0.855, 26, H * 0.12, '#c8dce8');
    game.draw.circle(W - 97, H * 0.855 + H * 0.12 * p, 22, STYLE.accent[0]);
    game.draw.circle(W / 2, H * 0.92, 80, STYLE.accent[0], k.drag ? 0.45 : 0.18 + 0.08 * Math.sin(t * 4));
    game.draw.line(W / 2, H * 0.92 - 60, W / 2, H * 0.92 + 60, '#ffffff', 10);
  }

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 2, y + 4, { size: size, color: 'rgba(0,0,0,0.2)', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawHud() {
    say(k.passed + ' / ' + MILLS, 150, 80, 50, INK);
    say('SCORE ' + k.score, W - 250, 80, 36, STYLE.main[0]);
    game.draw.rect(80, 134, W - 160, 12, '#c8dce8');
    var fr = Math.max(0, k.clock / TIME_LIMIT);
    game.draw.rect(80, 134, (W - 160) * fr, 12, fr < 0.25 ? STYLE.main[0] : STYLE.accent[0]);
    for (var h = 0; h < HITS; h++) game.draw.circle(W / 2 - 50 + h * 50, 190, 16, h < HITS - k.hits ? STYLE.main[2] : '#c8c8d8');
  }

  function drawWorld(hl) {
    drawCape();
    for (var i = k.mills.length - 1; i >= 0; i--) drawMill(k.mills[i], hl);
    drawBird(hl && k.won);
    for (var j = 0; j < k.mills.length; j++) { var m = k.mills[j]; var z = depthOf(m); if (z < 0 && z > -200) drawMill(m, hl); }
    drawPad();
  }

  // ── ATTRACT(実ロジック+ボットが高さを計画) ─────────────
  var demo = { t: 0, gy: H * 0.92, press: false };
  function botPlan(bad) {
    var m = null;
    for (var i = 0; i < k.mills.length; i++) if (!k.mills[i].passed) { m = k.mills[i]; break; }
    if (!m) return k.ty;
    var best = k.ty, bestScore = bad ? 1e9 : -1e9;
    for (var y = TOP; y <= BOT; y += 16) {
      var sc = Math.min(clearance(m, y, m.at), 80) + centered(m, y, m.at) * 40 - Math.abs(y - k.y) * 0.04;
      if (bad ? sc < bestScore : sc > bestScore) { bestScore = sc; best = y; }
    }
    return best;
  }
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { k = freshSky(); k.st = 'run'; }
    if (k.st === 'run') {
      if (k.pauseT > 0) {
        k.pauseT -= dt;
        if (k.pauseT <= 0) game.feedback.bad(BX, k.y, { text: 'MISS', size: 48 });
        return;
      }
      k.ty = botPlan(k.passed === 2);
      demo.press = Math.abs(k.ty - k.y) > 8;
      demo.gy = H * 0.92 + Math.max(-60, Math.min(60, (k.ty - k.y) * 0.3));
      advance(dt);
    } else if (k.st === 'stop') k.stopT -= dt;
  }

  game.onTap(function () {
    if (view === 'ATTRACT') { k = freshSky(); view = 'PLAYING'; game.audio.play('se_coin', 0.5); return; }
    if (view === 'RESULT') { game.audio.play('se_tap', 0.3); view = 'ATTRACT'; k = freshSky(); demo.t = 0; return; }
  });
  game.onPress(function (x, y) {
    if (view !== 'PLAYING' || !k) return;
    k.drag = { y0: y, by: k.ty };
    game.audio.tone(520, 0.04, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function (x, y) {
    if (view !== 'PLAYING' || !k || !k.drag) return;
    var before = k.ty;
    k.ty = Math.max(TOP, Math.min(BOT, k.drag.by + (y - k.drag.y0) * 1.5));
    if (Math.floor(before / 90) !== Math.floor(k.ty / 90)) game.audio.tone(400 + (BOT - k.ty) * 0.6, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function () {
    if (!k || !k.drag) return;
    k.drag = null;
    if (view === 'PLAYING') game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function (dt) {
    if (!k) k = freshSky();
    if (view === 'ATTRACT') {
      runDemo(dt);
      drawWorld(false);
      game.draw.hand(W / 2 + 20, demo.gy, { press: demo.press, scale: 14 });
      say('MILL GAP', W / 2, H * 0.05 + 30, 86, STYLE.main[1]);
      say('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.1 + 34, 34, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.8, 42, STYLE.main[0]);
      else say('TAP TO START', W / 2, H * 0.8, 38, INK);
      return;
    }
    if (view === 'RESULT') {
      drawWorld(false);
      if (k.won) {
        k.partyT -= dt;
        if (k.partyT <= 0) { k.partyT = 0.35; game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.55), { color: [STYLE.main[0], STYLE.main[1], STYLE.main[2]][Math.floor(Math.random() * 3)], count: 18, speed: 420 }); }
      }
      game.draw.rect(0, H * 0.28, W, H * 0.3, '#ffffff', 0.85);
      say(k.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.335, 86, k.won ? STYLE.accent[0] : STYLE.main[0]);
      say('SCORE ' + k.score, W / 2, H * 0.405, 52, INK);
      say('PERFECT ' + k.perfects + '    ' + k.passed + ' / ' + MILLS, W / 2, H * 0.455, 38, STYLE.main[1]);
      if (!k.won) say('あと' + (MILLS - k.passed + k.hits) + '基!', W / 2, H * 0.51, 46, STYLE.main[0]);
      else if (k.score > k.prevBest) say('NEW RECORD', W / 2, H * 0.51, 48, STYLE.main[0]);
      else say('BEST ' + k.prevBest, W / 2, H * 0.51, 40, INK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, H * 0.8, 36, INK);
      return;
    }
    if (k.st === 'ready') {
      k.readyT -= dt;
      k.flap += dt;
      if (k.readyT <= 0) { k.st = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (k.st === 'run') {
      if (k.pauseT > 0) {
        k.pauseT -= dt;
        if (k.pauseT <= 0) game.feedback.bad(BX, k.y, { text: 'MISS', size: 48 });
      } else advance(dt);
    } else if (k.st === 'stop') {
      k.stopT -= dt;
      if (k.stopT <= 0) settle();
    }
    drawWorld(k.st === 'stop' || k.pauseT > 0);
    drawHud();
    if (k.st === 'ready') say(k.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, STYLE.main[1]);
    if (k.st === 'run' && k.t < 1.6 && !k.drag) {
      var ph = (game.time.elapsed * 1.5) % 1;
      game.draw.hand(W / 2 + 20, H * 0.92 - 60 + ph * 120, { press: true, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 1], ['D5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2],
    ], {
      tempo: 132, wave: 'triangle', volume: 0.06, loop: true,
      bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]],
    });
    view = 'ATTRACT';
    k = freshSky();
    demo.t = 0;
  });
})(game);
