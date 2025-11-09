That's an excellent project idea! Building an ETL pipeline with Celery is a great way to handle asynchronous tasks and distributed processing. Let's break down the components and put together the code.

Here's the overall architecture:
1.  **Gmail Watcher (Celery Task 1):** Connects to Gmail, checks for new emails with "Invoice details" subject, extracts the body, and sends it to the parsing task.
2.  **Email Parser (Celery Task 2):** Receives the email body, parses it to extract invoice ID and amount, and sends these details to the database saving task.
3.  **Database Saver (Celery Task 3):** Receives the invoice details and saves them into an SQLite database.
4.  **Celery Beat:** Schedules the Gmail watcher task to run every five minutes.
5.  **Redis:** Serves as the message broker for Celery.
6.  **SQLite:** Our simple database for storing invoice details.
7.  **Docker Compose:** To orchestrate all these services.

### 1. Project Structure

Let's start by creating a directory structure for our project:

```
etl-celery-pipeline/
├── app/
│   ├── __init__.py
│   ├── celery_app.py
│   ├── tasks.py
│   └── config.py
├── data/
│   └── invoices.db  (This will be created by SQLite)
├── requirements.txt
└── docker-compose.yml
```

### 2. `requirements.txt`

```
celery[redis]
redis
google-auth-oauthlib
google-api-python-client
beautifulsoup4
```

### 3. `app/config.py`

This file will hold our configuration details, especially for Gmail access.

```python
# app/config.py

class Config:
    # Celery configuration
    CELERY_BROKER_URL = 'redis://redis:6379/0'
    CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_TIMEZONE = 'UTC'

    # Gmail API Configuration
    # You'll need to create a project in Google Cloud Console, enable Gmail API,
    # and create OAuth 2.0 client credentials (Desktop app type).
    # Download the client_secret.json and rename it to credentials.json
    # and place it in the 'app' directory or specify the path here.
    GMAIL_CREDENTIALS_FILE = 'credentials.json' # Make sure this file is in the 'app' directory
    GMAIL_TOKEN_FILE = 'token.json' # This file will be generated after first authentication
    GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
    GMAIL_INVOICE_SUBJECT = "Invoice details"

    # Database configuration
    DATABASE_URI = 'sqlite:///data/invoices.db'
```

**Important Note for Gmail API:**
*   Go to Google Cloud Console ([console.cloud.google.com](https://console.cloud.google.com/)).
*   Create a new project.
*   Enable the "Gmail API" for your project.
*   Go to "APIs & Services" -> "Credentials".
*   Click "Create Credentials" -> "OAuth client ID".
*   Select "Desktop app" as the application type.
*   Name it (e.g., "Celery Gmail ETL").
*   Download the `client_secret.json` file. **Rename it to `credentials.json` and place it in your `app/` directory.**
*   The first time you run the Gmail worker, it will open a browser for authentication and generate `token.json`.

### 4. `app/celery_app.py`

This sets up our Celery application instance.

```python
# app/celery_app.py
from celery import Celery
from app.config import Config

# Initialize Celery app
celery_app = Celery(
    'etl_pipeline',
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer=Config.CELERY_TASK_SERIALIZER,
    result_serializer=Config.CELERY_RESULT_SERIALIZER,
    accept_content=Config.CELERY_ACCEPT_CONTENT,
    timezone=Config.CELERY_TIMEZONE,
    enable_utc=True,
    # Define queues for each worker
    task_queues={
        'gmail_queue': {'exchange': 'gmail_queue', 'routing_key': 'gmail_queue'},
        'parser_queue': {'exchange': 'parser_queue', 'routing_key': 'parser_queue'},
        'db_saver_queue': {'exchange': 'db_saver_queue', 'routing_key': 'db_saver_queue'},
    },
    # Celery Beat Schedule
    beat_schedule={
        'check-gmail-every-5-minutes': {
            'task': 'app.tasks.check_gmail_for_invoices',
            'schedule': 300.0,  # Every 300 seconds (5 minutes)
            'options': {'queue': 'gmail_queue'},
        },
    }
)

if __name__ == '__main__':
    celery_app.start()
```

### 5. `app/tasks.py`

This file contains our Celery tasks (workers).

```python
# app/tasks.py
import base64
import re
import sqlite3
from email.mime.text import MIMEText
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os.path
from bs4 import BeautifulSoup

from app.celery_app import celery_app
from app.config import Config

# --- Helper for Gmail API Authentication ---
def get_gmail_service():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists(Config.GMAIL_TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(Config.GMAIL_TOKEN_FILE, Config.GMAIL_SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                Config.GMAIL_CREDENTIALS_FILE, Config.GMAIL_SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(Config.GMAIL_TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    service = build('gmail', 'v1', credentials=creds)
    return service

# --- Task 1: Check Gmail for Invoices ---
@celery_app.task(name='app.tasks.check_gmail_for_invoices', queue='gmail_queue')
def check_gmail_for_invoices():
    print("Checking Gmail for new invoice emails...")
    try:
        service = get_gmail_service()
        # Query for unread emails with the specific subject
        query = f"is:unread subject:\"{Config.GMAIL_INVOICE_SUBJECT}\""
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])

        if not messages:
            print("No new invoice emails found.")
            return

        print(f"Found {len(messages)} new invoice emails.")
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id'], format='full').execute()
            
            # Extract email body
            email_body = ""
            if 'parts' in msg['payload']:
                for part in msg['payload']['parts']:
                    if part['mimeType'] == 'text/plain' and 'data' in part['body']:
                        email_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
                    elif part['mimeType'] == 'text/html' and 'data' in part['body']:
                        html_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        soup = BeautifulSoup(html_body, 'html.parser')
                        email_body = soup.get_text() # Extract plain text from HTML
                        break
            elif 'body' in msg['payload'] and 'data' in msg['payload']['body']:
                 email_body = base64.urlsafe_b64decode(msg['payload']['body']['data']).decode('utf-8')

            if email_body:
                print(f"Extracted email body for message ID {message['id']}. Sending to parser task.")
                # Mark email as read after processing
                service.users().messages().modify(userId='me', id=message['id'], body={'removeLabelIds': ['UNREAD']}).execute()
                parse_invoice_email.apply_async(args=[email_body], queue='parser_queue')
            else:
                print(f"Could not extract body for message ID {message['id']}. Skipping.")

    except HttpError as error:
        print(f"An error occurred with Gmail API: {error}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

# --- Task 2: Parse Invoice Email ---
@celery_app.task(name='app.tasks.parse_invoice_email', queue='parser_queue')
def parse_invoice_email(email_body):
    print("Parsing invoice email body...")
    invoice_id = None
    invoice_amount = None

    # Example parsing logic (adjust regex as needed for your specific email format)
    # Assuming email body contains lines like:
    # "Invoice ID: INV-2023-001"
    # "Amount Due: $150.75"

    # Regex for Invoice ID
    id_match = re.search(r"Invoice ID:\s*([A-Z0-9-]+)", email_body, re.IGNORECASE)
    if id_match:
        invoice_id = id_match.group(1).strip()

    # Regex for Invoice Amount (can handle currency symbols, commas, decimals)
    amount_match = re.search(r"Amount Due:\s*[$€£]?\s*([\d,]+\.?\d{0,2})", email_body, re.IGNORECASE)
    if amount_match:
        invoice_amount = float(amount_match.group(1).replace(',', ''))

    if invoice_id and invoice_amount is not None:
        print(f"Parsed - Invoice ID: {invoice_id}, Amount: {invoice_amount}. Sending to DB saver task.")
        save_invoice_to_db.apply_async(args=[invoice_id, invoice_amount], queue='db_saver_queue')
    else:
        print(f"Failed to parse invoice ID or amount from email body: {email_body[:200]}...") # Log first 200 chars
        if not invoice_id:
            print("Invoice ID not found.")
        if invoice_amount is None:
            print("Invoice Amount not found.")


# --- Task 3: Save Invoice to DB ---
@celery_app.task(name='app.tasks.save_invoice_to_db', queue='db_saver_queue')
def save_invoice_to_db(invoice_id, invoice_amount):
    print(f"Saving Invoice ID: {invoice_id}, Amount: {invoice_amount} to database...")
    try:
        conn = sqlite3.connect(Config.DATABASE_URI)
        cursor = conn.cursor()

        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id TEXT UNIQUE,
                amount REAL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute("INSERT INTO invoices (invoice_id, amount) VALUES (?, ?)",
                       (invoice_id, invoice_amount))
        conn.commit()
        conn.close()
        print(f"Successfully saved Invoice ID: {invoice_id} to database.")
    except sqlite3.IntegrityError:
        print(f"Invoice with ID {invoice_id} already exists in the database. Skipping.")
    except Exception as e:
        print(f"Error saving invoice to DB: {e}")
```

### 6. `docker-compose.yml`

This file will orchestrate our services: Redis, Celery Beat, and our three Celery workers.

```yaml
version: '3.8'

services:
  redis:
    image: redis:6-alpine
    container_name: etl_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  celery_beat:
    build: .
    container_name: etl_celery_beat
    command: celery -A app.celery_app beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./app:/app/app
      - ./data:/app/data # Mount data volume for sqlite
      - ./requirements.txt:/requirements.txt
    depends_on:
      - redis
    env_file:
      - .env # If you have sensitive env variables, use this. For now, config.py handles it.

  celery_worker_gmail:
    build: .
    container_name: etl_celery_worker_gmail
    command: celery -A app.celery_app worker -l info -Q gmail_queue -n gmail_worker@%h
    volumes:
      - ./app:/app/app
      - ./data:/app/data # Mount data volume for sqlite
      - ./requirements.txt:/requirements.txt
    depends_on:
      - redis
    env_file:
      - .env

  celery_worker_parser:
    build: .
    container_name: etl_celery_worker_parser
    command: celery -A app.celery_app worker -l info -Q parser_queue -n parser_worker@%h
    volumes:
      - ./app:/app/app
      - ./data:/app/data # Mount data volume for sqlite
      - ./requirements.txt:/requirements.txt
    depends_on:
      - redis
    env_file:
      - .env

  celery_worker_db_saver:
    build: .
    container_name: etl_celery_worker_db_saver
    command: celery -A app.celery_app worker -l info -Q db_saver_queue -n db_saver_worker@%h
    volumes:
      - ./app:/app/app
      - ./data:/app/data # Mount data volume for sqlite
      - ./requirements.txt:/requirements.txt
    depends_on:
      - redis
    env_file:
      - .env

volumes:
  redis_data:
  # data: # No need to declare if it's a bind mount
```

**Note on `django_celery_beat.schedulers:DatabaseScheduler`:**
I've used `django_celery_beat.schedulers:DatabaseScheduler` in the `celery_beat` command for `docker-compose.yml`. This is common for persistent beat schedules. However, since we're not using Django, a simpler approach for a fixed schedule like yours is to use the default `celery.beat.EmbeddedScheduler` by *omitting* `--scheduler django_celery_beat.schedulers:DatabaseScheduler` from the `celery_beat` command.

**Revised `celery_beat` command for simplicity:**

```yaml
  celery_beat:
    build: .
    container_name: etl_celery_beat
    command: celery -A app.celery_app beat -l info
    volumes:
      - ./app:/app/app
      - ./data:/app/data
      - ./requirements.txt:/requirements.txt
    depends_on:
      - redis
    env_file:
      - .env
```

This will make Celery Beat use the `beat_schedule` defined directly in `celery_app.py`.

### 7. `Dockerfile` (in the root directory)

This will build our Python environment for the Celery workers and Beat.

```dockerfile
# Dockerfile
FROM python:3.9-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire app directory
COPY app/ app/
# Ensure the data directory exists for SQLite
RUN mkdir -p data

CMD ["tail", "-f", "/dev/null"] # Keep container running
```

### How to Run

1.  **Set up Gmail API Credentials:**
    *   Follow the steps under "Important Note for Gmail API" in section 3 (`app/config.py`) to get your `credentials.json` file.
    *   Place `credentials.json` inside the `app/` directory.

2.  **Build and Run with Docker Compose:**
    *   Open your terminal in the `etl-celery-pipeline/` root directory.
    *   Run: `docker-compose up --build`
    *   The first time `check_gmail_for_invoices` runs (either manually or via beat), it will prompt you to authenticate your Google account in a web browser. Since it's running inside a Docker container, it will try to open the browser on your host machine. Make sure to complete the authentication, and `token.json` will be generated in your `app/` directory.

3.  **Test the Pipeline:**
    *   Send an email to your Gmail account with the subject "Invoice details".
    *   In the email body, include something like:
        ```
        Dear Customer,

        This is your monthly invoice.
        Invoice ID: INV-ABC-123
        Amount Due: $245.99
        Please pay by next week.

        Thanks,
        Your Company
        ```
    *   Wait for 5 minutes, and Celery Beat should trigger the `check_gmail_for_invoices` task.
    *   You should see logs in your docker-compose output indicating the email being found, parsed, and saved.

4.  **Verify Database:**
    *   You can connect to the `data/invoices.db` file (which will be created in your host's `data/` directory) using an SQLite browser tool to confirm the data is saved.
    *   Example: `sqlite3 data/invoices.db` then `SELECT * FROM invoices;`

This provides a complete end-to-end setup for your Celery-based ETL pipeline! 
