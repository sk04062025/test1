import os
import json
import requests
from fastmcp import FastMCP

SDP_URL = os.getenv("SDP_URL", "http://localhost:8080").strip("/")
API_KEY = os.getenv("SDP_API_KEY")
VERIFY_SSL = os.getenv("VERIFY_SSL", "true").lower() == "true"

mcp = FastMCP("ServiceDeskPlus")

def get_headers():
    # SDP v3 requires the authtoken in the header
    return {
        "authtoken": API_KEY,
        "Accept": "application/vnd.manageengine.sdp.v3+json"
    }

@mcp.tool()
def create_ticket(subject: str, description: str, requester_name: str):
    """Create a new support request/ticket."""
    url = f"{SDP_URL}/api/v3/requests"
    
    # Payload structure for SDP v3
    input_data = {
        "request": {
            "subject": subject,
            "description": description,
            "requester": {"name": requester_name}
        }
    }

    # IMPORTANT: SDP expects a form-data field named 'input_data'
    payload = {"input_data": json.dumps(input_data)}
    
    try:
        response = requests.post(
            url, 
            headers=get_headers(), 
            data=payload,  # This sends it as application/x-www-form-urlencoded
            verify=VERIFY_SSL
        )
        
        # Check if the response is actually JSON
        if response.status_code in [200, 201]:
            try:
                return response.json()
            except json.JSONDecodeError:
                return {
                    "error": "SDP returned success but body was not JSON",
                    "status_code": response.status_code,
                    "body": response.text[:100] # show first 100 chars
                }
        else:
            return {
                "error": f"Server returned status {response.status_code}",
                "details": response.text[:200]
            }

    except Exception as e:
        return {"error": f"Exception occurred: {str(e)}"}

# Keep your list_requests and other code below...
