import type { Metadata } from "next";
import TitleBlock from "@/components/TitleBlock";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Kipper Property Management — questions about a stay, your dates, or anything else.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <TitleBlock
        name="Contact us"
        place="Kipper Property Management · San Diego"
        facts={["We read every message"]}
      />
      <div className="mt-10">
        <ContactForm />
      </div>
      <p className="mt-6 text-center text-sm text-stone-500">
        Booking a stay? Head to{" "}
        <a href="/properties" className="font-medium text-clay underline-offset-4 hover:underline">
          our stays
        </a>{" "}
        to check availability first.
      </p>
    </div>
  );
}
