package com.buoybuddy.security

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.security.oauth2.jwt.JwtException

class JwtServiceTest {

    private val securityConfig = SecurityConfig(
        jwtSecret = "5367566859703373367639792F423F452848284D6251655468576D5A71347437",
        oauth2RedirectUri = "/oauth2/redirect",
    )
    private val jwtService = JwtService(securityConfig.jwtEncoder())
    private val jwtDecoder = securityConfig.jwtDecoder()

    @Test
    fun `generated token decodes to the same username`() {
        val token = jwtService.generateToken("quinn")

        assertEquals("quinn", jwtDecoder.decode(token).subject)
    }

    @Test
    fun `token signed with a different secret is rejected`() {
        val otherConfig = SecurityConfig(
            jwtSecret = "4A404E635266556A586E3272357538782F413F4428472B4B6250645367566B59",
            oauth2RedirectUri = "/oauth2/redirect",
        )
        val foreignToken = JwtService(otherConfig.jwtEncoder()).generateToken("quinn")

        assertThrows<JwtException> { jwtDecoder.decode(foreignToken) }
    }
}
