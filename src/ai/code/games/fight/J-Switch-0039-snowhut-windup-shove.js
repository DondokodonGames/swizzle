// J-Switch-0039-snowhut-windup-shove.js
// 番屋のぜんまい押し相撲 — 自分のぜんまい人形のねじを「ちょうどの回数」だけ巻いて放し、相手の人形を飯台の端から押し落とす
// 操作: 下のねじをタップするたびに1回巻ける(1回=1マス歩く)。右のレバーか自分の人形をタップで放す。相手の頭のおもりが2個なら、押して1マス進むのに2回ぶん要る。巻き足りないと押し切れず、巻きすぎると相手を落とした勢いで自分も落ちる(社内メモ。画面には出さない)
// 終わり: 4体押し落とせばCLEAR。予備の人形3体を失う/25秒でTIME UPならGAME OVER。巻かずに3秒待つと相手が先に突っ込んでくる、巻いて2.5秒放さないと自動で放す
// @mechanic: count_exact
// @theme: snowbound_hut_windup_sumo
// 世界観: 吹雪で漁に出られない浜の番屋で、網元の孫娘が囲炉裏端の飯台を土俵に、手作りのぜんまい人形のねじをちょうどの回数だけ巻いて、漁師たちがおもりを背負わせた人形を一体ずつ飯台の端から押し落とす
// 残るもの: 正誤(CLEAR/GAME OVER) + 押し落とした数・ぴったり連続数・失った人形の数のスコア
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 限定6色の大きなドット、差し色は焚き火のオレンジ1色だけ
  var STYLE = { bg: ['#1d2340', '#2c3358'], main: ['#8a5a3a', '#f2e6c8', '#5a6a8a'], accent: ['#ff6a2a', '#ffffff'] };
  var C = {
    night: '#1d2340', wall: '#2c3358', wood: '#8a5a3a', woodD: '#5e3a24', cream: '#f2e6c8', slate: '#5a6a8a',
    hot: '#ff6a2a', white: '#ffffff', ink: '#10132a', good: '#9ae6a0', bad: '#ff6a2a'
  };

  var GAME_TITLE = 'WIND-UP SUMO';
  var TIME_LIMIT = 25;
  var NEEDED = 4;
  var LIVES = 3;
  var CW = 100;
  var X0 = 100;
  var TURN_DT = 0.17;
  var AUTO_RELEASE = 2.5;
  var CHARGE_WAIT = 3.0;
  var MAX_TURNS = 16;
  var TABLE_Y = Math.round(H * 0.52);
  var KEY_Y = Math.round(H * 0.84);
  var TOP_Y = Math.round(H * 0.07);
  var MID_Y = Math.round(H * 0.33);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var E, r0, w, p, q, pDraw, qDraw, k, spent, pushAcc, phase, phaseT, idleT, sinceTap, rivalOff, meFall, rivFall, pushedLeft;
  var wins, lives, timeLeft, ready, hitStop, finished, ok, endWait, score, streak, bestStreak, keyAnim, bestAtStart, snow, halfShown, chargeWarned;

  var DOLL = [
    ['...hhhh...', '..hhhhhh..', '..ffffff..', '..fefeef..', '..ffffff..', '.rrrrrrrr.', 'rrrccccrrr', '.rccccccr.', '..cccccc..', '..cc..cc..', '..bb..bb..'],
    ['...hhhh...', '..hhhhhh..', '..ffffff..', '..fefeef..', '..ffffff..', '.rrrrrrrr.', 'rrrccccrrr', '.rccccccr.', '..cccccc..', '...cc.cc..', '...bb.bb..']
  ];
  var ME_PAL = { h: '#3a2a20', f: '#f2d0a8', e: '#10132a', r: '#ff6a2a', c: '#f2e6c8', b: '#5e3a24' };
  var RIV_PAL = { h: '#2a2a2a', f: '#e8c8a0', e: '#10132a', r: '#5a6a8a', c: '#9aa8c8', b: '#2c3358' };
  var SINKER = ['.ss.', 'ssss', 'ssss', '.ss.'];
  var KEY = [
    ['.kkk......kkk.', 'kk.kk....kk.kk', 'kk.kkkkkkkk.kk', 'kk.kk....kk.kk', '.kkk..kk..kkk.', '......kk......', '......kk......', '......kk......'],
    ['......kk......', '....kkkkkk....', '...kk.kk.kk...', '....kkkkkk....', '......kk......', '......kk......', '......kk......', '......kk......']
  ];
  var FISHER = ['..hhhh..', '.hhhhhh.', '..ffff..', '.cccccc.', 'cccccccc'];
  var BUCKET = ['wwwwwwwwww', '.bwwwwwwb.', '.bbbbbbbb.', '.bbbbbbbb.', '..bbbbbb..'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function cellX(c) { return X0 + c * CW + CW / 2; }
  function edgeX() { return X0 + (E + 1) * CW; }
  function needTurns() { return (r0 - 1) + w * (E - r0 + 1); }

  function newBout(layout) {
    if (layout) { E = layout[0]; r0 = layout[1]; w = layout[2]; }
    else {
      E = Math.floor(game.random(5, 7.99));
      r0 = Math.floor(game.random(2, Math.min(4, E - 1) + 0.99));
      w = wins >= 2 ? 2 : 1;
    }
    p = 0; q = r0; pDraw = 0; qDraw = r0;
    k = 0; spent = 0; pushAcc = 0;
    phase = 'wind'; phaseT = 0; idleT = 0; sinceTap = 0;
    rivalOff = false; meFall = null; rivFall = null; pushedLeft = false; chargeWarned = false;
  }

  function initGame() {
    wins = 0; lives = LIVES; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0;
    finished = false; ok = false; endWait = 0; score = 0; streak = 0; bestStreak = 0; keyAnim = 0; halfShown = false;
    bestAtStart = game.best || 0;
    snow = [];
    for (var i = 0; i < 26; i++) snow.push({ x: game.random(0, 360), y: game.random(0, 300), v: game.random(120, 260) });
    newBout();
  }

  // ── 共通ロジック(本番とデモで共用) ─────────────────────
  function windOnce() {
    if (finished || hitStop > 0 || ready > 0 || phase !== 'wind') return false;
    if (k >= MAX_TURNS) return false;
    k++; sinceTap = 0; keyAnim = 0.12;
    return true;
  }

  function release() {
    if (finished || hitStop > 0 || ready > 0 || phase !== 'wind' || k <= 0) return false;
    phase = 'walk'; phaseT = 0;
    return true;
  }

  function consumeTurn() {
    spent++;
    if (!rivalOff && p + 1 >= q) {
      pushAcc++;
      if (pushAcc >= w) { pushAcc = 0; p++; q++; }
      game.audio.tone(160 + pushAcc * 40, 0.05, { wave: 'square', volume: 0.05 });
    } else {
      p++;
      game.audio.tone(420 + spent * 25, 0.04, { wave: 'square', volume: 0.04 });
    }
    if (!rivalOff && q > E) {
      rivalOff = true;
      rivFall = { x: edgeX() + 30, y: TABLE_Y - 60, vy: -200 };
      game.audio.play('se_break', 0.35);
    }
    if (p > E) {
      meFall = { x: edgeX() + 30, y: TABLE_Y - 60, vy: -150 };
      boutMiss('over');
      return;
    }
    if (spent >= k) {
      if (rivalOff) boutWin();
      else boutMiss('weak');
    }
  }

  function boutWin() {
    wins++; streak++; bestStreak = Math.max(bestStreak, streak);
    score += 300 + streak * 100;
    phase = 'after'; phaseT = 0.9;
    game.feedback.good(cellX(Math.min(p, E)), TABLE_Y - 220, { text: 'PERFECT', color: C.good });
    if (streak >= 2) game.fx.popup('x' + streak, cellX(Math.min(p, E)) + 150, TABLE_Y - 300, { color: C.hot, size: 48 });
    if (!halfShown && wins === NEEDED / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup(wins + ' / ' + NEEDED, W / 2, MID_Y, { color: C.hot, size: 64 });
    }
  }

  function boutMiss(kind) {
    lives--; streak = 0;
    phase = 'after'; phaseT = 1.0;
    hitStop = 0.5;
    var fx = kind === 'weak' ? cellX(q) : kind === 'charged' ? X0 - 20 : edgeX();
    game.feedback.bad(fx, TABLE_Y - 200, { text: 'MISS', shake: 12 });
    if (kind === 'weak') game.fx.popup('あと' + (needTurns() - k) + '回', cellX(q), TABLE_Y - 300, { color: C.cream, size: 44 });
  }

  function stepBout(dt, countTime) {
    keyAnim = Math.max(0, keyAnim - dt);
    for (var i = 0; i < snow.length; i++) {
      var s = snow[i];
      s.y += s.v * dt; s.x += s.v * 0.6 * dt;
      if (s.y > 300) { s.y = 0; s.x = game.random(-100, 300); }
    }
    pDraw += (p - pDraw) * Math.min(1, dt * 14);
    qDraw += (q - qDraw) * Math.min(1, dt * 14);
    if (rivFall) { rivFall.vy += 2200 * dt; rivFall.y += rivFall.vy * dt; rivFall.x += 60 * dt; }
    if (meFall) { meFall.vy += 2200 * dt; meFall.y += meFall.vy * dt; meFall.x += (pushedLeft ? -60 : 60) * dt; }
    if (finished) return;
    if (hitStop > 0) { hitStop -= dt; return; }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
      return;
    }
    if (countTime) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, MID_Y, { text: 'TIME UP' });
        finish(false);
        return;
      }
    }
    if (phase === 'wind') {
      sinceTap += dt;
      if (k === 0) {
        idleT += dt;
        if (idleT > CHARGE_WAIT - 0.7 && !chargeWarned) {
          chargeWarned = true;
          game.audio.tone(990, 0.1, { wave: 'square', volume: 0.06 });
        }
        if (idleT >= CHARGE_WAIT) {
          // 相手が先に突っ込んでくる
          pushedLeft = true;
          q = 1;
          meFall = { x: X0 - 30, y: TABLE_Y - 60, vy: -150 };
          boutMiss('charged');
        }
      } else if (sinceTap >= AUTO_RELEASE) {
        release();
        game.audio.play('se_jump', 0.3);
      }
    } else if (phase === 'walk') {
      phaseT += dt;
      while (phase === 'walk' && phaseT >= TURN_DT) {
        phaseT -= TURN_DT;
        consumeTurn();
      }
    } else if (phase === 'after') {
      phaseT -= dt;
      if (phaseT <= 0) {
        if (lives <= 0) { finish(false); return; }
        if (wins >= NEEDED) { finish(true); return; }
        newBout(state === S.ATTRACT ? DEMO_LAYOUTS[1] : null);
      }
    }
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win; endWait = 1.3;
    if (win) score += Math.round(timeLeft * 60) + lives * 200;
    if (state !== S.PLAYING) return;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.flash(C.hot, 0.2);
      game.fx.burst(W / 2, MID_Y, { color: C.hot, count: 32, speed: 520 });
    } else game.audio.play('se_failure', 0.6);
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawRoom() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.night], [0.5, C.wall], [1, '#141830']]);
    // 板壁
    for (var x = 0; x < W; x += 120) game.draw.rect(x, 230, 6, TABLE_Y - 230, C.night, 1);
    // 吹雪の窓
    game.draw.rect(640, 250, 360, 300, C.cream, 1);
    game.draw.rect(652, 262, 336, 276, '#3a4a78', 1);
    for (var i = 0; i < snow.length; i++) {
      var s = snow[i];
      if (s.x < 0 || s.x > 330) continue;
      game.draw.rect(655 + s.x, 262 + s.y * 0.9, 8, 8, C.white, 1);
    }
    game.draw.rect(815, 262, 10, 276, C.cream, 1);
    // 吊るした網(ゆれる)
    for (var n = 0; n < 6; n++) {
      var sx = 90 + n * 80 + Math.sin(t * 1.2 + n) * 6;
      game.draw.line(90 + n * 80, 240, sx, 520, C.slate, 4);
      game.draw.line(sx, 300 + n * 30, sx + 80, 300 + n * 30 + Math.sin(t + n) * 8, C.slate, 3);
    }
    // 見物の漁師たち(演出のみ、常時bob)
    for (var f = 0; f < 5; f++) {
      var fb = Math.abs(Math.sin(t * 3 + f * 1.3)) * -10;
      game.draw.sprite(FISHER, { h: C.slate, f: C.cream, c: C.woodD }, 140 + f * 200, 1370 + fb, 16, { anchor: 'center' });
    }
    // 囲炉裏の火(差し色)
    var fl = 0.5 + 0.3 * Math.sin(t * 9) + 0.2 * Math.sin(t * 13);
    game.draw.circle(W / 2, 1450, 150, C.hot, 0.15 * fl + 0.08);
    game.draw.rect(0, 0, W, H, C.hot, 0.02 + 0.02 * Math.sin(t * 2));
  }

  function drawTable() {
    var t = game.time.elapsed;
    var ex = edgeX();
    game.draw.rect(X0 - 40, TABLE_Y, ex - X0 + 40, 40, C.wood, 1);
    game.draw.rect(X0 - 40, TABLE_Y, ex - X0 + 40, 8, '#b07a50', 1);
    game.draw.rect(X0 - 40, TABLE_Y + 40, ex - X0 + 40, 20, C.woodD, 1);
    game.draw.rect(X0, TABLE_Y + 60, 30, 240, C.woodD, 1);
    game.draw.rect(ex - 60, TABLE_Y + 60, 30, 240, C.woodD, 1);
    // マスの刻み
    for (var c = 0; c <= E; c++) {
      game.draw.rect(X0 + c * CW + 4, TABLE_Y, CW - 8, 12, c % 2 ? '#c89060' : '#e0b080', 1);
      game.draw.rect(X0 + c * CW + CW / 2 - 6, TABLE_Y + 18, 12, 12, C.cream, 0.9);
    }
    for (var c2 = 0; c2 <= E + 1; c2++) game.draw.rect(X0 + c2 * CW - 3, TABLE_Y, 6, 36, C.woodD, 1);
    // 端(危険): 赤いトゲ印
    var blink = phase === 'walk' && Math.floor(t * 10) % 2 === 0;
    for (var e = 0; e < 5; e++) {
      game.draw.rect(ex - 8, TABLE_Y + 2 + e * 14, 16, 8, C.bad, blink ? 1 : 0.7);
      game.draw.rect(ex + 8, TABLE_Y + 4 + e * 14, 8, 4, C.bad, blink ? 1 : 0.7);
    }
    game.draw.rect(X0 - 48, TABLE_Y, 8, 40, C.bad, 0.5);
    // 落ちた先の餌バケツ
    game.draw.sprite(BUCKET, { w: '#7ab0e0', b: C.slate }, Math.min(W - 70, ex + 90), TABLE_Y + 280, 14, { anchor: 'center' });
  }

  function drawDolls(hl) {
    var t = game.time.elapsed;
    var walking = phase === 'walk';
    var f = walking ? Math.floor(t * 10) % 2 : 0;
    // 相手
    if (!rivalOff || !rivFall || rivFall.y < TABLE_Y + 260) {
      var rx = rivFall ? rivFall.x : cellX(qDraw);
      var ry = rivFall ? rivFall.y : TABLE_Y - 58 + Math.sin(t * 3) * 3;
      var sway = rivFall ? 0 : Math.sin(t * 2.1) * 4;
      game.draw.sprite(DOLL[chargeWarned && phase === 'wind' ? Math.floor(t * 12) % 2 : f], RIV_PAL, rx + sway, ry, 10, { anchor: 'center', flipX: true });
      for (var s = 0; s < w; s++) game.draw.sprite(SINKER, { s: '#c8ccd8' }, rx + sway, ry - 74 - s * 38, 10, { anchor: 'center' });
      if (chargeWarned && phase === 'wind' && k === 0) {
        var bl = Math.floor(t * 12) % 2 === 0;
        game.draw.rect(rx - 8, ry - 220, 16, 50, bl ? C.bad : C.white, 1);
        game.draw.rect(rx - 8, ry - 160, 16, 14, bl ? C.bad : C.white, 1);
      }
    }
    // 自分
    if (!meFall || meFall.y < TABLE_Y + 260) {
      var mx = meFall ? meFall.x : cellX(pDraw);
      var my = meFall ? meFall.y : TABLE_Y - 58 + (walking ? -Math.abs(Math.sin(t * 20)) * 8 : Math.sin(t * 2.6) * 3);
      var msw = meFall ? 0 : Math.sin(t * 1.7) * 3;
      game.draw.sprite(DOLL[f], ME_PAL, mx + msw, my, 10, { anchor: 'center' });
      if (hl) game.draw.sprite(DOLL[f], { h: C.white, f: C.white, e: C.white, r: C.white, c: C.white, b: C.white }, mx, my, 12, { anchor: 'center', alpha: 0.7 });
      // 背中のぜんまい: 残り巻き数の粒
      var left = phase === 'walk' ? k - spent : k;
      for (var i = 0; i < left; i++) game.draw.rect(mx - 60 + (i % 8) * 16, my - 90 - Math.floor(i / 8) * 18, 12, 12, C.hot, 1);
      if (phase === 'walk' && pushAcc > 0) game.draw.circle(mx + 55, my - 20, 14, C.cream, 0.8);
    }
  }

  function drawControls() {
    var t = game.time.elapsed;
    game.draw.rect(0, 1440, W, H - 1440, '#141830', 1);
    game.draw.rect(0, 1440, W, 6, C.slate, 1);
    // ねじ(巻く)
    var active = phase === 'wind' && !finished && hitStop <= 0;
    var glow = active ? 0.25 + 0.15 * Math.sin(t * 6) : 0.05;
    game.draw.circle(360, KEY_Y, 190, C.hot, glow);
    game.draw.circle(360, KEY_Y, 170, C.wall, 1);
    game.draw.sprite(KEY[keyAnim > 0 ? 1 : 0], { k: C.cream }, 360 + Math.sin(t * 2) * 4, KEY_Y + Math.sin(t * 3) * 4, 16, { anchor: 'center' });
    txt(String(k), 360, KEY_Y - 190, 72, C.hot);
    // レバー(放す)
    var canGo = active && k > 0;
    game.draw.rect(820, KEY_Y - 150, 40, 260, C.slate, 1);
    game.draw.circle(840, KEY_Y - 150 + (canGo ? Math.sin(t * 8) * 10 : 0), 60, canGo ? C.hot : C.slate, 1);
    game.draw.circle(840, KEY_Y - 150 + (canGo ? Math.sin(t * 8) * 10 : 0), 60, C.white, canGo ? 0.25 : 0.05);
    // 自動で放すまでの残り(縮むバー)
    if (phase === 'wind' && k > 0) {
      var kk = Math.max(0, 1 - sinceTap / AUTO_RELEASE);
      game.draw.rect(600, KEY_Y + 150, 380, 16, C.night, 1);
      game.draw.rect(600, KEY_Y + 150, 380 * kk, 16, C.cream, 1);
    }
  }

  function drawHud() {
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(DOLL[0], i < wins ? { h: C.slate, f: C.slate, e: C.night, r: C.slate, c: C.slate, b: C.slate } : RIV_PAL, 80 + i * 90, 110, 6, { anchor: 'center' });
      if (i < wins) game.draw.line(50 + i * 90, 80, 110 + i * 90, 140, C.hot, 6);
    }
    txt(wins + ' / ' + NEEDED, 470, 130, 44, C.cream);
    for (var l = 0; l < LIVES; l++) game.draw.sprite(DOLL[0], l < lives ? ME_PAL : { h: C.slate, f: C.slate, e: C.night, r: C.slate, c: C.slate, b: C.slate }, W - 80 - l * 80, 110, 6, { anchor: 'center' });
    var lowTime = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 190, W - 120, 16, C.night, 1);
    game.draw.rect(60, 190, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 16, lowTime ? C.bad : C.cream, 1);
  }

  // ── ATTRACTデモ(実ロジック): 1戦目はぴったりで勝ち、2戦目は1回巻きすぎて落ちる ──
  var DEMO_LAYOUTS = [[5, 2, 1], [6, 3, 1]];
  var DEMO_CYC = 6.2;
  var demo = { t: 0, gx: 360, gy: KEY_Y, press: false, cool: 0, bout: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0; lives = 9;
      newBout(DEMO_LAYOUTS[0]);
      demo.bout = 0; demo.cool = 0.3;
    }
    demo.cool -= dt;
    demo.press = false;
    if (phase === 'wind' && hitStop <= 0) {
      demo.bout = wins > 0 || lives < 9 ? 1 : 0;
      var goal = needTurns() + (demo.bout === 1 ? 1 : 0);
      if (demo.cool <= 0) {
        if (k < goal) {
          if (windOnce()) { game.audio.tone(500 + k * 30, 0.04, { wave: 'square', volume: 0.04 }); demo.gx = 360; demo.gy = KEY_Y; demo.press = true; }
          demo.cool = 0.13;
        } else {
          demo.gx = 840; demo.gy = KEY_Y - 150; demo.press = true;
          release();
          demo.cool = 0.3;
        }
      }
    }
    stepBout(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    var onLever = x > W * 0.64 && y > H * 0.72;
    var onDoll = y < TABLE_Y + 40 && y > TABLE_Y - 220 && Math.abs(x - cellX(p)) < 90;
    if (onLever || onDoll) {
      if (release()) {
        game.audio.play('se_jump', 0.35);
        game.fx.burst(840, KEY_Y - 150, { color: C.hot, count: 8, speed: 200 });
      } else game.audio.play('se_tap', 0.1);
      return;
    }
    if (windOnce()) {
      game.audio.tone(500 + k * 30, 0.05, { wave: 'square', volume: 0.07 });
      game.fx.burst(360, KEY_Y, { color: C.cream, count: 4, speed: 150 });
    } else {
      game.audio.play('se_tap', 0.1);
    }
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (snow === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawRoom(); drawTable(); drawDolls(hitStop > 0); drawControls();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var lb = Math.sin(game.time.elapsed * 2) * 6;
      txt(GAME_TITLE, W / 2, TOP_Y + lb, 76, C.hot);
      txt('HI-SCORE ' + (game.best || 0), W / 2, TOP_Y + 70, 34, C.cream);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H - 40, 44, C.hot);
      else txt('INSERT COIN', W / 2, H - 40, 38, C.cream);
      return;
    }

    if (state === S.RESULT) {
      drawRoom(); drawTable(); drawDolls(false);
      var t = game.time.elapsed;
      if (ok) {
        for (var s = 0; s < 6; s++) game.draw.rect(90 + s * 170, 0, 40, TABLE_Y, C.hot, 0.08 + 0.06 * Math.sin(t * 4 + s));
        txt('CLEAR', W / 2, MID_Y + Math.sin(t * 5) * 8, 120, C.hot);
      } else {
        txt('GAME OVER', W / 2, MID_Y, 100, C.bad);
        txt('あと' + (NEEDED - wins) + '体!', W / 2, MID_Y + 100, 56, C.cream);
      }
      txt('SCORE ' + score, W / 2, 1560, 56, C.cream);
      txt('x' + bestStreak, W / 2, 1640, 44, C.hot);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, 1730, 52, C.hot);
      else txt('BEST ' + bestAtStart, W / 2, 1730, 42, C.cream);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H - 40, 38, C.cream);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      stepBout(dt, false);
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { pushed: wins, lost: LIVES - lives, streak: bestStreak };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepBout(dt, true);
    }
    drawRoom(); drawTable(); drawDolls(hitStop > 0); drawControls(); drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y, 100, C.hot);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, MID_Y, 92, ok ? C.hot : C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['A4', 0.5], ['R', 1]
    ], { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['E2', 2], ['D2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
