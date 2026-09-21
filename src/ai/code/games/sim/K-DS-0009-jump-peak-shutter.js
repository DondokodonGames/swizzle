// K-DS-0009-jump-peak-shutter.js
// ピークシャッター — トランポリンではねる相手の、一番高く上がった瞬間だけシャッターを切る
// 操作: 助走の小さな跳躍はやり過ごし、一番大きな跳躍が頂点に達した瞬間だけタップしてシャッターを切る
// 終わり: 頂点付近でシャッターを切れれば成功(判定PERFECT/GOOD)。的外れ/早撃ちは失敗
// @mechanic: timing_one_shot
// @theme: trampoline_peak_photo
// 世界観: 公園のトランポリン広場。小さな助走跳躍のあとに来る一番高い跳躍、その一瞬の頂点を狙う写真係の視点
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定(PERFECT/GOOD/MISS)
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 清潔な白基調+はっきりしたアクセント、フラットUI
  var C = {
    bg: '#eef3fb', bg2: '#dbe6f5', ground: '#9fd8a8', groundDark: '#7ec489',
    tramp: '#3a4a6a', trampBed: '#5a7ad4', jumper: '#ff7a3d',
    good: '#2ecc71', bad: '#ff4757', gold: '#ffb020', white: '#ffffff', ink: '#1a2233',
  };

  var GAME_TITLE = 'PEAK SHUTTER';
  var JUMPER = ['..##..', '.####.', '..##..', '#.##.#', '.#..#.'];
  var CX = W * 0.5, GROUND_Y = H * 0.6;
  var BIG_H = 480, SMALL_H = 140;
  var BOUNCE_T = 0.85, JUMP_T = 1.7;
  var TIGHT = 0.08, LOOSE = 0.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;
  var grade = '';

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, GROUND_Y + 40, W, H, C.groundDark);
    game.draw.rect(0, GROUND_Y + 40, W, 16, C.ground);
    game.draw.circle(CX, GROUND_Y + 60, 210, C.tramp);
    game.draw.circle(CX, GROUND_Y + 60, 180, C.trampBed);
  }

  var phase, bounceIdx, phaseT, resolved, done, endWait, finished, readyIn, hitStop, shake, flashT, flashOk;

  function initGame() {
    phase = 'bounce'; bounceIdx = 0; phaseT = 0; resolved = false;
    done = false; endWait = 0; finished = false;
    readyIn = 0.8; hitStop = 0; shake = 0; flashT = 0; flashOk = true; grade = '';
  }

  function jumperY() {
    if (phase === 'bounce') {
      var p = phaseT / BOUNCE_T;
      return GROUND_Y - Math.sin(Math.min(1, p) * Math.PI) * SMALL_H;
    } else {
      var p2 = phaseT / JUMP_T;
      return GROUND_Y - Math.sin(Math.min(1, p2) * Math.PI) * BIG_H;
    }
  }

  function shutter() {
    if (readyIn > 0 || done || finished || hitStop > 0 || resolved) return;
    if (phase === 'bounce') {
      resolved = true;
      hitStop = 0.3; shake = 0.2;
      flashT = 0.2; flashOk = false;
      game.feedback.bad(CX, jumperY(), { text: 'MISS' });
      ok = false; finished = true; finish();
      return;
    }
    var diff = Math.abs(phaseT - JUMP_T / 2);
    resolved = true;
    if (diff <= TIGHT) {
      grade = 'PERFECT'; ok = true; hitStop = 0.14; flashT = 0.2; flashOk = true;
      game.feedback.good(CX, jumperY(), { text: 'PERFECT' });
      game.fx.burst(CX, jumperY(), { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_good', 0.4);
      finished = true; finish();
    } else if (diff <= LOOSE) {
      grade = 'GOOD'; ok = true; hitStop = 0.12; flashT = 0.2; flashOk = true;
      game.feedback.good(CX, jumperY(), { text: 'GOOD' });
      game.audio.play('se_good', 0.35);
      finished = true; finish();
    } else {
      grade = 'MISS'; ok = false; hitStop = 0.3; shake = 0.2; flashT = 0.2; flashOk = false;
      game.feedback.bad(CX, jumperY(), { text: 'MISS' });
      finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) shutter();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepJump(dt) {
    phaseT += dt;
    if (phase === 'bounce') {
      if (phaseT >= BOUNCE_T) {
        bounceIdx++; phaseT = 0;
        game.audio.play('se_jump', 0.15);
        if (bounceIdx >= 3) { phase = 'jump'; game.fx.popup('GO!', CX, GROUND_Y - 260, { color: C.gold, size: 34 }); }
      }
    } else {
      if (phaseT >= JUMP_T && !resolved) {
        resolved = true; grade = 'MISS'; ok = false;
        hitStop = 0.3; shake = 0.2; flashT = 0.2; flashOk = false;
        game.feedback.bad(CX, jumperY(), { text: 'MISS' });
        finished = true; finish();
      }
    }
  }

  var demo = { t: 0, gx: CX, gy: GROUND_Y - BIG_H, press: false, phase: 'bounce', bIdx: 0, pT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { demo.phase = 'bounce'; demo.bIdx = 0; demo.pT = 0; }
    demo.pT += dt;
    demo.press = false;
    if (demo.phase === 'bounce') {
      if (demo.pT >= BOUNCE_T) { demo.bIdx++; demo.pT = 0; if (demo.bIdx >= 3) demo.phase = 'jump'; }
    } else {
      if (Math.abs(demo.pT - JUMP_T / 2) < 0.03 && !demo.hit) {
        demo.hit = true; demo.press = true;
        game.feedback.good(CX, GROUND_Y - BIG_H, { text: 'PERFECT' });
        game.audio.play('se_good', 0.2);
      }
      if (demo.pT >= JUMP_T) { demo.hit = false; }
    }
    phase = demo.phase; phaseT = demo.pT; bounceIdx = demo.bIdx;
    demo.gy = jumperY();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      var jy = jumperY();
      game.draw.sprite(JUMPER, { '#': C.jumper }, CX, jy, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, H * 0.86, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      var jy2 = jumperY();
      game.draw.sprite(JUMPER, { '#': C.jumper }, CX, jy2, 18, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      if (grade) txt(grade, W / 2, H * 0.13, 34, ok ? C.gold : C.bad);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(grade === 'PERFECT' ? 2 : 1, { grade: grade });
        else game.end.failure({ grade: grade });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (readyIn > 0) {
      readyIn -= dt;
      if (readyIn <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepJump(dt);
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    var jy3 = jumperY();
    if (flashT > 0) game.draw.circle(CX, jy3, 60, flashOk ? C.good : C.bad, 0.3);
    game.draw.sprite(JUMPER, { '#': C.jumper }, CX, jy3, 18, { anchor: 'center' });

    txt(phase === 'bounce' ? (bounceIdx + 1) + ' / ' + 3 : 'GO!', W / 2, H * 0.06, 28, C.ink);
    if (readyIn > 0) txt(readyIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.82, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2]], { tempo: 130, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
