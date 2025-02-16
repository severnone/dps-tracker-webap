let isTracking = false;
let watchId = null;

document.getElementById('trackButton').addEventListener('click', function() {
    if (!isTracking) {
        startTracking();
    } else {
        stopTracking();
    }
});

function startTracking() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                isTracking = true;
                document.getElementById('trackButton').textContent = 'Остановить отслеживание';
                document.getElementById('status').textContent = 'Отслеживание активно';

                // Отправляем сигнал о начале отслеживания
                const data = {
                    action: 'start_tracking',
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };

                Telegram.WebApp.sendData(JSON.stringify(data));

                // Начинаем отслеживание
                watchId = navigator.geolocation.watchPosition(
                    handlePosition,
                    handleError,
                    { enableHighAccuracy: true }
                );
            },
            handleError,
            { enableHighAccuracy: true }
        );
    } else {
        alert('Геолокация не поддерживается');
    }
}

function stopTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    isTracking = false;
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    document.getElementById('status').textContent = 'Отслеживание остановлено';
    document.getElementById('accuracy').textContent = 'N/A';

    const data = { action: 'stop_tracking' };
    Telegram.WebApp.sendData(JSON.stringify(data));
}

function handlePosition(position) {
    const accuracy = Math.round(position.coords.accuracy);
    document.getElementById('accuracy').textContent = accuracy + 'м';

    const data = {
        action: 'update_location',
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };

    Telegram.WebApp.sendData(JSON.stringify(data));
}

function handleError(error) {
    let message = 'Ошибка получения местоположения';
    if (error.code === 1) message = 'Доступ к геолокации запрещен';
    if (error.code === 2) message = 'Местоположение недоступно';
    if (error.code === 3) message = 'Таймаут получения местоположения';

    document.getElementById('status').textContent = message;
    if (isTracking) stopTracking();
}

// Инициализация WebApp
Telegram.WebApp.ready();