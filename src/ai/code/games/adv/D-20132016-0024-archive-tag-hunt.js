// D-20132016-0024-archive-tag-hunt.js
// アーカイブ・タグハント — 積まれたファイルの山から赤タグの1冊だけを見つけてタップする
// 操作: 散らばって並ぶファイルの中から、赤いタグが付いた1冊だけを探してタップする
// 終わり: 3回連続で正しく見つければ成功。持ち時間切れでGAME OVER
// @mechanic: spot
// @theme: night_archive_tag_hunt
// 世界観: 閉館後の資料保管庫。棚から出された古いファイルが机に散らばる。灰色タグの中に紛れた赤タグの1冊だけを探し出す夜勤の点検役
// 残るもの: 正誤(CLEAR/GAME OVER) + 見つけた冊数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: ほぼ2階調の暗い紙面に、赤タグの一色だけが強く発光する
  var C = {
    bg: '#131110', bg2: '#0a0908', ink: '#000000',
    folder: '#3a342c', folderEdge: '#5c5346', folderFace: '#d8cfbe',
    tagPlain: '#8a8178', tagHot: '#ff3d3d', tagGlow: '#5a1010',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0ead8',
  };

  var GAME_TITLE = 'TAG HUNT';
  var ROUNDS = 3, MAX_TIME = 11;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var found, timeLeft, items, targetIdx, spawnT, revealCount, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOLDER = ['######', '#....#', '#.oo.#', '#....#', '######'];

  // 遊び場の3x3候補セル(散らばり配置。ラウンドごとにシャッフルして使う数だけ取る)
  var CELL_X = [W * 0.20, W * 0.5, W * 0.80];
  var CELL_Y = [H * 0.32, H * 0.46, H * 0.60];
  var ITEM_COUNT = 6;

  function shuffledCells() {
    var cells = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells.push({ x: CELL_X[c], y: CELL_Y[r] });
    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
    }
    return cells;
  }

  function archiveBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.5, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.20 + i * (H * 0.09), W, 2, '#ffffff05');
    // 遠景の書架シルエット
    for (var s = 0; s < 5; s++) game.draw.rect(60 + s * 210, H * 0.10, 120, H * 0.09, '#00000055');
  }

  function newRound() {
    var cells = shuffledCells();
    items = [];
    for (var i = 0; i < ITEM_COUNT; i++) items.push({ x: cells[i].x, y: cells[i].y, pop: 0 });
    targetIdx = Math.floor(Math.random() * ITEM_COUNT);
    spawnT = 0; revealCount = 0;
  }

  function initGame() {
    found = 0; timeLeft = MAX_TIME; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function drawFolder(it, isTarget, bob) {
    var y = it.y + bob;
    var s = 0.4 + 0.6 * Math.min(1, it.pop);
    if (s <= 0.02) return;
    game.draw.rect(it.x - 78 * s, y - 60 * s, 156 * s, 100 * s, C.folderEdge);
    game.draw.rect(it.x - 70 * s, y - 52 * s, 140 * s, 86 * s, C.folder);
    game.draw.sprite(FOLDER, { '#': C.folderFace, o: '#00000000' }, it.x, y - 4 * s, 14 * s, { anchor: 'center' });
    var tagCol = isTarget ? C.tagHot : C.tagPlain;
    if (isTarget) game.draw.circle(it.x + 56 * s, y - 44 * s, 20 * s, C.tagGlow, 0.6);
    game.draw.circle(it.x + 56 * s, y - 44 * s, 12 * s, tagCol);
  }

  function pickItem(px, py) {
    var best = -1, bd = 999;
    for (var i = 0; i < items.length; i++) {
      if (items[i].pop < 0.9) continue;
      var d = Math.hypot(px - items[i].x, py - items[i].y);
      if (d < bd) { bd = d; best = i; }
    }
    return bd < 95 ? best : -1;
  }

  function resolveTap(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    var idx = pickItem(x, y);
    if (idx < 0) return;
    game.audio.play('se_tap', 0.05);
    hitStop = 0.16;
    if (idx === targetIdx) {
      found++;
      game.feedback.good(items[idx].x, items[idx].y, { text: 'HIT', color: C.good });
      game.fx.burst(items[idx].x, items[idx].y, { color: C.tagHot, count: 16, speed: 360 });
      game.audio.play('se_success', 0.35);
      if (found === Math.ceil(ROUNDS / 2)) { game.fx.popup(found + ' / ' + ROUNDS, W / 2, H * 0.14, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (found >= ROUNDS) { ok = true; finished = true; finish(); } else newRound();
    } else {
      timeLeft = Math.max(0, timeLeft - 2.2);
      shake = 0.18;
      game.feedback.bad(items[idx].x, items[idx].y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
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
    resolveTap(x, y);
  });

  function stepPop(dt) {
    spawnT += dt;
    var target = Math.min(ITEM_COUNT, Math.floor(spawnT / 0.11) + 1);
    for (var i = 0; i < items.length; i++) {
      var want = i < target ? 1 : 0;
      items[i].pop += (want - items[i].pop) * Math.min(1, dt * 8);
    }
  }

  function stepPlay(dt) {
    stepPop(dt);
    timeLeft -= dt;
    if (timeLeft <= 0) { ok = false; finished = true; finish(); }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで散らばりを生成し、正解タグへ正しく向かう例→誤タップ例を1サイクルで見せる ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false, wrongIdx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { newRound(); spawnT = 1.0; demo.wrongIdx = (targetIdx + 1) % ITEM_COUNT; }
    stepPop(0.5);
    if (cyc < 0.5) {
      demo.gx += ((W * 0.5) - demo.gx) * Math.min(1, dt * 4);
      demo.gy += ((H * 0.86) - demo.gy) * Math.min(1, dt * 4);
      demo.press = false;
    } else if (cyc < 2.0) {
      var t = items[targetIdx];
      demo.gx += (t.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (t.y - demo.gy) * Math.min(1, dt * 4.5);
      demo.press = cyc > 1.75 && cyc < 1.9;
      if (cyc - dt <= 1.75) { game.feedback.good(t.x, t.y, { text: 'HIT', color: C.good }); game.fx.burst(t.x, t.y, { color: C.tagHot, count: 10, speed: 300 }); }
    } else if (cyc < 2.6) {
      demo.press = false;
    } else if (cyc < 3.9) {
      var w = items[demo.wrongIdx];
      demo.gx += (w.x - demo.gx) * Math.min(1, dt * 4.5);
      demo.gy += (w.y - demo.gy) * Math.min(1, dt * 4.5);
      demo.press = cyc > 3.65 && cyc < 3.8;
      if (cyc - dt <= 3.65) { game.feedback.bad(w.x, w.y, { text: 'MISS' }); }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 1.7) * 4;

    if (state === S.ATTRACT) {
      if (found === undefined) initGame();
      archiveBg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      for (var i = 0; i < items.length; i++) drawFolder(items[i], i === targetIdx, bob + Math.sin(elapsed * 2 + i) * 3);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + ROUNDS : '-'), W / 2, H * 0.68, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      archiveBg();
      for (var j = 0; j < items.length; j++) drawFolder(items[j], j === targetIdx, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(found + ' / ' + ROUNDS, W / 2, H * 0.68, 30, C.white);
      if (!ok && found === ROUNDS - 1) txt('あと1冊!', W / 2, H * 0.73, 26, C.gold);
      if (ok && (game.best === 0 || found >= game.best)) txt('NEW RECORD', W / 2, H * 0.73, 26, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(found, { found: found }); else game.end.failure({ found: found });
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

    archiveBg();
    for (var k = 0; k < items.length; k++) drawFolder(items[k], k === targetIdx, bob + Math.sin(elapsed * 2 + k) * 3);

    txt(found + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, H * 0.72, W - 120, 16, C.white, 0.2);
    game.draw.rect(60, H * 0.72, (W - 120) * Math.max(0, timeLeft / MAX_TIME), 16, C.tagHot);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F4', 0.25], ['A4', 0.5]], { tempo: 118, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
