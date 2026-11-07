
/* ==========================================
   INICIO - CADASTRO DE USUARIOS
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.getElementById("formCadastro");
    const mensagem = document.getElementById("mensagemCadastro");

    if (!formulario || !mensagem) {
        console.warn("Formulário de cadastro não encontrado.");
        return;
    }

    formulario.addEventListener("submit", async function (event) {
        event.preventDefault();

        // INICIO - DADOS DO CADASTRO

        const nome = document.getElementById("cadNome").value.trim();
        const sobrenome = document.getElementById("cadSobrenome").value.trim();
        const whatsapp = document.getElementById("cadWhatsapp").value.trim();
        const email = document.getElementById("cadEmail").value.trim();
        const senha = document.getElementById("cadSenha").value;

        // FIM - DADOS DO CADASTRO

        const botao = formulario.querySelector('button[type="submit"]');

        mensagem.textContent = "Cadastrando...";
        mensagem.className = "mt-3 text-secondary";

        if (botao) botao.disabled = true;

        try {

            // INICIO - ENVIAR CADASTRO PARA API

            const resposta = await fetch(
                "http://localhost:3000/api/usuarios",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nome,
                        sobrenome,
                        whatsapp,
                        email,
                        senha
                    })
                }
            );

            const dados = await resposta.json();

            // FIM - ENVIAR CADASTRO PARA API

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Erro ao cadastrar usuário."
                );
            }

            // INICIO - CADASTRO REALIZADO

            mensagem.textContent =
                "Cadastro realizado com sucesso! Agora você pode entrar.";

            mensagem.className = "mt-3 text-success";

            formulario.reset();

            // FIM - CADASTRO REALIZADO

        } catch (erro) {

            mensagem.textContent =
                erro.message || "Não foi possível realizar o cadastro.";

            mensagem.className = "mt-3 text-danger";

        } finally {
            if (botao) botao.disabled = false;
        }
    });
});

/* ==========================================
   FIM - CADASTRO DE USUARIOS
========================================== */
