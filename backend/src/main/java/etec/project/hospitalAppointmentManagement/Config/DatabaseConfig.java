package etec.project.hospitalAppointmentManagement.Config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.io.File;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    @Value("${spring.datasource.username:postgres}")
    private String username;

    @Value("${spring.datasource.password:}")
    private String password;

    @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}")
    private String driverClassName;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Check common cloud environment variables in priority order
        String rawDbUrl = findEnv(
                "DATABASE_URL",
                "SPRING_DATASOURCE_URL",
                "POSTGRES_URL",
                "POSTGRESQL_URL",
                "DATABASE_PUBLIC_URL",
                "DB_URL"
        );

        if (rawDbUrl != null && !rawDbUrl.isBlank()) {
            configureFromCloudUrl(config, rawDbUrl.trim());
        } else {
            // Check composite PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD (Railway, etc.)
            String pgHost = findEnv("PGHOST", "POSTGRES_HOST", "DB_HOST");
            if (pgHost != null && !pgHost.isBlank()) {
                String pgPort = findEnv("PGPORT", "POSTGRES_PORT", "DB_PORT");
                if (pgPort == null || pgPort.isBlank()) pgPort = "5432";
                String pgDb = findEnv("PGDATABASE", "POSTGRES_DB", "DB_NAME");
                if (pgDb == null || pgDb.isBlank()) pgDb = "hospital";
                String pgUser = findEnv("PGUSER", "POSTGRES_USER", "DB_USER");
                if (pgUser == null || pgUser.isBlank()) pgUser = username;
                String pgPass = findEnv("PGPASSWORD", "POSTGRES_PASSWORD", "DB_PASSWORD");
                if (pgPass == null) pgPass = password;

                String jdbcUrl = "jdbc:postgresql://" + pgHost + ":" + pgPort + "/" + pgDb;
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(pgUser);
                config.setPassword(pgPass);
                config.setDriverClassName("org.postgresql.Driver");
                log.info("Configured PostgreSQL DataSource from PGHOST env: host={}:{}, database={}", pgHost, pgPort, pgDb);
            } else if (datasourceUrl != null && !datasourceUrl.isBlank() && !datasourceUrl.contains("localhost:5432")) {
                config.setJdbcUrl(datasourceUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setDriverClassName(driverClassName);
                log.info("Configured PostgreSQL DataSource from custom datasourceUrl: {}", sanitizeJdbcUrl(datasourceUrl));
            } else {
                // No external cloud database URL was supplied in environment.
                // Check if a local PostgreSQL daemon is actually responding on localhost:5432
                if (isHostReachable("localhost", 5432, 500)) {
                    config.setJdbcUrl("jdbc:postgresql://localhost:5432/hospital");
                    config.setUsername(username);
                    config.setPassword(password);
                    config.setDriverClassName("org.postgresql.Driver");
                    log.info("Connected to local PostgreSQL daemon at localhost:5432.");
                } else {
                    // Running in a cloud container (or environment without local postgres running).
                    // Fall back to embedded database with PostgreSQL compatibility mode so the container boots up successfully!
                    new File("data").mkdirs();
                    String h2Url = "jdbc:h2:file:./data/hospital;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1";
                    config.setJdbcUrl(h2Url);
                    config.setDriverClassName("org.h2.Driver");
                    config.setUsername("sa");
                    config.setPassword("");
                    log.warn("⚠️ [DATABASE FALLBACK] No cloud PostgreSQL URL was provided and no local Postgres is active on localhost:5432.");
                    log.warn("👉 Booting with embedded persistent storage ({}) to ensure successful deployment. Set the DATABASE_URL environment variable anytime to switch to PostgreSQL.", h2Url);
                }
            }
        }

        // Configure reasonable Hikari pool settings for production
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setConnectionTimeout(20000);
        config.setIdleTimeout(300000);
        config.setMaxLifetime(1200000);

        return new HikariDataSource(config);
    }

    private void configureFromCloudUrl(HikariConfig config, String rawDbUrl) {
        if (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")) {
            try {
                URI uri = new URI(rawDbUrl);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String path = uri.getPath();
                String query = uri.getQuery() != null ? "?" + uri.getQuery() : "";
                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path + query;

                config.setJdbcUrl(jdbcUrl);
                if (uri.getUserInfo() != null) {
                    String[] userParts = uri.getUserInfo().split(":", 2);
                    config.setUsername(userParts[0]);
                    if (userParts.length > 1) {
                        config.setPassword(userParts[1]);
                    }
                } else {
                    config.setUsername(username);
                    config.setPassword(password);
                }
                config.setDriverClassName("org.postgresql.Driver");
                log.info("Configured PostgreSQL DataSource from Cloud URI: host={}:{}, database={}", host, port, path);
            } catch (Exception e) {
                log.error("Failed to parse cloud database URI '{}', falling back: {}", rawDbUrl, e.getMessage());
                config.setJdbcUrl(rawDbUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setDriverClassName(driverClassName);
            }
        } else {
            config.setJdbcUrl(rawDbUrl);
            config.setUsername(username);
            config.setPassword(password);
            config.setDriverClassName(driverClassName);
            log.info("Configured DataSource with JDBC URL: {}", sanitizeJdbcUrl(rawDbUrl));
        }
    }

    private boolean isHostReachable(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String findEnv(String... names) {
        for (String name : names) {
            String val = System.getenv(name);
            if (val != null && !val.isBlank()) {
                return val.trim();
            }
        }
        return null;
    }

    private String sanitizeJdbcUrl(String url) {
        if (url == null) return null;
        return url.replaceAll(":[^/@:]+@", ":***@");
    }
}
