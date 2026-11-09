
// ----- INICIO - REDEFINIR SENHA -----

document.addEventListener("DOMContentLoaded", () => {

    const API = "";

    // ----- INICIO - ELEMENTOS DO FORMULARIO -----

    const formulario = document.getElementById("form-redefinir-senha");
    const campoSenha = document.getElementById("nova-senha");
    const campoConfirmar = document.getElementById("confirmar-senha");
    const botao = document.getElementById("btn-redefinir");
    const mensagem = document.getElementById("mensagem-redefinicao");

    if (!formulario || !campoSenha || !campoConfirmar || !botao || !mensagem) {
        console.error("Elementos do formulÃ¡rio de redefiniÃ§Ã£o nÃ£o encontrados.");
        return;
    }

    // ----- FIM - ELEMENTOS DO FORMULARIO -----

    // ----- INICIO - MOSTRAR MENSAGEM -----

    function mostrarMensagem(texto, tipo) {
        mensagem.className = `alert alert-${tipo} mt-3`;
        mensagem.textContent = texto;
    }

    // ----- FIM - MOSTRAR MENSAGEM -----

    // ----- INICIO - CONSULTAR TOKEN -----

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

    // Retirar o token da barra de endereÃ§os por seguranÃ§a.
    if (token) {
        window.history.replaceState(
            null,
            "",
            window.location.pathname
        );
    }

    // ----- FIM - CONSULTAR TOKEN -----

    // ----- INICIO - VALIDAR TOKEN -----

    if (!token || !/^[a-f0-9]{64}$/.test(token)) {

        mostrarMensagem(
            "Link invÃ¡lido ou ausente. Solicite uma nova recuperaÃ§Ã£o de senha.",
            "danger"
        );

        campoSenha.disabled = true;
        campoConfirmar.disabled = true;
        botao.disabled = true;

        return;
    }

    // ----- FIM - VALIDAR TOKEN -----

    // ----- INICIO - ENVIAR NOVA SENHA -----

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const senha = campoSenha.value;
        const confirmarSenha = campoConfirmar.value;

        // ----- INICIO - VALIDAR SENHA -----

        if (senha.length < 8 || senha.length > 72) {

            mostrarMensagem(
                "A senha deve conter entre 8 e 72 caracteres.",
                "danger"
            );

            return;
        }

        if (senha !== confirmarSenha) {

            mostrarMensagem(
                "As senhas nÃ£o coincidem. Tente novamente.",
                "danger"
            );

            return;
        }

        // ----- FIM - VALIDAR SENHA -----

        // ----- INICIO - BLOQUEAR BOTAO -----

        botao.disabled = true;
        botao.textContent = "Salvando...";

        mostrarMensagem(
            "Aguarde enquanto atualizamos sua senha...",
            "info"
        );

        // ----- FIM - BLOQUEAR BOTAO -----

        try {

            // ----- INICIO - ENVIAR PARA API -----

            const resposta = await fetch(`${API}/api/redefinir-senha`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    senha: senha
                })
            });

            const tipo = resposta.headers.get("content-type") || "";

            if (!tipo.includes("application/json")) {
                throw new Error("O servidor nÃ£o retornou uma resposta vÃ¡lida.");
            }

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    "NÃ£o foi possÃ­vel redefinir a senha."
                );
            }

            // ----- FIM - ENVIAR PARA API -----

            // ----- INICIO - REDEFINICAO CONCLUIDA -----

            mostrarMensagem(
                "Senha redefinida com sucesso! Volte ao site e entre com sua nova senha.",
                "success"
            );

            formulario.reset();

            campoSenha.disabled = true;
            campoConfirmar.disabled = true;

            botao.disabled = true;
            botao.textContent = "Senha atualizada";

            // ----- FIM - REDEFINICAO CONCLUIDA -----

        } catch (erro) {

            // ----- INICIO - TRATAR ERRO -----

            console.error("Erro ao redefinir senha:", erro.message);

            mostrarMensagem(
                erro.message || "Erro ao redefinir a senha.",
                "danger"
            );

            botao.disabled = false;
            botao.textContent = "Salvar nova senha";

            // ----- FIM - TRATAR ERRO -----

        }

    });

    // ----- FIM - ENVIAR NOVA SENHA -----

});

// ----- FIM - REDEFINIR SENHA -----

