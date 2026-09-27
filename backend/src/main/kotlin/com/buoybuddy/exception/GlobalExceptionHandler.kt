package com.buoybuddy.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

data class ErrorResponse(val message: String)

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleBadRequest(exception: IllegalArgumentException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(exception.message ?: "Invalid request"))

    @ExceptionHandler(UsernameNotFoundException::class)
    fun handleUnauthorized(exception: UsernameNotFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ErrorResponse(exception.message ?: "Invalid credentials"))

    @ExceptionHandler(GfsForecastNotFoundException::class)
    fun handleGfsNotFound(exception: GfsForecastNotFoundException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(exception.message ?: "GFS forecast not found"))

    @ExceptionHandler(GfsForecastParseException::class)
    fun handleGfsParseFailure(exception: GfsForecastParseException): ResponseEntity<ErrorResponse> =
        ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(ErrorResponse(exception.message ?: "Failed to parse GFS forecast"))
}
