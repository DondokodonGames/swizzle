// 213-color-wave.js
// カラーウェーブ — うねる色の波が来る前に同じ色のゾーンに移動する判断ゲーム
// 操作: タップで4つのゾーンを移動
// 成功: 25秒生き残る  失敗: 間違った色のゾーンで波に飲まれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var ZONE_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'];
  var ZONE_HI = ['#fca5a5', '#86efac', '#93c5fd', '#fde68a'];
  var ZONE_NAMES = ['赤', '緑', '青', '黄'];

  var C = {
    bg:  '#040608',
    ui:  '#334155',
    wave:'#ffffff'
  };

  var ZONES = [
    { x: 0, y: 0, w: W / 2, h: H / 2, colorIdx: 0 },
    { x: W / 2, y: 0, w: W / 2, h: H / 2, colorIdx: 1 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2, colorIdx: 2 },
    { x: W / 2, y: H / 2, w: W / 2, h: H / 2, colorIdx: 3 }
  ];

  var playerZone = 0; // start in red zone
  var waveColor = -1;
  var wavePhase = 'wait'; // 'announce' | 'incoming' | 'strike' | 'wait'
  var waveTimer = 0;
  var ANNOUNCE_TIME = 1.5;
  var INCOMING_TIME = 1.0;
  var STRIKE_TIME = 0.5;
  var WAIT_TIME = 1.5;
  var waveAlpha = 0;
  var survived = 0;
  var NEEDED = 25;
  var done = false;
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;
  var strikes = 0;

  function startWave() {
    waveColor = Math.floor(Math.random() * 4);
    wavePhase = 'announce';
    waveTimer = ANNOUNCE_TIME;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var zi = 0; zi < ZONES.length; zi++) {
      var z = ZONES[zi];
      if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) {
        if (zi !== playerZone) {
          playerZone = zi;
          game.audio.play('se_tap', 0.3);
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        return;
      }
    }
    if (feedback > 0) feedback -= dt;

    waveTimer -= dt;

    if (wavePhase === 'announce') {
      waveAlpha = (ANNOUNCE_TIME - waveTimer) / ANNOUNCE_TIME * 0.3;
      if (waveTimer <= 0) {
        wavePhase = 'incoming';
        waveTimer = INCOMING_TIME;
      }
    } else if (wavePhase === 'incoming') {
      waveAlpha = 0.3 + (INCOMING_TIME - waveTimer) / INCOMING_TIME * 0.5;
      if (waveTimer <= 0) {
        wavePhase = 'strike';
        waveTimer = STRIKE_TIME;
        // Check: player in same color zone as wave?
        if (ZONES[playerZone].colorIdx === waveColor) {
          // Danger!
          feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.5);
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        } else {
          feedbackOk = true; feedback = 0.3;
          game.audio.play('se_success', 0.4);
        }
      }
    } else if (wavePhase === 'strike') {
      waveAlpha = Math.max(0, waveAlpha - dt * 2);
      if (waveTimer <= 0) {
        wavePhase = 'wait';
        waveTimer = WAIT_TIME * (0.6 + Math.random() * 0.8);
        waveColor = -1;
      }
    } else if (wavePhase === 'wait') {
      if (waveTimer <= 0) {
        startWave();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Zones
    for (var zi2 = 0; zi2 < ZONES.length; zi2++) {
      var z2 = ZONES[zi2];
      var isPlayer = zi2 === playerZone;
      var isWave = z2.colorIdx === waveColor;
      var zCol = ZONE_COLORS[z2.colorIdx];
      var zHi = ZONE_HI[z2.colorIdx];

      var alpha = isPlayer ? 0.45 : 0.2;
      game.draw.rect(z2.x, z2.y, z2.w, z2.h, zCol, alpha);

      // Wave danger flash
      if (isWave && wavePhase !== 'wait' && waveAlpha > 0) {
        game.draw.rect(z2.x, z2.y, z2.w, z2.h, '#fff', waveAlpha * 0.6);
      }

      // Zone label
      game.draw.text(ZONE_NAMES[z2.colorIdx], z2.x + z2.w / 2, z2.y + z2.h / 2, { size: 88, color: zHi, bold: true });

      // Player indicator
      if (isPlayer) {
        var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 4));
        game.draw.circle(z2.x + z2.w / 2, z2.y + z2.h * 0.7, 50, '#fff', pulse * 0.4);
        game.draw.circle(z2.x + z2.w / 2, z2.y + z2.h * 0.7, 36, '#fff', 0.8);
        game.draw.text('★', z2.x + z2.w / 2, z2.y + z2.h * 0.7, { size: 44, color: zCol, bold: true });
      }
    }

    // Zone dividers
    game.draw.line(W / 2, 0, W / 2, H, '#000', 4);
    game.draw.line(0, H / 2, W, H / 2, '#000', 4);

    // Wave announcement
    if (wavePhase === 'announce' || wavePhase === 'incoming') {
      var warnAlpha = wavePhase === 'incoming' ? 0.9 : 0.5 + 0.3 * Math.sin(elapsed * 8);
      game.draw.text('避けろ：' + ZONE_NAMES[waveColor] + '！', W / 2, H / 2, { size: 72, color: ZONE_COLORS[waveColor], bold: true });
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.1);
    }

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    setTimeout(startWave, 1500);
  });
})(game);
