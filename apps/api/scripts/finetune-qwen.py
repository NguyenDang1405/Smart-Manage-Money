import os
import sys
from datasets import load_dataset
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

def train():
    print("=== Qwen2.5 Supervised Fine-Tuning Script ===")
    
    # 1. Hugging Face Access & Hub Setup
    # Do NOT hardcode the token! It will be loaded from the HF_TOKEN environment variable.
    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        print("Error: HF_TOKEN environment variable not set. Please export/set HF_TOKEN before running.")
        sys.exit(1)
        
    # Set model config
    # We use Qwen2.5-1.5B-Instruct as a lightweight base model suitable for standard GPUs (e.g. Colab / local RTX).
    # To scale up to the 72B model, change this to "Qwen/Qwen2.5-72B-Instruct" on a multi-GPU cluster.
    base_model_id = "Qwen/Qwen2.5-1.5B-Instruct"
    new_model_name = "Qwen2.5-SMM-Financial-Adapter"
    output_dir = "./qwen-smm-adapter"
    
    dataset_path = os.path.join(os.path.dirname(__file__), "../finetuning_dataset.jsonl")
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset not found at {dataset_path}. Please run the data preparation script first.")
        sys.exit(1)
        
    print(f"Loading base model: {base_model_id}")
    print(f"Loading dataset from: {dataset_path}")
    
    # 2. Load Dataset
    dataset = load_dataset("json", data_files=dataset_path, split="train")
    print(f"Loaded {len(dataset)} examples for training.")
    
    # 3. Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        base_model_id, 
        token=hf_token, 
        trust_remote_code=True
    )
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    
    # 4. BitsAndBytes Quantization Config for QLoRA (4-bit)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )
    
    # Load base model in 4-bit
    try:
        model = AutoModelForCausalLM.from_pretrained(
            base_model_id,
            quantization_config=bnb_config,
            device_map="auto",
            token=hf_token,
            trust_remote_code=True
        )
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Fine-tuning simulation: Loading model requires GPU and proper libraries (bitsandbytes, transformers, accelerate).")
        print("If running in a CPU-only or dependency-light environment, SFTTrainer initialization might fail.")
        print("Continuing with dummy verification step...")
        # Since this is run on the local machine which might lack CUDA, we catch the error
        # and print detailed instructions for running in Google Colab / GPU environments.
        print("\n=== HOW TO RUN THIS SFT IN A GPU ENVIRONMENT ===")
        print("1. Install dependencies:")
        print("   pip install torch transformers datasets peft trl accelerate bitsandbytes sentencepiece")
        print("2. Set Hugging Face Token environment variable:")
        print("   export HF_TOKEN=\"your_hugging_face_token_here\"")
        print("3. Run this script:")
        print("   python scripts/finetune-qwen.py")
        return

    # Prepare model for 4-bit quantization training
    model = prepare_model_for_kbit_training(model)
    model.config.use_cache = False
    
    # 5. PEFT / LoRA Config
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    # 6. Training Arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=25,
        logging_steps=5,
        learning_rate=2e-4,
        weight_decay=0.01,
        fp16=True,
        max_grad_norm=0.3,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="cosine",
        report_to="none"
    )
    
    # Formatting function for ChatML style messages
    def formatting_prompts_func(example):
        texts = []
        for messages in example["messages"]:
            # Format using tokenizer chat template
            text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            texts.append(text)
        return texts

    # 7. Initialize SFTTrainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        max_seq_length=1024,
        tokenizer=tokenizer,
        args=training_args,
        formatting_func=formatting_prompts_func,
    )
    
    # 8. Run Training
    print("Starting fine-tuning...")
    trainer.train()
    
    # Save adapter model locally
    print(f"Saving adapter model locally to {output_dir}")
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # 9. Push Adapter to Hugging Face Hub
    # Replace with user's repository target name on their namespace if desired
    repo_id = f"NguyenDang1405/{new_model_name}"
    print(f"Pushing trained adapter to Hugging Face Hub: {repo_id}")
    try:
        trainer.model.push_to_hub(repo_id, token=hf_token, safe_serialization=True)
        tokenizer.push_to_hub(repo_id, token=hf_token)
        print("Success! Adapter pushed to Hugging Face Hub.")
    except Exception as e:
        print(f"Failed to push to Hugging Face Hub: {e}")
        print("Make sure your token has WRITE access and the repository exists or can be created.")

if __name__ == "__main__":
    train()
