let isTracking = false;
let watchId = null;
const SEND_INTERVAL = 5000; // Интервал отправки данных в миллисекундах

document.addEventListener('DOMContentLoaded', function() {
    updateStatus('inactive', 'Готов к работе');
    document.getElementById('trackButton').addEventListener('click', toggleTracking);
    console.log('WebApp загружен и готов к работе'); // Для отладки
});

function updateStatus(status, message) {
    const statusElement = document.getElementById('status');
    statusElement.className = `status ${status}`;
    statusElement.textContent = message;
    console.log(`Статус обновлен: ${status} - ${message}`); // Для отладки
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

    // Отправляем данные о начале отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'start_tracking' }));
        console.log('Отправлено start_tracking'); // Для отладки
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    // Начинаем отслеживание геолокации
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(sendLocation, handleLocationError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        });
    } else {
        console.error('Геолокация не поддерживается вашим браузером.');
    }
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isTracking = false;
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    updateStatus('inactive', 'Отслеживание остановлено');

    // Отправляем данные о остановке отслеживания
    try {
        Telegram.WebApp.sendData(JSON.stringify({ action: 'stop_tracking' }));
        console.log('Отправлено stop_tracking'); // Для отладки
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }

    // Закрываем WebApp через 1 секунду
    setTimeout(() => {
        Telegram.WebApp.close();
        console.log('WebApp закрыт'); // Для отладки
    }, 1000);
}

function sendLocation(position) {
    const { latitude, longitude } = position.coords;
    const timestamp = position.timestamp;

    const data = {
        action: 'update_location',
        lat: latitude,
        lon: longitude,
        timestamp: timestamp
    };

    try {
        Telegram.WebApp.sendData(JSON.stringify(data));
        console.log('Отправлено update_location:', data); // Для отладки
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }
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