// K-DS-0055-paired-step-dance.js
// 息合わせ二人舞 — 決まったステップを、相方と息を合わせて左右同時に踏む
// 操作: 相方が踏む足(左/右)が光って示されたら、合図の瞬間に同じ側のゾーンをタップして揃える
// 終わり: 規定回数(9回)を相方と揃えて踏めば成功。3回ズレれば失敗
// @mechanic: coop_2zone
// @theme: paired_step_dance
// 世界観: 祭りの奉納舞。二人一組の舞い手が、太鼓の合図に合わせて相方と同じ側の足をぴったり同時に踏み出す
// 残るもの: 正誤(息合い成功/息切れ)+ 揃った回数と最大連続数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡いパステル配色、丸みのある輪郭、白ハイライト
  var C = {
    bg: '#fdeef0', bg2: '#f6dde6', floor: '#e8c8d8', floorLine: '#d8a8c0',
    partnerA: '#ff9ac2', partnerB: '#8ab8ff', good: '#5ad98a', bad: '#ff6a7a',
    gold: '#ffb648', white: '#fffaf8', ink: '#3a1828',
  };

  var GAME_TITLE = 'STEP PAIR';
  var TOTAL = 9;
  var MAX_MISS = 3;
  var CX = W * 0.5, ROW_Y = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var synced, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var beatT, beatDur, beatPhase, side;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DANCER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.6, W, H * 0.3, C.floor);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.6 + i * 30, W, H * 0.6 + i * 30, C.floorLine, 2);
  }

  function nextBeatDur() {
    return Math.max(0.6, 1.0 - synced * 0.03);
  }

  function initGame() {
    synced = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    beatT = 0; beatDur = nextBeatDur(); beatPhase = 0;
    side = Math.random() < 0.5 ? -1 : 1;
  }

  function zoneX(s) { return s < 0 ? W * 0.26 : W * 0.74; }

  function stepTap(inputSide) {
    if (ready > 0 || done || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var inWindow = beatPhase > 0.34 && beatPhase < 0.66;
    var correct = inputSide === side;
    var zx = zoneX(side);
    if (inWindow && correct) {
      synced++;
      hitStop = 0.08;
      game.feedback.good(zx, ROW_Y, { text: 'SYNC', color: C.good });
      game.fx.burst(zx, ROW_Y, { color: C.gold, count: 14, speed: 280 });
      game.audio.play('se_good', 0.32);
      if (synced === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, ROW_Y - 220, { color: C.gold, size: 40 });
      side = Math.random() < 0.5 ? -1 : 1;
      beatT = 0; beatDur = nextBeatDur();
      if (synced >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      miss++;
      hitStop = 0.28;
      game.feedback.bad(zx, ROW_Y, { text: 'MISS' });
      shake = 0.24;
      game.audio.play('se_bad', 0.4);
      side = Math.random() < 0.5 ? -1 : 1;
      beatT = 0; beatDur = nextBeatDur();
      if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) stepTap(x < CX ? -1 : 1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawZones(activeSide, phase) {
    for (var s = -1; s <= 1; s += 2) {
      var x = zoneX(s);
      var active = s === activeSide;
      var glow = active && phase > 0.34 && phase < 0.66 && Math.floor(game.time.elapsed * 12) % 2 === 0;
      game.draw.circle(x, ROW_Y + 130, 100, active ? (glow ? C.gold : '#ffb64844') : '#00000010');
    }
  }

  function drawDancers(lean) {
    game.draw.sprite(DANCER, { '#': C.partnerA }, CX - 100 + lean, ROW_Y, 22, { anchor: 'center' });
    game.draw.sprite(DANCER, { '#': C.partnerB }, CX + 100 - lean, ROW_Y, 22, { anchor: 'center' });
  }

  var demo = { t: 0, gx: zoneX(-1), gy: ROW_Y + 130, press: false, bt: 0, bd: 0.85, s: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.0;
    if (cyc < dt || demo.t <= dt) { demo.bt = 0; demo.s = -1; demo.struck = false; }
    demo.bt += dt;
    var p = demo.bt / demo.bd;
    beatPhase = Math.min(1, p);
    side = demo.s;
    if (p > 0.34 && p < 0.66 && !demo.struck) {
      demo.struck = true;
      demo.gx = zoneX(demo.s); demo.press = true;
      game.audio.play('se_good', 0.18);
    }
    if (p >= 1) { demo.bt = 0; demo.struck = false; demo.press = false; demo.s = -demo.s; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawZones(side, beatPhase);
      drawDancers((beatPhase > 0.34 && beatPhase < 0.66) ? side * 10 : 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDancers(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(synced + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - synced) + '回!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(synced, { synced: synced, total: TOTAL });
        else game.end.failure({ synced: synced, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      beatPhase = Math.min(1, beatT / beatDur);
      if (beatPhase >= 1) {
        miss++;
        hitStop = 0.28;
        game.feedback.bad(zoneX(side), ROW_Y, { text: 'MISS' });
        shake = 0.24;
        game.audio.play('se_bad', 0.4);
        side = Math.random() < 0.5 ? -1 : 1;
        beatT = 0; beatDur = nextBeatDur();
        if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
    }
    if (shake > 0) shake -= dt;

    var lean = (!finished && beatPhase > 0.34 && beatPhase < 0.66) ? side * 10 : 0;
    bg();
    drawZones(finished ? 0 : side, beatPhase);
    drawDancers(lean);

    txt(synced + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000022', 0.5);
    game.draw.rect(60, 150, (W - 120) * (synced / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#00000022');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.3], ['E4', 0.3], ['C4', 0.3], ['D4', 0.6]], { tempo: 118, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
