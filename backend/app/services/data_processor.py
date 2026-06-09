"""
Secure dataset processing with file validation.
"""
import pandas as pd
import os
import hashlib
from typing import Tuple

ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def validate_file(filename: str, file_size: int) -> Tuple[bool, str]:
    """Validate file extension and size."""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type not allowed. Use: {', '.join(ALLOWED_EXTENSIONS)}"
    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File too large. Max size: {MAX_FILE_SIZE_MB}MB"
    return True, ""


def load_dataset(file_path: str) -> pd.DataFrame:
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    return pd.read_excel(file_path)


def process_dataset(file_path: str) -> dict:
    """Load, clean, and return dataset metadata."""
    df = load_dataset(file_path)

    # Remove duplicates
    original_len = len(df)
    df = df.drop_duplicates()

    # Fill nulls
    for col in df.columns:
        if df[col].dtype in ["float64", "int64"]:
            df[col] = df[col].fillna(df[col].median())
        else:
            df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "Unknown")

    # Save cleaned file
    if file_path.endswith(".csv"):
        df.to_csv(file_path, index=False)
    else:
        df.to_excel(file_path, index=False)

    return {
        "rows_count": len(df),
        "columns_count": len(df.columns),
        "columns": list(df.columns),
        "duplicates_removed": original_len - len(df),
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
    }
