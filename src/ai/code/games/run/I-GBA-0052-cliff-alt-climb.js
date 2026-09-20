// I-GBA-0052-cliff-alt-climb.js
// クリフオルトクライム — 画面左右を交互にタップして、時間内に岩壁を登りきる
// 操作: 画面下の左右ゾーンを交互にタップして手足を掛け替え、登っていく
// 終わり: 時間内に頂上まで登りきれば成功。同じ側を連続タップしても進まず、時間切れなら失敗
// @mechanic: alternate_tap
// @theme: cliffside_alt_climb
// 世界観: 荒いドット絵で描かれた一枚岩の断崖。左右の手がかりへ交互に手を伸ばして頂上を目指す小さな登山者
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った歩数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 携帯ゲーム機風の限定4色パレット、荒い大ドット
  var C = {
    bg: '#0f380f', bg2: '#081c08', rock: '#306230', rockDark: '#0f380f', rockLight: '#8bac0f',
    climber: '#e0f8cf', good: '#8bac0f', bad: '#cf6679', gold: '#e0f8cf',
    white: '#e0f8cf', ink: '#081c08',
  };

  var GAME_TITLE = 'ALT CLIMB';
  var TOTAL = 14;
  var TIME_LIMIT = 11.0;
  var LZ = { x: W * 0.27, y: H * 0.86 }, RZ = { x: W * 0.73, y: H * 0.86 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLIMBER_L = ['.#.', '###', '#.#', '.#.'];
  var CLIMBER_R = ['.#.', '###', '#.#', '.#.'];
  var HOLD = ['##'];

  var steps, lastZone, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function initGame() {
    steps = 0; lastZone = null; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) {
      game.draw.rect(W * 0.12 + (i % 2) * W * 0.6, H * 0.16 + i * 200, 60, 24, C.rockLight, 0.5);
    }
  }

  function drawWall() {
    game.draw.rect(W * 0.15, H * 0.14, W * 0.7, H * 0.66, C.rock);
    game.draw.rect(W * 0.15, H * 0.14, W * 0.7, 10, C.rockDark);
    for (var i = 0; i < 7; i++) {
      var hy = H * 0.18 + i * 80;
      game.draw.sprite(HOLD, { '#': C.rockLight }, W * 0.32, hy, 12, { anchor: 'center' });
      game.draw.sprite(HOLD, { '#': C.rockLight }, W * 0.68, hy, 12, { anchor: 'center' });
    }
  }

  function drawClimber(s, side) {
    var pct = s / TOTAL;
    var y = H * 0.76 - pct * H * 0.54;
    var frame = side === 'L' ? CLIMBER_L : CLIMBER_R;
    game.draw.sprite(frame, { '#': C.climber }, W * 0.5, y, 18, { anchor: 'center' });
  }

  function zoneOf(x) { return x < W * 0.5 ? 'L' : 'R'; }

  function handleTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var z = zoneOf(x);
    if (z !== lastZone) {
      lastZone = z;
      steps++;
      game.feedback.good(z === 'L' ? LZ.x : RZ.x, z === 'L' ? LZ.y : RZ.y, { text: '', color: C.good, size: 1 });
      game.audio.play('se_good', 0.25);
      if (!halfShown && steps >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.4, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (steps >= TOTAL) { ok = true; finished = true; hitStop = 0.12; finish(); }
    } else {
      game.feedback.bad(z === 'L' ? LZ.x : RZ.x, z === 'L' ? LZ.y : RZ.y, { text: '', color: C.bad, size: 1 });
      game.audio.play('se_bad', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    handleTap(x, y);
  });
  game.onPress(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: LZ.x, gy: LZ.y, press: false, side: 'R' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { steps = 0; lastZone = null; }
    var beat = Math.floor(cyc / 0.42);
    var side = beat % 2 === 0 ? 'L' : 'R';
    demo.gx = side === 'L' ? LZ.x : RZ.x;
    demo.gy = side === 'L' ? LZ.y : RZ.y;
    demo.press = (cyc % 0.42) < 0.2;
    if (side !== demo.side && demo.press) {
      demo.side = side;
      if (side !== lastZone) {
        lastZone = side;
        steps = Math.min(TOTAL, steps + 1);
        game.feedback.good(demo.gx, demo.gy, { text: '', color: C.good, size: 1 });
        game.audio.play('se_good', 0.12);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (steps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawWall();
      drawClimber(steps, demo.side);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawWall();
      drawClimber(steps, lastZone || 'L');
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(steps + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - steps) + '歩!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(steps, { steps: steps, total: TOTAL });
        else game.end.failure({ steps: steps, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        ok = false; finished = true; hitStop = 0.35; shake = 0.25;
        game.feedback.bad(W / 2, H * 0.5, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawWall();
    if (!finished) drawClimber(steps, lastZone || 'L');

    txt(steps + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, C.gold);
    game.draw.circle(LZ.x, LZ.y, 60, lastZone === 'L' ? C.good : C.rockDark, 0.4);
    game.draw.circle(RZ.x, RZ.y, 60, lastZone === 'R' ? C.good : C.rockDark, 0.4);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['C4', 0.2], ['G4', 0.2], ['G4', 0.2]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
