import os
import json
import requests
import logging
import sys
import urllib3
from fastmcp import FastMCP

# 1. Setup Logging & Security
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger("sdp-mcp")

# 2. Configuration
SDP_BASE_URL = os.getenv("SDP_URL", "https://localhost:8080").strip("/")
API_KEY = os.getenv("SDP_API_KEY")
VERIFY_SSL = os.getenv("VERIFY_SSL", "false").lower() == "true"

mcp = FastMCP("ServiceDeskPlus")

def get_headers():
    return {
        "authtoken": API_KEY,
        "Accept": "application/vnd.manageengine.sdp.v3+json"
    }

def sdp_call(method, endpoint, data=None, params=None):
    """Generic wrapper for SDP API calls to handle form-data encoding."""
    url = f"{SDP_BASE_URL}/api/v3/{endpoint.lstrip('/')}"
    payload = {'input_data': json.dumps(data)} if data else None
    
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=get_headers(),
            data=payload if method in ['POST', 'PUT'] else None,
            params=params if method == 'GET' else ({"input_data": json.dumps(params)} if params else None),
            verify=VERIFY_SSL
        )
        logger.info(f"SDP {method} {endpoint} -> Status: {response.status_code}")
        return response.json()
    except Exception as e:
        logger.error(f"SDP Call Failed: {str(e)}")
        return {"error": str(e)}

# --- TOOLS ---

@mcp.tool()
def list_requests(row_count: int = 10, status: str = "open"):
    """Fetch a list of tickets. Status can be 'open', 'closed', or 'all'."""
    params = {"list_info": {"row_count": row_count, "sort_field": "created_time", "sort_order": "desc"}}
    return sdp_call("GET", "requests", params=params)

@mcp.tool()
def get_request(request_id: str):
    """Get full details of a specific ticket by its ID."""
    return sdp_call("GET", f"requests/{request_id}")

@mcp.tool()
def search_requests(search_text: str):
    """Search for requests containing specific text in subject or description."""
    params = {"list_info": {"search_fields": {"subject": search_text, "description": search_text}}}
    return sdp_call("GET", "requests", params=params)

@mcp.tool()
def get_metadata():
    """Retrieve metadata about request fields (useful for finding valid values)."""
    return sdp_call("GET", "requests/metadata")

@mcp.tool()
def add_note(request_id: str, note_text: str, is_public: bool = False):
    """Add a note to a request."""
    data = {"note": {"description": note_text, "mark_as_public": is_public}}
    return sdp_call("POST", f"requests/{request_id}/notes", data=data)

@mcp.tool()
def add_private_note(request_id: str, note_text: str):
    """Add a private technician-only note to a request."""
    data = {"note": {"description": note_text, "mark_as_public": False}}
    return sdp_call("POST", f"requests/{request_id}/notes", data=data)

@mcp.tool()
def reply_to_requester(request_id: str, subject: str, description: str):
    """Send an email reply to the requester of a ticket."""
    data = {"reply": {"subject": subject, "description": description}}
    return sdp_call("POST", f"requests/{request_id}/reply", data=data)

@mcp.tool()
def send_first_response(request_id: str, description: str):
    """Send the first official response/reply to a ticket."""
    data = {"reply": {"description": description}}
    return sdp_call("POST", f"requests/{request_id}/reply", data=data)

@mcp.tool()
def get_request_conversation(request_id: str):
    """Retrieve the entire email/note history of a ticket."""
    return sdp_call("GET", f"requests/{request_id}/conversations")

@mcp.tool()
def list_technicians():
    """List all technicians registered in the system."""
    return sdp_call("GET", "technicians")

@mcp.tool()
def get_technician(technician_id: str):
    """Get details of a specific technician."""
    return sdp_call("GET", f"technicians/{technician_id}")

@mcp.tool()
def find_technician(name: str):
    """Search for a technician by name."""
    params = {"list_info": {"search_fields": {"name": name}}}
    return sdp_call("GET", "technicians", params=params)

@mcp.tool()
def create_request(subject: str, description: str, requester_name: str):
    """Create a new support ticket."""
    data = {"request": {"subject": subject, "description": description, "requester": {"name": requester_name}}}
    return sdp_call("POST", "requests", data=data)

@mcp.tool()
def update_request(request_id: str, subject: str = None, description: str = None):
    """Update an existing ticket's subject or description."""
    request_data = {}
    if subject: request_data["subject"] = subject
    if description: request_data["description"] = description
    data = {"request": request_data}
    return sdp_call("PUT", f"requests/{request_id}", data=data)

@mcp.tool()
def close_request(request_id: str, closure_code: str = "Resolved", comment: str = "Closed via AI Agent"):
    """Close a ticket with a mandatory closure code and comment."""
    data = {"request": {"status": {"name": "Closed"}, "closure_info": {"closure_code": {"name": closure_code}, "closure_comments": comment}}}
    return sdp_call("PUT", f"requests/{request_id}", data=data)

if __name__ == "__main__":
    logger.info(f"SDP MCP Server starting for: {SDP_BASE_URL}")
    mcp.run(transport="sse", host="0.0.0.0", port=8000)
