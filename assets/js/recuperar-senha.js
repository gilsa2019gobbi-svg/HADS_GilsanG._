
// INICIO - RECUPERAR SENHA

document.addEventListener("DOMContentLoaded", () => {

    const API = "http://localhost:3000";

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
            mensagem.textContent = "Informe um e-mail válido.";
            return;
        }

        mensagem.className = "alert alert-info mt-3";
        mensagem.textContent = "Processando sua solicitação...";

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
                    `Serviço de recuperação indisponível (HTTP ${resposta.status}).`
                );
            }

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    "Não foi possível processar a solicitação."
                );
            }

            mensagem.className = "alert alert-success mt-3";

            mensagem.textContent =
                dados.mensagem ||
                "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.";

            formulario.reset();

        } catch (erro) {

            mensagem.className = "alert alert-danger mt-3";

            mensagem.textContent =
                erro.message || "Erro ao solicitar recuperação de senha.";

        } finally {

            botaoEnviar.disabled = false;

            botaoEnviar.textContent = "Enviar link de recuperação";
        }
    });

});

// FIM - RECUPERAR SENHA
