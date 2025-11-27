#!/bin/bash

# Script to collect all source files into a single text file for code review
# Excludes: node_modules, dist, .git, build artifacts, lock files, etc.

OUTPUT_FILE="code_review.txt"
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Collecting files from: $REPO_ROOT"
echo "Output file: $OUTPUT_FILE"

# Clear/create the output file
> "$OUTPUT_FILE"

# Write header
echo "=============================================" >> "$OUTPUT_FILE"
echo "THREE-MAN-LEAGUE - FULL CODEBASE FOR REVIEW" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "=============================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find all relevant files, excluding common non-source directories and files
find . -type f \
    ! -path "./node_modules/*" \
    ! -path "./.git/*" \
    ! -path "./dist/*" \
    ! -path "./build/*" \
    ! -path "./.next/*" \
    ! -path "./coverage/*" \
    ! -path "./.cache/*" \
    ! -path "./frontend/node_modules/*" \
    ! -path "./frontend/dist/*" \
    ! -path "./functions/node_modules/*" \
    ! -path "./functions/lib/*" \
    ! -name "*.lock" \
    ! -name "package-lock.json" \
    ! -name "yarn.lock" \
    ! -name "pnpm-lock.yaml" \
    ! -name ".DS_Store" \
    ! -name "*.png" \
    ! -name "*.jpg" \
    ! -name "*.jpeg" \
    ! -name "*.gif" \
    ! -name "*.ico" \
    ! -name "*.svg" \
    ! -name "*.woff" \
    ! -name "*.woff2" \
    ! -name "*.ttf" \
    ! -name "*.eot" \
    ! -name "*.map" \
    ! -name "$OUTPUT_FILE" \
    ! -name "collect_files.sh" \
    -print | sort | while read -r file; do
    
    # Skip binary files
    if file "$file" | grep -q "binary"; then
        continue
    fi
    
    echo "" >> "$OUTPUT_FILE"
    echo "================================================" >> "$OUTPUT_FILE"
    echo "FILE: $file" >> "$OUTPUT_FILE"
    echo "================================================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Count files and show summary
FILE_COUNT=$(grep -c "^FILE: " "$OUTPUT_FILE")
TOTAL_LINES=$(wc -l < "$OUTPUT_FILE")

echo "" >> "$OUTPUT_FILE"
echo "=============================================" >> "$OUTPUT_FILE"
echo "END OF CODEBASE" >> "$OUTPUT_FILE"
echo "Total files: $FILE_COUNT" >> "$OUTPUT_FILE"
echo "Total lines: $TOTAL_LINES" >> "$OUTPUT_FILE"
echo "=============================================" >> "$OUTPUT_FILE"

echo ""
echo "Done! Collected $FILE_COUNT files into $OUTPUT_FILE"
echo "Total lines: $TOTAL_LINES"

