// GH-DS-0013-ledge-to-ledge-climb.js
// レッジトゥレッジクライム — 崩れる足場を渡り歩き、塔のてっぺんを目指す
// 操作: 次の足場がある側へスワイプして跳び移る。足場は着地後まもなく崩れ落ちる
// 終わり: 12段登り切ればクリア。崩落前に跳べない/逆側へ跳べば転落してゲームオーバー
// @mechanic: camera_climb
// @theme: crumbling_watchtower
// 世界観: 崩れかけの見張り塔。石工の見習いが、崩落する足場を読みながら頂上の鐘を目指して登る
// 残るもの: 正誤(CLEAR/GAME OVER) + 登った段数(高度m)
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き、表情のあるスプライト
  var STYLE = {
    bg: ['#2a1a3a', '#0e0a1c'],
    main: ['#e0c890', '#8a5a3a', '#5adcff'],
    accent: ['#ff6b4a', '#ffe066'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgBot: STYLE.bg[1], tower: '#3a2a48', towerDark: '#241832',
    ledge: STYLE.main[0], ledgeDark: STYLE.main[1], crack: STYLE.accent[0], fragile: '#c85a3a',
    sky: STYLE.main[2], hero: STYLE.accent[1], gold: STYLE.accent[1], good: '#39ff9e', bad: STYLE.accent[0],
    white: '#ffffff', ink: '#160c1e',
  };

  var GAME_TITLE = 'LEDGE TO LEDGE';
  var TOTAL_JUMPS = 12;
  var GAP = 230, OFFSET = 170;
  var GROUND_Y = H * 1.05;
  var JUMP_TIME = 0.22;
  var WARN_LEAD = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var seq, cur, cameraY, crumbleT, crumbleMax, falling, fallT, anim, milestoneShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HERO_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];
  var HERO_PAL = { '#': C.hero };

  function buildSeq(n) {
    var arr = [0];
    var lastSide = 0, streak = 0;
    for (var i = 1; i <= n; i++) {
      var side = game.random(0, 1) < 0.5 ? -1 : 1;
      if (side === lastSide) { streak++; if (streak >= 2) side = -lastSide; } else streak = 0;
      lastSide = side;
      arr.push(side);
    }
    return arr;
  }

  function ledgeX(i) { return W / 2 + seq[i] * OFFSET; }
  function ledgeY(i) { return GROUND_Y - i * GAP; }
  function isFragile(i) { return i > 0 && i % 4 === 0; }

  function startLedge() {
    crumbleMax = isFragile(cur) ? 0.55 : Math.max(0.55, game.random(0.65, 1.15) - cur * 0.015);
    crumbleT = crumbleMax;
  }

  function initGame() {
    seq = buildSeq(TOTAL_JUMPS + 4);
    cur = 0; cameraY = 0; falling = false; fallT = 0; anim = null; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    startLedge();
  }

  // ── 共有ロジック(実演でも本編でもこの関数群を使う) ──────────────────
  function attemptJump(dir) {
    if (falling || anim || cur >= TOTAL_JUMPS) return;
    var need = seq[cur + 1];
    if (dir === need) {
      var fromX = ledgeX(cur), fromY = ledgeY(cur);
      cur++;
      anim = { t: 0, x0: fromX, y0: fromY, x1: ledgeX(cur), y1: ledgeY(cur) };
      startLedge();
      game.feedback.good(ledgeX(cur), ledgeY(cur) - cameraY, { text: null });
      game.audio.play('se_jump', 0.5);
      var alt = cur * 8;
      if (!milestoneShown && cur >= Math.floor(TOTAL_JUMPS / 2)) {
        milestoneShown = true;
        game.fx.popup(alt + 'm!!', W / 2, H * 0.30, { color: C.gold, size: 48 });
        game.audio.play('se_milestone', 0.5);
      }
      if (cur >= TOTAL_JUMPS) { ok = true; startFall(false); }
    } else {
      game.feedback.bad(ledgeX(cur), ledgeY(cur) - cameraY, { text: 'MISS' });
      startFall(true);
    }
  }
  function startFall(isDeath) {
    if (isDeath) { ok = false; }
    falling = true; fallT = 0;
    shake = 0.22; hitStop = 0.18;
    if (isDeath) game.fx.flash('#ff2222', 0.15);
  }
  function updateAnim(dt) {
    if (!anim) return;
    anim.t += dt;
    if (anim.t >= JUMP_TIME) anim = null;
  }
  function updateCamera() {
    var py = ledgeY(cur);
    if (py - cameraY < H * 0.42) cameraY = py - H * 0.42;
  }
  function updateCrumble(dt) {
    if (falling || anim) return;
    crumbleT -= dt;
    if (!falling && crumbleT <= 0) startFall(true);
  }

  function onDirInput(dir) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
    if (done || ready > 0 || hitStop > 0 || falling) return;
    attemptJump(dir);
  }
  game.onSwipe(function(dir) {
    game.audio.play('se_tap', 0.12);
    if (dir === 'left') onDirInput(-1);
    else if (dir === 'right') onDirInput(1);
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: attemptJump/updateAnim/updateCrumble/updateCamera を流用 ──
  var demo = { t: 0, gx: 0, gy: 0, press: false, subT: 0.6, cycle: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (cur === undefined) initGame();
    updateAnim(dt); updateCamera();
    if (!falling && !anim) updateCrumble(dt);
    if (falling) {
      fallT += dt;
      if (fallT > 0.6) { initGame(); demo.cycle++; }
      demo.gx = ledgeX(cur); demo.gy = ledgeY(cur) - cameraY;
      demo.press = false;
      return;
    }
    if (!anim) {
      demo.subT -= dt;
      demo.gx = ledgeX(cur); demo.gy = ledgeY(cur) - cameraY - 40;
      if (demo.subT <= 0) {
        var makeMistake = demo.cycle % 3 === 2 && cur > 0;
        var dir = makeMistake ? -seq[cur + 1] : seq[cur + 1];
        demo.press = true;
        attemptJump(dir);
        demo.subT = 0.55;
      } else demo.press = false;
    } else {
      var f = Math.min(1, anim.t / JUMP_TIME);
      demo.gx = anim.x0 + (anim.x1 - anim.x0) * f;
      demo.gy = (anim.y0 + (anim.y1 - anim.y0) * f) - cameraY - 40;
      demo.press = false;
    }
  }

  function towerBg() {
    game.draw.gradient(0, H, [[0, C.bgTop], [1, C.bgBot]]);
    for (var i = 0; i < 4; i++) {
      var sy = ((i * 480) - (cameraY * 0.3) % 480 + 480) % (H + 480) - 240;
      game.draw.circle(W * (0.2 + i * 0.22), sy, 60, '#00000022');
    }
  }

  function drawLedge(i) {
    var y = ledgeY(i) - cameraY;
    if (y < -80 || y > H + 80) return;
    var x = ledgeX(i);
    var frag = isFragile(i);
    var isCurrent = i === cur && !falling;
    var crumbleFrac = isCurrent ? crumbleT / crumbleMax : 1;
    var warn = isCurrent && crumbleT <= WARN_LEAD;
    var flash = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(x - 90, y, 180, 26, C.towerDark);
    game.draw.rect(x - 84, y - 8, 168, 18, flash ? C.crack : (frag ? C.fragile : C.ledgeDark));
    game.draw.rect(x - 84, y - 8, 168 * Math.max(0, crumbleFrac), 18, flash ? C.crack : C.ledge);
  }

  function drawTowerColumn() {
    for (var i = Math.max(0, cur - 2); i <= cur + 3; i++) drawLedge(i);
  }

  function drawHero(x, y, jumping) {
    var f = jumping ? 1 : Math.floor(game.time.elapsed * 4) % 2;
    var hop = jumping ? -Math.sin(Math.min(1, (anim ? anim.t / JUMP_TIME : 0)) * Math.PI) * 70 : 0;
    game.draw.circle(x, y + 6, 22, '#00000030');
    game.draw.sprite(HERO_F[f], HERO_PAL, x, y - 26 + hop, 13, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      towerBg();
      stepDemo(dt);
      drawTowerColumn();
      drawHero(demo.gx, demo.gy, !!anim);
      game.draw.hand(demo.gx, demo.gy - 130, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + game.best + 'm', W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      towerBg(); drawTowerColumn(); drawHero(ledgeX(cur), ledgeY(cur) - cameraY, false);
      var alt = cur * 8;
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(alt + 'm / ' + (TOTAL_JUMPS * 8) + 'm', W / 2, H * 0.13, 30, C.white);
      txt('BEST ' + Math.max(game.best, alt) + 'm', W / 2, H * 0.17, 26, C.gold);
      if (!ok && cur >= TOTAL_JUMPS - 2) txt('あと' + (TOTAL_JUMPS - cur) + '段!', W / 2, H * 0.21, 26, C.white);
      if (alt > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.24, 30, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var alt = cur * 8;
        var stats = { altitude: alt, jumps: cur };
        if (ok) game.end.success(alt, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (falling) {
      fallT += dt;
      if (fallT > 0.6) finish();
    } else {
      updateAnim(dt); updateCamera(); updateCrumble(dt);
    }
    if (shake > 0) shake -= dt;

    towerBg();
    drawTowerColumn();
    var hx = anim ? anim.x0 + (anim.x1 - anim.x0) * Math.min(1, anim.t / JUMP_TIME) : ledgeX(cur);
    var hy = (anim ? anim.y0 + (anim.y1 - anim.y0) * Math.min(1, anim.t / JUMP_TIME) : ledgeY(cur)) - cameraY;
    if (falling) hy += fallT * fallT * 900;
    drawHero(hx, hy, !!anim);

    txt((cur) + ' / ' + TOTAL_JUMPS, W / 2, H * 0.06, 30, C.white);
    txt((cur * 8) + 'm', W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C4', 0.3], ['D4', 0.3], ['E4', 0.3], ['G4', 0.3],
      ['E4', 0.3], ['D4', 0.3],
    ], { tempo: 150, wave: 'triangle', volume: 0.07, loop: true, bass: [['C3', 1], ['A2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
