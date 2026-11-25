// I-DS-0022-snowball-pack-size.js
// スノーボールパック — 両手で挟んだ雪玉を押し固め、示された大きさまでちょうど縮める
// 操作: 雪玉の両端を指でつまんで押さえ続けると縮んでいく。示された目標サイズの輪に収まった瞬間に指を離す
// 終わり: 3球連続で目標の輪の中で離せば成功。小さすぎ/大きすぎで離す、または輪を通り過ぎると失敗
// @mechanic: hold_charge
// @theme: snow_pack_contest
// 世界観: 雪祭りの玉投げ大会前の準備場。選手が審査員の示す規格の輪に合わせて雪玉を握り固め、投擲用に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 規格通りに仕上げた球数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層
  var C = {
    bg: '#8fd0ff', bg2: '#cdeeff', snow: '#ffffff', snowShade: '#d6ecff',
    ring: '#ff8a3d', ringOk: '#3ddc84', ringBad: '#ff4d5e',
    good: '#3ddc84', bad: '#ff4d5e', gold: '#ffcc33', white: '#ffffff', ink: '#123a5e',
  };

  var GAME_TITLE = 'SNOW PACK';
  var CX = W * 0.5, CY = H * 0.46;
  var ROUNDS = 3;
  var START_R = 210;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, cleared, targetR, tol, curR, holding, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MASCOT = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [0.7, C.bg2], [1, '#eaf8ff']]);
    game.draw.circle(CX, H * 0.86, 260, '#ffffff90');
  }

  function newTarget(r) {
    return Math.max(70, START_R - r * 55);
  }

  function initGame() {
    round = 0; cleared = 0; done = false; endWait = 0; finished = false; holding = false;
    ready = 0.8; hitStop = 0; shake = 0;
    targetR = newTarget(0); tol = 22; curR = START_R;
  }

  function drawBall(r, color) {
    game.draw.circle(CX, CY + 40, r * 0.4, '#00000018');
    game.draw.circle(CX, CY, r, C.snowShade);
    game.draw.circle(CX, CY, r * 0.9, color);
    game.draw.sprite(MASCOT, { '#': C.ink }, CX, CY, Math.max(4, r / 26), { anchor: 'center', alpha: 0.15 });
  }

  function evalRelease(x, y) {
    if (done || ready > 0 || finished) return;
    var diff = Math.abs(curR - targetR);
    if (diff <= tol) {
      cleared++;
      game.feedback.good(x, y, { text: 'NICE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_powerup', 0.4);
      if (cleared === 2) game.fx.popup('あと1個!', CX, CY - 220, { color: C.gold, size: 34 });
      hitStop = 0.12;
      round++;
      if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
      targetR = newTarget(round); curR = START_R; holding = false;
    } else {
      game.feedback.bad(x, y, { text: diff > 0 && curR > targetR ? 'BIG' : 'SMALL' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      hitStop = 0.3;
      ok = false; finished = true; finish();
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    holding = true;
    game.audio.play('se_tap', 0.06);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holding) return;
    holding = false;
    evalRelease(x, y);
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

  var demo = { t: 0, gx: CX - 140, gy: CY, gx2: CX + 140, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { curR = START_R; targetR = 130; tol = 22; }
    if (cyc < 2.0) {
      var p = cyc / 2.0;
      curR = START_R - (START_R - targetR) * p;
      demo.press = true;
    } else {
      demo.press = false;
    }
    demo.gx = CX - curR - 30; demo.gy = CY; demo.gx2 = CX + curR + 30;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      game.draw.circle(CX, CY, targetR + tol, '#00000012');
      game.draw.circle(CX, CY, targetR - tol, '#00000012');
      drawBall(curR, C.snow);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.hand(demo.gx2, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.ink);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBall(curR, ok ? C.good : C.bad);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '個!', W / 2, H * 0.17, 24, C.ink);
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
    } else if (holding && !finished) {
      curR = Math.max(30, curR - dt * 90);
      if (curR <= 30) {
        game.feedback.bad(CX, CY, { text: 'SMALL' });
        shake = 0.3; game.audio.play('se_bad', 0.4); hitStop = 0.3;
        holding = false; ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    game.draw.circle(CX, CY, targetR + tol, '#00000018');
    game.draw.circle(CX, CY, targetR - tol, '#00000018');
    if (!finished) drawBall(curR, C.snow);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000018', 1);
    game.draw.rect(60, 150, (W - 120) * (cleared / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.4], ['B4', 0.4], ['D5', 0.4], ['G5', 0.6]], { tempo: 120, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
