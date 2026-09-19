// GH-DS-0003-flash-count-recall.js
// フラッシュ・カウント・リコール — 一瞬散らばる金の星だけを数えて、数字ボタンで答える
// 操作: 金と銀の星が一瞬散らばる。金の星の数だけを数え、消えたあとに並ぶ数字ボタンをタップして答える
// 終わり: 3問正解でCLEAR。2問間違えるとGAME OVER
// @mechanic: counting
// @theme: giant_quizmaster_flash
// 世界観: 巨大な司会者が仕切るクイズ番組。一瞬のフラッシュで散らばる金の星だけを数え、銀の星には惑わされない
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ。床に楕円影。背景は横1層で十分
  var C = {
    bg1: '#3a2a6a', bg2: '#1a1240', stage: '#241a4a', stageLine: '#4a3a8a',
    host: '#ffb347', hostDark: '#c97e1f', gold: '#ffd400', silver: '#cfd6e0',
    good: '#4de08a', bad: '#ff4d5e', white: '#ffffff', ink: '#140a2a',
  };

  var GAME_TITLE = 'COUNT RECALL';
  var NEEDED = 3, LOSE = 2;
  var CX = W / 2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var correct, wrong, phase, phaseT, stars, goldCount, chosen, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HOST_BODY = ['.####.', '######', '######', '.####.', '.#..#.'];

  function stageBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.66, W, 6, C.stageLine, 0.6);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.10 + i * 16, W, 2, '#ffffff', 0.04);
  }

  function drawHost() {
    game.draw.circle(CX, H * 0.80, 90, C.ink, 0.35); // 床の影
    game.draw.sprite(HOST_BODY, { '#': C.host }, CX, H * 0.74, 46, { anchor: 'center' });
  }

  var STAR = ['.#.', '###', '.#.'];

  function genStars() {
    stars = [];
    var total = 6 + Math.floor(Math.random() * 3); // 6〜8個
    goldCount = 2 + Math.floor(Math.random() * 3);  // 2〜4個が金(正解対象)
    if (goldCount >= total) goldCount = total - 2;
    for (var i = 0; i < total; i++) {
      stars.push({
        x: W * 0.18 + Math.random() * W * 0.64,
        y: H * 0.24 + Math.random() * H * 0.30,
        gold: i < goldCount,
      });
    }
    // シャッフル
    for (var j = stars.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = stars[j]; stars[j] = stars[k]; stars[k] = t; }
  }

  function newRound() {
    genStars();
    phase = 'flash'; phaseT = 0.9; chosen = -1;
  }

  function initGame() {
    correct = 0; wrong = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  var BTN_Y = H * 0.88, BTN_W = 130, BTN_GAP = 20;
  function btnX(i, n) {
    var totalW = n * BTN_W + (n - 1) * BTN_GAP;
    var start = CX - totalW / 2 + BTN_W / 2;
    return start + i * (BTN_W + BTN_GAP);
  }

  function choices() {
    var opts = [goldCount];
    while (opts.length < 3) {
      var v = goldCount + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 2));
      if (v >= 0 && opts.indexOf(v) < 0) opts.push(v);
    }
    for (var i = opts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = opts[i]; opts[i] = opts[j]; opts[j] = t; }
    return opts;
  }
  var currentChoices;

  function answer(idx, val) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'answer') return;
    game.audio.play('se_tap', 0.05);
    chosen = idx;
    hitStop = 0.16;
    if (val === goldCount) {
      correct++;
      game.feedback.good(btnX(idx, currentChoices.length), BTN_Y, { text: 'CORRECT', color: C.good });
      game.fx.burst(btnX(idx, currentChoices.length), BTN_Y, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_success', 0.35);
      if (correct === Math.ceil(NEEDED / 2)) { game.fx.popup(correct + ' / ' + NEEDED, CX, H * 0.10, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
      if (correct >= NEEDED) { ok = true; finished = true; finish(); } else { phase = 'wait'; phaseT = 0.5; }
    } else {
      wrong++;
      shake = 0.2;
      game.feedback.bad(btnX(idx, currentChoices.length), BTN_Y, { text: 'WRONG' });
      game.audio.play('se_bad', 0.35);
      if (wrong >= LOSE) { ok = false; finished = true; finish(); } else { phase = 'wait'; phaseT = 0.5; }
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    if (phase !== 'answer') return;
    for (var i = 0; i < currentChoices.length; i++) {
      var bx = btnX(i, currentChoices.length);
      if (Math.abs(x - bx) < BTN_W / 2 && Math.abs(y - BTN_Y) < 60) { answer(i, currentChoices[i]); return; }
    }
  });

  function stepPlay(dt) {
    phaseT -= dt;
    if (phase === 'flash' && phaseT <= 0) {
      phase = 'answer'; currentChoices = choices();
      game.audio.play('se_coin', 0.15);
    } else if (phase === 'wait' && phaseT <= 0 && !finished) {
      newRound();
    }
  }

  // ── ATTRACT ゴースト実演: 数えて正解ボタンを押す成功例1回、焦って隣のボタンを押す失敗例1回 ──
  var demo = { t: 0, gx: CX, gy: H * 0.98, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { goldCount = 3; genStars(); goldCount = 3; for (var i = 0; i < stars.length; i++) stars[i].gold = i < 3; currentChoices = [3, 2, 5]; }
    phase = cyc < 0.9 ? 'flash' : 'answer';

    if (cyc >= 0.9 && cyc < 2.3) {
      var tx = btnX(0, 3);
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (BTN_Y - demo.gy) * Math.min(1, dt * 4);
      demo.press = cyc > 2.05 && cyc < 2.17;
      if (cyc - dt <= 2.05) { game.feedback.good(tx, BTN_Y, { text: 'CORRECT', color: C.good }); game.fx.burst(tx, BTN_Y, { color: C.gold, count: 12, speed: 320 }); }
    } else if (cyc >= 2.3 && cyc < 3.2) {
      demo.gx += (CX - demo.gx) * Math.min(1, dt * 3);
      demo.gy += ((H * 0.98) - demo.gy) * Math.min(1, dt * 3);
      demo.press = false;
    } else if (cyc >= 3.2 && cyc < 4.6) {
      phase = cyc < 3.8 ? 'flash' : 'answer';
      var tx2 = btnX(1, 3);
      demo.gx += (tx2 - demo.gx) * Math.min(1, dt * 4);
      demo.gy += (BTN_Y - demo.gy) * Math.min(1, dt * 4);
      demo.press = cyc > 4.35 && cyc < 4.47;
      if (cyc - dt <= 4.35) { game.feedback.bad(tx2, BTN_Y, { text: 'WRONG' }); }
    }
  }

  function drawStars() {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      game.draw.sprite(STAR, { '#': s.gold ? C.gold : C.silver }, s.x, s.y, 12, { anchor: 'center' });
    }
  }

  function drawButtons(cs, lit) {
    for (var i = 0; i < cs.length; i++) {
      var bx = btnX(i, cs.length);
      game.draw.rect(bx - BTN_W / 2, BTN_Y - 55, BTN_W, 110, C.white, lit ? 0.9 : 0.55);
      txt(String(cs[i]), bx, BTN_Y + 14, 44, chosen === i ? (ok ? C.good : C.bad) : C.ink);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (correct === undefined) initGame();
      stageBg();
      drawHost();
      stepDemo(dt);
      if (phase === 'flash') drawStars();
      if (currentChoices) drawButtons(currentChoices, phase === 'answer');
      game.draw.hand(demo.gx + Math.sin(game.time.elapsed * 2.3) * 12, demo.gy + Math.cos(game.time.elapsed * 1.7) * 12, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, CX, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + NEEDED : '-'), CX, H * 0.62, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', CX, H * 0.60, 34, C.gold);
      }
      return;
    }

    if (state === S.RESULT) {
      stageBg();
      drawHost();
      txt(ok ? 'CLEAR' : 'GAME OVER', CX, H * 0.06, 48, ok ? C.good : C.bad);
      txt(correct + ' / ' + NEEDED, CX, H * 0.62, 30, C.white);
      if (!ok && correct === NEEDED - 1) txt('あと1問!', CX, H * 0.67, 26, C.gold);
      if (ok && (game.best === 0 || correct > game.best)) txt('NEW RECORD', CX, H * 0.67, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', CX, H * 0.94, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ correct: correct }); else game.end.failure({ correct: correct });
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

    stageBg();
    drawHost();
    if (phase === 'flash') drawStars();
    if (phase === 'answer' && currentChoices) drawButtons(currentChoices, true);

    txt(correct + ' / ' + NEEDED, CX, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, H * 0.40, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.2], ['G5', 0.2], ['B5', 0.2], ['E6', 0.4]], { tempo: 160, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
