// K-X-0035-conduit-pulse-hold.js
// コンジットパルスホールド — 伸びてくる送電ラインの短点はタップ、長い帯は押しっぱなしで送電する
// 操作: ラインが点(短)ならタップ、帯(長)なら帯の間ずっと指を押さえ続けて離す
// 終わり: 規定8区画を全て正しく送電できれば成功。取りこぼせば失敗
// @mechanic: hold_duration
// @theme: power_line_lineman
// 世界観: 嵐の夜の送電線技師。判定ラインまで伸びてくる導線を、短い区画はタップで、長い区画は押さえ続けて通電させる
// 残るもの: 正誤(CLEAR/GAME OVER) + 送電できた区画数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像ピクセル、なめらかなグラデーション、鋭いグロー
  var C = {
    bg: '#0a0f1a', bg2: '#121b30', line: '#233252', judge: '#ffd23f',
    note: '#3fd8ff', noteGlow: '#0c3a55', hold: '#4dffb0', holdGlow: '#0c4a3a',
    good: '#39ff6a', bad: '#ff4455', gold: '#ffe066', white: '#ffffff', ink: '#050810',
  };

  var GAME_TITLE = 'CONDUIT PULSE';
  var TOTAL = 8;
  var CX = W * 0.5;
  var JUDGE_Y = H * 0.66;
  var SPAWN_Y = H * 0.16;
  var TRAVEL = 1.05;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, done, endWait, finished, seg, round, holding, holdT;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LINEMAN = ['.##.', '####', '.##.', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.line(CX, SPAWN_Y - 60, CX, JUDGE_Y + 200, C.line, 30);
    game.draw.line(60, JUDGE_Y, W - 60, JUDGE_Y, C.judge, 6);
    var bob = Math.sin(game.time.elapsed * 2.6) * 8;
    game.draw.sprite(LINEMAN, { '#': C.gold }, W * 0.82, JUDGE_Y + bob, 12, { anchor: 'center' });
  }

  function newSeg(isHold, dur) {
    return { hold: isHold, t: 0, dur: dur, resolved: false, pressed: false, pressOk: false };
  }

  function initGame() {
    solved = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; round = 0; holding = false; holdT = 0;
    seg = newSeg(false, TRAVEL);
  }

  function segY(s) { return SPAWN_Y + (JUDGE_Y - SPAWN_Y) * Math.min(1, s.t / s.dur); }

  function succeedSeg() {
    solved++; hitStop = 0.1;
    game.feedback.good(CX, JUDGE_Y, { text: seg.hold ? 'GOOD' : 'PERFECT', color: C.good });
    game.fx.burst(CX, JUDGE_Y, { color: C.gold, count: 14, speed: 300 });
    game.audio.play('se_good', 0.35);
    if (solved === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, JUDGE_Y - 260, { color: C.gold, size: 40 });
    if (solved >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    var isHold = round % 2 === 1;
    seg = newSeg(isHold, isHold ? TRAVEL * 1.1 : Math.max(0.6, TRAVEL - round * 0.03));
  }

  function failSeg() {
    hitStop = 0.35; shake = 0.3;
    game.feedback.bad(CX, JUDGE_Y, { text: 'MISS' });
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function onPressDown(x, y) {
    if (ready > 0 || done || finished || !seg || seg.resolved) return;
    holding = true; holdT = 0;
    var atJudge = Math.abs(segY(seg) - JUDGE_Y) < 60;
    if (!seg.hold) {
      if (atJudge) { seg.resolved = true; succeedSeg(); } else { seg.resolved = true; failSeg(); }
    }
  }
  function onPressUp() {
    if (ready > 0 || done || finished || !seg || seg.resolved) { holding = false; return; }
    holding = false;
    if (seg.hold) {
      var atJudge = Math.abs(segY(seg) - JUDGE_Y) < 90;
      if (atJudge && holdT > seg.dur * 0.25) { seg.resolved = true; succeedSeg(); }
      else { seg.resolved = true; failSeg(); }
    }
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    onPressDown(x, y);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    game.audio.play('se_tap', 0.06);
    onPressUp();
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawSeg(s) {
    if (!s) return;
    var y = segY(s);
    var p = s.t / s.dur;
    if (p > 0.42) {
      var blink = Math.floor(game.time.elapsed * 12) % 2 === 0;
      if (blink) game.draw.circle(CX, JUDGE_Y, 70, C.judge, 0.25);
    }
    if (s.hold) {
      var tailLen = 200;
      game.draw.line(CX, y, CX, y - tailLen, C.holdGlow, 40);
      game.draw.line(CX, y, CX, y - tailLen, C.hold, 24);
      game.draw.circle(CX, y, 22, C.hold);
    } else {
      game.draw.circle(CX, y, 26, C.noteGlow, 0.6);
      game.draw.circle(CX, y, 18, C.note);
    }
  }

  var demo = { t: 0, gx: CX, gy: JUDGE_Y, press: false, s: null };
  function stepDemo(dt) {
    demo.t += dt;
    if (round === undefined || round === null) initGame();
    if (!demo.s) { demo.s = newSeg(demo.t % 2.4 < 1.2 === false, 0.95); demo.s.hold = Math.floor(demo.t / 2.4) % 2 === 1; }
    demo.s.t += dt;
    seg = demo.s;
    var y = segY(demo.s);
    demo.gx = CX; demo.gy = y;
    var p = demo.s.t / demo.s.dur;
    if (demo.s.hold) {
      demo.press = p > 0.3 && p < 0.95;
    } else {
      if (p > 0.45 && p < 0.55 && !demo.s.telegraphed) {
        demo.s.telegraphed = true; demo.press = true;
        game.feedback.good(CX, JUDGE_Y, { text: 'PERFECT', color: C.good });
        game.audio.play('se_good', 0.2);
      } else if (p >= 0.55) demo.press = false;
    }
    if (p >= 1) { demo.s = null; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSeg(seg);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '区画!', W / 2, H * 0.18, 26, C.white);
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
      seg.t += dt;
      if (holding) holdT += dt;
      if (seg.t > seg.dur && !seg.resolved) {
        seg.resolved = true;
        failSeg();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawSeg(seg);

    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (solved / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G3', 0.3], ['B3', 0.3], ['D4', 0.3], ['G4', 0.6]], { tempo: 120, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
