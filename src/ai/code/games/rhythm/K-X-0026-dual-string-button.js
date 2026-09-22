// K-X-0026-dual-string-button.js
// デュアルストリングボタン — 音符に合わせて右手でボタンを押しながら、左手で弦をかき鳴らす
// 操作: 右半分は流れる音符が判定ラインに来た瞬間タップ。左半分は弦が光ったら素早く横に指をドラッグしてかき鳴らす
// 終わり: 両方の役目をやり切れば成功。見逃し累計4回で失敗
// @mechanic: coop_2zone
// @theme: dual_string_button
// 世界観: 路上に立つ一人の弾き語り。右手は判定ラインに合わせてフレットボタンを押さえ、左手は光る弦をかき鳴らす。両手を同時に操って一曲を弾き切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 押せた音符数とかき鳴らせた回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 大きめのブロック単位、濃い縁取りと単純な陰影
  var C = {
    bg: '#20161c', bg2: '#120b10', panel: '#3a2530', accent: '#ff9d3f',
    string: '#5fd3ff', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400',
    white: '#f6efe9', ink: '#0a0608',
  };

  var GAME_TITLE = 'DUAL STRING';
  var RX = W * 0.72, LX = W * 0.28;
  var LINE_Y = H * 0.74, SPAWN_Y = H * 0.24;
  var STRING_Y0 = H * 0.55, STRING_Y1 = H * 0.85;
  var TOTAL_NOTES = 10, TOTAL_STRUMS = 5, MISS_LIMIT = 4;
  var STRUM_WINDOW = 1.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var rightRound, rightHits, note, strumIdx, strumHits, strumActive, strumWinT, misses, score, playT;
  var pressLeftActive, pressLeftX;
  var done, endWait, finished, ready, hitStop, shake, flashLine, flashString;
  var STRUM_TIMES;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUSKER = ['..##..', '.####.', '..##..', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(RX - 130, SPAWN_Y - 30, 260, LINE_Y - SPAWN_Y + 60, C.panel, 0.4);
    game.draw.rect(0, H * 0.9, W, 6, '#ffffff08');
  }

  function newNote() { return { t: 0, dur: 1.05, resolved: false }; }

  function drawRight() {
    game.draw.rect(RX - 140, LINE_Y - 8, 280, 16, flashLine > 0 ? C.white : '#ffffff30');
    if (note && !finished) {
      var p = Math.min(1.3, note.t / note.dur);
      var y = SPAWN_Y + (LINE_Y - SPAWN_Y) * p;
      game.draw.circle(RX, y, 36, C.accent);
    }
  }

  function drawLeft() {
    var hot = strumActive;
    game.draw.line(LX, STRING_Y0, LX, STRING_Y1, hot ? C.white : C.string, hot ? 12 : 8);
    game.draw.circle(LX, STRING_Y0 - 24, 18, hot ? C.gold : C.string, hot ? 1 : 0.6);
  }

  function drawBusker() {
    game.draw.sprite(BUSKER, { '#': C.gold }, W * 0.5, H * 0.90 + Math.sin(game.time.elapsed * 2.4) * 6, 22, { anchor: 'center' });
  }

  function scheduleStrums() {
    STRUM_TIMES = [];
    for (var i = 0; i < TOTAL_STRUMS; i++) STRUM_TIMES.push(1.4 + i * 2.9);
  }

  function initGame() {
    rightRound = 0; rightHits = 0; note = newNote();
    strumIdx = 0; strumHits = 0; strumActive = false; strumWinT = 0;
    misses = 0; score = 0; playT = 0;
    pressLeftActive = false; pressLeftX = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashLine = 0; flashString = 0;
    scheduleStrums();
  }

  function checkEnd() {
    if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return true; }
    if (rightRound >= TOTAL_NOTES && strumIdx >= TOTAL_STRUMS) { ok = true; finished = true; finish(); return true; }
    return false;
  }

  function resolveRight() {
    if (state !== S.PLAYING || ready > 0 || done || finished || !note || note.resolved) return;
    note.resolved = true;
    var ratio = note.t / note.dur;
    if (ratio >= 0.75 && ratio <= 1.25) {
      rightHits++; score += 80;
      flashLine = 0.15; hitStop = 0.06;
      game.feedback.good(RX, LINE_Y, { text: 'GOOD', color: C.good });
    } else {
      misses++; hitStop = 0.2; shake = 0.15;
      game.feedback.bad(RX, LINE_Y, { text: 'MISS' });
    }
    rightRound++;
    if (rightRound === Math.ceil(TOTAL_NOTES / 2)) { game.fx.popup('HALFWAY!', RX, LINE_Y - 260, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.4); }
    if (checkEnd()) return;
    note = newNote();
  }

  function resolveStrum(dx) {
    strumActive = false;
    if (Math.abs(dx) >= 120) {
      strumHits++; score += 120;
      flashString = 0.2; hitStop = 0.08;
      game.feedback.good(LX, STRING_Y0, { text: 'NICE', color: C.gold });
      game.audio.play('se_powerup', 0.3);
    } else {
      misses++; hitStop = 0.2; shake = 0.15;
      game.feedback.bad(LX, STRING_Y0, { text: 'MISS' });
    }
    strumIdx++;
    checkEnd();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && x >= W * 0.5) { game.audio.play('se_tap', 0.04); resolveRight(); }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || x >= W * 0.5) return;
    pressLeftActive = true; pressLeftX = x;
    game.audio.play('se_tap', 0.03);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressLeftActive) return;
    pressLeftActive = false;
    game.audio.play('se_tap', 0.02);
    if (ready > 0 || done || finished) return;
    if (strumActive) resolveStrum(x - pressLeftX);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RX, gy: LINE_Y, press: false, side: 'r', n: null, did: false, sx: LX };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { demo.n = newNote(); demo.n.dur = 1.0; demo.did = false; demo.side = 'r'; }
    if (cyc < 1.3) {
      demo.side = 'r';
      demo.n.t += dt;
      note = demo.n;
      var ratio = demo.n.t / demo.n.dur;
      demo.gx = RX + Math.sin(game.time.elapsed * 2.4) * 10;
      demo.gy = LINE_Y + Math.cos(game.time.elapsed * 2) * 8;
      demo.press = ratio > 0.8 && ratio < 1.0;
      if (demo.press && !demo.did) { demo.did = true; flashLine = 0.15; game.feedback.good(RX, LINE_Y, { text: 'GOOD', color: C.good, sound: 'se_good', volume: 0.2 }); }
    } else {
      demo.side = 'l';
      var lp = (cyc - 1.3) / 1.5;
      strumActive = lp < 0.6;
      demo.gx = LX + Math.sin(lp * Math.PI * 3) * 90;
      demo.gy = STRING_Y0 + 60 + Math.sin(game.time.elapsed * 3) * 6;
      demo.press = lp < 0.6;
      if (lp >= 0.6 && !demo.did) { demo.did = true; flashString = 0.2; game.feedback.good(LX, STRING_Y0, { text: 'NICE', color: C.gold, sound: 'se_powerup', volume: 0.2 }); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rightRound === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRight();
      drawLeft();
      drawBusker();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRight();
      drawLeft();
      drawBusker();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(rightHits + ' / ' + TOTAL_NOTES, W / 2, H * 0.13, 26, C.gold);
      txt(strumHits + ' / ' + TOTAL_STRUMS, W / 2, H * 0.17, 26, C.string);
      if (!ok) txt('あと' + Math.max(0, MISS_LIMIT - misses) + '!', W / 2, H * 0.22, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(score, { rightHits: rightHits, strumHits: strumHits });
        else game.end.failure({ rightHits: rightHits, strumHits: strumHits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playT += dt;
      note.t += dt;
      if (note.t / note.dur > 1.35 && !note.resolved) {
        note.resolved = true; misses++; hitStop = 0.2; shake = 0.15;
        game.feedback.bad(RX, LINE_Y, { text: 'MISS' });
        rightRound++;
        if (!checkEnd()) note = newNote();
      }
      if (!strumActive && strumIdx < TOTAL_STRUMS && STRUM_TIMES && playT >= STRUM_TIMES[strumIdx]) {
        strumActive = true; strumWinT = 0;
        game.audio.play('se_tap', 0.06);
      }
      if (strumActive) {
        strumWinT += dt;
        if (strumWinT > STRUM_WINDOW) { resolveStrum(0); }
      }
    }
    if (flashLine > 0) flashLine -= dt;
    if (flashString > 0) flashString -= dt;
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) { drawRight(); drawLeft(); }
    else { drawRight(); drawLeft(); }
    drawBusker();

    txt(rightHits + '/' + TOTAL_NOTES + '  ' + strumHits + '/' + TOTAL_STRUMS, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, (MISS_LIMIT - misses) / MISS_LIMIT), 16, C.accent);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.25], ['G4', 0.25], ['B4', 0.25], ['E5', 0.5]], { tempo: 132, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
