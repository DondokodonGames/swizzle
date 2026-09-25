// D-20092012-0067-combo-recall-arena.js
// コンボリコール・アリーナ — 味方が繰り出す攻撃の順番を見て覚え、同じ順にタップして敵へ叩き込む
// 操作: 光る順に3つのアイコン(斬撃/突き/守)が点灯するのを見て、消灯後に同じ順で3アイコンをタップする
// 終わり: 2連続で順番通りに再現できれば成功。順番を間違える/制限時間切れで失敗
// @mechanic: memory_sequence
// @theme: combo_recall_arena
// 世界観: 闘技場の控えで、隊長が次の連携を無言で示す。斬撃・突き・守りの3アイコンが順に光り、戦士はその順を記憶して同じ順にタップし敵へ叩き込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 再現できた連携数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 明るいパステルグラデ + 原色 + 白縁取り
  var C = {
    bg1: '#fff0d8', bg2: '#ffd9a0', panel: '#ffffff', panelEdge: '#3a2a1a',
    slash: '#ff4d6a', thrust: '#3d9bff', guard: '#ffd400',
    good: '#22c46a', bad: '#ff3d5c', gold: '#ff8a00', white: '#ffffff', ink: '#2a1a08',
  };
  var TCOL = { slash: C.slash, thrust: C.thrust, guard: C.guard };
  var TYPES = ['slash', 'thrust', 'guard'];
  var SLASH_SPR = ['#....', '.#...', '..#..', '...#.', '....#'];
  var THRUST_SPR = ['..#..', '..#..', '#####', '..#..', '..#..'];
  var GUARD_SPR = ['.###.', '#####', '#####', '.###.', '..#..'];
  function sprFor(t) { return t === 'slash' ? SLASH_SPR : t === 'thrust' ? THRUST_SPR : GUARD_SPR; }

  var GAME_TITLE = 'COMBO RECALL';
  var ROUNDS = 2;
  var SEQ_LEN = 3;
  var SHOW_GAP = 0.55;
  var INPUT_WINDOW = 5.5;

  var ZONES = [
    { type: 'slash', x: W * 0.22 },
    { type: 'thrust', x: W * 0.5 },
    { type: 'guard', x: W * 0.78 },
  ];
  var ZY = H * 0.82, ZW = 260, ZH = 180;
  var CAP_Y = H * 0.28;

  var CAPTAIN_A = ['.####.', '######', '##..##', '######', '.#..#.'];
  var CAPTAIN_B = ['.####.', '######', '##**##', '######', '.#..#.'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.3));
    for (var i = 0; i < 6; i++) game.draw.line(W * (0.1 + i * 0.17), 0, W * 0.5, H * 0.5, '#ffffff40', 6);
  }

  var round, seq, showIdx, showT, showing, inputIdx, inputT, resolving, lastFlash, captainFlash;
  var done, endWait, finished, ready, hitStop, shake;

  function newSequence() {
    var s = [];
    for (var i = 0; i < SEQ_LEN; i++) s.push(TYPES[Math.floor(game.random(0, 3))]);
    return s;
  }

  function startRound() {
    seq = newSequence();
    showIdx = -1; showT = 0.5; showing = true; inputIdx = 0; inputT = 0; resolving = false; lastFlash = -1;
  }

  function initGame() {
    round = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; captainFlash = 0;
    startRound();
  }

  function zoneAt(x, y) {
    for (var i = 0; i < ZONES.length; i++) {
      var zx = ZONES[i].x;
      if (x >= zx - ZW / 2 && x <= zx + ZW / 2 && y >= ZY - ZH / 2 && y <= ZY + ZH / 2) return i;
    }
    return -1;
  }

  function resolveTap(i) {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || showing || resolving) return;
    var want = TYPES.indexOf(seq[inputIdx]);
    if (i === want) {
      lastFlash = i;
      game.feedback.good(ZONES[i].x, ZY, { text: '', color: C.good });
      game.fx.burst(ZONES[i].x, ZY, { color: TCOL[ZONES[i].type], count: 10, speed: 240 });
      game.audio.play('se_good', 0.3);
      inputIdx++;
      inputT = 0;
      if (inputIdx >= seq.length) {
        resolving = true; hitStop = 0.12; captainFlash = 0.25;
        game.fx.popup(round + 1 + ' / ' + ROUNDS, W / 2, CAP_Y - 140, { color: C.gold, size: 38 });
        game.audio.play('se_success', 0.3);
        round++;
        if (round >= ROUNDS) { ok = true; finished = true; finish(); return; }
        startRound();
        showT = 0.6;
      }
    } else {
      lastFlash = i;
      resolving = true; hitStop = 0.35; captainFlash = 0.3;
      game.feedback.bad(ZONES[i].x, ZY, { text: 'MISS' });
      shake = 0.28;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    var i = zoneAt(x, y);
    if (i >= 0) { game.audio.play('se_tap', 0.1); resolveTap(i); } else game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    if (showing) {
      showT -= dt;
      if (showT <= 0) {
        showIdx++;
        if (showIdx >= seq.length) { showing = false; inputT = 0; }
        else { showT = SHOW_GAP; game.audio.play('se_tap', 0.15); }
      }
      return;
    }
    inputT += dt;
    if (inputT >= INPUT_WINDOW) {
      hitStop = 0.3; captainFlash = 0.3;
      game.feedback.bad(W / 2, CAP_Y, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawCaptain() {
    var bob = Math.sin(game.time.elapsed * 2.2) * 8;
    var spr = captainFlash > 0 ? CAPTAIN_B : (Math.floor(game.time.elapsed * 3) % 2 === 0 ? CAPTAIN_A : CAPTAIN_B);
    game.draw.circle(W * 0.5, CAP_Y + 60, 80, '#000000', 0.15);
    game.draw.sprite(spr, { '#': captainFlash > 0 ? C.white : '#5a4a3a', '*': C.gold }, W * 0.5, CAP_Y + bob, 18, { anchor: 'center' });
    if (showing && showIdx >= 0 && showIdx < seq.length) {
      var t = seq[showIdx];
      game.draw.circle(W * 0.5, CAP_Y - 130, 60, TCOL[t], 0.9);
      game.draw.sprite(sprFor(t), { '#': C.ink }, W * 0.5, CAP_Y - 130, 12, { anchor: 'center' });
    }
  }

  function drawZones() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var sway = Math.sin(game.time.elapsed * 1.7 + i) * 3;
      var lit = lastFlash === i;
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2 + sway, ZW, ZH, C.panel, 0.95);
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2 + sway, ZW, ZH, lit ? (ok || !finished ? C.good : C.bad) : C.panelEdge, lit ? 0.3 : 1);
      game.draw.sprite(sprFor(z.type), { '#': TCOL[z.type] }, z.x, ZY + sway, 14, { anchor: 'center' });
      if (!showing && i === inputIdx - (inputIdx >= seq.length ? 1 : 0)) {
        // 何も描かない(次に押すべき枠のヒントはテキストレス、盤面色のみで示す)
      }
    }
    if (!showing && !finished && !done) {
      for (var k = 0; k < seq.length; k++) {
        var filled = k < inputIdx;
        game.draw.circle(W * 0.5 - 60 + k * 60, H * 0.66, 16, filled ? C.gold : C.panelEdge, filled ? 1 : 0.4);
      }
    }
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, phase: 'show', drt: 0, dIdx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { seq = ['slash', 'guard', 'thrust']; showIdx = -1; showT = 0.5; showing = true; inputIdx = 0; lastFlash = -1; demo.drt = 0; }
    if (showing) {
      demo.gx = W / 2; demo.gy = H * 0.9; demo.press = false;
      showT -= dt;
      if (showT <= 0) { showIdx++; if (showIdx >= seq.length) { showing = false; } else showT = SHOW_GAP; }
    } else if (inputIdx < seq.length) {
      var zi = TYPES.indexOf(seq[inputIdx]);
      demo.gx = ZONES[zi].x; demo.gy = ZY; demo.press = true;
      demo.drt += dt;
      if (demo.drt > 0.35) { lastFlash = zi; inputIdx++; demo.drt = 0; }
    }
  }

  game.onUpdate(function(dt) {
    if (captainFlash > 0) captainFlash -= dt;

    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCaptain();
      drawZones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.10, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCaptain();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(round + ' / ' + ROUNDS, W / 2, H * 0.10, 28, C.gold);
      if (!ok && round === ROUNDS - 1) txt('あと1連携!', W / 2, H * 0.14, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round * 100, { rounds: round }); else game.end.failure({ rounds: round });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCaptain();
    drawZones();

    txt(round + ' / ' + ROUNDS, W / 2, 100, 32, C.ink);
    if (!showing && !finished && !done) {
      var frac = Math.max(0, 1 - inputT / INPUT_WINDOW);
      game.draw.rect(60, 150, W - 120, 14, C.panelEdge, 0.4);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.2], ['C5', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
