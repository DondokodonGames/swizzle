// J-N6424-0005-rolling-number-block.js
// ローリングナンバーブロック — 転がる立方体のブロックを狙ったタイミングで止めて、指定された目の数字を出す
// 操作: 面の数字が切り替わり続けるブロックを見て、指定の数字が出た瞬間にタップして止める
// 終わり: 3回のうち規定回数、指定の目を止められれば成功。届かなければ失敗
// @mechanic: timing_one_shot
// @theme: rolling_number_block
// 世界観: 露店の的当て師見習いが、転がり続ける立方体ブロックを絶妙なタイミングで止め、狙った目の数字を出し切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 的中回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白背景+単色、柔らかい影の丸い塊
  var C = {
    bg: '#f5f5fa', bg2: '#e4e4f0', block: '#4a6cf0', blockDark: '#2a44c0', blockLight: '#8aa0ff',
    good: '#2bd67b', bad: '#ff4d5e', gold: '#ff9f1c', ink: '#1a1a2e', white: '#ffffff',
  };

  var GAME_TITLE = 'NUMBER STOP';
  var ROUNDS = 3;
  var NEED_HITS = 2;
  var SPIN_SPEED = 6.5;
  var BLOCK_X = W * 0.5, BLOCK_Y = H * 0.46, BLOCK_S = 220;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#c8c8d8', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var VENDOR_SPR = ['.##.', '####', '.##.', '##.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#4a6cf0', pulse * 0.05);
    game.draw.circle(BLOCK_X, BLOCK_Y + BLOCK_S * 0.62, BLOCK_S * 0.55, '#000000', 0.08);
    var bob = Math.sin(game.time.elapsed * 2.4) * 6;
    game.draw.sprite(VENDOR_SPR, { '#': C.gold }, W * 0.15, H * 0.82 + bob, 12, { anchor: 'center' });
  }

  function drawBlock(face, spinning, hitAnim) {
    var scale = hitAnim > 0 ? 1 + hitAnim * 0.3 : 1;
    var s = BLOCK_S * scale;
    game.draw.rect(BLOCK_X - s / 2, BLOCK_Y - s / 2, s, s, hitAnim > 0 ? C.blockLight : C.block);
    game.draw.rect(BLOCK_X - s / 2, BLOCK_Y - s / 2, s, s * 0.25, C.blockLight, 0.5);
    game.draw.rect(BLOCK_X - s / 2, BLOCK_Y + s / 2 - s * 0.15, s, s * 0.15, C.blockDark, 0.5);
    txt(String(face), BLOCK_X, BLOCK_Y + 24, 90, C.white);
  }

  var round, hits, spinT, curFace, targetFace, hitAnim, roundReady, roundLock;
  var done, endWait, finished, ready, hitStop, shake;

  function newTarget() { return 1 + Math.floor(Math.random() * 6); }
  function faceAt(t) { return 1 + Math.floor(t * SPIN_SPEED) % 6; }

  function initGame() {
    round = 0; hits = 0; spinT = 0; targetFace = newTarget(); hitAnim = 0; roundLock = false;
    curFace = faceAt(0);
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function attemptStop() {
    if (finished || ready > 0 || roundLock) return;
    roundLock = true;
    hitAnim = 0.35;
    var success = curFace === targetFace;
    if (success) {
      hits++;
      game.feedback.good(BLOCK_X, BLOCK_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (hits === NEED_HITS) {
        game.fx.popup('NICE', BLOCK_X, BLOCK_Y - 200, { color: C.gold, size: 32 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.feedback.bad(BLOCK_X, BLOCK_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
    round++;
    roundLockTimer = 0.55;
  }

  var roundLockTimer = 0;

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptStop();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BLOCK_X, gy: BLOCK_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { spinT = 0; targetFace = newTarget(); hits = 0; hitAnim = 0; }
    spinT += dt;
    curFace = faceAt(spinT);
    demo.press = false;
    if (cyc > 1.9 && cyc < 1.9 + dt * 2 && curFace === targetFace) {
      hitAnim = 0.35;
      demo.press = true;
      hits++;
      game.feedback.good(BLOCK_X, BLOCK_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (spinT === undefined) initGame();
      stepDemo(dt);
      if (hitAnim > 0) hitAnim -= dt;
      bg();
      drawBlock(curFace, true, hitAnim);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('TARGET ' + targetFace, W / 2, H * 0.15, 26, C.gold);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.19, 20, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBlock(curFace, false, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEED_HITS, W / 2, H * 0.15, 26, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HITS - hits) + '回!', W / 2, H * 0.19, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, rounds: round });
        else game.end.failure({ hits: hits, rounds: round });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (roundLock) {
        roundLockTimer -= dt;
        if (roundLockTimer <= 0) {
          roundLock = false;
          if (hits >= NEED_HITS) {
            ok = true; finished = true; hitStop = 0.25;
            game.feedback.good(BLOCK_X, BLOCK_Y, { text: 'CLEAR', color: C.good });
            game.fx.burst(BLOCK_X, BLOCK_Y, { color: C.gold, count: 22, speed: 420 });
            game.audio.play('se_success', 0.5);
            finish();
          } else if (round >= ROUNDS) {
            ok = false; finished = true; hitStop = 0.3; shake = 0.2;
            game.feedback.bad(BLOCK_X, BLOCK_Y, { text: 'MISS' });
            game.audio.play('se_failure', 0.4);
            finish();
          } else {
            targetFace = newTarget();
          }
        }
      } else {
        spinT += dt;
        curFace = faceAt(spinT);
      }
    }
    if (hitAnim > 0) hitAnim -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawBlock(curFace, !roundLock, hitAnim);

    txt('TARGET ' + targetFace, W / 2, H * 0.15, 30, C.gold);
    txt(hits + ' / ' + NEED_HITS, W / 2, H * 0.06, 28, C.ink);
    var barW = W - 120;
    var pct = round / ROUNDS;
    game.draw.rect(60, 150, barW, 16, '#d8d8e8', 1);
    game.draw.rect(60, 150, barW * pct, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.15], ['E5', 0.15], ['G5', 0.15], ['C6', 0.3]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
