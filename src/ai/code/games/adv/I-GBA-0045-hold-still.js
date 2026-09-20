// I-GBA-0045-hold-still.js
// ホールドスティル — 夜の枝で光る虫が、誘い光に釣られず息を潜める
// 操作: 誘い光が点滅しても指では触れず、時間いっぱいじっと待つ(触れたら失敗)
// 終わり: 最後まで無入力で耐えれば成功。途中で一度でもタップすれば失敗
// @mechanic: freeze
// @theme: nightbranch_stillness
// 世界観: 夜の枝に隠れた光る小虫。近くで誘うように光る偽の光に釣られて動くと、上空の捕食者の目に見つかる。触れず待つのが正解
// 残るもの: 正誤(CLEAR/GAME OVER) + 何秒じっとしていられたか
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 暗い環境光+平面の帯を積んだ簡易ポリゴン感、稜線だけ明るい差し色
  var C = {
    bg1: '#0a1220', bg2: '#141c30', branch: '#241a14', branchEdge: '#3a2a1e',
    bug: '#8dffb0', bugCore: '#ffffff', lure: '#ffd34d', lureCore: '#fff2b0',
    eye: '#ff4d5e', good: '#4dff9a', bad: '#ff4d5e', gold: '#ffd400', white: '#eaf4ff', ink: '#05080c',
  };

  var GAME_TITLE = 'HOLD STILL';
  var DURATION = 11; // seconds, family A (freeze, NEEDED=1可)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var t, failed, done, endWait, hitStop, shake, milestoneShown, lures, eyeOpen, eyeT, survivedAt;
  var ready;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUG_FRAMES = [
    ['.##.', '####', '.##.'],
    ['.##.', '#..#', '.##.'],
  ];

  function makeLures() {
    var arr = [];
    var n = 4;
    for (var i = 0; i < n; i++) {
      arr.push({
        x: W * (0.22 + 0.56 * (i / (n - 1))),
        y: H * (0.34 + 0.10 * ((i % 2))),
        at: 1.4 + i * 2.1 + Math.random() * 0.4,
        pulsed: false,
      });
    }
    return arr;
  }

  function bgScene() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) {
      game.draw.circle(W * (0.1 + i * 0.22), H * (0.18 + (i % 3) * 0.03), 3, '#ffffff33');
    }
    // 枝(低ポリ帯)
    game.draw.rect(0, H * 0.62, W, 18, C.branchEdge);
    game.draw.rect(0, H * 0.62 + 6, W, 10, C.branch);
    game.draw.rect(W * 0.1, H * 0.60, W * 0.8, 6, '#ffffff10');
  }

  function drawEye(open) {
    // 上空の捕食者の目(危険telegraph)
    var ey = H * 0.16;
    game.draw.circle(W * 0.5, ey, 46, '#000000aa');
    if (open) {
      game.draw.circle(W * 0.5, ey, 30, '#ffffff');
      game.draw.circle(W * 0.5, ey, 13, C.eye);
    } else {
      game.draw.rect(W * 0.5 - 30, ey - 4, 60, 8, '#ffffff88');
    }
  }

  function drawLures(list) {
    for (var i = 0; i < list.length; i++) {
      var l = list[i];
      var dt2 = l.at - t;
      if (dt2 < -0.9 || dt2 > 1.6) continue; // まだ/もう見えない
      var glow = Math.max(0, 1 - Math.abs(dt2) / 1.1);
      game.draw.circle(l.x, l.y, 22 + glow * 16, C.lure, 0.25 + glow * 0.35);
      game.draw.circle(l.x, l.y, 10 + glow * 6, C.lureCore, 0.6 + glow * 0.4);
    }
  }

  function drawBug(x, y, frame) {
    game.draw.circle(x, y, 30, C.bug, 0.18);
    game.draw.sprite(BUG_FRAMES[frame], { '#': C.bug }, x, y, 12, { anchor: 'center' });
    game.draw.circle(x - 4, y - 2, 3, C.bugCore);
  }

  function initGame() {
    t = 0; failed = false; done = false; endWait = 0; hitStop = 0; shake = 0;
    milestoneShown = false; lures = makeLures(); eyeOpen = false; eyeT = 0;
    survivedAt = 0; ready = 0.8;
  }

  function fail(px, py) {
    if (failed || done) return;
    failed = true; ok = false; hitStop = 0.35; survivedAt = t;
    game.fx.flash(C.eye, 0.25);
    game.feedback.bad(px, py, { text: 'MISS', shake: 0.2 });
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function succeed() {
    if (done) return;
    ok = true; hitStop = 0.25; survivedAt = DURATION;
    game.feedback.good(W / 2, H * 0.42, { text: 'CLEAR', color: C.good });
    game.fx.burst(W / 2, H * 0.42, { color: C.gold, count: 20, speed: 380 });
    game.audio.play('se_success', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !failed && !done) {
      fail(x, y);
    }
  });

  // ── ATTRACT ゴースト実演: 誘い光に手を伸ばしかけて、寸止めで我慢する成功例 ──
  var demo = {
    t: 0, gx: W * 0.5, gy: H * 0.86, press: false,
    phase: 'idle', phaseT: 0, cyc: 0, showFail: false,
  };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.6;
    if (cyc < dt || demo.t <= dt) {
      t = 0; lures = makeLures(); failed = false; eyeOpen = false;
      demo.showFail = demo.t > 6.6; // 2周目以降にたまに失敗例を混ぜる
    }
    t = cyc;
    eyeOpen = (Math.floor(t * 1.3) % 3 === 0);
    var nearLure = null;
    for (var i = 0; i < lures.length; i++) {
      if (Math.abs(lures[i].at - t) < 0.5) { nearLure = lures[i]; break; }
    }
    if (nearLure) {
      var wantFail = demo.showFail && nearLure.at > 5.2;
      var reach = Math.min(1, (0.5 - Math.abs(nearLure.at - t)) / 0.5);
      demo.gx = W * 0.5 + (nearLure.x - W * 0.5) * reach * (wantFail ? 1 : 0.55);
      demo.gy = H * 0.86 + (nearLure.y - H * 0.86) * reach * (wantFail ? 1 : 0.55);
      demo.press = wantFail && reach > 0.9 && !nearLure.pulsed;
      if (demo.press && !nearLure.pulsed) { nearLure.pulsed = true; }
    } else {
      demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.86 - demo.gy) * Math.min(1, dt * 3);
      demo.press = false;
    }
    if (t >= DURATION - 0.05 && !demo.showFail) { /* 成功で静止のまま */ }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lures === undefined) initGame();
      bgScene();
      stepDemo(dt);
      drawEye(eyeOpen);
      drawLures(lures);
      drawBug(W * 0.5, H * 0.5, Math.floor(t * 4) % 2);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.11, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bgScene();
      drawEye(false);
      drawBug(W / 2, H * 0.5, 0);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      if (ok) {
        txt('HELD ' + DURATION + 's', W / 2, H * 0.13, 30, C.gold);
      } else {
        var pct = Math.round((survivedAt / DURATION) * 100);
        txt(pct >= 80 ? 'あと少し!' : Math.round(survivedAt * 10) / 10 + 's / ' + DURATION + 's', W / 2, H * 0.13, 28, C.gold);
      }
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { held: Math.round(survivedAt * 10) / 10 };
        if (ok) game.end.success(Math.round(survivedAt * 10), stats);
        else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!failed) {
      t += dt;
      eyeT += dt;
      eyeOpen = (Math.floor(t * 1.3) % 3 === 0);
      for (var i = 0; i < lures.length; i++) {
        var l = lures[i];
        if (!l.pulsed && Math.abs(l.at - t) < 0.05) { l.pulsed = true; game.audio.tone(880, 0.08, { wave: 'sine', volume: 0.15 }); }
      }
      if (!milestoneShown && t >= DURATION * 0.5) {
        milestoneShown = true;
        game.fx.popup('あと半分!', W / 2, H * 0.42, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (t >= DURATION) succeed();
    }
    if (shake > 0) shake -= dt;

    bgScene();
    drawEye(eyeOpen);
    if (!failed) drawLures(lures);
    drawBug(W / 2, H * 0.5, failed ? 1 : (Math.floor(t * 4) % 2));

    var barW = W - 160;
    game.draw.rect(80, 40, barW, 16, C.ink, 0.5);
    game.draw.rect(80, 40, barW * Math.min(1, t / DURATION), 16, C.gold);
    txt(Math.min(DURATION, Math.round(t * 10) / 10) + ' / ' + DURATION + 's', W / 2, 96, 26, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.78, 56, C.gold);
    else txt('じっと', W / 2, H * 0.78 - 0, 0, C.white); // no-op placeholder never drawn (size 0)
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
