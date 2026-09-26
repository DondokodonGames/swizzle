// J-N6434-0019-vault-lock-snap.js
// 種子庫の錠はずし — 閉まりゆく扉の5つの錠を、鍵穴が白く光った瞬間に叩いて外し、締め出される前に滑り込む
// 操作: 鍵穴が全灯して高い合図音が鳴った瞬間にタップ。半灯のちらつき(低い音)はフェイントで、早押しすると錠が噛んで時間を失う
// 終わり: 5つの錠を外して扉をくぐればCLEAR。扉が閉まり切る(TIME UP)とGAME OVER
// @mechanic: reaction_duel
// @theme: seed_vault_closing_door
// 世界観: 山奥の地下種子庫の見習い番人が、嵐で自動的に閉まり始めた分厚い扉の5重の錠を合図と同時に外し、閉まり切る前に中へ滑り込んで種を守る
// 残るもの: 正誤(CLEAR/GAME OVER) + 外した錠の数と平均反応時間
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + カラーセロハンの帯
  var STYLE = { bg: ['#101010', '#1c1c1c', '#282828'], main: ['#f4f4f4', '#9a9a9a'], accent: ['#ffd040', '#40e080'] };
  var C = {
    bg1: '#0c0c0c', bg2: '#202020', bg3: '#2c2c2c', white: '#f4f4f4', dim: '#6a6a6a', mid: '#9a9a9a',
    bandTop: '#ffd040', bandMid: '#40c0ff', bandBot: '#40e080', red: '#ff5040'
  };

  var TITLE = 'VAULT SNAP';
  var TIME_LIMIT = 11;
  var LOCKS = 5;
  var DOOR_X = W * 0.5, DOOR_TOP = H * 0.2, DOOR_BOT = H * 0.66;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var KEEPER = [
    '..wwww..',
    '.wwwwww.',
    '.wkwwkw.',
    '..wwww..',
    '.wwwwww.',
    'ww.ww.ww',
    '..wwww..',
    '..w..w..'
  ];
  var KEEPER_RUN = [
    '..wwww..',
    '.wwwwww.',
    '.wkwwkw.',
    '..wwww..',
    'wwwwwww.',
    '...ww..w',
    '..w..w..',
    '.w....w.'
  ];
  var KEEPER_PAL = { w: '#f4f4f4', k: '#0c0c0c' };
  var KEYHOLE = ['.www.', 'wwwww', 'ww.ww', 'www.w', '.w.w.', '.w.w.', '.www.'];
  var SEED = ['.w.', 'www', '.w.'];

  var lockIdx, lk, timeLeft, gap, reacts, jams, perfects, phase, phaseT, endOk, focusX, focusY, runX;
  var demo = { t: 0, press: 0, feintTap: false };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function lockY(i) { return DOOR_TOP + 110 + i * ((DOOR_BOT - DOOR_TOP - 220) / (LOCKS - 1)); }

  function armLock(extra) {
    var feint = lockIdx >= 1 && Math.random() < 0.55;
    lk = { st: 'wait', t: game.random(0.55, 1.3) + (extra || 0), feint: feint, win: Math.max(0.34, 0.5 - lockIdx * 0.03), goT: 0 };
  }

  function initGame() {
    lockIdx = 0; timeLeft = TIME_LIMIT; gap = 1; reacts = []; jams = 0; perfects = 0;
    phase = 'ready'; phaseT = 0.8; endOk = false; focusX = DOOR_X; focusY = lockY(0); runX = W * 0.2;
    armLock(0.2);
  }

  // 錠の進行(実プレイ・デモ共通)
  function stepLock(dt, live) {
    if (lockIdx >= LOCKS) return;
    lk.t -= dt;
    if (lk.st === 'wait' && lk.t <= 0) {
      if (lk.feint) { lk.st = 'feint'; lk.t = 0.32; lk.feint = false; if (live) game.audio.tone('C4', 0.1, { wave: 'square', volume: 0.06 }); }
      else { lk.st = 'go'; lk.t = lk.win; lk.goT = 0; if (live) game.audio.tone('C6', 0.08, { wave: 'square', volume: 0.1 }); }
    } else if (lk.st === 'feint' && lk.t <= 0) {
      lk.st = 'wait'; lk.t = game.random(0.4, 0.9);
    } else if (lk.st === 'go') {
      lk.goT += dt;
      if (lk.t <= 0) {
        // 見逃し: 錠が戻って再び待つ
        if (live) game.feedback.bad(DOOR_X, lockY(lockIdx), { text: 'MISS', shake: 4, volume: 0.3 });
        armLock(0);
      }
    } else if (lk.st === 'jam' && lk.t <= 0) {
      armLock(0);
    } else if (lk.st === 'open' && lk.t <= 0) {
      lockIdx++;
      if (lockIdx < LOCKS) armLock(0);
    }
  }

  function hitLock(live) {
    if (lockIdx >= LOCKS) return 'none';
    var y = lockY(lockIdx);
    if (lk.st === 'go') {
      var rt = lk.goT;
      reacts.push(rt);
      var perfect = rt < 0.26;
      if (perfect) { perfects++; timeLeft = Math.min(TIME_LIMIT, timeLeft + 0.4); }
      lk.st = 'open'; lk.t = 0.3;
      focusX = DOOR_X; focusY = y;
      if (live) {
        game.feedback.good(DOOR_X, y - 70, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.bandTop : C.bandBot, sound: 'se_break' });
        game.fx.popup(rt.toFixed(2), DOOR_X + 220, y, { color: C.white, size: 40 });
        if (lockIdx + 1 === 3) { game.fx.popup('あと' + (LOCKS - 3) + '個!', W / 2, H * 0.72, { color: C.bandTop, size: 50 }); game.audio.play('se_milestone', 0.5); }
      }
      return 'open';
    }
    if (lk.st === 'wait' || lk.st === 'feint') {
      jams++;
      timeLeft -= 0.8;
      lk.st = 'jam'; lk.t = 0.6;
      if (live) game.feedback.bad(DOOR_X, y - 70, { text: 'MISS' });
      return 'jam';
    }
    return 'busy';
  }

  function drawScene() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg3]]);
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(el * 1.6));
    // 走査ドット
    for (var y = 0; y < H; y += 16) game.draw.rect(0, y, W, 3, '#000000', 0.25);
    // 嵐の雨(背景)
    for (var r = 0; r < 24; r++) {
      var rx = (r * 173 + el * 200) % W, ry = (r * 291 + el * 1100) % (H * 0.2);
      game.draw.rect(rx, ry, 4, 26, C.mid, 0.6);
    }
    // 扉(左右の分厚い扉が中央へ閉じていく)
    var open = 70 + gap * 230;
    game.draw.rect(60, DOOR_TOP, DOOR_X - open - 60, DOOR_BOT - DOOR_TOP, C.mid);
    game.draw.rect(DOOR_X + open, DOOR_TOP, W - 60 - DOOR_X - open, DOOR_BOT - DOOR_TOP, C.mid);
    for (var s = 0; s < 6; s++) {
      var ry2 = DOOR_TOP + 40 + s * 120;
      game.draw.rect(80, ry2, DOOR_X - open - 100, 10, C.dim);
      game.draw.rect(DOOR_X + open + 20, ry2, W - 100 - DOOR_X - open, 10, C.dim);
    }
    game.draw.rect(DOOR_X - open, DOOR_TOP, open * 2, DOOR_BOT - DOOR_TOP, '#000000', 0.8);
    // 奥の種子棚
    for (var k = 0; k < 5; k++) game.draw.sprite(SEED, { w: C.white }, DOOR_X - 40 + (k % 2) * 80, DOOR_TOP + 100 + k * 110 + Math.sin(el * 2 + k) * 5, 10, { anchor: 'center', alpha: 0.5 });
    // 錠(鍵穴)
    for (var i = 0; i < LOCKS; i++) {
      var ly = lockY(i), done = i < lockIdx || (i === lockIdx && lk.st === 'open');
      var cur = i === lockIdx && !done;
      var alpha = 0.35, col = C.white, px = 11;
      if (done) { col = C.dim; alpha = 0.6; }
      else if (cur && lk.st === 'go') { alpha = 1; px = 14; game.draw.circle(DOOR_X, ly, 120, C.white, 0.35); }
      else if (cur && lk.st === 'feint') { alpha = Math.floor(el * 30) % 2 ? 0.6 : 0.3; }
      else if (cur && lk.st === 'jam') { col = C.red; alpha = 0.9; }
      else if (cur) { alpha = 0.5 + 0.1 * Math.sin(el * 6); }
      game.draw.rect(DOOR_X - 110, ly - 12, 220, 24, done ? C.dim : C.mid);
      game.draw.sprite(KEYHOLE, { w: col }, DOOR_X + (done ? (i % 2 ? 90 : -90) : 0), ly, px, { anchor: 'center', alpha: alpha });
    }
    // 番人
    var runSpr = Math.floor(el * 8) % 2 ? KEEPER_RUN : KEEPER;
    game.draw.sprite(runSpr, KEEPER_PAL, runX, H * 0.74 + Math.sin(el * 5) * 5, 14, { anchor: 'center' });
    game.draw.rect(0, H * 0.78, W, 8, C.mid);
    // セロハンの帯
    game.draw.rect(0, 0, W, H * 0.18, C.bandTop, 0.22);
    game.draw.rect(0, H * 0.18, W, H * 0.5, C.bandMid, 0.10);
    game.draw.rect(0, H * 0.68, W, H * 0.32, C.bandBot, 0.18);
  }

  function drawHud() {
    txt(lockIdx + ' / ' + LOCKS, W * 0.5, H * 0.05, 60, C.white);
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(80, H * 0.10, W - 160, 20, C.dim);
    game.draw.rect(80, H * 0.10, (W - 160) * frac, 20, frac < 0.25 && Math.floor(game.time.elapsed * 6) % 2 ? C.red : C.white);
    for (var j = 0; j < jams; j++) game.draw.rect(80 + j * 36, H * 0.13, 24, 24, C.red);
    // 親指ゾーンの叩き台
    var hot = lockIdx < LOCKS && lk.st === 'go';
    game.draw.rect(W * 0.2, H * 0.84, W * 0.6, 150, hot ? C.white : C.dim, hot ? 0.9 : 0.5);
    game.draw.sprite(KEYHOLE, { w: hot ? '#0c0c0c' : C.white }, W / 2, H * 0.84 + 75, 12, { anchor: 'center' });
  }

  function avgReact() {
    if (!reacts.length) return 0;
    var s = 0;
    for (var i = 0; i < reacts.length; i++) s += reacts[i];
    return s / reacts.length;
  }

  function scoreOf() { return lockIdx * 150 + perfects * 80 + Math.round(Math.max(0, 0.5 - avgReact()) * 1000) + Math.round(timeLeft * 30); }

  function drawResult() {
    game.draw.rect(0, H * 0.28, W, H * 0.24, '#000000', 0.85);
    txt(endOk ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 100, endOk ? C.bandTop : C.red);
    txt(lockIdx + ' / ' + LOCKS + '   ' + avgReact().toFixed(2) + '秒', W / 2, H * 0.40, 46, C.white);
    if (endOk && scoreOf() > game.best) txt('NEW RECORD', W / 2, H * 0.47, 54, C.bandTop);
    else if (!endOk) txt('あと' + (LOCKS - lockIdx) + '個!', W / 2, H * 0.47, 54, C.bandTop);
    else txt('BEST ' + game.best, W / 2, H * 0.47, 42, C.white);
  }

  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; demo.feintTap = false; }
    gap = Math.max(0, timeLeft / TIME_LIMIT);
    timeLeft -= dt * 0.5;
    stepLock(dt, false);
    if (demo.press > 0) demo.press -= dt;
    if (lockIdx >= LOCKS) { runX += (DOOR_X - runX) * Math.min(1, dt * 4); return; }
    // 2つ目の錠でフェイントに釣られる失敗例を1回見せる
    if (lk.st === 'feint' && lockIdx === 1 && !demo.feintTap) { demo.feintTap = true; hitLock(false); demo.press = 0.15; game.fx.burst(DOOR_X, lockY(1), { color: C.red, count: 8 }); return; }
    if (lk.st === 'go' && lk.goT > 0.22) { hitLock(false); demo.press = 0.15; game.fx.burst(DOOR_X, lockY(lockIdx), { color: C.white, count: 10 }); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') { game.audio.play('se_tap', 0.1); return; }
    game.audio.play('se_tap', 0.2);
    var r = hitLock(true);
    if (r === 'busy') game.audio.tone('A2', 0.05, { wave: 'square', volume: 0.05 });
  });

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!lk) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(W / 2, H * 0.86, { press: demo.press > 0, scale: 14 });
      txt(TITLE, W / 2, H * 0.06, 96, C.white);
      txt('HI-SCORE ' + game.best, W / 2, H * 0.11, 40, C.bandTop);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 52, C.bandTop);
      else txt('INSERT COIN', W / 2, H * 0.96, 46, C.white);
      return;
    }
    if (state === S.RESULT) {
      drawScene(); drawHud(); drawResult();
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 44, C.white);
      return;
    }

    if (phase === 'ready') {
      phaseT -= dt;
      if (phaseT <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      gap = Math.max(0, timeLeft / TIME_LIMIT);
      stepLock(dt, true);
      if (lockIdx >= LOCKS) { endOk = true; phase = 'stop'; phaseT = 0.5; focusX = DOOR_X; focusY = H * 0.5; }
      else if (timeLeft <= 0) { timeLeft = 0; gap = 0; endOk = false; phase = 'stop'; phaseT = 0.5; focusX = DOOR_X; focusY = lockY(lockIdx); }
      else if (timeLeft < 3 && Math.random() < dt * 3) game.audio.tone('E2', 0.1, { wave: 'sawtooth', volume: 0.04 });
    } else if (phase === 'stop') {
      phaseT -= dt;
      if (endOk) runX += (DOOR_X - runX) * Math.min(1, dt * 6);
      if (phaseT <= 0) {
        phase = 'end'; phaseT = 1.1;
        if (endOk) {
          game.feedback.good(focusX, focusY, { text: 'CLEAR', color: C.bandTop, count: 30 });
          game.audio.play('se_success', 0.6);
          game.fx.flash('#f4f4f4', 0.3);
        } else {
          game.feedback.bad(focusX, focusY, { text: 'TIME UP' });
          game.audio.play('se_failure', 0.6);
        }
      }
    } else if (phase === 'end') {
      phaseT -= dt;
      if (endOk) runX += (DOOR_X - runX) * Math.min(1, dt * 6);
      if (phaseT <= 0) {
        state = S.RESULT;
        var avg = Math.round(avgReact() * 1000);
        if (endOk) game.end.success(scoreOf(), { locks: lockIdx, avgMs: avg, jams: jams, perfects: perfects });
        else game.end.failure({ locks: lockIdx, avgMs: avg, jams: jams });
        return;
      }
    }

    drawScene(); drawHud();
    if (phase === 'stop') {
      game.draw.circle(focusX, focusY, 110 + (0.5 - phaseT) * 180, C.white, 0.5);
      game.draw.sprite(KEYHOLE, { w: endOk ? C.bandTop : C.red }, focusX, focusY, 20, { anchor: 'center' });
    }
    if (phase === 'ready') txt(phaseT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.bandTop);
    if (phase === 'end') drawResult();
  });

  game.onStart(function() {
    game.audio.melody([
      ['E3', 0.5], ['E3', 0.5], ['G3', 0.5], ['E3', 0.5], ['A3', 1], ['G3', 1],
      ['E3', 0.5], ['E3', 0.5], ['D3', 0.5], ['E3', 0.5], ['B2', 2]
    ], { tempo: 132, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 2], ['E2', 2], ['C2', 2], ['B1', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
