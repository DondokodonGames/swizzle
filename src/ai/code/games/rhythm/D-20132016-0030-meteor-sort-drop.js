// D-20132016-0030-meteor-sort-drop.js
// メテオソート・ドロップ — 落ちてくる黒い隕石だけを判定窓でタップし、白い隕石には触れない
// 操作: 落下してくる隕石が下の判定窓に入った瞬間、黒ならタップ。白は何もせずやり過ごす
// 終わり: 黒隕石6個を正しく処理し切れば成功。白隕石に触れる/黒隕石を逃すと失敗
// @mechanic: timing_window
// @theme: night_meteor_sorter
// 世界観: 夜空の観測基地の選別装置。降ってくる隕石のうち黒だけを弾き返し、白は素通りさせる選別士。回を追うごとに落下が加速する
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく処理できた個数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 4階調(黄緑寄り)、残像と低コントラスト、画面枠
  var C = {
    p0: '#0f380f', p1: '#306230', p2: '#8bac0f', p3: '#9bbc0f',
    good: '#9bbc0f', bad: '#0f380f', gold: '#8bac0f', white: '#9bbc0f', ink: '#0f380f',
  };

  var GAME_TITLE = 'METEOR SORT';
  var TOTAL = 6, WIN_HALF = 96;
  var HIT_Y = H * 0.68, SPAWN_Y = H * 0.16;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var CX = W * 0.5;
  var seq, idx, tile, cleared, catchFlash, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CATCHER = ['.##.', '####', '.oo.', '####'];

  function frameBg(elapsed) {
    game.draw.gradient(0, H, [[0, C.p1], [0.5, C.p0], [1, C.p1]]);
    game.draw.rect(0, 0, W, H, C.p3, 0.02 + 0.02 * Math.sin(elapsed * 1.3));
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 1, '#00000022');
    // 画面枠(携帯機の縁)
    game.draw.rect(0, 0, W, 24, C.p1); game.draw.rect(0, H - 24, W, 24, C.p1);
    game.draw.rect(0, 0, 24, H, C.p1); game.draw.rect(W - 24, 0, 24, H, C.p1);
  }

  function buildSeq() {
    var arr = [];
    for (var i = 0; i < TOTAL; i++) arr.push('B');
    var whites = 2;
    while (whites > 0) {
      var pos = 1 + Math.floor(Math.random() * (arr.length - 1));
      if (arr[pos] === 'B') { arr[pos] = 'W'; whites--; }
    }
    return arr;
  }

  function newTile(i) {
    return { y: SPAWN_Y, color: seq[i], speed: 640 + i * 42, resolved: false };
  }

  function initGame() {
    seq = buildSeq(); idx = 0; cleared = 0; catchFlash = 0;
    finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    tile = newTile(0);
  }

  function drawTile(t, wobble) {
    if (!t) return;
    var col = t.color === 'B' ? C.p0 : C.p3;
    game.draw.rect(CX - 70 + wobble, t.y - 60, 140, 120, C.p1);
    game.draw.rect(CX - 60 + wobble, t.y - 50, 120, 100, col);
    game.draw.circle(CX + wobble, t.y, 14, t.color === 'B' ? C.p2 : C.p1, 0.6);
  }

  function drawWindow() {
    game.draw.rect(40, HIT_Y - WIN_HALF, W - 80, WIN_HALF * 2, C.p2, 0.14);
    game.draw.line(40, HIT_Y - WIN_HALF, W - 40, HIT_Y - WIN_HALF, C.p2, 3);
    game.draw.line(40, HIT_Y + WIN_HALF, W - 40, HIT_Y + WIN_HALF, C.p2, 3);
  }

  function passTile() {
    idx++;
    if (idx >= TOTAL) { ok = true; finished = true; finish(); return; }
    tile = newTile(idx);
  }

  function tapPlay() {
    if (done || ready > 0 || hitStop > 0 || finished || !tile) return;
    var inWindow = Math.abs(tile.y - HIT_Y) < WIN_HALF;
    game.audio.play('se_tap', 0.06);
    if (!inWindow) return; // 窓の外は無反応(ペナルティなし)
    if (tile.color === 'B') {
      cleared++; catchFlash = 0.15; hitStop = 0.08;
      game.feedback.good(CX, HIT_Y, { text: 'HIT', color: C.p3 });
      game.fx.burst(CX, HIT_Y, { color: C.p2, count: 14, speed: 340 });
      game.audio.play('se_break', 0.4);
      if (cleared === Math.ceil(TOTAL / 2)) { game.fx.popup(cleared + ' / ' + TOTAL, W / 2, H * 0.14, { color: C.p2, size: 36 }); game.audio.play('se_milestone', 0.4); }
      passTile();
    } else {
      hitStop = 0.3;
      game.feedback.bad(CX, HIT_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tapPlay();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (!tile) return;
    tile.y += tile.speed * dt;
    if (catchFlash > 0) catchFlash -= dt;
    if (tile.y - HIT_Y > WIN_HALF) {
      // 判定窓を通過
      if (tile.color === 'B') {
        hitStop = 0.3;
        game.feedback.bad(CX, HIT_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      } else {
        passTile();
      }
    }
  }

  // ── ATTRACT ゴースト実演: 黒を正しくタップ→白を誤タップする例を1サイクルで見せる ──
  var demo = { t: 0, gx: CX, gy: H * 0.90, press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      tile = { y: SPAWN_Y, color: 'B', speed: 560, resolved: false };
      demo.phase = 0;
    }
    if (tile) tile.y += tile.speed * dt;
    var inWin = tile && Math.abs(tile.y - HIT_Y) < WIN_HALF;
    if (inWin && demo.phase === 0) {
      demo.press = true; demo.phase = 1;
      game.feedback.good(CX, HIT_Y, { text: 'HIT', color: C.p3 });
      game.fx.burst(CX, HIT_Y, { color: C.p2, count: 10, speed: 300 });
      tile = { y: SPAWN_Y - 40, color: 'W', speed: 640, resolved: false };
    } else if (demo.phase === 1) {
      demo.press = false;
      var inWin2 = tile && tile.color === 'W' && Math.abs(tile.y - HIT_Y) < WIN_HALF;
      if (inWin2) { demo.press = true; demo.phase = 2; game.feedback.bad(CX, HIT_Y, { text: 'MISS' }); }
    }
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 2.2) * 6;

    if (state === S.ATTRACT) {
      if (seq === undefined) initGame();
      frameBg(elapsed);
      stepDemo(dt);
      drawWindow();
      drawTile(tile, 0);
      game.draw.sprite(CATCHER, { '#': C.p1, o: C.p2 }, CX, H * 0.86 + bob * 0.3, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + TOTAL : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 32, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 22, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      frameBg(elapsed);
      drawWindow();
      game.draw.sprite(CATCHER, { '#': C.p1, o: C.p2 }, CX, H * 0.86, 16, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, C.white);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.12, 26, C.gold);
      if (!ok && cleared === TOTAL - 1) txt('あと1個!', W / 2, H * 0.16, 22, C.p2);
      if (ok && (game.best === 0 || cleared >= game.best)) txt('NEW RECORD', W / 2, H * 0.16, 22, C.p2);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 22, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL }); else game.end.failure({ cleared: cleared, total: TOTAL });
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

    frameBg(elapsed);
    drawWindow();
    drawTile(finished ? null : tile, 0);
    game.draw.sprite(CATCHER, { '#': C.p1, o: catchFlash > 0 ? C.p3 : C.p2 }, CX, H * 0.86 + bob * 0.3, 16, { anchor: 'center' });

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 28, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 48, C.p2);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.15], ['G4', 0.15], ['B4', 0.3]], { tempo: 170, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
