/** * OLYMPUS AI - SISTEMA INTEGRATO 2026
 * Include: Login QR, Manuale, AI Coach, Live TV, PDF Report, Grafici
 */
// --- 1. CONFIGURAZIONE E INIT ---
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
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
let currentUserId = null;
let html5QrCode = null;
let currentCameraMode = "environment";
let countdownInterval, tvInterval, restInterval, myChart;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- 2. GESTIONE VISTE E OROLOGIO ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = (viewId === 'view-login') ? 'none' : 'flex';
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
      </div>`;
    }, 1000);
}

// --- 3. LOGICA LOGIN (SCANNER + MANUALE) ---
window.initScanner = function () {
    const readerElem = document.getElementById('reader');
    if (readerElem) readerElem.style.display = 'block';
    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
    startScanning();
};

function startScanning() {
    const config = { fps: 20, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: currentCameraMode }, config, (decodedText) => {
        navigator.vibrate?.(200); // Feedback vibrazione
        html5QrCode.stop().then(() => {
            document.getElementById('reader').style.display = 'none';
            processLogin(decodedText.trim().toUpperCase());
        });
    }).catch(err => {
        console.error("Errore scanner:", err);
        alert("Impossibile accedere alla camera. Prova manuale.");
    });
}

window.switchCamera = function () {
    currentCameraMode = currentCameraMode === "environment" ? "user" : "environment";
    if (html5QrCode) html5QrCode.stop().then(startScanning);
};

async function processLogin(id) {
    try {
        await auth.signInAnonymously(); // Auth anonymous per testing; cambia con email/password per prod
        const snapshot = await db.ref('atleti/' + id).once('value');
        const data = snapshot.val();
        if (data) {
            currentUserId = id;
            localStorage.setItem('userId', id); // Persisti sessione
            showView(data.ruolo === 'coach' ? 'view-coach' : 'view-auth'); // Basato su ruolo
            document.getElementById('user-display-name').innerText = data.nome || 'Champion';
            generateUserQR(id);
            syncProfile();
            inizializzaGrafico(id);
            db.ref('live_session/' + id).set({ ...data, loginTime: Date.now() }); // Aggiungi timestamp
        } else {
            throw new Error("Atleta non trovato");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("Errore: " + err.message);
    }
}

window.manualLogin = async function () {
    const input = document.getElementById('atleta-id-input');
    const btn = input.nextElementSibling;
    const id = input.value.trim().toUpperCase();
    if (!id) {
        input.classList.add('input-error');
        return;
    }
    btn.classList.add('loading');
    await processLogin(id);
    btn.classList.remove('loading');
};

window.logout = function () {
    currentUserId = null;
    localStorage.removeItem('userId');
    showView('view-login');
    auth.signOut().catch(err => console.error("Logout error:", err));
};

// --- 4. LOGICA AI SMART WORKOUT ---
async function generateAISmartWorkout(atletaData, sessioneTipo) {
    const aiBox = document.getElementById('ai-diet-tip');
    if (!aiBox) return;
    const squat = atletaData.massimali?.squat || 0;
    const deadlift = atletaData.massimali?.deadlift || 0;
    const ratio = squat / deadlift || 1;
    // Predizione semplice ML-like (usa media storico)
    const storicoSnapshot = await db.ref(`atleti/${currentUserId}/storico/squat`).once('value');
    const storico = [];
    storicoSnapshot.forEach(c => storico.push(c.val().kg));

    let trend = 0;
    if (storico.length > 1) {
        // Usa TF.js per fit lineare
        const xs = tf.tensor2d([...Array(storico.length).keys()].map(i => [i])); // Indici
        const ys = tf.tensor2d(storico.map(k => [k])); // Valori kg
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
        await model.fit(xs, ys, { epochs: 100 }); // Addestra quick
        const nextPred = await model.predict(tf.tensor2d([[storico.length]])).data();
        trend = Math.round(nextPred[0] - storico[storico.length - 1]); // Delta predetto
    }
    const predizione = `Trend prossimo: +${trend}kg`;


    let consiglio = "";
    let esercizi = [];
    if (atletaData.salute !== 'Ottima') {
        consiglio = "Focus recupero attivo. " + predizione;
        esercizi = ["Mobilità (10 min)", "Goblet Squat Leggero", "Plank 4x45s"];
    } else if (ratio < 0.7) {
        consiglio = "Focus squilibrio Quadricipiti. " + predizione;
        esercizi = [`Squat: 5x5 @${Math.round(squat * 0.8)}kg`, "Leg Press 3x10"];
    } else {
        consiglio = `Sessione bilanciata ${sessioneTipo}. ${predizione}`;
        esercizi = [`Base: 4x8 @70% (${Math.round(squat * 0.7)}kg)`, "Accessori 3x12"];
    }
    aiBox.innerHTML = `
    <div class="ai-card-workout pulse-border"> <!-- Aggiungi animazione -->
      <h4 style="color: #00f2ff;">🤖 AI COACH: ${sessioneTipo}</h4>
      <p style="font-size: 0.8rem; color: #bbb;">${consiglio}</p>
      <ul style="list-style: none; padding: 0;">
        ${esercizi.map(es => `<li>✅ ${es}</li>`).join('')}
      </ul>
    </div>`;
}

// --- 5. TV, COACH E TIMER ---
window.generateWorkout = async function (tipo) {
    const level = document.getElementById('ai-level').value;
    const duration = document.getElementById('ai-duration').value;
    const prompt = document.getElementById('ai-prompt').value;
    const attrezzatura = Array.from(document.querySelectorAll('.checkbox-grid input:checked')).map(c => c.value);

    // Espandi esercizi con regole gratuite (basato su prompt)
    let esercizi = ["Warmup 5min"];
    if (prompt.includes('glutei')) esercizi.push('Hip Thrust 4x12');
    if (attrezzatura.includes('bilancieri')) esercizi.push(`Squat con bilanciere 3x10`);
    esercizi.push(`Main: ${tipo} 4x10`, "Cooldown 5min");

    const sessione = { tipo, level, duration, esercizi };
    const output = document.getElementById('ai-output-container');
    output.innerHTML = `
    <div class="workout-preview glass">
      <h4>${tipo} - ${level} (${duration} min)</h4>
      <p>Prompt: ${prompt || 'Nessuno'}</p>
      <ul>${sessione.esercizi.map(e => `<li contenteditable="true">${e}</li>`).join('')}</ul> <!-- Rendi editabile -->
      <p>Attrezzatura: ${attrezzatura.join(', ')}</p>
    </div>`;
    document.getElementById('coach-actions').style.display = 'flex';

    // Push to DB
    db.ref('active_session').set(sessione).catch(err => alert("Errore push: " + err));
};

window.pushWorkout = function (tipo) { // Mantenuto se separato da generateWorkout
    const prompt = document.getElementById('ai-prompt').value;
    const durations = { 'Forza': 600, 'WOD': 1200, 'Recovery': 300, 'Endurance': 1800 };
    db.ref('active_session').set({
        tipo: tipo, fase: `PHASE: ${tipo.toUpperCase()}`,
        desc: prompt || "Segui il Coach",
        timer: durations[tipo] || 600,
        timestamp: Date.now()
    }).catch(err => console.error("Push error:", err));
};

window.pushToTV = function () { // Stub se esiste in HTML; espandi se serve
    console.log("Pushing to TV...");
    // Logica per inviare a TV, es. chiama pushWorkout con tipo corrente
};

db.ref('active_session').on('value', snapshot => {
    const data = snapshot.val();
    if (!data) return;
    document.getElementById('tv-phase-title').innerText = data.fase;
    document.getElementById('tv-phase-desc').innerText = data.desc;
    if (currentUserId) {
        db.ref('atleti/' + currentUserId).once('value', s => {
            if (s.val()) generateAISmartWorkout(s.val(), data.tipo);
        });
    }
    let timeLeft = data.timer;
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 3 && timeLeft > 0) playBeep(440, 0.1);
        if (timeLeft <= 0) { clearInterval(countdownInterval); playBeep(880, 0.5); }
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('tv-timer').innerText = `${m}:${s}`;
    }, 1000);
});

// --- 6. GRAFICI E PDF ---
function inizializzaGrafico(id) {
    const ctx = document.getElementById('performanceChart')?.getContext('2d');
    if (!ctx) return;
    db.ref(`atleti/${id}/storico/squat`).limitToLast(5).on('value', snap => {
        const labels = [], kgs = [];
        snap.forEach(c => { labels.push(c.val().data); kgs.push(c.val().kg); });
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Squat kg', data: kgs, borderColor: '#00f2ff', tension: 0.4 }] }
        });
    });
}

window.generatePDFReport = async function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const name = document.getElementById('user-display-name').innerText;
    // Background e header
    doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(0, 242, 255); doc.setFontSize(22);
    doc.text("OLYMPUS AI - PROGRESS REPORT", 20, 30);
    doc.text(`Atleta: ${name}`, 20, 50);
    // Aggiungi grafico
    const canvas = document.getElementById('performanceChart');
    if (canvas) doc.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 60, 170, 80);
    // Aggiungi bio-status (usa html2canvas per capture)
    const bioElem = document.querySelector('.bio-container');
    if (bioElem) {
        const bioCanvas = await html2canvas(bioElem);
        doc.addImage(bioCanvas.toDataURL('image/png'), 'PNG', 20, 150, 170, 50);
    }
    // Footer
    doc.setFontSize(10); doc.setTextColor(136, 136, 136);
    doc.text("Generato da Olympus AI - Confidential", 20, 280);
    doc.save(`Report_${name}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// --- 7. UTILS E LISTENERS ---
function playBeep(f, d) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);
    osc.frequency.value = f; g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start(); osc.stop(audioCtx.currentTime + d);
}

function syncProfile() {
    db.ref('atleti/' + currentUserId).on('value', snap => {
        const d = snap.val();
        if (!d) return;
        document.getElementById('val-squat').innerText = d.massimali?.squat || 0;
        document.getElementById('val-dead').innerText = d.massimali?.deadlift || 0;
        // document.getElementById('health-status').innerText = `Status: ${d.salute || 'OK'}`; // Commentato: aggiungi ID in HTML se serve
    });
}

function generateUserQR(id) {
    const container = document.getElementById('my-qr-code');
    if (container) container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${id}" style="border:2px solid #00f2ff; border-radius:10px;">`;
}

window.onload = () => {
    startLiveClock();
    if (localStorage.getItem('olympus_legal_accepted') === 'true') {
        document.getElementById('legal-modal').style.display = 'none';
    }
    lucide.createIcons();
    // Cleanup interval on unload
    window.onbeforeunload = () => {
        clearInterval(countdownInterval);
        // Altri clear se necessari
    };
};

window.acceptLegal = () => {
    localStorage.setItem('olympus_legal_accepted', 'true');
    document.getElementById('legal-modal').style.display = 'none';
};