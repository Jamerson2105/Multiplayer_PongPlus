const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server); //create server

app.use(express.static('public'));

let waitingPlayer = null; //holds one socket at a time, whoever is waiting for an opponent
let roomCounter = 0;//generate unique room names(room_1 ,room_2, etc)
const games = {};
const availableRooms = [];

//game state
const WIN_SCORE = 1;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
//paddle properties
const PADDLE_WIDTH = 10;
const PADDLE_SPEED = 6;
const PADDLE_EDGE_DIST = 20;
//ball properties
const BALL_SIZE = 10;
const BALL_SPEED = 5;


function createGameState(){
    return{
        ball:{x: GAME_WIDTH /2, y: GAME_HEIGHT/2, dx: BALL_SPEED, dy: BALL_SPEED},
        paddle1: { x: PADDLE_EDGE_DIST, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
        paddle2: { x: GAME_WIDTH - PADDLE_EDGE_DIST, y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
        score1: 0,
        score2: 0
    }
}


io.on('connection', (socket) => {

    console.log('a player connected:', socket.id);

    socket.on('findMatch', () => {
    if(waitingPlayer === null){
        waitingPlayer = socket;
        socket.emit('waiting');// tell the client they are waiting for an opponent
        console.log(`${socket.id} is waiting for an opponent`)

        
    } else{
        //someone is already waiting, pair them up
        let roomId;
            if (availableRooms.length > 0) {//if there are rooms that can be reused, reuse them, else create a new one
                roomId = availableRooms.pop(); 
                console.log(`Reusing ${roomId}`);
            } else {
                roomCounter++;
                roomId = `room-${roomCounter}`; 
            }

        waitingPlayer.join(roomId);
        socket.join(roomId);

        waitingPlayer.emit('startGame', {roomId, playerNumber: 1});
        socket.emit('startGame', {roomId, playerNumber:2});
        games[roomId] = createGameState()// intitialize objects in that new room 
        console.log(`Paired ${waitingPlayer.id} (P1) and ${socket.id} (P2) into ${roomId}`);

    

    waitingPlayer.roomId = roomId;
    socket.roomId = roomId;
    waitingPlayer.playerNumber = 1;
    socket.playerNumber = 2;

    console.log(`Paired ${waitingPlayer.id} (P1) and ${socket.id} (P2) into ${roomId}`);

    waitingPlayer = null;


   
    }
    });
    //client sends 'up' or 'down' when a key is pressed, they send'stop'  when released

    socket.on('paddleMove', (direction) => {
        const roomId = socket.roomId;
        if (!roomId || !games[roomId]) return;

        const game = games[roomId];

        let paddle;

        if(socket.playerNumber === 1){//assign paddles
            paddle = game.paddle1;
        } else{
            paddle = game.paddle2;
        }

        if(direction === 'up') paddle.dy = -PADDLE_SPEED;
        else if (direction === 'down') paddle.dy = PADDLE_SPEED;
        else paddle.dy = 0;
    })

    socket.on('disconnect', () =>{
        console.log('a user disconnected:', socket.id);
    

    if(waitingPlayer === socket){
        waitingPlayer = null;
        console.log('Waiting player disconnected, slot cleared');
    }

    if(socket.roomId){
        socket.to(socket.roomId).emit('opponentLeft')
        delete games[socket.roomId];
        availableRooms.push(socket.roomId);
    }
});

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

setInterval(() =>{

for(const roomId in games){
    const game = games[roomId];

    //move paddles;
    game.paddle1.y += game.paddle1.dy || 0;
    game.paddle2.y += game.paddle2.dy || 0;
    game.paddle1.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, game.paddle1.y));
    game.paddle2.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, game.paddle2.y));

    //Move ball
    game.ball.x += game.ball.dx;
    game.ball.y += game.ball.dy;

    //bounce off top/bottom walls
    if (game.ball.y <= 0 || game.ball.y >= GAME_HEIGHT) {
      game.ball.dy *= -1;
    }

    //bounce off paddle 1/left padle
    if(
        game.ball.x <= game.paddle1.x + PADDLE_WIDTH &&
        game.ball.y >= game.paddle1.y &&
        game.ball.y <= game.paddle1.y + PADDLE_HEIGHT
     ){
        game.ball.dx *= -1;
     }

     //bounce of right paddle/paddle 2
    if (
      game.ball.x >= game.paddle2.x &&
      game.ball.y >= game.paddle2.y &&
      game.ball.y <= game.paddle2.y + PADDLE_HEIGHT
    ) {
      game.ball.dx *= -1;
    }
    // bounce off paddle 1 (left paddle) — only if ball is moving left
    if(
        game.ball.dx < 0 &&
        game.ball.x <= game.paddle1.x + PADDLE_WIDTH &&
        game.ball.x >= game.paddle1.x &&
        game.ball.y >= game.paddle1.y &&
        game.ball.y <= game.paddle1.y + PADDLE_HEIGHT
     ){
        game.ball.dx *= -1;
        game.ball.x = game.paddle1.x + PADDLE_WIDTH; // push ball just outside paddle
     }

     // bounce off paddle 2 (right paddle) — only if ball is moving right
    if (
      game.ball.dx > 0 &&
      game.ball.x >= game.paddle2.x &&
      game.ball.x <= game.paddle2.x + PADDLE_WIDTH &&
      game.ball.y >= game.paddle2.y &&
      game.ball.y <= game.paddle2.y + PADDLE_HEIGHT
    ) {
      game.ball.dx *= -1;
      game.ball.x = game.paddle2.x; // push ball just outside paddle
    }
    
    //scoring
    if (game.ball.x < 0) {
      game.score2++;
      game.ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: BALL_SPEED, dy: BALL_SPEED };
    } else if (game.ball.x > GAME_WIDTH) {
      game.score1++;
      game.ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, dx: -BALL_SPEED, dy: BALL_SPEED };
    }

    if (game.score1 >= WIN_SCORE || game.score2 >= WIN_SCORE) {
      const winner = game.score1 >= WIN_SCORE ? 1 : 2;
      io.to(roomId).emit('gameOver', { winner });
      delete games[roomId]; // stop updating this room
      availableRooms.push(roomId);
      continue; // skip the gameState emit below for this now-deleted room
    }

    io.to(roomId).emit('gameState', game);
  }
}, 1000 / 60);

