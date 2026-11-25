// J-N6434-0036-otter-spotlight-swim.js
// スポットライト水中ショー — 逃げるように動く丸い光の輪を、タップのひとかきずつで追いかけ、光の外に出ずに泳ぎ切る
// 操作: タップした方向へカワウソがひとかき泳ぐ。動き回る光の輪の中に居続けるよう連続タップで追いかける(社内メモ。画面には出さない)
// 終わり: 制限時間いっぱい光の中に残れば成功。光の外に1秒いるとMISS、3回で失敗
// @mechanic: chase
// @theme: night_pool_spotlight_show
// 世界観: 夜の水上ショーに初出演するカワウソの踊り子が、照明係の気まぐれに走り回るスポットライトをひとかきずつ追いかけ、最後まで光の中で泳ぎ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 光の中にいた割合・拾った真珠数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 低彩度・褐色寄り、ブルーム(半透明円の重ね)とビネット
  var STYLE = { bg: ['#16181c', '#2b2a2c', '#4a4038'], main: ['#c9b89a', '#8a7a64', '#3d3a36'], accent: ['#ffe2a0', '#d9534a'] };
  var C = { deep: STYLE.bg[0], mid: STYLE.bg[1], warm: STYLE.bg[2], sand: STYLE.main[0], mud: STYLE.main[1], shade: STYLE.main[2], light: STYLE.accent[0], red: STYLE.accent[1], white: '#f4efe6', water1: '#27414a', water2: '#18272e', pearl: '#e8f4ff' };

  var GAME_TITLE = 'SPOTLIGHT SWIM';
  var TIME_LIMIT = 18;
  var LIVES = 3;
  var OUT_MAX = 1.0;
  var IMPULSE = 270, MAXV = 760;
  var POOL = { x0: 70, x1: W - 70, y0: 290, y1: H * 0.73 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var OTTER_A = ['..##....', '.#o##...', '######..', '.#######', '..######', '...#..##'];
  var OTTER_B = ['..##....', '.#o##...', '######..', '.#######', '..#####.', '..#..#..'];
  var OTTER_PAL = { '#': '#9a6a44', 'o': '#16181c' };
  var LAMP = ['.###.', '#####', '#lll#', '.###.'];
  var PEARL = ['.#.', '###', '.#.'];
  var FAN = ['.##.', '####', '####', '.##.'];

  var sx, sy, vx, vy, lx, ly, lr, lvx, lvy, wpX, wpY, spd, dashT, dashWarn, dashCD, pause;
  var outT, lives, misses, inTime, total, timeLeft, ready, hitStop, finished, ok, done, endWait, pearls, pearlsGot, strokes, flip, milestone, ripples;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    sx = W / 2; sy = H * 0.5; vx = 0; vy = 0;
    lx = W / 2; ly = H * 0.5; lr = 180; lvx = 0; lvy = 0;
    pickWaypoint(false);
    spd = 170; dashT = 0; dashWarn = 0; dashCD = 3.2; pause = 0;
    outT = 0; lives = LIVES; misses = 0; inTime = 0; total = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0;
    pearls = []; pearlsGot = 0; strokes = 0; flip = false; milestone = false; ripples = [];
  }

  function pickWaypoint(far) {
    for (var g = 0; g < 20; g++) {
      var x = game.random(POOL.x0 + 190, POOL.x1 - 190), y = game.random(POOL.y0 + 190, POOL.y1 - 170);
      var d = Math.hypot(x - lx, y - ly);
      if (far ? d > 420 : (d > 180 && d < 520)) { wpX = x; wpY = y; return; }
    }
    wpX = W / 2; wpY = H * 0.5;
  }

  function stroke(tx, ty) {
    var dx = tx - sx, dy = ty - sy;
    var d = Math.hypot(dx, dy) || 1;
    vx += dx / d * IMPULSE; vy += dy / d * IMPULSE;
    var sp = Math.hypot(vx, vy);
    if (sp > MAXV) { vx = vx / sp * MAXV; vy = vy / sp * MAXV; }
    flip = dx < 0;
    strokes++;
    ripples.push({ x: sx, y: sy, t: 0.5 });
  }

  function inLight() { return Math.hypot(sx - lx, sy - ly) < lr - 26; }

  function simulate(dt) {
    total += dt;
    // 泳ぎ: 水の抵抗(retain 0.4/秒)
    var keep = Math.pow(0.4, dt);
    vx *= keep; vy *= keep;
    sx += vx * dt; sy += vy * dt;
    if (sx < POOL.x0) { sx = POOL.x0; vx = Math.abs(vx) * 0.5; }
    if (sx > POOL.x1) { sx = POOL.x1; vx = -Math.abs(vx) * 0.5; }
    if (sy < POOL.y0) { sy = POOL.y0; vy = Math.abs(vy) * 0.5; }
    if (sy > POOL.y1) { sy = POOL.y1; vy = -Math.abs(vy) * 0.5; }
    for (var r = ripples.length - 1; r >= 0; r--) { ripples[r].t -= dt; if (ripples[r].t <= 0) ripples.splice(r, 1); }
    // 光の輪: だんだん速く、ときどき予告付きで走る
    if (pause > 0) { pause -= dt; }
    else {
      spd = 170 + Math.min(1, total / TIME_LIMIT) * 150;
      lr = 180 - Math.min(1, total / TIME_LIMIT) * 30;
      dashCD -= dt;
      if (dashCD <= 0.6 && dashWarn <= 0 && dashT <= 0 && dashCD > 0) {
        dashWarn = dashCD + 0.05; pickWaypoint(true);
        if (state === S.PLAYING) game.audio.tone('D5', 0.08, { wave: 'triangle', volume: 0.05 });
      }
      if (dashWarn > 0) dashWarn -= dt;
      if (dashCD <= 0) { dashT = 0.7; dashCD = game.random(2.8, 3.8); dashWarn = 0; }
      var s = spd;
      if (dashT > 0) { dashT -= dt; s = spd * 2.1; }
      if (dashWarn > 0) s = spd * 0.3;
      var dx = wpX - lx, dy = wpY - ly, d = Math.hypot(dx, dy);
      if (d < 20) pickWaypoint(false);
      else {
        var tvx = dx / d * s, tvy = dy / d * s;
        lvx += (tvx - lvx) * Math.min(1, dt * 3); lvy += (tvy - lvy) * Math.min(1, dt * 3);
      }
      lx += lvx * dt; ly += lvy * dt;
    }
    // 真珠(光の中にだけ湧く)
    if (pearls.length < 2 && game.random(0, 1) < dt * 0.8) {
      var pa = game.random(0, Math.PI * 2);
      pearls.push({ x: lx + Math.cos(pa) * lr * 0.5, y: ly + Math.sin(pa) * lr * 0.5, t: 3 });
    }
    for (var p = pearls.length - 1; p >= 0; p--) {
      var pr = pearls[p];
      pr.t -= dt;
      if (Math.hypot(pr.x - sx, pr.y - sy) < 60) {
        pearls.splice(p, 1); pearlsGot++;
        game.audio.play('se_coin', 0.3);
        game.fx.burst(pr.x, pr.y, { color: C.pearl, count: 10, speed: 220 });
        continue;
      }
      if (pr.t <= 0) pearls.splice(p, 1);
    }
    // 光の外判定
    if (inLight()) { outT = Math.max(0, outT - dt * 2); inTime += dt; }
    else {
      outT += dt;
      if (outT >= OUT_MAX) {
        outT = 0; lives--; misses++; pause = 0.8;
        game.feedback.bad(sx, sy - 40, { text: 'MISS', shake: 10 });
        if (lives <= 0 && state === S.PLAYING) { finished = true; ok = false; hitStop = 0.55; }
      }
    }
    if (!milestone && total >= TIME_LIMIT / 2 && state === S.PLAYING) {
      milestone = true;
      game.fx.popup(Math.round(TIME_LIMIT / 2) + '秒', W / 2, H * 0.18, { color: C.light, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawPool() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.warm], [0.14, C.mid], [0.2, C.water1], [0.74, C.water2], [0.76, C.shade], [1, C.deep]]);
    game.draw.rect(0, 0, W, H, C.light, 0.02 + 0.02 * Math.sin(t * 1.2));
    // プールのタイル目地
    for (var y = POOL.y0 - 40; y < POOL.y1 + 60; y += 110) game.draw.rect(POOL.x0 - 40, y, POOL.x1 - POOL.x0 + 80, 3, C.white, 0.05);
    for (var x = POOL.x0 - 40; x < POOL.x1 + 60; x += 110) game.draw.rect(x, POOL.y0 - 40, 3, POOL.y1 - POOL.y0 + 100, C.white, 0.05);
    for (var w = 0; w < 10; w++) {
      var wx = ((w * 137 + t * 25) % (W + 100)) - 50;
      game.draw.rect(wx, POOL.y0 + (w * 97) % (POOL.y1 - POOL.y0) + Math.sin(t * 2 + w) * 8, 70, 5, C.white, 0.08);
    }
    // プールサイドの縁
    game.draw.rect(POOL.x0 - 50, POOL.y0 - 60, POOL.x1 - POOL.x0 + 100, 14, C.sand, 0.6);
    game.draw.rect(POOL.x0 - 50, POOL.y1 + 60, POOL.x1 - POOL.x0 + 100, 14, C.sand, 0.6);
  }

  function drawLight() {
    var t = game.time.elapsed;
    // 光の筋(天井の照明から)
    var lampX = W / 2 + Math.sin(t * 0.7) * 20, lampY = 250;
    for (var k = 0; k < 8; k++) {
      var f = k / 8;
      game.draw.circle(lampX + (lx - lampX) * f, lampY + (ly - lampY) * f, 30 + lr * 0.6 * f, C.light, 0.025);
    }
    // ブルームの重ね
    game.draw.circle(lx, ly, lr + 60, C.light, 0.06);
    game.draw.circle(lx, ly, lr + 25, C.light, 0.1);
    game.draw.circle(lx, ly, lr, C.light, 0.22 + 0.04 * Math.sin(t * 6));
    game.draw.circle(lx, ly, lr * 0.6, C.white, 0.08);
    // 輪の縁(追いかける対象: 白縁の明滅)
    for (var e = 0; e < 28; e++) {
      var ea = e * Math.PI / 14 + t * 0.8;
      game.draw.circle(lx + Math.cos(ea) * lr, ly + Math.sin(ea) * lr, 5, C.white, 0.4 + 0.3 * Math.sin(t * 10));
    }
    // 走る予告(次の行き先に点滅マーカー+矢印の点列)
    if (dashWarn > 0 && Math.floor(t * 12) % 2 === 0) {
      game.draw.circle(wpX, wpY, 30, C.red, 0.8);
      for (var d = 1; d < 6; d++) game.draw.circle(lx + (wpX - lx) * d / 6, ly + (wpY - ly) * d / 6, 10, C.red, 0.7);
    }
    game.draw.sprite(LAMP, { '#': C.mud, 'l': C.light }, lampX, lampY - 20, 12, { anchor: 'center' });
    for (var p = 0; p < pearls.length; p++) {
      game.draw.sprite(PEARL, { '#': C.pearl }, pearls[p].x, pearls[p].y + Math.sin(t * 5 + p) * 5, 12, { anchor: 'center', alpha: Math.min(1, pearls[p].t) });
    }
  }

  function drawOtter() {
    var t = game.time.elapsed;
    for (var r = 0; r < ripples.length; r++) {
      var rp = ripples[r];
      game.draw.circle(rp.x, rp.y, 30 + (0.5 - rp.t) * 160, C.white, rp.t * 0.4);
    }
    var fr = Math.floor(t * 8) % 2 === 0 ? OTTER_A : OTTER_B;
    var out = !inLight();
    if (out) {
      // 光の外: 赤いリングが満ちる予告+光への方向線
      game.draw.circle(sx, sy, 80, C.red, 0.15 + 0.35 * (outT / OUT_MAX));
      game.draw.line(sx, sy, sx + (lx - sx) * 0.4, sy + (ly - sy) * 0.4, C.light, 6);
    }
    game.draw.circle(sx, sy + 30, 50, '#000000', 0.25);
    game.draw.sprite(fr, OTTER_PAL, sx, sy + Math.sin(t * 4) * 5, 17, { anchor: 'center', flipX: flip });
    if (finished && hitStop > 0) game.draw.circle(sx, sy, 110, C.white, hitStop * 0.6);
  }

  function drawStands() {
    // 親指ゾーン: 客席(他の出演者はシルエットだけ)とビネット
    var t = game.time.elapsed;
    for (var row = 0; row < 3; row++) {
      for (var i = 0; i < 9; i++) {
        var fx = 70 + i * 120 + (row % 2) * 60;
        var fy = H * 0.82 + row * 90 + Math.sin(t * 3 + i + row) * 6;
        game.draw.sprite(FAN, { '#': row === 0 ? C.shade : C.deep }, fx, fy, 12, { anchor: 'center', alpha: 0.8 });
      }
    }
    game.draw.rect(0, 0, 50, H, '#000000', 0.3);
    game.draw.rect(W - 50, 0, 50, H, '#000000', 0.3);
    game.draw.rect(0, H - 60, W, 60, '#000000', 0.3);
  }

  function drawHud() {
    var pct = total > 0 ? Math.round(inTime / total * 100) : 100;
    txt(pct + '%', 80, 70, 48, C.light, 'left');
    txt('x' + pearlsGot, W - 80, 70, 40, C.pearl, 'right');
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 118, bw, 18, '#000000', 0.5);
    game.draw.rect(80, 118, bw * Math.max(0, 1 - timeLeft / TIME_LIMIT), 18, low ? C.red : C.light);
    game.draw.sprite(OTTER_A, OTTER_PAL, 80 + bw * Math.max(0, 1 - timeLeft / TIME_LIMIT), 104, 5, { anchor: 'center' });
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LAMP, { '#': C.mud, 'l': i < lives ? C.light : C.shade }, 110 + i * 70, 190, 8, { anchor: 'center' });
  }

  function drawScene() { drawPool(); drawLight(); drawOtter(); drawStands(); }

  // ── ATTRACT ゴースト実演(実ロジック: 光の中心へひとかきずつ追う→途中でわざと止まって光から外れMISS) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.6, press: false, cd: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.cd = 0; }
    simulate(dt);
    if (lives < 1) lives = LIVES;
    demo.cd -= dt;
    var idle = cyc > 3.4 && cyc < 4.8; // 失敗例: 追うのをやめる
    var tx = lx + lvx * 0.35, ty = ly + lvy * 0.35;
    if (!idle && demo.cd <= 0 && Math.hypot(sx - lx, sy - ly) > 50) {
      stroke(tx, ty); demo.cd = 0.32; demo.pressT = 0.15;
      demo.gx = tx; demo.gy = ty;
    }
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
    stroke(x, y);
    if (inLight()) {
      game.audio.tone(strokes % 2 ? 'E5' : 'G5', 0.05, { wave: 'sine', volume: 0.06 });
      if (strokes % 8 === 0) game.feedback.good(sx, sy - 60, { text: 'NICE', color: C.light, size: 44, volume: 0.2 });
    } else {
      game.audio.play('se_tap', 0.15);
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sx === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 64, C.light);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.1, 34, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.light);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var pct = total > 0 ? Math.round(inTime / total * 100) : 0;
        var score = pct * 10 + pearlsGot * 50;
        var st = { inLightPct: pct, pearls: pearlsGot, miss: misses };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(sx, sy, { color: C.light, count: 44, speed: 600 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = lives > 0; hitStop = 0.45;
        if (ok) game.feedback.good(sx, sy - 60, { text: 'FINISH', color: C.light, size: 64 });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.light);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.light : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, '#000000', 0.5);
    var pct = total > 0 ? Math.round(inTime / total * 100) : 0;
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.light : C.red);
    txt(pct + '%', W / 2, H * 0.34, 76, C.white);
    txt('x' + pearlsGot, W / 2, H * 0.4, 48, C.pearl);
    var score = pct * 10 + pearlsGot * 50;
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.46, 52, C.light);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.46, 40, C.white);
    if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.52, 52, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['A3', 1], ['C4', 0.5], ['E4', 0.5], ['A4', 1], ['G4', 1], ['E4', 1], ['D4', 1], ['E4', 2]], { tempo: 104, wave: 'sine', volume: 0.05, loop: true, bass: [['A1', 4], ['F1', 4]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
