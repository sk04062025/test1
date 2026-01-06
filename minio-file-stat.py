from minio import Minio
from minio.error import S3Error

def get_minio_file_details():
    # --- CONFIGURATION ---
    ENDPOINT = "your-minio-server.com:9000"  # e.g., '192.168.1.50:9000' or 'play.min.io'
    ACCESS_KEY = "YOUR_ACCESS_KEY"
    SECRET_KEY = "YOUR_SECRET_KEY"
    BUCKET_NAME = "your-bucket-name"
    OBJECT_NAME = "path/to/your/video_file.mp4"
    USE_SSL = False  # Set to True if your MinIO uses HTTPS
    # ---------------------

    # Initialize the Minio client
    client = Minio(
        ENDPOINT,
        access_key=ACCESS_KEY,
        secret_key=SECRET_KEY,
        secure=USE_SSL
    )

    try:
        # Get object information (stat_object)
        # This only fetches metadata, it does NOT download the file
        result = client.stat_object(BUCKET_NAME, OBJECT_NAME)

        print(f"File Details for: {result.object_name}")
        print("-" * 30)
        
        # Convert size to a readable format (MB)
        size_in_mb = result.size / (1024 * 1024)
        
        print(f"Size:          {result.size} bytes ({size_in_mb:.2f} MB)")
        print(f"Last Modified: {result.last_modified}")
        print(f"Content Type:  {result.content_type}")
        print(f"ETag:          {result.etag}")
        print(f"Metadata:      {result.metadata}")

    except S3Error as e:
        if e.code == "NoSuchBucket":
            print(f"Error: The bucket '{BUCKET_NAME}' does not exist.")
        elif e.code == "NoSuchKey":
            print(f"Error: The file '{OBJECT_NAME}' was not found in the bucket.")
        elif e.code == "InvalidAccessKeyId":
            print("Error: Invalid Access Key.")
        elif e.code == "SignatureDoesNotMatch":
            print("Error: Invalid Secret Key.")
        else:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    get_minio_file_details()
