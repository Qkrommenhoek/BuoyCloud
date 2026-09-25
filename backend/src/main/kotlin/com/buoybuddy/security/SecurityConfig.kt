package com.buoybuddy.security

import com.buoybuddy.service.AuthService
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import java.util.Base64
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

@Configuration
@EnableWebSecurity
class SecurityConfig(
    @param:Value("\${jwt.secret}") private val jwtSecret: String,
    @param:Value("\${app.oauth2.redirect-uri}") private val oauth2RedirectUri: String,
) {

    /**
     * STATELESS still lets oauth2Login keep the in-flight authorization request in the HTTP
     * session between the redirect to Google and the callback; it only stops the resulting
     * login from being stored there, since the SPA authenticates with the JWT afterwards.
     */
    @Bean
    fun filterChain(http: HttpSecurity, authService: AuthService, jwtService: JwtService): SecurityFilterChain {
        val oauth2FailureUrl = "$oauth2RedirectUri?error=oauth_failed"
        http {
            csrf { disable() }
            authorizeHttpRequests {
                // Auth endpoints must be reachable before a client has a token.
                authorize("/api/auth/**", permitAll)
                // Buoy data is public even for logged-out visitors on the home page.
                authorize("/api/ndbc/**", permitAll)
                // Everything else under /api is real data and requires a valid JWT.
                authorize("/api/**", authenticated)
                // The React SPA shell (index.html, JS/CSS bundles) is public; it contains no user data.
                authorize(anyRequest, permitAll)
            }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            exceptionHandling { authenticationEntryPoint = HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED) }
            oauth2Login {
                // The SPA owns /login; without this Spring serves its own generated login page there.
                loginPage = "/login"
                failureUrl = oauth2FailureUrl
                authenticationSuccessHandler = AuthenticationSuccessHandler { _, response, authentication ->
                    val oidcUser = authentication.principal as OidcUser
                    val user = oidcUser.email
                        ?.takeIf { oidcUser.emailVerified == true }
                        ?.let { authService.findOrCreateOAuthUser(it) }
                    if (user == null) {
                        response.sendRedirect(oauth2FailureUrl)
                    } else {
                        // A fragment is never sent to servers or leaked via Referer, unlike a query param.
                        response.sendRedirect("$oauth2RedirectUri#token=${jwtService.generateToken(user.username)}")
                    }
                }
            }
            oauth2ResourceServer { jwt { } }
        }
        return http.build()
    }

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager =
        config.authenticationManager

    @Bean
    fun jwtEncoder(): JwtEncoder = NimbusJwtEncoder.withSecretKey(jwtSigningKey()).build()

    @Bean
    fun jwtDecoder(): JwtDecoder =
        NimbusJwtDecoder.withSecretKey(jwtSigningKey()).macAlgorithm(MacAlgorithm.HS256).build()

    private fun jwtSigningKey(): SecretKey {
        val keyBytes = try {
            Base64.getDecoder().decode(jwtSecret)
        } catch (_: IllegalArgumentException) {
            try {
                Base64.getUrlDecoder().decode(jwtSecret)
            } catch (_: IllegalArgumentException) {
                throw IllegalStateException(
                    "jwt.secret must be a base64 (standard or URL-safe) encoded value of at least " +
                        "32 bytes (256 bits) for HS256."
                )
            }
        }
        check(keyBytes.size >= MIN_KEY_BYTES) {
            "jwt.secret decodes to only ${keyBytes.size} bytes; HS256 requires at least " +
                "$MIN_KEY_BYTES bytes (256 bits)."
        }
        return SecretKeySpec(keyBytes, "HmacSHA256")
    }

    private companion object {
        private const val MIN_KEY_BYTES = 32
    }
}
