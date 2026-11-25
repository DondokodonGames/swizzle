// K-Wii-0001-echo-pose-recall.js
// エコーポーズリコール — お手本の身振りを見て覚え、同じ向きへ体を振って再現する
// 操作: シルエットが見せる身振り(上下左右)の並びを覚え、見終わったら同じ順にスワイプして再現する
// 終わり: 3ステージ(2手→3手→4手)すべて正しく再現できれば成功。1手でも外せば失敗
// @mechanic: memory_sequence
// @theme: mirror_pose_recall_stage
// 世界観: 鏡張りの練習舞台。お手本のシルエットが見せた一連の身振りを、見習いが同じ向きへ体を振って再現する
// 残るもの: 正誤(CLEAR/GAME OVER) + 何手まで再現できたか(通算)
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: 明るい単色フラット、影なし、太いラウンド図形
  var C = {
    bg: '#f4f1ff', bg2: '#e6ddff', mirror: '#ffffff', mirrorEdge: '#c9b8ff',
    silBase: '#7a5cff', silLit: '#ff8a5c', good: '#3ecf8e', bad: '#ff5c6c',
    gold: '#ffb020', white: '#2a1a4a', ink: '#ffffff',
  };

  var GAME_TITLE = 'POSE RECALL';
  var STAGE_LENS = [2, 3, 4];
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROW_UP = ['...#...', '..###..', '.#####.', '...#...', '...#...'];
  var ARROW_DOWN = ['...#...', '...#...', '.#####.', '..###..', '...#...'];
  var ARROW_LEFT = ['....#..', '...##..', '.#####.', '...##..', '....#..'];
  var ARROW_RIGHT = ['..#....', '..##...', '.#####.', '..##...', '..#....'];
  var ARROW_SPRITE = { up: ARROW_UP, down: ARROW_DOWN, left: ARROW_LEFT, right: ARROW_RIGHT };

  var POSE_UP = ['..#..', '.###.', '..#..', '.#.#.', '.#.#.'];
  var POSE_DOWN = ['.#.#.', '.#.#.', '..#..', '.###.', '..#..'];
  var POSE_LEFT = ['..#..', '####.', '.###.', '..#.#', '..#..'];
  var POSE_RIGHT = ['..#..', '.####', '.###.', '#.#..', '..#..'];
  var POSE_SPRITE = { up: POSE_UP, down: POSE_DOWN, left: POSE_LEFT, right: POSE_RIGHT };
  var POSE_IDLE = ['..#..', '.###.', '..#..', '.#.#.', '..#..'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(CX - 340, H * 0.22, 680, H * 0.42, C.mirror, 1);
    game.draw.rect(CX - 340, H * 0.22, 680, 10, C.mirrorEdge, 1);
    game.draw.rect(CX - 340, H * 0.22 + H * 0.42 - 10, 680, 10, C.mirrorEdge, 1);
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.6);
    game.draw.rect(0, 0, W, H, C.silBase, 0.02 + 0.04 * pulse);
  }

  var stageIdx, seq, showIdx, showT, inputIdx, phase, totalCorrect, inputT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;
  var INPUT_TIMEOUT = 2.6;

  function initGame() {
    stageIdx = 0; totalCorrect = 0; milestoneShown = false;
    startStage();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startStage() {
    seq = [];
    for (var i = 0; i < STAGE_LENS[stageIdx]; i++) seq.push(DIRS[Math.floor(game.random(0, 4))]);
    showIdx = 0; showT = 0.6; inputIdx = 0; phase = 'show'; inputT = 0;
  }

  function submit(dir) {
    if (done || ready > 0 || finished || phase !== 'input') return;
    hitStop = 0.06;
    game.audio.play('se_tap', 0.15);
    if (dir === seq[inputIdx]) {
      inputIdx++; totalCorrect++;
      game.feedback.good(CX, CY, { text: null, color: C.good });
      game.audio.play('se_good', 0.3);
      if (inputIdx >= seq.length) {
        stageIdx++;
        if (stageIdx >= STAGE_LENS.length) {
          ok = true; finished = true;
          game.fx.burst(CX, CY, { color: C.gold, count: 20, speed: 380 });
          game.audio.play('se_success', 0.5);
          finish();
        } else {
          game.fx.popup('STAGE ' + (stageIdx + 1), CX, H * 0.16, { color: C.gold, size: 40 });
          game.audio.play('se_milestone', 0.35);
          startStage();
        }
      }
    } else {
      ok = false; finished = true;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.4);
      finish();
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    submit(dir);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawStage(litDir) {
    bg();
    var sprite = litDir ? POSE_SPRITE[litDir] : POSE_IDLE;
    game.draw.sprite(sprite, { '#': litDir ? C.silLit : C.silBase }, CX, CY, 46, { anchor: 'center' });
    if (litDir) game.draw.sprite(ARROW_SPRITE[litDir], { '#': C.gold }, CX, H * 0.22 - 40, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, seq: ['up', 'left', 'down', 'right'], phase: 'show', idx: 0, t2: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    demo.t2 += dt;
    if (demo.phase === 'show') {
      if (demo.t2 > 0.5) { demo.t2 = 0; demo.idx++; if (demo.idx >= demo.seq.length) { demo.phase = 'input'; demo.idx = 0; } }
      demo.press = false;
    } else {
      if (demo.t2 > 0.6) {
        demo.t2 = 0;
        var d = demo.seq[demo.idx];
        var lift = d === 'up' ? -160 : d === 'down' ? 160 : 0;
        var side = d === 'left' ? -160 : d === 'right' ? 160 : 0;
        demo.gx = CX + side; demo.gy = H * 0.9 + lift * 0.15;
        demo.press = true;
        game.feedback.good(CX, CY, { text: null, color: C.good });
        game.audio.play('se_good', 0.2);
        demo.idx++;
        if (demo.idx >= demo.seq.length) { demo.phase = 'show'; demo.idx = 0; }
      } else if (demo.t2 > 0.2) {
        demo.press = false; demo.gx = CX; demo.gy = H * 0.9;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawStage(demo.phase === 'show' && demo.idx < demo.seq.length ? demo.seq[demo.idx] : null);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? String(game.best) : '-'), W / 2, H * 0.12, 24, C.silBase);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawStage(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(String(totalCorrect), W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと1手!', W / 2, H * 0.18, 26, C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(totalCorrect, { totalCorrect: totalCorrect, stage: stageIdx + 1 });
        else game.end.failure({ totalCorrect: totalCorrect, stage: stageIdx + 1 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) {
        showIdx++; showT = 0.55;
        if (showIdx < seq.length) game.audio.tone(440, 0.1, { wave: 'triangle', volume: 0.14 });
        if (showIdx >= seq.length) phase = 'input';
      }
    } else if (phase === 'input') {
      inputT += dt;
      if (inputT > INPUT_TIMEOUT) {
        // 反応漏れ(見習いが再現できなかった)
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.2;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawStage(phase === 'show' && showIdx < seq.length ? seq[showIdx] : null);

    var stageTotal = STAGE_LENS[0] + STAGE_LENS[1] + STAGE_LENS[2];
    txt(totalCorrect + ' / ' + stageTotal, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(70, 130, W - 140, 16, C.mirrorEdge, 0.5);
    game.draw.rect(70, 130, (W - 140) * (totalCorrect / stageTotal), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.72, 54, C.silBase);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 124, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
