// 073-sketch-guess.js
// スケッチゲス — 線が引かれ切る前に、その正体を当てる
// 操作: 下の3つの絵から、描かれつつある線画と同じものをタップ
// 成功: 5問 正解  失敗: 3問 誤答 or 13秒
// @mechanic: judge
// @theme: custom
// 世界観: お絵かきクイズ番組。少しずつ現れる線画の正体を3択で当てる
// variation: 加速型(線が引かれるテンポが問題ごとに速くなる)
// spice: サドンデス演出(台帳は二重課題だが、13秒で5問の尺に二問同時は成立しない。同リスト内で変更)
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 70s MONO: 白の線画 + 画面帯ごとの単色オーバーレイ
  var C = { white: '#ffffff', dim: '#8a8a8a', dark: '#1e1e1e', band1: '#39ff6a', band2: '#ff9a2a' };

  var GAME_TITLE = 'SKETCH GUESS';
  var MAX_TIME = 13;
  var NEEDED = 5;
  var MISS_LIMIT = 3;
  var SUDDEN = 3.0;   // 残りこの秒数からはサドンデス

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var answer, choices, shown, drawRate, solved, misses, score, totalTime, done;
  var ready, hitStop, feedback, feedbackOk, lockout;

  // 線画: [x1,y1,x2,y2] を 0..1 の単位座標で。順に引かれていく
  var SHAPES = [
    { id: 'house', seg: [[0.2,0.7,0.2,0.35],[0.2,0.35,0.5,0.12],[0.5,0.12,0.8,0.35],[0.8,0.35,0.8,0.7],[0.2,0.7,0.8,0.7],[0.42,0.7,0.42,0.5],[0.58,0.7,0.58,0.5]] },
    { id: 'fish',  seg: [[0.15,0.5,0.45,0.24],[0.45,0.24,0.75,0.5],[0.75,0.5,0.45,0.76],[0.45,0.76,0.15,0.5],[0.75,0.5,0.92,0.3],[0.75,0.5,0.92,0.7],[0.92,0.3,0.92,0.7]] },
    { id: 'tree',  seg: [[0.45,0.85,0.45,0.5],[0.55,0.85,0.55,0.5],[0.45,0.85,0.55,0.85],[0.5,0.5,0.2,0.5],[0.2,0.5,0.5,0.12],[0.5,0.12,0.8,0.5],[0.8,0.5,0.5,0.5]] },
    { id: 'boat',  seg: [[0.15,0.66,0.85,0.66],[0.15,0.66,0.28,0.82],[0.85,0.66,0.72,0.82],[0.28,0.82,0.72,0.82],[0.5,0.66,0.5,0.16],[0.5,0.16,0.78,0.6],[0.78,0.6,0.5,0.6]] },
    { id: 'key',   seg: [[0.22,0.5,0.62,0.5],[0.62,0.5,0.62,0.66],[0.72,0.5,0.72,0.7],[0.22,0.5,0.22,0.34],[0.22,0.34,0.38,0.34],[0.38,0.34,0.38,0.5],[0.72,0.5,0.86,0.5]] },
    { id: 'star',  seg: [[0.5,0.12,0.62,0.44],[0.62,0.44,0.94,0.44],[0.94,0.44,0.68,0.64],[0.68,0.64,0.78,0.92],[0.78,0.92,0.5,0.74],[0.5,0.74,0.22,0.92],[0.22,0.92,0.32,0.64]] },
  ];

  // 司会者(2フレーム: 口が動く)。番組という世界観の担い手
  var HOST_A = [
    '..WWWW..',
    '.WWWWWW.',
    'WWKWWKWW',
    'WWWWWWWW',
    'WWWKKWWW',
    '.WWWWWW.',
    '..WWWW..',
    '.W.WW.W.',
  ];
  var HOST_B = [
    '..WWWW..',
    '.WWWWWW.',
    'WWKWWKWW',
    'WWWWWWWW',
    'WWKKKKWW',
    '.WWWWWW.',
    '..WWWW..',
    'W..WW..W',
  ];
  var HOST_COL = { W: '#ffffff', K: '#1e1e1e' };

  function drawHost(x, y, scale) {
    var wob = Math.floor(game.time.elapsed * 5) % 2 === 0;
    game.draw.sprite(wob ? HOST_A : HOST_B, HOST_COL, x, y, scale, { anchor: 'center' });
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.22); }

  function studioBg() {
    game.draw.gradient(0, H, [[0, '#101010'], [0.5, '#060606'], [1, '#000000']]);
    // 遠景: スタジオの吊り照明と観覧席の影
    for (var l = 0; l < 5; l++) {
      game.draw.line(W * 0.1 + l * W * 0.2, 0, W * 0.1 + l * W * 0.2, 90, C.dark, 6);
      game.draw.circle(W * 0.1 + l * W * 0.2, 106, 26, C.white, 0.22);
    }
    for (var a = 0; a < 14; a++) game.draw.circle(50 + a * 78, H * 0.94, 34, C.dark);
    // 70s MONO の要: 帯ごとの単色セロハン
    game.draw.rect(0, 0, W, H * 0.28, C.band2, 0.10);
    game.draw.rect(0, H * 0.68, W, H * 0.32, C.band1, 0.09);
  }

  // 線画を描く: n本目まで、最後の1本は伸びる途中
  function drawShape(sh, cx, cy, size, n, partial, color, width) {
    for (var i = 0; i < sh.seg.length; i++) {
      if (i > n) break;
      var s = sh.seg[i];
      var t = (i === n) ? Math.max(0, Math.min(1, partial)) : 1;
      var x1 = cx + (s[0] - 0.5) * size, y1 = cy + (s[1] - 0.5) * size;
      var x2 = cx + (s[2] - 0.5) * size, y2 = cy + (s[3] - 0.5) * size;
      game.draw.line(x1, y1, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, color, width);
    }
  }

  function newQuestion() {
    var pool = SHAPES.slice();
    answer = Math.floor(Math.random() * pool.length);
    var others = [];
    for (var i = 0; i < pool.length; i++) if (i !== answer) others.push(i);
    others.sort(function() { return Math.random() - 0.5; });
    choices = [answer, others[0], others[1]];
    choices.sort(function() { return Math.random() - 0.5; });
    shown = 0;
    // 加速型: 問題が進むほど線が速く引かれる = 考える時間が減る
    drawRate = 1.6 + solved * 0.55;
    lockout = 0;
  }

  function initGame() {
    solved = 0; misses = 0; score = 0; totalTime = 0; done = false;
    ready = 0.8; hitStop = 0; feedback = 0; feedbackOk = false;
    newQuestion();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) { game.audio.play('se_success'); }
    else {
      game.audio.play('se_failure');
      hitStop = 0.5;
      game.fx.flash(C.white, 0.18);
    }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function answerWith(idx, x, y) {
    if (choices[idx] === answer) {
      solved++;
      // 早いほど高い: 引かれた線が少ないうちに当てるほど得点が伸びる
      var speedBonus = Math.max(0, Math.round((SHAPES[answer].seg.length - shown) * 40));
      var gain = 100 + speedBonus;
      score += gain;
      feedback = 0.3; feedbackOk = true;
      game.feedback.good(x, y, { text: '+' + gain, color: C.band1 });
      game.audio.play('se_success', 0.5);
      game.fx.burst(x, y, { color: C.white, count: 10, speed: 300 });
      if (solved >= NEEDED) { finish(true); return; }
      // 走行中のマイルストーン: 折り返しを祝う
      if (solved === Math.ceil(NEEDED / 2)) {
        game.fx.popup(solved + ' / ' + NEEDED, W / 2, H * 0.30, { color: C.band1, size: 72 });
        game.audio.play('se_milestone', 0.6);
      }
      newQuestion();
    } else {
      misses++;
      feedback = 0.4; feedbackOk = false;
      hitStop = 0.3;
      game.audio.play('se_failure', 0.6);
      game.feedback.bad(x, y, { text: 'MISS' });
      // サドンデス: 残り時間が僅かなら1回の誤答で終わる
      if (misses >= MISS_LIMIT || (MAX_TIME - totalTime) <= SUDDEN) { finish(false); return; }
      lockout = 0.4;
    }
  }

  function choiceBox(i) {
    return { x: W * (0.2 + i * 0.3), y: H * 0.80, r: 150 };
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ready > 0 || hitStop > 0 || lockout > 0) return;
    for (var i = 0; i < 3; i++) {
      var b = choiceBox(i);
      if (Math.abs(x - b.x) < b.r * 0.6 && Math.abs(y - b.y) < b.r * 0.6) { answerWith(i, b.x, b.y); return; }
    }
    game.audio.play('se_tap', 0.25);
  });

  // ── ATTRACT ゴースト実演: 線が2本引かれた時点で手が正解へ落ちる ──
  var demo = { t: 0, ans: 0, gx: W / 2, gy: H * 0.6, press: false, pick: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < 0.05) {
      demo.ans = Math.floor(Math.random() * SHAPES.length);
      demo.pick = Math.floor(Math.random() * 3);
    }
    var b = choiceBox(demo.pick);
    if (cyc > 1.4) {
      demo.gx += (b.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (b.y - demo.gy) * Math.min(1, dt * 5);
      if (cyc > 1.9 && !demo.press) {
        demo.press = true;
        game.feedback.good(b.x, b.y, { text: '+220', color: C.band1 });
      }
    } else {
      demo.press = false;
      demo.gx += (W / 2 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.62 - demo.gy) * Math.min(1, dt * 3);
    }
    return cyc;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      studioBg();
      var cyc = stepDemo(dt);
      var sh = SHAPES[demo.ans];
      drawShape(sh, W / 2, H * 0.36, 560, Math.floor(cyc * 2.2), (cyc * 2.2) % 1, C.white, 10);
      for (var i0 = 0; i0 < 3; i0++) {
        var b0 = choiceBox(i0);
        game.draw.rect(b0.x - 130, b0.y - 130, 260, 260, C.dark);
        var s0 = i0 === demo.pick ? sh : SHAPES[(demo.ans + i0 + 1) % SHAPES.length];
        drawShape(s0, b0.x, b0.y, 190, 99, 1, C.dim, 5);
      }
      drawHost(W * 0.12, H * 0.62, 14);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 72, C.white);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.13, 38, C.band1);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 56, C.band2);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 46, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      studioBg();
      if (hitStop > 0) hitStop -= dt;
      drawHost(W / 2, H * 0.22, 20);
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.40, 96, C.white);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.50, 58, C.band1);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.57, 44, C.dim);
      if (resultSuccess && finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.65, 54, C.band2);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.70, 46, C.white);
      }
      scanlines();
      return;
    }

    // ── PLAYING ──
    var sudden = (MAX_TIME - totalTime) <= SUDDEN;
    if (!done) {
      if (hitStop > 0) {
        hitStop -= dt;
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap');
      } else {
        totalTime += dt;
        if (totalTime >= MAX_TIME) { finish(solved >= NEEDED); return; }
        shown += drawRate * dt;
        if (lockout > 0) lockout -= dt;
        // 線を引き切っても答えないと、次の線が無いまま時間だけ減る(欲張りの逆)
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    studioBg();
    var sh2 = SHAPES[answer];
    var n = Math.floor(shown);
    drawShape(sh2, W / 2, H * 0.36, 560, n, shown % 1, C.white, 12);

    // 3択(完成形の小さな線画。文字は使わない)
    for (var i = 0; i < 3; i++) {
      var b = choiceBox(i);
      game.draw.rect(b.x - 130, b.y - 130, 260, 260, C.dark);
      game.draw.rect(b.x - 130, b.y - 130, 260, 6, sudden ? C.band2 : C.dim, 0.8);
      drawShape(SHAPES[choices[i]], b.x, b.y, 190, 99, 1, C.white, 5);
    }

    // 司会者はサドンデスで身を乗り出す(telegraphの一部)
    drawHost(W * 0.10, sudden ? H * 0.60 : H * 0.62, sudden ? 16 : 14);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 22, C.dark);
    game.draw.rect(60, 40, (W - 120) * frac, 22, sudden ? C.band2 : C.band1);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 92, 42, C.white);
    txt(solved + ' / ' + NEEDED, W * 0.16, 150, 44, C.band1);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W * 0.86 - m * 54, 146, 18, m < (MISS_LIMIT - misses) ? C.white : C.dark);
    }

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, C.white);
    if (sudden && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('あと' + (NEEDED - solved) + '問', W / 2, H * 0.60, 52, C.band2);
    if (feedback > 0 && !feedbackOk) txt('MISS', W / 2, H * 0.60, 56, C.band2);

    scanlines();
  });

  game.onStart(function() {
    // 70s MONO: 矩形波の単音。間が緊張を作る
    game.audio.melody(
      [['C4', 0.5], ['R', 0.25], ['E4', 0.5], ['R', 0.25], ['G4', 0.5], ['R', 0.5],
       ['F4', 0.5], ['R', 0.25], ['D4', 0.5], ['R', 0.75]],
      { tempo: 132, wave: 'square', volume: 0.08, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
