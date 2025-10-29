function randomShips(boardShip = 10) {
    const SHIPS = [
        {
            name: 'carrier',
            size: 5,
        },
        {
            name: 'battleship',
            size: 4,
        },
        {
            name: 'cruiser',
            size: 3,
        },
        {
            name: 'submarine',
            size: 3,
        },
        {
            name: 'destroyer',
            size: 2,
        },
    ]

    let board, ships
    let boardAttempts = 0
    const maxBoardAttempts = 10

    // Thử tạo board nhiều lần nếu cần
    while (boardAttempts < maxBoardAttempts) {
        boardAttempts++
        board = Array(boardShip).fill().map(() => Array(boardShip).fill('empty'))
        ships = []
        let allShipsPlaced = true

        // Hàm kiểm tra xem vị trí có thể đặt tàu không (bao gồm khoảng cách 1 ô)
        const canPlaceShip = (row, col, size, orientation) => {
            // Tính toán vùng cần kiểm tra (bao gồm 1 ô xung quanh)
            const startRow = Math.max(0, row - 1)
            const endRow = Math.min(boardShip - 1, orientation === 'vertical' ? row + size : row + 1)
            const startCol = Math.max(0, col - 1)
            const endCol = Math.min(boardShip - 1, orientation === 'horizontal' ? col + size : col + 1)

            // Kiểm tra toàn bộ vùng xung quanh
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    if (board[r][c] !== 'empty') {
                        return false
                    }
                }
            }
            return true
        }

        for (let shipIndex = 0; shipIndex < SHIPS.length; shipIndex++) {
            const ship = SHIPS[shipIndex]
            let placed = false
            let attempts = 0
            const maxAttempts = 1000 // Tránh vòng lặp vô tận

            while (!placed && attempts < maxAttempts) {
                attempts++
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical'
                const row = Math.floor(Math.random() * boardShip)
                const col = Math.floor(Math.random() * boardShip)

                // Kiểm tra tàu có vượt quá bàn cờ không
                if (orientation === 'horizontal') {
                    if (col + ship.size > boardShip) continue
                } else {
                    if (row + ship.size > boardShip) continue
                }

                // Kiểm tra xem có thể đặt tàu không (bao gồm khoảng cách)
                if (!canPlaceShip(row, col, ship.size, orientation)) continue

                // Đặt tàu
                if (orientation === 'horizontal') {
                    for (let i = 0; i < ship.size; i++) {
                        board[row][col + i] = ship.name
                    }
                } else {
                    for (let i = 0; i < ship.size; i++) {
                        board[row + i][col] = ship.name
                    }
                }

                ships.push({ ...ship, row, col, orientation })
                placed = true
            }

            // Nếu không thể đặt tàu sau nhiều lần thử
            if (!placed) {
                console.warn(`Không thể đặt tàu ${ship.name}, sẽ thử tạo board mới`)
                allShipsPlaced = false
                break // Thoát khỏi loop SHIPS để thử board mới
            }
        }

        // Nếu tất cả tàu đã được đặt thành công
        if (allShipsPlaced) {
            console.log(`Tạo board thành công với ${ships.length} tàu, có khoảng cách`)
            break
        }
    }

    // Nếu không thể tạo board sau nhiều lần thử, fallback
    if (boardAttempts >= maxBoardAttempts) {
        console.warn('Không thể tạo board với khoảng cách, sử dụng board đơn giản')
        // Fallback: trả về board cơ bản
        board = Array(boardShip).fill().map(() => Array(boardShip).fill('empty'))
        ships = []
        // Đặt tàu đơn giản không cần khoảng cách
        let currentRow = 1
        SHIPS.forEach(ship => {
            for (let i = 0; i < ship.size; i++) {
                if (currentRow < boardShip) {
                    board[currentRow][1 + i] = ship.name
                }
            }
            ships.push({ ...ship, row: currentRow, col: 1, orientation: 'horizontal' })
            currentRow += 2 // Cách 1 hàng
        })
    }

    return { board, ships }
}

module.exports = { randomShips }