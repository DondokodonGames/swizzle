// GH-DS-0012-turret-rotate-predict.js
// ターレットリード — 砲塔を指で回し、動く標的の先を読んで3発当てる
// 操作: 砲塔の支点を中心に指で円弧を描いて回転させ、狙いを定めてから指を離すと発射。着弾まで時間がかかるので先読みが要る
// 終わり: 3発命中で成功。5発撃って3発に届かなければ失敗
// @mechanic: rotate_gesture
// @theme: coastal_battery_lead
// 世界観: 岸壁の防衛砲塔。沖を横切る標的艇を狙う。砲弾は着弾まで間があるので、今の位置ではなく先の位置に構える
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数/発射数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 90s PRE-RENDER: 暗め・金属質。粒状ノイズと擬似奥行き、背景は1枚絵として描く
  var C = {
    sky1: '#1a2230', sky2: '#0c121c', sea: '#141e2a', metal1: '#4a5262', metal2: '#2a303c',
    turret: '#5a6272', target: '#c04a3a', targetDark: '#701c14', shell: '#e0d090', good: '#4dcf8a', bad: '#ff5a6a', gold: '#ffd400', white: '#dfe4ea', ink: '#0a0c10',
  };

  var GAME_TITLE = 'TURRET LEAD';
  var WIN_HITS = 3, MAX_SHOTS = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, hits = 0, shots = 0;

  var PIVOT = { x: W * 0.5, y: H * 0.86 };
  var AIM_LEN = 340;
  var HORIZON_Y = H * 0.40;

  var aimAngle, dragging, tickAngle;
  var targetT, targetSpeed, targetBoostT, shells, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TURRET_SPRITE = ['.####.', '######', '.####.'];
  var SHIP_SPRITE = ['..##..', '######', '.####.'];

  function sceneBg() {
    game.draw.gradient(0, HORIZON_Y, [[0, C.sky1], [1, C.sky2]]);
    game.draw.gradient(HORIZON_Y, H - HORIZON_Y, [[0, C.sea], [1, '#0a0f16']]);
    // 粒状ノイズ(薄い矩形を散らす)
    for (var i = 0; i < 60; i++) {
      var nx = (i * 173) % W, ny = HORIZON_Y + ((i * 97) % (H - HORIZON_Y));
      game.draw.rect(nx, ny, 2, 2, '#ffffff', 0.03);
    }
    for (var w = 0; w < 6; w++) game.draw.rect(0, HORIZON_Y + w * 40 + Math.sin(game.time.elapsed + w) * 4, W, 2, '#ffffff', 0.04);
  }

  function targetPos(t) {
    var x = W * 0.15 + (W * 0.7) * ((Math.sin(t * 0.5) + 1) / 2);
    var y = HORIZON_Y + 60 + Math.sin(t * 0.9) * 20;
    return { x: x, y: y };
  }

  function clampAim(a) { return Math.max(-Math.PI * 0.95, Math.min(-Math.PI * 0.05, a)); }

  function initGame() {
    aimAngle = -Math.PI / 2; dragging = false; tickAngle = aimAngle;
    targetT = 0; targetSpeed = 0.55; targetBoostT = 0;
    shells = []; hits = 0; shots = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function fire() {
    if (done || ready > 0 || finished || shots >= MAX_SHOTS) return;
    shots++;
    game.audio.play('se_jump', 0.4);
    game.fx.burst(PIVOT.x + Math.cos(aimAngle) * 60, PIVOT.y + Math.sin(aimAngle) * 60, { color: C.shell, count: 8, speed: 240 });
    shells.push({ x: PIVOT.x, y: PIVOT.y, vx: Math.cos(aimAngle) * 900, vy: Math.sin(aimAngle) * 900, life: 1.2 });
  }

  function resolveShellHit(s) {
    var p = targetPos(targetT);
    if (game.hit.circle(s.x, s.y, 14, p.x, p.y, 60)) {
      hitStop = 0.14;
      hits++;
      game.feedback.good(p.x, p.y, { text: 'HIT', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play(hits >= WIN_HITS ? 'se_success' : 'se_powerup', 0.4);
      if (hits >= WIN_HITS) { ok = true; finished = true; finish(); }
      else game.fx.popup(hits + ' / ' + WIN_HITS, W / 2, H * 0.16, { color: C.gold, size: 40 });
      return true;
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || finished) return;
    dragging = true;
    aimAngle = clampAim(Math.atan2(y - PIVOT.y, x - PIVOT.x));
    tickAngle = aimAngle;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (!dragging || state !== S.PLAYING) return;
    // 円弧ドラッグ: 砲塔の支点を中心にした角度に直接追従(ダイヤルを回す感触)
    aimAngle = clampAim(Math.atan2(y - PIVOT.y, x - PIVOT.x));
    if (Math.abs(aimAngle - tickAngle) > 0.08) {
      tickAngle = aimAngle;
      game.audio.tone(520, 0.02, { wave: 'square', volume: 0.05 });
    }
  });
  game.onRelease(function(x, y) {
    if (!dragging) return;
    dragging = false;
    game.audio.play('se_tap', 0.04);
    if (state === S.PLAYING && !done && !finished) fire();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: PIVOT.y, press: false, phase: 'aim', pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    targetT += dt * targetSpeed;
    for (var i = shells.length - 1; i >= 0; i--) {
      var s = shells[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (resolveShellHit(s) || s.life <= 0 || s.y < HORIZON_Y - 40) shells.splice(i, 1);
    }
    var p = targetPos(targetT + 0.35);
    var wantAngle = Math.atan2(p.y - PIVOT.y, p.x - PIVOT.x);
    demo.pt += dt;
    if (demo.phase === 'aim') {
      aimAngle += (wantAngle - aimAngle) * Math.min(1, dt * 3);
      demo.gx = PIVOT.x + Math.cos(aimAngle) * (AIM_LEN + 60);
      demo.gy = PIVOT.y + Math.sin(aimAngle) * (AIM_LEN + 60) * 0.4 - 40;
      demo.press = true;
      if (demo.pt > 1.1) { demo.phase = 'fire'; demo.pt = 0; fire(); demo.press = false; }
    } else {
      if (demo.pt > 1.0) { demo.phase = 'aim'; demo.pt = 0; }
    }
    if (hits >= WIN_HITS || shots >= MAX_SHOTS) { hits = 0; shots = 0; shells = []; targetT = 0; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetT === undefined) initGame();
      sceneBg();
      stepDemo(dt);
      var tp = targetPos(targetT);
      game.draw.sprite(SHIP_SPRITE, { '#': C.target }, tp.x, tp.y, 14, { anchor: 'center' });
      game.draw.line(PIVOT.x, PIVOT.y, PIVOT.x + Math.cos(aimAngle) * AIM_LEN, PIVOT.y + Math.sin(aimAngle) * AIM_LEN, C.gold, 5);
      for (var i = 0; i < shells.length; i++) game.draw.circle(shells[i].x, shells[i].y, 12, C.shell);
      game.draw.rect(PIVOT.x - 60, PIVOT.y - 20, 120, 60, C.metal2);
      game.draw.sprite(TURRET_SPRITE, { '#': C.turret }, PIVOT.x, PIVOT.y + 30, 24, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + WIN_HITS : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      sceneBg();
      var tp2 = targetPos(targetT);
      game.draw.sprite(SHIP_SPRITE, { '#': C.target }, tp2.x, tp2.y, 14, { anchor: 'center' });
      game.draw.rect(PIVOT.x - 60, PIVOT.y - 20, 120, 60, C.metal2);
      game.draw.sprite(TURRET_SPRITE, { '#': C.turret }, PIVOT.x, PIVOT.y + 30, 24, { anchor: 'center' });
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + WIN_HITS + '  (' + shots + '/' + MAX_SHOTS + ')', W / 2, H * 0.13, 30, C.gold);
      if (!ok && hits === WIN_HITS - 1) txt('あと1発!', W / 2, H * 0.18, 28, C.bad);
      var best = Math.max(game.best, hits);
      txt('BEST ' + best, W / 2, H * 0.90, 28, C.gold);
      if (hits > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, shots: shots });
        else game.end.failure({ hits: hits, shots: shots });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      targetT += dt * targetSpeed;
      targetBoostT -= dt;
      if (targetBoostT <= 0) { targetSpeed = 0.55 + Math.random() * 0.3; targetBoostT = 1.4 + Math.random() * 0.8; }
      for (var i = shells.length - 1; i >= 0; i--) {
        var s = shells[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        var wasHit = resolveShellHit(s);
        var expired = !wasHit && (s.life <= 0 || s.y < HORIZON_Y - 40);
        if (expired) {
          game.feedback.bad(s.x, s.y, { text: 'MISS' });
          game.audio.play('se_bad', 0.25);
        }
        if (wasHit || expired) shells.splice(i, 1);
      }
      if (!finished && shots >= MAX_SHOTS && shells.length === 0) { ok = hits >= WIN_HITS; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    sceneBg();
    var tp3 = targetPos(targetT);
    var boosting = targetBoostT < 0.5;
    if (boosting) game.draw.circle(tp3.x - 40, tp3.y, 18, C.gold, 0.5 + 0.4 * Math.sin(game.time.elapsed * 20));
    game.draw.sprite(SHIP_SPRITE, { '#': boosting ? C.gold : C.target }, tp3.x, tp3.y, 14, { anchor: 'center' });
    if (!finished) game.draw.line(PIVOT.x, PIVOT.y, PIVOT.x + Math.cos(aimAngle) * AIM_LEN, PIVOT.y + Math.sin(aimAngle) * AIM_LEN, C.gold, 5);
    for (var s2 = 0; s2 < shells.length; s2++) game.draw.circle(shells[s2].x, shells[s2].y, 12, C.shell);
    game.draw.rect(PIVOT.x - 60, PIVOT.y - 20, 120, 60, C.metal2);
    game.draw.sprite(TURRET_SPRITE, { '#': C.turret }, PIVOT.x, PIVOT.y + 30, 24, { anchor: 'center' });

    txt(hits + ' / ' + WIN_HITS, W * 0.28, 90, 34, C.white);
    txt(shots + ' / ' + MAX_SHOTS, W * 0.72, 90, 28, C.white);
    // 回転角メーター(親指ゾーン): ダイヤルの向きをカチカチ刻む弧で表示
    var meterCx = W * 0.5, meterCy = H * 0.95, meterR = 90;
    for (var mi = 0; mi <= 18; mi++) {
      var ma = -Math.PI + (Math.PI * mi / 18);
      var lit = ma <= aimAngle + 0.09;
      game.draw.circle(meterCx + Math.cos(ma) * meterR, meterCy + Math.sin(ma) * meterR, 6, lit ? C.gold : C.metal2, lit ? 1 : 0.5);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
