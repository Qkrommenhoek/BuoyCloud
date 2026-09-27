package com.buoybuddy.controller

import com.buoybuddy.dto.LoginRequest
import com.buoybuddy.dto.RegisterRequest
import com.buoybuddy.security.JwtService
import com.buoybuddy.service.AuthService
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class UserController(
    private val authService: AuthService,
    private val jwtService: JwtService,
    private val authenticationManager: AuthenticationManager,
) {
    @PostMapping("/login")
    fun login(@RequestBody request: LoginRequest): String {
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.username, request.password)
        )
        if (authentication.isAuthenticated) {
            return jwtService.generateToken(request.username)
        }
        throw UsernameNotFoundException("Invalid user request")
    }

    @PostMapping("/register")
    fun register(@RequestBody request: RegisterRequest): String {
        authService.register(request.username, request.password)
        return jwtService.generateToken(request.username)
    }
}
