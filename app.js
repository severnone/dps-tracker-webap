let isTracking = false;
let watchId = null;
let startTime = null;
let trackingTimer = null;
let lastSendTime = 0;
const SEND_INTERVAL = 5000; // Минимальный интервал между отправками данных

document.addEventListener('DOMContentLoaded', function() {
    updateStatus('inactive', 'Готов к работе');
    document.getElementById('trackButton').addEventListener('click', function(e) {
        e.preventDefault();
        toggleTracking();
    });
    console.log('WebApp загружен и готов к работе');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Геолокация доступна:', position);
                updateStatus('inactive', 'Готов к работе (геолокация доступна)');
            },
            (error) => {
                console.error('Ошибка при первичном запросе геолокации:', error);
                updateStatus('error', 'Проверьте разрешение на геолокацию');
            },
            { enableHighAccuracy: true }
        );
    }
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
    if (isTracking) return;

    console.log('Начало отслеживания...');

    if (!navigator.geolocation) {
        handleError('Геолокация не поддерживается вашим браузером');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('Получена начальная позиция:', position);

            isTracking = true;
            startTime = new Date();
            document.getElementById('trackButton').textContent = 'Остановить отслеживание';
            updateStatus('active', 'Отслеживание активно');

            trackingTimer = setInterval(updateTrackingTime, 1000);

            try {
                const data = {
                    action: 'start_tracking',
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    timestamp: position.timestamp
                };
                Telegram.WebApp.sendData(JSON.stringify(data));
                lastSendTime = Date.now();
                console.log('Отправлено start_tracking');

                watchId = navigator.geolocation.watchPosition(
                    handlePosition,
                    handleLocationError,
                    {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 10000
                    }
                );
                console.log('Отслеживание запущено, watchId:', watchId);
            } catch (error) {
                console.error('Ошибка отправки данных:', error);
                handleError('Ошибка отправки данных о начале отслеживания');
            }
        },
        (error) => {
            console.error('Ошибка при получении начальной позиции:', error);
            handleLocationError(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function stopTracking() {
    if (!isTracking) return;

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

    try {
        const data = { action: 'stop_tracking' };
        Telegram.WebApp.sendData(JSON.stringify(data));
        console.log('Отправлено stop_tracking');
    } catch (error) {
        console.error('Ошибка отправки данных:', error);
    }
}

function handlePosition(position) {
    if (!isTracking) return;

    console.log('Получена новая позиция:', position);
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = position.timestamp;

    updateAccuracy(accuracy);

    // Проверяем интервал между отправками
    const now = Date.now();
    if (now - lastSendTime >= SEND_INTERVAL) {
        const data = {
            action: 'update_location',
            lat: latitude,
            lon: longitude,
            timestamp: timestamp
        };

        try {
            Telegram.WebApp.sendData(JSON.stringify(data));
            lastSendTime = now;
            console.log('Отправлено update_location:', data);
            updateStatus('active', `Отслеживание активно (точность: ${Math.round(accuracy)}м)`);
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            handleError('Ошибка отправки данных о местоположении');
        }
    }
}

function handleLocationError(error) {
    let message;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Доступ к геолокации запрещен. Проверьте настройки браузера.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Информация о местоположении недоступна. Проверьте GPS и интернет-соединение.';
            break;
        case error.TIMEOUT:
            message = 'Превышено время ожидания получения местоположения. Попробуйте еще раз.';
            break;
        default:
            message = `Произошла неизвестная ошибка при получении местоположения (${error.message})`;
    }

    console.error('Ошибка геолокации:', error);
    updateStatus('error', message);
    handleError(message);
}

function handleError(message) {
    updateStatus('error', message);
    if (isTracking) {
        stopTracking();
    }
}

// Инициализация Telegram WebApp
Telegram.WebApp.ready();