// Sistema de almacenamiento mejorado para Cordova
const storage = {
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Error guardando en storage:', e);
        }
    },
    
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Error leyendo storage:', e);
            return null;
        }
    },
    
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Error removiendo storage:', e);
        }
    }
};

// Elementos del DOM
const editorButton = document.getElementById('editorButton');
const filterInput = document.getElementById('filterInput');
const filterCheckbox = document.getElementById('filterCheckbox');
const configButton = document.getElementById('configButton');
const loadButton = document.getElementById('loadButton');
const clearButton = document.getElementById('clearButton');
const fileInput = document.getElementById('fileInput');
const videoList = document.getElementById('videoList');
const statusDiv = document.getElementById('status');
const platformFrame = document.getElementById('platformFrame');

// Elementos del modal
const configModal = document.getElementById('configModal');
const saveConfig = document.getElementById('saveConfig');
const cancelConfig = document.getElementById('cancelConfig');
const serverOption1 = document.getElementById('serverOption1');
const serverOption2 = document.getElementById('serverOption2');
const serverOption3 = document.getElementById('serverOption3');
const customIp = document.getElementById('customIp');
const customPort = document.getElementById('customPort');
const optionElements = document.querySelectorAll('.server-option');

// Configuración del servidor
let serverConfig = {
    ip: storage.getItem('serverIp') || '192.168.0.11',
    port: storage.getItem('serverPort') || '8080',
    selectedOption: storage.getItem('selectedOption') || '192.168.0.11'
};
let currentListName = storage.getItem('currentListName') || 'Ninguna';
let videos = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadVideosFromStorage();
    updateStatus();
    renderVideoList();
    
    // Configurar iframe para Android
    platformFrame.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    platformFrame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
});

// ===== FUNCIONES PRINCIPALES =====

function loadVideosFromStorage() {
    try {
        const storedVideos = storage.getItem('videoList');
        if (storedVideos) {
            videos = JSON.parse(storedVideos);
        } else {
            videos = [];
        }
    } catch (error) {
        console.error('Error cargando videos:', error);
        videos = [];
        updateStatus('Error cargando lista guardada');
        statusDiv.className = 'status error';
    }
}

function getEmbedUrl(url, urlType) {
    switch(urlType) {
        case 'youtube':
            let videoId = '';
            if (url.includes('v=')) {
                videoId = url.split('v=')[1];
                if (videoId.includes('&')) videoId = videoId.split('&')[0];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1];
                if (videoId.includes('?')) videoId = videoId.split('?')[0];
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
            
        case 'dailymotion':
            let dmId = '';
            if (url.includes('/video/')) {
                dmId = url.split('/video/')[1];
                if (dmId.includes('_')) dmId = dmId.split('_')[0];
                if (dmId.includes('?')) dmId = dmId.split('?')[0];
            }
            return dmId ? `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1` : url;
            
        case 'okru':
            let okId = '';
            if (url.includes('/video/')) {
                okId = url.split('/video/')[1].split(/[/?&#]/)[0];
            } else if (url.match(/ok\.ru\/videoembed\//)) {
                okId = url.split('/videoembed/')[1].split(/[/?&#]/)[0];
            }
            return okId ? `https://ok.ru/videoembed/${okId}?autoplay=1` : url;
            
        default:
            return url;
    }
}

function updateStatus(message = '') {
    if (message) {
        statusDiv.textContent = message;
        setTimeout(() => {
            statusDiv.textContent = `Servidor: ${serverConfig.ip}:${serverConfig.port} | Lista: ${currentListName} - ${videos.length} archivos`;
        }, 3000);
    } else {
        statusDiv.textContent = `Servidor: ${serverConfig.ip}:${serverConfig.port} | Lista: ${currentListName} - ${videos.length} archivos`;
    }
}

function getUrlType(url) {
    if (!url) return 'unknown';
    if (url.includes('.m3u8')) return 'tv';
    if (url.includes('.m3u')) return 'tv';
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) return 'directo';
    if (url.match(/dailymotion\.com/)) return 'dailymotion';
    if (url.match(/youtube\.com|youtu\.be/)) return 'youtube';
    if (url.match(/ok\.ru/)) return 'okru';
    return 'unknown';
}

function getPlatformIcon(urlType) {
    switch(urlType) {
        case 'youtube': return 'YT';
        case 'dailymotion': return 'DM';
        case 'okru': return 'Ok';
        case 'tv': return '📺';
        case 'directo': return '🎬';
        default: return '🔗';
    }
}

function cleanTitle(title) {
    if (!title) return 'Sin título';
    let cleanTitle = title.replace(/^[^a-zA-Z0-9]+/, '');
    if (cleanTitle.length > 40) {
        cleanTitle = cleanTitle.substring(0, 40) + '...';
    }
    return cleanTitle;
}

function renderVideoList() {
    videoList.innerHTML = '';
    
    let videosToShow = videos;
    if (filterCheckbox.checked && filterInput.value.trim()) {
        const filterText = filterInput.value.trim().toLowerCase();
        videosToShow = videos.filter(video => 
            video.title.toLowerCase().includes(filterText)
        );
    }
    
    if (videosToShow.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'video-item';
        
        if (videos.length === 0) {
            emptyMsg.textContent = 'No hay videos en la lista';
        } else if (filterCheckbox.checked && filterInput.value.trim()) {
            emptyMsg.textContent = `No se encontraron videos con: "${filterInput.value}"`;
        } else {
            emptyMsg.textContent = 'No hay videos en la lista';
        }
        
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#999';
        emptyMsg.style.cursor = 'default';
        videoList.appendChild(emptyMsg);
        return;
    }
    
    const sortedVideos = [...videosToShow].sort((a, b) => {
        const titleA = cleanTitle(a.title).toLowerCase();
        const titleB = cleanTitle(b.title).toLowerCase();
        return titleA.localeCompare(titleB);
    });
    
    sortedVideos.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = 'video-item';
        
        if (video.selected) {
            item.classList.add('selected');
        }
        
        const urlType = getUrlType(video.url);
        const typeIcon = getPlatformIcon(urlType);
        
        item.innerHTML = `
            <span style="margin-right: 6px;">${typeIcon}</span>
            ${cleanTitle(video.title)}
        `;
        
        item.title = `${video.title} (${urlType})`;

        item.addEventListener('click', async () => {
            // Deseleccionar todos
            videos.forEach(v => v.selected = false);
            video.selected = true;
            storage.setItem('videoList', JSON.stringify(videos));

            const urlType = getUrlType(video.url);
            const embedUrl = getEmbedUrl(video.url, urlType);
            
            // Mostrar pantalla
            platformFrame.style.display = 'block';
            platformFrame.src = embedUrl;
            
            // Enviar al servidor
            sendToServer(video.url, video.title);
            updateStatus(`Enviando: ${cleanTitle(video.title)}`);
            statusDiv.className = 'status info';

            renderVideoList();
        });
        
        videoList.appendChild(item);
    });
}

// Función para enviar video al servidor
async function sendToServer(url, title) {
    const shortTitle = cleanTitle(title);
    updateStatus(`Enviando: ${shortTitle}...`);
    statusDiv.className = 'status info';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(`http://${serverConfig.ip}:${serverConfig.port}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            updateStatus(`✅ Enviado: ${shortTitle} (${result.player})`);
            statusDiv.className = 'status success';
        } else {
            updateStatus(`❌ Error: ${result.message}`);
            statusDiv.className = 'status error';
        }
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            updateStatus('⏰ Timeout: Servidor no responde');
        } else {
            updateStatus(`❌ Error de conexión: ${error.message}`);
        }
        statusDiv.className = 'status error';
        console.error('Error:', error);
    }
}

// Función para parsear archivo M3U
function parseM3U(content) {
    const lines = content.split('\n');
    const videos = [];
    let currentTitle = '';
    let currentUrl = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            const lastCommaIndex = line.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                currentTitle = line.substring(lastCommaIndex + 1).trim();
            }
        } else if (line.startsWith('http')) {
            currentUrl = line;
            
            if (currentTitle && currentUrl) {
                videos.push({
                    title: currentTitle,
                    url: currentUrl,
                    selected: false
                });
                
                currentTitle = '';
                currentUrl = '';
            }
        }
    }
    
    return videos;
}

// ===== EVENT LISTENERS =====

// Configurar eventos para las opciones de servidor
optionElements.forEach(option => {
    option.addEventListener('click', (e) => {
        if (e.target.type === 'text') return;
        
        optionElements.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        const radio = option.querySelector('input[type="radio"]');
        radio.checked = true;
        
        if (radio.value === 'custom') {
            setTimeout(() => customIp.focus(), 100);
        }
    });
});

// Eventos de los botones
editorButton.addEventListener('click', () => {
    window.location.href = 'editor.html';
});

configButton.addEventListener('click', () => {
    optionElements.forEach(opt => opt.classList.remove('selected'));
    
    if (serverConfig.selectedOption === '192.168.0.11') {
        serverOption1.checked = true;
        document.getElementById('option1').classList.add('selected');
    } else if (serverConfig.selectedOption === '192.168.0.16') {
        serverOption2.checked = true;
        document.getElementById('option2').classList.add('selected');
    } else {
        serverOption3.checked = true;
        document.getElementById('option3').classList.add('selected');
        customIp.value = serverConfig.ip;
        customPort.value = serverConfig.port;
    }
    
    configModal.style.display = 'flex';
});

saveConfig.addEventListener('click', () => {
    let selectedIp, selectedPort, selectedOption;
    
    if (serverOption1.checked) {
        selectedIp = '192.168.0.11';
        selectedPort = '8080';
        selectedOption = '192.168.0.11';
    } else if (serverOption2.checked) {
        selectedIp = '192.168.0.16';
        selectedPort = '8080';
        selectedOption = '192.168.0.16';
    } else if (serverOption3.checked) {
        selectedIp = customIp.value.trim();
        selectedPort = customPort.value.trim();
        selectedOption = 'custom';
        
        if (!selectedIp || !selectedPort) {
            updateStatus('Completa ambos campos para servidor personalizado');
            statusDiv.className = 'status error';
            return;
        }
    } else {
        updateStatus('Selecciona una opción de servidor');
        statusDiv.className = 'status error';
        return;
    }
    
    serverConfig.ip = selectedIp;
    serverConfig.port = selectedPort;
    serverConfig.selectedOption = selectedOption;
    
    storage.setItem('serverIp', selectedIp);
    storage.setItem('serverPort', selectedPort);
    storage.setItem('selectedOption', selectedOption);
    
    updateStatus();
    configModal.style.display = 'none';
    
    updateStatus('Configuración guardada correctamente');
    statusDiv.className = 'status success';
});

cancelConfig.addEventListener('click', () => {
    configModal.style.display = 'none';
});

configModal.addEventListener('click', (e) => {
    if (e.target === configModal) {
        configModal.style.display = 'none';
    }
});

// Evento para cargar archivo M3U
loadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            videos = parseM3U(content);
            
            currentListName = file.name;
            storage.setItem('currentListName', currentListName);
            storage.setItem('videoList', JSON.stringify(videos));
            
            renderVideoList();
            updateStatus(`Lista cargada: ${videos.length} videos`);
            statusDiv.className = 'status success';
            
            filterInput.value = '';
            filterCheckbox.checked = false;
            
        } catch (error) {
            updateStatus('Error al cargar el archivo M3U');
            statusDiv.className = 'status error';
            console.error(error);
        }
    };
    
    reader.onerror = () => {
        updateStatus('Error al leer el archivo');
        statusDiv.className = 'status error';
    };
    
    reader.readAsText(file);
});

// Evento para borrar la lista
clearButton.addEventListener('click', () => {
    if (videos.length === 0) {
        updateStatus('La lista ya está vacía');
        statusDiv.className = 'status info';
        return;
    }
    
    if (confirm(`¿Borrar toda la lista? (${videos.length} videos)`)) {
        videos = [];
        storage.removeItem('videoList');
        
        currentListName = 'Ninguna';
        storage.setItem('currentListName', currentListName);
        
        renderVideoList();
        platformFrame.style.display = 'none';
        updateStatus('Lista borrada');
        statusDiv.className = 'status info';
        
        filterInput.value = '';
        filterCheckbox.checked = false;
    }
});

// Eventos para el filtro
filterInput.addEventListener('input', () => {
    if (filterCheckbox.checked) {
        renderVideoList();
    }
});

filterCheckbox.addEventListener('change', () => {
    renderVideoList();
    if (filterCheckbox.checked && filterInput.value.trim()) {
        updateStatus(`Filtro activado: "${filterInput.value}" - ${videoList.children.length} videos`);
    } else if (!filterCheckbox.checked) {
        updateStatus(`Filtro desactivado - ${videos.length} videos`);
    }
});

// Manejar botón de retroceso en Android
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    if (window.location.pathname.includes('editor.html')) {
        window.history.back();
    } else {
        navigator.app.exitApp();
    }
}, false);