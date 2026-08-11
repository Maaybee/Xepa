-- Dados de apoio compartilhados. Idempotente: pode rodar quantas vezes for.
--
-- Não semeia CATEGORIA: a categoria financeira pertence ao usuário, então o
-- conjunto padrão (incluindo "Mercado", exigida pela RN18) é criado no
-- cadastro, pelo ContaService.

-- RN04 — a foto de perfil sai apenas desta lista.
INSERT INTO avatar (descricao, url)
SELECT v.descricao, v.url
FROM (VALUES
  ('Feira',      'avatares/feira.png'),
  ('Caixote',    'avatares/caixote.png'),
  ('Sacola',     'avatares/sacola.png'),
  ('Banca',      'avatares/banca.png'),
  ('Panela',     'avatares/panela.png'),
  ('Caderno',    'avatares/caderno.png'),
  ('Cafezinho',  'avatares/cafezinho.png'),
  ('Varal',      'avatares/varal.png')
) AS v (descricao, url)
WHERE NOT EXISTS (SELECT 1 FROM avatar a WHERE a.url = v.url);

-- Instituições com integração de notas prevista (RF023, RN05).
INSERT INTO instituicao (nome)
SELECT v.nome
FROM (VALUES
  ('Instituto Federal de São Paulo (IFSP)'),
  ('Universidade de São Paulo (USP)'),
  ('Universidade Estadual de Campinas (Unicamp)'),
  ('Universidade Estadual Paulista (Unesp)'),
  ('Universidade Federal de São Paulo (Unifesp)')
) AS v (nome)
WHERE NOT EXISTS (SELECT 1 FROM instituicao i WHERE i.nome = v.nome);
