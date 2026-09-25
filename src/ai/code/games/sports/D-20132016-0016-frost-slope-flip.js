// D-20132016-0016-frost-slope-flip.js
// フロストスロープ — 凍った斜面を自動で滑走し、迫る岩をジャンプで飛び越え宙返りで得点を稼ぐ
// 操作: 迫る岩が飛越ゾーンに来た瞬間にタップしてジャンプ。空中で追いタップすると宙返りで加点
// 終わり: 規定本数の岩を全て飛び越えれば成功。1本でも当たれば失敗
// @mechanic: camera_run
// @theme: frozen_peak_descent
// 世界観: 凍てつく霊峰の直滑降コース。滑走者が次々現れる岩塊をジャンプで飛び越え、空中で宙返りを決めて滑り降りる
// 残るもの: 正誤(CLEAR/GAME OVER) + 飛び越えた岩数と決めた宙返り数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 横1pxストリップを奥ほど圧縮、地平線へ収束する床
  var C = {
    sky1: '#9fd8ff', sky2: '#e8f6ff', snow1: '#ffffff', snow2: '#d8ecff',
    rock: '#6a5648', rockDark: '#463930', flag: '#ff3d5a',
    good: '#37d97a', bad: '#ff3d5a', gold: '#ffcc33', white: '#0a1a2a', ink: '#ffffff',
  };

  var GAME_TITLE = 'FROST SLOPE';
  var TOTAL = 6;
  var CX = W * 0.5;
  var GROUND_Y = H * 0.80;
  var JUMP_Y0 = H * 0.36, JUMP_Y1 = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, flips, done, endWait, finished;
  var ready, hitStop, shake, round, rock, airT, airborne, canFlip;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#0a1a2a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, GROUND_Y, [[0, C.sky1], [1, C.sky2]]);
    // 収束する床(MODE7風ストリップ)
    var strips = 26;
    for (var i = 0; i < strips; i++) {
      var t = i / strips;
      var y = GROUND_Y + t * (H - GROUND_Y);
      var w = W * (0.3 + t * 0.9);
      var col = i % 2 === 0 ? C.snow1 : C.snow2;
      game.draw.rect(CX - w / 2, y, w, (H - GROUND_Y) / strips + 2, col);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function newRock() {
    var dur = Math.max(1.5, 2.6 - round * 0.18);
    return { t: 0, dur: dur, resolved: false, telegraphed: false };
  }

  function initGame() {
    cleared = 0; flips = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; rock = newRock(); airT = 0; airborne = false; canFlip = false;
  }

  function rockY(k) { return H * 0.14 + Math.min(1, k.t / k.dur) * (GROUND_Y - H * 0.14); }
  function rockScale(k) { return 0.3 + Math.min(1, k.t / k.dur) * 1.1; }

  function drawSkier(lean, jumpH) {
    var bob = airborne ? 0 : Math.sin(game.time.elapsed * 4) * 3;
    var y = GROUND_Y - 30 - jumpH - bob;
    var frames = airborne ? ['.##.', '####', '.##.', '#..#'] : ['.##.', '####', '.##.', '.##.'];
    game.draw.circle(CX + lean, GROUND_Y - 4, 34 * (1 - Math.min(0.6, jumpH / 300)), '#00000030');
    game.draw.sprite(frames, { '#': C.rockDark }, CX + lean, y, 16, { anchor: 'center', flipX: airborne && canFlip });
  }

  function jump() {
    if (done || finished || ready > 0 || airborne) return;
    var p = rock.t / rock.dur;
    if (p > 0.55 && p < 0.85 && !rock.resolved) {
      rock.resolved = true;
      airborne = true; airT = 0.55; canFlip = false;
      hitStop = 0.06;
      game.feedback.good(CX, GROUND_Y - 100, { text: 'GOOD', color: C.good });
      game.audio.play('se_jump', 0.5);
      cleared++;
      if (cleared === Math.ceil(TOTAL / 2)) { game.fx.popup(cleared + ' / ' + TOTAL, CX, H * 0.3, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (cleared >= TOTAL) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
      round++;
      rock = newRock();
    } else if (!rock.resolved) {
      game.feedback.bad(CX, GROUND_Y - 60, { text: 'MISS' });
      game.audio.play('se_tap', 0.15);
    }
  }

  function flipTrick() {
    if (!airborne || canFlip || done || finished) return;
    canFlip = true;
    flips++;
    game.fx.popup('SPIN', CX, GROUND_Y - 220, { color: C.gold, size: 34 });
    game.audio.play('se_powerup', 0.4);
    game.fx.burst(CX, GROUND_Y - 180, { color: C.gold, count: 12, speed: 260 });
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    if (airborne) flipTrick();
    else jump();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function drawRock(k) {
    if (!k) return;
    var y = rockY(k), sc = rockScale(k);
    var p = k.t / k.dur;
    if (p > 0.4 && p < 0.85) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) game.draw.circle(CX, y, 60 * sc, C.bad, 0.25);
    }
    game.draw.rect(CX - 34 * sc, y - 26 * sc, 68 * sc, 40 * sc, C.rock);
    game.draw.rect(CX - 34 * sc, y - 26 * sc, 68 * sc, 10 * sc, C.rockDark);
  }

  var demo = { t: 0, gx: CX, gy: GROUND_Y - 30, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!rock) { rock = newRock(); rock.dur = 1.6; round = 0; }
    if (!airborne) rock.t += dt;
    var p = rock.t / rock.dur;
    if (p > 0.6 && p < 0.75 && !rock.resolved) {
      demo.press = true;
      jump();
    } else demo.press = false;
    if (airborne) {
      airT -= dt;
      if (airT < 0.3 && !canFlip) flipTrick();
      if (airT <= 0) { airborne = false; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRock(rock);
      var jh = airborne ? Math.sin((0.55 - Math.max(0, airT)) / 0.55 * Math.PI) * 260 : 0;
      drawSkier(0, jh);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawSkier(0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '本!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, flips: flips });
        else game.end.failure({ cleared: cleared, total: TOTAL, flips: flips });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (airborne) {
        airT -= dt;
        if (airT <= 0) airborne = false;
      } else {
        rock.t += dt;
        if (rock.t / rock.dur >= 1 && !rock.resolved) {
          rock.resolved = true;
          hitStop = 0.35;
          game.feedback.bad(CX, GROUND_Y - 60, { text: 'HIT' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          ok = false; finished = true; finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawRock(rock);
    var jh2 = airborne ? Math.sin((0.55 - Math.max(0, airT)) / 0.55 * Math.PI) * 260 : 0;
    drawSkier(0, jh2);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, '#00000030');
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.4], ['B4', 0.4], ['D5', 0.4], ['G5', 0.8]], { tempo: 128, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
