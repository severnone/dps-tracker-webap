let startTime = 0;
let updateTimer = null;
let isTracking = false;
let watchId = null;
let lastSendTime = 0;
let lastPosition = null;
const SEND_INTERVAL = 5000; // 5 секунд

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация интерфейса
    updateStatus('inactive', 'Готов к работе');
    document.getElementById('trackButton').addEventListener('click', startTracking);
});

function updateTimerDisplay() {
    if (!startTime) return;

    const now = Date.now();
    const diff = now - startTime;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateStatus(status, message) {
    const statusElement = document.getElementById('status');
    statusElement.className = `status ${status}`;
    statusElement.textContent = message;
}

function updateAccuracy(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    accuracyElement.textContent = `Точность: ${accuracy.toFixed(1)}м`;
}

function startTracking() {
    if (!navigator.geolocation) {
        updateStatus('error', 'Геолокация не поддерживается браузером');
        return;
    }

    if (isTracking) {
        stopTracking();
        return;
    }

    isTracking = true;
    startTime = Date.now();
    updateStatus('active', 'Запуск отслеживания...');
    document.getElementById('trackButton').textContent = 'Остановить отслеживание';

    // Отправляем стартовое сообщение
    const startData = {
        action: 'start_tracking',
        timestamp: Date.now()
    };
    Telegram.WebApp.sendData(JSON.stringify(startData));

    // Закрываем WebApp после старта
    setTimeout(() => {
        Telegram.WebApp.close();
    }, 1000);
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    const data = {
        action: 'stop_tracking',
        timestamp: Date.now()
    };

    try {
        Telegram.WebApp.sendData(JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    isTracking = false;
    clearInterval(updateTimer);
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    updateStatus('inactive', 'Отслеживание остановлено');

    // Закрываем WebApp после остановки
    setTimeout(() => {
        Telegram.WebApp.close();
    }, 1000);
}

function getLocationErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Доступ к геолокации запрещен";
        case error.POSITION_UNAVAILABLE:
            return "Информация о местоположении недоступна";
        case error.TIMEOUT:
            return "Превышено время ожидания";
        default:
            return "Неизвестная ошибка";
    }
}

// Добавляем обработчик закрытия окна
window.addEventListener('beforeunload', () => {
    if (isTracking) {
        const data = {
            action: 'stop_tracking',
            timestamp: Date.now()
        };
        try {
            Telegram.WebApp.sendData(JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка отправки данных при закрытии:', error);
        }
    }
});