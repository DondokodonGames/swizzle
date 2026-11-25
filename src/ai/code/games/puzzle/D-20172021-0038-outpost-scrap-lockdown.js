// D-20172021-0038-outpost-scrap-lockdown.js
// アウトポスト・スクラップ・ロックダウン — ストーム接近前の最終拠点で、壊れた防壁の穴の形に合う残骸パーツを選んで手早く塞ぐ
// 操作: 中央の壁穴の形と同じ形のパーツを下の3択からタップして選ぶ
// 終わり: 制限時間内に規定回数(6)塞げば成功。違う形を選ぶ/時間切れで失敗
// @mechanic: gap_fit
// @theme: outpost_scrap_lockdown
// 世界観: ストーム接近前の最終拠点に残った回収班の一人が、壊れた防壁の穴の形に合う残骸パーツを選び抜き、制限時間内に塞ぎ切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 塞いだ穴の数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 太いブロック単位、濃い縁取り、彩度高めの平面色
  var C = {
    bg: '#4a4030', bg2: '#241e14', wall: '#5c4e38', wallEdge: '#7a6848',
    gap: '#100c08', piece: '#e0a03c', pieceDark: '#8a5a1c',
    good: '#3ce07a', bad: '#ff4d5e', gold: '#ffd400', white: '#f4ecd8', ink: '#100c08',
  };

  var GAME_TITLE = 'SCRAP LOCKDOWN';
  var TOTAL = 6;
  var TIME_LIMIT = 20;
  var CX = W * 0.5, GAP_Y = H * 0.4;
  var PICK_X = [W * 0.28, W * 0.5, W * 0.72];
  var PICK_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var SHAPES = ['square', 'circle', 'tri', 'diamond'];
  var SPR = {
    square: ['#####', '#####', '#####', '#####', '#####'],
    circle: ['.###.', '#####', '#####', '#####', '.###.'],
    tri: ['..#..', '.###.', '#####', '#####', '#####'],
    diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
  };

  var filled, done, endWait, finished;
  var ready, hitStop, shake;
  var gapType, picks, playT, halfCalled;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#e0a03c', pulse * 0.3);
    game.draw.rect(CX - 220, GAP_Y - 220, 440, 440, C.wall, 0.9);
    game.draw.rect(CX - 220, GAP_Y - 220, 440, 8, C.wallEdge);
  }

  function pickOther(exclude) {
    var opts = SHAPES.filter(function(s) { return s !== exclude; });
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function newRound() {
    gapType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    var correctIdx = Math.floor(Math.random() * 3);
    picks = [];
    for (var i = 0; i < 3; i++) {
      picks.push(i === correctIdx ? gapType : pickOther(gapType));
    }
  }

  function initGame() {
    filled = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    playT = 0; halfCalled = false;
    newRound();
  }

  function drawGap() {
    game.draw.circle(CX, GAP_Y, 110, C.gap, 0.9);
    game.draw.sprite(SPR[gapType], { '#': C.wallEdge }, CX, GAP_Y, 22, { anchor: 'center' });
  }

  function drawPicks() {
    for (var i = 0; i < picks.length; i++) {
      game.draw.circle(PICK_X[i], PICK_Y, 90, C.pieceDark, 0.85);
      game.draw.sprite(SPR[picks[i]], { '#': C.piece }, PICK_X[i], PICK_Y, 16, { anchor: 'center' });
    }
  }

  function pickAt(x, y) {
    for (var i = 0; i < PICK_X.length; i++) {
      if (game.hit.circle(x, y, 8, PICK_X[i], PICK_Y, 92)) return i;
    }
    return -1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var idx = pickAt(x, y);
    if (idx < 0) { game.feedback.bad(x, y, { text: 'MISS' }); game.audio.play('se_tap', 0.15); return; }
    game.audio.play('se_tap', 0.1);
    if (picks[idx] === gapType) {
      filled++;
      hitStop = 0.08;
      game.feedback.good(PICK_X[idx], PICK_Y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, GAP_Y, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_break', 0.3);
      if (filled === Math.ceil(TOTAL / 2)) game.fx.popup('あと' + (TOTAL - filled) + '!', CX, GAP_Y - 260, { color: C.gold, size: 34 });
      if (filled >= TOTAL) {
        ok = true; finished = true;
        game.audio.play('se_success', 0.5);
        finish();
        return;
      }
      newRound();
    } else {
      ok = false; finished = true;
      hitStop = 0.32; shake = 0.3;
      game.feedback.bad(PICK_X[idx], PICK_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.45);
      finish();
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: PICK_X[0], gy: PICK_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    if (cyc < dt || demo.t <= dt) newRound();
    if (cyc > 1.1 && cyc < 1.3) {
      demo.press = true;
      var correctIdx = picks.indexOf(gapType);
      demo.gx = PICK_X[correctIdx]; demo.gy = PICK_Y;
      if (cyc < 1.16) {
        game.feedback.good(PICK_X[correctIdx], PICK_Y, { text: 'GOOD', color: C.good });
        game.fx.burst(CX, GAP_Y, { color: C.gold, count: 12, speed: 260 });
        game.audio.play('se_good', 0.2);
      }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gapType === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGap();
      drawPicks();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGap();
      drawPicks();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(filled + ' / ' + TOTAL, W / 2, H * 0.13, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, TOTAL - filled) + '!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(filled, { filled: filled, total: TOTAL });
        else game.end.failure({ filled: filled, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      if (!halfCalled && playT >= TIME_LIMIT * 0.5) { halfCalled = true; game.audio.play('se_milestone', 0.25); }
      if (playT >= TIME_LIMIT) {
        finished = true; ok = false;
        hitStop = 0.25; shake = 0.2;
        game.feedback.bad(CX, GAP_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) { drawGap(); drawPicks(); }

    txt(filled + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - playT / TIME_LIMIT), 16, playT > TIME_LIMIT * 0.75 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.2], ['A3', 0.2], ['C4', 0.2], ['F4', 0.4]], { tempo: 120, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
