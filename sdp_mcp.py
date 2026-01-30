import os
import json
import requests
from fastmcp import FastMCP

# Load configuration from environment variables
SDP_URL = os.getenv("SDP_URL", "http://localhost:8080")
API_KEY = os.getenv("SDP_API_KEY")
# For local POCs, you might need to disable SSL verification if using self-signed certs
VERIFY_SSL = os.getenv("VERIFY_SSL", "true").lower() == "true"

mcp = FastMCP("ServiceDeskPlus")

def get_headers():
    return {
        "authtoken": API_KEY,
        "Accept": "application/vnd.manageengine.sdp.v3+json"
    }

@mcp.tool()
def list_requests(row_count: int = 10):
    """Fetch the latest helpdesk tickets from ServiceDesk Plus."""
    url = f"{SDP_URL}/api/v3/requests"
    input_data = {
        "list_info": {
            "row_count": row_count,
            "sort_field": "created_time",
            "sort_order": "desc"
        }
    }
    params = {"input_data": json.dumps(input_data)}
    
    response = requests.get(url, headers=get_headers(), params=params, verify=VERIFY_SSL)
    return response.json()

@mcp.tool()
def create_ticket(subject: str, description: str, requester_name: str):
    """Create a new support request/ticket."""
    url = f"{SDP_URL}/api/v3/requests"
    input_data = {
        "request": {
            "subject": subject,
            "description": description,
            "requester": {"name": requester_name}
        }
    }
    data = {"input_data": json.dumps(input_data)}
    
    response = requests.post(url, headers=get_headers(), data=data, verify=VERIFY_SSL)
    return response.json()

if __name__ == "__main__":
    # In Docker, we run as a web server (SSE) on all interfaces (0.0.0.0)
    mcp.run(transport="sse", host="0.0.0.0", port=8000)
