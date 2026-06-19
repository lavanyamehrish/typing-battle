# Typing Battle

A real-time multiplayer typing game where players compete against each other by typing the same text as quickly and accurately as possible. The application uses WebSockets to provide instant synchronization of gameplay, live score updates, and competitive multiplayer rooms.

## Features

- Real-time multiplayer gameplay
- Create and join game rooms
- Live typing progress tracking
- Synchronized countdown timer
- Dynamic word/text generation
- Real-time leaderboard
- Low-latency communication using WebSockets
- Responsive and user-friendly interface

## Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js
- Socket.IO

## How It Works

1. Players create or join a game room.
2. A common typing passage is generated for all players.
3. A synchronized timer starts the game.
4. Each player's progress is transmitted in real time using WebSockets.
5. The leaderboard updates instantly based on typing speed and accuracy.
6. The player with the highest score at the end of the timer wins.

## Project Structure

```
Typing-Battle/
│
├── public/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── server/
│   └── server.js
│
├── package.json
└── README.md
```

## Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/Typing-Battle.git
```

2. Navigate to the project directory

```bash
cd Typing-Battle
```

3. Install dependencies

```bash
npm install
```

4. Start the server

```bash
npm start
```

5. Open your browser and visit

```
http://localhost:3000
```

## Future Enhancements

- User authentication
- Global leaderboard
- Match history
- Difficulty levels
- Multiplayer tournaments
- Custom game rooms
- Mobile responsiveness
- Player statistics dashboard

## Learning Outcomes

This project strengthened my understanding of:

- Real-time web applications
- WebSocket communication
- Client-server architecture
- Event-driven programming
- Multiplayer game synchronization
- Backend API development using Node.js and Express
- Collaborative software development practices

## Author

**Lavanya Mehrish**

B.Tech Computer Science (Data Science Major | FinTech Minor)

GitHub: https://github.com/lavanyamehrish
