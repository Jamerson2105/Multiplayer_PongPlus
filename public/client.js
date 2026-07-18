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
const restartButton = document.getElementById('restart-button');

playButton.addEventListener('click', () => {
  menuEl.style.display = 'none';
  gameContainerEl.style.display = 'block';
  socket.emit('findMatch');
  statusEl.textContent = `ID = ${socket.id}, Connecting with another player...`;
});

restartButton.addEventListener('click', () => {
  winScreenEl.style.display = 'none';
  gameContainerEl.style.display = 'block';
document.getElementById('player-score').textContent = '0';   // reset display scores
  document.getElementById('computer-score').textContent = '0';
  statusEl.textContent = 'Waiting for an opponent...';
  socket.emit('findMatch');
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

//connect fires on the client when it successfully connects to server

function drawGame(game){

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw paddle 1 (left side)
    ctx.fillStyle = 'white';

    ctx.fillRect(PADDLE_EDGE_DIST, game.paddle1.y, PADDLE_WIDTH, PADDLE_HEIGHT);

  // Draw paddle 2 (right side)
    ctx.fillRect(GAME_WIDTH - PADDLE_EDGE_DIST, game.paddle2.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillRect(game.ball.x - BALL_SIZE / 2, game.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

    document.getElementById('player-score').textContent = game.score1;
    document.getElementById('computer-score').textContent = game.score2;
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
    statusEl.textContent = `You are Player ${playerNumber}`;
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
  winScreenEl.style.display = 'block';
  winMessageEl.textContent = (winner === playerNumber) ? 'You Win!' : 'You Lose!';
});