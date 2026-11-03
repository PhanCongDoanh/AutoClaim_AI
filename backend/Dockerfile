# ==========================================
# Stage 1: Build the application using Maven
# ==========================================
FROM eclipse-temurin:27-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml first to leverage Docker layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && sed -i 's/\r$//' mvnw
RUN ./mvnw dependency:go-offline -B

# Copy project source and build JAR (skipping tests)
COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ==========================================
# Stage 2: Run the JAR on lightweight JDK 27 Alpine
# ==========================================
FROM eclipse-temurin:27-jdk-alpine

WORKDIR /app

# Install fontconfig and DejaVu fonts for OpenPDF report generation on Alpine
RUN apk add --no-cache fontconfig ttf-dejavu

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
