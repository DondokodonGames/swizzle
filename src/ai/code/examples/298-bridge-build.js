// 298-bridge-build.js
// 橋を架けろ — 押している間だけ橋が伸び、離すと倒れる。対岸に届く長さを見極める
// 操作: 押している間だけ橋が伸び、離すと橋が倒れる
// 成功: 制限時間内に 4 本渡りきる  失敗: 時間切れ
// @mechanic: hold_charge
// @theme: ninja
// 世界観: 忍者屋敷から脱する忍びが、谷ごとに橋を伸ばして対岸へ跳ぶ
// variation: 物量型(進むほど谷が広く足場が狭くなる)
// spice: フィーバータイム(2本渡ると数秒だけ得点2倍)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO(和のネオン)
  var C = {
    night: '#0a0f1c', indigo: '#1b2a4a', plat: '#3a4a66', wood: '#c8642a', woodDk: '#7a3a14',
    ninja: '#e8eef7', band: '#ff3b5c', gold: '#ffd23f', mint: '#4dffb0', red: '#ff3b5c', purple: '#a86bff',
  };

  var GAME_TITLE = 'BRIDGE BUILD';
  var MAX_TIME = 10;
  var NEEDED = 4;
  var GROW_SPEED = 640;   // px/s
  var GROUND_Y = H * 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var here, gap, farW, bridge, growing, phase, ninjaX, ninjaY, fallV, fallAngle;
  var score, crossed, timeLeft, done, ready, fever, feedback, feedbackOk, hitStop;

  // 忍者スプライト(顔つき)
  var NINJA = [
    '..NNNN..',
    '.NNNNNN.',
    '.NBBBBN.',
    '.NWNNWN.',
    '.NNNNNN.',
    'RRNNNNRR',
    '..NNNN..',
    '..N..N..',
  ];
  var NINJA_COL = { N: '#20263a', B: C.band, W: C.ninja, R: C.band };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: '#01040c', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.14); }

  function nightBg() {
    game.draw.gradient(0, H, [[0, '#141d38'], [0.5, '#0c1428'], [1, '#05070f']]);
    // 月
    game.draw.circle(W * 0.78, H * 0.16, 90, C.gold, 0.85);
    game.draw.circle(W * 0.74, H * 0.14, 90, '#0c1428', 0.5);
    // 屋根の遠景
    for (var i = 0; i < 5; i++) {
      var rx = i * 260 - 40, ry = H * 0.44;
      game.draw.line(rx, ry, rx + 130, ry - 60, C.indigo, 6);
      game.draw.line(rx + 130, ry - 60, rx + 260, ry, C.indigo, 6);
    }
    // 谷底の霧
    game.draw.rect(0, GROUND_Y + 60, W, H - GROUND_Y, '#0a0f1c');
  }

  function platform(x, w) {
    game.draw.rect(x, GROUND_Y, w, H - GROUND_Y, C.plat);
    game.draw.rect(x, GROUND_Y, w, 12, C.wood);
  }

  function newRound(first) {
    var hereW = 160;
    here = first ? { x: 120, w: hereW } : { x: 120, w: hereW };
    gap = 260 + Math.min(320, crossed * 70);   // 物量型: 谷が広がる
    farW = Math.max(70, 150 - crossed * 18);    // 足場が狭まる
    bridge = 0; growing = false; phase = 'build';
    ninjaX = here.x + here.w - 40; ninjaY = GROUND_Y - 60; fallV = 0; fallAngle = 0;
  }
  function farX() { return here.x + here.w + gap; }

  function initGame() {
    score = 0; crossed = 0; timeLeft = MAX_TIME; done = false;
    ready = 0.8; fever = 0; feedback = 0; feedbackOk = false; hitStop = 0;
    newRound(true);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success; finalScore = score;
    game.audio.stopBgm();
    if (success) game.audio.play('se_success');
    else { game.audio.play('se_failure'); hitStop = 0.4; game.fx.flash(C.red, 0.25); }
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1600);
  }

  function drop() {
    if (phase !== 'build') return;
    growing = false;
    game.audio.play('se_break', 0.5);
    judgeBridge();
  }

  function judgeBridge() {
    var tip = here.x + here.w + bridge;
    var far = farX();
    if (tip >= far && tip <= far + farW) {
      phase = 'cross'; // 成功: 渡る
    } else {
      phase = 'plunge';
      ninjaX = here.x + here.w + Math.min(bridge, gap + farW) - 40;
      fallV = 0;
      feedback = 0.3; feedbackOk = false; hitStop = 0.35;
      game.feedback.bad(here.x + here.w + bridge, GROUND_Y, { text: tip < far ? 'SHORT' : 'LONG' });
    }
  }

  game.onPress(function() {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (phase === 'build') { growing = true; if (bridge === 0) game.audio.play('se_tap', 0.5); }
  });
  game.onRelease(function() { if (state === S.PLAYING && phase === 'build') drop(); });
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  function onCross() {
    crossed++;
    var gain = fever > 0 ? 200 : 100; score += gain;
    feedback = 0.3; feedbackOk = true;
    game.feedback.good(farX() + farW / 2, GROUND_Y - 80, { text: '+' + gain, color: C.mint });
    if (crossed === 2) { fever = 3.5; game.audio.play('se_milestone'); }
    if (crossed >= NEEDED) { finish(true); return; }
    newRound(false);
  }

  // ATTRACT ゴースト実演: 手が押して橋を伸ばし、ちょうどで離す
  var d = { bridge: 0, phase: 'build', t: 0, nx: 0, press: false, target: 300 };
  function stepDemo(dt) {
    d.t += dt;
    var hx = 120 + 160, fx = hx + 260, tgt = 260 + 40;
    if (d.phase === 'build') {
      d.press = true; d.bridge += GROW_SPEED * dt * 0.8;
      if (d.bridge >= tgt) { d.phase = 'fall'; d.press = false; }
    } else if (d.phase === 'fall') { d.phase = 'cross'; d.nx = hx; }
    else if (d.phase === 'cross') {
      d.nx += 420 * dt;
      if (d.nx >= fx + 30) { game.feedback.good(fx + 40, GROUND_Y - 80, { text: '+100', color: C.mint }); d.phase = 'build'; d.bridge = 0; d.t = 0; d.nx = 0; }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      nightBg(); stepDemo(dt);
      var hx = 120, fx = 120 + 160 + 260;
      platform(hx, 160); platform(fx, 140);
      game.draw.rect(hx + 160, GROUND_Y - 8, d.bridge, 16, C.wood);
      var nx = d.phase === 'cross' ? d.nx : hx + 160 - 40;
      game.draw.sprite(NINJA, NINJA_COL, nx + 40, GROUND_Y - 60, 10, { anchor: 'center' });
      game.draw.hand(hx + 240, GROUND_Y - 220, { press: d.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.gold);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.18, 40, C.mint);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.band);
        txt('TAP TO START', W / 2, H * 0.9, 48, C.ninja);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      nightBg();
      if (hitStop > 0) hitStop -= dt;
      game.draw.sprite(NINJA, NINJA_COL, W / 2, H * 0.34, 18, { anchor: 'center' });
      txt(resultSuccess ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.52, 90, resultSuccess ? C.mint : C.red);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.62, 56, C.ninja);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.68, 42, C.gold);
      if (finalScore > game.best && game.best > 0 && resultSuccess && Math.floor(game.time.elapsed * 3) % 2 === 0) {
        txt('NEW RECORD', W / 2, H * 0.75, 54, C.purple);
      } else if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.79, 46, C.mint);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      if (hitStop > 0) { hitStop -= dt; }
      else if (ready > 0) { ready -= dt; if (ready <= 0) game.audio.play('se_tap'); }
      else {
        timeLeft -= dt;
        if (fever > 0) fever -= dt;
        if (timeLeft <= 0) { finish(false); return; }
        if (phase === 'build' && growing) bridge += GROW_SPEED * dt;
        else if (phase === 'cross') { ninjaX += 520 * dt; if (ninjaX >= farX() + farW / 2 - 40) onCross(); }
        else if (phase === 'plunge') { fallV += 1600 * dt; ninjaY += fallV * dt; if (ninjaY > H) newRound(false); }
      }
      if (feedback > 0) feedback -= dt;
    }

    // draw
    nightBg();
    platform(here.x, here.w);
    platform(farX(), farW);
    // 橋
    var bx = here.x + here.w, by = GROUND_Y - 8;
    if (phase === 'cross') {
      game.draw.rect(bx, by, farX() + farW - bx, 16, C.wood);
      game.draw.rect(bx, by, farX() + farW - bx, 4, C.gold);
    } else {
      // build / plunge: 伸びた分の橋を描く(plunge は届かず谷へ)
      game.draw.rect(bx, by, bridge, 16, phase === 'plunge' ? C.woodDk : C.wood);
      game.draw.rect(bx, by, bridge, 4, C.gold);
    }
    game.draw.sprite(NINJA, NINJA_COL, ninjaX + 40, ninjaY, 10, { anchor: 'center' });

    // HUD
    var frac = Math.max(0, timeLeft / MAX_TIME);
    game.draw.rect(60, 40, (W - 120) * frac, 26, fever > 0 ? C.purple : C.mint);
    game.draw.rect(60, 40, W - 120, 26, C.indigo, 0.6);
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 108, 44, C.ninja);
    txt(crossed + ' / ' + NEEDED, W / 2, 168, 44, C.mint);
    // 目標帯(対岸)を telegraph
    if (phase === 'build') game.draw.rect(farX(), GROUND_Y - 24, farW, 10, C.gold, 0.6);
    if (fever > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) txt('FEVER', W / 2, H * 0.3, 52, C.purple);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 92, C.gold);
    scanlines();
  });

  game.onStart(function() {
    game.audio.melody(
      [['A3', 0.5], ['B3', 0.5], ['C4', 0.5], ['E4', 0.5], ['D4', 0.5], ['B3', 0.5], ['A3', 1],
       ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['B3', 0.5], ['A3', 1], ['E3', 1]],
      { tempo: 132, wave: 'triangle', volume: 0.09, loop: true,
        bass: [['A1', 1], ['A1', 1], ['F1', 1], ['E1', 1], ['A1', 1], ['A1', 1]], bassWave: 'square', bassVolume: 0.06 }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
