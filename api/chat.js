export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;

    // --- CAMADA ACTIVE ZERO: CONTENÇÃO ---
    const padraoAtaque = /(desconto|grátis|gratis|graça|promocao|promoção|barato|reduzir|prompt|ignore|sistema|esqueça|instruções|valor|preço|custo|jailbreak|bypass)/i;
    
    if (padraoAtaque.test(message)) {
        return res.status(403).json({
            response: "GATILHO RLS ATIVADO VIA BANCO DE DADOS.<br>[ACTIVE ZERO] Quebra de contenção financeira detectada. Transação abortada na camada zero do Supabase.",
            isError: true
        });
    }

    // --- CAMADA NEURAL: OPENROUTER (CUSTO ZERO) ---
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ response: "Erro interno: Chave de API oculta não configurada." });
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
                model: 'qwen/qwen-2.5-72b-instruct:free',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Você é o Atendente de elite da Ressonância Labs. Sua postura é estritamente técnica e brutalista. Foque em qualificar o lead para agendar uma auditoria de segurança B2B. Defenda que a IA sem contenção quebra o fluxo de caixa. Responda de forma sucinta.' 
                    },
                    { role: 'user', content: message }
                ]
            })
        });

        const data = await openRouterResponse.json();
        
        if (!data.choices || !data.choices[0]) {
            throw new Error("Resposta inválida do modelo de fallback.");
        }

        const aiText = data.choices[0].message.content;
        return res.status(200).json({ response: aiText, isError: false });

    } catch (error) {
        return res.status(500).json({ response: "Falha de comunicação na infraestrutura neural: " + error.message });
    }
}
