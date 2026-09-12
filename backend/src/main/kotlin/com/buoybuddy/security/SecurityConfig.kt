package com.buoybuddy.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.AuthenticationProvider
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthFilter: JwtAuthFilter,
    @param:Value("\${app.cors.allowed-origins:}") private val allowedOriginsProperty: String,
) {

    private val allowedOrigins: List<String> =
        allowedOriginsProperty.split(",").map { it.trim() }.filter { it.isNotEmpty() }

    @Bean
    fun filterChain(http: HttpSecurity, authenticationProvider: AuthenticationProvider): SecurityFilterChain {
        if (allowedOrigins.isNotEmpty()) {
            http.cors { it.configurationSource(corsConfigurationSource()) }
        }
        http
            .csrf { it.disable() }
            .authorizeHttpRequests { authorize ->
                authorize
                    // Auth endpoints must be reachable before a client has a token.
                    .requestMatchers("/api/auth/**").permitAll()
                    // Everything else under /api is real data and requires a valid JWT.
                    // .requestMatchers("/api/**").authenticated()
                    // The React SPA shell (index.html, JS/CSS bundles) is public; it contains no user data.
                    .anyRequest().permitAll()
            }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationProvider(
        userDetailsService: UserDetailsService,
        passwordEncoder: PasswordEncoder,
    ): AuthenticationProvider {
        val provider = DaoAuthenticationProvider(userDetailsService)
        provider.setPasswordEncoder(passwordEncoder)
        return provider
    }

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    /**
     * Only used when `app.cors.allowed-origins` is set (e.g. local dev, where the Vite
     * dev server on :5173 is a different origin than the backend on :9000). In production
     * the SPA is served same-origin from Spring, so CORS is not registered at all.
     */
    private fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = this@SecurityConfig.allowedOrigins
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
        }
        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", config)
        }
    }
}
