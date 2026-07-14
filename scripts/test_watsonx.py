#!/usr/bin/env python3
"""
Quick sanity check for watsonx.ai credentials.
Usage:
    export WATSONX_API_KEY="..."
    export WATSONX_PROJECT_ID="..."
    python scripts/test_watsonx.py
"""

import os, sys

try:
    from ibm_watsonx_ai import APIClient, Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference
except ImportError:
    sys.exit("Missing dependency: pip install ibm-watsonx-ai")

WATSONX_URL        = os.getenv("WATSONX_URL", "https://eu-gb.ml.cloud.ibm.com")
WATSONX_API_KEY    = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")

if not WATSONX_API_KEY:    sys.exit("Error: WATSONX_API_KEY is not set.")
if not WATSONX_PROJECT_ID: sys.exit("Error: WATSONX_PROJECT_ID is not set.")

MODEL_ID = "meta-llama/llama-4-maverick-17b-128e-instruct-fp8"

print(f"Connecting to {WATSONX_URL} ...")
model = ModelInference(
    model_id=MODEL_ID,
    api_client=APIClient(Credentials(url=WATSONX_URL, api_key=WATSONX_API_KEY)),
    project_id=WATSONX_PROJECT_ID,
)

print("Sending test prompt ...")
response = model.chat(messages=[{"role": "user", "content": "Say 'Hello, world!' and nothing else."}])
text = response["choices"][0]["message"]["content"].strip()
print(f"\nResponse: {text}")
print("\n✓ Credentials are working.")
