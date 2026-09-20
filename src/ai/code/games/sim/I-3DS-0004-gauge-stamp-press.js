// I-3DS-0004-gauge-stamp-press.js
// ゲージスタンプ — 針が緑のゾーンに来た瞬間にボタンを押して部品に合格印を押す
// 操作: 左右に振れる針を見て、狙いのゾーンに重なった瞬間に画面下のボタンをタップ
// 終わり: 規定回数(3回)すべて合格ゾーンで押せれば成功。1回でも外せば失敗
// @mechanic: timing_one_shot
// @theme: inspection_gauge_press
// 世界観: 工場の検品ラインに立つ検査官。圧力計の針が最良点に来た瞬間だけボタンを押し、部品に合格スタンプを打つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 合格スタンプ数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 金属質感の面取り、影付きの立体パネル、リアルな計器盤
  var C = {
    bg: '#2a2620', bg2: '#1a1712', panel: '#3d372c', panelEdge: '#181510',
    dial: '#eee6d2', dialShadow: '#8a8168', needle: '#d0342c', zone: '#3fae4e',
    zoneEdge: '#2a7a35', good: '#4dff8a', bad: '#ff4d5e', gold: '#ffcc33',
    white: '#f4efe0', ink: '#0c0a08', steel: '#7a8590',
  };

  var GAME_TITLE = 'STAMP PRESS';
  var TOTAL = 3;
  var CX = W * 0.5, CY = H * 0.42, R = 300;
  // 針の角度範囲: -120deg 〜 +120deg (下向き0基準ではなく左右振れ)
  var ANG_MIN = -2.05, ANG_MAX = 2.05;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var stamped, misses, done, endWait, finished;
  var ready, hitStop, shake;
  var round, needleAng, dir, speed, zoneCenter, zoneHalf, roundResolved;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var STAMP_SPRITE = ['.##.', '####', '.##.', '####'];
  var BTN_SPRITE = ['####', '#..#', '#..#', '####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.62, C.panelEdge);
    game.draw.rect(W * 0.12, H * 0.16, W * 0.76, H * 0.58, C.panel);
    for (var i = 0; i < 6; i++) game.draw.rect(W * 0.12, H * 0.16 + i * (H * 0.58 / 6), W * 0.76, 2, '#ffffff08');
  }

  function angleForRound(r, seeded) {
    // ラウンドごとに難度上昇: 許容幅が狭くなる
    var t = seeded !== undefined ? seeded : game.random(0, 1);
    return ANG_MIN + t * (ANG_MAX - ANG_MIN);
  }

  function newRound(r) {
    zoneCenter = angleForRound(r);
    zoneHalf = Math.max(0.09, 0.22 - r * 0.045);
    dir = Math.random() < 0.5 ? 1 : -1;
    speed = 1.7 + r * 0.35;
    needleAng = ANG_MIN;
    roundResolved = false;
  }

  function initGame() {
    stamped = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0;
    newRound(0);
  }

  function needleTip(ang, len) {
    // 針は上向き12時を0基準に左右へ振れる
    var a = -Math.PI / 2 + ang;
    return { x: CX + Math.cos(a) * len, y: CY + Math.sin(a) * len };
  }

  function drawDial() {
    game.draw.circle(CX, CY, R + 14, C.dialShadow);
    game.draw.circle(CX, CY, R, C.dial);
    // 合格ゾーンの弧(短冊の連続で表現)
    var segs = 22;
    for (var i = 0; i < segs; i++) {
      var t = i / (segs - 1);
      var a = zoneCenter - zoneHalf + t * (zoneHalf * 2);
      var p = needleTip(a, R - 22);
      game.draw.circle(p.x, p.y, 12, C.zone);
    }
    var pEdgeA = needleTip(zoneCenter - zoneHalf, R - 22);
    var pEdgeB = needleTip(zoneCenter + zoneHalf, R - 22);
    game.draw.circle(pEdgeA.x, pEdgeA.y, 14, C.zoneEdge);
    game.draw.circle(pEdgeB.x, pEdgeB.y, 14, C.zoneEdge);
    var tip = needleTip(needleAng, R - 30);
    game.draw.line(CX, CY, tip.x, tip.y, C.needle, 10);
    game.draw.circle(CX, CY, 26, C.steel);
    game.draw.circle(CX, CY, 14, C.ink);
  }

  function drawButton(pressed) {
    var bx = CX, by = H * 0.84;
    game.draw.circle(bx, by + (pressed ? 8 : 0), 96, C.panelEdge);
    game.draw.circle(bx, by + (pressed ? 8 : 0), 82, pressed ? C.gold : C.bad);
    game.draw.sprite(STAMP_SPRITE, { '#': C.ink }, bx, by + (pressed ? 8 : 0), 12, { anchor: 'center' });
  }

  function resolvePress() {
    if (state !== S.PLAYING || ready > 0 || roundResolved || finished) return;
    roundResolved = true;
    var dist = Math.abs(needleAng - zoneCenter);
    var success = dist <= zoneHalf;
    var tip = needleTip(needleAng, R - 30);
    if (success) {
      stamped++;
      hitStop = 0.12;
      game.feedback.good(tip.x, tip.y, { text: 'PERFECT', color: C.good });
      game.fx.burst(tip.x, tip.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (stamped === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - R - 40, { color: C.gold, size: 40 });
      if (stamped >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound(round);
      ready = 0.35;
    } else {
      misses++;
      hitStop = 0.35;
      game.feedback.bad(tip.x, tip.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { game.audio.play('se_tap', 0.15); resolvePress(); }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.84, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) {
      round = 0; newRound(0); zoneHalf = 0.22;
    }
    var advance = speed * dir * dt * (cyc < 2.6 ? 1 : 0);
    needleAng += advance;
    if (needleAng > ANG_MAX) { needleAng = ANG_MAX; dir = -1; }
    if (needleAng < ANG_MIN) { needleAng = ANG_MIN; dir = 1; }
    demo.press = false;
    if (cyc > 1.0 && cyc < 1.15 && Math.abs(needleAng - zoneCenter) <= zoneHalf) {
      demo.press = true;
      demo.gx = CX; demo.gy = H * 0.84;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDial();
      drawButton(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDial();
      drawButton(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(stamped + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - stamped) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(stamped, { stamped: stamped, total: TOTAL });
        else game.end.failure({ stamped: stamped, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      needleAng += speed * dir * dt;
      if (needleAng > ANG_MAX) { needleAng = ANG_MAX; dir = -1; }
      if (needleAng < ANG_MIN) { needleAng = ANG_MIN; dir = 1; }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDial();
    drawButton(false);

    txt(stamped + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (stamped / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.5], ['G4', 0.5], ['C5', 0.5], ['G4', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
