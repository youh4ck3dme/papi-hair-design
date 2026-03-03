import json

with open('lint_json.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for file in data:
    for message in file.get('messages', []):
        print(f"File: {file['filePath']}")
        print(f"Line: {message['line']}, Column: {message['column']}")
        print(f"Rule: {message['ruleId']}")
        print(f"Message: {message['message']}")
        print("-" * 20)
