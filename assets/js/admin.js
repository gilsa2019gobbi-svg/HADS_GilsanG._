
document.addEventListener("DOMContentLoaded", async () => {

    // INICIO - CONFIGURACOES

    const API = "";

    const aviso = document.getElementById("admin-aviso");
    const area = document.getElementById("admin-area");
    const nomeAdmin = document.getElementById("nome-admin");
    const botaoSair = document.getElementById("admin-sair");

    // INICIO - ELEMENTOS DOS BARBEIROS

    const tabelaBarbeiros = document.getElementById("tabela-barbeiros");
    const avisoBarbeiros = document.getElementById("aviso-barbeiros");
    const botaoNovoBarbeiro = document.getElementById("btn-novo-barbeiro");
    const formularioBarbeiro = document.getElementById("form-barbeiro");
    const tituloModalBarbeiro = document.getElementById("titulo-modal-barbeiro");

    const campoBarbeiroId = document.getElementById("barbeiro-id");
    const campoBarbeiroNome = document.getElementById("barbeiro-nome");
    const campoBarbeiroWhatsapp = document.getElementById("barbeiro-whatsapp");
    const campoBarbeiroEspecialidade = document.getElementById("barbeiro-especialidade");

    const erroFormularioBarbeiro = document.getElementById("erro-form-barbeiro");
    const botaoSalvarBarbeiro = document.getElementById("btn-salvar-barbeiro");
    const elementoModalBarbeiro = document.getElementById("modal-barbeiro");

    const modalBarbeiro = elementoModalBarbeiro
        ? bootstrap.Modal.getOrCreateInstance(elementoModalBarbeiro)
        : null;

    // FIM - ELEMENTOS DOS BARBEIROS

    // INICIO - ELEMENTOS DOS SERVICOS

    const tabelaServicos = document.getElementById("tabela-servicos");
    const avisoServicos = document.getElementById("aviso-servicos");
    const botaoNovoServico = document.getElementById("btn-novo-servico");
    const formularioServico = document.getElementById("form-servico");
    const tituloModalServico = document.getElementById("titulo-modal-servico");

    const campoServicoId = document.getElementById("servico-id");
    const campoServicoNome = document.getElementById("servico-nome");
    const campoServicoDescricao = document.getElementById("servico-descricao");
    const campoServicoPreco = document.getElementById("servico-preco");
    const campoServicoDuracao = document.getElementById("servico-duracao");

    const erroFormularioServico = document.getElementById("erro-form-servico");
    const botaoSalvarServico = document.getElementById("btn-salvar-servico");
    const elementoModalServico = document.getElementById("modal-servico");

    const modalServico = elementoModalServico
        ? bootstrap.Modal.getOrCreateInstance(elementoModalServico)
        : null;

    // FIM - ELEMENTOS DOS SERVICOS

    // INICIO - ELEMENTOS DAS MENSAGENS

    const tabelaMensagens = document.getElementById("tabela-mensagens");
    const filtroMensagens = document.getElementById("filtro-mensagens");
    const avisoMensagens = document.getElementById("aviso-mensagens");

    let mensagensAtuais = [];

    // FIM - ELEMENTOS DAS MENSAGENS

    // FIM - CONFIGURACOES


    // INICIO - REQUISICOES PARA API

    async function requisitar(caminho, opcoes = {}) {

        const resposta = await fetch(`${API}${caminho}`, {
            ...opcoes,
            credentials: "include",
            headers: {
                ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
                ...(opcoes.headers || {})
            }
        });

        const tipo = resposta.headers.get("content-type") || "";

        if (!tipo.includes("application/json")) {
            throw new Error(
                `Resposta inesperada do servidor (HTTP ${resposta.status}).`
            );
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao consultar o servidor."
            );
        }

        return dados;
    }

    // FIM - REQUISICOES PARA API


    // INICIO - NAVEGACAO DO PAINEL

    document.querySelectorAll("#menu-admin [data-secao]")
        .forEach(link => {

            link.addEventListener("click", evento => {

                evento.preventDefault();

                const secao = link.dataset.secao;

                document.querySelectorAll(".painel-secao")
                    .forEach(elemento => {
                        elemento.classList.remove("ativa");
                    });

                document.getElementById(secao)?.classList.add("ativa");

                document.querySelectorAll("#menu-admin [data-secao]")
                    .forEach(item => {
                        item.classList.remove("active");
                    });

                link.classList.add("active");
            });
        });

    // FIM - NAVEGACAO DO PAINEL


    // INICIO - FUNCOES AUXILIARES

    function formatarData(data) {

        if (!data) return "-";

        const valor = new Date(data);

        if (Number.isNaN(valor.getTime())) return "-";

        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(valor);
    }

    function formatarPreco(preco) {

        if (
            preco === null ||
            preco === undefined ||
            preco === ""
        ) {
            return "-";
        }

        const valor = Number(preco);

        if (!Number.isFinite(valor)) return "-";

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(valor);
    }

    function criarCelula(valor) {

        const celula = document.createElement("td");
        celula.textContent = valor ?? "-";

        return celula;
    }

    function criarStatusAtivo(ativo) {

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = ativo
            ? "badge bg-success"
            : "badge bg-secondary";

        etiqueta.textContent = ativo
            ? "Ativo"
            : "Inativo";

        celula.appendChild(etiqueta);

        return celula;
    }

    function mostrarAviso(elemento, mensagem, tipo = "success") {

        if (!elemento) return;

        elemento.textContent = mensagem;
        elemento.className = `alert alert-${tipo} mt-3`;
    }

    function limparAviso(elemento) {

        if (!elemento) return;

        elemento.textContent = "";
        elemento.className = "d-none";
    }

    function mostrarErroFormulario(elemento, mensagem) {

        if (!elemento) return;

        elemento.textContent = mensagem;
        elemento.classList.remove("d-none");
    }

    function limparErroFormulario(elemento) {

        if (!elemento) return;

        elemento.textContent = "";
        elemento.classList.add("d-none");
    }

    function preencherTabela(id, registros, colunas) {

        const tabela = document.getElementById(id);

        if (!tabela) return;

        tabela.replaceChildren();

        if (!Array.isArray(registros) || registros.length === 0) {

            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhum registro encontrado.");

            celula.colSpan = colunas.length;
            celula.className = "text-center";

            linha.appendChild(celula);
            tabela.appendChild(linha);

            return;
        }

        registros.forEach(registro => {

            const linha = document.createElement("tr");

            colunas.forEach(coluna => {
                linha.appendChild(
                    criarCelula(registro[coluna])
                );
            });

            tabela.appendChild(linha);
        });
    }

    function exibirErroTabela(id, quantidadeColunas) {

        const tabela = document.getElementById(id);

        if (!tabela) return;

        tabela.replaceChildren();

        const linha = document.createElement("tr");
        const celula = criarCelula("Não foi possível carregar os dados.");

        celula.colSpan = quantidadeColunas;
        celula.className = "text-center text-danger";

        linha.appendChild(celula);
        tabela.appendChild(linha);
    }

    // FIM - FUNCOES AUXILIARES


    // INICIO - AGENDAMENTOS

    function criarStatusAgendamento(status) {

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");
        const valor = String(status || "").toLowerCase();

        etiqueta.classList.add("badge");

        if (valor === "agendado") {

            etiqueta.classList.add("bg-success");
            etiqueta.textContent = "Agendado";

        } else if (valor === "cancelado") {

            etiqueta.classList.add("bg-secondary");
            etiqueta.textContent = "Cancelado";

        } else if (
            valor === "concluido" ||
            valor === "concluído"
        ) {

            etiqueta.classList.add("bg-primary");
            etiqueta.textContent = "Concluído";

        } else {

            etiqueta.classList.add("bg-warning", "text-dark");
            etiqueta.textContent = status || "Desconhecido";
        }

        celula.appendChild(etiqueta);

        return celula;
    }

    function podeCancelar(agendamento) {

        const data = new Date(agendamento.data_hora);

        return (
            agendamento.status === "agendado" &&
            !Number.isNaN(data.getTime()) &&
            data.getTime() > Date.now()
        );
    }

    async function cancelarAgendamento(id, botao) {

        const confirmado = window.confirm(
            `Deseja realmente cancelar o agendamento nº ${id}?`
        );

        if (!confirmado) return;

        botao.disabled = true;
        botao.textContent = "Cancelando...";

        try {

            await requisitar(
                `/api/admin/agendamentos/${id}/cancelar`,
                {
                    method: "PATCH"
                }
            );

            alert("Agendamento cancelado com sucesso!");

            await carregarAgendamentos();

        } catch (erro) {

            alert(erro.message);

            botao.disabled = false;
            botao.textContent = "Cancelar";
        }
    }

    function preencherAgendamentos(registros) {

        const tabela = document.getElementById("tabela-agendamentos");

        if (!tabela) return;

        tabela.replaceChildren();

        if (!Array.isArray(registros) || registros.length === 0) {

            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhum agendamento encontrado.");

            celula.colSpan = 7;
            celula.className = "text-center";

            linha.appendChild(celula);
            tabela.appendChild(linha);

            return;
        }

        registros.forEach(agendamento => {

            const linha = document.createElement("tr");

            linha.appendChild(criarCelula(agendamento.id));
            linha.appendChild(criarCelula(agendamento.cliente));
            linha.appendChild(criarCelula(agendamento.barbeiro));
            linha.appendChild(criarCelula(agendamento.servico));

            linha.appendChild(
                criarCelula(
                    formatarData(agendamento.data_hora)
                )
            );

            linha.appendChild(
                criarStatusAgendamento(agendamento.status)
            );

            const celulaAcoes = document.createElement("td");

            if (podeCancelar(agendamento)) {

                const botao = document.createElement("button");

                botao.type = "button";
                botao.className = "btn btn-sm btn-outline-danger";
                botao.textContent = "Cancelar";

                botao.addEventListener("click", () => {
                    cancelarAgendamento(agendamento.id, botao);
                });

                celulaAcoes.appendChild(botao);

            } else {

                celulaAcoes.textContent = "-";
            }

            linha.appendChild(celulaAcoes);
            tabela.appendChild(linha);
        });
    }

    async function carregarAgendamentos() {

        const dados = await requisitar("/api/admin/agendamentos");
        const registros = dados.agendamentos || [];

        preencherAgendamentos(registros);
        atualizarDashboardAgendamentos(registros);

        const contador = document.getElementById("total-agendamentos");

        if (contador) {
            contador.textContent = registros.length;
        }
    }


// INICIO - INDICADORES DE AGENDAMENTOS

function atualizarDashboardAgendamentos(registros) {
    const agora = new Date();

    function dataLocal(data) {
        const partes = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(data);

        const valores = Object.fromEntries(
            partes.map(parte => [parte.type, parte.value])
        );

        return `${valores.year}-${valores.month}-${valores.day}`;
    }

    const hoje = dataLocal(agora);

    const agendamentosValidos = registros.filter(agendamento => {
        const data = new Date(agendamento.data_hora);

        return (
            agendamento.status === "agendado" &&
            !Number.isNaN(data.getTime())
        );
    });

    const agendamentosHoje = agendamentosValidos.filter(
        agendamento => dataLocal(new Date(agendamento.data_hora)) === hoje
    );

    const proximos = agendamentosValidos
        .filter(agendamento => {
            return new Date(agendamento.data_hora) > agora;
        })
        .sort((a, b) => {
            return new Date(a.data_hora) - new Date(b.data_hora);
        });

    const contadorHoje = document.getElementById("agendamentos-hoje");
    const contadorProximos = document.getElementById("proximos-agendamentos");
    const tabela = document.getElementById("tabela-proximos-agendamentos");

    if (contadorHoje) {
        contadorHoje.textContent = agendamentosHoje.length;
    }

    if (contadorProximos) {
        contadorProximos.textContent = proximos.length;
    }

    if (!tabela) return;

    tabela.replaceChildren();

    if (proximos.length === 0) {
        const linha = document.createElement("tr");
        const celula = criarCelula("Nenhum atendimento futuro encontrado.");

        celula.colSpan = 4;
        celula.className = "text-center";

        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    proximos.slice(0, 5).forEach(agendamento => {
        const linha = document.createElement("tr");

        linha.appendChild(criarCelula(agendamento.cliente));
        linha.appendChild(criarCelula(agendamento.barbeiro));
        linha.appendChild(criarCelula(agendamento.servico));
        linha.appendChild(criarCelula(formatarData(agendamento.data_hora)));

        tabela.appendChild(linha);
    });
}

// FIM - INDICADORES DE AGENDAMENTOS


    // FIM - AGENDAMENTOS







    // INICIO - BARBEIROS

    function limparFormularioBarbeiro() {

        if (!formularioBarbeiro) return;

        formularioBarbeiro.reset();

        campoBarbeiroId.value = "";
        tituloModalBarbeiro.textContent = "Novo Barbeiro";
        botaoSalvarBarbeiro.textContent = "Salvar Barbeiro";

        limparErroFormulario(erroFormularioBarbeiro);
    }

    botaoNovoBarbeiro?.addEventListener("click", () => {

        limparFormularioBarbeiro();
        limparAviso(avisoBarbeiros);
    });

    function editarBarbeiro(barbeiro) {

        limparErroFormulario(erroFormularioBarbeiro);

        campoBarbeiroId.value = barbeiro.id;
        campoBarbeiroNome.value = barbeiro.nome || "";
        campoBarbeiroWhatsapp.value = barbeiro.whatsapp || "";
        campoBarbeiroEspecialidade.value = barbeiro.especialidade || "";

        tituloModalBarbeiro.textContent = "Editar Barbeiro";
        botaoSalvarBarbeiro.textContent = "Salvar Alterações";

        modalBarbeiro?.show();
    }

    async function alterarStatusBarbeiro(barbeiro, botao) {

        const novoStatus = !barbeiro.ativo;
        const acao = novoStatus ? "ativar" : "desativar";

        const confirmado = window.confirm(
            `Deseja realmente ${acao} o barbeiro ${barbeiro.nome}?`
        );

        if (!confirmado) return;

        botao.disabled = true;

        try {

            const resultado = await requisitar(
                `/api/admin/barbeiros/${barbeiro.id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        ativo: novoStatus
                    })
                }
            );

            await carregarBarbeiros();

            mostrarAviso(
                avisoBarbeiros,
                resultado.mensagem
            );

        } catch (erro) {

            mostrarAviso(
                avisoBarbeiros,
                erro.message,
                "danger"
            );

            botao.disabled = false;
        }
    }

    function preencherBarbeiros(registros) {

        if (!tabelaBarbeiros) return;

        tabelaBarbeiros.replaceChildren();

        if (!Array.isArray(registros) || registros.length === 0) {

            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhum barbeiro encontrado.");

            celula.colSpan = 6;
            celula.className = "text-center";

            linha.appendChild(celula);
            tabelaBarbeiros.appendChild(linha);

            return;
        }

        registros.forEach(barbeiro => {

            const linha = document.createElement("tr");

            linha.appendChild(criarCelula(barbeiro.id));
            linha.appendChild(criarCelula(barbeiro.nome));
            linha.appendChild(criarCelula(barbeiro.whatsapp || "-"));
            linha.appendChild(criarCelula(barbeiro.especialidade || "-"));
            linha.appendChild(criarStatusAtivo(barbeiro.ativo));

            const celulaAcoes = document.createElement("td");
            celulaAcoes.className = "text-nowrap";

            const botaoEditar = document.createElement("button");

            botaoEditar.type = "button";
            botaoEditar.className = "btn btn-sm btn-outline-primary me-2";
            botaoEditar.textContent = "Editar";

            botaoEditar.addEventListener("click", () => {
                editarBarbeiro(barbeiro);
            });

            const botaoStatus = document.createElement("button");

            botaoStatus.type = "button";

            botaoStatus.className = barbeiro.ativo
                ? "btn btn-sm btn-outline-danger"
                : "btn btn-sm btn-outline-success";

            botaoStatus.textContent = barbeiro.ativo
                ? "Desativar"
                : "Ativar";

            botaoStatus.addEventListener("click", () => {
                alterarStatusBarbeiro(barbeiro, botaoStatus);
            });

            celulaAcoes.appendChild(botaoEditar);
            celulaAcoes.appendChild(botaoStatus);

            linha.appendChild(celulaAcoes);
            tabelaBarbeiros.appendChild(linha);
        });
    }

    async function carregarBarbeiros() {

        const dados = await requisitar("/api/admin/barbeiros");
        const registros = dados.barbeiros || [];

        preencherBarbeiros(registros);

// INICIO - CONTAR BARBEIROS ATIVOS

const barbeirosAtivos = registros.filter(
    barbeiro => barbeiro.ativo === true
);

const contadorAtivos = document.getElementById("total-barbeiros-ativos");

if (contadorAtivos) {
    contadorAtivos.textContent = barbeirosAtivos.length;
}

// FIM - CONTAR BARBEIROS ATIVOS


        const contador = document.getElementById("total-barbeiros");

        if (contador) {
            contador.textContent = registros.length;
        }
    }

    formularioBarbeiro?.addEventListener("submit", async evento => {

        evento.preventDefault();

        limparErroFormulario(erroFormularioBarbeiro);

        const id = campoBarbeiroId.value;

        const dados = {
            nome: campoBarbeiroNome.value.trim(),
            whatsapp: campoBarbeiroWhatsapp.value.trim(),
            especialidade: campoBarbeiroEspecialidade.value.trim()
        };

        if (!dados.nome) {

            mostrarErroFormulario(
                erroFormularioBarbeiro,
                "Informe o nome do barbeiro."
            );

            return;
        }

        if (
            dados.nome.length > 150 ||
            dados.whatsapp.length > 20 ||
            dados.especialidade.length > 150
        ) {

            mostrarErroFormulario(
                erroFormularioBarbeiro,
                "Um dos campos ultrapassou o tamanho permitido."
            );

            return;
        }

        botaoSalvarBarbeiro.disabled = true;
        botaoSalvarBarbeiro.textContent = "Salvando...";

        let salvou = false;

        try {

            const resultado = await requisitar(
                id
                    ? `/api/admin/barbeiros/${id}`
                    : "/api/admin/barbeiros",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(dados)
                }
            );

            salvou = true;

            modalBarbeiro?.hide();
            limparFormularioBarbeiro();

            mostrarAviso(
                avisoBarbeiros,
                resultado.mensagem
            );

            await carregarBarbeiros();

        } catch (erro) {

            if (salvou) {

                mostrarAviso(
                    avisoBarbeiros,
                    "Barbeiro salvo, mas não foi possível atualizar a lista.",
                    "warning"
                );

            } else {

                mostrarErroFormulario(
                    erroFormularioBarbeiro,
                    erro.message
                );
            }

        } finally {

            botaoSalvarBarbeiro.disabled = false;

            botaoSalvarBarbeiro.textContent = campoBarbeiroId.value
                ? "Salvar Alterações"
                : "Salvar Barbeiro";
        }
    });

    // FIM - BARBEIROS


    // INICIO - SERVICOS

    function limparFormularioServico() {

        if (!formularioServico) return;

        formularioServico.reset();

        campoServicoId.value = "";
        tituloModalServico.textContent = "Novo Serviço";
        botaoSalvarServico.textContent = "Salvar Serviço";

        limparErroFormulario(erroFormularioServico);
    }

    botaoNovoServico?.addEventListener("click", () => {

        limparFormularioServico();
        limparAviso(avisoServicos);
    });

    function editarServico(servico) {

        limparErroFormulario(erroFormularioServico);

        campoServicoId.value = servico.id;
        campoServicoNome.value = servico.nome || "";
        campoServicoDescricao.value = servico.descricao || "";
        campoServicoPreco.value = servico.preco ?? "";
        campoServicoDuracao.value = servico.duracao_minutos ?? "";

        tituloModalServico.textContent = "Editar Serviço";
        botaoSalvarServico.textContent = "Salvar Alterações";

        modalServico?.show();
    }

    async function alterarStatusServico(servico, botao) {

        const novoStatus = !servico.ativo;
        const acao = novoStatus ? "ativar" : "desativar";

        const confirmado = window.confirm(
            `Deseja realmente ${acao} o serviço ${servico.nome}?`
        );

        if (!confirmado) return;

        botao.disabled = true;

        try {

            const resultado = await requisitar(
                `/api/admin/servicos/${servico.id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        ativo: novoStatus
                    })
                }
            );

            await carregarServicos();

            mostrarAviso(
                avisoServicos,
                resultado.mensagem
            );

        } catch (erro) {

            mostrarAviso(
                avisoServicos,
                erro.message,
                "danger"
            );

            botao.disabled = false;
        }
    }

    function preencherServicos(registros) {

        if (!tabelaServicos) return;

        tabelaServicos.replaceChildren();

        if (!Array.isArray(registros) || registros.length === 0) {

            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhum serviço encontrado.");

            celula.colSpan = 7;
            celula.className = "text-center";

            linha.appendChild(celula);
            tabelaServicos.appendChild(linha);

            return;
        }

        registros.forEach(servico => {

            const linha = document.createElement("tr");

            linha.appendChild(criarCelula(servico.id));
            linha.appendChild(criarCelula(servico.nome));
            linha.appendChild(criarCelula(servico.descricao || "-"));

            linha.appendChild(
                criarCelula(formatarPreco(servico.preco))
            );

            linha.appendChild(
                criarCelula(`${servico.duracao_minutos} min`)
            );

            linha.appendChild(
                criarStatusAtivo(servico.ativo)
            );

            const celulaAcoes = document.createElement("td");
            celulaAcoes.className = "text-nowrap";

            const botaoEditar = document.createElement("button");

            botaoEditar.type = "button";
            botaoEditar.className = "btn btn-sm btn-outline-primary me-2";
            botaoEditar.textContent = "Editar";

            botaoEditar.addEventListener("click", () => {
                editarServico(servico);
            });

            const botaoStatus = document.createElement("button");

            botaoStatus.type = "button";

            botaoStatus.className = servico.ativo
                ? "btn btn-sm btn-outline-danger"
                : "btn btn-sm btn-outline-success";

            botaoStatus.textContent = servico.ativo
                ? "Desativar"
                : "Ativar";

            botaoStatus.addEventListener("click", () => {
                alterarStatusServico(servico, botaoStatus);
            });

            celulaAcoes.appendChild(botaoEditar);
            celulaAcoes.appendChild(botaoStatus);

            linha.appendChild(celulaAcoes);
            tabelaServicos.appendChild(linha);
        });
    }

    async function carregarServicos() {

        const dados = await requisitar("/api/admin/servicos");
        const registros = dados.servicos || [];

        preencherServicos(registros);
    }

    formularioServico?.addEventListener("submit", async evento => {

        evento.preventDefault();

        limparErroFormulario(erroFormularioServico);

        const id = campoServicoId.value;

        const dados = {
            nome: campoServicoNome.value.trim(),
            descricao: campoServicoDescricao.value.trim(),
            preco: campoServicoPreco.value.trim().replace(",", "."),
            duracao_minutos: Number(campoServicoDuracao.value)
        };

        const preco = Number(dados.preco);

        if (!dados.nome || dados.nome.length > 150) {

            mostrarErroFormulario(
                erroFormularioServico,
                "Informe um nome válido (até 150 caracteres)."
            );

            return;
        }

        if (dados.descricao.length > 1000) {

            mostrarErroFormulario(
                erroFormularioServico,
                "A descrição deve ter até 1000 caracteres."
            );

            return;
        }

        if (
            !/^\d+(\.\d{1,2})?$/.test(dados.preco) ||
            !Number.isFinite(preco) ||
            preco <= 0 ||
            preco > 99999.99
        ) {

            mostrarErroFormulario(
                erroFormularioServico,
                "Informe um preço válido, maior que zero."
            );

            return;
        }

        if (
            !Number.isInteger(dados.duracao_minutos) ||
            dados.duracao_minutos < 1 ||
            dados.duracao_minutos > 540
        ) {

            mostrarErroFormulario(
                erroFormularioServico,
                "A duração deve estar entre 1 e 540 minutos."
            );

            return;
        }

        botaoSalvarServico.disabled = true;
        botaoSalvarServico.textContent = "Salvando...";

        let salvou = false;

        try {

            const resultado = await requisitar(
                id
                    ? `/api/admin/servicos/${id}`
                    : "/api/admin/servicos",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(dados)
                }
            );

            salvou = true;

            modalServico?.hide();
            limparFormularioServico();

            mostrarAviso(
                avisoServicos,
                resultado.mensagem
            );

            await carregarServicos();

        } catch (erro) {

            if (salvou) {

                mostrarAviso(
                    avisoServicos,
                    "Serviço salvo, mas não foi possível atualizar a lista.",
                    "warning"
                );

            } else {

                mostrarErroFormulario(
                    erroFormularioServico,
                    erro.message
                );
            }

        } finally {

            botaoSalvarServico.disabled = false;

            botaoSalvarServico.textContent = campoServicoId.value
                ? "Salvar Alterações"
                : "Salvar Serviço";
        }
    });

    // FIM - SERVICOS


    // INICIO - MENSAGENS

    function textoStatusMensagem(status) {

        const rotulos = {
            nao_lida: "Não lida",
            lida: "Lida",
            respondida: "Respondida"
        };

        return rotulos[status] || status || "Desconhecido";
    }

    function criarStatusMensagem(status) {

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");

        const classes = {
            nao_lida: "badge bg-warning text-dark",
            lida: "badge bg-primary",
            respondida: "badge bg-success"
        };

        etiqueta.className = classes[status] || "badge bg-secondary";
        etiqueta.textContent = textoStatusMensagem(status);

        celula.appendChild(etiqueta);

        return celula;
    }

    async function alterarStatusMensagem(mensagem, status, botao) {

        botao.disabled = true;

        try {

            const resultado = await requisitar(
                `/api/admin/mensagens/${mensagem.id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: status
                    })
                }
            );

            await carregarMensagens();

            mostrarAviso(
                avisoMensagens,
                resultado.mensagem
            );

        } catch (erro) {

            mostrarAviso(
                avisoMensagens,
                erro.message,
                "danger"
            );

            botao.disabled = false;
        }
    }

    function criarBotaoMensagem(rotulo, classe, mensagem, status) {

        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = `btn btn-sm ${classe} me-2 mb-1`;
        botao.textContent = rotulo;

        botao.addEventListener("click", () => {
            alterarStatusMensagem(mensagem, status, botao);
        });

        return botao;
    }

    function preencherMensagens() {

        if (!tabelaMensagens) return;

        tabelaMensagens.replaceChildren();

        const filtro = filtroMensagens?.value || "todos";

        const registros = filtro === "todos"
            ? mensagensAtuais
            : mensagensAtuais.filter(
                mensagem => mensagem.status === filtro
            );

        if (registros.length === 0) {

            const linha = document.createElement("tr");
            const celula = criarCelula("Nenhuma mensagem encontrada.");

            celula.colSpan = 7;
            celula.className = "text-center";

            linha.appendChild(celula);
            tabelaMensagens.appendChild(linha);

            return;
        }

        registros.forEach(mensagem => {

            const linha = document.createElement("tr");

            linha.appendChild(criarCelula(mensagem.id));
            linha.appendChild(criarCelula(mensagem.nome));
            linha.appendChild(criarCelula(mensagem.email));
            linha.appendChild(criarCelula(mensagem.assunto));

            const celulaMensagem = criarCelula(mensagem.mensagem);

            celulaMensagem.classList.add("text-break");
            linha.appendChild(celulaMensagem);

            linha.appendChild(
                criarStatusMensagem(mensagem.status)
            );

            const celulaAcoes = document.createElement("td");
            celulaAcoes.className = "text-nowrap";

            if (mensagem.status === "nao_lida") {

                celulaAcoes.appendChild(
                    criarBotaoMensagem(
                        "Marcar como lida",
                        "btn-outline-primary",
                        mensagem,
                        "lida"
                    )
                );
            }

            if (mensagem.status !== "respondida") {

                celulaAcoes.appendChild(
                    criarBotaoMensagem(
                        "Marcar como respondida",
                        "btn-outline-success",
                        mensagem,
                        "respondida"
                    )
                );
            }

            if (mensagem.status === "respondida") {

                celulaAcoes.appendChild(
                    criarBotaoMensagem(
                        "Marcar como não lida",
                        "btn-outline-secondary",
                        mensagem,
                        "nao_lida"
                    )
                );
            }

            linha.appendChild(celulaAcoes);
            tabelaMensagens.appendChild(linha);
        });
    }

    async function carregarMensagens() {

        const dados = await requisitar("/api/admin/mensagens");

        mensagensAtuais = Array.isArray(dados.mensagens)
            ? dados.mensagens
            : [];

        preencherMensagens();

        
// INICIO - CONTAR MENSAGENS NAO LIDAS

const mensagensNaoLidas = mensagensAtuais.filter(
    mensagem => mensagem.status === "nao_lida"
);

const contadorNaoLidas = document.getElementById("total-mensagens-nao-lidas");

if (contadorNaoLidas) {
    contadorNaoLidas.textContent = mensagensNaoLidas.length;
}

// FIM - CONTAR MENSAGENS NAO LIDAS


        const contador = document.getElementById("total-mensagens");

        if (contador) {
            contador.textContent = mensagensAtuais.length;
        }
    }

    filtroMensagens?.addEventListener("change", preencherMensagens);

    // FIM - MENSAGENS


    // INICIO - CARREGAR DADOS DO PAINEL

    async function carregarDados() {

        try {

            await carregarAgendamentos();

        } catch (erro) {

            console.error(
                "Erro ao carregar agendamentos:",
                erro.message
            );

            exibirErroTabela("tabela-agendamentos", 7);
        }

        try {

            await carregarBarbeiros();

        } catch (erro) {

            console.error(
                "Erro ao carregar barbeiros:",
                erro.message
            );

            exibirErroTabela("tabela-barbeiros", 6);

            mostrarAviso(
                avisoBarbeiros,
                "Não foi possível carregar os barbeiros.",
                "danger"
            );
        }

        try {

            await carregarServicos();

        } catch (erro) {

            console.error(
                "Erro ao carregar serviços:",
                erro.message
            );

            exibirErroTabela("tabela-servicos", 7);

            mostrarAviso(
                avisoServicos,
                "Não foi possível carregar os serviços.",
                "danger"
            );
        }

        try {

            await carregarMensagens();

        } catch (erro) {

            console.error(
                "Erro ao carregar mensagens:",
                erro.message
            );

            exibirErroTabela("tabela-mensagens", 7);

            mostrarAviso(
                avisoMensagens,
                "Não foi possível carregar as mensagens.",
                "danger"
            );
        }

        const secoes = [
            {
                rota: "/api/admin/clientes",
                chave: "clientes",
                tabela: "tabela-clientes",
                colunas: [
                    "id",
                    "nome",
                    "email",
                    "whatsapp"
                ],
                contador: "total-clientes"
            }
        ];

        for (const secao of secoes) {

            try {

                const dados = await requisitar(secao.rota);
                const registros = dados[secao.chave] || [];

                preencherTabela(
                    secao.tabela,
                    registros,
                    secao.colunas
                );

                if (secao.contador) {

                    const contador = document.getElementById(
                        secao.contador
                    );

                    if (contador) {
                        contador.textContent = registros.length;
                    }
                }

            } catch (erro) {

                console.error(
                    `Erro ao carregar ${secao.chave}:`,
                    erro.message
                );

                exibirErroTabela(
                    secao.tabela,
                    secao.colunas.length
                );
            }
        }
    }

    // FIM - CARREGAR DADOS DO PAINEL


    // INICIO - SAIR DA CONTA

    botaoSair?.addEventListener("click", async evento => {

        evento.preventDefault();

        try {

            await requisitar("/api/logout", {
                method: "POST"
            });

            window.location.href = "index.html";

        } catch (erro) {

            alert("Não foi possível sair da conta.");
        }
    });

    // FIM - SAIR DA CONTA


    // INICIO - VERIFICAR ADMINISTRADOR

    try {

        await requisitar("/api/admin/verificar");

        const dadosUsuario = await requisitar("/api/me");

        if (nomeAdmin) {
            nomeAdmin.textContent =
                dadosUsuario.usuario?.nome || "Administrador";
        }

        aviso?.classList.add("d-none");
        area?.classList.remove("d-none");

        await carregarDados();

    } catch (erro) {

        if (aviso) {

            aviso.className = "alert alert-danger";

            aviso.textContent =
                "Acesso negado ou sessão expirada. Entre com uma conta administradora.";
        }

        console.error(
            "Erro de acesso administrativo:",
            erro.message
        );
    }

    // FIM - VERIFICAR ADMINISTRADOR

});
