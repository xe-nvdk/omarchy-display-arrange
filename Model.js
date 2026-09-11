function clampBrightness(value) {
  var n = Number(value)
  if (!isFinite(n)) return 1
  return Math.max(1, Math.min(100, Math.round(n)))
}

function normalizeScale(scale) {
  var n = parseFloat(String(scale || ""))
  if (!isFinite(n)) return ""
  return String(Math.round(n * 100) / 100)
}

function gcd(a, b) {
  while (b) {
    var remainder = a % b
    a = b
    b = remainder
  }
  return a
}

function cleanScale(scale, width, height) {
  var requested = Number(scale)
  var modeWidth = Number(width)
  var modeHeight = Number(height)
  if (!isFinite(requested) || !isFinite(modeWidth) || !isFinite(modeHeight)
      || requested <= 0 || modeWidth <= 0 || modeHeight <= 0) return ""

  var divisor = gcd(Math.round(modeWidth * 120), Math.round(modeHeight * 120))
  var scaleUnits = Math.round(requested * 120)
  if (scaleUnits > divisor) scaleUnits = divisor
  while (divisor % scaleUnits !== 0) scaleUnits++
  return normalizeScale(scaleUnits / 120)
}

function matchingScaleIndex(scales, currentScale, width, height) {
  var current = Number(currentScale)
  if (!Array.isArray(scales) || !isFinite(current)) return -1

  var bestIndex = -1
  var bestDistance = Infinity
  var normalizedCurrent = normalizeScale(current)
  for (var i = 0; i < scales.length; i++) {
    if (cleanScale(scales[i], width, height) !== normalizedCurrent) continue

    var distance = Math.abs(Number(scales[i]) - current)
    if (distance < bestDistance) {
      bestIndex = i
      bestDistance = distance
    }
  }
  return bestIndex
}

function availableScales(scales, width, height) {
  if (!Array.isArray(scales) || Number(width) <= 0 || Number(height) <= 0) return scales || []

  var byEffectiveScale = {}
  for (var i = 0; i < scales.length; i++) {
    var requested = Number(scales[i])
    var effective = Number(cleanScale(requested, width, height))

    if (!isFinite(requested) || !isFinite(effective)) continue

    var key = normalizeScale(effective)
    var existing = byEffectiveScale[key]
    if (!existing || Math.abs(requested - effective) < existing.distance) {
      byEffectiveScale[key] = {
        value: String(scales[i]),
        index: i,
        distance: Math.abs(requested - effective)
      }
    }
  }

  return Object.keys(byEffectiveScale)
    .map(function(key) { return byEffectiveScale[key] })
    .sort(function(a, b) { return a.index - b.index })
    .map(function(candidate) { return candidate.value })
}

// ---- Display modes (resolution + refresh rate) ----

function parseMode(text) {
  var parsed = /^(\d+)x(\d+)@([\d.]+)/.exec(String(text || ""))
  if (!parsed) return null
  return {
    width: parseInt(parsed[1], 10),
    height: parseInt(parsed[2], 10),
    rate: parseFloat(parsed[3]),
    resolution: parsed[1] + "x" + parsed[2]
  }
}

// Distinct resolutions a display advertises, widest first.
function resolutions(modes) {
  var seen = {}
  var out = []
  for (var i = 0; i < (modes || []).length; i++) {
    var parsed = parseMode(modes[i])
    if (!parsed || seen[parsed.resolution]) continue
    seen[parsed.resolution] = true
    out.push({ resolution: parsed.resolution, pixels: parsed.width * parsed.height })
  }
  out.sort(function(a, b) { return b.pixels - a.pixels })
  return out.map(function(entry) { return entry.resolution })
}

// Rates offered at one resolution, fastest first. Deduped by whole Hz, since
// 119.88 and 120.00 read identically on a pill; the exact value kept is the
// faster of each pair, and that is what gets applied.
function refreshRates(modes, resolution) {
  var byWholeHz = {}
  for (var i = 0; i < (modes || []).length; i++) {
    var parsed = parseMode(modes[i])
    if (!parsed || parsed.resolution !== resolution) continue
    var whole = Math.round(parsed.rate)
    if (!(whole in byWholeHz) || parsed.rate > byWholeHz[whole]) byWholeHz[whole] = parsed.rate
  }
  return Object.keys(byWholeHz)
    .map(function(whole) { return byWholeHz[whole] })
    .sort(function(a, b) { return b - a })
}

function formatResolution(resolution) {
  return String(resolution || "").replace("x", "\u00d7")
}

function formatRate(rate) {
  return Math.round(Number(rate)) + " Hz"
}

function modeString(resolution, rate) {
  return String(resolution) + "@" + Number(rate).toFixed(2)
}

function matchingRateIndex(rates, currentRate) {
  var current = Math.round(Number(currentRate))
  for (var i = 0; i < (rates || []).length; i++) {
    if (Math.round(Number(rates[i])) === current) return i
  }
  return -1
}

function brightnessName(percent) {
  var p = Math.round(percent)
  if (p >= 95) return "Sun blast"
  if (p >= 80) return "Solar flare"
  if (p >= 65) return "Golden hour"
  if (p >= 45) return "Even day"
  if (p >= 30) return "Soft glow"
  if (p >= 20) return "Lamp light"
  if (p >= 10) return "Candlelit"
  return "Night owl"
}

function parseDisplays(raw) {
  var displays = []
  try {
    displays = raw ? JSON.parse(String(raw)) : []
  } catch (e) {
    displays = []
  }
  if (!Array.isArray(displays)) displays = []

  var count = 0
  for (var i = 0; i < displays.length; i++) {
    if (displays[i] && displays[i].enabled) count++
  }

  return {
    displays: displays,
    enabledDisplayCount: count
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    clampBrightness: clampBrightness,
    normalizeScale: normalizeScale,
    cleanScale: cleanScale,
    matchingScaleIndex: matchingScaleIndex,
    availableScales: availableScales,
    brightnessName: brightnessName,
    parseDisplays: parseDisplays,
    parseMode: parseMode,
    resolutions: resolutions,
    refreshRates: refreshRates,
    formatResolution: formatResolution,
    formatRate: formatRate,
    modeString: modeString,
    matchingRateIndex: matchingRateIndex
  }
}
