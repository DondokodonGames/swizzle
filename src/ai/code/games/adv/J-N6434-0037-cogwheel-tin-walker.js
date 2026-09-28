// J-N6434-0037-cogwheel-tin-walker.js
// 大歯車のブリキ綱渡り — 回る歯車に運ばれていく人形を、足元が光った時だけの一歩で頂上へ踏み戻し、最後まで落ちずに立ち続ける
// 操作: タップで回転と逆向きに一歩戻る。一歩のあとは足元の輪が満ちて光るまで次の一歩は踏めず、早押しはつまずいて前へ流される(社内メモ。画面には出さない)
// 終わり: 制限時間まで歯車の上に残れば成功。歯車の肩から滑り落ちると失敗
// @mechanic: cooldown_tap
// @theme: cogwheel_tin_acrobat
// 世界観: からくり博覧会の大歯車の上で、ぜんまい仕掛けのブリキの軽業人形が、逆回転も混ざる歯車に運ばれながら一歩ずつ頂上へ踏み戻り、閉幕まで落ちずに立ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 踏んだ歩数・つまずき数・拾ったネジ数
// スタイル: 70s VECTOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 暗い地に発光する線画。塗りは最小限(人形とネジの小さな光点のみ)
  var STYLE = { bg: ['#01030c', '#06102a', '#0b1a3a'], main: ['#7cf7ff', '#3a9fd0', '#1b4a70'], accent: ['#fff36b', '#ff4f6d'] };
  var C = { bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], cyan: STYLE.main[0], blue: STYLE.main[1], dim: STYLE.main[2], yellow: STYLE.accent[0], red: STYLE.accent[1], white: '#e8ffff', green: '#7dff9a' };

  var GAME_TITLE = 'TIN WALKER';
  var TIME_LIMIT = 13;
  var COOLDOWN = 0.42;
  var STEP = 0.27;
  var STUMBLE = 0.14;
  var FALL = 0.95;
  var CX = W / 2, CY = H * 0.55, R = 330, TEETH = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var WALKER_A = ['p......p', '.pppppp.', '...hh...', '...##...', '..####..', '...##...', '..#..#..'];
  var WALKER_B = ['.p....p.', 'p.pppp.p', '...hh...', '...##...', '..####..', '...##...', '...##...'];
  var WALKER_PAL = { 'p': '#fff36b', 'h': '#e8ffff', '#': '#7cf7ff' };
  var BOLT = ['.#.', '###', '.#.'];

  var gearA, omega, dirSign, revT, revWarn, theta, cool, steps, stumbles, bolts, boltsGot, timeLeft, total;
  var ready, hitStop, finished, ok, done, endWait, fallY, stepFlash, milestone, wob;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    gearA = 0; dirSign = 1; omega = 0.3; revT = game.random(2.4, 3.2); revWarn = 0;
    theta = 0; cool = 0; steps = 0; stumbles = 0; boltsGot = 0; total = 0;
    bolts = [];
    for (var i = 0; i < 4; i++) bolts.push({ a: i * Math.PI / 2 + 0.6, got: false });
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    fallY = 0; stepFlash = 0; milestone = false; wob = 0;
  }

  function stepTap() {
    if (finished) return;
    if (cool > 0) {
      // 早押し: つまずいて回転方向へ流される
      stumbles++;
      theta += dirSign * STUMBLE;
      wob = 0.3;
      var p = walkerPos();
      game.feedback.bad(p.x, p.y - 80, { text: 'MISS', shake: 6, volume: 0.25 });
      cool = COOLDOWN * 0.6;
      return;
    }
    theta -= dirSign * STEP;
    cool = COOLDOWN; steps++; stepFlash = 0.18;
    var q = walkerPos();
    if (Math.abs(theta) < 0.12) game.feedback.good(q.x, q.y - 90, { text: 'NICE', color: C.green, size: 40, volume: 0.2 });
    if (state === S.PLAYING) game.audio.tone(steps % 2 ? 'C5' : 'E5', 0.05, { wave: 'square', volume: 0.05 });
  }

  function walkerPos() {
    var a = -Math.PI / 2 + theta;
    var rr = R + 44;
    return { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr - 40 + fallY };
  }

  function simulate(dt) {
    total += dt;
    if (cool > 0) cool -= dt;
    if (stepFlash > 0) stepFlash -= dt;
    if (wob > 0) wob -= dt;
    // 回転: 速くなり、ときどき逆回転(0.6秒前に予告)
    omega = 0.3 + Math.min(1, total / TIME_LIMIT) * 0.3;
    revT -= dt;
    if (revT <= 0.6 && revWarn <= 0 && revT > 0) {
      revWarn = revT + 0.05;
      if (state === S.PLAYING) game.audio.tone('A4', 0.1, { wave: 'sawtooth', volume: 0.04 });
    }
    if (revWarn > 0) revWarn -= dt;
    if (revT <= 0) { dirSign = -dirSign; revT = game.random(2.2, 3.4); revWarn = 0; }
    var w = dirSign * omega;
    gearA += w * dt;
    theta += w * dt;
    // ネジ拾い(歯車に乗って人形の足元を通過)
    for (var i = 0; i < bolts.length; i++) {
      var b = bolts[i];
      if (b.got) continue;
      var ba = Math.atan2(Math.sin(b.a + gearA + Math.PI / 2 - theta), Math.cos(b.a + gearA + Math.PI / 2 - theta));
      if (Math.abs(ba) < 0.15) {
        b.got = true; boltsGot++;
        var p = walkerPos();
        game.audio.play('se_coin', 0.3);
        game.fx.burst(p.x, p.y + 40, { color: C.yellow, count: 8, speed: 200 });
      }
    }
    if (!milestone && total >= TIME_LIMIT / 2 && state === S.PLAYING) {
      milestone = true;
      game.fx.popup(Math.round(TIME_LIMIT / 2) + '秒', W / 2, H * 0.17, { color: C.yellow, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
    if (Math.abs(theta) >= FALL && !finished) {
      finished = true; ok = false; hitStop = 0.55;
      var fp = walkerPos();
      game.feedback.bad(fp.x, fp.y, { text: 'MISS', shake: 14 });
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg3], [0.5, C.bg2], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.cyan, 0.02 + 0.02 * Math.sin(t * 1.3));
    // 遠景のワイヤーフレームの小歯車
    for (var g = 0; g < 3; g++) {
      var gx = g === 1 ? W * 0.85 : W * 0.12 + g * 20, gy = H * (0.22 + g * 0.08);
      ring(gx, gy, 70 + g * 10, 10, -gearA * 1.5 + g, C.dim, 3);
    }
    for (var s = 0; s < 18; s++) game.draw.circle((s * 211) % W, 250 + (s * 97) % 300, 2, C.blue, 0.4 + 0.3 * Math.sin(t * 2 + s));
  }

  // 線画の歯車(円周を線分で近似+歯)
  function ring(cx, cy, r, n, a0, color, lw) {
    var seg = n * 2;
    for (var i = 0; i < seg; i++) {
      var a1 = a0 + i * Math.PI * 2 / seg, a2 = a0 + (i + 1) * Math.PI * 2 / seg;
      var r1 = i % 2 === 0 ? r + r * 0.12 : r, r2 = i % 2 === 0 ? r + r * 0.12 : r;
      game.draw.line(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2, color, lw);
      game.draw.line(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r, cx + Math.cos(a2) * (r + r * 0.12), cy + Math.sin(a2) * (r + r * 0.12), color, lw);
    }
  }

  function drawGear() {
    var t = game.time.elapsed;
    // グロー(太い線を薄く→細い線を明るく)
    ring(CX, CY, R, TEETH, gearA, C.blue, 12);
    ring(CX, CY, R, TEETH, gearA, C.cyan, 4);
    for (var k = 0; k < 6; k++) {
      var a = gearA + k * Math.PI / 3;
      game.draw.line(CX, CY, CX + Math.cos(a) * (R - 20), CY + Math.sin(a) * (R - 20), C.blue, 3);
    }
    ring(CX, CY, 60, 8, -gearA * 2, C.cyan, 3);
    // 回転方向の矢印(逆回転の予告で赤く点滅)
    var warn = revWarn > 0 && Math.floor(t * 12) % 2 === 0;
    var col = warn ? C.red : C.cyan;
    var dir = warn ? -dirSign : dirSign;
    for (var j = 0; j < 3; j++) {
      var aa = -Math.PI / 2 + Math.PI * 2 / 3 * j + gearA * 0.2;
      var rr = R * 0.55;
      var ax = CX + Math.cos(aa) * rr, ay = CY + Math.sin(aa) * rr;
      var tx = -Math.sin(aa) * dir, ty = Math.cos(aa) * dir;
      game.draw.line(ax - tx * 40, ay - ty * 40, ax + tx * 40, ay + ty * 40, col, 5);
      game.draw.line(ax + tx * 40, ay + ty * 40, ax + tx * 18 + Math.cos(aa) * 20, ay + ty * 18 + Math.sin(aa) * 20, col, 5);
    }
    // 危険な肩(落ちる角度)を赤い警告線で
    for (var sd = -1; sd <= 1; sd += 2) {
      var fa = -Math.PI / 2 + sd * FALL;
      var hot = Math.abs(theta) > FALL * 0.6 && (theta > 0 ? sd > 0 : sd < 0);
      game.draw.line(CX + Math.cos(fa) * (R + 10), CY + Math.sin(fa) * (R + 10), CX + Math.cos(fa) * (R + 110), CY + Math.sin(fa) * (R + 110), C.red, hot && Math.floor(t * 10) % 2 === 0 ? 10 : 4);
    }
    // 頂上マーカー(ゴール位置: 光る)
    game.draw.line(CX, CY - R - 120, CX, CY - R - 170, C.green, 5);
    game.draw.circle(CX, CY - R - 180, 10 + Math.sin(t * 6) * 3, C.green, 0.9);
    for (var i = 0; i < bolts.length; i++) {
      if (bolts[i].got) continue;
      var ba = bolts[i].a + gearA;
      game.draw.sprite(BOLT, { '#': C.yellow }, CX + Math.cos(ba) * (R + 20), CY + Math.sin(ba) * (R + 20), 9, { anchor: 'center' });
    }
  }

  function drawWalker() {
    var t = game.time.elapsed;
    var p = walkerPos();
    var fr = stepFlash > 0 ? WALKER_B : WALKER_A;
    var sway = Math.sin(t * 5) * 4 + (wob > 0 ? Math.sin(t * 50) * 12 : 0) + theta * 20;
    // 足元のクールダウン輪(満ちると白く光る=踏める)
    var fill = cool > 0 ? 1 - cool / COOLDOWN : 1;
    var n = 16;
    for (var k = 0; k < n; k++) {
      var on = k / n < fill;
      var ka = -Math.PI / 2 + k * Math.PI * 2 / n;
      game.draw.circle(p.x + Math.cos(ka) * 70, p.y + 40 + Math.sin(ka) * 22, on ? 6 : 3, fill >= 1 ? C.white : C.blue, on ? 0.9 : 0.4);
    }
    game.draw.sprite(fr, WALKER_PAL, p.x + sway, p.y, 16, { anchor: 'center' });
    if (finished && hitStop > 0) game.draw.circle(p.x, p.y, 100 + Math.sin(t * 30) * 8, C.white, 0.3);
  }

  function drawPedal() {
    // 親指ゾーン: 踏み込みペダル(踏める時に光る)
    var t = game.time.elapsed;
    var y0 = H * 0.86;
    var readyNow = cool <= 0;
    var c = readyNow ? C.green : C.dim;
    game.draw.line(W / 2 - 200, y0, W / 2 + 200, y0, c, readyNow ? 8 : 4);
    game.draw.line(W / 2 - 200, y0 + 90, W / 2 + 200, y0 + 90, c, readyNow ? 8 : 4);
    game.draw.line(W / 2 - 200, y0, W / 2 - 200, y0 + 90, c, readyNow ? 8 : 4);
    game.draw.line(W / 2 + 200, y0, W / 2 + 200, y0 + 90, c, readyNow ? 8 : 4);
    var fill = cool > 0 ? 1 - cool / COOLDOWN : 1;
    game.draw.line(W / 2 - 180, y0 + 45, W / 2 - 180 + 360 * fill, y0 + 45, readyNow ? C.white : C.blue, 20);
    if (readyNow) game.draw.circle(W / 2, y0 + 45, 50 + Math.sin(t * 10) * 6, C.green, 0.12);
  }

  function drawHud() {
    txt(Math.ceil(timeLeft) + '', W / 2, 70, 64, C.cyan);
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(80, 130, 80 + bw, 130, C.dim, 10);
    game.draw.line(80, 130, 80 + bw * Math.max(0, timeLeft / TIME_LIMIT), 130, low ? C.red : C.cyan, 10);
    txt('x' + boltsGot, W - 80, 196, 40, C.yellow, 'right');
    game.draw.sprite(BOLT, { '#': C.yellow }, W - 190, 196, 9, { anchor: 'center' });
    // 傾きメーター
    var mx = 100, mw = 300;
    game.draw.line(mx, 196, mx + mw, 196, C.dim, 6);
    game.draw.line(mx + mw / 2, 176, mx + mw / 2, 216, C.green, 4);
    var px = mx + mw / 2 + (theta / FALL) * (mw / 2);
    game.draw.circle(Math.max(mx, Math.min(mx + mw, px)), 196, 14, Math.abs(theta) > FALL * 0.6 ? C.red : C.yellow);
  }

  function drawScene() { drawBack(); drawGear(); drawWalker(); drawPedal(); }

  // ── ATTRACT ゴースト実演(実ロジック: 足元が光ったら一歩→途中でわざと早押ししてつまずく) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, pressT: 0, dbl: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.dbl = false; }
    simulate(dt);
    finished = false;
    if (Math.abs(theta) > FALL * 0.9) theta = theta * 0.5;
    if (cool <= 0 && theta * dirSign > 0.06) { stepTap(); demo.pressT = 0.14; }
    else if (!demo.dbl && cyc > 2.6 && cool > 0.2) { demo.dbl = true; stepTap(); demo.pressT = 0.14; }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.12);
    stepTap();
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (theta === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 70, C.cyan);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.115, 34, C.yellow);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cyan);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (!ok) fallY += dt * 900;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = steps * 10 + boltsGot * 60 + (ok ? 300 : 0) - stumbles * 20;
        var st = { steps: steps, stumbles: stumbles, bolts: boltsGot, seconds: Math.floor(total) };
        if (ok) game.end.success(Math.max(0, score), st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) { var wp = walkerPos(); game.fx.burst(wp.x, wp.y, { color: C.yellow, count: 40, speed: 600 }); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = true; hitStop = 0.45;
        var p = walkerPos();
        game.feedback.good(p.x, p.y - 90, { text: 'FINISH', color: C.yellow, size: 60 });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.yellow);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 90, ok ? C.green : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, '#000000', 0.55);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.green : C.red);
    txt(Math.floor(total) + '秒', W / 2, H * 0.34, 72, C.cyan);
    txt('x' + boltsGot, W / 2, H * 0.4, 48, C.yellow);
    var score = Math.max(0, steps * 10 + boltsGot * 60 + (ok ? 300 : 0) - stumbles * 20);
    txt('SCORE ' + score, W / 2, H * 0.46, 48, C.white);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.52, 52, C.yellow);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.52, 40, C.cyan);
    if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.58, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.cyan);
  }

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['F4', 0.5], ['A4', 0.5], ['F4', 0.5]], { tempo: 140, wave: 'square', volume: 0.035, loop: true, bass: [['C2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
