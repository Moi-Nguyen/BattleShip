import { useEffect, useState } from "react";
import socket from "./utils/socket";
import { JoinGame } from "./components/JoinGame";
import { Board } from './components/Board'

const App = () => {
  const [playerName, setPlayerName] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
    const [myBoardData, setMyBoardData] = useState(null);
  const [myBoardShots, setMyBoardShots] = useState(
    Array(10).fill().map(() => Array(10).fill(null))
  );
  const [enemyBoardShots, setEnemyBoardShots] = useState(
    Array(10).fill().map(() => Array(10).fill(null))
  );
  // Trạng thái lượt & thời gian còn lại
  const [turnPlayerId, setTurnPlayerId] = useState(null)
  const [turnDeadline, setTurnDeadline] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const handleLeaveRoom = () => {
    const confirmLeave = window.confirm("Bạn có chắc muốn thoát khỏi phòng?");
    if (confirmLeave) {
      socket.disconnect();
      socket.connect();
      setPlayerName(null);
      setRoomInfo(null);
      setIsReady(false);
      setIsWaitingForHost(false);
      setIsPlaying(false);
      setMyBoardData(null)
      setMyBoardShots(Array(10).fill().map(() => Array(10).fill(null)))
      setEnemyBoardShots(Array(10).fill().map(() => Array(10).fill(null)))
    }
  };
  const handleStartGame = () => {
    socket.emit("start-game", { roomCode: roomInfo.roomCode });
  };

   const handleAttack = (row, col) => {
    if (!roomInfo?.roomCode) return;
    socket.emit('attack', { roomCode: roomInfo.roomCode, row, col });
  };

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    socket.on("update-room", ({ players, roomCode }) => {
      setRoomInfo({ players, roomCode });
      console.log("Room updated:", players, "Room code:", roomCode);
    });

    socket.on("player-left", ({ playerName, playersCount }) => {
      alert(
        `🚪 ${playerName} đã thoát khỏi phòng. Phòng hiện tại: ${playersCount}/2 người`
      );
      console.log(`Player left: ${playerName}, remaining: ${playersCount}`);
    });
    socket.on("room-ready", () => {
      setIsReady(true);
    });

    socket.on("waiting-for-host", () => {
      setIsWaitingForHost(true);
    });

    socket.on("game-started", ({ players }) => {
      console.log("Players in game:", players);
      setIsPlaying(true);
      setIsReady(false);
      setIsWaitingForHost(false);
    });
     
    socket.on('your-board', ({ board, ships }) => {
      setMyBoardData({ board, ships });
      // console.log('Nhận board của mình:', { board, ships });
    });

    socket.on('attack-result', ({ row, col, result, attackerId, shipType }) => {
      if (attackerId === socket.id) {
        // Bạn là người bắn - cập nhật kết quả bắn trên bàn địch
        const updated = [...enemyBoardShots];
        updated[row][col] = result; // 'hit' hoặc 'miss'
        setEnemyBoardShots(updated);
        console.log(`Bạn bắn [${row},${col}]: ${result}${shipType ? ` (${shipType})` : ''}`);
      } else {
        // Bạn bị bắn - cập nhật ô bị bắn trên board của mình
        const updated = [...myBoardShots];
        updated[row][col] = result; // 'hit' hoặc 'miss'
        setMyBoardShots(updated);
        console.log(`Bạn bị bắn tại [${row},${col}]: ${result}${shipType ? ` (${shipType})` : ''}`);
      }
    });
    // Cập nhật lượt từ server
    socket.on('turn-updated', ({ roomCode: code, turnPlayerId, turnDeadline }) => {
      console.log('🔄 Nhận turn-updated:', { code, turnPlayerId, turnDeadline, currentRoom: roomInfo?.roomCode })
      setTurnPlayerId(turnPlayerId)
      setTurnDeadline(turnDeadline)
    })

    socket.on('game-over', ({ winnerId, loserId }) => {
      const isWinner = winnerId === socket.id
      alert(isWinner ? '🎉 Bạn thắng!' : '💀 Bạn thua!')
      setIsPlaying(false)
    })
    return () => {
      socket.off("update-room");
      socket.off("player-left");
      socket.off("room-ready");
      socket.off("waiting-for-host");
      socket.off("game-started");
       socket.off('your-board')
      socket.off('attack-result')
      socket.off('turn-updated')
      socket.off('game-over')
      socket.disconnect();
    };
  }, []);
// Tính thời gian còn lại mỗi giây
  useEffect(() => {
    if (!turnDeadline) {
      console.log('⏰ Không có turnDeadline, không bắt đầu countdown')
      return
    }
    console.log('⏰ Bắt đầu countdown từ:', new Date(turnDeadline))
    const id = setInterval(() => {
      const remain = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000))
      setSecondsLeft(remain)
      if (remain % 10 === 0 || remain <= 5) {
        console.log('⏰ Thời gian còn lại:', remain + 's')
      }
    }, 250)
    return () => clearInterval(id)
  }, [turnDeadline])

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🚢 Battleship Game</h1>
      {!playerName ? (
        <JoinGame
          onJoin={(name, roomCode) => {
            setPlayerName(name);
            if (roomCode) {
              setRoomInfo((prev) =>
                prev ? { ...prev, roomCode } : { roomCode, players: [] }
              );
            }
          }}
        />
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Chào mừng {playerName}!</h2>
            <button
              onClick={handleLeaveRoom}
              style={{
                padding: "8px 16px",
                backgroundColor: "#e74c3c",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              🚪 Thoát phòng
            </button>
          </div>

          {isPlaying ? (
            <>
              <div
                style={{
                  border: "1px solid #ccc",
                  padding: "15px",
                  margin: "10px 0",
                  borderRadius: "5px",
                }}
              >
                <h3>Thông tin phòng: {roomInfo.roomCode}</h3>
                <p>Số người chơi: {roomInfo.players.length}/2</p>
                <ul style={{ marginLeft: "20px" }}>
                  {roomInfo.players.map((player, index) => (
                    <li key={player.id} style={{ marginBottom: "5px" }}>
                      {player.name}
                      {player.id === socket.id ? " (Bạn)" : ""}
                      {index === 0 ? " 👑 (Chủ phòng)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                   <Board
                    roomCode={roomInfo.roomCode}
                    handleAttack={handleAttack}
                    myBoardData={myBoardData}
                    myBoardShots={myBoardShots}
                    enemyBoardShots={enemyBoardShots}
                  isMyTurn={turnPlayerId === socket.id}
                    timeLeft={secondsLeft}
                  />
              </div>
            </>
          ) : (
            <>
              {isReady && (
                <div>
                  <h3>Sẵn sàng bắt đầu game!</h3>
                  <button
                    onClick={handleStartGame}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#2ecc71",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Bắt đầu game
                  </button>
                </div>
              )}

              {isWaitingForHost && (
                <div>
                  <h3 style={{ color: "orange" }}>
                    ⏳ Đang chờ chủ phòng bắt đầu game...
                  </h3>
                </div>
              )}

              {roomInfo && (
                <div
                  style={{
                    border: "1px solid #ccc",
                    padding: "15px",
                    margin: "10px 0",
                    borderRadius: "5px",
                  }}
                >
                  <h3>Thông tin phòng: {roomInfo.roomCode}</h3>
                  <p>Số người chơi: {roomInfo.players.length}/2</p>
                  <ul style={{ marginLeft: "20px" }}>
                    {roomInfo.players.map((player, index) => (
                      <li key={player.id} style={{ marginBottom: "5px" }}>
                        {player.name}
                        {player.id === socket.id ? " (Bạn)" : ""}
                        {index === 0 ? " 👑 (Chủ phòng)" : ""}
                      </li>
                    ))}
                  </ul>
                  {roomInfo.players.length < 2 ? (
                    <p style={{ color: "orange", fontWeight: "bold" }}>
                      ⏳ Đang chờ đối thủ...
                    </p>
                  ) : (
                    <p style={{ color: "green", fontWeight: "bold" }}>
                      ✅ Phòng đã đầy! Sẵn sàng bắt đầu game!
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
