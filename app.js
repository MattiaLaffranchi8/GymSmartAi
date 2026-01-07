// CONFIGURAZIONE FIREBASE (Incolla qui i tuoi dati)
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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUserID = null;
let html5QrCode = null;

// --- 1. GESTIONE VISTE E ACCESSO ---

function showView(viewId) {
    // Nascondi tutte le viste
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Mostra quella selezionata
    document.getElementById(viewId).classList.add('active');
    
    // Gestione Sidebar: mostrala solo se non siamo nel login
    const sidebar = document.getElementById('sidebar');
    if (viewId === 'view-login') {
        sidebar.style.display = 'none';
    } else {
        sidebar.style.display = 'flex';
    }
}

// Login Manuale
function manualLogin() {
    const id = document.getElementById('atleta-id-input').value.trim().toUpperCase();
    if (id) processLogin(id);
    else alert("Inserisci un ID Atleta valido");
}

// Inizializzazione Scanner QR
function initScanner() {
    const readerElem = document.getElementById('reader');
    readerElem.style.display = 'block';
    document.getElementById('start-scan-btn').style.display = 'none';

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "user" }, 
        config,
        (decodedText) => {
            html5QrCode.stop().then(() => {
                readerElem.style.display = 'none';
                processLogin(decodedText.trim().toUpperCase());
            });
        }
    ).catch(err => {
        alert("Errore fotocamera: " + err);
        readerElem.style.display = 'none';
        document.getElementById('start-scan-btn').style.display = 'block';
    });
}

// Processo di Login Unificato
function processLogin(id) {
    db.ref('atleti/' + id).once('value').then((snapshot) => {
        let data = snapshot.val();
        
        // Se l'atleta non esiste, lo creiamo (per test) o diamo errore
        if (!data) {
            data = {
                nome: "Atleta " + id,
                massimali: { squat: 60, deadlift: 80 },
                salute: "Ottima",
                bio: "Nessuna nota"
            };
            db.ref('atleti/' + id).set(data);
        }

        currentUserID = id;
        document.getElementById('user-display-name').innerText = data.nome;
        
        // Genera il QR personale per il futuro
        generateUserQR(id);
        
        // Sincronizza i dati e vai alla dashboard
        syncProfile();
        showView('view-auth');
        
        // Segna presenza sulla TV
        db.ref('live_session/' + id).set(data);
    });
}

function logout() {
    if(currentUserID) db.ref('live_session/' + currentUserID).remove();
    location.reload();
}

// --- 2. GENERAZIONE QR CODE PERSONALE ---
function generateUserQR(id) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}&color=00f2ff&bgcolor=1a1a1a`;
    document.getElementById('my-qr-code').innerHTML = `<img src="${qrUrl}" style="border: 2px solid var(--primary); border-radius:10px;">`;
}

// --- 3. SINCRONIZZAZIONE DATI ---
function syncProfile() {
    db.ref('atleti/' + currentUserID).on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return;

        document.getElementById('val-squat').innerText = data.massimali.squat;
        document.getElementById('val-dead').innerText = data.massimali.deadlift;
        document.getElementById('health-status').innerText = `Status: ${data.salute}`;
        
        // Simulazione AI Advice
        document.getElementById('ai-diet-tip').innerText = data.massimali.squat > 100 ? 
            "AI: Carico alto rilevato. Aumenta introito proteico oggi." : 
            "AI: Focus su tecnica. Mantieni idratazione costante.";
    });
}

// --- 4. GRAFICI (CHART.JS) ---
const ctx = document.getElementById('performanceChart').getContext('2d');
new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Sett 1', 'Sett 2', 'Sett 3', 'Sett 4'],
        datasets: [{
            label: 'Massimali',
            data: [60, 65, 63, 70],
            borderColor: '#00f2ff',
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            fill: true,
            tension: 0.4
        }]
    },
    options: { 
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { grid: { color: '#222' } }, x: { grid: { display: false } } }
    }
});

// --- 5. LOGICA COACH E TV ---
function pushWorkout(tipo) {
    const prompt = document.getElementById('ai-prompt').value;
    db.ref('active_session').set({
        fase: tipo === 'Forza' ? 'PHASE: MAX STRENGTH' : 'PHASE: METCON / WOD',
        desc: prompt || "Seguire le istruzioni dell'AI",
        timer: tipo === 'Forza' ? 600 : 1200
    });
}

// Da chiamare nel Pannello Coach per validare un nuovo record
function updateAthleteRecord(atletaId, esercizio, nuovoPeso) {
    db.ref(`atleti/${atletaId}/massimali/${esercizio}`).set(nuovoPeso);
    // Questo aggiornerà istantaneamente la dashboard dell'atleta e la TV
}

db.ref('active_session').on('value', snapshot => {
    const data = snapshot.val();
    if(data) {
        document.getElementById('tv-phase-title').innerText = data.fase;
        document.getElementById('tv-phase-desc').innerText = data.desc;
    }
});

db.ref('live_session').on('value', snapshot => {
    const presenti = snapshot.val();
    const grid = document.getElementById('tv-atleti-grid');
    grid.innerHTML = "";
    if(presenti) {
        Object.keys(presenti).forEach(id => {
            const a = presenti[id];
            grid.innerHTML += `
                <div class="tv-card glass">
                    <small>ATLETA</small>
                    <div style="font-size: 1.5rem; font-weight:700">${a.nome}</div>
                    <div style="font-size: 3.5rem; color: var(--primary);">${Math.round(a.massimali.squat * 0.8)}kg</div>
                    <div style="font-size: 0.8rem; color: var(--dim)">OBIETTIVO: 80% MAX</div>
                </div>
            `;
        });
    }
});