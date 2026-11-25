// I-GBA-0066v2-barn-egg-trolley-drop.js
// 納屋の卵おろし — 梁を行き来する滑車かごが、床の卵箱の光ったくぼみの真上に来た瞬間に底板を開け、乗せた卵をそっと落とし入れる
// 操作: 画面のどこかをタップすると滑車かごの底板が開き、卵がその場からまっすぐ下へ落ちる。光っているくぼみの真上で開けるとおさまる。少年が綱を引き絞る構え(綱が赤く光りキュッと鳴る)の直後はかごが急に速くなる
// 終わり: 卵箱の6つのくぼみを18秒以内に全部埋めればCLEAR。卵を3個割るか時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: barn_rafter_egg_trolley
// 世界観: 夕方の古い納屋で、鶏番の少年が梁に渡した綱で卵を乗せた滑車かごを左右に行き来させ、床の卵箱の光ったくぼみの真上に来た瞬間に底板を開けて1つずつ落とし入れる
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 詰めた卵の数・ぴったりの数・割った数・平均ずれpx・スコア
// スタイル: 2010s FLAT MOBILE

(function (game) {
  var STYLE = { bg: ['#f6d9a8', '#e9b97a', '#c98a52'], main: ['#ffffff', '#fff3d6', '#8a5a3a'], accent: ['#ff7a59', '#3cc2a0', '#ffd23f'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var WALL = STYLE.bg[0], WALL2 = STYLE.bg[1], PLANK = STYLE.bg[2];
  var EGG = STYLE.main[0], CREAM = STYLE.main[1], BEAM = STYLE.main[2];
  var CORAL = STYLE.accent[0], MINT = STYLE.accent[1], SUN = STYLE.accent[2];
  var INK = '#4a2e1e', WHITE = '#ffffff', CARTON = '#c8b8a0', CARTON2 = '#a89880';

  var TITLE = 'EGG DROP';
  var TIME_LIMIT = 18;
  var SPARE = 3;
  var BEAM_Y = H * 0.27, TROLLEY_Y = H * 0.33, FLOOR_Y = H * 0.66;
  var XMIN = W * 0.1, XMAX = W * 0.9;
  var POCKETS = [];
  for (var pi = 0; pi < 6; pi++) POCKETS.push(W * (0.17 + pi * 0.132));
  var ORDER = [2, 4, 1, 5, 0, 3];
  var PERFECT_PX = 18, GOOD_PX = 48;
  var GRAV = 4200;
  var EGGS = [
    { kind: 'lin', v: 380, bursts: false },
    { kind: 'lin', v: 470, bursts: false },
    { kind: 'sin', per: 2.2, bursts: false },
    { kind: 'lin', v: 540, bursts: false },
    { kind: 'lin', v: 360, bursts: true },
    { kind: 'sin', per: 1.8, bursts: true },
  ];
  var BURST_EVERY = 1.7, BURST_LEN = 0.45, BURST_WARN = 0.55, BURST_MUL = 2.4;

  var BOY = [
    ['..hhhh..', '.hhhhhh.', '.hsksks.', '..ssss..', '..rrrr..', '.srrrr..', '.s.rr...', '...bb...', '..b..b..', '..b..b..'],
    ['..hhhh..', '.hhhhhh.', '.hsksks.', '..ssss..', 's.rrrr..', '.srrrr..', '...rr...', '...bb...', '..b..b..', '.b....b.'],
    ['s.hhhh.s', '.shhhhs.', '.hsksks.', '..ssss..', '..rrrr..', '..rrrr..', '...rr...', '...bb...', '..b..b..', '..b..b..'],
  ];
  var BOY_PAL = { h: INK, s: '#f2c49a', k: INK, r: CORAL, b: '#4a6a9a' };
  var HEN = [
    ['...cc...', '..wwwc..', '.wwkwwy.', 'wwwwww..', 'wwwwwww.', '.wwwwww.', '..wwww..', '..y..y..'],
    ['...cc...', '..wwwc..', '.wwkwwy.', 'wwwwwwww', 'w.wwwww.', '.wwwwww.', '..wwww..', '..y..y..'],
  ];
  var HEN_PAL = { c: CORAL, w: WHITE, k: INK, y: SUN };
  var EGG_ICON = ['.ww.', 'wwww', 'wwww', '.ww.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ei, tx, tdir, tphase, rt, warned, burst, egg, loaded, reloadT, filled, spare, score, perfects, errSum, drops, timeLeft;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest, boyF, boyT, henT;

  function cfg() { return EGGS[Math.min(ei, EGGS.length - 1)]; }
  function target() { return POCKETS[ORDER[Math.min(ei, ORDER.length - 1)]]; }

  function setupEgg(i) {
    ei = i; rt = 0; warned = -1; burst = false; loaded = true; reloadT = 0; egg = null;
    // 動き方が変わっても滑車かごの位置と向きはつなげる
    if (EGGS[i].kind === 'sin') {
      var a = Math.asin(Math.max(-1, Math.min(1, (tx - W / 2) / (XMAX - W / 2))));
      tphase = tdir >= 0 ? a : Math.PI - a;
    }
  }

  function initGame() {
    tx = XMIN + 40; tdir = 1; tphase = 0;
    setupEgg(0);
    filled = []; spare = SPARE; score = 0; perfects = 0; errSum = 0; drops = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false;
    prevBest = game.best || 0; boyF = 0; boyT = 0; henT = 0;
  }

  // ── 滑車かごの動き(プレイ・デモ共通) ──
  function stepTrolley(dt, vol) {
    var c = cfg();
    rt += dt;
    burst = false;
    if (c.bursts) {
      var k = Math.floor((rt + BURST_WARN) / BURST_EVERY);
      var bStart = k * BURST_EVERY;
      if (k >= 1 && rt >= bStart - BURST_WARN && rt < bStart) {
        boyF = 1; boyT = 0.1;
        if (warned !== k) { warned = k; game.audio.tone(1500, 0.18, { wave: 'triangle', volume: 0.05 * vol, slide: 600 }); }
      }
      var m = rt % BURST_EVERY;
      burst = rt >= BURST_EVERY && m < BURST_LEN;
    }
    var mul = burst ? BURST_MUL : 1;
    if (c.kind === 'lin') {
      tx += tdir * c.v * mul * dt;
      if (tx > XMAX) { tx = XMAX; tdir = -1; }
      if (tx < XMIN) { tx = XMIN; tdir = 1; }
    } else {
      tphase += (Math.PI * 2 / c.per) * mul * dt;
      tx = W / 2 + Math.sin(tphase) * (XMAX - W / 2);
      tdir = Math.cos(tphase) >= 0 ? 1 : -1;
    }
  }

  // 底板を開ける
  function release(vol) {
    if (!loaded || egg) return false;
    loaded = false;
    egg = { x: tx, y: TROLLEY_Y + 70, vy: 0, crack: false };
    game.audio.play('se_tap', 0.3 * vol);
    game.audio.tone(700, 0.08, { wave: 'triangle', volume: 0.05 * vol, slide: -300 });
    return true;
  }

  // 卵の落下。着地したら結果を返す
  function stepEgg(dt) {
    if (!egg) return null;
    egg.vy += GRAV * dt;
    egg.y += egg.vy * dt;
    if (egg.y >= FLOOR_Y - 30) {
      egg.y = FLOOR_Y - 30;
      var err = Math.abs(egg.x - target());
      return { err: err, x: egg.x, res: err <= PERFECT_PX ? 'perfect' : err <= GOOD_PX ? 'good' : 'crack' };
    }
    return null;
  }

  function landGood(r, vol) {
    filled.push(ORDER[ei]);
    egg = null;
    henT = 0.6; boyF = 2; boyT = 0.5;
    game.feedback.good(r.x, FLOOR_Y - 80, { text: r.res === 'perfect' ? 'PERFECT' : 'GOOD', color: r.res === 'perfect' ? CORAL : MINT, count: r.res === 'perfect' ? 16 : 9, volume: 0.5 * vol });
    game.audio.play('se_coin', 0.25 * vol);
  }

  function nextEgg() {
    if (ei >= EGGS.length - 1) { finish(true); return; }
    setupEgg(ei + 1);
    loaded = false; reloadT = 0.45;
    game.audio.tone(880, 0.06, { wave: 'sine', volume: 0.05 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 50) + spare * 150;
    boyF = ok ? 2 : 0; boyT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(POCKETS[i], FLOOR_Y - 40, { color: i % 2 ? SUN : MINT, count: 14, speed: 380 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { packed: filled.length, perfect: perfects, cracked: SPARE - spare, avgPx: drops > 0 ? Math.round(errSum / drops) : 0 };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    if (!release(1)) game.audio.tone(260, 0.04, { wave: 'square', volume: 0.03 });
  });

  // ── 描画 ──
  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function rrect(x, y, w, h, r, col) {
    game.draw.rect(x + r, y, w - r * 2, h, col);
    game.draw.rect(x, y + r, w, h - r * 2, col);
    game.draw.circle(x + r, y + r, r, col); game.draw.circle(x + w - r, y + r, r, col);
    game.draw.circle(x + r, y + h - r, r, col); game.draw.circle(x + w - r, y + h - r, r, col);
  }

  function drawBarn() {
    game.draw.gradient(0, H, [[0, WALL2], [0.3, WALL], [0.66, WALL], [0.66, PLANK], [1, BEAM]]);
    // 遠景: 板壁の継ぎ目と、夕日の差す窓
    for (var b = 0; b < 9; b++) game.draw.rect(b * 130 + 40, H * 0.08, 8, H * 0.58, WALL2);
    rrect(W * 0.66, H * 0.4, 220, 170, 18, SUN);
    game.draw.rect(W * 0.66 + 105, H * 0.4, 10, 170, WALL2);
    game.draw.rect(W * 0.66, H * 0.4 + 80, 220, 10, WALL2);
    // 干し草の山
    for (var hb = 0; hb < 3; hb++) game.draw.circle(W * (0.1 + hb * 0.1), FLOOR_Y + 10, 80 + hb * 10, '#e8c46a');
    // 舞うほこり(常時の動き)
    for (var d = 0; d < 10; d++) {
      var dx = W * 0.66 + (d * 37) % 220 + Math.sin(game.time.elapsed + d) * 30;
      var dy = H * 0.4 + ((d * 53 + game.time.elapsed * 30) % 400);
      game.draw.circle(dx, dy, 4, WHITE, 0.6);
    }
    // 梁
    rrect(0, BEAM_Y - 30, W, 60, 12, BEAM);
    game.draw.rect(0, BEAM_Y - 6, W, 6, '#a8754e');
    // 床の板目
    for (var f = 0; f < 6; f++) game.draw.rect(0, FLOOR_Y + 40 + f * 90, W, 6, BEAM);
  }

  function drawCarton(hl) {
    rrect(W * 0.09, FLOOR_Y - 40, W * 0.82, 110, 24, CARTON);
    for (var i = 0; i < POCKETS.length; i++) {
      var px = POCKETS[i];
      var isT = !over && ORDER[Math.min(ei, ORDER.length - 1)] === i && filled.indexOf(i) < 0;
      if (isT) {
        var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 8);
        game.draw.circle(px, FLOOR_Y - 20, 62 + pulse * 10, SUN, 0.55);
        game.draw.rect(px - 3, TROLLEY_Y + 140, 6, FLOOR_Y - TROLLEY_Y - 200, SUN, 0.35);
      }
      game.draw.circle(px, FLOOR_Y - 20, 50, CARTON2);
      if (filled.indexOf(i) >= 0) {
        game.draw.circle(px, FLOOR_Y - 38, 30, EGG);
        game.draw.circle(px, FLOOR_Y - 54, 24, EGG);
        game.draw.circle(px - 10, FLOOR_Y - 58, 7, CREAM);
      }
    }
    if (egg) {
      var sc = halt ? 1 + hl * 0.6 : 1;
      var col = halt ? WHITE : EGG;
      if (halt) game.draw.circle(egg.x, egg.y, 70 * sc, WHITE, 0.5 * hl);
      game.draw.circle(egg.x, egg.y + 8 * sc, 30 * sc, col);
      game.draw.circle(egg.x, egg.y - 10 * sc, 24 * sc, col);
      if (halt) { game.draw.line(egg.x - 20, egg.y - 20, egg.x + 4, egg.y, CORAL, 6); game.draw.line(egg.x + 4, egg.y, egg.x - 6, egg.y + 20, CORAL, 6); }
    }
  }

  function drawTrolley() {
    var ropeCol = burst ? CORAL : (boyF === 1 && boyT > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0) ? CORAL : INK;
    game.draw.line(0, BEAM_Y + 20, tx, BEAM_Y + 20, ropeCol, 6);
    game.draw.circle(tx, BEAM_Y, 26, INK);
    game.draw.circle(tx, BEAM_Y, 12, CREAM);
    game.draw.line(tx - 40, BEAM_Y + 10, tx - 50, TROLLEY_Y + 20, INK, 5);
    game.draw.line(tx + 40, BEAM_Y + 10, tx + 50, TROLLEY_Y + 20, INK, 5);
    rrect(tx - 70, TROLLEY_Y + 10, 140, 70, 16, MINT);
    if (!loaded) {
      game.draw.line(tx - 66, TROLLEY_Y + 80, tx - 80, TROLLEY_Y + 130, INK, 8);
      game.draw.line(tx + 66, TROLLEY_Y + 80, tx + 80, TROLLEY_Y + 130, INK, 8);
    } else {
      game.draw.rect(tx - 66, TROLLEY_Y + 74, 132, 10, INK);
      game.draw.circle(tx, TROLLEY_Y + 20, 26, EGG);
      game.draw.circle(tx, TROLLEY_Y + 4, 20, EGG);
      game.draw.circle(tx - 8, TROLLEY_Y, 6, CREAM);
      game.draw.rect(tx - 2, TROLLEY_Y + 90, 4, 40, INK, 0.4);
    }
  }

  function drawFolks() {
    var bf = boyT > 0 ? boyF : 0;
    game.draw.sprite(BOY[bf], BOY_PAL, W * 0.08, H * 0.78 + Math.sin(game.time.elapsed * 2.4) * 5, 16, { anchor: 'center' });
    game.draw.line(W * 0.08 + 40, H * 0.75, 30, BEAM_Y + 20, INK, 5);
    var hf = henT > 0 ? Math.floor(game.time.elapsed * 12) % 2 : Math.floor(game.time.elapsed * 1.5) % 2;
    game.draw.sprite(HEN[hf], HEN_PAL, W * 0.86, H * 0.76 + (henT > 0 ? -20 : 0), 15, { anchor: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < SPARE; i++) game.draw.sprite(EGG_ICON, { w: i < spare ? EGG : '#c8a888' }, 70 + i * 66, 92, 12, { anchor: 'center' });
    big(String(score), W / 2, 112, 68, INK);
    big(filled.length + ' / ' + POCKETS.length, W - 150, 108, 52, CORAL);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    rrect(60, 176, W - 120, 26, 13, '#d8b890');
    if (fr > 0.02) rrect(60, 176, (W - 120) * fr, 26, 13, timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? CORAL : MINT);
  }

  // ── ATTRACT デモ: 真上で落として2個おさめる → 3個目は早すぎて割る ──
  var demo = { t: 0, press: 0, haltT: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) { tx = XMIN + 40; tdir = 1; tphase = 0; setupEgg(0); filled = []; demo.n = 0; demo.haltT = 0; halt = null; }
    if (demo.press > 0) demo.press -= dt;
    if (boyT > 0) boyT -= dt;
    if (henT > 0) henT -= dt;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { halt = null; game.feedback.bad(egg.x, FLOOR_Y - 60, { text: 'MISS', volume: 0.3, shake: 4 }); egg = null; reloadT = 0.5; }
      return;
    }
    stepTrolley(dt, 0.3);
    if (loaded && demo.n < 3) {
      var aim = demo.n === 2 ? target() - tdir * 110 : target();
      if (Math.abs(tx - aim) < 14) { demo.press = 0.2; release(0.3); }
    }
    var r = stepEgg(dt);
    if (r) {
      demo.n++;
      if (r.res === 'crack') { halt = { t: 0.4, max: 0.4 }; demo.haltT = 0.4; }
      else { landGood(r, 0.3); setupEgg(Math.min(ei + 1, EGGS.length - 1)); loaded = false; reloadT = 0.5; }
    }
    if (!loaded && !egg) { reloadT -= dt; if (reloadT <= 0) loaded = true; }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.4) : 0;
      drawBarn();
      drawCarton(hlA);
      drawTrolley();
      drawFolks();
      game.draw.hand(W * 0.55, H * 0.84 + Math.sin(game.time.elapsed * 3) * 8, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.075, 108, CORAL);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 42, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.965, 46, SUN);
      else big('INSERT COIN', W / 2, H * 0.965, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      if (henT > 0) henT -= dt;
      drawBarn();
      drawCarton(0);
      drawFolks();
      rrect(60, H * 0.12, W - 120, H * 0.25, 30, INK);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 104, won ? SUN : CORAL);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(filled.length + ' / ' + POCKETS.length + '   ★' + perfects + '   ±' + (drops > 0 ? Math.round(errSum / drops) : 0) + 'px', W / 2, H * 0.265, 44, CREAM);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, SUN);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, CREAM);
      if (!won) big('あと' + Math.max(1, POCKETS.length - filled.length) + '個!', W / 2, H * 0.355, 58, CORAL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.965, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var ex = egg ? egg.x : tx;
        halt = null; egg = null; spare--; reloadT = 0.5;
        game.feedback.bad(ex, FLOOR_Y - 60, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (spare <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      stepTrolley(dt, 1);
      var r = stepEgg(dt);
      if (r) {
        drops++; errSum += r.err;
        if (r.res === 'crack') { halt = { t: 0.4, max: 0.4 }; game.fx.flash(WHITE, 0.12); }
        else {
          score += r.res === 'perfect' ? 220 : 120;
          if (r.res === 'perfect') perfects++;
          landGood(r, 1);
          if (filled.length === 3) { game.fx.popup('+300', W / 2, H * 0.48, { color: CORAL, size: 72 }); game.audio.play('se_milestone', 0.5); score += 300; }
          nextEgg();
        }
      }
      if (!over && !halt && !loaded && !egg) { reloadT -= dt; if (reloadT <= 0) { loaded = true; game.audio.tone(520, 0.05, { wave: 'sine', volume: 0.05 }); } }
      if (!over && timeLeft <= 0) {
        timeLeft = 0; timeUp = true;
        game.fx.flash(WHITE, 0.15);
        game.feedback.bad(tx, TROLLEY_Y + 40, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (boyT > 0 && !over) boyT -= dt;
    if (henT > 0) henT -= dt;

    drawBarn();
    drawCarton(hl);
    drawTrolley();
    drawFolks();
    drawHud();
    if (ei === 0 && drops === 0 && ready <= 0 && !over) game.draw.hand(W * 0.55, H * 0.84, { press: Math.abs(tx - target()) < 60, scale: 12, alpha: 0.5 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, CORAL);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 1], ['D5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1.5], ['R', 0.5],
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['G5', 1], ['C5', 2],
    ], { tempo: 132, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
