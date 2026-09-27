package com.buoybuddy.service

import com.buoybuddy.model.BuoyReading
import com.buoybuddy.repository.BuoyReadingRepository
import com.buoybuddy.repository.UserRepository
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class BuoyReadingService(
    private val buoyReadingRepository: BuoyReadingRepository,
    private val userRepository: UserRepository,
) {
    fun getBuoyReadingsByUserId(userId: Long): List<BuoyReading> =
        buoyReadingRepository.findByIdUserId(userId)

    fun getBuoyReadingsByUsername(username: String): List<BuoyReading> {
        val user = userRepository.findByUsername(username)
            ?: throw UsernameNotFoundException("No user found for username $username")
        return getBuoyReadingsByUserId(user.id)
    }
}
