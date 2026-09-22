// K-X-0001-drum-center-rim-call.js
// ドラムセンターリムコール — 近づく音符が中央か縁かを見て、太鼓の正しい面を叩く
// 操作: 音符が的の位置に来た瞬間、それが中央マークなら太鼓の中央を、縁マークなら外側のリムをタップする
// 終わり: 規定回数(8回)すべて正しい面で叩ければ成功。3回外せば失敗
// @mechanic: judge
// @theme: festival_drum_call_booth
// 世界観: 祭り囃子の太鼓台。流れてくる音符が中央打ちか縁打ちかを見分け、太鼓の正しい面を叩いて囃子を続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく叩けた回数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 限定16色相当、大きい矩形ドット、輪郭くっきり
  var C = {
    bg: '#204028', bg2: '#102818', lantern: '#e05820', lanternDark: '#903c14',
    drumBody: '#a85830', drumRim: '#e0a850', drumRimDark: '#8c5c28', drumCenter: '#402014',
    note: '#f0e060', noteRim: '#60c0f0',
    good: '#60e070', bad: '#e04858', gold: '#f0c020', white: '#f4f0e0', ink: '#101008',
  };

  var GAME_TITLE = 'CENTER RIM';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var DX = W * 0.5, DY = H * 0.62;
  var R_IN = 110, R_OUT = 190;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 3; i++) {
      game.draw.sprite(LANTERN_SPRITE, { '#': C.lantern }, W * (0.15 + i * 0.35), H * 0.15, 14, { anchor: 'center' });
    }
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 1.7);
    game.draw.rect(0, 0, W, H, C.lantern, 0.015 + 0.03 * pulse);
  }

  function drawDrum(hitFlash) {
    game.draw.circle(DX, DY + 14, R_OUT + 12, '#00000040');
    game.draw.circle(DX, DY, R_OUT, hitFlash === 'rim' ? C.white : C.drumRimDark);
    game.draw.circle(DX, DY, R_OUT - 18, C.drumRim);
    game.draw.circle(DX, DY, R_IN + 6, C.drumBody);
    game.draw.circle(DX, DY, R_IN, hitFlash === 'center' ? C.white : C.drumCenter);
  }

  var round, note, cleared, misses, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, hitFlash, flashT;

  function newNote() {
    var dur = Math.max(0.85, 1.15 - round * 0.03);
    return { zone: Math.random() < 0.5 ? 'center' : 'rim', t: 0, dur: dur, resolved: false };
  }

  function initGame() {
    round = 0; cleared = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; hitFlash = null; flashT = 0;
    note = newNote();
  }

  function judgeZone(x, y) {
    var d = Math.hypot(x - DX, y - DY);
    if (d <= R_IN) return 'center';
    if (d <= R_OUT) return 'rim';
    return null;
  }

  function tryHit(x, y) {
    if (!note || note.resolved || ready > 0 || done || finished) return;
    var zone = judgeZone(x, y);
    if (!zone) { game.audio.play('se_tap', 0.08); return; }
    note.resolved = true;
    var correct = zone === note.zone;
    hitFlash = zone; flashT = 0.15;
    hitStop = correct ? 0.08 : 0.28;
    if (correct) {
      cleared++;
      game.feedback.good(DX, DY, { text: zone === 'center' ? 'DON' : 'KA', color: C.good });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup(cleared + ' / ' + TOTAL, DX, H * 0.28, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.35);
      }
    } else {
      misses++;
      game.feedback.bad(DX, DY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
    }
    if (!correct && misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    if (correct && cleared >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    note = newNote();
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) tryHit(x, y); });

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
    var y = H * 0.18 + (DY - H * 0.18) * p;
    var col = k.zone === 'center' ? C.note : C.noteRim;
    game.draw.circle(DX, y, k.zone === 'center' ? 22 : 30, col, p > 0.9 ? 1 : 0.85);
    if (k.zone === 'rim') game.draw.circle(DX, y, 16, C.bg, 1);
  }

  var demo = { t: 0, gx: DX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { note = newNote(); note.dur = 1.0; round = 0; }
    if (!note) note = newNote();
    note.t += dt;
    var p = note.t / note.dur;
    if (p > 0.65 && !note.resolved) {
      note.resolved = true;
      hitFlash = note.zone; flashT = 0.15;
      game.feedback.good(DX, DY, { text: note.zone === 'center' ? 'DON' : 'KA', color: C.good });
      game.audio.play('se_good', 0.22);
      demo.gy = note.zone === 'center' ? DY : DY - 160;
      demo.press = true;
    }
    if (p >= 1) { demo.press = false; demo.gy = H * 0.9; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDrum(flashT > 0 ? hitFlash : null);
      drawNote(note);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      if (flashT > 0) flashT -= dt;
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
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
      drawDrum(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '打!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
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
        hitStop = 0.28;
        shake = 0.2;
        misses++;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); }
        else { round++; note = newNote(); }
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg();
    drawDrum(flashT > 0 ? hitFlash : null);
    if (!finished) drawNote(note);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cleared / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['C4', 0.2], ['G3', 0.2], ['C4', 0.4]], { tempo: 132, wave: 'square', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
