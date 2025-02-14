// Инициализация Telegram WebApp
let tg = window.Telegram.WebApp;

// Настройки
const SEND_INTERVAL = 5000; // 5 секунд между отправками
let watchId = null;
let isTracking = false;
let startTime = null;
let updateTimer = null;
let lastSendTime = 0;
let lastPosition = null;

// Настройки звука
const soundSettings = {
    enabled: true,
    volume: 1.0
};

// Инициализация WebApp
tg.expand();
tg.ready();

// Функция форматирования времени
function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Обновление статуса
function updateStatus(type, message) {
    const status = document.getElementById('status');
    if (status) {
        status.innerHTML = `Статус: <span class="${type}">${message}</span>`;
    }
    console.log(`Статус: ${message}`);
}

// Обновление точности
function updateAccuracy(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    if (accuracyElement) {
        accuracyElement.textContent = `Точность: ${accuracy ? accuracy.toFixed(2) + ' метров' : '-'}`;
    }
}

// Обновление таймера
function updateTimerDisplay() {
    if (!startTime) return;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        const elapsed = Date.now() - startTime;
        timerElement.textContent = `Время: ${formatTime(elapsed)}`;
    }
}

// Проверка разрешений геолокации
async function checkLocationPermission() {
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'denied') {
            updateStatus('error', 'Доступ к геолокации запрещен. Пожалуйста, разрешите доступ в настройках браузера.');
            return false;
        }
        return true;
    } catch (e) {
        console.error('Ошибка проверки разрешений:', e);
        return true; // Продолжаем, если API разрешений не поддерживается
    }
}

// Функция отправки данных
function sendLocationData(position, isFinal = false) {
    lastPosition = position;
    const data = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        isFinal: isFinal
    };

    try {
        tg.sendData(JSON.stringify(data));
        lastSendTime = Date.now();
        console.log('Отправлены данные:', data);
        updateStatus('active', 'Данные успешно отправлены');
    } catch (e) {
        console.error('Ошибка отправки данных:', e);
        updateStatus('error', 'Ошибка отправки данных');
    }
}

// Функция запуска отслеживания
async function startTracking() {
    if (!navigator.geolocation) {
        updateStatus('error', 'Геолокация не поддерживается браузером');
        return;
    }

    if (!await checkLocationPermission()) {
        return;
    }

    try {
        isTracking = true;
        startTime = Date.now();
        updateStatus('active', 'Запуск отслеживания...');
        document.getElementById('trackButton').textContent = 'Остановить отслеживание';

        // Запуск таймера
        updateTimer = setInterval(updateTimerDisplay, 1000);

        // Запуск отслеживания геолокации
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const accuracy = position.coords.accuracy;
                updateAccuracy(accuracy);

                // Отправка данных боту
                const now = Date.now();
                if (now - lastSendTime >= SEND_INTERVAL) {
                    sendLocationData(position);
                    lastSendTime = now;
                }
            },
            (error) => {
                console.error('Ошибка геолокации:', error);
                updateStatus('error', `Ошибка: ${getLocationErrorMessage(error)}`);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );

        // Добавляем обработчик закрытия окна
        window.addEventListener('beforeunload', () => {
            if (isTracking) {
                sendLocationData(lastPosition, true); // отправляем последнюю позицию
            }
        });
    } catch (e) {
        console.error('Ошибка запуска отслеживания:', e);
        updateStatus('error', `Ошибка запуска отслеживания: ${e.message}`);
        stopTracking();
    }
}

// Функция остановки отслеживания
function stopTracking() {
    try {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }

        if (updateTimer !== null) {
            clearInterval(updateTimer);
            updateTimer = null;
        }

        isTracking = false;
        startTime = null;
        lastPosition = null;
        updateStatus('inactive', 'Отслеживание остановлено');
        updateAccuracy(null);
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = 'Время: 00:00:00';
        }
        document.getElementById('trackButton').textContent = 'Начать отслеживание';
    } catch (e) {
        console.error('Ошибка остановки отслеживания:', e);
        updateStatus('error', `Ошибка остановки отслеживания: ${e.message}`);
    }
}

// Воспроизведение звукового оповещения
async function playAlert(distance) {
    if (!soundSettings.enabled) return;

    try {
        // Предупреждающий сигнал
        const warning = new Audio('alerts/warning.mp3');
        warning.volume = soundSettings.volume;
        await warning.play();

        // Ждем окончания
        await new Promise(resolve => {
            warning.onended = resolve;
        });

        // Голосовое сообщение о расстоянии
        const distanceFile = distance >= 1000 ? '1000m.mp3' :
                           distance >= 500 ? '500m.mp3' :
                           distance >= 300 ? '300m.mp3' :
                           distance >= 200 ? '200m.mp3' : '100m.mp3';

        const voice = new Audio(`alerts/${distanceFile}`);
        voice.volume = soundSettings.volume;
        await voice.play();
    } catch (e) {
        console.error('Ошибка воспроизведения звука:', e);
    }
}

// Добавляем обработчик для кнопки
const trackButton = document.getElementById('trackButton');
trackButton.addEventListener('click', () => {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
});

// Обработчики настроек звука
document.getElementById('soundEnabled')?.addEventListener('change', function() {
    soundSettings.enabled = this.checked;
    const volumeControl = document.querySelector('.volume-control');
    if (volumeControl) {
        volumeControl.style.display = this.checked ? 'block' : 'none';
    }
});

document.getElementById('volume')?.addEventListener('change', function() {
    soundSettings.volume = parseFloat(this.value);
});

// Обработка сообщений от бота
window.addEventListener('message', function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Получено сообщение:', data);

        if (data.type === 'dps_alert') {
            playAlert(data.distance);
        }
    } catch (e) {
        console.error('Ошибка обработки сообщения:', e);
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    updateStatus('inactive', 'Готов к работе');
});