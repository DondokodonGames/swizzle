// D-20172021-0069-flank-strike-alternate.js
// フランク・ストライク・オルタネイト — 左右から交互拳を叩き込み、鐘が鳴る前に守衛のHPを削り切る
// 操作: 左右下の拳ボタンを左右交互にタップする。同じ側を連続で押すと拳が流れて外れる
// 終わり: HPを削り切れば成功。鐘(時間切れ)までに削りきれなければ失敗
// @mechanic: alternate_tap
// @theme: arena_flank_strike
// 世界観: 闘技場の新人ファイターが、行く手を阻む仮面の番人へ左右交互の拳を叩き込み、鐘が鳴る前にHPを削り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 削ったヒット数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: 立方体を上面/左面/右面の3明度で描き、明度差だけで立体を出す
  var STYLE = { bg: ['#1a1420', '#0c0a10'], main: ['#8a3a3a', '#3a5a8a'], accent: ['#ffd24d', '#ff4d5e'] };
  var C = {
    bg: STYLE.bg[0], bg2: STYLE.bg[1], guardTop: '#9a6a6a', guardL: '#6a3a3a', guardR: '#7a4a4a',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0e0e8', white: '#ffffff',
    btnL: '#3a5a8a', btnR: '#8a3a3a',
  };

  var GAME_TITLE = 'FLANK STRIKE';
  var CX = W * 0.5, GUARD_Y = H * 0.4;
  var BTN_L_X = W * 0.27, BTN_R_X = W * 0.73, BTN_Y = H * 0.85, BTN_R = 130;
  var HITS_TARGET = 10;
  var TIME_LIMIT = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARD_FRAMES = [
    ['.####.', '######', '#.##.#', '######', '.#..#.'],
    ['.####.', '######', '##..##', '######', '.#..#.'],
  ];
  var FIST = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      var x = 100 + i * 220;
      game.draw.rect(x, 0, 10, H, '#000000', 0.15);
    }
  }

  var hp, hits, lastSide, timeLeft, done, endWait, finished, ready, hitStop, shake, hitFlash, guardFrame;

  function initGame() {
    hp = HITS_TARGET; hits = 0; lastSide = null; timeLeft = TIME_LIMIT;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; hitFlash = 0; guardFrame = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawGuard() {
    var bob = Math.sin(game.time.elapsed * 3) * 6;
    var jx = hitFlash > 0 ? game.random(-8, 8) : 0;
    game.draw.sprite(GUARD_FRAMES[guardFrame], { '#': hitFlash > 0 ? '#ffffff' : C.guardTop }, CX + jx, GUARD_Y + bob, 28, { anchor: 'center' });
  }

  function drawButtons() {
    game.draw.circle(BTN_L_X, BTN_Y, BTN_R, C.btnL);
    game.draw.sprite(FIST, { '#': '#ffffff' }, BTN_L_X, BTN_Y, 24, { anchor: 'center' });
    game.draw.circle(BTN_R_X, BTN_Y, BTN_R, C.btnR);
    game.draw.sprite(FIST, { '#': '#ffffff' }, BTN_R_X, BTN_Y, 24, { anchor: 'center' });
  }

  function strike(side, x, y) {
    if (side === lastSide) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      lastSide = side;
      return;
    }
    lastSide = side;
    hp = Math.max(0, hp - 1);
    hits++;
    guardFrame = (guardFrame + 1) % GUARD_FRAMES.length;
    hitFlash = 0.08;
    game.feedback.good(x, y, { text: '', color: C.gold, count: 6 });
    game.audio.play('se_tap', 0.25);
    game.fx.shake(6, 0.06);
    if (hits === Math.floor(HITS_TARGET * 0.5)) game.fx.popup('NICE', CX, GUARD_Y - 220, { color: C.gold, size: 34 });
    if (hp <= 0) {
      ok = true; finished = true; hitStop = 0.3;
      game.feedback.good(CX, GUARD_Y, { text: 'CLEAR', color: C.good, count: 20 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      var dL = Math.hypot(x - BTN_L_X, y - BTN_Y);
      var dR = Math.hypot(x - BTN_R_X, y - BTN_Y);
      if (dL <= BTN_R) strike('L', x, y);
      else if (dR <= BTN_R) strike('R', x, y);
    }
  });

  var demo = { t: 0, gx: BTN_L_X, gy: BTN_Y, press: false, side: 'L' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { initGame(); demo.side = 'L'; }
    var step = 0.26;
    var phase = cyc % step;
    if (cyc < 2.6) {
      demo.gx = demo.side === 'L' ? BTN_L_X : BTN_R_X;
      demo.gy = BTN_Y;
      demo.press = phase < step * 0.4;
      if (phase < dt && hp > 0) {
        strike(demo.side, demo.gx, demo.gy);
        demo.side = demo.side === 'L' ? 'R' : 'L';
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (hitFlash > 0) hitFlash -= dt;

    if (state === S.ATTRACT) {
      if (hp === undefined) initGame();
      stepDemo(dt);
      bg();
      drawButtons();
      drawGuard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawButtons();
      drawGuard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 46, ok ? C.good : C.bad);
      txt(hits + ' / ' + HITS_TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + hp + '!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, target: HITS_TARGET });
        else game.end.failure({ hits: hits, target: HITS_TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, GUARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawButtons();
    drawGuard();

    txt(hits + ' / ' + HITS_TARGET, W / 2, H * 0.06, 30, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#000000', 0.4);
    game.draw.rect(60, 150, tbW * Math.max(0, hp / HITS_TARGET), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.2], ['A3', 0.2], ['E3', 0.2], ['C4', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
