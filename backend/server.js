
// ----- INICIO - IMPORTACOES -----

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
const pool = require("./db");

// ----- FIM - IMPORTACOES -----

// ----- INICIO - CONFIGURACAO DO SERVIDOR -----

app.use(helmet());

app.use(cors({
    origin: "http://localhost:5500",
    credentials: true
}));

app.use(express.json({ limit: "20kb" }));

const PORT = process.env.PORT || 3000;

// ----- FIM - CONFIGURACAO DO SERVIDOR -----

// ----- INICIO - CONFIGURACAO JWT -----

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET ausente ou muito curta no .env");
}

const COOKIE_NAME = "msbarbearias_token";

function obterCookies(req) {
    const cookies = {};

    for (const parte of (req.headers.cookie || "").split(";")) {
        const separador = parte.indexOf("=");

        if (separador === -1) continue;

        const nome = parte.slice(0, separador).trim();
        const valor = parte.slice(separador + 1).trim();

        cookies[nome] = valor;
    }

    return cookies;
}

// ----- INICIO - VALIDAR SESSAO -----

async function autenticar(req, res, next) {

    const token = obterCookies(req)[COOKIE_NAME];

    if (!token) {
        return res.status(401).json({
            mensagem: "Usuário não autenticado."
        });
    }

    let usuarioToken;

    try {
        usuarioToken = jwt.verify(token, JWT_SECRET, {
            algorithms: ["HS256"]
        });
    } catch (erro) {
        return res.status(401).json({
            mensagem: "Sessão inválida ou expirada."
        });
    }

    if (
        !usuarioToken.id ||
        !Number.isInteger(usuarioToken.sessao_versao)
    ) {
        return res.status(401).json({
            mensagem: "Sessão desatualizada. Entre novamente."
        });
    }

    try {

        const resultado = await pool.query(
            `SELECT sessao_versao
             FROM public.usuarios
             WHERE id = $1`,
            [usuarioToken.id]
        );

        if (
            resultado.rows.length === 0 ||
            resultado.rows[0].sessao_versao !== usuarioToken.sessao_versao
        ) {
            return res.status(401).json({
                mensagem: "Sessão encerrada. Entre novamente."
            });
        }

        req.usuario = usuarioToken;

        return next();

    } catch (erro) {

        console.error("Erro ao validar sessão:", erro.message);

        return res.status(503).json({
            mensagem: "Erro ao verificar sessão."
        });
    }
}

// ----- FIM - VALIDAR SESSAO -----

// ----- FIM - CONFIGURACAO JWT -----

// ----- INICIO - VERIFICAR ADMINISTRADOR -----

async function verificarAdmin(req, res, next) {
    try {
        const resultado = await pool.query(
            `SELECT perfil
             FROM public.usuarios
             WHERE id = $1`,
            [req.usuario.id]
        );

        if (
            resultado.rows.length === 0 ||
            resultado.rows[0].perfil !== "admin"
        ) {
            return res.status(403).json({
                mensagem: "Acesso permitido apenas para administradores."
            });
        }

        next();

    } catch (erro) {
        console.error(
            "Erro ao verificar administrador:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao verificar permissões."
        });
    }
}

// ----- FIM - VERIFICAR ADMINISTRADOR -----

// ----- INICIO - TESTE DA API -----

app.get("/api/health", (req, res) => {
    return res.json({
        status: "ok",
        mensagem: "API MsBarbearias funcionando!"
    });
});

app.get("/api/db-health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.json({
            status: "ok",
            mensagem: "PostgreSQL conectado!"
        });

    } catch (erro) {
        console.error(
            "Falha na conexão com o banco:",
            erro.message
        );

        return res.status(503).json({
            status: "erro",
            mensagem: "Banco de dados indisponível"
        });
    }
});

// ----- FIM - TESTE DA API -----

// ----- INICIO - CADASTRO DE USUARIOS -----

app.post("/api/usuarios", async (req, res) => {
    try {
        const {
            nome,
            sobrenome,
            whatsapp,
            email,
            senha
        } = req.body || {};

        if (
            typeof nome !== "string" ||
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !nome.trim() ||
            !email.trim() ||
            senha.length < 8
        ) {
            return res.status(400).json({
                mensagem:
                    "Informe nome, e-mail e senha de pelo menos 8 caracteres."
            });
        }

        if (
            sobrenome !== undefined &&
            typeof sobrenome !== "string"
        ) {
            return res.status(400).json({
                mensagem: "Sobrenome inválido."
            });
        }

        if (
            whatsapp !== undefined &&
            typeof whatsapp !== "string"
        ) {
            return res.status(400).json({
                mensagem: "WhatsApp inválido."
            });
        }

        const nomeCompleto = [
            nome.trim(),
            typeof sobrenome === "string"
                ? sobrenome.trim()
                : ""
        ].filter(Boolean).join(" ");

        const emailNormalizado = email.trim().toLowerCase();

        const whatsappNormalizado =
            typeof whatsapp === "string"
                ? whatsapp.replace(/\D/g, "")
                : null;

        if (
            nomeCompleto.length > 150 ||
            emailNormalizado.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)
        ) {
            return res.status(400).json({
                mensagem: "Nome ou e-mail inválido."
            });
        }

        if (
            whatsappNormalizado !== null &&
            !/^\d{10,11}$/.test(whatsappNormalizado)
        ) {
            return res.status(400).json({
                mensagem: "Informe um WhatsApp válido com DDD."
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        const resultado = await pool.query(
            `INSERT INTO public.usuarios
                (nome, email, senha_hash, whatsapp)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, whatsapp, criado_em`,
            [
                nomeCompleto,
                emailNormalizado,
                senhaHash,
                whatsappNormalizado
            ]
        );

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso!",
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        if (erro.code === "23505") {
            return res.status(409).json({
                mensagem: "Este e-mail já está cadastrado."
            });
        }

        console.error("Erro no cadastro:", erro.message);

        return res.status(500).json({
            mensagem: "Erro ao cadastrar usuário."
        });
    }
});

// ----- FIM - CADASTRO DE USUARIOS -----

// ----- INICIO - LOGIN DE USUARIOS -----

app.post("/api/login", async (req, res) => {
    try {
        const { email, senha } = req.body || {};

        if (
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !email.trim() ||
            !senha
        ) {
            return res.status(400).json({
                mensagem: "Informe e-mail e senha."
            });
        }

        const resultado = await pool.query(
            `SELECT id, nome, email, senha_hash, perfil, sessao_versao
 FROM public.usuarios
 WHERE email = $1`,
            [email.trim().toLowerCase()]


        );

        const usuario = resultado.rows[0];

        if (
            !usuario ||
            !(await bcrypt.compare(senha, usuario.senha_hash))
        ) {
            return res.status(401).json({
                mensagem: "E-mail ou senha incorretos."
            });
        }

       const token = jwt.sign(
    {
        id: usuario.id,
        email: usuario.email,
        sessao_versao: usuario.sessao_versao
    },
            JWT_SECRET,
            {
                algorithm: "HS256",
                expiresIn: "2h"
            }
        );

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 2 * 60 * 60 * 1000,
            path: "/"
        });

        return res.status(200).json({
            mensagem: "Login realizado com sucesso!",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }
        });

    } catch (erro) {
        console.error("Erro no login:", erro.message);

        return res.status(500).json({
            mensagem: "Erro interno ao realizar login."
        });
    }
});

// ----- FIM - LOGIN DE USUARIOS -----

// ----- INICIO - RECUPERACAO DE SENHA -----

const RECUPERACAO_MINUTOS = 15;

const mensagemRecuperacao =
    "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.";

const tentativasRecuperacao = new Map();

function limitarRecuperacao(req, res, next) {
    const agora = Date.now();
    const chave = req.ip;
    const janela = 15 * 60 * 1000;

    if (tentativasRecuperacao.size > 5000) {
        for (const [ip, dados] of tentativasRecuperacao) {
            if (dados.expira < agora) {
                tentativasRecuperacao.delete(ip);
            }
        }
    }

    const dados = tentativasRecuperacao.get(chave);

    if (!dados || dados.expira < agora) {
        tentativasRecuperacao.set(chave, {
            quantidade: 1,
            expira: agora + janela
        });

        return next();
    }

    if (dados.quantidade >= 5) {
        return res.status(429).json({
            mensagem:
                "Muitas solicitações. Aguarde 15 minutos e tente novamente."
        });
    }

    dados.quantidade++;
    next();
}

// ----- INICIO - CONFIGURAR GMAIL -----

function criarTransportador() {
    const {
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        throw new Error("Configuração SMTP incompleta no .env.");
    }

    const porta = Number(SMTP_PORT || 587);

    if (
        !Number.isInteger(porta) ||
        porta < 1 ||
        porta > 65535
    ) {
        throw new Error("SMTP_PORT inválida.");
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: porta,
        secure: porta === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
}

// ----- FIM - CONFIGURAR GMAIL -----

// ----- INICIO - SOLICITAR RECUPERACAO -----

app.post(
    "/api/recuperar-senha",
    limitarRecuperacao,
    async (req, res) => {
        const { email } = req.body || {};

        if (
            typeof email !== "string" ||
            email.length > 255 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ) {
            return res.status(400).json({
                mensagem: "Informe um e-mail válido."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        let idRecuperacao = null;

        try {
            const resultado = await pool.query(
                `SELECT id, nome, email
                 FROM public.usuarios
                 WHERE email = $1`,
                [emailNormalizado]
            );

            // Não revela se o e-mail está cadastrado.
            if (resultado.rowCount === 0) {
                return res.status(200).json({
                    mensagem: mensagemRecuperacao
                });
            }

            const usuario = resultado.rows[0];

            // Gerar token aleatório.
            const token = crypto.randomBytes(32).toString("hex");

            // Salvar apenas o hash no banco.
            const tokenHash = crypto
                .createHash("sha256")
                .update(token)
                .digest("hex");

            const urlBase = process.env.FRONTEND_URL;

            if (
                !urlBase ||
                !/^https?:\/\//.test(urlBase)
            ) {
                throw new Error(
                    "FRONTEND_URL inválida no .env."
                );
            }

            const link =
                `${urlBase.replace(/\/$/, "")}` +
                `/redefinir-senha.html?token=${token}`;

            // Salvar token no Supabase.
            const insercao = await pool.query(
                `INSERT INTO public.recuperacao_senha
                    (usuario_id, token_hash, expira_em)
                 VALUES (
                    $1,
                    $2,
                    NOW() + INTERVAL '15 minutes'
                 )
                 RETURNING id`,
                [usuario.id, tokenHash]
            );

            idRecuperacao = insercao.rows[0].id;

            // Enviar e-mail.
            const transportador = criarTransportador();

            await transportador.sendMail({
                from:
                    process.env.SMTP_FROM ||
                    process.env.SMTP_USER,

                to: usuario.email,

                subject:
                    "MsBarbearias - Recuperação de senha",

                text:
                    `Olá, ${usuario.nome}!\n\n` +
                    `Para redefinir sua senha, acesse:\n` +
                    `${link}\n\n` +
                    `O link expira em ${RECUPERACAO_MINUTOS} minutos ` +
                    `e pode ser usado apenas uma vez.\n\n` +
                    `Se não solicitou a recuperação, ignore esta mensagem.`,

                html: `
                    <div style="font-family:Arial,sans-serif;">
                        <h2 style="color:#ff3300;">
                            MsBarbearias
                        </h2>

                        <p>Olá!</p>

                        <p>
                            Recebemos uma solicitação para
                            redefinir sua senha.
                        </p>

                        <p>
                            <a href="${link}"
                               style="
                                   display:inline-block;
                                   background:#ff3300;
                                   color:#ffffff;
                                   padding:12px 20px;
                                   text-decoration:none;
                                   border-radius:6px;
                               ">
                                Redefinir minha senha
                            </a>
                        </p>

                        <p>
                            Este link expira em 15 minutos
                            e pode ser usado apenas uma vez.
                        </p>

                        <p>
                            Se não foi você, ignore este e-mail.
                        </p>
                    </div>
                `
            });

            return res.status(200).json({
                mensagem: mensagemRecuperacao
            });

        } catch (erro) {
            console.error(
                "Erro ao solicitar recuperação:",
                erro.message
            );

            // Remover o token caso o envio falhe.
            if (idRecuperacao !== null) {
                try {
                    await pool.query(
                        `DELETE FROM public.recuperacao_senha
                         WHERE id = $1`,
                        [idRecuperacao]
                    );

                } catch (erroLimpeza) {
                    console.error(
                        "Erro ao limpar token:",
                        erroLimpeza.message
                    );
                }
            }

            // Resposta genérica por segurança.
            return res.status(200).json({
                mensagem: mensagemRecuperacao
            });
        }
    }
);

// ----- FIM - SOLICITAR RECUPERACAO -----


// ----- INICIO - REDEFINIR SENHA -----

app.post("/api/redefinir-senha", async (req, res) => {
    const { token, senha } = req.body || {};

    if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token) ||
        typeof senha !== "string" ||
        senha.length < 8 ||
        senha.length > 72
    ) {
        return res.status(400).json({
            mensagem:
                "Link inválido ou senha fora do limite de 8 a 72 caracteres."
        });
    }

    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    let cliente;
    let transacaoIniciada = false;

    try {
        cliente = await pool.connect();

        await cliente.query("BEGIN");
        transacaoIniciada = true;

        // ----- INICIO - VALIDAR TOKEN DE RECUPERACAO -----

        const busca = await cliente.query(
            `SELECT id, usuario_id
             FROM public.recuperacao_senha
             WHERE token_hash = $1
               AND utilizado_em IS NULL
               AND expira_em > NOW()
             FOR UPDATE`,
            [tokenHash]
        );

        if (busca.rowCount === 0) {
            await cliente.query("ROLLBACK");
            transacaoIniciada = false;

            return res.status(400).json({
                mensagem:
                    "Link inválido, expirado ou já utilizado. Solicite outro."
            });
        }

        const recuperacao = busca.rows[0];

        // ----- FIM - VALIDAR TOKEN DE RECUPERACAO -----

        // ----- INICIO - CRIAR HASH DA NOVA SENHA -----

        const senhaHash = await bcrypt.hash(senha, 12);

        // ----- FIM - CRIAR HASH DA NOVA SENHA -----

        // ----- INICIO - ATUALIZAR SENHA E INVALIDAR SESSOES -----

        const atualizacao = await cliente.query(
            `UPDATE public.usuarios
             SET senha_hash = $1,
                 sessao_versao = sessao_versao + 1
             WHERE id = $2
             RETURNING id`,
            [
                senhaHash,
                recuperacao.usuario_id
            ]
        );

        if (atualizacao.rowCount === 0) {
            throw new Error(
                "Usuário da recuperação não encontrado."
            );
        }

        // ----- FIM - ATUALIZAR SENHA E INVALIDAR SESSOES -----

        // ----- INICIO - INVALIDAR LINKS DE RECUPERACAO -----

        await cliente.query(
            `UPDATE public.recuperacao_senha
             SET utilizado_em = NOW()
             WHERE usuario_id = $1
               AND utilizado_em IS NULL`,
            [recuperacao.usuario_id]
        );

        // ----- FIM - INVALIDAR LINKS DE RECUPERACAO -----

        // ----- INICIO - CONFIRMAR ALTERACOES -----

        await cliente.query("COMMIT");
        transacaoIniciada = false;

        return res.status(200).json({
            mensagem:
                "Senha redefinida com sucesso! Faça login novamente."
        });

        // ----- FIM - CONFIRMAR ALTERACOES -----

    } catch (erro) {

        // ----- INICIO - DESFAZER ALTERACOES EM CASO DE ERRO -----

        if (cliente && transacaoIniciada) {
            try {
                await cliente.query("ROLLBACK");
            } catch (erroRollback) {
                console.error(
                    "Erro no rollback:",
                    erroRollback.message
                );
            }
        }

        console.error(
            "Erro ao redefinir senha:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao redefinir senha."
        });

        // ----- FIM - DESFAZER ALTERACOES EM CASO DE ERRO -----

    } finally {
        if (cliente) {
            cliente.release();
        }
    }
});

// ----- FIM - REDEFINIR SENHA -----


// ----- FIM - RECUPERACAO DE SENHA -----

// ----- INICIO - CONSULTAR USUARIO AUTENTICADO -----

app.get("/api/me", autenticar, async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id, nome, email, whatsapp
             FROM public.usuarios
             WHERE id = $1`,
            [req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: "Usuário não encontrado."
            });
        }

        return res.json({
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro em /api/me:", erro.message);

        return res.status(500).json({
            mensagem: "Erro ao consultar usuário."
        });
    }
});

// ----- FIM - CONSULTAR USUARIO AUTENTICADO -----

// ----- INICIO - LOGOUT -----

app.post("/api/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    return res.json({
        mensagem: "Logout realizado com sucesso!"
    });
});

// ----- FIM - LOGOUT -----

// ----- INICIO - LISTAR SERVICOS PUBLICOS -----

app.get("/api/servicos", async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT
                id,
                nome,
                descricao,
                preco,
                duracao_minutos
             FROM public.servicos
             WHERE ativo = TRUE
             ORDER BY id ASC`
        );

        return res.status(200).json({
            mensagem: "Serviços encontrados com sucesso!",
            servicos: resultado.rows
        });

    } catch (erro) {
        console.error(
            "Erro ao buscar serviços:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao consultar serviços."
        });
    }
});

// ----- FIM - LISTAR SERVICOS PUBLICOS -----

// ----- INICIO - LISTAR BARBEIROS ADMIN -----

app.get(
    "/api/admin/barbeiros",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    id,
                    nome,
                    whatsapp,
                    especialidade,
                    ativo
                 FROM public.barbeiros
                 ORDER BY nome ASC`
            );

            return res.status(200).json({
                barbeiros: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao listar barbeiros:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao consultar barbeiros."
            });
        }
    }
);

// ----- FIM - LISTAR BARBEIROS ADMIN -----

// ----- INICIO - LISTAR BARBEIROS PUBLICOS -----

app.get("/api/barbeiros", async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT id, nome, especialidade
             FROM public.barbeiros
             WHERE ativo = TRUE
             ORDER BY nome ASC`
        );

        return res.status(200).json({
            mensagem: "Barbeiros encontrados com sucesso!",
            barbeiros: resultado.rows
        });

    } catch (erro) {
        console.error(
            "Erro ao buscar barbeiros:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao consultar barbeiros."
        });
    }
});

// ----- FIM - LISTAR BARBEIROS PUBLICOS -----

// ----- INICIO - CONSULTAR HORARIOS OCUPADOS -----

app.get("/api/agendamentos/ocupados", async (req, res) => {
    try {
        const { barbeiro_id, data } = req.query;

        if (
            !/^[1-9]\d*$/.test(String(barbeiro_id || "")) ||
            typeof data !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(data) ||
            !Number.isFinite(Date.parse(`${data}T12:00:00Z`)) ||
            new Date(`${data}T12:00:00Z`)
                .toISOString()
                .slice(0, 10) !== data
        ) {
            return res.status(400).json({
                mensagem:
                    "Informe um barbeiro e uma data válida."
            });
        }

        const resultado = await pool.query(
            `SELECT data_hora, duracao_minutos
             FROM public.agendamentos
             WHERE barbeiro_id = $1
               AND (
                    data_hora AT TIME ZONE 'America/Sao_Paulo'
               )::date = $2::date
               AND status = 'agendado'
             ORDER BY data_hora ASC`,
            [barbeiro_id, data]
        );

        return res.status(200).json({
            mensagem:
                "Horários ocupados consultados com sucesso!",
            horarios_ocupados: resultado.rows
        });

    } catch (erro) {
        console.error(
            "Erro ao consultar agendamentos:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao consultar horários ocupados."
        });
    }
});

// ----- FIM - CONSULTAR HORARIOS OCUPADOS -----

// ----- INICIO - CADASTRAR AGENDAMENTO -----

app.post("/api/agendamentos", autenticar, async (req, res) => {
    try {
        const {
            barbeiro_id,
            servico_id,
            data_hora
        } = req.body || {};

        if (
            !/^[1-9]\d*$/.test(String(barbeiro_id || "")) ||
            !/^[1-9]\d*$/.test(String(servico_id || "")) ||
            typeof data_hora !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(data_hora) ||
            !Number.isFinite(Date.parse(data_hora))
        ) {
            return res.status(400).json({
                mensagem:
                    "Informe barbeiro, serviço e data/hora válidos."
            });
        }

        const inicio = new Date(data_hora);

        if (inicio.getTime() <= Date.now()) {
            return res.status(400).json({
                mensagem: "Escolha uma data e horário futuros."
            });
        }

        // Verificar barbeiro ativo.
        const barbeiro = await pool.query(
            `SELECT id
             FROM public.barbeiros
             WHERE id = $1
               AND ativo = TRUE`,
            [barbeiro_id]
        );

        if (barbeiro.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Barbeiro não encontrado ou inativo."
            });
        }

        // Verificar serviço ativo.
        const servico = await pool.query(
            `SELECT id, duracao_minutos
             FROM public.servicos
             WHERE id = $1
               AND ativo = TRUE`,
            [servico_id]
        );

        if (servico.rows.length === 0) {
            return res.status(404).json({
                mensagem: "Serviço não encontrado ou inativo."
            });
        }

        const duracao = Number(
            servico.rows[0].duracao_minutos
        );

        if (!Number.isInteger(duracao) || duracao <= 0) {
            return res.status(400).json({
                mensagem: "Duração do serviço inválida."
            });
        }

        // Validar o expediente no fuso de São Paulo.
        const formatador = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        });

        const partes = Object.fromEntries(
            formatador
                .formatToParts(inicio)
                .filter(parte =>
                    ["weekday", "hour", "minute"]
                        .includes(parte.type)
                )
                .map(parte => [parte.type, parte.value])
        );

        // Não abrir aos domingos.
        if (partes.weekday === "Sun") {
            return res.status(400).json({
                mensagem:
                    "A barbearia não funciona aos domingos."
            });
        }

        const aberturaMinutos = 9 * 60;
        const fechamentoMinutos = 18 * 60;

        const inicioMinutos =
            Number(partes.hour) * 60 +
            Number(partes.minute);

        const fimMinutos = inicioMinutos + duracao;

        if (
            inicioMinutos < aberturaMinutos ||
            fimMinutos > fechamentoMinutos
        ) {
            return res.status(400).json({
                mensagem:
                    "Escolha um horário entre 09h e 18h, considerando a duração do serviço."
            });
        }

        // Salvar agendamento.
        const resultado = await pool.query(
            `INSERT INTO public.agendamentos
                (
                    usuario_id,
                    barbeiro_id,
                    servico_id,
                    data_hora,
                    duracao_minutos
                )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING
                id,
                usuario_id,
                barbeiro_id,
                servico_id,
                data_hora,
                duracao_minutos,
                status`,
            [
                req.usuario.id,
                barbeiro_id,
                servico_id,
                data_hora,
                duracao
            ]
        );

        return res.status(201).json({
            mensagem: "Agendamento realizado com sucesso!",
            agendamento: resultado.rows[0]
        });

    } catch (erro) {
        // Conflito com horário ocupado no PostgreSQL.
        if (erro.code === "23P01") {
            return res.status(409).json({
                mensagem:
                    "Este horário está ocupado. Escolha outro."
            });
        }

        if (erro.code === "23503") {
            return res.status(400).json({
                mensagem:
                    "Cliente, barbeiro ou serviço inválido."
            });
        }

        console.error(
            "Erro ao criar agendamento:",
            erro.message
        );

        return res.status(500).json({
            mensagem: "Erro ao realizar agendamento."
        });
    }
});

// ----- FIM - CADASTRAR AGENDAMENTO -----

// ----- INICIO - LISTAR MEUS AGENDAMENTOS -----

app.get(
    "/api/meus-agendamentos",
    autenticar,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    a.id,
                    a.data_hora,
                    a.duracao_minutos,
                    a.status,
                    s.nome AS servico,
                    s.preco,
                    b.nome AS barbeiro
                 FROM public.agendamentos a
                 INNER JOIN public.servicos s
                    ON s.id = a.servico_id
                 INNER JOIN public.barbeiros b
                    ON b.id = a.barbeiro_id
                 WHERE a.usuario_id = $1
                 ORDER BY a.data_hora DESC`,
                [req.usuario.id]
            );

            return res.status(200).json({
                mensagem:
                    "Agendamentos consultados com sucesso!",
                agendamentos: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao consultar meus agendamentos:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao consultar seus agendamentos."
            });
        }
    }
);

// ----- FIM - LISTAR MEUS AGENDAMENTOS -----

// ----- INICIO - CANCELAR AGENDAMENTO DO CLIENTE -----

app.patch(
    "/api/agendamentos/:id/cancelar",
    autenticar,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (
                !Number.isSafeInteger(id) ||
                id <= 0
            ) {
                return res.status(400).json({
                    mensagem: "Agendamento inválido."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.agendamentos
                 SET status = 'cancelado'
                 WHERE id = $1
                   AND usuario_id = $2
                   AND status = 'agendado'
                   AND data_hora > NOW()
                 RETURNING id, status`,
                [
                    id,
                    req.usuario.id
                ]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem:
                        "Agendamento não encontrado ou não pode ser cancelado."
                });
            }

            return res.status(200).json({
                mensagem:
                    "Agendamento cancelado com sucesso!",
                agendamento: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao cancelar agendamento:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao cancelar agendamento."
            });
        }
    }
);

// ----- FIM - CANCELAR AGENDAMENTO DO CLIENTE -----

// ----- INICIO - CADASTRAR MENSAGEM DE CONTATO -----

app.post("/api/contatos", async (req, res) => {
    try {
        const {
            nome,
            telefone,
            email,
            assunto,
            mensagem
        } = req.body || {};

        const campos = [
            nome,
            telefone,
            email,
            assunto,
            mensagem
        ];

        if (
            campos.some(campo => typeof campo !== "string")
        ) {
            return res.status(400).json({
                mensagem:
                    "Preencha todos os campos corretamente."
            });
        }

        const nomeLimpo = nome.trim();
        const telefoneLimpo = telefone.trim();
        const emailLimpo = email.trim().toLowerCase();
        const assuntoLimpo = assunto.trim();
        const mensagemLimpa = mensagem.trim();

        if (
            !nomeLimpo ||
            !telefoneLimpo ||
            !emailLimpo ||
            !assuntoLimpo ||
            !mensagemLimpa
        ) {
            return res.status(400).json({
                mensagem: "Todos os campos são obrigatórios."
            });
        }

        if (
            nomeLimpo.length > 150 ||
            telefoneLimpo.length > 20 ||
            emailLimpo.length > 255 ||
            assuntoLimpo.length > 150 ||
            mensagemLimpa.length > 3000
        ) {
            return res.status(400).json({
                mensagem:
                    "Um ou mais campos ultrapassaram o tamanho permitido."
            });
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
        ) {
            return res.status(400).json({
                mensagem: "Informe um e-mail válido."
            });
        }

        const resultado = await pool.query(
            `INSERT INTO public.contatos
                (
                    nome,
                    telefone,
                    email,
                    assunto,
                    mensagem
                )
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, criado_em`,
            [
                nomeLimpo,
                telefoneLimpo,
                emailLimpo,
                assuntoLimpo,
                mensagemLimpa
            ]
        );

        return res.status(201).json({
            mensagem: "Mensagem enviada com sucesso!",
            contato: {
                id: resultado.rows[0].id,
                criado_em: resultado.rows[0].criado_em
            }
        });

    } catch (erro) {
        console.error(
            "Erro ao salvar mensagem de contato:",
            erro.message
        );

        return res.status(500).json({
            mensagem:
                "Erro ao enviar mensagem. Tente novamente."
        });
    }
});

// ----- FIM - CADASTRAR MENSAGEM DE CONTATO -----

// ----- INICIO - VERIFICAR ACESSO ADMINISTRATIVO -----

app.get(
    "/api/admin/verificar",
    autenticar,
    verificarAdmin,
    (req, res) => {
        return res.status(200).json({
            mensagem:
                "Acesso administrativo autorizado!",
            usuario_id: req.usuario.id,
            perfil: "admin"
        });
    }
);

// ----- FIM - VERIFICAR ACESSO ADMINISTRATIVO -----

// ----- INICIO - LISTAR AGENDAMENTOS ADMIN -----

app.get(
    "/api/admin/agendamentos",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    a.id,
                    u.nome AS cliente,
                    b.nome AS barbeiro,
                    s.nome AS servico,
                    a.data_hora,
                    a.status
                 FROM public.agendamentos a
                 INNER JOIN public.usuarios u
                    ON u.id = a.usuario_id
                 INNER JOIN public.barbeiros b
                    ON b.id = a.barbeiro_id
                 INNER JOIN public.servicos s
                    ON s.id = a.servico_id
                 ORDER BY a.data_hora DESC
                 LIMIT 500`
            );

            return res.json({
                agendamentos: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao listar agendamentos:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao consultar agendamentos."
            });
        }
    }
);

// ----- FIM - LISTAR AGENDAMENTOS ADMIN -----

// ----- INICIO - LISTAR CLIENTES ADMIN -----

app.get(
    "/api/admin/clientes",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT id, nome, email, whatsapp
                 FROM public.usuarios
                 WHERE perfil = 'cliente'
                 ORDER BY nome ASC
                 LIMIT 500`
            );

            return res.json({
                clientes: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao listar clientes:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao consultar clientes."
            });
        }
    }
);

// ----- FIM - LISTAR CLIENTES ADMIN -----

// ----- INICIO - LISTAR SERVICOS ADMIN -----

app.get(
    "/api/admin/servicos",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    id,
                    nome,
                    descricao,
                    preco,
                    duracao_minutos,
                    ativo
                 FROM public.servicos
                 ORDER BY nome ASC`
            );

            return res.status(200).json({
                servicos: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao listar serviços:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao consultar serviços."
            });
        }
    }
);

// ----- FIM - LISTAR SERVICOS ADMIN -----

// ----- INICIO - VALIDAR DADOS DOS SERVICOS -----

function validarServico(dados) {
    const {
        nome,
        descricao,
        preco,
        duracao_minutos
    } = dados || {};

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.trim().length > 150 ||
        (
            descricao != null &&
            typeof descricao !== "string"
        ) ||
        (
            typeof descricao === "string" &&
            descricao.trim().length > 1000
        )
    ) {
        return null;
    }

    const precoTexto = String(preco ?? "")
        .trim()
        .replace(",", ".");

    const precoNumero = Number(precoTexto);
    const duracao = Number(duracao_minutos);

    if (
        !/^\d+(\.\d{1,2})?$/.test(precoTexto) ||
        !Number.isFinite(precoNumero) ||
        precoNumero <= 0 ||
        precoNumero > 99999.99 ||
        !Number.isInteger(duracao) ||
        duracao < 1 ||
        duracao > 540
    ) {
        return null;
    }

    return {
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        preco: precoNumero,
        duracao_minutos: duracao
    };
}

// ----- FIM - VALIDAR DADOS DOS SERVICOS -----

// ----- INICIO - CADASTRAR SERVICO ADMIN -----

app.post(
    "/api/admin/servicos",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const dados = validarServico(req.body);

            if (!dados) {
                return res.status(400).json({
                    mensagem:
                        "Informe nome, preço e duração válidos."
                });
            }

            const resultado = await pool.query(
                `INSERT INTO public.servicos
                    (
                        nome,
                        descricao,
                        preco,
                        duracao_minutos
                    )
                 VALUES ($1, $2, $3, $4)
                 RETURNING
                    id,
                    nome,
                    descricao,
                    preco,
                    duracao_minutos,
                    ativo`,
                [
                    dados.nome,
                    dados.descricao,
                    dados.preco,
                    dados.duracao_minutos
                ]
            );

            return res.status(201).json({
                mensagem:
                    "Serviço cadastrado com sucesso!",
                servico: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao cadastrar serviço:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao cadastrar serviço."
            });
        }
    }
);

// ----- FIM - CADASTRAR SERVICO ADMIN -----

// ----- INICIO - EDITAR SERVICO ADMIN -----

app.put(
    "/api/admin/servicos/:id",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const dados = validarServico(req.body);

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                !dados
            ) {
                return res.status(400).json({
                    mensagem:
                        "ID ou dados do serviço inválidos."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.servicos
                 SET nome = $1,
                     descricao = $2,
                     preco = $3,
                     duracao_minutos = $4
                 WHERE id = $5
                 RETURNING
                    id,
                    nome,
                    descricao,
                    preco,
                    duracao_minutos,
                    ativo`,
                [
                    dados.nome,
                    dados.descricao,
                    dados.preco,
                    dados.duracao_minutos,
                    id
                ]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem: "Serviço não encontrado."
                });
            }

            return res.status(200).json({
                mensagem:
                    "Serviço atualizado com sucesso!",
                servico: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao editar serviço:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao atualizar serviço."
            });
        }
    }
);

// ----- FIM - EDITAR SERVICO ADMIN -----

// ----- INICIO - ATIVAR OU DESATIVAR SERVICO -----

app.patch(
    "/api/admin/servicos/:id/status",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { ativo } = req.body || {};

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                typeof ativo !== "boolean"
            ) {
                return res.status(400).json({
                    mensagem: "ID ou status inválido."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.servicos
                 SET ativo = $1
                 WHERE id = $2
                 RETURNING id, nome, ativo`,
                [ativo, id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem: "Serviço não encontrado."
                });
            }

            return res.status(200).json({
                mensagem: ativo
                    ? "Serviço ativado com sucesso!"
                    : "Serviço desativado com sucesso!",
                servico: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao alterar status do serviço:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao alterar status do serviço."
            });
        }
    }
);

// ----- FIM - ATIVAR OU DESATIVAR SERVICO -----

// ----- INICIO - LISTAR MENSAGENS ADMIN -----

app.get(
    "/api/admin/mensagens",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const resultado = await pool.query(
                `SELECT
                    id,
                    nome,
                    telefone,
                    email,
                    assunto,
                    mensagem,
                    status,
                    criado_em
                 FROM public.contatos
                 ORDER BY criado_em DESC
                 LIMIT 500`
            );

            return res.json({
                mensagens: resultado.rows
            });

        } catch (erro) {
            console.error(
                "Erro ao listar mensagens:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao consultar mensagens."
            });
        }
    }
);

// ----- FIM - LISTAR MENSAGENS ADMIN -----

// ----- INICIO - ATUALIZAR STATUS DAS MENSAGENS -----

app.patch(
    "/api/admin/mensagens/:id/status",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { status } = req.body || {};

            const statusPermitidos = [
                "nao_lida",
                "lida",
                "respondida"
            ];

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                !statusPermitidos.includes(status)
            ) {
                return res.status(400).json({
                    mensagem:
                        "ID ou status da mensagem inválido."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.contatos
                 SET status = $1
                 WHERE id = $2
                 RETURNING id, nome, status`,
                [status, id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem: "Mensagem não encontrada."
                });
            }

            return res.status(200).json({
                mensagem:
                    "Status da mensagem atualizado com sucesso!",
                contato: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao atualizar mensagem:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao atualizar o status da mensagem."
            });
        }
    }
);

// ----- FIM - ATUALIZAR STATUS DAS MENSAGENS -----

// ----- INICIO - CANCELAR AGENDAMENTO ADMIN -----

app.patch(
    "/api/admin/agendamentos/:id/cancelar",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (
                !Number.isSafeInteger(id) ||
                id <= 0
            ) {
                return res.status(400).json({
                    mensagem:
                        "ID do agendamento inválido."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.agendamentos
                 SET status = 'cancelado'
                 WHERE id = $1
                   AND status = 'agendado'
                   AND data_hora > NOW()
                 RETURNING id, status`,
                [id]
            );

            if (resultado.rowCount === 0) {
                return res.status(409).json({
                    mensagem:
                        "Agendamento não encontrado, já cancelado ou com horário encerrado."
                });
            }

            return res.status(200).json({
                mensagem:
                    "Agendamento cancelado com sucesso!",
                agendamento: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao cancelar agendamento pelo administrador:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Não foi possível cancelar o agendamento."
            });
        }
    }
);

// ----- FIM - CANCELAR AGENDAMENTO ADMIN -----

// ----- INICIO - VALIDAR DADOS DOS BARBEIROS -----

function validarBarbeiro(dados) {
    const {
        nome,
        whatsapp,
        especialidade
    } = dados || {};

    if (
        typeof nome !== "string" ||
        !nome.trim() ||
        nome.trim().length > 150 ||
        (
            whatsapp != null &&
            typeof whatsapp !== "string"
        ) ||
        (
            especialidade != null &&
            typeof especialidade !== "string"
        )
    ) {
        return null;
    }

    const nomeLimpo = nome.trim();
    const whatsappLimpo = whatsapp?.trim() || null;
    const especialidadeLimpa =
        especialidade?.trim() || null;

    if (
        (
            whatsappLimpo &&
            whatsappLimpo.length > 20
        ) ||
        (
            especialidadeLimpa &&
            especialidadeLimpa.length > 150
        )
    ) {
        return null;
    }

    return {
        nome: nomeLimpo,
        whatsapp: whatsappLimpo,
        especialidade: especialidadeLimpa
    };
}

// ----- FIM - VALIDAR DADOS DOS BARBEIROS -----

// ----- INICIO - CADASTRAR BARBEIRO ADMIN -----

app.post(
    "/api/admin/barbeiros",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const dados = validarBarbeiro(req.body);

            if (!dados) {
                return res.status(400).json({
                    mensagem:
                        "Informe os dados válidos do barbeiro."
                });
            }

            const resultado = await pool.query(
                `INSERT INTO public.barbeiros
                    (nome, whatsapp, especialidade)
                 VALUES ($1, $2, $3)
                 RETURNING
                    id,
                    nome,
                    whatsapp,
                    especialidade,
                    ativo`,
                [
                    dados.nome,
                    dados.whatsapp,
                    dados.especialidade
                ]
            );

            return res.status(201).json({
                mensagem:
                    "Barbeiro cadastrado com sucesso!",
                barbeiro: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao cadastrar barbeiro:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao cadastrar barbeiro."
            });
        }
    }
);

// ----- FIM - CADASTRAR BARBEIRO ADMIN -----

// ----- INICIO - EDITAR BARBEIRO ADMIN -----

app.put(
    "/api/admin/barbeiros/:id",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const dados = validarBarbeiro(req.body);

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                !dados
            ) {
                return res.status(400).json({
                    mensagem: "Dados do barbeiro inválidos."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.barbeiros
                 SET nome = $1,
                     whatsapp = $2,
                     especialidade = $3
                 WHERE id = $4
                 RETURNING
                    id,
                    nome,
                    whatsapp,
                    especialidade,
                    ativo`,
                [
                    dados.nome,
                    dados.whatsapp,
                    dados.especialidade,
                    id
                ]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem: "Barbeiro não encontrado."
                });
            }

            return res.status(200).json({
                mensagem:
                    "Barbeiro atualizado com sucesso!",
                barbeiro: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao editar barbeiro:",
                erro.message
            );

            return res.status(500).json({
                mensagem: "Erro ao atualizar barbeiro."
            });
        }
    }
);

// ----- FIM - EDITAR BARBEIRO ADMIN -----

// ----- INICIO - ATIVAR OU DESATIVAR BARBEIRO -----

app.patch(
    "/api/admin/barbeiros/:id/status",
    autenticar,
    verificarAdmin,
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { ativo } = req.body || {};

            if (
                !Number.isSafeInteger(id) ||
                id <= 0 ||
                typeof ativo !== "boolean"
            ) {
                return res.status(400).json({
                    mensagem: "ID ou status inválido."
                });
            }

            const resultado = await pool.query(
                `UPDATE public.barbeiros
                 SET ativo = $1
                 WHERE id = $2
                 RETURNING id, nome, ativo`,
                [ativo, id]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    mensagem: "Barbeiro não encontrado."
                });
            }

            return res.status(200).json({
                mensagem: ativo
                    ? "Barbeiro ativado com sucesso!"
                    : "Barbeiro desativado com sucesso!",
                barbeiro: resultado.rows[0]
            });

        } catch (erro) {
            console.error(
                "Erro ao alterar status:",
                erro.message
            );

            return res.status(500).json({
                mensagem:
                    "Erro ao alterar status do barbeiro."
            });
        }
    }
);

// ----- FIM - ATIVAR OU DESATIVAR BARBEIRO -----

// ----- INICIO - INICIAR SERVIDOR -----

app.listen(PORT, () => {
    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );
});

// ----- FIM - INICIAR SERVIDOR -----
