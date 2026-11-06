// I-GBA-0051v2-straw-maze-bale-dash.js
// わら迷路かくれ走り — 走り続ける子どもが、鬼が目隠しを外す前に藁束の陰へ跳び込み、目を覆っている間に次の藁束まで駆け抜ける
// 操作: 子どもは自動で右へ走る。藁束の近く(足元が光る間)でタップすると陰に跳び込む。陰でもう一度タップすると飛び出して走る。藁束から遠い所のタップは空振りの小跳び
// 終わり: 出口の提灯門まで走り抜ければCLEAR。鬼の目が開いている間に陰の外にいたら見つかって、22秒で着かなければGAME OVER
// @mechanic: camera_run
// @theme: moonlit_straw_maze_hide_and_seek
// 世界観: 月夜の麦わら迷路で、かくれんぼの逃げ役の子どもが、見張り台で目を覆って数える鬼の目を盗み、藁束の陰から陰へ駆け抜けて出口の提灯門を目指す
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離・陰でやり過ごした回数・スコア
// スタイル: 8bit HOME

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  // 8bit HOME: 3〜4色+黒、輪郭線なしの粗いドット、背景はタイル反復、1方向スクロール
  var STYLE = { bg: ['#0a0f2e', '#1c2a6b'], main: ['#e8c04a', '#a8701e', '#f4f0d8'], accent: ['#e8483a', '#6ad0ff'] };
  var INK = '#000000';
  var STRAW = STYLE.main[0], STRAW_D = STYLE.main[1], MOON = STYLE.main[2], RED = STYLE.accent[0];

  var TITLE = 'STRAW SNEAK';
  var TIME_LIMIT = 22;
  var GOAL = 5000;           // 50m
  var LANE_Y = H * 0.6;      // 走路の地面
  var KID_SX = 300;          // 画面上の子どもの位置(カメラ追従)
  var REACH_BACK = 170, REACH_FWD = 30;

  var MODE = 'ATTRACT';
  var w = null;

  // ── スプライト ─────────────────────────────────────
  var KID_RUN_A = ['..hhhh..', '.hhhhhh.', '.hsssss.', '.sesses.', '..ssss..', '.rrrrrr.', 'r.rrrr.s', 's.rrrr..', '..bbbb..', '.bb..bb.', 'bb....b.', '.......b'];
  var KID_RUN_B = ['..hhhh..', '.hhhhhh.', '.hsssss.', '.sesses.', '..ssss..', '.rrrrrr.', 's.rrrr.r', '..rrrr.s', '..bbbb..', '..bbbb..', '..b..bb.', '.bb.....'];
  var KID_CROUCH = ['........', '........', '........', '..hhhh..', '.hhhhhh.', '.hsssss.', '.sesses.', 'srrrrrrs', '.rrrrrr.', '.bbbbbb.', 'bb....bb', '........'];
  var KID_CAUGHT = ['s..hh..s', 'r.hhhh.r', 'rhsssssr', '.sossos.', '..ssss..', '.rrrrrr.', '..rrrr..', '..rrrr..', '..bbbb..', '.bb..bb.', '.b....b.', 'bb....bb'];
  var KID_CHEER = ['s......s', 'rhhhhhhr', 'rhsssssr', '.sesses.', '..smms..', '.rrrrrr.', '..rrrr..', '..rrrr..', '..bbbb..', '.bb..bb.', 'bb....bb', '........'];
  var PAL_KID = { h: '#5a3a1a', s: '#f0b890', e: INK, o: INK, m: RED, r: STYLE.accent[1], b: '#3050c0' };
  var PAL_WHITE = { h: '#ffffff', s: '#ffffff', e: '#ffffff', o: '#ffffff', m: '#ffffff', r: '#ffffff', b: '#ffffff' };

  var ONI_COVER = ['...kkkkkk...', '..kkkkkkkk..', '..k.k..k.k..', '.ssssssssss.', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '..ssssssss..', '...smmmms...', '.ggggggggggg', 'gggggggggggg', 'gg.gggggg.gg', 'gg.gggggg.gg', '...gggggg...', '...pp..pp...', '...pp..pp...', '..ppp..ppp..'];
  var ONI_PEEK = ['...kkkkkk...', '..kkkkkkkk..', '..k.k..k.k..', '.ssssssssss.', '.sseessseess', '.hhhhhhhhhh.', '.hhhhhhhhhh.', '...smmmms...', '.ggggggggggg', 'gggggggggggg', 'gg.gggggg.gg', 'gg.gggggg.gg', '...gggggg...', '...pp..pp...', '...pp..pp...', '..ppp..ppp..'];
  var ONI_LOOK = ['...kkkkkk...', '..kkkkkkkk..', '..k.k..k.k..', '.ssssssssss.', '.sseessseess', '.sseessseess', '.ssssssssss.', '...smmmms...', 'hggggggggggh', 'hggggggggggh', 'hg.gggggg.gh', '.g.gggggg.g.', '...gggggg...', '...pp..pp...', '...pp..pp...', '..ppp..ppp..'];
  var PAL_ONI = { k: '#e8e8f0', s: '#f0b890', e: '#ffe860', h: '#f0b890', m: RED, g: RED, p: '#2a2a50' };

  var BALE = ['.yyyyyyyyyyyy.', 'yyYyyyYyyyYyyy', 'yyyyyyyyyyyyyy', 'dddddddddddddd', 'yyyYyyyyYyyyyy', 'yyyyyyyyyyyyyy', 'yYyyyyYyyyyyYy', 'dddddddddddddd', 'yyyyyYyyyyyYyy', 'yyyyyyyyyyyyyy', '.dddddddddddd.'];
  var PAL_BALE = { y: STRAW, Y: '#fff0a0', d: STRAW_D };
  var PAL_BALE_HOT = { y: '#fff4b0', Y: '#ffffff', d: STRAW };
  var LANTERN = ['..kk..', '.rrrr.', 'rryyrr', 'ryyyyr', 'rryyrr', '.rrrr.', '..kk..'];
  var PAL_LANTERN = { k: '#303030', r: RED, y: '#ffe860' };
  var BANG = ['.rr.', '.rr.', '.rr.', '.rr.', '....', '.rr.'];

  // ── 世界 ───────────────────────────────────────────
  function makeBales(demo) {
    var out = [];
    if (demo) { out.push(950); out.push(2350); out.push(3600); return out; }
    var x = 700;
    while (x < GOAL - 300) {
      out.push(x);
      x += 420 + Math.floor(game.random(0, 420));
    }
    return out;
  }

  function freshWorld(demo) {
    return {
      demo: !!demo, kidX: 0, speed: 520, hidden: false, baleIdx: -1, hop: 0, diveAge: 9, act: 0,
      bales: makeBales(demo),
      eye: 'closed', eyeT: demo ? 1.4 : 2.4, cycle: 0, fakeAt: -1, fakeT: 0,
      clock: TIME_LIMIT, phase: 'ready', readyT: 0.8, stopT: 0, won: false, why: '',
      score: 0, hides: 0, perfects: 0, half: false, botMiss: false,
    };
  }

  function initGame() { w = freshWorld(false); }

  function closedDur() {
    if (w.demo) return 1.4;
    return Math.max(1.15, 2.4 - w.cycle * 0.2) + game.random(-0.25, 0.25);
  }

  function baleInReach() {
    for (var i = 0; i < w.bales.length; i++) {
      var d = w.kidX - w.bales[i];
      if (d > -REACH_BACK && d < REACH_FWD) return i;
    }
    return -1;
  }

  // ── 行動(本番とデモで共通) ─────────────────────────
  function act() {
    if (w.phase !== 'run') return 'none';
    w.act = 0.2;
    if (w.hidden) {
      w.hidden = false; w.baleIdx = -1;
      game.audio.play('se_tap', 0.35);
      game.fx.burst(KID_SX, LANE_Y - 40, { color: STRAW, count: 6, speed: 220 });
      return 'out';
    }
    var b = baleInReach();
    if (b >= 0) {
      w.hidden = true; w.baleIdx = b; w.kidX = w.bales[b]; w.diveAge = 0;
      game.audio.tone('D5', 0.08, { wave: 'square', volume: 0.08, slide: -260 });
      game.fx.burst(KID_SX, LANE_Y - 30, { color: STRAW, count: 10, speed: 260 });
      return 'dive';
    }
    w.hop = 0.35;
    game.audio.play('se_jump', 0.25);
    return 'hop';
  }

  function caught(why) {
    w.phase = 'stop'; w.stopT = 0.55; w.won = false; w.why = why;
    game.fx.flash('#ffffff', 0.12);
    game.audio.play('se_break', 0.4);
  }

  function eyesOpen() {
    w.eye = 'open'; w.eyeT = w.demo ? 1.0 : Math.min(1.4, 1.0 + w.cycle * 0.05);
    game.audio.tone('A3', 0.18, { wave: 'square', volume: 0.08 });
    if (!w.hidden) { caught('seen'); return; }
    w.hides++;
    var perfect = w.diveAge < 0.45;
    if (perfect) w.perfects++;
    var pts = perfect ? 300 : 120;
    w.score += pts;
    game.feedback.good(KID_SX, LANE_Y - 170, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? STYLE.accent[1] : '#ffffff', size: 46 });
  }

  function advance(dt) {
    if (w.act > 0) w.act -= dt;
    if (w.hop > 0) w.hop -= dt;
    if (w.fakeT > 0) w.fakeT -= dt;
    w.diveAge += dt;
    if (!w.demo) w.clock -= dt;

    // 鬼の目の周期: 目隠し(closed) → 予告(warn 0.7s) → 目が開く(open)
    w.eyeT -= dt;
    if (w.eye === 'closed') {
      if (w.fakeAt > 0 && w.eyeT < w.fakeAt) { w.fakeAt = -1; w.fakeT = 0.4; game.audio.tone('E3', 0.1, { wave: 'triangle', volume: 0.06 }); }
      if (w.eyeT <= 0) {
        w.eye = 'warn'; w.eyeT = 0.7;
        game.audio.tone('C5', 0.6, { wave: 'square', volume: 0.06, slide: 500 });
      }
    } else if (w.eye === 'warn') {
      if (w.eyeT <= 0) { eyesOpen(); if (w.phase !== 'run') return; }
    } else if (w.eye === 'open') {
      if (!w.hidden) { caught('seen'); return; }
      if (w.eyeT <= 0) {
        w.eye = 'closed'; w.cycle++; w.eyeT = closedDur();
        w.fakeAt = (!w.demo && w.cycle >= 2 && game.random(0, 1) < 0.7) ? game.random(0.6, Math.max(0.7, w.eyeT - 0.5)) : -1;
        game.audio.tone('G4', 0.12, { wave: 'triangle', volume: 0.06 });
      }
    }

    if (!w.hidden) {
      w.speed = 520 + Math.min(1, w.kidX / GOAL) * 140;
      w.kidX += w.speed * dt;
    }
    if (!w.half && w.kidX >= GOAL / 2 && !w.demo) {
      w.half = true;
      game.fx.popup('25m', KID_SX + 120, LANE_Y - 260, { color: STRAW, size: 56 });
      game.audio.play('se_milestone', 0.4);
    }
    if (w.kidX >= GOAL && !w.demo) {
      w.kidX = GOAL; w.phase = 'stop'; w.stopT = 0.7; w.won = true;
      game.fx.burst(KID_SX, LANE_Y - 80, { color: '#ffe860', count: 30, speed: 500 });
      return;
    }
    if (w.clock <= 0) { w.clock = 0; caught('time'); }
  }

  function settle() {
    var dist = Math.floor(w.kidX / 100);
    var stats = { meters: dist, hides: w.hides, perfect: w.perfects };
    if (w.won) {
      w.score += 500 + Math.round(w.clock * 50);
      game.feedback.good(KID_SX, LANE_Y - 200, { text: 'CLEAR', color: '#ffe860', size: 66 });
      game.audio.play('se_success', 0.6);
      game.end.success(w.score, stats);
    } else {
      game.feedback.bad(KID_SX, LANE_Y - 200, { text: w.why === 'time' ? 'TIME UP' : 'MISS', size: 60 });
      game.audio.play('se_failure', 0.6);
      game.end.failure(stats);
    }
    MODE = 'RESULT';
  }

  // ── 描画 ───────────────────────────────────────────
  function sx(worldX) { return KID_SX + (worldX - w.kidX); }
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H * 0.45, [STYLE.bg[0], STYLE.bg[1]]);
    for (var i = 0; i < 26; i++) {
      var x = (i * 211) % W, y = 250 + (i * 97) % 380;
      if (Math.floor(t * 2 + i) % 5 !== 0) game.draw.rect(snap(x), snap(y), 8, 8, MOON, 0.7);
    }
    game.draw.circle(W * 0.82, 330, 150, MOON, 0.08);
    game.draw.circle(W * 0.82, 330, 90, MOON);
    game.draw.circle(W * 0.79, 312, 18, '#d8d4bc');
  }

  function drawOni() {
    var t = game.time.elapsed;
    var x = W / 2, y = H * 0.3;
    // 見張り台
    game.draw.rect(x - 150, y + 120, 300, 24, STRAW_D);
    game.draw.rect(x - 130, y + 144, 16, 260, STRAW_D);
    game.draw.rect(x + 114, y + 144, 16, 260, STRAW_D);
    for (var r = 0; r < 4; r++) game.draw.rect(x - 130, y + 180 + r * 60, 260, 8, STRAW_D);
    var art = w.eye === 'open' ? ONI_LOOK : w.eye === 'warn' && w.eyeT < 0.45 ? ONI_PEEK : ONI_COVER;
    var tilt = w.fakeT > 0 ? Math.sin(t * 40) * 14 : 0;
    var bob = w.eye === 'closed' ? Math.round(Math.sin(t * 6)) * 6 : 0;
    game.draw.sprite(art, PAL_ONI, x + tilt, y + bob, 14, { anchor: 'center' });
    if (w.eye === 'warn' && Math.floor(t * 10) % 2 === 0) game.draw.sprite(BANG, { r: RED }, x + 140, y - 110, 14, { anchor: 'center' });
    if (w.eye === 'open') {
      game.draw.circle(x - 28, y - 30, 30, '#ffe860', 0.35);
      game.draw.circle(x + 42, y - 30, 30, '#ffe860', 0.35);
    }
  }

  function drawGaze() {
    if (w.eye !== 'open') return;
    var ex = W / 2, ey = H * 0.3 - 30;
    for (var x = 0; x <= W; x += 54) {
      var endY = LANE_Y;
      for (var i = 0; i < w.bales.length; i++) {
        var bx = sx(w.bales[i]);
        if (x > bx - 80 && x < bx + 80) endY = LANE_Y - 120;
      }
      game.draw.line(ex, ey, x, endY, '#ffb070', 3);
    }
    game.draw.rect(0, LANE_Y - 140, W, 160, '#ff9060', 0.08);
  }

  function drawWalls(layer) {
    var top = layer === 0 ? H * 0.45 : LANE_Y + 70;
    var hgt = layer === 0 ? LANE_Y - 130 - H * 0.45 : H * 0.8 - LANE_Y - 70;
    var par = layer === 0 ? 0.6 : 1.25;
    game.draw.rect(0, top, W, hgt, layer === 0 ? STRAW_D : STRAW);
    var off = -((w.kidX * par) % 64);
    for (var y = top; y < top + hgt; y += 32) {
      var row = Math.floor((y - top) / 32);
      for (var x = off + (row % 2) * 32 - 64; x < W + 64; x += 64) {
        game.draw.rect(snap(x), y, 32, 16, layer === 0 ? '#8a5a18' : '#fff0a0', layer === 0 ? 0.6 : 0.35);
      }
    }
  }

  function drawLane() {
    game.draw.rect(0, LANE_Y - 130, W, 200, '#3a2a18');
    var off = -(w.kidX % 96);
    for (var x = off; x < W; x += 96) game.draw.rect(snap(x), LANE_Y + 20, 40, 8, '#5a4228');
  }

  function drawBales() {
    var t = game.time.elapsed;
    var reach = w.hidden ? -1 : baleInReach();
    for (var i = 0; i < w.bales.length; i++) {
      var bx = sx(w.bales[i]);
      if (bx < -200 || bx > W + 200) continue;
      var hot = i === reach && w.phase === 'run';
      if (hot) game.draw.rect(bx - 100, LANE_Y - 14, 200, 18, '#ffffff', 0.35 + 0.3 * Math.sin(t * 14));
      game.draw.sprite(BALE, hot ? PAL_BALE_HOT : PAL_BALE, bx, LANE_Y - 70, 11, { anchor: 'center' });
    }
    var gx = sx(GOAL);
    if (gx > -200 && gx < W + 200) {
      game.draw.rect(gx - 120, LANE_Y - 320, 20, 330, '#8a2a20');
      game.draw.rect(gx + 100, LANE_Y - 320, 20, 330, '#8a2a20');
      game.draw.rect(gx - 140, LANE_Y - 340, 280, 28, RED);
      game.draw.circle(gx, LANE_Y - 240, 70, '#ffe860', 0.15 + 0.1 * Math.sin(t * 5));
      game.draw.sprite(LANTERN, PAL_LANTERN, gx, LANE_Y - 240, 14, { anchor: 'center' });
    }
  }

  function drawKid() {
    var t = game.time.elapsed;
    var stop = w.phase === 'stop';
    var art;
    if (stop && w.won) art = KID_CHEER;
    else if (stop || (MODE === 'RESULT' && !w.won)) art = KID_CAUGHT;
    else if (w.hidden) art = KID_CROUCH;
    else art = Math.floor(t * 10) % 2 ? KID_RUN_A : KID_RUN_B;
    var hopY = w.hop > 0 ? Math.sin((w.hop / 0.35) * Math.PI) * 70 : 0;
    var jumpY = stop && w.won ? Math.abs(Math.sin(t * 12)) * 40 : 0;
    var hl = stop && !w.won && w.stopT > 0;
    var px = hl ? 15 : 11;
    var y = LANE_Y - 66 - hopY - jumpY + (w.hidden ? 12 : 0);
    game.draw.rect(KID_SX - 40, LANE_Y - 4, 80, 10, INK, 0.4);
    game.draw.sprite(art, hl ? PAL_WHITE : PAL_KID, KID_SX, y, px, { anchor: 'center' });
    if (hl && w.why === 'seen') game.draw.line(W / 2, H * 0.3 - 30, KID_SX, y, '#ffe860', 8);
  }

  function drawMap() {
    var y = H * 0.87, x0 = 120, x1 = W - 120;
    game.draw.rect(0, H * 0.8, W, H * 0.2, '#101838');
    game.draw.rect(x0, y - 4, x1 - x0, 8, '#3a4a8a');
    for (var i = 0; i < w.bales.length; i++) game.draw.rect(x0 + (x1 - x0) * (w.bales[i] / GOAL) - 8, y - 16, 16, 16, STRAW);
    game.draw.sprite(LANTERN, PAL_LANTERN, x1, y - 6, 5, { anchor: 'center' });
    var kx = x0 + (x1 - x0) * Math.min(1, w.kidX / GOAL);
    game.draw.circle(kx, y, 18, STYLE.accent[1]);
    game.draw.circle(kx, y, 26, '#ffffff', 0.25 + 0.2 * Math.sin(game.time.elapsed * 8));
  }

  function label(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function drawStage() {
    drawSky();
    drawWalls(0);
    drawOni();
    drawLane();
    drawGaze();
    drawBales();
    drawKid();
    drawWalls(1);
    drawMap();
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, INK, 0.12);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, INK, 0.55);
    label('SCORE ' + w.score, W * 0.3, 70, 40, '#ffffff');
    label('あと' + Math.max(0, Math.ceil((GOAL - w.kidX) / 100)) + 'm', W * 0.75, 70, 40, STRAW);
    var frac = Math.max(0, w.clock / TIME_LIMIT);
    game.draw.rect(80, 130, W - 160, 20, '#202a5a');
    game.draw.rect(80, 130, (W - 160) * frac, 20, frac < 0.2 ? RED : STYLE.accent[1]);
    var progress = Math.min(1, w.kidX / GOAL);
    game.draw.rect(80, 176, W - 160, 12, '#202a5a');
    game.draw.rect(80, 176, (W - 160) * progress, 12, STRAW);
  }

  // ── ATTRACT(実ロジック + ボット) ───────────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.66, press: 0, round: 0 };
  var DEMO_CYCLE = 6.4;
  function runDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { w = freshWorld(true); w.phase = 'run'; demo.round = 0; }
    if (demo.press > 0) demo.press -= dt;
    if (w.phase === 'run') {
      // 1周目: 予告を見て藁束へ跳び込む(成功例) / 2周目: 跳び込みそびれる(失敗例)
      var reach = baleInReach();
      if (!w.hidden && w.eye === 'warn' && reach >= 0 && w.cycle === 0) { act(); demo.press = 0.25; }
      else if (w.hidden && w.eye === 'closed' && w.eyeT < 1.2) { act(); demo.press = 0.25; }
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0 && !w.demoShown) { w.demoShown = true; game.feedback.bad(KID_SX, LANE_Y - 200, { text: 'MISS', size: 56 }); }
    }
    demo.gx += (KID_SX + 40 - demo.gx) * Math.min(1, dt * 5);
    demo.gy += (H * 0.66 - demo.gy) * Math.min(1, dt * 5);
  }

  function begin() {
    initGame();
    MODE = 'PLAYING';
    game.audio.play('se_coin', 0.5);
  }

  game.onTap(function (x, y) {
    if (MODE === 'ATTRACT') { begin(); return; }
    if (MODE === 'RESULT') { MODE = 'ATTRACT'; initGame(); demo.t = 0; game.audio.play('se_tap', 0.3); return; }
    var r = act();
    if (r === 'none') game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function (dt) {
    if (!w) initGame();
    if (MODE === 'ATTRACT') {
      runDemo(dt);
      drawStage();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 14 });
      game.draw.rect(0, 0, W, 230, INK, 0.55);
      label(TITLE, W / 2, 95, 76, STRAW);
      label('HI-SCORE ' + game.best, W / 2, 178, 34, '#ffffff');
      if (Math.floor(game.time.elapsed * 1.6) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.955, 42, STRAW);
      else label('INSERT COIN', W / 2, H * 0.955, 36, '#ffffff');
      return;
    }
    if (MODE === 'RESULT') {
      drawStage();
      game.draw.rect(0, H * 0.06, W, H * 0.22, INK, 0.75);
      label(w.won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.11, 86, w.won ? '#ffe860' : RED);
      label('SCORE ' + w.score, W / 2, H * 0.17, 48, '#ffffff');
      label(Math.floor(w.kidX / 100) + 'm   ' + w.hides + '回   PERFECT ' + w.perfects, W / 2, H * 0.21, 34, STYLE.accent[1]);
      if (!w.won) label('あと' + Math.max(1, Math.ceil((GOAL - w.kidX) / 100)) + 'm!', W / 2, H * 0.255, 44, STRAW);
      else if (w.score > game.best) label('NEW RECORD', W / 2, H * 0.255, 46, STRAW);
      else label('BEST ' + game.best, W / 2, H * 0.255, 40, '#ffffff');
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.955, 36, '#ffffff');
      return;
    }
    if (w.phase === 'ready') {
      w.readyT -= dt;
      if (w.readyT <= 0) { w.phase = 'run'; game.audio.play('se_tap', 0.3); }
    } else if (w.phase === 'run') {
      advance(dt);
    } else if (w.phase === 'stop') {
      w.stopT -= dt;
      if (w.stopT <= 0) settle();
    }
    drawStage();
    drawHud();
    if (w.phase === 'ready') {
      label(w.readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.47, 96, STRAW);
      game.draw.hand(sx(w.bales[0]) - 40, LANE_Y + 40, { press: false, scale: 12, alpha: 0.7 });
    }
  });

  game.onStart(function () {
    // 夜の迷路をそっと走る、跳ねる三連の旋律
    game.audio.melody([
      ['E4', 0.5], ['G4', 0.25], ['A4', 0.25], ['G4', 0.5], ['E4', 0.5], ['D4', 0.5], ['E4', 0.25], ['G4', 0.25], ['A4', 1],
      ['C5', 0.5], ['A4', 0.25], ['G4', 0.25], ['E4', 0.5], ['D4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['E2', 2], ['F2', 2], ['G2', 2]], bassVolume: 0.06 });
    MODE = 'ATTRACT';
    initGame();
    demo.t = 0;
  });
})(game);
