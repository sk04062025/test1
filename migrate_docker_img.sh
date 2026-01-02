#!/bin/bash

# Configuration
SOURCE_IMAGE="your-org/your-image"          # Docker Hub org/repo
DEST_PATH="harbor.domain.com/project_name"  # Harbor host/project
IMAGE_NAME="your-image"                    # The name you want in Harbor

# 1. Get all tags for the image from Docker Hub
echo "Fetching tags for $SOURCE_IMAGE..."
TAGS=$(skopeo list-tags docker://docker.io/$SOURCE_IMAGE | jq -r '.Tags[]')

if [ -z "$TAGS" ]; then
    echo "No tags found or error fetching tags."
    exit 1
fi

# 2. Loop through and copy each tag
for TAG in $TAGS; do
    echo "----------------------------------------------------"
    echo "Migrating tag: $TAG"
    
    # --all: copies all architectures (amd64, arm64, etc.)
    # --dest-tls-verify=false: add if Harbor uses a self-signed certificate
    skopeo copy --all \
        docker://docker.io/$SOURCE_IMAGE:$TAG \
        docker://$DEST_PATH/$IMAGE_NAME:$TAG
done

echo "Migration complete!"
