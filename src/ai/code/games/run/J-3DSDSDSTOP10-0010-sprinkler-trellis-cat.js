// J-3DSDSDSTOP10-0010-sprinkler-trellis-cat.js
// 散水やぐらの見張り猫 — 回る散水機の水が通り過ぎた直後だけ一段ずつ登り、頂上の風見鶏まで届く
// 操作: タップで一段登る。登っている最中と握り直し中のタップは足を滑らせる。水の筋が自分の高さを横切る時に動いていると流される
// 終わり: 12段登り切ればCLEAR。3回流される/時間切れでGAME OVER
// @mechanic: cooldown_tap
// @theme: rooftop_sprinkler_trellis
// 世界観: 屋上菜園の竹やぐらを、見張り番の子猫が回転散水機の水の筋をやり過ごしながら一段ずつ登り、傾いた風見鶏を直しに行く
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数・かすめ回避(NICE)数・スコア
// スタイル: 8bit HANDHELD

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄り4階調、低コントラスト、画面枠
  var STYLE = {
    bg: ['#0f380f', '#306230', '#8bac0f'],
    main: ['#9bbc0f', '#8bac0f', '#306230'],
    accent: ['#e0f8d0', '#0f380f'],
  };
  var K0 = '#0f380f', K1 = '#306230', K2 = '#8bac0f', K3 = '#9bbc0f', KW = '#e0f8d0';

  var GAME_TITLE = 'SPRAY TOWER';
  var TIME_LIMIT = 15;
  var NEEDED = 12;
  var SOAK_MAX = 3;
  var STEP_T = 0.32;
  var REGRIP_T = 0.18;
  var TRELLIS_X = 610;
  var RUNG0_Y = Math.round(H * 0.77);
  var RUNG_GAP = 90;
  var SPR_X = 200, SPR_Y = Math.round(H * 0.485);
  var JET_LEN = 1500;
  var HIT_BAND = 58;

  var CAT_CLING = ['.#....#.', '.##..##.', '.######.', '.#o##o#.', '.######.', '..####..', '.##..##.', '.#....#.'];
  var CAT_CLING2 = ['.#....#.', '.##..##.', '.######.', '.#o##o#.', '.######.', '..####..', '..#..#..', '.##..##.'];
  var CAT_STEP = ['.#....#.', '.##..##.', '.######.', '.#o##o#.', '.######.', '#.####.#', '..#..#..', '.#....#.'];
  var CAT_WET = ['........', '.#....#.', '.######.', '.#-##-#.', '.######.', '.######.', '.#.##.#.', '#......#'];
  var CAT_PAL = { '#': K0, o: KW, '-': K2 };
  var HEAD = ['..##..', '.####.', '######', '.#oo#.', '..##..', '..##..'];
  var HEAD_PAL = { '#': K0, o: K3 };
  var VANE = ['...#....', '..###...', '.#####..', '####.###', '..#.....', '..#.....', '.###....'];
  var VANE_PAL = { '#': K0 };
  var DEW = ['.#.', '###', '.#.'];
  var DEW_PAL = { '#': KW };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var c = null;

  function say(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: K0, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  function rungY(r) { return RUNG0_Y - r * RUNG_GAP; }

  function initGame() {
    c = {
      rung: 0, y: rungY(0), moving: 0, regrip: 0, fromY: rungY(0), toRung: 0,
      theta: -1.2, omega: 0, twin: false, twinTele: 0, surge: 0, surgeTele: 0, surgeCd: 3.6,
      timeLeft: TIME_LIMIT, ready: 0.8, hitStop: 0, fall: 0, fallFrom: 0, fallTo: 0,
      soaks: 0, nice: 0, score: 0, combo: 0, dews: [3, 7, 10], graze: 0,
      finished: false, done: false, ok: false, endWait: 0, wetFx: 0, flashJet: 0, milestone6: false,
    };
    c.omega = omegaNow();
  }

  function omegaNow() {
    var period = Math.max(1.3, 2.1 - c.rung * 0.07);
    var w = (Math.PI * 2) / period;
    if (c.surge > 0) w *= 1.8;
    return w;
  }

  function nozzles(theta) { return c.twin ? [theta, theta + Math.PI] : [theta]; }

  // 水の筋がやぐらの縦線を横切る高さ(横切らない向きなら null)
  function crossY(phi) {
    var cs = Math.cos(phi);
    if (cs < 0.08) return null;
    var y = SPR_Y + Math.tan(phi) * (TRELLIS_X - SPR_X);
    if (y < 250 || y > 1620) return null;
    return y;
  }

  function sweptHit(thA, thB, cy) {
    var a = nozzles(thA), b = nozzles(thB);
    for (var i = 0; i < a.length; i++) {
      var ya = crossY(a[i]), yb = crossY(b[i]);
      if (ya === null && yb === null) continue;
      if (ya === null) ya = yb;
      if (yb === null) yb = ya;
      if (cy >= Math.min(ya, yb) - HIT_BAND && cy <= Math.max(ya, yb) + HIT_BAND) return true;
    }
    return false;
  }

  // 今この瞬間に一段登り始めたら流されるか(ゴーストAIも同じ予測を使う)
  function stepWouldSoak() {
    var th = c.theta, w = omegaNow(), n = 16, dt = (STEP_T + 0.04) / n;
    var y0 = c.y, y1 = rungY(c.rung + 1);
    for (var i = 0; i < n; i++) {
      var th2 = th + w * dt;
      var yy = y0 + (y1 - y0) * ((i + 1) / n);
      if (sweptHit(th, th2, yy)) return true;
      th = th2;
    }
    return false;
  }

  function tryStep(x, y) {
    if (c.finished || c.fall > 0) return;
    if (c.moving > 0 || c.regrip > 0) {
      // 我慢できずに押した: 足が滑って一段下がる
      c.combo = 0;
      game.feedback.bad(TRELLIS_X, c.y - 60, { text: 'MISS', shake: 6 });
      if (c.rung > 0) { startFall(1); }
      c.moving = 0; c.regrip = 0.3;
      return;
    }
    if (c.rung >= NEEDED) return;
    game.audio.play('se_jump', 0.35);
    c.fromY = c.y; c.toRung = c.rung + 1; c.moving = STEP_T;
  }

  function startFall(n) {
    c.fallFrom = c.y;
    c.rung = Math.max(0, c.rung - n);
    c.fallTo = rungY(c.rung);
    c.fall = 0.3;
  }

  function soak() {
    c.moving = 0; c.regrip = 0; c.combo = 0;
    c.soaks++;
    c.hitStop = 0.4; c.flashJet = 0.4; c.wetFx = 1.2;
    game.fx.flash(KW, 0.2);
    game.feedback.bad(TRELLIS_X, c.y - 70, { text: 'MISS', color: KW, flashColor: KW });
    if (c.soaks >= SOAK_MAX) {
      c.finished = true; c.ok = false;
      finish();
    } else {
      startFall(2);
    }
  }

  function land() {
    c.rung = c.toRung;
    c.y = rungY(c.rung);
    c.moving = 0; c.regrip = REGRIP_T; c.graze = 0.28;
    c.combo++;
    c.score += 100 + c.combo * 20;
    game.feedback.good(TRELLIS_X, c.y - 70, { text: c.combo >= 3 ? 'x' + c.combo : 'GOOD', color: K3, count: 8 });
    var di = c.dews.indexOf(c.rung);
    if (di >= 0) {
      c.dews.splice(di, 1);
      c.score += 300;
      game.audio.play('se_coin', 0.45);
      game.fx.burst(TRELLIS_X, c.y - 40, { color: KW, count: 14, speed: 260 });
    }
    if (c.rung === 6 && !c.milestone6) {
      c.milestone6 = true;
      c.twinTele = 0.7;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('6 / ' + NEEDED, TRELLIS_X, c.y - 150, { color: KW, size: 52 });
    }
    if (c.rung >= NEEDED) {
      c.finished = true; c.ok = true;
      c.score += Math.round(c.timeLeft * 50);
      game.fx.burst(TRELLIS_X, rungY(NEEDED) - 80, { color: KW, count: 30, speed: 420 });
      finish();
    }
  }

  function finish() {
    if (c.done) return;
    c.done = true;
    c.endWait = 1.5;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    game.audio.play(c.ok ? 'se_success' : 'se_failure', 0.55);
  }

  function tick(dt) {
    // 散水機は常に回る(ヒットストップ中だけ止まる)
    if (c.hitStop > 0) { c.hitStop -= dt; return; }
    if (c.twinTele > 0) { c.twinTele -= dt; if (c.twinTele <= 0) { c.twin = true; game.audio.play('se_powerup', 0.35); } }
    if (c.surgeTele > 0) {
      c.surgeTele -= dt;
      if (c.surgeTele <= 0) c.surge = 1.1;
    } else if (c.surge > 0) {
      c.surge -= dt;
    } else if (!c.finished) {
      c.surgeCd -= dt;
      if (c.surgeCd <= 0) { c.surgeTele = 0.7; c.surgeCd = 3.8; game.audio.tone('A5', 0.12, { wave: 'square', volume: 0.06 }); }
    }
    var th0 = c.theta;
    c.theta += omegaNow() * dt;
    if (c.theta > Math.PI * 2) { c.theta -= Math.PI * 2; th0 -= Math.PI * 2; }

    if (c.wetFx > 0) c.wetFx -= dt;
    if (c.flashJet > 0) c.flashJet -= dt;
    if (c.fall > 0) {
      c.fall -= dt;
      var k = 1 - Math.max(0, c.fall) / 0.3;
      c.y = c.fallFrom + (c.fallTo - c.fallFrom) * k;
      if (c.fall <= 0) { c.y = c.fallTo; c.regrip = 0.2; }
      return;
    }
    if (c.moving > 0) {
      c.moving -= dt;
      var p = 1 - Math.max(0, c.moving) / STEP_T;
      c.y = c.fromY + (rungY(c.toRung) - c.fromY) * p;
      if (sweptHit(th0, c.theta, c.y)) { soak(); return; }
      if (c.moving <= 0) land();
    } else {
      if (c.regrip > 0) c.regrip -= dt;
      if (c.graze > 0) {
        c.graze -= dt;
        if (sweptHit(th0, c.theta, c.y)) {
          c.graze = 0; c.nice++; c.score += 150;
          game.fx.popup('NICE', TRELLIS_X + 150, c.y - 40, { color: KW, size: 40 });
          game.audio.tone('E6', 0.08, { wave: 'square', volume: 0.05 });
        }
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, K1], [0.55, K2], [1, K1]]);
    game.draw.rect(0, 0, W, H, K3, 0.05 + 0.04 * Math.sin(t * 1.4));
    // 遠景の屋根並み(ゆっくり揺れる)
    for (var i = 0; i < 7; i++) {
      var bx = i * 170 - 40 + Math.sin(t * 0.3 + i) * 6;
      var bh = 180 + ((i * 53) % 90);
      game.draw.rect(bx, 1600 - bh, 150, bh + 320, K1);
      game.draw.rect(bx + 20, 1600 - bh + 30, 26, 26, K2);
      game.draw.rect(bx + 90, 1600 - bh + 30, 26, 26, K2);
    }
    // 画面枠
    game.draw.rect(0, 0, W, 24, K0); game.draw.rect(0, H - 24, W, 24, K0);
    game.draw.rect(0, 0, 24, H, K0); game.draw.rect(W - 24, 0, 24, H, K0);
  }

  function drawTrellis() {
    game.draw.line(TRELLIS_X - 70, rungY(NEEDED) - 60, TRELLIS_X - 70, RUNG0_Y + 60, K0, 12);
    game.draw.line(TRELLIS_X + 70, rungY(NEEDED) - 60, TRELLIS_X + 70, RUNG0_Y + 60, K0, 12);
    for (var r = 0; r <= NEEDED; r++) {
      var y = rungY(r);
      var passed = r <= c.rung;
      game.draw.line(TRELLIS_X - 70, y, TRELLIS_X + 70, y, passed ? K3 : K1, 9);
    }
    for (var d = 0; d < c.dews.length; d++) {
      var dy = rungY(c.dews[d]) - 22 + Math.sin(game.time.elapsed * 3 + d) * 5;
      game.draw.sprite(DEW, DEW_PAL, TRELLIS_X + 100, dy, 9, { anchor: 'center' });
    }
    var vy = rungY(NEEDED) - 110 + Math.sin(game.time.elapsed * 2) * 4;
    game.draw.sprite(VANE, VANE_PAL, TRELLIS_X + Math.sin(game.time.elapsed * 1.3) * 6, vy, 12, { anchor: 'center' });
    // 地面の菜園
    game.draw.rect(24, RUNG0_Y + 60, W - 48, 360, K1);
    for (var s = 0; s < 9; s++) {
      var sx = 60 + s * 115, sway = Math.sin(game.time.elapsed * 2 + s) * 6;
      game.draw.line(sx, RUNG0_Y + 140, sx + sway, RUNG0_Y + 80, K3, 8);
    }
  }

  function drawJets() {
    var ns = nozzles(c.theta);
    for (var i = 0; i < ns.length; i++) {
      var phi = ns[i];
      var ex = SPR_X + Math.cos(phi) * JET_LEN, ey = SPR_Y + Math.sin(phi) * JET_LEN;
      var hot = c.flashJet > 0 && Math.floor(c.flashJet * 20) % 2 === 0;
      game.draw.line(SPR_X, SPR_Y, ex, ey, hot ? '#ffffff' : KW, hot ? 34 : 18);
      game.draw.line(SPR_X, SPR_Y, ex, ey, K3, hot ? 12 : 6);
      for (var k = 1; k < 9; k++) {
        var j = k * 150 + ((game.time.elapsed * 600) % 150);
        game.draw.circle(SPR_X + Math.cos(phi) * j, SPR_Y + Math.sin(phi) * j, 7 + (k % 3) * 2, KW);
      }
    }
    if (c.twinTele > 0 && Math.floor(c.twinTele * 12) % 2 === 0) {
      var op = c.theta + Math.PI;
      game.draw.line(SPR_X, SPR_Y, SPR_X + Math.cos(op) * 400, SPR_Y + Math.sin(op) * 400, KW, 4);
    }
    var pulse = (c.surgeTele > 0 && Math.floor(c.surgeTele * 14) % 2 === 0) ? 1.35 : 1;
    game.draw.circle(SPR_X, SPR_Y, 44 * pulse, K0);
    game.draw.sprite(HEAD, HEAD_PAL, SPR_X, SPR_Y, 12 * pulse, { anchor: 'center' });
    game.draw.line(SPR_X, SPR_Y + 40, SPR_X, RUNG0_Y + 80, K0, 16);
  }

  function drawCat() {
    var t = game.time.elapsed;
    var art = CAT_CLING;
    if (c.wetFx > 0 || c.fall > 0) art = CAT_WET;
    else if (c.moving > 0) art = CAT_STEP;
    else if (Math.floor(t * 3) % 2 === 0) art = CAT_CLING2;
    var sway = Math.sin(t * 2.6) * 4, bob = Math.cos(t * 3.1) * 3;
    // 危険予告: 登ったら濡れる時、猫の周りが点滅
    if (!c.finished && c.moving <= 0 && c.fall <= 0 && c.hitStop <= 0 && c.rung < NEEDED && stepWouldSoak()) {
      if (Math.floor(t * 10) % 2 === 0) game.draw.circle(TRELLIS_X, c.y - 44, 78, KW, 0.35);
    }
    // クールダウン(握り直し)のリング
    if (c.moving > 0 || c.regrip > 0) {
      var frac = c.moving > 0 ? 1 : c.regrip / REGRIP_T;
      game.draw.rect(TRELLIS_X - 60, c.y + 22, 120 * frac, 10, K0);
    }
    var scale = c.hitStop > 0 ? 15 : 12;
    game.draw.sprite(art, CAT_PAL, TRELLIS_X + sway, c.y - 44 + bob, scale, { anchor: 'center' });
    if (c.wetFx > 0) {
      for (var i = 0; i < 4; i++) game.draw.circle(TRELLIS_X - 40 + i * 26, c.y + 10 + ((t * 300 + i * 40) % 60), 6, KW);
    }
  }

  function drawHud() {
    game.draw.rect(24, 24, W - 48, 206, K0, 0.85);
    say(c.rung + ' / ' + NEEDED, 230, 90, 56, K3);
    for (var i = 0; i < SOAK_MAX; i++) {
      var used = i < c.soaks;
      game.draw.sprite(DEW, { '#': used ? K1 : KW }, 740 + i * 80, 90, 12, { anchor: 'center' });
    }
    var frac = Math.max(0, c.timeLeft / TIME_LIMIT);
    var low = c.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 170, W - 140, 22, K1);
    game.draw.rect(70, 170, (W - 140) * frac, 22, low ? KW : K3);
    say(String(c.score), W - 120, 140, 30, K2);
  }

  function drawResultOverlay() {
    game.draw.rect(24, 640, W - 48, 520, K0, 0.88);
    say(c.ok ? 'CLEAR' : 'GAME OVER', W / 2, 740, 88, c.ok ? KW : K2);
    say(c.rung + ' / ' + NEEDED, W / 2, 860, 56, K3);
    say('SCORE ' + c.score, W / 2, 950, 44, K3);
    var isNew = c.ok && c.score > game.best;
    if (isNew) say('NEW RECORD', W / 2, 1040, 46, KW);
    else if (!c.ok) say('あと' + (NEEDED - c.rung) + '段!', W / 2, 1040, 46, KW);
    say('BEST ' + Math.max(game.best, c.ok ? c.score : 0), W / 2, 1110, 34, K2);
  }

  function drawScene() {
    drawBackdrop();
    drawTrellis();
    drawJets();
    drawCat();
  }

  // ── ATTRACT: 同じ tick/tryStep を AI が操作(成功の登り + わざと水に飛び込む失敗例)──
  var demo = { t: 0, gx: TRELLIS_X, gy: 1500, press: false, pressT: 0, forced: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); c.ready = 0; demo.forced = false; }
    if (demo.pressT > 0) demo.pressT -= dt;
    var free = c.moving <= 0 && c.regrip <= 0 && c.fall <= 0 && c.hitStop <= 0 && !c.finished;
    if (free && c.rung < NEEDED) {
      var risky = stepWouldSoak();
      var wantFail = cyc > 3.6 && !demo.forced && risky;
      if (!risky || wantFail) {
        if (wantFail) demo.forced = true;
        tryStep(TRELLIS_X, c.y);
        demo.pressT = 0.18;
      }
    }
    demo.gx = TRELLIS_X + 190; demo.gy = 1560;
    demo.press = demo.pressT > 0;
    tick(dt);
    if (c.done) { c.done = false; c.finished = false; c.soaks = 0; }
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); music();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (c.ready > 0 || c.done) { game.audio.play('se_tap', 0.15); return; }
    game.audio.play('se_tap', 0.2);
    tryStep(x, y);
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (!c) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(24, 24, W - 48, 206, K0, 0.85);
      say(GAME_TITLE, W / 2, H * 0.05, 72, K3);
      say('HI-SCORE ' + game.best, W / 2, 175, 34, K2);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) say('► 100円 投入 ◄', W / 2, H * 0.927, 46, KW);
      else say('INSERT COIN', W / 2, 1780, 40, K3);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawHud();
      drawResultOverlay();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W / 2, 1780, 38, KW);
      return;
    }

    if (c.done) {
      c.endWait -= dt;
      tick(dt * 0.3);
      if (c.endWait <= 0) {
        state = S.RESULT;
        var stats = { rungs: c.rung, nice: c.nice, soaks: c.soaks, score: c.score };
        if (c.ok) game.end.success(c.score, stats);
        else game.end.failure(stats);
      }
    } else if (c.ready > 0) {
      c.ready -= dt;
      c.theta += omegaNow() * dt;
      if (c.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (c.hitStop <= 0) c.timeLeft -= dt;
      if (c.timeLeft <= 0 && !c.finished) {
        c.timeLeft = 0; c.finished = true; c.ok = false; c.hitStop = 0.4;
        game.feedback.bad(TRELLIS_X, c.y - 60, { text: 'TIME UP' });
        finish();
      } else {
        tick(dt);
      }
    }

    drawScene();
    drawHud();
    if (c.ready > 0) say(c.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, KW);
    if (c.done) drawResultOverlay();
  });

  function music() {
    game.audio.melody(
      [['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['B4', 1]],
      { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['C3', 2], ['G2', 2]] }
    );
  }

  game.onStart(function () {
    music();
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
