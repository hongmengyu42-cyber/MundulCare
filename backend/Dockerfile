# Build stage
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY . .

# Ensure an application.properties exists if it was gitignored in repository
RUN if [ ! -f src/main/resources/application.properties ]; then \
      cp src/main/resources/application.properties.example src/main/resources/application.properties; \
    fi

RUN chmod +x mvnw
RUN ./mvnw -B clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre

WORKDIR /app

# Create uploads directory for doctor and profile pictures
RUN mkdir -p /app/uploads

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
