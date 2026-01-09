// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAWmZGiuNlWCe4rE19oMjt3eqJFu965nyg",
    authDomain: "gym-smart-ai.firebaseapp.com",
    databaseURL: "https://gym-smart-ai-default-rtdb.firebaseio.com",
    projectId: "gym-smart-ai",
    storageBucket: "gym-smart-ai.firebasestorage.app",
    messagingSenderId: "966113816442",
    appId: "1:966113816442:web:1aa43ac603f78c41b730c3",
    measurementId: "G-2XFSJPW7B7"
};

// Inizializzazione sicura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let currentUserID = null;
let html5QrCode = null;
let currentCameraMode = "environment"; // Parte con la posteriore

// --- 1. GESTIONE VISTE E ACCESSO ---

function showView(viewId) {
    // Nascondi tutte le viste
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    // Gestione Sidebar: mostrala solo se non siamo nel login
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = (viewId === 'view-login') ? 'none' : 'flex';
    }
}

function updateRealTimeClock() {
    const clockEl = document.getElementById('tv-real-clock');
    if (!clockEl) return;

    const ora = new Date();
    const opzioni = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dataString = ora.toLocaleDateString('it-IT', opzioni);
    const orarioString = ora.toLocaleTimeString('it-IT', { hour12: false });

    clockEl.innerHTML = `
        <div style="font-size: 1.5rem; color: #00f2ff;">${dataString}</div>
        <div style="font-size: 3.5rem; font-weight: bold; letter-spacing: 2px;">${orarioString}</div>
    `;
}
setInterval(updateRealTimeClock, 1000);

function generateAISmartWorkout(atletaData, sessioneTipo) {
    const aiBox = document.getElementById('ai-diet-tip'); 
    if (!aiBox) return;

    // Parametri di calcolo
    const squat = atletaData.massimali?.squat || 0;
    const deadlift = atletaData.massimali?.deadlift || 0;
    const ratio = squat / deadlift; // Rapporto di forza tra spinta e tirata
    const livello = squat > 150 ? "AVANZATO" : "INTERMEDIO/BASE";

    let consiglioLogico = "";
    let esercizi = [];

    // --- LOGICA DI INTELLIGENZA ARTIFICIALE ---
    
    // Caso 1: Recupero o Salute Bassa
    if (atletaData.salute !== 'Ottima') {
        consiglioLogico = "Focus sulla mobilità e recupero attivo per prevenire infortuni.";
        esercizi = [
            "Mobilità d'anca e caviglia (10 min)",
            `Goblet Squat Tecnico: 3x12 con ${Math.round(squat * 0.4)}kg`,
            "Core stability: Plank 4x45 secondi"
        ];
    } 
    // Caso 2: Squat debole rispetto allo stacco (Squat < 70% dello Stacco)
    else if (ratio < 0.7) {
        consiglioLogico = "Rilevato squilibrio: focus prioritario sulla spinta delle gambe (Quadricipiti).";
        esercizi = [
            `Back Squat: 5x5 con ${Math.round(squat * 0.8)}kg (Focus profondità)`,
            "Leg Press: 3x10 (Carico controllato)",
            "Bulgarian Split Squat: 3x8 per gamba"
        ];
    }
    // Caso 3: Atleta Avanzato in sessione Forza
    else if (livello === "AVANZATO" && sessioneTipo === "Forza") {
        consiglioLogico = "Atleta di alto livello: focus su picchi di potenza e attivazione neurale.";
        esercizi = [
            `Pause Squat: 4x3 con ${Math.round(squat * 0.85)}kg`,
            `Stacco da terra: 3x2 con ${Math.round(deadlift * 0.9)}kg`,
            "Salto sul box (Box Jump): 5x3 (Massima esplosività)"
        ];
    }
    // Caso Standard
    else {
        consiglioLogico = `Sessione bilanciata per livello ${livello}.`;
        esercizi = [
            `Esercizio Base: 4x8 al 70% (${Math.round(squat * 0.7)}kg)`,
            "Accessorio: 3x12 complementari",
            "Condizionamento: 10 min cardio alta intensità"
        ];
    }

    // --- RENDERING HTML ---
    aiBox.innerHTML = `
        <div class="ai-card-workout">
            <h4 style="color: #00f2ff; margin-bottom: 10px;">🤖 AI COACH: ${sessioneTipo}</h4>
            <p style="font-size: 0.85rem; font-style: italic; color: #bbb;">"${consiglioLogico}"</p>
            <hr border="0" style="border-top: 1px solid #333; margin: 10px 0;">
            <ul style="list-style: none; padding: 0; font-size: 0.95rem;">
                ${esercizi.map(es => `<li style="margin-bottom: 8px;">✅ ${es}</li>`).join('')}
            </ul>
        </div>
    `;
}

function startLiveClock() {
    const clockContainer = document.getElementById('tv-real-clock');
    if (!clockContainer) return;

    setInterval(() => {
        const ora = new Date();
        const giorni = ['DOM', 'LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB'];
        
        const g = ora.getDate().toString().padStart(2, '0');
        const m = (ora.getMonth() + 1).toString().padStart(2, '0');
        const h = ora.getHours().toString().padStart(2, '0');
        const min = ora.getMinutes().toString().padStart(2, '0');
        const sec = ora.getSeconds().toString().padStart(2, '0');

        clockContainer.innerHTML = `
            <div style="font-family: monospace; display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 1.2rem; color: #00f2ff;">${giorni[ora.getDay()]} ${g}/${m}/${ora.getFullYear()}</div>
                <div style="font-size: 4rem; font-weight: 900; color: white;">${h}:${min}:${sec}</div>
            </div>
        `;
    }, 1000);
}
// Avviala subito
startLiveClock();


// Login Manuale
window.manualLogin = function () {
    const input = document.getElementById('atleta-id-input');
    if (input) {
        const id = input.value.trim().toUpperCase();
        if (id) processLogin(id);
        else alert("Inserisci un ID Atleta valido");
    }
};

// --- 2. LOGICA SCANNER (FOTOCAMERA POSTERIORE) ---
window.initScanner = function () {
    const readerElem = document.getElementById('reader');
    const switchBtn = document.getElementById('switch-cam-btn');
    const startBtn = document.getElementById('start-scan-btn');

    if (readerElem) readerElem.style.display = 'block';
    if (switchBtn) switchBtn.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    startScanning();
};

function startScanning() {
    setTimeout(() => {
        const config = { fps: 20, qrbox: { width: 250, height: 250 } };

        html5QrCode.start(
            { facingMode: currentCameraMode },
            config,
            (decodedText) => {
                console.log("Lettura riuscita!");
                html5QrCode.stop().then(() => {
                    const readerElem = document.getElementById('reader');
                    const switchBtn = document.getElementById('switch-cam-btn');
                    if (readerElem) readerElem.style.display = 'none';
                    if (switchBtn) switchBtn.style.display = 'none';
                    processLogin(decodedText.trim().toUpperCase());
                }).catch(err => console.error("Errore stop scanner:", err));
            }
        ).catch(err => {
            console.error("Errore camera:", err);
            alert("Impossibile avviare la fotocamera. Assicurati di aver concesso i permessi.");
            document.getElementById('start-scan-btn').style.display = 'block';
        });
    }, 300);
}
window.switchCamera = function () {
    if (html5QrCode) {
        currentCameraMode = (currentCameraMode === "environment") ? "user" : "environment";
        html5QrCode.stop().then(() => {
            startScanning();
        });
    }
};

// --- 3. PROCESSO LOGIN ---
function processLogin(id) {
    console.log("Dato ricevuto dallo scanner:", id);

    // Pulizia ID: togliamo spazi extra che il QR potrebbe aver letto per errore
    const cleanId = id.trim().toUpperCase();

    db.ref('atleti/' + cleanId).once('value').then((snapshot) => {
        const data = snapshot.val();

        if (data) {
            console.log("Atleta trovato:", data.nome);
            currentUserID = cleanId;

            // 1. Cambia subito la vista (così vedi che ha funzionato)
            showView('view-auth');

            // 2. Aggiorna l'interfaccia
            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.innerText = data.nome;

            // 3. Avvia le funzioni secondarie
            generateUserQR(cleanId);
            syncProfile();

            // 4. Segna la presenza sulla TV
            db.ref('live_session/' + cleanId).set(data);
        } else {
            console.warn("ID non trovato nel DB:", cleanId);
            alert("Atleta non trovato: " + cleanId);
            document.getElementById('start-scan-btn').style.display = 'block';
        }
    }).catch(err => {
        console.error("Errore critico durante il login:", err);
        alert("Errore connessione database. Riprova.");
    });
}

window.logout = function () {
    if (currentUserID) db.ref('live_session/' + currentUserID).remove();
    location.reload();
};

// --- 4. FUNZIONALITÀ SECONDARIE ---
function generateUserQR(id) {
    const container = document.getElementById('my-qr-code');
    if (!container) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}&color=000000&bgcolor=ffffff`;
    container.innerHTML = `<img src="${qrUrl}" style="border: 2px solid #00f2ff; border-radius:10px;">`;
}

// --- 3. SINCRONIZZAZIONE DATI ---
function syncProfile() {
    if (!currentUserID) return;
    db.ref('atleti/' + currentUserID).off();
    db.ref('atleti/' + currentUserID).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const elSquat = document.getElementById('val-squat');
        const elDead = document.getElementById('val-dead');
        const elHealth = document.getElementById('health-status');

        if (elSquat) elSquat.innerText = data.massimali?.squat || 0;
        if (elDead) elDead.innerText = data.massimali?.deadlift || 0;
        if (elHealth) elHealth.innerText = `Status: ${data.salute || 'OK'}`;
    });
}

// --- LOGICA COACH PANEL POTENZIATA ---
window.pushWorkout = function (tipo) {
    const prompt = document.getElementById('ai-prompt').value;

    // Configurazione automatica in base al tipo
    let duration = 0;
    let title = "";
    let intensity = 0;

    switch (tipo) {
        case 'Forza':
            duration = 600; // 10 min
            title = "PHASE: MAX STRENGTH";
            intensity = 0.85; // 85% del massimale
            break;
        case 'WOD':
            duration = 1200; // 20 min
            title = "PHASE: METCON / WOD";
            intensity = 0.60; // 60% del massimale (volume alto)
            break;
        case 'Recovery':
            duration = 300; // 5 min
            title = "PHASE: MOBILITY / RECOVERY";
            intensity = 0.30; // 30% del massimale
            break;
        case 'Endurance':
            duration = 1800; // 30 min
            title = "PHASE: ENDURANCE";
            intensity = 0.50; // 50% del massimale
            break;
    }

    const sessionData = {
        tipo: tipo,
        fase: title,
        desc: prompt || "Seguire le istruzioni del Coach a schermo",
        timer: duration,
        intensity: intensity, // Inviamo la percentuale a tutti
        timestamp: Date.now() // Serve per sincronizzare il timer su tutti i dispositivi
    };

    // Invia i dati al database
    db.ref('active_session').set(sessionData).then(() => {
        alert("Sessione " + tipo + " inviata alla TV e agli Atleti!");
    });
};

// --- LOGICA LIVE TV, TIMER E CONSIGLI AI ---
let countdownInterval;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, duration) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

db.ref('active_session').on('value', snapshot => {
    const data = snapshot.val();
    if (!data || !currentUserID) return;

    // 1. Aggiorna Testi sulla TV (Fase e Descrizione)
    const tvTitle = document.getElementById('tv-phase-title');
    const tvDesc = document.getElementById('tv-phase-desc');
    if (tvTitle) tvTitle.innerText = data.fase;
    if (tvDesc) tvDesc.innerText = data.desc;

    // 2. Recupero Dati Atleta e Logica Personalizzata
    db.ref('atleti/' + currentUserID).once('value').then(userSnap => {
        const userData = userSnap.val();
        if (!userData) return;

        // --- CALCOLO PESO PERSONALIZZATO ---
        if (data.intensity) {
            const squatMax = userData.massimali?.squat || 0;
            const targetWeight = Math.round(squatMax * data.intensity);
            const aiBox = document.getElementById('ai-diet-tip');
            if (aiBox) {
                aiBox.innerHTML = `
                    <div style="border-left: 3px solid #00f2ff; padding-left: 10px;">
                        <strong style="color: #00f2ff;">🎯 OBIETTIVO AI:</strong><br>
                        Per questa sessione di <strong>${data.tipo}</strong>, 
                        il tuo carico ideale è: 
                        <span style="font-size: 1.2rem; display: block; margin-top: 5px;">
                            ${targetWeight} kg (${Math.round(data.intensity * 100)}%)
                        </span>
                    </div>
                `;
            }
        }

        // --- GENERAZIONE AI SMART WORKOUT ---
        // Chiamiamo la nuova intelligenza artificiale passando i dati utente e il tipo di sessione
        if (typeof generateAISmartWorkout === "function") {
            generateAISmartWorkout(userData, data.tipo);
        }
    });
});

    // 3. Gestione Timer Sincronizzato con Audio
    clearInterval(countdownInterval);
    let timeLeft = data.timer;

    countdownInterval = setInterval(() => {
        timeLeft--;

        // Beep ultimi 3 secondi
        if (timeLeft <= 3 && timeLeft > 0) playBeep(440, 0.1);

        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            const timerEl = document.getElementById('tv-timer');
            if (timerEl) timerEl.innerText = "00:00";
            playBeep(880, 0.5); // Beep finale
            return;
        }

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const timerEl = document.getElementById('tv-timer');
        if (timerEl) timerEl.innerText = timeDisplay;
    }, 1000);
});


db.ref('live_session').on('value', snapshot => {
    const presenti = snapshot.val();
    const listContainer = document.getElementById('live-checkin-list');

    if (!listContainer) return;

    listContainer.innerHTML = ""; // Pulisce la lista precedente

    if (presenti) {
        Object.keys(presenti).forEach(id => {
            const atleta = presenti[id];
            listContainer.innerHTML += ` 
                <div class="atleta-row glass" style="margin-bottom: 10px; padding: 10px; border-left: 4px solid #00f2ff; display: flex; justify-content: space-between; align-items: center;"> 
                    <div>
                        <div style="font-weight: bold; color: white;">${atleta.nome}</div> 
                        <div style="font-size: 0.8rem; color: #888;"> 
                            Salute: <span style="color: ${atleta.salute === 'Ottima' ? '#00ff00' : '#ffcc00'}">${atleta.salute}</span> 
                            | Squat Max: ${atleta.massimali?.squat || 0}kg 
                        </div> 
                    </div>
                </div> `;
        });
    } else {
        listContainer.innerHTML = "<p style='color: #666; font-size: 0.9rem;'>Nessun atleta in sessione</p>";
    }
});

// Inizializzazione Grafico
window.addEventListener('load', () => {
    const canvas = document.getElementById('performanceChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sett 1', 'Sett 2', 'Sett 3', 'Sett 4'],
                datasets: [{
                    label: 'Massimali',
                    data: [60, 65, 63, 70],
                    borderColor: '#00f2ff',
                    tension: 0.4
                }]
            }
        });
    }
});

// --- LISTA ATLETI LIVE SULLA TV ---
db.ref('live_session').on('value', snapshot => {
    const atletiGrid = document.getElementById('tv-atleti-grid');
    if (!atletiGrid) return;

    const presenti = snapshot.val();
    atletiGrid.innerHTML = ""; // Pulisce la griglia

    if (presenti) {
        Object.keys(presenti).forEach(id => {
            const atleta = presenti[id];
            // Crea un box per ogni atleta
            atletiGrid.innerHTML += `
                <div class="atleta-card glass pulse-border">
                    <div class="atleta-name">${atleta.nome}</div>
                    <div class="atleta-status">${atleta.salute === 'Ottima' ? '🔥 READY' : '⚠️ CAUTION'}</div>
                </div>
            `;
        });
    }
});

// --- FUNZIONE RESET SESSIONE ---
window.resetGymSession = function() {
    if (confirm("Sei sicuro di voler resettare la sessione? La TV e la lista atleti verranno svuotate.")) {
        
        // 1. Cancella la sessione attiva (Timer e Workout sulla TV)
        db.ref('active_session').remove();

        // 2. Cancella tutti gli atleti dalla live_session (Svuota la lista presenti)
        db.ref('live_session').remove();

        // 3. Opzionale: Ferma il timer locale se sta ancora girando
        if (countdownInterval) {
            clearInterval(countdownInterval);
            const timerEl = document.getElementById('tv-timer');
            if (timerEl) timerEl.innerText = "00:00";
        }

        alert("Sessione resettata con successo!");
    }
};