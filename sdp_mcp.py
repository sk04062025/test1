from fastmcp import FastMCP
import requests
import json

# Configuration - Replace with your details
SDP_URL = "http://your-sdp-server:8080"  # Your SDP URL
API_KEY = "YOUR-GENERATED-API-KEY"      # Your API Key
HEADERS = {"authtoken": API_KEY}

mcp = FastMCP("ServiceDeskPlus")

@mcp.tool()
def list_recent_requests(limit: int = 10):
    """Fetch the most recent helpdesk tickets/requests."""
    url = f"{SDP_URL}/api/v3/requests"
    # Filtering for the most recent requests
    params = {
        "input_data": json.dumps({
            "list_info": {
                "row_count": limit,
                "sort_field": "created_time",
                "sort_order": "desc"
            }
        })
    }
    response = requests.get(url, headers=HEADERS, params=params)
    return response.json()

@mcp.tool()
def create_request(subject: str, description: str, requester: str):
    """Create a new support ticket in ServiceDesk Plus."""
    url = f"{SDP_URL}/api/v3/requests"
    input_data = {
        "request": {
            "subject": subject,
            "description": description,
            "requester": {"name": requester}
        }
    }
    data = {"input_data": json.dumps(input_data)}
    response = requests.post(url, headers=HEADERS, data=data)
    return response.json()

if __name__ == "__main__":
    mcp.run()
