package com.autoclaim.api.service;

import com.autoclaim.api.exception.BadRequestException;
import com.autoclaim.api.exception.FileProcessingException;
import com.autoclaim.api.exception.StorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageService {

    private final S3Client s3Client;

    @Value("${s3.endpoint}")
    private String endpoint;

    @Value("${s3.bucket-name}")
    private String bucketName;

    @Value("${s3.public-url:}")
    private String publicUrl;

    /**
     * Uploads a file to the configured bucket under {@code folder/} and returns its public URL.
     */
    public String uploadFile(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        String key = buildKey(folder, file.getOriginalFilename());
        String contentType = StringUtils.hasText(file.getContentType())
                ? file.getContentType()
                : "application/octet-stream";

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        try (InputStream in = file.getInputStream()) {
            s3Client.putObject(request, RequestBody.fromInputStream(in, file.getSize()));
        } catch (IOException ex) {
            throw new FileProcessingException("Failed to read uploaded file '%s'".formatted(file.getOriginalFilename()), ex);
        } catch (SdkException ex) {
            throw new StorageException("Failed to upload file to object storage", ex);
        }

        return buildPublicUrl(key);
    }

    /** Best-effort delete; never throws, so it is safe to call from cleanup paths. */
    public void deleteFileByUrl(String url) {
        String key = extractKey(url);
        if (key == null) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
        } catch (SdkException ex) {
            log.warn("Failed to delete orphaned object '{}' from bucket '{}': {}", key, bucketName, ex.getMessage());
        }
    }

    /**
     * Uploads happen before the DB commit. If the surrounding transaction rolls back,
     * delete the already-uploaded objects so the bucket does not accumulate orphans.
     */
    public void deleteOnRollback(List<String> urls) {
        if (urls == null || urls.isEmpty() || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        List<String> snapshot = List.copyOf(urls);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    snapshot.forEach(S3StorageService.this::deleteFileByUrl);
                }
            }
        });
    }

    /** Deletes an object only once the surrounding transaction has committed (e.g. a replaced avatar). */
    public void deleteAfterCommit(String url) {
        if (!StringUtils.hasText(url)) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteFileByUrl(url);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteFileByUrl(url);
            }
        });
    }

    private String buildKey(String folder, String originalFilename) {
        String extension = "";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }
        String cleanFolder = StringUtils.hasText(folder) ? StringUtils.trimTrailingCharacter(folder.trim(), '/') + "/" : "";
        return cleanFolder + UUID.randomUUID() + extension;
    }

    private String baseUrl() {
        if (StringUtils.hasText(publicUrl)) {
            return StringUtils.trimTrailingCharacter(publicUrl.trim(), '/');
        }
        return StringUtils.trimTrailingCharacter(endpoint.trim(), '/') + "/" + bucketName;
    }

    private String buildPublicUrl(String key) {
        return baseUrl() + "/" + key;
    }

    private String extractKey(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        String prefix = baseUrl() + "/";
        return url.startsWith(prefix) ? url.substring(prefix.length()) : null;
    }
}
