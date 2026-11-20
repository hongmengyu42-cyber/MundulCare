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

        if (rawDbUrl == null || rawDbUrl.isBlank()) {
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

                rawDbUrl = "jdbc:postgresql://" + pgHost + ":" + pgPort + "/" + pgDb;
                username = pgUser;
                password = pgPass;
            } else if (datasourceUrl != null && !datasourceUrl.isBlank()) {
                rawDbUrl = datasourceUrl;
            } else {
                rawDbUrl = "jdbc:postgresql://localhost:5432/hospital";
            }
        }

        // Auto-convert standard cloud URL formats (e.g. postgres:// or postgresql://) to JDBC
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
                log.info("Configured PostgreSQL DataSource from Cloud URI: host={}:{}, database={}", host, port, path);
            } catch (Exception e) {
                log.error("Failed to parse cloud database URI '{}', falling back to datasourceUrl: {}", rawDbUrl, e.getMessage());
                config.setJdbcUrl(datasourceUrl.isBlank() ? "jdbc:postgresql://localhost:5432/hospital" : datasourceUrl);
                config.setUsername(username);
                config.setPassword(password);
            }
        } else {
            config.setJdbcUrl(rawDbUrl);
            config.setUsername(username);
            config.setPassword(password);
            log.info("Configured PostgreSQL DataSource with JDBC URL: {}", sanitizeJdbcUrl(rawDbUrl));
        }

        if (config.getJdbcUrl() != null && config.getJdbcUrl().contains("localhost:5432")) {
            log.warn("⚠️ [DATABASE WARNING] Attempting to connect to localhost:5432. If running inside a cloud container (Render, Railway, Docker), ensure you have set the DATABASE_URL or SPRING_DATASOURCE_URL environment variable pointing to your cloud PostgreSQL database!");
        }

        config.setDriverClassName(driverClassName);
        return new HikariDataSource(config);
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
