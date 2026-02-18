import React, { useState, useEffect } from "react";

function App() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [players, setPlayers] = useState([]);

  const connectToRoom = () => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

    ws.onopen = () => {
      console.log("Connected to room");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPlayers((prev) => {
        const updated = prev.filter(p => p.username !== data.username);
        return [...updated, data];
      });
    };

    setSocket(ws);
  };

  const sendUpdate = (wpm, accuracy) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          username,
          wpm,
          accuracy,
        })
      );
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Typing Battle 🔥</h1>

      {!socket ? (
        <>
          <input
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br /><br />
          <input
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <br /><br />
          <button onClick={connectToRoom}>Join Room</button>
        </>
      ) : (
        <>
          <h2>Connected to Room: {roomId}</h2>

          <input
            placeholder="Type something..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              const wpm = Math.floor(message.length / 5);
              sendUpdate(wpm, 100);
            }}
          />

          <h3>Leaderboard</h3>
          <ul>
            {players
              .sort((a, b) => b.wpm - a.wpm)
              .map((player, index) => (
                <li key={index}>
                  {player.username} — {player.wpm} WPM
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
