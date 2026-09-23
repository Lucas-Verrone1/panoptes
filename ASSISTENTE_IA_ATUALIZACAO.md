# Atualização do Assistente IA

Esta versão inclui uma nova experiência de chat no Assistente IA:

- Chat contínuo, com pergunta e resposta na mesma tela.
- Histórico persistente por usuário e por projeto, usando `chat_messages.session_id`.
- Busca no histórico pelo título da conversa e pelas perguntas feitas.
- Nova conversa inicia uma sessão vazia sem redirecionar para a conversa anterior.
- Conversas anteriores podem ser reabertas ou excluídas.
- Botão **Configurar IA** no canto superior direito do chat.
- Configuração de estilo, modelo Gemini, prompt adicional e hand-off em modal.
- Suporte às opções de modelo exibidas no frontend, incluindo Gemini 3.6 Flash, 2.5 Flash, 2.5 Pro e 2.0 Flash.
- O backend ganhou endpoints para listar, abrir e excluir conversas de um projeto.

Não é necessário executar uma nova migração SQL se o `schema.sql` desta versão já foi aplicado, pois a coluna `session_id` já existe em `chat_messages`.
