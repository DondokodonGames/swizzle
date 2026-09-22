// K-X-0008-keys-seven-disc-flow.js
// キーズセブンディスクフロー — 7つの鍵盤に降る音符を押さえつつ、合間に光る円盤を弾いて回す
// 操作: 7本のレーンに落ちる音符を鍵盤で押さえる。合間に現れる円盤は、矢印が示す向きへスワイプして弾き回す
// 終わり: 音符6回+円盤3回、規定の運びをすべてこなせば成功。3回外せば失敗
// @mechanic: coop_2zone
// @theme: seven_key_relay_deck
// 世界観: 鍵盤と円盤が並ぶ演奏デッキ。片手で7つの鍵盤を渡り歩きながら、もう一方の手で合間に光る円盤を弾いて流れを繋ぐ
// 残るもの: 正誤(CLEAR/GAME OVER) + こなせた運びの数
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深みのあるグラデ、強いリムライト、疑似立体の陰影レイヤー
  var C = {
    bg: '#0a1428', bg2: '#040a18', laneA: '#132038', laneB: '#0e1830',
    key: '#1c2c48', keyLit: '#ffffff', keyRim: '#3d78ff',
    disc: '#202a44', discRim: '#7dc8ff', discCenter: '#0a1020',
    n0: '#ff5a7a', n1: '#ffb84d', n2: '#ffe24d', n3: '#7dff9a', n4: '#4dc8ff', n5: '#8a7dff', n6: '#ff7dd8',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd24d', white: '#eef4ff', ink: '#03060c',
  };
  var LANE_COL = [C.n0, C.n1, C.n2, C.n3, C.n4, C.n5, C.n6];

  var GAME_TITLE = 'SEVEN DECK';
  var LANES = 7;
  var LANE_W = W / LANES;
  var HIT_Y = H * 0.80;
  var NOTE_TOP = H * 0.30;
  var DISC_X = W * 0.5, DISC_Y = H * 0.42, DISC_R = 130;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var EVENTS = ['note', 'note', 'disc', 'note', 'note', 'disc', 'note', 'disc'];
  var MISS_LIMIT = 3;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var NOTE_SPRITE = ['.###.', '#####', '#####', '.###.'];
  var ARROW_L = ['....#..', '...##..', '.#####.', '...##..', '....#..'];
  var ARROW_R = ['..#....', '..##...', '.#####.', '..##...', '..#....'];
  var ARROW_SPRITE = { left: ARROW_L, right: ARROW_R };
  var DJ_A = ['.##.', '####', '.##.', '#..#'];
  var DJ_B = ['.##.', '####', '.##.', '.##.'];

  function laneX(i) { return LANE_W * i + LANE_W / 2; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(LANE_W * i, H * 0.24, LANE_W - 4, H * 0.6, i % 2 === 0 ? C.laneA : C.laneB, 0.7);
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.6);
    game.draw.rect(0, 0, W, H, C.discRim, 0.015 + 0.03 * pulse);
  }

  function drawKeys(litLane, flash) {
    for (var i = 0; i < LANES; i++) {
      var lit = litLane === i;
      game.draw.rect(LANE_W * i + 4, HIT_Y - 6, LANE_W - 10, 50, lit && flash ? C.keyLit : C.key, 1);
      game.draw.rect(LANE_W * i + 4, HIT_Y - 6, LANE_W - 10, 8, LANE_COL[i], 0.9);
    }
  }

  function drawDisc(spinT, dir, active) {
    var ang = spinT * 5;
    game.draw.circle(DISC_X, DISC_Y, DISC_R + 16, '#00000030');
    game.draw.circle(DISC_X, DISC_Y, DISC_R, active ? C.discRim : C.disc);
    game.draw.circle(DISC_X, DISC_Y, DISC_R - 30, C.discCenter);
    for (var i = 0; i < 6; i++) {
      var a = ang + (i * Math.PI * 2) / 6;
      var x1 = DISC_X + Math.cos(a) * (DISC_R - 40), y1 = DISC_Y + Math.sin(a) * (DISC_R - 40);
      var x2 = DISC_X + Math.cos(a) * (DISC_R - 10), y2 = DISC_Y + Math.sin(a) * (DISC_R - 10);
      game.draw.line(x1, y1, x2, y2, active ? C.white : C.discRim, 4);
    }
    if (dir) game.draw.sprite(ARROW_SPRITE[dir], { '#': C.gold }, DISC_X, DISC_Y - DISC_R - 50, 12, { anchor: 'center' });
  }

  var idx, ev, evT, evDur, evDir, evLane, discSpin, cleared, misses, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, flashLane, flashT;

  function newEvent() {
    ev = EVENTS[idx];
    evT = 0;
    if (ev === 'note') {
      evDur = Math.max(0.8, 1.05 - idx * 0.02);
      evLane = Math.floor(game.random(0, LANES));
    } else {
      evDur = 1.0;
      evDir = Math.random() < 0.5 ? 'left' : 'right';
      discSpin = 0;
    }
  }

  function initGame() {
    idx = 0; cleared = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; flashLane = -1; flashT = 0;
    newEvent();
  }

  function advance(success) {
    if (success) {
      cleared++;
      if (!milestoneShown && cleared >= Math.ceil(EVENTS.length / 2)) {
        milestoneShown = true;
        game.fx.popup(cleared + ' / ' + EVENTS.length, W / 2, H * 0.14, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      misses++;
    }
    if (!success && misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (success && cleared >= EVENTS.length) { ok = true; finished = true; finish(); return; }
    idx++;
    newEvent();
  }

  function tryPress(lane) {
    if (ready > 0 || done || finished || ev !== 'note') return;
    flashLane = lane; flashT = 0.12;
    var correct = lane === evLane;
    hitStop = correct ? 0.06 : 0.22;
    if (correct) {
      game.feedback.good(laneX(lane), HIT_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.32);
    } else {
      game.feedback.bad(laneX(lane), HIT_Y, { text: 'MISS' });
      shake = 0.16;
      game.audio.play('se_bad', 0.3);
    }
    advance(correct);
  }

  function trySpin(dir) {
    if (ready > 0 || done || finished || ev !== 'disc') return;
    var correct = dir === evDir;
    hitStop = correct ? 0.06 : 0.22;
    if (correct) {
      game.feedback.good(DISC_X, DISC_Y, { text: 'SPIN', color: C.good });
      game.audio.play('se_good', 0.32);
    } else {
      game.feedback.bad(DISC_X, DISC_Y, { text: 'MISS' });
      shake = 0.16;
      game.audio.play('se_bad', 0.3);
    }
    advance(correct);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ev !== 'note') return;
    var lane = Math.min(LANES - 1, Math.max(0, Math.floor(x / LANE_W)));
    tryPress(lane);
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ev !== 'disc') return;
    if (dir === 'left' || dir === 'right') trySpin(dir);
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

  function drawNote() {
    if (ev !== 'note') return;
    var p = Math.min(1, evT / evDur);
    var y = NOTE_TOP + (HIT_Y - NOTE_TOP) * p;
    game.draw.sprite(NOTE_SPRITE, { '#': LANE_COL[evLane] }, laneX(evLane), y, 12, { anchor: 'center' });
  }

  function drawDJ() {
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? DJ_A : DJ_B;
    game.draw.sprite(frame, { '#': C.white }, W * 0.5, H * 0.12, 18, { anchor: 'center' });
  }

  var demo = { t: 0, gx: laneX(3), gy: HIT_Y, press: false, evIdx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { idx = 0; newEvent(); demo.resolved = false; }
    evT += dt;
    var dur = ev === 'note' ? evDur : evDur;
    var p = evT / dur;
    if (p > 0.6 && !demo.resolved) {
      demo.resolved = true;
      if (ev === 'note') {
        game.feedback.good(laneX(evLane), HIT_Y, { text: 'NICE', color: C.good });
        demo.gx = laneX(evLane); demo.gy = HIT_Y;
      } else {
        game.feedback.good(DISC_X, DISC_Y, { text: 'SPIN', color: C.good });
        demo.gx = DISC_X + (evDir === 'left' ? -140 : 140); demo.gy = DISC_Y;
        discSpin += 1;
      }
      demo.press = true;
      game.audio.play('se_good', 0.2);
    }
    if (p >= 1) {
      demo.press = false; demo.resolved = false;
      idx = (idx + 1) % EVENTS.length;
      newEvent();
    }
    if (ev === 'disc') discSpin += dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (idx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDJ();
      drawDisc(discSpin || 0, ev === 'disc' ? evDir : null, ev === 'disc');
      drawKeys(flashLane, flashT > 0);
      drawNote();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      if (flashT > 0) flashT -= dt;
      txt(GAME_TITLE, W / 2, H * 0.20, 36, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.235, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.96, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.96, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDJ();
      drawDisc(0, null, false);
      drawKeys(-1, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(cleared + ' / ' + EVENTS.length, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.15, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 22, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: EVENTS.length, misses: misses });
        else game.end.failure({ cleared: cleared, total: EVENTS.length, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      evT += dt;
      if (ev === 'disc') discSpin += dt;
      if (evT / evDur >= 1) {
        hitStop = 0.22;
        shake = 0.16;
        var px = ev === 'note' ? laneX(evLane) : DISC_X;
        var py = ev === 'note' ? HIT_Y : DISC_Y;
        game.feedback.bad(px, py, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        misses++;
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        else { idx++; newEvent(); }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawDJ();
    if (!finished) drawDisc(discSpin || 0, ev === 'disc' ? evDir : null, ev === 'disc');
    else drawDisc(0, null, false);
    drawKeys(flashLane, flashT > 0);
    if (!finished) drawNote();

    txt(cleared + ' / ' + EVENTS.length, W / 2, H * 0.02, 28, C.white);
    game.draw.rect(60, 78, W - 120, 12, C.ink, 0.5);
    game.draw.rect(60, 78, (W - 120) * (cleared / EVENTS.length), 12, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 28, 110, 8, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.58, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.15], ['C5', 0.15], ['E5', 0.15], ['A5', 0.3]], { tempo: 134, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
