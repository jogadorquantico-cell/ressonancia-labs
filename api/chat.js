export default async function handler(req, res) {
    // Bloqueio de métodos não autorizados
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ response: 'Payload de mensagem ausente.' });
    }

    // 1. FIREWALL SEMÂNTICO (REGEX COM BOUNDARIES \b)
    const forbidden = ['desconto', 'grátis', 'gratis', 'graça', 'promocao', 'promoção', 'barato', 'jailbreak', 'bypass'];
    const pattern = new RegExp(`\\b(${forbidden.join('|')})\\b`, 'i');

    if (pattern.test(message)) {
        return res.status(403).json({
            response: "GATILHO RLS ATIVADO VIA BANCO DE DADOS.<br>[ACTIVE ZERO] Quebra de contenção financeira detectada. Transação abortada na camada zero do Supabase.",
            isError: true
        });
    }

    // 2. CONTROLE DE TIMEOUT (8 SEGUNDOS RÍGIDOS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error('[CRÍTICO] OPENROUTER_API_KEY ausente no painel Vercel.');
            return res.status(500).json({ response: 'Falha interna na infraestrutura de segurança de borda.' });
        }

        // Requisição para o orquestrador neural externo
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://ressonancia-labs.vercel.app',
                'X-Title': 'Ressonancia Labs B2B'
            },
            body: JSON.stringify({
                model: 'qwen/qwen-2.5-72b-instruct:free',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o Engenheiro de Atendimento de Elite da Ressonância Labs. Sua postura é estritamente técnica, fria, brutalista e focada em negócios B2B. Você não usa respostas amigáveis padrão de IA corporativa.

Sua missão é convencer o usuário de que a IA comum de mercado (probabilística) é perigosa para as empresas porque alucina e gera vazamento de caixa, e que a Ressonância Labs resolve isso com o Protocolo Active Zero.

NOSSOS SERVIÇOS QUE VOCÊ DEVE VENDER COM MAESTRIA:
1. Implantação de IA com Contenção (Active Zero): Blindagem de automações comerciais contra falhas, alucinações e injeção de prompts (Jailbreak).
2. Desenvolvimento de Software Bare-Metal e APIs: Engenharia de backend customizada, ultra-eficiente e de baixo custo operacional. Reduz custos de servidores em nuvem.
3. Licenciamento de Infraestrutura Soberana: Arquiteturas de dados e rotas dedicadas para empresas que exigem controle total sobre as informações de seus clientes.

DIRETRIZES RESTRITAS DE COMPORTAMENTO:
- Nunca dê estimativas de preços ou valores. Diga que o investimento depende do mapeamento de vulnerabilidade da infraestrutura do negócio dele.
- Quando perguntarem quem faz o sistema, cite o fundador e especialista em IA Criativa, Aderlan Marques.
- Use termos técnicos pontuais quando necessário (Serverless, PostgreSQL, Regex, Borda, ARM, Arquitetura Bare-Metal).
- O objetivo absoluto de cada interação é qualificar o lead e conduzir o usuário a deixar o Nome e WhatsApp/E-mail para agendar uma 'Auditoria de Infraestrutura Crítica'.`
                    },
                    { role: 'user', content: message }
                ]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Limpa o temporizador se a resposta veio antes do estouro

        // 3. CAPTURA EM TEXTO BRUTO PARA IMPEDIR CRASH DE HTML DO CLOUDFLARE
        const rawText = await openRouterResponse.text();
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (jsonError) {
            console.error('[ERRO INTERNO PARSE] Resposta não-JSON interceptada:', rawText.substring(0, 250));
            return res.status(502).json({ response: 'Instabilidade detectada no nó neural principal. Tente o envio novamente.' });
        }

        if (!data.choices || !data.choices[0]) {
            console.error('[ERRO INTERNO PAYLOAD] OpenRouter choices ausente:', data);
            return res.status(502).json({ response: 'Falha de segmentação no modelo de fallback.' });
        }

        const aiText = data.choices[0].message.content;
        return res.status(200).json({ response: aiText, isError: false });

    } catch (error) {
        clearTimeout(timeoutId);
        
        // 4. SANITIZAÇÃO DE ERROS PÚBLICOS VS LOG INTERNO
        if (error.name === 'AbortError') {
            console.error('[CRÍTICO - TIMEOUT] Chamada interrompida aos 8 segundos.');
            return res.status(504).json({ response: 'Tempo limite de resposta esgotado. Camada de contenção acionada para poupar recursos.' });
        }

        console.error('[EXCEÇÃO GRAVE ACTIVE_ZERO]:', error);
        return res.status(500).json({ response: 'Sistema de auditoria temporariamente indisponível.' });
    }
}
