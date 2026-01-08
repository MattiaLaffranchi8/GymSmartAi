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

// --- 1. GESTIONE VISTE E ACCESSO ---

function showView(viewId) {
    // Nascondi tutte le viste
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    // Mostra quella selezionata
    document.getElementById(viewId).classList.add('active');

    // Gestione Sidebar: mostrala solo se non siamo nel login
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.style.display = (viewId === 'view-login') ? 'none' : 'flex';
    }
}

// Login Manuale
function manualLogin() {
    const id = document.getElementById('atleta-id-input').value.trim().toUpperCase();
    if (id) processLogin(id);
    else alert("Inserisci un ID Atleta valido");
};

// --- 2. LOGICA SCANNER (FOTOCAMERA POSTERIORE) ---
window.initScanner = function () {
    const readerElem = document.getElementById('reader');
    const startBtn = document.getElementById('start-scan-btn');

    if (readerElem) readerElem.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            html5QrCode.stop().then(() => {
                if (readerElem) readerElem.style.display = 'none';
                processLogin(decodedText.trim().toUpperCase());
            }).catch(err => console.error("Errore stop scanner:", err));
        }
    ).catch(err => {
        alert("Errore fotocamera: " + err);
        if (readerElem) readerElem.style.display = 'none';
        if (startBtn) startBtn.style.display = 'block';
    });
};

// --- 3. PROCESSO DI LOGIN ---
function processLogin(id) {
    db.ref('atleti/' + id).once('value').then((snapshot) => {
        let data = snapshot.val();

        // Se l'atleta non esiste, lo creiamo (per test) o diamo errore
        if (!data) {
            data = {
                nome: "Atleta " + id,
                massimali: { squat: 60, deadlift: 80 },
                salute: "Ottima",
                bio: "Creato da QR"
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
    }).catch(err => {
        console.error("Errore accesso database:", err);
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
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}&color=00f2ff&bgcolor=1a1a1a`;
    container.innerHTML = `<img src="${qrUrl}" style="border: 2px solid #00f2ff; border-radius:10px;">`;
}

// --- 3. SINCRONIZZAZIONE DATI ---
function syncProfile() {
    if (!currentUserID) return;
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

// Inizializzazione Grafico (solo se il canvas esiste)
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