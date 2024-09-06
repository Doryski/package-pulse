import { colors } from "../theme/colors";
import isKeyOfObject from "./isKeyOfObject";

export default function getChartColor(
  theme: string | undefined,
  index: number,
) {
  const parsedTheme = theme?.replace(/"/g, "");
  const themeColors = isKeyOfObject(parsedTheme, colors.chart)
    ? colors.chart[parsedTheme]
    : undefined;
  const chartKey = index + 1;
  const color =
    themeColors && isKeyOfObject(chartKey, themeColors)
      ? themeColors[chartKey]
      : undefined;
  return color;
}
