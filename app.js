let startTime = 0;
let updateTimer = null;
let isTracking = false;
let watchId = null;
let lastSendTime = 0;
let lastPosition = null;
const SEND_INTERVAL = 5000; // 5 секунд

document.addEventListener('DOMContentLoaded', function() {
    updateStatus('inactive', 'Готов к работе');
    document.getElementById('trackButton').addEventListener('click', toggleTracking);
    console.log('WebApp загружен и готов к работе'); // Для отладки
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
    console.log(`Статус обновлен: ${status} - ${message}`); // Для отладки
}

function updateAccuracy(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    accuracyElement.textContent = `Точность: ${accuracy.toFixed(1)}м`;
    console.log(`Точность обновлена: ${accuracy.toFixed(1)}м`); // Для отладки
}

function toggleTracking() {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
}

function startTracking() {
    isTracking = true;
    document.getElementById('trackButton').textContent = 'Остановить отслеживание';
    updateStatus('active', 'Отслеживание активно');
    startTime = Date.now();
    updateTimer = setInterval(updateTimerDisplay, 1000);

    // Отправляем данные о начале отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'start_tracking' }));
        console.log('Отправлено start_tracking'); // Для отладки
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    // Начинаем отслеживание геолокации
    watchId = navigator.geolocation.watchPosition(sendLocation, handleLocationError, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
    });
}

async function sendLocation(position) {
    const now = Date.now();
    if (now - lastSendTime < SEND_INTERVAL) return;
    lastSendTime = now;
    lastPosition = position.coords;

    const data = {
        action: 'update_location',
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        timestamp: position.timestamp
    };

    try {
        Telegram.WebApp.sendData(JSON.stringify(data));
        console.log('Отправлено update_location:', data); // Для отладки
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }
}

function stopTracking() {
    if (!isTracking) return;

    // Отправляем данные о остановке отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'stop_tracking' }));
        console.log('Отправлено stop_tracking'); // Для отладки

        // Добавляем задержку перед закрытием WebApp
        setTimeout(() => {
            Telegram.WebApp.close();
            console.log('WebApp закрыт'); // Для отладки
        }, 1000); // 1 секунда
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    isTracking = false;
    startTime = 0;
    clearInterval(updateTimer);
    updateTimer = null;
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    updateStatus('inactive', 'Отслеживание остановлено');
}

function handleLocationError(error) {
    let message = getLocationErrorMessage(error);
    updateStatus('error', message);
    console.error('Ошибка геолокации:', message);
    stopTracking();
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

// Обработчик закрытия окна
window.addEventListener('beforeunload', (event) => {
    if (isTracking) {
        stopTracking();
    }
});