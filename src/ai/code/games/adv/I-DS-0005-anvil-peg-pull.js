// I-DS-0005-anvil-peg-pull.js
// アンビルペグプル — 石の台に刺さった杭を指でつまみ、まっすぐ真上に引き抜く
// 操作: 杭の頭を押さえ、まっすぐ上方向にドラッグして引き抜く。斜めにぶれると引き抜きが緩む
// 終わり: 制限時間内に杭を3本すべて引き抜けば成功。時間切れなら失敗
// @mechanic: slingshot
// @theme: strongman_stone_peg_pull
// 世界観: 祭りの力試し露店。石の台に打ち込まれた儀式の杭を、挑戦者がまっすぐ引き抜いて力を示す
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き抜いた本数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 画面の1/3を占める巨大キャラ、床に楕円影、背景は横1層
  var C = {
    bg: '#3a2818', bg2: '#241608', ground: '#5a3c20', groundDark: '#3a2410',
    stone: '#7a7a80', stoneDark: '#4a4a50', peg: '#c99a5a', pegDark: '#8a6a34',
    good: '#5aff8a', bad: '#ff5a4a', gold: '#ffd24d', white: '#f4ecd8', ink: '#100a04',
  };

  var GAME_TITLE = 'PEG PULL';
  var DUR = 14;
  var TOTAL = 3;
  var NEEDED_DIST = 260;
  var ANGLE_TOL = 0.35; // ラジアン(約20度)
  var STONE_X = W * 0.5, STONE_Y = H * 0.56;
  var PEG_OFFSETS = [-180, 0, 180];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var idx, pulled, pegX, pegY, headY, startX, startY, dragId, tension, timeLeft, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STRONGMAN = ['.##.', '####', '.##.', '#.#.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, H * 0.62, W, H * 0.3, C.ground);
    game.draw.rect(0, H * 0.62, W, 10, C.groundDark);
    game.draw.circle(STONE_X, H * 0.78, 220, C.stoneDark, 0.4);
    game.draw.sprite(STRONGMAN, { '#': C.white }, STONE_X, H * 0.85, 30, { anchor: 'center' });
  }

  function pegPos() {
    return { x: STONE_X + PEG_OFFSETS[idx % PEG_OFFSETS.length], y: STONE_Y };
  }

  function drawStone() {
    game.draw.rect(STONE_X - 260, STONE_Y + 20, 520, 90, C.stoneDark);
    game.draw.rect(STONE_X - 250, STONE_Y + 26, 500, 70, C.stone);
  }

  function drawPeg(x, headYy, t) {
    var buried = 120 * (1 - t);
    game.draw.rect(x - 20, headYy, 40, 120 + buried, C.pegDark);
    game.draw.rect(x - 14, headYy, 28, 100 + buried, C.peg);
    game.draw.circle(x, headYy - 6, 26, C.pegDark);
    game.draw.circle(x, headYy - 6, 19, C.peg);
  }

  function initGame() {
    idx = 0; pulled = 0; timeLeft = DUR; milestoneShown = false;
    dragId = null; tension = 0;
    var p = pegPos(); pegX = p.x; pegY = p.y; headY = p.y - 20;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resetPeg() {
    var p = pegPos(); pegX = p.x; pegY = p.y; headY = p.y - 20; tension = 0; dragId = null;
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - pegX, y - headY) < 80 && dragId === null) {
      dragId = id; startX = x; startY = y;
      game.audio.play('se_tap', 0.1);
    }
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || dragId !== id || finished) return;
    var dx = x - startX, dy = y - startY;
    if (dy >= -4) return;
    var dist = -dy;
    var angle = Math.atan2(Math.abs(dx), dist);
    if (angle > ANGLE_TOL) {
      if (tension > 0.03) {
        tension = Math.max(0, tension - 0.35);
        shake = 0.12;
        game.feedback.bad(x, y, { text: null, shake: true });
        game.audio.play('se_bad', 0.2);
      }
      return;
    }
    var t = Math.min(1, dist / NEEDED_DIST);
    if (t > tension) tension = t;
    headY = pegPos().y - 20 - tension * 150;
    if (tension >= 1) {
      pulled++;
      hitStop = 0.12;
      game.feedback.good(pegX, headY, { text: pulled + '/' + TOTAL, color: C.good });
      game.fx.burst(pegX, headY, { color: C.gold, count: 16, speed: 360 });
      game.audio.play('se_success', 0.4);
      if (!milestoneShown && pulled >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.4);
      }
      if (pulled >= TOTAL) { ok = true; finished = true; finish(); return; }
      idx++;
      resetPeg();
    }
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (dragId === id) {
      dragId = null;
      if (tension < 1) { tension = 0; headY = pegPos().y - 20; game.audio.play('se_tap', 0.05); }
    }
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

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (idx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawStone();
      drawPeg(pegX, headY, tension);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawStone();
      drawPeg(pegX, headY, tension);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(pulled + ' / ' + TOTAL, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - pulled) + '本!', W / 2, H * 0.16, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pulled, { pulled: pulled, total: TOTAL }); else game.end.failure({ pulled: pulled, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(pegX, headY, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawStone();
    drawPeg(pegX, headY, tension);

    txt(pulled + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.4);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: STONE_X, gy: STONE_Y - 20, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { idx = 0; pulled = 0; milestoneShown = false; resetPeg(); }
    if (cyc < 2.4) {
      var p = Math.min(1, cyc / 2.2);
      tension = p;
      headY = pegPos().y - 20 - tension * 150;
      demo.gx = pegX; demo.gy = headY;
      demo.press = true;
      if (p >= 1) {
        pulled = Math.min(TOTAL, pulled + 1);
      }
    } else {
      demo.press = false;
    }
  }

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['E3', 0.3], ['G3', 0.3], ['C4', 0.6]], { tempo: 112, wave: 'sawtooth', volume: 0.05, loop: true, bass: [['C2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
