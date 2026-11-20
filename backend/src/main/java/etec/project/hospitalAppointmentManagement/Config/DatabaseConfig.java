package etec.project.hospitalAppointmentManagement.Config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

@Configuration
public class DatabaseConfig {

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/hospital}")
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

        // Check if DATABASE_URL or SPRING_DATASOURCE_URL is supplied via environment
        String rawDbUrl = System.getenv("DATABASE_URL");
        if (rawDbUrl == null || rawDbUrl.isBlank()) {
            rawDbUrl = datasourceUrl;
        }

        // Auto-convert standard cloud URL formats (e.g. Render, Railway, Supabase postgres:// or postgresql://) to JDBC
        if (rawDbUrl != null && (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")) && !rawDbUrl.startsWith("jdbc:")) {
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
            } catch (Exception e) {
                config.setJdbcUrl(datasourceUrl);
                config.setUsername(username);
                config.setPassword(password);
            }
        } else {
            config.setJdbcUrl(rawDbUrl != null && !rawDbUrl.isBlank() ? rawDbUrl : "jdbc:postgresql://localhost:5432/hospital");
            config.setUsername(username);
            config.setPassword(password);
        }

        config.setDriverClassName(driverClassName);
        return new HikariDataSource(config);
    }
}
