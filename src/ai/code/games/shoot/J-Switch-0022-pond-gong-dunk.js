// J-Switch-0022-pond-gong-dunk.js
// ため池の鐘落とし — 振り子で揺れる板鐘の芯が照準線を通る一瞬に小石を放つ。芯を射抜けば、止まり木のからくりガエルが池へドボン
// 操作: 揺れる板鐘の芯が真上の照準線に重なった瞬間にタップ(社内メモ。画面には出さない)
// 終わり: 4体落とせばCLEAR。外し/見送り(1体3.2秒)が3回/全体の時間切れでGAME OVER
// @mechanic: timing_one_shot
// @theme: pond_gong_dunk_fair
// 世界観: 田んぼのため池の夏祭り、見習いの石投げ番が、振り子で揺れる板鐘の芯を一投で射抜いて留め金を外し、池の上の止まり木に座るブリキのからくりガエルを次々と水へ落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 落とした数・PERFECT数・外し数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 黄緑寄りの4階調、画面枠、動く物に残像
  var STYLE = { bg: ['#9bbc0f', '#8bac0f'], main: ['#306230', '#0f380f'], accent: ['#c4d86a', '#e0f0a0'] };
  var C = { l0: '#e0f0a0', l1: '#9bbc0f', l2: '#8bac0f', l3: '#306230', l4: '#0f380f', frame: '#4a4f45', frameD: '#2c302a' };

  var GAME_TITLE = 'GONG DUNK';
  var TIME_LIMIT = 14;
  var NEEDED = 4;
  var MAX_MISS = 3;
  var WAIT_T = 3.2;
  var PIV_X = W * 0.5, PIV_Y = H * 0.17, ARM = 330;
  var SLING_Y = H * 0.8;
  var PERFECT_PX = 18, HIT_PX = 44;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, dunks, misses, perfects, sw, trail, frog, shot, hitStop, outro, ok, waitT, reload, halfShown;

  var FROG = [
    ['..gg..gg..', '.gwkggwkg.', '.gggggggg.', 'gggrrrrggg', '.gggggggg.', '..g....g..'],
    ['..gg..gg..', '.gwkggwkg.', '.gggggggg.', 'ggggggggg.', '.gggggggg.', '.g......g.']
  ];
  var KID = [
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', '.bbbbb.', 'b.bbb.b', '..b.b..', '.k...k.'],
    ['..hhh..', '.hhhhh.', '..fff..', '..fkf..', 'bbbbbbb', '..bbb.b', '..b.b..', '..k.k..']
  ];
  var GONG = ['..kkkk..', '.kmmmmk.', 'kmmxxmmk', 'kmxooxmk', 'kmxooxmk', 'kmmxxmmk', '.kmmmmk.', '..kkkk..'];
  var PEBBLE = ['.kk.', 'kkkk', '.kk.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: C.l4, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  // 1体ごとに振り子の速さと振れ幅が変わる(3体目以降は1往復ごとに振れ幅が揺らぐ)
  function newSwing() {
    var r = dunks;
    sw = { th: 0, ph: game.random(0.4, 1.2), w: 3.0 + r * 0.4, amp: 0.62 + game.random(0, 0.1), wobble: r >= 2 };
    waitT = WAIT_T; trail = [];
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; dunks = 0; misses = 0; perfects = 0;
    hitStop = 0; outro = 0; ok = false; reload = 0; shot = null; halfShown = false;
    frog = { y: 0, vy: 0, falling: false, hop: 0 };
    newSwing();
  }

  function gongPos() {
    var th = sw.amp * Math.sin(sw.ph) * (sw.wobble ? 0.8 + 0.25 * Math.sin(sw.ph * 0.5) : 1);
    return { x: PIV_X + Math.sin(th) * ARM, y: PIV_Y + Math.cos(th) * ARM };
  }

  function stepSwing(dt) {
    sw.ph += sw.w * dt;
    var g = gongPos();
    trail.push({ x: g.x, y: g.y });
    if (trail.length > 5) trail.shift();
    if (frog.falling) {
      frog.vy += 2600 * dt; frog.y += frog.vy * dt;
      if (frog.y > 330) { frog.falling = false; frog.y = 0; frog.vy = 0; frog.hop = 0.6; }
    }
    if (frog.hop > 0) frog.hop -= dt;
    if (shot) { shot.t -= dt; if (shot.t <= 0) shot = null; }
    if (reload > 0) reload -= dt;
  }

  // 一投(実プレイ・デモ共用)。offset=芯と照準線のずれ
  function throwStone(isDemo) {
    if (reload > 0 || frog.falling || frog.hop > 0) return null;
    var g = gongPos();
    var off = Math.abs(g.x - PIV_X);
    reload = 0.45;
    var hit = off <= HIT_PX, perfect = off <= PERFECT_PX;
    shot = { t: 0.18, x: g.x, y: g.y, hit: hit };
    if (hit) { frog.falling = true; frog.vy = -500; }
    if (isDemo) {
      game.fx.burst(g.x, g.y, { color: hit ? C.l0 : C.l3, count: hit ? 14 : 5, speed: 260 });
      return hit;
    }
    game.audio.play('se_jump', 0.3);
    if (hit) {
      dunks++; if (perfect) perfects++;
      game.feedback.good(g.x, g.y - 120, { text: perfect ? 'PERFECT' : 'GOOD', color: C.l0, count: perfect ? 22 : 12 });
      game.audio.tone(perfect ? 'C6' : 'G5', 0.25, { wave: 'square', volume: 0.06 });
      if (!halfShown && dunks >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(dunks + ' / ' + NEEDED, W / 2, H * 0.52, { color: C.l0, size: 72 });
      }
      if (dunks >= NEEDED) { finish(true); return true; }
      newSwing();
      return true;
    }
    miss(g.x, g.y);
    return false;
  }

  function miss(x, y) {
    misses++;
    if (misses >= MAX_MISS) { finish(false); return; }
    hitStop = 0.4;
    game.feedback.bad(x, y - 120, { text: 'MISS', color: C.l4, flashColor: C.l3 });
    waitT = WAIT_T;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.6;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.l0, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(W / 2, H * 0.45, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.l4, flashColor: C.l3 });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play' || hitStop > 0) return;
    game.audio.play('se_tap', 0.25);
    if (throwStone(false) === null) game.fx.burst(W / 2, SLING_Y, { color: C.l3, count: 4, speed: 80 });
  });

  // ── demo(芯が照準線に来た瞬間に2回当て、3回目は早撃ちで外す)──────────
  var demo = { t: 0, gx: W / 2, gy: SLING_Y + 60, press: 0, n: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { dunks = 0; demo.n = 0; frog = { y: 0, vy: 0, falling: false, hop: 0 }; newSwing(); }
    stepSwing(dt);
    if (demo.press > 0) demo.press -= dt;
    var g = gongPos();
    var early = demo.n % 3 === 2;
    var off = g.x - PIV_X;
    var want = early ? Math.abs(off) > 120 && Math.abs(off) < 150 : Math.abs(off) < 14;
    if (want && reload <= 0 && !frog.falling && frog.hop <= 0 && demo.t % 8 > 1.0) {
      var h = throwStone(true);
      demo.press = 0.25; demo.n++;
      if (h) dunks = (dunks + 1) % 3;
    }
    demo.gx = W / 2; demo.gy = SLING_Y + 70;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.l1], [0.55, C.l2], [1, C.l1]]);
    // 遠景の田と山(ベタ4階調)
    for (var m = 0; m < 5; m++) game.draw.circle(120 + m * 220, H * 0.47, 150 + (m % 2) * 60, C.l2);
    game.draw.rect(0, H * 0.47, W, H * 0.05, C.l2);
    for (var r = 0; r < 7; r++) game.draw.rect(0, H * 0.52 + r * 22, W, 4, C.l3, 0.35);
    // ため池
    game.draw.rect(0, H * 0.6, W, H * 0.14, C.l3);
    for (var wv = 0; wv < 8; wv++) {
      var wx = ((wv * 170 + t * 30) % (W + 100)) - 50;
      game.draw.rect(wx, H * 0.63 + (wv % 3) * 40, 70, 6, C.l2);
    }
    // やぐら(振り子の枠)
    game.draw.rect(PIV_X - 250, PIV_Y - 30, 500, 20, C.l4);
    game.draw.rect(PIV_X - 250, PIV_Y - 30, 20, 300, C.l4);
    game.draw.rect(PIV_X + 230, PIV_Y - 30, 20, 300, C.l4);
    // 照準線
    for (var d = 0; d < 16; d++) game.draw.rect(PIV_X - 3, PIV_Y + ARM - 70 + d * 44, 6, 22, C.l4, 0.35);
    game.draw.rect(PIV_X - 60, PIV_Y + ARM - 4, 120, 8, C.l0, 0.5 + 0.3 * Math.sin(t * 6));
    // 止まり木(池の上)とからくりガエル
    var perchX = W * 0.8, perchY = H * 0.55;
    game.draw.rect(perchX - 90, perchY, 180, 16, C.l4);
    game.draw.rect(perchX + 80, perchY, 14, H * 0.6 - perchY, C.l4);
    game.draw.line(PIV_X + 250, PIV_Y + 200, perchX - 80, perchY, C.l4, 4);
    var fy = perchY - 50 + (frog.falling ? frog.y : 0) - (frog.hop > 0 ? Math.sin(frog.hop / 0.6 * Math.PI) * 60 : 0);
    var fx = perchX + (frog.hop > 0 ? (frog.hop / 0.6) * 120 : 0);
    if (!(frog.falling && frog.y > 250)) game.draw.sprite(FROG[Math.floor(t * 3) % 2], { g: C.l3, w: C.l0, k: C.l4, r: C.l4 }, fx, fy + Math.sin(t * 4) * 4, 14, { anchor: 'center' });
    if (frog.falling && frog.y > 200) {
      for (var sp = 0; sp < 5; sp++) game.draw.circle(perchX - 60 + sp * 30, H * 0.6 - (frog.y - 200) * 0.6 * ((sp % 2) + 0.5), 12, C.l0);
    }
    game.draw.rect(0, 0, W, H, C.l0, 0.02 + 0.02 * Math.sin(t * 1.3));
  }

  function drawGong() {
    var g = gongPos();
    // 残像
    for (var i = 0; i < trail.length; i++) game.draw.sprite(GONG, { k: C.l4, m: C.l3, x: C.l2, o: C.l0 }, trail[i].x, trail[i].y, 16, { anchor: 'center', alpha: 0.08 + i * 0.05 });
    game.draw.line(PIV_X, PIV_Y, g.x, g.y, C.l4, 6);
    var hl = shot && shot.hit;
    if (hl) game.draw.circle(g.x, g.y, 100, C.l0, 0.6);
    game.draw.sprite(GONG, { k: C.l4, m: C.l3, x: C.l2, o: hl ? C.l4 : C.l0 }, g.x, g.y, hl ? 20 : 17, { anchor: 'center' });
    if (shot) {
      game.draw.line(PIV_X, SLING_Y - 60, shot.x, shot.y, C.l4, 8);
      game.draw.sprite(PEBBLE, { k: C.l4 }, shot.x, shot.y + 40, 12, { anchor: 'center' });
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.l2);
    // パチンコ台と石投げ番
    game.draw.rect(PIV_X - 8, SLING_Y - 60, 16, 90, C.l4);
    game.draw.line(PIV_X - 50, SLING_Y - 90, PIV_X, SLING_Y - 40, C.l4, 8);
    game.draw.line(PIV_X + 50, SLING_Y - 90, PIV_X, SLING_Y - 40, C.l4, 8);
    if (reload <= 0) game.draw.sprite(PEBBLE, { k: C.l4 }, PIV_X, SLING_Y - 60, 12, { anchor: 'center' });
    game.draw.sprite(KID[Math.floor(t * 2) % 2], { h: C.l4, f: C.l1, k: C.l4, b: C.l3 }, W * 0.2, H * 0.84 + Math.sin(t * 2.4) * 5, 14, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(FROG[0], { g: i < dunks ? C.l0 : C.l3, w: C.l1, k: C.l4, r: C.l4 }, W * 0.4 + i * 110, H * 0.9, 8, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W * 0.4 + m * 90, H * 0.95, 60, 16, m < misses ? C.l4 : C.l1);
    if (phase === 'play' && hitStop <= 0 && !frog.falling) {
      var p = Math.max(0, waitT / WAIT_T);
      game.draw.rect(W * 0.3, H * 0.765, W * 0.4, 12, C.l3);
      game.draw.rect(W * 0.3, H * 0.765, W * 0.4 * p, 12, p < 0.3 && Math.floor(t * 8) % 2 === 0 ? C.l4 : C.l0);
    }
  }

  function drawFrame() {
    // 携帯機の画面枠
    game.draw.rect(0, 0, 24, H, C.frame); game.draw.rect(W - 24, 0, 24, H, C.frame);
    game.draw.rect(0, H - 24, W, 24, C.frame);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.frameD);
    txt(dunks + ' / ' + NEEDED, W / 2, 90, 66, C.l0);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.l1, 'left');
    game.draw.rect(60, 170, W - 120, 20, C.l4);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 4 ? C.l2 : C.l0);
  }

  function score() { return dunks * 300 + perfects * 120 + Math.max(0, MAX_MISS - misses) * 50 + Math.round(timeLeft * 10); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawGong(); drawBottom(); drawFrame();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.frameD);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.l0);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.l1);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.l0);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.l1);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawBottom(); drawFrame();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.l0 : C.l4);
      txt('BEST ' + game.best, W / 2, H * 0.46, 40, C.l0);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.l0);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      stepSwing(dt);
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        stepSwing(dt);
        if (!frog.falling && frog.hop <= 0) {
          waitT -= dt;
          if (waitT <= 0) { var g = gongPos(); miss(g.x, g.y); }
        }
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { dunks: dunks, perfects: perfects, misses: misses };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawGong(); drawBottom(); drawFrame(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.l0);
    if (phase === 'outro') {
      var sc = score();
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.l4, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.l0 : C.l1);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.l0);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.l0);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - dunks) + '体!', W / 2, H * 0.49, 44, C.l1);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.l1);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5],
      ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['A4', 2]
    ], { tempo: 144, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['D3', 2], ['G2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
