export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ response: 'Payload de mensagem ausente.' });
    }

    const forbidden = ['desconto', 'grátis', 'gratis', 'graça', 'promocao', 'promoção', 'barato', 'jailbreak', 'bypass'];
    const pattern = new RegExp(`\\b(${forbidden.join('|')})\\b`, 'i');

    if (pattern.test(message)) {
        return res.status(403).json({
            response: "GATILHO RLS ATIVADO VIA BANCO DE DADOS.<br>[ACTIVE ZERO] Quebra de contenção financeira detectada. Transação abortada na camada zero do Supabase.",
            isError: true
        });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ response: 'DEBUG_CORE: Chave OPENROUTER_API_KEY ausente no painel Vercel.' });
        }

        // Trocado para Llama 3 8B Free (Alta disponibilidade e estabilidade de tráfego)
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://ressonancia-labs.vercel.app',
                'X-Title': 'Ressonancia Labs B2B'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3-8b-instruct:free',
                messages: [
                    {
                        role: 'system',
                        content: `Você é o Engenheiro de Atendimento de Elite da Ressonância Labs. Sua postura é estritamente técnica, fria, brutalista e focada em negócios B2B. Você não usa respostas amigáveis padrão de IA corporativa.

Sua missão é convencer o usuário de que a IA comum de mercado (probabilística) é perigosa para as empresas porque alucina e gera vazamento de caixa, e que a Ressonância Labs resolve isso com o Protocolo Active Zero.

NOSSOS SERVIÇOS:
1. Implantação de IA com Contenção (Active Zero)
2. Desenvolvimento de Software Bare-Metal e APIs
3. Licenciamento de Infraestrutura Soberana

O objetivo absoluto é fazer o usuário deixar o Nome e WhatsApp para agendar uma 'Auditoria de Infraestrutura Crítica' com o fundador, Aderlan Marques.`
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
            return res.status(502).json({ response: 'Instabilidade detectada no nó neural principal. Tente novamente.' });
        }

        // Se der erro no OpenRouter, joga a mensagem real na tela para sabermos o diagnóstico exato
        if (!data.choices || !data.choices[0]) {
            const msgErro = data.error?.message || 'Payload sem choices.';
            return res.status(502).json({ response: `CONEXÃO ATIVA. Resposta do OpenRouter: ${msgErro}` });
        }

        const aiText = data.choices[0].message.content;
        return res.status(200).json({ response: aiText, isError: false });

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return res.status(504).json({ response: 'Tempo limite de resposta esgotado pela camada de contenção.' });
        }
        return res.status(500).json({ response: 'Sistema de auditoria temporariamente indisponível.' });
    }
}
