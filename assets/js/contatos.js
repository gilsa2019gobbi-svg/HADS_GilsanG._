
document.addEventListener("DOMContentLoaded", () => {

    // ----- INICIO - CONFIGURACOES -----

    const API = "http://localhost:3000";

    const formulario = document.getElementById("form-contato");
    const botao = document.getElementById("contato-enviar");
    const retorno = document.getElementById("contato-retorno");

    if (!formulario || !botao || !retorno) {
        console.error("Elementos do formulário de contato não encontrados.");
        return;
    }

    // ----- FIM - CONFIGURACOES -----


    // ----- INICIO - EXIBIR MENSAGEM -----

    function mostrarMensagem(texto, tipo = "danger") {

        retorno.textContent = texto;

        retorno.className = `alert alert-${tipo}`;

    }

    // ----- FIM - EXIBIR MENSAGEM -----


    // ----- INICIO - LIMPAR MENSAGEM -----

    function limparMensagem() {

        retorno.textContent = "";
        retorno.className = "alert d-none";

    }

    // ----- FIM - LIMPAR MENSAGEM -----


    // ----- INICIO - ENVIAR FORMULARIO -----

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        // ----- INICIO - CAPTURAR DADOS -----

        const dados = {

            nome: document.getElementById("contato-nome").value.trim(),

            telefone: document.getElementById("contato-telefone").value.trim(),

            email: document.getElementById("contato-email").value.trim(),

            assunto: document.getElementById("contato-assunto").value.trim(),

            mensagem: document.getElementById("contato-mensagem").value.trim()

        };

        // ----- FIM - CAPTURAR DADOS -----


        // ----- INICIO - VALIDAR CAMPOS -----

        if (
            !dados.nome ||
            !dados.telefone ||
            !dados.email ||
            !dados.assunto ||
            !dados.mensagem
        ) {

            mostrarMensagem(
                "Por favor, preencha todos os campos.",
                "warning"
            );

            return;
        }

        // ----- FIM - VALIDAR CAMPOS -----


        // ----- INICIO - PREPARAR ENVIO -----

        limparMensagem();

        botao.disabled = true;
        botao.textContent = "Enviando...";

        // ----- FIM - PREPARAR ENVIO -----


        try {

            // ----- INICIO - ENVIAR PARA API -----

            const resposta = await fetch(
                `${API}/api/contatos`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(dados)
                }
            );

            // ----- FIM - ENVIAR PARA API -----


            // ----- INICIO - VERIFICAR RESPOSTA -----

            const tipoResposta =
                resposta.headers.get("content-type") || "";

            if (!tipoResposta.includes("application/json")) {

                throw new Error(
                    "A rota de contato ainda não está configurada no backend."
                );

            }

            const resultado = await resposta.json();

            if (!resposta.ok) {

                throw new Error(
                    resultado.mensagem ||
                    "Não foi possível enviar sua mensagem."
                );

            }

            // ----- FIM - VERIFICAR RESPOSTA -----


            // ----- INICIO - ENVIO CONCLUIDO -----

            mostrarMensagem(
                resultado.mensagem ||
                "Mensagem enviada com sucesso!",
                "success"
            );

            formulario.reset();

            // ----- FIM - ENVIO CONCLUIDO -----

        } catch (erro) {

            // ----- INICIO - TRATAR ERRO -----

            console.error(
                "Erro ao enviar mensagem:",
                erro
            );

            mostrarMensagem(
                erro.message,
                "danger"
            );

            // ----- FIM - TRATAR ERRO -----

        } finally {

            // ----- INICIO - RESTAURAR BOTAO -----

            botao.disabled = false;
            botao.textContent = "Enviar";

            // ----- FIM - RESTAURAR BOTAO -----

        }

    });

    // ----- FIM - ENVIAR FORMULARIO -----

});
