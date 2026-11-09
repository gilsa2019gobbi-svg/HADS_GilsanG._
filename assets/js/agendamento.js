
// ============================================
// INICIO - SISTEMA DE AGENDAMENTO
// ============================================

document.addEventListener("DOMContentLoaded", async () => {

    const API = "";

    const form = document.getElementById("form-agendamento");
    const selectServico = document.getElementById("servico");
    const selectBarbeiro = document.getElementById("barbeiro");
    const inputData = document.getElementById("data");
    const selectHorario = document.getElementById("horario");
    const mensagem = document.getElementById("mensagem-agendamento");
    const botao = document.getElementById("btn-confirmar");

    let servicos = [];
    let horariosOcupados = [];
    let carregandoHorarios = false;

    // INICIO - EXIBIR MENSAGEM
    function mostrarMensagem(texto, tipo = "danger") {
        mensagem.textContent = texto;
        mensagem.className = `alert alert-${tipo}`;
    }
    // FIM - EXIBIR MENSAGEM


    // INICIO - FORMATAR PRECO
    function formatarPreco(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }
    // FIM - FORMATAR PRECO


    // INICIO - DATA LOCAL
    function dataLocalHoje() {
        const partes = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const obter = tipo => partes.find(p => p.type === tipo).value;

        return `${obter("year")}-${obter("month")}-${obter("day")}`;
    }

    inputData.min = dataLocalHoje();
    // FIM - DATA LOCAL


    // INICIO - CARREGAR SERVICOS E BARBEIROS
    try {
        const [respostaServicos, respostaBarbeiros] = await Promise.all([
            fetch(`${API}/api/servicos`),
            fetch(`${API}/api/barbeiros`)
        ]);

        if (!respostaServicos.ok || !respostaBarbeiros.ok) {
            throw new Error("Não foi possível carregar os dados.");
        }

        const dadosServicos = await respostaServicos.json();
        const dadosBarbeiros = await respostaBarbeiros.json();

        servicos = dadosServicos.servicos || [];
        const barbeiros = dadosBarbeiros.barbeiros || [];

        selectServico.innerHTML =
            '<option value="">Selecione um serviço</option>';

        servicos.forEach(servico => {
            const opcao = document.createElement("option");
            opcao.value = servico.id;
            opcao.textContent =
                `${servico.nome} - ${formatarPreco(servico.preco)} (${servico.duracao_minutos} min)`;
            selectServico.appendChild(opcao);
        });

        selectBarbeiro.innerHTML =
            '<option value="">Selecione um barbeiro</option>';

        barbeiros.forEach(barbeiro => {
            const opcao = document.createElement("option");
            opcao.value = barbeiro.id;
            opcao.textContent = barbeiro.nome;
            selectBarbeiro.appendChild(opcao);
        });

    } catch (erro) {
        mostrarMensagem(
            "Erro ao carregar serviços ou barbeiros. Verifique se o backend está ligado."
        );
        console.error(erro);
        return;
    }
    // FIM - CARREGAR SERVICOS E BARBEIROS


    // INICIO - CONVERTER DATA E HORA PARA ISO
    function converterParaISO(data, horario) {
        // Converte a data e hora da barbearia para UTC,
        // respeitando o fuso America/Sao_Paulo.
        // O Brasil atualmente utiliza UTC-03 nesta região.
        return `${data}T${horario}:00-03:00`;
    }
    // FIM - CONVERTER DATA E HORA PARA ISO


    // ============================================
    // INICIO - ATUALIZAR HORARIOS
    // ============================================

    async function atualizarHorarios() {

        const barbeiroId = selectBarbeiro.value;
        const servicoId = selectServico.value;
        const data = inputData.value;

        // ============================================
        // INICIO - LIMPAR HORARIOS ANTERIORES
        // ============================================

        selectHorario.innerHTML =
            '<option value="">Selecione um horário</option>';

        botao.disabled = true;
        horariosOcupados = [];

        // FIM - LIMPAR HORARIOS ANTERIORES


        // ============================================
        // INICIO - VALIDAR CAMPOS
        // ============================================

        if (!barbeiroId || !servicoId || !data) {
            return;
        }

        const servico = servicos.find(
            s => String(s.id) === servicoId
        );

        if (!servico) {
            return;
        }

        // FIM - VALIDAR CAMPOS


        // ============================================
        // INICIO - VERIFICAR DOMINGO
        // ============================================

        const diaSemana = new Date(
            `${data}T12:00:00-03:00`
        ).getUTCDay();

        if (diaSemana === 0) {

            selectHorario.innerHTML =
                '<option value="">Barbearia fechada aos domingos</option>';

            return;
        }

        // FIM - VERIFICAR DOMINGO


        // ============================================
        // INICIO - CONSULTAR HORARIOS OCUPADOS
        // ============================================

        carregandoHorarios = true;

        selectHorario.innerHTML =
            '<option value="">Consultando horários...</option>';

        try {

            const resposta = await fetch(
                `${API}/api/agendamentos/ocupados?barbeiro_id=${encodeURIComponent(barbeiroId)}&data=${encodeURIComponent(data)}`
            );

            if (!resposta.ok) {
                throw new Error("Erro ao consultar horários.");
            }

            const dados = await resposta.json();

            horariosOcupados = dados.horarios_ocupados || [];

            selectHorario.innerHTML =
                '<option value="">Selecione um horário</option>';

            // ============================================
            // INICIO - DEFINIR HORARIO DE FUNCIONAMENTO
            // ============================================

            const horaAbertura = 9;
            const horaFechamento = 18;

            const fechamento = new Date(
                converterParaISO(data, "18:00")
            );

            const duracaoServico = Number(
                servico.duracao_minutos
            );

            // FIM - DEFINIR HORARIO DE FUNCIONAMENTO


            // ============================================
            // INICIO - GERAR HORARIOS DISPONIVEIS
            // ============================================

            for (
                let hora = horaAbertura;
                hora < horaFechamento;
                hora++
            ) {

                for (const minuto of [0, 30]) {

                    // INICIO - FORMATAR HORARIO

                    const horario =
                        `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;

                    // FIM - FORMATAR HORARIO


                    // INICIO - CALCULAR INICIO DO SERVICO

                    const inicio = new Date(
                        converterParaISO(data, horario)
                    );

                    // FIM - CALCULAR INICIO DO SERVICO


                    // INICIO - CALCULAR FIM DO SERVICO

                    const fim = new Date(
                        inicio.getTime() +
                        duracaoServico * 60000
                    );

                    // FIM - CALCULAR FIM DO SERVICO


                    // ============================================
                    // INICIO - IMPEDIR HORARIOS PASSADOS
                    // ============================================

                    if (inicio <= new Date()) {
                        continue;
                    }

                    // FIM - IMPEDIR HORARIOS PASSADOS


                    // ============================================
                    // INICIO - IMPEDIR SERVICO APOS AS 18H
                    // ============================================

                    if (fim > fechamento) {
                        continue;
                    }

                    // FIM - IMPEDIR SERVICO APOS AS 18H


                    // ============================================
                    // INICIO - VERIFICAR HORARIOS OCUPADOS
                    // ============================================

                    const ocupado = horariosOcupados.some(item => {

                        const inicioOcupado = new Date(
                            item.data_hora
                        );

                        const duracaoOcupada = Number(
                            item.duracao_minutos
                        );

                        const fimOcupado = new Date(
                            inicioOcupado.getTime() +
                            duracaoOcupada * 60000
                        );

                        // Verifica se os intervalos se sobrepoem

                        return (
                            inicio < fimOcupado &&
                            fim > inicioOcupado
                        );

                    });

                    if (ocupado) {
                        continue;
                    }

                    // FIM - VERIFICAR HORARIOS OCUPADOS


                    // ============================================
                    // INICIO - ADICIONAR HORARIO DISPONIVEL
                    // ============================================

                    const opcao = document.createElement("option");

                    opcao.value = horario;
                    opcao.textContent = horario;

                    selectHorario.appendChild(opcao);

                    // FIM - ADICIONAR HORARIO DISPONIVEL

                }

            }

            // ============================================
            // FIM - GERAR HORARIOS DISPONIVEIS
            // ============================================


            // ============================================
            // INICIO - VERIFICAR SE EXISTEM HORARIOS
            // ============================================

            if (selectHorario.options.length === 1) {

                selectHorario.innerHTML =
                    '<option value="">Nenhum horário disponível</option>';

            }

            // FIM - VERIFICAR SE EXISTEM HORARIOS


        } catch (erro) {

            // ============================================
            // INICIO - TRATAR ERRO
            // ============================================

            selectHorario.innerHTML =
                '<option value="">Erro ao consultar horários</option>';

            mostrarMensagem(erro.message);

            console.error(
                "Erro ao atualizar horários:",
                erro
            );

            // FIM - TRATAR ERRO

        } finally {

            carregandoHorarios = false;

        }

        // FIM - CONSULTAR HORARIOS OCUPADOS

    }

    // ============================================
    // FIM - ATUALIZAR HORARIOS
    // ============================================


    // INICIO - VALIDAR SELECAO
    function validarSelecao() {
        botao.disabled = !(
            selectServico.value &&
            selectBarbeiro.value &&
            inputData.value &&
            selectHorario.value &&
            !carregandoHorarios
        );
    }

    selectServico.addEventListener("change", async () => {
        await atualizarHorarios();
        validarSelecao();
    });

    selectBarbeiro.addEventListener("change", async () => {
        await atualizarHorarios();
        validarSelecao();
    });

    inputData.addEventListener("change", async () => {
        await atualizarHorarios();
        validarSelecao();
    });

    selectHorario.addEventListener("change", validarSelecao);
    // FIM - VALIDAR SELECAO


    // INICIO - CONFIRMAR AGENDAMENTO
    form.addEventListener("submit", async evento => {
        evento.preventDefault();
        validarSelecao();

        if (botao.disabled) return;

        botao.disabled = true;

        try {
            const resposta = await fetch(`${API}/api/agendamentos`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    servico_id: selectServico.value,
                    barbeiro_id: selectBarbeiro.value,
                    data_hora: converterParaISO(
                        inputData.value,
                        selectHorario.value
                    )
                })
            });

            const dados = await resposta.json();

            if (resposta.status === 201) {
                mostrarMensagem(
                    "Agendamento realizado com sucesso!",
                    "success"
                );
                await atualizarHorarios();

            } else if (resposta.status === 401) {
                mostrarMensagem(
                    "Você precisa fazer login no site antes de agendar."
                );

            } else {
                mostrarMensagem(
                    dados.mensagem || "Não foi possível realizar o agendamento."
                );
                await atualizarHorarios();
            }

        } catch (erro) {
            mostrarMensagem(
                "Não foi possível conectar ao servidor. Verifique o backend."
            );
            console.error(erro);

        } finally {
            validarSelecao();
        }
    });
    // FIM - CONFIRMAR AGENDAMENTO

});

// ============================================
// FIM - SISTEMA DE AGENDAMENTO
// ============================================
