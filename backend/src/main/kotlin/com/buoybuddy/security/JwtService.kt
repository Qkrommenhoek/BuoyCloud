package com.buoybuddy.security

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.io.Decoders
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Component
import java.util.Date

@Component
class JwtService(
    @Value("\${jwt.secret}") private val secretKey: String,
) {
    fun generateToken(username: String): String =
        Jwts.builder()
            .setSubject(username)
            .setIssuedAt(Date(System.currentTimeMillis()))
            .setExpiration(Date(System.currentTimeMillis() + EXPIRATION_MS))
            .signWith(signKey())
            .compact()

    fun extractUsername(token: String): String = extractAllClaims(token).subject

    fun extractExpiration(token: String): Date = extractAllClaims(token).expiration

    private fun extractAllClaims(token: String): Claims =
        Jwts.parserBuilder()
            .setSigningKey(signKey())
            .build()
            .parseClaimsJws(token)
            .body

    fun validateToken(token: String, userDetails: UserDetails): Boolean {
        val username = extractUsername(token)
        return username == userDetails.username && extractExpiration(token).after(Date())
    }

    private fun signKey() = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secretKey))

    private companion object {
        private const val EXPIRATION_MS = 1000L * 60 * 60 * 24
    }
}
