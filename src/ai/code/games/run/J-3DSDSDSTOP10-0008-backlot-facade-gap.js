// J-3DSDSDSTOP10-0008-backlot-facade-gap.js
// 撮影所の倒れ塔 — 倒れてくる張りぼての塔の「窓の穴」が落ちる位置に立ち位置を合わせてやり過ごす
// 操作: 5列のどこかをタップするとその列へ走る。影に浮かぶ明るい穴(窓・アーチ)の列に立っていれば塔が素通りする
// 終わり: 8本やり過ごせばCLEAR。穴の外で下敷きになるとGAME OVER
// @mechanic: gap_fit
// @theme: backlot_toppling_facade
// 世界観: 映画撮影所の裏手で、新人スタント係が次々と倒される張りぼての鐘塔の窓枠に寸分違わず立ち、名物の「窓抜けカット」を一発で撮り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + やり過ごした本数・ギリギリ回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var STYLE = { bg: ['#ffe4b0', '#f0c080', '#c89060'], main: ['#e86a4a', '#b04a30', '#4a8ad8'], accent: ['#ffd23a', '#1a1a1a'] };
  var C = { line: '#1a1a1a', ground: '#f0d8a8', ground2: '#e0c090', wall: '#e86a4a', wallD: '#b04a30', roof: '#4a8ad8', roofD: '#2a5aa0', hole: '#fff6c8', gold: '#ffd23a', good: '#5ad06a', bad: '#ff3a3a', white: '#ffffff', shade: '#000000' };

  var GAME_TITLE = 'FACADE DROP';
  var TIME_LIMIT = 22;
  var NEEDED = 8;
  var LANES = 5, LW = W / LANES;
  var TOP = H * 0.2, BOT = H * 0.7, PLAYER_Y = H * 0.6;

  var STUNT = ['..####..', '.#oooo#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..', '.##..##.'];
  var STUNT2 = ['..####..', '.#oooo#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..', '..#..#..'];
  var CAMERA = ['.####...', '######.#', '#oo####.', '######.#', '.#..#...', '.#..#...'];
  var DIRECTOR = ['..###..', '.#####.', '..#.#..', '.#####.', '#.###.#', '..#.#..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var lane, px, tower, cleared, close, timeLeft, ready, ended, ok, hitStop, endWait, score, milestone, runT, crushed, dust;

  function newTower(demoMode, forceHoles) {
    var holes = [];
    var n = demoMode ? 1 : (cleared < 3 ? 2 : 1);
    if (forceHoles) holes = forceHoles.slice();
    else while (holes.length < n) { var h = Math.floor(game.random(0, LANES)); if (holes.indexOf(h) < 0 && h !== lane) holes.push(h); }
    var warn = demoMode ? 0.75 : Math.max(0.55, 1.0 - cleared * 0.06);
    return { holes: holes, phase: 'wobble', t: 0.45, warn: warn, fall: 0, gold: !demoMode && Math.random() < 0.3 ? holes[0] : -1 };
  }

  function initGame() {
    lane = 2; px = (lane + 0.5) * LW; cleared = 0; close = 0; timeLeft = TIME_LIMIT; ready = 0.8;
    ended = false; ok = false; hitStop = 0; endWait = 0; score = 0; milestone = false; runT = 0; crushed = false; dust = 0;
    tower = newTower(false);
  }

  function moveTo(l, demoMode) {
    if (l < 0 || l >= LANES) return;
    lane = l; runT = 0.15;
    if (!demoMode) game.audio.play('se_jump', 0.25);
  }

  // 実ロジック: 塔が倒れ切った瞬間の判定(デモも同じ関数)
  function impact(demoMode) {
    dust = 0.5;
    var safe = tower.holes.indexOf(lane) >= 0 && Math.abs(px - (lane + 0.5) * LW) < LW * 0.3;
    if (safe) {
      cleared++;
      var edge = Math.abs(px - (lane + 0.5) * LW) > LW * 0.12;
      if (edge) close++;
      if (!demoMode) {
        score += 200 + (tower.gold === lane ? 300 : 0) + (edge ? 100 : 0);
        game.feedback.good(px, PLAYER_Y - 100, { text: tower.gold === lane ? 'BONUS' : (edge ? 'NICE' : 'GOOD'), color: C.good });
        game.audio.play('se_break', 0.3);
        if (!milestone && cleared >= NEEDED / 2) {
          milestone = true; game.audio.play('se_milestone', 0.6);
          game.fx.popup(cleared + ' / ' + NEEDED, W / 2, H * 0.14, { color: C.gold, size: 70 });
        }
      } else {
        game.fx.burst(px, PLAYER_Y, { color: C.gold, count: 12 });
      }
      return true;
    }
    crushed = true;
    if (demoMode) game.fx.burst(px, PLAYER_Y, { color: C.bad, count: 12 });
    return false;
  }

  function stepTower(dt, demoMode) {
    if (!tower) return;
    tower.t -= dt;
    if (tower.phase === 'wobble') {
      if (tower.t <= 0) { tower.phase = 'warn'; tower.t = tower.warn; if (!demoMode) game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.05, slide: -120 }); }
    } else if (tower.phase === 'warn') {
      if (tower.t <= 0) { tower.phase = 'fall'; tower.t = 0.18; }
    } else if (tower.phase === 'fall') {
      tower.fall = 1 - Math.max(0, tower.t) / 0.18;
      if (tower.t <= 0) {
        tower.phase = 'down'; tower.t = 0.55; tower.fall = 1;
        var safe = impact(demoMode);
        if (!safe && !demoMode) { finish(false); return; }
      }
    } else if (tower.phase === 'down') {
      if (tower.t <= 0) {
        crushed = false;
        if (!demoMode && cleared >= NEEDED) { finish(true); return; }
        tower = demoMode ? null : newTower(false);
      }
    }
  }

  function outlineRect(x, y, w, h, fill, shade) {
    game.draw.rect(x - 6, y - 6, w + 12, h + 12, C.line, 1);
    game.draw.rect(x, y, w, h, fill, 1);
    if (shade) game.draw.rect(x, y + h * 0.6, w, h * 0.4, shade, 1);
  }

  function txt(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 5, { size: sz, color: C.line, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  function drawLot(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // 撮影所の地面(レーン)
    for (var l = 0; l < LANES; l++) game.draw.rect(l * LW, TOP, LW, BOT - TOP, l % 2 ? C.ground : C.ground2, 1);
    for (var k = 1; k < LANES; k++) game.draw.rect(k * LW - 3, TOP, 6, BOT - TOP, C.line, 0.25);
    game.draw.rect(0, 0, W, H, C.gold, 0.03 + 0.03 * Math.sin(t * 1.6));
    // 手前: カメラ台と監督(演出のみ)
    game.draw.rect(0, BOT, W, H - BOT, '#6a4a3a', 1);
    game.draw.rect(0, BOT, W, 10, C.line, 1);
    game.draw.sprite(CAMERA, { '#': '#303030', 'o': '#8ad0ff' }, W * 0.15 + Math.sin(t * 0.8) * 20, H * 0.88, 14, { anchor: 'center' });
    game.draw.sprite(DIRECTOR, { '#': C.roof }, W * 0.85, H * 0.88 + Math.sin(t * 2.5) * 6, 14, { anchor: 'center' });
    // 親指ゾーンの列ボタン
    for (var b = 0; b < LANES; b++) {
      var sel = b === lane;
      game.draw.circle((b + 0.5) * LW, H * 0.78, sel ? 58 : 48, C.line, 1);
      game.draw.circle((b + 0.5) * LW, H * 0.78, sel ? 50 : 40, sel ? C.gold : '#c8a878', 1);
    }
  }

  function drawTower(t) {
    if (!tower) return;
    var baseY = TOP - 10;
    if (tower.phase === 'wobble' || tower.phase === 'warn') {
      // 立っている塔(上から見た屋根)が軋んで揺れる
      var wob = Math.sin(t * 40) * (tower.phase === 'warn' ? 10 : 5);
      outlineRect(W * 0.05 + wob, baseY - 90, W * 0.9, 80, C.roof, C.roofD);
      if (tower.phase === 'warn') {
        // 予告: 倒れる範囲の影 + 穴の位置が明るく浮かぶ
        var k = 1 - tower.t / tower.warn;
        game.draw.rect(0, TOP, W, BOT - TOP, C.shade, 0.12 + 0.3 * k);
        for (var i = 0; i < tower.holes.length; i++) {
          var hx = tower.holes[i] * LW;
          var blink = Math.floor(t * 12) % 2 === 0 ? 0.9 : 0.6;
          game.draw.rect(hx + 16, PLAYER_Y - 110, LW - 32, 220, C.hole, blink);
          if (tower.gold === tower.holes[i]) game.draw.circle(hx + LW / 2, PLAYER_Y - 150, 20, C.gold, 1);
        }
      }
      return;
    }
    // 倒れていく/倒れた壁面: 上から伸びて地面を覆う
    var len = (BOT - TOP) * (tower.phase === 'fall' ? tower.fall : 1);
    outlineRect(W * 0.03, TOP, W * 0.94, len, C.wall, C.wallD);
    for (var r = 0; r < 6; r++) game.draw.rect(W * 0.03, TOP + r * 90, W * 0.94, 6, C.line, 0.35);
    if (len > PLAYER_Y - TOP + 110) {
      for (var j = 0; j < tower.holes.length; j++) {
        var x0 = tower.holes[j] * LW + 16;
        game.draw.rect(x0 - 6, PLAYER_Y - 116, LW - 20, 232, C.line, 1);
        game.draw.rect(x0, PLAYER_Y - 110, LW - 32, 220, C.ground, 1);
      }
    }
    if (dust > 0) for (var d = 0; d < 8; d++) game.draw.circle(W * (0.08 + d * 0.12), BOT + Math.sin(d) * 10, 40 * dust * 2, C.white, 0.5);
  }

  function drawStunt(t) {
    var fr = runT > 0 ? (Math.floor(t * 20) % 2 ? STUNT : STUNT2) : STUNT;
    var sc = crushed ? 16 : 12;
    game.draw.circle(px, PLAYER_Y + 50, 45, C.shade, 0.25);
    game.draw.sprite(fr, { '#': C.roof, 'o': '#ffd8b0' }, px + Math.sin(t * 2) * 2, PLAYER_Y + Math.sin(t * 3) * 4, sc, { anchor: 'center' });
    if (crushed) game.draw.circle(px, PLAYER_Y, 110, C.white, 0.4 + 0.3 * Math.sin(t * 30));
  }

  function drawHud(t) {
    txt(cleared + ' / ' + NEEDED, W / 2, H * 0.045, 62, C.white);
    txt('SCORE ' + score, W * 0.18, H * 0.045, 30, C.white);
    game.draw.rect(60, 140, W - 120, 18, C.line, 0.7);
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 140, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.bad : C.gold);
  }

  function laneFromTap(x) { return Math.max(0, Math.min(LANES - 1, Math.floor(x / LW))); }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || ended) { game.audio.play('se_tap', 0.05); return; }
    var l = laneFromTap(x);
    if (l === lane) { game.audio.play('se_tap', 0.15); game.fx.burst(px, PLAYER_Y + 40, { color: C.white, count: 4, speed: 100 }); }
    else moveTo(l, false);
  });

  // ── ATTRACT ゴースト実演(3.4秒周期: 1本目は穴の列へ走って素通り、2本目は穴の隣で下敷き) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.78, press: 0, stage: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { lane = 2; px = (lane + 0.5) * LW; crushed = false; tower = newTower(true, [4]); demo.stage = 0; }
    if (demo.stage === 0 && tower && tower.phase === 'warn') { moveTo(4, true); demo.press = 0.15; demo.stage = 1; }
    if (demo.stage === 1 && cyc > 1.7) { crushed = false; tower = newTower(true, [0]); demo.stage = 2; }
    if (demo.stage === 2 && tower && tower.phase === 'warn' && tower.t < tower.warn * 0.5) { moveTo(1, true); demo.press = 0.15; demo.stage = 3; }
    var tl = demo.stage <= 1 ? 4 : 1;
    demo.gx += ((tl + 0.5) * LW - demo.gx) * Math.min(1, dt * 8);
    demo.gy = H * 0.78 + 20;
    if (demo.press > 0) demo.press -= dt;
    stepPlayer(dt);
    stepTower(dt, true);
    if (dust > 0) dust -= dt;
  }

  function stepPlayer(dt) {
    var tx = (lane + 0.5) * LW;
    px += (tx - px) * Math.min(1, dt * 14);
    if (runT > 0) runT -= dt;
  }

  function finish(success) {
    ended = true; ok = success; hitStop = 0.5; endWait = 1.1;
    game.fx.flash('#ffffff', 0.25);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (tower === undefined) initGame();
      stepDemo(dt);
      drawLot(t); drawTower(t); drawStunt(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07 + Math.sin(t * 2) * 6, 88, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.12, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawLot(t); drawTower(t); drawResult(t); return; }

    if (ended) {
      if (hitStop > 0) {
        hitStop -= dt;
        if (hitStop <= 0) {
          if (ok) { game.audio.play('se_success', 0.7); game.fx.burst(W / 2, H * 0.45, { color: C.gold, count: 50, speed: 700 }); }
          else { game.feedback.bad(px, PLAYER_Y, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' }); game.audio.play('se_failure', 0.6); }
        }
      } else {
        endWait -= dt;
        if (endWait <= 0) {
          state = S.RESULT;
          var stats = { cleared: cleared, close: close, needed: NEEDED };
          drawLot(t); drawTower(t); drawResult(t);
          if (ok) game.end.success(score, stats); else game.end.failure(stats);
          return;
        }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.5);
    } else {
      timeLeft -= dt;
      stepPlayer(dt);
      stepTower(dt, false);
      if (dust > 0) dust -= dt;
      if (!ended && timeLeft <= 0) { timeLeft = 0; finish(false); }
    }

    drawLot(t);
    drawTower(t); drawStunt(t);
    drawHud(t);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, C.gold);
  });

  function drawResult(t) {
    game.draw.rect(60, H * 0.28, W - 120, H * 0.4, C.line, 0.85);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.35, 130, C.good);
      game.draw.sprite(STUNT, { '#': C.roof, 'o': '#ffd8b0' }, W / 2, H * 0.44 + Math.sin(t * 5) * 10, 12, { anchor: 'center' });
    } else {
      txt('GAME OVER', W / 2, H * 0.35, 104, C.bad);
      txt('あと' + Math.max(1, NEEDED - cleared) + '本!', W / 2, H * 0.44, 64, C.gold);
    }
    txt(cleared + ' / ' + NEEDED, W / 2, H * 0.51, 58, C.white);
    txt('SCORE ' + score, W / 2, H * 0.57, 46, C.white);
    var isNew = ok && score > (game.best || 0);
    txt(isNew ? 'NEW RECORD' : 'BEST ' + (game.best || 0), W / 2, H * 0.63, 44, isNew ? C.gold : C.white);
    if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 44, C.white);
  }

  game.onStart(function() {
    game.audio.melody([
      ['C4', 0.5], ['E4', 0.5], ['G4', 0.5], ['Bb4', 0.5], ['A4', 1], ['F4', 1],
      ['G4', 0.5], ['A4', 0.5], ['Bb4', 0.5], ['C5', 0.5], ['G4', 2]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 2], ['F2', 2], ['G2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
