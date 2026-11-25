// I-GBA-0067-tumbler-uprighting.js
// 起き上がり縁起玉 — 横倒しの縁起玉を、倒れた側をタップして揺り起こし、まっすぐ立たせる
// 操作: 縁起玉が傾いている側の親指ゾーンをタップして押し上げる。突風が来る前にタップして構える
// 終わり: 中心バランスを規定時間キープすれば成功。反対側に倒れきれば失敗。時間切れも失敗
// @mechanic: balance
// @theme: lucky_tumbler_stall
// 世界観: 縁日の屋台の隅で横倒しになった張り子の縁起玉。参道の客が指先で揺すり起こし、まっすぐ立たせて福を呼ぼうとする
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 直立キープの到達度%
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // SKEUOMORPH: 木肌と漆塗りの質感。暖色グラデ+艶ハイライト+柔らかい落ち影
  var C = {
    bg1: '#3a2216', bg2: '#1c120a', stallWood: '#5a3a24', stallDark: '#2c1c10',
    body: '#c8342f', bodyDark: '#7a1a18', bodyLight: '#ff6a52', gloss: '#ffe9c8',
    face: '#1a120a', gold: '#f2c14e', good: '#5dffb0', bad: '#ff4d5e',
    white: '#fff6e6', ink: '#140b06', shadow: '#000000',
  };

  var GAME_TITLE = 'LUCKY TUMBLER';
  var CX = W * 0.5, CY = H * 0.46;
  var PUSH = 10, CENTER_BAND = 16, FAIL_ANGLE = 92, SETTLE_GOAL = 2.4, MAX_TIME = 24;
  var TELEGRAPH_LEAD = 0.65;
  var LZONE_X = W * 0.27, RZONE_X = W * 0.73, ZONE_Y = H * 0.82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, failReason = 'GAME OVER';

  var angle, centeredTimer, gust, totalTime, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, pushFlash;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var F_FLAT_L = ['...##.....', '..####....', '.######...', '########..', '########..', '.#######.#', '..######..'];
  var F_LEAN_L = ['....##....', '...####...', '..######..', '.########.', '.########.', '..#######.', '...#####..'];
  var F_UP     = ['....##....', '...####...', '..######..', '.########.', '.########.', '.########.', '..######..'];
  var F_LEAN_R = ['....##....', '.....####.', '..######..', '.########.', '.########.', '.#######..', '..#####...'];
  var F_FLAT_R = ['.....##...', '....####..', '...######.', '..########', '..########', '#.#######.', '..######..'];

  function pickFrame(a) {
    if (a <= -55) return F_FLAT_L;
    if (a <= -18) return F_LEAN_L;
    if (a < 18) return F_UP;
    if (a < 55) return F_LEAN_R;
    return F_FLAT_R;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.62, W, H * 0.30, C.stallWood);
    for (var i = 0; i < 6; i++) game.draw.rect(0, H * 0.62 + i * (H * 0.30 / 6), W, 3, C.stallDark, 0.6);
    game.draw.rect(0, H * 0.60, W, 10, C.gold, 0.8);
  }

  function drawTumbler(a, flash) {
    var lean = Math.max(-1, Math.min(1, a / 90)) * 60;
    game.draw.circle(CX + lean * 0.6, CY + 150, 70, C.shadow, 0.28);
    var frame = pickFrame(a);
    game.draw.sprite(frame, { '#': flash ? C.white : C.body }, CX + lean, CY, 24, { anchor: 'center' });
    game.draw.circle(CX + lean - 20, CY - 30, 10, C.gloss, 0.5);
    game.draw.circle(CX + lean - 26, CY - 16, 7, C.face);
    game.draw.circle(CX + lean + 14, CY - 16, 7, C.face);
    game.draw.line(CX + lean - 20, CY + 8, CX + lean + 20, CY + 8, C.face, 5);
    game.draw.circle(CX + lean, CY + 60, 14, C.gold);
  }

  function drawZones() {
    game.draw.circle(LZONE_X, ZONE_Y, 74, C.stallDark, 0.7);
    game.draw.circle(RZONE_X, ZONE_Y, 74, C.stallDark, 0.7);
    game.draw.circle(LZONE_X, ZONE_Y, 74 + (pushFlash && pushFlash.dir > 0 ? 10 : 0), C.gold, 0.9);
    game.draw.circle(RZONE_X, ZONE_Y, 74 + (pushFlash && pushFlash.dir < 0 ? 10 : 0), C.gold, 0.9);
    game.draw.line(LZONE_X - 26, ZONE_Y, LZONE_X + 26, ZONE_Y, C.ink, 8);
    game.draw.line(LZONE_X, ZONE_Y - 26, LZONE_X, ZONE_Y + 26, C.ink, 8);
    game.draw.line(RZONE_X - 26, ZONE_Y, RZONE_X + 26, ZONE_Y, C.ink, 8);
    game.draw.line(RZONE_X, ZONE_Y - 26, RZONE_X, ZONE_Y + 26, C.ink, 8);
  }

  function newGust(t) {
    var interval = 1.4 + Math.random() * 0.8;
    return { timeLeft: interval, dir: 0, telegraphed: false, mag: 16 + Math.min(22, t * 0.9) };
  }

  function initCore() {
    angle = -78; centeredTimer = 0; totalTime = 0; milestoneShown = false; pushFlash = null;
    gust = newGust(0);
  }

  function initGame() {
    initCore();
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; ok = false; failReason = 'GAME OVER';
  }

  // 共有物理: PLAYING/ATTRACT どちらからも呼ぶ。戻り値: 'succeed' | 'fail' | null
  function updateCore(dt) {
    totalTime += dt;
    angle -= angle * 0.16 * dt;
    gust.timeLeft -= dt;
    if (!gust.telegraphed && gust.timeLeft <= TELEGRAPH_LEAD) {
      gust.telegraphed = true;
      gust.dir = Math.random() < 0.5 ? -1 : 1;
      game.audio.play('se_tap', 0.12);
    }
    if (gust.telegraphed && gust.timeLeft <= 0) {
      angle += gust.dir * gust.mag;
      gust = newGust(totalTime);
    }
    angle = Math.max(-96, Math.min(96, angle));

    if (Math.abs(angle) < CENTER_BAND) centeredTimer += dt;
    else centeredTimer = Math.max(0, centeredTimer - dt * 0.6);

    if (!milestoneShown && centeredTimer >= SETTLE_GOAL * 0.5) {
      milestoneShown = true;
      game.fx.popup('50%', CX, CY - 200, { color: C.gold, size: 40 });
      game.audio.play('se_milestone', 0.4);
    }
    if (pushFlash) { pushFlash.t -= dt; if (pushFlash.t <= 0) pushFlash = null; }

    if (Math.abs(angle) >= FAIL_ANGLE) return 'fail';
    if (centeredTimer >= SETTLE_GOAL) return 'succeed';
    if (totalTime >= MAX_TIME) return 'timeup';
    return null;
  }

  function applyPush(dir) {
    angle += dir * PUSH;
    pushFlash = { dir: dir, t: 0.15 };
  }

  function resolveTap(dir, x, y) {
    applyPush(dir);
    game.audio.play('se_tap', 0.18);
    game.fx.burst(x, y, { color: C.gold, count: 6, speed: 160 });
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    var dir = x < W / 2 ? 1 : -1;
    var zx = x < W / 2 ? LZONE_X : RZONE_X;
    applyPush(dir);
    game.audio.play('se_tap', 0.18);
    game.fx.burst(zx, ZONE_Y, { color: C.gold, count: 6, speed: 160 });
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

  var demo = { t: 0, gx: LZONE_X, gy: ZONE_Y, press: false, decisionT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt) initCore();
    demo.decisionT -= dt;
    demo.press = false;
    if (demo.decisionT <= 0) {
      demo.decisionT = 0.34;
      if (angle < -CENTER_BAND * 0.7) { demo.gx = LZONE_X; demo.press = true; resolveTap(1, LZONE_X, ZONE_Y); }
      else if (angle > CENTER_BAND * 0.7) { demo.gx = RZONE_X; demo.press = true; resolveTap(-1, RZONE_X, ZONE_Y); }
    }
    var r = updateCore(dt);
    if (r === 'succeed') {
      game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 340 });
      demo.t = -1.0; // 1秒静止してからリセット
    } else if (r === 'fail' || r === 'timeup') {
      initCore();
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initCore();
      bg();
      if (demo.t >= 0) stepDemo(dt); else demo.t += dt;
      drawZones();
      drawTumbler(angle, false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      game.draw.rect(60, 120, W - 120, 22, C.ink, 0.55);
      game.draw.rect(60, 120, (W - 120) * Math.min(1, centeredTimer / SETTLE_GOAL), 22, C.good);
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
      drawZones();
      drawTumbler(angle, false);
      txt(ok ? 'CLEAR' : failReason, W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      var pct = Math.min(99, Math.round((centeredTimer / SETTLE_GOAL) * 100));
      txt((ok ? 100 : pct) + ' / ' + 100, W / 2, H * 0.13, 30, C.gold);
      if (!ok && pct >= 70) txt('あと少し!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.min(100, Math.round((centeredTimer / SETTLE_GOAL) * 100));
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      var r = updateCore(dt);
      if (r === 'succeed') {
        ok = true; finished = true; hitStop = 0.1;
        game.feedback.good(CX, CY, { text: 'CLEAR', color: C.good });
        game.fx.burst(CX, CY, { color: C.gold, count: 18, speed: 380 });
        finish();
      } else if (r === 'fail') {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3; failReason = 'GAME OVER';
        game.feedback.bad(CX, CY, { text: 'HIT' });
        finish();
      } else if (r === 'timeup') {
        ok = false; finished = true; hitStop = 0.3; shake = 0.15; failReason = 'TIME UP';
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones();
    drawTumbler(angle, hitStop > 0 && !ok);
    game.draw.rect(60, 120, W - 120, 22, C.ink, 0.55);
    game.draw.rect(60, 120, (W - 120) * Math.min(1, centeredTimer / SETTLE_GOAL), 22, C.good);
    if (gust.telegraphed && gust.timeLeft > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      var wx = gust.dir > 0 ? RZONE_X : LZONE_X;
      game.draw.circle(wx, ZONE_Y - 110, 22, C.bad, 0.85);
    }
    txt(Math.min(100, Math.round((centeredTimer / SETTLE_GOAL) * 100)) + ' / ' + 100, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.3], ['F4', 0.3], ['A4', 0.3], ['D5', 0.6]], { tempo: 110, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
