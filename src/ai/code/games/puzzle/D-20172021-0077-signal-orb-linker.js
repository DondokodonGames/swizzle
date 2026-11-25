// D-20172021-0077-signal-orb-linker.js
// シグナルオーブ・リンカー — 浮遊する文字玉を正しい順に指でつなぎ、暗号語を組み立てる
// 操作: 6つの文字玉のうち、指定された単語の並び順どおりに、指を離さず次々つないでいく
// 終わり: 2つの暗号語をどちらも正しい順でつなぎ終えれば成功。違う玉に触れるか時間切れで失敗
// @mechanic: connect
// @theme: signal_orb_linker
// 世界観: 地下通信基地の暗号手が、浮遊する文字玉の群れから指定の暗号語を正しい順に指でつなぎ、回線へ送信する
// 残るもの: 正誤(CLEAR/GAME OVER) + つなぎ終えた語数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺の夜に発光ライン、マゼンタ/シアンの強アクセント
  var C = {
    bg: '#0a0a24', bg2: '#140a30', panel: '#1a1440', panelLine: '#3a2a70',
    orb: '#241a4a', orbLit: '#2adfff', orbDone: '#39ff9e', orbBad: '#ff2ad1',
    line: '#2adfff',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffe14d', white: '#eaf6ff', ink: '#05030f',
  };

  var GAME_TITLE = 'ORB LINK';
  var WORDS = ['さくら', 'きりん', 'とかげ', 'ひかり', 'なみだ'];
  var DECOY = 'あいうえおかきくけこすせそたちつてとねのまみめもやゆよ'.split('');
  var TOTAL_WORDS = 2;
  var TIME_LIMIT = 17;
  var ORB_R = 66;
  var POS = [
    { x: W * 0.26, y: H * 0.32 },
    { x: W * 0.5, y: H * 0.28 },
    { x: W * 0.74, y: H * 0.32 },
    { x: W * 0.26, y: H * 0.52 },
    { x: W * 0.5, y: H * 0.58 },
    { x: W * 0.74, y: H * 0.52 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OPERATOR = ['.#.', '###', '.#.', '#.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    for (var i = 0; i < 5; i++) {
      var yy = H * 0.12 + i * H * 0.1;
      game.draw.line(0, yy, W, yy, C.orbLit, 2, 0.05 + pulse);
    }
    game.draw.sprite(OPERATOR, { '#': C.gold }, W * 0.5, H * 0.10, 16, { anchor: 'center' });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(game.random(0, i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var wordIdx, usedWords, word, orbs, visitIdx, wordsDone;
  var dragging, timeLeft, halfShown, done, endWait, finished, ready, hitStop, shake;

  function newWordRound(wi) {
    var w = WORDS[wi];
    var letters = w.split('');
    var slotOrder = shuffle([0, 1, 2, 3, 4, 5]);
    var targetSlots = slotOrder.slice(0, 3);
    var decoySlots = slotOrder.slice(3);
    var o = new Array(6);
    for (var i = 0; i < 3; i++) o[targetSlots[i]] = { x: POS[targetSlots[i]].x, y: POS[targetSlots[i]].y, letter: letters[i], isTarget: true, seq: i, visited: false };
    var pool = shuffle(DECOY);
    for (var k = 0; k < decoySlots.length; k++) o[decoySlots[k]] = { x: POS[decoySlots[k]].x, y: POS[decoySlots[k]].y, letter: pool[k], isTarget: false, seq: -1, visited: false };
    return { word: w, orbs: o };
  }

  function initGame() {
    wordsDone = 0;
    usedWords = shuffle([0, 1, 2, 3, 4]).slice(0, TOTAL_WORDS);
    wordIdx = 0;
    var r = newWordRound(usedWords[0]); word = r.word; orbs = r.orbs;
    visitIdx = 0; dragging = false;
    timeLeft = TIME_LIMIT; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function orbAt(x, y) {
    for (var i = 0; i < orbs.length; i++) {
      if (Math.hypot(x - orbs[i].x, y - orbs[i].y) <= ORB_R) return i;
    }
    return -1;
  }

  function drawOrbs() {
    for (var i = 0; i < orbs.length; i++) {
      var o = orbs[i];
      var col = o.visited ? C.orbDone : C.orb;
      game.draw.circle(o.x, o.y, ORB_R, col);
      game.draw.circle(o.x, o.y, ORB_R, C.orbLit, o.visited ? 0.2 : 0.35);
      txt(o.letter, o.x, o.y + 12, 32, o.visited ? '#052a10' : C.white);
    }
    for (var v = 1; v < visitIdx; v++) {
      var a = null, b = null;
      for (var q = 0; q < orbs.length; q++) { if (orbs[q].isTarget && orbs[q].seq === v - 1) a = orbs[q]; if (orbs[q].isTarget && orbs[q].seq === v) b = orbs[q]; }
      if (a && b) game.draw.line(a.x, a.y, b.x, b.y, C.line, 6, 0.7);
    }
  }

  function advanceWord() {
    wordsDone++;
    game.fx.popup(wordsDone >= TOTAL_WORDS ? 'CLEAR' : 'NICE', W * 0.5, H * 0.20, { color: C.gold, size: 34 });
    game.audio.play('se_milestone', 0.4);
    if (wordsDone >= TOTAL_WORDS) { ok = true; finished = true; hitStop = 0.18; finish(); return; }
    wordIdx++;
    var r = newWordRound(usedWords[wordIdx]); word = r.word; orbs = r.orbs; visitIdx = 0;
    timeLeft = Math.min(TIME_LIMIT, timeLeft + 6);
  }

  function touch(x, y) {
    if (done || ready > 0 || finished) return;
    var i = orbAt(x, y);
    if (i < 0) return;
    var o = orbs[i];
    if (o.visited) return;
    if (o.isTarget && o.seq === visitIdx) {
      o.visited = true; visitIdx++;
      hitStop = 0.05;
      game.feedback.good(o.x, o.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.3);
      if (visitIdx >= 3) advanceWord();
    } else {
      hitStop = 0.35; shake = 0.3;
      game.feedback.bad(o.x, o.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = true;
    game.audio.play('se_tap', 0.05);
    touch(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    if (Math.random() < 0.03) game.audio.play('se_tap', 0.02);
    touch(x, y);
  });
  game.onRelease(function(x, y) {
    if (dragging) game.audio.play('se_tap', 0.04);
    dragging = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: POS[0].x, gy: POS[0].y, press: false };
  function resetDemo() {
    wordsDone = 0; usedWords = [0, 1]; wordIdx = 0;
    var r = newWordRound(usedWords[0]); word = r.word; orbs = r.orbs; visitIdx = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var stepDur = 1.1;
    var idx = Math.floor(cyc / stepDur);
    var local = cyc - idx * stepDur;
    if (idx >= 3) { demo.press = false; return; }
    var target = null;
    for (var q = 0; q < orbs.length; q++) if (orbs[q].isTarget && orbs[q].seq === idx) target = orbs[q];
    if (!target) return;
    if (local < 0.75) {
      var prev = idx === 0 ? demo.startX !== undefined ? { x: demo.startX, y: demo.startY } : target : (function () { var p = null; for (var qq = 0; qq < orbs.length; qq++) if (orbs[qq].isTarget && orbs[qq].seq === idx - 1) p = orbs[qq]; return p; })();
      var fromX = idx === 0 ? W * 0.5 : prev.x, fromY = idx === 0 ? H * 0.82 : prev.y;
      var t2 = local / 0.75;
      demo.gx = fromX + (target.x - fromX) * t2;
      demo.gy = fromY + (target.y - fromY) * t2;
      demo.press = true;
    } else if (!target.visited) {
      target.visited = true; visitIdx = idx + 1;
      game.feedback.good(target.x, target.y, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (orbs === undefined) initGame();
      bg();
      stepDemo(dt);
      drawOrbs();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.095, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawOrbs();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 42, ok ? C.good : C.bad);
      txt(wordsDone + ' / ' + TOTAL_WORDS, W / 2, H * 0.10, 26, C.gold);
      if (!ok) txt('あと' + (TOTAL_WORDS - wordsDone) + '語!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { words: wordsDone, total: TOTAL_WORDS };
        if (ok) game.end.success(wordsDone, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfShown && timeLeft <= TIME_LIMIT * 0.5) { halfShown = true; game.fx.popup('あと' + (TOTAL_WORDS - wordsDone) + '語!', W * 0.5, H * 0.2, { color: C.gold, size: 30 }); }
      if (timeLeft <= 0) {
        timeLeft = 0; hitStop = 0.3; shake = 0.25;
        game.feedback.bad(W * 0.5, H * 0.42, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawOrbs();

    txt(wordsDone + ' / ' + TOTAL_WORDS, W / 2, H * 0.06, 26, C.white);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, H * 0.90, W - 120, 16, C.panel, 1);
    game.draw.rect(60, H * 0.90, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
