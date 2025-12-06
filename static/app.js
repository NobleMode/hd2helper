const state = {
    loadout: [null, null, null, null],
    missionLoadout: ['reinforce', 'resupply', 'sos_beacon', 'hellbomb'], // Default mission strats
    stationLoadout: [], // Space Station strats
    stratagems: [],
    config: {
        menuMode: 'hold', // 'hold', 'toggle', 'pre_call'
        openKey: 'ctrl',
        keyMap: { up: 'up', down: 'down', left: 'left', right: 'right' },
        delays: {
            open: 100,
            sequence: 50,
            hold: 20
        },
        vibration: true,
        compactMode: false
    },
    editingSlot: null,
    editingType: 'main'
};

// DOM Elements
const loadoutGrid = document.getElementById('loadout-grid');
const missionGrid = document.getElementById('mission-grid');
const stationGrid = document.getElementById('station-grid');
const librarySection = document.getElementById('library-section');
const optionsSection = document.getElementById('options-section');
const stratagemList = document.getElementById('stratagem-list');
const closeLibraryBtn = document.getElementById('closeLibrary');
const closeOptionsBtn = document.getElementById('closeOptions');
const openOptionsBtn = document.getElementById('openOptions');
const searchBox = document.getElementById('search-box');

// Init
async function init() {
    startPingLoop(); // Start immediately

    await fetchStratagems();
    await fetchDSSStatus();
    
    // Load saved loadout & config
    const savedLoadout = localStorage.getItem('hd2_loadout');
    if (savedLoadout) state.loadout = JSON.parse(savedLoadout);

    const savedMissionLoadout = localStorage.getItem('hd2_mission_loadout');
    if (savedMissionLoadout) state.missionLoadout = JSON.parse(savedMissionLoadout);

    const savedConfig = localStorage.getItem('hd2_config');
    if (savedConfig) {
        // Merge saved config with default structure to handle new fields
        const loaded = JSON.parse(savedConfig);
        // Migration logic for old config structure
        if (loaded.delay && !loaded.delays) {
             state.config.delays.sequence = loaded.delay;
             state.config.delays.open = loaded.openDelay || 100;
             state.config.delays.hold = loaded.keyDuration || 20;
             state.config.openKey = loaded.openKey || 'ctrl';
             state.config.menuMode = loaded.mode === 'sequence' ? 'pre_call' : 'hold';
        } else {
             state.config = { ...state.config, ...loaded };
        }
    }
    
    // Apply config to UI
    updateOptionsUI();
    
    // Event Listeners
    // Options Inputs
    document.querySelectorAll('input[name="menuMode"]').forEach(r => {
        r.addEventListener('change', saveConfig);
    });
    
    ['opt-open-key', 'opt-open-delay', 'opt-seq-delay', 'opt-key-duration', 'opt-vibration'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveConfig);
    });

    ['bind-up', 'bind-down', 'bind-left', 'bind-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveConfig);
    });

    if (openOptionsBtn) openOptionsBtn.onclick = () => optionsSection.classList.remove('hidden');
    if (closeOptionsBtn) closeOptionsBtn.onclick = () => optionsSection.classList.add('hidden');
    
    renderLoadout();
    renderMissionLoadout();
    renderStationLoadout();
    renderLibrary();
    
    // Poll DSS status every 2 hours
    setInterval(() => fetchDSSStatus(), 7200000);
}

function startPingLoop() {
    const el = document.getElementById('latency-counter');
    if (!el) return;
    el.classList.remove('hidden');

    const updatePing = async () => {
        const start = Date.now();
        try {
            await fetch('/api/ping');
            const diff = Date.now() - start;
            el.innerText = `PING: ${diff}ms`;
            
            if (diff < 50) el.className = "text-xs font-mono text-green-500 font-bold";
            else if (diff < 150) el.className = "text-xs font-mono text-hd-yellow font-bold";
            else el.className = "text-xs font-mono text-red-500 font-bold";
            
        } catch (e) {
            el.innerText = "OFFLINE";
            el.className = "text-xs font-mono text-red-700 font-bold";
        }
    };

    updatePing();
    setInterval(updatePing, 2000); // Check every 2s
}

function updateOptionsUI() {
    // Menu Mode
    const modeRadio = document.querySelector(`input[name="menuMode"][value="${state.config.menuMode}"]`);
    if (modeRadio) modeRadio.checked = true;

    // Open Key
    const openKeyInput = document.getElementById('opt-open-key');
    if (openKeyInput) {
        openKeyInput.value = state.config.openKey;
        openKeyInput.disabled = state.config.menuMode === 'pre_call';
    }

    // Delays
    if (document.getElementById('opt-open-delay')) document.getElementById('opt-open-delay').value = state.config.delays.open;
    if (document.getElementById('opt-seq-delay')) document.getElementById('opt-seq-delay').value = state.config.delays.sequence;
    if (document.getElementById('opt-key-duration')) document.getElementById('opt-key-duration').value = state.config.delays.hold;

    // Keybindings
    if (document.getElementById('bind-up')) document.getElementById('bind-up').value = state.config.keyMap.up;
    if (document.getElementById('bind-down')) document.getElementById('bind-down').value = state.config.keyMap.down;
    if (document.getElementById('bind-left')) document.getElementById('bind-left').value = state.config.keyMap.left;
    if (document.getElementById('bind-right')) document.getElementById('bind-right').value = state.config.keyMap.right;

    // Vibration
    if (document.getElementById('opt-vibration')) document.getElementById('opt-vibration').checked = state.config.vibration;
}

function saveConfig() {
    // Read values from UI
    const mode = document.querySelector('input[name="menuMode"]:checked')?.value || 'hold';
    state.config.menuMode = mode;
    
    state.config.openKey = document.getElementById('opt-open-key').value;
    
    state.config.delays.open = parseInt(document.getElementById('opt-open-delay').value) || 100;
    state.config.delays.sequence = parseInt(document.getElementById('opt-seq-delay').value) || 50;
    state.config.delays.hold = parseInt(document.getElementById('opt-key-duration').value) || 20;

    state.config.keyMap.up = document.getElementById('bind-up').value || 'up';
    state.config.keyMap.down = document.getElementById('bind-down').value || 'down';
    state.config.keyMap.left = document.getElementById('bind-left').value || 'left';
    state.config.keyMap.right = document.getElementById('bind-right').value || 'right';

    state.config.vibration = document.getElementById('opt-vibration').checked;

    // Update UI state (e.g. disable open key)
    updateOptionsUI();

    localStorage.setItem('hd2_config', JSON.stringify(state.config));
}

async function fetchStratagems() {
    try {
        const res = await fetch('/api/stratagems?t=' + Date.now());
        state.stratagems = await res.json();
    } catch (e) {
        console.error("Failed to fetch stratagems", e);
        showToast("FAILED TO CONNECT TO SERVER", true);
    }
}

async function fetchDSSStatus() {
    try {
        const res = await fetch('/api/dss?t=' + Date.now());
        const activeIds = await res.json();
        state.stationLoadout = activeIds;
    } catch (e) {
        console.error("Failed to fetch DSS status", e);
        state.stationLoadout = []; // Fallback to empty
    }
}

function getStratagem(id) {
    return state.stratagems.find(s => s.id === id);
}

// Rendering
function renderMissionLoadout() {
    if (!missionGrid) return;
    missionGrid.innerHTML = '';
    
    // Check for Eagle Stratagems to auto-add Rearm
    const hasEagle = state.loadout.some(id => {
        if (!id) return false;
        const s = getStratagem(id);
        return s && s.category === 'Hangar (Eagle)' && s.id !== 'eagle_rearm';
    }) || state.stationLoadout.some(item => {
        if (!item || !item.active) return false;
        const s = getStratagem(item.id);
        // Check for Eagle Storm or generic Hangar category if applicable
        return s && (s.id === 'eagle_storm' || s.category === 'Hangar (Eagle)');
    });

    const rearmIndex = state.missionLoadout.indexOf('eagle_rearm');
    
    if (hasEagle) {
        if (rearmIndex === -1) {
            state.missionLoadout.push('eagle_rearm');
        }
    } else {
        if (rearmIndex !== -1) {
            state.missionLoadout.splice(rearmIndex, 1);
        }
    }

    // Render existing slots
    state.missionLoadout.forEach((sId, i) => {
        const stratagem = getStratagem(sId);
        
        const slot = document.createElement('div');
        // Smaller slots but maximized content
        slot.className = `
            relative aspect-square bg-hd-grey border border-gray-600 
            flex flex-col items-center justify-center p-1 pb-4 cursor-pointer
            hover:border-hd-yellow transition-colors group overflow-hidden
            ${!stratagem ? 'border-dashed opacity-70' : ''}
        `;
        
        if (stratagem) {
            slot.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center z-10 p-0.5">
                    <img src="${stratagem.icon}" class="w-full h-full object-contain drop-shadow-lg" onerror="this.style.display='none'; this.previousElementSibling.style.display='block'">
                    <div class="hidden text-lg">🚀</div>
                </div>
                
                <div class="absolute bottom-0 left-0 right-0 bg-black/80 text-center py-0.5">
                    <div class="text-[10px] text-hd-yellow font-bold tracking-widest leading-none">
                        ${arrowify(stratagem.keys)}
                    </div>
                </div>
                
                <!-- Remove Button (Top Left) - Disable for Eagle Rearm -->
                ${stratagem.id !== 'eagle_rearm' ? `
                <div class="absolute top-0 left-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-red-900/80 hover:bg-red-600 rounded-br cursor-pointer" onclick="event.stopPropagation(); removeMissionSlot(${i})">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                ` : ''}

                <!-- Edit Button (Top Right) - Disable for Eagle Rearm -->
                ${stratagem.id !== 'eagle_rearm' ? `
                <div class="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/50 rounded-bl" onclick="event.stopPropagation(); openLibrary(${i}, 'mission')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-hd-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                ` : ''}
                
                <div class="absolute inset-0 bg-hd-yellow opacity-0 active:opacity-20 transition-opacity pointer-events-none"></div>
            `;
            slot.onclick = () => executeStratagem(stratagem.id);
        } else {
            slot.innerHTML = `
                <span class="text-hd-yellow font-bold tracking-widest text-sm">ADD</span>
                <!-- Remove Button for empty slot -->
                <div class="absolute top-0 left-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30 bg-red-900/80 hover:bg-red-600 rounded-br cursor-pointer" onclick="event.stopPropagation(); removeMissionSlot(${i})">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            `;
            slot.onclick = () => openLibrary(i, 'mission');
        }
        missionGrid.appendChild(slot);
    });

    // Add New Slot Button
    const addBtn = document.createElement('div');
    addBtn.className = `
        aspect-square bg-hd-dark-grey border border-dashed border-gray-600 
        flex items-center justify-center cursor-pointer hover:border-hd-yellow hover:text-hd-yellow text-gray-500 transition-colors
    `;
    addBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
    `;
    addBtn.onclick = addMissionSlot;
    missionGrid.appendChild(addBtn);
}

function renderStationLoadout() {
    if (!stationGrid) return;
    stationGrid.innerHTML = '';
    
    // Use state.stationLoadout which is now populated from API as objects {id, active}
    state.stationLoadout.forEach((item, i) => {
        const stratagem = getStratagem(item.id);
        const isActive = item.active;
        
        const slot = document.createElement('div');
        slot.className = `
            relative aspect-square bg-hd-grey border border-gray-600 
            flex flex-col items-center justify-center p-1 pb-4 cursor-pointer
            transition-colors group overflow-hidden
            ${isActive ? 'hover:border-hd-yellow' : 'opacity-70 cursor-not-allowed'}
        `;
        
        if (stratagem) {
            const isPassive = stratagem.id === 'hellpod_optimization';
            
            slot.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center z-10 ${!isActive ? 'grayscale opacity-50' : ''}">
                    <img src="${stratagem.icon}" class="w-full h-full object-contain drop-shadow-lg" onerror="this.style.display='none'; this.previousElementSibling.style.display='block'">
                    <div class="hidden text-lg">🚀</div>
                </div>
                
                ${!isPassive ? `
                <div class="absolute bottom-0 left-0 right-0 bg-black/80 text-center py-0.5 z-30">
                     <div class="text-[10px] text-hd-yellow font-bold tracking-widest leading-none">
                        ${arrowify(stratagem.keys)}
                    </div>
                </div>
                <div class="absolute inset-0 bg-hd-yellow opacity-0 active:opacity-20 transition-opacity pointer-events-none"></div>
                ` : ''}

                ${!isActive ? `
                <div class="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                    <div class="text-[10px] text-red-500 font-bold text-center leading-tight px-1 transform -rotate-12 border-2 border-red-500 p-1">
                        INACTIVE<br>ON DSS
                    </div>
                </div>
                ` : ''}
            `;
            
            if (isActive && !isPassive) {
                slot.onclick = () => executeStratagem(stratagem.id);
            } else {
                slot.style.cursor = 'default';
            }
        }
        stationGrid.appendChild(slot);
    });
}

function addMissionSlot() {
    state.missionLoadout.push(null);
    localStorage.setItem('hd2_mission_loadout', JSON.stringify(state.missionLoadout));
    renderMissionLoadout();
}

function removeMissionSlot(index) {
    state.missionLoadout.splice(index, 1);
    localStorage.setItem('hd2_mission_loadout', JSON.stringify(state.missionLoadout));
    renderMissionLoadout();
}

function renderLoadout() {
    if (!loadoutGrid) return;
    loadoutGrid.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        const sId = state.loadout[i];
        const stratagem = getStratagem(sId);
        
        const slot = document.createElement('div');
        slot.className = `
            relative aspect-square bg-hd-grey border-2 border-gray-600 
            flex flex-col items-center justify-center p-2 cursor-pointer
            hover:border-hd-yellow transition-colors group overflow-hidden
            ${!stratagem ? 'border-dashed opacity-70' : ''}
        `;
        
        if (stratagem) {
            slot.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center z-10 p-2">
                    <img src="${stratagem.icon}" class="w-full h-full object-contain drop-shadow-lg" onerror="this.style.display='none'; this.previousElementSibling.style.display='block'">
                    <div class="hidden text-4xl">🚀</div>
                </div>
                
                <div class="absolute bottom-0 left-0 right-0 bg-black/80 text-center py-1">
                    <div class="text-xl text-hd-yellow font-bold tracking-widest leading-none">
                        ${arrowify(stratagem.keys)}
                    </div>
                </div>

                <!-- Edit Button -->
                <div class="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/50 rounded" onclick="event.stopPropagation(); openLibrary(${i}, 'main')">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-hd-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                
                <div class="absolute inset-0 bg-hd-yellow opacity-0 active:opacity-20 transition-opacity pointer-events-none"></div>
            `;
            slot.onclick = () => executeStratagem(stratagem.id);
        } else {
            slot.innerHTML = `
                <span class="text-hd-yellow font-bold tracking-widest text-sm">SELECT</span>
            `;
            slot.onclick = () => openLibrary(i, 'main');
        }
        loadoutGrid.appendChild(slot);
    }
}

function renderLibrary(filterText = '') {
    if (!stratagemList) return;
    stratagemList.innerHTML = '';
    
    let filtered = state.stratagems.filter(s => 
        (s.name.toLowerCase().includes(filterText.toLowerCase()) || 
        s.category.toLowerCase().includes(filterText.toLowerCase())) &&
        s.id !== 'eagle_rearm' // Hide Eagle Rearm from manual selection
    );

    // Filter by type
    if (state.editingType === 'mission') {
        filtered = filtered.filter(s => s.category === 'Mission');
    } else if (state.editingType === 'station') {
        filtered = filtered.filter(s => s.category === 'Space Station');
    } else {
        // Optional: Exclude mission/station stratagems from main loadout?
        // filtered = filtered.filter(s => s.category !== 'Mission' && s.category !== 'Space Station');
    }

    // Group by category
    const grouped = filtered.reduce((acc, s) => {
        const cat = s.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {});

    // Sort categories
    const order = [
        'Patriotic Administration Center',
        'Orbital Cannons', 
        'Hangar (Eagle)', 
        'Bridge',
        'Engineering Bay',
        'Robotics Workshop',
        'Warbonds',
        'Space Station',
        'Mission',
        'General'
    ];
    
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    sortedCategories.forEach(cat => {
        // Category Header
        const header = document.createElement('div');
        header.className = 'col-span-full text-xs font-bold text-hd-yellow mt-4 mb-2 border-b border-gray-700 pb-1 sticky top-0 bg-hd-black/90 z-10';
        header.innerText = cat.toUpperCase();
        stratagemList.appendChild(header);

        grouped[cat].forEach(s => {
            // Check if already selected in main loadout (and not the current slot)
            let isDisabled = false;
            if (state.editingType === 'main') {
                const existingIndex = state.loadout.indexOf(s.id);
                if (existingIndex !== -1 && existingIndex !== state.editingSlot) {
                    isDisabled = true;
                }
            }

            const item = document.createElement('div');
            // Larger grid item: 4 columns
            item.className = `bg-hd-grey border border-gray-700 p-1 flex flex-col items-center justify-between aspect-square transition-colors relative group
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-hd-yellow cursor-pointer'}
            `;
            
            item.innerHTML = `
                <div class="flex-grow flex items-center justify-center w-full p-1 relative">
                     <img src="${s.icon}" class="w-full h-full object-contain ${isDisabled ? 'grayscale' : ''}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                     <div class="hidden text-xl">🚀</div>
                     
                     <div class="absolute bottom-0 left-0 right-0 bg-black/80 text-center py-0.5">
                        <div class="text-[10px] text-hd-yellow font-bold tracking-widest leading-none">
                            ${arrowify(s.keys)}
                        </div>
                    </div>

                    ${isDisabled ? `
                    <div class="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                        <div class="text-[10px] text-red-500 font-bold text-center leading-tight px-1 border border-red-500 bg-black/80">
                            EQUIPPED
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="w-full bg-black/70 text-xs text-center leading-tight py-1 px-1 text-gray-200 ${!isDisabled ? 'group-hover:text-white' : ''} font-bold break-words h-10 flex items-center justify-center z-20 relative">
                    <span class="line-clamp-2">${s.name}</span>
                </div>
            `;
            
            if (!isDisabled) {
                item.onclick = () => selectStratagem(s.id);
            }
            stratagemList.appendChild(item);
        });
    });
}

// Actions
function openLibrary(slotIndex, type = 'main') {
    state.editingSlot = slotIndex;
    state.editingType = type;
    librarySection.classList.remove('hidden');
    searchBox.value = '';
    searchBox.focus();
    // Update grid class for 4 columns
    stratagemList.className = 'grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2';
    renderLibrary();
}

function closeLibrary() {
    librarySection.classList.add('hidden');
    state.editingSlot = null;
}

function selectStratagem(id) {
    if (state.editingSlot === null) return;
    
    if (state.editingType === 'mission') {
        state.missionLoadout[state.editingSlot] = id;
        localStorage.setItem('hd2_mission_loadout', JSON.stringify(state.missionLoadout));
        renderMissionLoadout();
    } else {
        state.loadout[state.editingSlot] = id;
        localStorage.setItem('hd2_loadout', JSON.stringify(state.loadout));
        renderLoadout();
        renderMissionLoadout(); // Re-check for Eagle Rearm
    }
    
    closeLibrary();
}

async function executeStratagem(id) {
    const stratagem = getStratagem(id);
    
    if (state.config.vibration && navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    showToast(`CALLING: ${stratagem.name.toUpperCase()}`);

    const start = Date.now();
    try {
        await fetch('/api/execute', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                stratagem_id: id, 
                mode: state.config.menuMode,
                open_key: state.config.openKey,
                delay: state.config.delays.sequence,
                open_delay: state.config.delays.open,
                key_duration: state.config.delays.hold,
                key_map: state.config.keyMap
            })
        });
        
        const duration = Date.now() - start;
        const el = document.getElementById('latency-counter');
        if(el) {
             el.innerText = `CMD: ${duration}ms`;
             el.className = "text-xs font-mono text-cyan-400 font-bold animate-pulse";
        }

    } catch (e) {
        console.error("Execution failed", e);
        showToast("CONNECTION ERROR", true);
    }
}

function showToast(text, isError = false) {
    Toastify({
        text: text,
        duration: 2000,
        gravity: "top", 
        position: "center", 
        style: {
            background: isError ? "#FF0000" : "#FFE800",
            color: isError ? "#FFFFFF" : "#1A1A1A",
            fontWeight: "bold",
            border: "2px solid #1A1A1A",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)"
        }
    }).showToast();
}

// Helpers
function arrowify(keys) {
    const map = {
        'up': '⬆',
        'down': '⬇',
        'left': '⬅',
        'right': '➡'
    };
    return keys.map(k => map[k] || k).join('');
}

// Event Listeners
if (closeLibraryBtn) closeLibraryBtn.onclick = closeLibrary;
if (searchBox) searchBox.oninput = (e) => renderLibrary(e.target.value);

// Start
init();
