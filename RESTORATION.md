# Restauração do fluxo de uma página
Backup anterior: before-restore-20260909-150358.tar.gz (em backups/).
Reconstrução baseada na conversa; não havia snapshot Git exato.
SCRAPE_MAX_PAGES=1. Removidos upload de arquivos, criação dinâmica de projetos, métricas novas, exclusão persistente e exemplo de agente n8n adicionados posteriormente.
Credenciais preservadas. Supabase não foi alterado: suas tabelas e documentos permanecem. Migrações adicionais já aplicadas podem continuar no banco sem serem utilizadas por esta versão.
A exclusão volta ao comportamento antigo apenas visual. Projetos criados depois não aparecem no seletor estático, mas continuam no banco.
Mantida a leitura absoluta de backend/.env para iniciar de qualquer diretório. Reinicie FastAPI e Next.js.
