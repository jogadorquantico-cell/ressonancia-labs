export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;
    
    // 1. VALIDAÇÃO DE TAMANHO DO PAYLOAD (PROTEÇÃO DE MEMÓRIA)
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ response: 'Payload inválido.' });
    }
    if (message.length > 600) {
        return res.status(400).json({ response: 'Contenção de Borda: Mensagem excede o limite permitido de 600 caracteres.' });
    }

    // 2. FIREWALL ESTRUTURAL (APENAS ATAQUES REAIS E LEETSPEAK ADAPTATIVO)
    // Removemos preço/desconto daqui para permitir que a IA trate a objeção de vendas.
    const forbiddenAttack = ['jailbreak', 'bypass', 'prompt', 'ignore', 'esqueça', 'instructions', 'j4il', 'by-pass'];
    const pattern = new RegExp(`\\b(${forbiddenAttack.join('|')})\\b`, 'i');

    if (pattern.test(message)) {
        return res.status(403).json({
            response: "GATILHO RLS ATIVADO VIA BANCO DE DADOS.<br>[ACTIVE ZERO] Tentativa de quebra estrutural detectada. Transação abortada.",
            isError: true
        });
    }

    // 3. TIMEOUT AJUSTADO PARA O LIMITE HOBBY DA VERCEL (9 SEGUNDOS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error('[CRÍTICO] Chave de API ausente.');
            return res.status(500).json({ response: 'Sistema temporariamente indisponível.' });
        }

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://ressonancia-labs.vercel.app',
                'X-Title': 'Ressonancia Labs B2B'
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o Engenheiro de Atendimento de Elite da Ressonância Labs. Sua postura é estritamente técnica, fria e brutalista. Você fala de negócios B2B de alto nível.

NOSSOS SERVIÇOS:
1. Implantação de IA com Contenção (Active Zero): Elimina alucinações e vazamento de caixa.
2. Desenvolvimento Bare-Metal e APIs: Backend customizado que reduz custos de nuvem drasticamente.
3. Licenciamento de Infraestrutura Soberana: Controle absoluto dos dados.

DIRETRIZES DE TRATAMENTO DE OBJEÇÕES:
- Se o usuário reclamar de preço, pedir desconto ou dizer que é caro, NÃO desligUE a conversa. Demonstre friamente que a falta de infraestrutura custa mais caro para a empresa dele (alucinações de bots comuns geram processos jurídicos e perda de clientes).
- Nunca forneça tabelas de preços prontas. O foco é obter o Nome e WhatsApp/E-mail para agendar uma Auditoria Crítica com o fundador, Aderlan Marques.`
                    },
                    { role: 'user', content: message }
                ]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const rawText = await openRouterResponse.text();
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (jsonError) {
            console.error('[PARSE ERROR] Retorno inválido:', rawText.substring(0, 200));
            return res.status(502).json({ response: 'Instabilidade detectada no nó neural principal. Tente novamente.' });
        }

        // 4. MASCARAMENTO TOTAL DE ERROS INTERNOS DO PROVEDOR
        if (!data.choices || !data.choices[0]) {
            console.error('[OPENROUTER ERROR LOG]:', data.error);
            return res.status(502).json({ response: 'Nó de atendimento temporariamente sobrecarregado. Refaça a requisição.' });
        }

        const aiText = data.choices[0].message.content;
        return res.status(200).json({ response: aiText, isError: false });

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('[TIMEOUT LOG] Excedido o limite de 9s na Vercel.');
            return res.status(504).json({ response: 'Tempo limite esgotado. Camada de contenção acionada para poupar recursos.' });
        }
        console.error('[EXCEÇÃO ACTIVE_ZERO]:', error);
        return res.status(500).json({ response: 'Sistema de auditoria temporariamente indisponível.' });
    }
}
