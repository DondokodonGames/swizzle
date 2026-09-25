// D-20132016-0086-command-recall-strike.js
// コマンド・リコール・ストライク — 一瞬閃いた必勝の指令順を覚え、その通りに号令する
// 操作: 光った4つの部隊アイコンの順番を覚え、同じ順にタップして号令を下す
// 終わり: 全ての号令を正しい順で出せれば成功。1回でも間違えれば失敗
// @mechanic: memory_sequence
// @theme: mercenary_command_recall
// 世界観: 寄せ集めの傭兵隊を率いる若き軍師が、一瞬だけ閃いた必勝の指令順を覚え、その通りに部隊へ号令を下して敵将を討つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく号令できた数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 低彩度4色、太いピクセル、視認性重視の縁取り
  var C = {
    bg: '#10140c', bg2: '#181f10', panel: '#26301a', panelEdge: '#3c4a28',
    sword: '#ff9a3d', bow: '#4dff8a', shield: '#48c0ff', spear: '#ff4d8a',
    idle: '#3c4a28', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#eef2e4', ink: '#080a06',
  };

  var GAME_TITLE = 'CMD RECALL';
  var SEQ_LEN = 5;
  var FLASH_ON = 0.45, FLASH_GAP = 0.22;
  var TAP_TIMEOUT = 2.4;

  var UNITS = [
    { id: 0, name: 'sword', col: C.sword, spr: ['.#.', '###', '.#.', '###'] },
    { id: 1, name: 'bow', col: C.bow, spr: ['#..', '.#.', '..#', '.#.'] },
    { id: 2, name: 'shield', col: C.shield, spr: ['.##.', '####', '####', '.##.'] },
    { id: 3, name: 'spear', col: C.spear, spr: ['..#', '.##', '###', '..#'] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 6; i++) game.draw.rect(0, i * (H / 6), W, 2, '#ffffff05');
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function zonePos(id) {
    var cols = 2, cx = W * (id % cols === 0 ? 0.28 : 0.72);
    var cy = H * (id < 2 ? 0.76 : 0.9);
    return { x: cx, y: cy };
  }

  var seq, step, phase, phaseT, previewIdx, litIdx, wrongIdx;
  var done, endWait, finished;
  var ready, hitStop, shake, tapWait;

  function newSeq() {
    var s = [];
    for (var i = 0; i < SEQ_LEN; i++) s.push(Math.floor(game.random(0, 4)));
    return s;
  }

  function initGame() {
    seq = newSeq(); step = 0; phase = 'preview'; phaseT = 0; previewIdx = 0; litIdx = -1; wrongIdx = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; tapWait = 0;
  }

  function onPick(unitId, x, y) {
    if (phase !== 'input' || finished || ready > 0 || done) return;
    var correct = unitId === seq[step];
    if (correct) {
      litIdx = unitId;
      hitStop = 0.08;
      game.feedback.good(x, y, { text: step === SEQ_LEN - 1 ? 'PERFECT' : 'GOOD' });
      game.audio.play('se_good', 0.3);
      step++;
      tapWait = 0;
      if (step === 3) { game.fx.popup('NICE', W * 0.5, H * 0.35, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.4); }
      if (step >= SEQ_LEN) {
        finished = true; ok = true; hitStop = 0.14;
        finish();
      }
    } else {
      wrongIdx = unitId;
      litIdx = seq[step];
      finished = true; ok = false; hitStop = 0.35;
      game.feedback.bad(x, y, { text: 'MISS' });
      shake = 0.3;
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || phase !== 'input') return;
    for (var i = 0; i < UNITS.length; i++) {
      var p = zonePos(i);
      if (Math.abs(x - p.x) < 150 && Math.abs(y - p.y) < 110) {
        game.audio.play('se_tap', 0.15);
        onPick(i, x, y);
        return;
      }
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawUnits(highlightIdx, wrong) {
    for (var i = 0; i < UNITS.length; i++) {
      var u = UNITS[i];
      var p = zonePos(i);
      var bob = Math.sin(game.time.elapsed * 2 + i * 1.4) * 4;
      var lit = i === highlightIdx;
      var isWrong = wrong && i === wrong;
      var col = isWrong ? C.bad : (lit ? u.col : C.idle);
      game.draw.rect(p.x - 140, p.y - 90, 280, 180, C.panel);
      game.draw.rect(p.x - 140, p.y - 90, 280, 6, C.panelEdge);
      game.draw.sprite(u.spr, { '#': col }, p.x, p.y + bob, 22, { anchor: 'center' });
    }
  }

  function drawSeqDots() {
    var x0 = W * 0.5 - (SEQ_LEN - 1) * 34;
    for (var i = 0; i < SEQ_LEN; i++) {
      var filled = i < step;
      game.draw.circle(x0 + i * 68, H * 0.2, 18, filled ? C.gold : C.ink, filled ? 1 : 0.6);
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.76, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) {
      seq = [0, 2, 1, 3]; step = 0; litIdx = -1; wrongIdx = -1;
    }
    if (cyc < 1.6) {
      // preview: flash through the 4-step demo sequence
      var idx = Math.min(3, Math.floor(cyc / 0.4));
      litIdx = seq[idx];
      demo.press = false;
    } else {
      var t2 = cyc - 1.6;
      var per = 0.7;
      var s = Math.min(seq.length, Math.floor(t2 / per));
      if (s < seq.length) {
        var p = zonePos(seq[s]);
        var within = (t2 % per) / per;
        demo.gx = p.x; demo.gy = p.y;
        demo.press = within > 0.35 && within < 0.75;
        if (demo.press && litIdx !== seq[s]) {
          litIdx = seq[s];
          game.audio.play('se_good', 0.18);
        }
        step = s;
      } else {
        litIdx = -1;
        demo.press = false;
        step = seq.length;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawUnits(litIdx, null);
      drawSeqDots();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.62, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawUnits(-1, null);
      drawSeqDots();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(step + ' / ' + SEQ_LEN, W / 2, H * 0.13, 30, C.gold);
      if (!ok && SEQ_LEN - step <= 1) txt('あと1手!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.62, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(step, { step: step, total: SEQ_LEN }); else game.end.failure({ step: step, total: SEQ_LEN });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); phase = 'preview'; phaseT = 0; previewIdx = 0; }
    } else if (phase === 'preview') {
      phaseT += dt;
      var slot = Math.floor(phaseT / (FLASH_ON + FLASH_GAP));
      var within = phaseT - slot * (FLASH_ON + FLASH_GAP);
      if (slot < SEQ_LEN) {
        litIdx = within < FLASH_ON ? seq[slot] : -1;
      } else {
        phase = 'input'; litIdx = -1; tapWait = 0;
      }
    } else if (phase === 'input' && !finished) {
      tapWait += dt;
      if (tapWait >= TAP_TIMEOUT) {
        finished = true; ok = false; hitStop = 0.3;
        wrongIdx = seq[step]; litIdx = seq[step];
        game.feedback.bad(W * 0.5, H * 0.5, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawUnits(phase === 'preview' ? litIdx : (finished ? litIdx : -1), wrongIdx >= 0 ? wrongIdx : null);
    drawSeqDots();

    txt(step + ' / ' + SEQ_LEN, W / 2, H * 0.06, 30, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 118, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
