// K-X-0024-mirror-step-mimic.js
// ミラーステップミミック — 手本が示した順番の光る足場を、見た直後に同じ順で踏んで真似る
// 操作: 光って鳴った順番を見た直後、同じ順番で4つの足場をタップする
// 終わり: 規定回数(3ラウンド、最大5手)を真似切れば成功。1回でも順番を外せば失敗
// @mechanic: memory_sequence
// @theme: mirror_step_mimic
// 世界観: 稽古場の四方の足場。手本が一手ずつ順に光って音を鳴らし、見終えた直後に弟子(プレイヤー)が同じ順番で足場を踏んで型を真似る
// 残るもの: 正誤(CLEAR/GAME OVER) + 真似できたラウンド数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: くっきりした高解像度ドット、深い影と強いハイライト
  var C = {
    bg: '#12161f', bg2: '#080a10', pad: '#2a3245', padLit: '#ffd23f',
    accent: '#5fd3ff', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#f4f7fb', ink: '#04050a',
  };

  var GAME_TITLE = 'STEP ECHO';
  var CX = W * 0.5;
  var ROUNDS = 3;
  var LENGTHS = [3, 4, 5];
  var STEP = 0.55;
  var NOTES = ['C5', 'E5', 'G5', 'C6'];

  var PADS = [
    { x: CX, y: H * 0.50, id: 0, arrow: ['..#..', '.###.', '#####'] },
    { x: CX + 190, y: H * 0.63, id: 1, arrow: ['#....', '.###.', '....#'].map(function(r){return r;}) },
    { x: CX, y: H * 0.80, id: 2, arrow: ['#####', '.###.', '..#..'] },
    { x: CX - 190, y: H * 0.63, id: 3, arrow: ['....#', '.###.', '#....'] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var seq, roundIdx, phase, showIdx, showT, inputIdx, stepTimeout, litPad, litT, pauseT;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LEADER = ['.##.', '####', '.##.', '####', '#..#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff05');
  }

  function drawLeader() {
    game.draw.sprite(LEADER, { '#': C.accent }, CX, H * 0.28 + Math.sin(game.time.elapsed * 2.6) * 8, 16, { anchor: 'center' });
  }

  function drawPads(lit) {
    for (var i = 0; i < PADS.length; i++) {
      var p = PADS[i];
      var hot = p.id === lit;
      game.draw.circle(p.x, p.y, 96, hot ? C.padLit : C.pad);
      game.draw.circle(p.x, p.y, 96, C.ink, 0);
      game.draw.sprite(p.arrow, { '#': hot ? C.ink : C.accent }, p.x, p.y, 12, { anchor: 'center' });
    }
  }

  function padAt(x, y) {
    for (var i = 0; i < PADS.length; i++) {
      var p = PADS[i];
      if (Math.hypot(x - p.x, y - p.y) <= 110) return p;
    }
    return null;
  }

  function initGame() {
    seq = []; roundIdx = 0; phase = 'ready'; showIdx = -1; showT = 0;
    inputIdx = 0; stepTimeout = 0; litPad = -1; litT = 0; pauseT = 0.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function startRound() {
    var len = LENGTHS[roundIdx];
    seq = [];
    for (var i = 0; i < len; i++) seq.push(Math.floor(game.random(0, 4)));
    phase = 'show'; showIdx = -1; showT = 0; inputIdx = 0; litPad = -1;
  }

  function resolveTap(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished || phase !== 'input') return;
    var p = padAt(x, y);
    if (!p) return;
    if (p.id === seq[inputIdx]) {
      litPad = p.id; litT = 0.2; inputIdx++;
      stepTimeout = 3.0; hitStop = 0.06;
      game.feedback.good(p.x, p.y, { text: null, color: C.good });
      game.audio.tone(NOTES[p.id], 0.15, { wave: 'square', volume: 0.18 });
      if (inputIdx >= seq.length) {
        roundIdx++;
        if (roundIdx === Math.ceil(ROUNDS / 2)) { game.fx.popup('HALFWAY!', CX, H * 0.38, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.4); }
        if (roundIdx >= ROUNDS) { ok = true; finished = true; finish(); return; }
        phase = 'pause'; pauseT = 0.6;
      }
    } else {
      hitStop = 0.3; shake = 0.25; litPad = p.id; litT = 0.2;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.04); resolveTap(x, y); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = {
    t: 0, gx: CX, gy: H * 0.5, press: false,
    seq: [0, 1, 2], phase: 'show', showIdx: -1, showT: 0, inputIdx: 0, lit: -1,
  };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.85;
    if (cyc < dt || demo.t <= dt) { demo.phase = 'show'; demo.showIdx = -1; demo.showT = 0; demo.inputIdx = 0; demo.lit = -1; }
    var stepD = 0.45;
    if (demo.phase === 'show') {
      demo.showT += dt;
      var idx = Math.floor(demo.showT / stepD);
      if (idx !== demo.showIdx && idx < demo.seq.length) {
        demo.showIdx = idx; demo.lit = demo.seq[idx];
        game.audio.tone(NOTES[demo.lit], 0.14, { wave: 'square', volume: 0.14 });
      } else if (idx >= demo.seq.length) {
        demo.phase = 'input'; demo.showT = 0; demo.lit = -1;
      }
      demo.gx = CX + Math.sin(game.time.elapsed * 2.3) * 12;
      demo.gy = H * 0.5 + Math.cos(game.time.elapsed * 2.0) * 8;
      demo.press = false;
    } else {
      demo.showT += dt;
      var step2 = Math.floor(demo.showT / stepD);
      if (step2 !== demo.inputIdx && step2 < demo.seq.length) {
        demo.inputIdx = step2;
      }
      var target = PADS[demo.seq[Math.min(demo.inputIdx, demo.seq.length - 1)]];
      demo.gx = target.x + Math.sin(game.time.elapsed * 3) * 4;
      demo.gy = target.y + Math.cos(game.time.elapsed * 2.6) * 4;
      var within = (demo.showT % stepD);
      demo.press = within > stepD * 0.55;
      demo.lit = demo.press ? demo.seq[Math.min(demo.inputIdx, demo.seq.length - 1)] : -1;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLeader();
      drawPads(demo.lit);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLeader();
      drawPads(-1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(roundIdx + ' / ' + ROUNDS, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (ROUNDS - roundIdx) + '!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(roundIdx, { rounds: roundIdx, total: ROUNDS });
        else game.end.failure({ rounds: roundIdx, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); startRound(); }
    } else if (!finished) {
      if (phase === 'pause') {
        pauseT -= dt;
        if (pauseT <= 0) startRound();
      } else if (phase === 'show') {
        showT += dt;
        var idx = Math.floor(showT / STEP);
        if (idx !== showIdx && idx < seq.length) {
          showIdx = idx; litPad = seq[idx]; litT = STEP * 0.6;
          game.audio.tone(NOTES[litPad], 0.16, { wave: 'square', volume: 0.2 });
        } else if (idx >= seq.length) {
          phase = 'input'; litPad = -1; stepTimeout = 3.0;
        }
      } else if (phase === 'input') {
        stepTimeout -= dt;
        if (stepTimeout <= 0) {
          hitStop = 0.25; shake = 0.2;
          game.feedback.bad(CX, H * 0.65, { text: 'MISS' });
          ok = false; finished = true; finish();
        }
      }
    }
    if (litT > 0) { litT -= dt; if (litT <= 0 && phase !== 'show') litPad = -1; }
    if (shake > 0) shake -= dt;

    bg();
    drawLeader();
    drawPads(litPad);

    txt(roundIdx + ' / ' + ROUNDS, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (roundIdx / ROUNDS), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.65, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['G4', 0.3], ['E4', 0.3], ['C5', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
