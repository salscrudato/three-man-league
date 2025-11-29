#!/bin/bash

# Generate a single file containing all frontend and backend code for external review
# Output file
OUTPUT_FILE="codebase-review.txt"

# Clear/create output file
> "$OUTPUT_FILE"

echo "========================================" >> "$OUTPUT_FILE"
echo "THREE-MAN-LEAGUE CODEBASE REVIEW" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the output
add_file() {
    local filepath="$1"
    if [ -f "$filepath" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "========================================" >> "$OUTPUT_FILE"
        echo "FILE: $filepath" >> "$OUTPUT_FILE"
        echo "========================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$filepath" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Add project config files
echo "--- PROJECT CONFIGURATION ---" >> "$OUTPUT_FILE"
add_file "package.json"
add_file "firebase.json"
add_file "firestore.rules"
add_file "firestore.indexes.json"

# Frontend configuration
echo "" >> "$OUTPUT_FILE"
echo "--- FRONTEND CONFIGURATION ---" >> "$OUTPUT_FILE"
add_file "frontend/package.json"
add_file "frontend/tsconfig.json"
add_file "frontend/vite.config.ts"
add_file "frontend/tailwind.config.js"
add_file "frontend/index.html"

# Frontend source files
echo "" >> "$OUTPUT_FILE"
echo "--- FRONTEND SOURCE CODE ---" >> "$OUTPUT_FILE"

# Find all TypeScript/TSX files in frontend/src
find frontend/src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    add_file "$file"
done

# Frontend CSS
find frontend/src -type f -name "*.css" | sort | while read -r file; do
    add_file "$file"
done

# Backend configuration
echo "" >> "$OUTPUT_FILE"
echo "--- BACKEND CONFIGURATION ---" >> "$OUTPUT_FILE"
add_file "functions/package.json"
add_file "functions/tsconfig.json"

# Backend source files
echo "" >> "$OUTPUT_FILE"
echo "--- BACKEND SOURCE CODE ---" >> "$OUTPUT_FILE"

# Find all TypeScript files in functions/src
find functions/src -type f -name "*.ts" | sort | while read -r file; do
    add_file "$file"
done

# Backend test files
echo "" >> "$OUTPUT_FILE"
echo "--- BACKEND TESTS ---" >> "$OUTPUT_FILE"

find functions/test -type f -name "*.ts" 2>/dev/null | sort | while read -r file; do
    add_file "$file"
done

# Count files and lines
echo "" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"
echo "SUMMARY" >> "$OUTPUT_FILE"
echo "========================================" >> "$OUTPUT_FILE"

frontend_files=$(find frontend/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | wc -l | tr -d ' ')
backend_files=$(find functions/src -type f -name "*.ts" | wc -l | tr -d ' ')
test_files=$(find functions/test -type f -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
total_lines=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')

echo "Frontend files: $frontend_files" >> "$OUTPUT_FILE"
echo "Backend files: $backend_files" >> "$OUTPUT_FILE"
echo "Test files: $test_files" >> "$OUTPUT_FILE"
echo "Total lines in review file: $total_lines" >> "$OUTPUT_FILE"

echo "✅ Code review file generated: $OUTPUT_FILE"
echo "   Frontend files: $frontend_files"
echo "   Backend files: $backend_files"
echo "   Test files: $test_files"
echo "   Total lines: $total_lines"

