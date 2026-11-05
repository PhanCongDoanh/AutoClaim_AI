package com.autoclaim.api.exception;

/** Raised when the external object storage (S3 / R2 / MinIO) is unreachable or rejects a request. */
public class StorageException extends RuntimeException {

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
