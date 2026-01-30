FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the server script
COPY sdp_mcp.py .

# Expose the port for the MCP SSE transport
EXPOSE 8000

# Run the script
CMD ["python", "sdp_mcp.py"]
