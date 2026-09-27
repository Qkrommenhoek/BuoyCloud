package com.buoybuddy.security

import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.stereotype.Component
import java.time.Duration
import java.time.Instant

@Component
class JwtService(
    private val jwtEncoder: JwtEncoder,
) {
    fun generateToken(username: String): String {
        val now = Instant.now()
        val claims = JwtClaimsSet.builder()
            .subject(username)
            .issuedAt(now)
            .expiresAt(now.plus(EXPIRATION))
            .build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue
    }

    private companion object {
        private val EXPIRATION = Duration.ofHours(24)
    }
}
