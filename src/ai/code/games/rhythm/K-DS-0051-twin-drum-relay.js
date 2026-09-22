// K-DS-0051-twin-drum-relay.js
// ツインドラム・リレー — 左右交互に灯る太鼓を、合図の光に合わせて交互に叩き続ける
// 操作: 光った側の太鼓(左または右)を、光ったタイミングでタップして叩く。左右交互に来る
// 終わり: 規定回数(10回)を交互に外さず叩ければ成功。3回外せば失敗
// @mechanic: alternate_tap
// @theme: twin_drum_shrine
// 世界観: 祭りの櫓に据えられた対の太鼓。左右交互に灯る合図の光に合わせて、太鼓打ちが交互打ちで囃子を刻む
// 残るもの: 正誤(CLEAR/GAME OVER) + 打てた回数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 16色相当の平坦色、大きめピクセル境界、控えめグラデ
  var C = {
    bg: '#1a1030', bg2: '#2c1c48', yagura: '#3a2858', yaguraDark: '#241638',
    drumL: '#ff5a3d', drumR: '#3dc8ff', drumDark: '#3a1a10', lit: '#ffe14d',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#0a0618',
  };

  var GAME_TITLE = 'DRUM RELAY';
  var TOTAL = 10;
  var MAX_MISS = 3;
  var LX = W * 0.28, RX = W * 0.72, DY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DRUM_SPRITE = ['.####.', '######', '######', '.####.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(W * 0.1, H * 0.1, W * 0.8, H * 0.06, C.yaguraDark, 0.6);
    game.draw.line(W * 0.1, H * 0.16, W * 0.1, H * 0.85, C.yagura, 14);
    game.draw.line(W * 0.9, H * 0.16, W * 0.9, H * 0.85, C.yagura, 14);
  }

  var hits, missCount, done, endWait, finished;
  var ready, hitStop, shake;
  var side, beatT, beatDur, resolved, hitFlashL, hitFlashR;

  function newBeat(idx) {
    beatDur = Math.max(0.5, 0.92 - idx * 0.045);
    beatT = 0; resolved = false;
  }

  function initGame() {
    hits = 0; missCount = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    side = 'L'; hitFlashL = 0; hitFlashR = 0;
    newBeat(0);
  }

  function resolveHit(tapSide) {
    if (resolved || ready > 0 || done || finished) return;
    resolved = true;
    var p = beatT / beatDur;
    var correctSide = (tapSide === side);
    var inWindow = p > 0.25 && p < 0.85;
    var good = correctSide && inWindow;
    hitStop = good ? 0.06 : 0.26;
    if (tapSide === 'L') hitFlashL = 0.15; else hitFlashR = 0.15;
    if (good) {
      hits++;
      game.feedback.good(tapSide === 'L' ? LX : RX, DY, { text: 'HIT', color: C.good });
      game.fx.burst(tapSide === 'L' ? LX : RX, DY, { color: C.gold, count: 10, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, H * 0.3, { color: C.gold, size: 40 });
    } else {
      missCount++;
      game.feedback.bad(tapSide === 'L' ? LX : RX, DY, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
    }
    if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); return; }
    if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    side = (side === 'L') ? 'R' : 'L';
    newBeat(hits);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    var tapSide = x < W * 0.5 ? 'L' : 'R';
    game.audio.play('se_tap', 0.05);
    resolveHit(tapSide);
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

  function drawDrum(x, isLit, flash, color) {
    var scale = isLit ? 1.1 : 1.0;
    game.draw.circle(x, DY + 46, 60 * scale, C.drumDark, 0.5);
    game.draw.sprite(DRUM_SPRITE, { '#': flash > 0 ? C.white : (isLit ? C.lit : color) }, x, DY, 20 * scale, { anchor: 'center' });
  }

  var demo = { t: 0, gx: LX, gy: DY - 80, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.0;
    if (cyc < dt || demo.t <= dt) { hits = 0; side = 'L'; newBeat(0); }
    beatT += dt;
    var p = Math.min(1, beatT / beatDur);
    var tx = side === 'L' ? LX : RX;
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 7);
    demo.gy = DY - 80;
    if (p > 0.25 && p < 0.5 && !demo.hit) {
      demo.hit = true;
      demo.press = true;
      if (side === 'L') hitFlashL = 0.15; else hitFlashR = 0.15;
      game.feedback.good(tx, DY, { text: 'HIT', color: C.good, sound: false });
      game.audio.play('se_good', 0.2);
    }
    if (p >= 1) { side = side === 'L' ? 'R' : 'L'; newBeat(1); demo.hit = false; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (hitFlashL > 0) hitFlashL -= dt;
    if (hitFlashR > 0) hitFlashR -= dt;

    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawDrum(LX, side === 'L', hitFlashL, C.drumL);
      drawDrum(RX, side === 'R', hitFlashR, C.drumR);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDrum(LX, false, 0, C.drumL);
      drawDrum(RX, false, 0, C.drumR);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: missCount });
        else game.end.failure({ hits: hits, misses: missCount });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      beatT += dt;
      if (beatT / beatDur >= 1 && !resolved) {
        resolved = true;
        missCount++;
        hitStop = 0.26;
        game.feedback.bad(side === 'L' ? LX : RX, DY, { text: 'MISS' });
        shake = 0.2;
        game.audio.play('se_bad', 0.35);
        if (missCount >= MAX_MISS) { ok = false; finished = true; finish(); }
        else { side = side === 'L' ? 'R' : 'L'; newBeat(hits); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDrum(LX, !finished && side === 'L', hitFlashL, C.drumL);
    drawDrum(RX, !finished && side === 'R', hitFlashR, C.drumR);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(W - 60 - m * 34, 210, 12, m < missCount ? C.bad : '#ffffff40');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['C4', 0.2], ['G4', 0.2], ['G4', 0.2]], { tempo: 160, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
