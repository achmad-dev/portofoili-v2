import os
import glob
import psycopg2
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.environ.get("VITE_GEMINI_API_KEY") # Shared API key env var
SUPABASE_URL = os.environ.get("SUPABASE_URL") # PostgreSQL connection string, e.g. postgres://user:password@host:port/db
BLOG_DIR = os.path.join("..", "client", "src", "content", "blog")

if not GEMINI_API_KEY:
    print("Error: VITE_GEMINI_API_KEY is not set.")
    exit(1)

if not SUPABASE_URL:
    print("Error: SUPABASE_URL is not set.")
    exit(1)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

def get_embedding(text):
    """Gets the embedding vector for the given text using Gemini."""
    # Using text-embedding-004 as recommended by Google for modern embedding tasks
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
    )
    return result['embedding']

def main():
    # Connect to PostgreSQL
    try:
        conn = psycopg2.connect(SUPABASE_URL)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        exit(1)

    # Make sure we're in the right directory relative to where the script is run
    base_dir = os.path.dirname(os.path.abspath(__file__))
    blog_path = os.path.normpath(os.path.join(base_dir, BLOG_DIR))

    if not os.path.exists(blog_path):
        print(f"Error: Blog directory not found at {blog_path}")
        exit(1)

    md_files = glob.glob(os.path.join(blog_path, "*.md"))
    print(f"Found {len(md_files)} markdown files.")

    for filepath in md_files:
        filename = os.path.basename(filepath)
        print(f"Processing {filename}...")

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        try:
            embedding = get_embedding(content)

            # Format embedding as string representation of array for pgvector
            embedding_str = f"[{','.join(map(str, embedding))}]"

            # Check if document already exists
            cursor.execute("SELECT id FROM documents WHERE filename = %s", (filename,))
            result = cursor.fetchone()

            if result:
                print(f"  Updating existing record for {filename}")
                cursor.execute(
                    "UPDATE documents SET content = %s, embedding = %s::vector WHERE filename = %s",
                    (content, embedding_str, filename)
                )
            else:
                print(f"  Inserting new record for {filename}")
                cursor.execute(
                    "INSERT INTO documents (filename, content, embedding) VALUES (%s, %s, %s::vector)",
                    (filename, content, embedding_str)
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
