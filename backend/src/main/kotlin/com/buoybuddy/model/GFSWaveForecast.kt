package com.buoybuddy.model

import java.time.Instant

data class GfsWaveForecast(
    val stationId: String,
    val latitude: Double,
    val longitude: Double,
    val cycle: Instant,
    val sourceUrl: String,
    val rows: List<GfsWaveForecastRow>,
)

data class GfsWaveForecastRow(
    val time: Instant,
    val totalWaveHeightFt: Int,
    val systems: List<GfsWaveSystem>,
)

data class GfsWaveSystem(
    val waveHeightFt: Int,
    val periodSec: Int,
    val directionDeg: Int,
)