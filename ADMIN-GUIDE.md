# Guia do Administrador - Raspadinha do Lek

## Como Adicionar Imagens das Raspadinhas

### 1. Upload das Imagens
1. Acesse o painel admin do Supabase: [https://supabase.com/dashboard/project/sibdsejxpjgdlpdzcgej/storage/buckets](https://supabase.com/dashboard/project/sibdsejxpjgdlpdzcgej/storage/buckets)
2. Vá para o bucket "raspadinhas"
3. Faça upload das imagens das raspadinhas (formato PNG, JPG ou JPEG recomendado)
4. Copie a URL pública da imagem

### 2. Atualizar a Raspadinha no Banco de Dados
1. Acesse o SQL Editor do Supabase: [https://supabase.com/dashboard/project/sibdsejxpjgdlpdzcgej/sql/new](https://supabase.com/dashboard/project/sibdsejxpjgdlpdzcgej/sql/new)
2. Execute o seguinte comando SQL para atualizar a imagem de uma raspadinha:

```sql
UPDATE raspadinhas 
SET imagem_url = 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/NOME_DA_SUA_IMAGEM.jpg'
WHERE nome = 'NOME_DA_RASPADINHA';
```

**Exemplo:**
```sql
UPDATE raspadinhas 
SET imagem_url = 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/raspadinha-premium.jpg'
WHERE nome = 'Raspadinha Premium';
```

### 3. Verificar as Raspadinhas Existentes
Para ver todas as raspadinhas e seus IDs:
```sql
SELECT id, nome, imagem_url, premio, ativo FROM raspadinhas;
```

### 4. Criar Nova Raspadinha (com Imagem)
```sql
INSERT INTO raspadinhas (nome, premio, chances, imagem_url, ativo) 
VALUES ('Nome da Nova Raspadinha', 100.00, 0.1, 'https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/nova-imagem.jpg', true);
```

## Estrutura de URLs das Imagens
- Bucket: `raspadinhas`
- URL Base: `https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/`
- URL Completa: `https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/NOME_DO_ARQUIVO.jpg`

## Imagem Padrão
Se uma raspadinha não tiver imagem configurada, será usada a imagem padrão:
`https://sibdsejxpjgdlpdzcgej.supabase.co/storage/v1/object/public/raspadinhas/default-scratch.jpg`

## Dicas Importantes
1. **Formato das Imagens**: Use PNG ou JPG com tamanho otimizado (máximo 1MB)
2. **Proporção**: Recomendado 16:9 (widescreen) para melhor visualização
3. **Resolução**: 800x450px é ideal para performance e qualidade
4. **Nomes dos Arquivos**: Use nomes descritivos sem espaços (use hífen ou underscore)

## Solução de Problemas

### Imagem não aparece?
1. Verifique se a URL está correta no banco de dados
2. Confirme se a imagem foi uploadada no bucket correto
3. Verifique se o arquivo tem permissões públicas
4. Teste a URL diretamente no navegador

### Como testar uma URL de imagem:
Cole a URL no navegador. Se aparecer a imagem, está correto. Se não aparecer, verifique o upload no Supabase Storage.