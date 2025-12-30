import requests
import docker
import sys
import json

# --- Configuration ---
# Docker Hub Credentials
DOCKER_HUB_USERNAME = "your_dockerhub_username"
DOCKER_HUB_PASSWORD = "your_dockerhub_password_or_PAT"

# Harbor Credentials and Info
HARBOR_URL = "harbor.example.com"  # Do not include https://
HARBOR_PROJECT = "my-project"
HARBOR_USERNAME = "harbor_username"
HARBOR_PASSWORD = "harbor_password"

# Initialize Docker Client
client = docker.from_env()

def get_docker_hub_token(username, password):
    """Authenticates with Docker Hub to get a bearer token."""
    url = "https://hub.docker.com/v2/users/login/"
    response = requests.post(url, json={"username": username, "password": password})
    if response.status_status == 200:
        return response.json().get("token")
    else:
        print(f"Failed to authenticate with Docker Hub: {response.text}")
        sys.exit(1)

def list_docker_hub_tags(org_repo, token):
    """Fetches all tags for a given repository from Docker Hub."""
    tags = []
    url = f"https://hub.docker.com/v2/repositories/{org_repo}/tags?page_size=100"
    headers = {"Authorization": f"JWT {token}"}
    
    while url:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Error fetching tags: {response.text}")
            break
        
        data = response.json()
        tags.extend([tag['name'] for tag in data.get('results', [])])
        url = data.get('next')  # Handle pagination
        
    return tags

def migrate_images(org_repo):
    """Pulls tags from Docker Hub and pushes them to Harbor."""
    # 1. Authenticate with Docker Hub API
    print(f"[*] Authenticating with Docker Hub...")
    token = get_docker_hub_token(DOCKER_HUB_USERNAME, DOCKER_HUB_PASSWORD)
    
    # 2. Authenticate Docker Client with registries
    print(f"[*] Logging into Harbor: {HARBOR_URL}...")
    client.login(username=HARBOR_USERNAME, password=HARBOR_PASSWORD, registry=HARBOR_URL)
    
    # Docker Hub login for pulling private images
    print(f"[*] Logging into Docker Hub via CLI...")
    client.login(username=DOCKER_HUB_USERNAME, password=DOCKER_HUB_PASSWORD)

    # 3. Get all tags
    print(f"[*] Fetching tags for {org_repo}...")
    tags = list_docker_hub_tags(org_repo, token)
    print(f"[+] Found {len(tags)} tags: {', '.join(tags)}")

    # 4. Process each tag
    repo_name_only = org_repo.split('/')[-1]
    
    for tag in tags:
        source_image = f"{org_repo}:{tag}"
        target_image = f"{HARBOR_URL}/{HARBOR_PROJECT}/{repo_name_only}:{tag}"
        
        try:
            print(f"\n[>] Processing {source_image}...")
            
            print(f"    Pulling...")
            image = client.images.pull(source_image)
            
            print(f"    Tagging as {target_image}...")
            image.tag(f"{HARBOR_URL}/{HARBOR_PROJECT}/{repo_name_only}", tag=tag)
            
            print(f"    Pushing to Harbor...")
            for line in client.images.push(target_image, stream=True, decode=True):
                if 'status' in line:
                    print(f"    {line['status']}", end='\r')
            
            print(f"\n[+] Successfully migrated {tag}")
            
            # Optional: Clean up local images to save space
            client.images.remove(source_image, force=True)
            client.images.remove(target_image, force=True)
            
        except Exception as e:
            print(f"\n[!] Failed to migrate tag {tag}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python migrate.py <org/repo-name>")
        sys.exit(1)
        
    target_repo = sys.argv[1] # e.g., myorg/my-app
    migrate_images(target_repo)
