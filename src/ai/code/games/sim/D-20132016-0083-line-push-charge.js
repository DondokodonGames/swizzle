// D-20132016-0083-line-push-charge.js
// ライン・プッシュ・チャージ — 膠着した前線を、一度きりの全軍突撃で押し切る
// 操作: 画面を長押しして突撃力を溜め、適正圏内で指を離して突撃を放つ
// 終わり: 適正圏内で離せば戦線突破で成功。圏外での解放/溜めすぎは失敗
// @mechanic: hold_charge
// @theme: frontline_wave_charge
// 世界観: 荒れた国境の最前線、寄せ集めの義勇兵部隊を率いる指揮官が、たった一度の全軍突撃で膠着したラインを押し切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した突撃力%
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 太い輪郭、大きめの塊状スプライト、限定色
  var C = {
    bg: '#1a1408', bg2: '#241c0e', ground: '#3a2e18', groundEdge: '#5a4826',
    ally: '#3d7dff', allyDark: '#1c3a80', enemy: '#ff3d3d', enemyDark: '#7a1414',
    zone: '#4dff8a', zoneWarn: '#ffcf3d', bad: '#ff4d5e', gold: '#ffd400',
    white: '#f4ecd8', ink: '#0a0806',
  };

  var GAME_TITLE = 'LINE PUSH';
  var CX = W * 0.5;
  var LOW = 55, HIGH = 75, OVERLOAD = 100;
  var RATE = 25; // charge per second

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var COMMANDER = ['.##.', '####', '.##.', '#..#'];
  var TROOP = ['.#.', '###', '#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.55, W, H * 0.2, C.ground);
    game.draw.rect(0, H * 0.55, W, 4, C.groundEdge);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  var chargeVal, holdActive, released, warnedOverload;
  var pushLine, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown;

  function initGame() {
    chargeVal = 0; holdActive = false; released = false; warnedOverload = false;
    pushLine = 0.5; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
  }

  function resolve(val) {
    if (finished) return;
    finished = true;
    var success = val >= LOW && val <= HIGH;
    ok = success;
    if (success) {
      pushLine = 0.92;
      hitStop = 0.12;
      game.feedback.good(CX, H * 0.4, { text: 'CLEAR', color: C.zone });
      game.fx.burst(CX, H * 0.4, { color: C.gold, count: 20, speed: 400 });
      game.audio.play('se_success', 0.5);
    } else {
      pushLine = Math.min(0.75, 0.5 + val / 200);
      hitStop = 0.35;
      game.feedback.bad(CX, H * 0.4, { text: val > HIGH ? 'MISS' : 'MISS' });
      shake = 0.3;
      game.audio.play('se_failure', 0.4);
    }
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || done) return;
    holdActive = true;
    game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y, { color: C.gold, count: 6, speed: 160 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !holdActive) return;
    holdActive = false;
    game.audio.play('se_tap', 0.2);
    resolve(chargeVal);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawTroops(mass, bobT) {
    var n = 5;
    for (var i = 0; i < n; i++) {
      var bx = CX - 180 + i * 90 + Math.sin(bobT * 2.1 + i) * 6;
      var by = H * 0.52 + Math.cos(bobT * 1.7 + i * 1.3) * 5 - mass * 40;
      game.draw.sprite(TROOP, { '#': C.ally }, bx, by, 16, { anchor: 'center' });
    }
  }

  function drawScene(val, line) {
    var bobT = game.time.elapsed;
    // enemy line
    var enemyX = W * (0.78 - line * 0.2);
    game.draw.rect(enemyX, H * 0.3, 30, H * 0.24, C.enemyDark);
    game.draw.sprite(TROOP, { '#': C.enemy }, enemyX + 15, H * 0.28 + Math.sin(bobT * 1.9) * 4, 14, { anchor: 'center' });
    // friendly line marker
    var friendX = W * (0.22 + line * 0.2);
    game.draw.rect(friendX - 30, H * 0.3, 30, H * 0.24, C.allyDark);
    game.draw.sprite(COMMANDER, { '#': C.gold }, friendX - 15, H * 0.24 + Math.sin(bobT * 1.6) * 4, 16, { anchor: 'center' });
    drawTroops(val / 100, bobT);
    // charge gauge
    var gx = 120, gy = H * 0.68, gw = W - 240, gh = 64;
    game.draw.rect(gx, gy, gw, gh, C.ink, 0.6);
    game.draw.rect(gx + (LOW / OVERLOAD) * gw, gy, ((HIGH - LOW) / OVERLOAD) * gw, gh, C.zone, 0.5);
    var danger = val >= HIGH;
    var warnBlink = Math.floor(bobT * 8) % 2 === 0;
    if (danger && warnBlink) game.draw.rect(gx + (HIGH / OVERLOAD) * gw, gy, ((OVERLOAD - HIGH) / OVERLOAD) * gw, gh, C.bad, 0.5);
    game.draw.rect(gx, gy, Math.max(2, (val / OVERLOAD) * gw), gh, C.gold);
    game.draw.rect(gx, gy, gw, gh, C.white, 0);
    txt(Math.round(val) + '%', gx + gw / 2, gy + gh / 2 + 12, 34, C.white);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { chargeVal = 0; pushLine = 0.5; }
    if (cyc < 2.4) {
      chargeVal = Math.min(OVERLOAD, (cyc / 2.4) * 68);
      demo.press = true;
      demo.gx = CX;
    } else if (cyc < 2.6) {
      demo.press = false;
      pushLine = 0.92;
    } else {
      pushLine = 0.92;
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(chargeVal, pushLine);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(chargeVal, pushLine);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.zone : C.bad);
      txt(Math.round(chargeVal) + '%', W / 2, H * 0.13, 32, C.gold);
      if (!ok) {
        var near = chargeVal < LOW ? 'あと少し!' : 'ぎりぎり!';
        txt(near, W / 2, H * 0.18, 26, C.white);
      }
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(chargeVal);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (holdActive) {
        chargeVal += RATE * dt;
        if (!milestoneShown && chargeVal >= 50) {
          milestoneShown = true;
          game.fx.popup('GOOD', CX, H * 0.4, { color: C.gold, size: 36 });
          game.audio.play('se_milestone', 0.4);
        }
        if (chargeVal >= HIGH && !warnedOverload) {
          warnedOverload = true;
          game.audio.play('se_bad', 0.15);
        }
        if (chargeVal >= OVERLOAD) {
          resolve(OVERLOAD);
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(chargeVal, pushLine);
    game.draw.rect(60, H * 0.06, W - 120, 14, C.ink, 0.5);
    game.draw.rect(60, H * 0.06, (W - 120) * pushLine, 14, C.zone);
    txt(Math.round(pushLine * 100) + ' / ' + 100, W / 2, H * 0.045, 26, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.4], ['C3', 0.4], ['G3', 0.4], ['C4', 0.8]], { tempo: 100, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
