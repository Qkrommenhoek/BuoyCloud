package com.buoybuddy.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestClient

@Configuration
class HttpClientConfig {
    @Bean
    fun ndbcRestClient(): RestClient =
        RestClient.builder()
            .baseUrl("https://www.ndbc.noaa.gov/data/realtime2/")
            .build()
    @Bean
    fun gfsStationRestClient(): RestClient =
        RestClient.builder()
            .baseUrl("https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/")
            .build()
}