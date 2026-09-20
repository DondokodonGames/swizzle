// I-GBA-0040-sticker-exact-stick.js
// ステッカーエグザクトスティック — 指でつまんだシールを、決まった枠の位置にぴったり貼り付ける
// 操作: シールを指で押さえてドラッグし、点線の枠まで運んで指を離して貼る
// 終わり: 規定枚数(5枚)を全て枠にぴったり貼れれば成功。1枚でも時間切れなら失敗
// @mechanic: gap_fit
// @theme: sticker_album_fit
// 世界観: 手のひらサイズのシール帳。台紙から剥がしたシールを、点線で示された枠にぴったり合わせて貼っていく几帳面な作業
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったり貼れた枚数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル+白フチ、丸みのあるUI
  var C = {
    bg: '#ffe9f2', bg2: '#fff6fa', album: '#ffffff', albumEdge: '#ffd0e4',
    piece: '#7fd4ff', pieceEdge: '#3f9fdb', target: '#ffb3d1',
    good: '#3fd98a', bad: '#ff6b81', gold: '#ffcf4d', white: '#ffffff', ink: '#4a2f3a',
  };

  var GAME_TITLE = 'STICK FIT';
  var TOTAL = 5;
  var TOL = 72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STAR = ['..#..', '.###.', '#####', '.###.', '#.#.#'];

  var round, piece, target, dragging, dragOffX, dragOffY, stuck, roundT, roundDur;
  var placed, done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  var TARGET_SPOTS = [
    { x: W * 0.3, y: H * 0.32 }, { x: W * 0.68, y: H * 0.28 }, { x: W * 0.5, y: H * 0.42 },
    { x: W * 0.32, y: H * 0.52 }, { x: W * 0.7, y: H * 0.5 },
  ];
  var START_SPOTS = [
    { x: W * 0.5, y: H * 0.68 }, { x: W * 0.28, y: H * 0.68 }, { x: W * 0.72, y: H * 0.68 },
    { x: W * 0.5, y: H * 0.68 }, { x: W * 0.5, y: H * 0.68 },
  ];

  function newRound() {
    var t = TARGET_SPOTS[round % TARGET_SPOTS.length];
    var st = START_SPOTS[round % START_SPOTS.length];
    target = { x: t.x, y: t.y };
    piece = { x: st.x, y: st.y };
    dragging = false; stuck = false; roundT = 0;
    roundDur = Math.max(2.6, 4.2 - round * 0.28);
  }

  function initGame() {
    round = 0; placed = 0; newRound();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.08, H * 0.16, W * 0.84, H * 0.6, C.album);
    game.draw.rect(W * 0.08, H * 0.16, W * 0.84, 10, C.albumEdge);
  }

  function drawTarget(warn) {
    var col = warn ? C.bad : C.target;
    for (var a = 0; a < 16; a++) {
      var ang = (a / 16) * Math.PI * 2;
      game.draw.circle(target.x + Math.cos(ang) * TOL, target.y + Math.sin(ang) * TOL, 5, col, 0.7);
    }
  }

  function drawPiece(x, y, s) {
    game.draw.circle(x, y, 60 * s, C.pieceEdge, 0.9);
    game.draw.sprite(STAR, { '#': C.piece }, x, y, 16 * s, { anchor: 'center' });
  }

  function tryPlace() {
    var d = Math.hypot(piece.x - target.x, piece.y - target.y);
    if (d <= TOL) {
      stuck = true; dragging = false;
      placed++;
      hitStop = 0.1;
      game.feedback.good(target.x, target.y, { text: 'FIT', color: C.good });
      game.fx.burst(target.x, target.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!halfShown && placed >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (placed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound();
    } else {
      dragging = false;
      var st = START_SPOTS[round % START_SPOTS.length];
      piece.x = st.x; piece.y = st.y;
      game.feedback.bad(target.x, target.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || stuck) return;
    var d = Math.hypot(x - piece.x, y - piece.y);
    if (d < 90) {
      dragging = true; dragOffX = piece.x - x; dragOffY = piece.y - y;
      game.audio.play('se_tap', 0.15);
    } else {
      game.fx.popup('', x, y, { color: C.pieceEdge, size: 1 });
    }
  });
  game.onMove(function(x, y) {
    if (!dragging || state !== S.PLAYING) return;
    piece.x = x + dragOffX; piece.y = y + dragOffY;
  });
  game.onRelease(function(x, y) {
    if (dragging) { dragging = false; tryPlace(); }
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

  var demo = { t: 0, gx: 0, gy: 0, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { round = 0; placed = 0; newRound(); demo.phase = 0; }
    var st = START_SPOTS[round % START_SPOTS.length];
    var p = cyc / 2.8;
    if (p < 0.25) {
      demo.gx = st.x; demo.gy = st.y; demo.press = false; piece.x = st.x; piece.y = st.y;
    } else if (p < 0.8) {
      var q = (p - 0.25) / 0.55;
      demo.gx = st.x + (target.x - st.x) * q;
      demo.gy = st.y + (target.y - st.y) * q;
      demo.press = true;
      piece.x = demo.gx; piece.y = demo.gy;
    } else {
      demo.press = false;
      if (!stuck) {
        stuck = true; placed++;
        game.feedback.good(target.x, target.y, { text: 'FIT', color: C.good });
        game.audio.play('se_good', 0.2);
      }
      piece.x = target.x; piece.y = target.y;
    }
    if (p >= 0.95 && stuck) { round = (round + 1) % TARGET_SPOTS.length; newRound(); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (piece === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTarget(false);
      drawPiece(piece.x, piece.y, 1);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.09, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.pieceEdge);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.pieceEdge);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget(false);
      drawPiece(piece.x, piece.y, 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 48, ok ? C.good : C.bad);
      txt(placed + ' / ' + TOTAL, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - placed) + '枚!', W / 2, H * 0.185, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(placed, { placed: placed, total: TOTAL });
        else game.end.failure({ placed: placed, total: TOTAL });
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
        game.feedback.bad(target.x, target.y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var warn = !finished && (roundDur - roundT) < 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    drawTarget(warn);
    if (!finished) drawPiece(piece.x, piece.y, dragging ? 1.15 : 1);

    txt(placed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.albumEdge, 0.8);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - roundT / roundDur), 16, C.pieceEdge);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.3], ['E5', 0.3], ['G5', 0.3], ['C6', 0.5]], { tempo: 140, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
