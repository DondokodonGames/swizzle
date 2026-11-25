// K-GBA-0020-harbor-signal-judge.js
// 灯台信号ジャッジ — 汽笛/鐘/灯りの3種の合図を見分け、対応するレバーを正しく引く
// 操作: 出た合図の種類(汽笛=左/鐘=中央/灯り=右)を見分けて、対応するレバーをすぐタップする
// 終わり: 規定回数(6回)全て正しいレバーを引ければ成功。レバー違い/出遅れで失敗
// @mechanic: judge
// @theme: lighthouse_signal_watch
// 世界観: 港を見守る灯台の信号室。汽笛・鐘・灯りの3種の合図を瞬時に見分け、対応するレバーを引く見張り番
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく応じた回数
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い縁取り、飛ぶ数字
  var C = {
    bg1: '#1e3a5f', bg2: '#0f2038', panel: '#12294a', panelEdge: '#ffffff',
    horn: '#ff8a3d', bell: '#3dc7ff', lamp: '#ffe23d',
    good: '#3dff9e', bad: '#ff3d5c', gold: '#ffe23d', white: '#ffffff', ink: '#0a1420',
  };

  var GAME_TITLE = 'SIGNAL WATCH';
  var NEEDED = 6;
  var WAIT_MIN = 0.55, WAIT_MAX = 1.15;
  var CUE_WIN = 1.0;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var TYPES = ['horn', 'bell', 'lamp'];
  var ZONES = [
    { type: 'horn', x: W * 0.2, color: C.horn },
    { type: 'bell', x: W * 0.5, color: C.bell },
    { type: 'lamp', x: W * 0.8, color: C.lamp },
  ];
  var ZY = H * 0.84, ZW = 260, ZH = 180;
  var CUE_Y = H * 0.42;

  var HORN_SPR = ['#.....', '##....', '###...', '####..', '###...', '##....', '#.....'];
  var BELL_SPR = ['.####.', '######', '######', '######', '..##..'];
  var LAMP_SPR = ['..##..', '.####.', '######', '.####.', '..##..'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * (0.55 + i * 0.02), W, 2, '#ffffff08');
  }

  var hits, cueType, roundT, cueTime, cued, resolved, hitZone;
  var done, endWait, finished;
  var ready, hitStop, shake, flashState;

  function newRound() {
    roundT = 0; cueTime = game.random(WAIT_MIN, WAIT_MAX); cued = false; resolved = false;
    cueType = TYPES[Math.floor(game.random(0, 3))];
    hitZone = -1;
  }

  function initGame() {
    hits = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashState = 0;
    newRound();
  }

  function zoneAt(x, y) {
    for (var i = 0; i < ZONES.length; i++) {
      var zx = ZONES[i].x;
      if (x >= zx - ZW / 2 && x <= zx + ZW / 2 && y >= ZY - ZH / 2 && y <= ZY + ZH / 2) return i;
    }
    return -1;
  }

  function resolveZone(i) {
    if (state !== S.PLAYING || finished || done || ready > 0 || hitStop > 0 || resolved) return;
    game.audio.play('se_tap', 0.1);
    if (!cued) return; // 合図前は無視(暴発は許すが判定しない)
    resolved = true;
    hitZone = i;
    if (ZONES[i].type === cueType) {
      hits++; hitStop = 0.08; flashState = 1;
      game.feedback.good(ZONES[i].x, ZY, { text: 'GOOD', color: C.good });
      game.fx.burst(ZONES[i].x, ZY, { color: ZONES[i].color, count: 14, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (hits === 3) game.fx.popup(hits + ' / ' + NEEDED, W / 2, CUE_Y - 180, { color: C.gold, size: 40 });
      if (hits >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      flashState = -1; hitStop = 0.35;
      game.feedback.bad(ZONES[i].x, ZY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    var i = zoneAt(x, y);
    if (i >= 0) resolveZone(i);
    else game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepGame(dt) {
    if (finished) return;
    roundT += dt;
    if (!cued && roundT >= cueTime) {
      cued = true;
      game.audio.play(cueType === 'horn' ? 'se_jump' : cueType === 'bell' ? 'se_coin' : 'se_powerup', 0.3);
    }
    if (!resolved && cued && roundT >= cueTime + CUE_WIN) {
      resolved = true;
      flashState = -1; hitStop = 0.3;
      game.feedback.bad(W / 2, CUE_Y, { text: 'TIME UP' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawCue() {
    if (!cued || resolved) return;
    var spr = cueType === 'horn' ? HORN_SPR : (cueType === 'bell' ? BELL_SPR : LAMP_SPR);
    var col = cueType === 'horn' ? C.horn : (cueType === 'bell' ? C.bell : C.lamp);
    var blink = cueType === 'lamp' ? (Math.floor(game.time.elapsed * 10) % 2 === 0) : true;
    if (blink) game.draw.circle(W / 2, CUE_Y, 130, col, 0.3);
    game.draw.sprite(spr, { '#': col }, W / 2, CUE_Y, 20, { anchor: 'center' });
  }

  function drawZones() {
    for (var i = 0; i < ZONES.length; i++) {
      var z = ZONES[i];
      var active = cued && z.type === cueType;
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2, ZW, ZH, C.panel, 0.9);
      game.draw.rect(z.x - ZW / 2, ZY - ZH / 2, ZW, 8, i === hitZone ? (flashState > 0 ? C.good : C.bad) : (active ? z.color : C.panelEdge), 0.8);
      game.draw.sprite(z.type === 'horn' ? HORN_SPR : (z.type === 'bell' ? BELL_SPR : LAMP_SPR), { '#': z.color }, z.x, ZY, 14, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, drt: 0, dCue: 0.7, dType: 'bell', dDone: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.1;
    if (cyc < dt || demo.t <= dt) { demo.drt = 0; demo.dDone = false; hitZone = -1; flashState = 0; }
    demo.drt += dt;
    roundT = demo.drt; cueTime = demo.dCue; cued = demo.drt >= demo.dCue; cueType = demo.dType; resolved = demo.dDone;
    if (cued && !demo.dDone && demo.drt < demo.dCue + 0.35) {
      var zi = TYPES.indexOf(demo.dType);
      if (demo.drt < demo.dCue + 0.06) { demo.gx = W / 2; demo.gy = H * 0.86; demo.press = false; }
      else if (demo.drt < demo.dCue + 0.2) { demo.gx = ZONES[zi].x; demo.gy = ZY; demo.press = false; }
      else { demo.press = true; demo.dDone = true; hitZone = zi; flashState = 1; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roundT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawCue();
      drawZones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.1, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '/' + NEEDED : '-'), W / 2, H * 0.14, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + NEEDED, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (NEEDED - hits) + '回!', W / 2, H * 0.21, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, needed: NEEDED });
        else game.end.failure({ hits: hits, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      stepGame(dt);
    }
    if (shake > 0) shake -= dt;
    if (flashState !== 0) flashState *= 0.85;

    bg();
    drawCue();
    drawZones();

    txt(hits + ' / ' + NEEDED, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / NEEDED), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
