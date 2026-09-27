package com.buoybuddy.controller

import com.buoybuddy.model.GfsWaveForecast
import com.buoybuddy.service.GFSStationService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/gfs")
class GFSForecastController(
    private val gfsStationService: GFSStationService,
) {
    @GetMapping("/{stationId:[A-Za-z0-9]+}.cbull")
    fun stationRaw(@PathVariable stationId: String): String = gfsStationService.fetchGFSStationForecastRaw(stationId)

    @GetMapping("/{stationId:[A-Za-z0-9]+}/forecast")
    fun stationForecast(@PathVariable stationId: String): GfsWaveForecast =
        gfsStationService.fetchGFSStationForecast(stationId)
}