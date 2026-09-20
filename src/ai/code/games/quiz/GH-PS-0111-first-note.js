// GH-PS-0111-first-note.js
// ファーストノート — 曲が流れた瞬間に押す。早いほど高得点
// 操作: 5曲を聴き分ける。曲名が分かった瞬間にタップ
// 終わり: 5曲。正誤×速さの合計点が残る。何問目で何点だったかが並んで残る
// @mechanic: reaction_duel
// @theme: sign_lounge
// 世界観: サイン一つで進行するラウンジ。曲は流れ続け、分かった瞬間に手を挙げれば点が入る。遅いほど点は落ちる
// 残るもの: 5問ぶんの点(SCORE)。各問の反応時間バー(速いほど長い緑)
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2010s FLAT MOBILE: フラットデザイン。単色ベタ塗り + わずかな影
  var C = {
    bg: '#f4f2ee', card: '#ffffff', shadow: '#00000022',
    primary: '#4a6cf7', accent: '#ffb020', good: '#2ecc71', bad: '#e74c3c',
    ink: '#22252b', dim: '#8a8f98', white: '#ffffff',
  };

  var GAME_TITLE = 'FIRST NOTE';
  var ROUNDS = 5;
  var ROUND_TIME = 4.0;   // 曲が流れてから正解ウィンドウの目安

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var round, roundT, score, results, done, endWait, waitNext, toneIdx;
  var ready, hitStop, shake, pulse;

  // 曲ごとの音形(単純な上昇/下降パターン)。answerAt はその曲を判定できる拍数
  var TUNES = [
    { notes: ['C4', 'E4', 'G4', 'C5'], answerAt: 2 },
    { notes: ['G4', 'F4', 'E4', 'D4'], answerAt: 2 },
    { notes: ['E4', 'E4', 'G4', 'G4'], answerAt: 1 },
    { notes: ['A4', 'C5', 'E5', 'A5'], answerAt: 2 },
    { notes: ['D4', 'D4', 'A4', 'A4'], answerAt: 1 },
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function cardBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#e8e5dd']]);
    game.draw.gradient(0, H * 0.30, [[0, '#5a7bff'], [1, C.primary]]);
  }

  function initGame() {
    round = 0; score = 0; results = []; done = false; endWait = 0; waitNext = 0;
    ready = 0.8; hitStop = 0; shake = 0; pulse = 0;
    newRound();
  }

  function newRound() {
    roundT = 0; toneIdx = -1;
  }

  function playTone() {
    var tune = TUNES[round % TUNES.length];
    toneIdx++;
    if (toneIdx < tune.notes.length) {
      game.audio.tone(tune.notes[toneIdx], 0.35, { wave: 'triangle', volume: 0.18 });
      pulse = 0.3;
    }
  }

  function answer() {
    var tune = TUNES[round % TUNES.length];
    var atNote = toneIdx;   // 何拍目で押したか(0始まり)
    var correct = atNote >= tune.answerAt - 1;   // 判定できる拍を過ぎてから押せば正解
    var speedBonus = correct ? Math.max(20, 100 - Math.round((roundT - (tune.answerAt - 1) * 0.9) * 40)) : 0;
    var pts = correct ? speedBonus : 0;
    score += pts;
    results.push({ correct: correct, pts: pts });
    hitStop = 0.10;
    if (correct) { game.feedback.good(W / 2, H * 0.50, { text: '+' + pts, color: C.good }); game.fx.burst(W / 2, H * 0.50, { color: C.good, count: 12, speed: 360 }); }
    else { game.feedback.bad(W / 2, H * 0.50, { text: 'MISS' }); shake = 0.2; }
    var correctSoFar = results.filter(function(r) { return r.correct; }).length;
    if (correctSoFar === 3) { game.fx.popup(correctSoFar + ' / ' + ROUNDS, W / 2, H * 0.42, { color: C.accent, size: 56 }); game.audio.play('se_milestone', 0.4); }
    round++;
    if (round >= ROUNDS) finish();
    else waitNext = 0.9;
  }

  function finish() {
    if (done) return;
    done = true; finalScore = score;
    game.audio.stopBgm();
    game.audio.play(score > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  var NOTE_SPRITE = ['..#.', '..#.', '..#.', '.##.', '###.'];
  var NOTE_PAL = { '#': C.primary };
  var SPEAKER = ['#.......#', '##.....##', '###.###.', '#########', '###.###.', '##.....##', '#.......#'];
  var SPEAKER_PAL = { '#': '#d8ddf0' };

  function drawStage() {
    // 下半分は「サインラウンジの床」。スピーカーの輪郭 + 反響のリングでスカスカを防ぐ
    var cx = W / 2, cy = H * 0.56;
    for (var ring = 3; ring >= 1; ring--) {
      var rr = 90 + ring * 70 + Math.sin(game.time.elapsed * 2 - ring) * 8;
      game.draw.circle(cx, cy, rr, C.primary, 0.04 * ring);
    }
    game.draw.sprite(SPEAKER, SPEAKER_PAL, cx, cy, 20, { anchor: 'center' });
  }

  function drawWave() {
    // 音が流れていることを絵で見せる(波形)
    var cx = W / 2, cy = H * 0.30;
    game.draw.sprite(NOTE_SPRITE, NOTE_PAL, cx - 150, cy, 10, { anchor: 'center' });
    game.draw.sprite(NOTE_SPRITE, NOTE_PAL, cx + 150, cy, 10, { anchor: 'center', flipX: true });
    for (var i = -6; i <= 6; i++) {
      var amp = 20 + Math.abs(Math.sin(game.time.elapsed * 6 + i)) * (30 + pulse * 60);
      game.draw.rect(cx + i * 26 - 6, cy - amp / 2, 12, amp, '#ffffff', pulse > 0 ? 0.9 : 0.5);
    }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0 || hitStop > 0 || waitNext > 0) return;
    answer();
  });

  // ── ATTRACT ゴースト実演: 早すぎると外れ、聴き分けた瞬間に押すと当たる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.70, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (Math.floor(cyc / 0.9) !== Math.floor((cyc - dt) / 0.9)) { game.audio.tone('E4', 0.3, { wave: 'triangle', volume: 0.15 }); pulse = 0.3; }
    demo.press = (cyc > 0.3 && cyc < 0.5) || (cyc > 2.0 && cyc < 2.2);
    if (cyc > 0.3 && cyc < 0.33) game.feedback.bad(W / 2, H * 0.50, { text: 'MISS' });
    if (cyc > 2.0 && cyc < 2.03) { game.feedback.good(W / 2, H * 0.50, { text: '+80', color: C.good }); game.fx.burst(W / 2, H * 0.50, { color: C.good, count: 10, speed: 300 }); }
    if (pulse > 0) pulse -= dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      cardBg();
      stepDemo(dt);
      drawWave();
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 72, C.white);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.15, 36, C.white);
      game.draw.rect(0, H * 0.30, W, H * 0.70, C.bg);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 54, C.accent);
        txt('TAP TO START', W / 2, H * 0.60, 44, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.60, 38, C.dim);
      }
      return;
    }

    if (state === S.RESULT) {
      cardBg();
      drawWave();
      drawStage();
      txt(finalScore > 0 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 60, finalScore > 0 ? C.white : C.bad);
      // 残るもの: 5問ぶんの点を棒で
      for (var i = 0; i < results.length; i++) {
        var r = results[i], x = W / 2 - 240 + i * 120, h = Math.max(6, r.pts);
        game.draw.rect(x - 30, H * 0.60 - h, 60, h, r.correct ? C.good : C.bad);
        txt(String(r.pts), x, H * 0.60 - h - 16, 26, C.ink);
      }
      game.draw.rect(W / 2 - 260, H * 0.60, 520, 4, C.dim);
      txt('SCORE ' + String(finalScore).padStart(4, '0'), W / 2, H * 0.72, 54, C.ink);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(4, '0'), W / 2, H * 0.78, 38, C.primary);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.84, 42, C.accent);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 38, C.dim);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { results: results.map(function(r) { return r.pts; }).join(',') }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (waitNext > 0) {
      waitNext -= dt;
      if (waitNext <= 0) newRound();
    } else {
      roundT += dt;
      var tune = TUNES[round % TUNES.length];
      var beat = 0.9;
      if (Math.floor(roundT / beat) > toneIdx) playTone();
      if (pulse > 0) pulse -= dt;
      if (roundT > tune.notes.length * beat + 0.5) { results.push({ correct: false, pts: 0 }); game.feedback.bad(W / 2, H * 0.50, { text: 'MISS' }); round++; if (round >= ROUNDS) finish(); else waitNext = 0.9; }
    }
    if (shake > 0) shake -= dt;

    cardBg();
    drawWave();
    game.draw.rect(0, H * 0.30, W, H * 0.70, C.bg);
    drawStage();

    var frac = round / ROUNDS;
    game.draw.rect(60, H * 0.09, W - 120, 20, '#ffffff', 0.3);
    game.draw.rect(60, H * 0.09, (W - 120) * frac, 20, C.accent);
    txt('SCORE ' + String(score).padStart(4, '0'), W / 2, H * 0.06, 40, C.white);
    txt((round + 1) + ' / ' + ROUNDS, W * 0.16, H * 0.20, 34, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.56, 84, C.primary);
    else if (!done && waitNext <= 0) txt('分かったら タップ', W / 2, H * 0.82, 36, C.dim);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
