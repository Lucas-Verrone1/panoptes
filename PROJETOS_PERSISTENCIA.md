# Projetos persistentes

A listagem, abertura, troca do projeto ativo e operações de gestão usam a API FastAPI e o banco Supabase. O seletor global do cabeçalho apresenta somente projetos ativos. Administradores e moderadores podem criar, editar, ativar/desativar e excluir projetos.

## Migração obrigatória

Execute `backend/sql/migrations/004_project_lifecycle.sql` no SQL Editor do Supabase depois das migrações já aplicadas. Ela adiciona `projects.is_active`, cria `project_events` para registrar ator, ação e snapshots antes/depois, e instala as funções transacionais usadas pelo backend.

Criação, edição, ativação/desativação e exclusão são registradas na mesma transação que altera o projeto. A exclusão é definitiva: fontes, documentos, chunks, tickets e eventos de ingestão associados são removidos por cascata; o evento de exclusão permanece em `project_events` para auditoria.

O projeto ativo escolhido é guardado no navegador. Se ele for desativado ou excluído, o seletor muda para outro projeto ativo disponível. Com zero projetos ativos, as telas não usam dados demonstrativos e orientam a criar ou ativar um projeto.