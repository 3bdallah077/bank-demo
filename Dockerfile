# ---- build stage -------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# resolve dependencies first so rebuilds are fast
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- runtime stage -----------------------------------------------------------
FROM eclipse-temurin:17-jre
WORKDIR /app

# The app writes an H2 file database here. On hosts with an ephemeral disk the
# data resets on redeploy; mount a volume at /app/data to keep it.
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080 \
    DB_PATH=/app/data/bank_system \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"

RUN mkdir -p /app/data
COPY --from=build /build/target/bank-demo-1.0.0.jar /app/bank-demo.jar

# run as a non-root user
RUN useradd -r -u 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["sh", "-c", "wget -qO- http://127.0.0.1:${SERVER_PORT}/api/health >/dev/null || exit 1"]

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/bank-demo.jar"]
