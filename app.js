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

    // Запуск таймера
    updateTimer = setInterval(updateTimerDisplay, 1000);

    // Запуск отслеживания геолокации
    watchId = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function handlePosition(position) {
    lastPosition = position;
    const accuracy = position.coords.accuracy;
    updateAccuracy(accuracy);

    // Отправка данных боту
    const now = Date.now();
    if (now - lastSendTime >= SEND_INTERVAL) {
        sendLocationData(position);
        lastSendTime = now;
    }
}

function handleError(error) {
    console.error('Ошибка геолокации:', error);
    updateStatus('error', `Ошибка: ${getLocationErrorMessage(error)}`);
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    if (lastPosition) {
        sendLocationData(lastPosition, true);
    }

    isTracking = false;
    clearInterval(updateTimer);
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    updateStatus('inactive', 'Отслеживание остановлено');
}

function sendLocationData(position, isFinal = false) {
    const data = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        isFinal: isFinal
    };

    try {
        Telegram.WebApp.sendData(JSON.stringify(data));
        updateStatus('active', 'Данные успешно отправлены');
        console.log('Отправлены данные:', data);
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
        updateStatus('error', 'Ошибка отправки данных');
    }
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
    if (isTracking && lastPosition) {
        sendLocationData(lastPosition, true);
    }
});