const socket = io();

const statusEl = document.getElementById('status');
let playerNumber = null;
let currentRoomId = null;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

//ui elems
const menuEl = document.getElementById('main-menu');
const gameContainerEl = document.getElementById('game-container');
const winScreenEl = document.getElementById('win-screen');
const winMessageEl = document.getElementById('win-message');
const playButton = document.getElementById('play-button');
const rematchButton = document.getElementById('rematch-button');
const menuButton = document.getElementById('menu-button');

const POWERUP_LABELS = {
  multiBall: 'MULTIBALL',
  bigPaddle: 'BIG PADDLE',
  fastBall: 'FAST',
  slowBall: 'SLOW'
};

playButton.addEventListener('click', () => {
  menuEl.style.display = 'none';
  gameContainerEl.style.display = 'block';
  socket.emit('findMatch');
  statusEl.textContent = `ID = ${socket.id}, Connecting with another player...`;
});

rematchButton.addEventListener('click', () => {
  socket.emit('requestRematch');
  statusEl.textContent = 'Waiting for opponent to accept rematch...';
});

menuButton.addEventListener('click', () => {
  socket.emit('leaveToMenu');
  winScreenEl.style.display = 'none';
  gameContainerEl.style.display = 'none';
  menuEl.style.display = 'flex';
  statusEl.textContent = 'Connected!';
});

//game properties
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const PADDLE_SPEED = 6;
const PADDLE_EDGE_DIST = 20;
const BALL_SIZE = 10;
const BALL_SPEED = 5;

//powerup properties
const POWERUP_SIZE = 20;
const BIG_PADDLE_HEIGHT = 160;       // ADD THIS
const FAST_BALL_MULTIPLIER = 1.8;    // ADD THIS
const SLOW_BALL_MULTIPLIER = 0.5; 
const POWERUP_LABEL_FONT_SIZE = 8;


//connect fires on the client when it successfully connects to server

function drawGame(game){
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = 'white';
    ctx.fillRect(PADDLE_EDGE_DIST, game.paddle1.y, PADDLE_WIDTH, game.paddle1.height);
    ctx.fillRect(GAME_WIDTH - PADDLE_EDGE_DIST, game.paddle2.y, PADDLE_WIDTH, game.paddle2.height);
    game.balls.forEach(ball => {
      ctx.fillRect(ball.x - BALL_SIZE / 2, ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);
    });

    game.powerUps.forEach(powerUp => drawPowerUp(powerUp)); // drawn last, so its color can't leak onto anything else

    document.getElementById('player-score').textContent = game.score1;
    document.getElementById('computer-score').textContent = game.score2;
}

function drawPowerUp(powerUp){
  if(!powerUp) return;

  console.log('drawPowerUp is running, drawing:', powerUp.type, 'at', powerUp.x, powerUp.y); // ADD THIS

  const cx = powerUp.x + POWERUP_SIZE / 2;//center of the powerup values
  const cy = powerUp.y + POWERUP_SIZE / 2;

  ctx.fillStyle =
    powerUp.type === 'multiBall' ? 'cyan' :
    powerUp.type === 'bigPaddle' ? 'lime' :
    powerUp.type === 'fastBall'  ? 'red' :
    'blue'; // slowBall

  if (powerUp.type === 'multiBall') {
    // circle
    ctx.beginPath();
    ctx.arc(cx, cy, POWERUP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (powerUp.type === 'bigPaddle') {
    // square
    ctx.fillRect(powerUp.x, powerUp.y, POWERUP_SIZE, POWERUP_SIZE);
  } else if (powerUp.type === 'fastBall') {
    // triangle pointing up
    ctx.beginPath();
    ctx.moveTo(cx, powerUp.y);
    ctx.lineTo(powerUp.x, powerUp.y + POWERUP_SIZE);
    ctx.lineTo(powerUp.x + POWERUP_SIZE, powerUp.y + POWERUP_SIZE);
    ctx.closePath();
    ctx.fill();
  } else {
    // slowBall — triangle pointing down
    ctx.beginPath();
    ctx.moveTo(cx, powerUp.y + POWERUP_SIZE);
    ctx.lineTo(powerUp.x, powerUp.y);
    ctx.lineTo(powerUp.x + POWERUP_SIZE, powerUp.y);
    ctx.closePath();
    ctx.fill();
  }
  //draw labels under the shapes
  ctx.font = `${POWERUP_LABEL_FONT_SIZE}px 'Press Start 2P', monospace`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(POWERUP_LABELS[powerUp.type], cx, powerUp.y + POWERUP_SIZE + 12);
}

function shakeScreen(duration = 300, magnitude = 8) {
  const startTime = performance.now();

  function animate(time) {
    const elapsed = time - startTime;
    if (elapsed < duration) {
      const progress = elapsed / duration;
      const currentMagnitude = magnitude * (1 - progress); // shake fades out over time
      const dx = (Math.random() * 2 - 1) * currentMagnitude;
      const dy = (Math.random() * 2 - 1) * currentMagnitude;
      canvas.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(animate);
    } else {
      canvas.style.transform = 'translate(0px, 0px)'; // snap back to normal
    }
  }

  requestAnimationFrame(animate);
}

socket.on('connect', ()=> {
    console.log('Connected to server with id: ', socket.id );
    statusEl.textContent = ` Your ID: ${socket.id}`;
});

socket.on('disconnect', () => {
console.log('Disconnected from server');
statusEl.textContent = 'Disconnected.';    

});

socket.on('startGame', ({roomId, playerNumber:num}) => {
    currentRoomId = roomId;
    playerNumber = num;
    document.getElementById('player-label').textContent = `You are Player ${playerNumber}`;
    winScreenEl.style.display = 'none';
    menuEl.style.display = 'none';
    statusEl.textContent = `ID =  ${socket.id}`;
    gameContainerEl.style.display = 'block';
    document.getElementById('player-score').textContent = '0';
    document.getElementById('computer-score').textContent = '0';
});

socket.on('gameState', (game) => {
    drawGame(game);
});

document.addEventListener('keydown', (e) => { //if key is pressed
  if (e.key === 'ArrowUp' || e.key === 'w') socket.emit('paddleMove', 'up');
  else if (e.key === 'ArrowDown' || e.key === 's') socket.emit('paddleMove', 'down');
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'ArrowDown' || e.key === 's') {
    socket.emit('paddleMove', 'stop');
  }
});

socket.on('gameOver', ({ winner }) => {
  gameContainerEl.style.display = 'none';
  winScreenEl.style.display = 'flex';
  winMessageEl.textContent = (winner === playerNumber) ? 'You Win!' : 'You Lose!';
});

socket.on('opponentLeft', () => {
  winScreenEl.style.display = 'none';
  gameContainerEl.style.display = 'none';
  menuEl.style.display = 'flex';
  statusEl.textContent = 'Opponent left. Returning to menu.';
});

socket.on('waitingForRematch', () => {
  statusEl.textContent = 'Waiting for opponent to accept rematch...';
});

socket.on('ballScored', () => {//shake screen everytime someone scores
  shakeScreen();
});