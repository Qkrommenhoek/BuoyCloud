package com.buoybuddy.service

import com.buoybuddy.exception.GfsForecastNotFoundException
import com.buoybuddy.exception.GfsForecastParseException
import com.buoybuddy.model.GfsWaveForecast
import com.buoybuddy.model.GfsWaveForecastRow
import com.buoybuddy.model.GfsWaveSystem
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.stereotype.Service
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import java.time.DateTimeException
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

@Service
class GFSStationService(
    @Qualifier("gfsStationRestClient")
    private val gfsStationRestClient: RestClient,
) {
    fun fetchGFSStationForecastRaw(stationId: String): String = fetchCbull(stationId).rawText

    fun fetchGFSStationForecast(stationId: String): GfsWaveForecast {
        val (rawText, sourceUrl) = fetchCbull(stationId)
        return parseCbull(rawText, sourceUrl)
    }

    /**
     * GFS runs at 00/06/12/18 UTC. Bulletins for a cycle typically aren't published
     * until several hours after the cycle time, so we start at the most recent
     * cycle boundary and walk backwards.
     */
    internal fun candidateCycles(now: Instant): List<Pair<LocalDate, Int>> {
        val nowUtc = now.atZone(ZoneOffset.UTC)
        val flooredHour = (nowUtc.hour / CYCLE_HOURS) * CYCLE_HOURS
        var cursor = nowUtc.withHour(flooredHour).withMinute(0).withSecond(0).withNano(0)
        return (0 until MAX_CYCLES_BACK).map {
            val candidate = cursor.toLocalDate() to cursor.hour
            cursor = cursor.minusHours(CYCLE_HOURS.toLong())
            candidate
        }
    }

    private fun fetchCbull(stationId: String): CbullFetchResult {
        var lastException: HttpClientErrorException? = null
        for ((date, hour) in candidateCycles(Instant.now())) {
            val dateStr = date.format(DATE_FORMAT)
            val cycleStr = hour.toString().padStart(2, '0')
            val relativePath = "gfs.$dateStr/$cycleStr/wave/station/bulls.t${cycleStr}z/gfswave.$stationId.cbull"
            try {
                val body = gfsStationRestClient.get()
                    .uri(
                        "gfs.{date}/{cycle}/wave/station/bulls.t{cycle}z/gfswave.{stationId}.cbull",
                        dateStr,
                        cycleStr,
                        cycleStr,
                        stationId,
                    )
                    .retrieve()
                    .body(String::class.java)
                    ?: throw GfsForecastParseException("GFS returned an empty response for station $stationId")
                return CbullFetchResult(body, BASE_URL + relativePath)
            } catch (exception: HttpClientErrorException) {
                if (exception.statusCode.value() == 403 || exception.statusCode.value() == 404) {
                    lastException = exception
                    continue
                }
                throw exception
            }
        }
        throw GfsForecastNotFoundException(
            "No GFS wave bulletin available for station $stationId in the last $MAX_CYCLES_BACK cycles",
            lastException,
        )
    }

    internal fun parseCbull(rawText: String, sourceUrl: String): GfsWaveForecast {
        val lines = rawText.lineSequence().toList()

        val locationLine = lines.firstOrNull { it.trimStart().startsWith("Location") }
            ?: throw GfsForecastParseException("Unexpected GFS cbull format: missing Location line")
        val locationMatch = LOCATION_REGEX.find(locationLine)
            ?: throw GfsForecastParseException("Unexpected GFS cbull format: unparsable Location line")
        val (stationId, latToken, latHemisphere, lonToken, lonHemisphere) = locationMatch.destructured
        val latitude = latToken.toDouble().let { if (latHemisphere == "S") -it else it }
        val longitude = lonToken.toDouble().let { if (lonHemisphere == "W") -it else it }

        val cycleLine = lines.firstOrNull { it.trimStart().startsWith("Cycle") }
            ?: throw GfsForecastParseException("Unexpected GFS cbull format: missing Cycle line")
        val cycleMatch = CYCLE_REGEX.find(cycleLine)
            ?: throw GfsForecastParseException("Unexpected GFS cbull format: unparsable Cycle line")
        val cycleDate = LocalDate.parse(cycleMatch.groupValues[1], DATE_FORMAT)
        val cycleHour = cycleMatch.groupValues[2].toInt()
        val cycleInstant = cycleDate.atTime(cycleHour, 0).toInstant(ZoneOffset.UTC)

        val separatorIndices = lines.withIndex()
            .filter { (_, line) -> line.startsWith("---") }
            .map { it.index }
        require(separatorIndices.isNotEmpty()) { "Unexpected GFS cbull format: missing separator line" }
        val dataStart = separatorIndices[0] + 1
        val dataEnd = if (separatorIndices.size >= 2) separatorIndices[1] else lines.size

        var currentYear = cycleDate.year
        var currentMonth = cycleDate.monthValue
        var previousDay = -1
        val rows = mutableListOf<GfsWaveForecastRow>()

        for (line in lines.subList(dataStart, dataEnd)) {
            val trimmed = line.trim()
            if (trimmed.isEmpty()) continue
            val tokens = trimmed.split(WHITESPACE)
            if (tokens.size < 2 || (tokens.size - 2) % 3 != 0) continue

            val ddhh = tokens[0]
            if (ddhh.length != 4 || !ddhh.all(Char::isDigit)) continue
            val day = ddhh.substring(0, 2).toInt()
            val hour = ddhh.substring(2, 4).toInt()
            // Guard the rollover heuristic against corrupt day/hour values before they can
            // desync currentMonth/currentYear (and thus every subsequent row's timestamp).
            if (day !in 1..31 || hour !in 0..23) continue

            val row =
                try {
                    if (previousDay != -1 && day < previousDay) {
                        currentMonth += 1
                        if (currentMonth > 12) {
                            currentMonth = 1
                            currentYear += 1
                        }
                    }

                    val time = LocalDate.of(currentYear, currentMonth, day)
                        .atTime(hour, 0)
                        .toInstant(ZoneOffset.UTC)

                    val totalWaveHeightFt = tokens[1].toInt()
                    val systems = tokens.drop(2).chunked(3).map { (heightFt, periodSec, directionDeg) ->
                        GfsWaveSystem(
                            waveHeightFt = heightFt.toInt(),
                            periodSec = periodSec.toInt(),
                            directionDeg = directionDeg.toInt(),
                        )
                    }

                    GfsWaveForecastRow(time = time, totalWaveHeightFt = totalWaveHeightFt, systems = systems)
                } catch (exception: DateTimeException) {
                    null
                } catch (exception: NumberFormatException) {
                    null
                } finally {
                    // day was already validated as 1..31 above, so it's safe to use as the
                    // rollover reference for the next line even if this row failed to parse.
                    previousDay = day
                }

            row?.let(rows::add)
        }

        return GfsWaveForecast(
            stationId = stationId,
            latitude = latitude,
            longitude = longitude,
            cycle = cycleInstant,
            sourceUrl = sourceUrl,
            rows = rows,
        )
    }

    private data class CbullFetchResult(val rawText: String, val sourceUrl: String)

    private companion object {
        private const val BASE_URL = "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gfs/prod/"
        private const val MAX_CYCLES_BACK = 4
        private const val CYCLE_HOURS = 6
        private val WHITESPACE = "\\s+".toRegex()
        private val DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd")
        private val LOCATION_REGEX = Regex("""Location\s*:\s*(\S+)\s*\(([\d.]+)([NS])\s+([\d.]+)([EW])\)""")
        // NOAA uses unpadded hours in cbull headers (e.g. " 6 UTC", not "06 UTC").
        private val CYCLE_REGEX = Regex("""Cycle\s*:\s*(\d{8})\s+(\d{1,2})\s+UTC""")
    }
}