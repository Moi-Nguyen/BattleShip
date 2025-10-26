import { useState, useEffect, useMemo } from 'react'
import socket from '../utils/socket'
import { Timer } from './TImer'

// Tạo empty board một lần để tránh recreate
const createEmptyShots = () => Array(10).fill().map(() => Array(10).fill(null))

export const Board = ({ roomCode, handleAttack, myBoardData, myBoardShots, enemyBoardShots, isMyTurn = false, timeLeft = 60 }) => {
    const row = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const col = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    // Sử dụng board từ server, fallback empty nếu chưa có
    const actualMyBoardData = myBoardData || {
        board: Array(10).fill().map(() => Array(10).fill('empty')),
        ships: []
    }

    // Đảm bảo shots không bao giờ là null - sử dụng useMemo để tránh tạo array mới mỗi lần render
    const safeMyBoardShots = useMemo(() => {
        return myBoardShots || createEmptyShots()
    }, [myBoardShots])

    const safeEnemyBoardShots = useMemo(() => {
        return enemyBoardShots || createEmptyShots()
    }, [enemyBoardShots])

    // Board sẽ được server tạo khi start game, không cần gửi từ client


    // Các trạng thái ô:
    // 'empty' - ô trống
    // 'ship' - có tàu (chỉ hiển thị ở bàn mình)
    // 'hit' - bắn trúng
    // 'miss' - bắn trượt

    const getCellStyle = (rowIndex, colIndex, isMyBoard) => {
        const baseStyle = {
            width: '30px',
            height: '30px',
            border: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
        }

        if (isMyBoard) {
            // Hiển thị board của mình và ô bị bắn
            const cellValue = actualMyBoardData?.board?.[rowIndex]?.[colIndex] || 'empty'
            const shotResult = safeMyBoardShots[rowIndex][colIndex]

            // Nếu đã bị bắn, hiển thị kết quả bắn
            if (shotResult === 'hit') {
                return {
                    ...baseStyle,
                    backgroundColor: '#f44336', // Đỏ - bị bắn trúng
                    color: 'white',
                    cursor: 'default'
                }
            } else if (shotResult === 'miss') {
                return {
                    ...baseStyle,
                    backgroundColor: '#9e9e9e', // Xám - bị bắn trượt
                    color: 'white',
                    cursor: 'default'
                }
            }

            // Nếu chưa bị bắn, hiển thị tàu hoặc ô trống
            if (cellValue !== 'empty') {
                return {
                    ...baseStyle,
                    backgroundColor: '#2196f3', // Xanh - có tàu
                    color: 'white',
                    cursor: 'default'
                }
            } else {
                return {
                    ...baseStyle,
                    backgroundColor: '#e3f2fd', // Xanh nhạt - ô trống
                    cursor: 'not-allowed'
                }
            }
        } else {
            // Bàn địch - hiển thị kết quả bắn
            const shotResult = safeEnemyBoardShots[rowIndex][colIndex]
            if (shotResult === 'hit') {
                return {
                    ...baseStyle,
                    backgroundColor: '#f44336',
                    color: 'white',
                    cursor: 'default'
                }
            } else if (shotResult === 'miss') {
                return {
                    ...baseStyle,
                    backgroundColor: '#9e9e9e',
                    color: 'white',
                    cursor: 'default'
                }
            } else {
                return {
                    ...baseStyle,
                    backgroundColor: '#e3f2fd',
                    cursor: 'crosshair'
                }
            }
        }
    }

    const getCellContent = (rowIndex, colIndex, isMyBoard) => {
        if (isMyBoard) {
            // Hiển thị board của mình
            const cellValue = actualMyBoardData?.board?.[rowIndex]?.[colIndex] || 'empty'
            const shotResult = safeMyBoardShots[rowIndex][colIndex]

            // Ưu tiên hiển thị kết quả bắn nếu đã bị bắn
            if (shotResult === 'hit') return '💥'
            if (shotResult === 'miss') return '💧'

            // Nếu chưa bị bắn, hiển thị tàu nếu có
            return cellValue !== 'empty' ? '🚢' : ''
        } else {
            // Hiển thị kết quả bắn trên bàn địch
            const shotResult = safeEnemyBoardShots[rowIndex][colIndex]
            if (shotResult === 'hit') return '💥'
            if (shotResult === 'miss') return '💧'
            return ''
        }
    }

    const handleCellClick = (rowIndex, colIndex, isMyBoard) => {
        if (!isMyBoard) {
            // Chỉ cho phép bắn vào bàn địch nếu chưa bắn và đang tới lượt
            if (!isMyTurn || timeLeft <= 0) return
            if (safeEnemyBoardShots[rowIndex][colIndex] === null && handleAttack) {
                handleAttack(rowIndex, colIndex)
                console.log(`Bắn vào [${rowIndex},${colIndex}]`)
            }
        }
    }

    const renderBoard = (_, isMyBoard, title) => (
        <div style={{ margin: '20px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>{title}</h3>

            {/* Số cột (A-J) */}
            <div style={{ display: 'flex', marginLeft: '30px' }}>
                {row.map(letter => (
                    <div key={letter} style={{
                        width: '30px',
                        height: '20px',
                        marginRight: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '12px'
                    }}>
                        {letter}
                    </div>
                ))}
            </div>

            {/* Bàn cờ */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Array(10).fill().map((_, rowIndex) => (
                    <div key={rowIndex} style={{ display: 'flex' }}>
                        {/* Số hàng (1-10) */}
                        <div style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px'
                        }}>
                            {col[rowIndex]}
                        </div>

                        {/* Các ô trong hàng */}
                        {row.map((_, colIndex) => (
                            <div
                                key={colIndex}
                                style={getCellStyle(rowIndex, colIndex, isMyBoard)}
                                onClick={() => handleCellClick(rowIndex, colIndex, isMyBoard)}
                                title={`${row[colIndex]}${col[rowIndex]}`}
                            >
                                {getCellContent(rowIndex, colIndex, isMyBoard)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            backgroundColor: '#f5f5f5',
            minHeight: '100vh'
        }}>
            {/* Timer hiển thị lượt chơi */}
            <div style={{ marginBottom: '30px' }}>
                <Timer isMyTurn={isMyTurn} timeLeft={timeLeft} />
            </div>

            <div style={{
                display: 'flex',
                gap: '40px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                {renderBoard(null, true, "🛡️ Bàn của bạn")}
                {renderBoard(null, false, "🎯 Bàn địch (bắn vào đây)")}
            </div>


        </div>
    )
}