// GH-PS-0042-pinch-hitter.js
// ピンチヒッター — 代打で1打席。投手の癖(グラブの色)が3球で分かる
// 操作: 球が来た瞬間、ストライク(の色)ならタップ。ボール(別の色)なら我慢
// 終わり: 3球以内にヒットすれば成功。3ストライクで失敗
// @mechanic: reaction_duel
// @theme: pinch_atbat
// 世界観: 代打の一打席。投手はグラブの色でしか癖を見せない。同じ色は同じコース。読めれば振れる
// 残るもの: 正誤(CLEAR/GAME OVER) + 何球目で決まったか
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // MODERN AD-GAME: 高彩度・高コントラスト。太い縁取り、飛ぶ数字
  var C = {
    bg1: '#1a4d2e', bg2: '#0f331e', dirt: '#c98a4a', dirt2: '#a86a34',
    strikeCol: '#ff3355', ballCol: '#3388ff', good: '#4dff8a', bad: '#ff4455', gold: '#ffd400', white: '#ffffff', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'PINCH HITTER';
  var MAX_PITCHES = 3, MAX_STRIKES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, pitchesSeen = 0, strikes = 0, decided = '';

  var isStrike, pitchPhase, pitchT, ballY, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function outline(x, y, w, h, color) {
    game.draw.rect(x - 10, y - 10, w + 20, h + 20, C.ink);
    game.draw.rect(x, y, w, h, color);
  }

  var CX = W / 2, ZONE_Y = H * 0.58, ZONE_W = 220, ZONE_H = 260;
  var MOUND_Y = H * 0.24;

  var GLOVE_SPRITE = ['.##.', '####', '####', '.##.'];
  var BAT_SPRITE = ['.#', '.#', '.#', '##'];

  var CROWD2 = (function() {
    var arr = [];
    for (var i = 0; i < 14; i++) arr.push({ x: (i * 83 + 21) % W, y: H * (0.32 + (i % 3) * 0.03), c: i % 3 === 0 ? '#ffd400' : '#ffffff' });
    return arr;
  })();

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 観客(空きを埋める)
    game.draw.rect(0, H * 0.28, W, H * 0.14, '#0a2418', 0.6);
    for (var c = 0; c < CROWD2.length; c++) { var o = CROWD2[c]; game.draw.circle(o.x, o.y, 12, o.c, 0.35); }
    game.draw.circle(CX, MOUND_Y, 130, C.dirt);
    game.draw.circle(CX, MOUND_Y, 130, C.dirt2, 0.0);
    game.draw.rect(CX - 90, ZONE_Y - ZONE_H / 2 - 40, 180, 300, C.dirt, 0.7);
    // 打者シルエット(奥、ゾーンの後ろ)
    game.draw.circle(CX + 190, ZONE_Y - 30, 36, '#0a2418', 0.6);
    game.draw.rect(CX + 160, ZONE_Y - 10, 60, 130, '#0a2418', 0.6);
    game.draw.sprite(BAT_SPRITE, { '#': '#c9a86a' }, CX + 230, ZONE_Y - 60, 14, { anchor: 'center' });
    outline(CX - ZONE_W / 2, ZONE_Y - ZONE_H / 2, ZONE_W, ZONE_H, '#ffffff');
  }

  function newPitch() {
    isStrike = Math.random() < 0.55;
    pitchPhase = 'wind'; pitchT = 0.55; ballY = MOUND_Y;
  }

  function initGame() {
    pitchesSeen = 0; strikes = 0; done = false; endWait = 0; finished = false; decided = '';
    ready = 0.8; hitStop = 0; shake = 0;
    newPitch();
  }

  function judge(swung) {
    hitStop = 0.08;
    if (swung && isStrike) {
      ok = true; finished = true; decided = 'HIT';
      game.feedback.good(CX, ZONE_Y, { text: 'HIT!', color: C.good });
      game.fx.burst(CX, ZONE_Y, { color: C.gold, count: 20, speed: 420 });
      game.audio.play('se_success', 0.5);
    } else if (swung && !isStrike) {
      strikes++;
      game.feedback.bad(CX, ZONE_Y, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.4);
    } else if (!swung && isStrike) {
      strikes++;
      game.feedback.bad(CX, ZONE_Y, { text: 'STRIKE' });
      game.audio.play('se_bad', 0.3);
    } else {
      game.feedback.good(CX, ZONE_Y, { text: 'BALL', color: C.ballCol });
      game.audio.play('se_good', 0.25);
    }
    pitchesSeen++;
    if (!finished) {
      if (strikes >= MAX_STRIKES) { ok = false; finished = true; decided = 'OUT'; }
      else if (pitchesSeen >= MAX_PITCHES) { ok = false; finished = true; decided = 'NO HIT'; }
    }
    if (finished) finish();
    else { pitchPhase = 'gap'; pitchT = 0.5; game.fx.popup(pitchesSeen + ' / ' + MAX_PITCHES, W / 2, H * 0.14, { color: C.gold, size: 44 }); }
  }

  function tapNow() {
    if (done || ready > 0 || finished || pitchPhase !== 'zone') return;
    judge(true);
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 赤グラブ(ストライク)だけ振る ──
  var demo = { t: 0, gx: CX, gy: ZONE_Y + 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    isStrike = cyc < 1.2;
    var bY = MOUND_Y + Math.min(1, cyc % 1.2 / 0.7) * (ZONE_Y - MOUND_Y);
    ballY = bY;
    demo.press = isStrike && cyc % 1.2 > 0.62 && cyc % 1.2 < 0.78;
    if (demo.press && cyc % 1.2 > 0.62 && cyc % 1.2 < 0.65) { game.feedback.good(CX, ZONE_Y, { text: 'HIT!', color: C.good }); game.fx.burst(CX, ZONE_Y, { color: C.gold, count: 14, speed: 380 }); }
  }

  function drawPitcher() {
    game.draw.circle(CX, MOUND_Y - 60, 40, '#e8c8a0');
    outline(CX - 30, MOUND_Y - 20, 60, 70, '#3a5a3a');
    game.draw.sprite(GLOVE_SPRITE, { '#': isStrike ? C.strikeCol : C.ballCol }, CX + 50, MOUND_Y - 10, 12, { anchor: 'center' });
  }

  function drawBall(y) {
    game.draw.circle(CX, y, 20, '#ffffff');
    game.draw.circle(CX, y, 20, C.ink, 0.0);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (isStrike === undefined) newPitch();
      fieldBg();
      stepDemo(dt);
      drawPitcher();
      drawBall(ballY);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 56, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 26, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 48, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 38, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg();
      drawPitcher();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 60, ok ? C.good : C.bad);
      txt(decided, W / 2, H * 0.15, 40, C.gold);
      txt(pitchesSeen + ' / ' + MAX_PITCHES, W / 2, H * 0.86, 34, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 32, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ pitches: pitchesSeen });
        else game.end.failure({ pitches: pitchesSeen });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      pitchT -= dt;
      if (pitchPhase === 'wind' && pitchT <= 0) { pitchPhase = 'zone'; pitchT = 0.28; game.audio.play('se_tap', 0.15); }
      else if (pitchPhase === 'zone') {
        ballY = MOUND_Y + (1 - Math.max(0, pitchT) / 0.28) * (ZONE_Y - MOUND_Y);
        if (pitchT <= 0) judge(false);
      } else if (pitchPhase === 'gap' && pitchT <= 0) { newPitch(); }
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    drawPitcher();
    if (pitchPhase === 'zone' || pitchPhase === 'wind') drawBall(ballY);

    game.draw.rect(60, 40, W - 120, 24, C.ink);
    for (var s = 0; s < MAX_STRIKES; s++) game.draw.circle(120 + s * 60, 52, 16, s < strikes ? C.bad : '#ffffff', s < strikes ? 1 : 0.3);
    txt(pitchesSeen + ' / ' + MAX_PITCHES, W / 2, 106, 40, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 78, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
