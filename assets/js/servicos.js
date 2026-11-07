
/* ==========================================
   INICIO - SERVICOS DA BARBEARIA
========================================== */

document.addEventListener("DOMContentLoaded", async function () {

    const cards = document.querySelectorAll(
        "#servicos .servicos-box"
    );

    if (cards.length === 0) return;

    try {
        // INICIO - BUSCAR SERVICOS NO BACKEND

        const resposta = await fetch(
            "http://localhost:3000/api/servicos"
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os serviços.");
        }

        const dados = await resposta.json();
        const servicos = dados.servicos || [];

        // FIM - BUSCAR SERVICOS NO BACKEND

        // INICIO - ATUALIZAR CARDS EXISTENTES

        cards.forEach(function (card, indice) {
            const servico = servicos[indice];

            if (!servico) {
                card.parentElement.hidden = true;
                return;
            }

            const titulo = card.querySelector("h5");
            const descricao = card.querySelector("p");

            if (titulo) {
                titulo.textContent = servico.nome;
            }

            if (descricao) {
                const preco = Number(servico.preco).toLocaleString(
                    "pt-BR",
                    {
                        style: "currency",
                        currency: "BRL"
                    }
                );

                descricao.textContent =
                    servico.descricao +
                    " | " + preco +
                    " | " + servico.duracao_minutos + " min";
            }
        });

        // FIM - ATUALIZAR CARDS EXISTENTES

    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro.message);
    }
});

/* ==========================================
   FIM - SERVICOS DA BARBEARIA
========================================== */
