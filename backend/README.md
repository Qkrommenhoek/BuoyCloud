# BuoyBuddy Backend

Spring Boot (Kotlin) backend for BuoyBuddy.

## Configuration

This project uses Spring's native configuration mechanisms - no `.env` file or dotenv library is involved.

- [`application.properties`](src/main/resources/application.properties) holds committed defaults and placeholders (`${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}`, `${JWT_SECRET}`). These placeholders are resolved from the Spring `Environment`, which is populated by profile-specific property files locally and by real OS environment variables in deployment.
- `application-local.properties` (gitignored) supplies literal values for local development under the `local` Spring profile. It is loaded automatically when the `local` profile is active, and its values take precedence over the placeholders in `application.properties`.

## Running locally

1. Copy the example template and fill it in:

   ```bash
   cp src/main/resources/application-local.properties.example src/main/resources/application-local.properties
   ```

   Generate a JWT secret for the `jwt.secret` value:

   ```bash
   openssl rand -base64 64
   ```

2. Start the local Postgres database:

   ```bash
   docker compose up -d
   ```

3. Run the app. `./gradlew bootRun` activates the `local` profile automatically (configured in [`build.gradle`](build.gradle)):

   ```bash
   ./gradlew bootRun
   ```

### Running from an IDE

If you run the app from an IDE run configuration (or run the packaged jar directly) instead of `./gradlew bootRun`, set the active profile yourself, since the Gradle default above only applies to the `bootRun` task:

- IntelliJ Spring Boot run configuration: set `local` in the **Active profiles** field.
- Packaged jar: `java -jar build/libs/*.jar --spring.profiles.active=local`

## Deployment

BuoyBuddy deploys as a single Spring Boot jar to a single Elastic Beanstalk environment (Java SE / Corretto 17 platform). The jar serves both the REST API and the pre-built React SPA from the same origin, so there is no separate frontend hosting to manage.

### Building the release jar

The frontend build isn't wired into Gradle, so build and copy it in by hand before packaging:

```bash
# 1. Build the frontend
cd frontend
npm ci
npm run build

# 2. Copy the build output into the backend's static resources
rm -rf ../backend/src/main/resources/static/dist
cp -r dist ../backend/src/main/resources/static/dist

# 3. Package the backend jar (now embeds the frontend build)
cd ../backend
./gradlew clean bootJar
```

This produces `build/libs/buoybuddy-0.0.1-SNAPSHOT.jar`. Upload that jar as a new application version in the Elastic Beanstalk console (or via the EB CLI).

### Elastic Beanstalk environment configuration

- **Platform**: Java SE running Corretto 17.
- **Environment properties** (Configuration > Software), ideally sourced from AWS Secrets Manager or Parameter Store rather than committed anywhere:
  - `DB_URL` - JDBC URL for a standalone RDS PostgreSQL instance (not an EB-attached database, so it survives environment teardown). RDS typically requires SSL, so the URL should include `?sslmode=require`.
  - `DB_USERNAME`
  - `DB_PASSWORD`
  - `JWT_SECRET`
  - `DDL_AUTO` (optional) - defaults to `update`; consider pinning to `validate` once the schema is stable.

No profile is activated in production, so `application.properties` resolves these placeholders directly from real OS environment variables. If any are missing, the app fails to start with an unresolved placeholder error rather than silently falling back to development values.

- **Port**: EB's Java SE platform sets a `PORT` environment variable (5000) and proxies nginx to it. `server.port=${PORT:5000}` in `application.properties` picks this up automatically; no extra configuration is needed.
- **HTTPS**: a default single-instance EB environment is HTTP-only, which would send JWTs in cleartext. Put an Application Load Balancer with an ACM certificate in front before handling real traffic.
- **Health checks**: EB's default health check hits `/`, which returns the SPA's `index.html` with a 200, so no custom health check configuration is required.
