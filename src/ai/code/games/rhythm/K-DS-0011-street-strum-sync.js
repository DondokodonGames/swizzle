// K-DS-0011-street-strum-sync.js
// ストリートストラム — 曲の拍に合わせて、示された向きに弦をかき鳴らす大道芸
// 操作: 拍のタイミングで、矢印が示す向き(上/下)に正しくスワイプして弦をかき鳴らす
// 終わり: 規定回数(10回)正しくかき鳴らせば成功。3回外せば失敗
// @mechanic: swipe_direction
// @theme: street_string_busker
// 世界観: 夜の路上で弦楽器をかき鳴らす大道芸人。曲の拍ごとに示される上下の向きに合わせて弦を弾き、通行人を沸かせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しくかき鳴らせた回数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定4〜6色、大きいドット、1色だけ強い差し色
  var C = {
    bg: '#181022', bg2: '#0c0814', wall: '#2a1c3a', wallEdge: '#3a2850',
    accent: '#ff3d6a', string: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0e8f4', ink: '#0a080c',
  };

  var GAME_TITLE = 'STREET STRUM';
  var TOTAL = 10;
  var MISS_LIMIT = 3;
  var INTERVAL = 0.75;
  var WIN_HALF = 0.2;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUSKER_UP = ['..##..', '.####.', '..##..', '.#..#.'];
  var BUSKER_DOWN = ['..##..', '.####.', '..##..', '.#.#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) game.draw.rect(W * (0.1 + i * 0.24), H * 0.16, 30, H * 0.4, C.wallEdge, 0.5);
    for (var j = 0; j < 4; j++) game.draw.line(CX - 140, CY + 60 + j * 20, CX + 140, CY + 60 + j * 20, C.string, 3);
  }

  var round, hits, misses, clock, beatIdx, dir, resolved, strumFlash, done, endWait, finished, readyIn, hitStop, shake;

  function initGame() {
    round = 0; hits = 0; misses = 0; clock = 0; beatIdx = 0; dir = 'up'; resolved = false;
    strumFlash = 0;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0;
  }

  function beatTime(i) { return i * INTERVAL + 0.4; }

  function nextDir() { dir = Math.random() < 0.5 ? 'up' : 'down'; }

  function tryStrum(sw) {
    if (readyIn > 0 || done || finished || hitStop > 0 || beatIdx >= TOTAL) return;
    var bt = beatTime(beatIdx);
    var open = Math.abs(clock - bt) <= WIN_HALF;
    if (open && !resolved && sw === dir) {
      resolved = true; hits++;
      hitStop = 0.08; strumFlash = 0.15;
      game.feedback.good(CX, CY, { text: 'GOOD' });
      game.audio.play('se_tap', 0.2);
      if (hits === Math.floor(TOTAL / 2)) { game.fx.popup(hits + ' / ' + TOTAL, CX, CY - 220, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      resolved = true; misses++;
      hitStop = 0.18; shake = 0.14; strumFlash = 0.2;
      game.feedback.bad(CX, CY, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
    }
  }

  game.onSwipe(function(d) {
    if (state !== S.PLAYING) return;
    if (d === 'up' || d === 'down') { game.audio.play('se_tap', 0.05); tryStrum(d); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    clock += dt;
    if (beatIdx < TOTAL) {
      var bt = beatTime(beatIdx);
      if (clock > bt + WIN_HALF && !resolved) {
        resolved = true; misses++;
        hitStop = 0.18; shake = 0.14; strumFlash = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      }
      if (clock > bt + WIN_HALF) { beatIdx++; resolved = false; nextDir(); }
    }
    if (beatIdx >= TOTAL && !finished) { ok = true; finished = true; finish(); }
    if (strumFlash > 0) strumFlash -= dt;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, clock: 0, idx: 0, resolved: false, dir: 'up' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.clock = 0; demo.idx = 0; demo.resolved = false; demo.dir = 'up'; }
    demo.clock += dt;
    demo.press = false;
    var bt = demo.idx * INTERVAL + 0.4;
    if (demo.clock >= bt && !demo.resolved) {
      demo.resolved = true; demo.press = true;
      game.feedback.good(CX, CY, { text: 'GOOD' });
      game.audio.play('se_tap', 0.1);
    }
    if (demo.clock > bt + WIN_HALF) { demo.idx++; demo.resolved = false; demo.dir = demo.dir === 'up' ? 'down' : 'up'; }
    dir = demo.dir; clock = demo.clock; beatIdx = demo.idx;
    demo.gy = dir === 'up' ? H * 0.8 : H * 0.9;
  }

  function drawScene(strumUp) {
    bg();
    game.draw.sprite(strumUp ? BUSKER_UP : BUSKER_DOWN, { '#': C.accent }, CX, CY - 80, 18, { anchor: 'center' });
    var arrowY = CY + 170;
    game.draw.line(CX, arrowY - (dir === 'up' ? 40 : -40), CX, arrowY + (dir === 'up' ? 40 : -40), C.gold, 10);
    game.draw.circle(CX, arrowY + (dir === 'up' ? -40 : 40), 16, C.gold);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - hits <= 3) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL, misses: misses });
        else game.end.failure({ hits: hits, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) { game.audio.play('se_tap'); nextDir(); }
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    drawScene(strumFlash > 0);
    if (strumFlash > 0) game.draw.circle(CX, CY, 60, C.good, 0.25);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.25], ['C4', 0.25], ['E4', 0.25], ['A4', 0.25]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
