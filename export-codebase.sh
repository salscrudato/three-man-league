#!/bin/bash

# Export all code files to a single text file
# Output file
OUTPUT_FILE="codebase-export.txt"

# Clear or create the output file
> "$OUTPUT_FILE"

# File extensions to include
EXTENSIONS="ts tsx js jsx json css html rules"

# Directories to exclude
EXCLUDE_DIRS="node_modules dist build .git lib .firebase"

# Build the find command exclusions
EXCLUDE_ARGS=""
for dir in $EXCLUDE_DIRS; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS -path '*/$dir' -prune -o -path '*/$dir/*' -prune -o"
done

# Build the extension pattern
EXT_PATTERN=""
for ext in $EXTENSIONS; do
  if [ -z "$EXT_PATTERN" ]; then
    EXT_PATTERN="-name '*.$ext'"
  else
    EXT_PATTERN="$EXT_PATTERN -o -name '*.$ext'"
  fi
done

# Find and process files
echo "Exporting codebase to $OUTPUT_FILE..."
echo ""

# Count files
FILE_COUNT=0

# Use find to get all matching files, excluding specified directories
find . \( -path './node_modules' -prune -o \
          -path './frontend/node_modules' -prune -o \
          -path './functions/node_modules' -prune -o \
          -path './frontend/dist' -prune -o \
          -path './functions/lib' -prune -o \
          -path './.git' -prune -o \
          -path './.firebase' -prune \) \
       -o \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
             -o -name '*.json' -o -name '*.css' -o -name '*.html' -o -name '*.rules' \) \
       -type f -print | sort | while read -r file; do
  
  # Skip if file is in excluded directory (double check)
  if [[ "$file" == *"/node_modules/"* ]] || \
     [[ "$file" == *"/dist/"* ]] || \
     [[ "$file" == *"/lib/"* ]] || \
     [[ "$file" == *"/.git/"* ]] || \
     [[ "$file" == *"/.firebase/"* ]]; then
    continue
  fi
  
  # Write file header
  echo "================================================================================" >> "$OUTPUT_FILE"
  echo "FILE: $file" >> "$OUTPUT_FILE"
  echo "================================================================================" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  # Write file contents
  cat "$file" >> "$OUTPUT_FILE"
  
  # Add spacing between files
  echo "" >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
  
  FILE_COUNT=$((FILE_COUNT + 1))
  echo "  Added: $file"
done

# Print summary
echo ""
echo "Export complete!"
echo "Output: $OUTPUT_FILE"
echo "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"

