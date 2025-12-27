from prometheus_client import Counter, Histogram

files_uploaded = Counter("files_uploaded_total", "Total number of uploaded files")
files_downloaded = Counter("files_downloaded_total", "Total number of downloaded files")
files_deleted = Counter("files_deleted_total", "Total number of deleted files")
upload_failures = Counter("upload_failures_total", "Total failed uploads")

upload_size_bytes = Histogram(
    "file_upload_size_bytes",
    "Size of uploaded files in bytes",
    buckets=[1e3, 1e4, 1e5, 1e6, 1e7, 1e8]  # 1KB, 10KB, 100KB, 1MB, 10MB, 100MB
)

download_size_bytes = Histogram(
    "file_download_size_bytes",
    "Size of downloaded files in bytes",
    buckets=[1e3, 1e4, 1e5, 1e6, 1e7, 1e8]
)
