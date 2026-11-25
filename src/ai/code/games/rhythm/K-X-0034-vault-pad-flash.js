// K-X-0034-vault-pad-flash.js
// ボルトパッドフラッシュ — 9枚の床パッドが順に光る、光った一瞬だけタップして解錠する
// 操作: 3x3の床パッドが1枚ずつ光るので、光っているその一瞬にそのパッドをタップする
// 終わり: 規定7枚を光った瞬間に踏めれば成功。光る前/消えた後に押せば失敗
// @mechanic: timing_one_shot
// @theme: pressure_pad_vault
// 世界観: 遺跡最奥の扉番。床に並ぶ圧力パッドが一枚ずつ明滅する謎の錠。光った瞬間だけを狙って踏み抜き、封を解く
// 残るもの: 正誤(CLEAR/GAME OVER) + 解錠できたパッド数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 緑燐光のモノクロ基調、走査線、粗いブロック
  var C = {
    bg: '#001505', bg2: '#001f08', grid: '#0a3018', pad: '#0e4520', padLit: '#33ff77',
    good: '#33ff77', bad: '#ff4444', gold: '#ffe066', white: '#c8ffd8', ink: '#000800',
  };

  var GAME_TITLE = 'VAULT PADS';
  var TOTAL = 7;
  var COLS = 3, ROWS = 3;
  var GRID_W = 720, GRID_H = 720;
  var GX0 = (W - GRID_W) / 2, GY0 = H * 0.22;
  var CELL = GRID_W / COLS;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, done, endWait, finished, pad, padDur, round;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function cellCenter(i) {
    var cx = i % COLS, cy = Math.floor(i / COLS);
    return { x: GX0 + cx * CELL + CELL / 2, y: GY0 + cy * CELL + CELL / 2 };
  }

  var GUARDIAN = ['.####.', '#.##.#', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < H / 6; i++) game.draw.rect(0, i * 6, W, 1, '#00ff8809');
    var bob = Math.sin(game.time.elapsed * 2.4) * 10;
    game.draw.sprite(GUARDIAN, { '#': C.padLit }, W * 0.5, H * 0.90 + bob, 10, { anchor: 'center' });
  }

  function drawGrid(litIdx, litAlpha) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var c = cellCenter(i);
      var isLit = i === litIdx;
      game.draw.rect(c.x - CELL / 2 + 8, c.y - CELL / 2 + 8, CELL - 16, CELL - 16, isLit ? C.padLit : C.pad, isLit ? litAlpha : 0.85);
      game.draw.rect(c.x - CELL / 2 + 8, c.y - CELL / 2 + 8, CELL - 16, 6, C.grid);
    }
  }

  function newPad(dur) { return { idx: Math.floor(game.random(0, COLS * ROWS)), t: 0, dur: dur, litStart: dur * 0.5, litEnd: dur * 0.78, resolved: false }; }

  function initGame() {
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; padDur = 1.3;
    pad = newPad(padDur);
  }

  function isLit(p) { return p.t >= p.litStart && p.t <= p.litEnd; }

  function resolveTap(x, y) {
    if (!pad || pad.resolved || ready > 0 || done || finished) return;
    var c = cellCenter(pad.idx);
    if (Math.abs(x - c.x) > CELL / 2 || Math.abs(y - c.y) > CELL / 2) {
      game.audio.play('se_tap', 0.08);
      return; // 違うパッドは無視(判定に関与しない、音のみ)
    }
    pad.resolved = true;
    if (isLit(pad)) {
      solved++; hitStop = 0.1;
      game.feedback.good(c.x, c.y, { text: 'PERFECT', color: C.good });
      game.fx.burst(c.x, c.y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (solved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, GY0 - 60, { color: C.gold, size: 40 });
      if (solved >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++; padDur = Math.max(0.75, padDur - 0.07);
      pad = newPad(padDur);
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(c.x, c.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveTap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: 0, gy: 0, press: false, p: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.p) { demo.p = newPad(1.0); demo.p.litStart = 0.5; demo.p.litEnd = 0.8; }
    demo.p.t += dt;
    pad = demo.p;
    var c = cellCenter(demo.p.idx);
    demo.gx = c.x; demo.gy = c.y;
    if (demo.p.t >= demo.p.litStart && !demo.p.telegraphed) {
      demo.p.telegraphed = true;
      demo.press = true;
      game.feedback.good(c.x, c.y, { text: 'PERFECT', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.p.t = demo.p.dur;
    }
    if (demo.p.t >= demo.p.dur) { demo.p = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawGrid(pad ? pad.idx : -1, pad ? (isLit(pad) ? 1 : 0.35) : 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(-1, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.15, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '枚!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved * 12, { solved: solved, total: TOTAL });
        else game.end.failure({ solved: solved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pad.t += dt;
      if (pad.t > pad.dur && !pad.resolved) {
        pad.resolved = true;
        var c = cellCenter(pad.idx);
        hitStop = 0.35; shake = 0.3;
        game.feedback.bad(c.x, c.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawGrid(pad.idx, isLit(pad) ? (0.7 + 0.3 * Math.sin(game.time.elapsed * 20)) : 0.3);
    else drawGrid(-1, 0);

    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, GY0 - 40, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, GY0 - 40, (W - 120) * (solved / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 170, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
