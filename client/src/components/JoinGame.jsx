import { useEffect, useState } from "react"
import socket from "../utils/socket"

export const JoinGame = ({ onJoin }) => {
    const [name, setName] = useState('')
    const [roomCode, setRoomCode] = useState('')
    const handleCreateRoom = () => {

        if (!name.trim()) {
            alert('Vui lòng nhập tên')
            return
        }

        socket.emit('create-room', { name })
    }

    const handleJoinRoom = () => {
        if (!name.trim() || !roomCode.trim()) {
            alert('Vui lòng nhập đầy đủ tên và mã phòng')
            return
        }

        socket.emit('join-room', { name, roomCode })
    }
        useEffect(() => {
            socket.on('room-full', () => {
                alert('Phòng đã đầy')
            })

            socket.on('room-invalid', () => {
                alert('Phòng không tồn tại')
            })

            socket.on('room-created', (roomCode) => {
                console.log("Đã tạo phòng:", roomCode)
                onJoin(name, roomCode)
            })

            socket.on('room-joined', ({ roomCode }) => {
                console.log("Đã vào phòng:", roomCode)
                onJoin(name, roomCode)
            })

            return () => {
                socket.off('room-full')
                socket.off('room-invalid')
                socket.off('room-created')
                socket.off('room-joined')
            }
        }, [name, onJoin])

    
    return (
        <div className='join-game'>
            <h2>Battleship Game</h2>
            <input
                type="text"
                placeholder='Nhập tên của bạn'
                onChange={(e) => setName(e.target.value)}
                value={name}
            />

            <div>
                <button onClick={handleCreateRoom}>
                    Tạo phòng mới
                </button>
            </div>

            <div style={{ margin: '20px 0' }}>
                <h3>Tham gia phòng có sẵn</h3>
                <input
                    type="text"
                    placeholder='Nhập mã phòng'
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    value={roomCode}
                />
                <button onClick={handleJoinRoom}>
                    Tham gia phòng
                </button>
            </div>        
        </div>
    )
}