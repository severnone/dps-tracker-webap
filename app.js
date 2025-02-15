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

function toggleTracking() {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
}

function startTracking() {
    if (!navigator.geolocation) {
        updateStatus('error', 'Геолокация не поддерживается браузером');
        return;
    }

    updateStatus('active', 'Запуск отслеживания...');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            isTracking = true;
            startTime = Date.now();
            document.getElementById('trackButton').textContent = 'Остановить отслеживание';

            const startData = {
                action: 'start_tracking',
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now()
            };

            try {
                Telegram.WebApp.sendData(JSON.stringify(startData));
                updateStatus('active', 'Отслеживание активно');
                updateAccuracy(position.coords.accuracy);

                // Запускаем постоянное отслеживание
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        lastPosition = pos;
                        updateAccuracy(pos.coords.accuracy);

                        const now = Date.now();
                        if (now - lastSendTime >= SEND_INTERVAL) {
                            const updateData = {
                                action: 'update_location',
                                lat: pos.coords.latitude,
                                lon: pos.coords.longitude,
                                accuracy: pos.coords.accuracy,
                                timestamp: now
                            };
                            Telegram.WebApp.sendData(JSON.stringify(updateData));
                            lastSendTime = now;
                        }
                    },
                    (error) => {
                        console.error('Ошибка отслеживания:', error);
                        updateStatus('error', getLocationErrorMessage(error));
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );

                updateTimer = setInterval(updateTimerDisplay, 1000);
            } catch (error) {
                console.error('Ошибка отправки данных:', error);
                updateStatus('error', 'Ошибка запуска отслеживания');
                stopTracking();
            }
        },
        (error) => {
            console.error('Ошибка геолокации:', error);
            updateStatus('error', getLocationErrorMessage(error));
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
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
    startTime = 0;
    clearInterval(updateTimer);
    updateTimer = null;
    document.getElementById('trackButton').textContent = 'Начать отслеживание';
    updateStatus('inactive', 'Отслеживание остановлено');
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
window.addEventListener('beforeunload', () => {
    if (isTracking) {
        stopTracking();
    }
});