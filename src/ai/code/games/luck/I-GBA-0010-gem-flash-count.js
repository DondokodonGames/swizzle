// I-GBA-0010-gem-flash-count.js
// ジェムフラッシュカウント — 見世物小屋の壺が一瞬だけ開き、中の宝石の数を覚えて数字ボタンで答える
// 操作: 壺が一瞬開いて宝石が見える。閉じたら覚えた個数の数字パネルをタップして答える
// 終わり: 規定回数(3回)連続で正しい個数を答えられれば成功。1回でも外せば失敗
// @mechanic: counting
// @theme: carnival_gem_jar
// 世界観: 縁日の見世物小屋。壺番が一瞬だけ壺を開けて見せる宝石の数を、客が言い当てる当て物芸
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解した回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン。gradient で厚みを作る
  var C = {
    bg: '#3a2416', bg2: '#241408', felt: '#5a2030', feltDark: '#3a1220',
    jar: '#e8dcc0', jarEdge: '#b8a878', gem: '#ff4d8a', gemCore: '#ffd0e0',
    good: '#3fd15a', bad: '#e0402a', gold: '#ffcf4a', white: '#f4ecd8', ink: '#1a0e06',
  };

  var GAME_TITLE = 'GEM COUNT';
  var ROUNDS = 3;
  var CX = W * 0.5, JAR_Y = H * 0.36;
  var BTN_Y = H * 1600 / 1920;
  var BTN_X = [W * 0.22, W * 0.5, W * 0.78];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, done, endWait, finished, ready, hitStop, shake;
  var phase, phaseT, gemCount, choices;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var JAR_SPRITE = ['.####.', '######', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.55, W, H * 0.4, C.feltDark);
    for (var i = 0; i < 8; i++) game.draw.line(i * W / 8, H * 0.55, i * W / 8, H * 0.95, C.felt, 3);
  }

  function newRound() {
    gemCount = Math.floor(game.random(2, 6));
    var opts = [gemCount];
    while (opts.length < 3) {
      var v = Math.floor(game.random(1, 6));
      if (opts.indexOf(v) < 0) opts.push(v);
    }
    // シャッフル
    for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(game.random(0, i + 1)); var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    choices = opts;
    phase = 'closed'; phaseT = 0.5;
  }

  function initGame() {
    correct = 0; done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawJar(open) {
    game.draw.sprite(JAR_SPRITE, { '#': C.jar }, CX, JAR_Y, 26, { anchor: 'center' });
    if (open) {
      var cols = 3;
      for (var i = 0; i < gemCount; i++) {
        var gx = CX - 60 + (i % cols) * 60;
        var gy = JAR_Y - 40 - Math.floor(i / cols) * 50;
        game.draw.circle(gx, gy, 20, C.gem);
        game.draw.circle(gx - 5, gy - 5, 8, C.gemCore);
      }
    }
  }

  function drawButtons(disabled) {
    for (var i = 0; i < choices.length; i++) {
      var x = BTN_X[i];
      game.draw.rect(x - 80, BTN_Y - 70, 160, 140, C.jarEdge);
      game.draw.rect(x - 72, BTN_Y - 62, 144, 124, disabled ? '#8a7a68' : C.gold);
      txt(String(choices[i]), x, BTN_Y + 16, 54, C.ink);
    }
  }

  function pickButton(x, y) {
    for (var i = 0; i < choices.length; i++) {
      if (Math.abs(x - BTN_X[i]) < 90 && Math.abs(y - BTN_Y) < 80) return i;
    }
    return -1;
  }

  function resolveAnswer(i) {
    if (finished || ready > 0 || done || phase !== 'answer') return;
    var success = choices[i] === gemCount;
    hitStop = success ? 0.12 : 0.32;
    if (success) {
      correct++;
      game.feedback.good(BTN_X[i], BTN_Y, { text: 'CORRECT', color: C.good });
      game.fx.burst(BTN_X[i], BTN_Y, { color: C.gold, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (correct === Math.ceil(ROUNDS / 2)) { game.fx.popup(correct + ' / ' + ROUNDS, CX, H * 0.2, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (correct >= ROUNDS) { ok = true; finished = true; finish(); } else { newRound(); }
    } else {
      game.feedback.bad(BTN_X[i], BTN_Y, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (phase !== 'answer' || finished || ready > 0) return;
      var i = pickButton(x, y);
      if (i >= 0) { game.audio.play('se_tap', 0.05); resolveAnswer(i); }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    phaseT -= dt;
    if (phase === 'closed' && phaseT <= 0) { phase = 'open'; phaseT = 0.8; game.audio.play('se_coin', 0.2); }
    else if (phase === 'open' && phaseT <= 0) { phase = 'answer'; }
  }

  var demo = { t: 0, gx: CX, gy: BTN_Y, press: false, phase: 'closed', phaseT: 0.5, gemCount: 3, choices: [3, 2, 4], picked: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) {
      demo.gemCount = 3; demo.choices = [4, 3, 2]; demo.phase = 'closed'; demo.phaseT = 0.5; demo.picked = false;
    }
    demo.phaseT -= dt;
    if (demo.phase === 'closed' && demo.phaseT <= 0) { demo.phase = 'open'; demo.phaseT = 0.8; }
    else if (demo.phase === 'open' && demo.phaseT <= 0) { demo.phase = 'answer'; }
    gemCount = demo.gemCount; choices = demo.choices; phase = demo.phase;
    if (phase === 'answer' && !demo.picked) {
      var idx = choices.indexOf(demo.gemCount);
      demo.gx = BTN_X[idx]; demo.gy = BTN_Y; demo.press = true; demo.picked = true;
      game.feedback.good(BTN_X[idx], BTN_Y, { text: 'CORRECT', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (demo.picked && cyc > 3.0) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawJar(phase !== 'closed');
      drawButtons(phase !== 'answer');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawJar(true);
      drawButtons(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(correct + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok && correct === ROUNDS - 1) txt('あと1問!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(correct, { correct: correct, total: ROUNDS });
        else game.end.failure({ correct: correct, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawJar(phase !== 'closed');
    drawButtons(phase !== 'answer');

    txt(correct + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * (correct / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['E4', 0.25], ['G4', 0.25], ['C5', 0.4]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
