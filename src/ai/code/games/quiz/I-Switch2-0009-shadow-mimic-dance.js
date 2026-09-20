// I-Switch2-0009-shadow-mimic-dance.js
// シャドウミミック — 灯りの下で踊る相方の影を見て、同じ順に体の位置(頭・両手・足)をタップして真似る
// 操作: 相方が光った部位の順番を覚え、消灯後に同じ順で自分の影の対応する部位をタップする
// 終わり: 全ラウンド(3ラウンド、最長4手)を正しく真似られれば成功。順番を間違えれば失敗
// @mechanic: memory_sequence
// @theme: shadow_puppet_mirror_dance
// 世界観: 提灯明かりの見世物小屋。壁に映る相方の影絵が体の部位を順に光らせて踊り、それを見た者が同じ順で自分の影を真似る芸
// 残るもの: 正誤(CLEAR/GAME OVER) + クリアしたラウンド数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ白黒2色、影絵のような濃淡のみ
  var C = {
    bg: '#f4f0e8', bg2: '#e8e2d4', ink: '#141210', inkSoft: '#3a362e',
    lit: '#ffcf3a', good: '#2a8a4a', bad: '#c8302a', gold: '#c8a02a', white: '#faf6ee',
  };

  var GAME_TITLE = 'SHADOW MIMIC';
  var ROUNDS = 3;
  var PARTS = [
    { key: 'head', x: W * 0.5, y: H * 0.34 },
    { key: 'lhand', x: W * 0.28, y: H * 0.48 },
    { key: 'rhand', x: W * 0.72, y: H * 0.48 },
    { key: 'foot', x: W * 0.5, y: H * 0.62 },
  ];
  var PART_R = 110;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var round, seq, showIdx, showT, phase; // phase: 'show'|'input'
  var inputIdx;
  var done, endWait, finished;
  var ready, hitStop, shake;
  var litPart, playerHit;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FIGURE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#00000006');
  }

  function newSeq(len) {
    var s = [];
    for (var i = 0; i < len; i++) s.push(Math.floor(game.random(0, PARTS.length)));
    return s;
  }

  function initGame() {
    round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    litPart = -1; playerHit = -1;
    startRound();
  }

  function startRound() {
    seq = newSeq(2 + round);
    showIdx = 0; showT = 0.35; phase = 'show'; inputIdx = 0; litPart = -1;
  }

  function drawFigure(px, py, litIdx) {
    for (var i = 0; i < PARTS.length; i++) {
      var p = PARTS[i];
      var isLit = i === litIdx;
      game.draw.circle(p.x, p.y, PART_R * 0.55, isLit ? C.lit : C.inkSoft, isLit ? 0.9 : 0.25);
    }
    game.draw.sprite(FIGURE, { '#': C.ink }, px, py, 26, { anchor: 'center' });
  }

  function attemptTap(x, y) {
    if (phase !== 'input' || ready > 0 || done || finished) return;
    var hitIdx = -1, best = 1e9;
    for (var i = 0; i < PARTS.length; i++) {
      var d = Math.hypot(x - PARTS[i].x, y - PARTS[i].y);
      if (d < PART_R && d < best) { best = d; hitIdx = i; }
    }
    if (hitIdx < 0) return;
    game.audio.play('se_tap', 0.05);
    playerHit = hitIdx;
    var correct = hitIdx === seq[inputIdx];
    hitStop = correct ? 0.08 : 0.3;
    if (correct) {
      game.feedback.good(PARTS[hitIdx].x, PARTS[hitIdx].y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      inputIdx++;
      if (inputIdx >= seq.length) {
        round++;
        game.fx.popup('ROUND ' + round, W / 2, H * 0.28, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.3);
        if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
        startRound();
      }
    } else {
      game.feedback.bad(PARTS[hitIdx].x, PARTS[hitIdx].y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) attemptTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, seq: [0, 1], showIdx: 0, showT: 0, phase: 'show', inputIdx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined) { round = 0; }
    demo.showT += dt;
    if (demo.phase === 'show') {
      litPart = demo.seq[demo.showIdx];
      if (demo.showT > 0.5) {
        demo.showT = 0; demo.showIdx++;
        if (demo.showIdx >= demo.seq.length) { demo.phase = 'input'; demo.inputIdx = 0; litPart = -1; }
      }
    } else {
      var target = PARTS[demo.seq[demo.inputIdx]];
      demo.gx = target.x; demo.gy = target.y; demo.press = true;
      if (demo.showT > 0.5) {
        demo.showT = 0;
        game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.2);
        demo.inputIdx++;
        demo.press = false;
        if (demo.inputIdx >= demo.seq.length) {
          demo.phase = 'show'; demo.showIdx = 0; demo.showT = 0;
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFigure(W * 0.5, H * 0.5, litPart);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFigure(W * 0.5, H * 0.5, -1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(round + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - round) + '手!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { rounds: round, total: ROUNDS });
        else game.end.failure({ rounds: round, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && phase === 'show') {
      showT -= dt;
      litPart = seq[showIdx];
      if (showT <= 0) {
        showIdx++; showT = 0.5;
        if (showIdx >= seq.length) { phase = 'input'; litPart = -1; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawFigure(W * 0.5, H * 0.5, phase === 'show' ? litPart : -1);

    txt(round + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000020', 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.75, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.4], ['C5', 0.4], ['E5', 0.8]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
