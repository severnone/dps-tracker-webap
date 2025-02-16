let isTracking = false;
let watchId = null;
let startTime = null;
let trackingTimer = null;
const SEND_INTERVAL = 5000; // Интервал отправки данных в миллисекундах

document.addEventListener('DOMContentLoaded', function() {
    updateStatus('inactive', 'Готов к работе');
    document.getElementById('trackButton').addEventListener('click', toggleTracking);
    console.log('WebApp загружен и готов к работе');
});

function updateStatus(status, message) {
    const statusElement = document.getElementById('status');
    statusElement.className = `status ${status}`;
    statusElement.textContent = message;
    console.log(`Статус обновлен: ${status} - ${message}`);
}

function updateTrackingTime() {
    if (!startTime) return;

    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('trackingTime').textContent = timeStr;
}

function updateAccuracy(accuracy) {
    const accuracyStr = accuracy ? `${Math.round(accuracy)}м` : 'N/A';
    document.getElementById('accuracy').textContent = accuracyStr;
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
    startTime = new Date();
    document.getElementById('trackButton').textContent = 'Остановить отслеживание';
    updateStatus('active', 'Отслеживание активно');

    // Запускаем таймер обновления времени отслеживания
    trackingTimer = setInterval(updateTrackingTime, 1000);

    // Отправляем данные о начале отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'start_tracking' }));
        console.log('Отправлено start_tracking');
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
        handleError('Ошибка отправки данных о начале отслеживания');
    }

    // Начинаем отслеживание геолокации
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handleLocationError,
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );
    } else {
        handleError('Геолокация не поддерживается вашим браузером');
    }
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    if (trackingTimer !== null) {
        clearInterval(trackingTimer);
        trackingTimer = null;
    }

    isTracking = false;
    startTime = null;
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    document.getElementById('trackingTime').textContent = '00:00:00';
    document.getElementById('accuracy').textContent = 'N/A';
    updateStatus('inactive', 'Отслеживание остановлено');

    // Отправляем данные о остановке отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'stop_tracking' }));
        console.log('Отправлено stop_tracking');
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    // Закрываем WebApp через 1 секунду
    setTimeout(() => {
        Telegram.WebApp.close();
        console.log('WebApp закрыт');
    }, 1000);
}

function handlePosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = position.timestamp;

    // Обновляем отображение точности
    updateAccuracy(accuracy);

    // Отправляем данные о местоположении
    const data = {
        action: 'update_location',
        lat: latitude,
        lon: longitude,
        timestamp: timestamp
    };

    try {
        Telegram.WebApp.sendData(JSON.stringify(data));
        console.log('Отправлено update_location:', data);
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
        handleError('Ошибка отправки данных о местоположении');
    }
}

function handleLocationError(error) {
    let message;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Доступ к геолокации запрещен';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Информация о местоположении недоступна';
            break;
        case error.TIMEOUT:
            message = 'Превышено время ожидания получения местоположения';
            break;
        default:
            message = 'Произошла неизвестная ошибка при получении местоположения';
    }

    updateStatus('error', message);
    console.error('Ошибка геолокации:', message);
    handleError(message);
}

function handleError(message) {
    updateStatus('error', message);
    if (isTracking) {
        stopTracking();
    }
}

// Обработчик закрытия окна
window.addEventListener('beforeunload', (event) => {
    if (isTracking) {
        stopTracking();
    }
});

// Инициализация Telegram WebApp
Telegram.WebApp.ready();