import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDaRt0Pshh3cwn_7nRopxS0ffAVaA7Ixqw",
    authDomain: "suporte-ti-54cfc.firebaseapp.com",
    projectId: "suporte-ti-54cfc",
    storageBucket: "suporte-ti-54cfc.firebasestorage.app",
    messagingSenderId: "923858106987",
    appId: "1:923858106987:web:dc68b1b02a947320c68f2e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const chamadosRef = collection(db, "chamados");

let chart1 = null;

// --- FUNÇÃO DE REDIMENSIONAMENTO (RESOLVE O ERRO DE TAMANHO) ---
const processarImagem = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Largura otimizada para web
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Exporta como JPEG com qualidade 50% para ficar bem leve
                const base64 = canvas.toDataURL('image/jpeg', 0.5);
                
                // Validação de segurança (Firestore aceita até 1MB)
                if (base64.length > 1048487) {
                    reject("A imagem ainda é muito pesada. Tente outra.");
                } else {
                    resolve(base64);
                }
            };
        };
        reader.onerror = error => reject(error);
    });
};

// --- NAVEGAÇÃO E LOGIN ---
document.addEventListener('DOMContentLoaded', () => {
    const btnAdm = document.getElementById('btn-adm');
    const btnProfessor = document.getElementById('btn-professor');
    const modalLogin = document.getElementById('modal-login');
    const btnEntrarLogin = document.getElementById('btn-entrar-login');
    const btnCancelarLogin = document.getElementById('btn-cancelar-login');

    if (btnAdm) {
        btnAdm.onclick = (e) => {
            e.preventDefault();
            modalLogin.classList.remove('hidden');
        };
    }

    if (btnCancelarLogin) {
        btnCancelarLogin.onclick = () => modalLogin.classList.add('hidden');
    }

    if (btnEntrarLogin) {
        btnEntrarLogin.onclick = () => {
            const senha = document.getElementById('senha-login').value;
            if (senha === "123") {
                modalLogin.classList.add('hidden');
                switchView('adm');
            } else {
                alert("Senha incorreta!");
            }
        };
    }

    if (btnProfessor) {
        btnProfessor.onclick = () => switchView('professor');
    }
});

function switchView(v) {
    document.getElementById('view-professor').classList.toggle('hidden', v !== 'professor');
    document.getElementById('view-adm').classList.toggle('hidden', v !== 'adm');
    document.getElementById('btn-professor').classList.toggle('active', v === 'professor');
    document.getElementById('btn-adm').classList.toggle('active', v === 'adm');
}

// --- ENVIO DE CHAMADO (CORRIGIDO) ---
document.getElementById('form-chamado').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "Processando...";

    try {
        let fotoBase64 = "";
        const file = document.getElementById('anexo').files[0];

        if (file) {
            try {
                fotoBase64 = await processarImagem(file);
            } catch (imgErr) {
                alert("⚠️ " + imgErr);
                btn.disabled = false;
                btn.innerText = "Enviar Chamado";
                return;
            }
        }

        const novo = {
            professor: document.getElementById('nome').value,
            local: document.getElementById('local').value,
            urgencia: document.getElementById('urgencia').value,
            descricao: document.getElementById('descricao').value,
            status: 'Pendente',
            solucao: '',
            foto: fotoBase64,
            timestamp: Date.now(),
            data: new Date().toLocaleDateString('pt-BR')
        };

        await addDoc(chamadosRef, novo);
        e.target.reset();
        alert("✅ Chamado Enviado!");
    } catch (error) {
        console.error("Erro ao enviar:", error);
        alert("❌ Falha no banco de dados. Verifique sua conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Enviar Chamado";
    }
};

// --- LISTAGEM E GRÁFICOS ---
onSnapshot(query(chamadosRef, orderBy("timestamp", "desc")), (snap) => {
    const dados = [];
    snap.forEach(doc => dados.push({ id: doc.id, ...doc.data() }));
    renderizar(dados);
    atualizarGraficos(dados);
});

function renderizar(lista) {
    const container = document.getElementById('lista-chamados');
    if (!container) return;
    container.innerHTML = '';
    
    lista.forEach(c => {
        const div = document.createElement('div');
        div.className = `chamado-card urgencia-${c.urgencia} ${c.status === 'Resolvido' ? 'status-resolvido' : ''}`;
        
        // Texto para descrição limpa (sem Base64 caso apareça)
        const descricaoCurta = c.descricao.length > 100 ? c.descricao.substring(0, 100) + '...' : c.descricao;

        div.innerHTML = `
            <div class="chamado-header">
                <strong>${c.professor}</strong> | ${c.local} <br>
                <small>${c.data} - ${c.urgencia}</small>
            </div>
            
            <p style="margin: 10px 0;">${descricaoCurta}</p>
            
            ${c.foto ? `
                <button class="btn-view-photo" onclick="visualizarFoto('${c.id}')">
                    <i class="fas fa-camera"></i> Ver Detalhes e Foto
                </button>
            ` : ''}

            <div id="area-acao-${c.id}" class="area-acao">
                ${c.status === 'Pendente' ? `
                    <input type="text" id="sol-${c.id}" placeholder="Solução técnica..." style="width:70%; padding:5px;">
                    <button class="btn-done" onclick="resolver('${c.id}')">Resolver</button>
                ` : `<p style="color:var(--success); margin-top:10px;">✅ <strong>Solução:</strong> ${c.solucao}</p>`}
            </div>
            <button onclick="excluir('${c.id}')" style="color:red; background:none; border:none; float:right; cursor:pointer; margin-top:-20px"><i class="fas fa-trash"></i></button>
        `;
        
        // Salva os dados completos no elemento para usar na visualização
        if(c.foto) {
            div.dataset.foto = c.foto;
            div.dataset.descricao = c.descricao;
        }
        
        container.appendChild(div);
    });
}

function atualizarGraficos(dados) {
    const canvas = document.getElementById('chartStatus');
    if(!canvas) return;
    
    const p = dados.filter(d => d.status === 'Pendente').length;
    const r = dados.filter(d => d.status === 'Resolvido').length;

    if (chart1) chart1.destroy();
    chart1 = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: ['Pendentes', 'Resolvidos'],
            datasets: [{ data: [p, r], backgroundColor: ['#ef4444', '#22c55e'] }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// --- FUNÇÕES GLOBAIS ---
window.resolver = async (id) => {
    const sol = document.getElementById(`sol-${id}`).value;
    if(!sol) return alert("Digite a solução!");
    await updateDoc(doc(db, "chamados", id), { status: 'Resolvido', solucao: sol });
};

window.excluir = async (id) => {
    if(confirm("Excluir chamado?")) await deleteDoc(doc(db, "chamados", id));
};

const btnImp = document.getElementById('btn-imprimir');
if(btnImp) btnImp.onclick = () => window.print();

// Função que abre o modal com a foto e descrição
window.visualizarFoto = (id) => {
    // Encontra o card que contém o botão clicado
    const areaAcao = document.getElementById(`area-acao-${id}`);
    const card = areaAcao.closest('.chamado-card');
    
    // Recupera os dados salvos no dataset do card
    const foto = card.dataset.foto;
    const descricao = card.dataset.descricao;
    
    // Preenche o modal
    document.getElementById('img-ampliada').src = foto;
    document.getElementById('desc-ampliada').innerText = descricao;
    
    // Mostra o modal
    const modal = document.getElementById('modal-foto');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

// Função para fechar o modal ao clicar fora do conteúdo
window.fecharModalFoto = (event) => {
    const modal = document.getElementById('modal-foto');
    const content = document.querySelector('.modal-foto-content');
    
    // Se clicou no fundo escuro (modal) e não no conteúdo, fecha
    if (event.target === modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};