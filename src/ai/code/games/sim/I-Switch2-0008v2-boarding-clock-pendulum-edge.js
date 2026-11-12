// I-Switch2-0008v2-boarding-clock-pendulum-edge.js
// 柱時計のふち止め — 押している間だけ振り子の揺れが大きくなる。箱のふちに当たる寸前まで揺らして、ふちに一番近づいた瞬間に指を離して止める
// 操作: 画面を押している間、管理人が振り子をそっと押して振れ幅がだんだん大きくなる(離すと増えない)。指を離すとその場で振り子をつかんで止める。止めた所が箱のふち(内側の点線より外)に近いほど高得点。押しすぎて振り子がふちに当たると失敗。点線に届かない所で止めると早すぎ。押さずに待ちすぎても失敗
// 終わり: 20秒のうちに5回ふちぎりぎりで止めればCLEAR。ふちに当てる/早すぎ/待ちすぎが3回、または時間切れでGAME OVER
// @mechanic: near_miss
// @theme: boarding_house_clock_pendulum
// 世界観: 古い柱時計のある下宿屋の廊下で、下宿の管理人が狂った振り子を指で少しずつ揺らし、箱のふちに当たる寸前のいちばん端で止めて時計の癖を直していく
// 残るもの: 正誤(CLEAR/GAME OVER) + ふちぎりぎりで止めた回数・PERFECT数・一番近かった距離・スコア
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調のみ。残像と低コントラスト、画面枠を描く
  var STYLE = { bg: ['#0f380f', '#306230'], main: ['#8bac0f', '#9bbc0f', '#306230'], accent: ['#0f380f', '#9bbc0f'] };
  var C0 = STYLE.bg[0], C1 = STYLE.bg[1], C2 = STYLE.main[0], C3 = STYLE.main[1];

  var GAME_TITLE = 'EDGE PENDULUM';
  var TIME_LIMIT = 20;
  var NEEDED = 5;
  var MAX_MISS = 3;
  var CX = W / 2, PIV_Y = 470, L = 860, R = 46, WALL = 300, ZONE = 90, A0 = 0.1, ROUND_IDLE = 4;
  var TOUCH = Math.asin((WALL - R) / L);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var roundI, A, phi, omega, grow, holding, caught, catchX, idleT, trail, trailT, stopT, stopKind, gapT, hiSide, gapD;
  var good, perfects, misses, best, streak, score, finalScore, timeLeft, readyT, fin, cleared, postT, joyT, sadT, warnT, endWhy, whineT;

  // 管理人(割烹着)。見る / 押す / 喜ぶ / しょんぼり
  var KEEP_A = ['....3333....', '...333333...', '...322223...', '...202202...', '...222222...', '....2112....', '..33333333..', '.3333333333.', '.2.333333.2.', '...333333...', '...33..33...', '...11..11...'];
  var KEEP_P = ['....3333....', '...333333...', '...322223...', '...202202...', '...222222...', '....2112....', '..333333332.', '.33333333.2.', '.2.333333.2.', '...333333...', '...33..33...', '...11..11...'];
  var KEEP_SAD = ['............', '....3333....', '...333333...', '...322223...', '...200002...', '...222222...', '..33333333..', '.3333333333.', '.2.333333.2.', '...333333...', '...33..33...', '...11..11...'];
  var KEEP_PAL = { 0: C0, 1: C1, 2: C2, 3: C3 };
  var CAT = ['1...1...', '11.11...', '1111....', '1011..1.', '11111.1.', '.11111..', '.1..1...'];

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C0, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col || C3, bold: true });
  }
  function bobX() { return CX + L * Math.sin(A * Math.sin(phi)); }
  function bobY() { return PIV_Y + L * Math.cos(A * Math.sin(phi)); }

  function startRound(i) {
    roundI = i; A = A0; phi = 0; holding = false; caught = false; catchX = 0; idleT = 0;
    omega = Math.PI * 2 / Math.max(1.15, 1.6 - i * 0.08);
    grow = Math.min(0.1, 0.064 + i * 0.008);
    trail = [];
  }

  function initGame() {
    good = 0; perfects = 0; misses = 0; best = 999; streak = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; gapT = 0; hiSide = 0; gapD = 0; trailT = 0; whineT = 0;
    fin = false; cleared = false; postT = 0; joyT = 0; sadT = 0; warnT = 0; endWhy = '';
    startRound(0);
  }

  // 押す/離す(本番もデモも同じ処理)
  function pushOn() {
    if (caught || stopT > 0 || gapT > 0 || fin) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 }); return false; }
    holding = true; idleT = 0;
    game.audio.tone('E5', 0.03, { wave: 'square', volume: 0.06 });
    return true;
  }
  function catchNow() {
    if (!holding) return false;
    holding = false; caught = true;
    var bx = bobX();
    catchX = bx;
    var d = Math.max(0, WALL - R - Math.abs(bx - CX));
    hiSide = bx < CX ? -1 : 1;
    game.audio.tone('A3', 0.06, { wave: 'square', volume: 0.1 });
    if (d <= ZONE) {
      good++; joyT = 0.8;
      if (d < best) best = d;
      var perfect = d < 12;
      streak = perfect ? streak + 1 : 0;
      if (perfect) perfects++;
      var pts = Math.round((100 + 400 * Math.pow(1 - d / ZONE, 2)) * (streak >= 2 ? 2 : 1));
      if (mode === S.PLAYING) score += pts;
      game.feedback.good(bx, bobY() - 140, { text: perfect ? 'PERFECT' : 'GOOD', color: C3, size: 62 });
      game.fx.popup('+' + pts, bx, bobY() - 220, { color: C3, size: 44 });
      game.fx.popup('あと' + Math.round(d / 3) + 'mm', CX, 1440, { color: C2, size: 46 });
      if (good === 3 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('NICE', CX, H * 0.2, { color: C3, size: 96 });
      }
      if (mode === S.PLAYING && good >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return true; }
      gapT = 0.8;
    } else {
      // 早すぎ: 止めて、点線までのすき間を光らせる
      streak = 0; gapD = d;
      stopT = 0.4; stopKind = 'early';
      game.fx.flash(C3, 0.1);
      game.audio.tone('G2', 0.28, { wave: 'square', volume: 0.09 });
    }
    return true;
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.9; streak = 0;
    var mx = stopKind === 'idle' ? CX : (stopKind === 'hit' ? CX + hiSide * WALL : catchX);
    game.feedback.bad(mx, 1000, { text: 'MISS', color: C3, size: 64 });
    if (stopKind === 'early') game.fx.popup('あと' + Math.round((gapD - ZONE) / 3) + 'mm', CX, 1440, { color: C3, size: 48 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    gapT = 0.8;
  }

  function stepClock(dt) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    trailT -= dt;
    if (trailT <= 0 && !caught) { trailT = 0.05; trail.push({ x: bobX(), y: bobY() }); if (trail.length > 7) trail.shift(); }
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0) { startRound(roundI + 1); game.audio.tone('C5', 0.05, { wave: 'square', volume: 0.06 }); }
      return;
    }
    if (caught) return;
    var prevS = Math.sin(phi);
    phi += omega * dt;
    if ((prevS < 0) !== (Math.sin(phi) < 0)) game.audio.tone('D6', 0.02, { wave: 'square', volume: 0.04 });
    if (holding) A += grow * dt;
    else { idleT += dt; if (idleT >= ROUND_IDLE) { stopT = 0.4; stopKind = 'idle'; game.audio.tone('G2', 0.28, { wave: 'square', volume: 0.09 }); return; } }
    var off = Math.abs(bobX() - CX) + R;
    // ふちが近いと箱が震えてうなる(予告)
    if (off > WALL - 40) { whineT -= dt; if (whineT <= 0) { whineT = 0.08; game.audio.tone(1400 + (off - WALL + 40) * 20, 0.03, { wave: 'square', volume: 0.04 }); } }
    if (off >= WALL) {
      // ふちに当たった: 止めて、当たった所を白く大きく
      holding = false; caught = true; catchX = bobX(); hiSide = catchX < CX ? -1 : 1;
      stopT = 0.45; stopKind = 'hit';
      game.fx.flash(C3, 0.15);
      game.fx.shake(10, 0.2);
      game.audio.tone('C3', 0.3, { wave: 'sawtooth', volume: 0.1, slide: -80 });
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4; holding = false;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 100 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.3 + (i % 2) * 140, { color: i % 2 ? C3 : C2, count: 18, speed: 440 });
      game.fx.flash(C3, 0.2);
      joyT = 3;
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 230) { game.audio.play('se_tap', 0.08); return; }
    if (pushOn()) game.fx.burst(x, y, { color: C2, count: 4, speed: 120 });
  });
  game.onRelease(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) { holding = false; return; }
    if (catchNow()) game.fx.burst(catchX, bobY(), { color: C3, count: 6, speed: 160 });
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawRoom(t) {
    game.draw.clear(C0);
    game.draw.gradient(0, H, [[0, C1], [0.5, C0], [1, C1]]);
    // 廊下の板壁
    for (var p = 0; p < 9; p++) game.draw.rect(p * 130, 240, 6, 1300, C0);
    game.draw.rect(0, 1540, W, H - 1540, C1);
    for (var f = 0; f < 6; f++) game.draw.rect(0, 1560 + f * 60, W, 4, C0);
    // 柱時計の箱
    var bx = CX - WALL - 40, bw = (WALL + 40) * 2;
    game.draw.rect(bx, 240, bw, 1300, C2);
    game.draw.rect(bx + 20, 260, bw - 40, 1260, C1);
    // 文字盤
    game.draw.circle(CX, 360, 100, C3);
    game.draw.circle(CX, 360, 88, C2);
    for (var k = 0; k < 12; k++) { var an = k / 12 * Math.PI * 2; game.draw.rect(CX + Math.cos(an) * 74 - 5, 360 + Math.sin(an) * 74 - 5, 10, 10, C0); }
    var ha = t * 0.6, ma = t * 3;
    game.draw.line(CX, 360, CX + Math.cos(ha) * 44, 360 + Math.sin(ha) * 44, C0, 10);
    game.draw.line(CX, 360, CX + Math.cos(ma) * 70, 360 + Math.sin(ma) * 70, C0, 6);
    // ふち(内壁)と寸前の点線
    var hitF = stopT > 0 && stopKind === 'hit' && Math.floor(t * 16) % 2 === 0;
    var shiver = Math.abs(bobX() - CX) + R > WALL - 40 && !caught ? Math.sin(t * 70) * 4 : 0;
    for (var s = -1; s <= 1; s += 2) {
      var wx = CX + s * WALL;
      var hot = hitF && s === hiSide;
      game.draw.rect(wx - (s < 0 ? 24 : 0) + shiver, 490, 24, 1040, hot ? C3 : C2);
      if (hot) game.draw.rect(wx - 60, 1180, 120, 200, C3, 0.6);
      for (var d = 0; d < 26; d++) game.draw.rect(CX + s * (WALL - ZONE) - 3, 520 + d * 38, 6, 18, C2);
    }
    // 猫
    game.draw.sprite(CAT, KEEP_PAL, 150, 1500, 10, { anchor: 'center', flipX: Math.floor(t) % 4 === 0 });
  }

  function drawPendulum(t) {
    // 残像
    for (var i = 0; i < trail.length; i++) game.draw.circle(trail[i].x, trail[i].y, R * 0.9, C2, 0.12 + i * 0.04);
    var x = caught ? catchX : bobX(), y = caught ? PIV_Y + Math.sqrt(Math.max(0, L * L - (catchX - CX) * (catchX - CX))) : bobY();
    var big = stopT > 0 && stopKind === 'hit' ? 1.3 : 1;
    game.draw.line(CX, PIV_Y, x, y, C3, 10);
    game.draw.circle(CX, PIV_Y, 16, C3);
    game.draw.circle(x, y, R * big + 6, C0);
    game.draw.circle(x, y, R * big, (stopT > 0 && Math.floor(t * 16) % 2 === 0) ? C3 : C2);
    game.draw.circle(x - 14, y - 14, 12, C3);
    // 早すぎ: すき間を示す
    if (stopT > 0 && stopKind === 'early') {
      var edge = CX + hiSide * (WALL - ZONE), from = x + hiSide * R;
      game.draw.rect(Math.min(edge, from), y - 8, Math.abs(edge - from), 16, Math.floor(t * 16) % 2 ? C3 : C0);
    }
    // つかんだ手
    if (caught && stopKind !== 'hit') game.draw.rect(x - 34, y - 70, 68, 36, C3);
  }

  function drawKeeper(t) {
    var fr = (fin && !cleared) || sadT > 0 ? KEEP_SAD : holding ? KEEP_P : KEEP_A;
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 10)) * 16 : 0;
    game.draw.sprite(fr, KEEP_PAL, W - 170, 1460 + hop, 14, { anchor: 'center' });
    // 押しているあいだの手の合図
    if (holding) for (var i = 0; i < 3; i++) game.draw.rect(W - 280 - i * 30, 1400 + Math.sin(t * 20 + i) * 10, 18, 18, C3);
  }

  function drawFrame(t) {
    // 携帯機の画面枠
    game.draw.rect(0, 0, W, 20, C0); game.draw.rect(0, H - 20, W, 20, C0);
    game.draw.rect(0, 0, 20, H, C0); game.draw.rect(W - 20, 0, 20, H, C0);
    game.draw.rect(20, 20, W - 40, 6, C1); game.draw.rect(20, H - 26, W - 40, 6, C1);
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 40, W - 120, 22, C0);
    game.draw.rect(60, 40, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? C2 : C3);
    for (var i = 0; i < NEEDED; i++) { game.draw.circle(W / 2 - 200 + i * 100, 120, 26, C0); game.draw.circle(W / 2 - 200 + i * 100, 120, 20, i < good ? C3 : C1); }
    out(good + ' / ' + NEEDED, W / 2, 205, 40, C3);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(60 + m * 50, 100, 36, 36, m < misses ? C3 : C1);
    out('' + score, W - 140, 130, 44, C3);
  }

  function drawScene(t) {
    drawRoom(t);
    drawPendulum(t);
    drawKeeper(t);
    drawFrame(t);
  }

  // ---- ATTRACT: 本物の pushOn()/catchNow() で実演。1回目はふち寸前の端で離してPERFECT、2回目は押しすぎてふちに当てる ----
  var demo = { t: 0, x: W / 2, y: 1680, press: false, wait: 0, r: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.wait = 0.5; demo.r = 0; }
    stepClock(dt);
    if (demo.r !== roundI) { demo.r = roundI; demo.wait = 0.4; }
    if (roundI <= 1 && !caught && stopT <= 0 && gapT <= 0) {
      if (!holding) { demo.wait -= dt; if (demo.wait <= 0) pushOn(); }
      else if (roundI === 0 && Math.abs(Math.cos(phi)) < 0.1 && A + grow * Math.PI / omega > TOUCH - 0.004 && A < TOUCH) catchNow();
    }
    demo.press = holding;
    demo.y += ((holding ? 1700 : 1650) - demo.y) * Math.min(1, dt * 12);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 120 + Math.sin(t * 2) * 6, 84, C3);
      out('HI-SCORE ' + game.best, W / 2, 196, 38, C2);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C3);
      else out('TAP TO START', W / 2, H * 0.965, 40, C2);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, C0, 0.92);
      game.draw.rect(90, H * 0.3, W - 180, 10, C3);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, C3);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C3);
      out(good + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, C2);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C3);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C2);
      if (!cleared) out('あと' + (NEEDED - good) + '回!', W / 2, H * 0.27, 64, C3);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C3);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepClock(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { edgeStops: good, perfect: perfects, closestMm: best < 999 ? Math.round(best / 3) : -1, misses: misses };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepClock(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C3, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 120, C3);
  });

  function startBgm() {
    game.audio.melody([
      ['E5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G4', 1],
      ['A4', 1], ['C5', 1], ['B4', 2],
      ['A4', 0.5], ['B4', 0.5], ['C5', 1], ['E5', 1], ['D5', 1],
      ['C5', 2], ['R', 2],
    ], { tempo: 84, wave: 'square', volume: 0.035, loop: true, bass: [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['C3', 2], ['G2', 2], ['C3', 4]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame();
  });
})(game);
