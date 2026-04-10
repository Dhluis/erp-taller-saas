import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Ensure types are Promise
    # Pattern for API Route Handlers
    route_pattern = r'export async function (GET|POST|PUT|DELETE|PATCH)\(\s*([^,]+),\s*{\s*params\s*}\s*:\s*{\s*params\s*:\s*{\s*([^}]+)\s*}\s*}\s*\)'
    def route_repl(match):
        method = match.group(1)
        req = match.group(2)
        params_content = match.group(3)
        return f'export async function {method}({req}, {{ params }}: {{ params: Promise<{{ {params_content} }}> }})'
    
    # Pattern for Pages
    page_pattern = r'export default async function ([^(\s]+)\(\s*{\s*params\s*}\s*:\s*{\s*params\s*:\s*{\s*([^}]+)\s*}\s*}\s*\)'
    def page_repl(match):
        func_name = match.group(1)
        params_content = match.group(2)
        return f'export default async function {func_name}({{ params }}: {{ params: Promise<{{ {params_content} }}> }})'

    new_content = re.sub(route_pattern, route_repl, content)
    new_content = re.sub(page_pattern, page_repl, new_content)

    # Step 2: Ensure 'await params' exists for EVERY async function with params: Promise
    body_starts = list(re.finditer(r'(async function [^{]+|async function\s*[^(]+\([^)]+\))\s*\{', new_content))
    
    offset = 0
    for match in body_starts:
        header = match.group(1)
        if 'params: Promise' in header:
            insertion_point = match.end() + offset
            # Look ahead to see if 'await params' exists in the next 500 chars
            if 'await params' not in new_content[insertion_point:insertion_point+500]:
                type_match = re.search(r'Promise<\{\s*([^}]+)\s*\}>', header)
                if type_match:
                    params_keys = type_match.group(1)
                    keys = [k.split(':')[0].strip() for k in params_keys.split(';')]
                    destructuring = f'{{ {", ".join(keys)} }}'
                    insertion = f'\n  const {destructuring} = await params;'
                    
                    before = new_content[:insertion_point]
                    after = new_content[insertion_point:]
                    new_content = before + insertion + after
                    offset += len(insertion)

    # Step 3: Cleanup legacy params.id patterns
    if 'await params' in new_content:
        new_content = re.sub(r'params\.(\w+)', r'\1', new_content)

    if new_content != content:
        # Final cleanup for double awaits or weird semicolon combos
        new_content = new_content.replace('await await params', 'await params')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

files = [
    r"src\app\api\users\[id]\route.ts",
    r"src\app\api\users\[id]\role\route.ts",
    r"src\app\api\vehicles\[id]\route.ts",
    r"src\app\api\vehicles\[id]\history\route.ts",
    r"src\app\api\work-orders\[id]\route.ts",
    r"src\app\api\work-orders\[id]\history\route.ts",
    r"src\app\api\work-orders\[id]\images\route.ts",
    r"src\app\api\work-orders\[id]\images\delete\route.ts",
    r"src\app\api\work-orders\[id]\images\upload\route.ts",
    r"src\app\api\work-orders\[id]\items\route.ts",
    r"src\app\api\work-orders\[id]\notify\route.ts",
    r"src\app\api\work-orders\[id]\services\route.ts",
    r"src\app\api\work-orders\[id]\services\[serviceId]\route.ts",
    r"src\app\api\work-orders\[id]\status\route.ts",
    r"src\app\api\quotations\[id]\approve\route.ts",
    r"src\app\api\quotations\[id]\convert\route.ts",
    r"src\app\api\quotations\[id]\duplicate\route.ts",
    r"src\app\api\quotations\[id]\items\[itemId]\route.ts",
    r"src\app\api\quotations\[id]\items\route.ts",
    r"src\app\api\quotations\[id]\reject\route.ts",
    r"src\app\api\quotations\[id]\send\route.ts",
    r"src\app\api\quotations\[id]\status\route.ts",
    r"src\app\auth\reset-password\page.tsx"
]

for f in files:
    full_path = os.path.join(os.getcwd(), f)
    if os.path.exists(full_path):
        if fix_file(full_path):
            print(f"Fixed: {f}")
        else:
            print(f"Skipped/Correct: {f}")
    else:
        print(f"Not found: {f}")
