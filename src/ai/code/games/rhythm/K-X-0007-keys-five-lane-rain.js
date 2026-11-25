// K-X-0007-keys-five-lane-rain.js
// キーズファイブレーンレイン — 5つの鍵盤に降ってくる音符を、落ちた瞬間に押さえる
// 操作: 5本のレーンを落ちてくる音符が下の鍵盤に重なった瞬間、対応する鍵盤をタップする
// 終わり: 規定回数(10音符)すべてタイミングよく押さえれば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: five_key_light_organ
// 世界観: 灯りの鍵盤楽器。5本のレーンを音符が絶え間なく降り注ぎ、奏者は鍵盤に重なる刹那を狙って押さえ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 押さえられた音符数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、繊細なグラデ影、鮮やかな彩度
  var C = {
    bg: '#0e1220', bg2: '#080a14', laneA: '#1a2038', laneB: '#141830',
    key: '#2a3050', keyLit: '#ffffff',
    n0: '#ff5a7a', n1: '#ffb84d', n2: '#7dff9a', n3: '#4dc8ff', n4: '#c07dff',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd24d', white: '#f0f4ff', ink: '#05060c',
  };
  var LANE_COL = [C.n0, C.n1, C.n2, C.n3, C.n4];

  var GAME_TITLE = 'FIVE LANE';
  var LANES = 5;
  var LANE_W = W / LANES;
  var HIT_Y = H * 0.72;
  var TOTAL = 10;
  var MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var NOTE_SPRITE = ['.###.', '#####', '#####', '.###.'];
  var KEYBOT_A = ['.##.', '####', '.##.', '#..#'];
  var KEYBOT_B = ['.##.', '####', '.##.', '.##.'];

  function laneX(i) { return LANE_W * i + LANE_W / 2; }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < LANES; i++) {
      game.draw.rect(LANE_W * i, H * 0.16, LANE_W - 6, H * 0.66, i % 2 === 0 ? C.laneA : C.laneB, 0.7);
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.9);
    game.draw.rect(0, 0, W, H, C.n3, 0.015 + 0.03 * pulse);
  }

  function drawKeys(litLane, flash) {
    for (var i = 0; i < LANES; i++) {
      var lit = litLane === i;
      game.draw.rect(LANE_W * i + 6, HIT_Y - 8, LANE_W - 18, 60, lit && flash ? C.keyLit : C.key, 1);
      game.draw.rect(LANE_W * i + 6, HIT_Y - 8, LANE_W - 18, 10, LANE_COL[i], 0.9);
    }
    var frame = Math.floor(game.time.elapsed * 4) % 2 === 0 ? KEYBOT_A : KEYBOT_B;
    game.draw.sprite(frame, { '#': C.white }, W * 0.5, H * 0.10, 18, { anchor: 'center' });
  }

  var round, note, cleared, misses, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, flashLane, flashT;

  function newNote() {
    var dur = Math.max(0.8, 1.15 - round * 0.02);
    return { lane: Math.floor(game.random(0, LANES)), t: 0, dur: dur, resolved: false };
  }

  function initGame() {
    round = 0; cleared = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; flashLane = -1; flashT = 0;
    note = newNote();
  }

  function tryPress(lane) {
    if (!note || note.resolved || ready > 0 || done || finished) return;
    note.resolved = true;
    var correct = lane === note.lane;
    flashLane = lane; flashT = 0.12;
    hitStop = correct ? 0.06 : 0.25;
    if (correct) {
      cleared++;
      game.feedback.good(laneX(lane), HIT_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.35);
      if (!milestoneShown && cleared >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(cleared + ' / ' + TOTAL, W / 2, H * 0.28, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      misses++;
      game.feedback.bad(laneX(lane), HIT_Y, { text: 'MISS' });
      shake = 0.18;
      game.audio.play('se_bad', 0.3);
    }
    if (!correct && misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (correct && cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    note = newNote();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var lane = Math.min(LANES - 1, Math.max(0, Math.floor(x / LANE_W)));
    tryPress(lane);
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

  function drawNote(k) {
    if (!k) return;
    var p = Math.min(1, k.t / k.dur);
    var y = H * 0.18 + (HIT_Y - H * 0.18) * p;
    game.draw.sprite(NOTE_SPRITE, { '#': LANE_COL[k.lane] }, laneX(k.lane), y, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: laneX(0), gy: HIT_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { note = newNote(); note.dur = 0.95; round = 0; }
    if (!note) note = newNote();
    note.t += dt;
    var p = note.t / note.dur;
    if (p > 0.62 && !note.resolved) {
      note.resolved = true;
      flashLane = note.lane; flashT = 0.12;
      game.feedback.good(laneX(note.lane), HIT_Y, { text: 'NICE', color: C.good });
      game.audio.play('se_good', 0.2);
      demo.gx = laneX(note.lane); demo.gy = HIT_Y;
      demo.press = true;
    }
    if (p >= 1) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawKeys(flashT > 0 ? flashLane : -1, true);
      drawNote(note);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      if (flashT > 0) flashT -= dt;
      txt(GAME_TITLE, W / 2, H * 0.03, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.07, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawKeys(-1, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL, misses: misses });
        else game.end.failure({ cleared: cleared, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      note.t += dt;
      if (note.t / note.dur >= 1 && !note.resolved) {
        note.resolved = true;
        hitStop = 0.25;
        shake = 0.18;
        misses++;
        game.feedback.bad(laneX(note.lane), HIT_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.3);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        else { round++; note = newNote(); }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawKeys(flashT > 0 ? flashLane : -1, true);
    if (!finished) drawNote(note);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.03, 30, C.white);
    game.draw.rect(60, 100, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 100, (W - 120) * (cleared / TOTAL), 14, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 30, 140, 9, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E5', 0.15], ['G5', 0.15], ['B5', 0.15], ['E6', 0.3]], { tempo: 140, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
