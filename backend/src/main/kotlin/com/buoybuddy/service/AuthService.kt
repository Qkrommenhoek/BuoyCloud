package com.buoybuddy.service

import com.buoybuddy.model.User
import com.buoybuddy.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun register(username: String, rawPassword: String): User {
        if (userRepository.findByUsername(username) != null) {
            throw IllegalArgumentException("Username already taken")
        }
        // PasswordEncoder.encode() is only null when the raw password is null, which
        // cannot happen here since rawPassword is a non-null String.
        val encodedPassword = requireNotNull(passwordEncoder.encode(rawPassword))
        val user = User(username = username, password = encodedPassword)
        return userRepository.save(user)
    }

    /**
     * Finds the user for a Google-authenticated email, creating one on first sign-in.
     * OAuth accounts use their email as their username and have no password of their
     * own, so we store a random unusable hash to satisfy the NOT NULL column without
     * enabling password login for the account.
     *
     * Returns null if a password account already holds that email as its username: registration
     * never verifies email ownership, so linking would hand the Google identity to whoever
     * registered that username.
     */
    fun findOrCreateOAuthUser(email: String): User? {
        userRepository.findByEmail(email)?.let { return it }
        if (userRepository.findByUsername(email) != null) return null
        val unusablePassword = requireNotNull(passwordEncoder.encode(UUID.randomUUID().toString()))
        val user = User(username = email, password = unusablePassword, email = email)
        return userRepository.save(user)
    }
}
