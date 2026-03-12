import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

function App() {

  const [mode, setMode] = useState(null);
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");

  const [socket, setSocket] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [inLobby, setInLobby] = useState(true);

  const [players, setPlayers] = useState([]);
  const [scoreBoard, setScoreBoard] = useState({});

  const [countdown, setCountdown] = useState(null);
  const [roundTransition, setRoundTransition] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const [currentRound, setCurrentRound] = useState(1);
  const [winner, setWinner] = useState(null);

  const [settings, setSettings] = useState({
    matchType: "single",
    rounds: 3,
    difficulty: "easy",
    timer: 30
  });

  const [paragraph, setParagraph] = useState("");
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [liveStats, setLiveStats] = useState([]);

  const generateRoomCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const connectToRoom = (code, host) => {

    const ws = new WebSocket(`ws://localhost:8000/ws/${code}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username }));

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
        setPlayers(data.players || []);
        setScoreBoard(data.score_board || {});
        setRoomName(data.room_name);
        setIsHost(data.is_host);
        setInLobby(!data.game_active);
      }

      else if (data.type === "game_start") {
        setInLobby(false);
        setCurrentRound(data.round);
        startRound();
      }

      else if (data.type === "next_round") {
        setCurrentRound(data.round);
        setScoreBoard(data.score_board);
        startRound();
      }

      else if (data.type === "tournament_ended") {
        setScoreBoard(data.score_board);
        setInLobby(true);
        announceWinner(data.score_board);
      }

      else {
        setLiveStats(prev => {
          const filtered = prev.filter(p => p.username !== data.username);
          return [...filtered, data];
        });
      }
    };

    setSocket(ws);
  };

  const createRoom = () => {
    const code = generateRoomCode();
    setRoomCode(code);
    connectToRoom(code, true);
  };

  const joinRoom = () => {
    connectToRoom(roomCode, false);
  };

  const startGame = () => {
    socket.send(JSON.stringify({
      type: "start_game",
      settings: settings
    }));
  };

  const startRound = () => {

    setRoundTransition(true);
    setGameStarted(false);
    setCountdown(3);

    let counter = 3;

    const interval = setInterval(() => {

      counter--;

      if (counter > 0) {
        setCountdown(counter);
      }

      else {

        clearInterval(interval);

        setCountdown("GO!");

        setTimeout(() => {

          setRoundTransition(false);
          setGameStarted(true);
          setTimeLeft(settings.timer);
          setMessage("");
          setStartTime(null);
          setLiveStats([]);

          generateParagraph();

        }, 1000);
      }

    }, 1000);
  };

  const wordBank = [
    "system","design","network","future","object","memory","light","cloud",
    "speed","signal","process","project","engine","random","power",
    "structure","logic","framework","dynamic","flow","analysis",
    "performance","distributed","algorithm","optimization","function",
    "variable","database","controller","interface","parallel",
    "thread","software","hardware","application","architecture"
  ];
  
  const generateParagraph = () => {
  
    let words = [];
  
    for (let i = 0; i < 35; i++) {
      const random =
        wordBank[Math.floor(Math.random() * wordBank.length)];
      words.push(random);
    }
  
    setParagraph(words.join(" "));
  };

  const endRound = useCallback(() => {

    if (liveStats.length === 0) return;

    const sorted = [...liveStats].sort((a, b) => b.wpm - a.wpm);

    const roundWinner = sorted[0].username;

    socket.send(JSON.stringify({
      type: "end_round",
      winner: roundWinner
    }));

  }, [liveStats, socket]);

  useEffect(() => {

    let intervalId = null;

    if (gameStarted && timeLeft > 0) {

      intervalId = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }

    if (gameStarted && timeLeft === 0 && isHost) {

      endRound();
      setGameStarted(false);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };

  }, [timeLeft, gameStarted, isHost, endRound]);

  const announceWinner = (scores) => {

    const sorted =
      Object.entries(scores).sort((a, b) => b[1] - a[1]);

    setWinner(sorted[0][0]);
  };

  const handleTyping = (e) => {

    const value = e.target.value;

    setMessage(value);

    if (value.length > paragraph.length - 40) {

      let newWords = [];
    
      for (let i = 0; i < 20; i++) {
        const random =
          wordBank[Math.floor(Math.random() * wordBank.length)];
        newWords.push(random);
      }
    
      setParagraph(prev => prev + " " + newWords.join(" "));
    }

    if (!startTime) setStartTime(Date.now());

    const correctChars =
      paragraph.split("").filter((char, i) => value[i] === char).length;

    const elapsedMinutes =
      startTime ? (Date.now() - startTime) / 60000 : 0;

    const wpm =
      elapsedMinutes > 0
        ? Math.round((correctChars / 5) / elapsedMinutes)
        : 0;

    const accuracy =
      value.length > 0
        ? Math.round((correctChars / value.length) * 100)
        : 100;

    socket.send(JSON.stringify({
      username,
      wpm,
      accuracy
    }));
  };

  const renderParagraph = () => {

    return paragraph.split("").map((char, index) => {

      let className = "char";

      if (index < message.length) {
        className =
          message[index] === char
            ? "char correct"
            : "char incorrect";
      }

      if (index === message.length) {
        className += " cursor";
      }

      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="space-container">

      {roundTransition && (
        <div className="overlay">
          <h1>Round {currentRound}</h1>
          <h2>{countdown}</h2>
        </div>
      )}

      {!socket && (
        <div className="card">

          <h1>Typing Battle ⚡</h1>

          {!mode && (
            <>
              <button onClick={() => setMode("create")}>Create Room</button>
              <div className="divider">OR</div>
              <button onClick={() => setMode("join")}>Join Room</button>
            </>
          )}

          {mode === "create" && (
            <>
              <input
                placeholder="Username"
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
                placeholder="Username"
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

          {isHost && (
            <div className="host-settings">

              <label>Game Mode</label>

              <select
                value={settings.matchType}
                onChange={(e) =>
                  setSettings({ ...settings, matchType: e.target.value })
                }
              >
                <option value="single">Single Match</option>
                <option value="tournament">Tournament</option>
              </select>

              {settings.matchType === "tournament" && (
                <>
                  <label>Rounds</label>

                  <select
                    value={settings.rounds}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        rounds: Number(e.target.value)
                      })
                    }
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={7}>7</option>
                  </select>
                </>
              )}

              <label>Difficulty</label>

              <select
                value={settings.difficulty}
                onChange={(e) =>
                  setSettings({ ...settings, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <label>Round Timer</label>

              <select
                value={settings.timer}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    timer: Number(e.target.value)
                  })
                }
              >
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>

            </div>
          )}

          <h3>Players</h3>

          {players.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {isHost && (
            <button onClick={startGame}>Start Game</button>
          )}

          {winner && <h2>Winner: {winner}</h2>}

        </div>
      )}

      {socket && !inLobby && (
        <div className="card">

          <h3>Round {currentRound}</h3>
          <h3>Time Left: {timeLeft}s</h3>

          <div className="paragraph">{renderParagraph()}</div>

          <textarea
            value={message}
            onChange={handleTyping}
            disabled={!gameStarted}
          />

        </div>
      )}

    </div>
  );
}

export default App;