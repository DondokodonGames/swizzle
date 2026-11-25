// GH-PS-0122-shutter-chance.js
// シャッターチャンス — 被写体が決めポーズをした瞬間にシャッターを押す
// 操作: 被写体が本当のポーズ(両手を広げる)を決めた瞬間にタップ。中途半端な構えは偽物
// 終わり: 3回のチャンス。良い写真が撮れた回数が残る
// @mechanic: timing_one_shot
// @theme: photo_shoot
// 世界観: スタジオでの撮影。被写体は何度か構えかけて止まる(偽物)。本当に両手を広げて決めた瞬間だけシャッターチャンス
// 残るもの: 撮れた枚数(SCORE) + 挑戦回数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: パステル。白縁の丸い形、上下に情報を分ける名残
  var C = {
    bg1: '#ffe8f0', bg2: '#ffd6e6', studio: '#f0e0f0', good: '#5ac88a', bad: '#ff6a80', gold: '#ffb020', white: '#ffffff', ink: '#5a4a5a',
  };

  var GAME_TITLE = 'SHUTTER CHANCE';
  var CHANCES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0, good = 0;

  var chanceIdx, phase, phaseT, poseIdx, poseTotal, resolved, done, endWait;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, SUBJ_Y = H * 0.42;
  var POSE_FAKE = ['.#.', '###', '.#.', '#.#'];
  var POSE_REAL = ['#.#', '###', '.#.', '#.#'];

  function studioBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // スタジオの光の帯(横に流れる、ATTRACT差分検出のためにも使う)
    var pillarX = (game.time.elapsed * 320) % (W + 300) - 150;
    game.draw.rect(pillarX, 0, 220, H, '#7a3a8a', 0.20);
    game.draw.circle(CX, SUBJ_Y, 260, C.studio, 0.6);
    game.draw.rect(0, H * 0.78, W, 6, C.white, 0.7);
  }

  function drawSubject(real) {
    game.draw.circle(CX, SUBJ_Y + 130, 90, '#00000018');
    game.draw.sprite(real ? POSE_REAL : POSE_FAKE, { '#': real ? C.gold : C.ink }, CX, SUBJ_Y, 28, { anchor: 'center' });
  }

  function newChance() {
    phase = 'wait'; phaseT = 0.5 + Math.random() * 0.5; poseIdx = 0; poseTotal = 1 + Math.floor(Math.random() * 2); resolved = false;
  }

  function initGame() {
    chanceIdx = 0; good = 0; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newChance();
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0 || resolved) return;
    hitStop = 0.08;
    game.audio.play('se_tap', 0.15);
    if (phase === 'real') {
      good++; resolved = true;
      game.feedback.good(CX, SUBJ_Y, { text: 'NICE', color: C.good });
      game.fx.burst(CX, SUBJ_Y, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      resolved = true;
      game.feedback.bad(CX, SUBJ_Y, { text: 'MISS' });
      shake = 0.1;
      game.audio.play('se_bad', 0.3);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = good * 100;
    game.audio.stopBgm();
    game.audio.play(good > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 本物のポーズだけでタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.72, press: false, phase: 'wait', phaseT: 0.6, poseIdx: 0, poseTotal: 2 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    phase = demo.phase;
    if (demo.phase === 'wait' && demo.phaseT <= 0) { demo.phase = demo.poseIdx < demo.poseTotal ? 'fake' : 'real'; demo.phaseT = demo.phase === 'fake' ? 0.3 : 0.35; }
    else if (demo.phase === 'fake' && demo.phaseT <= 0) { demo.poseIdx++; demo.phase = 'wait'; demo.phaseT = 0.35; }
    else if (demo.phase === 'real') {
      demo.press = demo.phaseT < 0.24 && demo.phaseT > 0.14;
      if (demo.press && demo.phaseT < 0.24 && demo.phaseT > 0.21) { game.feedback.good(CX, SUBJ_Y, { text: 'NICE', color: C.good }); game.fx.burst(CX, SUBJ_Y, { color: C.gold, count: 10, speed: 300 }); }
      if (demo.phaseT <= 0) { demo.phase = 'wait'; demo.phaseT = 0.9; demo.poseIdx = 0; demo.poseTotal = 1 + Math.floor(Math.random() * 2); demo.press = false; }
    } else { demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      studioBg();
      stepDemo(dt);
      drawSubject(demo.phase === 'real');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 50, C.ink);
      txt('BEST ' + game.best, W / 2, H * 0.14, 28, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 34, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 30, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      studioBg();
      drawSubject(false);
      txt(good >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 54, good >= 2 ? C.ink : C.bad);
      txt('GOOD SHOT ' + good + ' / ' + CHANCES, W / 2, H * 0.62, 38, C.gold);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.68, 30, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.74, 32, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 32, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: good + '/' + CHANCES }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      phaseT -= dt;
      if (phase === 'wait' && phaseT <= 0) { phase = poseIdx < poseTotal ? 'fake' : 'real'; phaseT = phase === 'fake' ? 0.28 : 0.36; }
      else if (phase === 'fake' && phaseT <= 0) { poseIdx++; phase = 'wait'; phaseT = 0.3 + Math.random() * 0.2; }
      else if (phase === 'real' && phaseT <= 0) {
        if (!resolved) { game.feedback.bad(CX, SUBJ_Y, { text: 'MISS' }); shake = 0.08; }
        chanceIdx++;
        if (chanceIdx >= CHANCES) finish();
        else { newChance(); game.fx.popup(chanceIdx + ' / ' + CHANCES, W / 2, H * 0.18, { color: C.gold, size: 42 }); }
      }
    }
    if (shake > 0) shake -= dt;

    studioBg();
    drawSubject(phase === 'real');

    game.draw.rect(60, 40, W - 120, 22, C.white, 0.6);
    game.draw.rect(60, 40, (W - 120) * (chanceIdx / CHANCES), 22, C.gold);
    txt(chanceIdx + ' / ' + CHANCES, W / 2, 104, 38, C.ink);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 66, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
