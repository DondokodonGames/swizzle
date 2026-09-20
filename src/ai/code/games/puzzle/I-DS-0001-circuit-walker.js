// I-DS-0001-circuit-walker.js
// サーキットウォーカー — 基板の上を歩くゼンマイ仕掛けの豆ロボを、銅線の帯からはみ出さず指でなぞって電源端子まで導く
// 操作: 豆ロボの現在地から、銅線の帯の上だけを指でなぞって進める。帯を外れたら失格。電力切れ(時間切れ)も失格
// 終わり: 電源端子(ゴール)に着けば成功。帯を外れる/電力ゲージが尽きれば失敗
// @mechanic: trace
// @theme: circuit_board_robot
// 世界観: 巨大な基板の上をひとりで歩くゼンマイ仕掛けの豆ロボ。足元の銅線の帯だけが歩ける道で、外れれば基板の海に落ちる。電力が切れる前に電源端子へ辿り着きたい
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 到達した進行度%
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 深緑の基板地に燐光グリーンの銅線帯、走査線
  var C = {
    bg: '#04140a', board: '#0a2414', trace: '#123a1e', traceEdge: '#1fae52',
    accent: '#39ff6a', good: '#39ff6a', bad: '#ff4d5e', gold: '#ffe14d',
    white: '#e8ffe8', ink: '#02100a', chip: '#0e2e18',
  };

  var GAME_TITLE = 'CIRCUIT WALKER';
  var HALF = 60;
  var TIME_LIMIT = 12;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, failReason = 'GAME OVER';

  var PTS = [
    { x: W * 0.18, y: H * 0.84 },
    { x: W * 0.18, y: H * 0.66 },
    { x: W * 0.62, y: H * 0.66 },
    { x: W * 0.62, y: H * 0.50 },
    { x: W * 0.30, y: H * 0.50 },
    { x: W * 0.30, y: H * 0.34 },
    { x: W * 0.78, y: H * 0.34 },
    { x: W * 0.78, y: H * 0.18 },
  ];
  var SEG_LEN = [], TOTAL_LEN = 0;
  for (var i = 1; i < PTS.length; i++) {
    var d = Math.hypot(PTS[i].x - PTS[i - 1].x, PTS[i].y - PTS[i - 1].y);
    SEG_LEN.push(d); TOTAL_LEN += d;
  }

  var progress, cursorX, cursorY, done, endWait, finished, timeLeft, milestoneShown;
  var ready, hitStop, shake, walkFrame;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_A = ['.##.', '####', '.##.', '#..#'];
  var BOT_B = ['.##.', '####', '.##.', '.##.'];

  function boardBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#020a06']]);
    game.draw.rect(0, 0, W, H, C.board, 0.4);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#0fff8a08');
    game.draw.circle(W * 0.85, H * 0.85, 40, C.chip);
    game.draw.circle(W * 0.12, H * 0.10, 30, C.chip);
  }

  function drawPath() {
    for (var j = 1; j < PTS.length; j++) {
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.traceEdge, HALF * 2 + 8);
      game.draw.line(PTS[j - 1].x, PTS[j - 1].y, PTS[j].x, PTS[j].y, C.trace, HALF * 2);
    }
    game.draw.circle(PTS[0].x, PTS[0].y, HALF * 0.6, C.accent);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.6, C.gold);
    game.draw.circle(PTS[PTS.length - 1].x, PTS[PTS.length - 1].y, HALF * 0.35, C.white, 0.8);
  }

  function distToSeg(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay;
    var wx = px - ax, wy = py - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
    var cx = ax + vx * t, cy = ay + vy * t;
    return { dist: Math.hypot(px - cx, py - cy), t: t };
  }

  function evalPoint(px, py) {
    var best = 1e9, bestLen = 0, acc = 0;
    for (var i = 1; i < PTS.length; i++) {
      var r = distToSeg(px, py, PTS[i - 1].x, PTS[i - 1].y, PTS[i].x, PTS[i].y);
      if (r.dist < best) { best = r.dist; bestLen = acc + r.t * SEG_LEN[i - 1]; }
      acc += SEG_LEN[i - 1];
    }
    return { dist: best, len: bestLen };
  }

  function initGame() {
    progress = 0; cursorX = PTS[0].x; cursorY = PTS[0].y;
    done = false; endWait = 0; finished = false; timeLeft = TIME_LIMIT; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0; walkFrame = 0;
    ok = false; failReason = 'GAME OVER';
  }

  function onDrag(x, y) {
    if (done || ready > 0 || finished) return;
    walkFrame += 1;
    var r = evalPoint(x, y);
    if (r.dist > HALF) {
      finished = true; ok = false; failReason = 'GAME OVER'; hitStop = 0.15;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_failure', 0.4);
      finish();
      return;
    }
    if (r.len > progress) {
      var beforePct = Math.round((progress / TOTAL_LEN) * 100);
      progress = r.len;
      var afterPct = Math.round((progress / TOTAL_LEN) * 100);
      if (!milestoneShown && beforePct < 50 && afterPct >= 50) {
        milestoneShown = true;
        game.fx.popup('50 / ' + 100, x, y - 60, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
    }
    cursorX = x; cursorY = y;
    if (progress >= TOTAL_LEN - 20) {
      finished = true; ok = true; hitStop = 0.1;
      game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
      game.fx.burst(x, y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.05);
    onDrag(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onDrag(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PTS[0].x, gy: PTS[0].y, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.8;
    if (cyc < dt || demo.t <= dt) { progress = 0; milestoneShown = false; }
    var target = Math.min(TOTAL_LEN, (cyc / 3.4) * TOTAL_LEN);
    var acc = 0, px = PTS[0].x, py = PTS[0].y;
    for (var i = 1; i < PTS.length; i++) {
      if (target <= acc + SEG_LEN[i - 1]) {
        var t = SEG_LEN[i - 1] > 0 ? (target - acc) / SEG_LEN[i - 1] : 0;
        px = PTS[i - 1].x + (PTS[i].x - PTS[i - 1].x) * t;
        py = PTS[i - 1].y + (PTS[i].y - PTS[i - 1].y) * t;
        break;
      }
      acc += SEG_LEN[i - 1];
    }
    demo.gx = px; demo.gy = py; demo.press = cyc < 3.4;
    if (progress === undefined || progress < target) progress = target;
    cursorX = px; cursorY = py;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      boardBg();
      stepDemo(dt);
      drawPath();
      game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? BOT_A : BOT_B, { '#': C.gold }, cursorX, cursorY, 14, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      boardBg();
      drawPath();
      game.draw.sprite(BOT_A, { '#': ok ? C.good : C.bad }, cursorX, cursorY, 14, { anchor: 'center' });
      txt(ok ? 'CLEAR' : failReason, W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct = Math.round((progress / TOTAL_LEN) * 100);
      txt(pct + ' / ' + 100, W / 2, H * 0.12, 30, C.gold);
      if (!ok && pct >= 60) txt('あと少し!', W / 2, H * 0.17, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((progress / TOTAL_LEN) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        finished = true; ok = false; failReason = 'TIME UP'; hitStop = 0.2; shake = 0.15;
        game.feedback.bad(cursorX, cursorY, { text: 'TIME UP' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    boardBg();
    drawPath();
    if (!finished) game.draw.sprite(Math.floor(game.time.elapsed * 6) % 2 === 0 ? BOT_A : BOT_B, { '#': C.gold }, cursorX, cursorY, 14, { anchor: 'center' });

    txt(Math.round((progress / TOTAL_LEN) * 100) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, timeLeft < 3 ? C.bad : C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.15], ['E5', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
