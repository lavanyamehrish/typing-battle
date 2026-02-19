import React, { useState, useEffect } from "react";
import "./App.css";

function App() {

  const [mode, setMode] = useState(null); // "create" or "join"

  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");

  const [socket, setSocket] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [inLobby, setInLobby] = useState(true);

  const [players, setPlayers] = useState([]);
  const [winner, setWinner] = useState(null);

  const [settings, setSettings] = useState({
    timer: 60,
    word_count: 50,
    difficulty: "easy"
  });

  const [paragraph, setParagraph] = useState("");
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [startTime, setStartTime] = useState(null);

  const generateRoomCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    connectToRoom(code, true);
  };

  const joinRoom = () => {
    connectToRoom(roomCode, false);
  };

  const connectToRoom = (code, host) => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${code}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        username: username
      }));

      if (host) {
        ws.send(JSON.stringify({
          type: "update_room_name",
          room_name: roomName
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "lobby_update") {
        setIsHost(data.is_host);
        setPlayers(data.players);
        setRoomName(data.room_name);
        setInLobby(!data.game_active);
      }

      else if (data.type === "game_start") {
        setInLobby(false);
        setTimeLeft(data.settings.timer);
        generateParagraph(
          data.settings.word_count,
          data.settings.difficulty
        );
      }

      else if (data.type === "game_terminated") {
        setInLobby(true);
        setWinner(null);
        setMessage("");
      }

      else {
        setPlayers(prev => {
          const filtered = prev.filter(p => p.username !== data.username);
          return [...filtered, data];
        });
      }
    };

    setSocket(ws);
  };

  const startGame = () => {
    socket.send(JSON.stringify({
      type: "start_game",
      settings
    }));
  };

  const generateParagraph = (wordCount, difficulty) => {
    const easy = [
      "The sky is blue and the weather is calm today.",
      "She enjoys reading books in the quiet library."
    ];

    let text = "";
    while (text.split(" ").length < wordCount) {
      text += easy[Math.floor(Math.random() * easy.length)] + " ";
    }

    setParagraph(text.trim());
  };

  useEffect(() => {
    let interval;
    if (!inLobby && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inLobby, timeLeft]);

  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (!startTime) setStartTime(Date.now());

    const correctChars = paragraph
      .split("")
      .filter((char, index) => value[index] === char).length;

    const elapsedMinutes =
      startTime ? (Date.now() - startTime) / 60000 : 0;

    const wpm =
      elapsedMinutes > 0
        ? Math.round((correctChars / 5) / elapsedMinutes)
        : 0;

    socket.send(JSON.stringify({
      username,
      wpm
    }));
  };

  return (
    <div className="space-container">

      {!socket && (
        <div className="card">

          <h1>Typing Battle ⚡</h1>

          {!mode && (
            <>
              <button onClick={() => setMode("create")}>
                Create Room
              </button>

              <div className="divider">OR</div>

              <button onClick={() => setMode("join")}>
                Join Room
              </button>
            </>
          )}

          {mode === "create" && (
            <>
              <input
                placeholder="Your Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <input
                placeholder="Room Name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />

              <button
                disabled={!username || !roomName}
                onClick={createRoom}
              >
                Create
              </button>
            </>
          )}

          {mode === "join" && (
            <>
              <input
                placeholder="Your Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />

              <input
                placeholder="Room Code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              />

              <button
                disabled={!username || !roomCode}
                onClick={joinRoom}
              >
                Join
              </button>
            </>
          )}
        </div>
      )}

      {socket && inLobby && (
        <div className="card">
          <h2>{roomName}</h2>
          <p>Room Code: {roomCode}</p>
          <p>{isHost ? "👑 Host" : "Player"}</p>

          <h3>Players</h3>
          {players.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {isHost && (
            <button onClick={startGame}>
              🚀 Start Game
            </button>
          )}
        </div>
      )}

      {socket && !inLobby && (
        <div className="card">
          <h3>Time Left: {timeLeft}s</h3>
          <p>{paragraph}</p>

          <textarea
            value={message}
            onChange={handleTyping}
          />
        </div>
      )}
    </div>
  );
}

export default App;
