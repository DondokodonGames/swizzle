// I-GBA-0065v3-watchtower-pedal-lift.js
// 物見やぐらペダル昇降 — 夕暮れの物見やぐらで、昇降台の上の発電自転車を連打で漕ぎ、日が沈む前に頂上の見張り灯まで昇り切る
// 操作: 画面のどこでも連打するとペダルがひと踏みずつ回り、はずみ車の回転が上がる。回転の針が赤い印を越えている間だけ台が昇り、下回ると台がずり下がる。踊り場を通ると留め金が掛かってそれより下には落ちない。踊り場ごとに荷が積まれて赤い印が上がる
// 終わり: 日が沈みきる前(14秒)に頂上(40m)へ着けばCLEAR。間に合わなければGAME OVER
// @mechanic: mash
// @theme: dusk_watchtower_pedal_lift
// 世界観: 夕暮れの物見やぐらで、自転車発電係が昇降台に据えた発電自転車を漕ぎ続け、踊り場ごとに灯油の荷を積み増しながら、日没前に頂上の見張り灯まで台を上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 昇った高さ・踏んだ回数・最高回転・スコア
// スタイル: NEO-RETRO

(function (game) {
  var STYLE = { bg: ['#24173a', '#5a3a6e', '#b06a8a'], main: ['#f4b48a', '#fbe8c8'], accent: ['#ff5a1e'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var NIGHT = STYLE.bg[0], VIOLET = STYLE.bg[1], MAUVE = STYLE.bg[2];
  var PEACH = STYLE.main[0], CREAM = STYLE.main[1], HOT = STYLE.accent[0];

  var TITLE = 'PEDAL LIFT';
  var TIME_LIMIT = 14;
  var TOP = 40;
  var FLOORS = [10, 20, 30, 40];
  var THR = [2.5, 3.3, 4.1, 4.9];
  var PXM = 44;               // 1mのpx
  var DECAY = 1.6, KICK = 1.6;
  var BASE_Y = H * 0.62;      // 地面(h=0)のスクリーンy(カメラ0)
  var TX = W * 0.5;

  var RIDER = [
    ['....cc....', '...cccc...', '...cccc...', '....hh....', '..hhhhhh..', '.h.hhhh...', '...hhhh...', '...pp.p...', '..pp..pp..', '.pp....p..'],
    ['....cc....', '...cccc...', '...cccc...', '....hh....', '..hhhhhh..', '...hhhh.h.', '...hhhh...', '...p.pp...', '..p..pp...', '..p....pp.'],
    ['h...cc...h', '.h.cccc.h.', '..hcccch..', '...hhhh...', '...hhhh...', '...hhhh...', '...hhhh...', '...pp.pp..', '..pp...pp.', '..p.....p.'],
  ];
  var R_PAL = { c: PEACH, h: HOT, p: CREAM };
  var CRATE = ['hhhhhh', 'hcchch', 'hchcch', 'hhhhhh'];
  var BIRD = [['h...h', '.h.h.', '..h..'], ['.....', 'hh.hh', '..h..']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var h, rpm, latched, crates, cam, taps, peak, score, timeLeft, crank, lastTap, pFrame, cheerT, raiseT;
  var ready, halt, over, won, endT, resT, sent, prevBest;

  function seg() { return Math.min(latched, FLOORS.length - 1); }
  function thr() { return THR[seg()]; }

  function initGame() {
    h = 0; rpm = 0; latched = 0; crates = 0; cam = 0; taps = 0; peak = 0; score = 0; timeLeft = TIME_LIMIT;
    crank = 0; lastTap = -9; pFrame = 0; cheerT = 0; raiseT = 0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  // ── ひと踏み(プレイ・デモ共通) ──
  function pedal(vol) {
    rpm += KICK;
    crank += Math.PI / 2; pFrame = 1 - pFrame; lastTap = game.time.elapsed;
    var over2 = rpm >= thr();
    game.audio.tone(200 + Math.min(12, rpm) * 45, 0.04, { wave: over2 ? 'square' : 'triangle', volume: 0.07 * vol });
    game.fx.burst(TX + 120, platY() - 30, { color: over2 ? HOT : PEACH, count: over2 ? 4 : 2, speed: 200 });
  }

  // ── 昇降の1フレーム(プレイ・デモ共通) ──
  function stepLift(dt, vol) {
    rpm *= Math.exp(-DECAY * dt);
    if (rpm > peak) peak = rpm;
    var t = thr();
    var v = rpm >= t ? Math.min(6, 1.5 * (rpm - t)) : -1.5 * (1 - rpm / t);
    h = Math.max(latched > 0 ? FLOORS[latched - 1] : 0, Math.min(TOP, h + v * dt));
    if (latched < FLOORS.length && h >= FLOORS[latched]) {
      latched++;
      cheerT = 0.6; raiseT = 0.7;
      var y = platY();
      game.audio.tone(1200, 0.04, { wave: 'square', volume: 0.08 * vol });
      if (latched < FLOORS.length) {
        crates++;
        game.audio.tone(330, 0.6, { wave: 'sawtooth', volume: 0.04 * vol, slide: 300 });
        game.feedback.good(TX, y - 160, { text: 'GOOD', color: CREAM, count: 12, volume: 0.45 * vol });
      }
      if (state === S.PLAYING) {
        var bonus = 200 * latched;
        score += bonus;
        game.fx.popup('+' + bonus, TX + 220, y - 120, { color: HOT, size: 64 });
        game.audio.play('se_milestone', 0.5);
      }
      return latched >= FLOORS.length;
    }
    return false;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 120) + Math.floor(peak * 20);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.12 + i * 0.15), H * (0.22 + (i % 2) * 0.08), { color: i % 2 ? HOT : CREAM, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { meters: Math.floor(h), taps: taps, peak: Math.round(peak * 10) / 10, floors: latched };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    pedal(1);
    taps++;
    if (rpm >= thr()) score += 10;
  });

  // ── 描画 ──
  function platY() { return BASE_Y - h * PXM + cam; }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: NIGHT, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function dusk() { return state !== S.ATTRACT ? Math.max(0, Math.min(1, 1 - timeLeft / TIME_LIMIT)) : 0.25 + Math.sin(game.time.elapsed * 0.6) * 0.05; }

  function drawSky() {
    var d = dusk();
    game.draw.gradient(0, H, [[0, NIGHT], [0.35, VIOLET], [0.62, MAUVE], [0.8, PEACH]]);
    game.draw.rect(0, 0, W, H, NIGHT, d * 0.55);
    // 沈む太陽(残り時間)
    var sunY = H * 0.5 + d * H * 0.2 + cam * 0.05;
    game.draw.circle(W * 0.2, sunY, 120, HOT, 1 - d * 0.5);
    for (var b = 0; b < 4; b++) game.draw.rect(W * 0.2 - 140, sunY - 60 + b * 34, 280, 8, VIOLET);
    // 星
    for (var s = 0; s < 14; s++) game.draw.rect((s * 151) % W, (s * 97) % (H * 0.4), 8, 8, CREAM, d * (0.4 + 0.4 * Math.sin(game.time.elapsed * 3 + s)));
    // 遠景の丘(パララックス)
    for (var k = 0; k < 6; k++) game.draw.circle(k * 220, H * 0.78 + cam * 0.25, 220, VIOLET);
    for (var q = 0; q < 2; q++) {
      var bx = ((q * 520 + game.time.elapsed * 70) % (W + 200)) - 100;
      game.draw.sprite(BIRD[Math.floor(game.time.elapsed * 5 + q) % 2], { h: NIGHT }, bx, H * 0.3 + q * 60 + cam * 0.1, 10, { anchor: 'center' });
    }
  }

  function drawTower(hl) {
    var groundY = BASE_Y + cam;
    game.draw.rect(0, groundY + 70, W, H, NIGHT);
    var topY = BASE_Y - TOP * PXM + cam - 280;
    // 柱と筋交い(大きいドットの太線)
    game.draw.line(TX - 220, groundY + 70, TX - 200, topY, NIGHT, 24);
    game.draw.line(TX + 220, groundY + 70, TX + 200, topY, NIGHT, 24);
    for (var m = 0; m <= TOP; m += 5) {
      var y0 = BASE_Y - m * PXM + cam + 70, y1 = BASE_Y - (m + 5) * PXM + cam + 70;
      if (y0 < -100 || y1 > H + 100) continue;
      game.draw.line(TX - 210, y0, TX + 210, y1, VIOLET, 12);
      game.draw.line(TX + 210, y0, TX - 210, y1, VIOLET, 12);
    }
    // 踊り場(留め金)
    for (var f = 0; f < FLOORS.length; f++) {
      var fy = BASE_Y - FLOORS[f] * PXM + cam + 56;
      var got = f < latched;
      game.draw.rect(TX - 260, fy - 12, 520, 24, got ? PEACH : NIGHT);
      game.draw.rect(TX - 300, fy - 40, 40, 52, got ? HOT : VIOLET);
      game.draw.rect(TX + 260, fy - 40, 40, 52, got ? HOT : VIOLET);
    }
    // 頂上の見張り灯(回転の強さで明るくなる)
    var glow = Math.min(1, rpm / 8);
    game.draw.rect(TX - 120, topY - 60, 240, 70, NIGHT);
    game.draw.circle(TX, topY - 80, 70, won ? CREAM : HOT, 0.25 + glow * 0.6);
    game.draw.circle(TX, topY - 80, 40, CREAM, 0.3 + glow * 0.7);
    // 昇降台と発電自転車
    var py = platY();
    var shake = hl > 0 ? (Math.random() - 0.5) * 12 : 0;
    game.draw.line(TX, topY, TX, py - 170, CREAM, 6);
    game.draw.rect(TX - 200 + shake, py, 400, 30, hl > 0 ? CREAM : PEACH);
    game.draw.rect(TX - 200 + shake, py + 30, 400, 14, NIGHT);
    for (var c = 0; c < crates; c++) game.draw.sprite(CRATE, { h: NIGHT, c: HOT }, TX - 150 + c * 20 + shake, py - 30 - c * 52, 12, { anchor: 'center' });
    // 自転車: 車輪(はずみ車)と踏み手
    var wx = TX + 80 + shake, wy = py - 60;
    game.draw.circle(wx, wy, 58, NIGHT);
    game.draw.circle(wx, wy, 44, rpm >= thr() ? HOT : VIOLET);
    for (var sp = 0; sp < 4; sp++) {
      var a = crank * 1.5 + sp * Math.PI / 2;
      game.draw.line(wx, wy, wx + Math.cos(a) * 44, wy + Math.sin(a) * 44, CREAM, 6);
    }
    game.draw.line(wx - 120, wy, wx, wy, NIGHT, 12);
    game.draw.line(wx - 120, wy, wx - 120, wy + 60, NIGHT, 12);
    var fr = cheerT > 0 ? 2 : (game.time.elapsed - lastTap < 0.3 ? pFrame : Math.floor(game.time.elapsed * 2) % 2);
    game.draw.sprite(RIDER[fr], R_PAL, wx - 70, wy - 70 + Math.sin(game.time.elapsed * 6) * 3, 14, { anchor: 'center' });
  }

  function drawGauge() {
    // 親指ゾーン: 回転計(半円)と赤い印
    var gx = W / 2, gy = H * 0.94, gr = 230;
    game.draw.rect(0, H * 0.76, W, H * 0.24, NIGHT, 0.85);
    for (var i = 0; i <= 20; i++) {
      var a = Math.PI + (i / 20) * Math.PI;
      var col = i / 20 * 10 >= thr() ? HOT : VIOLET;
      game.draw.line(gx + Math.cos(a) * (gr - 30), gy + Math.sin(a) * (gr - 30), gx + Math.cos(a) * gr, gy + Math.sin(a) * gr, col, 14);
    }
    var ta = Math.PI + Math.min(1, thr() / 10) * Math.PI;
    var tw = raiseT > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.line(gx + Math.cos(ta) * (gr - 60), gy + Math.sin(ta) * (gr - 60), gx + Math.cos(ta) * (gr + 20), gy + Math.sin(ta) * (gr + 20), tw ? CREAM : HOT, 16);
    var na = Math.PI + Math.min(1, rpm / 10) * Math.PI;
    game.draw.line(gx, gy, gx + Math.cos(na) * (gr - 40), gy + Math.sin(na) * (gr - 40), CREAM, 14);
    game.draw.circle(gx, gy, 30, rpm >= thr() ? HOT : PEACH);
    // ペダルの大きなクランク
    for (var p = 0; p < 2; p++) {
      var pa = crank + p * Math.PI;
      game.draw.rect(gx + Math.cos(pa) * 70 - 40 + (p ? 330 : -330), gy - 80 + Math.sin(pa) * 50, 80, 30, p ? PEACH : MAUVE);
    }
  }

  function drawHud() {
    for (var f = 0; f < FLOORS.length; f++) game.draw.rect(54 + f * 64, 70, 48, 48, f < latched ? HOT : VIOLET);
    big(String(score), W / 2, 112, 68, CREAM);
    big(Math.floor(h) + ' / ' + TOP + 'm', W - 170, 108, 46, PEACH);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 22, NIGHT);
    game.draw.rect(60, 180, (W - 120) * fr, 22, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? CREAM : HOT);
  }

  function stepCam(dt) {
    var want = Math.max(0, h * PXM - (BASE_Y - H * 0.52));
    cam += (want - cam) * Math.min(1, dt * 6);
  }

  // ── ATTRACT デモ: 連打で1つ目の踊り場へ → 手を止めると留め金まで下がる → また漕ぐ ──
  var demo = { t: 0, press: 0, next: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.next = 0.2; }
    var mashing = cyc < 2.6 || cyc > 3.8;
    if (mashing && cyc >= demo.next && h < TOP - 1) { demo.press = 0.06; demo.next = cyc + 0.13; pedal(0.3); }
    if (demo.press > 0) demo.press -= dt;
    if (cheerT > 0) cheerT -= dt;
    if (raiseT > 0) raiseT -= dt;
    stepLift(dt, 0.3);
    stepCam(dt);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawSky();
      drawTower(0);
      drawGauge();
      game.draw.hand(W * 0.7, H * 0.8 + Math.sin(game.time.elapsed * 3) * 6, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.07, 104, HOT);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 42, CREAM);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.975, 46, HOT);
      else big('INSERT COIN', W / 2, H * 0.975, 40, CREAM);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      if (cheerT > 0) cheerT -= dt;
      rpm *= Math.exp(-DECAY * dt);
      drawSky();
      drawTower(0);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, NIGHT, 0.85);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.17, 104, won ? HOT : MAUVE);
      big('SCORE ' + score, W / 2, H * 0.22, 56, CREAM);
      big(Math.floor(h) + ' / ' + TOP + 'm   ' + taps + '   ' + (Math.round(peak * 10) / 10), W / 2, H * 0.265, 44, PEACH);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, HOT);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, PEACH);
      if (!won) big('あと' + Math.max(1, Math.ceil(TOP - h)) + 'm!', W / 2, H * 0.355, 58, HOT);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.975, 40, CREAM);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (cheerT > 0) cheerT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        halt = null;
        game.feedback.bad(TX, platY() - 100, { text: 'TIME UP' });
        finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (cheerT > 0) cheerT -= dt;
      if (raiseT > 0) raiseT -= dt;
      if (stepLift(dt, 1)) { cheerT = 9; finish(true); }
      else if (timeLeft <= 0) {
        timeLeft = 0;
        halt = { t: 0.5, max: 0.5 };
        game.fx.flash(CREAM, 0.15);
        game.audio.play('se_break', 0.3);
      }
    }
    stepCam(dt);

    drawSky();
    drawTower(hl);
    drawGauge();
    drawHud();
    if (taps === 0 && ready <= 0 && !over) game.draw.hand(W * 0.7, H * 0.8, { press: Math.floor(game.time.elapsed * 8) % 2 === 0, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 120, HOT);
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5], ['G5', 1], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['C6', 1.5], ['R', 0.5],
      ['A5', 0.5], ['G5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1], ['D5', 2],
    ], { tempo: 160, wave: 'square', volume: 0.045, loop: true, bass: [['D3', 1], ['A2', 1], ['Bb2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
