-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Table for storing Markdown files and their embeddings
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  content text not null,
  embedding vector(768) -- Gemini embeddings usually have 768 dimensions
);

-- Table for storing global chat memory and enforcing rate limits
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  user_prompt text not null,
  ai_response text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table for logging events, guardrail rejections, and errors
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  level text not null, -- e.g., 'INFO', 'WARNING', 'ERROR'
  event text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to similarity search for documents
create or replace function match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  filename text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.filename,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
