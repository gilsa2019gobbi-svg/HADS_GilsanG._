
// INICIO - RECUPERAR SENHA

document.addEventListener("DOMContentLoaded", () => {

    const API = "";

    const formulario = document.getElementById("form-recuperar-senha");
    const campoEmail = document.getElementById("email-recuperacao");
    const botaoEnviar = document.getElementById("btn-recuperar");
    const mensagem = document.getElementById("mensagem-recuperacao");

    if (!formulario || !campoEmail || !botaoEnviar || !mensagem) {
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const email = campoEmail.value.trim().toLowerCase();

        if (!email || !campoEmail.checkValidity()) {
            mensagem.className = "alert alert-danger mt-3";
            mensagem.textContent = "Informe um e-mail vÃ¡lido.";
            return;
        }

        mensagem.className = "alert alert-info mt-3";
        mensagem.textContent = "Processando sua solicitaÃ§Ã£o...";

        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando...";

        try {

            const resposta = await fetch(`${API}/api/recuperar-senha`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email
                })
            });

            const tipo = resposta.headers.get("content-type") || "";

            if (!tipo.includes("application/json")) {
                throw new Error(
                    `ServiÃ§o de recuperaÃ§Ã£o indisponÃ­vel (HTTP ${resposta.status}).`
                );
            }

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    "NÃ£o foi possÃ­vel processar a solicitaÃ§Ã£o."
                );
            }

            mensagem.className = "alert alert-success mt-3";

            mensagem.textContent =
                dados.mensagem ||
                "Se o e-mail estiver cadastrado, vocÃª receberÃ¡ as instruÃ§Ãµes para redefinir sua senha.";

            formulario.reset();

        } catch (erro) {

            mensagem.className = "alert alert-danger mt-3";

            mensagem.textContent =
                erro.message || "Erro ao solicitar recuperaÃ§Ã£o de senha.";

        } finally {

            botaoEnviar.disabled = false;

            botaoEnviar.textContent = "Enviar link de recuperaÃ§Ã£o";
        }
    });

});

// FIM - RECUPERAR SENHA

