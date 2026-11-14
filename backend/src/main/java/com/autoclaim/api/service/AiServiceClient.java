package com.autoclaim.api.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/** HTTP calls to the Python AI service (detection trigger and in-memory progress). */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${app.ai.detect-url:http://localhost:5000/api/ai/detect}")
    private String detectUrl;

    @Value("${app.ai.status-url:http://localhost:5000/api/ai/status}")
    private String statusUrl;

    /** Result of {@link #fetchStatus(UUID)}. {@code body} is only set when {@code kind == FOUND}. */
    public record StatusLookup(Kind kind, Map<String, Object> body) {
        public enum Kind { FOUND, NOT_FOUND, UNREACHABLE }
    }

    /**
     * Asks the AI service to analyse a CHECK_OUT session (it answers 202 and works in the background).
     *
     * @return false when the AI service could not be reached or rejected the request
     */
    public boolean triggerDetection(UUID sessionId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request =
                    new HttpEntity<>(Map.of("sessionId", sessionId.toString()), headers);
            restTemplate.postForEntity(detectUrl, request, String.class);
            log.info("Triggered AI detection for check-out session {} at {}", sessionId, detectUrl);
            return true;
        } catch (RestClientException ex) {
            log.error("Could not trigger AI detection at {} for session {}: {}", detectUrl, sessionId, ex.getMessage());
            return false;
        }
    }

    /** Reads the AI service's in-memory progress for a session ({@code GET {status-url}/{sessionId}}). */
    @SuppressWarnings("unchecked")
    public StatusLookup fetchStatus(UUID sessionId) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(statusUrl + "/" + sessionId, Map.class);
            Map<String, Object> body = response.getBody();
            return body != null
                    ? new StatusLookup(StatusLookup.Kind.FOUND, body)
                    : new StatusLookup(StatusLookup.Kind.NOT_FOUND, null);
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                return new StatusLookup(StatusLookup.Kind.NOT_FOUND, null);
            }
            log.warn("AI status request for session {} failed: {}", sessionId, ex.getMessage());
            return new StatusLookup(StatusLookup.Kind.UNREACHABLE, null);
        } catch (RestClientException ex) {
            log.warn("AI service unreachable at {} for session {}: {}", statusUrl, sessionId, ex.getMessage());
            return new StatusLookup(StatusLookup.Kind.UNREACHABLE, null);
        }
    }
}
