// I-GBA-0012v2-windmill-gust-furl.js
// ウィンドミル・ガストファール — 丘を渡ってくる突風が羽根に届く直前だけ帆をたたみ、羽根を守り抜く
// 操作: タップで帆をたたむ(たたんでいられるのは一瞬)。たたんだ後は帆を張り直すまで次はたためない。張り直し中に押すと遅れが伸びる
// 終わり: 突風を6回防げばCLEAR。帆を張ったまま突風を受けると羽根が1枚裂け、3枚裂けるか14秒経過でGAME OVER
// @mechanic: cooldown_tap
// @theme: spring_gale_windmill_furl
// 世界観: 春一番の吹く丘の風車小屋で、粉挽きが草をなぎ倒して迫る突風の筋を見極め、羽根に届く直前だけ帆をたたんで羽根を守り、また張り直して挽き続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 防いだ突風数・残った羽根・PERFECT数
// スタイル: NEO-RETRO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 大きいドット・限定5色、差し色はホットピンク1色だけ
  var STYLE = { bg: ['#1b2440', '#2f4a6b', '#6aa39a'], main: ['#f3ead3', '#3e7f6e'], accent: ['#ff3d7f'] };
  var NAVY = STYLE.bg[0], TEAL = STYLE.main[1], CREAM = STYLE.main[0], PINK = STYLE.accent[0], SKY = STYLE.bg[1];

  var TITLE = 'GUST FURL';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var SAILS = 3;
  var GUARD = 0.42;     // たたんでいられる時間
  var COOL = 1.05;      // 張り直しにかかる時間
  var PENALTY = 0.4;
  var MILL_X = W * 0.72, MILL_Y = H * 0.44;
  var START_X = -60;
  var PX = 12;          // 大きいドット単位

  var M = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = M.ATTRACT;

  var MILLER = [
    ['..ccc..', '.ccccc.', '..sss..', '..s.s..', '.ttttt.', 't.ttt.t', '..ttt..', '..t.t..', '.cc.cc.'],
    ['..ccc..', '.ccccc.', '..sss..', '..s.s..', '.ttttt.', '.tttttt', '..ttt.t', '..t.t..', '.cc.cc.'],
  ];
  var TOWER = ['...pp...', '..pppp..', '.cccccc.', '.cccccc.', '.cnnccc.', '.cnnccc.', 'cccccccc', 'cccnnccc', 'cccnnccc'];
  var PETAL = ['.p.', 'ppp', '.p.'];

  // ── 突風の予定表(プレイ・デモ共通) ──
  function schedule(fixed) {
    if (fixed) return fixed;
    var list = [], t = 1.3;
    for (var i = 0; i < 12; i++) {
      var travel = Math.max(0.9, 1.35 - i * 0.06);
      var fake = i >= 2 && i % 3 === 2;
      list.push({ arrive: t, travel: travel, fake: fake, lane: (i % 3) * 36, res: 0 });
      t += fake ? 0.7 : Math.max(COOL + GUARD + 0.05, 1.9 - i * 0.12);
    }
    return list;
  }

  function gustX(g, clock) {
    var k = 1 - (g.arrive - clock) / g.travel; // 0=出発 1=到達
    var endX = g.fake ? START_X + (MILL_X - START_X) * 0.62 : MILL_X - 60;
    return { k: k, x: START_X + (endX - START_X) * Math.min(1, Math.max(0, k)) };
  }

  // ── 状態 ──
  var gusts, clock, furlT, coolT, blocked, sails, perfects, timeLeft, ready, halt, over, won, endT, score, prevBest, spin, rip;

  function initGame() {
    gusts = schedule(); clock = 0; furlT = 0; coolT = 0; blocked = 0; sails = SAILS; perfects = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; halt = null; over = false; won = false; endT = 0; score = 0; spin = 0; rip = 0;
    prevBest = game.best || 0;
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: NAVY, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  // ── 描画 ──
  function drawHill() {
    game.draw.gradient(0, H, [[0, NAVY], [0.35, SKY], [0.5, STYLE.bg[2]], [1, NAVY]]);
    // 大きいドットの雲
    for (var c = 0; c < 4; c++) {
      var cx = ((c * 300 + game.time.elapsed * 30) % (W + 300)) - 150;
      game.draw.rect(Math.floor(cx / PX) * PX, 300 + c * 50, PX * 14, PX * 3, CREAM, 0.25);
    }
    // 段々の丘(ブロック)
    for (var x = 0; x < W; x += PX * 2) {
      var hy = MILL_Y + 150 - Math.floor((Math.sin(x * 0.004) * 60 + x * 0.05) / PX) * PX;
      game.draw.rect(x, hy, PX * 2, H * 0.78 - hy, TEAL);
      game.draw.rect(x, hy, PX * 2, PX, CREAM, 0.25);
    }
    game.draw.rect(0, H * 0.78, W, H * 0.22, NAVY);
  }

  function drawGust(g, clock, dim) {
    var p = gustX(g, clock);
    if (p.k < 0 || p.k > 1.08) return;
    var fade = g.fake && p.k > 0.8 ? Math.max(0, 1 - (p.k - 0.8) * 5) : 1;
    var y = MILL_Y - 40 + g.lane;
    for (var s = 0; s < 5; s++) {
      var len = 120 + s * 30;
      var sx = Math.floor((p.x - len - s * 30) / PX) * PX;
      game.draw.rect(sx, y + s * PX * 2 - PX * 4, len, PX, CREAM, 0.7 * fade * dim);
    }
    // 巻き上げられた花びら
    for (var q = 0; q < 4; q++) game.draw.sprite(PETAL, { p: PINK }, p.x - q * 50, y - 30 + Math.sin(clock * 12 + q) * 30, 8, { anchor: 'center', alpha: fade * dim });
    // 到達0.6秒前の警告: 羽根の前に点滅マーカー
    var left = g.arrive - clock;
    if (!g.fake && left > 0 && left < 0.6 && Math.floor(clock * 14) % 2 === 0) game.draw.rect(MILL_X - 180, y - PX * 3, PX, PX * 6, PINK, dim);
  }

  function drawMill(furled, cool, hl) {
    game.draw.sprite(TOWER, { p: PINK, c: CREAM, n: NAVY }, MILL_X, MILL_Y + 150, PX * 2, { anchor: 'center' });
    var hubX = MILL_X, hubY = MILL_Y - 10;
    for (var i = 0; i < 4; i++) {
      var a = spin + i * Math.PI / 2;
      var ex = hubX + Math.cos(a) * 230, ey = hubY + Math.sin(a) * 230;
      game.draw.line(hubX, hubY, ex, ey, NAVY, 12);
      var torn = i < SAILS - sails;
      if (!furled && !torn) {
        // 張った帆(太いストリップ)
        var mx = hubX + Math.cos(a) * 140, my = hubY + Math.sin(a) * 140;
        game.draw.line(hubX + Math.cos(a) * 50, hubY + Math.sin(a) * 50, ex, ey, CREAM, 44);
        game.draw.line(mx, my, mx + Math.cos(a + 1.57) * 22, my + Math.sin(a + 1.57) * 22, TEAL, 6);
      } else if (!torn) {
        game.draw.line(hubX + Math.cos(a) * 50, hubY + Math.sin(a) * 50, ex, ey, CREAM, 10);
      } else {
        game.draw.line(hubX + Math.cos(a) * 60, hubY + Math.sin(a) * 60, hubX + Math.cos(a) * 120, hubY + Math.sin(a) * 120, PINK, 18);
      }
    }
    game.draw.rect(hubX - PX * 2, hubY - PX * 2, PX * 4, PX * 4, PINK);
    if (hl) game.draw.circle(hubX, hubY, 260 * (1 + (1 - hl) * 0.2), '#ffffff', hl * 0.6);
  }

  function drawLever(coolFrac, furled) {
    // 親指ゾーン: 粉挽きと帆綱の巻き上げ輪(張り直しの進み具合)
    var fr = Math.floor(game.time.elapsed * 2) % 2;
    game.draw.sprite(MILLER[fr], { c: CREAM, s: '#e7b98f', t: TEAL }, W * 0.2, H * 0.86 + Math.sin(game.time.elapsed * 3) * 4, PX, { anchor: 'center' });
    var cx = W * 0.58, cy = H * 0.87;
    var ready = coolFrac <= 0 && !furled;
    game.draw.rect(cx - PX * 11, cy - PX * 6, PX * 22, PX * 12, ready ? PINK : TEAL);
    game.draw.rect(cx - PX * 10, cy - PX * 5, PX * 20, PX * 10, NAVY);
    var segs = 10;
    for (var s = 0; s < segs; s++) {
      var filled = s < Math.round((1 - coolFrac) * segs);
      game.draw.rect(cx - PX * 9 + s * PX * 1.8, cy - PX * 3, PX * 1.4, PX * 6, filled ? (ready ? PINK : CREAM) : TEAL, filled ? 1 : 0.4);
    }
    game.draw.line(W * 0.2 + 40, H * 0.84, cx - PX * 11, cy, CREAM, 6);
  }

  function drawHud() {
    big(blocked + ' / ' + NEEDED, W * 0.2, 92, 56, CREAM);
    for (var i = 0; i < SAILS; i++) game.draw.rect(W * 0.66 + i * 90, 66, 60, 52, i < sails ? CREAM : PINK, i < sails ? 1 : 0.35);
    big(String(score), W * 0.46, 92, 44, PINK);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 166, W - 120, PX * 2, NAVY);
    game.draw.rect(60, 166, Math.floor((W - 120) * fr / PX) * PX, PX * 2, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? PINK : CREAM);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (mode === M.ATTRACT) { game.audio.play('se_coin', 0.45); mode = M.PLAYING; initGame(); return; }
    if (mode === M.RESULT) { game.audio.play('se_tap', 0.2); mode = M.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.06); return; }
    if (furlT > 0 || coolT > 0) {
      // 張り直し中の早押し: ペナルティで遅れが伸びる
      coolT += PENALTY;
      game.feedback.bad(W * 0.58, H * 0.8, { text: 'MISS', shake: 6, volume: 0.25 });
      return;
    }
    furlT = GUARD;
    game.audio.play('se_tap', 0.3);
    game.audio.tone('C4', 0.08, { wave: 'square', volume: 0.08, slide: -120 });
    game.fx.burst(MILL_X, MILL_Y - 10, { color: CREAM, count: 6, speed: 150 });
  });

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.4;
    if (ok) score += Math.floor(timeLeft * 30) + sails * 100;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  // 突風の到達を判定(プレイ用)
  function resolveArrivals() {
    for (var i = 0; i < gusts.length; i++) {
      var g = gusts[i];
      if (g.res !== 0 || g.fake || clock < g.arrive) continue;
      if (furlT > 0) {
        g.res = 1; blocked++;
        var used = GUARD - furlT;
        var perfect = used > GUARD - 0.16;
        if (perfect) perfects++;
        score += perfect ? 180 : 100;
        game.feedback.good(MILL_X, MILL_Y - 180, { text: perfect ? 'PERFECT' : 'GOOD', color: PINK, count: 14 });
        if (blocked === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.26, { color: CREAM, size: 60 }); game.audio.play('se_milestone', 0.35); }
        if (blocked >= NEEDED) finish(true);
      } else {
        g.res = -1;
        halt = { t: 0.45, max: 0.45 };
      }
    }
  }

  // ── ATTRACT: 突風が近づくまで待ち、届く直前にたたむ ──
  var demo = { t: 0, gusts: null, furl: 0, cool: 0, press: 0, gx: W * 0.58, gy: H * 0.86 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt || !demo.gusts) {
      demo.gusts = schedule([{ arrive: 1.5, travel: 1.2, fake: false, lane: 0, res: 0 }, { arrive: 3.1, travel: 1.1, fake: false, lane: 36, res: 0 }]);
      demo.furl = 0; demo.cool = 0;
    }
    if (demo.furl > 0) { demo.furl -= dt; if (demo.furl <= 0) demo.cool = COOL; }
    else if (demo.cool > 0) demo.cool -= dt;
    for (var i = 0; i < demo.gusts.length; i++) {
      var g = demo.gusts[i];
      if (g.res === 0 && demo.furl <= 0 && demo.cool <= 0 && g.arrive - cyc < 0.12 && g.arrive - cyc > 0) { demo.furl = GUARD; demo.press = 0.2; game.audio.play('se_tap', 0.1); }
      if (g.res === 0 && cyc >= g.arrive) { g.res = 1; game.feedback.good(MILL_X, MILL_Y - 180, { text: 'PERFECT', color: PINK, count: 8, volume: 0.2 }); }
    }
    if (demo.press > 0) demo.press -= dt;
    demo.gy = H * 0.86 + (demo.press > 0 ? 10 : -10);
    return cyc;
  }

  game.onUpdate(function (dt) {
    if (mode === M.ATTRACT) {
      var cyc = stepDemo(dt);
      spin += dt * (demo.furl > 0 ? 0.3 : 1.6);
      drawHill();
      for (var i = 0; i < demo.gusts.length; i++) drawGust(demo.gusts[i], cyc, 1);
      drawMill(demo.furl > 0, demo.cool, 0);
      drawLever(demo.furl > 0 ? 1 : demo.cool / COOL, demo.furl > 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 16 });
      big(TITLE, W / 2, H * 0.08, 76, CREAM);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 36, PINK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 42, PINK);
      else big('INSERT COIN', W / 2, H * 0.965, 36, CREAM);
      return;
    }

    if (mode === M.RESULT) {
      spin += dt * 0.8;
      drawHill();
      drawMill(false, 0, 0);
      drawLever(0, false);
      game.draw.rect(70, H * 0.14, W - 140, H * 0.2, NAVY, 0.8);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.18, 96, won ? CREAM : PINK);
      big(blocked + ' / ' + NEEDED + '  PERFECT x' + perfects, W / 2, H * 0.235, 38, CREAM);
      big('SCORE ' + score, W / 2, H * 0.27, 42, CREAM);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 50, PINK);
      else big('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.31, 36, STYLE.bg[2]);
      if (!won) big('あと' + (NEEDED - blocked) + '回!', W / 2, H * 0.36, 46, PINK);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 34, CREAM);
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) {
        mode = M.RESULT;
        var stats = { blocked: blocked, sails: sails, perfect: perfects };
        if (won) game.end.success(score, stats); else game.end.failure(stats);
      }
    } else if (halt) {
      halt.t -= dt;
      if (halt.t <= 0) {
        halt = null; sails--; rip = 0.3;
        game.feedback.bad(MILL_X, MILL_Y - 180, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (sails <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.25);
    } else {
      timeLeft -= dt;
      clock += dt;
      if (furlT > 0) { furlT -= dt; if (furlT <= 0) { furlT = 0; coolT = COOL; } }
      else if (coolT > 0) { coolT -= dt; if (coolT <= 0) { coolT = 0; game.audio.play('se_powerup', 0.2); } }
      // 出発の合図音
      for (var j = 0; j < gusts.length; j++) {
        var st0 = gusts[j].arrive - gusts[j].travel;
        if (clock - dt < st0 && clock >= st0) game.audio.tone(gusts[j].fake ? 'D3' : 'A3', 0.25, { wave: 'sawtooth', volume: 0.04, slide: 180 });
      }
      resolveArrivals();
      if (clock > gusts[gusts.length - 1].arrive + 0.5 && !over) finish(blocked >= NEEDED);
      if (timeLeft <= 0 && !over) {
        timeLeft = 0;
        game.feedback.bad(MILL_X, MILL_Y, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (rip > 0) rip -= dt;
    spin += dt * (furlT > 0 ? 0.3 : 1.6 + blocked * 0.1);

    drawHill();
    for (var k = 0; k < gusts.length; k++) if (gusts[k].res === 0 || gusts[k].fake) drawGust(gusts[k], clock, 1);
    var hl = halt ? halt.t / halt.max : 0;
    drawMill(furlT > 0, coolT, hl);
    if (rip > 0) game.fx.shake(4, 0.05);
    drawLever(furlT > 0 ? 1 : Math.min(1, coolT / COOL), furlT > 0);
    drawHud();
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 104, PINK);
  });

  game.onStart(function () {
    game.audio.melody([['E5', 0.5], ['B4', 0.5], ['E5', 0.5], ['F#5', 0.5], ['G5', 1], ['F#5', 0.5], ['E5', 0.5], ['D5', 1], ['B4', 1], ['E5', 1.5], ['R', 0.5]], { tempo: 138, wave: 'square', volume: 0.045, loop: true });
    mode = M.ATTRACT;
    initGame();
  });
})(game);
