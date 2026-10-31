package com.autoclaim.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI autoClaimOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AutoClaim AI API")
                        .version("1.0.0")
                        .description("API documentation for AutoClaim AI Vehicle Exterior Inspection System"));
    }

    /**
     * Allows Swagger UI and multipart clients to send the JSON @RequestPart("data")
     * even when the browser labels that part as application/octet-stream or text/plain.
     */
    @Bean
    public JacksonJsonHttpMessageConverter multipartJacksonHttpMessageConverter(JsonMapper jsonMapper) {
        JacksonJsonHttpMessageConverter converter = new JacksonJsonHttpMessageConverter(jsonMapper) {
            @Override
            protected boolean canWrite(MediaType mediaType) {
                return false;
            }
        };
        converter.setSupportedMediaTypes(List.of(
                MediaType.APPLICATION_JSON,
                MediaType.TEXT_PLAIN,
                MediaType.APPLICATION_OCTET_STREAM
        ));
        return converter;
    }
}
