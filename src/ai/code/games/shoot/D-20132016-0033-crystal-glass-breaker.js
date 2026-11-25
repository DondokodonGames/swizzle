// D-20132016-0033-crystal-glass-breaker.js
// クリスタル・グラスブレイカー — 迫りくる氷ガラスの薄膜を弾で撃ち抜き、奥へ進む
// 操作: 奥から迫ってくる氷ガラスをタップで撃つ。大きくなりきる前に撃ち抜く
// 終わり: 規定数(6枚)を撃ち抜き切れば成功。1枚でも撃ち抜けず迫られると失敗
// @mechanic: aim_shoot
// @theme: crystal_cave_glass_breaker
// 世界観: 氷の洞窟を掘り進む採掘ロボット。行く手を塞ぐ薄い氷ガラスの膜が次々と迫る中、主砲で撃ち抜きながら奥へ前進する
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃ち抜いた枚数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大な的、床に楕円影、間合いで見せる
  var C = {
    bg: '#0a1a2e', bg2: '#041020', ice: '#2a4a6a', iceEdge: '#5ac8ff', iceCore: '#bfe8ff',
    good: '#4dffb0', bad: '#ff4d5e', gold: '#ffd400', white: '#e8f4ff', ink: '#020810',
  };

  var GAME_TITLE = 'GLASS BREAKER';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, pane, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TURRET = ['#....#', '######', '.####.', '..##..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [0.6, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 24; i++) { var gx = (i * 191 + 23) % W, gy = (i * 331 + 41) % (H * 0.7); game.draw.rect(gx, gy, 2, 2, '#ffffff', 0.05); }
  }

  function newPane(i) {
    return { t: 0, life: Math.max(1.0, 1.8 - i * 0.11), driftAmp: 60 + i * 8, driftFreq: 1.6 + i * 0.15, resolved: false };
  }

  function paneX(p) { return CX + Math.sin(p.t * p.driftFreq) * p.driftAmp; }
  function paneSize(p) { return 60 + (p.t / p.life) * 260; }

  function initGame() {
    cleared = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    pane = newPane(0);
  }

  function nextPane() {
    cleared++;
    if (cleared >= TOTAL) { ok = true; finished = true; hitStop = 0.15; finish(); return; }
    pane = newPane(cleared);
  }

  function shoot(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished || !pane) return;
    var px = paneX(pane), sz = paneSize(pane);
    game.audio.play('se_tap', 0.06);
    if (Math.hypot(x - px, y - CY) < sz * 0.6 + 40) {
      pane.resolved = true;
      hitStop = 0.12;
      game.feedback.good(px, CY, { text: 'BREAK', color: C.good });
      game.fx.burst(px, CY, { color: C.iceEdge, count: 20, speed: 400 });
      game.audio.play('se_break', 0.45);
      if (cleared + 1 === Math.ceil(TOTAL / 2)) { game.fx.popup('HALFWAY!', W / 2, H * 0.14, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.4); }
      nextPane();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) shoot(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    if (!pane || pane.resolved) return;
    pane.t += dt;
    if (pane.t / pane.life > 0.55) {
      // telegraph tone once
    }
    if (pane.t >= pane.life) {
      pane.resolved = true;
      hitStop = 0.32;
      game.feedback.bad(paneX(pane), CY, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  function drawPane(p) {
    if (!p || p.resolved) return;
    var px = paneX(p), sz = paneSize(p);
    var danger = p.t / p.life > 0.55;
    if (danger) {
      var blink = Math.floor(game.time.elapsed * 9) % 2 === 0;
      if (blink) game.draw.circle(px, CY, sz * 0.6 + 30, C.bad, 0.3);
    }
    game.draw.circle(px, CY, sz * 0.6, C.ice, 0.85);
    game.draw.circle(px, CY, sz * 0.6, C.iceEdge, 0.5);
    game.draw.circle(px, CY, sz * 0.25, C.iceCore, 0.7);
    game.draw.circle(px, CY + sz * 0.62, sz * 0.5, '#000000', 0.2); // 床の楕円影
  }

  function drawTurret(bob) {
    game.draw.sprite(TURRET, { '#': C.iceEdge }, CX, H * 0.86 + bob, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { pane = newPane(0); }
    if (pane && !pane.resolved) {
      pane.t += dt;
      var px = paneX(pane);
      demo.gx += (px - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (CY - demo.gy) * Math.min(1, dt * 6);
      if (pane.t > pane.life * 0.6 && !pane.shot) {
        pane.shot = true; pane.resolved = true; demo.press = true;
        game.feedback.good(px, CY, { text: 'BREAK', color: C.good });
        game.fx.burst(px, CY, { color: C.iceEdge, count: 14, speed: 360 });
      }
    } else demo.press = false;
  }

  game.onUpdate(function(dt) {
    var elapsed = game.time.elapsed;
    var bob = Math.sin(elapsed * 2) * 6;

    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.3));
      stepDemo(dt);
      drawPane(pane);
      drawTurret(bob * 0.4);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + TOTAL : '-'), W / 2, H * 0.68, 24, C.gold);
      if (Math.floor(elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTurret(0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.68, 28, C.white);
      if (!ok && cleared === TOTAL - 1) txt('あと1枚!', W / 2, H * 0.72, 22, C.gold);
      if (ok && (game.best === 0 || cleared >= game.best)) txt('NEW RECORD', W / 2, H * 0.72, 22, C.gold);
      if (Math.floor(elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL }); else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepPlay(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawPane(finished ? null : pane);
    drawTurret(bob * 0.4);

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, H * 0.62, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, H * 0.62, (W - 120) * (cleared / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 132, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
