// D-20092012-0060-rampart-flare-watch.js
// ランパートフレアウォッチ — 夜の砦の物見台から、旗塔へ迫る襲撃者をフレア砲で狙い撃つ
// 操作: 左右の稜線から旗塔へ向かって進む襲撃者をタップして撃つ
// 終わり: 規定数(8体)を撃退すれば成功。旗塔耐久が0になれば失敗
// @mechanic: aim_shoot
// @theme: rampart_banner_defense
// 世界観: 国境の砦の物見台に立つ番兵。夜襲をかけてくる襲撃者たちが両側の稜線から旗塔へ迫る。落とせなければ旗が奪われる
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃退数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺〜黒グラデ + シアン/マゼンタ/イエロー/白の疑似グロー
  var C = {
    bg: '#050014', bg2: '#100030', rampart: '#2a1a50', rampartLit: '#5a3aa0',
    raider: '#ff2e88', raiderGlow: '#5a0a30', flare: '#3fe0ff', flareGlow: '#0a3a48',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#03000a',
  };

  var GAME_TITLE = 'RAMPART WATCH';
  var TOTAL = 8;
  var BANNER_HP_MAX = 3;
  var BX = W * 0.5, BY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var repelled, bannerHp, raiders, spawnT, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, bannerFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BANNER = ['.#.', '###', '.#.', '.#.', '.#.'];
  var RAIDER = ['.##.', '####', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
    for (var i = 0; i < 5; i++) {
      game.draw.line(W * (0.1 + i * 0.2), H * 0.1, BX, BY, C.rampart, 5);
      game.draw.line(W * (0.9 - i * 0.2), H * 0.1, BX, BY, C.rampart, 5);
    }
    game.draw.circle(BX, BY, 260, C.rampartLit, 0.1);
  }

  function drawBanner(hp, bob, flashT) {
    var y = BY + Math.sin(game.time.elapsed * 1.6) * 5 + bob;
    var col = flashT > 0 ? C.white : (hp > 1 ? C.gold : C.bad);
    game.draw.sprite(BANNER, { '#': col }, BX, y, 20, { anchor: 'center' });
    for (var i = 0; i < BANNER_HP_MAX; i++) {
      game.draw.circle(BX - 40 + i * 40, BY - 140, 12, i < hp ? C.gold : C.ink, i < hp ? 1 : 0.4);
    }
  }

  // 襲撃者: startX/startY(稜線)→ 旗塔へ直進。telegraph=出現直後の点滅予告
  function newRaider() {
    var side = Math.random() < 0.5 ? -1 : 1;
    var sx = side < 0 ? W * (0.06 + Math.random() * 0.14) : W * (0.8 + Math.random() * 0.14);
    var sy = H * (0.14 + Math.random() * 0.12);
    var dur = Math.max(1.1, 1.9 - repelled * 0.06);
    return { sx: sx, sy: sy, t: 0, dur: dur, dead: false, telegraphed: false };
  }

  function raiderPos(r) {
    var p = Math.min(1, r.t / r.dur);
    return { x: r.sx + (BX - r.sx) * p, y: r.sy + (BY - r.sy) * p, p: p };
  }

  function initGame() {
    repelled = 0; bannerHp = BANNER_HP_MAX; raiders = []; spawnT = 0.5;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false; bannerFlash = 0;
  }

  function shootAt(x, y) {
    if (ready > 0 || finished) return;
    var best = null, bestD = 90;
    for (var i = 0; i < raiders.length; i++) {
      var r = raiders[i]; if (r.dead) continue;
      var p = raiderPos(r);
      var d = Math.hypot(x - p.x, y - p.y);
      if (d < bestD) { bestD = d; best = r; }
    }
    if (best) {
      best.dead = true;
      repelled++;
      var p = raiderPos(best);
      game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.flare, count: 14, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && repelled >= Math.ceil(TOTAL / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', BX, BY - 200, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (repelled >= TOTAL) { ok = true; finished = true; hitStop = 0.2; finish(); }
    } else {
      game.feedback.bad(x, y, { text: '' });
      game.audio.play('se_tap', 0.1);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) shootAt(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawRaiders(list) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i]; if (r.dead) continue;
      var p = raiderPos(r);
      if (p.p > 0.3 && p.p < 0.5) {
        var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (blink) game.draw.circle(p.x, p.y, 60, C.bad, 0.18);
      }
      game.draw.circle(p.x, p.y, 34, C.raiderGlow, 0.6);
      game.draw.sprite(RAIDER, { '#': C.raider }, p.x, p.y, 12, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: BX, gy: H * 0.86, press: false, phase: 'wait', r: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { raiders = []; repelled = 0; demo.r = null; demo.phase = 'wait'; }
    if (!demo.r && cyc > 0.3) { demo.r = newRaider(); demo.r.dur = 1.4; raiders = [demo.r]; }
    if (demo.r && !demo.r.dead) {
      demo.r.t += dt;
      var p = raiderPos(demo.r);
      if (p.p > 0.55 && demo.phase === 'wait') {
        demo.phase = 'shoot'; demo.gx = p.x; demo.gy = p.y; demo.press = true;
        demo.r.dead = true; repelled++;
        game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    }
    if (demo.r && demo.r.dead && cyc > 2.4) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (bannerFlash > 0) bannerFlash -= dt;

    if (state === S.ATTRACT) {
      if (raiders === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBanner(bannerHp, 0, 0);
      drawRaiders(raiders);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.07, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBanner(Math.max(0, bannerHp), 0, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.07, 50, ok ? C.good : C.bad);
      txt(repelled + ' / ' + TOTAL, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - repelled) + '体!', W / 2, H * 0.165, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(repelled, { repelled: repelled, total: TOTAL });
        else game.end.failure({ repelled: repelled, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT -= dt;
      if (spawnT <= 0 && raiders.filter(function(r) { return !r.dead; }).length < 3) {
        raiders.push(newRaider());
        spawnT = Math.max(0.55, 1.05 - repelled * 0.03);
      }
      for (var i = 0; i < raiders.length; i++) {
        var r = raiders[i]; if (r.dead) continue;
        r.t += dt;
        if (r.t >= r.dur) {
          r.dead = true;
          bannerHp--; bannerFlash = 0.15;
          hitStop = 0.3; shake = 0.3;
          game.feedback.bad(BX, BY, { text: 'HIT' });
          game.audio.play('se_bad', 0.4);
          if (bannerHp <= 0) { ok = false; finished = true; finish(); }
        }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBanner(bannerHp, 0, bannerFlash);
    if (!finished) drawRaiders(raiders);

    txt(repelled + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['F3', 0.3], ['A3', 0.3], ['D4', 0.6]], { tempo: 132, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
