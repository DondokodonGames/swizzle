// I-GBA-0032v2-veranda-pup-catch.js
// 縁側の子犬キャッチ — 放り上げられたおやつの弧の出だしから落ちる板を読み、子犬を一枚ずつ跳ねさせて先回りし口で受け止める
// 操作: 画面の左半分タップで子犬が板1枚ぶん左へ、右半分タップで右へ跳ぶ。おやつが口の高さまで落ちた時に真下にいれば食べる。遠い板ほど何回も跳ぶので、弧の出だしで落ちる先を読んで早く動き出す
// 終わり: 18秒以内に6個食べればCLEAR。床に3個落とす/時間切れでGAME OVER。投げ手は左右から交互に、だんだん速く低い弧や高い山なり、最後は2個同時に放る(投げる前に手が振りかぶる)
// @mechanic: trajectory
// @theme: summer_veranda_puppy_treat_catch
// 世界観: 真夏の縁側で、腹ぺこの子犬が家の人に左右から放り上げられるおやつの落ちる先を弧の出だしで読み、板の目を跳ね渡って先回りして口で受け止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 食べた数・落とした数・先回りでのPERFECT数・スコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 淡い背景に単色の丸い塊。真下に柔らかい楕円の影。当たり判定は見た目どおり
  var STYLE = { bg: ['#fdf6ea', '#f4e4cc'], main: ['#f2a65a', '#e8d2b0', '#7cc4e4'], accent: ['#ff6b6b', '#ffffff'] };
  var PUP = STYLE.main[0], DECK = STYLE.main[1], SKY = STYLE.main[2], RED = STYLE.accent[0];
  var INK = '#5a4632';

  var LOGO = 'PUP CATCH';
  var NEEDED = 6;
  var DROP_MAX = 3;
  var TIME_LIMIT = 18;
  var GRAV = 1800;

  var LANES = 7;
  var FLOOR_Y = H * 0.7;
  var MOUTH_Y = FLOOR_Y - 120;
  var HOP_T = 0.16;
  function laneX(i) { return W * (0.14 + i * 0.12); }

  var THROWS = [
    [{ side: -1, lane: 3, T: 1.6 }],
    [{ side: 1, lane: 1, T: 1.5 }],
    [{ side: -1, lane: 5, T: 1.4 }],
    [{ side: 1, lane: 2, T: 1.25 }],
    [{ side: -1, lane: 6, T: 1.7 }],
    [{ side: 1, lane: 0, T: 1.15 }],
    [{ side: -1, lane: 1, T: 1.2 }, { side: 1, lane: 5, T: 1.75 }],
    [{ side: 1, lane: 4, T: 1.1 }],
    [{ side: -1, lane: 2, T: 1.05 }],
  ];

  var S = { ATTRACT: 'a', PLAYING: 'p', RESULT: 'r' };
  var state = S.ATTRACT;

  // ── スプライト: 丸い子犬(待機 / 口を開ける / もぐもぐ / しょんぼり) ──
  var PUPPY = [
    ['.EE......EE.', 'EEE......EEE', 'EBBBBBBBBBBE', '.BBBBBBBBBB.', 'BBKBBBBBBKBB', 'BBBBBBBBBBBB', 'BBBBBNNBBBBB', 'BBBBMBBMBBBB', '.BBBBBBBBBB.', '..BBBBBBBB..'],
    ['.EE......EE.', 'EEE......EEE', 'EBBBBBBBBBBE', '.BBBBBBBBBB.', 'BBKBBBBBBKBB', 'BBBBBBBBBBBB', 'BBBBBNNBBBBB', 'BBBBRRRRBBBB', '.BBBRRRRBBB.', '..BBBBBBBB..'],
    ['.EE......EE.', 'EEE......EEE', 'EBBBBBBBBBBE', '.BBBBBBBBBB.', 'BKKBBBBBBKKB', 'BBBBBBBBBBBB', 'BBBBBNNBBBBB', 'BBBMMMMMMBBB', '.BBBBBBBBBB.', '..BBBBBBBB..'],
    ['............', '.EE......EE.', 'EEBBBBBBBBEE', '.BBBBBBBBBB.', 'BBBKBBBBKBBB', 'BBBBBBBBBBBB', 'BBBBBNNBBBBB', 'BBBBBMMBBBBB', '.BBBBBBBBBB.', '..BBBBBBBB..'],
  ];
  var PUP_PAL = { E: '#b8743a', B: PUP, K: INK, N: '#3a2a1e', M: '#3a2a1e', R: RED };
  var TREAT = ['.BBBB.', 'BBDBBB', 'BBBBDB', 'BDBBBB', 'BBBBBB', '.BBBB.'];
  var TREAT_PAL = { B: '#c8843a', D: '#8a5426' };
  var ARM = ['..SSSS', '.SSSSS', 'SSSSSS', 'YYYY..', 'YYYY..', 'YYYY..'];
  var ARM_PAL = { S: '#f4c8a0', Y: '#7cc4e4' };

  // ── 中庭モデル(本番・デモ共通) ──
  function makeCourt() { return { lane: 3, from: 3, hop: 0, treats: [], chew: 0, sad: 0, wind: [] }; }
  function pupX(C) {
    if (C.hop <= 0) return laneX(C.lane);
    var k = 1 - C.hop / HOP_T;
    return laneX(C.from) + (laneX(C.lane) - laneX(C.from)) * k;
  }
  function pupLift(C) { return C.hop > 0 ? Math.sin((1 - C.hop / HOP_T) * Math.PI) * 50 : 0; }
  function hop(C, dir) {
    var to = Math.max(0, Math.min(LANES - 1, C.lane + dir));
    if (to === C.lane) return false;
    C.from = C.lane;
    C.lane = to; C.hop = HOP_T;
    return true;
  }
  function windUp(C, spec) { C.wind.push({ spec: spec, t: 0.55 }); }
  function launchTreat(C, spec) {
    var x0 = spec.side < 0 ? W * 0.02 : W * 0.98, y0 = H * 0.3;
    var xL = laneX(spec.lane), T = spec.T;
    C.treats.push({ x0: x0, y0: y0, vx: (xL - x0) / T, vy: (MOUTH_Y - y0 - 0.5 * GRAV * T * T) / T, t: 0, T: T, lane: spec.lane, state: 'fly', land: 0, waitSince: -1, trail: [] });
  }
  function treatPos(tr, t) { return { x: tr.x0 + tr.vx * t, y: tr.y0 + tr.vy * t + 0.5 * GRAV * t * t }; }
  // 1フレーム。戻り値: イベント配列 [{kind:'throw'|'catch'|'drop', ...}]
  function stepCourt(C, dt) {
    var out = [];
    if (C.hop > 0) C.hop = Math.max(0, C.hop - dt);
    if (C.chew > 0) C.chew -= dt;
    if (C.sad > 0) C.sad -= dt;
    for (var w = C.wind.length - 1; w >= 0; w--) {
      C.wind[w].t -= dt;
      if (C.wind[w].t <= 0) { launchTreat(C, C.wind[w].spec); out.push({ kind: 'throw' }); C.wind.splice(w, 1); }
    }
    for (var i = C.treats.length - 1; i >= 0; i--) {
      var tr = C.treats[i];
      if (tr.state === 'fly') {
        var prevT = tr.t;
        tr.t += dt;
        var p = treatPos(tr, tr.t);
        tr.trail.push({ x: p.x, y: p.y });
        if (tr.trail.length > 10) tr.trail.shift();
        var near = Math.abs(pupX(C) - laneX(tr.lane)) < 50 && C.hop <= 0;
        if (near && tr.waitSince < 0) tr.waitSince = tr.t;
        if (!near) tr.waitSince = -1;
        if (prevT < tr.T && tr.t >= tr.T) {
          if (Math.abs(pupX(C) - p.x) < 60) {
            C.treats.splice(i, 1); C.chew = 0.45;
            out.push({ kind: 'catch', x: p.x, y: p.y, early: tr.waitSince >= 0 && tr.T - tr.waitSince > 0.4 });
            continue;
          }
        }
        if (p.y >= FLOOR_Y - 18) { tr.state = 'floor'; tr.land = 0; tr.fx = p.x; C.sad = 0.6; out.push({ kind: 'drop', x: p.x, y: FLOOR_Y - 18, tr: tr }); }
      } else {
        tr.land += dt;
        if (tr.land > 0.9) C.treats.splice(i, 1);
      }
    }
    return out;
  }
  function airborne(C) {
    var n = C.wind.length;
    for (var i = 0; i < C.treats.length; i++) if (C.treats[i].state === 'fly') n++;
    return n;
  }

  // ── 描画 ──
  function blob(x, y, rx, ry, col, a) {
    var step = 4;
    for (var yy = -ry; yy < ry; yy += step) {
      var t = (yy + step / 2) / ry;
      var hw = rx * Math.sqrt(Math.max(0, 1 - t * t));
      game.draw.rect(x - hw, y + yy, hw * 2, step, col, a);
    }
  }
  function softShadow(x, y, r) {
    blob(x, y, r * 1.15, r * 0.24, '#8a6a4a', 0.08);
    blob(x, y, r * 0.85, r * 0.17, '#8a6a4a', 0.12);
    blob(x, y, r * 0.55, r * 0.11, '#8a6a4a', 0.14);
  }

  function drawVeranda() {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.62, STYLE.bg[1]], [1, '#ead4b4']]);
    // 軒先の空と風鈴
    game.draw.rect(0, 240, W, H * 0.16, SKY, 0.35);
    blob(W * 0.25, 330, 120, 40, '#ffffff', 0.7);
    blob(W * 0.72, 300, 90, 30, '#ffffff', 0.6);
    var sw = Math.sin(game.time.elapsed * 2.2) * 10;
    game.draw.line(W * 0.5, 240, W * 0.5 + sw * 0.3, 300, INK, 3);
    blob(W * 0.5 + sw * 0.3, 318, 30, 26, '#bfe6f6', 0.95);
    game.draw.line(W * 0.5 + sw * 0.3, 344, W * 0.5 + sw, 400, INK, 2);
    game.draw.rect(W * 0.5 + sw - 12, 400, 24, 44, '#ffffff', 0.95);
    // 柱
    game.draw.rect(W * 0.04, 240, 40, FLOOR_Y - 240, '#d8b88e');
    game.draw.rect(W * 0.92, 240, 40, FLOOR_Y - 240, '#d8b88e');
    // 縁側の床(板の目=着地の区切り)
    blob(W * 0.5, FLOOR_Y + 70, W * 0.62, 90, '#c9a87e', 0.25);
    game.draw.rect(0, FLOOR_Y, W, 110, DECK);
    game.draw.rect(0, FLOOR_Y, W, 10, '#f6e6cc');
    for (var i = 0; i <= LANES; i++) {
      var x = W * (0.08 + i * 0.12);
      game.draw.rect(x - 2, FLOOR_Y + 10, 4, 100, '#c9a87e', 0.8);
    }
    game.draw.rect(0, FLOOR_Y + 110, W, 30, '#c9a87e');
  }

  function drawThrowers(C) {
    for (var s = -1; s <= 1; s += 2) {
      var winding = false;
      for (var w = 0; w < C.wind.length; w++) if (C.wind[w].spec.side === s) winding = true;
      var lift = winding ? -60 - Math.sin(game.time.elapsed * 30) * 8 : 0;
      var x = s < 0 ? W * 0.06 : W * 0.94;
      game.draw.sprite(ARM, ARM_PAL, x, H * 0.33 + lift, 14, { anchor: 'center', flipX: s > 0 });
      if (winding) {
        game.draw.circle(x + s * -70, H * 0.27 + lift, 22, RED, 0.85);
        game.draw.rect(x + s * -70 - 4, H * 0.27 + lift - 14, 8, 18, '#ffffff');
        game.draw.rect(x + s * -70 - 4, H * 0.27 + lift + 8, 8, 6, '#ffffff');
      }
    }
  }

  function drawTreats(C, hlTr, hk) {
    for (var i = 0; i < C.treats.length; i++) {
      var tr = C.treats[i];
      if (tr.state === 'fly') {
        for (var j = 0; j < tr.trail.length; j++) game.draw.circle(tr.trail[j].x, tr.trail[j].y, 6 + j, '#c8843a', 0.06 + j * 0.03);
        var p = treatPos(tr, tr.t);
        softShadow(p.x, FLOOR_Y + 4, 40 * (0.5 + 0.5 * (p.y / FLOOR_Y)));
        game.draw.sprite(TREAT, TREAT_PAL, p.x, p.y, 10, { anchor: 'center' });
      } else {
        softShadow(tr.fx, FLOOR_Y + 4, 34);
        game.draw.sprite(TREAT, TREAT_PAL, tr.fx, FLOOR_Y - 18, 10, { anchor: 'center' });
        if (tr === hlTr) game.draw.circle(tr.fx, FLOOR_Y - 18, 40 + hk * 100, '#ffffff', 0.7 * (1 - hk) + 0.2);
      }
    }
  }

  function drawPuppy(C, mood) {
    var x = pupX(C), lift = pupLift(C);
    var anyNear = false;
    for (var i = 0; i < C.treats.length; i++) {
      var tr = C.treats[i];
      if (tr.state === 'fly' && tr.T - tr.t < 0.35 && Math.abs(laneX(tr.lane) - x) < 80) anyNear = true;
    }
    var fr = mood === 'sad' || C.sad > 0 ? 3 : (C.chew > 0 || mood === 'joy' ? 2 : (anyNear ? 1 : 0));
    var hopJoy = mood === 'joy' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 50 : 0;
    var breathe = Math.sin(game.time.elapsed * 4) * 3;
    softShadow(x, FLOOR_Y + 6, 90 - lift * 0.4);
    game.draw.sprite(PUPPY[fr], PUP_PAL, x, FLOOR_Y - 70 - lift - hopJoy + breathe, 14, { anchor: 'center' });
    // しっぽ
    var wag = Math.sin(game.time.elapsed * (C.chew > 0 ? 30 : 10)) * 16;
    blob(x + 88, FLOOR_Y - 60 - lift - hopJoy + wag * 0.3, 16, 12, '#b8743a', 1);
  }

  function drawPads(pressL, pressR) {
    for (var s = 0; s < 2; s++) {
      var on = s === 0 ? pressL : pressR;
      var x = s === 0 ? W * 0.25 : W * 0.75, y = H * 0.85;
      softShadow(x, y + 110, 150);
      blob(x, y + (on ? 10 : 0), 190, 120, on ? '#ffffff' : '#f6e6cc', 1);
      blob(x, y + (on ? 10 : 0), 170, 100, on ? '#fff3d6' : DECK, 1);
      // 肉球
      game.draw.circle(x, y + 20 + (on ? 10 : 0), 44, PUP, 0.9);
      for (var t = 0; t < 3; t++) game.draw.circle(x - 50 + t * 50, y - 48 + (t === 1 ? -10 : 0) + (on ? 10 : 0), 20, PUP, 0.9);
      var ax = x + (s === 0 ? -130 : 130);
      game.draw.circle(ax, y, 16, INK, 0.5);
      game.draw.circle(ax + (s === 0 ? 28 : -28), y - 16, 10, INK, 0.5);
      game.draw.circle(ax + (s === 0 ? 28 : -28), y + 16, 10, INK, 0.5);
    }
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x, y + 5, { size: sz, color: '#d8b88e', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col || INK, bold: true, align: 'center' });
  }

  // ── 状態 ──
  var court, eaten, dropped, perfects, throwIdx, nextT, timeLeft, countIn, stop, over, won, endT, score, prevBest, padL, padR, celebT, tempoUp;

  function initGame() {
    court = makeCourt(); eaten = 0; dropped = 0; perfects = 0; throwIdx = 0; nextT = 0.2;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; padL = 0; padR = 0; celebT = 0; tempoUp = false;
  }

  function scheduleThrow() {
    var group = THROWS[throwIdx % THROWS.length];
    if (throwIdx >= THROWS.length) group = [{ side: game.random(0, 1) < 0.5 ? -1 : 1, lane: Math.floor(game.random(0, LANES)), T: game.random(1.0, 1.4) }];
    for (var g = 0; g < group.length; g++) windUp(court, group[g]);
    game.audio.tone('E6', 0.12, { wave: 'sine', volume: 0.06, slide: 400 });
    throwIdx++;
  }

  function haltThen(tr, after) { stop = { t: 0.42, max: 0.42, tr: tr, after: after }; }

  function handleEvents(list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.kind === 'throw') game.audio.play('se_jump', 0.2);
      else if (e.kind === 'catch') {
        eaten++;
        if (e.early) perfects++;
        score += e.early ? 150 : 100;
        game.feedback.good(e.x, e.y - 40, { text: e.early ? 'PERFECT' : 'GOOD', color: PUP, count: 16 });
        game.audio.play('se_coin', 0.3);
        if (eaten === 3) { game.fx.popup('3 / ' + NEEDED, W / 2, H * 0.24, { color: RED, size: 64 }); game.audio.play('se_milestone', 0.4); }
        if (eaten >= NEEDED) { won = true; wrapUp(); return; }
      } else if (e.kind === 'drop') {
        game.audio.play('se_tap', 0.3);
        (function (ev) {
          haltThen(ev.tr, function () {
            dropped++;
            game.feedback.bad(ev.x, ev.y - 40, { text: 'MISS', shake: 10 });
            if (dropped >= DROP_MAX) { won = false; wrapUp(); }
          });
        })(e);
        return;
      }
    }
  }

  // ── 入力 ──
  game.onPress(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.45); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (countIn > 0 || stop || over) { game.audio.tone('C4', 0.04, { wave: 'sine', volume: 0.05 }); return; }
    var dir = x < W / 2 ? -1 : 1;
    if (dir < 0) padL = 0.12; else padR = 0.12;
    if (hop(court, dir)) game.audio.tone(dir < 0 ? 'G5' : 'A5', 0.06, { wave: 'triangle', volume: 0.1, slide: 200 });
    else game.feedback.bad(pupX(court), FLOOR_Y - 160, { text: null, shake: 3, volume: 0.3 });
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4;
    if (won) score += Math.floor(timeLeft * 15) + (DROP_MAX - dropped) * 50;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash('#ffffff', 0.3);
  }

  function enterResult() {
    state = S.RESULT;
    var stats = { eaten: eaten, dropped: dropped, perfect: perfects, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT: 弧を見て右へ2回跳んで受け止め、次は動き出しが遅れて床に落とす ──
  var demo = { t: 0, C: null, plan: null, idx: 0, hx: W * 0.75, hy: H * 0.85, press: 0, hl: null, k: 0 };
  var DEMO_CYCLE = 4.4;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.C) {
      demo.C = makeCourt();
      demo.plan = [
        { at: 0.05, wind: { side: -1, lane: 5, T: 1.3 } },
        { at: 0.75, tap: 1 }, { at: 1.0, tap: 1 },
        { at: 2.05, wind: { side: 1, lane: 1, T: 1.1 } },
        { at: 3.3, tap: -1 }, { at: 3.5, tap: -1 },
      ];
      demo.idx = 0; demo.hl = null; demo.k = 0;
    }
    while (demo.idx < demo.plan.length && cyc >= demo.plan[demo.idx].at) {
      var a = demo.plan[demo.idx++];
      if (a.wind) windUp(demo.C, a.wind);
      if (a.tap) { hop(demo.C, a.tap); demo.press = 0.14; demo.hx = a.tap < 0 ? W * 0.25 : W * 0.75; }
    }
    if (demo.press > 0) demo.press -= dt;
    var evs = stepCourt(demo.C, dt);
    for (var i = 0; i < evs.length; i++) {
      if (evs[i].kind === 'catch') game.feedback.good(evs[i].x, evs[i].y - 40, { text: 'PERFECT', color: PUP, count: 10, volume: 0.2 });
      if (evs[i].kind === 'drop') { demo.hl = evs[i].tr; demo.k = 0; game.feedback.bad(evs[i].x, evs[i].y - 40, { text: 'MISS', volume: 0.15, shake: 3 }); }
    }
    if (demo.hl) demo.k = Math.min(1, demo.k + dt * 2);
    demo.hy = H * 0.85 + (demo.press > 0 ? 0 : -60);
  }

  function drawHud() {
    ink(eaten + ' / ' + NEEDED, W * 0.18, 92, 54);
    ink(String(score), W * 0.5, 92, 44, '#b8743a');
    for (var i = 0; i < DROP_MAX; i++) {
      var x = W * 0.74 + i * 72;
      blob(x, 92, 26, 26, i < dropped ? '#d8c8b8' : '#c8843a', 1);
      if (i < dropped) game.draw.line(x - 20, 72, x + 20, 112, RED, 6);
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 168, W - 140, 24, '#ead4b4');
    game.draw.rect(70, 168, (W - 140) * fr, 24, low ? RED : SKY);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawVeranda();
      drawThrowers(demo.C);
      drawTreats(demo.C, demo.hl, demo.k);
      drawPuppy(demo.C, '');
      drawPads(demo.press > 0 && demo.hx < W / 2, demo.press > 0 && demo.hx > W / 2);
      game.draw.hand(demo.hx, demo.hy, { press: demo.press > 0, scale: 15 });
      ink(LOGO, W / 2, H * 0.07, 84, PUP);
      ink('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 38);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', W / 2, H * 0.965, 44, RED);
      else ink('TAP TO START', W / 2, H * 0.965, 40);
      return;
    }

    if (state === S.RESULT) {
      drawVeranda();
      drawPuppy(court, won ? 'joy' : 'sad');
      drawPads(false, false);
      ink(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.22, 100, won ? PUP : RED);
      ink(eaten + ' / ' + NEEDED, W / 2, H * 0.29, 60);
      ink('SCORE ' + score, W / 2, H * 0.36, 50);
      if (won && score > prevBest) ink('NEW RECORD', W / 2, H * 0.42, 52, RED);
      else ink('BEST ' + Math.max(prevBest, score), W / 2, H * 0.42, 40);
      if (!won) ink('あと' + (NEEDED - eaten) + '個!', W / 2, H * 0.48, 56, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', W / 2, H * 0.965, 40);
      return;
    }

    // ── PLAYING ──
    if (padL > 0) padL -= dt;
    if (padR > 0) padR -= dt;
    var k = 0;
    if (over) {
      endT -= dt;
      stepCourt(court, 0);
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.3, H * 0.6), { color: game.random(0, 1) < 0.5 ? PUP : SKY, count: 14, speed: 420 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      k = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('C6', 0.12, { wave: 'triangle', volume: 0.1 });
    } else {
      timeLeft -= dt;
      if (!tempoUp && timeLeft < 5) { tempoUp = true; game.audio.melody(TUNE, { tempo: 168, wave: 'triangle', volume: 0.06, loop: true, bass: TUNE_BASS }); }
      if (airborne(court) === 0) {
        nextT -= dt;
        if (nextT <= 0) { scheduleThrow(); nextT = Math.max(0.25, 0.6 - throwIdx * 0.04); }
      }
      handleEvents(stepCourt(court, dt));
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0;
        haltThen(null, function () { game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); won = false; wrapUp(); });
      }
    }

    drawVeranda();
    drawThrowers(court);
    drawTreats(court, stop ? stop.tr : null, k);
    drawPuppy(court, over ? (won ? 'joy' : 'sad') : '');
    drawPads(padL > 0, padR > 0);
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 110, RED);
  });

  var TUNE = [['G5', 0.5], ['E5', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 1],
    ['F5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1], ['C5', 2]];
  var TUNE_BASS = [['C3', 2], ['A2', 2], ['F2', 2], ['G2', 2], ['F2', 2], ['G2', 2], ['C3', 4]];

  game.onStart(function () {
    game.audio.melody(TUNE, { tempo: 126, wave: 'triangle', volume: 0.06, loop: true, bass: TUNE_BASS });
    state = S.ATTRACT;
    initGame();
  });
})(game);
