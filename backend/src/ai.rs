use crate::error::AppError;
use pgvector::Vector;
use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;

#[derive(Serialize)]
#[allow(dead_code)] struct EmbeddingRequest {
    model: String,
    content: String,
    task_type: String,
}

#[derive(Serialize)]
struct ContentPart {
    text: String,
}

#[derive(Serialize)]
struct Content {
    parts: Vec<ContentPart>,
}

#[derive(Serialize)]
struct GenerateContentRequest {
    contents: Vec<Content>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: EmbeddingData,
}

#[derive(Deserialize)]
struct EmbeddingData {
    values: Vec<f32>,
}

#[derive(Deserialize)]
struct GenerateContentResponse {
    candidates: Option<Vec<Candidate>>,
}

#[derive(Deserialize)]
struct Candidate {
    content: Option<CandidateContent>,
}

#[derive(Deserialize)]
struct CandidateContent {
    parts: Option<Vec<CandidatePart>>,
}

#[derive(Deserialize)]
struct CandidatePart {
    text: Option<String>,
}

pub async fn get_embedding(client: &Client, text: &str) -> Result<Vector, AppError> {
    let api_key = env::var("VITE_GEMINI_API_KEY").map_err(|_| AppError::Validation("API key not found".to_string()))?;
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={}", api_key);

    let payload = serde_json::json!({
        "model": "models/text-embedding-004",
        "content": {
            "parts": [{ "text": text }]
        },
        "taskType": "RETRIEVAL_DOCUMENT"
    });

    let res = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Embedding error: {}", e)))?;

    if !res.status().is_success() {
        let err = res.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Embedding API error: {}", err)));
    }

    let parsed: EmbeddingResponse = res.json().await.map_err(|e| AppError::Internal(format!("Parse error: {}", e)))?;
    Ok(Vector::from(parsed.embedding.values))
}

pub async fn generate_content(client: &Client, prompt: &str) -> Result<String, AppError> {
    let api_key = env::var("VITE_GEMINI_API_KEY").map_err(|_| AppError::Validation("API key not found".to_string()))?;
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key={}", api_key);

    let payload = GenerateContentRequest {
        contents: vec![Content {
            parts: vec![ContentPart { text: prompt.to_string() }],
        }],
    };

    let res = client.post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Generation error: {}", e)))?;

    if !res.status().is_success() {
        let err = res.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Generation API error: {}", err)));
    }

    let parsed: GenerateContentResponse = res.json().await.map_err(|e| AppError::Internal(format!("Parse error: {}", e)))?;

    let text = parsed.candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content)
        .and_then(|c| c.parts)
        .and_then(|p| p.into_iter().next())
        .and_then(|p| p.text)
        .unwrap_or_else(|| "No response generated".to_string());

    Ok(text)
}
