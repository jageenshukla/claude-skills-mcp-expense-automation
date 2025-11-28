#!/usr/bin/env python3
"""
PII Redaction Script for Expense Policy Skill

Removes sensitive personal information from expense descriptions:
- Credit card numbers
- Phone numbers
- Social Security Numbers
- Email addresses (personal only)

Usage:
    python redact.py "Text with PII to redact"
    echo "Text with PII" | python redact.py
"""

import re
import sys
import json


def redact_credit_cards(text: str) -> str:
    """Redact credit card numbers (16 digits with optional spaces/dashes)"""
    patterns = [
        r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b',  # Full card: 1234-5678-9012-3456
        r'ending in \d{4}',  # Partial: ending in 1234
        r'last 4:?\s*\d{4}',  # Partial: last 4: 1234
        r'card.*?\d{4}',  # Card ending in digits
    ]

    result = text
    for pattern in patterns:
        result = re.sub(pattern, '[REDACTED]', result, flags=re.IGNORECASE)
    return result


def redact_phone_numbers(text: str) -> str:
    """Redact phone numbers in various formats"""
    patterns = [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # US: 555-123-4567
        r'\(\d{3}\)\s?\d{3}[-.\s]?\d{4}',  # US: (555) 123-4567
        r'\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9}',  # International
    ]

    result = text
    for pattern in patterns:
        result = re.sub(pattern, '[REDACTED]', result)
    return result


def redact_ssn(text: str) -> str:
    """Redact Social Security Numbers"""
    pattern = r'\b\d{3}-\d{2}-\d{4}\b'
    return re.sub(pattern, '[REDACTED]', text)


def redact_email(text: str) -> str:
    """Redact personal email addresses (keep business emails)"""
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'

    def replace_email(match):
        email = match.group(0)
        # Keep business/corporate email domains
        business_keywords = ['company', 'business', 'corp', 'work', 'office']
        if any(keyword in email.lower() for keyword in business_keywords):
            return email
        return '[REDACTED]'

    return re.sub(pattern, replace_email, text)


def redact_text(text: str) -> str:
    """Apply all redaction rules to the text"""
    result = text
    result = redact_credit_cards(result)
    result = redact_phone_numbers(result)
    result = redact_ssn(result)
    result = redact_email(result)
    return result


def main():
    """Main entry point for the script"""
    # Read input from argument or stdin
    if len(sys.argv) > 1:
        text = ' '.join(sys.argv[1:])
    else:
        text = sys.stdin.read().strip()

    if not text:
        print(json.dumps({"error": "No input provided"}), file=sys.stderr)
        sys.exit(1)

    # Redact PII
    redacted = redact_text(text)

    # Output result as JSON
    result = {
        "original_length": len(text),
        "redacted_text": redacted,
        "has_pii": redacted != text
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
