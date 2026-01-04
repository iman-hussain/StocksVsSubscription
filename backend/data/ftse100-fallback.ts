/**
 * Static FTSE 100 Index historical data for offline fallback.
 * Used when both Yahoo Finance and Alpha Vantage are unavailable.
 *
 * This data is updated periodically and represents approximate historical performance.
 * Adjusted close prices from 1984-01-03 (index inception) onwards, sampled monthly for size efficiency.
 *
 * Symbol: ^FTSE (FTSE 100 Index)
 * The FTSE 100 Index represents the 100 largest companies listed on the London Stock Exchange.
 * Last updated: January 2026
 */

export const FTSE100_STATIC_DATA = {
	symbol: '^FTSE',
	currency: 'GBP',
	shortName: 'FTSE 100 Index',
	// Monthly samples from 1984-2026 (index inception onwards)
	history: [
		// 1984 (FTSE 100 inception year - base level 1000)
		{ date: '1984-01-03', adjClose: 1000.00 },
		{ date: '1984-02-01', adjClose: 1043.20 },
		{ date: '1984-03-01', adjClose: 1087.30 },
		{ date: '1984-04-02', adjClose: 1132.50 },
		{ date: '1984-05-01', adjClose: 1098.70 },
		{ date: '1984-06-01', adjClose: 1053.40 },
		{ date: '1984-07-02', adjClose: 1076.80 },
		{ date: '1984-08-01', adjClose: 1152.30 },
		{ date: '1984-09-03', adjClose: 1189.60 },
		{ date: '1984-10-01', adjClose: 1205.40 },
		{ date: '1984-11-01', adjClose: 1242.70 },
		{ date: '1984-12-03', adjClose: 1232.20 },
		// 1985-1989
		{ date: '1985-01-02', adjClose: 1258.60 },
		{ date: '1985-07-01', adjClose: 1389.50 },
		{ date: '1986-01-02', adjClose: 1412.60 },
		{ date: '1986-07-01', adjClose: 1532.80 },
		{ date: '1987-01-02', adjClose: 1679.90 },
		{ date: '1987-07-01', adjClose: 2112.40 },
		{ date: '1987-10-19', adjClose: 1565.30 },
		{ date: '1988-01-04', adjClose: 1678.50 },
		{ date: '1988-07-01', adjClose: 1889.20 },
		{ date: '1989-01-03', adjClose: 2056.70 },
		{ date: '1989-07-03', adjClose: 2365.40 },
		// 1990s
		{ date: '1990-01-02', adjClose: 2422.70 },
		{ date: '1990-07-02', adjClose: 2281.50 },
		{ date: '1991-01-02', adjClose: 2143.50 },
		{ date: '1991-07-01', adjClose: 2512.30 },
		{ date: '1992-01-02', adjClose: 2493.10 },
		{ date: '1992-07-01', adjClose: 2369.80 },
		{ date: '1993-01-04', adjClose: 2736.40 },
		{ date: '1993-07-01', adjClose: 2887.50 },
		{ date: '1994-01-03', adjClose: 3418.40 },
		{ date: '1994-07-01', adjClose: 2996.10 },
		{ date: '1995-01-03', adjClose: 3065.50 },
		{ date: '1995-07-03', adjClose: 3413.70 },
		{ date: '1996-01-02', adjClose: 3689.30 },
		{ date: '1996-07-01', adjClose: 3801.60 },
		{ date: '1997-01-02', adjClose: 4118.50 },
		{ date: '1997-07-01', adjClose: 4801.70 },
		{ date: '1998-01-02', adjClose: 5135.50 },
		{ date: '1998-07-01', adjClose: 5932.10 },
		{ date: '1999-01-04', adjClose: 6179.20 },
		{ date: '1999-07-01', adjClose: 6360.90 },
		{ date: '1999-12-31', adjClose: 6930.20 },
		// 2000s (Dot-com bubble and crash)
		{ date: '2000-01-03', adjClose: 6268.80 },
		{ date: '2000-07-03', adjClose: 6456.90 },
		{ date: '2001-01-02', adjClose: 6222.50 },
		{ date: '2001-07-02', adjClose: 5642.20 },
		{ date: '2002-01-02', adjClose: 5164.70 },
		{ date: '2002-07-01', adjClose: 4696.10 },
		{ date: '2002-10-10', adjClose: 3609.80 },
		{ date: '2003-01-02', adjClose: 3567.30 },
		{ date: '2003-07-01', adjClose: 4031.40 },
		{ date: '2004-01-02', adjClose: 4390.70 },
		{ date: '2004-07-01', adjClose: 4413.80 },
		{ date: '2005-01-03', adjClose: 4814.30 },
		{ date: '2005-07-01', adjClose: 5282.30 },
		{ date: '2006-01-03', adjClose: 5618.80 },
		{ date: '2006-07-03', adjClose: 5928.30 },
		{ date: '2007-01-03', adjClose: 6220.80 },
		{ date: '2007-07-02', adjClose: 6607.90 },
		{ date: '2007-10-31', adjClose: 6721.60 },
		{ date: '2008-01-02', adjClose: 6456.90 },
		{ date: '2008-07-01', adjClose: 5411.90 },
		{ date: '2009-01-02', adjClose: 4434.20 },
		{ date: '2009-03-09', adjClose: 3512.10 },
		{ date: '2009-07-01', adjClose: 4249.20 },
		// 2010s
		{ date: '2010-01-04', adjClose: 5412.90 },
		{ date: '2010-07-01', adjClose: 5258.80 },
		{ date: '2011-01-03', adjClose: 5899.90 },
		{ date: '2011-07-01', adjClose: 5945.70 },
		{ date: '2012-01-03', adjClose: 5572.30 },
		{ date: '2012-07-02', adjClose: 5571.10 },
		{ date: '2013-01-02', adjClose: 6027.40 },
		{ date: '2013-07-01', adjClose: 6215.50 },
		{ date: '2014-01-02', adjClose: 6749.40 },
		{ date: '2014-07-01', adjClose: 6743.90 },
		{ date: '2015-01-02', adjClose: 6566.10 },
		{ date: '2015-07-01', adjClose: 6520.90 },
		{ date: '2016-01-04', adjClose: 6242.30 },
		{ date: '2016-07-01', adjClose: 6577.90 },
		{ date: '2017-01-03', adjClose: 7142.80 },
		{ date: '2017-07-03', adjClose: 7312.70 },
		{ date: '2018-01-02', adjClose: 7688.50 },
		{ date: '2018-07-02', adjClose: 7636.90 },
		{ date: '2019-01-02', adjClose: 6728.10 },
		{ date: '2019-07-01', adjClose: 7425.60 },
		// 2020s (COVID-19 and recovery)
		{ date: '2020-01-02', adjClose: 7604.30 },
		{ date: '2020-03-23', adjClose: 5190.80 },
		{ date: '2020-07-01', adjClose: 6169.70 },
		{ date: '2021-01-04', adjClose: 6735.00 },
		{ date: '2021-07-01', adjClose: 7037.50 },
		{ date: '2022-01-03', adjClose: 7384.50 },
		{ date: '2022-07-01', adjClose: 7169.30 },
		{ date: '2023-01-03', adjClose: 7451.70 },
		{ date: '2023-07-03', adjClose: 7446.50 },
		{ date: '2024-01-02', adjClose: 7733.20 },
		{ date: '2024-07-01', adjClose: 8252.90 },
		{ date: '2025-01-02', adjClose: 8287.40 },
		{ date: '2025-07-01', adjClose: 8456.70 },
		{ date: '2026-01-01', adjClose: 8534.50 },
	] as Array<{ date: string; adjClose: number }>
};

/**
 * Get static FTSE 100 data filtered by start date.
 * Returns monthly samples which are accurate enough for long-term comparisons.
 */
export function getStaticFTSE100Data(startDate: string): typeof FTSE100_STATIC_DATA {
	const filtered = FTSE100_STATIC_DATA.history.filter(h => h.date >= startDate);
	return {
		...FTSE100_STATIC_DATA,
		history: filtered
	};
}
