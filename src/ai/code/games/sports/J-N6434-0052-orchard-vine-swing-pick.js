// J-N6434-0052-orchard-vine-swing-pick.js
// 果樹園の蔓ぶらんこ摘み — 下の板をこすって振り子の振れ幅を育て、上の索道の実は大きく、下の索道の実は小さく振って摘み取る
// 操作: 画面下の板を左右に素早くこすると振れ幅が大きくなる。こするのをやめると少しずつ小さくなる
// 終わり: 実を7個摘めばCLEAR。トゲのイガかごに2回触れる/時間切れでGAME OVER
// @mechanic: rub
// @theme: orchard_vine_swing_pick
// 世界観: 山の果樹園で摘み手見習いの子ザルが、大枝から垂れた蔓にぶら下がって振り子の勢いを自分で育て、索道を流れていく果物かごから熟れた実だけをつまみ取る
// 残るもの: 正誤(CLEAR/GAME OVER) + 摘んだ実の数(上の索道は高得点)
// スタイル: 2010s FLAT MOBILE
var STYLE = { bg: ['#bfe6ff', '#eaf7ff'], main: ['#4caf6a', '#8a5a3a', '#ffffff'], accent: ['#ff7a45', '#ffcc33'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    sky1: '#bfe6ff', sky2: '#eaf7ff', hill: '#8fd6a0', hillD: '#4caf6a', wood: '#8a5a3a', woodL: '#c08a5c',
    white: '#ffffff', ink: '#2a3340', orange: '#ff7a45', yellow: '#ffcc33', red: '#e84a5f', purple: '#8a5ad8', cable: '#5a6a7a',
  };

  var GAME_TITLE = 'VINE PICK';
  var TIME_LIMIT = 14;
  var NEEDED = 7;
  var LIVES = 2;
  var PIV_X = W * 0.5, PIV_Y = H * 0.14;
  var ROPE = 560;
  var OMEGA = Math.PI * 2 / 1.7;
  var RETAIN = 0.62;
  var LOW_Y = H * 0.37, HIGH_Y = H * 0.275;
  var PAD_Y = H * 0.85;
  var GRAB_R = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var MONKEY_A = ['.bb..bb.', '.bbbbbb.', 'bbffffbb', '.bfkkfb.', '..ffff..', '.bbbbbb.', 'b.bbbb.b', '..b..b..'];
  var MONKEY_B = ['b.bbbb.b', '.bbbbbb.', '.bffffb.', '.bfkkfb.', '..ffff..', '.bbbbbb.', '..bbbb..', '.b....b.'];
  var BASKET = ['.cccc.', 'wwwwww', 'wWwWwW', '.wWwW.'];
  var FRUIT = ['..g.', '.oo.', 'oooo', 'oooo', '.oo.'];
  var BURR = ['r.r.r.', '.rrrr.', 'rrkkrr', '.rrrr.', 'r.r.r.'];
  var LEAF = ['..gg', '.ggg', 'ggg.', 'gg..'];

  var theta0, phase, amp, items, picked, lives, timeLeft, ready, hitStop, focus, pendingEnd, finished, ok, endWait;
  var spawnT, spawnN, rubLastX, rubDir, rubRun, rubGlow, strokes, nextMs, hurt, score;

  function initGame() {
    phase = 0; amp = 0.25; items = []; picked = 0; lives = LIVES;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; focus = null; pendingEnd = null; finished = false; ok = false; endWait = 0;
    spawnT = 0.3; spawnN = 0; rubLastX = null; rubDir = 0; rubRun = 0; rubGlow = 0; strokes = 0; nextMs = 4; hurt = 0; score = 0;
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x, y + 3, { size: sz, color: 'rgba(42,51,64,0.25)', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function angle() { return amp * Math.sin(phase); }
  function bobPos() { var a = angle(); return { x: PIV_X + Math.sin(a) * ROPE, y: PIV_Y + Math.cos(a) * ROPE }; }

  function spawnItem(prog, demoMode) {
    spawnN++;
    var high = spawnN % 2 === 0;
    // イガかごは上の索道だけ(振れ幅を抑えれば避けられる)
    var bad = high && spawnN > 3 && (spawnN % 4 === 0 || (!demoMode && game.random(0, 1) < 0.3 * prog));
    var dir = spawnN % 3 === 0 ? -1 : 1;
    var sp = 250 + 90 * prog + game.random(0, 40);
    items.push({ x: dir > 0 ? -90 : W + 90, y: high ? HIGH_Y : LOW_Y, vx: dir * sp, high: high, bad: bad, tele: bad ? 0.7 : 0, got: 0 });
    if (bad) game.audio.tone('F3', 0.18, { wave: 'sawtooth', volume: 0.06 });
  }

  // こする: 左右の往復1回ごとに振れ幅が伸びる
  function rubAt(x, demoMode) {
    if (rubLastX === null) { rubLastX = x; return; }
    var dx = x - rubLastX;
    rubLastX = x;
    if (Math.abs(dx) < 2) return;
    var d = dx > 0 ? 1 : -1;
    rubRun += Math.abs(dx);
    if (d !== rubDir) {
      if (rubRun > 50) {
        strokes++;
        amp = Math.min(1.2, amp + 0.1);
        rubGlow = 0.2;
        game.audio.tone(260 + amp * 400, 0.04, { wave: 'triangle', volume: 0.06 });
      }
      rubDir = d; rubRun = 0;
    }
  }

  function stepWorld(dt, prog, demoMode) {
    phase += OMEGA * dt;
    amp = Math.max(0.12, amp * Math.pow(RETAIN, dt));
    if (rubGlow > 0) rubGlow -= dt;
    if (hurt > 0) hurt -= dt;
    spawnT -= dt;
    if (spawnT <= 0) { spawnItem(prog, demoMode); spawnT = 1.05 - 0.3 * prog; }
    var b = bobPos();
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.tele > 0) { it.tele -= dt; continue; }
      if (it.got > 0) { it.got -= dt; if (it.got <= 0) items.splice(i, 1); continue; }
      it.x += it.vx * dt;
      if (it.x < -140 || it.x > W + 140) { items.splice(i, 1); continue; }
      if (Math.hypot(b.x - it.x, b.y - (it.y + 40)) < GRAB_R) {
        if (it.bad) {
          if (hurt > 0) continue;
          hurt = 0.8;
          if (demoMode) { game.feedback.bad(it.x, it.y - 60, { text: 'MISS', shake: 4 }); items.splice(i, 1); continue; }
          lives--;
          game.audio.play('se_break', 0.4);
          if (lives <= 0) { focus = it; hitStop = 0.5; pendingEnd = 'fail'; finished = true; return; }
          game.feedback.bad(it.x, it.y - 60, { text: 'MISS' });
          items.splice(i, 1);
        } else {
          it.got = 0.3;
          picked++;
          score += it.high ? 150 : 100;
          game.audio.play('se_coin', 0.35);
          game.feedback.good(it.x, it.y - 70, { text: it.high ? 'NICE' : 'GOOD', color: it.high ? C.purple : C.hillD, count: it.high ? 14 : 8 });
          if (!demoMode && picked >= nextMs && picked < NEEDED) { nextMs += 4; game.audio.play('se_milestone', 0.4); game.fx.popup(picked + '/' + NEEDED, W / 2, H * 0.22, { color: C.orange, size: 64 }); }
          if (picked >= NEEDED) {
            if (demoMode) { picked = 0; continue; }
            focus = { monkey: true }; hitStop = 0.4; pendingEnd = 'clear'; finished = true; return;
          }
        }
      }
    }
  }

  function drawBg(pulse) {
    game.draw.gradient(0, H, [[0, C.sky1], [0.55, C.sky2], [1, C.sky2]]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 400 + game.time.elapsed * 20) % (W + 300)) - 150;
      game.draw.circle(cx, H * 0.08 + c * 40, 50, C.white, 0.9);
      game.draw.circle(cx + 50, H * 0.08 + c * 40, 36, C.white, 0.9);
    }
    // 丘の果樹
    game.draw.circle(W * 0.2, H * 0.72, 420, C.hill);
    game.draw.circle(W * 0.85, H * 0.75, 460, C.hillD);
    for (var t = 0; t < 6; t++) {
      var tx = W * (0.08 + t * 0.17), ty = H * 0.55 + (t % 2) * 40, sw = Math.sin(game.time.elapsed * 1.3 + t) * 4;
      game.draw.rect(tx - 8, ty, 16, 60, C.wood);
      game.draw.circle(tx + sw, ty - 10, 44, C.hillD);
      game.draw.circle(tx + sw + 14, ty - 20, 10, C.orange);
    }
    // 索道
    game.draw.line(0, HIGH_Y - 4, W, HIGH_Y - 4, C.cable, 6);
    game.draw.line(0, LOW_Y - 4, W, LOW_Y - 4, C.cable, 6);
    // 大枝
    game.draw.rect(0, PIV_Y - 30, W, 40, C.wood);
    game.draw.rect(0, PIV_Y - 30, W, 10, C.woodL);
    for (var l = 0; l < 8; l++) game.draw.sprite(LEAF, { g: C.hillD }, 60 + l * 140, PIV_Y - 40 + Math.sin(game.time.elapsed * 2 + l) * 4, 10, { anchor: 'center', flipX: l % 2 === 0 });
  }

  function drawItems() {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.tele > 0) {
        var bl = Math.floor(game.time.elapsed * 12) % 2 === 0;
        var ex = it.vx > 0 ? 50 : W - 50;
        game.draw.circle(ex, it.y + 10, 40, C.red, bl ? 0.9 : 0.3);
        game.draw.rect(ex - 6, it.y - 16, 12, 30, C.white, bl ? 1 : 0.4);
        continue;
      }
      var sway = Math.sin(game.time.elapsed * 4 + i) * 5;
      game.draw.line(it.x, it.y - 4, it.x + sway, it.y + 20, C.cable, 4);
      var hl = focus === it;
      if (hl) game.draw.circle(it.x + sway, it.y + 50, 120, C.white, 0.8);
      game.draw.sprite(BASKET, { c: C.cable, w: C.woodL, W: C.wood }, it.x + sway, it.y + 60, 12, { anchor: 'center' });
      if (it.got > 0) continue;
      if (it.bad) game.draw.sprite(BURR, { r: C.red, k: C.ink }, it.x + sway, it.y + 32, hl ? 18 : 12, { anchor: 'center' });
      else game.draw.sprite(FRUIT, { g: C.hillD, o: it.high ? C.purple : C.orange }, it.x + sway, it.y + 28, 11, { anchor: 'center' });
    }
  }

  function drawMonkey(pose) {
    var b = bobPos();
    game.draw.line(PIV_X, PIV_Y, b.x, b.y, C.hillD, 10);
    game.draw.circle(PIV_X, PIV_Y, 14, C.wood);
    var hl = focus && focus.monkey;
    if (hl) game.draw.circle(b.x, b.y + 40, 120, C.white, 0.8);
    if (pose === 'down') { game.draw.sprite(MONKEY_A, { b: C.wood, f: '#f2c9a0', k: C.ink }, b.x, b.y + 50, 12, { anchor: 'center', flipY: true }); return; }
    var bob = Math.sin(game.time.elapsed * 5) * 4;
    var cheer = pose === 'cheer' ? -Math.abs(Math.sin(game.time.elapsed * 7)) * 30 : 0;
    var art = Math.floor(game.time.elapsed * 4) % 2 ? MONKEY_A : MONKEY_B;
    if (hurt > 0 && Math.floor(game.time.elapsed * 20) % 2 === 0) return;
    game.draw.sprite(art, { b: C.wood, f: '#f2c9a0', k: C.ink }, b.x, b.y + 45 + bob + cheer, 12, { anchor: 'center' });
  }

  function drawPad(active) {
    // 親指ゾーン: こする板
    var glow = rubGlow > 0 ? 0.9 : (active ? 0.5 + 0.2 * Math.sin(game.time.elapsed * 4) : 0.3);
    game.draw.rect(W * 0.08 - 10, PAD_Y - 110, W * 0.84 + 20, 220, C.orange, glow * 0.6);
    game.draw.rect(W * 0.08, PAD_Y - 100, W * 0.84, 200, C.woodL);
    for (var r = 0; r < 9; r++) game.draw.rect(W * 0.1 + r * 96, PAD_Y - 80, 40, 160, C.wood, 0.5);
    // ↔ 往復の記号
    var ax = W / 2 + Math.sin(game.time.elapsed * 8) * (active ? 40 : 10);
    game.draw.line(ax - 120, PAD_Y, ax + 120, PAD_Y, C.white, 12);
    game.draw.line(ax - 120, PAD_Y, ax - 80, PAD_Y - 36, C.white, 12);
    game.draw.line(ax - 120, PAD_Y, ax - 80, PAD_Y + 36, C.white, 12);
    game.draw.line(ax + 120, PAD_Y, ax + 80, PAD_Y - 36, C.white, 12);
    game.draw.line(ax + 120, PAD_Y, ax + 80, PAD_Y + 36, C.white, 12);
  }

  function drawAmpMeter() {
    // 振れ幅メーター: 下の索道に届く帯と上の索道に届く帯
    var x0 = W * 0.08, w = W * 0.84, y = H * 0.7;
    game.draw.rect(x0, y, w, 30, C.white);
    var hiA = Math.acos((HIGH_Y + 40 - PIV_Y) / ROPE);
    var loA = Math.acos((LOW_Y + 40 - PIV_Y) / ROPE);
    game.draw.rect(x0 + w * (loA - 0.1) / 1.2, y, w * 0.2 / 1.2, 30, C.orange, 0.35);
    game.draw.rect(x0 + w * (hiA - 0.12) / 1.2, y, w * 0.24 / 1.2, 30, C.purple, 0.5);
    game.draw.rect(x0, y, w * Math.min(1, amp / 1.2), 30, C.orange, 0.85);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, H * 0.1, C.white, 0.9);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FRUIT, { g: C.hillD, o: i < picked ? C.orange : '#d0d8e0' }, W * 0.07 + i * 72, H * 0.04, 8, { anchor: 'center' });
    for (var l = 0; l < LIVES; l++) game.draw.circle(W * 0.7 + l * 56, H * 0.04, 20, l < lives ? C.red : '#d0d8e0');
    txt(picked + '/' + NEEDED, W * 0.89, H * 0.04, 50, C.ink);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(50, H * 0.078, W - 100, 16, '#d0d8e0');
    game.draw.rect(50, H * 0.078, (W - 100) * frac, 16, low ? C.red : C.hillD);
  }

  // ── ATTRACTデモ: 上の実が来たらこすって大きく、下の実なら手を止めて小さく。1度だけイガの時もこすり続けて当たる ──
  var demo = { t: 0, gx: W / 2, gy: PAD_Y, press: false, x: W / 2, dir: 1, greedy: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.greedy = false; }
    stepWorld(dt, 0.2, true);
    var wantHigh = false, danger = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var near = Math.abs(it.x - W / 2) < 560;
      if (!near || it.got > 0 || it.tele > 0) continue;
      if (it.high && !it.bad) wantHigh = true;
      if (it.high && it.bad) danger = true;
    }
    if (danger && cyc > 4 && !demo.greedy) demo.greedy = true;
    // 目標の振れ幅: 上の実なら大きく、イガが近ければ中くらいに抑える(下の実はそれで届く)
    var targetAmp = danger ? (demo.greedy && cyc < 6 ? 1.1 : 0.66) : (wantHigh ? 1.05 : 0.7);
    var rub = amp < targetAmp;
    demo.press = rub;
    if (rub) {
      demo.x += demo.dir * 3000 * dt;
      if (demo.x > W * 0.7) demo.dir = -1;
      if (demo.x < W * 0.3) demo.dir = 1;
      rubAt(demo.x, true);
    } else {
      rubLastX = null;
    }
    demo.gx = demo.x; demo.gy = PAD_Y;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    rubLastX = null;
    if (y > H * 0.72) game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0.2) return;
    if (y > H * 0.72) {
      rubAt(x, false);
      if (rubGlow > 0.15) game.fx.burst(x, y, { color: C.yellow, count: 2, speed: 120 });
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    rubLastX = null;
    game.audio.tone('D5', 0.03, { wave: 'triangle', volume: 0.03 });
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.4); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && !finished) game.fx.burst(x, y, { color: C.woodL, count: 3, speed: 100 });
  });

  function finishNow() {
    var b = bobPos();
    if (pendingEnd === 'clear') {
      ok = true;
      game.feedback.good(b.x, b.y - 60, { text: 'CLEAR', color: C.orange, count: 30 });
      game.audio.play('se_success', 0.6);
    } else {
      ok = false;
      game.feedback.bad(b.x, b.y - 60, { text: pendingEnd === 'time' ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
    endWait = 1.2; pendingEnd = null;
  }

  game.onUpdate(function(dt) {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.6);

    if (state === S.ATTRACT) {
      if (items === undefined) initGame();
      stepDemo(dt);
      drawBg(pulse);
      drawItems();
      drawMonkey('');
      drawAmpMeter();
      drawPad(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, H * 0.12, C.white, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.045, 80, C.hillD);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.095, 38, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.orange);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      phase += OMEGA * dt;
      drawBg(pulse);
      drawMonkey(ok ? 'cheer' : 'down');
      if (ok && Math.floor(game.time.elapsed * 5) % 2 === 0) game.fx.burst(game.random(W * 0.2, W * 0.8), H * 0.3, { color: C.orange, count: 4 });
      game.draw.rect(0, H * 0.46, W, H * 0.22, C.white, 0.92);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.5, 100, ok ? C.hillD : C.red);
      txt('SCORE ' + score, W / 2, H * 0.565, 56, C.ink);
      if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.62, 48, C.orange);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.62, 42, C.ink);
      if (!ok) txt('あと' + Math.max(1, NEEDED - picked) + '個!', W / 2, H * 0.66, 44, C.orange);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (endWait > 0) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { picked: picked, strokes: strokes });
        else game.end.failure({ picked: picked, strokes: strokes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) finishNow();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, Math.min(1, (TIME_LIMIT - timeLeft) / TIME_LIMIT), false);
      if (!finished && timeLeft <= 0) {
        timeLeft = 0; finished = true; pendingEnd = 'time'; hitStop = 0.45; focus = { monkey: true };
        game.fx.popup('TIME UP', W / 2, H * 0.22, { color: C.red, size: 80 });
      }
    }

    drawBg(pulse);
    drawItems();
    drawMonkey('');
    drawAmpMeter();
    drawPad(!finished && ready <= 0);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 110, C.orange);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['F#5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C#5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['A4', 0.5], ['D5', 1.5], [0, 0.5],
    ], { tempo: 144, wave: 'triangle', volume: 0.07, loop: true, bass: [['D3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
