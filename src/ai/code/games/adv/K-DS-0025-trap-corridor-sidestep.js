// K-DS-0025-trap-corridor-sidestep.js
// トラップコリドー — 天井から突き出る石槍を、体をかわして避け続ける遺跡の回廊
// 操作: 落ちてくる槍の真下から、指を押さえたまま左右に動かして体をずらしてよける
// 終わり: 規定本数(6本)を全てかわせば成功。1本でも当たれば失敗
// @mechanic: dodge
// @theme: ancient_trap_corridor
// 世界観: 忘れられた遺跡の回廊。天井の仕掛けから次々と石槍が落ちてくる中、探索者が体をかわしながら奥へ進もうとする
// 残るもの: 正誤(CLEAR/GAME OVER) + かわした本数
// スタイル: MODE7 PSEUDO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 疑似3D床、遠近の格子ライン、地平線の淡いグラデ
  var C = {
    sky: '#2a1f14', sky2: '#0e0a08', floorA: '#4a3524', floorB: '#3a2818',
    wall: '#20160e', spear: '#c8c0a8', spearTip: '#e8e0c0', warn: '#ff3a3a',
    good: '#7fe870', bad: '#ff4d3a', gold: '#ffd400', white: '#f4ecd8', ink: '#100a06',
  };

  var GAME_TITLE = 'TRAP CORRIDOR';
  var TOTAL = 6;
  var TRACK_Y = H * 0.74;
  var TOP_Y = H * 0.18;
  var LX = W * 0.14, RX = W * 0.86;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO = ['.##.', '####', '.##.', '##.##'];

  function bg() {
    game.draw.gradient(0, TRACK_Y, [[0, C.sky2], [1, C.sky]]);
    game.draw.gradient(TRACK_Y, H - TRACK_Y, [[0, C.floorA], [1, C.floorB]]);
    // 疑似3D遠近ライン(横のパース線)
    for (var i = 1; i <= 6; i++) {
      var y = TRACK_Y + (H - TRACK_Y) * (i / 6);
      var spread = (i / 6);
      game.draw.line(W * 0.5 - (W * 0.5) * spread, y, W * 0.5 + (W * 0.5) * spread, y, '#00000030', 2);
    }
    for (var j = -3; j <= 3; j++) {
      game.draw.line(W * 0.5, TRACK_Y, W * 0.5 + j * 140, H, '#00000025', 2);
    }
    game.draw.rect(0, 0, W * 0.1, TRACK_Y, C.wall);
    game.draw.rect(W * 0.9, 0, W * 0.1, TRACK_Y, C.wall);
  }

  var dodged, spear, round, playerX, finished, done, endWait;
  var ready, hitStop, shake;

  function newSpear() {
    var x = LX + Math.random() * (RX - LX);
    var dur = Math.max(0.85, 1.5 - round * 0.09);
    return { x: x, t: 0, dur: dur, resolved: false };
  }

  function initGame() {
    dodged = 0; round = 0; finished = false; done = false; endWait = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    playerX = W * 0.5;
    spear = newSpear();
  }

  game.onPress(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { playerX = Math.max(LX + 40, Math.min(RX - 40, x)); game.audio.play('se_tap', 0.04); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && ready <= 0 && !finished) { playerX = Math.max(LX + 40, Math.min(RX - 40, x)); } });

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

  function drawSpear(k) {
    if (!k) return;
    var p = Math.min(1, k.t / k.dur);
    var y = TOP_Y + (TRACK_Y - TOP_Y) * p;
    // telegraph: 着地予告の影(常時見える落下自体が予告、着地直前は点滅を強める)
    var blink = p > 0.55 ? (Math.floor(game.time.elapsed * 12) % 2 === 0) : true;
    if (blink) game.draw.circle(k.x, TRACK_Y, 46 * (0.4 + p * 0.6), C.warn, 0.25 + p * 0.25);
    game.draw.line(k.x, y - 70, k.x, y, C.spear, 14);
    game.draw.circle(k.x, y, 16, C.spearTip);
  }

  function drawHero(x) {
    game.draw.sprite(HERO, { '#': C.good }, x, TRACK_Y - 40, 26, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: TRACK_Y - 40, press: true, k: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { demo.k = null; round = 0; playerX = W * 0.5; }
    if (!demo.k) { demo.k = newSpear(); demo.k.dur = 1.3; demo.k.x = W * 0.5 + (Math.random() < 0.5 ? -1 : 1) * 220; }
    demo.k.t += dt;
    var p = demo.k.t / demo.k.dur;
    if (p > 0.4 && p < 0.55 && !demo.k._dodged) {
      demo.k._dodged = true;
      var safeX = demo.k.x < W * 0.5 ? RX - 60 : LX + 60;
      demo.gx = safeX; playerX = safeX; demo.press = true;
      game.feedback.good(demo.gx, TRACK_Y, { text: 'DODGE', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (p >= 1) { demo.k = null; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawSpear(demo.k);
      drawHero(playerX);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
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
      drawHero(playerX);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(dodged + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - dodged) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(dodged, { dodged: dodged, total: TOTAL });
        else game.end.failure({ dodged: dodged, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spear.t += dt;
      var p = spear.t / spear.dur;
      if (p >= 1 && !spear.resolved) {
        spear.resolved = true;
        var hitIt = Math.abs(playerX - spear.x) < 92;
        if (hitIt) {
          ok = false; finished = true; hitStop = 0.35;
          game.feedback.bad(spear.x, TRACK_Y, { text: 'HIT' });
          shake = 0.3;
          game.audio.play('se_bad', 0.4);
          finish();
        } else {
          dodged++;
          hitStop = 0.06;
          game.feedback.good(playerX, TRACK_Y, { text: 'DODGE', color: C.good });
          game.audio.play('se_good', 0.35);
          if (dodged === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W * 0.5, TRACK_Y - 260, { color: C.gold, size: 40 });
          if (dodged >= TOTAL) { ok = true; finished = true; finish(); }
          else { round++; spear = newSpear(); }
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawSpear(spear);
    drawHero(playerX);

    txt(dodged + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (dodged / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.8]], { tempo: 100, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
