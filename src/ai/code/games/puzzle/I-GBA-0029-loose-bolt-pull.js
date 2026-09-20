// I-GBA-0029-loose-bolt-pull.js
// ルーズボルト — ボイラー壁に並んだボルトの中から、わずかに揺れる1本だけを見抜いて引き抜く
// 操作: 常時かすかに揺れて光る1本だけをタップする。他のボルトに触れると即失敗
// 終わり: 規定ラウンド(6回)を全て正しく引き抜けば成功。1回でも外せば失敗
// @mechanic: spot
// @theme: boiler_room_bolts
// 世界観: 蒸気ボイラー室の壁一面のボルト。整備ロボットが、緩んで震える1本だけを毎ラウンド見抜いて引き抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き抜けたラウンド数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数、細線とテキスト枠のUI(アンバー/グリーンのモニタ基調)
  var C = {
    bg: '#03120c', bg2: '#081f16', panel: '#0d2a1e', line: '#1c4a34',
    bolt: '#3a4a44', boltRim: '#6f8078', boltDark: '#1c2622',
    warn: '#ff5030', good: '#39ff8a', bad: '#ff3d3d',
    gold: '#ffd23f', amber: '#ffb020', white: '#eafff2', ink: '#020806',
  };

  var GAME_TITLE = 'LOOSE BOLT';
  var ROUNDS = 6;
  var BOLT_R = 62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var score, roundIdx, bolts, correctIdx, roundDur, roundTimer, telegraphWarned;
  var done, endWait, finished, wrongX, wrongY, pulseT;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_A = ['.#.#.', '#####', '.###.', '#.#.#'];
  var BOT_B = ['.#.#.', '#####', '.###.', '.#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, C.line, 0.4);
    game.draw.rect(W * 0.1, H * 0.28, W * 0.8, H * 0.4, C.panel, 0.5);
  }

  function layoutBolts(n) {
    var cols = n <= 6 ? 3 : 4;
    var rows = Math.ceil(n / cols);
    var x0 = W * 0.2, x1 = W * 0.8, y0 = H * 0.36, y1 = H * 0.62;
    var arr = [];
    for (var r = 0; r < rows; r++) {
      var rc = Math.min(cols, n - r * cols);
      var ry = rows === 1 ? (y0 + y1) / 2 : y0 + (y1 - y0) * (r / (rows - 1));
      for (var c = 0; c < rc; c++) {
        var rx = rc === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * (c / (rc - 1));
        arr.push({ x: rx, y: ry });
      }
    }
    return arr;
  }

  function setupRound() {
    var count = 5 + Math.min(3, Math.floor(roundIdx / 2));
    bolts = layoutBolts(count);
    correctIdx = Math.floor(game.random(0, bolts.length));
    roundDur = Math.max(1.35, 2.35 - roundIdx * 0.18);
    roundTimer = roundDur;
    telegraphWarned = false;
    pulseT = 0;
  }

  function initGame() {
    score = 0; roundIdx = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; wrongX = -100; wrongY = -100;
    setupRound();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function fail(x, y) {
    hitStop = 0.35; wrongX = x; wrongY = y;
    ok = false; finished = true;
    game.feedback.bad(x, y, { text: 'MISS' });
    shake = 0.3;
    finish();
  }

  function succeed(b) {
    score++;
    game.feedback.good(b.x, b.y, { text: 'GOOD', color: C.good });
    game.fx.burst(b.x, b.y, { color: C.gold, count: 16, speed: 300 });
    game.audio.play('se_coin', 0.5);
    if (score === Math.ceil(ROUNDS / 2)) {
      game.fx.popup('HALFWAY!', W / 2, H * 0.3, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.5);
    }
    roundIdx++;
    if (roundIdx >= ROUNDS) { ok = true; finished = true; finish(); return; }
    setupRound();
  }

  function resolveTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || hitStop > 0 || finished) return;
    var b = bolts[correctIdx];
    if (game.hit.circle(x, y, 50, b.x, b.y, BOLT_R)) { succeed(b); }
    else { fail(x, y); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    game.audio.play('se_tap', 0.08);
    resolveTap(x, y);
  });

  function drawBot(x, y, react) {
    var frame = Math.floor(game.time.elapsed * 3) % 2 === 0 ? BOT_A : BOT_B;
    game.draw.sprite(frame, { '#': react ? C.amber : C.boltRim }, x, y, 16, { anchor: 'center' });
  }

  function drawBolts(highlightBad) {
    for (var i = 0; i < bolts.length; i++) {
      var b = bolts[i];
      var isCorrect = i === correctIdx;
      var dx = 0, dy = 0, ringA = 0;
      if (isCorrect && !finished) {
        dx = Math.sin(pulseT * 10) * 5;
        dy = Math.cos(pulseT * 8) * 3;
        ringA = 0.35 + 0.3 * Math.sin(pulseT * 7);
      }
      var isBad = finished && Math.hypot(b.x - wrongX, b.y - wrongY) < BOLT_R + 30 && !isCorrect;
      var scale = isBad && hitStop > 0 ? 1.35 : 1;
      game.draw.circle(b.x + dx, b.y + dy, (BOLT_R + 10) * scale, C.boltDark);
      game.draw.circle(b.x + dx, b.y + dy, BOLT_R * scale, isBad && hitStop > 0 ? C.white : C.bolt);
      game.draw.circle(b.x + dx, b.y + dy, BOLT_R * 0.5 * scale, C.boltRim);
      game.draw.line(b.x + dx - 22, b.y + dy, b.x + dx + 22, b.y + dy, C.boltDark, 8);
      game.draw.line(b.x + dx, b.y + dy - 22, b.x + dx, b.y + dy + 22, C.boltDark, 8);
      if (isCorrect && !finished) game.draw.circle(b.x + dx, b.y + dy, BOLT_R + 22, C.amber, ringA);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.4;
    if (cyc < dt || demo.t <= dt) { roundIdx = 0; setupRound(); score = 0; }
    pulseT += dt;
    if (cyc < 3.2) {
      // 成功例: 揺れているボルトへ手を運んでタップ
      var p = cyc / 3.2;
      var b = bolts[correctIdx];
      demo.gx = W * 0.5 + (b.x - W * 0.5) * Math.min(1, p * 1.6);
      demo.gy = H * 0.86 + (b.y - H * 0.86) * Math.min(1, p * 1.6);
      demo.press = p > 0.7;
      if (p > 0.78 && p < 0.85 && roundIdx < ROUNDS - 1) { roundIdx++; setupRound(); }
    } else {
      // 危険例: 揺れていない別のボルトへ誤って手を伸ばす
      var p2 = (cyc - 3.2) / 3.2;
      var bad = bolts[(correctIdx + 1) % bolts.length];
      demo.gx = W * 0.5 + (bad.x - W * 0.5) * Math.min(1, p2 * 1.6);
      demo.gy = H * 0.86 + (bad.y - H * 0.86) * Math.min(1, p2 * 1.6);
      demo.press = p2 > 0.7;
      if (p2 > 0.72 && p2 < 0.8) { shake = 0.15; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawBolts(false);
      drawBot(W * 0.5, H * 0.84, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-') + ' / ' + ROUNDS, W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBolts(true);
      drawBot(W * 0.5, H * 0.84, ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(score + ' / ' + ROUNDS, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (ROUNDS - score) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { score: score, rounds: ROUNDS });
        else game.end.failure({ score: score, rounds: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pulseT += dt;
      roundTimer -= dt;
      if (!telegraphWarned && roundTimer <= 0.6) {
        telegraphWarned = true;
        game.audio.tone(880, 0.12, { wave: 'square', volume: 0.15 });
      }
      if (roundTimer <= 0) { fail(bolts[correctIdx].x, bolts[correctIdx].y); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBolts(true);
    drawBot(W * 0.5, H * 0.84, hitStop > 0);

    txt(score + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    var tp = !finished ? Math.max(0, roundTimer / roundDur) : 0;
    game.draw.rect(60, 150, (W - 120) * tp, 14, telegraphWarned ? C.warn : C.amber);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.25], ['C3', 0.25], ['Eb3', 0.25], ['G3', 0.5]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
