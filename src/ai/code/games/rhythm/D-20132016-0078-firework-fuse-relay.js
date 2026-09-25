// D-20132016-0078-firework-fuse-relay.js
// ファイアフューズリレー — 打ち上がる導火線をタップで点火、矢印の出た玉はフリックで打ち上げ方向を変える
// 操作: 普通の玉はタップで点火。矢印付きの玉は表示された方向へスワイプして打ち上げる
// 終わり: 規定数のうち一定数以上を成功させれば成功。失敗が続くと途中で終わる
// @mechanic: swipe_direction
// @theme: firework_ignition_deck
// 世界観: 夜の打ち上げ台に立つ花火師見習い。導火線に火をつけ、暴れる玉は指示された方角へ弾いて打ち上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功させた玉の数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン、太いネオン管のような縁取り
  var C = {
    bg: '#0a0018', bg2: '#1a0030', deck: '#2a1050', deckEdge: '#ff2e88',
    shell: '#ffcf3a', fuse: '#ff6a3a', arrow: '#38e0ff',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'FUSE RELAY';
  var DECK_X = W * 0.5, DECK_Y = H * 0.56;
  var TOTAL = 8;
  var NEED_HIT = 6;
  var MAX_TIME = 12;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHELL_SPRITE = ['.###.', '#####', '#####', '.###.', '..#..'];
  var GUNNER_SPRITE = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];
  var DIR_VEC = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) {
      game.draw.circle(W * (0.2 + i * 0.22), H * (0.18 + (i % 2) * 0.05), 5, C.arrow, 0.5);
    }
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    game.draw.rect(DECK_X - 260, DECK_Y - 100, 520, 220, C.deck, 0.4);
    game.draw.rect(DECK_X - 260, DECK_Y - 100, 520, 6, C.deckEdge);
  }

  function newNote(idx) {
    var isFlick = idx % 3 !== 0;
    var dirs = ['up', 'down', 'left', 'right'];
    var dir = dirs[Math.floor(Math.random() * dirs.length)];
    return { kind: isFlick ? 'flick' : 'tap', dir: dir, telegraph: 0.7, wait: 0.7, resolved: false, judged: '' };
  }

  var notes, spawnIdx, spawnTimer, hits, misses, comboJudged, current;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    notes = []; spawnIdx = 0; spawnTimer = 0.5; current = null;
    hits = 0; misses = 0; comboJudged = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function judgeGood(kind) {
    hits++; comboJudged++;
    game.feedback.good(DECK_X, DECK_Y, { text: comboJudged >= 3 ? 'PERFECT' : 'GOOD', color: C.good });
    game.audio.play(kind === 'tap' ? 'se_good' : 'se_jump', 0.4);
    hitStop = 0.05;
    if (hits === Math.ceil(TOTAL / 2)) { game.fx.popup('COMBO', DECK_X, DECK_Y - 220, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
    if (hits >= TOTAL || (hits + misses) >= TOTAL) {}
  }
  function judgeBad() {
    misses++; comboJudged = 0;
    game.feedback.bad(DECK_X, DECK_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.35);
    shake = 0.15; hitStop = 0.08;
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
  }

  function handleTap() {
    if (state !== S.PLAYING || ready > 0 || finished || !current) return;
    if (current.resolved) return;
    if (current.kind !== 'tap') { current.resolved = true; judgeBad(); return; }
    current.resolved = true; judgeGood('tap');
    checkRoundEnd();
  }
  function handleSwipe(dir) {
    if (state !== S.PLAYING || ready > 0 || finished || !current) return;
    if (current.resolved) return;
    if (current.kind !== 'flick' || dir !== current.dir) { current.resolved = true; judgeBad(); return; }
    current.resolved = true; judgeGood('flick');
    checkRoundEnd();
  }
  function checkRoundEnd() {
    if (finished) return;
    if (hits + misses >= TOTAL && spawnIdx >= TOTAL) { ok = hits >= NEED_HIT; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    handleTap();
  });
  game.onSwipe(function(dir) { handleSwipe(dir); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function drawArrow(dir, x, y, col, alpha) {
    var v = DIR_VEC[dir];
    game.draw.line(x - v.x * 46, y - v.y * 46, x + v.x * 46, y + v.y * 46, col, 10);
    var px = -v.y, py = v.x;
    game.draw.line(x + v.x * 46, y + v.y * 46, x + v.x * 20 + px * 20, y + v.y * 20 + py * 20, col, 10);
    game.draw.line(x + v.x * 46, y + v.y * 46, x + v.x * 20 - px * 20, y + v.y * 20 - py * 20, col, 10);
  }

  function drawScene(n, lean) {
    bg();
    game.draw.sprite(GUNNER_SPRITE, { '#': C.shell }, W * 0.5, H * 0.82 + Math.sin(game.time.elapsed * 1.5) * 5, 24, { anchor: 'center', flipX: lean < 0 });
    if (n) {
      var bob = Math.sin(game.time.elapsed * 4) * 6;
      var col = n.judged === 'good' ? C.good : n.judged === 'bad' ? C.bad : C.shell;
      if (!n.resolved) {
        var blinkT = 1 - Math.min(1, n.wait / n.telegraph);
        if (n.kind === 'flick' && blinkT > 0.3) {
          var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
          if (blink) drawArrow(n.dir, DECK_X, DECK_Y - 130, C.arrow, 1);
        }
      }
      game.draw.sprite(SHELL_SPRITE, { '#': col }, DECK_X, DECK_Y + bob, 24, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: DECK_X, gy: H * 0.86, press: false, dir: null, n: null };
  function resetDemo() { demo.n = newNote(1); demo.n.telegraph = 0.6; demo.n.wait = 0.6; demo.dir = null; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.n.wait -= dt;
    if (!demo.n.resolved && demo.n.wait <= 0.3 && demo.n.wait > 0) {
      if (demo.n.kind === 'tap') {
        demo.press = true; demo.gx = DECK_X; demo.gy = DECK_Y;
      } else {
        var v = DIR_VEC[demo.n.dir];
        demo.gx = DECK_X + v.x * 200; demo.gy = DECK_Y + v.y * 200;
        demo.press = true;
      }
    }
    if (!demo.n.resolved && demo.n.wait <= 0) {
      demo.n.resolved = true; demo.n.judged = 'good';
      game.feedback.good(DECK_X, DECK_Y, { text: 'GOOD', color: C.good });
      game.audio.play(demo.n.kind === 'tap' ? 'se_good' : 'se_jump', 0.2);
    }
    if (demo.n.wait < -0.3) { demo.press = false; demo.gx = DECK_X; demo.gy = H * 0.86; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.n, 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      game.draw.sprite(GUNNER_SPRITE, { '#': C.shell }, W * 0.5, H * 0.82, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0, NEED_HIT - hits) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL });
        else game.end.failure({ hits: hits, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!current || current.resolved) {
        spawnTimer -= dt;
        if (spawnTimer <= 0 && spawnIdx < TOTAL) {
          current = newNote(spawnIdx);
          spawnIdx++;
          spawnTimer = 0.95;
        }
      } else {
        current.wait -= dt;
        if (current.wait <= 0) {
          current.resolved = true;
          judgeBad();
        }
      }
      checkRoundEnd();
    }
    if (shake > 0) shake -= dt;

    drawScene(current, 0);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * (spawnIdx / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.4], ['C5', 0.4], ['E5', 0.4], ['A5', 0.8]], { tempo: 128, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
