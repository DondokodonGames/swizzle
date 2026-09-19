// GH-PS2-0075-buzzer-duel-2p.js
// ブザーデュエル2P — 1台の画面を上下分割し、合図が光った瞬間だけ自分側をタップして早押し
// 操作: 画面上半分がP2、下半分がP1。中央ランプが光った瞬間に自分側をタップ。光る前のタップはお手つき
// 終わり: 3本先取で決着。5本目は得点2倍のゴールデンラウンド
// @mechanic: duel_2p
// @theme: split_screen_buzzer_hall
// 世界観: 1台の筐体を上下から挟んで向き合う早押しホール。合図が光る間隔は毎回変わり、お手つきは相手に1本を献上する
// 残るもの: 勝敗(CLEAR/GAME OVER) + 本数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HOME: 3〜4色+黒。粗いドット、輪郭線なし、背景はタイル反復
  var C = {
    bg: '#101820', tileA: '#182430', tileB: '#0c1218',
    p1: '#f0c030', p2: '#40c8e0', lampOff: '#283440', lampOn: '#f04040', gold: '#f0c030',
    good: '#40e070', bad: '#f04040', white: '#f0f4f0', ink: '#0a0e10',
  };

  var GAME_TITLE = 'BUZZER DUEL';
  var WIN = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, p1Score = 0, p2Score = 0, round = 0;

  var phase, phaseT, lit, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 2, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2, CY = H * 0.5;

  function tileBg() {
    game.draw.gradient(0, H, [[0, '#182430'], [0.5, C.bg], [1, '#182430']]);
    for (var y = 0; y < H; y += 32) {
      for (var x = 0; x < W; x += 32) {
        if (((x / 32) + (y / 32)) % 2 === 0) game.draw.rect(x, y, 32, 32, C.tileA, 0.5);
      }
    }
    game.draw.line(0, CY, W, CY, C.white, 6);
  }

  var STAR_SPRITE = ['..#..', '..#..', '#####', '..#..', '..#..'];

  function drawSide(y, up, col, score, isGolden) {
    // プレイヤーモチーフ: 8bitの星型アイコン
    game.draw.sprite(STAR_SPRITE, { '#': col }, CX, y, 14, { anchor: 'center' });
    for (var i = 0; i < WIN; i++) {
      var x = CX - (WIN - 1) * 40 + i * 80;
      var yy = up ? y - 130 : y + 130;
      game.draw.rect(x - 14, yy - 14, 28, 28, i < score ? col : C.lampOff);
    }
    if (isGolden) txt('GOLDEN', CX, up ? y - 190 : y + 190, 26, C.gold);
  }

  function newRound() {
    round++;
    phase = 'wait'; phaseT = 0.6 + Math.random() * 1.6; lit = false;
  }

  function initGame() {
    p1Score = 0; p2Score = 0; round = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function isGoldenRound() { return round === 5; }

  function award(winnerIsP1, x, y) {
    hitStop = 0.16;
    var mult = isGoldenRound() ? 2 : 1;
    if (winnerIsP1) p1Score += mult; else p2Score += mult;
    game.feedback.good(x, y, { text: mult > 1 ? 'GOLDEN!' : 'GET!', color: C.good });
    game.fx.burst(x, y, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_success', 0.4);
    if (p1Score >= WIN || p2Score >= WIN) {
      ok = p1Score >= WIN; finished = true; finish();
    } else {
      game.fx.popup(p1Score + '-' + p2Score, CX, H * 0.06, { color: C.gold, size: 40 });
      if (p1Score === WIN - 1 || p2Score === WIN - 1) game.audio.play('se_milestone', 0.4);
      newRound();
    }
  }

  function penalize(faultIsP1, x, y) {
    hitStop = 0.16; shake = 0.18;
    game.feedback.bad(x, y, { text: 'FAULT' });
    game.audio.play('se_bad', 0.35);
    // お手つきは相手に1本
    if (faultIsP1) p2Score++; else p1Score++;
    if (p1Score >= WIN || p2Score >= WIN) { ok = p1Score >= WIN; finished = true; finish(); }
    else newRound();
  }

  function handleTap(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    game.audio.play('se_tap', 0.05);
    var isP1 = y > CY; // 下半分 = P1
    if (!lit) { penalize(isP1, x, y); return; }
    award(isP1, x, y);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    handleTap(x, y);
  });

  function stepRound(dt) {
    phaseT -= dt;
    if (phase === 'wait' && phaseT <= 0) {
      phase = 'lit'; lit = true;
      game.audio.tone(700, 0.1, { wave: 'square', volume: 0.18 });
    }
  }

  // ── ATTRACT ゴースト実演: P1側は光った瞬間に押す成功例、次はランプ前に押すお手つき例(P2側の手で表現) ──
  var demo = { t: 0, gx: CX, gy: CY + 300, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { p1Score = 0; p2Score = 0; round = 1; }
    if (cyc < 1.2) { lit = false; }
    else if (cyc < 2.0) { lit = true; }
    else if (cyc < 2.8) { lit = false; }
    else { lit = false; }

    if (cyc > 1.20 && cyc < 1.34) {
      demo.gx = CX; demo.gy = CY + 300; demo.press = true;
      if (cyc - dt <= 1.20) { game.feedback.good(CX, CY + 160, { text: 'GET!', color: C.good }); game.fx.burst(CX, CY + 160, { color: C.gold, count: 10, speed: 300 }); p1Score = 1; }
    } else if (cyc > 2.10 && cyc < 2.24) {
      demo.gx = CX; demo.gy = CY - 300; demo.press = true;
      if (cyc - dt <= 2.10) { game.feedback.bad(CX, CY - 160, { text: 'FAULT' }); p2Score = 1; }
    } else {
      demo.gx += ((CX) - demo.gx) * Math.min(1, dt * 3);
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (p1Score === undefined) initGame();
      tileBg();
      stepDemo(dt);
      drawSide(CY - 220, true, C.p2, p2Score, false);
      drawSide(CY + 220, false, C.p1, p1Score, false);
      game.draw.circle(CX, CY, lit ? 44 : 30, lit ? C.lampOn : C.lampOff);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' WIN' : '-'), W / 2, H * 0.95, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      tileBg();
      drawSide(CY - 220, true, C.p2, p2Score, false);
      drawSide(CY + 220, false, C.p1, p1Score, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', CX, H * 0.06, 50, ok ? C.good : C.bad);
      txt(p1Score + ' - ' + p2Score, CX, H * 0.92, 32, C.white);
      if (!ok && p1Score === WIN - 1) txt('あと1本!', CX, H * 0.98, 26, C.gold);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ score: p1Score + '-' + p2Score });
        else game.end.failure({ score: p1Score + '-' + p2Score });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (shake > 0) shake -= dt;

    tileBg();
    drawSide(CY - 220, true, C.p2, p2Score, isGoldenRound());
    drawSide(CY + 220, false, C.p1, p1Score, isGoldenRound());
    game.draw.circle(CX, CY, lit ? 46 : 30, lit ? C.lampOn : C.lampOff);

    txt(p1Score + ' / ' + WIN, CX, H * 0.98, 24, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', CX, CY - 90, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
