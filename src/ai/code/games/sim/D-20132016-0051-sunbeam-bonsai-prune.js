// D-20132016-0051-sunbeam-bonsai-prune.js
// 陽だまり盆栽 — 伸びすぎた枝を指でこすって刈り込み、日だまりへ向けて育てる
// 操作: 光っている枝の上を指で素早く左右にこすって刈り取る。全部刈れば木が伸びる
// 終わり: 制限時間内に全ての枝を刈り終えれば成功。時間切れなら失敗
// @mechanic: rub
// @theme: rooftop_sunlight_bonsai
// 世界観: 屋上の小さな鉢植え。伸び放題の枝が陽だまりを遮っており、庭師が枝を刈って木を陽の当たる高さまで育てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 刈り取った枝数
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: 白縁の丸い形、パステル
  var C = {
    bg: '#fdf2e6', bg2: '#f7e3d0', pot: '#c98a5a', potHi: '#e0a878',
    branch: '#8a6a44', branchDone: '#3a5a3a', leaf: '#8fd18a', leafHi: '#bce8ae',
    sun: '#ffe08a', sunCore: '#fff6d0', good: '#5adf8a', bad: '#ff7a8a',
    gold: '#ff9f43', white: '#ffffff', ink: '#4a3222',
  };

  var GAME_TITLE = 'SUN BONSAI';
  var TRUNK_X = W * 0.5, TRUNK_Y = H * 0.62;
  var TIME_LIMIT = 13;
  var NEED_REVERSALS = 4;

  var BRANCHES = [
    { x: W * 0.30, y: H * 0.52, ang: -0.7 },
    { x: W * 0.70, y: H * 0.48, ang: 0.6 },
    { x: W * 0.34, y: H * 0.38, ang: -0.4 },
    { x: W * 0.66, y: H * 0.34, ang: 0.35 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var active, cutDone, revCount, lastX, growH, timeLeft;
  var done, endWait, finished, ready, hitStop, shake, rubbing;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var LEAF_SPRITE = ['.##.', '####', '.##.'];

  function bg(elapsed) {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(elapsed * 1.2));
    var sunA = 0.5 + 0.5 * Math.max(0, timeLeft !== undefined ? (1 - timeLeft / TIME_LIMIT) * 0.4 + 0.5 : 0.6);
    game.draw.circle(W * 0.5, H * 0.14, 120, C.sun, 0.5);
    game.draw.circle(W * 0.5, H * 0.14, 80, C.sunCore, 0.6);
  }

  function drawBranch(b, i, elapsed) {
    if (cutDone[i]) return;
    var isActive = i === active;
    var sway = isActive ? Math.sin(elapsed * 6) * 5 : Math.sin(elapsed * 1.4 + i) * 2;
    var ex = b.x + Math.cos(b.ang) * 130, ey = b.y + Math.sin(b.ang) * 130 + sway;
    game.draw.line(TRUNK_X, TRUNK_Y, ex, ey, isActive ? C.branch : C.branch, isActive ? 16 : 12);
    game.draw.sprite(LEAF_SPRITE, { '#': isActive ? C.leafHi : C.leaf }, ex, ey, 16, { anchor: 'center' });
    if (isActive) {
      var blink = Math.floor(elapsed * 6) % 2 === 0;
      if (blink) game.draw.circle(ex, ey, 46, C.gold, 0.35);
      game.draw.rect(ex - 60, ey - 90, 120, 14, C.ink, 0.25);
      game.draw.rect(ex - 60, ey - 90, 120 * (revCount / NEED_REVERSALS), 14, C.good);
    }
  }

  function initGame() {
    active = 0; cutDone = [false, false, false, false]; revCount = 0; lastX = null;
    growH = 0; timeLeft = TIME_LIMIT; rubbing = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function branchZone(b) {
    var ex = b.x + Math.cos(b.ang) * 130, ey = b.y + Math.sin(b.ang) * 130;
    return { x: ex, y: ey };
  }

  var rubDir = 0;
  function onRub(x, y) {
    if (finished || active >= 4) return;
    var b = BRANCHES[active];
    var z = branchZone(b);
    if (Math.hypot(x - z.x, y - z.y) > 130) { lastX = null; rubDir = 0; return; }
    if (lastX === null) { lastX = x; return; }
    var delta = x - lastX;
    lastX = x;
    if (Math.abs(delta) < 3) return;
    var dirNow = delta > 0 ? 1 : -1;
    if (rubDir === 0) { rubDir = dirNow; return; }
    if (dirNow !== rubDir) {
      rubDir = dirNow;
      revCount++;
      game.audio.play('se_tap', 0.15);
      if (revCount >= NEED_REVERSALS) {
        cutDone[active] = true;
        game.feedback.good(z.x, z.y, { text: '', count: 10, sound: 'se_break', volume: 0.4 });
        game.fx.burst(z.x, z.y, { color: C.leaf, count: 12, speed: 260 });
        active++;
        revCount = 0; lastX = null; rubDir = 0;
        if (active >= 4) {
          ok = true; finished = true;
          game.feedback.good(TRUNK_X, TRUNK_Y - 100, { text: 'CLEAR' });
          finish();
        } else if (active === 2) {
          game.fx.popup('2 / ' + 4, TRUNK_X, TRUNK_Y - 200, { color: C.gold, size: 30 });
          game.audio.play('se_milestone', 0.3);
        }
      }
    }
  }

  game.onPress(function(x, y) { if (state === S.PLAYING) { rubbing = true; lastX = null; rubDir = 0; onRub(x, y); game.audio.play('se_tap', 0.06); } });
  game.onMove(function(x, y) { if (state === S.PLAYING && rubbing) onRub(x, y); });
  game.onRelease(function(x, y) { if (state === S.PLAYING) { rubbing = false; lastX = null; rubDir = 0; game.audio.play('se_tap', 0.03); } });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepPlay(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      ok = false; finished = true; hitStop = 0.3; shake = 0.2;
      game.feedback.bad(TRUNK_X, TRUNK_Y, { text: 'TIME UP' });
      finish();
    }
  }

  var demo = { t: 0, gx: TRUNK_X, gy: TRUNK_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.5;
    if (cyc < dt || demo.t <= dt) { active = 0; cutDone = [false, false, false, false]; revCount = 0; }
    if (active >= 4) return;
    var b = BRANCHES[active];
    var z = branchZone(b);
    var swingT = cyc % 0.35;
    var dir = Math.floor(cyc / 0.35) % 2 === 0 ? 1 : -1;
    demo.gx = z.x + dir * (swingT / 0.35) * 70 - dir * 35;
    demo.gy = z.y;
    demo.press = true;
    if (swingT < dt) {
      revCount++;
      if (revCount >= NEED_REVERSALS) {
        cutDone[active] = true; active++; revCount = 0;
      }
    }
  }

  game.onUpdate(function(dt) {
    var el = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (active === undefined) initGame();
      stepDemo(dt);
      bg(el);
      var by = TRUNK_Y - active * 20;
      game.draw.rect(TRUNK_X - 22, by, 44, H * 0.62 - (by - H * 0.14), C.pot, 1);
      game.draw.rect(TRUNK_X - 22, by, 12, H * 0.62 - (by - H * 0.14), C.potHi, 0.5);
      for (var i = 0; i < 4; i++) drawBranch(BRANCHES[i], i, el);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.24, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) : '-'), W / 2, H * 0.27, 20, C.gold);
      if (Math.floor(el * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg(el);
      var by2 = TRUNK_Y - (cutDone.filter(function(c) { return c; }).length) * 20;
      game.draw.rect(TRUNK_X - 22, by2, 44, H * 0.62 - (by2 - H * 0.14), C.pot, 1);
      for (var r = 0; r < 4; r++) drawBranch(BRANCHES[r], r, el);
      var cnt = cutDone.filter(function(c) { return c; }).length;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 46, ok ? C.good : C.bad);
      txt(cnt + ' / ' + 4, W / 2, H * 0.28, 28, C.gold);
      if (!ok) txt('あと' + (4 - cnt) + '本!', W / 2, H * 0.32, 24, C.ink);
      if (Math.floor(el * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var cnt2 = cutDone.filter(function(c) { return c; }).length;
        if (ok) game.end.success(cnt2, { branches: cnt2 }); else game.end.failure({ branches: cnt2 });
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

    bg(el);
    var by3 = TRUNK_Y - active * 20;
    game.draw.rect(TRUNK_X - 22, by3, 44, H * 0.62 - (by3 - H * 0.14), C.pot, 1);
    game.draw.rect(TRUNK_X - 22, by3, 12, H * 0.62 - (by3 - H * 0.14), C.potHi, 0.5);
    for (var j = 0; j < 4; j++) drawBranch(BRANCHES[j], j, el);

    txt(cutDone.filter(function(c) { return c; }).length + ' / ' + 4, W / 2, H * 0.06, 28, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * (timeLeft / TIME_LIMIT), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.4], ['B4', 0.4], ['D5', 0.4], ['G5', 0.6]], { tempo: 108, wave: 'triangle', volume: 0.055, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
