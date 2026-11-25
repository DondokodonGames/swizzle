// I-3DS-0004v2-print-shop-card-register.js
// 版画工房の年賀刷り — 往復する台に乗ったはがきに、行きで朱の版、帰りで墨の版を落とし、枠と前の刷りに重ねる
// 操作: 画面をタップすると判が真下へ落ちる(落ちるまで一瞬かかる)。はがきは右へ流れて判の下を通り、奥で折り返して左へ戻る。行きは枠の中に朱を、帰りは先に押した朱の上に墨をぴったり重ねる
// 終わり: 5枚刷り終えた時点で失敗が2枚以下ならCLEAR。枠外れ・重ねずれ・押し忘れで3枚だめにするとGAME OVER
// @mechanic: drop_timing
// @theme: newyear_print_shop_register
// 世界観: 年の瀬の版画工房で、版画職人が往復する刷り台に乗って流れてくる年賀はがきに、行きは朱の日の出の版、帰りは墨の松の版を落として見当どおりに刷り重ねていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 刷り上がった枚数・ずれの少なさ(PERFECT数)
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // NEO-RETRO: 先に決めた限定パレット(和紙・木・墨)+差し色の朱だけ強く
  var STYLE = { bg: ['#2a2230', '#4a3a3a', '#8a6a4a'], main: ['#f2ead8', '#2a2a30', '#6a8a5a'], accent: ['#e8402a', '#f2c040'] };
  var C = {
    dark: STYLE.bg[0], wall: STYLE.bg[1], wood: STYLE.bg[2], paper: STYLE.main[0], sumi: STYLE.main[1], pine: STYLE.main[2],
    shu: STYLE.accent[0], gold: STYLE.accent[1], belt: '#3a3236', ok: '#8ad870',
  };

  var GAME_TITLE = 'NEW YEAR PRINT';
  var CARDS = 5, LIVES = 3;
  var TIME_LIMIT = 18;
  var SX = 540;
  var BELT_Y = Math.round(H * 0.6);
  var CW = 200, CH = 280;
  var DROP_T = 0.18, PRESS_T = 0.1, RISE_T = 0.2;
  var PERFECT_PX = 12, GOOD_PX = 40;
  var LEFT_X = 150, RIGHT_X = 930;

  // 1枚ごとの台の速さ(行き/帰り)。後半は帰りが速くなる
  var SPEEDS = [[560, 560], [620, 700], [660, 820], [700, 900], [760, 980]];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ci, card, stamp, ruined, done, perfects, score, readyT, over, won, outroT, stopT, focus, playT, beltOff, crumples, smudges, mood, milestone;

  function initGame() {
    ci = 0; ruined = 0; done = 0; perfects = 0; score = 0; readyT = 0.8; over = false; won = false; outroT = 0; stopT = 0; focus = null; playT = 0;
    beltOff = 0; crumples = []; smudges = []; mood = 0; milestone = false;
    stamp = { st: 'up', t: 0, block: 'shu' };
    newCard(0);
  }

  function newCard(i) {
    ci = i;
    var sp = SPEEDS[Math.min(i, SPEEDS.length - 1)];
    card = { x: LEFT_X - 40, dir: 1, v1: sp[0], v2: sp[1], phase: 'go', wait: 0, prints: [], passDone: false, ruined: false, out: 0 };
    stamp.block = 'shu';
  }

  function cardSpeed() { return card.phase === 'go' ? card.v1 : (card.phase === 'back' ? card.v2 : 0); }

  // 判を落とす(本番もデモも同じ)
  function dropStamp() {
    if (stamp.st !== 'up') { game.audio.tone(180, 0.03, { wave: 'triangle', volume: 0.04 }); return false; }
    stamp.st = 'drop'; stamp.t = 0;
    game.audio.tone(420, 0.06, { wave: 'square', volume: 0.06, slide: -200 });
    return true;
  }

  function contact(demo) {
    var under = card && !card.ruined && card.out === 0 && Math.abs(card.x - SX) < CW / 2 + 40 && (card.phase === 'go' || card.phase === 'back');
    game.fx.shake(4, 0.08);
    game.audio.tone(90, 0.1, { wave: 'sine', volume: 0.2, slide: -30 });
    if (!under || card.passDone) {
      smudges.push({ x: SX, a: 1 });
      game.feedback.bad(SX, BELT_Y - 160, { text: 'MISS', shake: 6 });
      if (card && !card.ruined && !card.passDone && Math.abs(card.x - SX) < CW / 2 + 120 && (card.phase === 'go' || card.phase === 'back')) ruinCard(demo, SX);
      return;
    }
    // 刷りの位置(はがきの中心からのずれ)
    var off = SX - card.x;
    var block = card.prints.length === 0 ? 'shu' : 'sumi';
    var ref = block === 'shu' ? 0 : card.prints[0].off;
    var err = Math.abs(off - ref);
    card.prints.push({ off: off, block: block, err: err });
    card.passDone = true;
    if (err <= GOOD_PX) {
      var perfect = err <= PERFECT_PX;
      if (perfect) perfects++;
      score += perfect ? 150 : 80;
      mood = 1;
      game.feedback.good(card.x + off, BELT_Y - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: block === 'shu' ? C.shu : C.paper, size: perfect ? 58 : 46 });
      if (block === 'sumi') {
        done++;
        if (!demo && done === 3 && !milestone) {
          milestone = true;
          game.fx.popup('x3', W / 2, H * 0.3, { color: C.gold, size: 72 });
          game.audio.play('se_milestone', 0.45);
        }
      }
    } else {
      ruinCard(demo, card.x + off);
    }
  }

  function ruinCard(demo, fx) {
    card.ruined = true;
    focus = { x: fx, y: BELT_Y };
    stopT = 0.4;
    mood = -1;
    game.feedback.bad(fx, BELT_Y - 160, { text: 'MISS', shake: demo ? 6 : 12 });
    game.audio.play('se_break', 0.3);
    if (!demo) {
      ruined++;
      if (ruined >= LIVES) { over = true; won = false; outroT = 1.4; game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  function stepStamp(dt, demo) {
    if (stamp.st === 'up') return;
    stamp.t += dt;
    if (stamp.st === 'drop' && stamp.t >= DROP_T) { stamp.st = 'press'; stamp.t = 0; contact(demo); }
    else if (stamp.st === 'press' && stamp.t >= PRESS_T) { stamp.st = 'rise'; stamp.t = 0; }
    else if (stamp.st === 'rise' && stamp.t >= RISE_T) { stamp.st = 'up'; stamp.t = 0; stamp.block = card && card.prints.length > 0 ? 'sumi' : 'shu'; }
  }

  // 台の往復。戻り値: 1枚終わったか
  function stepCard(dt, demo) {
    beltOff = (beltOff + cardSpeed() * card.dir * dt) % 60;
    if (card.ruined) {
      card.out += dt;
      return card.out > 0.45;
    }
    if (card.phase === 'go') {
      card.x += card.v1 * dt;
      if (!card.passDone && card.x > SX + CW / 2 + 70 && stamp.st === 'up') ruinCard(demo, card.x);
      else if (card.x >= RIGHT_X) { card.phase = 'turn'; card.wait = 0; game.audio.tone('G4', 0.08, { wave: 'square', volume: 0.06 }); }
    } else if (card.phase === 'turn') {
      card.wait += dt;
      if (card.wait >= 0.3) { card.phase = 'back'; card.dir = -1; card.passDone = false; }
    } else if (card.phase === 'back') {
      card.x -= card.v2 * dt;
      if (!card.passDone && card.x < SX - CW / 2 - 70 && stamp.st === 'up') ruinCard(demo, card.x);
      else if (card.x <= LEFT_X - 60 && card.passDone) { card.phase = 'exit'; card.wait = 0; game.audio.play('se_coin', 0.25); }
    } else if (card.phase === 'exit') {
      card.wait += dt;
      return card.wait > 0.25;
    }
    return false;
  }

  function finish(ok) {
    over = true; won = ok; outroT = 1.5;
    game.audio.stopBgm();
    if (ok) {
      mood = 2;
      game.audio.play('se_success', 0.55);
      game.fx.burst(W / 2, BELT_Y - 200, { color: C.shu, count: 30, speed: 440 });
      game.fx.burst(W / 2, BELT_Y - 200, { color: C.gold, count: 20, speed: 360 });
      game.fx.flash(C.paper, 0.2);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap'); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || readyT > 0 || stopT > 0) { game.audio.tone(160, 0.03, { wave: 'triangle', volume: 0.03 }); return; }
    if (dropStamp()) game.audio.play('se_tap', 0.2);
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.dark, bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  // 版の図柄(朱=日の出、墨=松と山)。12pxの大きいドット
  var SUN = ['..rrrr..', '.rrrrrr.', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..'];
  var PINE = ['...kk...', '..kkkk..', '.k.kk.k.', '...kk...', 'k..kk..k', 'kk.kk.kk', 'kkkkkkkk', '........'];
  var CRAFT_A = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.fe..ef.', '.ffmmff.', '..ffff..', 'aaaaaaaa', 'aaawwaaa', '.aaaaaa.', '.pp..pp.'];
  var CRAFT_B = ['..hhhh..', '.hhhhhh.', '.ffffff.', '.fe..ef.', '.ffoof..', '..ffff..', 'aaaaaaaa', 'aaawwaaa', '.aaaaaa.', '.pp..pp.'];

  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dark], [0.35, C.wall], [1, '#2a2024']]);
    // 奥の棚: 乾かし中のはがきの列(遠景)
    for (var i = 0; i < 9; i++) {
      var sx = i * 125 + 20, sy = 300 + Math.sin(t * 1.2 + i) * 4;
      game.draw.line(0, 290, W, 290, '#6a5a4a', 4);
      game.draw.rect(sx, sy, 70, 98, C.paper, 0.75);
      game.draw.circle(sx + 35, sy + 40, 18, C.shu, 0.7);
    }
    // 作業台
    game.draw.rect(0, BELT_Y - 260, W, 520, C.wood);
    for (var g = 0; g < 8; g++) game.draw.rect(0, BELT_Y - 250 + g * 64, W, 4, '#7a5a3a');
    // 往復する刷り台(ベルト)
    game.draw.rect(0, BELT_Y - CH / 2 - 30, W, CH + 60, C.belt);
    for (var k = -1; k < 20; k++) {
      var bx = k * 60 + beltOff;
      game.draw.rect(bx, BELT_Y - CH / 2 - 30, 6, CH + 60, '#4a4246');
    }
    game.draw.rect(0, BELT_Y - CH / 2 - 34, W, 8, '#1a1418');
    game.draw.rect(0, BELT_Y + CH / 2 + 26, W, 8, '#1a1418');
    // 折り返し口
    game.draw.rect(RIGHT_X + 60, BELT_Y - CH / 2 - 40, 90, CH + 80, '#1a1418');
    game.draw.rect(0, BELT_Y - CH / 2 - 40, LEFT_X - 80, CH + 80, '#1a1418');
    for (var s = 0; s < smudges.length; s++) {
      game.draw.rect(smudges[s].x - 60, BELT_Y - 60, 120, 120, C.sumi, 0.5 * smudges[s].a);
      smudges[s].a -= 0.004;
    }
  }

  function drawPrint(px, py, p, scale) {
    var sz = 13 * (scale || 1);
    if (p.block === 'shu') game.draw.sprite(SUN, { r: C.shu }, px + p.off, py, sz, { anchor: 'center' });
    else game.draw.sprite(PINE, { k: C.sumi }, px + p.off, py, sz, { anchor: 'center' });
  }

  function drawCard() {
    if (!card) return;
    var t = game.time.elapsed;
    var x = card.x, y = BELT_Y;
    if (card.ruined) { y += card.out * 600; x += card.out * 200; }
    if (card.phase === 'exit') y -= card.wait * 900;
    game.draw.rect(x - CW / 2 + 8, y - CH / 2 + 10, CW, CH, '#000000', 0.3);
    game.draw.rect(x - CW / 2, y - CH / 2, CW, CH, card.ruined ? '#d8c8b0' : C.paper);
    // 見当の枠(刷る場所)
    var fy = y + 10;
    var fc = card.prints.length === 0 ? C.shu : C.sumi;
    var blink = !card.passDone && (card.phase === 'go' || card.phase === 'back') && Math.floor(t * 8) % 2 === 0;
    var fw = 120;
    game.draw.rect(x - fw / 2 - 6, fy - fw / 2 - 6, 26, 6, fc);
    game.draw.rect(x - fw / 2 - 6, fy - fw / 2 - 6, 6, 26, fc);
    game.draw.rect(x + fw / 2 - 20, fy + fw / 2, 26, 6, fc);
    game.draw.rect(x + fw / 2, fy + fw / 2 - 20, 6, 26, fc);
    if (blink) game.draw.rect(x - fw / 2, fy - fw / 2, fw, fw, '#ffffff', 0.18);
    for (var i = 0; i < card.prints.length; i++) drawPrint(x, fy, card.prints[i]);
    // 切手欄と宛名の罫
    game.draw.rect(x + CW / 2 - 50, y - CH / 2 + 14, 36, 44, C.shu, 0.6);
    game.draw.rect(x - CW / 2 + 20, y + CH / 2 - 40, CW - 40, 4, C.sumi, 0.3);
    // 折り返しの予告(向きの矢印が点滅)
    if (card.phase === 'turn' && Math.floor(t * 12) % 2 === 0) {
      game.draw.rect(RIGHT_X - 160, BELT_Y - CH / 2 - 80, 120, 20, C.gold);
      game.draw.rect(RIGHT_X - 180, BELT_Y - CH / 2 - 90, 20, 40, C.gold);
    }
  }

  function drawStamp() {
    var k = 0;
    if (stamp.st === 'drop') k = stamp.t / DROP_T;
    else if (stamp.st === 'press') k = 1;
    else if (stamp.st === 'rise') k = 1 - stamp.t / RISE_T;
    // 影 = 落ちる場所の予告(上がっているほど薄く大きい)
    var fy = BELT_Y + 10;
    game.draw.rect(SX - 70 - (1 - k) * 14, fy - 70 - (1 - k) * 14, 140 + (1 - k) * 28, 140 + (1 - k) * 28, '#000000', 0.25 + k * 0.2);
    var scale = 1.15 - k * 0.15;
    var hy = fy - 330 * (1 - k);
    var s = 150 * scale;
    // 版木(上から見下ろし): 近いほど大きい
    game.draw.rect(SX - s / 2 - 8, hy - s / 2 - 8, s + 16, s + 16, '#3a2a1a');
    game.draw.rect(SX - s / 2, hy - s / 2, s, s, '#a8784a');
    game.draw.rect(SX - s / 2, hy - s / 2, s, 12 * scale, '#c89a6a');
    var ink = stamp.block === 'shu' ? C.shu : C.sumi;
    game.draw.rect(SX - s * 0.3, hy - s * 0.3, s * 0.6, s * 0.6, ink, 0.85);
    game.draw.circle(SX, hy, 26 * scale, '#5a3a20');
    game.draw.circle(SX - 8 * scale, hy - 8 * scale, 9 * scale, '#c89a6a');
  }

  function drawCrafter() {
    var t = game.time.elapsed;
    var x = 200, y = H * 0.84 + Math.sin(t * 3) * 3 - (mood > 0 ? Math.abs(Math.sin(t * 10)) * 20 : 0);
    var fr = stamp.st !== 'up' ? CRAFT_B : CRAFT_A;
    game.draw.sprite(fr, { h: C.sumi, f: '#e8c098', e: C.dark, m: mood < 0 ? '#6a3a3a' : C.shu, o: C.shu, a: '#3a4a6a', w: C.paper, p: '#2a2a30' }, x, y, 22, { anchor: 'center' });
    // 押しレバー
    var lever = stamp.st === 'drop' || stamp.st === 'press';
    game.draw.rect(560, H * 0.86, 360, 40, '#3a2a1a');
    game.draw.line(740, H * 0.86 + 20, lever ? 880 : 860, lever ? H * 0.86 + 60 : H * 0.76, '#c89a6a', 20);
    game.draw.circle(lever ? 880 : 860, lever ? H * 0.86 + 60 : H * 0.76, 34, stamp.st === 'up' ? C.shu : '#7a4a3a');
    if (stamp.st === 'up' && !over) game.draw.circle(860, H * 0.76, 46 + Math.sin(t * 8) * 4, C.gold, 0.25);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.dark, 0.85);
    label('SCORE ' + score, 260, 80, 46, C.paper);
    for (var i = 0; i < CARDS; i++) {
      var x = 120 + i * 90;
      var st = i < ci ? 1 : (i === ci ? 2 : 0);
      game.draw.rect(x - 28, 130, 56, 76, st === 2 ? C.paper : (st === 1 ? '#bfb6a0' : '#4a3a3a'));
      if (st === 1) game.draw.circle(x, 160, 12, C.shu);
    }
    label(done + ' / ' + CARDS, 720, 180, 42, C.gold);
    for (var l = 0; l < LIVES; l++) {
      var on = l < LIVES - ruined;
      game.draw.rect(820 + l * 70, 50, 50, 60, on ? C.paper : '#4a3a3a');
      if (on) game.draw.circle(845 + l * 70, 80, 12, C.shu);
    }
    var tk = Math.max(0, 1 - playT / TIME_LIMIT);
    game.draw.rect(860, 160, 160 * tk, 14, tk < 0.25 ? C.shu : C.gold);
  }

  function drawScene() {
    drawShop();
    drawCard();
    drawStamp();
    if (focus && stopT > 0) {
      game.draw.rect(focus.x - 110, focus.y - 120, 220, 240, '#ffffff', 0.35);
      game.draw.rect(focus.x - 130, focus.y - 140, 260, 280, '#ffffff', 0.15);
    }
    drawCrafter();
  }

  // ---- ATTRACT: 本物の往復で刷る。1枚目は行き帰りぴったり、2枚目の帰りは遅れて重ねずれ ----
  var demo = { t: 0, press: 0, card: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || readyT > 0) { initGame(); readyT = 0; demo.card = 0; }
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) focus = null; }
    else {
      stepStamp(dt, true);
      if (stepCard(dt, true)) {
        demo.card = (demo.card + 1) % 2;
        if (demo.card === 0) { done = 0; perfects = 0; score = 0; }
        newCard(demo.card);
      }
      if (stamp.st === 'up' && !card.passDone && !card.ruined && (card.phase === 'go' || card.phase === 'back')) {
        // 落ちきる時間ぶん先回り。2枚目の帰りだけわざと遅らせる
        var late = demo.card === 1 && card.phase === 'back' ? 0.1 : 0;
        var ref = card.prints.length ? card.prints[0].off : 0;
        var arrive = card.x + card.dir * cardSpeed() * (DROP_T - late) + ref;
        if ((card.dir > 0 && arrive >= SX) || (card.dir < 0 && arrive <= SX)) { dropStamp(); demo.press = 0.2; }
      }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    mood += (0 - mood) * Math.min(1, dt * 1.5);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene();
      game.draw.hand(860, H * 0.76 - (demo.press > 0 ? 0 : 60), { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.dark, 0.85);
      label(GAME_TITLE, W / 2, 105, 80 + Math.sin(t * 3) * 3, C.shu);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.paper);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.3, 50, C.gold);
      else label('TAP TO START', W / 2, H * 0.3, 44, C.paper);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.27, W, H * 0.22, C.dark, 0.85);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.33, 96, won ? C.ok : C.shu);
      label('SCORE ' + score, W / 2, H * 0.39, 52, C.paper);
      label(done + ' / ' + CARDS + '  PERFECT ' + perfects, W / 2, H * 0.435, 38, C.paper);
      if (score > game.best && score > 0) label('NEW RECORD', W / 2, H * 0.475, 46, C.gold);
      else label('BEST ' + Math.max(game.best, score), W / 2, H * 0.475, 36, C.paper);
      if (!won) label('あと' + Math.max(1, CARDS - ci) + '枚!', W / 2, H * 0.25, 48, C.gold);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.97, 36, C.paper);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (stopT > 0) stopT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { printed: done, ruined: ruined, perfect: perfects };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) focus = null;
    } else {
      playT += dt;
      stepStamp(dt, false);
      if (!over && stepCard(dt, false)) {
        if (ci + 1 >= CARDS || playT > TIME_LIMIT) finish(ruined < LIVES);
        else newCard(ci + 1);
      }
    }

    drawScene();
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 100, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['B4', 0.5], ['D5', 1], ['E5', 2],
    ], { tempo: 120, wave: 'square', volume: 0.045, loop: true, bass: [['D3', 2], ['A2', 2], ['B2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
