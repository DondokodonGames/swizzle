// I-DS-0024-lucky-ticket-tear.js
// ラッキーチケットティア — 両端をつまんだ福引き券を、時間内に一気に引き裂いて景品を開封する
// 操作: 券の両端を指で押さえ、素早く強く左右に引いて一気に破る。ゆっくり引くと破けない
// 終わり: 3枚連続を制限時間内に規定の速さで一気に破れれば成功。時間切れ/弱い引きで破れなければ失敗
// @mechanic: flick_launch
// @theme: lottery_ticket_booth
// 世界観: 縁日の福引き所。景品係が呼び込む中、挑戦者が次々渡されるチケットを制限時間内に力強く引き裂いて当たりを確かめる
// 残るもの: 正誤(CLEAR/GAME OVER) + 開封できた枚数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るいパステルグラデ背景、太い白縁取り文字、光の柱
  var C = {
    bg: '#fff0f6', bg2: '#ffd6e8', ticket: '#ffd23f', ticketDark: '#e6a800',
    perf: '#ffffff', good: '#38d970', bad: '#ff3d6a', gold: '#ffd23f',
    white: '#ffffff', ink: '#5a1030',
  };

  var GAME_TITLE = 'LUCKY TICKET';
  var CX = W * 0.5, CY = H * 0.46;
  var ROUNDS = 3;
  var ROUND_TIME = 2.2;
  var NEED_SPEED = 1400; // px/s

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, roundT, leftId, rightId, lx0, rx0, lx, rx, lvx, rvx, prevLx, prevRx;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000025', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STAR = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) {
      game.draw.line(W * (0.1 + i * 0.16), 0, CX, H, '#ffffff40', 10);
    }
  }

  function initRound() {
    lx0 = CX - 160; rx0 = CX + 160;
    lx = lx0; rx = rx0; lvx = 0; rvx = 0;
    leftId = null; rightId = null; prevLx = lx; prevRx = rx;
    roundT = ROUND_TIME;
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    initRound();
  }

  function drawTicket(l, r, color) {
    game.draw.line(l, CY, r, CY, C.ticketDark, 60);
    game.draw.line(l, CY, r, CY, color, 48);
    for (var i = 0; i < 8; i++) {
      var px = l + (r - l) * (i / 7);
      game.draw.circle(px, CY, 4, C.perf, 0.6);
    }
    game.draw.sprite(STAR, { '#': C.perf }, CX, CY, 10, { anchor: 'center' });
  }

  function evalTear() {
    if (done || ready > 0 || finished) return;
    var speed = Math.abs(lvx) + Math.abs(rvx);
    if (speed >= NEED_SPEED) {
      cleared++;
      game.feedback.good(CX, CY, { text: 'RIP!', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_break', 0.5);
      if (cleared === 2) game.fx.popup('あと1枚!', CX, CY - 220, { color: C.gold, size: 34 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      initRound();
    } else {
      game.feedback.bad(CX, CY, { text: 'WEAK' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (x < CX && leftId === null) { leftId = id; game.audio.play('se_tap', 0.06); }
    else if (x >= CX && rightId === null) { rightId = id; game.audio.play('se_tap', 0.06); }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    if (id === leftId) { lvx = (x - lx) / Math.max(1 / 60, game.time.delta); lx = Math.min(x, CX - 10); }
    if (id === rightId) { rvx = (x - rx) / Math.max(1 / 60, game.time.delta); rx = Math.max(x, CX + 10); }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId || id === rightId) evalTear();
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX - 160, gy: CY, gx2: CX + 160, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { lx = CX - 160; rx = CX + 160; }
    if (cyc < 1.4) {
      demo.press = true;
    } else if (cyc < 1.6) {
      var p = (cyc - 1.4) / 0.2;
      lx = CX - 160 - p * 500; rx = CX + 160 + p * 500;
      demo.press = false;
    } else {
      lx = CX - 160; rx = CX + 160;
    }
    demo.gx = lx; demo.gy = CY; demo.gx2 = rx;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTicket(lx, rx, C.ticket);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTicket(lx, rx, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '枚!', W / 2, H * 0.17, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT -= dt;
      if (roundT <= 0) {
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        shake = 0.3; game.audio.play('se_bad', 0.4); hitStop = 0.3;
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawTicket(lx, rx, C.ticket);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000018', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, roundT / ROUND_TIME), 16, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
