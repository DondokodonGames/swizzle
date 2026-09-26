// J-N6434-0012-gale-tag-pick.js
// 風速札えらび — 次々めくれる4枚の観測札から、一番大きい風速の札を瞬時に見抜いて掲げる
// 操作: 4枚の札が左から順にめくれたら、一番大きい数字の札をタップ。遅れてめくれる札や桁が入れ替わった数字にだまされない
// 終わり: 6回正解でCLEAR。3回ミス(誤答/時間切れ)かTIME UPでGAME OVER
// @mechanic: size_judge
// @theme: weather_station_gale_tags
// 世界観: 岬の気象観測所で見習い観測員のウミネコが、風車計から次々届く観測札の中から最大風速を見抜き、嵐の前に警報塔の旗を正しく掲げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 正解数と平均判断時間
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ・細線・テキスト枠のUI
  var STYLE = { bg: ['#101848', '#1c2c78', '#2848c8'], main: ['#f0f0f0', '#48d8e8'], accent: ['#f8e848', '#e83838'] };
  var C = {
    navy: '#101848', blue: '#2848c8', mid: '#1c2c78', cyan: '#48d8e8', white: '#f0f0f0',
    yellow: '#f8e848', red: '#e83838', green: '#48d848', magenta: '#d848d8', black: '#000000'
  };

  var TITLE = 'GALE TAGS';
  var TIME_LIMIT = 13;
  var NEEDED = 6;
  var MAX_MISS = 3;
  var CARD_W = 210, CARD_H = 300;
  var CARD_Y = H * 0.46;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var GULL = [
    '...wwww...',
    '..wwwwkw..',
    '.wwwwwwwyy',
    'wwwwwwww..',
    'bbwwwwww..',
    '.bbbwwww..',
    '...wwww...',
    '...y..y...'
  ];
  var GULL_UP = [
    'b........b',
    'bb.wwww.bb',
    '.bwwwwkwb.',
    '..wwwwwwyy',
    '..wwwwww..',
    '...wwww...',
    '...wwww...',
    '...y..y...'
  ];
  var GULL_PAL = { w: '#f0f0f0', k: '#000000', y: '#f8e848', b: '#48d8e8' };
  var VANE_A = ['c.....c', '.c...c.', '..ccc..', '...w...', '...w...', '...w...'];
  var VANE_B = ['...c...', '...c...', 'ccccccc', '...w...', '...w...', '...w...'];
  var VANE_PAL = { c: '#48d8e8', w: '#f0f0f0' };
  var FLAG = ['rrrrr', 'rryrr', 'rrrrr', 'w....', 'w....', 'w....'];

  var cards, round, phase, phaseT, flipIdx, flipGap, lateIdx, pickT, win;
  var correct, misses, timeLeft, combo, totalPick, picked, flagUp, endPhase, endT, roundOk, focusX, focusY;
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, acted: -1 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.black, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function cardX(i) { return W * 0.5 + (i - 1.5) * (CARD_W + 26); }

  function makeNumbers(r) {
    var nums = [];
    if (r < 2) {
      while (nums.length < 4) {
        var n = Math.floor(game.random(10, 99));
        if (nums.indexOf(n) < 0) nums.push(n);
      }
    } else {
      // 桁入れ替え・隣接値で惑わせる
      var a = Math.floor(game.random(2, 8)), b = Math.floor(game.random(1, 9));
      if (a === b) b = (b % 8) + 1;
      var base = a * 10 + b, swap = b * 10 + a;
      var near = Math.max(11, Math.max(base, swap) - Math.floor(game.random(1, 4)));
      var cand = [base, swap, near, Math.floor(game.random(10, 40))];
      for (var i = 0; i < cand.length; i++) if (nums.indexOf(cand[i]) < 0) nums.push(cand[i]);
      while (nums.length < 4) { var m = Math.floor(game.random(10, 99)); if (nums.indexOf(m) < 0) nums.push(m); }
    }
    for (var s = nums.length - 1; s > 0; s--) { var j = Math.floor(Math.random() * (s + 1)); var t = nums[s]; nums[s] = nums[j]; nums[j] = t; }
    return nums;
  }

  function newRound() {
    var nums = makeNumbers(round);
    cards = [];
    for (var i = 0; i < 4; i++) cards.push({ n: nums[i], open: 0, face: false, mark: 0 });
    flipGap = Math.max(0.09, 0.2 - round * 0.015);
    win = Math.max(0.9, 1.5 - round * 0.08);
    lateIdx = round >= 3 ? Math.floor(Math.random() * 4) : -1;
    phase = 'deal'; phaseT = 0.22; flipIdx = 0; pickT = 0; picked = -1;
  }

  function maxIndex() {
    var b = 0;
    for (var i = 1; i < 4; i++) if (cards[i].n > cards[b].n) b = i;
    return b;
  }

  function initGame() {
    round = 0; correct = 0; misses = 0; timeLeft = TIME_LIMIT; combo = 0; totalPick = 0; flagUp = 0;
    endPhase = 'ready'; endT = 0.8; roundOk = false; focusX = W / 2; focusY = CARD_Y;
    newRound();
  }

  function judgePick(i, live) {
    if (phase !== 'flip' && phase !== 'pick') return;
    if (!cards[i].face) {
      if (live) game.audio.tone('E2', 0.06, { wave: 'square', volume: 0.06 });
      return;
    }
    picked = i;
    var best = maxIndex();
    var cx = cardX(i);
    focusX = cx; focusY = CARD_Y;
    if (i === best) {
      correct++; combo++; totalPick += pickT;
      cards[i].mark = 1;
      flagUp = 1;
      var perfect = pickT < 0.45 && phase === 'pick';
      if (live) {
        game.feedback.good(cx, CARD_Y - 190, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.yellow : C.green });
        game.audio.tone(440 + combo * 60, 0.1, { wave: 'square', volume: 0.08 });
        if (correct === 3) {
          game.fx.popup('あと' + (NEEDED - correct) + '回!', W / 2, H * 0.28, { color: C.cyan, size: 50 });
          game.audio.play('se_milestone', 0.5);
        }
      }
    } else {
      misses++; combo = 0;
      cards[i].mark = -1; cards[best].mark = 2;
      if (live) game.feedback.bad(cx, CARD_Y - 190, { text: 'MISS' });
    }
    phase = 'reveal'; phaseT = 0.5;
  }

  function stepRound(dt, live) {
    for (var i = 0; i < 4; i++) {
      var cd = cards[i];
      if (cd.face && cd.open < 1) cd.open = Math.min(1, cd.open + dt * 9);
    }
    if (flagUp > 0) flagUp = Math.max(0, flagUp - dt * 1.2);
    phaseT -= dt;
    if (phase === 'deal') {
      if (phaseT <= 0) { phase = 'flip'; phaseT = flipGap; }
    } else if (phase === 'flip') {
      pickT += dt;
      if (phaseT <= 0) {
        var idx = flipIdx;
        if (idx === lateIdx) idx = -1;
        if (flipIdx < 4) {
          if (idx >= 0) { cards[idx].face = true; if (live) game.audio.tone(330 + flipIdx * 110, 0.05, { wave: 'square', volume: 0.05 }); }
          flipIdx++;
          phaseT = (flipIdx === 4 && lateIdx >= 0) ? 0.35 : flipGap;
        } else {
          if (lateIdx >= 0 && !cards[lateIdx].face) {
            cards[lateIdx].face = true;
            if (live) game.audio.tone(880, 0.06, { wave: 'square', volume: 0.06 });
          }
          phase = 'pick'; phaseT = win; pickT = 0;
        }
      }
    } else if (phase === 'pick') {
      pickT += dt;
      if (phaseT <= 0) {
        misses++; combo = 0;
        var b = maxIndex();
        cards[b].mark = 2; focusX = cardX(b); focusY = CARD_Y;
        if (live) game.feedback.bad(cardX(b), CARD_Y - 190, { text: 'MISS' });
        phase = 'reveal'; phaseT = 0.5;
      }
    } else if (phase === 'reveal') {
      if (phaseT <= 0) { round++; newRound(); }
    }
  }

  function drawBg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.navy], [0.55, C.mid], [1, C.blue]]);
    game.draw.rect(0, 0, W, H, C.cyan, 0.03 + 0.03 * Math.sin(el * 1.4));
    // 走査線
    for (var y = 0; y < H; y += 12) game.draw.rect(0, y, W, 2, C.black, 0.18);
    // 遠景: 岬と観測塔・風車計
    game.draw.rect(0, H * 0.70, W, H * 0.30, '#0c1236');
    game.draw.line(0, H * 0.70, W, H * 0.70, C.cyan, 3);
    game.draw.rect(W * 0.82, H * 0.605, 16, H * 0.095, C.white);
    game.draw.sprite(Math.floor(el * 8) % 2 ? VANE_A : VANE_B, VANE_PAL, W * 0.826, H * 0.595, 10, { anchor: 'center' });
    var fy = H * 0.625 - flagUp * H * 0.03;
    game.draw.sprite(FLAG, { r: flagUp > 0 ? C.red : C.magenta, y: C.yellow, w: C.white }, W * 0.12, fy, 12, { anchor: 'center' });
    game.draw.rect(W * 0.12 - 30, fy + 30, 6, H * 0.70 - fy - 30, C.white);
    // 波
    for (var i = 0; i < 10; i++) {
      var wx = ((el * 60 + i * 140) % (W + 140)) - 70;
      game.draw.rect(wx, H * 0.76 + (i % 3) * 60, 90, 6, C.cyan, 0.4);
    }
  }

  function drawCards() {
    // 観測札を吊るす線
    game.draw.line(40, CARD_Y - CARD_H / 2 - 30, W - 40, CARD_Y - CARD_H / 2 - 30, C.white, 3);
    for (var i = 0; i < 4; i++) {
      var cd = cards[i], cx = cardX(i);
      var sway = Math.sin(game.time.elapsed * 2.2 + i) * 5;
      var dy = phase === 'deal' ? (phaseT / 0.22) * -80 : 0;
      var y = CARD_Y + dy + sway;
      var wScale = cd.face ? Math.max(0.1, cd.open) : 1;
      var w = CARD_W * wScale;
      game.draw.rect(cx - w / 2 - 6, y - CARD_H / 2 - 6, w + 12, CARD_H + 12, C.white);
      if (!cd.face) {
        game.draw.rect(cx - w / 2, y - CARD_H / 2, w, CARD_H, C.blue);
        for (var k = 0; k < 5; k++) game.draw.line(cx - w / 2, y - CARD_H / 2 + k * 60 + 30, cx + w / 2, y - CARD_H / 2 + k * 60 + 30, C.cyan, 2);
        game.draw.sprite(VANE_B, VANE_PAL, cx, y, 8, { anchor: 'center' });
      } else {
        var col = cd.mark === 1 ? C.green : cd.mark === -1 ? C.red : C.black;
        game.draw.rect(cx - w / 2, y - CARD_H / 2, w, CARD_H, col);
        if (cd.open > 0.6) {
          game.draw.text(String(cd.n), cx, y - 10, { size: 120, color: cd.mark === 2 ? C.yellow : C.white, bold: true, align: 'center', font: 'monospace' });
          var bars = Math.round(cd.n / 20);
          for (var b = 0; b < bars; b++) game.draw.rect(cx - 70 + b * 30, y + 90, 22, 20, C.cyan);
        }
        if (cd.mark === 2) game.draw.rect(cx - w / 2, y - CARD_H / 2, w, 12, C.yellow, 0.5 + 0.5 * Math.sin(game.time.elapsed * 20));
      }
      game.draw.line(cx, y - CARD_H / 2 - 6, cx, CARD_Y - CARD_H / 2 - 30, C.white, 3);
    }
    // 見習いウミネコ
    var up = flagUp > 0.3;
    game.draw.sprite(up ? GULL_UP : GULL, GULL_PAL, W * 0.5, H * 0.66 + Math.sin(game.time.elapsed * 3) * 8, 14, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(30, 30, W - 60, H * 0.10, C.black, 0.6);
    game.draw.line(30, 30 + H * 0.10, W - 30, 30 + H * 0.10, C.cyan, 3);
    txt(correct + ' / ' + NEEDED, W * 0.3, H * 0.045, 56, C.white);
    for (var i = 0; i < MAX_MISS; i++) {
      game.draw.rect(W * 0.62 + i * 70, H * 0.03, 48, 48, i < MAX_MISS - misses ? C.red : '#303050');
    }
    if (combo >= 2) txt('x' + combo, W * 0.9, H * 0.045, 44, C.yellow);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, H * 0.105, W - 120, 16, '#303050');
    game.draw.rect(60, H * 0.105, (W - 120) * frac, 16, frac < 0.25 ? C.red : C.yellow);
    if (phase === 'pick') {
      var wf = Math.max(0, phaseT / win);
      game.draw.rect(W * 0.25, CARD_Y + CARD_H / 2 + 40, W * 0.5 * wf, 14, C.magenta);
    }
  }

  function scoreOf() {
    var avg = correct > 0 ? totalPick / correct : 2;
    return correct * 150 + Math.round(Math.max(0, 1.5 - avg) * 300) + Math.round(timeLeft * 20);
  }

  function drawResult() {
    game.draw.rect(60, H * 0.22, W - 120, H * 0.16, C.black, 0.85);
    game.draw.line(60, H * 0.22, W - 60, H * 0.22, roundOk ? C.yellow : C.red, 4);
    txt(roundOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.255, 90, roundOk ? C.yellow : C.red);
    var avg = correct > 0 ? (totalPick / correct).toFixed(2) : '-';
    txt(correct + ' / ' + NEEDED + '   ' + avg + '秒', W / 2, H * 0.31, 44, C.white);
    if (roundOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.355, 48, C.yellow);
    else if (!roundOk) txt('あと' + (NEEDED - correct) + '回!', W / 2, H * 0.355, 48, C.cyan);
    else txt('BEST ' + game.best, W / 2, H * 0.355, 40, C.white);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { initGame(); endPhase = 'play'; round = 3; newRound(); demo.acted = -1; }
    stepRound(dt, false);
    var tgt = maxIndex();
    if (round === 4) tgt = (tgt + 1) % 4;   // 2本目は誤答の実演
    demo.gx = cardX(tgt); demo.gy = CARD_Y + 80;
    demo.press = false;
    if (phase === 'pick' && pickT > 0.3 && demo.acted !== round) {
      demo.press = true; demo.acted = round;
      judgePick(tgt, false);
      if (cards[tgt].mark === 1) game.fx.burst(cardX(tgt), CARD_Y, { color: C.green, count: 8, speed: 200 });
      else game.fx.burst(cardX(tgt), CARD_Y, { color: C.red, count: 8, speed: 200 });
    }
    if (phase === 'reveal') demo.press = phaseT > 0.35;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (endPhase !== 'play') { game.audio.play('se_tap', 0.1); return; }
    var hitI = -1;
    for (var i = 0; i < 4; i++) {
      if (Math.abs(x - cardX(i)) < CARD_W / 2 + 12 && Math.abs(y - CARD_Y) < CARD_H / 2 + 60) hitI = i;
    }
    if (hitI < 0) { game.audio.tone('C3', 0.05, { wave: 'square', volume: 0.04 }); return; }
    game.audio.play('se_tap', 0.25);
    judgePick(hitI, true);
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!cards) initGame();
      stepDemo(dt);
      drawBg(); drawCards();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(TITLE, W / 2, H * 0.08, 90, C.cyan);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.14, 40, C.yellow);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.9, 52, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.9, 46, C.white);
      return;
    }
    if (state === S.RESULT) {
      drawBg(); drawCards(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.9, 44, C.white);
      return;
    }

    if (endPhase === 'ready') {
      endT -= dt;
      if (endT <= 0) { endPhase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (endPhase === 'play') {
      timeLeft -= dt;
      stepRound(dt, true);
      if (correct >= NEEDED) { roundOk = true; endPhase = 'stop'; endT = 0.45; }
      else if (misses >= MAX_MISS) { roundOk = false; endPhase = 'stop'; endT = 0.45; }
      else if (timeLeft <= 0) {
        timeLeft = 0; roundOk = false; endPhase = 'stop'; endT = 0.45;
        var b = maxIndex(); cards[b].mark = 2; focusX = cardX(b);
      }
    } else if (endPhase === 'stop') {
      endT -= dt;
      if (endT <= 0) {
        endPhase = 'end'; endT = 1.1;
        if (roundOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.yellow, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#f8e848', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (endPhase === 'end') {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var avg = correct > 0 ? Math.round(totalPick / correct * 1000) : 0;
        if (roundOk) game.end.success(scoreOf(), { correct: correct, misses: misses, avgMs: avg });
        else game.end.failure({ correct: correct, misses: misses, avgMs: avg });
        return;
      }
    }

    drawBg(); drawCards(); drawHud();
    if (endPhase === 'stop') {
      game.draw.rect(focusX - CARD_W / 2 - 20, focusY - CARD_H / 2 - 20, CARD_W + 40, CARD_H + 40, C.white, 0.35 + 0.2 * Math.sin(el * 30));
    }
    if (endPhase === 'ready') txt(endT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 110, C.yellow);
    if (endPhase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['E5', 0.5], ['A4', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
      ['F4', 0.5], ['C5', 0.5], ['F4', 0.5], ['C5', 0.5], ['B4', 0.5], ['G4', 0.5], ['E4', 1]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['A2', 2], ['F2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
