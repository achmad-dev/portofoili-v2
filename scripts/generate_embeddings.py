import glob
import os

import psycopg2
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Configuration
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
CONTENT_DIR = os.path.join("..", "client", "src", "content")

if not GEMINI_API_KEY:
    print("Error: VITE_GEMINI_API_KEY is not set.")
    exit(1)

if not SUPABASE_URL:
    print("Error: SUPABASE_URL is not set.")
    exit(1)

# Configure Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)


def get_embedding(text):
    """Gets the embedding vector for the given text using Gemini."""
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return result.embeddings[0].values


def main():
    # Connect to PostgreSQL
    try:
        conn = psycopg2.connect(SUPABASE_URL)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        exit(1)

    # Execute schema to ensure tables exist
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")
    try:
        with open(schema_path, "r", encoding="utf-8") as schema_file:
            cursor.execute(schema_file.read())
            conn.commit()
            print("Successfully verified/created database schema.")
    except Exception as e:
        print(f"Failed to execute schema.sql: {e}")
        conn.rollback()

    # Clear all existing documents before re-parsing
    print("Clearing existing document embeddings...")
    try:
        cursor.execute("TRUNCATE TABLE documents RESTART IDENTITY")
        conn.commit()
        print("Successfully cleared all existing documents.")
    except Exception as e:
        print(f"Failed to clear existing documents: {e}")
        conn.rollback()
        exit(1)

    # Resolve content directory relative to script location
    base_dir = os.path.dirname(os.path.abspath(__file__))
    content_path = os.path.normpath(os.path.join(base_dir, CONTENT_DIR))

    if not os.path.exists(content_path):
        print(f"Error: Content directory not found at {content_path}")
        exit(1)

    # Recursively find all .md files under content/ (including subfolders like blog/)
    md_files = glob.glob(os.path.join(content_path, "**", "*.md"), recursive=True)
    # Also pick up .md files directly in content/ (about.md, contact.md, etc.)
    md_files += glob.glob(os.path.join(content_path, "*.md"))

    # Deduplicate in case of overlap and sort for consistent output
    md_files = sorted(set(md_files))

    print(f"Found {len(md_files)} markdown files.")

    for filepath in md_files:
        # Use relative path from content dir as filename to avoid collisions (e.g. blog/react-hooks.md)
        filename = os.path.relpath(filepath, content_path)
        print(f"Processing {filename}...")

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        try:
            embedding = get_embedding(content)

            # Format embedding as pgvector-compatible string
            embedding_str = f"[{','.join(map(str, embedding))}]"

            # Upsert: update if exists, insert if not
            cursor.execute("SELECT id FROM documents WHERE filename = %s", (filename,))
            result = cursor.fetchone()

            if result:
                print(f"  Updating existing record for {filename}")
                cursor.execute(
                    "UPDATE documents SET content = %s, embedding = %s::vector WHERE filename = %s",
                    (content, embedding_str, filename),
                )
            else:
                print(f"  Inserting new record for {filename}")
                cursor.execute(
                    "INSERT INTO documents (filename, content, embedding) VALUES (%s, %s, %s::vector)",
                    (filename, content, embedding_str),
                )

            conn.commit()
            print(f"  Successfully processed {filename}")

        except Exception as e:
            print(f"  Error processing {filename}: {e}")
            conn.rollback()

    cursor.close()
    conn.close()
    print("Done!")


if __name__ == "__main__":
    main()
