package com.autoclaim.api.service;

import com.autoclaim.api.repository.InspectionSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Writes {@code inspection_sessions.ai_status} in its own transaction. Needed after the check-out
 * transaction has committed (e.g. marking FAILED when the AI service cannot be reached).
 */
@Service
@RequiredArgsConstructor
public class AiStatusUpdater {

    private final InspectionSessionRepository inspectionSessionRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateStatus(UUID sessionId, String aiStatus) {
        inspectionSessionRepository.updateAiStatus(sessionId, aiStatus);
    }
}
