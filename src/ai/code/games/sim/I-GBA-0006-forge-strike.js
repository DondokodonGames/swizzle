// I-GBA-0006-forge-strike.js
// フォージストライク — 鍛冶場で赤く熱した鉄を、火花が散った合図の瞬間だけ一撃で打つ
// 操作: 火花が散った瞬間にタップしてハンマーを振る。早撃ちも遅撃ちも失敗
// 終わり: 規定回数(3回)正しい瞬間に打てれば成功。早すぎ/遅すぎが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: blacksmith_forge
// 世界観: 山あいの鍛冶場。師匠が鉄を熱し火花が散った刹那だけ弟子がハンマーを振り下ろす一発勝負の鍛錬
// 残るもの: 正誤(CLEAR/GAME OVER) + 決めた回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値。中間色はディザ(市松)。線の太さで距離と力を語る
  var C = {
    bg: '#0a0a0a', ink: '#000000', white: '#f2f2f2', hot: '#f2f2f2',
    good: '#f2f2f2', bad: '#f2f2f2', gold: '#f2f2f2',
  };

  var GAME_TITLE = 'FORGE STRIKE';
  var TOTAL = 3;
  var CX = W * 0.5, ANVIL_Y = H * 0.58;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var struck, done, endWait, finished, ready, hitStop, shake;
  var round, waitT, sparked, sparkT, resolved, hammerUp;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH_UP = ['.##.', '####', '.##.', '/##.'];
  var SMITH_DOWN = ['.##.', '####', '.##.', '\\##.'];

  function dither(x, y, w, h, alpha) {
    var step = 6;
    for (var yy = 0; yy < h; yy += step) {
      for (var xx = (yy / step) % 2 === 0 ? 0 : step; xx < w; xx += step * 2) {
        game.draw.rect(x + xx, y + yy, step, step, C.white, alpha);
      }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, '#050505'], [1, '#0a0a0a']]);
    dither(0, H * 0.65, W, H * 0.25, 0.08);
    game.draw.rect(0, H * 0.62, W, 6, C.white, 0.5);
  }

  function newRound() {
    waitT = game.random(1.0, 1.9); sparked = false; sparkT = 0; resolved = false;
  }

  function initGame() {
    struck = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    round = 0; hammerUp = true;
    newRound();
  }

  function drawScene() {
    game.draw.circle(CX, ANVIL_Y + 30, 90, C.white, 0.12);
    game.draw.rect(CX - 70, ANVIL_Y + 10, 140, 26, C.white, 0.7);
    if (sparked && sparkT > 0) {
      for (var i = 0; i < 6; i++) {
        var ang = i * 1.05 + game.time.elapsed * 6;
        game.draw.line(CX, ANVIL_Y, CX + Math.cos(ang) * 46, ANVIL_Y - Math.abs(Math.sin(ang)) * 46, C.white, 3);
      }
    }
    game.draw.sprite(hammerUp ? SMITH_UP : SMITH_DOWN, { '#': C.white, '/': C.white, '\\': C.white }, CX, ANVIL_Y - 70, 24, { anchor: 'center' });
  }

  function attemptStrike() {
    if (finished || ready > 0 || done || resolved) return;
    resolved = true;
    game.audio.play('se_tap', 0.06);
    hammerUp = false;
    var success = sparked && sparkT > 0 && sparkT < 0.45;
    hitStop = success ? 0.12 : 0.32;
    if (success) {
      struck++;
      game.feedback.good(CX, ANVIL_Y, { text: 'HIT', color: C.good });
      game.fx.burst(CX, ANVIL_Y, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_powerup', 0.4);
      if (struck === Math.ceil(TOTAL / 2)) { game.fx.popup(struck + ' / ' + TOTAL, CX, H * 0.28, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (struck >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; newRound();
    } else {
      game.feedback.bad(CX, ANVIL_Y, { text: sparked ? 'LATE' : 'EARLY' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptStrike();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, waitT: 1.2, sparked: false, sparkT: 0, resolved: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.waitT = 1.2; demo.sparked = false; demo.sparkT = 0; demo.resolved = false; hammerUp = true; }
    if (!demo.sparked) {
      demo.waitT -= dt;
      if (demo.waitT <= 0) demo.sparked = true;
    } else if (!demo.resolved) {
      demo.sparkT += dt;
      if (demo.sparkT > 0.1 && demo.sparkT < 0.3) {
        demo.resolved = true; demo.press = true; hammerUp = false;
        game.feedback.good(CX, ANVIL_Y, { text: 'HIT', color: C.good });
        game.audio.play('se_powerup', 0.25);
      }
    } else {
      demo.press = false;
    }
    sparked = demo.sparked; sparkT = demo.sparkT;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.white);
      txt(struck + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.white);
      if (!ok) txt('あと' + (TOTAL - struck) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(struck, { struck: struck, total: TOTAL });
        else game.end.failure({ struck: struck, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!sparked) {
        waitT -= dt;
        if (waitT <= 0) { sparked = true; game.audio.play('se_tap', 0.2); }
      } else if (!resolved) {
        sparkT += dt;
        if (sparkT > 0.6) {
          resolved = true; hitStop = 0.32;
          game.feedback.bad(CX, ANVIL_Y, { text: 'LATE' });
          shake = 0.28;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt(struck + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.white, 0.2);
    game.draw.rect(60, 150, (W - 120) * (struck / TOTAL), 16, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 58, C.white);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['C3', 0.2], ['G3', 0.4]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
