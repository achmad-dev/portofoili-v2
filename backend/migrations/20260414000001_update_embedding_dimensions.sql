-- Migration: update_embedding_dimensions
-- gemini-embedding-001 outputs 3072 dimensions, not 768

-- Drop the existing match_documents function first (required before altering column type)
DROP FUNCTION IF EXISTS match_documents(vector(768), float, int);

-- Alter the embedding column to 3072 dimensions
ALTER TABLE documents
  ALTER COLUMN embedding TYPE vector(3072)
  USING embedding::text::vector(3072);

-- Recreate match_documents with updated dimensions
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  filename TEXT,
  content TEXT,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    documents.id,
    documents.filename,
    documents.content,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
