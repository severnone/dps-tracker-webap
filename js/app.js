// Инициализация Telegram WebApp или создание заглушки
let tg = window.Telegram.WebApp || {
    ready: () => {},
    expand: () => {},
    MainButton: {
        setText: () => {},
        show: () => {},
        hide: () => {},
        onClick: () => {}
    }
};

let watchId = null;
let isTracking = false;
let startTime = null;
let updateTimer = null;
let lastSendTime = 0;
const SEND_INTERVAL = 30000; // 30 секунд между отправками

// Настройки звука
const soundSettings = {
    enabled: true,
    volume: 1.0
};

// Инициализация
tg.expand();
tg.ready();

// Настройка MainButton
const mainButton = tg.MainButton;
mainButton.setText('Начать отслеживание');
mainButton.show();

// Добавление кнопки для тестирования вне Telegram
if (!window.Telegram.WebApp) {
    const button = document.createElement('button');
    button.innerText = 'Начать отслеживание';
    button.style.cssText = `
        display: block;
        margin: 20px auto;
        padding: 10px 20px;
        background: var(--tg-theme-button-color, #2ea6ff);
        color: var(--tg-theme-button-text-color, #ffffff);
        border: none;
        border-radius: 8px;
        cursor: pointer;
    `;
    button.onclick = () => {
        if (isTracking) {
            stopTracking();
            button.innerText = 'Начать отслеживание';
        } else {
            startTracking();
            button.innerText = 'Остановить отслеживание';
        }
    };
    document.querySelector('.container').appendChild(button);
}

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
    status.innerHTML = `Статус: <span class="${type}">${message}</span>`;
}

// Обновление точности
function updateAccuracy(accuracy) {
    const accuracyElement = document.getElementById('accuracy');
    accuracyElement.textContent = `Точность: ${accuracy ? accuracy.toFixed(2) + ' метров' : '-'}`;
}

// Обновление таймера
function updateTimerDisplay() {
    if (!startTime) return;
    const timerElement = document.getElementById('timer');
    const elapsed = Date.now() - startTime;
    timerElement.textContent = `Время: ${formatTime(elapsed)}`;
}

// Функция запуска отслеживания
function startTracking() {
    if (!navigator.geolocation) {
        updateStatus('error', 'Геолокация не поддерживается');
        return;
    }

    isTracking = true;
    startTime = Date.now();
    updateStatus('active', 'Отслеживание активно');
    mainButton.setText('Остановить отслеживание');

    // Запуск таймера
    updateTimer = setInterval(updateTimerDisplay, 1000);

    // Запуск отслеживания геолокации
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const accuracy = position.coords.accuracy;
            updateAccuracy(accuracy);

            // Отправка данных боту
            const data = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: accuracy,
                timestamp: position.timestamp
            };

            const now = Date.now();
            if (now - lastSendTime >= SEND_INTERVAL) {
                tg.sendData(JSON.stringify(data));
                lastSendTime = now;
            }
        },
        (error) => {
            console.error('Ошибка геолокации:', error);
            updateStatus('error', 'Ошибка получения локации');
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

// Функция остановки отслеживания
function stopTracking() {
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
    updateStatus('inactive', 'Отслеживание остановлено');
    updateAccuracy(null);
    document.getElementById('timer').textContent = 'Время: 00:00:00';
    mainButton.setText('Начать отслеживание');
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
        const distanceFile = distance >= 1000 ? '1000m.mp3' : `${Math.floor(distance/100)*100}m.mp3`;
        const voice = new Audio(`alerts/${distanceFile}`);
        voice.volume = soundSettings.volume;
        await voice.play();
    } catch (e) {
        console.error('Ошибка воспроизведения звука:', e);
    }
}

// Обработчики событий
mainButton.onClick(() => {
    if (isTracking) {
        stopTracking();
    } else {
        startTracking();
    }
});

document.getElementById('soundEnabled').onchange = function() {
    soundSettings.enabled = this.checked;
    document.querySelector('.volume-control').style.display = 
        this.checked ? 'block' : 'none';
};

document.getElementById('volume').onchange = function() {
    soundSettings.volume = parseFloat(this.value);
};

// Обработка сообщений от бота
tg.onEvent('message', function(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Сообщение от бота:', data);
        
        if (data.type === 'dps_alert') {
            playAlert(data.distance);
        } else if (data.type === 'command' && data.action === 'stop_tracking') {
            stopTracking();
        }
    } catch (e) {
        console.error('Ошибка обработки сообщения:', e);
    }
});