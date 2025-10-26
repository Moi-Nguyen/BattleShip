import { useEffect } from 'react'
export const Timer = ({ isMyTurn = false, timeLeft = 60 }) => {
    // Debug log
    useEffect(() => {
        console.log('🎯 Timer render:', { isMyTurn, timeLeft })
    }, [isMyTurn, timeLeft])
    const formatTime = (time) => {
        const minutes = Math.floor(time / 60)
        const remainingSeconds = time % 60
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
            .toString()
            .padStart(2, '0')}`
    }

    const getTimerColor = () => {
        if (timeLeft <= 10) return '#e74c3c'
        if (timeLeft <= 30) return '#f39c12'
        return '#27ae60'
    }

    const timerStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
        border: `3px solid ${isMyTurn ? '#3498db' : '#95a5a6'}`,
        minWidth: '260px',
        transition: 'all 0.3s ease'
    }

    const turnIndicatorStyle = {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '8px',
        color: isMyTurn ? '#3498db' : '#95a5a6',
        textAlign: 'center'
    }

    const timerDisplayStyle = {
        fontSize: '40px',
        fontWeight: 'bold',
        color: getTimerColor(),
        textAlign: 'center',
        marginBottom: '12px',
        fontFamily: 'monospace',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)'
    }

    return (
        <div style={timerStyle}>
            <div style={turnIndicatorStyle}>
                {isMyTurn ? '🎯 Lượt của bạn' : '⏳ Lượt của đối thủ'}
            </div>
            <div style={timerDisplayStyle}>{formatTime(timeLeft)}</div>
            <div
                style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#ecf0f1',
                    borderRadius: '4px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        width: `${(timeLeft / 60) * 100}%`,
                        height: '100%',
                        backgroundColor: getTimerColor(),
                        transition: 'width 1s linear',
                        borderRadius: '4px',
                    }}
                />
            </div>
        </div>
    )
}