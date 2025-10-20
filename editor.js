// Sistema de almacenamiento
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
const videoList = document.getElementById('videoList');
const statusDiv = document.getElementById('status');
const counterDiv = document.getElementById('counter');
const fileInput = document.getElementById('fileInput');
const filterInput = document.getElementById('filterInput');
const optionsPanel = document.getElementById('optionsPanel');
const backButton = document.getElementById('backButton');

// Botones
const loadExternalBtn = document.getElementById('loadExternal');
const sortAlphaBtn = document.getElementById('sortAlpha');
const selectAllBtn = document.getElementById('selectAll');
const deselectAllBtn = document.getElementById('deselectAll');
const deleteSelectedBtn = document.getElementById('deleteSelected');
const saveListBtn = document.getElementById('saveList');
const exportM3UBtn = document.getElementById('exportM3U');
const invertSelectionBtn = document.getElementById('invertSelection');
const addToFavoritesBtn = document.getElementById('addToFavorites');
const viewFavoritesBtn = document.getElementById('viewFavorites');
const viewOriginalListBtn = document.getElementById('viewOriginalList');
const normalizeTitlesBtn = document.getElementById('normalizeTitles');
const removeDuplicatesBtn = document.getElementById('removeDuplicates');
const filterDeletedBtn = document.getElementById('filterDeleted');
const applyOptionsBtn = document.getElementById('applyOptions');
const cancelOptionsBtn = document.getElementById('cancelOptions');

// Opciones
const filterDeletedOption = document.getElementById('filterDeletedOption');
const removeDuplicatesOption = document.getElementById('removeDuplicatesOption');
const sortAlphabeticallyOption = document.getElementById('sortAlphabeticallyOption');

// Datos
let videos = [];
let originalListName = '';
let filteredVideos = [];
let isViewingFavorites = false;
let originalVideosBackup = [];
let favorites = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadListFromStorage();
});

// ===== FUNCIONES PRINCIPALES =====

function loadListFromStorage() {
    try {
        const storedList = storage.getItem('videoList');
        const storedName = storage.getItem('currentListName');
        
        if (storedList) {
            videos = JSON.parse(storedList);
            originalListName = storedName || 'lista_actual';
            
            loadFavoritesFromStorage();
            statusDiv.textContent = `Lista cargada: ${videos.length} videos`;
            statusDiv.className = 'status success';
        } else {
            videos = [];
            statusDiv.textContent = 'No hay lista cargada en el programa principal';
            statusDiv.className = 'status info';
        }
        
        applyFilter();
        renderVideoList();
        updateCounter();
    } catch (error) {
        statusDiv.textContent = 'Error al cargar la lista del almacenamiento';
        statusDiv.className = 'status error';
        console.error(error);
    }
}

function applyFilter() {
    const filterText = filterInput.value.trim().toLowerCase();
    
    if (!filterText) {
        filteredVideos = [...videos];
        return;
    }
    
    filteredVideos = videos.filter(video => 
        (video.title || '').toLowerCase().includes(filterText)
    );
}

function saveToStorage(newListName = null) {
    if (!isViewingFavorites && videos.length === 0) {
        statusDiv.textContent = 'No hay videos para guardar';
        statusDiv.className = 'status error';
        return;
    }
    
    try {
        storage.setItem('videoList', JSON.stringify(videos));
        
        if (newListName) {
            storage.setItem('currentListName', newListName);
            statusDiv.textContent = `Lista guardada como: ${newListName}`;
        } else {
            storage.setItem('currentListName', originalListName || '');
            statusDiv.textContent = `Lista guardada: ${videos.length} videos`;
        }
        
        statusDiv.className = 'status success';
        
    } catch (error) {
        statusDiv.textContent = 'Error al guardar la lista';
        statusDiv.className = 'status error';
        console.error(error);
    }
}

function saveFavoritesStorage() {
    try {
        storage.setItem('favoritesList', JSON.stringify(favorites));
    } catch (error) {
        console.error('Error guardando favoritos:', error);
    }
}

function persistAfterChange() {
    if (isViewingFavorites) {
        favorites = videos.slice();
        saveFavoritesStorage();
    } else {
        saveToStorage();
    }
}

function renderVideoList() {
    videoList.innerHTML = '';
    
    if (!filteredVideos || filteredVideos.length === 0) {
        if (!videos || videos.length === 0) {
            videoList.innerHTML = '<div class="empty-message">No hay videos en la lista</div>';
        } else {
            videoList.innerHTML = '<div class="empty-message">No se encontraron videos con el filtro aplicado</div>';
        }
        return;
    }
    
    filteredVideos.forEach((video, index) => {
        const item = document.createElement('div');
        item.className = 'video-item-editor';
        
        const top = document.createElement('div');
        top.className = 'video-top';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'video-checkbox';
        checkbox.checked = !!video.selected;
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'video-title';
        titleDiv.dataset.index = index;
        titleDiv.textContent = video.title || 'Sin título';
        
        top.appendChild(checkbox);
        top.appendChild(titleDiv);
        
        const urlDiv = document.createElement('div');
        urlDiv.className = 'video-url';
        urlDiv.textContent = video.url || '';
        
        item.appendChild(top);
        item.appendChild(urlDiv);
        
        // Eventos
        checkbox.addEventListener('change', (e) => {
            video.selected = e.target.checked;
            updateCounter();
        });
        
        // Edición con doble clic
        titleDiv.addEventListener('dblclick', () => {
            startEditing(titleDiv, video);
        });
        
        // Click simple para seleccionar
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox && e.target !== titleDiv) {
                video.selected = !video.selected;
                checkbox.checked = video.selected;
                updateCounter();
            }
        });
        
        videoList.appendChild(item);
    });
}

function startEditing(element, video) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = video.title || '';
    input.className = 'video-title editing';
    
    element.parentNode.replaceChild(input, element);
    input.focus();
    input.select();
    
    function saveEdit() {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== video.title) {
            video.title = newTitle;
            persistAfterChange();
            applyFilter();
        }
        
        const newElement = document.createElement('div');
        newElement.className = 'video-title';
        newElement.textContent = video.title || 'Sin título';
        newElement.addEventListener('dblclick', () => startEditing(newElement, video));
        
        input.parentNode.replaceChild(newElement, input);
        renderVideoList();
    }
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveEdit();
        }
    });
}

function updateCounter() {
    const selectedCount = videos.filter(v => v.selected).length;
    const showingCount = filteredVideos.length;
    const totalCount = videos.length;
    const selectedVisibleCount = filteredVideos.filter(v => v.selected).length;
    
    let counterText = '';
    
    if (isViewingFavorites) {
        counterText = `FAVORITOS: ${showingCount} | Seleccionados: ${selectedVisibleCount}`;
    } else if (filterInput.value.trim()) {
        counterText = `Mostrando: ${showingCount} | Seleccionados visibles: ${selectedVisibleCount} | Total seleccionados: ${selectedCount}`;
    } else {
        counterText = `Total: ${totalCount} | Seleccionados: ${selectedCount}`;
    }
    
    counterDiv.textContent = counterText;
}

function invertSelection() {
    filteredVideos.forEach(video => {
        video.selected = !video.selected;
    });
    renderVideoList();
    updateCounter();
    statusDiv.textContent = 'Selección invertida';
    statusDiv.className = 'status success';
}

function addToFavorites() {
    const selectedVideos = filteredVideos.filter(v => v.selected);
    
    if (selectedVideos.length === 0) {
        statusDiv.textContent = 'No hay videos seleccionados para agregar a favoritos';
        statusDiv.className = 'status error';
        return;
    }
    
    loadFavoritesFromStorage();
    
    const existingNorms = new Set(favorites.map(f => normalizeURL(f.url || '')));
    let added = 0;
    selectedVideos.forEach(video => {
        const norm = normalizeURL(video.url || '');
        const exists = existingNorms.has(norm);
        if (!exists) {
            favorites.push({
                title: video.title,
                url: video.url,
                selected: false
            });
            existingNorms.add(norm);
            added++;
        }
    });
    
    saveFavoritesStorage();
    
    statusDiv.textContent = `${added} video(s) agregado(s) a favoritos (${selectedVideos.length} procesados)`;
    statusDiv.className = 'status success';
}

function viewFavorites() {
    if (isViewingFavorites) {
        statusDiv.textContent = 'Ya estás viendo la lista de favoritos';
        statusDiv.className = 'status info';
        return;
    }
    
    originalVideosBackup = JSON.parse(JSON.stringify(videos));
    originalListName = storage.getItem('currentListName') || originalListName || 'lista_actual';
    
    loadFavoritesFromStorage();
    
    if (favorites.length === 0) {
        statusDiv.textContent = 'No hay favoritos guardados';
        statusDiv.className = 'status error';
        return;
    }
    
    videos = JSON.parse(JSON.stringify(favorites));
    isViewingFavorites = true;
    
    viewFavoritesBtn.style.display = 'none';
    viewOriginalListBtn.style.display = 'inline-block';
    saveListBtn.style.display = 'none';
    
    applyFilter();
    renderVideoList();
    updateCounter();
    
    statusDiv.textContent = `Viendo ${favorites.length} favorito(s)`;
    statusDiv.className = 'status success';
}

function viewOriginalList() {
    if (!isViewingFavorites) {
        statusDiv.textContent = 'Ya estás viendo la lista original';
        statusDiv.className = 'status info';
        return;
    }
    
    videos = JSON.parse(JSON.stringify(originalVideosBackup));
    isViewingFavorites = false;
    
    viewFavoritesBtn.style.display = 'inline-block';
    viewOriginalListBtn.style.display = 'none';
    saveListBtn.style.display = 'inline-block';
    
    applyFilter();
    renderVideoList();
    updateCounter();
    
    statusDiv.textContent = `Viendo lista original: ${videos.length} videos`;
    statusDiv.className = 'status success';
}

function loadFavoritesFromStorage() {
    try {
        const storedFavorites = storage.getItem('favoritesList');
        if (storedFavorites) {
            favorites = JSON.parse(storedFavorites);
        } else {
            favorites = [];
        }
    } catch (error) {
        favorites = [];
        console.error('Error al cargar favoritos:', error);
    }
}

// ===== FUNCIONES DE UTILIDAD =====

function normalizeAllTitles() {
    let normalizedCount = 0;
    
    videos.forEach(video => {
        const originalTitle = video.title || '';
        const normalizedTitle = normalizeTitle(originalTitle);
        
        if (normalizedTitle !== originalTitle) {
            video.title = normalizedTitle;
            normalizedCount++;
        }
    });
    
    return normalizedCount;
}

function normalizeTitle(title) {
    if (!title) return 'Sin título';
    
    let cleaned = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '');
    cleaned = cleaned.replace(/^\s*[\(\[\{].*?[\)\]\}]\s*/g, '');
    cleaned = cleaned.replace(/\s*[\(\[\{].*?[\)\]\}]\s*$/g, '');
    
    if (cleaned.length > 60) {
        cleaned = cleaned.substring(0, 60).trim();
    }
    
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    } else {
        cleaned = 'Sin título';
    }
    
    return cleaned;
}

function removeDuplicateURLs() {
    const seen = new Set();
    const uniqueVideos = [];
    let duplicatesRemoved = 0;
    
    videos.forEach(video => {
        const url = (video.url || '').trim();
        const norm = normalizeURL(url);
        if (!norm) {
            duplicatesRemoved++;
        } else if (!seen.has(norm)) {
            seen.add(norm);
            uniqueVideos.push(video);
        } else {
            duplicatesRemoved++;
        }
    });
    
    videos = uniqueVideos;
    return duplicatesRemoved;
}

function normalizeURL(url) {
    if (!url) return '';
    const trimmed = url.trim();
    const protoMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
    if (!protoMatch) return '';
    
    try {
        const u = new URL(trimmed);
        let normalized = u.protocol.toLowerCase() + '//' + u.hostname.toLowerCase();
        if (u.port && u.port !== '0') normalized += ':' + u.port;
        normalized += u.pathname.replace(/\/$/, '');
        normalized += u.search;
        return normalized;
    } catch (e) {
        return trimmed.toLowerCase();
    }
}

function sortTitles() {
    videos.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
    });
}

function filterDeletedChannels() {
    const initialCount = videos.length;
    videos = videos.filter(video => {
        const url = (video.url || '').toLowerCase();
        const title = (video.title || '').toLowerCase();
        
        // Filtrar URLs que parezcan eliminadas/privadas/erróneas
        if (!url || url.includes('deleted') || url.includes('private') || url.includes('error')) {
            return false;
        }
        
        if (!title || title.includes('deleted') || title.includes('private') || title.includes('error')) {
            return false;
        }
        
        return true;
    });
    
    return initialCount - videos.length;
}

// ===== EVENT LISTENERS =====

backButton.addEventListener('click', () => {
    window.history.back();
});

loadExternalBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const newVideos = parseM3U(content);
            
            if (newVideos.length > 0) {
                videos = newVideos;
                originalListName = file.name;
                isViewingFavorites = false;
                viewFavoritesBtn.style.display = 'inline-block';
                viewOriginalListBtn.style.display = 'none';
                saveListBtn.style.display = 'inline-block';
                applyFilter();
                renderVideoList();
                updateCounter();
                statusDiv.textContent = `Lista externa cargada: ${videos.length} videos`;
                statusDiv.className = 'status success';
            } else {
                statusDiv.textContent = 'El archivo no contiene videos válidos';
                statusDiv.className = 'status error';
            }
        } catch (error) {
            statusDiv.textContent = 'Error al cargar el archivo M3U';
            statusDiv.className = 'status error';
            console.error(error);
        }
    };
    
    reader.onerror = () => {
        statusDiv.textContent = 'Error al leer el archivo';
        statusDiv.className = 'status error';
    };
    
    reader.readAsText(file);
});

sortAlphaBtn.addEventListener('click', () => {
    sortTitles();
    applyFilter();
    renderVideoList();
    statusDiv.textContent = 'Lista ordenada alfabéticamente';
    statusDiv.className = 'status success';
});

selectAllBtn.addEventListener('click', () => {
    filteredVideos.forEach(video => {
        video.selected = true;
    });
    renderVideoList();
    updateCounter();
});

deselectAllBtn.addEventListener('click', () => {
    filteredVideos.forEach(video => {
        video.selected = false;
    });
    renderVideoList();
    updateCounter();
});

deleteSelectedBtn.addEventListener('click', () => {
    const selectedVisibleCount = filteredVideos.filter(v => v.selected).length;
    if (selectedVisibleCount === 0) {
        statusDiv.textContent = 'No hay elementos seleccionados para borrar';
        statusDiv.className = 'status error';
        return;
    }
    
    if (confirm(`¿Borrar ${selectedVisibleCount} elemento(s) seleccionado(s)?`)) {
        videos = videos.filter(video => !(video.selected && filteredVideos.includes(video)));
        if (isViewingFavorites) {
            favorites = videos.slice();
            saveFavoritesStorage();
        } else {
            saveToStorage();
        }
        applyFilter();
        renderVideoList();
        updateCounter();
        statusDiv.textContent = `${selectedVisibleCount} elemento(s) borrado(s)`;
        statusDiv.className = 'status success';
    }
});

saveListBtn.addEventListener('click', () => {
    if (isViewingFavorites) {
        statusDiv.textContent = 'No se puede guardar mientras se muestran Favoritos. Vuelve a la lista original para guardar.';
        statusDiv.className = 'status error';
        return;
    }
    const name = prompt('Nombre para guardar la lista (dejar vacío para conservar):', originalListName || '');
    if (name === null) return;
    if (name !== '') {
        originalListName = name;
    }
    saveToStorage(originalListName || null);
});

invertSelectionBtn.addEventListener('click', invertSelection);
addToFavoritesBtn.addEventListener('click', addToFavorites);
viewFavoritesBtn.addEventListener('click', viewFavorites);
viewOriginalListBtn.addEventListener('click', viewOriginalList);

exportM3UBtn.addEventListener('click', () => {
    const selectedVideos = filteredVideos.filter(video => video.selected);
    
    if (selectedVideos.length === 0) {
        statusDiv.textContent = 'No hay videos seleccionados para exportar';
        statusDiv.className = 'status error';
        return;
    }
    
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const filename = `lista_seleccionados_${dateStr}.m3u`;
    
    let m3uContent = '#EXTM3U\n';
    selectedVideos.forEach(video => {
        const safeTitle = video.title.replace(/\r?\n/g, ' ').trim();
        m3uContent += `#EXTINF:-1,${safeTitle}\n`;
        m3uContent += `${video.url}\n`;
    });
    
    const blob = new Blob([m3uContent], { type: 'application/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    statusDiv.textContent = `Lista exportada: ${filename} (${selectedVideos.length} videos)`;
    statusDiv.className = 'status success';
});

filterInput.addEventListener('input', () => {
    applyFilter();
    renderVideoList();
    updateCounter();
});

normalizeTitlesBtn.addEventListener('click', () => {
    if (videos.length === 0) {
        statusDiv.textContent = 'No hay videos para normalizar';
        statusDiv.className = 'status error';
        return;
    }
    
    const normalizedCount = normalizeAllTitles();
    persistAfterChange();
    applyFilter();
    renderVideoList();
    updateCounter();
    statusDiv.textContent = `Títulos normalizados: ${normalizedCount} videos`;
    statusDiv.className = 'status success';
});

removeDuplicatesBtn.addEventListener('click', () => {
    if (videos.length === 0) {
        statusDiv.textContent = 'No hay videos para procesar';
        statusDiv.className = 'status error';
        return;
    }
    
    const duplicatesRemoved = removeDuplicateURLs();
    persistAfterChange();
    applyFilter();
    renderVideoList();
    updateCounter();
    statusDiv.textContent = `Duplicados eliminados: ${duplicatesRemoved} videos`;
    statusDiv.className = 'status success';
});

filterDeletedBtn.addEventListener('click', () => {
    if (videos.length === 0) {
        statusDiv.textContent = 'No hay videos para filtrar';
        statusDiv.className = 'status error';
        return;
    }
    
    optionsPanel.style.display = 'block';
});

applyOptionsBtn.addEventListener('click', () => {
    const deletedCount = filterDeletedOption.checked ? filterDeletedChannels() : 0;
    const duplicatesRemoved = removeDuplicatesOption.checked ? removeDuplicateURLs() : 0;
    
    if (sortAlphabeticallyOption.checked) {
        sortTitles();
    }
    
    persistAfterChange();
    applyFilter();
    renderVideoList();
    updateCounter();
    
    let message = '';
    if (deletedCount > 0) message += `Canales eliminados filtrados: ${deletedCount}. `;
    if (duplicatesRemoved > 0) message += `Duplicados eliminados: ${duplicatesRemoved}. `;
    if (sortAlphabeticallyOption.checked) message += 'Lista ordenada alfabéticamente.';
    
    statusDiv.textContent = message || 'Opciones aplicadas';
    statusDiv.className = 'status success';
    
    optionsPanel.style.display = 'none';
});

cancelOptionsBtn.addEventListener('click', () => {
    optionsPanel.style.display = 'none';
});

// Función para parsear M3U (necesaria en el editor también)
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

// Manejar botón de retroceso en Android
document.addEventListener('backbutton', function(e) {
    e.preventDefault();
    window.history.back();
}, false);