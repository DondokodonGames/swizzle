// J-N6434-0051-inlet-mast-rope-cross.js
// 入り江の帆柱わたり — 振り子に揺れる綱から手を離す瞬間を見極め、揺れている次の綱へ飛び移ってトゲフグの海を渡り切る
// 操作: 綱は自動で揺れる。タップで手を離して飛ぶ。次の綱に触れれば自動でつかまる(同じ綱に長くいると綱がほつれて切れる)
// 終わり: 4本の綱を渡って対岸の網小屋の桟橋に降りればCLEAR。3回海に落ちる/時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: inlet_mast_rope_cross
// 世界観: 嵐の翌朝の漁村で網元の見習いの少女が、沈みかけた船の帆柱の間に垂れた綱を振り子のように渡り、トゲフグの群れる入り江に落ちずに対岸の網小屋へ浮き玉を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡った本数と残り時間のスコア
// スタイル: 8bit HANDHELD
var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f', '#8bac0f'], accent: ['#9bbc0f', '#0f380f'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 携帯モノクロ4階調
  var C = { g0: '#0f380f', g1: '#306230', g2: '#8bac0f', g3: '#9bbc0f', frame: '#56604a', frameD: '#2e3428' };

  var GAME_TITLE = 'ROPE CROSS';
  var TIME_LIMIT = 18;
  var NEEDED = 5; // 綱4本 + 桟橋
  var LIVES = 3;
  var G = 2200;
  var L = 400;
  var SPACING = 540;
  var PIVOT_Y = H * 0.18;
  var SEA_Y = H * 0.66;
  var GRAB_R = 75;
  var FRAY_T = 4.2;
  var DOCK_X = 5 * SPACING - 100;
  var DOCK_W = 560;
  var DOCK_Y = SEA_Y - 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GIRL_HANG = ['.kk.', 'kffk', '.bb.', 'bbbb', '.bb.', '.b.b'];
  var GIRL_FLY = ['.kk..', 'kffk.', '.bbbb', 'bbb..', '.b.b.', 'b...b'];
  var GIRL_LAND = ['..kk..', '.kffk.', 'b.bb.b', '.bbbb.', '..bb..', '.b..b.'];
  var PUFFER = ['s.s.s.', '.gggg.', 'sgkgggs', '.gggg.', 's.s.s.'];
  var FLOAT = ['.gg.', 'gkkg', 'gkkg', '.gg.'];
  var HUT = ['...gg...', '..gggg..', '.gggggg.', 'gggggggg', '.k.kk.k.', '.k.kk.k.'];

  var rope, theta, omega, flying, px, py, vx, vy, crossed, lives, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var camX, hangT, respawn, trail, puffers, landed, nextMs;

  function initGame() {
    rope = 0; theta = -0.9; omega = 0; flying = false; px = 0; py = 0; vx = 0; vy = 0;
    crossed = 0; lives = LIVES; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null;
    finished = false; ok = false; endWait = 0; camX = -W * 0.3; hangT = 0; respawn = 0; trail = []; landed = false; nextMs = 3;
    puffers = [];
    for (var i = 0; i < 7; i++) puffers.push({ x: i * 420 + 200, ph: i * 1.3, sp: 60 + i * 13 });
    placeOnRope();
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.g3, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function pivotX(i) { return i * SPACING; }
  function idleAngle(i, t) { return Math.sin(t * 2.2 + i * 1.7) * 0.22; }

  function placeOnRope() {
    px = pivotX(rope) + Math.sin(theta) * L;
    py = PIVOT_Y + Math.cos(theta) * L;
  }

  function stepPendulum(dt) {
    var alpha = -(G / L) * Math.sin(theta);
    omega += alpha * dt;
    // 自分で漕ぐ: 振れ幅が小さいと下を通るとき少し加速する
    var energy = 0.5 * omega * omega - (G / L) * Math.cos(theta);
    var target = -(G / L) * Math.cos(1.05);
    if (energy < target && Math.abs(theta) < 0.25) omega += (omega >= 0 ? 1 : -1) * 1.6 * dt;
    theta += omega * dt;
    placeOnRope();
  }

  // 次の綱の今の形の線分に近いか
  function nearRope(i, x, y, t) {
    var a = idleAngle(i, t);
    var ax = pivotX(i), ay = PIVOT_Y;
    var bx = ax + Math.sin(a) * L, by = ay + Math.cos(a) * L;
    var vx0 = bx - ax, vy0 = by - ay, wx = x - ax, wy = y - ay;
    var k = Math.max(0.35, Math.min(1, (wx * vx0 + wy * vy0) / (L * L)));
    return Math.hypot(x - (ax + vx0 * k), y - (ay + vy0 * k)) < GRAB_R;
  }

  function letGo(demoMode) {
    if (flying || respawn > 0) return false;
    flying = true;
    vx = L * omega * Math.cos(theta);
    vy = -L * omega * Math.sin(theta);
    game.audio.play('se_jump', 0.3);
    return true;
  }

  function grab(i, t) {
    rope = i; flying = false; hangT = 0;
    var dx = px - pivotX(i), dy = py - PIVOT_Y;
    theta = Math.atan2(dx, dy);
    // 接線方向の速度を角速度に
    var tx = Math.cos(theta), ty = -Math.sin(theta);
    omega = (vx * tx + vy * ty) / L;
    if (omega < 0.4) omega = 0.4;
    placeOnRope();
  }

  function fallIn(demoMode) {
    flying = false;
    var nearest = puffers[0];
    for (var i = 0; i < puffers.length; i++) if (Math.abs(puffers[i].x - px) < Math.abs(nearest.x - px)) nearest = puffers[i];
    nearest.x = px;
    if (demoMode) { game.feedback.bad(px - camX, SEA_Y - 60, { text: 'MISS', shake: 4 }); respawn = 0.7; return; }
    lives--;
    game.audio.play('se_break', 0.35);
    if (lives <= 0) {
      focus = { puffer: nearest }; hitStop = 0.5; pendingEnd = 'fail'; finished = true;
    } else {
      game.feedback.bad(px - camX, SEA_Y - 60, { text: 'MISS' });
      respawn = 0.8;
    }
  }

  function stepWorld(dt, t, demoMode) {
    for (var p = 0; p < puffers.length; p++) puffers[p].x += Math.sin(t * 0.8 + puffers[p].ph) * puffers[p].sp * dt;
    if (respawn > 0) {
      respawn -= dt;
      if (respawn <= 0) { theta = -0.9; omega = 0; hangT = 0; placeOnRope(); }
      return;
    }
    if (landed) return;
    if (!flying) {
      stepPendulum(dt);
      hangT += dt;
      if (hangT >= FRAY_T) {
        // 綱が切れる
        hangT = 0; flying = true;
        vx = L * omega * Math.cos(theta) * 0.3; vy = 0;
        game.audio.play('se_break', 0.3);
      }
    } else {
      vy += G * dt;
      px += vx * dt; py += vy * dt;
      trail.push({ x: px, y: py, life: 0.25 });
      var nxt = rope + 1;
      if (nxt < NEEDED && vy > -200 && nearRope(nxt, px, py, t)) {
        grab(nxt, t); crossed++;
        game.audio.play('se_coin', 0.3);
        game.feedback.good(px - camX, py - 100, { text: 'GOOD', color: C.g0, count: 10 });
        if (!demoMode && crossed >= nextMs && crossed < NEEDED) { nextMs += 5; game.audio.play('se_milestone', 0.4); game.fx.popup('NICE', W / 2, H * 0.3, { color: C.g0, size: 64 }); }
      } else if (rope === NEEDED - 1 && vy > 0 && py >= DOCK_Y - 50 && px > DOCK_X && px < DOCK_X + DOCK_W) {
        py = DOCK_Y - 50; landed = true; crossed = NEEDED;
        game.audio.play('se_coin', 0.3);
        if (demoMode) { game.feedback.good(px - camX, py - 100, { text: 'CLEAR', color: C.g0 }); respawn = 1.2; rope = 0; landed = false; flying = false; crossed = 0; return; }
        focus = { hut: true }; hitStop = 0.45; pendingEnd = 'clear'; finished = true;
      } else if (py > SEA_Y) {
        py = SEA_Y;
        fallIn(demoMode);
      }
    }
    for (var i = trail.length - 1; i >= 0; i--) { trail[i].life -= dt; if (trail[i].life <= 0) trail.splice(i, 1); }
    camX += (pivotX(rope) - W * 0.3 - camX) * Math.min(1, dt * 3);
  }

  // 今離したら次の綱(か桟橋)に届くか: デモAI用の先読み
  function predict(t0) {
    var x = pivotX(rope) + Math.sin(theta) * L, y = PIVOT_Y + Math.cos(theta) * L;
    var qx = L * omega * Math.cos(theta), qy = -L * omega * Math.sin(theta);
    var dt = 1 / 60;
    for (var s = 0; s < 120; s++) {
      qy += G * dt; x += qx * dt; y += qy * dt;
      var t = t0 + s * dt;
      if (rope + 1 < NEEDED && qy > -200 && nearRope(rope + 1, x, y, t)) return true;
      if (rope === NEEDED - 1 && qy > 0 && y >= DOCK_Y - 50 && x > DOCK_X && x < DOCK_X + DOCK_W) return true;
      if (y > SEA_Y) return false;
    }
    return false;
  }

  function drawBg(pulse, t) {
    game.draw.gradient(0, H, [[0, C.g3], [0.6, C.g2], [1, C.g1]]);
    game.draw.rect(0, 0, W, H, C.g1, pulse);
    // 遠くの岬(視差)
    for (var m = 0; m < 5; m++) {
      var mx = ((m * 300 - camX * 0.25) % (W + 300) + W + 300) % (W + 300) - 150;
      game.draw.rect(mx, SEA_Y - 140 - (m % 2) * 60, 180, 140 + (m % 2) * 60, C.g2);
    }
    // 海
    game.draw.rect(0, SEA_Y, W, H * 0.12, C.g1);
    for (var w = 0; w < 14; w++) {
      var wx = ((w * 90 - camX * 1.0 + Math.sin(t * 2 + w) * 20) % W + W) % W;
      game.draw.rect(wx, SEA_Y + 10 + (w % 3) * 40, 50, 8, C.g2);
    }
    // トゲフグ(危険: トゲ形状、水面下を回遊)
    for (var p = 0; p < puffers.length; p++) {
      var pu = puffers[p];
      var sx = pu.x - camX;
      if (sx < -100 || sx > W + 100) continue;
      var hl = focus && focus.puffer === pu;
      var bob = Math.sin(t * 3 + pu.ph) * 10;
      if (hl) game.draw.circle(sx, SEA_Y + 60, 110, C.g3, 0.8);
      game.draw.sprite(PUFFER, { s: C.g0, g: C.g0, k: C.g3 }, sx, SEA_Y + 60 + bob, hl ? 22 : 14, { anchor: 'center', flipX: Math.sin(t * 0.8 + pu.ph) < 0 });
    }
    game.draw.rect(0, SEA_Y + H * 0.12, W, H, C.frameD);
  }

  function drawRopes(t) {
    for (var i = 0; i < NEEDED; i++) {
      var ax = pivotX(i) - camX;
      if (ax < -600 || ax > W + 600) continue;
      // 帆柱と横桁
      game.draw.rect(ax - 14, PIVOT_Y - 60, 28, SEA_Y - PIVOT_Y + 60, C.g1);
      game.draw.rect(ax - 70, PIVOT_Y - 20, 140, 20, C.g0);
      var a = (i === rope && !flying && respawn <= 0) ? theta : idleAngle(i, t);
      var bx = ax + Math.sin(a) * L, by = PIVOT_Y + Math.cos(a) * L;
      var fray = i === rope && !flying && hangT > FRAY_T - 1.1;
      var blink = Math.floor(t * 12) % 2 === 0;
      game.draw.line(ax, PIVOT_Y, bx, by, fray && blink ? C.g3 : C.g0, fray ? 10 : 7);
      game.draw.circle(bx, by, 12, C.g0);
      if (i === rope + 1 && Math.floor(t * 3) % 2 === 0) game.draw.circle(bx, by, 40, C.g3, 0.5);
    }
    // 対岸の桟橋と網小屋
    var dx = DOCK_X - camX;
    var hl = focus && focus.hut;
    game.draw.rect(dx, DOCK_Y, DOCK_W, 24, C.g0);
    for (var k = 0; k < 4; k++) game.draw.rect(dx + 20 + k * 120, DOCK_Y, 16, SEA_Y - DOCK_Y + 60, C.g1);
    if (hl) game.draw.circle(dx + DOCK_W * 0.6, DOCK_Y - 110, 170, C.g3, 0.7);
    game.draw.sprite(HUT, { g: C.g1, k: C.g0 }, dx + DOCK_W * 0.65, DOCK_Y - 70, 18, { anchor: 'center' });
    game.draw.sprite(FLOAT, { g: C.g0, k: C.g3 }, dx + DOCK_W * 0.25, DOCK_Y - 30 + Math.sin(t * 3) * 5, 10, { anchor: 'center' });
  }

  function drawGirl(pose, t) {
    for (var i = 0; i < trail.length; i++) game.draw.circle(trail[i].x - camX, trail[i].y, 22, C.g1, trail[i].life * 2);
    if (respawn > 0 && !landed) {
      game.draw.circle(px - camX, SEA_Y + 10, 60 + (0.8 - respawn) * 80, C.g3, respawn);
      return;
    }
    var sx = px - camX;
    if (pose === 'down') { game.draw.sprite(GIRL_HANG, { k: C.g0, f: C.g2, b: C.g0 }, sx, SEA_Y, 16, { anchor: 'center', flipY: true }); return; }
    var art = landed ? GIRL_LAND : flying ? GIRL_FLY : GIRL_HANG;
    var jump = pose === 'cheer' ? -Math.abs(Math.sin(t * 7)) * 60 : 0;
    var sway = Math.sin(t * 5) * 3;
    game.draw.sprite(art, { k: C.g0, f: C.g2, b: C.g0 }, sx + sway, py + 40 + jump, 16, { anchor: 'center', flipX: flying && vx < 0 });
  }

  function drawFrame(active) {
    // 携帯機の画面枠 + 親指ゾーンのボタン
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.frame);
    game.draw.rect(0, H * 0.78, W, 10, C.frameD);
    var press = game.input.pressing && active;
    game.draw.circle(W * 0.72, H * 0.87 + 8, 110, C.frameD);
    game.draw.circle(W * 0.72, H * 0.87 + (press ? 8 : 0), 110, active ? '#9a2a50' : '#6a3a4a');
    game.draw.circle(W * 0.72 - 30, H * 0.87 - 30 + (press ? 8 : 0), 26, '#c86a88', 0.6);
    game.draw.rect(W * 0.12, H * 0.86, 220, 60, C.frameD);
    game.draw.rect(W * 0.12 + 80, H * 0.86 - 80, 60, 220, C.frameD);
  }

  function drawHud(t) {
    game.draw.rect(0, 0, W, H * 0.1, C.g1, 0.85);
    for (var i = 0; i < NEEDED; i++) game.draw.rect(W * 0.06 + i * 80, H * 0.03, 60, 40, i < crossed ? C.g3 : C.g0);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(FLOAT, { g: l < lives ? C.g3 : C.g0, k: C.g0 }, W * 0.62 + l * 60, H * 0.05, 9, { anchor: 'center' });
    txt(crossed + '/' + NEEDED, W * 0.88, H * 0.05, 48, C.g3);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(50, H * 0.085, W - 100, 16, C.g0);
    game.draw.rect(50, H * 0.085, (W - 100) * frac, 16, low ? C.g2 : C.g3);
  }

  // ── ATTRACTデモ: 先読みで届く瞬間に離す。2本目の綱ではわざと早く離して落ちて見せる ──
  var demo = { t: 0, clock: 0, gx: W * 0.72, gy: H * 0.87, press: false, pressT: 0, slipped: false };
  function stepDemo(dt) {
    demo.t += dt; demo.clock += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.slipped = false; }
    stepWorld(dt, demo.clock, true);
    if (!flying && respawn <= 0 && !landed && hangT > 0.4) {
      var go;
      if (rope === 1 && !demo.slipped) { go = omega < -0.5; if (go) demo.slipped = true; }
      else go = omega > 0 && predict(demo.clock);
      if (go) { letGo(true); demo.pressT = 0.15; }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  var clock = 0;

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || finished) return;
    if (ready > 0 || flying || respawn > 0) { game.audio.play('se_tap', 0.08); return; }
    if (letGo(false)) game.fx.burst(px - camX, py, { color: C.g1, count: 5, speed: 160 });
  });

  function finishNow() {
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(px - camX, py - 150, { text: 'CLEAR', color: C.g0, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(px - camX, SEA_Y - 120, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  function scoreNow() { return crossed * 100 + (ok ? Math.round(timeLeft * 20) : 0); }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.5);

    if (state === S.ATTRACT) {
      if (puffers === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse, demo.clock);
      drawRopes(demo.clock);
      drawGirl('', demo.clock);
      drawFrame(true);
      game.draw.hand(W * 0.72, H * 0.87 - (demo.press ? 0 : 30), { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.g1, 0.8);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.g3);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.g2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.g3);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.g2);
      return;
    }

    if (state === S.RESULT) {
      clock += dt;
      drawBg(pulse, clock);
      drawRopes(clock);
      drawGirl(ok ? 'cheer' : 'down', clock);
      drawFrame(false);
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.3, { color: C.g3, count: 4 });
      game.draw.rect(0, H * 0.28, W, H * 0.24, C.g0, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, C.g3);
      txt('SCORE ' + scoreNow(), W / 2, H * 0.4, 56, C.g2);
      if (ok && scoreNow() > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.46, 48, C.g3);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.46, 42, C.g2);
      if (!ok) txt('あと' + Math.max(1, NEEDED - crossed) + '本!', W / 2, H * 0.5, 44, C.g3);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.g3);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(scoreNow(), { crossed: crossed, lives: lives });
        else game.end.failure({ crossed: crossed, lives: lives });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt; clock += dt;
      stepWorld(dt, clock, false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = null;
        game.fx.popup('TIME UP', W / 2, H * 0.3, { color: C.g0, size: 80 });
      }
    }

    drawBg(pulse, clock);
    drawRopes(clock);
    drawGirl('', clock);
    drawFrame(!finished && ready <= 0);
    drawHud(clock);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 110, C.g0);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 1],
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['E2', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
