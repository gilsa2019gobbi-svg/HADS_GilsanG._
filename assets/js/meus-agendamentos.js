
document.addEventListener("DOMContentLoaded", () => {

    // ----- INICIO - CONFIGURACOES -----

    const API = "";

    const lista = document.getElementById("lista-agendamentos");
    const mensagem = document.getElementById("mensagem-agendamentos");

    // ----- FIM - CONFIGURACOES -----


    // ----- INICIO - EXIBIR MENSAGEM -----

    function mostrarMensagem(texto, tipo = "danger") {

        mensagem.textContent = texto;
        mensagem.className = `alert alert-${tipo}`;

    }

    // ----- FIM - EXIBIR MENSAGEM -----


    // ----- INICIO - LIMPAR MENSAGEM -----

    function limparMensagem() {

        mensagem.textContent = "";
        mensagem.className = "d-none";

    }

    // ----- FIM - LIMPAR MENSAGEM -----


    // ----- INICIO - FORMATAR DATA -----

    function formatarData(dataHora) {

        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(new Date(dataHora));

    }

    // ----- FIM - FORMATAR DATA -----


    // ----- INICIO - FORMATAR PRECO -----

    function formatarPreco(valor) {

        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    }

    // ----- FIM - FORMATAR PRECO -----


    // ----- INICIO - CRIAR CARD DE AGENDAMENTO -----

    function criarCard(agendamento) {

        const card = document.createElement("div");
        card.className = "card-agendamento";


        // ----- INICIO - SERVICO -----

        const titulo = document.createElement("h3");
        titulo.textContent = agendamento.servico;

        // ----- FIM - SERVICO -----


        // ----- INICIO - BARBEIRO -----

        const barbeiro = document.createElement("p");
        barbeiro.className = "detalhe-agendamento";
        barbeiro.textContent =
            `Barbeiro: ${agendamento.barbeiro}`;

        // ----- FIM - BARBEIRO -----


        // ----- INICIO - DATA E HORARIO -----

        const data = document.createElement("p");
        data.className = "detalhe-agendamento";
        data.textContent =
            `Data e horÃ¡rio: ${formatarData(agendamento.data_hora)}`;

        // ----- FIM - DATA E HORARIO -----


        // ----- INICIO - DURACAO -----

        const duracao = document.createElement("p");
        duracao.className = "detalhe-agendamento";
        duracao.textContent =
            `DuraÃ§Ã£o: ${agendamento.duracao_minutos} minutos`;

        // ----- FIM - DURACAO -----


        // ----- INICIO - STATUS -----

        const status = document.createElement("span");
        status.className = "status-agendamento";

        const statusAtual = String(
            agendamento.status || ""
        ).toLowerCase();

        if (statusAtual === "agendado") {

            status.classList.add("status-agendado");

        } else if (statusAtual === "cancelado") {

            status.classList.add("status-cancelado");

        } else {

            status.classList.add("status-outro");

        }

        status.textContent =
            agendamento.status || "NÃ£o informado";

        // ----- FIM - STATUS -----


        // ----- INICIO - PRECO -----

        const preco = document.createElement("p");
        preco.className = "preco-agendamento mt-3 mb-0";
        preco.textContent = formatarPreco(agendamento.preco);

        // ----- FIM - PRECO -----


        // ----- INICIO - MONTAR CARD -----

        card.appendChild(titulo);
        card.appendChild(barbeiro);
        card.appendChild(data);
        card.appendChild(duracao);
        card.appendChild(status);
        card.appendChild(preco);

        // ----- FIM - MONTAR CARD -----


        // ----- INICIO - BOTAO CANCELAR AGENDAMENTO -----

        const dataAgendamento = new Date(
            agendamento.data_hora
        );

        if (
            statusAtual === "agendado" &&
            dataAgendamento > new Date()
        ) {

            const botaoCancelar = document.createElement("button");

            botaoCancelar.type = "button";
            botaoCancelar.className =
                "btn btn-outline-danger mt-3";

            botaoCancelar.textContent =
                "Cancelar Agendamento";


            // ----- INICIO - EVENTO CANCELAR -----

            botaoCancelar.addEventListener("click", async () => {

                const confirmar = confirm(
                    "Tem certeza que deseja cancelar este agendamento?"
                );

                if (!confirmar) {
                    return;
                }

                botaoCancelar.disabled = true;
                botaoCancelar.textContent = "Cancelando...";

                try {

                    // ----- INICIO - REQUISICAO DE CANCELAMENTO -----

                    const resposta = await fetch(
                        `${API}/api/agendamentos/${agendamento.id}/cancelar`,
                        {
                            method: "PATCH",
                            credentials: "include"
                        }
                    );

                    // ----- FIM - REQUISICAO DE CANCELAMENTO -----


                    // ----- INICIO - VERIFICAR TIPO DA RESPOSTA -----

                    const tipoResposta =
                        resposta.headers.get("content-type") || "";

                    if (!tipoResposta.includes("application/json")) {

                        throw new Error(
                            `A API retornou uma resposta invÃ¡lida (HTTP ${resposta.status}). Verifique a rota de cancelamento no backend.`
                        );

                    }

                    // ----- FIM - VERIFICAR TIPO DA RESPOSTA -----


                    // ----- INICIO - LER RESPOSTA JSON -----

                    const dados = await resposta.json();

                    // ----- FIM - LER RESPOSTA JSON -----


                    // ----- INICIO - VERIFICAR ERRO -----

                    if (!resposta.ok) {

                        throw new Error(
                            dados.mensagem ||
                            "NÃ£o foi possÃ­vel cancelar o agendamento."
                        );

                    }

                    // ----- FIM - VERIFICAR ERRO -----


                    // ----- INICIO - CANCELAMENTO CONCLUIDO -----

                    alert(
                        dados.mensagem ||
                        "Agendamento cancelado com sucesso!"
                    );

                    await carregarAgendamentos();

                    // ----- FIM - CANCELAMENTO CONCLUIDO -----

                } catch (erro) {

                    // ----- INICIO - TRATAR ERRO CANCELAMENTO -----

                    console.error(
                        "Erro ao cancelar agendamento:",
                        erro
                    );

                    alert(erro.message);

                    botaoCancelar.disabled = false;
                    botaoCancelar.textContent =
                        "Cancelar Agendamento";

                    // ----- FIM - TRATAR ERRO CANCELAMENTO -----

                }

            });

            // ----- FIM - EVENTO CANCELAR -----


            // ----- INICIO - ADICIONAR BOTAO AO CARD -----

            card.appendChild(botaoCancelar);

            // ----- FIM - ADICIONAR BOTAO AO CARD -----

        }

        // ----- FIM - BOTAO CANCELAR AGENDAMENTO -----


        return card;

    }

    // ----- FIM - CRIAR CARD DE AGENDAMENTO -----


    // ----- INICIO - BUSCAR AGENDAMENTOS -----

    async function carregarAgendamentos() {

        try {

            limparMensagem();

            // ----- INICIO - REQUISICAO API -----

            const resposta = await fetch(
                `${API}/api/meus-agendamentos`,
                {
                    credentials: "include"
                }
            );

            // ----- FIM - REQUISICAO API -----


            // ----- INICIO - VERIFICAR LOGIN -----

            if (resposta.status === 401) {

                lista.innerHTML = "";

                mostrarMensagem(
                    "VocÃª precisa fazer login para visualizar seus agendamentos."
                );

                return;

            }

            // ----- FIM - VERIFICAR LOGIN -----


            // ----- INICIO - VERIFICAR RESPOSTA -----

            if (!resposta.ok) {

                throw new Error(
                    "NÃ£o foi possÃ­vel consultar seus agendamentos."
                );

            }

            const dados = await resposta.json();

            const agendamentos = dados.agendamentos || [];

            lista.innerHTML = "";

            // ----- FIM - VERIFICAR RESPOSTA -----


            // ----- INICIO - VERIFICAR LISTA VAZIA -----

            if (agendamentos.length === 0) {

                const vazio = document.createElement("div");

                vazio.className = "mensagem-vazia";

                vazio.textContent =
                    "VocÃª ainda nÃ£o possui agendamentos.";

                lista.appendChild(vazio);

                return;

            }

            // ----- FIM - VERIFICAR LISTA VAZIA -----


            // ----- INICIO - EXIBIR AGENDAMENTOS -----

            agendamentos.forEach(agendamento => {

                const card = criarCard(agendamento);

                lista.appendChild(card);

            });

            // ----- FIM - EXIBIR AGENDAMENTOS -----

        } catch (erro) {

            // ----- INICIO - TRATAR ERRO -----

            lista.innerHTML = "";

            mostrarMensagem(erro.message);

            console.error(
                "Erro ao carregar agendamentos:",
                erro
            );

            // ----- FIM - TRATAR ERRO -----

        }

    }

    // ----- FIM - BUSCAR AGENDAMENTOS -----


    // ----- INICIO - INICIALIZAR PAGINA -----

    carregarAgendamentos();

    // ----- FIM - INICIALIZAR PAGINA -----

});

