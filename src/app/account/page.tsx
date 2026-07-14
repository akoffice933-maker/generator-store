import { Suspense } from "react";
import AccountClient from "./AccountClient";

export const metadata = { title: "Личный кабинет — Generator Store" };
export default function AccountPage() { return <Suspense><AccountClient /></Suspense>; }
