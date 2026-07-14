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

WATSONX_URL        = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_API_KEY    = os.getenv("WATSONX_API_KEY", "")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "")

if not WATSONX_API_KEY:    sys.exit("Error: WATSONX_API_KEY is not set.")
if not WATSONX_PROJECT_ID: sys.exit("Error: WATSONX_PROJECT_ID is not set.")

print(f"Connecting to {WATSONX_URL} ...")
model = ModelInference(
    model_id="meta-llama/llama-3-3-70b-instruct",
    api_client=APIClient(Credentials(url=WATSONX_URL, api_key=WATSONX_API_KEY)),
    project_id=WATSONX_PROJECT_ID,
)

print("Sending test prompt ...")
response = model.generate_text(prompt="Say 'Hello, world!' and nothing else.")
print(f"\nResponse: {response}")
print("\n✓ Credentials are working.")
