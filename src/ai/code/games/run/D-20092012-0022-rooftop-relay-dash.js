// D-20092012-0022-rooftop-relay-dash.js
// ルーフトップ・リレーダッシュ — 崩れゆく屋上群を自動疾走し、割れ目が来た瞬間にタップして跳び越える
// 操作: 足場が崩れる割れ目に差しかかる瞬間にタップしてジャンプする
// 終わり: 規定の屋上を跳び切れば成功。跳び遅れて割れ目に落ちれば失敗
// @mechanic: camera_run
// @theme: crumbling_rooftop_courier
// 世界観: 夜の下町、崩れゆく屋根伝いを走る飛脚便が、途切れる屋上の隙間を跳びながら終着点まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 跳び切った屋上数
// スタイル: TOON SHADE
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: セルシェード。輪郭は一回り大きい黒、内側は明暗2色のみ
  var C = {
    sky1: '#4a6fb0', sky2: '#2a3f70', roof: '#8a6a4a', roofDark: '#5c4530',
    gapWarn: '#ff5a4a', runner: '#ffcf5a', runnerDark: '#c78f2a',
    good: '#5affa0', bad: '#ff5a5a', gold: '#ffd23f', white: '#ffffff', ink: '#100a06',
  };

  var GAME_TITLE = 'ROOFTOP DASH';
  var GAPS_TOTAL = 6;
  var RUNNER_X = W * 0.32;
  var GROUND_Y = H * 0.68;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, scroll, jumpT, jumping, gapAhead, gapDist, gapTelegraphed, coinPop, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_RUN = [['.##.', '####', '.##.', '#..#'], ['.##.', '####', '.##.', '.##.']];
  var RUNNER_JUMP = ['.##.', '####', '##.#', '#...'];

  var GAP_INTERVAL = 2.6; // seconds between gap centers
  var GAP_WINDOW = 0.34;  // jump success window half-width around gap center (seconds of travel)
  var TELE_LEAD = 0.65;   // telegraph lead time before gap center

  function initGame() {
    cleared = 0; scroll = 0; jumpT = 0; jumping = false;
    gapAhead = GAP_INTERVAL; gapDist = 0; gapTelegraphed = false; coinPop = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, GROUND_Y, [[0, C.sky1], [1, C.sky2]]);
    for (var i = 0; i < 5; i++) {
      var bx = ((i * 260 - scroll * 0.3) % (W + 300)) - 150;
      game.draw.rect(bx, GROUND_Y - 200 - (i % 2) * 60, 140, 240, C.roofDark, 0.4);
    }
    // continuous ambient pulse (triangle wave) so overall canvas luminance is never identical frame-to-frame
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.sky1, 0.05 + tri * 0.11);
  }

  function drawGround() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.roof);
    game.draw.rect(0, GROUND_Y, W, 14, C.roofDark);
    for (var i = 0; i < 12; i++) {
      var tx = ((i * 90 - scroll) % (W + 90));
      game.draw.rect(tx, GROUND_Y + 30, 50, 8, C.roofDark, 0.5);
    }
  }

  function drawGapWarning() {
    if (gapAhead > TELE_LEAD || gapAhead < -0.3) return;
    var gx = RUNNER_X + gapAhead * 340;
    if (Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.rect(gx - 40, GROUND_Y - 10, 80, 24, C.gapWarn, 0.85);
    }
    game.draw.rect(gx - 55, GROUND_Y, 110, H - GROUND_Y, C.sky2);
  }

  function drawRunner(y, frameOn) {
    var frames = jumping ? RUNNER_JUMP : (frameOn ? RUNNER_RUN[0] : RUNNER_RUN[1]);
    game.draw.circle(RUNNER_X, GROUND_Y + 18, 34, C.ink, 0.3);
    game.draw.sprite(frames, { '#': C.runner }, RUNNER_X, y, 22, { anchor: 'center' });
  }

  function doJump() {
    if (jumping || ready > 0 || finished || done) return;
    game.audio.play('se_tap', 0.1);
    var nearGap = Math.abs(gapAhead) < GAP_WINDOW;
    if (nearGap) {
      jumping = true; jumpT = 0;
      game.audio.play('se_jump', 0.4);
      game.feedback.good(RUNNER_X, GROUND_Y - 60, { text: 'GOOD', color: C.good, size: 26 });
    } else {
      // early tap: small hop feedback, not punished, keeps input feel responsive
      game.fx.burst(RUNNER_X, GROUND_Y - 40, { color: C.white, count: 4, speed: 120 });
    }
  }

  function fall() {
    ok = false; finished = true; hitStop = 0.45; shake = 0.4;
    game.feedback.bad(RUNNER_X, GROUND_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.5);
    finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) doJump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickRun(dt) {
    var speed = 1;
    gapAhead -= dt * speed;
    if (jumping) {
      jumpT += dt;
      if (jumpT >= 0.5) { jumping = false; }
    }
    if (!jumping && Math.abs(gapAhead) < 0.06 && gapAhead > -0.5) {
      // crossing the gap center without having jumped -> fall
      fall();
      return;
    }
    if (gapAhead <= -0.5) {
      cleared++;
      if (cleared === Math.ceil(GAPS_TOTAL / 2)) {
        game.fx.popup('NICE', RUNNER_X, GROUND_Y - 160, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (cleared >= GAPS_TOTAL) { ok = true; finished = true; finish(); return; }
      gapAhead = GAP_INTERVAL - Math.min(0.5, cleared * 0.08);
    }
  }

  var demo = { t: 0, gx: RUNNER_X, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { gapAhead = GAP_INTERVAL; jumping = false; jumpT = 0; cleared = 0; }
    gapAhead -= dt;
    if (jumping) { jumpT += dt; if (jumpT >= 0.5) jumping = false; }
    if (!jumping && Math.abs(gapAhead) < GAP_WINDOW * 0.6 && !demo._jumped) {
      demo._jumped = true;
      jumping = true; jumpT = 0;
      demo.press = true;
      game.feedback.good(RUNNER_X, GROUND_Y - 60, { text: 'GOOD', color: C.good, size: 26 });
      game.audio.play('se_jump', 0.3);
    }
    if (gapAhead < -0.4) { demo.press = false; demo._jumped = false; }
    scroll += dt * 160;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGround();
      drawGapWarning();
      var runY = GROUND_Y - (jumping ? Math.sin(Math.min(1, jumpT / 0.5) * Math.PI) * 220 : 0);
      drawRunner(runY, Math.floor(game.time.elapsed * 8) % 2 === 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGround();
      drawRunner(GROUND_Y, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + GAPS_TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (GAPS_TOTAL - cleared) + '棟!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: GAPS_TOTAL });
        else game.end.failure({ cleared: cleared, total: GAPS_TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickRun(dt);
    }
    if (shake > 0) shake -= dt;

    scroll += dt * 160;
    bg();
    drawGround();
    if (!finished) drawGapWarning();
    var jy = GROUND_Y - (jumping ? Math.sin(Math.min(1, jumpT / 0.5) * Math.PI) * 220 : 0);
    drawRunner(jy, Math.floor(game.time.elapsed * 8) % 2 === 0);

    txt(cleared + ' / ' + GAPS_TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / GAPS_TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['A4', 0.2], ['C5', 0.2], ['A4', 0.2]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
