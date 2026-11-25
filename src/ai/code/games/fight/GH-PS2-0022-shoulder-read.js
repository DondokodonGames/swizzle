// GH-PS2-0022-shoulder-read.js
// ショルダーリード — 相手の殴りをかわして返す。かわす方向は相手の肩で分かる
// 操作: 相手の肩が傾いた側と逆方向にタップしてかわし、そのままカウンター
// 終わり: 3本先取で勝ち。取られれば負け
// @mechanic: judge
// @theme: alley_brawl
// 世界観: 路地裏の喧嘩。相手は殴る直前に肩がどちらかに傾く。傾いた側と逆をタップすればかわしてカウンターできる
// 残るもの: 勝敗(CLEAR/GAME OVER) + スコア(勝った本数)
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    bg1: '#5a6a7a', bg2: '#3a4a5a', p1: '#4a7ae0', p2: '#e05a4a', p1dark: '#2a5ab0', p2dark: '#b03a2a',
    good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#ffffff', ink: '#101418',
  };

  var GAME_TITLE = 'SHOULDER READ';
  var WIN_SCORE = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, myScore = 0, oppScore = 0;

  var phase, phaseT, lean, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function outline(x, y, w, h, fill) {
    game.draw.rect(x - 8, y - 8, w + 16, h + 16, C.ink);
    game.draw.rect(x, y, w, h, fill);
  }

  var CX = W / 2, P1Y = H * 0.62, P2Y = H * 0.32;

  function alleyBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(i * 190, H * 0.16, 6, H * 0.55, C.ink, 0.2);
  }

  var P1_SPRITE = ['.##.', '####', '.##.', '#.#.'];
  var P2_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function drawFighters(leanX) {
    outline(CX - 100, P1Y - 60, 200, 120, C.p1);
    game.draw.sprite(P1_SPRITE, { '#': C.p1dark }, CX - 60, P1Y, 30, { anchor: 'center' });
    outline(CX + leanX - 100, P2Y - 60, 200, 120, C.p2);
    game.draw.sprite(P2_SPRITE, { '#': C.p2dark }, CX + 60 + leanX, P2Y, 30, { anchor: 'center' });
  }

  function newRound() {
    phase = 'wait'; phaseT = 0.6 + Math.random() * 0.6; lean = 0;
  }

  function initGame() {
    myScore = 0; oppScore = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  var leanDir = 1;
  function resolveRound(pickedLeft) {
    var correct = leanDir < 0 ? pickedLeft : !pickedLeft;
    hitStop = 0.1;
    if (correct) {
      myScore++;
      game.feedback.good(CX, H * 0.46, { text: 'COUNTER', color: C.good });
      game.fx.burst(CX, H * 0.46, { color: C.gold, count: 14, speed: 340 });
      game.audio.play('se_success', 0.4);
    } else {
      oppScore++;
      game.feedback.bad(CX, H * 0.46, { text: 'HIT' });
      shake = 0.16;
      game.audio.play('se_bad', 0.35);
    }
    if (myScore >= WIN_SCORE) { ok = true; finished = true; finish(); }
    else if (oppScore >= WIN_SCORE) { ok = false; finished = true; finish(); }
    else { newRound(); game.fx.popup(myScore + '-' + oppScore, W / 2, H * 0.16, { color: C.gold, size: 44 }); }
  }

  function tapSide(left) {
    if (done || ready > 0 || hitStop > 0 || finished || phase !== 'strike') return;
    resolveRound(left);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapSide(x < W / 2);
  });

  // ── ATTRACT ゴースト実演: 肩の傾きと逆をタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, phase: 'wait', phaseT: 0.8, lean: 0, dir: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.phaseT -= dt;
    phase = demo.phase; lean = demo.lean; leanDir = demo.dir;
    if (demo.phase === 'wait' && demo.phaseT <= 0) { demo.dir = Math.random() < 0.5 ? -1 : 1; demo.phase = 'lean'; demo.phaseT = 0.4; }
    else if (demo.phase === 'lean') {
      demo.lean = demo.dir * 40 * (1 - demo.phaseT / 0.4);
      if (demo.phaseT <= 0) { demo.phase = 'strike'; demo.phaseT = 0.3; }
    } else if (demo.phase === 'strike') {
      var tx = demo.dir < 0 ? W * 0.28 : W * 0.72;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.press = demo.phaseT < 0.2 && demo.phaseT > 0.1;
      if (demo.press && demo.phaseT < 0.2 && demo.phaseT > 0.17) { game.feedback.good(CX, H * 0.46, { text: 'COUNTER', color: C.good }); game.fx.burst(CX, H * 0.46, { color: C.gold, count: 10, speed: 300 }); }
      if (demo.phaseT <= 0) { demo.phase = 'wait'; demo.phaseT = 0.9; demo.lean = 0; demo.press = false; demo.gx = CX; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      alleyBg();
      stepDemo(dt);
      drawFighters(lean);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 42, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 32, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      alleyBg();
      drawFighters(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(myScore + ' - ' + oppScore, W / 2, H * 0.13, 36, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 28, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ score: myScore + '-' + oppScore });
        else game.end.failure({ score: myScore + '-' + oppScore });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT -= dt;
      if (phase === 'wait' && phaseT <= 0) { leanDir = Math.random() < 0.5 ? -1 : 1; phase = 'lean'; phaseT = 0.4; }
      else if (phase === 'lean') {
        lean = leanDir * 40 * (1 - phaseT / 0.4);
        if (phaseT <= 0) { phase = 'strike'; phaseT = 0.3; }
      } else if (phase === 'strike' && phaseT <= 0) {
        oppScore++;
        game.feedback.bad(CX, H * 0.46, { text: 'HIT' });
        shake = 0.16;
        game.audio.play('se_bad', 0.3);
        if (oppScore >= WIN_SCORE) { ok = false; finished = true; finish(); }
        else newRound();
      }
    }
    if (shake > 0) shake -= dt;

    alleyBg();
    drawFighters(lean);

    txt(myScore + ' - ' + oppScore, W / 2, H * 0.10, 38, C.white);
    game.draw.rect(60, 40, W - 120, 18, C.ink, 0.5);
    game.draw.rect(60, 40, (W - 120) * (myScore / WIN_SCORE), 18, C.gold);
    txt(myScore + ' / ' + WIN_SCORE, W / 2, 104, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 60, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
