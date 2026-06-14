package com.smartjobtracker.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartjobtracker.ai.exception.AiConfigurationException;
import com.smartjobtracker.ai.exception.AiServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;
    private final boolean responseFormatEnabled;

    public OpenAiClient(
            WebClient.Builder webClientBuilder,
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.base-url}") String baseUrl,
            @Value("${openai.model}") String model,
            @Value("${openai.timeout-seconds:30}") int timeoutSeconds,
            @Value("${openai.response-format-enabled:true}") boolean responseFormatEnabled
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.timeoutSeconds = timeoutSeconds;
        this.responseFormatEnabled = responseFormatEnabled;
        this.webClient = webClientBuilder
                .baseUrl(baseUrl.trim())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public String complete(String systemPrompt, String userPrompt) {
        ensureConfigured();

        try {
            return callProvider(buildBody(systemPrompt, userPrompt, responseFormatEnabled));
        } catch (WebClientResponseException ex) {
            if (responseFormatEnabled && shouldRetryWithoutResponseFormat(ex)) {
                try {
                    return callProvider(buildBody(systemPrompt, userPrompt, false));
                } catch (WebClientResponseException retryEx) {
                    throw new AiServiceException("AI provider returned an error: " + safeProviderError(retryEx), retryEx);
                }
            }
            throw new AiServiceException("AI provider returned an error: " + safeProviderError(ex), ex);
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("Failed to reach AI provider", ex);
        }
    }

    public JsonNode completeJson(String systemPrompt, String userPrompt) {
        try {
            return objectMapper.readTree(extractJsonObject(complete(systemPrompt, userPrompt)));
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("AI response was not valid JSON", ex);
        }
    }

    private Map<String, Object> buildBody(String systemPrompt, String userPrompt, boolean includeResponseFormat) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("temperature", 0.35);
        if (includeResponseFormat) {
            body.put("response_format", Map.of("type", "json_object"));
        }
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        return body;
    }

    private String callProvider(Map<String, Object> body) {
        try {
            String response = webClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(Duration.ofSeconds(Math.max(5, timeoutSeconds)));

            return extractContent(response);
        } catch (WebClientResponseException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("Failed to reach AI provider", ex);
        }
    }

    private void ensureConfigured() {
        if (!StringUtils.hasText(apiKey)) {
            throw new AiConfigurationException(
                    "OPENAI_API_KEY is not configured. Set the environment variable and restart ai-service."
            );
        }
    }

    private String extractContent(String response) throws Exception {
        JsonNode root = objectMapper.readTree(response);
        JsonNode content = root.path("choices").path(0).path("message").path("content");
        if (content.isMissingNode() || !StringUtils.hasText(content.asText())) {
            throw new AiServiceException("AI provider returned an empty response");
        }
        return content.asText();
    }

    private boolean shouldRetryWithoutResponseFormat(WebClientResponseException ex) {
        String body = ex.getResponseBodyAsString().toLowerCase();
        return ex.getStatusCode().is4xxClientError()
                && (body.contains("response_format") || body.contains("json_object"));
    }

    private String safeProviderError(WebClientResponseException ex) {
        String body = ex.getResponseBodyAsString();
        if (!StringUtils.hasText(body)) {
            return ex.getStatusCode().toString();
        }
        String sanitized = body.replace(apiKey, "[redacted]");
        return sanitized.length() <= 700 ? sanitized : sanitized.substring(0, 700) + "...";
    }

    private String extractJsonObject(String content) {
        String trimmed = content.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            trimmed = trimmed.replaceFirst("\\s*```$", "");
        }

        int first = trimmed.indexOf('{');
        int last = trimmed.lastIndexOf('}');
        if (first >= 0 && last > first) {
            return trimmed.substring(first, last + 1);
        }
        return trimmed;
    }
}
