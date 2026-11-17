# Method notes

The radar ranks protocols with a reproducible heuristic, not an investment forecast. Category peers are protocols in the sealed snapshot that have both positive TVL and recorded market capitalization. A category median is used only with at least three peers; otherwise the prior multiple is used. The model combines 60% of a 0.30 prior with 40% of the peer median, clamped to 0.08-1.50. It multiplies this by TVL, a capped seven-day TVL-change factor, and an age maturity factor. Missing age uses 365 days and missing growth uses zero. The displayed low/high values are scenario bounds (45% and 180% of the central estimate), not confidence intervals.

The snapshot does not prove token absence, protocol eligibility, or campaign terms. Farm steps are conditional research prompts and must be checked against official documentation; some activities may require capital and incur fees. A no-deposit option is suggested when the snapshot does not identify a safe, documented activity.
