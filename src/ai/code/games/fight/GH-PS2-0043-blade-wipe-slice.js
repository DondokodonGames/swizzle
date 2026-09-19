// GH-PS2-0043-blade-wipe-slice.js
// ブレードワイプ — 迫る刺客を斬る。刃に付いた返り血を拭わないと次の予兆が見えづらくなる
// 操作: 光る刺客めがけて指で素早く払って斬る。斬った直後、画面下の刃を指でこすって血を拭う
// 終わり: 5人斬れれば成功。刃が3回届けば失敗
// @mechanic: slice
// @theme: night_guard_duel
// 世界観: 夜番の剣士。次々と迫る覆面の刺客を、間合いに入る前に斬る。刃を拭う手間を怠ると視界が滲む
// 残るもの: 正誤(CLEAR/GAME OVER) + 斬った人数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る。中間調を作らない
  var C = {
    bg1: '#2a3550', bg2: '#141a2c', ground: '#1c2438',
    guard: '#3a7ad0', guardDark: '#1e4a90', foe: '#c03a3a', foeDark: '#701818',
    blood: '#8c1c1c', blade: '#d8dce6', good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#ffffff', ink: '#0a0c14',
  };

  var GAME_TITLE = 'BLADE WIPE';
  var NEEDED = 5, LIVES = 3;
  var MAX_TIME = 14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, killN = 0, lives = LIVES, elapsedRound = 0;

  var CX = W * 0.5, STRIKE_Y = H * 0.62;
  var WIPE_ZONE = { x: W * 0.5 - 220, y: H * 0.84, w: 440, h: 130 };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function outline(x, y, w, h, fill) {
    game.draw.rect(x - 8, y - 8, w + 16, h + 16, C.ink);
    game.draw.rect(x, y, w, h, fill);
  }

  var FOE_SPRITE = ['.##.', '####', '.##.', '#.#.'];
  var GUARD_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  var foeX, foeY, foeDist, foePhase, foePhaseT, foeSeed;
  var grime, wipeStrokes, wipeLastX, wipeDir, spawnGap;
  var trail;
  var done, endWait, finished, ready, hitStop, shake;

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, H * 0.66, W, H * 0.34, C.ground);
    for (var i = 0; i < 4; i++) game.draw.rect(i * 280 + 40, H * 0.15, 12, H * 0.5, C.ink, 0.25);
    if (grime > 0) game.draw.rect(0, 0, W, H, C.blood, Math.min(0.35, grime * 0.35));
  }

  function spawnFoe() {
    foeSeed = Math.random();
    foeX = CX + (foeSeed - 0.5) * 420;
    foeY = H * 0.20;
    foeDist = 1; // 1=遠い ... 0=間合い
    foePhase = 'approach'; foePhaseT = 0;
  }

  function initGame() {
    killN = 0; lives = LIVES; elapsedRound = 0;
    grime = 0; wipeStrokes = 0; wipeLastX = null; wipeDir = 0;
    trail = null;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    spawnFoe();
  }

  function killFoe() {
    hitStop = 0.14;
    killN++;
    game.feedback.good(foeX, foeY, { text: 'CUT', color: C.good });
    game.fx.burst(foeX, foeY, { color: C.gold, count: 16, speed: 360 });
    game.audio.play('se_break', 0.4);
    grime = Math.min(1, grime + 0.34);
    if (killN >= NEEDED) { ok = true; finished = true; finish(); return; }
    game.fx.popup(killN + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 40 });
    if (killN === NEEDED - 1) game.audio.play('se_milestone', 0.3);
    spawnFoe();
  }

  function foeStrikes() {
    hitStop = 0.18;
    lives--;
    game.feedback.bad(foeX, foeY, { text: 'HIT' });
    shake = 0.22;
    game.audio.play('se_bad', 0.4);
    if (lives <= 0) { ok = false; finished = true; finish(); return; }
    game.fx.popup('あと' + lives + '!', W / 2, H * 0.16, { color: C.bad, size: 34 });
    spawnFoe();
  }

  function onSliceMove(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished || hitStop > 0) return;
    if (trail) {
      var d = Math.hypot(x - foeX, y - foeY);
      if (foePhase === 'strike' && d < 130) {
        var t0x = trail.x, t0y = trail.y;
        var segLen = Math.hypot(x - t0x, y - t0y);
        if (segLen > 40) killFoe();
      }
    }
    trail = { x: x, y: y };
  }

  function onWipeMove(x, y) {
    if (x < WIPE_ZONE.x - 60 || x > WIPE_ZONE.x + WIPE_ZONE.w + 60 || y < WIPE_ZONE.y - 60 || y > WIPE_ZONE.y + WIPE_ZONE.h + 60) return;
    if (wipeLastX !== null) {
      var d = x - wipeLastX;
      if (Math.abs(d) > 6) {
        var dir = d > 0 ? 1 : -1;
        if (dir !== wipeDir && wipeDir !== 0) {
          wipeStrokes++;
          grime = Math.max(0, grime - 0.30);
          game.audio.play('se_tap', 0.12);
          if (grime <= 0) { game.feedback.good(WIPE_ZONE.x + WIPE_ZONE.w / 2, WIPE_ZONE.y, { text: null }); grime = 0; }
        }
        wipeDir = dir;
      }
    }
    wipeLastX = x;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    game.audio.play('se_tap', 0.05);
  });
  game.onPress(function(x, y) {
    trail = { x: x, y: y }; wipeLastX = x; wipeDir = 0;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    onSliceMove(x, y);
    onWipeMove(x, y);
    if (Math.random() < 0.06) game.audio.tone(520, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onRelease(function() {
    trail = null; wipeLastX = null; wipeDir = 0;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.04);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.3;
  }

  function stepFoe(dt) {
    if (foePhase === 'approach') {
      foeDist -= dt * 0.55;
      foeY = H * 0.20 + (STRIKE_Y - H * 0.20) * (1 - foeDist);
      foeX = CX + (foeSeed - 0.5) * 420 * foeDist;
      if (foeDist <= 0.42) { foePhase = 'telegraph'; foePhaseT = 0.6; }
    } else if (foePhase === 'telegraph') {
      foePhaseT -= dt;
      if (foePhaseT <= 0) { foePhase = 'strike'; foePhaseT = 0.55; game.audio.play('se_tap', 0.08); }
    } else if (foePhase === 'strike') {
      foeDist -= dt * 0.55;
      foeY = H * 0.20 + (STRIKE_Y - H * 0.20) * (1 - Math.max(0, foeDist));
      foeX = CX + (foeSeed - 0.5) * 420 * Math.max(0, foeDist);
      foePhaseT -= dt;
      if (foePhaseT <= 0) foeStrikes();
    }
  }

  var demo = { t: 0, gx: CX, gy: STRIKE_Y, press: false, mode: 'slice' };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.2;
    if (cyc < dt || demo.t <= dt) { spawnFoe(); grime = Math.min(grime, 0.3); }
    stepFoe(dt);
    if (foePhase === 'strike' && foePhaseT < 0.35 && foePhaseT > 0.15) {
      killFoe();
      demo.mode = 'wipe';
    }
    if (demo.mode === 'slice') {
      demo.gx += (foeX - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (foeY - demo.gy) * Math.min(1, dt * 5);
      demo.press = foePhase === 'strike';
    } else {
      var wx = WIPE_ZONE.x + WIPE_ZONE.w * (0.5 + 0.4 * Math.sin(demo.t * 10));
      demo.gx += (wx - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (WIPE_ZONE.y + 60 - demo.gy) * Math.min(1, dt * 8);
      demo.press = true;
      grime = Math.max(0, grime - dt * 0.6);
      if (grime <= 0.05) demo.mode = 'slice';
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (foeX === undefined) initGame();
      fieldBg();
      stepDemo(dt);
      outline(CX - 90, STRIKE_Y + 40, 180, 200, C.guard);
      game.draw.sprite(GUARD_SPRITE, { '#': C.guardDark }, CX, STRIKE_Y + 90, 26, { anchor: 'center' });
      var telegraphOn = foePhase === 'telegraph' && Math.floor(demo.t * 7) % 2 === 0;
      outline(foeX - 70, foeY - 70, 140, 140, telegraphOn ? C.gold : C.foe);
      game.draw.sprite(FOE_SPRITE, { '#': C.foeDark }, foeX, foeY, Math.round(20 * (1.3 - foeDist * 0.5)), { anchor: 'center' });
      outline(WIPE_ZONE.x, WIPE_ZONE.y, WIPE_ZONE.w, WIPE_ZONE.h, C.blade);
      game.draw.rect(WIPE_ZONE.x, WIPE_ZONE.y, WIPE_ZONE.w * grime, WIPE_ZONE.h, C.blood, 0.7);
      game.draw.hand(demo.gx + Math.cos(game.time.elapsed * 2.5) * 14, demo.gy + Math.sin(game.time.elapsed * 2.5) * 14, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + NEEDED : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg();
      outline(CX - 90, STRIKE_Y + 40, 180, 200, C.guard);
      game.draw.sprite(GUARD_SPRITE, { '#': C.guardDark }, CX, STRIKE_Y + 90, 26, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(killN + ' / ' + NEEDED, W / 2, H * 0.13, 34, C.gold);
      if (!ok && killN === NEEDED - 1) txt('あと1人!', W / 2, H * 0.18, 28, C.bad);
      var best = Math.max(game.best, killN);
      txt('BEST ' + best, W / 2, H * 0.90, 28, C.gold);
      if (killN > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(killN, { killN: killN, lives: lives });
        else game.end.failure({ killN: killN, lives: lives });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      stepFoe(dt);
      if (elapsedRound >= MAX_TIME && !finished) { ok = killN >= NEEDED; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    outline(CX - 90, STRIKE_Y + 40, 180, 200, C.guard);
    game.draw.sprite(GUARD_SPRITE, { '#': C.guardDark }, CX, STRIKE_Y + 90, 26, { anchor: 'center' });
    if (!finished) {
      var telegraphOn2 = foePhase === 'telegraph' && Math.floor(game.time.elapsed * 7) % 2 === 0;
      outline(foeX - 70, foeY - 70, 140, 140, telegraphOn2 ? C.gold : C.foe);
      game.draw.sprite(FOE_SPRITE, { '#': C.foeDark }, foeX, foeY, Math.round(20 * (1.3 - foeDist * 0.5)), { anchor: 'center' });
    }
    outline(WIPE_ZONE.x, WIPE_ZONE.y, WIPE_ZONE.w, WIPE_ZONE.h, C.blade);
    game.draw.rect(WIPE_ZONE.x, WIPE_ZONE.y, WIPE_ZONE.w * grime, WIPE_ZONE.h, C.blood, 0.7);

    txt(killN + ' / ' + NEEDED, W * 0.30, 90, 34, C.white);
    for (var l = 0; l < LIVES; l++) game.draw.circle(W * 0.70 + l * 50, 80, 16, l < lives ? C.good : C.ink, l < lives ? 1 : 0.4);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
