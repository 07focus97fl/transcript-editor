import os

def save_file(full_path, content):
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

def get_file_content(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()