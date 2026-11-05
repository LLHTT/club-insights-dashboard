import { redirect } from "next/navigation";

// No "all clubs" landing screen is called for in the brief - land on the club that
// actually has data (FR1 still lets the host switch to the other one from there).
export default function Home() {
  redirect("/club/club-001");
}
