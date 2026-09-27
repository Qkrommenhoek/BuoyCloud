package com.buoybuddy.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient
import java.time.LocalDate
import java.time.ZoneOffset

class GFSStationServiceTest {

    // parseCbull does no I/O, so a client with no configured base URL is fine here.
    private val gfsStationService = GFSStationService(RestClient.create())

    private fun bulletin(dataLines: List<String>, cycle: String = "20260925 18") =
        (
            listOf(
                "Location : 46239 (36.34N 122.10W)",
                "Model : spectral resolution for points",
                "Cycle    : $cycle UTC",
                "",
                "DDHH HS SS PP DDD SS PP DDD",
                "-------------------------------------------------------------------",
            ) + dataLines + listOf(
                "-------------------------------------------------------------------",
                "DD = Day of Month",
            )
        ).joinToString("\n")

    @Test
    fun `rolls the month over when day resets, including across year boundary`() {
        val rawText = bulletin(
            dataLines = listOf(
                "2518 5 4 10 312",
                "2600 6 4 05 315",
                "0100 7 6 09 304",
            ),
        )

        val forecast = gfsStationService.parseCbull(rawText, "http://example.com")

        assertEquals(
            listOf(
                LocalDate.of(2026, 9, 25).atTime(18, 0).toInstant(ZoneOffset.UTC),
                LocalDate.of(2026, 9, 26).atTime(0, 0).toInstant(ZoneOffset.UTC),
                LocalDate.of(2026, 10, 1).atTime(0, 0).toInstant(ZoneOffset.UTC),
            ),
            forecast.rows.map { it.time },
        )
    }

    @Test
    fun `rolls the year over when the cycle month is December`() {
        val rawText = bulletin(
            dataLines = listOf(
                "3018 5 4 10 312",
                "0100 7 6 09 304",
            ),
            cycle = "20261230 18",
        )

        val forecast = gfsStationService.parseCbull(rawText, "http://example.com")

        assertEquals(
            listOf(
                LocalDate.of(2026, 12, 30).atTime(18, 0).toInstant(ZoneOffset.UTC),
                LocalDate.of(2027, 1, 1).atTime(0, 0).toInstant(ZoneOffset.UTC),
            ),
            forecast.rows.map { it.time },
        )
    }

    @Test
    fun `skips a row with an out-of-range day without corrupting later rollover state`() {
        val rawText = bulletin(
            dataLines = listOf(
                "2518 5 4 10 312",
                "9918 5 4 10 312",
                "2600 6 4 05 315",
            ),
        )

        val forecast = gfsStationService.parseCbull(rawText, "http://example.com")

        assertEquals(
            listOf(
                LocalDate.of(2026, 9, 25).atTime(18, 0).toInstant(ZoneOffset.UTC),
                LocalDate.of(2026, 9, 26).atTime(0, 0).toInstant(ZoneOffset.UTC),
            ),
            forecast.rows.map { it.time },
        )
    }

    @Test
    fun `parses NOAA cycle line with unpadded single-digit hour`() {
        val rawText = bulletin(
            dataLines = listOf("2706  6  5 09 307  3 13 188"),
            cycle = "20260927  6",
        )

        val forecast = gfsStationService.parseCbull(rawText, "http://example.com")

        assertEquals(
            LocalDate.of(2026, 9, 27).atTime(6, 0).toInstant(ZoneOffset.UTC),
            forecast.cycle,
        )
        assertEquals(
            listOf(LocalDate.of(2026, 9, 27).atTime(6, 0).toInstant(ZoneOffset.UTC)),
            forecast.rows.map { it.time },
        )
    }

    @Test
    fun `skips a row with a day invalid for the resolved month without throwing`() {
        // Cycle month is April (30 days); a stray day=31 must not blow up the whole parse.
        val rawText = bulletin(
            dataLines = listOf(
                "3018 5 4 10 312",
                "3118 5 4 10 312",
                "0100 7 6 09 304",
            ),
            cycle = "20260430 18",
        )

        val forecast = gfsStationService.parseCbull(rawText, "http://example.com")

        assertEquals(
            listOf(
                LocalDate.of(2026, 4, 30).atTime(18, 0).toInstant(ZoneOffset.UTC),
                LocalDate.of(2026, 5, 1).atTime(0, 0).toInstant(ZoneOffset.UTC),
            ),
            forecast.rows.map { it.time },
        )
    }
}
