import os
import ssl
from pathlib import Path

# Force bypass ALL SSL checks
os.environ["HF_HUB_DISABLE_SSL_VERIFICATION"] = "1"
os.environ["CURL_CA_BUNDLE"] = ""
os.environ["REQUESTS_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context

# For httpx (used by huggingface_hub under the hood)
import httpx
original_init = httpx.Client.__init__

def patched_init(self, *args, **kwargs):
    kwargs["verify"] = False
    original_init(self, *args, **kwargs)

httpx.Client.__init__ = patched_init

from huggingface_hub import snapshot_download

print("Downloading Chatterbox... This is a 4GB file and will take a few minutes depending on your internet.")
try:
    snapshot_download(
        repo_id="ResembleAI/chatterbox-turbo",
        cache_dir=Path("AI-Arena-Chatterbox-cache"),
        local_files_only=False,
        resume_download=True
    )
    print("✅ Chatterbox downloaded successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
