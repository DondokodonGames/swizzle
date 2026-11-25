// J-N641vs3-0002-workshop-pouch-shake.js
// ワークショップ・ポーチ・シェイク — 見習い鍛冶職人が天井から吊るした資材袋を連打して揺らし、鉄粒を目標数だけふるい落とす
// 操作: 吊るされた資材袋を連打して揺らし、鉄粒をふるい落とす
// 終わり: 制限時間内に目標数の鉄粒を落とせば成功。届かなければGAME OVER
// @mechanic: mash
// @theme: workshop_pouch_shake
// 世界観: 見習い鍛冶職人が天井から吊るした資材袋を素早く連打して揺らし、制限時間内に規定数の鉄粒をふるい落として集める
// 残るもの: 正誤(CLEAR/GAME OVER) + ふるい落とした数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 淡い彩度のパステル、丸みのある柔らかい輪郭
  var C = {
    bg: '#f6e9df', bg2: '#efd9c9', beam: '#c9a888', chain: '#a6836a',
    pouch: '#e0a15c', pouchDark: '#a5713a', nugget: '#8f95a0', nuggetDark: '#565b64',
    good: '#3ad67b', bad: '#ff4d5e', gold: '#ffcf3a', ink: '#4a3626', white: '#ffffff',
  };

  var GAME_TITLE = 'POUCH SHAKE';
  var TIME_LIMIT = 11;
  var TARGET = 10;
  var MASH_PER_DROP = 3;
  var COMBO_WINDOW = 0.5;
  var POUCH_X = W * 0.5, POUCH_Y = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var POUCH_SPRITE = ['.####.', '######', '######', '.####.'];
  var NUGGET_SPRITE = ['.#.', '###', '.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.5 - 200, H * 0.10, 400, 24, C.beam);
    game.draw.line(POUCH_X, H * 0.14, POUCH_X, POUCH_Y - 60, C.chain, 6);
  }

  var mashCount, comboClock, sway, drops, dropCount, roundClock, halfCalled, rivalClock, rivalShow;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    mashCount = 0; comboClock = 0; sway = 0; drops = []; dropCount = 0; roundClock = 0; halfCalled = false;
    rivalClock = 2.4; rivalShow = 0;
    done = false; endWait = 0; finished = false; ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    var swayX = POUCH_X + Math.sin(sway) * 34;
    game.draw.sprite(POUCH_SPRITE, { '#': C.pouch }, swayX, POUCH_Y, 30, { anchor: 'center' });
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      game.draw.sprite(NUGGET_SPRITE, { '#': C.nugget }, d.x, d.y, 16, { anchor: 'center' });
    }
    if (rivalShow > 0) {
      game.draw.sprite(['.#.', '###'], { '#': C.ink }, W * 0.86, H * 0.30, 14, { anchor: 'center', alpha: 0.35 });
    }
  }

  function mashPouch(x, y) {
    if (finished) return;
    mashCount++;
    comboClock = COMBO_WINDOW;
    sway += 0.9;
    game.audio.play('se_tap', 0.15 + Math.min(0.15, mashCount * 0.01));
    game.fx.shake(2, 0.05);
    if (mashCount % MASH_PER_DROP === 0) {
      dropCount++;
      drops.push({ x: POUCH_X + game.random(-60, 60), y: POUCH_Y + 60 });
      game.feedback.good(POUCH_X, POUCH_Y, { text: 'GOOD', color: C.good });
      game.audio.play('se_break', 0.3);
      if (dropCount === Math.ceil(TARGET / 2)) game.fx.popup('NICE', POUCH_X, POUCH_Y - 120, { color: C.gold, size: 32 });
      if (dropCount >= TARGET) {
        finished = true; ok = true;
        game.feedback.good(POUCH_X, POUCH_Y, { text: 'CLEAR', color: C.good });
        game.fx.burst(POUCH_X, POUCH_Y, { color: C.gold, count: 20, speed: 380 });
        game.audio.play('se_success', 0.5);
        finish();
      }
    } else {
      game.fx.burst(swayXOf(), POUCH_Y, { color: C.gold, count: 4, speed: 140 });
    }
  }
  function swayXOf() { return POUCH_X + Math.sin(sway) * 34; }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) mashPouch(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function stepRound(dt) {
    roundClock += dt;
    if (!halfCalled && roundClock >= TIME_LIMIT * 0.5) {
      halfCalled = true;
      game.fx.popup('NICE', POUCH_X, H * 0.3, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (comboClock > 0) comboClock -= dt;
    sway *= Math.pow(0.5, dt);
    for (var i = drops.length - 1; i >= 0; i--) {
      drops[i].y += 260 * dt;
      if (drops[i].y > H * 0.86) drops.splice(i, 1);
    }
    rivalClock -= dt;
    if (rivalClock <= 0) { rivalShow = 0.5; rivalClock = 2.6; }
    if (rivalShow > 0) rivalShow -= dt;
    if (roundClock >= TIME_LIMIT) {
      finished = true; ok = false; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(POUCH_X, POUCH_Y, { text: 'TIME UP' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: POUCH_X, gy: POUCH_Y, press: false };
  function resetDemo() { initGame(); demo.mashClock = 0; }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) resetDemo();
    demo.mashClock -= dt;
    for (var i = drops.length - 1; i >= 0; i--) {
      drops[i].y += 260 * dt;
      if (drops[i].y > H * 0.86) drops.splice(i, 1);
    }
    sway *= Math.pow(0.5, dt);
    if (cyc < 2.4 && demo.mashClock <= 0) {
      demo.mashClock = 0.14;
      demo.gx = POUCH_X + game.random(-14, 14); demo.gy = POUCH_Y; demo.press = true;
      mashPouch(demo.gx, demo.gy);
    } else if (cyc >= 2.4) {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (drops === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(dropCount + ' / ' + TARGET, W / 2, H * 0.14, 28, C.gold);
      if (!ok) txt('あと' + Math.max(1, TARGET - dropCount) + '個!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dropCount, { dropped: dropCount });
        else game.end.failure({ dropped: dropCount });
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

    drawScene();
    txt(dropCount + ' / ' + TARGET, W * 0.5, H * 0.07, 30, C.ink);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 150, W - 120, 16, '#a5713a', 0.3);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A4', 0.15], ['C5', 0.15], ['E5', 0.15], ['A5', 0.3]], { tempo: 175, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
