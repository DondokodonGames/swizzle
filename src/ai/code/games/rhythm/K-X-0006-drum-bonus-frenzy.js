// K-X-0006-drum-bonus-frenzy.js
// ドラムボーナスフレンジー — 光るボーナス区間では音符が密になる。打ち続けて倍率を伸ばす
// 操作: 音符に合わせて太鼓の中央/縁を叩く。ボーナス区間(予告つき)では音符が増え、当て続けるほど倍率が伸びる
// 終わり: 規定周回(10音符)を終えれば終了。積み上げたスコアが残る
// @mechanic: jackpot_combo
// @theme: festival_bonus_drum_relay
// 世界観: 提灯が連なる祭りの太鼓台。時おり提灯列が輝くボーナス区間に入り、音符が密になる中を打ち抜くほど倍率が伸びていく
// 残るもの: スコア(SCORE)。最高連続的中数と的中数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 明るいグラデ、白フチの太字UI、派手なパーティクル演出
  var C = {
    bg1: '#ff7a3c', bg2: '#ff3c7a', drumBody: '#ffffff', drumBodyDim: '#ffd8c0',
    drumCenter: '#3a1420', lantern: '#ffe24d', lanternBonus: '#ff2e6a',
    good: '#4dff9a', bad: '#ff4d5e', gold: '#ffe24d', white: '#ffffff', ink: '#2a0a18',
  };

  var GAME_TITLE = 'BONUS FRENZY';
  var DX = W * 0.5, DY = H * 0.5;
  var R_IN = 110, R_OUT = 190;
  var TOTAL = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LANTERN_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg(bonusGlow) {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 4; i++) {
      game.draw.sprite(LANTERN_SPRITE, { '#': bonusGlow ? C.lanternBonus : C.lantern }, W * (0.14 + i * 0.24), H * 0.14, 12 + (bonusGlow ? 3 : 0), { anchor: 'center' });
    }
    if (bonusGlow) game.draw.rect(0, 0, W, H, C.gold, 0.08);
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 2.0);
    game.draw.rect(0, 0, W, H, C.white, 0.015 + 0.03 * pulse);
  }

  function drawDrum(flashZone) {
    game.draw.circle(DX, DY + 12, R_OUT + 12, '#00000030');
    game.draw.circle(DX, DY, R_OUT, flashZone === 'rim' ? C.white : C.drumBodyDim);
    game.draw.circle(DX, DY, R_IN + 6, C.drumBody);
    game.draw.circle(DX, DY, R_IN, flashZone === 'center' ? C.white : C.drumCenter);
  }

  var round, note, score, combo, bestCombo, done, endWait, finished, bonusIdx, bonusWarn;
  var ready, hitStop, shake, hitFlash, flashT;

  var BONUS_AT = [4, 8];

  function newNote() {
    var bonus = BONUS_AT.indexOf(round) >= 0;
    var dur = bonus ? 0.55 : Math.max(0.75, 1.0 - round * 0.02);
    return { zone: Math.random() < 0.5 ? 'center' : 'rim', t: 0, dur: dur, resolved: false, bonus: bonus };
  }

  function initGame() {
    round = 0; score = 0; combo = 0; bestCombo = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; hitFlash = null; flashT = 0; bonusWarn = 0;
    note = newNote();
  }

  function tryHit(x, y) {
    if (!note || note.resolved || ready > 0 || done || finished) return;
    var d = Math.hypot(x - DX, y - DY);
    var zone = d <= R_IN ? 'center' : (d <= R_OUT ? 'rim' : null);
    if (!zone) { game.audio.play('se_tap', 0.06); return; }
    note.resolved = true;
    var correct = zone === note.zone;
    hitFlash = zone; flashT = 0.12;
    hitStop = correct ? 0.06 : 0.2;
    if (correct) {
      combo++; bestCombo = Math.max(bestCombo, combo);
      var gain = 100 * combo + (note.bonus ? 200 : 0);
      score += gain;
      game.feedback.good(DX, DY, { text: note.bonus ? 'BONUS x' + combo : 'x' + combo, color: note.bonus ? C.gold : C.good });
      game.audio.play(note.bonus ? 'se_powerup' : 'se_good', 0.35);
      if (combo % 3 === 0) { game.fx.popup('x' + combo, DX, H * 0.18, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.3); }
    } else {
      combo = 0;
      game.feedback.bad(DX, DY, { text: 'MISS' });
      shake = 0.16;
      game.audio.play('se_bad', 0.3);
    }
    round++;
    if (round >= TOTAL) { finished = true; finish(); return; }
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
    game.audio.play(bestCombo >= 4 ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.4;
  }

  function drawNote(k) {
    if (!k) return;
    var p = Math.min(1, k.t / k.dur);
    var y = H * 0.18 + (DY - H * 0.18) * p;
    var col = k.zone === 'center' ? C.gold : C.lanternBonus;
    game.draw.circle(DX, y, k.zone === 'center' ? 22 : 30, col, p > 0.9 ? 1 : 0.85);
    if (k.zone === 'rim') game.draw.circle(DX, y, 16, C.bg1, 1);
  }

  var demo = { t: 0, gx: DX, gy: H * 0.9, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { note = newNote(); note.dur = 0.9; round = 0; combo = 0; }
    if (!note) note = newNote();
    note.t += dt;
    var p = note.t / note.dur;
    if (p > 0.65 && !note.resolved) {
      note.resolved = true;
      hitFlash = note.zone; flashT = 0.12;
      combo++;
      game.feedback.good(DX, DY, { text: 'x' + combo, color: C.good });
      game.audio.play('se_good', 0.2);
      demo.gy = note.zone === 'center' ? DY : DY - 160;
      demo.press = true;
    }
    if (p >= 1) { demo.press = false; demo.gy = H * 0.9; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      var cyc = demo.t % 3.0;
      stepDemo(dt);
      bg(cyc > 1.5);
      drawDrum(flashT > 0 ? hitFlash : null);
      drawNote(note);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      if (flashT > 0) flashT -= dt;
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(false);
      drawDrum(null);
      txt('TIME UP', W / 2, H * 0.08, 46, C.ink);
      txt('SCORE ' + score, W / 2, H * 0.13, 32, C.ink);
      txt('BEST COMBO x' + bestCombo, W / 2, H * 0.18, 26, C.ink);
      var best = Math.max(game.best, score);
      if (score > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.23, 30, C.gold);
      else txt('BEST ' + best, W / 2, H * 0.23, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        game.end.record(score, { bestCombo: bestCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (!note.resolved && note.bonus && bonusWarn < 1 && note.t < 0.15) {
        bonusWarn = 1;
        game.fx.popup('BONUS!', DX, H * 0.20, { color: C.gold, size: 40 });
      }
      note.t += dt;
      if (note.t / note.dur >= 1 && !note.resolved) {
        note.resolved = true;
        combo = 0;
        game.feedback.bad(DX, DY, { text: 'MISS' });
        shake = 0.16;
        game.audio.play('se_bad', 0.3);
        round++;
        bonusWarn = 0;
        if (round >= TOTAL) { finished = true; finish(); }
        else note = newNote();
      }
    }
    if (flashT > 0) flashT -= dt;
    if (shake > 0) shake -= dt;

    bg(note && note.bonus);
    drawDrum(flashT > 0 ? hitFlash : null);
    if (!finished) drawNote(note);

    txt('SCORE ' + score, W / 2, H * 0.055, 32, C.ink);
    var progress = Math.max(0, Math.min(1, round / TOTAL));
    game.draw.rect(60, 130, W - 120, 14, '#00000020', 1);
    game.draw.rect(60, 130, (W - 120) * progress, 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.12], ['E5', 0.12], ['G5', 0.12], ['B5', 0.12], ['C6', 0.24]], { tempo: 152, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
