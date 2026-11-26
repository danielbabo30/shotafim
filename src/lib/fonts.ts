import { Assistant, Heebo } from "next/font/google";

// כותרות ותוויות — טכני ומודרני (תחליף עברי ל-Geist)
export const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

// טקסט גוף — קריאוּת מקסימלית (תחליף עברי ל-Inter)
export const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-heebo",
  display: "swap",
});
