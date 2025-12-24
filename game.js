const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Audio setup - using HTML5 audio elements
let shootSound, explosionSound, gameOverSound, buttonSound, backgroundMusic;
let isAudioEnabled = false;

function initAudio() {
  try {
    shootSound = document.getElementById('shootSound');
    explosionSound = document.getElementById('explosionSound');
    gameOverSound = document.getElementById('gameOverSound');
    buttonSound = document.getElementById('buttonSound');
    backgroundMusic = document.getElementById('backgroundMusic');
    
    // Set volumes
    shootSound.volume = 0.3;
    explosionSound.volume = 0.4;
    gameOverSound.volume = 0.5;
    buttonSound.volume = 0.3;
    backgroundMusic.volume = 0.1;
    
    isAudioEnabled = true;
    startBackgroundMusic();
  } catch (e) {
    console.warn('Audio elements not found');
  }
}

function playSound(audioElement) {
  if (!isAudioEnabled || !audioElement) return;
  
  // Reset the audio to the beginning and play
  audioElement.currentTime = 0;
  audioElement.play().catch(e => {
    console.warn('Audio play failed:', e);
  });
}

function startBackgroundMusic() {
  if (!isAudioEnabled || !backgroundMusic) return;
  
  backgroundMusic.play().catch(e => {
    console.warn('Background music play failed:', e);
  });
}

// Initialize audio on first user interaction
let audioInitialized = false;
function ensureAudioInit() {
  if (!audioInitialized) {
    initAudio();
    audioInitialized = true;
  }
}

// Game state
let gameOver = false;
let score = 0;
let restartButtonPressed = false;

// Stars for background
const stars = [];
const numStars = 200;

// Initialize stars
for (let i = 0; i < numStars; i++) {
  stars.push({
    x: 52 + Math.random() * (canvas.width - 104), // Within border area
    y: 52 + Math.random() * (canvas.height - 104), // Within border area
    size: Math.random() * 2 + 1,
    twinkleOffset: Math.random() * Math.PI * 2, // Random phase for twinkling
    twinkleSpeed: 0.02 + Math.random() * 0.03 // Random twinkling speed
  });
}

// Rocket
const rocket = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 15,
  speed: 0.3,
  maxSpeed: 5,
  friction: 0.98,
  vx: 0,
  vy: 0,
  angle: 0
};

// Bullets
const bullets = [];

// Asteroids
const asteroids = [];
const asteroidSpawnRate = 120; // frames

// Input
const keys = {};
window.addEventListener("keydown", e => {
  ensureAudioInit(); // Initialize audio on first interaction
  keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

let mouseX, mouseY;
window.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

let canShoot = true;
window.addEventListener("mousedown", e => {
  e.preventDefault();
  ensureAudioInit(); // Initialize audio on first interaction
  
  if (gameOver) {
    // Check if click is on restart button
    const buttonWidth = 180; // Updated size
    const buttonHeight = 45; // Updated size
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 + 80; // Updated position
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
      // Button clicked - show pressed state briefly
      restartButtonPressed = true;
      playSound(buttonSound); // Button click sound
      setTimeout(() => {
        restartButtonPressed = false;
        // Restart game after button animation
        gameOver = false;
        score = 0;
        rocket.x = canvas.width / 2;
        rocket.y = canvas.height / 2;
        rocket.vx = 0;
        rocket.vy = 0;
        bullets.length = 0;
        asteroids.length = 0;
        frameCount = 0;
      }, 150);
    }
  } else if (e.button === 0 && canShoot) {
    bullets.push({
      x: rocket.x,
      y: rocket.y,
      vx: Math.cos(rocket.angle) * 8,
      vy: Math.sin(rocket.angle) * 8
    });
    playSound(shootSound); // Shooting sound
    canShoot = false;
    setTimeout(() => canShoot = true, 150);
  }
});

window.addEventListener("contextmenu", e => e.preventDefault());

// Game loop
let frameCount = 0;
let twinkleTime = 0;

function drawBackground() {
  // Black background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw white border with more rounded corners (48px from screen edges)
  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  const borderX = 48;
  const borderY = 48;
  const borderWidth = canvas.width - 96;
  const borderHeight = canvas.height - 96;
  const radius = 20; // More curved corners
  
  ctx.beginPath();
  ctx.moveTo(borderX + radius, borderY);
  ctx.lineTo(borderX + borderWidth - radius, borderY);
  ctx.quadraticCurveTo(borderX + borderWidth, borderY, borderX + borderWidth, borderY + radius);
  ctx.lineTo(borderX + borderWidth, borderY + borderHeight - radius);
  ctx.quadraticCurveTo(borderX + borderWidth, borderY + borderHeight, borderX + borderWidth - radius, borderY + borderHeight);
  ctx.lineTo(borderX + radius, borderY + borderHeight);
  ctx.quadraticCurveTo(borderX, borderY + borderHeight, borderX, borderY + borderHeight - radius);
  ctx.lineTo(borderX, borderY + radius);
  ctx.quadraticCurveTo(borderX, borderY, borderX + radius, borderY);
  ctx.closePath();
  ctx.stroke();
  
  // Draw pixelated white stars with twinkling
  stars.forEach(star => {
    const twinkle = Math.sin(twinkleTime + star.twinkleOffset) * 0.5 + 0.5; // 0 to 1
    ctx.globalAlpha = 0.3 + twinkle * 0.7; // Vary opacity between 0.3 and 1.0
    ctx.fillStyle = "white";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
  ctx.globalAlpha = 1.0; // Reset alpha
}

function updateRocket() {
  // Rotation
  if (mouseX !== undefined && mouseY !== undefined) {
    rocket.angle = Math.atan2(mouseY - rocket.y, mouseX - rocket.x);
  }

  // Movement
  if (keys["KeyW"] || keys["ArrowUp"]) rocket.vy -= rocket.speed;
  if (keys["KeyS"] || keys["ArrowDown"]) rocket.vy += rocket.speed;
  if (keys["KeyA"] || keys["ArrowLeft"]) rocket.vx -= rocket.speed;
  if (keys["KeyD"] || keys["ArrowRight"]) rocket.vx += rocket.speed;

  // Friction
  rocket.vx *= rocket.friction;
  rocket.vy *= rocket.friction;

  // Speed limit
  const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
  if (speed > rocket.maxSpeed) {
    rocket.vx = (rocket.vx / speed) * rocket.maxSpeed;
    rocket.vy = (rocket.vy / speed) * rocket.maxSpeed;
  }

  // Update position
  rocket.x += rocket.vx;
  rocket.y += rocket.vy;

  // Keep in bounds (within the white border)
  rocket.x = Math.max(rocket.size + 52, Math.min(canvas.width - rocket.size - 52, rocket.x));
  rocket.y = Math.max(rocket.size + 52, Math.min(canvas.height - rocket.size - 52, rocket.y));
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].x += bullets[i].vx;
    bullets[i].y += bullets[i].vy;
    // Remove bullets that hit the border or go off screen
    if (bullets[i].x < 52 || bullets[i].x > canvas.width - 52 || 
        bullets[i].y < 52 || bullets[i].y > canvas.height - 52) {
      bullets.splice(i, 1);
    }
  }
}

function spawnAsteroid() {
  const side = Math.floor(Math.random() * 4);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  let x, y;
  if (side === 0) { x = Math.random() * canvas.width; y = 48 - 30; } // Just outside top border
  else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height - 48 + 30; } // Just outside bottom border
  else if (side === 2) { x = 48 - 30; y = Math.random() * canvas.height; } // Just outside left border
  else { x = canvas.width - 48 + 30; y = Math.random() * canvas.height; } // Just outside right border

  const angle = Math.atan2(centerY - y, centerX - x) + (Math.random() - 0.5) * Math.PI / 2;
  const speed = 1.5 + Math.random() * 2;
  
  // Generate fixed shape for this asteroid
  const sides = 6 + Math.floor(Math.random() * 4); // 6-9 sides
  const shape = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const radius = 0.7 + Math.random() * 0.6; // Fixed radius variation for this asteroid
    shape.push({ angle, radius });
  }
  
  asteroids.push({
    x, y,
    size: 20 + Math.random() * 25,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    shape: shape, // Store the fixed shape
    health: Math.floor(Math.random() * 5) + 1, // Random health 1-5
    color: Math.random() < 0.3 ? "white" : "black" // 30% chance for white asteroids
  });
}

function updateAsteroids() {
  asteroids.forEach(a => {
    a.x += a.vx;
    a.y += a.vy;
    
    // Keep asteroids within the border (bounce off edges)
    if (a.x - a.size < 52) {
      a.x = 52 + a.size;
      a.vx = Math.abs(a.vx); // Bounce right
    } else if (a.x + a.size > canvas.width - 52) {
      a.x = canvas.width - 52 - a.size;
      a.vx = -Math.abs(a.vx); // Bounce left
    }
    
    if (a.y - a.size < 52) {
      a.y = 52 + a.size;
      a.vy = Math.abs(a.vy); // Bounce down
    } else if (a.y + a.size > canvas.height - 52) {
      a.y = canvas.height - 52 - a.size;
      a.vy = -Math.abs(a.vy); // Bounce up
    }
  });
}

function detectCollisions() {
  // Bullet-asteroid
  asteroids.forEach((a, ai) => {
    bullets.forEach((b, bi) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.size) {
        // Decrease asteroid health instead of destroying
        a.health -= 1;
        bullets.splice(bi, 1);
        
        // Only destroy asteroid and award points when health reaches 0
        if (a.health <= 0) {
          asteroids.splice(ai, 1);
          score += 10;
          playSound(explosionSound); // Explosion sound
        }
      }
    });

    // Rocket-asteroid
    const dx = a.x - rocket.x;
    const dy = a.y - rocket.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < a.size + rocket.size) {
      gameOver = true;
      playSound(gameOverSound); // Game over sound
    }
  });
}

function drawRocket() {
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate(rocket.angle);
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(0, -rocket.size);
  ctx.lineTo(-rocket.size * 0.7, rocket.size * 0.7);
  ctx.lineTo(rocket.size * 0.7, rocket.size * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBullets() {
  bullets.forEach(b => {
    // Glow effect
    ctx.shadowColor = "white";
    ctx.shadowBlur = 10;
    
    // White bullet
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
  });
}

function drawAsteroids() {
  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    
    // Draw fill using asteroid color
    ctx.fillStyle = a.color;
    ctx.beginPath();
    a.shape.forEach((point, i) => {
      const x = Math.cos(point.angle) * a.size * point.radius;
      const y = Math.sin(point.angle) * a.size * point.radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    
    // Draw white border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw health number (show until health reaches 0)
    if (a.health > 0) {
      ctx.fillStyle = a.color === "white" ? "black" : "white"; // Black numbers on white asteroids, white on black
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(a.health.toString(), 0, 5); // Centered on asteroid
    }
    
    ctx.restore();
  });
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "bold 24px 'Courier New', monospace"; // Pixelated monospace font
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${score}`, 60, 35);
}

function drawGameOver() {
  ctx.fillStyle = "white";
  ctx.font = "bold 48px 'Courier New', monospace"; // Pixelated monospace font
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  
  ctx.font = "bold 20px 'Courier New', monospace"; // Pixelated monospace font
  ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
  
  // Draw restart button (bigger with rounded corners)
  const buttonWidth = 180; // Made bigger
  const buttonHeight = 45; // Made bigger
  const buttonX = canvas.width / 2 - buttonWidth / 2;
  const buttonY = canvas.height / 2 + 80;
  const radius = 12; // Rounded corners
  
  // Button background (darker when pressed)
  ctx.fillStyle = restartButtonPressed ? "#444" : "#222";
  ctx.beginPath();
  ctx.moveTo(buttonX + radius, buttonY);
  ctx.lineTo(buttonX + buttonWidth - radius, buttonY);
  ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY, buttonX + buttonWidth, buttonY + radius);
  ctx.lineTo(buttonX + buttonWidth, buttonY + buttonHeight - radius);
  ctx.quadraticCurveTo(buttonX + buttonWidth, buttonY + buttonHeight, buttonX + buttonWidth - radius, buttonY + buttonHeight);
  ctx.lineTo(buttonX + radius, buttonY + buttonHeight);
  ctx.quadraticCurveTo(buttonX, buttonY + buttonHeight, buttonX, buttonY + buttonHeight - radius);
  ctx.lineTo(buttonX, buttonY + radius);
  ctx.quadraticCurveTo(buttonX, buttonY, buttonX + radius, buttonY);
  ctx.closePath();
  ctx.fill();
  
  // Button border
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Button text
  ctx.fillStyle = "white";
  ctx.font = "bold 18px 'Courier New', monospace"; // Pixelated monospace font
  ctx.fillText("RESTART", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
}

// Game loop
function gameLoop() {
  twinkleTime += 0.1; // Update twinkling animation
  drawBackground();

  if (!gameOver) {
    frameCount++;
    updateRocket();
    updateBullets();
    updateAsteroids();
    detectCollisions();

    if (frameCount % asteroidSpawnRate === 0) spawnAsteroid();

    drawRocket();
    drawBullets();
    drawAsteroids();
    drawScore();
  } else {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
