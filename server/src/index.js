const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { randomShips } = require('../utils/randomShips');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    }
});

const rooms = new Map()

// ==== Helpers quản lý lượt và thời gian ====
const emitTurnUpdated = (roomCode) => {
    const room = rooms.get(roomCode)
    if (!room) return
    const turnData = {
        roomCode,
        turnPlayerId: room.turnPlayerId,
        turnDeadline: room.turnDeadline,
    }
    console.log('📡 Phát turn-updated:', turnData)
    io.to(roomCode).emit('turn-updated', turnData)
}

const switchTurn = (roomCode) => {
    const room = rooms.get(roomCode)
    if (!room || room.status !== 'playing') return
    if (!room.players || room.players.length < 2) return

    const current = room.turnPlayerId
    const next = room.players.find(p => p.id !== current)?.id
    room.turnPlayerId = next || current
    room.turnDeadline = Date.now() + 60_000
    emitTurnUpdated(roomCode)
}

const ensureTurnInterval = (roomCode) => {
    const room = rooms.get(roomCode)
    if (!room) return
    if (room.turnInterval) return
    room.turnInterval = setInterval(() => {
        if (room.status !== 'playing') return
        const now = Date.now()
        if (typeof room.turnDeadline !== 'number') return
        if (now > room.turnDeadline) {
            // Hết thời gian -> mất lượt
            switchTurn(roomCode)
        }
    }, 1000)
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Tạo phòng mới
    socket.on('create-room', ({ name }) => {
        const player = {
            id: socket.id,
            name,
            joinedAt: Date.now(),
            board: null,
            ships: null,
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        rooms.set(roomCode, {
            players: [player],
            status: 'waiting',
        })

        socket.join(roomCode)
        socket.emit('room-created', roomCode)

        // Gửi thông tin phòng ngay lập tức
        io.to(roomCode).emit('update-room', {
            players: rooms.get(roomCode).players,
            roomCode: roomCode,
        })

        console.log(`Phòng ${roomCode} đã được tạo bởi ${name}`)
    })

    // Tham gia phòng đã có
    socket.on('join-room', ({ name, roomCode }) => {
        const room = rooms.get(roomCode)

        if (!room) {
            socket.emit('room-invalid')
            return
        }

        if (room.players.length >= 2) {
            socket.emit('room-full')
            return
        }

        const player = {
            id: socket.id,
            name,
            joinedAt: Date.now(),
            board: null,
            ships: null,
        }

        room.players.push(player)
        socket.join(roomCode)
        socket.emit('room-joined', { roomCode })

        // Gửi cập nhật cho tất cả mọi người trong phòng
        io.to(roomCode).emit('update-room', {
            players: room.players,
            roomCode: roomCode,
        })

        if (room.players.length === 2) {
            // Chỉ gửi thông báo sẵn sàng cho người tạo phòng (host - người đầu tiên)
            const hostSocket = room.players[0].id
            io.to(hostSocket).emit('room-ready')

            // Gửi thông báo cho người thứ 2 biết đang chờ host
            socket.emit('waiting-for-host')
        }

        console.log(`${name} đã tham gia phòng ${roomCode}`)
    })


    // Bắn tàu
    socket.on('attack', ({ roomCode, row, col }) => {
        const room = rooms.get(roomCode);
        if (!room) return;
        if (room.status !== 'playing') return;

        const attacker = socket.id;
        if (room.turnPlayerId !== attacker) return; // Không đúng lượt

        const defender = room.players.find(p => p.id !== attacker);
        if (!defender || !defender.board) return;

        const r = Number(row), c = Number(col)
        if (!Number.isInteger(r) || !Number.isInteger(c)) return
        if (r < 0 || r >= defender.board.length) return
        if (c < 0 || c >= defender.board[0].length) return

        // Kiểm tra ô có tàu không (defender.board[row][col] có thể là tên tàu hoặc 'empty')
        const cellValue = defender.board[r][c];
        if (cellValue === 'hit' || cellValue === 'miss') return // đã bắn rồi
        const isHit = cellValue !== 'empty';

        const hitResult = {
            row: r,
            col: c,
            result: isHit ? 'hit' : 'miss',
            attackerId: attacker,
            shipType: isHit ? cellValue : null
        };

        console.log(`Attack từ ${attacker} tại [${r},${c}]: ${hitResult.result}`);

        // Cập nhật board defender
        defender.board[r][c] = isHit ? 'hit' : 'miss'

        io.to(roomCode).emit('attack-result', hitResult);

        // Kiểm tra kết thúc game: không còn ô nào là tên tàu
        const defenderHasShipCell = defender.board.some(rowArr => rowArr.some(v => v !== 'empty' && v !== 'hit' && v !== 'miss'))
        if (!defenderHasShipCell) {
            room.status = 'finished'
            if (room.turnInterval) {
                clearInterval(room.turnInterval)
                room.turnInterval = null
            }
            io.to(roomCode).emit('game-over', {
                winnerId: attacker,
                loserId: defender.id,
            })
            return
        }

        // Cập nhật lượt theo kết quả
        if (isHit) {
            // Giữ lượt và reset thời gian
            room.turnDeadline = Date.now() + 60_000
            emitTurnUpdated(roomCode)
        } else {
            // Bắn trượt -> đổi lượt
            switchTurn(roomCode)
        }
    });


    // Bắt đầu game
    socket.on('start-game', ({ roomCode }) => {
        const room = rooms.get(roomCode)
        if (!room) return
        if (room.players.length === 2) {
            room.status = 'playing'

            // Tạo board cho cả 2 người chơi
            room.players.forEach((player, index) => {
                const { board, ships } = randomShips()
                player.board = board
                player.ships = ships
                console.log(`Tạo board cho ${player.name}: ${ships.length} tàu`)
            })

            // Gửi thông báo game started
            io.to(roomCode).emit('game-started', {
                players: room.players,
            })

            // Gửi board riêng cho từng người chơi
            room.players.forEach(player => {
                io.to(player.id).emit('your-board', {
                    board: player.board,
                    ships: player.ships
                })
            })

            // Khởi tạo lượt: chủ phòng bắn trước
            room.turnPlayerId = room.players[0].id
            room.turnDeadline = Date.now() + 60_000
            console.log('🎮 Game bắt đầu, lượt đầu tiên:', room.players[0].name, 'deadline:', new Date(room.turnDeadline))
            emitTurnUpdated(roomCode)

            // Theo dõi timeout lượt
            ensureTurnInterval(roomCode)

            console.log(`Bắt đầu game trong phòng ${roomCode}`)
        }
    })



    // Ngắt kết nối
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)

        rooms.forEach((room, roomCode) => {
            const playerIndex = room.players.findIndex(player => player.id === socket.id)

            if (playerIndex !== -1) {
                const leavingPlayer = room.players[playerIndex]
                console.log(`${leavingPlayer.name} đã thoát khỏi phòng ${roomCode}`)

                // Xoá player
                room.players.splice(playerIndex, 1)

                // Gửi thông báo cho người còn lại
                io.to(roomCode).emit('player-left', {
                    playerName: leavingPlayer.name,
                    playersCount: room.players.length,
                })

                // Gửi cập nhật danh sách
                io.to(roomCode).emit('update-room', {
                    players: room.players,
                    roomCode: roomCode,
                })

                // Nếu đang chơi và chỉ còn 1 người -> kết thúc game cho người còn lại thắng
                if (room.status === 'playing' && room.players.length === 1) {
                    room.status = 'finished'
                    if (room.turnInterval) {
                        clearInterval(room.turnInterval)
                        room.turnInterval = null
                    }
                    io.to(roomCode).emit('game-over', {
                        winnerId: room.players[0].id,
                        loserId: leavingPlayer.id,
                    })
                }

                // Xoá phòng nếu trống
                if (room.players.length === 0) {
                    rooms.delete(roomCode)
                    console.log(`Phòng ${roomCode} đã bị xoá vì không còn ai`)
                }
            }
        })
    })

})

server.listen(3001, () => {
    console.log('Server is running on port 3001')
})