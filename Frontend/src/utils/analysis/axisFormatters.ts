/** Axis and tooltip labels shared by the analysis charts. */
export const formatWholePercentAxis = (tickValue: number) => `${tickValue.toFixed(0)}%`;
export const formatOnePercentAxis = (tickValue: number) => `${tickValue.toFixed(1)}%`;
export const formatDayCount = (dayCount: number) => `${dayCount} days`;
export const formatCountAxis = (tickValue: number) => tickValue.toFixed(0);
