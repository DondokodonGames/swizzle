// I-DS-0004-crate-two-hand-carry.js
// クレート二点持ち運び — 木箱の左右の取っ手を2本指で同時につまみ、指定の荷台まで運ぶ
// 操作: 木箱の左右にある取っ手を同時に2本指で押さえて持ち上げ、そのまま2本指を一緒に動かして荷台の枠まで運ぶ
// 終わり: 制限時間内に規定個数(3個)を荷台へ運べば成功。時間切れなら失敗
// @mechanic: pinch_zone
// @theme: dockside_crate_relay
// 世界観: 波止場の倉庫。積み降ろし係が木箱の両端を両手でつまみ上げ、次々と荷台の枠まで運び込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 運び終えた個数
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、影/グラデ無し、丸角、判定は色変化で示す
  var C = {
    bg: '#eef2f7', floor: '#dbe3ee', dock: '#c6d0e0',
    crate: '#d99a4a', crateDark: '#a86a20', handle: '#7a5230',
    zone: '#8fa8ff', zoneFill: '#c6d4ff', zoneGood: '#4dd97a',
    good: '#22c46a', bad: '#ff4d5e', gold: '#ffb400', white: '#ffffff', ink: '#1a2436', text: '#33425c',
  };

  var GAME_TITLE = 'CRATE CARRY';
  var DUR = 13;
  var TOTAL = 3;
  var ZONE_X = W * 0.5, ZONE_Y = H * 0.66, ZONE_R = 130;
  var STARTS = [
    { x: W * 0.28, y: H * 0.32 },
    { x: W * 0.72, y: H * 0.32 },
    { x: W * 0.5, y: H * 0.24 },
  ];
  var HANDLE_OFFSET = 92, GRAB_R = 78, HOLD_NEEDED = 0.22;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var idx, carried, crateX, crateY, homeX, homeY, leftId, rightId, holdT, timeLeft, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var WORKER = ['.##.', '####', '.##.', '#.#.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.floor]]);
    game.draw.rect(0, H * 0.56, W, H * 0.34, C.dock);
    game.draw.sprite(WORKER, { '#': C.text }, W * 0.5, H * 0.90, 15, { anchor: 'center' });
  }

  function drawZone(active) {
    game.draw.circle(ZONE_X, ZONE_Y, ZONE_R, active ? C.zoneGood : C.zoneFill, 0.55);
    game.draw.circle(ZONE_X, ZONE_Y, ZONE_R, C.zone, 1);
    game.draw.circle(ZONE_X, ZONE_Y, ZONE_R - 26, C.zone, 0.5);
  }

  function drawCrate(x, y, grabbed) {
    game.draw.rect(x - HANDLE_OFFSET - 18, y - 30, 36, 60, C.handle);
    game.draw.rect(x + HANDLE_OFFSET - 18, y - 30, 36, 60, C.handle);
    game.draw.rect(x - 90, y - 70, 180, 140, C.crateDark);
    game.draw.rect(x - 78, y - 58, 156, 116, C.crate);
    game.draw.line(x - 78, y - 58, x + 78, y + 58, C.crateDark, 6);
    game.draw.line(x + 78, y - 58, x - 78, y + 58, C.crateDark, 6);
    if (grabbed) game.draw.circle(x, y - 90, 14, C.good);
  }

  function newCrate() {
    var s = STARTS[idx % STARTS.length];
    crateX = s.x; crateY = s.y; homeX = s.x; homeY = s.y;
    leftId = null; rightId = null; holdT = 0;
  }

  function initGame() {
    idx = 0; carried = 0; timeLeft = DUR; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newCrate();
  }

  function nearHandle(x, y, side) {
    var hx = crateX + (side < 0 ? -HANDLE_OFFSET : HANDLE_OFFSET), hy = crateY;
    return Math.hypot(x - hx, y - hy) < GRAB_R;
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (leftId === null && nearHandle(x, y, -1)) { leftId = id; game.audio.play('se_tap', 0.1); }
    else if (rightId === null && nearHandle(x, y, 1)) { rightId = id; game.audio.play('se_tap', 0.1); }
    if (leftId !== null && rightId !== null) game.feedback.good(crateX, crateY, { text: null, count: 5, sound: null });
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING || finished) return;
    if (leftId === null || rightId === null) return;
    if (id !== leftId && id !== rightId) return;
    // 両手が揃っている間だけ、指の中点にクレートが追従する
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (id === leftId) leftId = null;
    if (id === rightId) rightId = null;
    if (leftId === null || rightId === null) holdT = 0;
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

  function touchPos(id) {
    for (var i = 0; i < game.touches.length; i++) if (game.touches[i].id === id) return game.touches[i];
    return null;
  }

  function stepCarry(dt) {
    if (leftId !== null && rightId !== null) {
      var lp = touchPos(leftId), rp = touchPos(rightId);
      if (lp && rp) {
        var mx = (lp.x + rp.x) / 2, my = (lp.y + rp.y) / 2;
        crateX += (mx - crateX) * Math.min(1, dt * 12);
        crateY += (my - crateY) * Math.min(1, dt * 12);
      }
      var d = Math.hypot(crateX - ZONE_X, crateY - ZONE_Y);
      if (d < ZONE_R - 40) {
        holdT += dt;
        if (holdT >= HOLD_NEEDED) {
          carried++;
          hitStop = 0.08;
          game.feedback.good(ZONE_X, ZONE_Y, { text: carried + '/' + TOTAL, color: C.good });
          game.fx.burst(ZONE_X, ZONE_Y, { color: C.gold, count: 14, speed: 320 });
          game.audio.play('se_good', 0.35);
          if (!milestoneShown && carried >= Math.ceil(TOTAL / 2)) {
            milestoneShown = true;
            game.fx.popup('HALFWAY!', W / 2, H * 0.2, { color: C.gold, size: 36 });
            game.audio.play('se_milestone', 0.4);
          }
          if (carried >= TOTAL) { ok = true; finished = true; finish(); return; }
          idx++;
          newCrate();
        }
      } else {
        holdT = 0;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (idx === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZone(Math.hypot(crateX - ZONE_X, crateY - ZONE_Y) < ZONE_R - 40);
      drawCrate(crateX, crateY, demo.press);
      game.draw.hand(demo.gx - 60, demo.gy, { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx + 60, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.text);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZone(false);
      drawCrate(crateX, crateY, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(carried + ' / ' + TOTAL, W / 2, H * 0.12, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - carried) + '個!', W / 2, H * 0.16, 24, C.text);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.text);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(carried, { carried: carried, total: TOTAL }); else game.end.failure({ carried: carried, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      stepCarry(dt);
      if (timeLeft <= 0 && !finished) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(ZONE_X, ZONE_Y, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZone(leftId !== null && rightId !== null && Math.hypot(crateX - ZONE_X, crateY - ZONE_Y) < ZONE_R - 40);
    drawCrate(crateX, crateY, leftId !== null && rightId !== null);

    txt(carried + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.15);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / DUR), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  var demo = { t: 0, gx: STARTS[0].x, gy: STARTS[0].y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { idx = 0; carried = 0; milestoneShown = false; newCrate(); }
    var p = Math.min(1, cyc / 2.6);
    demo.press = cyc < 2.6;
    crateX = homeX + (ZONE_X - homeX) * p;
    crateY = homeY + (ZONE_Y - homeY) * p;
    demo.gx = crateX; demo.gy = crateY;
    if (p >= 1 && !milestoneShown) { milestoneShown = true; }
  }

  game.onStart(function() {
    game.audio.melody([['G3', 0.25], ['B3', 0.25], ['D4', 0.25], ['G4', 0.5]], { tempo: 116, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
