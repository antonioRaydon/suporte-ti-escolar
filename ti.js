/**
 * SISTEMA DE SUPORTE TI ESCOLAR
 * Versão: 2.0 (Com Dashboard, Filtros e Relatórios)
 */

// 1. ESTADO DA APLICAÇÃO
// Recupera os dados salvos ou inicia um array vazio
let chamados = JSON.parse(localStorage.getItem('chamados_escola')) || [];

// 2. SELETORES DE INTERFACE
const views = {
    professor: document.getElementById('view-professor'),
    adm: document.getElementById('view-adm')
};
const btnProfessor = document.getElementById('btn-professor');
const btnAdm = document.getElementById('btn-adm');
const formChamado = document.getElementById('form-chamado');
const listaChamados = document.getElementById('lista-chamados');

// 3. NAVEGAÇÃO ENTRE TELAS
btnProfessor.addEventListener('click', () => switchView('professor'));

btnAdm.addEventListener('click', () => {
    // Senha simples para ambiente escolar
    const senha = prompt("Digite a senha de acesso técnico:");
    if (senha === "123") {
        switchView('adm');
        renderizarChamados();
    } else {
        showToast("Senha incorreta!", "danger");
    }
});

function switchView(viewName) {
    // Alterna visibilidade das seções
    Object.keys(views).forEach(v => views[v].classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    
    // Atualiza botões da nav
    btnProfessor.classList.remove('active');
    btnAdm.classList.remove('active');
    document.getElementById(`btn-${viewName}`).classList.add('active');
}

// 4. LÓGICA DE CRIAÇÃO (PROFESSOR)
formChamado.addEventListener('submit', (e) => {
    e.preventDefault();

    const novoChamado = {
        id: Date.now(), // ID único baseado no timestamp
        professor: document.getElementById('nome').value,
        local: document.getElementById('local').value,
        urgencia: document.getElementById('urgencia').value,
        descricao: document.getElementById('descricao').value,
        status: 'Pendente',
        solucao: '',
        data: new Date().toLocaleDateString('pt-BR'),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    chamados.push(novoChamado);
    salvarDados();
    formChamado.reset();
    showToast("Chamado enviado com sucesso! Aguarde o técnico.", "success");
});

// 5. GESTÃO DE DADOS
function salvarDados() {
    localStorage.setItem('chamados_escola', JSON.stringify(chamados));
    renderizarChamados();
}

function marcarResolvido(id) {
    const campoSolucao = document.getElementById(`solucao-${id}`);
    const solucaoTexto = campoSolucao.value.trim();

    if (solucaoTexto === "") {
        showToast("Por favor, descreva a solução aplicada.", "danger");
        campoSolucao.focus();
        return;
    }

    chamados = chamados.map(c => {
        if (c.id === id) {
            return { ...c, status: 'Resolvido', solucao: solucaoTexto };
        }
        return c;
    });

    salvarDados();
    showToast("Chamado finalizado com sucesso!", "success");
}

function excluirChamado(id) {
    if (confirm("Tem certeza que deseja excluir este registro permanentemente?")) {
        chamados = chamados.filter(c => c.id !== id);
        salvarDados();
        showToast("Registro removido.", "success");
    }
}

// 6. RENDERIZAÇÃO E FILTROS (ADM)
function renderizarChamados() {
    const termoBusca = document.getElementById('search-bar').value.toLowerCase();
    const filtroStatus = document.getElementById('filter-status').value;
    
    listaChamados.innerHTML = '';

    // Filtragem lógica
    const chamadosFiltrados = chamados.filter(c => {
        const correspondeBusca = c.professor.toLowerCase().includes(termoBusca) || 
                                 c.local.toLowerCase().includes(termoBusca) ||
                                 c.descricao.toLowerCase().includes(termoBusca);
        const correspondeStatus = filtroStatus === 'todos' || c.status === filtroStatus;
        return correspondeBusca && correspondeStatus;
    });

    // Ordenação: Pendentes primeiro, depois por ID (mais recentes)
    chamadosFiltrados.sort((a, b) => {
        if (a.status === b.status) return b.id - a.id;
        return a.status === 'Pendente' ? -1 : 1;
    });

    atualizarDashboard();

    if (chamadosFiltrados.length === 0) {
        listaChamados.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">Nenhum chamado encontrado.</p>';
        return;
    }

    chamadosFiltrados.forEach(c => {
        const card = document.createElement('div');
        card.className = `chamado-card urgencia-${c.urgencia} ${c.status === 'Resolvido' ? 'status-resolvido' : ''}`;
        
        card.innerHTML = `
            <div class="chamado-meta">
                <span><i class="far fa-clock"></i> ${c.data} às ${c.hora}</span>
                <button onclick="prepararImpressao(${c.id})" class="btn-print" title="Gerar Relatório PDF">
                    <i class="fas fa-file-pdf"></i> Imprimir
                </button>
            </div>
            
            <div class="chamado-body">
                <p><strong><i class="fas fa-user"></i> Professor:</strong> ${c.professor}</p>
                <p><strong><i class="fas fa-map-marker-alt"></i> Local:</strong> ${c.local}</p>
                <p><strong><i class="fas fa-tag"></i> Urgência:</strong> ${c.urgencia}</p>
                <p class="descricao-box"><strong>Descrição:</strong> ${c.descricao}</p>
            </div>

            ${c.status === 'Pendente' ? `
                <div class="area-resolucao">
                    <textarea id="solucao-${c.id}" class="solucao-input" placeholder="O que foi feito para resolver?"></textarea>
                    <div class="actions">
                        <button onclick="marcarResolvido(${c.id})" class="btn-done">
                            <i class="fas fa-check"></i> Finalizar e Arquivar
                        </button>
                        <button onclick="excluirChamado(${c.id})" class="btn-delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            ` : `
                <div class="solucao-finalizada">
                    <hr>
                    <p><strong><i class="fas fa-tools"></i> Solução Aplicada:</strong> ${c.solucao}</p>
                    <div class="feedback-stars">
                        Avaliação Sugerida: <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                    </div>
                    <button onclick="excluirChamado(${c.id})" class="btn-delete" style="width:100%; margin-top:10px;">Excluir Histórico</button>
                </div>
            `}
        `;
        listaChamados.appendChild(card);
    });
}

// 7. DASHBOARD E ESTATÍSTICAS
function atualizarDashboard() {
    const totalPendentes = chamados.filter(c => c.status === 'Pendente').length;
    const totalResolvidos = chamados.filter(c => c.status === 'Resolvido').length;
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const criadosHoje = chamados.filter(c => c.data === dataHoje).length;

    document.getElementById('dash-pendentes').innerText = totalPendentes;
    document.getElementById('dash-hoje').innerText = criadosHoje;
    document.getElementById('dash-media').innerText = totalResolvidos;
}

// 8. UTILITÁRIOS (TOAST E IMPRESSÃO)
function showToast(mensagem, tipo) {
    const toast = document.getElementById('toast');
    toast.innerText = mensagem;
    toast.style.background = tipo === 'success' ? '#22c55e' : '#ef4444';
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function prepararImpressao(id) {
    // Apenas foca no chamado específico para impressão via CSS
    // O comando window.print() já foi configurado no CSS para ocultar o que não for necessário
    window.print();
}

// INICIALIZAÇÃO AO CARREGAR A PÁGINA
window.onload = () => {
    renderizarChamados();
};