package com.buoybuddy.controller

import com.buoybuddy.model.BuoyReading
import com.buoybuddy.service.BuoyReadingService
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/buoy-readings")
class BuoyReadingController(
    private val buoyReadingService: BuoyReadingService,
) {
    @GetMapping("/me")
    fun buoyReadings(@AuthenticationPrincipal jwt: Jwt): List<BuoyReading> =
        buoyReadingService.getBuoyReadingsByUsername(jwt.subject)
}
