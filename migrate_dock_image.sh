#!/bin/bash

# --- CONFIGURATION ---
# Change this to your actual Harbor domain
HARBOR_DOMAIN="harbor.domain.com" 
# Set to "false" if using self-signed certificates, otherwise "true"
VERIFY_TLS="false" 

# --- USAGE CHECK ---
usage() {
    echo "Usage: $0 <source_org/image> <harbor_project> <dest_image_name>"
    echo "Example: $0 myorg/nginx-custom my-project web-server"
    exit 1
}

# Check if exactly 3 arguments are provided
if [ "$#" -ne 3 ]; then
    usage
fi

SOURCE_IMAGE=$1
HARBOR_PROJECT=$2
DEST_NAME=$3

# Check if 'jq' is installed
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install it (e.g., sudo apt install jq)."
    exit 1
fi

# --- START MIGRATION ---

echo "--------------------------------------------------------"
echo "Source:  Docker Hub (docker.io/$SOURCE_IMAGE)"
echo "Target:  Harbor ($HARBOR_DOMAIN/$HARBOR_PROJECT/$DEST_NAME)"
echo "--------------------------------------------------------"

# 1. Fetch tags from Docker Hub
echo "Fetching tags..."
TAG_LIST=$(skopeo list-tags docker://docker.io/$SOURCE_IMAGE 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Could not fetch tags. Ensure you are logged in to Docker Hub via 'skopeo login'."
    exit 1
fi

TAGS=$(echo "$TAG_LIST" | jq -r '.Tags[]')

if [ -z "$TAGS" ]; then
    echo "No tags found for image: $SOURCE_IMAGE"
    exit 1
fi

# 2. Loop through tags and copy
for TAG in $TAGS; do
    echo "[MIGRATING] Tag: $TAG"
    
    skopeo copy --all \
        --dest-tls-verify=$VERIFY_TLS \
        docker://docker.io/$SOURCE_IMAGE:$TAG \
        docker://$HARBOR_DOMAIN/$HARBOR_PROJECT/$DEST_NAME:$TAG

    if [ $? -eq 0 ]; then
        echo "[SUCCESS] Finished $TAG"
    else
        echo "[ERROR] Failed to copy $TAG"
    fi
    echo "--------------------------------------------------------"
done

echo "Migration finished for all tags of $SOURCE_IMAGE"
