// 092-bubble-level.js
// 水準器 — スマホを傾けるように画面をタップして気泡を中心に保ち続ける操作感
// 操作: 左タップで左に傾け、右タップで右に傾ける
// 成功: 15秒気泡を中心±5%以内に保つ  失敗: 気泡が外れる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0e1c14',
    tube:    '#0f2a1a',
    tubeHi:  '#166534',
    water:   '#0ea5e9',
    waterHi: '#7dd3fc',
    bubble:  '#e0f2fe',
    bubbleHi:'#fff',
    center:  '#22c55e',
    danger:  '#ef4444',
    ui:      '#475569'
  };

  var TUBE_W = 800;
  var TUBE_H = 120;
  var TUBE_X = (W - TUBE_W) / 2;
  var TUBE_Y = H * 0.42;
  var BUBBLE_R = 44;
  var CENTER_ZONE = 0.05; // 5% of half-tube width = 20px

  var tilt = 0;      // -1 (left down) to 1 (right down)
  var tiltVel = 0;
  var bubblePos = 0; // -1 to 1 along tube
  var bubbleVel = 0;

  var TILT_FORCE = 0.8;
  var TILT_DAMP = 0.94;
  var BUBBLE_GRAVITY = 2.5; // bubble moves against tilt (floats to high side)
  var BUBBLE_DAMP = 0.96;

  var timeInCenter = 0;
  var needed = 15; // seconds
  var timeLeft = 30; // total game time
  var done = false;
  var successFlash = 0;
  var dangerFlash = 0;

  // Natural perturbations
  var perturbTimer = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap left → tilt left (left side goes down, bubble moves right)
    // Tap right → tilt right (right side goes down, bubble moves left)
    var pushDir = tx < W / 2 ? -1 : 1;
    tiltVel += pushDir * 0.5;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Random perturbations
    perturbTimer -= dt;
    if (perturbTimer <= 0) {
      perturbTimer = 1.5 + Math.random() * 1.5;
      tiltVel += (Math.random() - 0.5) * 0.8;
    }

    // Tilt physics
    tiltVel *= TILT_DAMP;
    tilt += tiltVel * dt;
    tilt = Math.max(-1, Math.min(1, tilt));

    // Bubble physics: bubble floats to the HIGH side (opposite tilt)
    // If tilt < 0 (left side down), bubble moves right (+)
    // If tilt > 0 (right side down), bubble moves left (-)
    var bubbleAccel = -tilt * BUBBLE_GRAVITY;
    bubbleVel += bubbleAccel * dt;
    bubbleVel *= BUBBLE_DAMP;
    bubblePos += bubbleVel * dt;
    bubblePos = Math.max(-1, Math.min(1, bubblePos));

    // Check center zone
    var inCenter = Math.abs(bubblePos) < CENTER_ZONE;
    if (inCenter && !done) {
      timeInCenter += dt;
      if (timeInCenter >= needed) {
        done = true;
        successFlash = 0.6;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 20); }, 700);
      }
    } else {
      timeInCenter = Math.max(0, timeInCenter - dt * 0.5); // decay slowly when out
      if (Math.abs(bubblePos) > 0.85) {
        dangerFlash = 0.1;
      }
    }

    if (successFlash > 0) successFlash -= dt;
    if (dangerFlash > 0) dangerFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tube background
    game.draw.rect(TUBE_X - 16, TUBE_Y - TUBE_H / 2 - 16, TUBE_W + 32, TUBE_H + 32, C.tubeHi, 0.5);
    game.draw.rect(TUBE_X, TUBE_Y - TUBE_H / 2, TUBE_W, TUBE_H, C.tube);

    // Water fill
    var waterFill = TUBE_H * 0.7;
    game.draw.rect(TUBE_X + 4, TUBE_Y - waterFill / 2 + 4, TUBE_W - 8, waterFill - 8, C.water, 0.3);
    // Water surface ripple
    for (var wx = TUBE_X + 8; wx < TUBE_X + TUBE_W - 8; wx += 40) {
      var wy = TUBE_Y - waterFill / 2 + 4 + Math.sin(game.time.elapsed * 3 + wx * 0.02) * 4;
      game.draw.rect(wx, wy, 28, 4, C.waterHi, 0.2);
    }

    // Center zone markers
    var centerW = TUBE_W * CENTER_ZONE;
    game.draw.rect(W / 2 - centerW - 3, TUBE_Y - TUBE_H / 2, 6, TUBE_H, C.center, 0.6);
    game.draw.rect(W / 2 + centerW - 3, TUBE_Y - TUBE_H / 2, 6, TUBE_H, C.center, 0.6);
    game.draw.rect(W / 2 - centerW, TUBE_Y - TUBE_H / 2, centerW * 2, TUBE_H, C.center, 0.08);

    // Tube end caps
    game.draw.circle(TUBE_X, TUBE_Y, TUBE_H / 2, C.tubeHi);
    game.draw.circle(TUBE_X + TUBE_W, TUBE_Y, TUBE_H / 2, C.tubeHi);

    // Bubble
    var bubbleX = W / 2 + bubblePos * (TUBE_W / 2 - BUBBLE_R - 8);
    var bubbleInCenter = Math.abs(bubblePos) < CENTER_ZONE;
    var bubbleColor = bubbleInCenter ? C.center : (Math.abs(bubblePos) > 0.75 ? C.danger : C.bubble);
    var bPulse = 0.8 + 0.2 * Math.abs(Math.sin(game.time.elapsed * 3));
    game.draw.circle(bubbleX, TUBE_Y, BUBBLE_R + 4, bubbleColor, bPulse * 0.2);
    game.draw.circle(bubbleX, TUBE_Y, BUBBLE_R, C.bubble, 0.85);
    game.draw.circle(bubbleX - BUBBLE_R * 0.3, TUBE_Y - BUBBLE_R * 0.3, BUBBLE_R * 0.25, '#fff', 0.6);

    // Level crosshair
    game.draw.circle(W / 2, TUBE_Y, 16, C.center, 0.6);

    // Tilt indicator (below tube)
    var tiltBarW = 300;
    var tiltX = W / 2 + tilt * tiltBarW / 2;
    game.draw.rect(W / 2 - tiltBarW / 2, TUBE_Y + 90, tiltBarW, 12, '#0a1a10');
    game.draw.rect(W / 2, TUBE_Y + 90, tilt * tiltBarW / 2, 12, tilt < 0 ? '#3b82f6' : '#3b82f6');
    game.draw.circle(tiltX, TUBE_Y + 96, 16, '#3b82f6');
    game.draw.text(tilt > 0.1 ? '→傾' : (tilt < -0.1 ? '←傾' : '水平'), W / 2, TUBE_Y + 140, {
      size: 36, color: '#64748b'
    });

    // Hold time progress
    var holdFrac = Math.min(1, timeInCenter / needed);
    var holdW = 600;
    game.draw.rect(W / 2 - holdW / 2, H * 0.6, holdW, 24, '#0a1a10');
    game.draw.rect(W / 2 - holdW / 2, H * 0.6, holdW * holdFrac, 24, C.center);
    game.draw.text('保持: ' + Math.floor(timeInCenter) + 's / ' + needed + 's', W / 2, H * 0.64, {
      size: 40, color: holdFrac > 0.5 ? C.center : '#64748b'
    });

    // Tap guides
    game.draw.text('←タップ', W * 0.18, TUBE_Y, { size: 40, color: C.ui, bold: true });
    game.draw.text('タップ→', W * 0.82, TUBE_Y, { size: 40, color: C.ui, bold: true });

    // Flashes
    if (successFlash > 0) {
      game.draw.rect(0, 0, W, H, C.center, successFlash / 0.6 * 0.3);
    }
    if (dangerFlash > 0) {
      game.draw.rect(0, 0, W, H, C.danger, dangerFlash / 0.1 * 0.2);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#0e1c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tubeHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    tiltVel = (Math.random() - 0.5) * 0.5;
  });
})(game);
