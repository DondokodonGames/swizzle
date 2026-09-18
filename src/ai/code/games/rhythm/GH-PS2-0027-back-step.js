// GH-PS2-0027-back-step.js
// バックステップ — 4方向を拍で踏む。裏拍に罠
// 操作: 表示された矢印方向へ、拍に合わせてスワイプ
// 終わり: 16拍。踏めた精度%が残る。どの拍で外したかも並んで残る
// @mechanic: rhythm
// @theme: dance_floor
// 世界観: 月夜のダンスフロア。4方向の矢が拍に灯る。裏拍にだけ偽の矢が灯り、それに乗ると崩れる
// 残るもの: 精度%(SCORE)。16拍ぶんの判定列(PERFECT/GOOD/MISS)が結果画面に残る
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP: 原色 + 白縁。明るい背景と光の柱
  var C = {
    bg1: '#2a1a4a', bg2: '#4a2a7a', floor: '#1a1030',
    up: '#ff3d7a', down: '#3dc8ff', left: '#ffd400', right: '#4dff7a',
    fake: '#8844cc', white: '#ffffff', gold: '#ffd400', good: '#4dff7a', bad: '#ff3d5e', ink: '#150a2a',
  };
  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_COL = { up: C.up, down: C.down, left: C.left, right: C.right };
  var DIR_DXY = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var GAME_TITLE = 'BACK STEP';
  var BEATS = 16;
  var BPM = 128;
  var BEAT = 60 / BPM;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var beatIdx, clock, nextBeat, curDir, isFake, hitThisBeat, judges, done, endWait;
  var ready, hitStop, shake, flashArrow, swipeStart;

  var CX = W / 2, CY = H * 0.44, RING = 220;

  var FOOT_SPRITE = ['.##.', '####', '.##.', '.##.', '####'];
  var FOOT_PAL = { '#': '#ffffff' };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.10); }

  function floorBg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.5, C.bg1], [1, C.floor]]);
    // 光の柱(白縁、全高)
    for (var i = 0; i < 5; i++) {
      var x = W * (0.1 + i * 0.2);
      game.draw.rect(x - 30, 0, 60, H, '#ffffff', 0.04 + 0.03 * Math.sin(game.time.elapsed * 3 + i));
    }
    // フロア(下40%): タイルの反射床。CYリングの下の空きを埋める
    var floorY = H * 0.62;
    game.draw.rect(0, floorY, W, H - floorY, '#120a24', 0.6);
    for (var ty = 0; ty < 6; ty++) {
      var yy = floorY + ty * ((H - floorY) / 6);
      game.draw.rect(0, yy, W, 2, '#ffffff', 0.08);
    }
    for (var tx = 0; tx < 6; tx++) {
      var xx = tx * (W / 6);
      game.draw.rect(xx, floorY, 2, H - floorY, '#ffffff', 0.06);
    }
    // フロア上の光の反射(拍で明滅)
    var pulse = flashArrow !== undefined && flashArrow > 0.15 ? 0.18 : 0.08;
    game.draw.circle(CX, floorY + (H - floorY) * 0.4, 260, DIR_COL[curDir || 'up'], pulse);
  }

  function initGame() {
    beatIdx = 0; clock = 0; nextBeat = 1.0; curDir = null; isFake = false; hitThisBeat = true;
    judges = []; done = false; endWait = 0; ready = 0.8; hitStop = 0; shake = 0; flashArrow = 0; swipeStart = null;
  }

  function newBeat() {
    curDir = DIRS[Math.floor(Math.random() * 4)];
    // 3拍に1回は裏拍の偽矢印(奇数拍寄り)。序盤3拍は無し
    isFake = beatIdx > 2 && beatIdx % 2 === 1 && Math.random() < 0.4;
    hitThisBeat = false;
    flashArrow = 0.5;
  }

  function judgeMiss() {
    if (isFake) { judges.push('AVOID'); return; }   // 偽拍は「踏まない」が正解
    judges.push('MISS');
    game.feedback.bad(dirX(curDir), dirY(curDir), { text: 'MISS' });
    shake = 0.15;
  }

  function dirX(d) { return CX + DIR_DXY[d][0] * RING; }
  function dirY(d) { return CY + DIR_DXY[d][1] * RING; }

  function onSwipe(dir) {
    if (done || ready > 0 || hitThisBeat) return;
    hitThisBeat = true;
    var toBeat = Math.abs(clock - nextBeat);
    if (isFake) {
      // 偽拍は踏んだら失敗
      judges.push('FAKE');
      game.feedback.bad(dirX(curDir), dirY(curDir), { text: 'MISS' });
      shake = 0.25; game.audio.play('se_bad', 0.5);
      return;
    }
    if (dir !== curDir) {
      judges.push('MISS');
      game.feedback.bad(dirX(curDir), dirY(curDir), { text: 'MISS' });
      shake = 0.15;
      return;
    }
    var judge = toBeat < 0.08 ? 'PERFECT' : 'GOOD';
    judges.push(judge);
    game.feedback.good(dirX(curDir), dirY(curDir), { text: judge, color: judge === 'PERFECT' ? C.gold : C.good });
    game.audio.play('se_good', 0.4);
  }

  game.onSwipe(function(dir) { game.audio.play('se_tap', 0.15); if (state === S.PLAYING) onSwipe(dir); });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    var good = judges.filter(function(j) { return j === 'PERFECT' || j === 'GOOD' || j === 'AVOID'; }).length;
    finalScore = Math.round((good / BEATS) * 100);
    game.audio.stopBgm();
    game.audio.play(finalScore >= 60 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  function drawArrow(d, active, fake) {
    var x = dirX(d), y = dirY(d);
    var col = fake ? C.fake : DIR_COL[d];
    var scale = active ? 1.3 : 1;
    game.draw.circle(x, y, 70 * scale, col, active ? 0.9 : 0.3);
    var dx = DIR_DXY[d][0], dy = DIR_DXY[d][1];
    // 矢印: 三角(線で表現)
    var ax = x + dx * 40, ay = y + dy * 40;
    game.draw.line(ax, ay, x - dy * 30 - dx * 10, y + dx * 30 - dy * 10, C.white, active ? 8 : 4);
    game.draw.line(ax, ay, x + dy * 30 - dx * 10, y - dx * 30 - dy * 10, C.white, active ? 8 : 4);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatIdx === undefined) initGame();
      floorBg();
      // ゴーストは常にRIGHTだけを踏み、裏拍のFAKEはスキップする
      var cyc = (game.time.elapsed % 2.4);
      var showFake = cyc > 1.2 && cyc < 1.8;
      for (var i = 0; i < DIRS.length; i++) drawArrow(DIRS[i], DIRS[i] === 'right' && !showFake, false);
      if (showFake) drawArrow('left', true, true);
      var gx = CX + (cyc < 1.2 ? RING : showFake ? -60 : 0), gy = CY;
      game.draw.hand(gx, gy, { press: cyc < 0.2 || (cyc > 1.2 && cyc < 1.4), scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.white);
      txt('BEST ' + String(game.best) + '%', W / 2, H * 0.15, 38, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.85, 56, C.gold);
        txt('TAP TO START', W / 2, H * 0.90, 44, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.90, 38, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      floorBg();
      txt(finalScore >= 60 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.14, 80, finalScore >= 60 ? C.gold : C.bad);
      txt(finalScore + '%', W / 2, H * 0.24, 100, C.white);
      // 16拍ぶんの判定を4x4で並べる
      for (var j = 0; j < judges.length; j++) {
        var jx = W / 2 - 330 + (j % 4) * 160, jy = H * 0.40 + Math.floor(j / 4) * 110;
        var jc = judges[j] === 'PERFECT' ? C.gold : judges[j] === 'GOOD' || judges[j] === 'AVOID' ? C.good : C.bad;
        game.draw.rect(jx - 60, jy - 34, 120, 68, jc, 0.85);
        txt(judges[j].slice(0, 4), jx, jy + 10, 22, C.ink);
      }
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best + '%', W / 2, H * 0.88, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.93, 40, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 36, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { judges: judges.join(',') }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); newBeat(); }
    } else {
      clock += dt;
      if (flashArrow > 0) flashArrow -= dt;
      if (clock >= nextBeat) {
        if (!hitThisBeat) judgeMiss();
        beatIdx++;
        if (beatIdx >= BEATS) { finish(); return; }
        nextBeat += BEAT;
        newBeat();
        game.audio.tone(isFake ? 440 : 660, 0.06, { wave: 'square', volume: 0.12 });
      }
    }
    if (shake > 0) shake -= dt;

    floorBg();
    game.draw.sprite(FOOT_SPRITE, FOOT_PAL, CX, CY, 10, { anchor: 'center' });
    for (var d = 0; d < DIRS.length; d++) drawArrow(DIRS[d], DIRS[d] === curDir && flashArrow > 0.15, DIRS[d] === curDir && isFake);

    var frac = beatIdx / BEATS;
    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * frac, 24, C.gold);
    var goodSoFar = judges.filter(function(j) { return j !== 'MISS' && j !== 'FAKE'; }).length;
    txt(goodSoFar + ' / ' + BEATS, W / 2, 106, 44, C.white);
    if (beatIdx === 8 && judges.length === 8) { game.fx.popup('8 / ' + BEATS, W / 2, H * 0.28, { color: C.gold, size: 56 }); }

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.70, 90, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['C4', 0.5], ['C4', 0.5], ['G3', 0.5], ['G3', 0.5]],
      { tempo: BPM, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
