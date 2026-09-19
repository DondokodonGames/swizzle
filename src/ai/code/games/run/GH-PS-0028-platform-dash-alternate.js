// GH-PS-0028-platform-dash-alternate.js
// プラットフォームダッシュ — 左右交互のタップで全力疾走し、発車間際の電車に飛び乗る
// 操作: 画面左右を交互にタップして走る。同じ側を連続で叩くとつまずく
// 終わり: ホームの端(進行度100%)に届けば成功。発車ベルが鳴り切るまでに届かなければ失敗
// @mechanic: alternate_tap
// @theme: station_platform
// 世界観: 夕方の駅のホーム。案内板の秒針が発車を刻む。左右の足を交互に踏み出して走者が電車まで駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%とコンボ最大値
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s ISO: 6〜8色、菱形グリッド、影で高さを示す
  var C = {
    sky1: '#2a3a5a', sky2: '#4a5a80', floor1: '#8a7a5a', floor2: '#a89a72',
    floorEdge: '#5a4e3a', pillar: '#6a6478', pillarDark: '#3f3b4d',
    train: '#3a7ac0', trainDark: '#204a80', trainWin: '#cfeaff',
    runner: '#ff8a3d', runnerDark: '#a4501a',
    good: '#5dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#100a1a',
  };

  var GAME_TITLE = 'PLATFORM DASH';
  var TIME_LIMIT = 12;
  var TRACK_X0 = W * 0.18, TRACK_X1 = W * 0.82;
  var RUN_Y = H * 0.56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var progress, lastSide, combo, maxCombo, totalTime, done, endWait, finished, ok, stumbleT;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUN_A = ['.##.', '####', '.##.', '#..#'];
  var RUN_B = ['.##.', '####', '.##.', '..#.'];
  var RUN_STUMBLE = ['.##.', '####', '#.#.', '.#..'];

  function isoBg() {
    game.draw.gradient(0, RUN_Y - 40, [[0, C.sky1], [1, C.sky2]]);
    // 菱形の柱(奥行き感)
    for (var i = -1; i < 6; i++) {
      var px = i * 220 + 60;
      game.draw.rect(px, H * 0.18, 30, RUN_Y - H * 0.18 - 30, C.pillarDark, 0.6);
      game.draw.circle(px + 15, H * 0.20, 26, C.pillar, 0.8);
    }
    // ホーム床(菱形タイル風の帯)
    game.draw.rect(0, RUN_Y - 30, W, H - (RUN_Y - 30), C.floor1);
    for (var j = 0; j < 12; j++) {
      var fy = RUN_Y - 30 + j * ((H - RUN_Y + 30) / 12);
      game.draw.rect(0, fy, W, 3, C.floorEdge, 0.4);
    }
    for (var k = -1; k < 10; k++) {
      game.draw.line(k * 130, RUN_Y - 30, k * 130 + 90, H, C.floor2, 4);
    }
  }

  function drawTrain(doorT) {
    var tx = TRACK_X1 + 40;
    game.draw.rect(tx - 30, RUN_Y - 220, 320, 220, C.train);
    game.draw.rect(tx - 30, RUN_Y - 220, 320, 30, C.trainDark);
    for (var w = 0; w < 3; w++) game.draw.rect(tx + 10 + w * 100, RUN_Y - 180, 70, 70, C.trainWin, 0.9);
    // ドア(発車間際に閉まる = telegraph)
    var doorW = 40 * (1 - doorT);
    game.draw.rect(tx - 10, RUN_Y - 150, doorW, 150, C.trainDark);
    game.draw.rect(tx + 290 - doorW, RUN_Y - 150, doorW, 150, C.trainDark);
  }

  function drawRunner(x, frame, stumble) {
    var shadow = 26;
    game.draw.circle(x, RUN_Y + 6, shadow, '#000000', 0.3);
    game.draw.sprite(stumble ? RUN_STUMBLE : frame, { '#': stumble ? C.bad : C.runner, '.': null }, x, RUN_Y - 50, 20, { anchor: 'center' });
  }

  function initGame() {
    progress = 0; lastSide = null; combo = 0; maxCombo = 0; totalTime = 0; done = false; endWait = 0;
    finished = false; ok = false; stumbleT = 0; ready = 0.8; hitStop = 0; shake = 0;
  }

  function stepTap(left) {
    if (done || ready > 0 || finished) return;
    if (lastSide === null || lastSide !== left) {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      var gain = 6 + Math.min(6, combo * 0.4);
      progress = Math.min(100, progress + gain);
      lastSide = left;
      var x = TRACK_X0 + (progress / 100) * (TRACK_X1 - TRACK_X0);
      game.feedback.good(x, RUN_Y - 60, { text: combo % 5 === 0 ? 'NICE' : null, color: C.good, sound: 'se_tap' });
      if (combo % 5 === 0) { game.fx.popup('COMBO x' + combo, W / 2, H * 0.22, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (progress >= 100) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); }
    } else {
      combo = 0; stumbleT = 0.25; shake = 0.14;
      var x2 = TRACK_X0 + (progress / 100) * (TRACK_X1 - TRACK_X0);
      progress = Math.max(0, progress - 4);
      game.feedback.bad(x2, RUN_Y - 60, { text: 'MISS' });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    stepTap(x < W / 2);
  });

  function finish() {
    if (done) return;
    done = true;
    finalScore = Math.round(progress);
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: 左右交互タップで加速、同側連打でつまずく例を1回 ──
  var demo = { t: 0, gx: W * 0.25, gy: H * 0.90, press: false, side: 'L' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt) { progress = 0; lastSide = null; combo = 0; stumbleT = 0; }
    if (cyc < 3.0) {
      var beat = Math.floor(cyc / 0.5);
      var wantLeft = beat % 2 === 0;
      demo.gx += ((wantLeft ? W * 0.25 : W * 0.75) - demo.gx) * Math.min(1, dt * 8);
      demo.press = (cyc % 0.5) < 0.18;
      if (Math.abs((cyc % 0.5) - 0.02) < dt) stepTap(wantLeft);
    } else if (cyc < 3.9) {
      // 失敗例: 同じ側(右)を連続で叩く
      demo.gx += (W * 0.75 - demo.gx) * Math.min(1, dt * 8);
      demo.press = (cyc % 0.35) < 0.15;
      if (Math.abs((cyc % 0.35) - 0.02) < dt) stepTap(false);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var doorT = Math.min(1, Math.max(0, (totalTime - (TIME_LIMIT - 1.0)) / 1.0));
    if (state === S.ATTRACT) {
      if (progress === undefined) initGame();
      isoBg();
      drawTrain(0.15 + 0.1 * Math.sin(game.time.elapsed * 3));
      stepDemo(dt);
      var rx0 = TRACK_X0 + (progress / 100) * (TRACK_X1 - TRACK_X0);
      drawRunner(rx0, lastSide === false ? RUN_B : RUN_A, stumbleT > 0);
      if (stumbleT > 0) stumbleT -= dt;
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 54, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + '%' : '-'), W / 2, H * 0.135, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 44, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      isoBg();
      drawTrain(1);
      var rx1 = TRACK_X0 + (progress / 100) * (TRACK_X1 - TRACK_X0);
      drawRunner(rx1, RUN_A, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 52, ok ? C.good : C.bad);
      txt(Math.round(progress) + ' / ' + 100, W / 2, H * 0.15, 32, C.white);
      txt('MAX COMBO ' + maxCombo, W / 2, H * 0.20, 26, C.gold);
      if (!ok && progress >= 85) txt('あと少し!', W / 2, H * 0.25, 30, C.gold);
      var best = Math.max(game.best, finalScore);
      if (finalScore >= game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.30, 30, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(finalScore, { maxCombo: maxCombo }); else game.end.failure({ progress: finalScore, maxCombo: maxCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      totalTime += dt;
      if (totalTime >= TIME_LIMIT) { ok = false; finished = true; finish(); }
      if (doorT > 0.05 && Math.floor(game.time.elapsed * 6) % 4 === 0) game.audio.tone(880, 0.05, { wave: 'square', volume: 0.05 });
      if (Math.floor(progress / 50) > Math.floor((progress) / 50) - 1 && progress >= 50 && !stumbleT) {
        // 50%ちょうどをまたいだ瞬間の一度だけ
      }
    }
    if (shake > 0) shake -= dt;
    if (stumbleT > 0) stumbleT -= dt;

    isoBg();
    drawTrain(doorT);
    var rx2 = TRACK_X0 + (progress / 100) * (TRACK_X1 - TRACK_X0);
    drawRunner(rx2, lastSide === false ? RUN_B : RUN_A, stumbleT > 0);

    game.draw.rect(60, 50, W - 120, 22, C.ink, 0.6);
    game.draw.rect(60, 50, (W - 120) * (progress / 100), 22, C.good);
    txt(Math.round(progress) + ' / ' + 100, W / 2, 114, 32, C.white);
    txt('COMBO ' + combo, W * 0.86, 114, 24, C.gold);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 76, C.gold);
    if (doorT > 0.05 && Math.floor(game.time.elapsed * 6) % 2 === 0) {
      game.draw.rect(0, H * 0.28, W, 60, C.bad, 0.25);
    }
  });

  game.onStart(function() {
    game.audio.melody(
      [['E4', 0.15], ['G4', 0.15], ['A4', 0.15], ['C5', 0.15], ['A4', 0.15], ['G4', 0.15]],
      { tempo: 160, wave: 'square', volume: 0.06, loop: true, bass: [['E3', 0.3], ['C3', 0.3]], bassWave: 'triangle', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
