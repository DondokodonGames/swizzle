// D-20222026-0058-performer-mark-assign.js
// パフォーマーマークアサイン — 演者アイコンを決まった舞台マークへドラッグして固有の音を鳴らす編成を完成させる
// 操作: 待機列の演者アイコンを、対応する色のステージマークまでドラッグして配置する
// 終わり: 全員を正しいマークへ配置すれば成功。違うマークへ置く/時間切れで失敗
// @mechanic: connect
// @theme: performer_mark_assign
// 世界観: 開演直前の小さな舞台裏で、進行係があらかじめ決まった編成表どおりに演者アイコンを各自のマークへ導き、音の並びを完成させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 配置できた人数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 光沢のあるグラデ、太めの縁取り
  var C = {
    bg: '#2a1a3a', bg2: '#160c22', mark: '#3a2a54', markEdge: '#ffffff',
    good: '#3fd67a', bad: '#ff4d5e', gold: '#ffd23f', ink: '#f2eefc',
    kinds: ['#ff5470', '#39c4ff', '#ffd23f', '#39ff8a'],
  };

  var GAME_TITLE = 'MARK ASSIGN';
  var TIME_LIMIT = 18;
  var N = 4;
  var MARKS = [
    { x: W * 0.28, y: H * 0.30, kind: 0 },
    { x: W * 0.72, y: H * 0.30, kind: 1 },
    { x: W * 0.28, y: H * 0.46, kind: 2 },
    { x: W * 0.72, y: H * 0.46, kind: 3 },
  ];
  var MARK_R = 90;
  var NOTES = ['C4', 'E4', 'G4', 'C5'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PERFORMER_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff5470', pulse * 0.12);
  }

  var performers, placed, hits, timeLeft, done, endWait, finished, ready, hitStop, shake, halfCalled;
  var dragIdx, dragX, dragY;

  function initGame() {
    performers = [];
    for (var i = 0; i < N; i++) {
      performers.push({ kind: i, x: W * 0.5 + (i - (N - 1) / 2) * 150, y: H * 0.78, alive: true });
    }
    placed = new Array(N).fill(false);
    hits = 0; timeLeft = TIME_LIMIT; dragIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfCalled = false;
  }

  function drawMarks() {
    for (var i = 0; i < MARKS.length; i++) {
      var m = MARKS[i];
      game.draw.circle(m.x, m.y, MARK_R, placed[i] ? C.kinds[m.kind] : C.mark);
      game.draw.circle(m.x, m.y, MARK_R, C.markEdge, 0.4);
    }
  }
  function drawPerformers() {
    for (var i = 0; i < performers.length; i++) {
      var p = performers[i];
      if (!p.alive) continue;
      var x = (i === dragIdx) ? dragX : p.x;
      var y = (i === dragIdx) ? dragY : p.y;
      game.draw.circle(x, y, 56, C.kinds[p.kind]);
      game.draw.sprite(PERFORMER_SPRITE, { '#': '#160c22' }, x, y, 16, { anchor: 'center' });
    }
  }

  function tryDrop(i, x, y) {
    var p = performers[i];
    for (var m = 0; m < MARKS.length; m++) {
      if (Math.hypot(x - MARKS[m].x, y - MARKS[m].y) < MARK_R) {
        if (MARKS[m].kind === p.kind && !placed[m]) {
          placed[m] = true; p.alive = false; hits++;
          game.audio.tone(NOTES[m % NOTES.length], 0.3, { wave: 'square', volume: 0.15 });
          game.feedback.good(x, y, { text: 'GOOD', color: C.good });
          if (hits === Math.ceil(N / 2)) game.fx.popup('HALFWAY!', x, y - 100, { color: C.gold, size: 32 });
          if (hits >= N) {
            finished = true; ok = true; hitStop = 0.3;
            game.fx.burst(W * 0.5, H * 0.38, { color: C.gold, count: 26, speed: 440 });
            game.audio.play('se_success', 0.5);
            finish();
          }
        } else {
          finished = true; ok = false; hitStop = 0.3; shake = 0.25;
          game.feedback.bad(x, y, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          finish();
        }
        return;
      }
    }
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < performers.length; i++) {
      if (performers[i].alive && Math.hypot(x - performers[i].x, y - performers[i].y) < 58) {
        dragIdx = i; dragX = x; dragY = y;
        game.audio.play('se_tap', 0.15);
        return;
      }
    }
  });
  game.onMove(function(x, y) { if (dragIdx >= 0) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (dragIdx >= 0) { var i = dragIdx; dragIdx = -1; tryDrop(i, x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.78, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var per = 2.0;
    var cyc = demo.t % (per * N + 0.6);
    if (cyc < dt || demo.t <= dt) initGame();
    var idx = Math.min(N - 1, Math.floor(cyc / per));
    var local = cyc - idx * per;
    if (idx >= performers.length || !performers[idx].alive) return;
    var p = performers[idx];
    var m = MARKS[idx];
    if (local < per * 0.65) {
      var t2 = local / (per * 0.65);
      demo.gx = p.x + (m.x - p.x) * t2;
      demo.gy = p.y + (m.y - p.y) * t2;
      demo.press = true;
      dragIdx = idx; dragX = demo.gx; dragY = demo.gy;
    } else {
      demo.press = false;
      if (dragIdx === idx) {
        dragIdx = -1;
        if (p.alive) {
          p.alive = false; placed[idx] = true; hits = Math.min(N, hits + 1);
          game.audio.tone(NOTES[idx % NOTES.length], 0.25, { wave: 'square', volume: 0.12 });
          game.feedback.good(m.x, m.y, { text: 'GOOD', color: C.good });
        }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (performers === undefined) initGame();
      stepDemo(dt);
      bg();
      drawMarks();
      drawPerformers();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMarks();
      drawPerformers();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(hits + ' / ' + N, W / 2, H * 0.14, 30, C.gold);
      if (!ok) txt('あと' + (N - hits) + '人!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, need: N });
        else game.end.failure({ hits: hits, need: N });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0; finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(W / 2, H * 0.4, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMarks();
    drawPerformers();

    txt(hits + ' / ' + N, W / 2, H * 0.06, 28, C.ink);
    var tbW = W - 120;
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 150, tbW, 16, '#3a2a54', 1);
    game.draw.rect(60, 150, tbW * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.4]], { tempo: 126, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
