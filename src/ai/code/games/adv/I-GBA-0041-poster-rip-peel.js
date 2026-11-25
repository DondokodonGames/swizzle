// I-GBA-0041-poster-rip-peel.js
// ポスターリップピール — 壁に貼りついた古い貼り紙の端をつまんで引っぱり、時間内に一気に剥がす
// 操作: 貼り紙の端を指で押さえ、後ろに大きく引いてから離して一気に剥がす(パチンコ式)
// 終わり: 規定枚数(5枚)を全て剥がせば成功。時間切れの回が出れば失敗
// @mechanic: slingshot
// @theme: ruin_wall_poster
// 世界観: 忘れられた遺跡の通路。壁に貼りついた古い貼り紙を、端をつまんで大きく引いて一気に剥がしていく調査員
// 残るもの: 正誤(CLEAR/GAME OVER) + 剥がせた枚数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、柔らかいシャドウとハイライトで立体感を保ちつつくっきり
  var C = {
    bg: '#4a4438', bg2: '#2c2820', wall: '#6a6252', wallDark: '#3c3628',
    paper: '#e8dcc0', paperDark: '#c2b088', edge: '#8a6a3a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffcf4d', white: '#fdf8ec', ink: '#1a1610',
  };

  var GAME_TITLE = 'POSTER RIP';
  var TOTAL = 5;
  var MIN_PULL = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var POSTER = ['######', '#....#', '#.##.#', '#....#', '######'];

  var SPOTS = [
    { x: W * 0.32, y: H * 0.32 }, { x: W * 0.68, y: H * 0.3 }, { x: W * 0.5, y: H * 0.42 },
    { x: W * 0.3, y: H * 0.52 }, { x: W * 0.7, y: H * 0.5 },
  ];

  var round, poster, anchorX, anchorY, pulling, pullX, pullY, roundT, roundDur;
  var peeled, done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function newRound() {
    var sp = SPOTS[round % SPOTS.length];
    poster = { x: sp.x, y: sp.y, torn: false };
    anchorX = sp.x + 60; anchorY = sp.y + 70;
    pulling = false; pullX = anchorX; pullY = anchorY;
    roundT = 0;
    roundDur = Math.max(2.4, 3.6 - round * 0.2);
  }

  function initGame() {
    round = 0; peeled = 0; newRound();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.14 + i * 90, W, 3, C.wallDark, 0.4);
  }

  function drawPoster(p, stretch) {
    if (p.torn) return;
    var sx = p.x + stretch * 0.15;
    game.draw.rect(p.x - 90, p.y - 110, 180, 220, C.wallDark, 0.4);
    game.draw.sprite(POSTER, { '#': C.paperDark }, p.x, p.y, 26, { anchor: 'center' });
    game.draw.rect(p.x - 70, p.y - 96, 140, 192, C.paper);
    game.draw.circle(anchorX, anchorY, 14, C.edge);
  }

  function tryPeel(x, y) {
    var d = Math.hypot(x - anchorX, y - anchorY);
    if (d >= MIN_PULL) {
      poster.torn = true;
      peeled++;
      hitStop = 0.1;
      game.feedback.good(poster.x, poster.y, { text: 'RIP', color: C.good });
      game.fx.burst(poster.x, poster.y, { color: C.paper, count: 16, speed: 340 });
      game.audio.play('se_break', 0.4);
      if (!halfShown && peeled >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (peeled >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound();
    } else {
      game.feedback.bad(x, y, { text: 'WEAK' });
      game.audio.play('se_bad', 0.2);
      pulling = false; pullX = anchorX; pullY = anchorY;
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || poster.torn) return;
    if (Math.hypot(x - anchorX, y - anchorY) < 90) {
      pulling = true; pullX = x; pullY = y;
      game.audio.play('se_tap', 0.15);
    } else {
      game.fx.burst(x, y, { color: C.wallDark, count: 2, speed: 40 });
    }
  });
  game.onMove(function(x, y) {
    if (!pulling || state !== S.PLAYING) return;
    pullX = x; pullY = y;
  });
  game.onRelease(function(x, y) {
    if (pulling) { pulling = false; tryPeel(x, y); }
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

  var demo = { t: 0, gx: 0, gy: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { round = 0; peeled = 0; newRound(); }
    var p = cyc / 2.3;
    if (p < 0.2) {
      demo.gx = anchorX; demo.gy = anchorY; demo.press = false;
    } else if (p < 0.75) {
      var q = (p - 0.2) / 0.55;
      demo.gx = anchorX + (anchorX - poster.x + 220) * q * 0 + anchorX + q * 220;
      demo.gy = anchorY + q * 180;
      demo.press = true;
    } else {
      demo.press = false;
      if (!poster.torn) {
        poster.torn = true; peeled++;
        game.feedback.good(poster.x, poster.y, { text: 'RIP', color: C.good });
        game.audio.play('se_break', 0.2);
      }
    }
    if (p >= 0.97) newRound();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (poster === undefined) initGame();
      bg();
      stepDemo(dt);
      var stretch0 = Math.hypot(demo.gx - anchorX, demo.gy - anchorY);
      drawPoster(poster, stretch0);
      if (!poster.torn) game.draw.line(anchorX, anchorY, demo.gx, demo.gy, C.gold, 5);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawPoster(poster, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(peeled + ' / ' + TOTAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - peeled) + '枚!', W / 2, H * 0.185, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(peeled, { peeled: peeled, total: TOTAL });
        else game.end.failure({ peeled: peeled, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (roundT >= roundDur) {
        hitStop = 0.35; shake = 0.25;
        game.feedback.bad(poster.x, poster.y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var stretch = pulling ? Math.hypot(pullX - anchorX, pullY - anchorY) : 0;
    if (!finished) drawPoster(poster, stretch);
    if (pulling && !poster.torn) {
      var ready2pull = stretch >= MIN_PULL;
      game.draw.line(anchorX, anchorY, pullX, pullY, ready2pull ? C.gold : C.edge, 6);
      if (ready2pull) game.draw.circle(pullX, pullY, 18, C.gold, 0.5);
    }

    txt(peeled + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.wallDark, 0.6);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - roundT / roundDur), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.5]], { tempo: 138, wave: 'sawtooth', volume: 0.055, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
