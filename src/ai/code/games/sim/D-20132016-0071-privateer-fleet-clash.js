// D-20132016-0071-privateer-fleet-clash.js
// プライバティア・フリートクラッシュ — 嵐の海を征く私掠船団の一戦。索具を溜めてから戦法を選ぶ
// 操作: 画面を長押しして索具(資源)を溜め、指を離したら敵の戦法に勝る戦法ゾーンをタップする
// 終わり: 3戦のうち2戦以上を制すれば艦隊の勝利。2敗すれば壊滅
// @mechanic: judge
// @theme: privateer_fleet_clash
// 世界観: 嵐の海を行く私掠船団の一度きりの海戦。船長は索具を溜めて機を計り、敵の戦法に勝る戦法を選び抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 制した海戦数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 少色+地平グラデ、横1pxストリップを奥ほど圧縮した床(海面)
  var C = {
    sky: '#0e1a3a', sky2: '#2a3a6a', sea: '#0a2440', seaFar: '#163a5a',
    cannon: '#ff5a2e', ram: '#e0a020', board: '#2ee0a0',
    ally: '#d8c090', enemy: '#4a3a5a', gold: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', white: '#eaf2ff', ink: '#060a18',
  };
  var EL = ['cannon', 'ram', 'board'];
  var EL_COLOR = { cannon: C.cannon, ram: C.ram, board: C.board };
  var BEATS = { cannon: 'ram', ram: 'board', board: 'cannon' };

  var GAME_TITLE = 'FLEET CLASH';
  var CX = W * 0.5;
  var CHARGE_MAX = 0.9, MIN_CHARGE = 0.45;
  var CHARGE_TIMEOUT = 2.8, CHOOSE_TIMEOUT = 2.2;
  var TOTAL = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SHIP_FRAMES = [
    ['..##..', '.####.', '######', '.####.'],
    ['..##..', '.####.', '######', '..##..'],
  ];

  var round, wins, losses, enemyEl, phase, phaseT, holding, holdStart, chargeAmt, resolved;
  var finished, done, endWait, hitStop, shake, ready;

  function newRound() {
    enemyEl = EL[Math.floor(game.random(0, 3))];
    phase = 'charge'; phaseT = 0; holding = false; chargeAmt = 0; resolved = false;
  }

  function initGame() {
    round = 0; wins = 0; losses = 0; finished = false; done = false;
    endWait = 0; hitStop = 0; shake = 0; ready = 0.8;
    newRound();
  }

  function bg() {
    var elapsed = game.time.elapsed;
    game.draw.gradient(0, H * 0.5, [[0, C.sky2], [1, C.sky]]);
    // 地平線へ収束する海面ストリップ
    var horizon = H * 0.5;
    for (var i = 0; i < 26; i++) {
      var t = i / 26;
      var y = horizon + t * t * (H * 0.5);
      var rowH = 2 + t * 10;
      var shade = i % 2 === 0 ? C.sea : C.seaFar;
      game.draw.rect(0, y, W, rowH, shade, 0.9);
    }
    game.draw.circle(W * 0.2, H * 0.12, 30, '#ffe9b0', 0.6);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
  }

  function drawShips() {
    var bobY = Math.sin(game.time.elapsed * 2.0) * 6;
    var swayX = Math.cos(game.time.elapsed * 1.4) * 4;
    game.draw.sprite(SHIP_FRAMES[Math.floor(game.time.elapsed * 2.5) % 2], { '#': C.ally }, W * 0.3 + swayX, H * 0.38 + bobY, 15, { anchor: 'center' });
    var flash = phase === 'choose' && phaseT < 0.7 && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.sprite(SHIP_FRAMES[Math.floor(game.time.elapsed * 2.5) % 2], { '#': flash ? C.gold : C.enemy }, W * 0.7 - swayX, H * 0.34 + bobY, 15, { anchor: 'center' });
    game.draw.circle(W * 0.7, H * 0.22, 24, EL_COLOR[enemyEl]);
  }

  function drawChargeMeter(c, live) {
    var gx = W * 0.2, gy = H * 0.8, gw = W * 0.6, gh = 44;
    game.draw.rect(gx, gy, gw, gh, C.ink, 0.55);
    game.draw.rect(gx + gw * MIN_CHARGE, gy, gw * (1 - MIN_CHARGE), gh, C.good, 0.25);
    game.draw.rect(gx, gy, gw * Math.min(1, c), gh, live ? C.gold : C.ally, 0.85);
  }

  function zoneX(el) { return { cannon: W * 0.22, ram: W * 0.5, board: W * 0.78 }[el]; }

  function drawZones() {
    var zy = H * 0.8, zw = 220, zh = 130;
    for (var i = 0; i < EL.length; i++) {
      var el = EL[i], x = zoneX(el);
      game.draw.rect(x - zw / 2, zy - zh / 2, zw, zh, C.ink, 0.5);
      game.draw.rect(x - zw / 2, zy - zh / 2, zw, zh, EL_COLOR[el], 0.35);
      game.draw.circle(x, zy, 34, EL_COLOR[el]);
    }
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function resolveChoice(chosenEl) {
    if (resolved || finished || ready > 0) return;
    resolved = true;
    var correct = BEATS[chosenEl] === enemyEl && chargeAmt >= MIN_CHARGE;
    hitStop = correct ? 0.14 : 0.35;
    if (correct) {
      wins++;
      game.feedback.good(zoneX(chosenEl), H * 0.8, { text: 'GOOD', color: C.good });
      game.fx.burst(W * 0.7, H * 0.34, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_good', 0.4);
      if (wins === 2) { game.fx.popup('あと1戦!', CX, H * 0.22, { color: C.gold, size: 32 }); game.audio.play('se_milestone', 0.3); }
    } else {
      losses++;
      game.feedback.bad(zoneX(chosenEl), H * 0.8, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
    }
    round++;
    if (wins >= 2) { ok = true; finished = true; finish(); return; }
    if (losses >= 2) { ok = false; finished = true; finish(); return; }
    if (round >= TOTAL) { ok = wins > losses; finished = true; finish(); return; }
  }

  function releaseCharge() {
    if (phase !== 'charge' || finished || ready > 0) return;
    holding = false;
    game.audio.play('se_powerup', 0.3);
    phase = 'choose'; phaseT = 0;
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) { game.audio.play('se_tap', 0.05); return; }
    if (phase === 'charge') { holding = true; holdStart = game.time.elapsed; game.audio.play('se_tap', 0.15); }
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (phase === 'charge' && holding) { game.audio.play('se_tap', 0.1); releaseCharge(); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || finished || phase !== 'choose' || resolved) return;
    game.audio.play('se_tap', 0.1);
    var best = null, bestD = 1e9;
    for (var i = 0; i < EL.length; i++) {
      var d = Math.hypot(x - zoneX(EL[i]), y - H * 0.8);
      if (d < bestD) { bestD = d; best = EL[i]; }
    }
    if (bestD < 160) resolveChoice(best);
  });

  var demo = { t: 0, gx: CX, gy: H * 0.8, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { newRound(); }
    if (cyc < 1.2) {
      phase = 'charge';
      chargeAmt = cyc / CHARGE_MAX;
      demo.gx = CX; demo.gy = H * 0.55; demo.press = true;
    } else if (cyc < 1.4) {
      phase = 'choose'; phaseT = 0; demo.press = false;
    } else if (cyc < 3.0) {
      phase = 'choose';
      if (cyc > 2.4 && !resolved) {
        var correctEl = null;
        for (var i = 0; i < EL.length; i++) if (BEATS[EL[i]] === enemyEl) correctEl = EL[i];
        demo.gx = zoneX(correctEl); demo.gy = H * 0.8; demo.press = true;
        resolved = true;
        game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
        game.audio.play('se_good', 0.25);
      }
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawShips();
      if (phase === 'charge') drawChargeMeter(chargeAmt, true); else drawZones();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
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
      drawShips();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(wins + ' / ' + TOTAL, W / 2, H * 0.14, 32, C.gold);
      if (!ok && wins >= 1) txt('あと1戦!', W / 2, H * 0.19, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { wins: wins, losses: losses };
        if (ok) game.end.success(wins, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT += dt;
      if (phase === 'charge') {
        if (holding) {
          chargeAmt = (game.time.elapsed - holdStart) / CHARGE_MAX;
          if (chargeAmt >= 1.15) releaseCharge();
        }
        if (phaseT >= CHARGE_TIMEOUT) { chargeAmt = Math.min(chargeAmt, 0.2); releaseCharge(); }
      } else if (phase === 'choose') {
        if (phaseT >= CHOOSE_TIMEOUT && !resolved) {
          var correctEl = null;
          for (var ci = 0; ci < EL.length; ci++) { if (BEATS[EL[ci]] === enemyEl) correctEl = EL[ci]; }
          var wrongEl = EL[0] === correctEl ? EL[1] : EL[0];
          resolveChoice(wrongEl);
        }
        if (resolved && hitStop <= 0 && !finished) { newRound(); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawShips();
    if (!finished) {
      if (phase === 'charge') drawChargeMeter(chargeAmt, holding); else drawZones();
    }
    txt(wins + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.6, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.4], ['F3', 0.4], ['A3', 0.4], ['D4', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
