// I-GBA-0007-scratch-reveal.js
// スクラッチリビール — 銀色の膜で覆われた札を指で素早くこすり、下の絵柄を完全に露わにする
// 操作: 覆われた面を指で素早く往復させてこすり、削れた面積が規定量に達するまで削る
// 終わり: 制限時間内に規定割合(80%)を削り切れば成功。時間切れで失敗
// @mechanic: rub
// @theme: scratch_ticket_booth
// 世界観: 縁日の富くじ屋台。削り師が銀色の膜に覆われた木札を、時間内にこすり切って下の紋様を当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 削れた割合%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るいパステルグラデ背景、光の柱・虹の物量
  var C = {
    bg: '#fff3d6', bg2: '#ffd6e8', silver: '#c7cfd6', silverDark: '#9aa4ad',
    sigil: '#ff5da2', sigilAccent: '#ffd400',
    good: '#22c55e', bad: '#ef4444', gold: '#ffd400', white: '#ffffff', ink: '#2a1a00',
  };

  var GAME_TITLE = 'SCRATCH REVEAL';
  var MAX_TIME = 10;
  var GOAL = 0.8;
  var GX = W * 0.5, GY = H * 0.42, GW = 560, GH = 560;
  var COLS = 22, ROWS = 22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cells, cleared, total, timeLeft, done, endWait, finished, ready, hitStop, shake, lastX, lastY;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STALL_KEEPER = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.05 + i * 0.03), W, 6, C.white, 0.3);
    game.draw.sprite(STALL_KEEPER, { '#': C.sigilAccent }, W * 0.5, H * 0.86, 20, { anchor: 'center' });
  }

  function makeCells() {
    var arr = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(true);
      arr.push(row);
    }
    return arr;
  }

  function initGame() {
    cells = makeCells(); total = COLS * ROWS; cleared = 0; timeLeft = MAX_TIME;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    lastX = null; lastY = null;
  }

  function drawSigil() {
    game.draw.circle(GX, GY, GW * 0.32, C.sigil);
    game.draw.circle(GX, GY, GW * 0.18, C.sigilAccent);
    game.draw.rect(GX - 10, GY - GW * 0.4, 20, GW * 0.8, C.sigil);
  }

  function drawScratch() {
    var cw = GW / COLS, ch = GH / ROWS;
    var x0 = GX - GW / 2, y0 = GY - GH / 2;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (cells[r][c]) {
          game.draw.rect(x0 + c * cw, y0 + r * ch, cw + 1, ch + 1, (r + c) % 2 === 0 ? C.silver : C.silverDark);
        }
      }
    }
    game.draw.rect(x0 - 8, y0 - 8, GW + 16, GH + 16, C.ink, 0);
  }

  function scratchAt(x, y, vel) {
    var cw = GW / COLS, ch = GH / ROWS;
    var x0 = GX - GW / 2, y0 = GY - GH / 2;
    var cxv = Math.floor((x - x0) / cw), cyv = Math.floor((y - y0) / ch);
    var r = Math.max(2, Math.min(4, Math.round(vel / 260)));
    var any = false;
    for (var dr = -r; dr <= r; dr++) {
      for (var dc = -r; dc <= r; dc++) {
        var rr = cyv + dr, cc = cxv + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        if (dr * dr + dc * dc > r * r) continue;
        if (cells[rr][cc]) { cells[rr][cc] = false; cleared++; any = true; }
      }
    }
    return any;
  }

  function onRub(x, y) {
    if (finished || ready > 0 || done || x < GX - GW / 2 - 40 || x > GX + GW / 2 + 40 || y < GY - GH / 2 - 40 || y > GY + GH / 2 + 40) { lastX = null; lastY = null; return; }
    var vel = 0;
    if (lastX !== null) vel = Math.hypot(x - lastX, y - lastY) / Math.max(0.001, game.time.delta);
    var before = cleared / total;
    var got = scratchAt(x, y, vel);
    var after = cleared / total;
    if (got) {
      if (Math.random() < 0.15) game.audio.play('se_tap', 0.03);
      if (before < 0.5 && after >= 0.5) { game.fx.popup('50%!', GX, GY - GH * 0.7, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.35); }
      if (after >= GOAL && before < GOAL) {
        ok = true; finished = true; hitStop = 0.1;
        game.feedback.good(x, y, { text: 'CLEAR', color: C.good });
        game.fx.burst(GX, GY, { color: C.gold, count: 24, speed: 420 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    }
    lastX = x; lastY = y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); onRub(x, y); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) onRub(x, y); });
  game.onRelease(function() { lastX = null; lastY = null; if (state === S.PLAYING) game.audio.play('se_tap', 0.02); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: GX, gy: GY, press: false, cells: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { demo.cells = makeCells(); }
    cells = demo.cells;
    var p = Math.min(1, cyc / 3.0);
    var sweeps = 5;
    var lane = Math.floor(p * sweeps);
    var lp = (p * sweeps) % 1;
    var y = GY - GH / 2 + (lane + 0.5) * (GH / sweeps);
    var x = GX - GW / 2 + lp * GW * (lane % 2 === 0 ? 1 : 1);
    if (lane % 2 === 1) x = GX + GW / 2 - lp * GW;
    demo.gx = x; demo.gy = y; demo.press = p < 0.98;
    if (demo.cells) {
      var cw = GW / COLS, ch = GH / ROWS;
      var x0 = GX - GW / 2, y0 = GY - GH / 2;
      var cxv = Math.floor((x - x0) / cw), cyv = Math.floor((y - y0) / ch);
      for (var dr = -3; dr <= 3; dr++) for (var dc = -3; dc <= 3; dc++) {
        var rr = cyv + dr, cc = cxv + dc;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && dr * dr + dc * dc <= 9) demo.cells[rr][cc] = false;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSigil();
      drawScratch();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.12, 22, C.sigil);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.sigil);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawSigil();
      drawScratch();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round((cleared / total) * 100) + '%', W / 2, H * 0.13, 30, C.sigil);
      if (!ok) txt('あと' + Math.max(1, Math.round((GOAL - cleared / total) * 100)) + '%!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round((cleared / total) * 100);
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
        finished = true; ok = false; hitStop = 0.25;
        game.feedback.bad(GX, GY, { text: 'TIME UP' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawSigil();
    if (!finished || !ok) drawScratch();

    txt(Math.round((cleared / total) * 100) + '%', W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 54, C.sigil);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.2], ['C5', 0.2], ['E5', 0.2], ['A5', 0.4]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
