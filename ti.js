import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";

// 1. CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDaRt0Pshh3cwn_7nRopxS0ffAVaA7Ixqw",
    authDomain: "suporte-ti-54cfc.firebaseapp.com",
    projectId: "suporte-ti-54cfc",
    storageBucket: "suporte-ti-54cfc.firebasestorage.app",
    messagingSenderId: "923858106987",
    appId: "1:923858106987:web:dc68b1b02a947320c68f2e",
    measurementId: "G-NJ0L3B9JPE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const chamadosRef = collection(db, "chamados");

// 2. SELETORES
const views = {
    professor: document.getElementById('view-professor'),
    adm: document.getElementById('view-adm')
};
const btnProfessor = document.getElementById('btn-professor');
const btnAdm = document.getElementById('btn-adm');
const formChamado = document.getElementById('form-chamado');
const listaChamados = document.getElementById('lista-chamados');

// 3. ESCUTAR DADOS EM TEMPO REAL (MÁGICA DA NUVEM)
onSnapshot(query(chamadosRef, orderBy("timestamp", "desc")), (snapshot) => {
    const chamadosData = [];
    snapshot.forEach((doc) => {
        chamadosData.push({ id: doc.id, ...doc.data() });
    });
    renderizarChamados(chamadosData);
});

// 4. NAVEGAÇÃO
btnProfessor.addEventListener('click', () => switchView('professor'));
btnAdm.addEventListener('click', () => {
    const senha = prompt("Digite a senha técnica:");
    if (senha === "123") switchView('adm');
    else alert("Senha incorreta!");
});

function switchView(viewName) {
    Object.keys(views).forEach(v => views[v].classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    btnProfessor.classList.toggle('active', viewName === 'professor');
    btnAdm.classList.toggle('active', viewName === 'adm');
}

// 5. ENVIAR PARA O FIREBASE
formChamado.addEventListener('submit', async (e) => {
    e.preventDefault();

    const novoChamado = {
        professor: document.getElementById('nome').value,
        local: document.getElementById('local').value,
        urgencia: document.getElementById('urgencia').value,
        descricao: document.getElementById('descricao').value,
        status: 'Pendente',
        solucao: '',
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
    };

    try {
        await addDoc(chamadosRef, novoChamado);
        formChamado.reset();
        showToast("Chamado enviado para a nuvem!", "success");
    } catch (error) {
        showToast("Erro ao enviar!", "danger");
    }
});

// 6. MARCAR COMO RESOLVIDO (NOVO MÉTODO FIREBASE)
window.marcarResolvido = async (id) => {
    const campoSolucao = document.getElementById(`solucao-${id}`);
    const solucaoTexto = campoSolucao.value.trim();

    if (!solucaoTexto) return alert("Descreva a solução!");

    const docRef = doc(db, "chamados", id);
    await updateDoc(docRef, {
        status: 'Resolvido',
        solucao: solucaoTexto
    });
};

// 7. EXCLUIR (NOVO MÉTODO FIREBASE)
window.excluirChamado = async (id) => {
    if (confirm("Excluir permanentemente?")) {
        await deleteDoc(doc(db, "chamados", id));
    }
};

// 8. RENDERIZAR
function renderizarChamados(dados) {
    listaChamados.innerHTML = '';
    
    dados.forEach(c => {
        const card = document.createElement('div');
        card.className = `chamado-card urgencia-${c.urgencia} ${c.status === 'Resolvido' ? 'status-resolvido' : ''}`;
        
        card.innerHTML = `
            <div class="chamado-meta">
                <span><i class="far fa-clock"></i> ${c.data} às ${c.hora}</span>
                <button onclick="window.print()" class="btn-print">Imprimir</button>
            </div>
            <div class="chamado-body">
                <p><strong>Professor:</strong> ${c.professor}</p>
                <p><strong>Local:</strong> ${c.local}</p>
                <p><strong>Descrição:</strong> ${c.descricao}</p>
            </div>
            ${c.status === 'Pendente' ? `
                <div class="area-resolucao">
                    <textarea id="solucao-${c.id}" class="solucao-input" placeholder="Solução..."></textarea>
                    <button onclick="marcarResolvido('${c.id}')" class="btn-done">Finalizar</button>
                    <button onclick="excluirChamado('${c.id}')" class="btn-delete">Excluir</button>
                </div>
            ` : `
                <div class="solucao-finalizada">
                    <p><strong>✅ Solução:</strong> ${c.solucao}</p>
                    <button onclick="excluirChamado('${c.id}')" class="btn-delete" style="width:100%">Excluir do Histórico</button>
                </div>
            `}
        `;
        listaChamados.appendChild(card);
    });

    // Atualiza Dashboard
    document.getElementById('dash-pendentes').innerText = dados.filter(c => c.status === 'Pendente').length;
    document.getElementById('dash-media').innerText = dados.filter(c => c.status === 'Resolvido').length;
}

function showToast(msg, tipo) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.style.background = tipo === 'success' ? '#22c55e' : '#ef4444';
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}