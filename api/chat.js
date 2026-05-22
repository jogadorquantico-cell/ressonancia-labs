export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ response: 'Payload inválido.' });
    }
    if (message.length > 600) {
        return res.status(400).json({ response: 'Contenção de Borda: Mensagem muito longa.' });
    }

    // 1. EXTRAÇÃO DE DADOS
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emailsEncontrados = message.match(emailRegex) || [];
    const emailCapturado = emailsEncontrados.length > 0 ? emailsEncontrados[0] : null;

    const whatsappRegex = /(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g;
    const whatsappsEncontrados = message.match(whatsappRegex) || [];
    const whatsappCapturado = whatsappsEncontrados.length > 0 ? whatsappsEncontrados[0] : null;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // TENTATIVA DE INSERÇÃO COM CAPTURA DE STATUS HTTP
    if (supabaseUrl && supabaseKey) {
        try {
            // Testamos com 'pistas' em minúsculo. Se falhar, o erro dirá o nome correto.
            const dbResponse = await fetch(`${supabaseUrl}/rest/v1/pistas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=representation' 
                },
                body: JSON.stringify({
                    empresa: message.substring(0, 100),
                    "e-mail": emailCapturado,
                    whatsapp: whatsappCapturado,
                    servicos: message,
                    "também": "Debug Ativo"
                })
            });

            if (!dbResponse.ok) {
                const dbErrorText = await dbResponse.text();
                // Força o erro a subir para a interface do utilizador para visualizarmos o diagnóstico
                return res.status(200).json({ 
                    response: `[ERRO SUPABASE DETECTADO]: Status ${dbResponse.status} -> ${dbErrorText}`, 
                    isError: true 
                });
            }
        } catch (supabaseError) {
            return res.status(200).json({ response: `[FALHA DE REDE NO BANCO]: ${supabaseError.message}`, isError: true });
        }
    } else {
        return res.status(200).json({ response: `[ERRO DE INFRAESTRUTURA]: Chaves do Supabase não foram lidas pela Vercel. Verifique as Environment Variables.`, isError: true });
    }

    // 2. CAMADA NEURAL (PROMPT ENCURTADO E BLINDADO CONTRA CORTES)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
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
                        content: `Você é o Engenheiro de Atendimento da Ressonância Labs. Postura fria, técnica e brutalista. Respostas diretas e curtas (máximo 3 parágrafos) para evitar cortes de token. Não use placeholders como [DATA]. Force o agendamento da auditoria com o fundador Aderlan Marques exigindo o WhatsApp.`
                    },
                    { role: 'user', content: message }
                ]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const rawText = await openRouterResponse.text();
        let data = JSON.parse(rawText);
        return res.status(200).json({ response: data.choices[0].message.content, isError: false });

    } catch (error) {
        clearTimeout(timeoutId);
        return res.status(500).json({ response: 'Sistema neural temporariamente indisponível.' });
    }
}
