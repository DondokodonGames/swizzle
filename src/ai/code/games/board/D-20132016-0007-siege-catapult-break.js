// D-20132016-0007-siege-catapult-break.js
// 攻城カタパルト・ブレイク — 巻き上げレバーを長押しで力を溜め、離して城門の塔を撃ち崩す
// 操作: 画面を長押しして力ゲージを溜め、狙い目の範囲内で指を離して発射する
// 終わり: 塔に3回良い一撃を当てれば成功。溜めすぎて暴発するか規定時間切れなら失敗
// @mechanic: hold_charge
// @theme: siege_catapult_break
// 世界観: 城壁都市を囲む攻城戦。投石機の巻き上げレバーを長押しで溜め、狙い目のタイミングで離して城門の塔を撃ち崩す攻城兵
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中させた一撃数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめドット、太い輪郭、彩度高めの限定色
  var C = {
    bg1: '#4a3320', bg2: '#241608', wall: '#8a7050', wallDark: '#5a4530',
    tower: '#9a5a3a', good: '#4dff8a', bad: '#ff4d5e', over: '#ff8a3a',
    gold: '#ffd400', white: '#fff4e0', ink: '#1a0e04',
  };

  var GAME_TITLE = 'SIEGE BREAK';
  var WIN_SCORE = 3;
  var MAX_TIME = 14;
  var CHARGE_MAX = 1.4;
  var GOOD_MIN = 0.55, GOOD_MAX = 0.85; // MAX比の良ゾーン
  var CX = W * 0.5, TOWER_Y = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, hits = 0;

  var charging, chargeT, towerHp, done, endWait, finished, playElapsed, milestoneShown, shotFlash, shotGood;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SOLDIER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(el * 1.3));
    for (var i = 0; i < 4; i++) game.draw.rect(60 + i * 260, H * 0.66, 120, H * 0.14, C.wallDark, 0.3);
  }

  function initGame() {
    charging = false; chargeT = 0; towerHp = WIN_SCORE; hits = 0;
    done = false; endWait = 0; finished = false; playElapsed = 0; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0; shotFlash = 0; shotGood = false;
  }

  function launch(power) {
    var ratio = power / CHARGE_MAX;
    if (ratio > 1.02) {
      // 暴発: 溜めすぎ
      hitStop = 0.35; ok = false; finished = true;
      game.feedback.bad(CX, H * 0.86, { text: 'MISS' });
      shake = 0.32;
      game.audio.play('se_bad', 0.45);
      finish();
      return;
    }
    var good = ratio >= GOOD_MIN && ratio <= GOOD_MAX;
    shotFlash = 0.3; shotGood = good;
    if (good) {
      hits++; towerHp--;
      hitStop = 0.12;
      game.feedback.good(CX, TOWER_Y, { text: 'HIT', color: C.good });
      game.fx.burst(CX, TOWER_Y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_break', 0.5);
      if (!milestoneShown && hits === Math.ceil(WIN_SCORE / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.16, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (towerHp <= 0) { ok = true; finished = true; finish(); return; }
    } else {
      hitStop = 0.15;
      game.feedback.bad(CX, TOWER_Y, { text: ratio < GOOD_MIN ? 'あと少し!' : 'MISS' });
      shake = 0.14;
      game.audio.play('se_bad', 0.3);
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || done) return;
    charging = true; chargeT = 0;
    game.audio.play('se_tap', 0.08);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !charging) return;
    charging = false;
    if (ready > 0 || finished || done) return;
    var p = chargeT;
    chargeT = 0;
    game.audio.play('se_powerup', 0.3);
    launch(p);
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

  function drawScene(hp, curCharge, bobT, flash, flashGood) {
    // 塔
    var shakeX = flash > 0 ? (Math.random() - 0.5) * 10 : 0;
    game.draw.rect(CX - 110 + shakeX, TOWER_Y - 140, 220, 260, flash > 0 ? (flashGood ? C.white : C.bad) : C.tower);
    game.draw.rect(CX - 110 + shakeX, TOWER_Y - 160, 220, 26, C.wallDark);
    for (var i = 0; i < WIN_SCORE; i++) {
      game.draw.circle(CX - 60 + i * 60, TOWER_Y - 190, 16, i < WIN_SCORE - hp ? C.bad : C.good);
    }
    // 兵士とレバー
    var by = H * 0.86 + Math.sin(bobT * 2.5) * 4;
    game.draw.sprite(SOLDIER, { '#': C.gold }, CX + Math.cos(bobT * 1.9) * 3, by, 22, { anchor: 'center' });
    var ratio = Math.min(1, curCharge / CHARGE_MAX);
    game.draw.rect(W * 0.18, H * 0.94, W * 0.64, 26, C.ink, 0.5);
    var barCol = ratio > 1 ? C.over : (ratio >= GOOD_MIN && ratio <= GOOD_MAX ? C.good : C.gold);
    game.draw.rect(W * 0.18, H * 0.94, W * 0.64 * ratio, 26, barCol);
    game.draw.rect(W * 0.18 + W * 0.64 * GOOD_MIN, H * 0.94, W * 0.64 * (GOOD_MAX - GOOD_MIN), 26, C.white, 0.35);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  var DEMO_CYC = 2.6;
  var demoCharge = 0, demoHp = WIN_SCORE, demoFlash = 0;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoHp = WIN_SCORE; }
    var target = CHARGE_MAX * (GOOD_MIN + GOOD_MAX) / 2;
    if (cyc < 1.6) {
      demo.press = true;
      demoCharge = target * (cyc / 1.6);
      demoFlash = 0;
    } else if (cyc < 1.9) {
      demo.press = false;
      if (demoFlash <= 0 && demoCharge > 0) {
        demoFlash = 0.3; demoHp = Math.max(0, demoHp - 1);
      }
      demoCharge = 0;
    } else {
      demo.press = false; demoFlash = 0; demoCharge = 0;
    }
    if (demoFlash > 0) demoFlash -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demoHp, demoCharge, game.time.elapsed, demoFlash, true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(towerHp, 0, game.time.elapsed, 0, true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + WIN_SCORE, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + Math.max(0, WIN_SCORE - hits) + '発!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: WIN_SCORE });
        else game.end.failure({ hits: hits, total: WIN_SCORE });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playElapsed += dt;
      if (playElapsed > MAX_TIME) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(CX, H * 0.5, { text: 'TIME UP' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (charging) {
        chargeT += dt;
        if (chargeT >= CHARGE_MAX * 1.35) {
          // 溜めすぎっぱなしのフェイルセーフ: 強制暴発
          charging = false;
          launch(chargeT);
        }
      }
    }
    if (shotFlash > 0) shotFlash -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawScene(towerHp, chargeT, game.time.elapsed, shotFlash, shotGood);

    txt(hits + ' / ' + WIN_SCORE, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / WIN_SCORE), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
