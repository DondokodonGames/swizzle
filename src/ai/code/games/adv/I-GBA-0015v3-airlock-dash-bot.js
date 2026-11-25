// I-GBA-0015v3-airlock-dash-bot.js
// エアロック駆け込みロボ — 開いては閉じる搭乗口のエアロックが開いている一瞬だけタップして中へ飛び込む
// 操作: 扉が開ききっている間にタップするとロボが飛び込む。閉じている/半開きのときにタップすると扉にぶつかる
// 終わり: 6枚のエアロックを通って搭乗できれば成功。扉にぶつかる/時間切れで失敗
// @mechanic: timing_window
// @theme: spaceport_airlock_boarding
// 世界観: 宇宙港の搭乗口で、乗り遅れそうな乗客ロボットが、開閉を繰り返す6重のエアロックの開いた一瞬に飛び込み続けて出発間際の船へ乗り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過したエアロック数と PERFECT 数
// スタイル: 90s LOW POLY

(function(game) {
  var STYLE = { bg: ['#0c1430', '#1c2a58', '#34487a'], main: ['#9ab0d0', '#5a6e96'], accent: ['#ffcf3a', '#ff4a5a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GAME_TITLE = 'AIRLOCK DASH';
  var TIME_LIMIT = 14;
  var NEEDED = 6;
  var DX = W / 2;
  var DY = H * 0.46;
  var PANEL = 230;
  var DOOR_H = 620;
  var SAFE_W = [0.45, 0.35, 0.26, 0.19, 0.13, 0.09];
  var WARN_W = 0.5;
  var MOVE_T = 0.18;

  var ST = { ATTRACT: 'ATTRACT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
  var st = ST.ATTRACT;

  // door.step: 'shut' → 'opening' → 'safe' → 'warn' → 'closing' → 'shut' / フェイントは 'crackUp' → 'crackDown'
  var door = { step: 'shut', t: 0, dur: 0.8, gap: 0, crackNext: false };
  var bot = { dash: 0, bonk: 0, blink: 0 };
  var gone = 0, perfect = 0, pts = 0, remain = TIME_LIMIT, warmup = 0, freeze = 0, outro = 0, zoom = 0;
  var playing = false, boarded = false;

  var BOT_A = [
    '...a....',
    '...a....',
    '.hhhhhh.',
    'hhvvvvhh',
    '.hhhhhh.',
    '..bbbb..',
    '.bbbbbb.',
    'b.bbbb.b',
    '..b..b..',
    '.bb..bb.',
  ];
  var BOT_B = [
    '....a...',
    '...a....',
    '.hhhhhh.',
    'hhvvvvhh',
    '.hhhhhh.',
    '..bbbb..',
    'bbbbbbbb',
    '..bbbb..',
    '.b....b.',
    'bb....bb',
  ];
  var BOT_PAL = { 'a': '#ffcf3a', 'h': '#d8e0f0', 'v': '#34487a', 'b': '#9ab0d0' };
  var CASE = ['.##.', '####', '#..#', '####'];
  var SHIP = ['...##.......', '..#####.....', '############', '..#####.....', '...##.......'];

  function hud(str, x, y, size, color) {
    game.draw.text(str, x + 3, y + 3, { size: size, color: '#040816', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function lockIndex() { return Math.min(gone, NEEDED - 1); }

  function goStep(step) {
    door.step = step; door.t = 0;
    if (step === 'shut') {
      door.dur = game.random(0.5, 1.0);
      door.crackNext = gone >= 2 && game.random(0, 1) < 0.35;
    } else if (step === 'opening' || step === 'closing') door.dur = MOVE_T;
    else if (step === 'safe') door.dur = SAFE_W[lockIndex()];
    else if (step === 'warn') door.dur = WARN_W;
    else if (step === 'crackUp') door.dur = 0.35;
    else if (step === 'crackDown') door.dur = 0.3;
  }

  function cycleDoor(dt, live) {
    door.t += dt;
    var k = Math.min(1, door.t / door.dur);
    if (door.step === 'opening') door.gap = k;
    else if (door.step === 'closing') door.gap = 1 - k;
    else if (door.step === 'crackUp') door.gap = 0.28 * Math.sin(k * Math.PI * 0.5);
    else if (door.step === 'crackDown') door.gap = 0.28 * (1 - k);
    else if (door.step === 'safe' || door.step === 'warn') door.gap = 1;
    else door.gap = 0;
    if (door.t < door.dur) return;
    if (door.step === 'shut') goStep(door.crackNext ? 'crackUp' : 'opening');
    else if (door.step === 'opening') { goStep('safe'); if (live) game.audio.tone('C6', 0.08, { wave: 'sine', volume: 0.08 }); }
    else if (door.step === 'safe') { goStep('warn'); if (live) game.audio.tone('A5', 0.3, { wave: 'square', volume: 0.05 }); }
    else if (door.step === 'warn') goStep('closing');
    else if (door.step === 'crackUp') goStep('crackDown');
    else goStep('shut');
  }

  // 実判定: 今タップしたら? 'perfect' | 'good' | 'bonk'
  function tryEnter() {
    if (door.step === 'safe') return 'perfect';
    if (door.step === 'warn') return 'good';
    return 'bonk';
  }

  function resetLocks() {
    gone = 0; bot.dash = 0; bot.bonk = 0; zoom = 0;
    goStep('shut'); door.gap = 0; door.dur = 0.6;
  }

  function freshRun() {
    resetLocks();
    perfect = 0; pts = 0; remain = TIME_LIMIT; warmup = 0.8; freeze = 0; outro = 0;
    playing = false; boarded = false;
  }

  function applyEnter(res, live) {
    if (res === 'bonk') {
      bot.bonk = 0.6;
      if (live) {
        playing = false; boarded = false; freeze = 0.55;
        game.feedback.bad(DX, DY + 120, { text: 'MISS', shake: 16 });
        game.audio.play('se_failure', 0.45);
        game.audio.stopBgm();
      }
      return;
    }
    bot.dash = 0.4;
    zoom = 0.45;
    gone++;
    if (live) {
      if (res === 'perfect') perfect++;
      pts += res === 'perfect' ? 200 : 100;
      game.feedback.good(DX, DY, { text: res === 'perfect' ? 'PERFECT' : 'GOOD', color: res === 'perfect' ? STYLE.accent[0] : STYLE.main[0], count: res === 'perfect' ? 20 : 10 });
      game.audio.play('se_jump', 0.3);
      if (gone === 3) { game.fx.popup('3 / ' + NEEDED, DX, H * 0.25, { color: STYLE.accent[0], size: 50 }); game.audio.play('se_milestone', 0.45); }
      if (gone >= NEEDED) {
        playing = false; boarded = true; freeze = 0.5;
        pts += Math.round(remain * 20);
        game.audio.play('se_success', 0.5);
        game.audio.stopBgm();
      }
    }
    goStep('shut');
    door.gap = 0;
  }

  game.onTap(function(x, y) {
    if (st === ST.ATTRACT) { game.audio.play('se_coin', 0.5); st = ST.PLAYING; freshRun(); return; }
    if (st === ST.RESULT) { st = ST.ATTRACT; freshRun(); demo.t = 0; return; }
    if (!playing) return;
    if (zoom > 0) { game.audio.play('se_tap', 0.12); game.fx.burst(x, y, { color: STYLE.main[1], count: 4, speed: 90 }); return; }
    game.audio.play('se_tap', 0.3);
    applyEnter(tryEnter(), true);
  });

  // ── ATTRACT ゴースト実演: cycleDoor/tryEnter/applyEnter をそのまま使う。偶数周は半開きのフェイントに釣られてぶつかる ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: 0, bait: false, bonkShow: 0, waitSafe: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) {
      resetLocks();
      demo.bait = Math.floor(demo.t / 8) % 2 === 1;
      demo.bonkShow = 0;
      demo.waitSafe = game.random(0.05, 0.2);
    }
    if (demo.press > 0) demo.press -= dt;
    if (bot.dash > 0) bot.dash -= dt;
    if (zoom > 0) zoom -= dt;
    if (demo.bonkShow > 0) {
      demo.bonkShow -= dt;
      if (bot.bonk > 0) bot.bonk -= dt;
      if (demo.bonkShow <= 0) { bot.bonk = 0; goStep('shut'); }
      return;
    }
    cycleDoor(dt, false);
    if (zoom > 0) return;
    if (demo.bait && door.step === 'shut' && gone === 2) door.crackNext = true;
    var fire = (door.step === 'safe' && door.t >= Math.min(demo.waitSafe, door.dur * 0.6)) ||
      (demo.bait && door.step === 'crackUp' && door.t > 0.2);
    if (fire) {
      demo.press = 0.25;
      var res = tryEnter();
      applyEnter(res, false);
      demo.waitSafe = game.random(0.05, 0.2);
      if (res === 'bonk') { demo.bonkShow = 0.9; demo.bait = false; }
      if (gone >= NEEDED) resetLocks();
    }
  }

  // ── 描画(低ポリ: 面は横ストリップ、輪郭は line) ──
  function drawHall() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, '#101a3a']]);
    // 大窓の星と惑星
    for (var i = 0; i < 30; i++) {
      var sx = (i * 211) % W, sy = 240 + (i * 53) % 150;
      game.draw.rect(sx, sy, 4, 4, '#ffffff', 0.3 + 0.3 * Math.sin(t * 3 + i));
    }
    game.draw.circle(W * 0.82, 300, 90, '#3a5aa0', 1);
    game.draw.circle(W * 0.80, 290, 90, '#5a7ac0', 0.6);
    game.draw.sprite(SHIP, { '#': '#9ab0d0' }, W * 0.2 + Math.sin(t * 0.7) * 30, 310 + Math.sin(t * 1.3) * 6, 8, { anchor: 'center' });
    game.draw.rect(0, 420, W, 14, '#34487a', 1);
    // 床(奥へ収束する横ストリップ)
    var vy = DY - 60;
    for (var y = Math.floor(DY + DOOR_H / 2); y < H * 0.95; y += 8) {
      var d = (y - vy) / (H - vy);
      var half = 240 + d * 620;
      var band = Math.floor((y + (zoom > 0 ? (0.45 - zoom) * 400 : 0)) / 48) % 2 === 0;
      game.draw.rect(DX - half, y, half * 2, 8, band ? '#26365e' : '#1e2c50', 1);
    }
    // 側壁の面(頂点ジッター付き)
    var jit = Math.sin(t * 20) * 1.5;
    for (var w = 0; w < 5; w++) {
      var yy = DY - DOOR_H / 2 + w * 140;
      game.draw.line(0, yy - 120 + jit, DX - PANEL - 60, yy + jit, '#5a6e96', 3);
      game.draw.line(W, yy - 120 - jit, DX + PANEL + 60, yy - jit, '#5a6e96', 3);
    }
    // フォグ
    game.draw.circle(DX, DY, 420, '#9ab0d0', 0.06 + 0.02 * Math.sin(t * 1.5));
  }

  function drawDoor(highlight) {
    var sc = zoom > 0 ? 1 + (0.45 - zoom) * 1.2 : 1;
    var alpha = zoom > 0 ? Math.max(0.2, zoom / 0.45) : 1;
    var pw = PANEL * sc, dh = DOOR_H * sc;
    var top = DY - dh / 2;
    // 奥の搭乗橋の光
    game.draw.rect(DX - pw, top, pw * 2, dh, '#ffe9a0', 0.25 + 0.5 * door.gap);
    var shift = door.gap * pw;
    var lc = highlight ? '#ffffff' : '#8a9ec0';
    var dc = highlight ? '#e8e8f0' : '#6a7ea4';
    for (var y = top; y < top + dh; y += 6) {
      var shade = Math.floor((y - top) / 60) % 2 === 0 ? lc : dc;
      game.draw.rect(DX - pw - shift, y, pw, 6, shade, alpha);
      game.draw.rect(DX + shift, y, pw, 6, shade, alpha);
    }
    for (var s = 0; s < 4; s++) {
      var hy = top + dh - 80 + s * 18;
      game.draw.rect(DX - pw - shift, hy, pw, 8, s % 2 ? '#202020' : STYLE.accent[0], alpha);
      game.draw.rect(DX + shift, hy, pw, 8, s % 2 ? '#202020' : STYLE.accent[0], alpha);
    }
    // 枠
    game.draw.line(DX - pw - 24, top - 20, DX + pw + 24, top - 20, '#c0d0f0', 10);
    game.draw.line(DX - pw - 24, top - 20, DX - pw - 24, top + dh, '#c0d0f0', 10);
    game.draw.line(DX + pw + 24, top - 20, DX + pw + 24, top + dh, '#c0d0f0', 10);
    // 表示灯: safe=緑、warn=赤点滅(閉まる予告)、フェイント中=黄
    var lamp = '#34487a';
    if (door.step === 'safe' || door.step === 'opening') lamp = '#4aff8a';
    else if (door.step === 'warn') lamp = Math.floor(game.time.elapsed * 14) % 2 === 0 ? STYLE.accent[1] : '#601018';
    else if (door.step === 'crackUp' || door.step === 'crackDown') lamp = STYLE.accent[0];
    for (var l = -1; l <= 1; l += 2) {
      game.draw.circle(DX + l * (pw + 70), top + 40, 26, lamp, 1);
      game.draw.circle(DX + l * (pw + 70), top + 40, 50, lamp, 0.25);
    }
    hud(String(gone + 1), DX, top - 44, 40, STYLE.main[0]);
  }

  function drawBot() {
    var frame = Math.floor(game.time.elapsed * 3) % 2 === 0 ? BOT_A : BOT_B;
    var by = H * 0.76, px = 22;
    if (bot.dash > 0) { var k = 1 - bot.dash / 0.4; by -= k * 330; px = 22 - k * 12; frame = BOT_B; }
    if (bot.bonk > 0) { by -= 60; px = 24; game.draw.circle(DX, by, 170, '#ffffff', 0.5); }
    var bob = Math.sin(game.time.elapsed * 4) * 5;
    game.draw.rect(DX - px * 4, H * 0.76 + px * 5, px * 8, 14, '#000000', 0.3);
    game.draw.sprite(frame, BOT_PAL, DX, by + bob, px, { anchor: 'center' });
    game.draw.sprite(CASE, { '#': STYLE.accent[1] }, DX + px * 5, by + px * 3 + bob, px * 0.8, { anchor: 'center' });
  }

  function drawHud() {
    hud(Math.min(gone, NEEDED) + ' / ' + NEEDED, W / 2, 96, 50, STYLE.main[0]);
    for (var i = 0; i < NEEDED; i++) game.draw.rect(W / 2 - 180 + i * 62, 130, 46, 14, i < gone ? STYLE.accent[0] : '#34487a', 1);
    var bw = W - 160;
    var low = remain < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 176, bw, 16, '#040816', 1);
    game.draw.rect(80, 176, bw * Math.max(0, remain / TIME_LIMIT), 16, low ? STYLE.accent[1] : STYLE.main[0], 1);
    hud(String(pts), W - 120, 96, 32, STYLE.accent[0]);
  }

  game.onUpdate(function(dt) {
    if (st === ST.ATTRACT) {
      stepDemo(dt);
      drawHall();
      drawDoor(demo.bonkShow > 0);
      drawBot();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      var bob = Math.sin(game.time.elapsed * 2.2) * 6;
      hud(GAME_TITLE, W / 2, H * 0.08 + bob, 62, STYLE.accent[0]);
      hud('HI-SCORE ' + Math.round(game.best || 0), W / 2, H * 0.13, 30, STYLE.main[0]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) hud('► 100円 投入 ◄', W / 2, H * 0.96, 38, STYLE.accent[0]);
      else hud('INSERT COIN', W / 2, H * 0.96, 30, STYLE.main[0]);
      return;
    }

    if (st === ST.RESULT) {
      drawHall();
      drawDoor(!boarded);
      drawBot();
      hud(boarded ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 66, boarded ? STYLE.accent[0] : STYLE.accent[1]);
      hud(gone + ' / ' + NEEDED, W / 2, H * 0.14, 40, STYLE.main[0]);
      hud('SCORE ' + pts, W / 2, H * 0.18, 32, STYLE.main[0]);
      if (!boarded) hud('あと' + (NEEDED - gone) + '枚!', W / 2, H * 0.215, 32, STYLE.accent[0]);
      else hud('PERFECT ' + perfect, W / 2, H * 0.215, 30, STYLE.accent[0]);
      hud('BEST ' + Math.round(game.best || 0), W / 2, H * 0.25, 26, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) hud('TAP TO CONTINUE', W / 2, H * 0.96, 30, STYLE.main[0]);
      return;
    }

    // ── PLAYING ──
    if (bot.dash > 0) bot.dash -= dt;
    if (zoom > 0) zoom -= dt;
    if (outro > 0) {
      outro -= dt;
      if (outro <= 0) {
        st = ST.RESULT;
        var stats = { locks: gone, perfect: perfect };
        if (boarded) game.end.success(pts, stats); else game.end.failure(stats);
      }
    } else if (freeze > 0) {
      freeze -= dt;
      if (freeze <= 0) outro = 1.0;
    } else if (warmup > 0) {
      warmup -= dt;
      if (warmup <= 0) { playing = true; game.audio.play('se_tap', 0.35); }
    } else if (playing) {
      remain -= dt;
      if (zoom <= 0) cycleDoor(dt, true);
      if (remain <= 0) {
        remain = 0; playing = false; boarded = false; freeze = 0.5;
        game.feedback.bad(DX, DY, { text: 'TIME UP', shake: 10 });
        game.audio.play('se_failure', 0.45);
        game.audio.stopBgm();
      }
    }

    drawHall();
    drawDoor(freeze > 0 && !boarded);
    drawBot();
    drawHud();
    if (warmup > 0) hud(warmup > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 84, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['B4', 0.5], ['A4', 0.25], ['G4', 0.25], ['F#4', 0.5], ['E4', 0.5], ['B3', 1]], { tempo: 132, wave: 'sawtooth', volume: 0.035, loop: true, bass: true });
    st = ST.ATTRACT;
    freshRun();
  });
})(game);
