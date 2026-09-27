package com.buoybuddy.exception

class GfsForecastNotFoundException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

class GfsForecastParseException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)
