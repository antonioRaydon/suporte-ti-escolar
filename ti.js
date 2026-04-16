import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";

// 1. SUA CONFIGURAÇÃO (Não altere estas chaves)
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

// 3. ESCUTAR NUVEM EM TEMPO REAL
onSnapshot(query(chamadosRef, orderBy("timestamp", "desc")), (snapshot) => {
    const dados = [];
    snapshot.forEach((doc) => dados.push({ id: doc.id, ...doc.data() }));
    renderizar(dados);
});

// 4. FUNÇÃO ENVIAR (O que estava travado)
formChamado.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Tentando enviar...");

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
        alert("✅ Enviado com sucesso!");
    } catch (error) {
        console.error("Erro:", error);
        alert("❌ Erro ao enviar. Verifique as regras do Firebase.");
    }
});

// 5. FUNÇÕES GLOBAIS (Para os botões do ADM funcionarem)
window.marcarResolvido = async (id) => {
    const solucao = document.getElementById(`solucao-${id}`).value;
    if (!solucao) return alert("Digite a solução!");
    await updateDoc(doc(db, "chamados", id), { status: 'Resolvido', solucao: solucao });
};

window.excluirChamado = async (id) => {
    if (confirm("Excluir chamado?")) await deleteDoc(doc(db, "chamados", id));
};

// 6. NAVEGAÇÃO
btnProfessor.onclick = () => switchView('professor');
btnAdm.onclick = () => {
    if (prompt("Senha:") === "123") switchView('adm');
};

function switchView(v) {
    views.professor.classList.toggle('hidden', v !== 'professor');
    views.adm.classList.toggle('hidden', v !== 'adm');
}

// 7. DESENHAR NA TELA
function renderizar(dados) {
    listaChamados.innerHTML = '';
    dados.forEach(c => {
        const div = document.createElement('div');
        div.className = `chamado-card urgencia-${c.urgencia} ${c.status === 'Resolvido' ? 'status-resolvido' : ''}`;
        div.innerHTML = `
            <p><strong>${c.professor}</strong> - ${c.local} (${c.data})</p>
            <p>${c.descricao}</p>
            ${c.status === 'Pendente' ? `
                <input type="text" id="solucao-${c.id}" placeholder="Solução...">
                <button onclick="marcarResolvido('${c.id}')">Resolver</button>
            ` : `<p>✅ ${c.solucao}</p>`}
            <button onclick="excluirChamado('${c.id}')" style="color:red">Excluir</button>
        `;
        listaChamados.appendChild(div);
    });
    
    document.getElementById('dash-pendentes').innerText = dados.filter(d => d.status === 'Pendente').length;
    document.getElementById('dash-media').innerText = dados.filter(d => d.status === 'Resolvido').length;
}