// K-GBA-0025-valley-drum-relay.js
// 谷間の太鼓返し — 対岸から届く長い太鼓の連打を聞き終えた直後、同じ間隔で正確に打ち返す
// 操作: 対岸の光る太鼓の間隔(拍)を見て覚え、消音後に同じテンポで太鼓をタップして打ち返す
// 終わり: 3フレーズ連続で正しいテンポを返せれば成功。1回でも間隔を外せば失敗
// @mechanic: rhythm
// @theme: valley_drum_relay
// 世界観: 深い谷を挟んだ二つの太鼓見張り台。対岸が打った長い合図の連打を聞き終えた直後、寸分違わぬ間隔で打ち返す使者の務め
// 残るもの: 正誤(CLEAR/GAME OVER) + 打ち返せたフレーズ数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: くっきりした中間色、グラデ地形、2〜3段の遠近レイヤー
  var C = {
    sky1: '#2a3860', sky2: '#0e1430', valley: '#1a2440', mist: '#4a5a80',
    drumFar: '#8a5a3a', drumNear: '#c88a48', hit: '#ffd94d',
    good: '#4de0a0', bad: '#ff5468', gold: '#ffd54d', white: '#f4f2ff', ink: '#080a18',
  };

  var GAME_TITLE = 'DRUM RELAY';
  var TOTAL_PHRASES = 3;
  var BASE_BEATS = 3;
  var HIT_TOL = 0.22; // 秒。この許容内で入力できればOK
  var DRUM_X = W * 0.5, DRUM_Y = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var phrase, phraseBeats, callIdx, callT, echoIdx, echoWinT, phase, pulseR;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUM_SPRITE = ['.####.', '######', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.5, C.sky2], [1, C.valley]]);
    game.draw.rect(0, H * 0.42, W, 8, C.mist, 0.3);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * 0.3 + i * 26, W, 2, '#ffffff05');
  }

  // フレーズは間隔リスト(拍と拍の秒数)。難度が上がるほど拍数が増え間隔も短くなる
  function makePhrase(n) {
    var gaps = [];
    var base = Math.max(0.42, 0.62 - phrase * 0.05);
    for (var i = 0; i < n; i++) gaps.push(base);
    return gaps;
  }

  function startPhrase() {
    phraseBeats = makePhrase(BASE_BEATS + phrase);
    callIdx = 0; callT = 0.5; echoIdx = 0; echoWinT = 0; phase = 'call'; pulseR = 0;
  }

  function initGame() {
    phrase = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    startPhrase();
  }

  function onDrumTap() {
    if (phase !== 'echo' || ready > 0 || done || finished) return;
    pulseR = 60;
    var target = phraseBeats[echoIdx];
    var diff = Math.abs(echoWinT - target);
    if (diff <= HIT_TOL) {
      game.feedback.good(DRUM_X, DRUM_Y, { text: '', sound: 'se_tap', color: C.good });
      game.audio.play('se_tap', 0.3);
      echoIdx++;
      echoWinT = 0;
      if (echoIdx >= phraseBeats.length) {
        game.fx.popup('PHRASE ' + (phrase + 1) + ' OK!', W * 0.5, H * 0.22, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.4);
        phrase++;
        if (phrase >= TOTAL_PHRASES) { ok = true; finished = true; finish(); return; }
        phase = 'gap'; echoWinT = 0; callT = 0.6;
      }
    } else {
      hitStop = 0.35;
      game.feedback.bad(DRUM_X, DRUM_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onDrumTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (phase === 'call') {
      callT -= dt;
      if (callT <= 0) {
        pulseR = 60;
        game.audio.play('se_tap', 0.35);
        callIdx++;
        if (callIdx > phraseBeats.length) { phase = 'echo'; echoWinT = 0; }
        else callT = phraseBeats[callIdx - 1] || 0.5;
      }
    } else if (phase === 'gap') {
      callT -= dt;
      if (callT <= 0) startPhrase();
    } else if (phase === 'echo') {
      echoWinT += dt;
      // 猶予を大幅に超えたら自動失敗(無反応対策)
      if (echoIdx < phraseBeats.length && echoWinT > phraseBeats[echoIdx] + HIT_TOL + 0.5) {
        hitStop = 0.3;
        game.feedback.bad(DRUM_X, DRUM_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
  }

  function drawDrum() {
    game.draw.circle(DRUM_X, DRUM_Y, 170, C.drumFar, 0.5);
    if (pulseR > 0) game.draw.circle(DRUM_X, DRUM_Y, 140 + (60 - pulseR), C.hit, Math.max(0, pulseR / 60) * 0.5);
    game.draw.sprite(DRUM_SPRITE, { '#': C.drumNear }, DRUM_X, DRUM_Y, 26, { anchor: 'center' });
    if (pulseR > 0) pulseR = Math.max(0, pulseR - 240 * (1 / 60));
  }

  var demo = { t: 0, gx: DRUM_X, gy: DRUM_Y + 220, press: false, dPhase: 'call', dGaps: [0.55, 0.55, 0.55], dCallIdx: 0, dEchoIdx: 0, dT: 0.5 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) {
      demo.dPhase = 'call'; demo.dCallIdx = 0; demo.dEchoIdx = 0; demo.dT = 0.5; pulseR = 0; demo.press = false;
    }
    demo.dT -= dt;
    if (demo.dPhase === 'call') {
      if (demo.dT <= 0) {
        pulseR = 60;
        game.audio.play('se_tap', 0.15);
        demo.dCallIdx++;
        if (demo.dCallIdx > demo.dGaps.length) { demo.dPhase = 'echo'; demo.dT = demo.dGaps[0]; }
        else demo.dT = demo.dGaps[demo.dCallIdx - 1] || 0.5;
      }
    } else if (demo.dPhase === 'echo') {
      if (demo.dT <= 0) {
        pulseR = 60; demo.press = true;
        game.audio.play('se_tap', 0.15);
        demo.dEchoIdx++;
        if (demo.dEchoIdx >= demo.dGaps.length) { demo.dPhase = 'done'; demo.dT = 0.7; }
        else demo.dT = demo.dGaps[demo.dEchoIdx];
      } else if (demo.dT < demo.dGaps[Math.min(demo.dEchoIdx, demo.dGaps.length - 1)] - 0.2) demo.press = false;
    } else if (demo.dPhase === 'done') {
      if (demo.dT <= 0) demo.dPhase = 'call';
    }
    if (pulseR > 0) pulseR = Math.max(0, pulseR - 240 * dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDrum();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(phrase + ' / ' + TOTAL_PHRASES, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL_PHRASES - phrase) + '!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(phrase, { phrase: phrase, total: TOTAL_PHRASES }); else game.end.failure({ phrase: phrase, total: TOTAL_PHRASES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
      if (pulseR > 0) pulseR = Math.max(0, pulseR - 240 * dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDrum();

    txt(phrase + ' / ' + TOTAL_PHRASES, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (phrase / TOTAL_PHRASES), 16, C.gold);
    if (phase === 'echo' && !finished) {
      game.draw.circle(W * 0.5, H * 0.78, 14, C.hit, 0.8 + 0.2 * Math.sin(game.time.elapsed * 12));
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E3', 0.5], ['G3', 0.5], ['B3', 0.5], ['E4', 1]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
