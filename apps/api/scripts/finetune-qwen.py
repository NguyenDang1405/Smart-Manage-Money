"""
Qwen2.5 Supervised Fine-Tuning (SFT) Script with QLoRA
=======================================================
Fine-tunes Qwen2.5 on the Smart Money Manager financial dataset.

Requirements (GPU environment recommended):
    pip install torch transformers datasets peft trl accelerate bitsandbytes sentencepiece

Usage:
    # Set your Hugging Face token first (do NOT hardcode it!)
    # Windows PowerShell:
    #   $env:HF_TOKEN = "your_hugging_face_token_here"
    # Linux / macOS / Google Colab:
    #   export HF_TOKEN="your_hugging_face_token_here"

    python scripts/finetune-qwen.py
"""

import os
import sys

# ─── Dependency Check ─────────────────────────────────────────────────────────
REQUIRED_PACKAGES = ["datasets", "torch", "transformers", "peft", "trl", "accelerate"]
MISSING = []
for pkg in REQUIRED_PACKAGES:
    try:
        __import__(pkg)
    except ImportError:
        MISSING.append(pkg)

if MISSING:
    print("=" * 60)
    print("ERROR: Missing required Python packages:")
    for pkg in MISSING:
        print(f"  - {pkg}")
    print()
    print("Install them with:")
    print("  pip install torch transformers datasets peft trl accelerate bitsandbytes sentencepiece")
    print("=" * 60)
    sys.exit(1)

# ─── Imports ──────────────────────────────────────────────────────────────────
# NOTE: These packages are only required at runtime (GPU environment).
# The red underlines below are IDE warnings, not actual code errors.
# Install with: pip install torch transformers datasets peft trl accelerate bitsandbytes
# pyrefly: ignore [missing-import]
from datasets import load_dataset
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
from transformers import (          # pyrefly: ignore [missing-import]
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
# pyrefly: ignore [missing-import]
from peft import LoraConfig, prepare_model_for_kbit_training
# pyrefly: ignore [missing-import]
from trl import SFTTrainer, DataCollatorForCompletionOnlyLM


# ─── Main Training Function ───────────────────────────────────────────────────
def train():
    print("=" * 60)
    print("=== Qwen2.5 Supervised Fine-Tuning (SFT + QLoRA) ===")
    print("=" * 60)

    # 1. Load HF Token from environment variable (NEVER hardcode it!)
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        print("\nERROR: HF_TOKEN environment variable is not set.")
        print("Set it before running:")
        print("  Windows: $env:HF_TOKEN = 'your_token'")
        print("  Linux:   export HF_TOKEN='your_token'")
        sys.exit(1)

    # 2. Configuration
    # Lightweight model for local/Colab GPUs. Change to Qwen2.5-72B-Instruct
    # if you have access to a multi-GPU cluster (A100 80GB x 4+ recommended).
    BASE_MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
    HUB_REPO_ID   = "NguyenDang1405/Qwen2.5-SMM-Financial-Adapter"
    OUTPUT_DIR     = "./qwen-smm-adapter"
    MAX_SEQ_LEN    = 1024

    # 3. Locate dataset
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.normpath(os.path.join(script_dir, "../finetuning_dataset.jsonl"))

    if not os.path.exists(dataset_path):
        print(f"\nERROR: Dataset not found at:\n  {dataset_path}")
        print("Run the preparation script first:")
        print("  npx tsx apps/api/scripts/prepare-finetuning-data.ts")
        sys.exit(1)

    print(f"\nBase model : {BASE_MODEL_ID}")
    print(f"Dataset    : {dataset_path}")
    print(f"Output dir : {OUTPUT_DIR}")

    # 4. Load Dataset
    dataset = load_dataset("json", data_files=dataset_path, split="train")
    print(f"Loaded     : {len(dataset)} training examples\n")

    # 5. Load Tokenizer
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        BASE_MODEL_ID,
        token=hf_token,
        trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # 6. QLoRA / BitsAndBytes 4-bit quantization config
    use_gpu = torch.cuda.is_available()
    print(f"CUDA available: {use_gpu}")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    ) if use_gpu else None

    # 7. Load Model
    print("Loading base model (this may take a few minutes)...")
    try:
        model_kwargs = dict(
            token=hf_token,
            trust_remote_code=True,
            device_map="auto" if use_gpu else "cpu",
        )
        if bnb_config:
            model_kwargs["quantization_config"] = bnb_config

        model = AutoModelForCausalLM.from_pretrained(BASE_MODEL_ID, **model_kwargs)
    except Exception as e:
        print(f"\nERROR loading model: {e}")
        print("\nCommon fixes:")
        print("  1. Ensure bitsandbytes is installed:  pip install bitsandbytes")
        print("  2. Ensure CUDA is available (GPU required for 4-bit quantization)")
        print("  3. Run on Google Colab (free T4 GPU) or a cloud VM with GPU")
        sys.exit(1)

    if use_gpu:
        model = prepare_model_for_kbit_training(model)
    model.config.use_cache = False

    # 8. LoRA Config
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj",
        ],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    # 9. Format dataset using chat template
    def format_sample(example):
        """Apply Qwen2.5 chat template to a single messages list."""
        return tokenizer.apply_chat_template(
            example["messages"],
            tokenize=False,
            add_generation_prompt=False,
        )

    formatted_dataset = dataset.map(
        lambda ex: {"text": format_sample(ex)},
        remove_columns=dataset.column_names,
    )

    # 10. Data Collator (packs on the assistant response boundary)
    response_template = "<|im_start|>assistant\n"
    collator = DataCollatorForCompletionOnlyLM(
        response_template=response_template,
        tokenizer=tokenizer,
    )

    # 11. Training Arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit" if use_gpu else "adamw_torch",
        save_steps=25,
        logging_steps=5,
        learning_rate=2e-4,
        weight_decay=0.01,
        fp16=use_gpu,                       # Only enable fp16 on GPU
        bf16=False,
        max_grad_norm=0.3,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="cosine",
        report_to="none",
    )

    # 12. Initialize SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=formatted_dataset,
        peft_config=peft_config,
        max_seq_length=MAX_SEQ_LEN,
        processing_class=tokenizer,         # 'tokenizer' arg is deprecated in trl>=0.9
        args=training_args,
        data_collator=collator,
        dataset_text_field="text",
    )

    # 13. Run Training
    print("\nStarting fine-tuning...\n")
    trainer.train()

    # 14. Save adapter locally
    print(f"\nSaving adapter to '{OUTPUT_DIR}'...")
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print("Adapter saved locally.")

    # 15. Push to Hugging Face Hub
    print(f"\nPushing adapter to Hugging Face Hub: {HUB_REPO_ID}")
    try:
        trainer.model.push_to_hub(HUB_REPO_ID, token=hf_token, safe_serialization=True)
        tokenizer.push_to_hub(HUB_REPO_ID, token=hf_token)
        print(f"Successfully pushed to https://huggingface.co/{HUB_REPO_ID}")
    except Exception as e:
        print(f"Warning: Could not push to Hub — {e}")
        print("Adapter is still saved locally. Push manually with:")
        print(f"  huggingface-cli upload {HUB_REPO_ID} {OUTPUT_DIR}")


if __name__ == "__main__":
    train()
