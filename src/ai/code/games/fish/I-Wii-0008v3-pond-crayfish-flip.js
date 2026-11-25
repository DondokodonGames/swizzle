// I-Wii-0008v3-pond-crayfish-flip.js
// ザリガニ跳ね上げ — 竿を押し続けてしならせ、ザリガニが餌をはさんだ瞬間に離して、溜めた力のぶんだけ岸のバケツへ跳ね上げる
// 操作: 押している間は竿がしなって力が溜まり、点線の弧が岸のどこに落ちるかを示す(弧はだんだん遠くへ伸びる)。ハサミを開いて餌をはさんだ瞬間に指を離すと跳ね上がる。歩いてくる速さを見て、はさむ瞬間に弧がバケツに届くよう押し始めを決める。はさむ前に離すと餌が跳ねてザリガニが後ずさる
// 終わり: 15秒以内にバケツへ4匹入れればCLEAR。届かなければTIME UP(GAME OVER)
// @mechanic: hold_charge
// @theme: summer_pond_crayfish
// 世界観: 夏休みの溜め池のほとりで、ザリガニ釣りの子どもがスルメの餌に寄ってくるザリガニを待ち、竿をしならせて力を溜め、餌をはさんだ瞬間に跳ね上げて岸のバケツへ放り込む
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア(バケツに入れた数・落とし所の正確さ)
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 粗い16x16ドット、輪郭線なし、タイル反復の背景、一方向スクロール。3〜4色+黒
  var STYLE = { bg: ['#5cb4f0', '#2a7ad0', '#000000'], main: ['#3ab040', '#88d048', '#c08040'], accent: ['#e83018', '#f8f8f8'] };
  var C = {
    sky: STYLE.bg[0], water: STYLE.bg[1], black: STYLE.bg[2], grass: STYLE.main[0], grassHi: STYLE.main[1], mud: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1], yellow: '#f8d030', tin: '#a8b8c8',
  };

  var GAME_TITLE = 'CRAY FLIP';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var CHARGE_TIME = 1.3;
  var BANK_Y = Math.round(H * 0.47);
  var WATER_Y = Math.round(H * 0.5);
  var BOTTOM_Y = Math.round(H * 0.75);
  var BAIT_X = 700, BAIT_Y = BOTTOM_Y - 40;
  var KID_X = 860;
  var BUCKET_R = 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var crab, bucketX, roundN, pressing, charge, maxBeep, kidPose, kidPoseT, caughtN, accurate, missed, gapT;
  var score, countIn, over, won, endT, prevBest, playT, stopT;

  function label(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }

  // 麦わら帽子の子ども: 待つ/溜める(のけぞる)/跳ね上げ/がっかり
  var KID = [
    ['..yyyyyy..', '.yyyyyyyy.', '...ssss...', '...sbsb...', '...ssss...', '..wwwwww..', '.swwwwwws.', '..wwwwww..', '..bbbbbb..', '..ss..ss..'],
    ['...yyyyyy.', '..yyyyyyyy', '....ssss..', '....sbsb..', '....ssss..', '...wwwwww.', '..swwwwws.', '.swwwwww..', '..bbbbbb..', '.ss...ss..'],
    ['s.yyyyyy.s', 's.yyyyyy.s', '.sssssss..', '..ssbsbs..', '...sOOs...', '..wwwwww..', '..wwwwww..', '..wwwwww..', '..bbbbbb..', '..ss..ss..'],
    ['..........', '..yyyyyy..', '.yyyyyyyy.', '...ssss...', '...sbsb...', '...sqqs...', '..wwwwww..', '.swwwwwws.', '..bbbbbb..', '..ss..ss..'],
  ];
  var KID_PAL = { y: '#f8d030', s: '#f8b878', b: '#000000', O: '#e83018', q: '#000000', w: '#f8f8f8' };
  // ザリガニ(横向き): 歩き2コマ/ハサミを開く/はさむ/丸まって飛ぶ
  var CRAB = [
    ['rr.......', 'r.r......', '.rrrrrrrr', 'r.rrerrrr', '.rrrrrrr.', '..r.r.r..'],
    ['rr.......', 'r.r......', '.rrrrrrrr', 'r.rrerrrr', '.rrrrrrr.', '.r.r.r.r.'],
    ['r.r......', '.........', 'r.rrrrrrr', 'r.rrerrrr', '.rrrrrrr.', '..r.r.r..'],
    ['.rr......', '.rrrrrrrr', '.rrrerrrr', '.rrrrrrr.', '.rrrrrr..', '..r.r.r..'],
    ['..rrrr...', '.rrrrrr..', 'rrerrrrr.', 'rrrrrrrr.', '.rrrrrr..', '..r..r...'],
  ];
  var CRAB_PAL = { r: '#e83018', e: '#000000' };

  function landX(c) { return BAIT_X - (60 + c * 640); }

  function newCrab() {
    roundN++;
    var k = Math.min(1, (roundN - 1) / 5);
    var fromRight = roundN % 3 !== 0;
    crab = {
      x: fromRight ? W + 60 : BAIT_X - 520, dir: fromRight ? -1 : 1, v: 210 + 120 * k + game.random(-20, 30),
      st: 'walk', t: 0, pauseAt: roundN >= 3 && Math.random() < 0.5 ? game.random(0.3, 0.6) : -1, paused: false,
      fx: 0, fy: 0, land: 0, grabWin: 0.6 - 0.15 * k,
    };
    bucketX = game.random(160, 560);
  }

  function resetRun() {
    roundN = 0; pressing = false; charge = 0; maxBeep = false; kidPose = 0; kidPoseT = 0; caughtN = 0; accurate = 0; missed = 0; gapT = 0;
    newCrab();
  }

  function initGame() {
    resetRun();
    score = 0; countIn = 0.8; over = false; won = false; endT = 0; prevBest = game.best; playT = 0; stopT = 0;
  }

  // ── 竿の操作(本番・デモ共通) ──
  function pressStart() { pressing = true; charge = 0; maxBeep = false; }

  function pressEnd() {
    if (!pressing) return 'none';
    pressing = false;
    var c = charge;
    charge = 0;
    if (crab.st === 'grab') {
      crab.st = 'fly'; crab.t = 0; crab.land = landX(Math.max(0.02, c)); crab.fx = BAIT_X; crab.fy = BAIT_Y;
      kidPose = 2; kidPoseT = 0.5;
      game.audio.play('se_jump', 0.5);
      game.fx.burst(BAIT_X, WATER_Y, { color: C.white, count: 12, speed: 300 });
      return 'flip';
    }
    if (crab.st === 'walk' || crab.st === 'open' || crab.st === 'pause') {
      // 早離し: 餌が跳ねてザリガニが後ずさる
      crab.st = 'startled'; crab.t = 0;
      game.feedback.bad(BAIT_X, BAIT_Y - 120, { text: 'MISS', shake: 0.04 });
      return 'early';
    }
    return 'idle';
  }

  function stepCrab(dt) {
    if (kidPoseT > 0) { kidPoseT -= dt; if (kidPoseT <= 0) kidPose = 0; }
    if (pressing) {
      charge = Math.min(1, charge + dt / CHARGE_TIME);
      if (charge >= 1 && !maxBeep) { maxBeep = true; game.audio.play('se_powerup', 0.3); }
    }
    if (!crab) return;
    crab.t += dt;
    if (crab.st === 'walk') {
      if (crab.pauseAt > 0 && !crab.paused && crab.t >= crab.pauseAt) { crab.paused = true; crab.st = 'pause'; crab.t = 0; return; }
      crab.x += crab.dir * crab.v * dt;
      var reach = crab.dir < 0 ? crab.x <= BAIT_X + 50 : crab.x >= BAIT_X - 50;
      if (reach) { crab.x = BAIT_X + (crab.dir < 0 ? 50 : -50); crab.st = 'open'; crab.t = 0; game.audio.tone(988, 0.04, { wave: 'square', volume: 0.07 }); }
    } else if (crab.st === 'pause' && crab.t >= 0.45) {
      crab.st = 'walk'; crab.t = crab.pauseAt + 0.01;
    } else if (crab.st === 'open' && crab.t >= 0.3) {
      crab.st = 'grab'; crab.t = 0;
      game.audio.tone(392, 0.08, { wave: 'square', volume: 0.1, slide: 120 });
      game.fx.burst(BAIT_X, BAIT_Y, { color: C.white, count: 6, speed: 160 });
    } else if (crab.st === 'grab' && crab.t >= crab.grabWin) {
      crab.st = 'leave'; crab.t = 0; missed++;
      game.feedback.bad(BAIT_X, BAIT_Y - 120, { text: 'MISS' });
    } else if (crab.st === 'startled') {
      crab.x -= crab.dir * 320 * dt;
      if (crab.t >= 0.5) { crab.st = 'walk'; crab.t = 0; crab.pauseAt = -1; }
    } else if (crab.st === 'fly') {
      var u = Math.min(1, crab.t / 0.7);
      crab.fx = BAIT_X + (crab.land - BAIT_X) * u;
      crab.fy = BAIT_Y + (BANK_Y - 20 - BAIT_Y) * u - Math.sin(u * Math.PI) * 520;
      if (u >= 1) landCrab();
    } else if (crab.st === 'back') {
      crab.fx += (BAIT_X - 150 - crab.fx) * Math.min(1, dt * 3);
      crab.fy += (WATER_Y + 60 - crab.fy) * Math.min(1, dt * 3);
      if (crab.t >= 0.7) nextRound();
    } else if (crab.st === 'caught' && crab.t >= 0.5) {
      nextRound();
    } else if (crab.st === 'leave') {
      crab.x += crab.dir * -260 * dt;
      if (crab.t >= 0.7) nextRound();
    }
  }

  function landCrab() {
    var d = Math.abs(crab.land - bucketX);
    if (d <= BUCKET_R) {
      crab.st = 'caught'; crab.t = 0;
      var res = d <= 25 ? 'PERFECT' : 'GOOD';
      var pts = 100 + Math.round((1 - d / BUCKET_R) * 100);
      if (state === S.PLAYING) { caughtN++; score += pts; if (res === 'PERFECT') accurate++; }
      game.audio.play('se_coin', 0.5);
      game.feedback.good(bucketX, BANK_Y - 200, { text: res + ' +' + pts, color: res === 'PERFECT' ? C.yellow : C.white, size: 52, count: 14 });
      if (state === S.PLAYING && caughtN === NEEDED - 1) { game.audio.play('se_milestone', 0.45); game.fx.popup(caughtN + '/' + NEEDED, W / 2, Math.round(H * 0.24), { color: C.yellow, size: 84 }); }
    } else {
      crab.st = 'back'; crab.t = 0; missed++;
      kidPose = 3; kidPoseT = 0.6;
      game.feedback.bad(crab.land, BANK_Y - 120, { text: 'MISS' });
    }
  }

  function nextRound() {
    crab = null; gapT = 0.25;
  }

  function stepWorld(dt) {
    if (!crab) {
      if (kidPoseT > 0) { kidPoseT -= dt; if (kidPoseT <= 0) kidPose = 0; }
      if (pressing) charge = Math.min(1, charge + dt / CHARGE_TIME);
      gapT -= dt;
      if (gapT <= 0) newCrab();
      return;
    }
    stepCrab(dt);
  }

  // ── 描画(8bit タイル) ──
  function drawTiles() {
    var t = game.time.elapsed;
    game.draw.gradient(0, BANK_Y - 340, [[0, '#3c94e0'], [1, C.sky]]);
    // 雲タイル(一方向にゆっくり流れる)
    for (var c = 0; c < 5; c++) {
      var cx = ((c * 260 + t * 30) % (W + 240)) - 120;
      game.draw.rect(cx, 300 + (c % 2) * 50, 160, 32, C.white);
      game.draw.rect(cx + 32, 268 + (c % 2) * 50, 96, 32, C.white);
    }
    // 遠くの木の帯
    for (var tr = 0; tr < 14; tr++) game.draw.rect(tr * 80, BANK_Y - 340 + (tr % 2) * 16, 64, 48, '#1a7a28');
    // 岸の草タイル(市松)
    for (var y = BANK_Y - 300; y < BANK_Y + 20; y += 48) {
      for (var x = 0; x < W; x += 48) {
        game.draw.rect(x, y, 48, 48, ((x + y) / 48) % 2 === 0 ? C.grass : C.grassHi);
      }
    }
    // 水(横に流れる波タイル)
    game.draw.rect(0, WATER_Y - 30, W, BOTTOM_Y - WATER_Y + 30, C.water);
    for (var wy = WATER_Y; wy < BOTTOM_Y; wy += 96) {
      for (var wx = -96; wx < W + 96; wx += 96) {
        var sx = wx + ((t * 40) % 96);
        game.draw.rect(sx, wy, 48, 8, '#4a9ae8');
      }
    }
    game.draw.rect(0, WATER_Y - 30, W, 12, '#7ac0f8');
    // 池の底(泥レンガタイル)
    for (var by = BOTTOM_Y; by < H; by += 48) {
      for (var bx = (by / 48) % 2 ? -24 : 0; bx < W; bx += 48) {
        game.draw.rect(bx, by, 46, 46, C.mud);
        game.draw.rect(bx, by, 46, 8, '#d89858');
      }
    }
    // 葦
    for (var r = 0; r < 6; r++) game.draw.rect(40 + r * 190, WATER_Y - 120 - (r % 2) * 40, 16, 160, '#1a7a28');
  }

  function drawBucket() {
    var x = bucketX, y = BANK_Y;
    game.draw.rect(x - BUCKET_R, y - 110, BUCKET_R * 2, 110, C.tin);
    game.draw.rect(x - BUCKET_R, y - 110, BUCKET_R * 2, 16, C.white);
    game.draw.rect(x - BUCKET_R + 16, y - 80, 16, 64, '#d0e0f0');
    // 入れた数ぶんのザリガニの頭
    for (var i = 0; i < Math.min(4, caughtN); i++) game.draw.sprite(CRAB[4], CRAB_PAL, x - 40 + i * 26, y - 118, 4, { anchor: 'center' });
  }

  function drawRodAndLine() {
    var bend = pressing ? charge : 0;
    var hx = KID_X - 20, hy = BANK_Y - 120;
    var tipX = BAIT_X + bend * 60, tipY = BANK_Y - 240 + bend * 150;
    var mx = (hx + tipX) / 2 + bend * 40, my = (hy + tipY) / 2 - 80 + bend * 120;
    game.draw.line(hx, hy, mx, my, '#a06020', 10);
    game.draw.line(mx, my, tipX, tipY, '#a06020', 7);
    var baitY = BAIT_Y;
    if (crab && crab.st === 'startled' && crab.t < 0.2) baitY -= 60;
    if (crab && crab.st === 'grab') baitY += Math.sin(game.time.elapsed * 40) * 6;
    game.draw.line(tipX, tipY, BAIT_X, baitY, C.white, 3);
    // スルメの餌
    game.draw.rect(BAIT_X - 16, baitY - 8, 32, 40, '#f0e0b0');
    // 溜めた力の弧(落ちる所を示す点線)
    if (pressing && charge > 0.03) {
      var L = landX(charge);
      for (var k = 1; k <= 14; k++) {
        var u = k / 14;
        var px = BAIT_X + (L - BAIT_X) * u, py = BAIT_Y + (BANK_Y - 20 - BAIT_Y) * u - Math.sin(u * Math.PI) * 520;
        game.draw.rect(px - 6, py - 6, 12, 12, C.yellow);
      }
      var inB = Math.abs(L - bucketX) <= BUCKET_R;
      game.draw.rect(L - 24, BANK_Y - 26, 48, 12, inB ? C.yellow : C.red);
    }
  }

  function drawCrab() {
    if (!crab) return;
    var t = game.time.elapsed;
    if (crab.st === 'fly' || crab.st === 'back' || crab.st === 'caught') {
      if (crab.st === 'caught') return;
      game.draw.sprite(CRAB[4], CRAB_PAL, crab.fx, crab.fy, 9, { anchor: 'center', flipY: crab.st === 'fly' && Math.floor(t * 10) % 2 === 0 });
      return;
    }
    var fr = CRAB[Math.floor(t * 8) % 2];
    if (crab.st === 'open') fr = CRAB[2];
    else if (crab.st === 'grab') fr = CRAB[3];
    else if (crab.st === 'pause') fr = CRAB[0];
    // ザリガニは頭(ハサミ)を進む向きへ
    game.draw.sprite(fr, CRAB_PAL, crab.x, BAIT_Y + 10, 10, { anchor: 'center', flipX: crab.dir > 0 });
    if (crab.st === 'grab') game.draw.circle(BAIT_X, BAIT_Y, 70 + Math.sin(t * 30) * 8, C.white, 0.35);
    if (crab.st === 'open') game.draw.circle(BAIT_X, BAIT_Y, 60, C.yellow, 0.25);
  }

  function drawKid() {
    var t = game.time.elapsed;
    var pose = pressing ? 1 : kidPose;
    if (over && won) pose = 2;
    if (over && !won) pose = 3;
    var bob = pose === 0 ? Math.sin(t * 3) * 4 : 0;
    game.draw.sprite(KID[pose], KID_PAL, KID_X, BANK_Y - 90 + bob, 12, { anchor: 'center' });
  }

  function drawWorld() { drawTiles(); drawBucket(); drawRodAndLine(); drawCrab(); drawKid(); }

  function hud() {
    label(String(score), 190, 110, 64, C.white);
    label(caughtN + ' / ' + NEEDED, W - 190, 110, 56, C.yellow);
    var timeBar = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(60, 168, W - 120, 16, C.black);
    game.draw.rect(60, 168, (W - 120) * timeBar, 16, timeBar < 0.25 ? C.red : C.yellow);
    // 竿のしなりゲージ
    game.draw.rect(KID_X + 80, BANK_Y - 260, 24, 200, C.black);
    game.draw.rect(KID_X + 80, BANK_Y - 60 - 200 * charge, 24, 200 * charge, charge >= 1 ? C.red : C.yellow);
  }

  // ── 入力: 押し続けて溜め、離して跳ね上げ ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || countIn > 0 || stopT > 0) return;
    pressStart();
    game.audio.tone(330, 0.05, { wave: 'square', volume: 0.06 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over || stopT > 0) { pressing = false; return; }
    var r = pressEnd();
    if (r === 'idle') { game.audio.play('se_tap', 0.08); game.fx.burst(BAIT_X, WATER_Y, { color: C.white, count: 4, speed: 120 }); }
  });

  // ── ATTRACT: 実ロジックで、歩く速さから逆算して押し始め、はさんだ瞬間に離してバケツへ → 2匹目は押し始めが遅れて手前に落ちる ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.82, n: 0 };
  function demoStep(dt) {
    demo.t += dt;
    if (demo.t <= dt) { resetRun(); bucketX = 330; demo.n = 0; crab.pauseAt = -1; crab.v = 260; }
    if (crab && crab.st === 'walk' && !pressing) {
      // 到着までの時間と必要な溜めを比べて押し始める
      var dist = Math.abs(crab.x - (BAIT_X + (crab.dir < 0 ? 50 : -50)));
      var arrive = dist / crab.v + 0.3 + 0.08;
      var need = (BAIT_X - 60 - bucketX) / 640 * CHARGE_TIME;
      if (demo.n === 1) need *= 0.45;
      if (arrive <= need) pressStart();
    }
    if (crab && crab.st === 'grab' && pressing && crab.t >= 0.08) { pressEnd(); demo.n++; }
    stepWorld(dt);
    if (!crab && demo.n >= 2 && gapT < 0.05) { demo.t = 0; }
    if (crab && demo.n === 1 && crab.st === 'walk' && crab.t <= dt) { crab.v = 260; crab.pauseAt = -1; bucketX = 300; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (crab === undefined) initGame();
      demoStep(dt);
      drawWorld();
      game.draw.hand(demo.gx, demo.gy, { press: pressing, scale: 14 });
      label(GAME_TITLE, W / 2, 110, 92, C.yellow);
      label('HI-SCORE ' + game.best, W / 2, 180, 38, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1880, 44, C.yellow);
      else label('TAP TO START', W / 2, 1880, 42, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld();
      game.draw.rect(0, 250, W, 340, C.black, 0.6);
      label(won ? 'CLEAR' : 'TIME UP', W / 2, 345, 100, won ? C.yellow : C.red);
      label('SCORE ' + score, W / 2, 425, 58, C.white);
      label(caughtN + ' / ' + NEEDED + '  PERFECT ' + accurate, W / 2, 485, 40, C.white);
      if (score > prevBest && prevBest > 0) label('NEW RECORD', W / 2, 555, 52, C.yellow);
      else label('BEST ' + Math.max(prevBest, score), W / 2, 555, 42, C.white);
      if (!won) label('あと' + Math.max(1, NEEDED - caughtN) + '匹!', W / 2, 1520, 64, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1880, 40, C.white);
      return;
    }

    // ── PLAYING ──
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        state = S.RESULT;
        var stats = { caught: caughtN, perfect: accurate, missed: missed };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      // hit-stop: 時間切れの瞬間にバケツを白く光らせて止める
      stopT -= dt;
      if (stopT <= 0) { game.feedback.bad(bucketX, BANK_Y - 160, { text: 'TIME UP' }); over = true; won = false; finish(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.play('se_tap', 0.3);
    } else if (!over) {
      playT += dt;
      stepWorld(dt);
      if (caughtN >= NEEDED) {
        over = true; won = true; pressing = false;
        score += Math.round(Math.max(0, TIME_LIMIT - playT) * 40);
        finish();
      } else if (playT >= TIME_LIMIT) {
        stopT = 0.45; pressing = false;
        game.audio.tone(220, 0.2, { wave: 'square', volume: 0.1, slide: -80 });
      }
    }

    drawWorld();
    if (stopT > 0) { game.draw.rect(bucketX - BUCKET_R - 16, BANK_Y - 130, BUCKET_R * 2 + 32, 140, C.white, 0.6); }
    hud();
    if (countIn > 0) label(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, Math.round(H * 0.62), 120, C.yellow);
  });

  function finish() {
    if (endT > 0) return;
    endT = 1.4;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) for (var i = 0; i < 7; i++) game.fx.burst(game.random(140, 940), game.random(400, 1200), { color: i % 2 ? C.yellow : C.red, count: 22, speed: 460 });
  }

  // 夏休みの池のうた(オリジナル)
  var TUNE = [
    ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
    ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 1],
  ];
  var TUNE_OPTS = { tempo: 140, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1]] };

  game.onStart(function() {
    game.audio.melody(TUNE, TUNE_OPTS);
    state = S.ATTRACT;
    initGame();
  });
})(game);
